import { createHash, randomBytes } from "crypto";
import type { StaffSession, StaffUser, PrismaClient } from "@prisma/client";
import type { NextRequest, NextResponse } from "next/server";

export const STAFF_SESSION_COOKIE_NAME = "gmc_staff_session";
export const STAFF_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
export const STAFF_SESSION_REFRESH_WINDOW_SECONDS = 60 * 60 * 4;

export const STAFF_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: STAFF_SESSION_MAX_AGE_SECONDS,
};

export type CookieStoreLike = {
  get(name: string): { value: string } | undefined;
};

export interface ValidatedStaffSession {
  session: StaffSession;
  staffUser: StaffUser;
  sessionToken: string;
}

export interface CreateStaffSessionInput {
  staffUserId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function getStaffSessionTokenFromCookieStore(
  cookieStore: CookieStoreLike,
): string | null {
  return cookieStore.get(STAFF_SESSION_COOKIE_NAME)?.value ?? null;
}

export function getStaffSessionTokenFromRequest(request: NextRequest): string | null {
  return getStaffSessionTokenFromCookieStore(request.cookies);
}

export function setStaffSessionCookie(
  response: NextResponse,
  sessionToken: string,
): void {
  response.cookies.set({
    name: STAFF_SESSION_COOKIE_NAME,
    value: sessionToken,
    ...STAFF_SESSION_COOKIE_OPTIONS,
  });
}

export function clearStaffSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: STAFF_SESSION_COOKIE_NAME,
    value: "",
    ...STAFF_SESSION_COOKIE_OPTIONS,
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function createStaffSession(
  db: PrismaClient,
  input: CreateStaffSessionInput,
): Promise<{ sessionToken: string; expiresAt: Date }> {
  const sessionToken = createSessionToken();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + STAFF_SESSION_MAX_AGE_SECONDS * 1000,
  );

  await db.staffSession.create({
    data: {
      staffUserId: input.staffUserId,
      tokenHash: hashSessionToken(sessionToken),
      createdAt: now,
      lastUsedAt: now,
      expiresAt,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });

  return { sessionToken, expiresAt };
}

export async function loadValidatedStaffSession(
  db: PrismaClient,
  cookieStore: CookieStoreLike,
): Promise<ValidatedStaffSession | null> {
  const sessionToken = getStaffSessionTokenFromCookieStore(cookieStore);

  if (!sessionToken) {
    return null;
  }

  const session = await db.staffSession.findUnique({
    where: { tokenHash: hashSessionToken(sessionToken) },
    include: { staffUser: true },
  });

  if (!session || session.revokedAt || !session.staffUser.isActive) {
    return null;
  }

  const now = new Date();
  if (session.expiresAt <= now) {
    await db.staffSession
      .delete({
        where: { id: session.id },
      })
      .catch(() => undefined);
    return null;
  }

  return {
    session,
    staffUser: session.staffUser,
    sessionToken,
  };
}

export async function loadValidatedStaffSessionFromRequest(
  db: PrismaClient,
  request: NextRequest,
): Promise<ValidatedStaffSession | null> {
  return loadValidatedStaffSession(db, request.cookies);
}

export async function renewStaffSessionIfNeeded(
  db: PrismaClient,
  session: ValidatedStaffSession,
  response?: NextResponse,
): Promise<Date> {
  const now = new Date();
  const shouldRenew =
    session.session.expiresAt.getTime() - now.getTime() <=
    STAFF_SESSION_REFRESH_WINDOW_SECONDS * 1000;

  if (!shouldRenew) {
    await db.staffSession.update({
      where: { id: session.session.id },
      data: {
        lastUsedAt: now,
      },
    });
    return session.session.expiresAt;
  }

  const expiresAt = new Date(
    now.getTime() + STAFF_SESSION_MAX_AGE_SECONDS * 1000,
  );

  await db.staffSession.update({
    where: { id: session.session.id },
    data: {
      lastUsedAt: now,
      expiresAt,
    },
  });

  if (response) {
    setStaffSessionCookie(response, session.sessionToken);
  }

  return expiresAt;
}

export async function revokeStaffSession(
  db: PrismaClient,
  sessionToken: string | null,
): Promise<void> {
  if (!sessionToken) {
    return;
  }

  const tokenHash = hashSessionToken(sessionToken);

  await db.staffSession
    .update({
      where: { tokenHash },
      data: {
        revokedAt: new Date(),
      },
    })
    .catch(() =>
      db.staffSession.deleteMany({
        where: { tokenHash },
      }),
    );
}

export async function revokeOtherStaffSessions(
  db: PrismaClient | Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0],
  staffUserId: string,
  currentSessionId: string,
): Promise<number> {
  const result = await db.staffSession.updateMany({
    where: {
      staffUserId,
      id: { not: currentSessionId },
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count;
}


