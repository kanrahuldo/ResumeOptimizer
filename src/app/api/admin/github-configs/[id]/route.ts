import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { githubConfigs } from "@/db/schema";
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
  const owner = String(body?.owner || "").trim();
  const repo = String(body?.repo || "").trim();
  const token = String(body?.token || "").trim();

  if (!name || !owner || !repo) {
    return NextResponse.json(
      { error: "Name, owner, and repo are required." },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select()
    .from(githubConfigs)
    .where(eq(githubConfigs.id, configId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Config not found." }, { status: 404 });
  }

  const [updated] = await db
    .update(githubConfigs)
    .set({
      name,
      owner,
      repo,
      token: token ? encryptSecret(token) : existing.token,
      updatedAt: new Date(),
    })
    .where(eq(githubConfigs.id, configId))
    .returning();

  return NextResponse.json({
    data: { ...updated, token: token || "" },
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
    .delete(githubConfigs)
    .where(eq(githubConfigs.id, configId))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Config not found." }, { status: 404 });
  }

  return NextResponse.json({ data: deleted });
}
