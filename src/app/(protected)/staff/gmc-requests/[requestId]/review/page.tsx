import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StaffCertificateReviewClient from "@/components/staff/staff-certificate-review-client";
import {
  buildCertificateReviewDraft,
  loadGeneratedCertificateReviewRequest,
} from "@/server/services/certificate-review-service";

export const dynamic = "force-dynamic";

interface StaffGmcCertificateReviewPageProps {
  params: Promise<{
    requestId: string;
  }>;
  searchParams?: Promise<{
    returnTo?: string | string[];
  }>;
}

function firstSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function safeReturnTo(value: string): string {
  if (value.startsWith("/")) {
    return value;
  }

  return "/staff/gmc-requests";
}

export default async function StaffGmcCertificateReviewPage({
  params,
  searchParams,
}: StaffGmcCertificateReviewPageProps) {
  const { requestId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const returnTo = safeReturnTo(firstSearchParam(resolvedSearchParams.returnTo));

  const request = await loadGeneratedCertificateReviewRequest(prisma, requestId);

  if (
    !request ||
    !request.certificate ||
    (request.status !== "GENERATED" &&
      request.status !== "DELIVERY_FAILED" &&
      request.status !== "RELEASED")
  ) {
    notFound();
  }

  return (
    <StaffCertificateReviewClient
      initialDraft={buildCertificateReviewDraft(request)}
      returnTo={returnTo}
    />
  );
}
