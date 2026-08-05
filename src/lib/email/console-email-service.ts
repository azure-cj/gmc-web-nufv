import type { EmailMessage, EmailService } from "./email-service";

export class ConsoleEmailService implements EmailService {
  async send(message: EmailMessage): Promise<void> {
    console.info("[EmailStub]", {
      to: message.to,
      from: message.from,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments?.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        path: attachment.path,
        size:
          typeof attachment.content === "string"
            ? Buffer.byteLength(attachment.content)
            : Buffer.isBuffer(attachment.content)
              ? attachment.content.byteLength
              : undefined,
      })),
    });
  }
}

export const consoleEmailService = new ConsoleEmailService();
