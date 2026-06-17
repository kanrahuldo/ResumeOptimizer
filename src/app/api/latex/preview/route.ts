import { NextResponse } from "next/server";
import {
  renderLatexPreviewPdf,
  sanitizePreviewName,
} from "@/lib/latex-preview";

export const runtime = "nodejs";

type PreviewBody = {
  content?: string;
  name?: string;
};

export async function POST(request: Request) {
  let body: PreviewBody;
  try {
    body = (await request.json()) as PreviewBody;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "Template content is required." }, { status: 400 });
  }

  const safeName = sanitizePreviewName(body.name);

  try {
    const pdf = await renderLatexPreviewPdf(content);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Tectonic compilation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
