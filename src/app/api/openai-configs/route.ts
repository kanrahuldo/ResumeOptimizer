import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { openaiConfigs } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const data = await db
    .select()
    .from(openaiConfigs)
    .where(eq(openaiConfigs.userId, userId))
    .orderBy(desc(openaiConfigs.updatedAt));

  const hydrated = data.map(({ apiKey, ...rest }) => ({
    ...rest,
    apiKey: apiKey ? decryptSecret(apiKey) : "",
  }));
  return NextResponse.json({ data: hydrated });
}

export async function POST(request: Request) {
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

  if (!name || !apiKey || !model) {
    return NextResponse.json(
      { error: "Name, API key, and model are required." },
      { status: 400 }
    );
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(openaiConfigs)
    .where(eq(openaiConfigs.userId, userId));
  const shouldBeDefault = Boolean(body?.isDefault) || Number(countRow?.count || 0) === 0;

  const [record] = await db
    .insert(openaiConfigs)
    .values({
      userId,
      name,
      provider,
      apiKey: encryptSecret(apiKey),
      model,
      baseUrl: baseUrl || null,
      isDefault: shouldBeDefault,
    })
    .returning();

  if (record?.isDefault) {
    await db
      .update(openaiConfigs)
      .set({ isDefault: false })
      .where(eq(openaiConfigs.userId, userId));
    await db
      .update(openaiConfigs)
      .set({ isDefault: true })
      .where(and(eq(openaiConfigs.id, record.id), eq(openaiConfigs.userId, userId)));
  }

  const { apiKey: _apiKey, ...rest } = record;
  return NextResponse.json({ data: rest });
}
