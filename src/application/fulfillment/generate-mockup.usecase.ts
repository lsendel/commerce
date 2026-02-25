import { eq } from "drizzle-orm";
import { PrintfulClient } from "../../infrastructure/printful/printful.client";
import { PrintfulMockupAdapter } from "../../infrastructure/printful/mockup.adapter";
import { PrintfulRepository } from "../../infrastructure/repositories/printful.repository";
import type { Database } from "../../infrastructure/db/client";
import { printfulSyncProducts } from "../../infrastructure/db/schema";

interface GenerateMockupInput {
  apiKey: string;
  db: Database;
  productId: string;
  imageUrl: string;
}

export class GenerateMockupUseCase {
  private adapter = new PrintfulMockupAdapter();

  /**
   * Create a mockup generation task for a given product and design image.
   * Returns the task key that can be used to poll for the result.
   */
  async execute(input: GenerateMockupInput) {
    const { apiKey, db, productId, imageUrl } = input;
    const client = new PrintfulClient(apiKey);

    // Look up the Printful sync product to get the printful product ID
    const syncProducts = await db
      .select()
      .from(printfulSyncProducts)
      .where(eq(printfulSyncProducts.productId, productId))
      .limit(1);

    if (syncProducts.length === 0) {
      throw new Error(
        `Product ${productId} is not linked to a Printful product`,
      );
    }

    const printfulProductId = syncProducts[0].printfulId;

    // Create the mockup task
    const { taskKey } = await this.adapter.createMockupTask(
      client,
      printfulProductId,
      imageUrl,
    );

    return {
      taskKey,
      productId,
      printfulProductId,
    };
  }

  /**
   * Poll a mockup task for its result.
   */
  async pollResult(apiKey: string, taskKey: string) {
    const client = new PrintfulClient(apiKey);
    return this.adapter.getMockupTaskResult(client, taskKey);
  }
}
