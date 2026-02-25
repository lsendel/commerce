export interface ArtTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  stylePrompt: string;
  previewImageUrl: string;
  category: string;
  isActive: boolean;
}

export function createArtTemplate(
  params: Omit<ArtTemplate, "isActive"> & { isActive?: boolean }
): ArtTemplate {
  return {
    ...params,
    isActive: params.isActive ?? true,
  };
}
