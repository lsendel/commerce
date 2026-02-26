import type { ShippingRepository } from "../../infrastructure/repositories/shipping.repository";
import { NotFoundError, ValidationError } from "../../shared/errors";
import type { ShippingRateType } from "../../domain/fulfillment/shipping-rate.entity";

export class ManageShippingZonesUseCase {
  constructor(private repo: ShippingRepository) {}

  // ─── Zones ─────────────────────────────────────────────────────────────

  async listZones() {
    return this.repo.listZones();
  }

  async getZone(zoneId: string) {
    const zone = await this.repo.findZoneById(zoneId);
    if (!zone) throw new NotFoundError("ShippingZone", zoneId);
    return zone;
  }

  async createZone(data: {
    name: string;
    countries?: string[];
    regions?: string[];
    postalCodes?: string[];
    isRestOfWorld?: boolean;
    isActive?: boolean;
    position?: number;
  }) {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError("Zone name is required");
    }
    return this.repo.createZone(data);
  }

  async updateZone(
    zoneId: string,
    data: {
      name?: string;
      countries?: string[];
      regions?: string[];
      postalCodes?: string[];
      isRestOfWorld?: boolean;
      isActive?: boolean;
      position?: number;
    },
  ) {
    const zone = await this.repo.findZoneById(zoneId);
    if (!zone) throw new NotFoundError("ShippingZone", zoneId);
    return this.repo.updateZone(zoneId, data);
  }

  async deleteZone(zoneId: string) {
    const zone = await this.repo.findZoneById(zoneId);
    if (!zone) throw new NotFoundError("ShippingZone", zoneId);
    return this.repo.deleteZone(zoneId);
  }

  // ─── Rates ─────────────────────────────────────────────────────────────

  async listRates(zoneId: string) {
    const zone = await this.repo.findZoneById(zoneId);
    if (!zone) throw new NotFoundError("ShippingZone", zoneId);
    return this.repo.listRatesByZone(zoneId);
  }

  async createRate(data: {
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
    carrierAccountId?: string;
    isActive?: boolean;
    position?: number;
  }) {
    // Verify zone exists
    const zone = await this.repo.findZoneById(data.zoneId);
    if (!zone) throw new NotFoundError("ShippingZone", data.zoneId);

    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError("Rate name is required");
    }

    return this.repo.createRate(data);
  }

  async updateRate(
    rateId: string,
    data: {
      name?: string;
      type?: ShippingRateType;
      price?: string;
      minWeight?: string;
      maxWeight?: string;
      minOrderTotal?: string;
      maxOrderTotal?: string;
      estimatedDaysMin?: number;
      estimatedDaysMax?: number;
      carrierAccountId?: string;
      isActive?: boolean;
      position?: number;
    },
  ) {
    const rate = await this.repo.findRateById(rateId);
    if (!rate) throw new NotFoundError("ShippingRate", rateId);
    return this.repo.updateRate(rateId, data);
  }

  async deleteRate(rateId: string) {
    const rate = await this.repo.findRateById(rateId);
    if (!rate) throw new NotFoundError("ShippingRate", rateId);
    return this.repo.deleteRate(rateId);
  }
}
