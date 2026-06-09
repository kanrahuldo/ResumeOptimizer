import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { openaiConfigs } from "@/db/schema";
import { testAiConnection } from "@/lib/ai";
import { getUserId } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  let apiKey = String(body?.apiKey || "").trim();
  const model = String(body?.model || "").trim();
  let provider = String(body?.provider || "").trim();
  let baseUrl = String(body?.baseUrl || "").trim();
  const configId = body?.configId ? Number(body.configId) : null;

  if (configId) {
    const [config] = await db
      .select()
      .from(openaiConfigs)
      .where(and(eq(openaiConfigs.id, configId), eq(openaiConfigs.userId, userId)))
      .limit(1);
    if (config) {
      apiKey = apiKey || decryptSecret(config.apiKey);
      provider = provider || config.provider;
      baseUrl = baseUrl || config.baseUrl || "";
    }
  } else if (!apiKey) {
    const [defaultConfig] = await db
      .select()
      .from(openaiConfigs)
      .where(and(eq(openaiConfigs.isDefault, true), eq(openaiConfigs.userId, userId)))
      .limit(1);
    apiKey = defaultConfig?.apiKey ? decryptSecret(defaultConfig.apiKey) : "";
    provider = provider || defaultConfig?.provider || "openai";
    baseUrl = baseUrl || defaultConfig?.baseUrl || "";
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "AI provider API key is required." },
      { status: 400 }
    );
  }

  if (!model) {
    return NextResponse.json(
      { error: "Model is required." },
      { status: 400 }
    );
  }

  try {
    await testAiConnection({ apiKey, model, provider: provider || "openai", baseUrl });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connection failed." },
      { status: 400 }
    );
  }
}
