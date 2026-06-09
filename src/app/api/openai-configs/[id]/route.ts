import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { openaiConfigs } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const configId = Number(id);
  if (!Number.isInteger(configId)) {
    return NextResponse.json({ error: "Invalid config id." }, { status: 400 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body?.name || "").trim();
  const apiKey = String(body?.apiKey || "").trim();
  const model = String(body?.model || "").trim();
  const provider = String(body?.provider || "openai").trim();
  const baseUrl = String(body?.baseUrl || "").trim();

  if (!name || !model) {
    return NextResponse.json(
      { error: "Name and model are required." },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select()
    .from(openaiConfigs)
    .where(and(eq(openaiConfigs.id, configId), eq(openaiConfigs.userId, userId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Config not found." }, { status: 404 });
  }

  const [updated] = await db
    .update(openaiConfigs)
    .set({
      name,
      provider,
      apiKey: apiKey ? encryptSecret(apiKey) : existing.apiKey,
      model,
      baseUrl: baseUrl || null,
      updatedAt: new Date(),
    })
    .where(and(eq(openaiConfigs.id, configId), eq(openaiConfigs.userId, userId)))
    .returning();

  const { apiKey: _apiKey, ...rest } = updated;
  return NextResponse.json({ data: rest });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const configId = Number(id);
  if (!Number.isInteger(configId)) {
    return NextResponse.json({ error: "Invalid config id." }, { status: 400 });
  }

  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [deleted] = await db
    .delete(openaiConfigs)
    .where(and(eq(openaiConfigs.id, configId), eq(openaiConfigs.userId, userId)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Config not found." }, { status: 404 });
  }

  const { apiKey: _apiKey, ...rest } = deleted;
  return NextResponse.json({ data: rest });
}
