import { PurposeOfRequest } from "@prisma/client";

export const PURPOSE_REMARKS_MAP: Record<PurposeOfRequest, string> = {
  TRANSFER_OUT: "Valid only as Transfer Credentials.",
  EMPLOYMENT: "Valid only for Employment Purposes.",
  SCHOLARSHIP: "Valid only for Scholarship Application Purposes.",
  INTERNSHIP: "Valid only for Internship Purposes.",
  BOARD_EXAM: "Valid only for Board Examination Purposes.",
  OTHER: "Valid only for the stated purpose.",
};

export function formatPurposeRemarks(value: PurposeOfRequest | string): string {
  return PURPOSE_REMARKS_MAP[value as PurposeOfRequest] ?? "Valid only for the stated purpose.";
}
