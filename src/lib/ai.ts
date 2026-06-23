import OpenAI from "openai";

import {
  getProviderBaseUrl,
  isOpenAiCompatibleProvider,
  normalizeAiProvider,
  usesMaxCompletionTokens,
} from "@/lib/ai-providers";

const DEFAULT_TIMEOUT_MS = 295_000;
const ANTHROPIC_OVERLOAD_MAX_ATTEMPTS = 3;

export function isAnthropicPromptCacheEnabled() {
  const value = String(process.env.AI_PROMPT_CACHE || "")
    .trim()
    .toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

export function formatAiProviderError(raw: string) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "Generation failed.";

  try {
    const parsed = JSON.parse(trimmed) as {
      error?: { type?: string; message?: string; code?: string };
      message?: string;
    };
    const err = parsed.error ?? parsed;
    const type = String(
      ("type" in err && err.type) || ("code" in err && err.code) || ""
    ).toLowerCase();
    const message = String(
      ("message" in err && err.message) || parsed.message || trimmed
    );

    if (type === "overloaded_error" || /overloaded/i.test(message)) {
      return "Claude is temporarily overloaded. Wait a moment and retry, or switch to gpt-4o-mini / gpt-4.1-mini.";
    }

    if (/max_tokens.*max_completion_tokens|max_completion_tokens.*max_tokens/i.test(message)) {
      return message;
    }

    return message;
  } catch {
    if (/overloaded_error|"Overloaded"/i.test(trimmed)) {
      return "Claude is temporarily overloaded. Wait a moment and retry, or switch to gpt-4o-mini / gpt-4.1-mini.";
    }
    return trimmed;
  }
}

function getAnthropicCacheControl() {
  const ttl = String(process.env.AI_PROMPT_CACHE_TTL || "").trim();
  if (ttl === "1h") {
    return { type: "ephemeral", ttl: "1h" };
  }
  return { type: "ephemeral" };
}

function getTimeoutMs() {
  const parsed = Number(process.env.AI_REQUEST_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function timeoutSignal() {
  return AbortSignal.timeout(getTimeoutMs());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAnthropicOverloaded(body: string) {
  try {
    const parsed = JSON.parse(body) as { error?: { type?: string } };
    return parsed.error?.type === "overloaded_error";
  } catch {
    return /overloaded_error|"Overloaded"/i.test(body);
  }
}

function normalizeAiRequestError(error: unknown) {
  if (error instanceof OpenAI.APIError) {
    throw new Error(formatAiProviderError(error.message));
  }
  if (error instanceof Error) {
    throw new Error(formatAiProviderError(error.message));
  }
  throw error;
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

type PromptParts = {
  cachedPrefix: string;
  dynamicSuffix: string;
};

type GenerateTextOptions = {
  apiKey: string;
  model: string;
  provider?: string | null;
  baseUrl?: string | null;
  prompt: string;
  promptParts?: PromptParts;
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

function buildAnthropicBody(options: GenerateTextOptions) {
  const usePromptCaching = Boolean(options.promptParts);
  const maxTokens = options.maxTokens || 8192;

  if (usePromptCaching) {
    return {
      model: options.model,
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: options.promptParts!.cachedPrefix,
              cache_control: getAnthropicCacheControl(),
            },
            {
              type: "text",
              text: options.promptParts!.dynamicSuffix,
            },
          ],
        },
      ],
    };
  }

  return {
    model: options.model,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: options.prompt }],
  };
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
        maxOutputTokens: options.maxTokens,
        responseMimeType: options.json ? "application/json" : undefined,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(formatAiProviderError(await response.text()));
  }

  return extractGeminiText(await response.json());
}

async function generateWithAnthropic(options: GenerateTextOptions) {
  let lastBody = "";

  for (let attempt = 1; attempt <= ANTHROPIC_OVERLOAD_MAX_ATTEMPTS; attempt += 1) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": options.apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: timeoutSignal(),
      body: JSON.stringify(buildAnthropicBody(options)),
    });

    if (response.ok) {
      return extractAnthropicText(await response.json());
    }

    lastBody = await response.text();
    if (isAnthropicOverloaded(lastBody) && attempt < ANTHROPIC_OVERLOAD_MAX_ATTEMPTS) {
      await sleep(1500 * attempt);
      continue;
    }

    throw new Error(formatAiProviderError(lastBody));
  }

  throw new Error(formatAiProviderError(lastBody));
}

async function generateWithOpenAiCompatible(options: GenerateTextOptions) {
  const client = createAiClient(options);
  const limit = options.maxTokens;
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "user", content: options.prompt },
  ];
  const baseParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming =
    {
      model: options.model,
      messages,
      ...(options.json ? { response_format: { type: "json_object" as const } } : {}),
    };

  try {
    const response = usesMaxCompletionTokens(options.model)
      ? await client.chat.completions.create({
          ...baseParams,
          max_completion_tokens: limit,
        } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming)
      : await client.chat.completions.create({
          ...baseParams,
          max_tokens: limit,
        });

    return response.choices[0]?.message?.content ?? "";
  } catch (error) {
    normalizeAiRequestError(error);
    return "";
  }
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
    maxTokens: 8,
  });
}

export function isAiProviderOverloadError(message: string) {
  return /temporarily overloaded|overloaded/i.test(message);
}
