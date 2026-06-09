import { getServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim() || "";
        const password = credentials?.password?.toString() || "";

        if (!email || !password) {
          return null;
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, name: user.name, email: user.email, roleId: user.roleId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && "id" in user) {
        token.id = user.id;
        if ("roleId" in user) {
          token.roleId = user.roleId;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        session.user.id = token.id as string;
        session.user.roleId = token.roleId as number | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/sign-in",
  },
};

export async function getUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

export async function getUserRoleId() {
  const session = await getServerSession(authOptions);
  return session?.user?.roleId ?? null;
}
