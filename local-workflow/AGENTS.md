# Resume Optimizer — local workflow (Codex)

This folder is a **subscription-friendly** alternative to the web app's API generation path. Use your **Codex subscription** (ChatGPT/Codex CLI) instead of per-token API billing.

## Before you start

1. Replace `template.tex` with **your** real resume (keep the same LaTeX structure).
2. Paste job descriptions into `jobs/<company-slug>.md`.
3. Run Codex from this directory: `cd local-workflow && codex`

## Quick commands

| Goal | What to say |
|------|-------------|
| Tailor for one job | `$tailor-resume` or "Tailor template.tex for jobs/acme-swe.md" |
| Use the skill | Mention `tailor-resume` or run `/skills` and pick it |
| Re-run | "Update output/acme-swe.tex from jobs/acme-swe.md" |

## File layout

```
local-workflow/
├── template.tex       # Your master resume (edit this)
├── prompt-rules.md    # Tailoring rules (mirrors app default prompt)
├── jobs/              # One .md file per job posting
├── output/            # Generated .tex files (gitignored)
└── scripts/           # Helper shell scripts
```

## Workflow

1. Read `template.tex` and `prompt-rules.md`.
2. Read the job file from `jobs/`.
3. Write tailored LaTeX to `output/<same-basename>.tex`.
4. Do **not** change LaTeX structure — only Summary, experience bullets, Projects, and Skills.
5. Output must be raw `.tex` only (no markdown fences).

## Model recommendation

Use your highest-quality Codex model for final resumes. Use a faster/cheaper model for a first draft, then ask for a polish pass on changed sections only.

## Skill

Skill name: `tailor-resume` — in `.agents/skills/tailor-resume/SKILL.md`.

If instructions seem truncated, raise `project_doc_max_bytes` in `~/.codex/config.toml` or keep this file short and rely on `prompt-rules.md`.
