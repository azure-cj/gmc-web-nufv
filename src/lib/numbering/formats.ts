export const BUSINESS_TIME_ZONE = "Asia/Manila";
export const MONTHLY_SEQUENCE_DIGITS = 6;

export function getBusinessYearMonth(
  date: Date,
  timeZone: string = BUSINESS_TIME_ZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";

  return `${year}-${month}`;
}

export function formatSequence(sequence: number): string {
  return String(sequence).padStart(MONTHLY_SEQUENCE_DIGITS, "0");
}

export function buildRequestReferenceNumber(
  yearMonth: string,
  sequence: number,
): string {
  return `GMC-${yearMonth}-${formatSequence(sequence)}`;
}

export function buildCertificateNumber(
  yearMonth: string,
  sequence: number,
): string {
  return `${yearMonth}-${formatSequence(sequence)}`;
}
