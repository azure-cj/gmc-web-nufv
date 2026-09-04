import {
  GMC_REQUEST_COURSE_PROGRAM_VALUES,
  GMC_REQUEST_PAYMENT_PROOF_MAX_BYTES,
  GMC_REQUEST_PAYMENT_RECEIPT_MAX_LENGTH,
  GMC_REQUEST_PURPOSE_VALUES,
  GMC_REQUEST_TITLE_PREFIX_VALUES,
  INVOICE_NUMBER_FORMAT_HINT,
  INVOICE_NUMBER_PATTERN,
  type GmcRequestCourseProgramValue,
  type GmcRequestPurposeValue,
  type GmcRequestTitlePrefixValue,
} from "./constants";

export type GmcRequestFieldName =
  | "studentId"
  | "titlePrefix"
  | "firstName"
  | "middleInitial"
  | "lastName"
  | "courseProgram"
  | "academicYear"
  | "term"
  | "purposeOfRequest"
  | "email"
  | "paymentReceiptNumber"
  | "paymentProofFile"
  | "accuracyCertified";

export type GmcRequestFieldErrors = Partial<Record<GmcRequestFieldName, string>>;

export interface GmcRequestSubmissionInput {
  studentId: string;
  titlePrefix: string;
  firstName: string;
  middleInitial: string;
  lastName: string;
  courseProgram: string;
  academicYear: string;
  term: string;
  purposeOfRequest: string;
  email: string;
  paymentReceiptNumber: string;
  paymentProofFile: File | null;
  accuracyCertified?: boolean;
}

export interface GmcRequestSubmissionValues {
  studentId: string;
  titlePrefix: GmcRequestTitlePrefixValue;
  firstName: string;
  middleInitial: string | null;
  lastName: string;
  courseProgram: GmcRequestCourseProgramValue;
  academicYear: string;
  term: string;
  purposeOfRequest: GmcRequestPurposeValue;
  email: string;
  paymentReceiptNumber: string;
  paymentProofFile: File;
  accuracyCertified: boolean;
}

export interface GmcRequestValidationResult {
  fieldErrors: GmcRequestFieldErrors;
  values?: GmcRequestSubmissionValues;
}

export const STUDENT_ID_PATTERN = /^\d{4}-\d{1,10}$/;
export const STUDENT_ID_FORMAT_HINT =
  "Use the format YEAR-NUMBER (4-digit year, hyphen, then up to 10 digits), e.g. 2021-123456.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIDDLE_INITIAL_PATTERN = /^[A-Za-z]$/;

