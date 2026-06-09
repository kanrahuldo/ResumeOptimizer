import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { githubConfigs } from "@/db/schema";
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
    .where(and(eq(githubConfigs.id, configId), eq(githubConfigs.userId, userId)))
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
    .where(and(eq(githubConfigs.id, configId), eq(githubConfigs.userId, userId)))
    .returning();

  const { token: _token, ...rest } = updated;
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
    .delete(githubConfigs)
    .where(and(eq(githubConfigs.id, configId), eq(githubConfigs.userId, userId)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Config not found." }, { status: 404 });
  }

  const { token: _token, ...rest } = deleted;
  return NextResponse.json({ data: rest });
}
