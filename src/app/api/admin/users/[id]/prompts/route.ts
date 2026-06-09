import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { prompts } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

type Params = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await params;
  const userId = String(id);

  const data = await db
    .select()
    .from(prompts)
    .where(eq(prompts.userId, userId))
    .orderBy(desc(prompts.updatedAt));

  return NextResponse.json({ data });
}

export async function POST(request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await params;
  const userId = String(id);

  const body = await request.json();
  const name = String(body?.name || "").trim();
  const content = String(body?.content || "").trim();

  if (!name || !content) {
    return NextResponse.json(
      { error: "Name and content are required." },
      { status: 400 }
    );
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(prompts)
    .where(eq(prompts.userId, userId));
  const shouldBeDefault = Boolean(body?.isDefault) || Number(countRow?.count || 0) === 0;

  const [record] = await db
    .insert(prompts)
    .values({
      userId,
      name,
      content,
      isDefault: shouldBeDefault,
    })
    .returning();

  if (record?.isDefault) {
    await db.update(prompts).set({ isDefault: false }).where(eq(prompts.userId, userId));
    await db
      .update(prompts)
      .set({ isDefault: true })
      .where(and(eq(prompts.id, record.id), eq(prompts.userId, userId)));
  }

  return NextResponse.json({ data: record });
}
