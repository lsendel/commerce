export interface Venue {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string | null;
  country: string;
  postalCode: string;
  latitude: string | null;
  longitude: string | null;
  amenities: string[];
  photos: string[];
  capacity: number | null;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function createVenue(
  params: Omit<Venue, "createdAt" | "updatedAt" | "isActive"> & {
    isActive?: boolean;
  },
): Venue {
  const now = new Date();
  return {
    ...params,
    isActive: params.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}
