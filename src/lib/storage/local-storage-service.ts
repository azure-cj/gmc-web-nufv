import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  sanitizeFilename,
  type StorageService,
  type StoredFile,
  type UploadFileInput,
} from "./storage-service";

export class LocalStorageService implements StorageService {
  constructor(
    private readonly rootDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
    ),
  ) {}

  async upload(input: UploadFileInput): Promise<StoredFile> {
    const safeName = sanitizeFilename(input.filename) || "upload.bin";
    const subdirectory = input.subdirectory?.replace(/^\/+|\/+$/g, "");
    const key = path
      .join(subdirectory ?? "", `${randomUUID()}-${safeName}`)
      .replaceAll("\\", "/");
    const absolutePath = path.join(this.rootDirectory, key);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, input.buffer);

    return {
      key,
      url: `/uploads/${key}`,
      absolutePath,
      contentType: input.contentType,
      size: input.buffer.byteLength,
    };
  }

  async delete(key: string): Promise<void> {
    const absolutePath = path.resolve(this.rootDirectory, key);
    const normalizedRoot = path.resolve(this.rootDirectory) + path.sep;

    if (!absolutePath.startsWith(normalizedRoot)) {
      throw new Error("Invalid storage key.");
    }

    await fs.rm(absolutePath, { force: true });
  }
}

export const localStorageService = new LocalStorageService();
