import { PromotionRepository } from "../../infrastructure/repositories/promotion.repository";
import { ValidationError } from "../../shared/errors";

export class ManageCustomerSegmentsUseCase {
  constructor(private repo: PromotionRepository) {}

  async createSegment(data: {
    name: string;
    description?: string;
    rules: Record<string, unknown>;
  }) {
    if (!data.name) throw new ValidationError("Segment name is required");
    return this.repo.createSegment(data);
  }

  async listSegments() {
    return this.repo.listSegments();
  }

  async updateSegment(id: string, data: {
    name?: string;
    description?: string | null;
    rules?: Record<string, unknown>;
  }) {
    return this.repo.updateSegment(id, data);
  }
}
