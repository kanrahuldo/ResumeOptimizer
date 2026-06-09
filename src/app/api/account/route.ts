import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { and, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import { getUserId } from "@/lib/auth";

export async function PATCH(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const passwordRule = /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required." },
      { status: 400 }
    );
  }

  const [existingEmail] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), ne(users.id, userId)))
    .limit(1);

  if (existingEmail) {
    return NextResponse.json(
      { error: "That email is already in use." },
      { status: 409 }
    );
  }

  const updates: Partial<typeof users.$inferInsert> = {
    name,
    email,
  };

  if (password) {
    if (!passwordRule.test(password)) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters and include 1 number and 1 special character.",
        },
        { status: 400 }
      );
    }
    updates.passwordHash = await bcrypt.hash(password, 10);
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  return NextResponse.json({
    data: { id: updated.id, name: updated.name, email: updated.email },
  });
}
