import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { prompts, runs } from "@/db/schema";
import { getUserId } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const promptId = Number(id);
  if (!Number.isInteger(promptId)) {
    return NextResponse.json({ error: "Invalid prompt id." }, { status: 400 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
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
    .where(and(eq(prompts.id, promptId), eq(prompts.userId, userId)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const promptId = Number(id);
  if (!Number.isInteger(promptId)) {
    return NextResponse.json({ error: "Invalid prompt id." }, { status: 400 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(runs)
    .where(and(eq(runs.promptId, promptId), eq(runs.userId, userId)));

  if (Number(count) > 0) {
    return NextResponse.json(
      { error: "Prompt is used by existing runs and cannot be deleted." },
      { status: 409 }
    );
  }

  const [deleted] = await db
    .delete(prompts)
    .where(and(eq(prompts.id, promptId), eq(prompts.userId, userId)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
  }

  return NextResponse.json({ data: deleted });
}
