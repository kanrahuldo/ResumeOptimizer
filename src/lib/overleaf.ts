import crypto from "node:crypto";

function getSigningSecret() {
  const secret =
    process.env.OVERLEAF_SNIP_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.ENCRYPTION_KEY;

  if (!secret) {
    throw new Error(
      "OVERLEAF_SNIP_SECRET, NEXTAUTH_SECRET, or ENCRYPTION_KEY must be set."
    );
  }

  return secret;
}

function base64Url(buffer: Buffer) {
  return buffer.toString("base64url");
}

function sign(value: string) {
  return base64Url(
    crypto.createHmac("sha256", getSigningSecret()).update(value).digest()
  );
}

function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || request.headers.get("host");

  if (host) {
    const protocol =
      forwardedProto || new URL(request.url).protocol.replace(":", "");
    return `${protocol}://${host}`;
  }

  return new URL(request.url).origin;
}

function normalizeOrigin(value?: string | null) {
  const cleaned = String(value || "").trim().replace(/\/+$/, "");
  if (!cleaned) return "";
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
}

function getSnippetOrigin(request: Request) {
  return (
    normalizeOrigin(process.env.OVERLEAF_SNIPPET_ORIGIN) ||
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    getRequestOrigin(request)
  );
}

export function createOverleafSnippetToken(runId: number) {
  const payload = String(runId);
  return `${payload}.${sign(payload)}`;
}

export function verifyOverleafSnippetToken(token: string | null, runId: number) {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [tokenRunId, signature] = parts;
  if (Number(tokenRunId) !== runId) return false;

  const expected = sign(tokenRunId);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function appendVercelBypass(url: URL) {
  const vercelBypass =
    process.env.OVERLEAF_VERCEL_BYPASS_SECRET ||
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (vercelBypass) {
    url.searchParams.set("x-vercel-protection-bypass", vercelBypass);
  }
}

export function buildSignedOverleafSnippetUrl(request: Request, runId: number) {
  const snippetOrigin = getSnippetOrigin(request);
  const url = new URL(`/api/overleaf/snippet/${runId}/resume.tex`, snippetOrigin);
  url.searchParams.set("token", createOverleafSnippetToken(runId));
  appendVercelBypass(url);
  return url.toString();
}

export function buildSignedOverleafOpenUrl(request: Request, runId: number) {
  const snippetOrigin = getSnippetOrigin(request);
  const url = new URL(`/api/overleaf/open/${runId}`, snippetOrigin);
  url.searchParams.set("token", createOverleafSnippetToken(runId));
  appendVercelBypass(url);
  return url.toString();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export function buildOverleafPostHtml(latex: string) {
  const encoded = encodeURIComponent(latex);
  const safeValue = escapeHtml(encoded);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Opening in Overleaf…</title>
</head>
<body>
  <p>Opening your resume in Overleaf…</p>
  <form id="overleaf-form" action="https://www.overleaf.com/docs" method="post">
    <input type="hidden" name="encoded_snip" value="${safeValue}" />
  </form>
  <noscript>
    <p><button type="submit" form="overleaf-form">Continue to Overleaf</button></p>
  </noscript>
  <script>document.getElementById("overleaf-form").submit();</script>
</body>
</html>`;
}
