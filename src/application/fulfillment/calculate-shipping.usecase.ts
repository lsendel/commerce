import type { ShippingRepository } from "../../infrastructure/repositories/shipping.repository";
import type { CarrierAdapter } from "../../infrastructure/carriers/carrier-adapter.interface";
import { NotFoundError } from "../../shared/errors";

export interface CartItemForShipping {
  variantId: string;
  quantity: number;
  price: number;
  weight: number | null;
  weightUnit: string | null;
}

export interface ShippingAddress {
  country: string;
  state?: string;
  postalCode?: string;
}

export interface ShippingOption {
  rateId: string;
  name: string;
  price: number | null;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  type: string;
}

export class CalculateShippingUseCase {
  constructor(
    private shippingRepo: ShippingRepository,
    private carrierAdapter?: CarrierAdapter,
  ) {}

  async execute(params: {
    items: CartItemForShipping[];
    address: ShippingAddress;
    subtotal: number;
  }): Promise<{ zoneId: string; zoneName: string; options: ShippingOption[] }> {
    const { items, address, subtotal } = params;

    // 1. Find matching zone
    const zone = await this.shippingRepo.findZoneForAddress(
      address.country,
      address.state,
      address.postalCode,
    );

    if (!zone) {
      throw new NotFoundError("ShippingZone");
    }

    // 2. Get active rates for the zone
    const allRates = await this.shippingRepo.listRatesByZone(zone.id);
    const rates = allRates;

    // 3. Calculate total weight (convert everything to oz)
    const totalWeightOz = items.reduce((sum, item) => {
      if (!item.weight) return sum;
      const w = Number(item.weight);
      const unit = (item.weightUnit ?? "oz").toLowerCase();
      let weightOz: number;
      switch (unit) {
        case "lb":
        case "lbs":
          weightOz = w * 16;
          break;
        case "g":
          weightOz = w * 0.035274;
          break;
        case "kg":
          weightOz = w * 35.274;
          break;
        default: // oz
          weightOz = w;
      }
      return sum + weightOz * item.quantity;
    }, 0);

    // 4. Filter & compute each rate
    const options: ShippingOption[] = [];

    for (const rate of rates) {
      const rateType = rate.type;

      if (rateType === "flat") {
        options.push({
          rateId: rate.id,
          name: rate.name,
          price: rate.price ? Number(rate.price) : 0,
          estimatedDaysMin: rate.estimatedDaysMin,
          estimatedDaysMax: rate.estimatedDaysMax,
          type: "flat",
        });
        continue;
      }

      if (rateType === "weight_based") {
        const min = rate.minWeight ? Number(rate.minWeight) : 0;
        const max = rate.maxWeight ? Number(rate.maxWeight) : Infinity;
        if (totalWeightOz >= min && totalWeightOz <= max) {
          options.push({
            rateId: rate.id,
            name: rate.name,
            price: rate.price ? Number(rate.price) : 0,
            estimatedDaysMin: rate.estimatedDaysMin,
            estimatedDaysMax: rate.estimatedDaysMax,
            type: "weight_based",
          });
        }
        continue;
      }

      if (rateType === "price_based") {
        const min = rate.minOrderTotal ? Number(rate.minOrderTotal) : 0;
        const max = rate.maxOrderTotal ? Number(rate.maxOrderTotal) : Infinity;
        if (subtotal >= min && subtotal <= max) {
          options.push({
            rateId: rate.id,
            name: rate.name,
            price: rate.price ? Number(rate.price) : 0,
            estimatedDaysMin: rate.estimatedDaysMin,
            estimatedDaysMax: rate.estimatedDaysMax,
            type: "price_based",
          });
        }
        continue;
      }

      if (rateType === "carrier_calculated") {
        // Delegate to carrier adapter if available; otherwise skip
        if (!this.carrierAdapter) {
          // Return null price to indicate carrier rates are not available
          options.push({
            rateId: rate.id,
            name: rate.name,
            price: null,
            estimatedDaysMin: rate.estimatedDaysMin,
            estimatedDaysMax: rate.estimatedDaysMax,
            type: "carrier_calculated",
          });
        }
        // If carrier adapter is available, we would call it here.
        // For now, carrier_calculated rates with no adapter return null price.
        continue;
      }
    }

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      options,
    };
  }
}
