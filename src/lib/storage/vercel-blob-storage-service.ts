import { del, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import {
  sanitizeFilename,
  type StorageService,
  type StoredFile,
  type UploadFileInput,
} from "./storage-service";

function normalizeSubdirectory(value: string | undefined): string {
  return value?.replace(/^\/+|\/+$/g, "") ?? "";
}

export class VercelBlobStorageService implements StorageService {
  async upload(input: UploadFileInput): Promise<StoredFile> {
    const safeName = sanitizeFilename(input.filename) || "upload.bin";
    const subdirectory = normalizeSubdirectory(input.subdirectory);
    const key = [subdirectory, `${randomUUID()}-${safeName}`]
      .filter(Boolean)
      .join("/");

    const blob = await put(key, input.buffer, {
      access: "private",
      contentType: input.contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return {
      key,
      url: blob.url,
      absolutePath: blob.url,
      contentType: input.contentType,
      size: input.buffer.byteLength,
    };
  }

  async delete(key: string): Promise<void> {
    await del(key, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
  }
}

export const vercelBlobStorageService = new VercelBlobStorageService();
