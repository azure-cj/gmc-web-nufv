import fs from "node:fs/promises";
import net from "node:net";
import tls from "node:tls";
import { randomUUID } from "node:crypto";
import type { EmailAttachment, EmailMessage, EmailService } from "./email-service";
import type { SmtpTransportConfig } from "./email-settings";

interface SmtpResponse {
  code: number;
  lines: string[];
  message: string;
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function chunkText(value: string, size: number): string {
  const chunks: string[] = [];

  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }

  return chunks.join("\r\n");
}

function encodeBase64(buffer: Buffer): string {
  return chunkText(buffer.toString("base64"), 76);
}

function normalizeBody(value: string): string {
  return value.replace(/\r?\n/g, "\r\n");
}

function dotStuff(value: string): string {
  return normalizeBody(value)
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

function toBuffer(value: Buffer | string): Buffer {
  return Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
}

async function loadAttachment(attachment: EmailAttachment): Promise<{
  filename: string;
  contentType: string;
  buffer: Buffer;
}> {
  if (attachment.content !== undefined) {
    return {
      filename: attachment.filename,
      contentType: attachment.contentType ?? "application/octet-stream",
      buffer: toBuffer(attachment.content),
    };
  }

  if (!attachment.path) {
    throw new Error(`Attachment ${attachment.filename} is missing content and path.`);
  }

  return {
    filename: attachment.filename,
    contentType: attachment.contentType ?? "application/octet-stream",
    buffer: await fs.readFile(attachment.path),
  };
}

function buildAddressHeader(value: string | string[] | undefined): string {
  if (!value) {
    return "";
  }

  return Array.isArray(value) ? value.join(", ") : value;
}

function buildMimeMessageHeaders(input: {
  from: string;
  to: string | string[];
  replyTo?: string;
  subject: string;
  contentType: string;
  transferEncoding?: string | null;
}): string[] {
  const headers = [
    `From: ${sanitizeHeaderValue(input.from)}`,
    `To: ${sanitizeHeaderValue(buildAddressHeader(input.to))}`,
    `Subject: ${sanitizeHeaderValue(input.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: ${input.contentType}`,
  ];

  if (input.replyTo) {
    headers.splice(3, 0, `Reply-To: ${sanitizeHeaderValue(input.replyTo)}`);
  }

  if (input.transferEncoding) {
    headers.push(`Content-Transfer-Encoding: ${input.transferEncoding}`);
  }

  return headers;
}

function buildBodyPart(contentType: string, body: string): string {
  return [
    `Content-Type: ${contentType}; charset=utf-8`,
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizeBody(body),
  ].join("\r\n");
}

async function buildMimeMessage(message: EmailMessage, from: string): Promise<string> {
  const attachments = await Promise.all(
    (message.attachments ?? []).map((attachment) => loadAttachment(attachment)),
  );

  const plainText = normalizeBody(message.text);
  const htmlText = message.html ? normalizeBody(message.html) : null;

  if (attachments.length === 0) {
    if (!htmlText) {
      return [
        ...buildMimeMessageHeaders({
          from,
          to: message.to,
          replyTo: message.replyTo,
          subject: message.subject,
          contentType: "text/plain; charset=utf-8",
          transferEncoding: "8bit",
        }),
        "",
        plainText,
      ].join("\r\n");
    }

    const boundary = `alt-${randomUUID()}`;
    return [
      ...buildMimeMessageHeaders({
        from,
        to: message.to,
        replyTo: message.replyTo,
        subject: message.subject,
        contentType: `multipart/alternative; boundary="${boundary}"`,
        transferEncoding: null,
      }),
      "",
      `--${boundary}`,
      buildBodyPart("text/plain", plainText),
      `--${boundary}`,
      buildBodyPart("text/html", htmlText),
      `--${boundary}--`,
      "",
    ].join("\r\n");
  }

  const mixedBoundary = `mixed-${randomUUID()}`;
  const alternativeBoundary = `alt-${randomUUID()}`;
  const sections: string[] = [
    ...buildMimeMessageHeaders({
      from,
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      contentType: `multipart/mixed; boundary="${mixedBoundary}"`,
      transferEncoding: null,
    }),
    "",
    `--${mixedBoundary}`,
  ];

  if (htmlText) {
    sections.push(
      `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
      "",
      `--${alternativeBoundary}`,
      buildBodyPart("text/plain", plainText),
      `--${alternativeBoundary}`,
      buildBodyPart("text/html", htmlText),
      `--${alternativeBoundary}--`,
      "",
    );
  } else {
    sections.push(buildBodyPart("text/plain", plainText), "");
  }

  for (const attachment of attachments) {
    sections.push(
      `--${mixedBoundary}`,
      `Content-Type: ${attachment.contentType}; name="${sanitizeHeaderValue(attachment.filename)}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${sanitizeHeaderValue(attachment.filename)}"`,
      "",
      encodeBase64(attachment.buffer),
      "",
    );
  }

  sections.push(`--${mixedBoundary}--`, "");
  return sections.join("\r\n");
}

class SmtpSession {
  private buffer = "";
  private currentLines: string[] = [];
  private pendingResponse:
    | {
        resolve: (response: SmtpResponse) => void;
        reject: (error: Error) => void;
      }
    | null = null;

  constructor(private socket: net.Socket | tls.TLSSocket) {
    this.socket.setEncoding("utf8");
    this.socket.on("data", (chunk) => {
      this.buffer += chunk;
      this.flush();
    });
    this.socket.on("error", (error) => {
      this.fail(error instanceof Error ? error : new Error(String(error)));
    });
    this.socket.on("close", () => {
      this.fail(new Error("SMTP connection closed unexpectedly."));
    });
  }

  private fail(error: Error): void {
    if (!this.pendingResponse) {
      return;
    }

    const pending = this.pendingResponse;
    this.pendingResponse = null;
    this.currentLines = [];
    this.buffer = "";
    pending.reject(error);
  }

  private resolveCurrentLinesIfComplete(): boolean {
    if (!this.pendingResponse || this.currentLines.length === 0) {
      return false;
    }

    const lastLine = this.currentLines[this.currentLines.length - 1];

    if (!/^\d{3} /.test(lastLine)) {
      return false;
    }

    const code = Number(lastLine.slice(0, 3));
    const lines = [...this.currentLines];
    const message = lines.map((entry) => entry.slice(4)).join("\n");
    const pending = this.pendingResponse;

    this.pendingResponse = null;
    this.currentLines = [];
    pending.resolve({
      code,
      lines,
      message,
    });

    return true;
  }

  private flush(): void {
    let newlineIndex = this.buffer.indexOf("\r\n");

    while (newlineIndex >= 0) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 2);

      if (line.length > 0 || this.pendingResponse) {
        this.currentLines.push(line);
      }

      if (/^\d{3} /.test(line)) {
        const code = Number(line.slice(0, 3));
        const lines = [...this.currentLines];
        const message = lines.map((entry) => entry.slice(4)).join("\n");
        this.currentLines = [];

        if (this.pendingResponse) {
          const pending = this.pendingResponse;
          this.pendingResponse = null;
          pending.resolve({
            code,
            lines,
            message,
          });
        }
      }

      newlineIndex = this.buffer.indexOf("\r\n");
    }

    this.resolveCurrentLinesIfComplete();
  }

  readResponse(): Promise<SmtpResponse> {
    if (this.pendingResponse) {
      throw new Error("SMTP response already pending.");
    }

    return new Promise<SmtpResponse>((resolve, reject) => {
      this.pendingResponse = { resolve, reject };
      this.flush();
      this.resolveCurrentLinesIfComplete();
    });
  }

  writeLine(value: string): void {
    this.socket.write(`${value}\r\n`, "utf8");
  }

  writeRaw(value: string): void {
    this.socket.write(value, "utf8");
  }

  end(): void {
    this.socket.end();
  }
}

function normalizeExpectedResponse(expectedCodes: number[], response: SmtpResponse, command: string): void {
  if (expectedCodes.includes(response.code)) {
    return;
  }

  throw new Error(
    `SMTP command failed for ${command}: ${response.code} ${response.message}`,
  );
}

async function createSocket(config: SmtpTransportConfig): Promise<net.Socket | tls.TLSSocket> {
  if (config.secure) {
    return await new Promise<tls.TLSSocket>((resolve, reject) => {
      const socket = tls.connect(
        {
          host: config.host,
          port: config.port,
          servername: config.host,
        },
        () => resolve(socket),
      );

      socket.once("error", reject);
    });
  }

  return await new Promise<net.Socket>((resolve, reject) => {
    const socket = net.connect(
      {
        host: config.host,
        port: config.port,
      },
      () => resolve(socket),
    );

    socket.once("error", reject);
  });
}

async function sendSmtpCommand(
  session: SmtpSession,
  command: string,
  expectedCodes: number[],
): Promise<SmtpResponse> {
  session.writeLine(command);
  const response = await session.readResponse();
  normalizeExpectedResponse(expectedCodes, response, command);
  return response;
}

async function authenticateIfNeeded(
  session: SmtpSession,
  config: SmtpTransportConfig,
): Promise<void> {
  if (!config.user || !config.pass) {
    return;
  }

  const initialResponse = await sendSmtpCommand(
    session,
    "AUTH LOGIN",
    [334, 235, 503],
  );

  if (initialResponse.code === 235 || initialResponse.code === 503) {
    return;
  }

  await sendSmtpCommand(
    session,
    Buffer.from(config.user, "utf8").toString("base64"),
    [334],
  );

  await sendSmtpCommand(
    session,
    Buffer.from(config.pass, "utf8").toString("base64"),
    [235],
  );
}

export class SmtpEmailService implements EmailService {
  constructor(private readonly config: SmtpTransportConfig) {}

  async send(message: EmailMessage): Promise<void> {
    const from = message.from?.trim() || this.config.from;
    const recipients = Array.isArray(message.to)
      ? message.to.map((recipient) => recipient.trim()).filter(Boolean)
      : [message.to.trim()].filter(Boolean);

    if (recipients.length === 0) {
      throw new Error("SMTP email message has no recipients.");
    }

    const socket = await createSocket(this.config);
    const session = new SmtpSession(socket);

    try {
      const greeting = await session.readResponse();
      normalizeExpectedResponse([220], greeting, "SMTP greeting");

      const ehlo = await sendSmtpCommand(session, `EHLO localhost`, [250]);

      if (ehlo.code !== 250) {
        throw new Error(`SMTP server rejected EHLO: ${ehlo.code} ${ehlo.message}`);
      }

      await authenticateIfNeeded(session, this.config);

      await sendSmtpCommand(session, `MAIL FROM:<${from}>`, [250, 251]);

      for (const recipient of recipients) {
        await sendSmtpCommand(session, `RCPT TO:<${recipient}>`, [250, 251]);
      }

      const mimeMessage = await buildMimeMessage(
        {
          ...message,
          to: recipients,
        },
        from,
      );

      await sendSmtpCommand(session, "DATA", [354]);
      session.writeRaw(`${dotStuff(mimeMessage)}\r\n.\r\n`);
      const dataResponse = await session.readResponse();
      normalizeExpectedResponse([250], dataResponse, "DATA payload");

      await sendSmtpCommand(session, "QUIT", [221]);
    } finally {
      session.end();
    }
  }
}
