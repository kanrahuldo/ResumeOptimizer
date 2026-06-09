import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { githubConfigs } from "@/db/schema";
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
    .update(githubConfigs)
    .set({ isDefault: false })
    .where(eq(githubConfigs.userId, userId));
  const [record] = await db
    .update(githubConfigs)
    .set({ isDefault: true })
    .where(and(eq(githubConfigs.id, configId), eq(githubConfigs.userId, userId)))
    .returning();

  if (!record) {
    return NextResponse.json({ error: "Config not found." }, { status: 404 });
  }

  const { token: _token, ...rest } = record;
  return NextResponse.json({ data: rest });
}
