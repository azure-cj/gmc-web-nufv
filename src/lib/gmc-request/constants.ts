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

export const GMC_REQUEST_TITLE_PREFIX_OPTIONS = [
  { value: "Mr.", label: "Mr." },
  { value: "Mrs.", label: "Mrs." },
] as const;

export const GMC_REQUEST_COURSE_PROGRAM_OPTIONS = [
  "Bachelor of Arts in Communication",
  "Bachelor of Science in Accountancy",
  "Bachelor of Science in Architecture",
  "Bachelor of Science in Business Administration Major in Financial Management",
  "Bachelor of Science in Business Administration Major in Marketing Management",
  "Bachelor of Science in Civil Engineering",
  "Bachelor of Science in Computer Engineering",
  "Bachelor of Science in Hospitality Management",
  "Bachelor of Science in Information Technology",
  "Bachelor of Science in Psychology",
  "Bachelor of Science in Tourism Management",
] as const;

export type GmcRequestCourseProgramValue =
  (typeof GMC_REQUEST_COURSE_PROGRAM_OPTIONS)[number];

export const GMC_REQUEST_COURSE_PROGRAM_VALUES = GMC_REQUEST_COURSE_PROGRAM_OPTIONS;

export type GmcRequestTitlePrefixValue =
  (typeof GMC_REQUEST_TITLE_PREFIX_OPTIONS)[number]["value"];

export const GMC_REQUEST_TITLE_PREFIX_VALUES = GMC_REQUEST_TITLE_PREFIX_OPTIONS.map(
  (option) => option.value,
) as readonly GmcRequestTitlePrefixValue[];

export const GMC_REQUEST_PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024;

export const GMC_REQUEST_PAYMENT_PROOF_ALLOWED_MIME_TYPES = [
  "image/jpeg",
] as const;

export const GMC_REQUEST_PAYMENT_PROOF_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
] as const;
