import { readFile } from "node:fs/promises";
import path from "node:path";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { templates } from "@/db/schema";
import { generateJsonObject } from "@/lib/ai";
import { getScreeningModel, resolveAiConfig } from "@/lib/ai-config";

export type TailoringScreenResult = {
  tailoringRequired: boolean;
  missingMustHaveSkills: string[];
};

type CheckTailoringRequiredInput = {
  userId: string;
  jobDescription: string;
  templateId?: number | null;
  screeningModel?: string;
  screeningAiConfigId?: number | null;
};

let cachedScreenPrompt: string | null = null;

async function getScreeningPromptTemplate() {
  if (cachedScreenPrompt) return cachedScreenPrompt;
  cachedScreenPrompt = await readFile(
    path.join(process.cwd(), "src/seed/tailoring-screen-prompt.txt"),
    "utf8"
  );
  return cachedScreenPrompt;
}

export async function resolveTemplateForUser(
  userId: string,
  templateId?: number | null
) {
  if (templateId != null) {
    const [selected] = await db
      .select()
      .from(templates)
      .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
      .limit(1);
    if (!selected) {
      throw new Error("Selected template not found.");
    }
    return selected;
  }

  const [defaultTemplate] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.isDefault, true), eq(templates.userId, userId)))
    .limit(1);
  const [anyTemplate] = await db
    .select()
    .from(templates)
    .where(eq(templates.userId, userId))
    .limit(1);

  const templateRecord = defaultTemplate || anyTemplate;
  if (!templateRecord) {
    throw new Error("Template not configured.");
  }

  return templateRecord;
}

function normalizeScreenResult(raw: {
  tailoringRequired?: boolean;
  missingMustHaveSkills?: string[];
}): TailoringScreenResult {
  const missingMustHaveSkills = Array.isArray(raw.missingMustHaveSkills)
    ? raw.missingMustHaveSkills
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : [];

  return {
    tailoringRequired: missingMustHaveSkills.length > 0,
    missingMustHaveSkills,
  };
}

export async function checkTailoringRequired(
  input: CheckTailoringRequiredInput
): Promise<TailoringScreenResult> {
  const templateRecord = await resolveTemplateForUser(
    input.userId,
    input.templateId
  );
  const screeningModel = getScreeningModel(input.screeningModel);

  const aiConfig = await resolveAiConfig({
    userId: input.userId,
    aiConfigId: input.screeningAiConfigId,
    requestedModel: screeningModel,
    defaultModel: screeningModel,
  });

  if (!aiConfig) {
    throw new Error("AI provider API key not configured.");
  }

  const promptTemplate = await getScreeningPromptTemplate();
  const prompt = promptTemplate
    .replaceAll("{{JOB_DESCRIPTION}}", input.jobDescription)
    .replaceAll("{{TEMPLATE}}", templateRecord.content);

  const raw = await generateJsonObject<{
    tailoringRequired?: boolean;
    missingMustHaveSkills?: string[];
  }>({
    apiKey: aiConfig.apiKey,
    model: aiConfig.model,
    provider: aiConfig.provider,
    baseUrl: aiConfig.baseUrl,
    prompt,
    maxTokens: 512,
    json: true,
  });

  return normalizeScreenResult(raw);
}
