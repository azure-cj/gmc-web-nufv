export const GMC_REQUEST_PURPOSE_OPTIONS = [
  { value: "TRANSFER_OUT", label: "Transfer Out" },
  { value: "EMPLOYMENT", label: "Employment" },
  { value: "SCHOLARSHIP", label: "Scholarship" },
  { value: "INTERNSHIP", label: "Internship" },
  { value: "BOARD_EXAM", label: "Board Exam" },
  { value: "OTHER", label: "Other" },
] as const;

export type GmcRequestPurposeValue =
  (typeof GMC_REQUEST_PURPOSE_OPTIONS)[number]["value"];

export const GMC_REQUEST_PURPOSE_VALUES = GMC_REQUEST_PURPOSE_OPTIONS.map(
  (option) => option.value,
) as readonly GmcRequestPurposeValue[];

export const GMC_REQUEST_ACADEMIC_YEAR_OPTIONS = [
  "2024-2025",
  "2025-2026",
  "2026-2027",
  "2027-2028",
] as const;

export type GmcRequestAcademicYearValue =
  (typeof GMC_REQUEST_ACADEMIC_YEAR_OPTIONS)[number];

export const GMC_REQUEST_TERM_OPTIONS = [
  { value: "1", label: "Term 1" },
  { value: "2", label: "Term 2" },
  { value: "3", label: "Term 3" },
  { value: "4", label: "Term 4" },
  { value: "5", label: "Term 5" },
] as const;

export type GmcRequestTermValue =
  (typeof GMC_REQUEST_TERM_OPTIONS)[number]["value"];

export const GMC_REQUEST_TERM_VALUES = GMC_REQUEST_TERM_OPTIONS.map(
  (option) => option.value,
) as readonly GmcRequestTermValue[];

export const GMC_REQUEST_TITLE_PREFIX_OPTIONS = [
  { value: "Mr.", label: "Mr." },
  { value: "Mrs.", label: "Mrs." },
] as const;

export type GmcRequestTitlePrefixValue =
  (typeof GMC_REQUEST_TITLE_PREFIX_OPTIONS)[number]["value"];

export const GMC_REQUEST_TITLE_PREFIX_VALUES = GMC_REQUEST_TITLE_PREFIX_OPTIONS.map(
  (option) => option.value,
) as readonly GmcRequestTitlePrefixValue[];

export const GMC_REQUEST_PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024;

export const GMC_REQUEST_PAYMENT_PROOF_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export const GMC_REQUEST_PAYMENT_PROOF_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".pdf",
] as const;
