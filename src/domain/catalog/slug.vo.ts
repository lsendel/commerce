/**
 * Converts a name into a URL-safe slug.
 * - Lowercases the string
 * - Replaces spaces and special characters with hyphens
 * - Removes consecutive hyphens
 * - Trims leading/trailing hyphens
 */
export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}
