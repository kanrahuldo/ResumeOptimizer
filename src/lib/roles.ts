import { db } from "@/db";
import { roles } from "@/db/schema";

export async function ensureDefaultRoles() {
  await db
    .insert(roles)
    .values([
      { id: 1, name: "user" },
      { id: 2, name: "admin" },
    ])
    .onConflictDoNothing();
}
