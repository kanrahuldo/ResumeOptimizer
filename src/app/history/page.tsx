import { desc, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { HistoryTable } from "@/components/sections/history-table";
import { db } from "@/db";
import { runs } from "@/db/schema";
import { authOptions } from "@/lib/auth";

type RunRecord = {
  id: number;
  jobDescription: string;
  status: string;
  outputUrl?: string | null;
  overleafUrl?: string | null;
  createdAt: Date;
};

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const data = await db
    .select()
    .from(runs)
    .where(eq(runs.userId, session.user.id))
    .orderBy(desc(runs.createdAt));

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
          Audit
        </p>
        <h1 className="text-3xl font-semibold text-slate-100">History</h1>
        <p className="max-w-2xl text-sm text-slate-300 md:text-base">
          Track recent runs and jump back to outputs when needed.
        </p>
      </section>
      <HistoryTable rows={data ?? []} />
    </div>
  );
}
