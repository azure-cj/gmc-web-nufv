export const BUSINESS_TIME_ZONE = "Asia/Manila";
export const BUSINESS_TIME_ZONE_OFFSET_HOURS = 8;

function getBusinessDateParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "0"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "0"),
  };
}

export function getBusinessDateString(date: Date = new Date()): string {
  const { year, month, day } = getBusinessDateParts(date);
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
    day,
  ).padStart(2, "0")}`;
}

export function parseBusinessDateString(dateString: string): Date {
  return new Date(`${dateString}T00:00:00+08:00`);
}

export function addBusinessDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function getBusinessDayRange(date: Date = new Date()): {
  start: Date;
  endExclusive: Date;
} {
  const dateString = getBusinessDateString(date);
  return {
    start: parseBusinessDateString(dateString),
    endExclusive: parseBusinessDateString(addBusinessDays(dateString, 1)),
  };
}

export function getBusinessMonthRange(date: Date = new Date()): {
  start: Date;
  endExclusive: Date;
} {
  const { year, month } = getBusinessDateParts(date);
  const monthStart = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
  const nextMonthDate = new Date(Date.UTC(year, month, 1));
  const nextMonth = nextMonthDate.toISOString().slice(0, 7);
  return {
    start: parseBusinessDateString(monthStart),
    endExclusive: parseBusinessDateString(`${nextMonth}-01`),
  };
}

