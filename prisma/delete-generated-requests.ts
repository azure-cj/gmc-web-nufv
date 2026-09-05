import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient, GmcRequestStatus, type Prisma } from "@prisma/client";
import { getStorageService } from "../src/lib/storage";

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");

const EXPECTED_STATUS_COUNTS: Record<GmcRequestStatus, number> = {
  PENDING: 3,
  GENERATED: 3,
  RELEASED: 2,
  APPROVED: 0,
  REJECTED: 0,
  RETURNED: 0,
  DELIVERY_FAILED: 0,
};

type StatusCounts = Record<GmcRequestStatus, number>;

async function countStatuses(): Promise<StatusCounts> {
  const grouped = await prisma.gmcRequest.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts: StatusCounts = {} as StatusCounts;
  for (const status of Object.values(GmcRequestStatus)) {
    counts[status] = 0;
  }
  for (const group of grouped) {
    counts[group.status] = group._count._all;
  }
  return counts;
}

function statusMismatches(counts: StatusCounts): string[] {
  const mismatches: string[] = [];
  for (const status of Object.values(GmcRequestStatus)) {
    const expected = EXPECTED_STATUS_COUNTS[status];
    const actual = counts[status];
    if (actual !== expected) {
      mismatches.push(
        `  ${status}: expected ${expected}, got ${actual}`,
      );
    }
  }
  return mismatches;
}

function getStoredFileKey(url: string): string | null {
  if (url.startsWith("/uploads/")) {
    return url.slice("/uploads/".length);
  }

  try {
    return new URL(url).pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }
}

async function safeDeleteStoredFile(url: string): Promise<void> {
  const key = getStoredFileKey(url);
  if (!key) {
    console.warn(`  skipped blob cleanup (unrecognized URL): ${url}`);
    return;
  }

  try {
    await getStorageService().delete(key);
    console.log(`  removed stored file: ${url}`);
  } catch (error) {
    console.warn(
      `  could not remove stored file ${url}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

const generatedInclude = {
  certificate: true,
  auditLogs: {
    select: { id: true, action: true, timestamp: true, notes: true },
  },
} satisfies Prisma.GmcRequestInclude;

type GeneratedRequestWithDetails = Prisma.GmcRequestGetPayload<{
  include: typeof generatedInclude;
}>;

async function writeSnapshot(
  generated: GeneratedRequestWithDetails[],
  counts: StatusCounts,
): Promise<string> {
  const outputDir = path.join(process.cwd(), "output");
  await mkdir(outputDir, { recursive: true });
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .replace(/\..+$/, "");
  const filePath = path.join(
    outputDir,
    `delete-generated-requests-backup-${timestamp}.json`,
  );

  const snapshot = {
    createdAt: new Date().toISOString(),
    dryRun: DRY_RUN,
    counts,
    generatedRequests: generated,
  };

  await writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
  return filePath;
}

async function main(): Promise<void> {
  const counts = await countStatuses();

  console.log("Current request status counts:");
  for (const status of Object.values(GmcRequestStatus)) {
    console.log(`  ${status}: ${counts[status]}`);
  }

  const mismatches = statusMismatches(counts);
  if (mismatches.length > 0) {
    console.error(
      "Aborting: live status counts do not match the expected pre-migration state",
    );
    for (const line of mismatches) {
      console.error(line);
    }
    process.exitCode = 1;
    return;
  }

  const generated = await prisma.gmcRequest.findMany({
    where: { status: "GENERATED" },
    include: generatedInclude,
  });

  const missingCertificateIds = generated
    .filter((request) => !request.certificate)
    .map((request) => request.requestReferenceNumber);

  if (missingCertificateIds.length > 0) {
    console.error(
      "Aborting: expected every GENERATED request to have a certificate before deletion",
    );
    for (const reference of missingCertificateIds) {
      console.error(`  ${reference}`);
    }
    process.exitCode = 1;
    return;
  }

  const snapshotPath = await writeSnapshot(generated, counts);
  console.log(`Snapshot written to ${snapshotPath}`);

  console.log("GENERATED requests to remove:");
  for (const request of generated) {
    console.log(
      `  ${request.requestReferenceNumber} ${request.studentLastName}, ${request.studentFirstName} (certificate ${request.certificate?.certificateNumber})`,
    );
  }

  if (DRY_RUN) {
    console.log("Dry run — no records deleted.");
    return;
  }

  for (const request of generated) {
    const pdfUrl = request.certificate?.generatedPdfUrl;
    if (!pdfUrl) {
      continue;
    }

    const otherReferences = await prisma.certificate.count({
      where: {
        generatedPdfUrl: pdfUrl,
        gmcRequestId: { not: request.id },
      },
    });

    if (otherReferences > 0) {
      console.warn(
        `  skipping blob cleanup for ${pdfUrl} (referenced by ${otherReferences} other certificate(s))`,
      );
      continue;
    }

    await safeDeleteStoredFile(pdfUrl);
  }

  const deleted = await prisma.$transaction(async (transaction) =>
    transaction.gmcRequest.deleteMany({ where: { status: "GENERATED" } }),
  );

  const countsAfter = await countStatuses();

  console.log(`Deleted ${deleted.count} GENERATED request record(s).`);
  console.log("Request status counts after:");
  for (const status of Object.values(GmcRequestStatus)) {
    console.log(`  ${status}: ${countsAfter[status]}`);
  }
  console.log(
    "Note: numbering counter and RELEASED/PENDING/REJECTED requests were left untouched.",
  );
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });