import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { openaiConfigs } from "@/db/schema";
import { getUserId } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, { params }: Params) {
  const { id } = await params;
  const configId = Number(id);
  if (!Number.isInteger(configId)) {
    return NextResponse.json({ error: "Invalid config id." }, { status: 400 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await db
    .update(openaiConfigs)
    .set({ isDefault: false })
    .where(eq(openaiConfigs.userId, userId));
  const [record] = await db
    .update(openaiConfigs)
    .set({ isDefault: true })
    .where(and(eq(openaiConfigs.id, configId), eq(openaiConfigs.userId, userId)))
    .returning();

  if (!record) {
    return NextResponse.json({ error: "Config not found." }, { status: 404 });
  }

  const { apiKey: _apiKey, ...rest } = record;
  return NextResponse.json({ data: rest });
}
