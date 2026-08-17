import fs from "node:fs/promises";
import path from "node:path";

function getBlobAuthToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN ?? null;
}

function isLocalUploadPath(fileUrl: string): boolean {
  return fileUrl.startsWith("/uploads/");
}

export async function fetchPrivateStorageFile(fileUrl: string): Promise<{
  buffer: Buffer;
  contentType: string;
  filename: string;
}> {
  if (isLocalUploadPath(fileUrl)) {
    const absolutePath = path.join(process.cwd(), "public", fileUrl);
    const buffer = await fs.readFile(absolutePath);
    return {
      buffer,
      contentType: fileUrl.endsWith(".pdf")
        ? "application/pdf"
        : "application/octet-stream",
      filename: path.basename(fileUrl),
    };
  }

  const token = getBlobAuthToken();
  const response = await fetch(fileUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch private file (${response.status}).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType =
    response.headers.get("content-type") ?? "application/octet-stream";
  const disposition = response.headers.get("content-disposition") ?? "";
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
    filename: filenameMatch?.[1] ?? path.basename(new URL(fileUrl).pathname),
  };
}

export function getPrivateStorageDownloadUrl(fileUrl: string): string {
  return `/api/private-files?url=${encodeURIComponent(fileUrl)}`;
}
