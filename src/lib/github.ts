type GitHubUploadResult = {
  downloadUrl: string;
  path: string;
};

type GitHubConfig = {
  token?: string | null;
  owner?: string | null;
  repo?: string | null;
  filename?: string | null;
};

function normalizePart(value: string | undefined | null, fallback: string) {
  const cleaned = (value || "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

function randomSuffix(length = 5) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function buildResumeFilename(params: {
  userName?: string | null;
  company?: string | null;
  title?: string | null;
  id?: string | null;
}) {
  const user = normalizePart(params.userName, "User");
  const company = normalizePart(params.company, "Company");
  const title = normalizePart(params.title, "Role");
  const idPart = normalizePart(params.id, "");
  const suffix = randomSuffix(5);

  return [user, company, title, idPart, suffix].filter(Boolean).join("_");
}

export async function uploadLatexToGitHub(
  content: string,
  config?: GitHubConfig
): Promise<GitHubUploadResult> {
  const token = config?.token ?? process.env.GITHUB_TOKEN;
  const owner = config?.owner ?? process.env.GITHUB_OWNER;
  const repo = config?.repo ?? process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error("Missing GitHub configuration.");
  }

  const now = new Date();
  const dateFolder = now.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  const filename = normalizePart(config?.filename, now.toISOString());
  const path = `custom/${dateFolder}/${filename}.tex`;
  const encoded = Buffer.from(content).toString("base64");

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
      path
    )}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        message: "Resume upload",
        content: encoded,
      }),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "GitHub upload failed.");
  }

  const data = await response.json();
  return { downloadUrl: data.content.download_url, path };
}

export function buildOverleafUrl(downloadUrl: string) {
  return `https://www.overleaf.com/docs?snip_uri=${encodeURIComponent(
    downloadUrl
  )}`;
}
