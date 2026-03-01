import { eq, and, desc, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { venues } from "../db/schema";

export class VenueRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async create(data: {
    name: string;
    slug: string;
    address: string;
    city: string;
    state?: string;
    country: string;
    postalCode: string;
    latitude?: string;
    longitude?: string;
    amenities?: string[];
    photos?: string[];
    capacity?: number;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
  }) {
    const [venue] = await this.db
      .insert(venues)
      .values({ ...data, storeId: this.storeId })
      .returning();
    return venue;
  }

  async findById(id: string) {
    const [venue] = await this.db
      .select()
      .from(venues)
      .where(and(eq(venues.id, id), eq(venues.storeId, this.storeId)))
      .limit(1);
    return venue ?? null;
  }

  async findBySlug(slug: string) {
    const [venue] = await this.db
      .select()
      .from(venues)
      .where(and(eq(venues.slug, slug), eq(venues.storeId, this.storeId)))
      .limit(1);
    return venue ?? null;
  }

  async findAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    return this.db
      .select()
      .from(venues)
      .where(and(eq(venues.storeId, this.storeId), eq(venues.isActive, true)))
      .orderBy(desc(venues.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      address: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
      latitude: string;
      longitude: string;
      amenities: string[];
      photos: string[];
      capacity: number;
      description: string;
      contactEmail: string;
      contactPhone: string;
      isActive: boolean;
    }>,
  ) {
    const [venue] = await this.db
      .update(venues)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(venues.id, id), eq(venues.storeId, this.storeId)))
      .returning();
    return venue;
  }

  async delete(id: string) {
    await this.db
      .delete(venues)
      .where(and(eq(venues.id, id), eq(venues.storeId, this.storeId)));
  }

  /**
   * Geosearch using PostGIS ST_DWithin.
   * Requires PostGIS extension and geography column on venues table.
   * Falls back to Haversine approximation if PostGIS isn't available.
   */
  async findNearby(lat: number, lng: number, radiusKm: number, limit = 20) {
    const radiusMeters = radiusKm * 1000;
    try {
      const rows = await this.db.execute(sql`
        SELECT *,
          ST_Distance(
            location,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
          ) AS distance_meters
        FROM venues
        WHERE store_id = ${this.storeId}
          AND is_active = true
          AND ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
            ${radiusMeters}
          )
        ORDER BY distance_meters ASC
        LIMIT ${limit}
      `);
      return rows.rows;
    } catch (error: any) {
      // Fallback when PostGIS or location column is unavailable in a target environment.
      if (error?.code !== "42703" && error?.code !== "42883" && error?.code !== "42P01") {
        throw error;
      }

      const rows = await this.db.execute(sql`
        SELECT *,
          (
            6371000 * acos(
              cos(radians(${lat}::double precision))
              * cos(radians(latitude::double precision))
              * cos(radians(longitude::double precision) - radians(${lng}::double precision))
              + sin(radians(${lat}::double precision))
              * sin(radians(latitude::double precision))
            )
          ) AS distance_meters
        FROM venues
        WHERE store_id = ${this.storeId}
          AND is_active = true
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
          AND (
            6371000 * acos(
              cos(radians(${lat}::double precision))
              * cos(radians(latitude::double precision))
              * cos(radians(longitude::double precision) - radians(${lng}::double precision))
              + sin(radians(${lat}::double precision))
              * sin(radians(latitude::double precision))
            )
          ) <= ${radiusMeters}
        ORDER BY distance_meters ASC
        LIMIT ${limit}
      `);
      return rows.rows;
    }
  }
}
