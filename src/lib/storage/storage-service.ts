export interface UploadFileInput {
  buffer: Buffer;
  filename: string;
  contentType?: string;
  subdirectory?: string;
}

export interface StoredFile {
  key: string;
  url: string;
  absolutePath: string;
  contentType?: string;
  size: number;
}

export interface StorageService {
  upload(input: UploadFileInput): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

export function sanitizeFilename(filename: string): string {
  const trimmed = filename.trim().replace(/\s+/g, "-");
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "-");
}
