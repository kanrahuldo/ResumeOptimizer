import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { openaiConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { encryptSecret } from "@/lib/crypto";

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
  const configId = Number(id);
  if (!Number.isInteger(configId)) {
    return NextResponse.json({ error: "Invalid config id." }, { status: 400 });
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
    .where(eq(openaiConfigs.id, configId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Config not found." }, { status: 404 });
  }

  const [updated] = await db
    .update(openaiConfigs)
    .set({
      name,
      provider,
      model,
      baseUrl: baseUrl || null,
      apiKey: apiKey ? encryptSecret(apiKey) : existing.apiKey,
      updatedAt: new Date(),
    })
    .where(eq(openaiConfigs.id, configId))
    .returning();

  return NextResponse.json({
    data: { ...updated, apiKey: apiKey || "" },
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await params;
  const configId = Number(id);
  if (!Number.isInteger(configId)) {
    return NextResponse.json({ error: "Invalid config id." }, { status: 400 });
  }

  const [deleted] = await db
    .delete(openaiConfigs)
    .where(eq(openaiConfigs.id, configId))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Config not found." }, { status: 404 });
  }

  return NextResponse.json({ data: deleted });
}
