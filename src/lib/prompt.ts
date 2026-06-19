type PromptInput = {
  jobDescription: string;
  template: string;
  promptProfile: string;
};

function usesPromptPlaceholders(promptProfile: string) {
  return (
    promptProfile.includes("{{JOB_DESCRIPTION}}") ||
    promptProfile.includes("{{TEMPLATE}}")
  );
}

function buildStaticPrefix(template: string, promptProfile: string) {
  return [
    "Resume tailoring instructions:\n\n",
    promptProfile,
    "\n\nCandidate's LaTeX resume template (structure must remain unchanged):\n\n",
    template,
  ].join("");
}

function buildDynamicSuffix(jobDescription: string) {
  return [
    "Job posting description (tailor the resume content to match this):\n\n",
    jobDescription,
  ].join("");
}

export type PromptParts = {
  cachedPrefix: string;
  dynamicSuffix: string;
};

export function buildPromptParts(input: PromptInput): PromptParts | null {
  if (usesPromptPlaceholders(input.promptProfile)) {
    return null;
  }

  return {
    cachedPrefix: buildStaticPrefix(input.template, input.promptProfile),
    dynamicSuffix: buildDynamicSuffix(input.jobDescription),
  };
}

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
    buildStaticPrefix(template, promptProfile),
    "\n\n",
    buildDynamicSuffix(jobDescription),
  ].join("");
}
