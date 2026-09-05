import {
  GmcRequestStatus,
  PaymentVerificationStatus,
  PurposeOfRequest,
  StaffRole,
} from "@prisma/client";
import { BUSINESS_TIME_ZONE } from "@/lib/business-time";

const PURPOSE_LABELS: Record<PurposeOfRequest, string> = {
  TRANSFER_OUT: "Transfer Out",
  EMPLOYMENT: "Employment",
  SCHOLARSHIP: "Scholarship",
  INTERNSHIP: "Internship",
  BOARD_EXAM: "Board Exam",
  OTHER: "Other",
};

const STATUS_LABELS: Partial<Record<GmcRequestStatus, string>> = {
  PENDING: "Pending",
  REJECTED: "Rejected",
  RELEASED: "Released",
};

const PAYMENT_VERIFICATION_LABELS: Record<PaymentVerificationStatus, string> = {
  UNVERIFIED: "Unverified",
  VALID: "Valid",
  INVALID: "Invalid",
};

const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  DISCIPLINE_OFFICE_STAFF: "Discipline Office Staff",
  ADMIN: "Admin",
};

const fileViewerImageExtensions = [".jpg", ".jpeg", ".png"];

export function formatPurposeLabel(value: PurposeOfRequest | string): string {
  return PURPOSE_LABELS[value as PurposeOfRequest] ?? value;
}

export function formatRequestStatusLabel(
  value: GmcRequestStatus | string,
): string {
  return STATUS_LABELS[value as GmcRequestStatus] ?? value;
}

export function formatPaymentVerificationLabel(
  value: PaymentVerificationStatus | string,
): string {
  return PAYMENT_VERIFICATION_LABELS[value as PaymentVerificationStatus] ?? value;
}

export function formatStaffRoleLabel(value: StaffRole | string): string {
  return STAFF_ROLE_LABELS[value as StaffRole] ?? value;
}

export function formatBusinessDateTime(value: Date | string): string {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date(value));
}

export function formatBusinessDate(value: Date | string): string {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(new Date(value));
}

export function getFileViewerKind(fileUrl: string | null | undefined): "image" | "pdf" | "link" {
  if (!fileUrl) {
    return "link";
  }

  const lower = fileUrl.toLowerCase();

  if (fileViewerImageExtensions.some((extension) => lower.endsWith(extension))) {
    return "image";
  }

  if (lower.endsWith(".pdf")) {
    return "pdf";
  }

  return "link";
}
