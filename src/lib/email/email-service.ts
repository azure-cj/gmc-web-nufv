export interface EmailAttachment {
  filename: string;
  contentType?: string;
  path?: string;
  content?: Buffer | string;
}

export interface EmailMessage {
  to: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
}

export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}
