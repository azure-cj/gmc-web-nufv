import { localStorageService } from "./local-storage-service";
import { vercelBlobStorageService } from "./vercel-blob-storage-service";
import type { StorageService } from "./storage-service";

function isProductionBlobEnabled(): boolean {
  return process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined;
}

export function getStorageService(): StorageService {
  return isProductionBlobEnabled()
    ? vercelBlobStorageService
    : localStorageService;
}
