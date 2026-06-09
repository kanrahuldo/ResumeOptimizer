import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { githubConfigs, openaiConfigs, prompts, runs, templates, users } from "@/db/schema";
import { createAiClient } from "@/lib/ai";
import { getUserId } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { buildPrompt } from "@/lib/prompt";
import { buildResumeFilename, uploadLatexToGitHub, buildOverleafUrl } from "@/lib/github";
import { validateLatexOutput } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const jobDescription = String(body?.jobDescription || "").trim();
  const templateId = body?.templateId ? Number(body.templateId) : null;
  const promptId = body?.promptId ? Number(body.promptId) : null;

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
  const [defaultOpenAi] = await db
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
    : process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI provider API key not configured." },
      { status: 400 }
    );
  }

  const model = defaultOpenAi?.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const provider = defaultOpenAi?.provider || process.env.AI_PROVIDER || "openai";
  const baseUrl = defaultOpenAi?.baseUrl || process.env.AI_BASE_URL;

  const ai = createAiClient({ apiKey, provider, baseUrl });

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
    const infoResponse = await ai.chat.completions.create({
      model,
      messages: [{ role: "user", content: jobInfoPrompt }],
      temperature: 0,
      response_format: { type: "json_object" },
      max_tokens: 200,
    });
    const rawInfo = infoResponse.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(rawInfo);
    company = typeof parsed.company === "string" ? parsed.company : "";
    title = typeof parsed.title === "string" ? parsed.title : "";
    jobId = typeof parsed.id === "string" ? parsed.id : "";
  } catch {
    company = "";
    title = "";
    jobId = "";
  }

  const completion = await ai.chat.completions.create({
    model,
    messages: [{ role: "user", content: promptText }],
    temperature: 0.4,
  });

  const latex = completion.choices[0]?.message?.content ?? "";
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
