import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorageService } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  const eligibleRequests = await prisma.gmcRequest.findMany({
    where: {
      status: { in: ["RELEASED", "REJECTED"] },
      AND: [
        {
          OR: [
            { dateReleased: { lte: cutoffDate } },
            { dateReleased: null, dateSubmitted: { lte: cutoffDate } },
          ],
        },
        {
          OR: [
            { paymentProofFileUrl: { not: null } },
            { certificate: { is: { generatedPdfUrl: { not: null } } } },
          ],
        },
      ],
    },
    include: {
      certificate: true,
    },
    take: 100,
  });

  let paymentProofsPurged = 0;
  let certificatePdfsPurged = 0;
  const errors: string[] = [];

  for (const record of eligibleRequests) {
    // 1. Purge Payment Proof
    if (record.paymentProofFileUrl) {
      try {
        await getStorageService().delete(record.paymentProofFileUrl);
      } catch (err) {
        console.warn(
          `[cleanup-retention] Failed deleting payment proof Blob for request ${record.id}:`,
          err,
        );
      }

      try {
        await prisma.$transaction([
          prisma.gmcRequest.update({
            where: { id: record.id },
            data: { paymentProofFileUrl: null },
          }),
          prisma.auditLogEntry.create({
            data: {
              gmcRequestId: record.id,
              actorId: null,
              action: "PAYMENT_PROOF_PURGED",
              notes: "Payment proof file purged by automated retention policy (30 days post-release).",
            },
          }),
        ]);
        paymentProofsPurged++;
      } catch (dbErr) {
        const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
        errors.push(`Payment proof DB update failed for request ${record.id}: ${msg}`);
      }
    }

    // 2. Purge Certificate PDF (retaining DB record & generatedPdfUrl as flag for on-demand regeneration)
    if (record.certificate?.generatedPdfUrl) {
      try {
        await getStorageService().delete(record.certificate.generatedPdfUrl);
      } catch (err) {
        console.warn(
          `[cleanup-retention] Failed deleting certificate PDF Blob for certificate ${record.certificate.id}:`,
          err,
        );
      }

      try {
        // Record audit entry for certificate PDF purging (generatedPdfUrl is kept as a reference for on-demand regeneration)
        await prisma.auditLogEntry.create({
          data: {
            gmcRequestId: record.id,
            actorId: null,
            action: "CERTIFICATE_PDF_PURGED",
            notes: `Certificate PDF ${record.certificate.certificateNumber} purged from storage by automated retention policy; available for on-demand regeneration.`,
          },
        });
        certificatePdfsPurged++;
      } catch (dbErr) {
        const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
        errors.push(`Certificate audit log creation failed for request ${record.id}: ${msg}`);
      }
    }
  }

  return NextResponse.json({
    success: true,
    processedCount: eligibleRequests.length,
    paymentProofsPurged,
    certificatePdfsPurged,
    errors: errors.length > 0 ? errors : undefined,
  });
}
