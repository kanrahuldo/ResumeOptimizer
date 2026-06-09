import { NextResponse } from "next/server";
import { and, eq, desc, sql } from "drizzle-orm";

import { db } from "@/db";
import { githubConfigs } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

type Params = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await params;
  const userId = String(id);

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

export async function POST(request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await params;
  const userId = String(id);

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

  return NextResponse.json({
    data: { ...record, token },
  });
}
