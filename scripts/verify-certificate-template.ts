import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { PDFDocument } from "pdf-lib";
import {
  buildGoodMoralCertificateHtml,
  type GoodMoralCertificateTemplateInput,
} from "../src/templates/gmc-certificate-template";
import { renderCertificateHtmlToPdfBuffer } from "../src/server/services/certificate-pdf-service";

const BROWSER_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

const LETTERHEAD_METRICS = {
  headerBottomPx: Math.ceil((129 / 1024) * 1056), // top graphic band ends ~1.39in
  footerBarTopPx: Math.floor((1003 / 1024) * 1056), // footer bar starts ~10.37in
};

const TOKEN = "test-verification-token-0001";
const DATE_OF_ISSUANCE = new Date("2026-09-05T08:00:00Z");

const BASE: GoodMoralCertificateTemplateInput = {
  certificateNumber: "2026-09-000100",
  studentFullName: "QR V. Test",
  studentId: "2026-1234567",
  courseProgram: "BS Computer Science",
  term: "Term 2",
  academicYear: "2025-2026",
  studentTitlePrefix: null,
  purposeOfRequest: "SCHOLARSHIP" as const,
  officialReceiptNumber: "OR-2026-000000012345",
  hasViolationRecord: false,
  dateOfIssuance: DATE_OF_ISSUANCE,
  authorizedSignatory: "SHEILA MARIE R. RELLES, MA",
  officeDesignation: "SDO Officer-in-Charge",
  verificationToken: TOKEN,
};

async function probeLayout(html: string) {
  const browser = await puppeteer.launch({
    executablePath: BROWSER_CANDIDATES.find(existsSync),
    headless: true,
    args: ["--allow-file-access-from-files", "--no-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 816, height: 1056 });
    await page.setContent(html, { waitUntil: "load" });
    return await page.evaluate(() => {
      const sheet = document.querySelector<HTMLElement>(".sheet")!;
      const remarks = document.querySelector<HTMLElement>(".remarks")!;
      const dateLine = document.querySelector<HTMLElement>(".date-line")!;
      const qrBlock = document.querySelector<HTMLElement>(".qr-block");
      const qrImage = document.querySelector<HTMLElement>(".qr-image");
      const footerBlock = document.querySelector<HTMLElement>(".footer-block")!;
      const sheetRect = sheet.getBoundingClientRect();
      const remarksRect = remarks.getBoundingClientRect();
      const dateLineRect = dateLine.getBoundingClientRect();
      const qrBlockRect = qrBlock?.getBoundingClientRect();
      const qrImageRect = qrImage?.getBoundingClientRect();
      const footerRect = footerBlock.getBoundingClientRect();
      return {
        sheetTop: sheetRect.top,
        sheetBottom: sheetRect.bottom,
        sheetHeight: sheetRect.height,
        dateLineTop: dateLineRect.top,
        remarksBottom: remarksRect.bottom,
        remarksTop: remarksRect.top,
        qrBlockLeft: qrBlockRect?.left ?? null,
        qrBlockRight: qrBlockRect?.right ?? null,
        qrBlockBottom: qrBlockRect?.bottom ?? null,
        qrImageWidth: qrImageRect?.width ?? null,
        qrImageHeight: qrImageRect?.height ?? null,
        footerRight: footerRect.right,
      };
    });
  } finally {
    await browser.close();
  }
}

interface CaseResult {
  name: string;
  ok: boolean;
  issues: string[];
  pageCount: number;
  layout: Awaited<ReturnType<typeof probeLayout>>;
}

const results: CaseResult[] = [];

const cases: Array<{ name: string; input: GoodMoralCertificateTemplateInput }> = [
  {
    name: "short",
    input: BASE,
  },
  {
    name: "long",
    input: {
      ...BASE,
      studentFullName: "JUAN MIGUEL ANTONIO DELA CRUZ SANTOS III",
      studentId: "2023-9876543210",
      courseProgram:
        "BS Computer Engineering with Specialization in Software and Systems Track",
      academicYear: "2026-2027",
      studentTitlePrefix: "Mr.",
      purposeOfRequest: "SCHOLARSHIP",
      term: "Term 3",
    },
  },
  {
    name: "no-banner-token",
    input: { ...BASE, verificationToken: null },
  },
];

for (const testCase of cases) {
  const issues: string[] = [];
  const { name, input } = testCase;
  const html = await buildGoodMoralCertificateHtml(input);

  const layout = await probeLayout(html);
  const pdfBuffer = await renderCertificateHtmlToPdfBuffer(html);
  const pdf = await PDFDocument.load(pdfBuffer);
  const pageCount = pdf.getPageCount();

  const hasQr = Boolean(input.verificationToken);
  const qrCaption = html.includes(
    "Scan this QR code to verify this certificate's authenticity.",
  );

  if (pageCount !== 1) {
    issues.push(`pdf page count = ${pageCount}`);
  }

  if (layout.dateLineTop < LETTERHEAD_METRICS.headerBottomPx) {
    issues.push(
      `date line (top=${layout.dateLineTop.toFixed(1)}px) overlaps letterhead header (safe below ${LETTERHEAD_METRICS.headerBottomPx}px)`,
    );
  }

  if (layout.remarksBottom > layout.sheetBottom + 0.5) {
    issues.push(
      `remarks bottom (${layout.remarksBottom.toFixed(1)}px) exceeds sheet bottom (${layout.sheetBottom.toFixed(1)}px)`,
    );
  }

  if (layout.remarksBottom > LETTERHEAD_METRICS.footerBarTopPx) {
    issues.push(
      `remarks bottom (${layout.remarksBottom.toFixed(1)}px) crosses letterhead footer bar (starts ${LETTERHEAD_METRICS.footerBarTopPx}px)`,
    );
  }

  if (hasQr) {
    if (!qrCaption) {
      issues.push("QR caption missing");
    }
    if (layout.qrImageWidth !== 100) {
      issues.push(`qr width = ${layout.qrImageWidth}`);
    }
    if (layout.qrBlockBottom !== null && layout.qrBlockBottom > layout.sheetBottom + 0.5) {
      issues.push(
        `qr block bottom (${layout.qrBlockBottom.toFixed(1)}px) exceeds sheet bottom`,
      );
    }
    if (
      layout.qrBlockLeft !== null &&
      layout.qrBlockLeft < layout.footerRight + 8
    ) {
      issues.push(
        `qr block (left=${layout.qrBlockLeft.toFixed(1)}px) overlaps footer text (right=${layout.footerRight.toFixed(1)}px)`,
      );
    }
  } else {
    if (qrCaption) {
      issues.push("QR/caption present without verification token");
    }
  }

  results.push({
    name,
    ok: issues.length === 0,
    issues,
    pageCount,
    layout,
  });

  if (name !== "no-banner-token") {
    const outDir = path.join(process.cwd(), "output", "pdf");
    await mkdir(outDir, { recursive: true });
    await writeFile(
      path.join(outDir, `verify-certificate-${name}.pdf`),
      pdfBuffer,
    );
  }
}

console.log(
  JSON.stringify(
    { letterheadMetrics: LETTERHEAD_METRICS, results },
    null,
    2,
  ),
);

if (results.some((result) => !result.ok)) {
  process.exitCode = 1;
}