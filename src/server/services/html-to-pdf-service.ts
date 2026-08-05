import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_BROWSER_CANDIDATES = [
  process.env.GMC_CHROME_PATH,
  process.env.CHROME_PATH,
  process.env.EDGE_PATH,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter((value): value is string => Boolean(value));

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveBrowserExecutables(): Promise<string[]> {
  const found: string[] = [];

  for (const candidate of DEFAULT_BROWSER_CANDIDATES) {
    if (await fileExists(candidate)) {
      found.push(candidate);
    }
  }

  if (found.length === 0) {
    throw new Error(
      "No Chrome or Edge executable was found. Set GMC_CHROME_PATH or install a Chromium-based browser.",
    );
  }

  return found;
}

async function runBrowserPrintToPdf(
  browserPath: string,
  workDir: string,
  htmlPath: string,
  pdfPath: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const userDataDir = path.join(workDir, "profile");
    const child = spawn(
      browserPath,
      [
        "--headless=new",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-gpu-compositing",
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--disable-background-networking",
        "--allow-file-access-from-files",
        "--no-pdf-header-footer",
        `--user-data-dir=${userDataDir}`,
        `--print-to-pdf=${pdfPath}`,
        pathToFileURL(htmlPath).href,
      ],
      {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Browser exited with code ${code ?? "unknown"} while generating the PDF.${stderr ? ` ${stderr.trim()}` : ""}`,
        ),
      );
    });
  });
}

export async function renderHtmlToPdfBuffer(html: string): Promise<Buffer> {
  const workDir = path.join(process.cwd(), "tmp", "pdfs", randomUUID());
  const htmlPath = path.join(workDir, "document.html");
  const pdfPath = path.join(workDir, "document.pdf");

  await fs.mkdir(workDir, { recursive: true });
  await fs.writeFile(htmlPath, html, "utf8");

  try {
    const browsers = await resolveBrowserExecutables();
    const errors: string[] = [];

    for (const browserPath of browsers) {
      try {
        await runBrowserPrintToPdf(browserPath, workDir, htmlPath, pdfPath);
        return await fs.readFile(pdfPath);
      } catch (error) {
        errors.push(
          `${path.basename(browserPath)}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    throw new Error(
      `Unable to generate the PDF with the available browsers. ${errors.join(" | ")}`,
    );
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}
