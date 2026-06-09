import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { githubConfigs, openaiConfigs, prompts, runs, templates, users } from "@/db/schema";
import { generateJsonObject, generateText } from "@/lib/ai";
import { getUserId } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { buildPrompt } from "@/lib/prompt";
import { buildResumeFilename, uploadLatexToGitHub, buildOverleafUrl } from "@/lib/github";
import { validateLatexOutput } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const jobDescription = String(body?.jobDescription || "").trim();
  const templateId = body?.templateId ? Number(body.templateId) : null;
  const promptId = body?.promptId ? Number(body.promptId) : null;
  const aiConfigId = body?.aiConfigId ? Number(body.aiConfigId) : null;

  if (!jobDescription) {
    return NextResponse.json(
      { error: "Job description is required." },
      { status: 400 }
    );
  }

  let selectedTemplate = null;
  if (templateId != null) {
    [selectedTemplate] = await db
      .select()
      .from(templates)
      .where(and(eq(templates.id, templateId), eq(templates.userId, userId)))
      .limit(1);
    if (!selectedTemplate) {
      return NextResponse.json(
        { error: "Selected template not found." },
        { status: 404 }
      );
    }
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

  const templateRecord = selectedTemplate || defaultTemplate || anyTemplate;

  let selectedPrompt = null;
  if (promptId != null) {
    [selectedPrompt] = await db
      .select()
      .from(prompts)
      .where(and(eq(prompts.id, promptId), eq(prompts.userId, userId)))
      .limit(1);
    if (!selectedPrompt) {
      return NextResponse.json(
        { error: "Selected prompt not found." },
        { status: 404 }
      );
    }
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

  const promptRecord = selectedPrompt || defaultPrompt || anyPrompt;

  if (!templateRecord || !promptRecord) {
    return NextResponse.json(
      { error: "Template or prompt profile not configured." },
      { status: 400 }
    );
  }

  const [defaultGithub] = await db
    .select()
    .from(githubConfigs)
    .where(and(eq(githubConfigs.isDefault, true), eq(githubConfigs.userId, userId)))
    .limit(1);
  let selectedAiConfig = null;
  if (aiConfigId != null) {
    [selectedAiConfig] = await db
      .select()
      .from(openaiConfigs)
      .where(and(eq(openaiConfigs.id, aiConfigId), eq(openaiConfigs.userId, userId)))
      .limit(1);
    if (!selectedAiConfig) {
      return NextResponse.json(
        { error: "Selected AI profile not found." },
        { status: 404 }
      );
    }
  }

  const [defaultOpenAi] = selectedAiConfig
    ? [selectedAiConfig]
    : await db
        .select()
        .from(openaiConfigs)
        .where(and(eq(openaiConfigs.isDefault, true), eq(openaiConfigs.userId, userId)))
        .limit(1);

  const promptText = buildPrompt({
    jobDescription,
    template: templateRecord.content,
    promptProfile: promptRecord.content,
  });

  const apiKey = defaultOpenAi?.apiKey
    ? decryptSecret(defaultOpenAi.apiKey)
    : process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI provider API key not configured." },
      { status: 400 }
    );
  }

  const model = defaultOpenAi?.model || process.env.AI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const provider = defaultOpenAi?.provider || process.env.AI_PROVIDER || "openai";
  const baseUrl = defaultOpenAi?.baseUrl || process.env.AI_BASE_URL;

  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const jobInfoPrompt = [
    "Extract the company name, job title, and any job ID from this job description.",
    "Return JSON only with keys: company, title, id.",
    "Use empty string for missing values. Do not guess.",
    "",
    jobDescription,
  ].join("\n");

  let company = "";
  let title = "";
  let jobId = "";

  try {
    const parsed = await generateJsonObject<{
      company?: unknown;
      title?: unknown;
      id?: unknown;
    }>({
      apiKey,
      model,
      provider,
      baseUrl,
      prompt: jobInfoPrompt,
      temperature: 0,
      maxTokens: 300,
    });
    company = typeof parsed.company === "string" ? parsed.company : "";
    title = typeof parsed.title === "string" ? parsed.title : "";
    jobId = typeof parsed.id === "string" ? parsed.id : "";
  } catch {
    company = "";
    title = "";
    jobId = "";
  }

  const latex = await generateText({
    apiKey,
    model,
    provider,
    baseUrl,
    prompt: promptText,
    temperature: 0.4,
    maxTokens: 12000,
  });
  const validation = validateLatexOutput(latex);

  if (!validation.valid) {
    return NextResponse.json(
      { error: "Validation failed.", details: validation.errors },
      { status: 422 }
    );
  }

  const upload = await uploadLatexToGitHub(latex, {
    token: defaultGithub?.token ? decryptSecret(defaultGithub.token) : undefined,
    owner: defaultGithub?.owner,
    repo: defaultGithub?.repo,
    filename: buildResumeFilename({
      userName: user?.name,
      company,
      title,
      id: jobId,
    }),
  });
  const overleafUrl = buildOverleafUrl(upload.downloadUrl);

  const [run] = await db
    .insert(runs)
    .values({
      userId,
      jobDescription,
      templateId: templateRecord.id,
      promptId: promptRecord.id,
      outputUrl: upload.downloadUrl,
      overleafUrl,
      status: "ready",
    })
    .returning();

  return NextResponse.json({
    data: {
      runId: run?.id,
      outputUrl: upload.downloadUrl,
      overleafUrl,
      latex,
    },
  });
}
