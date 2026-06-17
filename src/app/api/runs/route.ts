import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { runs } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { runResponseFields } from "@/lib/run-fields";

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const data = await db
    .select(runResponseFields)
    .from(runs)
    .where(eq(runs.userId, userId))
    .orderBy(desc(runs.createdAt));
  return NextResponse.json({ data });
}
