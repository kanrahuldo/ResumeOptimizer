import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { templates } from "@/db/schema";
import { getUserId } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, { params }: Params) {
  const { id } = await params;
  const templateId = Number(id);

  if (!Number.isInteger(templateId)) {
    return NextResponse.json({ error: "Invalid template id." }, { status: 400 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await db
    .update(templates)
    .set({ isDefault: false })
    .where(eq(templates.userId, userId));
  const [record] = await db
    .update(templates)
    .set({ isDefault: true })
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
    .returning();

  if (!record) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  return NextResponse.json({ data: record });
}
