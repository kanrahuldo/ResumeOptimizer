import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { runs } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

type Params = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await params;
  const runId = Number(id);
  if (!Number.isInteger(runId)) {
    return NextResponse.json({ error: "Invalid run id." }, { status: 400 });
  }

  const [deleted] = await db
    .delete(runs)
    .where(eq(runs.id, runId))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({ data: deleted });
}
