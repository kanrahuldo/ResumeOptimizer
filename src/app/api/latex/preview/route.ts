import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";

type PreviewBody = {
  content?: string;
  name?: string;
};

export async function POST(request: Request) {
  let body: PreviewBody;
  try {
    body = (await request.json()) as PreviewBody;
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "Template content is required." }, { status: 400 });
  }

  const rawName = body.name?.trim() || "template";
  const safeName = rawName
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80) || "template";

  const dir = await mkdtemp(path.join(tmpdir(), "latex-preview-"));
  const texPath = path.join(dir, "input.tex");

  const sanitizeForPreview = (source: string) => {
    const lines = source.split(/\r?\n/);
    const filtered = lines.filter((line) => {
      const lower = line.toLowerCase();
      return !(
        lower.includes("glyphtounicode") ||
        lower.includes("\\pdfgentounicode") ||
        lower.includes("\\pdfglyphtounicode")
      );
    });
    return filtered.join("\n");
  };

  const writeSource = async (source: string) => {
    await writeFile(texPath, source, "utf8");
  };

  const sanitizedContent = content.includes("glyphtounicode") ||
      content.includes("pdfgentounicode") ||
      content.includes("pdfglyphtounicode")
    ? sanitizeForPreview(content)
    : content;
  await writeSource(sanitizedContent);

  const cacheDir =
    process.env.TECTONIC_CACHE_DIR ||
    path.join(process.cwd(), ".cache", "tectonic");
  try {
    await mkdir(cacheDir, { recursive: true });
  } catch {
    // fallback to tmp if project dir isn't writable
  }
  const resolvedCacheDir = (await (async () => {
    try {
      await mkdir(cacheDir, { recursive: true });
      return cacheDir;
    } catch {
      return path.join(tmpdir(), "tectonic-cache");
    }
  })());

  const env = {
    ...process.env,
    TECTONIC_CACHE_DIR: resolvedCacheDir,
    ...(process.platform === "win32"
      ? { FONTCONFIG_PATH: "C:\\Windows\\System32" }
      : {}),
  };

  try {
    await execFileAsync(
      "tectonic",
      [
        "--web-bundle",
        "https://relay.fullyjustified.net/default_bundle.tar",
        texPath,
        "--outdir",
        dir,
      ],
      {
        timeout: 120000,
        windowsHide: true,
        env,
      }
    );
  } catch (error) {
    const err = error as { message?: string; stdout?: string; stderr?: string };
    const detail = err.stderr || err.stdout || "";
    const trimmed = detail.length > 2000 ? detail.slice(-2000) : detail;
    const message = trimmed
      ? `Tectonic failed: ${trimmed}`
      : err.message || "Tectonic compilation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  try {
    const pdfPath = path.join(dir, "input.pdf");
    const pdf = await readFile(pdfPath);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "PDF output not found." }, { status: 500 });
  }
}
