import { verifyOverleafSnippetToken } from "@/lib/overleaf";
import { getRunLatexForPreview } from "@/lib/run-latex";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId: runIdParam } = await params;
  const runId = Number(runIdParam);

  if (!Number.isInteger(runId) || runId <= 0) {
    return Response.json({ error: "Invalid run id." }, { status: 400 });
  }

  const token = new URL(request.url).searchParams.get("token");
  if (!verifyOverleafSnippetToken(token, runId)) {
    return Response.json({ error: "Invalid link." }, { status: 403 });
  }

  const run = await getRunLatexForPreview({ runId });
  if (!run.found || !run.latex) {
    return Response.json({ error: "Snippet not found." }, { status: 404 });
  }

  return new Response(run.latex, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="resume-${runId}.tex"`,
      "Content-Type": "application/x-tex; charset=utf-8",
    },
  });
}