function getFileMagicSignature(file: File): Promise<Uint8Array> {
  return file.slice(0, 8).arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

export function isJpeg(signature: Uint8Array): boolean {
  return (
    signature.length >= 3 &&
    signature[0] === 0xff &&
    signature[1] === 0xd8 &&
    signature[2] === 0xff
  );
}

function validatePaymentReceiptNumber(value: string): string | null {
  const receiptNumber = value.trim();

  if (!receiptNumber) {
    return "Invoice / receipt number is required.";
  }

  if (receiptNumber.length > GMC_REQUEST_PAYMENT_RECEIPT_MAX_LENGTH) {
    return `The invoice / receipt number must be ${GMC_REQUEST_PAYMENT_RECEIPT_MAX_LENGTH} characters or fewer.`;
  }

  if (!INVOICE_NUMBER_PATTERN.test(receiptNumber)) {
    return INVOICE_NUMBER_FORMAT_HINT;
  }

  return null;
}

export async function validatePaymentProofFile(file: File | null): Promise<string | null> {
  if (!file) {
    return "Upload a JPG/JPEG file of your payment receipt.";
  }

  if (file.size <= 0) {
    return "Upload a valid payment proof file.";
  }

  if (file.size > GMC_REQUEST_PAYMENT_PROOF_MAX_BYTES) {
    return "The payment proof must be 5 MB or smaller.";
  }

  try {
    const signature = await getFileMagicSignature(file);
    const isAllowedType = isJpeg(signature);

    if (!isAllowedType) {
      return "Only JPG/JPEG files are accepted. Please remove this file and upload a JPEG photo of your receipt.";
    }
  } catch {
    return "Unable to read the uploaded file. Please upload a valid JPG/JPEG photo.";
  }

  return null;
}

export async function validateGmcRequestSubmission(
  input: GmcRequestSubmissionInput,
): Promise<GmcRequestValidationResult> {
  const fieldErrors: GmcRequestFieldErrors = {};

  const studentId = input.studentId.trim();
  const titlePrefix = input.titlePrefix.trim();
  const firstName = input.firstName.trim();
  const middleInitial = input.middleInitial.trim();
  const lastName = input.lastName.trim();
  const courseProgram = input.courseProgram.trim();
  const academicYear = input.academicYear.trim();
  const term = input.term.trim();
  const purposeOfRequest = input.purposeOfRequest.trim();
  const email = input.email.trim();
  const paymentReceiptNumber = input.paymentReceiptNumber?.trim() ?? "";

  if (!studentId) {
    fieldErrors.studentId = "Student ID number is required.";
  } else if (!STUDENT_ID_PATTERN.test(studentId)) {
    fieldErrors.studentId =
      "Student ID must be in the format YEAR-NUMBER (4-digit year, hyphen, then up to 10 digits).";
  }

  if (!titlePrefix) {
    fieldErrors.titlePrefix = "Title prefix is required.";
  } else if (
    !GMC_REQUEST_TITLE_PREFIX_VALUES.includes(
      titlePrefix as GmcRequestTitlePrefixValue,
    )
  ) {
    fieldErrors.titlePrefix = "Select a valid title prefix.";
  }

  if (!firstName) {
    fieldErrors.firstName = "First name is required.";
  }

  if (middleInitial) {
    if (middleInitial.length > 1) {
      fieldErrors.middleInitial = "Middle initial must be a single character.";
    } else if (!MIDDLE_INITIAL_PATTERN.test(middleInitial)) {
      fieldErrors.middleInitial = "Middle initial must be a letter.";
    }
  }

  if (!lastName) {
    fieldErrors.lastName = "Last name is required.";
  }

  if (!courseProgram) {
    fieldErrors.courseProgram = "Course / program is required.";
  } else if (
    !GMC_REQUEST_COURSE_PROGRAM_VALUES.includes(
      courseProgram as GmcRequestCourseProgramValue,
    )
  ) {
    fieldErrors.courseProgram = "Select a valid course / program.";
  }

  if (!academicYear) {
    fieldErrors.academicYear = "Academic year is required.";
  }

  if (!term) {
    fieldErrors.term = "Term is required.";
  }

  if (!purposeOfRequest) {
    fieldErrors.purposeOfRequest = "Purpose of request is required.";
  } else if (
    !GMC_REQUEST_PURPOSE_VALUES.includes(
      purposeOfRequest as GmcRequestPurposeValue,
    )
  ) {
    fieldErrors.purposeOfRequest = "Select a valid purpose of request.";
  }

  if (!email) {
    fieldErrors.email = "Email address is required.";
  } else if (!EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  const paymentReceiptNumberError = validatePaymentReceiptNumber(
    paymentReceiptNumber,
  );

  if (paymentReceiptNumberError) {
    fieldErrors.paymentReceiptNumber = paymentReceiptNumberError;
  }

  const paymentProofFileError = await validatePaymentProofFile(
    input.paymentProofFile,
  );

  if (paymentProofFileError) {
    fieldErrors.paymentProofFile = paymentProofFileError;
  }

  if (!input.accuracyCertified) {
    fieldErrors.accuracyCertified =
      "You must certify that all information provided is true and accurate.";
  }

  if (Object.keys(fieldErrors).length > 0 || !input.paymentProofFile) {
    return { fieldErrors };
  }

  return {
    fieldErrors,
    values: {
      studentId,
      titlePrefix: titlePrefix as GmcRequestTitlePrefixValue,
      firstName,
      middleInitial: middleInitial ? middleInitial.toUpperCase() : null,
      lastName,
      courseProgram: courseProgram as GmcRequestCourseProgramValue,
      academicYear,
      term,
      purposeOfRequest: purposeOfRequest as GmcRequestPurposeValue,
      email,
      paymentReceiptNumber,
      paymentProofFile: input.paymentProofFile,
      accuracyCertified: Boolean(input.accuracyCertified),
    },
  };
}
