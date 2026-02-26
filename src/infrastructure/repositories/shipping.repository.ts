import { eq, and } from "drizzle-orm";
import type { Database } from "../db/client";
import { shippingZones, shippingRates } from "../db/schema";
import type { ShippingRateType } from "../../domain/fulfillment/shipping-rate.entity";

// ─── Zone types ──────────────────────────────────────────────────────────────

interface CreateZoneData {
  name: string;
  countries?: string[];
  regions?: string[];
  postalCodeRanges?: string[];
  isRestOfWorld?: boolean;
}

interface UpdateZoneData {
  name?: string;
  countries?: string[];
  regions?: string[];
  postalCodeRanges?: string[];
  isRestOfWorld?: boolean;
}

// ─── Rate types ──────────────────────────────────────────────────────────────

interface CreateRateData {
  zoneId: string;
  name: string;
  type: ShippingRateType;
  price?: string;
  minWeight?: string;
  maxWeight?: string;
  minOrderTotal?: string;
  maxOrderTotal?: string;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  carrierProvider?: string;
}

interface UpdateRateData {
  name?: string;
  type?: ShippingRateType;
  price?: string;
  minWeight?: string;
  maxWeight?: string;
  minOrderTotal?: string;
  maxOrderTotal?: string;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  carrierProvider?: string;
}

// ─── Repository ──────────────────────────────────────────────────────────────

export class ShippingRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  // ─── Zone CRUD ───────────────────────────────────────────────────────────

  async createZone(data: CreateZoneData) {
    const rows = await this.db
      .insert(shippingZones)
      .values({
        storeId: this.storeId,
        name: data.name,
        countries: data.countries ?? [],
        regions: data.regions ?? [],
        postalCodeRanges: data.postalCodeRanges ?? [],
        isRestOfWorld: data.isRestOfWorld ?? false,
      })
      .returning();
    return rows[0] ?? null;
  }

  async listZones() {
    return this.db
      .select()
      .from(shippingZones)
      .where(eq(shippingZones.storeId, this.storeId))
      .orderBy(shippingZones.createdAt);
  }

  async findZoneById(id: string) {
    const rows = await this.db
      .select()
      .from(shippingZones)
      .where(
        and(
          eq(shippingZones.id, id),
          eq(shippingZones.storeId, this.storeId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async updateZone(id: string, data: UpdateZoneData) {
    const values: Record<string, unknown> = {};
    if (data.name !== undefined) values.name = data.name;
    if (data.countries !== undefined) values.countries = data.countries;
    if (data.regions !== undefined) values.regions = data.regions;
    if (data.postalCodeRanges !== undefined) values.postalCodeRanges = data.postalCodeRanges;
    if (data.isRestOfWorld !== undefined) values.isRestOfWorld = data.isRestOfWorld;

    const rows = await this.db
      .update(shippingZones)
      .set(values)
      .where(
        and(
          eq(shippingZones.id, id),
          eq(shippingZones.storeId, this.storeId),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async deleteZone(id: string) {
    const rows = await this.db
      .delete(shippingZones)
      .where(
        and(
          eq(shippingZones.id, id),
          eq(shippingZones.storeId, this.storeId),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  // ─── Rate CRUD ───────────────────────────────────────────────────────────

  async createRate(data: CreateRateData) {
    const rows = await this.db
      .insert(shippingRates)
      .values({
        zoneId: data.zoneId,
        name: data.name,
        type: data.type,
        price: data.price,
        minWeight: data.minWeight,
        maxWeight: data.maxWeight,
        minOrderTotal: data.minOrderTotal,
        maxOrderTotal: data.maxOrderTotal,
        estimatedDaysMin: data.estimatedDaysMin,
        estimatedDaysMax: data.estimatedDaysMax,
        carrierProvider: data.carrierProvider,
      })
      .returning();
    return rows[0] ?? null;
  }

  async listRatesByZone(zoneId: string) {
    return this.db
      .select()
      .from(shippingRates)
      .where(eq(shippingRates.zoneId, zoneId))
      .orderBy(shippingRates.createdAt);
  }

  async findRateById(id: string) {
    const rows = await this.db
      .select()
      .from(shippingRates)
      .where(eq(shippingRates.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateRate(id: string, data: UpdateRateData) {
    const values: Record<string, unknown> = {};
    if (data.name !== undefined) values.name = data.name;
    if (data.type !== undefined) values.type = data.type;
    if (data.price !== undefined) values.price = data.price;
    if (data.minWeight !== undefined) values.minWeight = data.minWeight;
    if (data.maxWeight !== undefined) values.maxWeight = data.maxWeight;
    if (data.minOrderTotal !== undefined) values.minOrderTotal = data.minOrderTotal;
    if (data.maxOrderTotal !== undefined) values.maxOrderTotal = data.maxOrderTotal;
    if (data.estimatedDaysMin !== undefined) values.estimatedDaysMin = data.estimatedDaysMin;
    if (data.estimatedDaysMax !== undefined) values.estimatedDaysMax = data.estimatedDaysMax;
    if (data.carrierProvider !== undefined) values.carrierProvider = data.carrierProvider;

    const rows = await this.db
      .update(shippingRates)
      .set(values)
      .where(eq(shippingRates.id, id))
      .returning();
    return rows[0] ?? null;
  }

  async deleteRate(id: string) {
    const rows = await this.db
      .delete(shippingRates)
      .where(eq(shippingRates.id, id))
      .returning();
    return rows[0] ?? null;
  }

  // ─── Zone matching ─────────────────────────────────────────────────────

  /**
   * Find the best-matching shipping zone for a given address.
   * Priority: postal code match > region match > country match > rest-of-world.
   */
  async findZoneForAddress(
    country: string,
    region?: string,
    postalCode?: string,
  ) {
    const zones = await this.db
      .select()
      .from(shippingZones)
      .where(eq(shippingZones.storeId, this.storeId))
      .orderBy(shippingZones.createdAt);

    const countryUpper = country.toUpperCase();
    const regionUpper = region?.toUpperCase();
    const postalUpper = postalCode?.toUpperCase();

    let postalMatch: (typeof zones)[number] | null = null;
    let regionMatch: (typeof zones)[number] | null = null;
    let countryMatch: (typeof zones)[number] | null = null;
    let restOfWorldMatch: (typeof zones)[number] | null = null;

    for (const zone of zones) {
      const countries = (zone.countries as string[]) ?? [];
      const regions = (zone.regions as string[]) ?? [];
      const postalRanges = (zone.postalCodeRanges as string[]) ?? [];

      // Check postal code match (most specific)
      if (
        postalUpper &&
        postalRanges.length > 0 &&
        postalRanges.some((pc) => (pc as string).toUpperCase() === postalUpper) &&
        !postalMatch
      ) {
        postalMatch = zone;
        continue;
      }

      // Check region match
      if (
        regionUpper &&
        regions.length > 0 &&
        regions.some((r) => (r as string).toUpperCase() === regionUpper) &&
        !regionMatch
      ) {
        regionMatch = zone;
        continue;
      }

      // Check country match
      if (
        countries.length > 0 &&
        countries.some((c) => (c as string).toUpperCase() === countryUpper) &&
        !countryMatch
      ) {
        countryMatch = zone;
        continue;
      }

      // Rest of world fallback
      if (zone.isRestOfWorld && !restOfWorldMatch) {
        restOfWorldMatch = zone;
      }
    }

    // Return best match by priority
    return postalMatch ?? regionMatch ?? countryMatch ?? restOfWorldMatch ?? null;
  }
}
