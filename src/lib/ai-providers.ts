export const AI_PROVIDERS = [
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "",
    models: [
      { id: "gpt-5.5", label: "GPT-5.5", thinking: true },
      { id: "gpt-5.1", label: "GPT-5.1", thinking: true },
      { id: "gpt-5", label: "GPT-5", thinking: true },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "o4-mini", label: "o4-mini", thinking: true },
    ],
  },
  {
    id: "anthropic",
    label: "Claude",
    baseUrl: "",
    models: [
      { id: "claude-fable-5", label: "Claude Fable 5", thinking: true },
      { id: "claude-opus-4-8", label: "Claude Opus 4.8", thinking: true },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", thinking: true },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    ],
  },
  {
    id: "gemini",
    label: "Gemini",
    baseUrl: "",
    models: [
      { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", thinking: true },
      { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", thinking: true },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", thinking: true },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", thinking: true },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      { id: "openai/gpt-5.1", label: "OpenAI GPT-5.1" },
      { id: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    ],
  },
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" },
      { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B" },
    ],
  },
  {
    id: "together",
    label: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", label: "Llama 3.3 70B Turbo" },
      { id: "deepseek-ai/DeepSeek-V3", label: "DeepSeek V3" },
    ],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    models: [
      { id: "deepseek-chat", label: "DeepSeek Chat" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner", thinking: true },
    ],
  },
  {
    id: "xai",
    label: "xAI",
    baseUrl: "https://api.x.ai/v1",
    models: [
      { id: "grok-4", label: "Grok 4", thinking: true },
      { id: "grok-3-mini", label: "Grok 3 Mini" },
    ],
  },
  { id: "custom", label: "Custom compatible API", baseUrl: "", models: [] },
] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number]["id"];

export function normalizeAiProvider(provider?: string | null): AiProvider {
  const normalized = String(provider || "openai").trim().toLowerCase();
  return AI_PROVIDERS.some((item) => item.id === normalized)
    ? (normalized as AiProvider)
    : "custom";
}

export function getProviderBaseUrl(provider?: string | null, baseUrl?: string | null) {
  const cleanBaseUrl = String(baseUrl || "").trim();
  if (cleanBaseUrl) {
    return cleanBaseUrl;
  }

  const providerConfig = AI_PROVIDERS.find(
    (item) => item.id === normalizeAiProvider(provider)
  );
  return providerConfig?.baseUrl || undefined;
}

export function getProviderModels(provider?: string | null) {
  return AI_PROVIDERS.find(
    (item) => item.id === normalizeAiProvider(provider)
  )?.models || [];
}

export function getProviderLabel(provider?: string | null) {
  return AI_PROVIDERS.find(
    (item) => item.id === normalizeAiProvider(provider)
  )?.label || "Custom";
}

export function isOpenAiCompatibleProvider(provider?: string | null) {
  return !["anthropic", "gemini"].includes(normalizeAiProvider(provider));
}
