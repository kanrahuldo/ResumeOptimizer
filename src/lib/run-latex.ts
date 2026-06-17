import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { githubConfigs, runs } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";

function parseGitHubFileUrl(fileUrl: string) {
  const url = new URL(fileUrl);
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

async function fetchLatexFromGitHub(outputUrl: string, userId: string) {
  const parsed = parseGitHubFileUrl(outputUrl);
  if (!parsed?.path) return null;

  const [config] = await db
    .select()
    .from(githubConfigs)
    .where(and(eq(githubConfigs.userId, userId), eq(githubConfigs.isDefault, true)))
    .limit(1);

  if (!config?.token) return null;

  const token = decryptSecret(config.token);
  const path = parsed.path
    .split("/")
    .map((part) => encodeURIComponent(decodeURIComponent(part)))
    .join("/");
  const response = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${path}?ref=${encodeURIComponent(
      parsed.ref
    )}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    content?: string;
    encoding?: string;
  };

  if (data.encoding !== "base64" || !data.content) return null;
  return Buffer.from(data.content.replace(/\s/g, ""), "base64").toString("utf8");
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
      latex: runs.latex,
      outputUrl: runs.outputUrl,
    })
    .from(runs)
    .where(where)
    .limit(1);

  if (!run) return { found: false as const };
  if (run.latex) return { found: true as const, latex: run.latex, outputUrl: run.outputUrl };
  if (!run.outputUrl) return { found: true as const, latex: null, outputUrl: run.outputUrl };

  const latex = await fetchLatexFromGitHub(run.outputUrl, run.userId);
  if (!latex) return { found: true as const, latex: null, outputUrl: run.outputUrl };

  await db.update(runs).set({ latex }).where(eq(runs.id, run.id));
  return { found: true as const, latex, outputUrl: run.outputUrl };
}
