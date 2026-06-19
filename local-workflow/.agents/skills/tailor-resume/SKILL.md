---
name: tailor-resume
description: Tailor the LaTeX resume in template.tex to a job description file under jobs/. Use when the user wants a tailored resume, mentions job descriptions, or resume optimization.
---

# Tailor resume to job description

Tailor `template.tex` for a specific job using the rules in `prompt-rules.md`.

## Inputs

- **Template:** `template.tex` (in this directory)
- **Rules:** `prompt-rules.md`
- **Job file:** `jobs/<slug>.md` — use the slug from the user's message or the filename they provide (strip `.md` if present).

## Steps

1. Read `template.tex`, `prompt-rules.md`, and the target job file.
2. Apply all rules in `prompt-rules.md`. Change only Summary, Professional Experience bullets, Projects, and Technical Skills.
3. Preserve LaTeX structure, macros, Education block, header, company names, titles, dates, and experience order.
4. Write the full document to `output/<slug>.tex` (create `output/` if needed).
5. Verify:
   - File starts with `\documentclass` and ends with `\end{document}`
   - No markdown code fences
   - `%` escaped as `\%` in bullet text
6. Tell the user the output path and suggest opening it in Overleaf or compiling locally.

## Quality bar

- Bullets: 35–40 words each, action-verb led, quantified results
- Summary: at least 50 words, ~85% JD alignment
- Skills: reorder/add to match JD; max 6 categories, 8+ skills each
- Tone: human and believable, not obviously AI-generated

## If the user asks to regenerate

Overwrite the same `output/<slug>.tex` unless they ask for a new filename.
