import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { runs } from "@/db/schema";
import { getUserId } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, { params }: Params) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const runId = Number(id);
  if (!Number.isInteger(runId)) {
    return NextResponse.json({ error: "Invalid run id." }, { status: 400 });
  }

  const [deleted] = await db
    .delete(runs)
    .where(and(eq(runs.id, runId), eq(runs.userId, userId)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({ data: deleted });
}
