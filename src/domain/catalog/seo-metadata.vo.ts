import { createSlug } from "./slug.vo";

export interface SEOMetadata {
  title?: string;
  description?: string;
  slug: string;
}

export function generateDefaults(name: string, description?: string): SEOMetadata {
  const slug = createSlug(name);
  const title = name.length > 60 ? name.slice(0, 57) + "..." : name;
  const desc = description
    ? description.length > 160
      ? description.slice(0, 157) + "..."
      : description
    : undefined;

  return { title, description: desc, slug };
}
