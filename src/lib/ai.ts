import OpenAI from "openai";

import { getProviderBaseUrl } from "@/lib/ai-providers";

export function createAiClient(options: {
  apiKey: string;
  provider?: string | null;
  baseUrl?: string | null;
}) {
  return new OpenAI({
    apiKey: options.apiKey,
    baseURL: getProviderBaseUrl(options.provider, options.baseUrl),
  });
}

export async function testAiConnection(options: {
  apiKey: string;
  model: string;
  provider?: string | null;
  baseUrl?: string | null;
}) {
  const client = createAiClient(options);
  await client.chat.completions.create({
    model: options.model,
    messages: [{ role: "user", content: "Reply with ok." }],
    temperature: 0,
    max_tokens: 5,
  });
}
