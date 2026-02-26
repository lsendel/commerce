import type { Database } from "../../infrastructure/db/client";
import { TaxRepository } from "../../infrastructure/repositories/tax.repository";
import type { TaxZone } from "../../domain/tax/tax-zone.entity";
import type { TaxRate, TaxType, TaxAppliesTo } from "../../domain/tax/tax-rate.entity";
import { NotFoundError, ValidationError } from "../../shared/errors";

// ─── Zone Management ────────────────────────────────────────

interface CreateZoneInput {
  db: Database;
  storeId: string;
  name: string;
  countries?: string[];
  regions?: string[];
  postalCodes?: string[];
  priority?: number;
}

interface UpdateZoneInput {
  db: Database;
  storeId: string;
  zoneId: string;
  name?: string;
  countries?: string[];
  regions?: string[];
  postalCodes?: string[];
  priority?: number;
}

interface DeleteZoneInput {
  db: Database;
  storeId: string;
  zoneId: string;
}

interface ListZonesInput {
  db: Database;
  storeId: string;
}

// ─── Rate Management ────────────────────────────────────────

interface CreateRateInput {
  db: Database;
  storeId: string;
  zoneId: string;
  name: string;
  rate: number;
  type?: TaxType;
  appliesTo?: TaxAppliesTo;
  compound?: boolean;
}

interface ListRatesInput {
  db: Database;
  storeId: string;
  zoneId: string;
}

interface DeleteRateInput {
  db: Database;
  storeId: string;
  rateId: string;
}

export class ManageTaxZonesUseCase {
  // ─── Zone CRUD ──────────────────────────────────────────

  async createZone(input: CreateZoneInput): Promise<TaxZone> {
    if (!input.name.trim()) {
      throw new ValidationError("Zone name is required");
    }

    const repo = new TaxRepository(input.db, input.storeId);
    return repo.createZone({
      name: input.name.trim(),
      countries: input.countries ?? [],
      regions: input.regions ?? [],
      postalCodes: input.postalCodes ?? [],
      priority: input.priority ?? 0,
    });
  }

  async listZones(input: ListZonesInput): Promise<TaxZone[]> {
    const repo = new TaxRepository(input.db, input.storeId);
    return repo.listZones();
  }

  async updateZone(input: UpdateZoneInput): Promise<TaxZone> {
    const repo = new TaxRepository(input.db, input.storeId);

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.countries !== undefined) updateData.countries = input.countries;
    if (input.regions !== undefined) updateData.regions = input.regions;
    if (input.postalCodes !== undefined) updateData.postalCodes = input.postalCodes;
    if (input.priority !== undefined) updateData.priority = input.priority;

    const zone = await repo.updateZone(input.zoneId, updateData);
    if (!zone) {
      throw new NotFoundError("TaxZone", input.zoneId);
    }
    return zone;
  }

  async deleteZone(input: DeleteZoneInput): Promise<void> {
    const repo = new TaxRepository(input.db, input.storeId);
    const deleted = await repo.deleteZone(input.zoneId);
    if (!deleted) {
      throw new NotFoundError("TaxZone", input.zoneId);
    }
  }

  // ─── Rate CRUD ──────────────────────────────────────────

  async createRate(input: CreateRateInput): Promise<TaxRate> {
    if (!input.name.trim()) {
      throw new ValidationError("Rate name is required");
    }
    if (input.rate < 0) {
      throw new ValidationError("Rate must be non-negative");
    }

    const repo = new TaxRepository(input.db, input.storeId);
    return repo.createRate({
      zoneId: input.zoneId,
      name: input.name.trim(),
      rate: input.rate,
      type: input.type ?? "sales_tax",
      appliesTo: input.appliesTo ?? "all",
      compound: input.compound ?? false,
    });
  }

  async listRates(input: ListRatesInput): Promise<TaxRate[]> {
    const repo = new TaxRepository(input.db, input.storeId);
    return repo.listRatesByZone(input.zoneId);
  }

  async deleteRate(input: DeleteRateInput): Promise<void> {
    const repo = new TaxRepository(input.db, input.storeId);
    const deleted = await repo.deleteRate(input.rateId);
    if (!deleted) {
      throw new NotFoundError("TaxRate", input.rateId);
    }
  }
}
