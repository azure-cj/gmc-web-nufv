import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { INVOICE_NUMBER_PATTERN } from "@/lib/gmc-request";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const invoiceNumber = (url.searchParams.get("invoiceNumber") ?? "").trim();

    if (!invoiceNumber) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    if (!INVOICE_NUMBER_PATTERN.test(invoiceNumber)) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    const existing = await prisma.gmcRequest.findFirst({
      where: {
        officialReceiptNumber: invoiceNumber,
      },
      select: { requestReferenceNumber: true },
    });

    return NextResponse.json(
      {
        exists: Boolean(existing),
        requestReferenceNumber: existing?.requestReferenceNumber ?? null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Invoice number check failed:", error);
    return NextResponse.json(
      { exists: false, error: "Unable to check invoice number." },
      { status: 200 },
    );
  }
}
