export function getPrivateStorageDownloadUrl(fileUrl: string, downloadName?: string): string {
  const params = new URLSearchParams({ url: fileUrl });

  if (downloadName) {
    params.set("downloadName", downloadName);
  }

  return `/api/private-files?${params.toString()}`;
}
