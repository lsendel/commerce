import { eq, and, desc } from "drizzle-orm";
import type { Database } from "../db/client";
import { taxZones, taxRates } from "../db/schema";
import type { TaxZone } from "../../domain/tax/tax-zone.entity";
import type { TaxRate, TaxType, TaxAppliesTo } from "../../domain/tax/tax-rate.entity";

export class TaxRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  // ─── Zone CRUD ─────────────────────────────────────────────

  async createZone(data: {
    name: string;
    countries?: string[];
    regions?: string[];
    postalCodes?: string[];
    priority?: number;
  }): Promise<TaxZone> {
    const rows = await this.db
      .insert(taxZones)
      .values({
        storeId: this.storeId,
        name: data.name,
        countries: data.countries ?? [],
        regions: data.regions ?? [],
        postalCodes: data.postalCodes ?? [],
        priority: data.priority ?? 0,
      })
      .returning();

    return this.toZoneDomain(rows[0]!);
  }

  async listZones(): Promise<TaxZone[]> {
    const rows = await this.db
      .select()
      .from(taxZones)
      .where(eq(taxZones.storeId, this.storeId))
      .orderBy(desc(taxZones.priority));

    return rows.map((r) => this.toZoneDomain(r));
  }

  async updateZone(
    id: string,
    data: {
      name?: string;
      countries?: string[];
      regions?: string[];
      postalCodes?: string[];
      priority?: number;
    },
  ): Promise<TaxZone | null> {
    const values: Record<string, unknown> = {};
    if (data.name !== undefined) values.name = data.name;
    if (data.countries !== undefined) values.countries = data.countries;
    if (data.regions !== undefined) values.regions = data.regions;
    if (data.postalCodes !== undefined) values.postalCodes = data.postalCodes;
    if (data.priority !== undefined) values.priority = data.priority;

    const rows = await this.db
      .update(taxZones)
      .set(values)
      .where(and(eq(taxZones.id, id), eq(taxZones.storeId, this.storeId)))
      .returning();

    const row = rows[0];
    return row ? this.toZoneDomain(row) : null;
  }

  async deleteZone(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(taxZones)
      .where(and(eq(taxZones.id, id), eq(taxZones.storeId, this.storeId)))
      .returning({ id: taxZones.id });

    return rows.length > 0;
  }

  // ─── Rate CRUD ─────────────────────────────────────────────

  async createRate(data: {
    zoneId: string;
    name: string;
    rate: number;
    type?: TaxType;
    appliesTo?: TaxAppliesTo;
    compound?: boolean;
  }): Promise<TaxRate> {
    const rows = await this.db
      .insert(taxRates)
      .values({
        taxZoneId: data.zoneId,
        name: data.name,
        rate: String(data.rate),
        type: data.type ?? "sales_tax",
        appliesTo: data.appliesTo ?? "all",
        compound: data.compound ?? false,
      })
      .returning();

    return this.toRateDomain(rows[0]!);
  }

  async updateRate(
    id: string,
    data: {
      name?: string;
      rate?: number;
      type?: TaxType;
      appliesTo?: TaxAppliesTo;
      compound?: boolean;
    },
  ): Promise<TaxRate | null> {
    const values: Record<string, unknown> = {};
    if (data.name !== undefined) values.name = data.name;
    if (data.rate !== undefined) values.rate = String(data.rate);
    if (data.type !== undefined) values.type = data.type;
    if (data.appliesTo !== undefined) values.appliesTo = data.appliesTo;
    if (data.compound !== undefined) values.compound = data.compound;

    const rows = await this.db
      .update(taxRates)
      .set(values)
      .where(eq(taxRates.id, id))
      .returning();

    const row = rows[0];
    return row ? this.toRateDomain(row) : null;
  }

  async listRatesByZone(zoneId: string): Promise<TaxRate[]> {
    const rows = await this.db
      .select()
      .from(taxRates)
      .where(eq(taxRates.taxZoneId, zoneId));

    return rows.map((r) => this.toRateDomain(r));
  }

  async deleteRate(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(taxRates)
      .where(eq(taxRates.id, id))
      .returning({ id: taxRates.id });

    return rows.length > 0;
  }

  // ─── Address Matching ──────────────────────────────────────

  async findZonesForAddress(
    country: string,
    state?: string,
    zip?: string,
  ): Promise<TaxZone[]> {
    const rows = await this.db
      .select()
      .from(taxZones)
      .where(eq(taxZones.storeId, this.storeId))
      .orderBy(desc(taxZones.priority));

    const countryUpper = country.toUpperCase();
    const stateUpper = state?.toUpperCase();
    const zipUpper = zip?.toUpperCase();

    return rows
      .filter((z) => {
        const countries = (z.countries as string[]) ?? [];
        const regions = (z.regions as string[]) ?? [];
        const postalCodes = (z.postalCodes as string[]) ?? [];

        // Must match country (or zone has no country restriction)
        if (countries.length > 0 && !countries.some((c) => (c as string).toUpperCase() === countryUpper)) {
          return false;
        }

        // If zone has regions, state must match one
        if (regions.length > 0) {
          if (!stateUpper) return false;
          if (!regions.some((r) => (r as string).toUpperCase() === stateUpper)) return false;
        }

        // If zone has postal codes, zip must match one
        if (postalCodes.length > 0) {
          if (!zipUpper) return false;
          if (!postalCodes.some((pc) => (pc as string).toUpperCase() === zipUpper)) return false;
        }

        return true;
      })
      .map((r) => this.toZoneDomain(r));
  }

  // ─── Mappers ───────────────────────────────────────────────

  private toZoneDomain(row: typeof taxZones.$inferSelect): TaxZone {
    return {
      id: row.id,
      storeId: row.storeId,
      name: row.name,
      countries: (row.countries as string[]) ?? [],
      regions: (row.regions as string[]) ?? [],
      postalCodes: (row.postalCodes as string[]) ?? [],
      priority: row.priority ?? 0,
      createdAt: row.createdAt ?? new Date(),
    };
  }

  private toRateDomain(row: typeof taxRates.$inferSelect): TaxRate {
    return {
      id: row.id,
      taxZoneId: row.taxZoneId,
      name: row.name,
      rate: Number(row.rate),
      type: row.type as TaxType,
      appliesTo: (row.appliesTo ?? "all") as TaxAppliesTo,
      compound: row.compound ?? false,
      createdAt: row.createdAt ?? new Date(),
    };
  }
}
