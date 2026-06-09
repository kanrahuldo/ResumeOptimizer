export const AI_PROVIDERS = [
  { id: "openai", label: "OpenAI", baseUrl: "" },
  { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  { id: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1" },
  { id: "together", label: "Together AI", baseUrl: "https://api.together.xyz/v1" },
  { id: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com" },
  { id: "xai", label: "xAI", baseUrl: "https://api.x.ai/v1" },
  { id: "custom", label: "Custom compatible API", baseUrl: "" },
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
