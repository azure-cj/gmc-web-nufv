import fs from "node:fs/promises";
import path from "node:path";
import { get } from "@vercel/blob";

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

  const token = getBlobAuthToken() ?? undefined;
  const response = await get(fileUrl, {
    access: "private",
    token,
  });

  if (!response) {
    throw new Error("Unable to fetch private file.");
  }

  const arrayBuffer = await new Response(response.stream).arrayBuffer();
  const contentType =
    response.blob.contentType ?? "application/octet-stream";

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
    filename: path.basename(new URL(fileUrl).pathname),
  };
}

export function getPrivateStorageDownloadUrl(fileUrl: string): string {
  return `/api/private-files?url=${encodeURIComponent(fileUrl)}`;
}
