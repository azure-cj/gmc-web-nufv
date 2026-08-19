import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pnpmDir = path.join(root, "node_modules", ".pnpm");
const outputDir = path.join(root, ".vercel-chromium-bin");

const packageEntry = (await fs.readdir(pnpmDir)).find((entry) =>
  entry.startsWith("@sparticuz+chromium@"),
);

if (!packageEntry) {
  throw new Error("Unable to locate the installed @sparticuz/chromium package.");
}

const sourceDir = path.join(
  pnpmDir,
  packageEntry,
  "node_modules",
  "@sparticuz",
  "chromium",
  "bin",
);

await fs.rm(outputDir, { recursive: true, force: true });
await fs.cp(sourceDir, outputDir, { recursive: true });
console.log(`[prepare-chromium-assets] copied Chromium assets to ${outputDir}`);
