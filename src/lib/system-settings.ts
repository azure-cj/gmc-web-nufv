import { prisma } from "@/lib/prisma";

export const SYSTEM_SETTING_KEYS = {
  CURRENT_ACADEMIC_YEAR: "current_academic_year",
  CURRENT_TERM: "current_term",
} as const;

export const DEFAULT_ACADEMIC_YEAR = "2026-2027";
export const DEFAULT_TERM = "Term 1";

export async function getSystemSetting(key: string): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({
    where: { key },
  });

  if (!row) {
    return null;
  }

  return row.value;
}

export async function getCurrentAcademicYear(): Promise<string> {
  return (await getSystemSetting(SYSTEM_SETTING_KEYS.CURRENT_ACADEMIC_YEAR)) ??
    DEFAULT_ACADEMIC_YEAR;
}

export async function getCurrentTerm(): Promise<string> {
  return (await getSystemSetting(SYSTEM_SETTING_KEYS.CURRENT_TERM)) ??
    DEFAULT_TERM;
}
