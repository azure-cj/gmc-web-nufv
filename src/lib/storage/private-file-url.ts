export function getPrivateStorageDownloadUrl(fileUrl: string | null | undefined, downloadName?: string): string {
  if (!fileUrl) {
    return "";
  }

  const params = new URLSearchParams({ url: fileUrl });

  if (downloadName) {
    params.set("downloadName", downloadName);
  }

  return `/api/private-files?${params.toString()}`;
}
