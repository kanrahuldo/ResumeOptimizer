import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { AccountForm } from "@/components/sections/account-form";
import { db } from "@/db";
import { users } from "@/db/schema";
import { authOptions } from "@/lib/auth";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="space-y-8">
      <section className="space-y-1">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
          Profile
        </p>
        <h1 className="text-3xl font-semibold text-slate-100">Account</h1>
        <p className="max-w-2xl text-sm text-slate-300 md:text-base">
          Update your personal info, password, and session settings here.
        </p>
      </section>
      <AccountForm initialName={user.name} initialEmail={user.email} />
    </div>
  );
}
