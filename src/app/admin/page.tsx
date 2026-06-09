import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { AdminPanel } from "@/components/sections/admin-panel";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }
  if (session.user.roleId !== 2) {
    redirect("/app");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          Admin module
        </p>
        <h1 className="text-2xl font-semibold text-white">Admin console</h1>
        <p className="text-sm text-slate-400">
          Manage users, credentials, and run history.
        </p>
      </div>
      <AdminPanel />
    </div>
  );
}
