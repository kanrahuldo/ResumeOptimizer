import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { githubConfigs } from "@/db/schema";
import { getUserId } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  let owner = String(body?.owner || "").trim();
  let repo = String(body?.repo || "").trim();
  let token = String(body?.token || "").trim();
  const configId = body?.configId ? Number(body.configId) : null;

  if (configId) {
    const [config] = await db
      .select()
      .from(githubConfigs)
      .where(
        and(eq(githubConfigs.id, configId), eq(githubConfigs.userId, userId))
      )
      .limit(1);
    if (config) {
      owner = owner || config.owner;
      repo = repo || config.repo;
      token = decryptSecret(config.token);
    }
  } else if (!owner || !repo || !token) {
    const [defaultConfig] = await db
      .select()
      .from(githubConfigs)
      .where(and(eq(githubConfigs.isDefault, true), eq(githubConfigs.userId, userId)))
      .limit(1);
    owner = owner || defaultConfig?.owner || "";
    repo = repo || defaultConfig?.repo || "";
    token = token || (defaultConfig?.token ? decryptSecret(defaultConfig.token) : "");
  }

  if (!owner || !repo || !token) {
    return NextResponse.json(
      { error: "Owner, repo, and token are required." },
      { status: 400 }
    );
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    const message = await response.text();
    return NextResponse.json(
      { error: message || "GitHub connection failed." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
