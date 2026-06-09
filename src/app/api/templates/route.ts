import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { templates } from "@/db/schema";
import { getUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const data = await db
    .select()
    .from(templates)
    .where(eq(templates.userId, userId))
    .orderBy(desc(templates.updatedAt));

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json();

  if (!body?.name || !body?.content) {
    return NextResponse.json(
      { error: "Name and content are required." },
      { status: 400 }
    );
  }

  const [record] = await db
    .insert(templates)
    .values({
      userId,
      name: String(body.name),
      content: String(body.content),
      isDefault: Boolean(body.isDefault),
    })
    .returning();

  if (record?.isDefault) {
    await db
      .update(templates)
      .set({ isDefault: false })
      .where(eq(templates.userId, userId));
    await db
      .update(templates)
      .set({ isDefault: true })
      .where(and(eq(templates.id, record.id), eq(templates.userId, userId)));
  }

  return NextResponse.json({ data: record });
}
