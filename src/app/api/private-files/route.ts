import { NextRequest, NextResponse } from "next/server";
import { fetchPrivateStorageFile } from "@/lib/storage/private-file";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const fileUrl = request.nextUrl.searchParams.get("url");

  if (!fileUrl) {
    return NextResponse.json({ formError: "Missing file URL." }, { status: 400 });
  }

  try {
    const file = await fetchPrivateStorageFile(fileUrl);
    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${file.filename}"`,
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        formError:
          error instanceof Error ? error.message : "Unable to load the file.",
      },
      { status: 502 },
    );
  }
}
