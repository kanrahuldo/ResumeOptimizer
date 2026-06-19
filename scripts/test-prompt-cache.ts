import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { generateText, isAnthropicPromptCacheEnabled } from "../src/lib/ai";
import { buildPromptParts } from "../src/lib/prompt";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const template = readFileSync(join(root, "src/seed/default-template.tex"), "utf8");
const promptProfile = readFileSync(join(root, "src/seed/default-prompt.txt"), "utf8");

const promptInput = {
  jobDescription: "Software Engineer role requiring TypeScript and React.",
  template,
  promptProfile,
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  assert(!isAnthropicPromptCacheEnabled(), "Caching should be off by default");

  const parts = buildPromptParts(promptInput);
  assert(parts?.cachedPrefix.includes(promptProfile), "Cached prefix includes prompt");
  assert(parts?.dynamicSuffix.includes("TypeScript"), "Dynamic suffix includes JD");

  const requests: Array<Record<string, unknown>> = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (_url, init) => {
    requests.push(JSON.parse(String(init?.body || "{}")));
    return new Response(
      JSON.stringify({
        content: [
          {
            type: "text",
            text: "\\documentclass{article}\\begin{document}ok\\end{document}",
          },
        ],
        usage: {
          cache_creation_input_tokens: requests.length === 1 ? 3200 : 0,
          cache_read_input_tokens: requests.length > 1 ? 3200 : 0,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  try {
    delete process.env.AI_PROMPT_CACHE;

    await generateText({
      apiKey: "test-key",
      model: "claude-sonnet-4-6",
      provider: "anthropic",
      prompt: "flat prompt",
      maxTokens: 64,
    });

    const flatMessage = requests[0].messages as Array<{ content: unknown }>;
    assert(typeof flatMessage[0].content === "string", "Default path sends a flat user message");

    process.env.AI_PROMPT_CACHE = "true";
    assert(isAnthropicPromptCacheEnabled(), "Caching enables with AI_PROMPT_CACHE=true");

    await generateText({
      apiKey: "test-key",
      model: "claude-sonnet-4-6",
      provider: "anthropic",
      prompt: "unused when parts provided",
      promptParts: parts!,
      maxTokens: 64,
    });

    await generateText({
      apiKey: "test-key",
      model: "claude-sonnet-4-6",
      provider: "anthropic",
      prompt: "unused when parts provided",
      promptParts: {
        ...parts!,
        dynamicSuffix:
          "Job posting description (tailor the resume content to match this):\n\nDifferent JD.",
      },
      maxTokens: 64,
    });

    const cachedMessage = (requests[1].messages as Array<{ content: Array<Record<string, unknown>> }>)[0];
    const content = cachedMessage.content;
    assert(Array.isArray(content), "Cached path sends structured content blocks");
    assert(
      (content[0].cache_control as { type?: string } | undefined)?.type === "ephemeral",
      "Cached prefix includes cache_control"
    );
    assert(!content[1].cache_control, "Dynamic suffix is not cached");

    console.log("Prompt cache test passed.");
    console.log("- default off verified");
    console.log("- flat Anthropic request when caching disabled");
    console.log("- cache_control present when promptParts provided");
    console.log(`- mocked Anthropic calls: ${requests.length}`);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.AI_PROMPT_CACHE;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
