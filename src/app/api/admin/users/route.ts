import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { db } from "@/db";
import { prompts, templates, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { ensureDefaultRoles } from "@/lib/roles";

export const runtime = "nodejs";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const data = await db.select().from(users).orderBy(users.createdAt);
  const sanitized = data.map(({ passwordHash, ...rest }) => rest);
  return NextResponse.json({ data: sanitized });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.status });
  }

  const body = await request.json();
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const roleId = Number(body?.roleId || 1);

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required." },
      { status: 400 }
    );
  }

  if (![1, 2].includes(roleId)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await ensureDefaultRoles();
  const [created] = await db
    .insert(users)
    .values({ name, email, passwordHash, roleId })
    .returning();

  if (created?.id) {
    const [defaultTemplate, defaultPrompt] = await Promise.all([
      readFile(
        path.join(process.cwd(), "src", "seed", "default-template.tex"),
        "utf8"
      ),
      readFile(
        path.join(process.cwd(), "src", "seed", "default-prompt.txt"),
        "utf8"
      ),
    ]);

    await db.insert(templates).values({
      userId: created.id,
      name: "Default Resume Template",
      content: defaultTemplate,
      isDefault: true,
    });

    await db.insert(prompts).values({
      userId: created.id,
      name: "Default Resume Prompt",
      content: defaultPrompt,
      isDefault: true,
    });
  }

  const { passwordHash: _passwordHash, ...rest } = created;
  return NextResponse.json({ data: rest });
}
