import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { prompts, templates, users } from "@/db/schema";
import { ensureDefaultRoles } from "@/lib/roles";

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const passwordRule = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required." },
      { status: 400 }
    );
  }
  if (!passwordRule.test(password)) {
    return NextResponse.json(
      {
        error:
          "Password must be at least 8 characters and include 1 number and 1 special character.",
      },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await ensureDefaultRoles();
  const [created] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      roleId: 1,
    })
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

  return NextResponse.json({
    data: { id: created.id, name: created.name, email: created.email },
  });
}
