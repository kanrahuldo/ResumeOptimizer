import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { githubConfigs, prompts, runs, users } from "@/db/schema";
import { resolveAiConfig } from "@/lib/ai-config";
import {
  formatAiProviderError,
  generateText,
  isAiProviderOverloadError,
  isAnthropicPromptCacheEnabled,
} from "@/lib/ai";
import { decryptSecret } from "@/lib/crypto";
import { buildResumeFilename, uploadLatexToGitHub } from "@/lib/github";
import { extractJobHints } from "@/lib/job-hints";
import { buildSignedOverleafOpenUrl } from "@/lib/overleaf";
import { buildPrompt, buildPromptParts } from "@/lib/prompt";
import { resolveTemplateForUser } from "@/lib/tailoring-screen";
import { validateLatexOutput } from "@/lib/validation";

export type GenerateResumeRunInput = {
  userId: string;
  jobDescription: string;
  request: Request;
  templateId?: number | null;
  promptId?: number | null;
  aiConfigId?: number | null;
  model?: string;
  jobTitle?: string;
  company?: string;
  externalJobId?: string;
};

export type GenerateResumeRunResult = {
  runId: number;
  latex: string;
  outputUrl: string;
  overleafUrl: string;
  filenameBase: string;
};

async function resolvePromptForUser(userId: string, promptId?: number | null) {
  if (promptId != null) {
    const [selected] = await db
      .select()
      .from(prompts)
      .where(and(eq(prompts.id, promptId), eq(prompts.userId, userId)))
      .limit(1);
    if (!selected) {
      throw new Error("Selected prompt not found.");
    }
    return selected;
  }

  const [defaultPrompt] = await db
    .select()
    .from(prompts)
    .where(and(eq(prompts.isDefault, true), eq(prompts.userId, userId)))
    .limit(1);
  const [anyPrompt] = await db
    .select()
    .from(prompts)
    .where(eq(prompts.userId, userId))
    .limit(1);

  const promptRecord = defaultPrompt || anyPrompt;
  if (!promptRecord) {
    throw new Error("Prompt profile not configured.");
  }

  return promptRecord;
}

export async function generateResumeRun(
  input: GenerateResumeRunInput
): Promise<GenerateResumeRunResult> {
  const templateRecord = await resolveTemplateForUser(
    input.userId,
    input.templateId
  );
  const promptRecord = await resolvePromptForUser(input.userId, input.promptId);

  const [defaultGithub] = await db
    .select()
    .from(githubConfigs)
    .where(
      and(
        eq(githubConfigs.isDefault, true),
        eq(githubConfigs.userId, input.userId)
      )
    )
    .limit(1);

  const aiConfig = await resolveAiConfig({
    userId: input.userId,
    aiConfigId: input.aiConfigId,
    requestedModel: input.model,
  });

  if (!aiConfig) {
    throw new Error("AI provider API key not configured.");
  }

  const promptInput = {
    jobDescription: input.jobDescription,
    template: templateRecord.content,
    promptProfile: promptRecord.content,
  };
  const promptText = buildPrompt(promptInput);
  const promptParts = isAnthropicPromptCacheEnabled()
    ? buildPromptParts(promptInput) ?? undefined
    : undefined;

  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  const hints = extractJobHints(input.jobDescription);
  const company = input.company || hints.company;
  const title = input.jobTitle || hints.title;
  const jobId = input.externalJobId || hints.id;

  const latex = await generateText({
    apiKey: aiConfig.apiKey,
    model: aiConfig.model,
    provider: aiConfig.provider,
    baseUrl: aiConfig.baseUrl,
    prompt: promptText,
    promptParts,
    maxTokens: 12000,
  });

  const validation = validateLatexOutput(latex);
  if (!validation.valid) {
    const error = new Error("Validation failed.");
    (error as Error & { details?: string[] }).details = validation.errors;
    throw error;
  }

  const filenameBase = buildResumeFilename({
    userName: user?.name,
    company,
    title,
    id: jobId,
  });

  const upload = await uploadLatexToGitHub(latex, {
    token: defaultGithub?.token ? decryptSecret(defaultGithub.token) : undefined,
    owner: defaultGithub?.owner,
    repo: defaultGithub?.repo,
    filename: filenameBase,
  });

  const [run] = await db
    .insert(runs)
    .values({
      userId: input.userId,
      jobDescription: input.jobDescription,
      templateId: templateRecord.id,
      promptId: promptRecord.id,
      outputUrl: upload.downloadUrl,
      status: "ready",
    })
    .returning();

  if (!run) {
    throw new Error("Run record was not created.");
  }

  const overleafUrl = buildSignedOverleafOpenUrl(input.request, run.id);
  await db.update(runs).set({ overleafUrl }).where(eq(runs.id, run.id));

  return {
    runId: run.id,
    latex,
    outputUrl: upload.downloadUrl,
    overleafUrl,
    filenameBase,
  };
}

export function isGenerationTimeout(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return (
    error instanceof Error &&
    (error.name === "AbortError" || /timeout|timed out|aborted/i.test(message))
  );
}

export function getGenerationErrorDetails(error: unknown) {
  if (error instanceof Error && "details" in error) {
    const details = (error as Error & { details?: string[] }).details;
    if (Array.isArray(details)) return details;
  }
  if (error instanceof Error) return [formatAiProviderError(error.message)];
  return ["Generation failed."];
}

export function getGenerationErrorMessage(error: unknown) {
  const [detail] = getGenerationErrorDetails(error);
  if (isAiProviderOverloadError(detail)) {
    return detail;
  }
  return "Generation failed.";
}

export function isGenerationOverload(error: unknown) {
  const [detail] = getGenerationErrorDetails(error);
  return isAiProviderOverloadError(detail);
}
