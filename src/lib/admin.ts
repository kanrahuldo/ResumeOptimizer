import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false, status: 401 as const, message: "Unauthorized." };
  }
  if (session.user.roleId !== 2) {
    return { ok: false, status: 403 as const, message: "Forbidden." };
  }
  return { ok: true as const, userId: session.user.id };
}
