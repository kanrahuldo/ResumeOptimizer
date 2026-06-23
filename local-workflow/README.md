# Local resume workflow (Claude Code & Codex)

Use this folder to tailor resumes with a **subscription** (Claude Code or OpenAI Codex) instead of the web app's per-token API path. The rules mirror `src/seed/default-prompt.txt` used by `/api/generate`.

## Setup (one time)

1. **Replace the template** — edit `template.tex` with your real resume. Keep the same LaTeX structure (sections, macros, companies, dates).
2. **Optional:** tweak `prompt-rules.md` if you want different bullet counts or tone.

## Claude Code (Opus 4.8, etc.)

```bash
cd local-workflow
claude
```

Then:

```
/tailor-resume example-acme-swe
```

Or in natural language:

> Tailor my resume for jobs/example-acme-swe.md

Claude reads `CLAUDE.md`, `template.tex`, and `prompt-rules.md` automatically.

## OpenAI Codex (your subscription)

```bash
cd local-workflow
codex
```

Then:

```
$tailor-resume
```

Or:

> Read template.tex and prompt-rules.md, then tailor for jobs/example-acme-swe.md and write to output/example-acme-swe.tex

Codex reads `AGENTS.md` from this directory. Skills are in `.agents/skills/tailor-resume/`.

**Tip:** If Codex truncates long `AGENTS.md` files, raise the limit in `~/.codex/config.toml`:

```toml
project_doc_max_bytes = 65536
```

## From the repo root

Skills also exist at the project root so you can run Claude Code or Codex from `/workspace` without `cd`:

- Claude: `.claude/skills/tailor-resume/` → paths under `local-workflow/`
- Codex: `.agents/skills/tailor-resume/` → paths under `local-workflow/`

## Helper scripts

```bash
cd local-workflow

# Create a new job file (opens $EDITOR)
./scripts/new-job.sh stripe-pm

# Pipe a JD from clipboard (macOS)
pbpaste | ./scripts/new-job.sh meta-swe --stdin

# See which jobs have output
./scripts/list-jobs.sh
```

## Output

Generated files go to `output/<job-slug>.tex` (gitignored). Upload to Overleaf manually, or push to your GitHub repo if you use that flow from the main app.

## Claude vs Codex — same workflow?

**Yes.** Both tools use the same file layout and the same open `SKILL.md` format:

| | Claude Code | Codex |
|---|-------------|-------|
| Project instructions | `CLAUDE.md` | `AGENTS.md` |
| Skill location | `.claude/skills/tailor-resume/` | `.agents/skills/tailor-resume/` |
| Invoke skill | `/tailor-resume <slug>` | `$tailor-resume` or describe the task |
| Best model | Opus 4.8 (your finding) | Highest tier in your Codex plan |

Use whichever subscription you have active. The workflow, rules, and file paths are identical.

## Copy this folder elsewhere

`local-workflow/` is self-contained. Copy it to any machine or repo; it includes its own `CLAUDE.md`, `AGENTS.md`, and skills. Update `template.tex` after copying.

## Still use the web app?

Keep Resume Optimizer for history, GitHub upload, and one-click Overleaf links. Use this local workflow when you want **Opus-level quality without API cost** for your own applications.
