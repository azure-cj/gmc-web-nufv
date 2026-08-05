import { Prisma, type NumberingKind, type PrismaClient } from "@prisma/client";
import {
  buildCertificateNumber,
  buildRequestReferenceNumber,
  getBusinessYearMonth,
} from "./formats";

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export async function allocateMonthlySequence(
  db: DatabaseClient,
  kind: NumberingKind,
  period: string,
): Promise<number> {
  const rows = await db.$queryRaw<Array<{ currentSequence: number }>>(
    Prisma.sql`
      INSERT INTO "NumberingCounter" ("id", "kind", "period", "currentSequence")
      VALUES (gen_random_uuid(), ${kind}::"NumberingKind", ${period}, 1)
      ON CONFLICT ("kind", "period")
      DO UPDATE SET "currentSequence" = "NumberingCounter"."currentSequence" + 1
      RETURNING "currentSequence";
    `,
  );

  return rows[0]?.currentSequence ?? 1;
}

export async function createRequestReferenceNumber(
  db: DatabaseClient,
  submittedAt: Date,
): Promise<string> {
  const yearMonth = getBusinessYearMonth(submittedAt);
  const sequence = await allocateMonthlySequence(
    db,
    "REQUEST_REFERENCE",
    yearMonth,
  );

  return buildRequestReferenceNumber(yearMonth, sequence);
}

export async function createCertificateNumber(
  db: DatabaseClient,
  issuedAt: Date,
): Promise<string> {
  const yearMonth = getBusinessYearMonth(issuedAt);
  const sequence = await allocateMonthlySequence(
    db,
    "CERTIFICATE_NUMBER",
    yearMonth,
  );

  return buildCertificateNumber(yearMonth, sequence);
}
