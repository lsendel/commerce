import type { DownloadRepository } from "../../infrastructure/repositories/download.repository";
import { ValidationError } from "../../shared/errors";

interface GenerateTokenInput {
  userId: string;
  orderId: string;
  orderItemId?: string;
}

interface GenerateTokenResult {
  token: string;
  expiresAt: Date;
}

/** Called on order fulfillment for digital products.
 *  Creates a download token with 30-day expiry. */
export class GenerateDownloadTokenUseCase {
  constructor(private repo: DownloadRepository) {}

  async execute(input: GenerateTokenInput): Promise<GenerateTokenResult> {
    if (!input.userId) {
      throw new ValidationError("User ID is required");
    }
    if (!input.orderId) {
      throw new ValidationError("Order ID is required");
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.repo.createToken({
      userId: input.userId,
      orderId: input.orderId,
      orderItemId: input.orderItemId,
      token,
      expiresAt,
    });

    return { token, expiresAt };
  }
}
