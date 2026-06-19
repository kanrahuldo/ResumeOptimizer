# Resume tailoring rules

Use these rules when tailoring `template.tex` to a job description. Match roughly **85%** of the job description without making the result feel obviously AI-generated.

## Scope — what may change

- **May change:** Summary, Professional Experience bullets, Projects, Technical Skills
- **Must not change:** LaTeX structure, macros, section order, Education block, header/contact block, company names, job titles, locations, dates, experience order

## Summary

- Brief, unique, human, attractive; align ~85% with the job description
- At least **50 words**

## Professional Experience bullets

- Start with an action verb → task/action → quantifiable result
- Example: "Resolved 50+ customer complaints weekly, improving customer satisfaction by 20%."
- Each bullet: **35–40 words** (strict)
- Numbers as digits: `20%`, `100+`, `3 years` (not words)
- Tech stacks in bullets: bold with `\textbf{}`
- Company names, titles, locations, dates stay the same — bullets only
- Do not reorder experiences
- Bullet counts per company:
  - Company 1 → 7 bullets
  - Company 2 → 8 bullets
  - Company 3 → 5 bullets
  - Company 4 → 7 bullets
  - Company 5 → 8 bullets

## Projects

- Project name bold: `\textbf{Project Name}`
- No bold text after `|` in project titles
- Three projects relevant to the job description
- One bullet per project; each bullet **35–40 words**
- At least one project should be AI-related
- Bullets must be realistic and believable

## Technical Skills

- Only category titles are bold, not individual skills
- At most **6** categories
- Each category: at least **8** skills
- Reorder/add skills to match the job description

## LaTeX output rules

- Return the **full** `.tex` document from `\documentclass` through `\end{document}`
- Do **not** wrap output in ` ```latex ` fences
- Escape `%` in bullet text as `\%`
- Keep the Education section exactly as in the template (marked "DON'T TOUCH")
