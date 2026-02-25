import { ValidationError } from "@/shared/errors";

/**
 * Validates a monetary amount.
 * - Must be non-negative
 * - Must have at most 2 decimal places
 *
 * Returns the validated amount.
 */
export function createMoney(amount: number): number {
  if (amount < 0) {
    throw new ValidationError("Monetary amount cannot be negative");
  }

  // Check for more than 2 decimal places
  const rounded = Math.round(amount * 100) / 100;
  if (Math.abs(amount - rounded) > Number.EPSILON) {
    throw new ValidationError(
      "Monetary amount cannot have more than 2 decimal places"
    );
  }

  return rounded;
}

/**
 * Formats a numeric dollar amount as "$X.XX".
 */
export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
