export type TemplateRecord = {
  id: number;
  name: string;
  content: string;
  isDefault: boolean;
  updatedAt: string;
};

export type PromptRecord = {
  id: number;
  name: string;
  content: string;
  isDefault: boolean;
  updatedAt: string;
};

export type GithubConfigRecord = {
  id: number;
  name: string;
  owner: string;
  repo: string;
  token?: string;
  isDefault: boolean;
  updatedAt: string;
};

export type OpenAiConfigRecord = {
  id: number;
  name: string;
  provider: string;
  apiKey?: string;
  model: string;
  baseUrl?: string | null;
  isDefault: boolean;
  updatedAt: string;
};

async function handleJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed.");
  }
  return response.json() as Promise<T>;
}

export async function fetchTemplates() {
  return handleJson<{ data: TemplateRecord[] }>(
    await fetch("/api/templates", { cache: "no-store" })
  );
}

export async function createTemplate(payload: {
  name: string;
  content: string;
  isDefault?: boolean;
}) {
  return handleJson<{ data: TemplateRecord }>(
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function setDefaultTemplate(id: number) {
  return handleJson<{ data: TemplateRecord }>(
    await fetch(`/api/templates/${id}/default`, { method: "PATCH" })
  );
}

export async function updateTemplate(id: number, payload: {
  name: string;
  content: string;
}) {
  return handleJson<{ data: TemplateRecord }>(
    await fetch(`/api/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function deleteTemplate(id: number) {
  return handleJson<{ data: TemplateRecord }>(
    await fetch(`/api/templates/${id}`, { method: "DELETE" })
  );
}

export async function fetchPrompts() {
  return handleJson<{ data: PromptRecord[] }>(
    await fetch("/api/prompts", { cache: "no-store" })
  );
}

export async function createPrompt(payload: {
  name: string;
  content: string;
  isDefault?: boolean;
}) {
  return handleJson<{ data: PromptRecord }>(
    await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function setDefaultPrompt(id: number) {
  return handleJson<{ data: PromptRecord }>(
    await fetch(`/api/prompts/${id}/default`, { method: "PATCH" })
  );
}

export async function updatePrompt(id: number, payload: {
  name: string;
  content: string;
}) {
  return handleJson<{ data: PromptRecord }>(
    await fetch(`/api/prompts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function deletePrompt(id: number) {
  return handleJson<{ data: PromptRecord }>(
    await fetch(`/api/prompts/${id}`, { method: "DELETE" })
  );
}

export async function fetchGithubConfigs() {
  return handleJson<{ data: GithubConfigRecord[] }>(
    await fetch("/api/github-configs", { cache: "no-store" })
  );
}

export async function createGithubConfig(payload: {
  name: string;
  owner: string;
  repo: string;
  token: string;
  isDefault?: boolean;
}) {
  return handleJson<{ data: GithubConfigRecord }>(
    await fetch("/api/github-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function updateGithubConfig(
  id: number,
  payload: { name: string; owner: string; repo: string; token: string }
) {
  return handleJson<{ data: GithubConfigRecord }>(
    await fetch(`/api/github-configs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function deleteGithubConfig(id: number) {
  return handleJson<{ data: GithubConfigRecord }>(
    await fetch(`/api/github-configs/${id}`, { method: "DELETE" })
  );
}

export async function setDefaultGithubConfig(id: number) {
  return handleJson<{ data: GithubConfigRecord }>(
    await fetch(`/api/github-configs/${id}/default`, { method: "PATCH" })
  );
}

export async function fetchOpenAiConfigs() {
  return handleJson<{ data: OpenAiConfigRecord[] }>(
    await fetch("/api/openai-configs", { cache: "no-store" })
  );
}

export async function createOpenAiConfig(payload: {
  name: string;
  provider: string;
  apiKey: string;
  model?: string;
  baseUrl?: string;
  isDefault?: boolean;
}) {
  return handleJson<{ data: OpenAiConfigRecord }>(
    await fetch("/api/openai-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function updateOpenAiConfig(
  id: number,
  payload: { name: string; provider: string; apiKey: string; model?: string; baseUrl?: string }
) {
  return handleJson<{ data: OpenAiConfigRecord }>(
    await fetch(`/api/openai-configs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function deleteOpenAiConfig(id: number) {
  return handleJson<{ data: OpenAiConfigRecord }>(
    await fetch(`/api/openai-configs/${id}`, { method: "DELETE" })
  );
}

export async function setDefaultOpenAiConfig(id: number) {
  return handleJson<{ data: OpenAiConfigRecord }>(
    await fetch(`/api/openai-configs/${id}/default`, { method: "PATCH" })
  );
}

export async function deleteRun(id: number) {
  return handleJson<{ data: { id: number } }>(
    await fetch(`/api/runs/${id}`, { method: "DELETE" })
  );
}
