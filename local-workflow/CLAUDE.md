# Resume Optimizer — local workflow (Claude Code)

This folder is a **subscription-friendly** alternative to the web app's API generation path. Use your Claude Max / Claude Code subscription instead of paying per-token API fees for Opus-class models.

## Before you start

1. Replace `template.tex` with **your** real resume (keep the same LaTeX structure).
2. Paste job descriptions into `jobs/<company-slug>.md`.
3. Run Claude Code from this directory: `cd local-workflow && claude`

## Quick commands

| Goal | What to say |
|------|-------------|
| Tailor for one job | `/tailor-resume acme-swe` or "Tailor my resume for jobs/acme-swe.md" |
| Re-run after edits | "Regenerate output/acme-swe.tex using the same job file" |
| Compare quality | Try Opus for final pass; Sonnet for a cheaper first draft |

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
4. Do **not** change LaTeX structure — only Summary, experience bullets, Projects, and Skills (see `prompt-rules.md`).
5. Output must be raw `.tex` only (no markdown fences).

## Model recommendation

- **Best quality:** Opus 4.8 (matches what worked well in the app)
- **Cheaper draft:** Sonnet 4.6, then ask Opus to polish only changed sections

## Skill

Use `/tailor-resume [job-slug]` — defined in `.claude/skills/tailor-resume/SKILL.md`.
