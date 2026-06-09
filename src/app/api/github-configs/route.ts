import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { githubConfigs } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const data = await db
    .select()
    .from(githubConfigs)
    .where(eq(githubConfigs.userId, userId))
    .orderBy(desc(githubConfigs.updatedAt));

  const hydrated = data.map(({ token, ...rest }) => ({
    ...rest,
    token: token ? decryptSecret(token) : "",
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
  const owner = String(body?.owner || "").trim();
  const repo = String(body?.repo || "").trim();
  const token = String(body?.token || "").trim();

  if (!name || !owner || !repo || !token) {
    return NextResponse.json(
      { error: "Name, owner, repo, and token are required." },
      { status: 400 }
    );
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(githubConfigs)
    .where(eq(githubConfigs.userId, userId));
  const shouldBeDefault = Boolean(body?.isDefault) || Number(countRow?.count || 0) === 0;

  const [record] = await db
    .insert(githubConfigs)
    .values({
      userId,
      name,
      owner,
      repo,
      token: encryptSecret(token),
      isDefault: shouldBeDefault,
    })
    .returning();

  if (record?.isDefault) {
    await db
      .update(githubConfigs)
      .set({ isDefault: false })
      .where(eq(githubConfigs.userId, userId));
    await db
      .update(githubConfigs)
      .set({ isDefault: true })
      .where(and(eq(githubConfigs.id, record.id), eq(githubConfigs.userId, userId)));
  }

  const { token: _token, ...rest } = record;
  return NextResponse.json({ data: rest });
}
