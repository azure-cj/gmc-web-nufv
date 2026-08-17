import {
  GMC_REQUEST_ACADEMIC_YEAR_OPTIONS,
  GMC_REQUEST_PAYMENT_PROOF_MAX_BYTES,
  GMC_REQUEST_PURPOSE_VALUES,
  GMC_REQUEST_TITLE_PREFIX_VALUES,
  type GmcRequestAcademicYearValue,
  type GmcRequestPurposeValue,
  GMC_REQUEST_TERM_VALUES,
  type GmcRequestTermValue,
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
  paymentProofFile: File | null;
  accuracyCertified?: boolean;
}

export interface GmcRequestSubmissionValues {
  studentId: string;
  titlePrefix: GmcRequestTitlePrefixValue;
  firstName: string;
  middleInitial: string | null;
  lastName: string;
  courseProgram: string;
  academicYear: GmcRequestAcademicYearValue;
  term: GmcRequestTermValue;
  purposeOfRequest: GmcRequestPurposeValue;
  email: string;
  paymentProofFile: File;
  accuracyCertified: boolean;
}

export interface GmcRequestValidationResult {
  fieldErrors: GmcRequestFieldErrors;
  values?: GmcRequestSubmissionValues;
}

const STUDENT_ID_PATTERN = /^\d{4}-\d{6}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIDDLE_INITIAL_PATTERN = /^[A-Za-z]$/;

function getFileMagicSignature(file: File): Promise<Uint8Array> {
  return file.slice(0, 8).arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

function isPng(signature: Uint8Array): boolean {
  return (
    signature.length >= 8 &&
    signature[0] === 0x89 &&
    signature[1] === 0x50 &&
    signature[2] === 0x4e &&
    signature[3] === 0x47 &&
    signature[4] === 0x0d &&
    signature[5] === 0x0a &&
    signature[6] === 0x1a &&
    signature[7] === 0x0a
  );
}

function isJpeg(signature: Uint8Array): boolean {
  return (
    signature.length >= 3 &&
    signature[0] === 0xff &&
    signature[1] === 0xd8 &&
    signature[2] === 0xff
  );
}

function isPdf(signature: Uint8Array): boolean {
  return (
    signature.length >= 5 &&
    signature[0] === 0x25 &&
    signature[1] === 0x50 &&
    signature[2] === 0x44 &&
    signature[3] === 0x46 &&
    signature[4] === 0x2d
  );
}

async function validatePaymentProofFile(file: File | null): Promise<string | null> {
  if (!file) {
    return "Upload a JPG, PNG, or PDF file.";
  }

  if (file.size <= 0) {
    return "Upload a valid payment proof file.";
  }

  if (file.size > GMC_REQUEST_PAYMENT_PROOF_MAX_BYTES) {
    return "The payment proof must be 5 MB or smaller.";
  }

  const signature = await getFileMagicSignature(file);
  const isAllowedType = isJpeg(signature) || isPng(signature) || isPdf(signature);

  if (!isAllowedType) {
    return "Only JPG, PNG, or PDF files are allowed.";
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

  if (!studentId) {
    fieldErrors.studentId = "Student ID number is required.";
  } else if (!STUDENT_ID_PATTERN.test(studentId)) {
    fieldErrors.studentId = "Use the institutional ID format 2021-123456.";
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
  }

  if (!academicYear) {
    fieldErrors.academicYear = "Academic year is required.";
  } else if (
    !GMC_REQUEST_ACADEMIC_YEAR_OPTIONS.includes(
      academicYear as GmcRequestAcademicYearValue,
    )
  ) {
    fieldErrors.academicYear = "Select a valid academic year.";
  }

  if (!term) {
    fieldErrors.term = "Term is required.";
  } else if (!GMC_REQUEST_TERM_VALUES.includes(term as GmcRequestTermValue)) {
    fieldErrors.term = "Select a valid term.";
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
      courseProgram,
      academicYear: academicYear as GmcRequestAcademicYearValue,
      term: term as GmcRequestTermValue,
      purposeOfRequest: purposeOfRequest as GmcRequestPurposeValue,
      email,
      paymentProofFile: input.paymentProofFile,
      accuracyCertified: Boolean(input.accuracyCertified),
    },
  };
}
