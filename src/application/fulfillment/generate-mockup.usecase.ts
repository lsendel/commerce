import { eq } from "drizzle-orm";
import { PrintfulClient } from "../../infrastructure/printful/printful.client";
import { PrintfulMockupAdapter } from "../../infrastructure/printful/mockup.adapter";
import type { Database } from "../../infrastructure/db/client";
import { printfulSyncProducts, productImages, products } from "../../infrastructure/db/schema";

interface GenerateMockupInput {
  apiKey: string;
  db: Database;
  productId: string;
  imageUrl: string;
}

interface GenerateAndApplyMockupInput extends GenerateMockupInput {
  timeoutMs?: number;
  pollIntervalMs?: number;
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

  /**
   * Create a mockup task, poll until completion, and apply resulting URLs to product images.
   */
  async executeAndApply(input: GenerateAndApplyMockupInput) {
    const timeoutMs = input.timeoutMs ?? 120_000;
    const pollIntervalMs = input.pollIntervalMs ?? 2_000;

    const { taskKey, printfulProductId } = await this.execute(input);
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const polled = await this.pollResult(input.apiKey, taskKey);

      if (polled.status === "error") {
        throw new Error(polled.error ?? "Mockup generation failed");
      }

      if (polled.status === "completed") {
        const urls = this.collectMockupUrls(polled.mockups);
        if (urls.length === 0) {
          throw new Error("Mockup task completed but returned no URLs");
        }

        await this.applyMockups(input.db, input.productId, urls);
        return {
          taskKey,
          productId: input.productId,
          printfulProductId,
          status: "completed" as const,
          appliedUrls: urls,
        };
      }

      await sleep(pollIntervalMs);
    }

    return {
      taskKey,
      productId: input.productId,
      printfulProductId,
      status: "pending" as const,
      message: `Mockup task is still pending after ${timeoutMs}ms`,
    };
  }

  private collectMockupUrls(
    mockups: Array<{
      placement: string;
      variantIds: number[];
      mockupUrl: string;
      extraUrls: string[];
    }>,
  ) {
    const orderedUrls: string[] = [];
    for (const mockup of mockups) {
      orderedUrls.push(mockup.mockupUrl);
      for (const extra of mockup.extraUrls) orderedUrls.push(extra);
    }
    return [...new Set(orderedUrls.filter(Boolean))];
  }

  private async applyMockups(db: Database, productId: string, urls: string[]) {
    await db
      .update(products)
      .set({ featuredImageUrl: urls[0], updatedAt: new Date() })
      .where(eq(products.id, productId));

    await db.delete(productImages).where(eq(productImages.productId, productId));

    await db.insert(productImages).values(
      urls.slice(0, 12).map((url, index) => ({
        productId,
        url,
        altText: `Generated mockup ${index + 1}`,
        position: index,
      })),
    );
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
