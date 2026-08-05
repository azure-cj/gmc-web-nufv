export * from "./email-service";
export * from "./console-email-service";
export * from "./email-settings";
export * from "./smtp-email-service";

import { consoleEmailService } from "./console-email-service";
import { getEmailTransportMode, getSmtpTransportConfig } from "./email-settings";
import { SmtpEmailService } from "./smtp-email-service";

export function createConfiguredEmailService() {
  const transportMode = getEmailTransportMode();

  if (transportMode === "console") {
    return consoleEmailService;
  }

  const smtpConfig = getSmtpTransportConfig();

  if (!smtpConfig) {
    throw new Error(
      "EMAIL_TRANSPORT is set to smtp but SMTP_HOST is missing.",
    );
  }

  return new SmtpEmailService(smtpConfig);
}
