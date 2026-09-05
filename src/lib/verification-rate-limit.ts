import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const RATE_LIMIT_MAX_LOOKUPS_PER_WINDOW = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export function hashClientIp(ipAddress: string): string {
  return createHash("sha256")
    .update(`gmc-certificate-verification:${ipAddress}`)
    .digest("hex");
}

export async function isVerificationRateLimited(ipAddress: string): Promise<boolean> {
  const ipHash = hashClientIp(ipAddress);
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const recentLookups = await prisma.verificationLookup.count({
    where: {
      ipHash,
      createdAt: { gte: windowStart },
    },
  });

  if (recentLookups >= RATE_LIMIT_MAX_LOOKUPS_PER_WINDOW) {
    return true;
  }

  await prisma.verificationLookup.create({
    data: { ipHash },
  });

  return false;
}