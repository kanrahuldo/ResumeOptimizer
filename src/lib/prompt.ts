type PromptInput = {
  jobDescription: string;
  template: string;
  promptProfile: string;
};

export function buildPrompt({
  jobDescription,
  template,
  promptProfile,
}: PromptInput) {
  const replaced = promptProfile
    .replaceAll("{{JOB_DESCRIPTION}}", jobDescription)
    .replaceAll("{{TEMPLATE}}", template);

  if (replaced !== promptProfile) {
    return replaced;
  }

  return [
    "Job posting Description:\n\n",
    jobDescription,
    "\n\nCandidate's latex resume template:\n\n",
    template,
    "\n\n",
    promptProfile,
  ].join("");
}
