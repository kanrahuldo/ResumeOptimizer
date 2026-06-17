import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import {
  renderLatexPreviewPdf,
  sanitizePreviewName,
} from "@/lib/latex-preview";
import { getRunLatexForPreview } from "@/lib/run-latex";

type Params = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

function filenameFromOutputUrl(outputUrl?: string | null) {
  if (!outputUrl) return "resume";

  try {
    const url = new URL(outputUrl);
    const base = url.pathname.split("/").pop() || "resume";
    return base.endsWith(".tex") ? base.slice(0, -4) : base;
  } catch {
    const base = outputUrl.split("/").pop() || "resume";
    return base.endsWith(".tex") ? base.slice(0, -4) : base;
  }
}

export async function GET(_request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await params;
  const runId = Number(id);
  if (!Number.isInteger(runId) || runId <= 0) {
    return NextResponse.json({ error: "Invalid run id." }, { status: 400 });
  }

  const run = await getRunLatexForPreview({ runId });
  if (!run.found) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  if (!run.latex) {
    return NextResponse.json(
      { error: "No LaTeX source is available for this run. Regenerate it once." },
      { status: 404 }
    );
  }

  const safeName = sanitizePreviewName(filenameFromOutputUrl(run.outputUrl));

  try {
    const pdf = await renderLatexPreviewPdf(run.latex);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to render preview.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
