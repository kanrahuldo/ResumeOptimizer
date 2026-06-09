import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

import { db } from "@/db";
import {
  githubConfigs,
  openaiConfigs,
  prompts,
  runs,
  templates,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

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
  const userId = String(id);

  const body = await request.json();
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const roleId = body?.roleId ? Number(body.roleId) : undefined;

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required." },
      { status: 400 }
    );
  }
  if (roleId !== undefined && ![1, 2].includes(roleId)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const [existingEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, email), eq(users.id, userId)))
    .limit(1);

  if (!existingEmail) {
    const [conflict] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (conflict) {
      return NextResponse.json(
        { error: "Email is already in use." },
        { status: 409 }
      );
    }
  }

  const updates: Partial<typeof users.$inferInsert> = {
    name,
    email,
  };
  if (roleId !== undefined) {
    updates.roleId = roleId;
  }
  if (password) {
    updates.passwordHash = await bcrypt.hash(password, 10);
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const { passwordHash: _passwordHash, ...rest } = updated;
  return NextResponse.json({ data: rest });
}

export async function DELETE(_request: Request, { params }: Params) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const { id } = await params;
  const userId = String(id);

  const deleted = await db.transaction(async (tx) => {
    await tx.delete(runs).where(eq(runs.userId, userId));
    await tx.delete(githubConfigs).where(eq(githubConfigs.userId, userId));
    await tx.delete(openaiConfigs).where(eq(openaiConfigs.userId, userId));
    await tx.delete(templates).where(eq(templates.userId, userId));
    await tx.delete(prompts).where(eq(prompts.userId, userId));
    const [user] = await tx
      .delete(users)
      .where(eq(users.id, userId))
      .returning();
    return user;
  });

  if (!deleted) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const { passwordHash: _passwordHash, ...rest } = deleted;
  return NextResponse.json({ data: rest });
}
