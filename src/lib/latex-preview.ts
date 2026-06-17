import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function sanitizePreviewName(rawName?: string | null) {
  return (
    rawName
      ?.trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 80) || "template"
  );
}

function sanitizeForPreview(source: string) {
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
}

export async function renderLatexPreviewPdf(content: string) {
  const dir = await mkdtemp(path.join(tmpdir(), "latex-preview-"));
  const texPath = path.join(dir, "input.tex");
  const sanitizedContent =
    content.includes("glyphtounicode") ||
    content.includes("pdfgentounicode") ||
    content.includes("pdfglyphtounicode")
      ? sanitizeForPreview(content)
      : content;

  await writeFile(texPath, sanitizedContent, "utf8");

  const cacheDir =
    process.env.TECTONIC_CACHE_DIR ||
    path.join(process.cwd(), ".cache", "tectonic");
  const resolvedCacheDir = await (async () => {
    try {
      await mkdir(cacheDir, { recursive: true });
      return cacheDir;
    } catch {
      return path.join(tmpdir(), "tectonic-cache");
    }
  })();

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
    if (/ENOENT/i.test(err.message || "")) {
      throw new Error("PDF preview is unavailable in this deployment.");
    }

    const detail = err.stderr || err.stdout || "";
    const trimmed = detail.length > 2000 ? detail.slice(-2000) : detail;
    const message = trimmed
      ? `Tectonic failed: ${trimmed}`
      : err.message || "Tectonic compilation failed.";
    throw new Error(message);
  }

  try {
    return await readFile(path.join(dir, "input.pdf"));
  } catch {
    throw new Error("PDF output not found.");
  }
}
