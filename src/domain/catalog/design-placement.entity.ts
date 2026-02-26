export const PLACEMENT_AREAS = [
  "front",
  "back",
  "all_over",
  "left_chest",
  "right_chest",
  "left_sleeve",
  "right_sleeve",
  "collar",
  "pocket",
] as const;

export type PlacementArea = (typeof PLACEMENT_AREAS)[number];

export interface DesignPlacement {
  id: string;
  productId: string;
  area: PlacementArea;
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  printAreaId: string | null;
  providerMeta: Record<string, unknown> | null;
  createdAt: Date;
}
