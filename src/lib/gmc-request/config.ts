import { GMC_REQUEST_ACADEMIC_YEAR_OPTIONS } from "./constants";

export const DEFAULT_GMC_REQUEST_FEE_PHP = 150;

export function getGmcRequestFeePhp(): number {
  const rawValue =
    process.env.GMC_REQUEST_FEE_PHP ?? process.env.NEXT_PUBLIC_GMC_REQUEST_FEE_PHP;

  if (!rawValue) {
    return DEFAULT_GMC_REQUEST_FEE_PHP;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_GMC_REQUEST_FEE_PHP;
}

export function formatPhpCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getGmcRequestAcademicYearOptions(): readonly string[] {
  return GMC_REQUEST_ACADEMIC_YEAR_OPTIONS;
}
