import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadValidatedStaffSessionFromRequest } from "@/lib/staff-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await loadValidatedStaffSessionFromRequest(prisma, request);

  if (!session) {
    return NextResponse.json(
      { formError: "Your staff session has expired. Please sign in again." },
      { status: 401 },
    );
  }

  const fileReference =
    request.nextUrl.searchParams.get("pathname") ??
    request.nextUrl.searchParams.get("url");

  if (!fileReference) {
    return NextResponse.json({ formError: "Missing file URL." }, { status: 400 });
  }

  const result = await get(fileReference, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN ?? undefined,
    ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
  });

  if (!result) {
    return NextResponse.json({ formError: "File not found." }, { status: 404 });
  }

  if (result.statusCode === 304) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
      },
    });
  }

  const contentType = result.blob.contentType ?? "application/octet-stream";
  const requestedFilename = request.nextUrl.searchParams.get("downloadName");
  const filename = sanitizeDownloadFilename(
    requestedFilename || fileReference.split("/").pop() || "file.bin",
  );

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${requestedFilename ? "attachment" : "inline"}; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-cache",
      ETag: result.blob.etag,
    },
  });
}

function sanitizeDownloadFilename(value: string): string {
  const extension = value.toLowerCase().endsWith(".pdf") ? ".pdf" : "";
  const basename = value
    .replace(/\.[^.]+$/, "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._' -]+/gu, "")
    .trim()
    .replace(/[ .]+/g, "_")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 180);

  return `${basename || "certificate"}${extension}`;
}
