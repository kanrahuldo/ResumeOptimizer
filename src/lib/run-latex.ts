import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { githubConfigs, runs } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";

function parseGitHubFileUrl(fileUrl: string) {
  let url: URL;
  try {
    url = new URL(fileUrl);
  } catch {
    return null;
  }
  const parts = url.pathname.split("/").filter(Boolean);

  if (url.hostname === "raw.githubusercontent.com" && parts.length >= 4) {
    const [owner, repo, ref, ...pathParts] = parts;
    return { owner, repo, ref, path: pathParts.join("/") };
  }

  if (url.hostname === "github.com" && parts.length >= 5 && parts[2] === "blob") {
    const [owner, repo, , ref, ...pathParts] = parts;
    return { owner, repo, ref, path: pathParts.join("/") };
  }

  return null;
}

function encodePathPart(part: string) {
  return encodeURIComponent(decodeURIComponent(part));
}

function buildGitHubApiUrl(parsed: {
  owner: string;
  repo: string;
  ref: string;
  path: string;
}) {
  const path = parsed.path.split("/").map(encodePathPart).join("/");
  return `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${path}?ref=${encodeURIComponent(
    parsed.ref
  )}`;
}

function buildRawGitHubUrl(parsed: {
  owner: string;
  repo: string;
  ref: string;
  path: string;
}) {
  const path = parsed.path.split("/").map(encodePathPart).join("/");
  return `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(
    parsed.ref
  )}/${path}`;
}

async function fetchPublicLatexFromGitHub(parsed: {
  owner: string;
  repo: string;
  ref: string;
  path: string;
}) {
  let response: Response;
  try {
    response = await fetch(buildRawGitHubUrl(parsed), { cache: "no-store" });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  return response.text();
}

async function fetchLatexFromGitHubApi(
  parsed: {
    owner: string;
    repo: string;
    ref: string;
    path: string;
  },
  token: string
) {
  let response: Response;
  try {
    response = await fetch(buildGitHubApiUrl(parsed), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const data = (await response.json()) as {
    content?: string;
    encoding?: string;
  };

  if (data.encoding !== "base64" || !data.content) return null;
  return Buffer.from(data.content.replace(/\s/g, ""), "base64").toString("utf8");
}

async function fetchLatexFromGitHub(outputUrl: string, userId: string) {
  const parsed = parseGitHubFileUrl(outputUrl);
  if (!parsed?.path) return null;

  const publicLatex = await fetchPublicLatexFromGitHub(parsed);
  if (publicLatex) return publicLatex;

  const tokens: string[] = [];
  const [config] = await db
    .select()
    .from(githubConfigs)
    .where(and(eq(githubConfigs.userId, userId), eq(githubConfigs.isDefault, true)))
    .limit(1);

  if (config?.token) {
    try {
      tokens.push(decryptSecret(config.token));
    } catch {
      // Continue with environment credentials if a saved profile is stale.
    }
  }

  if (process.env.GITHUB_TOKEN) {
    tokens.push(process.env.GITHUB_TOKEN);
  }

  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));
  for (const token of uniqueTokens) {
    const latex = await fetchLatexFromGitHubApi(parsed, token);
    if (latex) return latex;
  }

  return null;
}

export async function getRunLatexForPreview(params: {
  runId: number;
  userId?: string;
}) {
  const where = params.userId
    ? and(eq(runs.id, params.runId), eq(runs.userId, params.userId))
    : eq(runs.id, params.runId);

  const [run] = await db
    .select({
      id: runs.id,
      userId: runs.userId,
      outputUrl: runs.outputUrl,
    })
    .from(runs)
    .where(where)
    .limit(1);

  if (!run) return { found: false as const };
  if (!run.outputUrl) return { found: true as const, latex: null, outputUrl: run.outputUrl };

  const latex = await fetchLatexFromGitHub(run.outputUrl, run.userId);
  if (!latex) return { found: true as const, latex: null, outputUrl: run.outputUrl };

  return { found: true as const, latex, outputUrl: run.outputUrl };
}
