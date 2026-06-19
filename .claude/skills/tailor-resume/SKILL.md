---
name: tailor-resume
description: Tailor the LaTeX resume in local-workflow/template.tex to a job file under local-workflow/jobs/. Use for resume tailoring, job descriptions, or Overleaf output.
argument-hint: [job-slug-without-.md]
---

# Tailor resume to job description

Workflow files live in `local-workflow/`. Run from the repository root.

## Inputs

- **Template:** `local-workflow/template.tex`
- **Rules:** `local-workflow/prompt-rules.md`
- **Job file:** `local-workflow/jobs/<slug>.md`

Use `$ARGUMENTS` as the job slug when provided (strip `.md` if present). Otherwise use the job file the user named.

## Steps

1. Read the template, rules, and job file from `local-workflow/`.
2. Apply all rules in `prompt-rules.md`. Change only Summary, Professional Experience bullets, Projects, and Technical Skills.
3. Preserve LaTeX structure, macros, Education block, header, company names, titles, dates, and experience order.
4. Write the full document to `local-workflow/output/<slug>.tex`.
5. Verify: starts with `\documentclass`, ends with `\end{document}`, no markdown fences, `%` escaped as `\%`.
6. Report the output path to the user.

For a self-contained copy-paste workflow, `cd local-workflow` and use the skill there instead.
