import type { PrismaClient } from "@prisma/client";

export const STAFF_LOGIN_FAILURE_LIMIT = 5;
export const STAFF_LOGIN_WINDOW_MINUTES = 15;
export const STAFF_LOGIN_COOLDOWN_MINUTES = 10;

export interface StaffLoginAttemptInput {
  email: string;
  ipAddress: string;
  success: boolean;
}

export interface StaffLoginLockoutResult {
  blocked: boolean;
  retryAfterSeconds: number | null;
}

function getWindowStart(now: Date): Date {
  return new Date(now.getTime() - STAFF_LOGIN_WINDOW_MINUTES * 60 * 1000);
}

function getCooldownUntil(attemptedAt: Date): Date {
  return new Date(attemptedAt.getTime() + STAFF_LOGIN_COOLDOWN_MINUTES * 60 * 1000);
}

export function normalizeStaffLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getClientIpAddress(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const candidate = forwardedFor ?? realIp ?? "";
  return candidate.split(",")[0]?.trim() || "unknown";
}

export async function recordStaffLoginAttempt(
  db: PrismaClient,
  input: StaffLoginAttemptInput,
): Promise<void> {
  await db.staffLoginAttempt.create({
    data: {
      email: normalizeStaffLoginEmail(input.email),
      ipAddress: input.ipAddress,
      success: input.success,
    },
  });
}

export async function getStaffLoginLockout(
  db: PrismaClient,
  email: string,
  ipAddress: string,
): Promise<StaffLoginLockoutResult> {
  const now = new Date();
  const windowStart = getWindowStart(now);
  const normalizedEmail = normalizeStaffLoginEmail(email);

  const [emailCount, ipCount, lastEmailFailure, lastIpFailure] = await Promise.all([
    db.staffLoginAttempt.count({
      where: {
        success: false,
        attemptedAt: { gte: windowStart },
        email: normalizedEmail,
      },
    }),
    db.staffLoginAttempt.count({
      where: {
        success: false,
        attemptedAt: { gte: windowStart },
        ipAddress,
      },
    }),
    db.staffLoginAttempt.findFirst({
      where: {
        success: false,
        email: normalizedEmail,
      },
      orderBy: { attemptedAt: "desc" },
    }),
    db.staffLoginAttempt.findFirst({
      where: {
        success: false,
        ipAddress,
      },
      orderBy: { attemptedAt: "desc" },
    }),
  ]);

  const failureCount = Math.max(emailCount, ipCount);
  if (failureCount < STAFF_LOGIN_FAILURE_LIMIT) {
    return {
      blocked: false,
      retryAfterSeconds: null,
    };
  }

  const latestFailureAt =
    [lastEmailFailure?.attemptedAt, lastIpFailure?.attemptedAt]
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0] ?? now;

  const cooldownUntil = getCooldownUntil(latestFailureAt);

  if (cooldownUntil > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((cooldownUntil.getTime() - now.getTime()) / 1000),
    };
  }

  return {
    blocked: false,
    retryAfterSeconds: null,
  };
}
