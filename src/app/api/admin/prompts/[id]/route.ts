import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { prompts, runs } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

type Params = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await params;
  const promptId = Number(id);
  if (!Number.isInteger(promptId)) {
    return NextResponse.json({ error: "Invalid prompt id." }, { status: 400 });
  }

  const body = await request.json();
  const name = String(body?.name || "").trim();
  const content = String(body?.content || "").trim();

  if (!name || !content) {
    return NextResponse.json(
      { error: "Name and content are required." },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(prompts)
    .set({
      name,
      content,
      updatedAt: new Date(),
    })
    .where(eq(prompts.id, promptId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await params;
  const promptId = Number(id);
  if (!Number.isInteger(promptId)) {
    return NextResponse.json({ error: "Invalid prompt id." }, { status: 400 });
  }

  const [promptRow] = await db
    .select({ userId: prompts.userId })
    .from(prompts)
    .where(eq(prompts.id, promptId));

  if (!promptRow) {
    return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(runs)
    .where(and(eq(runs.promptId, promptId), eq(runs.userId, promptRow.userId)));

  if (Number(count) > 0) {
    return NextResponse.json(
      { error: "Prompt is used by existing runs and cannot be deleted." },
      { status: 409 }
    );
  }

  const [deleted] = await db
    .delete(prompts)
    .where(eq(prompts.id, promptId))
    .returning();

  return NextResponse.json({ data: deleted });
}
