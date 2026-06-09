import OpenAI from "openai";

import {
  getProviderBaseUrl,
  isOpenAiCompatibleProvider,
  normalizeAiProvider,
} from "@/lib/ai-providers";

const DEFAULT_TIMEOUT_MS = 295_000;

function getTimeoutMs() {
  const parsed = Number(process.env.AI_REQUEST_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function timeoutSignal() {
  return AbortSignal.timeout(getTimeoutMs());
}

export function createAiClient(options: {
  apiKey: string;
  provider?: string | null;
  baseUrl?: string | null;
}) {
  return new OpenAI({
    apiKey: options.apiKey,
    baseURL: getProviderBaseUrl(options.provider, options.baseUrl),
    timeout: getTimeoutMs(),
  });
}

type GenerateTextOptions = {
  apiKey: string;
  model: string;
  provider?: string | null;
  baseUrl?: string | null;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
};

function extractGeminiText(data: unknown) {
  const candidates = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    .candidates;
  return candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
}

function extractAnthropicText(data: unknown) {
  const content = (data as { content?: Array<{ type?: string; text?: string }> }).content;
  return content?.map((part) => part.text || "").join("") || "";
}

async function generateWithGemini(options: GenerateTextOptions) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    options.model
  )}:generateContent?key=${encodeURIComponent(options.apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: timeoutSignal(),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: options.prompt }] }],
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
        responseMimeType: options.json ? "application/json" : undefined,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return extractGeminiText(await response.json());
}

async function generateWithAnthropic(options: GenerateTextOptions) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": options.apiKey,
      "anthropic-version": "2023-06-01",
    },
    signal: timeoutSignal(),
    body: JSON.stringify({
      model: options.model,
      max_tokens: options.maxTokens || 8192,
      temperature: options.temperature,
      messages: [{ role: "user", content: options.prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return extractAnthropicText(await response.json());
}

async function generateWithOpenAiCompatible(options: GenerateTextOptions) {
  const client = createAiClient(options);
  const response = await client.chat.completions.create({
    model: options.model,
    messages: [{ role: "user", content: options.prompt }],
    temperature: options.temperature,
    response_format: options.json ? { type: "json_object" } : undefined,
    max_tokens: options.maxTokens,
  });
  return response.choices[0]?.message?.content ?? "";
}

export async function generateText(options: GenerateTextOptions) {
  const provider = normalizeAiProvider(options.provider);

  if (provider === "gemini") {
    return generateWithGemini(options);
  }

  if (provider === "anthropic") {
    return generateWithAnthropic(options);
  }

  if (isOpenAiCompatibleProvider(provider)) {
    return generateWithOpenAiCompatible(options);
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

export async function generateJsonObject<T>(options: GenerateTextOptions) {
  const raw = await generateText({ ...options, json: true });
  return JSON.parse(raw) as T;
}

export async function testAiConnection(options: Omit<GenerateTextOptions, "prompt">) {
  await generateText({
    ...options,
    prompt: "Reply with ok.",
    temperature: 0,
    maxTokens: 8,
  });
}
