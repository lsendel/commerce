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
  fallbackRateId?: string;
  fallbackReason?: string;
}

interface CalculateShippingOptions {
  carrierFallbackRouting?: boolean;
}

export class CalculateShippingUseCase {
  constructor(
    private shippingRepo: ShippingRepository,
    private carrierAdapter?: CarrierAdapter,
    private options: CalculateShippingOptions = {},
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
    const carrierRates: typeof rates = [];

    for (const rate of rates) {
      const rateType = rate.type;

      if (rateType === "carrier_calculated") {
        carrierRates.push(rate);
        continue;
      }

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
    }

    for (const rate of carrierRates) {
      if (this.carrierAdapter) {
        // Carrier adapter integration remains provider-specific. Until wired,
        // preserve the existing contract with null-price carrier options.
        options.push({
          rateId: rate.id,
          name: rate.name,
          price: null,
          estimatedDaysMin: rate.estimatedDaysMin,
          estimatedDaysMax: rate.estimatedDaysMax,
          type: "carrier_calculated",
        });
        continue;
      }

      const fallbackCandidate = this.pickCarrierFallbackOption(options);
      const fallbackEnabled = this.options.carrierFallbackRouting ?? false;
      if (fallbackEnabled && fallbackCandidate) {
        options.push({
          rateId: rate.id,
          name: `${rate.name} (fallback)`,
          price: fallbackCandidate.price,
          estimatedDaysMin:
            fallbackCandidate.estimatedDaysMin ?? rate.estimatedDaysMin,
          estimatedDaysMax:
            fallbackCandidate.estimatedDaysMax ?? rate.estimatedDaysMax,
          type: "carrier_fallback",
          fallbackRateId: fallbackCandidate.rateId,
          fallbackReason: "carrier_unavailable",
        });
      } else {
        options.push({
          rateId: rate.id,
          name: rate.name,
          price: null,
          estimatedDaysMin: rate.estimatedDaysMin,
          estimatedDaysMax: rate.estimatedDaysMax,
          type: "carrier_calculated",
        });
      }
    }

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      options,
    };
  }

  private pickCarrierFallbackOption(
    options: ShippingOption[],
  ): ShippingOption | null {
    const eligible = options
      .filter((option) =>
        option.price !== null
        && option.type !== "carrier_calculated"
        && option.type !== "carrier_fallback")
      .sort((a, b) => (a.price ?? 0) - (b.price ?? 0));

    if (eligible.length === 0) {
      return null;
    }

    return eligible[0] ?? null;
  }
}
