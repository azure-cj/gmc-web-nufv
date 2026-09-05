import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { PurposeOfRequest } from "@prisma/client";
import { formatBusinessDate, formatPurposeRemarks } from "@/lib/gmc-request";

export const DEFAULT_CERTIFICATE_AUTHORIZED_SIGNATORY =
  process.env.GMC_CERTIFICATE_AUTHORIZED_SIGNATORY ?? "SHEILA MARIE R. RELLES, MA";

export const DEFAULT_CERTIFICATE_OFFICE_DESIGNATION =
  process.env.GMC_CERTIFICATE_OFFICE_DESIGNATION ?? "SDO Officer-in-Charge";

/* ── Verification URL ─────────────────────────────────────────────── */

export function buildCertificateVerificationUrl(verificationToken: string): string {
  const baseUrl = (
    process.env.GMC_CERTIFICATE_VERIFICATION_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");

  return `${baseUrl}/verify/${verificationToken}`;
}

/* ── Signature image lookup ───────────────────────────────────────── */

const SIGNATURE_IMAGE_BASE_DIR = path.join(
  process.cwd(),
  "public",
  "images",
  "signatures",
);

const SIGNATURE_IMAGE_LOOKUP: Record<string, string> = {
  "SHEILA MARIE R. RELLES, MA": path.join(
    SIGNATURE_IMAGE_BASE_DIR,
    "smr-esig.png",
  ),
};

const SIGNATURE_IMAGE_FALLBACK_LOOKUP: Record<string, string> = {
  "SHEILA MARIE R. RELLES, MA": path.join(
    SIGNATURE_IMAGE_BASE_DIR,
    "smr-esig.jpg",
  ),
};

const signatureImageCache = new Map<string, string | null>();

export async function warmSignatureImageCache(
  authorizedSignatory: string,
): Promise<void> {
  await loadSignatureImageBase64(authorizedSignatory);
}

async function loadSignatureImageBase64(
  authorizedSignatory: string,
): Promise<string | null> {
  const cacheKey = authorizedSignatory.trim();
  if (signatureImageCache.has(cacheKey)) {
    return signatureImageCache.get(cacheKey)!;
  }

  const explicitPath = process.env.GMC_CERTIFICATE_SIGNATURE_IMAGE_PATH;
  const lookupPath = SIGNATURE_IMAGE_LOOKUP[cacheKey];
  const fallbackPath = SIGNATURE_IMAGE_FALLBACK_LOOKUP[cacheKey];
  const candidates = [explicitPath, lookupPath, fallbackPath].filter(
    (filePath): filePath is string => Boolean(filePath),
  );

  for (const filePath of candidates) {
    try {
      const buffer = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === ".png" ? "image/png" : "image/jpeg";
      const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;
      signatureImageCache.set(cacheKey, dataUri);
      return dataUri;
    } catch {
      // fall through to the next candidate
    }
  }

  signatureImageCache.set(cacheKey, null);
  return null;
}

/* ── Letterhead background image ─────────────────────────────────── */

const CERTIFICATE_LETTERHEAD_IMAGE_DIR = path.join(
  process.cwd(),
  "public",
  "images",
  "certificate",
);

const CERTIFICATE_LETTERHEAD_IMAGE_FILENAME = "nu-fairview-letterhead.jpg";

let letterheadImageCache: string | null | undefined;

async function loadLetterheadBackgroundBase64(): Promise<string | null> {
  if (letterheadImageCache !== undefined) {
    return letterheadImageCache;
  }

  const explicitPath = process.env.GMC_CERTIFICATE_LETTERHEAD_IMAGE_PATH;
  const candidate =
    explicitPath ??
    path.join(
      CERTIFICATE_LETTERHEAD_IMAGE_DIR,
      CERTIFICATE_LETTERHEAD_IMAGE_FILENAME,
    );

  try {
    const buffer = await fs.readFile(candidate);
    const dataUri = `data:image/jpeg;base64,${buffer.toString("base64")}`;
    letterheadImageCache = dataUri;
    return dataUri;
  } catch {
    letterheadImageCache = null;
    return null;
  }
}

export interface GoodMoralCertificateTemplateInput {
  certificateNumber: string;
  studentFullName: string;
  studentId: string;
  courseProgram: string;
  term: string;
  academicYear: string;
  studentTitlePrefix: string | null;
  purposeOfRequest: PurposeOfRequest;
  officialReceiptNumber: string | null;
  hasViolationRecord: boolean;
  dateOfIssuance: Date;
  authorizedSignatory: string;
  officeDesignation: string;
  verificationToken: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTermDisplay(term: string): string {
  const trimmed = term.trim();
  if (!trimmed) return "";
  return /^Term\s/i.test(trimmed) ? trimmed : `Term ${trimmed}`;
}

export function buildCertificateTitlePrefixLine(
  studentTitlePrefix: string | null,
  studentFullName: string,
): string {
  const prefix = studentTitlePrefix?.trim();

  if (!prefix) {
    return studentFullName;
  }

  return `${prefix} ${studentFullName}`.trim();
}

export async function buildGoodMoralCertificateHtml(
  input: GoodMoralCertificateTemplateInput,
): Promise<string> {
  const dateOfIssuance = formatBusinessDate(input.dateOfIssuance);
  const titlePrefix = buildCertificateTitlePrefixLine(
    input.studentTitlePrefix,
    input.studentFullName,
  );
  const purposeRemarks = formatPurposeRemarks(input.purposeOfRequest);
  const receiptNumber = input.officialReceiptNumber?.trim() || "N/A";
  const signatureDataUri = await loadSignatureImageBase64(input.authorizedSignatory);
  const letterheadDataUri = await loadLetterheadBackgroundBase64();

  const verificationToken = input.verificationToken?.trim();
  const verificationUrl = verificationToken
    ? buildCertificateVerificationUrl(verificationToken)
    : null;
  const verificationQrDataUri = verificationUrl
    ? await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 240,
      })
    : null;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Certificate ${escapeHtml(input.certificateNumber)}</title>
    <style>
      @page {
        size: letter;
        margin: 0;
      }

      * {
        box-sizing: border-box;
      }

      body {
        height: 11in;
        margin: 0;
        padding: 2.15in 0.72in 0.88in;
        color: #111111;
        font-family: "Times New Roman", Times, serif;
        overflow: hidden;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        background-color: #ffffff;
        ${letterheadDataUri
          ? `background-image: url("${letterheadDataUri}");
        background-size: 100% 100%;
        background-repeat: no-repeat;
        background-position: center center;`
          : ""}
      }

      .sheet {
        height: 7.6in;
        max-height: 7.6in;
        overflow: hidden;
      }

      .top-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 24px;
        font-size: 12pt;
        line-height: 1.35;
        margin-bottom: 0;
      }

      .date-line {
        white-space: pre-wrap;
      }

      .certificate-number {
        text-align: right;
        white-space: nowrap;
      }

      .title-block {
        text-align: center;
        margin: 26px 0 30px;
      }

      .title {
        font-size: 17pt;
        font-style: italic;
        font-weight: 700;
        text-decoration: underline;
        text-underline-offset: 3px;
        margin: 0;
        line-height: 1.2;
      }

      .paragraph {
        font-size: 11.5pt;
        line-height: 1.38;
        margin: 0;
        text-align: justify;
      }

      .paragraph + .paragraph {
        margin-top: 10px;
      }

      .spacer-before-certified-by {
        height: 22px;
      }

      .certified-by {
        font-size: 12pt;
        font-style: italic;
        margin: 0 0 6px;
      }

      .signature-block {
        width: 420px;
        text-align: left;
        margin-bottom: 18px;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .signatory-name {
        font-size: 12pt;
        font-weight: 700;
        line-height: 1.35;
        margin: 0 0 4px;
      }

      .signatory-title {
        font-size: 12pt;
        line-height: 1.35;
        margin: 0;
      }

      .signatory-image {
        display: block;
        max-width: 144px;
        height: auto;
        margin: 0 0 6px;
      }

      .footer-block {
        font-size: 11.5pt;
        line-height: 1.3;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .sealed-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 24px;
        margin-top: 16px;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .qr-block {
        flex: 0 0 auto;
        width: 190px;
        text-align: center;
      }

      .qr-image {
        display: block;
        width: 100px;
        height: 100px;
        margin: 0 auto 4px;
      }

      .qr-caption {
        font-size: 9.5pt;
        font-weight: 700;
        line-height: 1.25;
        margin: 0;
      }

      .footer-line {
        font-weight: 700;
        margin: 0;
      }

      .footer-note {
        font-weight: 700;
        margin: 0;
      }

      .remarks {
        margin-top: 8px;
        font-size: 11.5pt;
        line-height: 1.3;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .remarks-label {
        font-weight: 400;
      }

      .remarks-text {
        font-weight: 700;
        font-style: italic;
      }

      .receipt-number {
        font-weight: 700;
      }

      @media print {
        body {
          height: 11in;
          padding: 2.15in 0.72in 0.88in;
        }
      }
    </style>
  </head>
  <body>
    <article class="sheet">
      <div class="top-row">
        <div class="date-line">${escapeHtml(dateOfIssuance)}</div>
        <div class="certificate-number">Certificate No. ${escapeHtml(input.certificateNumber)}</div>
      </div>

      <div class="title-block">
        <h1 class="title">CERTIFICATION OF GOOD MORAL CHARACTER</h1>
      </div>

      <p class="paragraph">
        This is to certify that ${escapeHtml(input.studentFullName)}, with student number ${escapeHtml(input.studentId)}, was a student of ${escapeHtml(input.courseProgram)} at NU Fairview for ${escapeHtml(formatTermDisplay(input.term))}, Academic Year ${escapeHtml(input.academicYear)}.
      </p>

      <p class="paragraph">
        It is further certified that ${escapeHtml(titlePrefix)} ${input.hasViolationRecord
          ? `has a derogatory record and/or has been subjected to disciplinary action while a student at university.`
          : `is of good moral character and has no derogatory records while a student at the University.`}
      </p>

      <div class="spacer-before-certified-by"></div>

      <div class="signature-block">
        <p class="certified-by">Certified by</p>
        ${signatureDataUri ? `<img class="signatory-image" src="${signatureDataUri}" alt="Signature of ${escapeHtml(input.authorizedSignatory)}" />` : ""}
        <p class="signatory-name">${escapeHtml(input.authorizedSignatory)}</p>
        <p class="signatory-title">${escapeHtml(input.officeDesignation)}</p>
      </div>

      <div class="sealed-row">
        <div class="footer-block">
          <p class="footer-line receipt-number">Student Official Receipt Number ${escapeHtml(receiptNumber)}</p>
          <p class="footer-note">For verification, please directly contact the Discipline Office*</p>
        </div>
        ${verificationToken && verificationQrDataUri
          ? `<div class="qr-block">
            <a class="qr-link" href="${escapeHtml(verificationUrl!)}" aria-label="Open the verification page for this certificate">
              <img class="qr-image" src="${verificationQrDataUri}" alt="Scan this QR code to verify the certificate" />
            </a>
            <p class="qr-caption">Scan this QR code to verify this certificate's authenticity.</p>
          </div>`
          : ""}
      </div>

      <p class="remarks">
        <span class="remarks-label">D.O. Remarks:</span>
        <span class="remarks-text"> ${escapeHtml(purposeRemarks)}</span>
      </p>
    </article>
  </body>
</html>`;
}
