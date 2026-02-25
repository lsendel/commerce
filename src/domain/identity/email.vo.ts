import { ValidationError } from "@/shared/errors";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates and normalizes an email address.
 * Returns a lowercase, trimmed email string.
 * Throws ValidationError if the format is invalid.
 */
export function createEmail(raw: string): string {
  const normalized = raw.trim().toLowerCase();

  if (!normalized) {
    throw new ValidationError("Email is required");
  }

  if (!EMAIL_REGEX.test(normalized)) {
    throw new ValidationError(`Invalid email format: "${raw}"`);
  }

  return normalized;
}
