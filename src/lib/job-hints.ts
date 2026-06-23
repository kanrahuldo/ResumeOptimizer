export function extractJobHints(jobDescription: string) {
  const lines = jobDescription
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const companyLine = lines.find((line) =>
    /company|employer|organization/i.test(line)
  );
  const titleLine = lines.find((line) =>
    /title|role|position/i.test(line)
  );
  const jobIdMatch = jobDescription.match(
    /\b(?:job|requisition|req|posting)\s*(?:id|#|number)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9_-]{2,})\b/i
  );

  return {
    company:
      companyLine?.replace(/^(company|employer|organization)\s*[:#-]?\s*/i, "") ||
      "",
    title:
      titleLine?.replace(/^(title|role|position)\s*[:#-]?\s*/i, "") || "",
    id: jobIdMatch?.[1] || "",
  };
}
