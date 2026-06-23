import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { openaiConfigs } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";

export type ResolvedAiConfig = {
  apiKey: string;
  model: string;
  provider: string;
  baseUrl?: string | null;
  configId?: number;
};

export type ResolveAiConfigInput = {
  userId: string;
  aiConfigId?: number | null;
  requestedModel?: string;
  defaultModel?: string;
};

export async function resolveAiConfig(
  input: ResolveAiConfigInput
): Promise<ResolvedAiConfig | null> {
  const requestedModel = String(input.requestedModel || "").trim();
  let selectedConfig = null;

  if (input.aiConfigId != null) {
    [selectedConfig] = await db
      .select()
      .from(openaiConfigs)
      .where(
        and(
          eq(openaiConfigs.id, input.aiConfigId),
          eq(openaiConfigs.userId, input.userId)
        )
      )
      .limit(1);
    if (!selectedConfig) {
      throw new Error("Selected AI profile not found.");
    }
  }

  let [profile] = selectedConfig
    ? [selectedConfig]
    : await db
        .select()
        .from(openaiConfigs)
        .where(
          and(
            eq(openaiConfigs.isDefault, true),
            eq(openaiConfigs.userId, input.userId)
          )
        )
        .limit(1);

  if (
    requestedModel.toLowerCase().startsWith("gpt-") &&
    profile?.provider !== "openai"
  ) {
    const [openAiProfile] = await db
      .select()
      .from(openaiConfigs)
      .where(
        and(
          eq(openaiConfigs.provider, "openai"),
          eq(openaiConfigs.userId, input.userId)
        )
      )
      .limit(1);
    if (openAiProfile) {
      profile = openAiProfile;
    }
  }

  const apiKey = profile?.apiKey
    ? decryptSecret(profile.apiKey)
    : process.env.AI_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const model =
    requestedModel ||
    profile?.model ||
    input.defaultModel ||
    process.env.AI_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";
  const provider = requestedModel.toLowerCase().startsWith("gpt-")
    ? "openai"
    : profile?.provider || process.env.AI_PROVIDER || "openai";
  const baseUrl = profile?.baseUrl || process.env.AI_BASE_URL;

  return {
    apiKey,
    model,
    provider,
    baseUrl,
    configId: profile?.id,
  };
}

export function getScreeningModel(override?: string) {
  return (
    String(override || "").trim() ||
    process.env.AI_SCREENING_MODEL ||
    "gpt-4.1-mini"
  );
}
