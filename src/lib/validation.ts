export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateLatexOutput(content: string): ValidationResult {
  const errors: string[] = [];

  if (!content || content.trim().length < 200) {
    errors.push("Output is too short or empty.");
  }

  return { valid: errors.length === 0, errors };
}
