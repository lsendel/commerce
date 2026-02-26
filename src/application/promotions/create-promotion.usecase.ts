import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import { ValidationError } from "../../shared/errors";

export class CreatePromotionUseCase {
  constructor(private repo: PromotionRepository) {}

  async execute(data: {
    name: string;
    description?: string;
    type: "coupon" | "automatic" | "flash_sale";
    strategyType: string;
    strategyParams: Record<string, unknown>;
    conditions: Record<string, unknown>;
    priority?: number;
    stackable?: boolean;
    startsAt?: string;
    endsAt?: string;
    usageLimit?: number;
  }) {
    if (!data.name) throw new ValidationError("Promotion name is required");

    return this.repo.create({
      ...data,
      startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
      endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
    });
  }
}
