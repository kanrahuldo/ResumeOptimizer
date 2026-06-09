import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { prompts } from "@/db/schema";
import { getUserId } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, { params }: Params) {
  const { id } = await params;
  const promptId = Number(id);

  if (!Number.isInteger(promptId)) {
    return NextResponse.json({ error: "Invalid prompt id." }, { status: 400 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await db
    .update(prompts)
    .set({ isDefault: false })
    .where(eq(prompts.userId, userId));
  const [record] = await db
    .update(prompts)
    .set({ isDefault: true })
    .where(and(eq(prompts.id, promptId), eq(prompts.userId, userId)))
    .returning();

  if (!record) {
    return NextResponse.json({ error: "Prompt not found." }, { status: 404 });
  }

  return NextResponse.json({ data: record });
}
