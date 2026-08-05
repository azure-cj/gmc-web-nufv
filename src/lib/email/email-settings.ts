export type EmailTransportMode = "console" | "smtp";

export interface ReleaseContactDetails {
  officeName: string;
  email: string | null;
  phone: string | null;
}

export interface SmtpTransportConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  pass: string | null;
  from: string;
  replyTo: string | null;
}

function readTrimmedEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

export function getEmailTransportMode(): EmailTransportMode {
  const configuredMode = readTrimmedEnv("EMAIL_TRANSPORT")?.toLowerCase();

  if (configuredMode === "smtp" || configuredMode === "console") {
    return configuredMode;
  }

  return "smtp";
}

export function getReleaseContactDetails(): ReleaseContactDetails {
  return {
    officeName: readTrimmedEnv("GMC_RELEASE_CONTACT_NAME") ?? "Discipline Office",
    email: readTrimmedEnv("GMC_RELEASE_CONTACT_EMAIL"),
    phone: readTrimmedEnv("GMC_RELEASE_CONTACT_PHONE"),
  };
}

export function getEmailFromAddress(): string {
  return (
    readTrimmedEnv("GMC_EMAIL_FROM") ??
    readTrimmedEnv("SMTP_USER") ??
    "no-reply@localhost"
  );
}

export function getSmtpTransportConfig(): SmtpTransportConfig | null {
  const host = readTrimmedEnv("SMTP_HOST");

  if (!host) {
    return null;
  }

  const from = getEmailFromAddress();
  const replyTo = readTrimmedEnv("SMTP_REPLY_TO") ?? readTrimmedEnv("GMC_RELEASE_CONTACT_EMAIL");

  return {
    host,
    port: parsePositiveInteger(readTrimmedEnv("SMTP_PORT"), 465),
    secure: parseBoolean(readTrimmedEnv("SMTP_SECURE"), true),
    user: readTrimmedEnv("SMTP_USER"),
    pass: readTrimmedEnv("SMTP_PASS"),
    from,
    replyTo,
  };
}
