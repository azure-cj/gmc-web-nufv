export function getPrivateStorageDownloadUrl(fileUrl: string): string {
  return `/api/private-files?url=${encodeURIComponent(fileUrl)}`;
}
