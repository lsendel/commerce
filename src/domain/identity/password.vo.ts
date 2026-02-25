import { ValidationError } from "@/shared/errors";

/**
 * Validates password strength requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one number
 *
 * Throws ValidationError if any requirement is not met.
 */
export function validatePasswordStrength(password: string): void {
  if (password.length < 8) {
    throw new ValidationError(
      "Password must be at least 8 characters long"
    );
  }

  if (!/[A-Z]/.test(password)) {
    throw new ValidationError(
      "Password must contain at least one uppercase letter"
    );
  }

  if (!/[0-9]/.test(password)) {
    throw new ValidationError(
      "Password must contain at least one number"
    );
  }
}
