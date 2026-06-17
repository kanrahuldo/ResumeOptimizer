import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { githubConfigs, openaiConfigs, prompts, runs, templates, users } from "@/db/schema";
import { generateText } from "@/lib/ai";
import { getUserId } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { buildPrompt } from "@/lib/prompt";
import { buildResumeFilename, uploadLatexToGitHub, buildOverleafUrl } from "@/lib/github";
import { buildSignedOverleafSnippetUrl } from "@/lib/overleaf";
import { validateLatexOutput } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

function extractJobHints(jobDescription: string) {
  const lines = jobDescription
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const companyLine = lines.find((line) =>
    /company|employer|organization/i.test(line)
  );
  const titleLine = lines.find((line) =>
    /title|role|position/i.test(line)
  );
  const jobIdMatch = jobDescription.match(
    /\b(?:job|requisition|req|posting)\s*(?:id|#|number)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9_-]{2,})\b/i
  );

  return {
    company: companyLine?.replace(/^(company|employer|organization)\s*[:#-]?\s*/i, "") || "",
    title: titleLine?.replace(/^(title|role|position)\s*[:#-]?\s*/i, "") || "",
    id: jobIdMatch?.[1] || "",
  };
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const jobDescription = String(body?.jobDescription || "").trim();
    const templateId = body?.templateId ? Number(body.templateId) : null;
    const promptId = body?.promptId ? Number(body.promptId) : null;
    const aiConfigId = body?.aiConfigId ? Number(body.aiConfigId) : null;
    const requestedModel = String(body?.model || "").trim();

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

  const model = requestedModel || defaultOpenAi?.model || process.env.AI_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
  const provider = defaultOpenAi?.provider || process.env.AI_PROVIDER || "openai";
  const baseUrl = defaultOpenAi?.baseUrl || process.env.AI_BASE_URL;

  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const { company, title, id: jobId } = extractJobHints(jobDescription);

  const latex = await generateText({
    apiKey,
    model,
    provider,
    baseUrl,
    prompt: promptText,
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
  const [run] = await db
    .insert(runs)
    .values({
      userId,
      jobDescription,
      templateId: templateRecord.id,
      promptId: promptRecord.id,
      outputUrl: upload.downloadUrl,
      latex,
      status: "ready",
    })
    .returning();

  if (!run) {
    throw new Error("Run record was not created.");
  }

  const overleafUrl = buildOverleafUrl(
    buildSignedOverleafSnippetUrl(request, run.id)
  );
  await db
    .update(runs)
    .set({ overleafUrl })
    .where(eq(runs.id, run.id));

  return NextResponse.json({
    data: {
      runId: run.id,
      outputUrl: upload.downloadUrl,
      overleafUrl,
    },
  });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generation failed.";
    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" || /timeout|timed out|aborted/i.test(message));

    return NextResponse.json(
      {
        error: isTimeout
          ? "The AI provider took too long to respond. Try a faster model or retry in a moment."
          : "Generation failed.",
        details: isTimeout ? undefined : [message],
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
