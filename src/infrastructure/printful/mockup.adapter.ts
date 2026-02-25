import type { PrintfulClient } from "./printful.client";

// ─── Printful Mockup API response shapes ───────────────────────────────────

interface MockupTaskCreated {
  task_key: string;
  status: string;
}

interface MockupTaskResult {
  task_key: string;
  status: "pending" | "completed" | "error";
  mockups?: Array<{
    placement: string;
    variant_ids: number[];
    mockup_url: string;
    extra: Array<{
      title: string;
      url: string;
      variant_ids: number[];
    }>;
  }>;
  error?: string;
}

// ─── Mockup Adapter ────────────────────────────────────────────────────────

export class PrintfulMockupAdapter {
  /**
   * Create a mockup generation task for a Printful product.
   * Uses the Mockup Generator API to produce product images with a given design.
   *
   * @param client - Authenticated Printful client
   * @param printfulProductId - Printful catalog product ID (not sync product)
   * @param imageUrl - URL of the design image to place on the product
   * @returns The task key for polling the result
   */
  async createMockupTask(
    client: PrintfulClient,
    printfulProductId: number,
    imageUrl: string,
  ): Promise<{ taskKey: string }> {
    const response = await client.post<MockupTaskCreated>(
      `/mockup-generator/create-task/${printfulProductId}`,
      {
        variant_ids: [],
        format: "jpg",
        files: [
          {
            placement: "front",
            image_url: imageUrl,
            position: {
              area_width: 1800,
              area_height: 2400,
              width: 1800,
              height: 2400,
              top: 0,
              left: 0,
            },
          },
        ],
      },
    );

    return { taskKey: response.result.task_key };
  }

  /**
   * Poll the status of a mockup generation task.
   *
   * @param client - Authenticated Printful client
   * @param taskKey - The task key returned from createMockupTask
   * @returns The task result including status and mockup URLs when complete
   */
  async getMockupTaskResult(
    client: PrintfulClient,
    taskKey: string,
  ): Promise<{
    status: "pending" | "completed" | "error";
    mockups: Array<{
      placement: string;
      variantIds: number[];
      mockupUrl: string;
      extraUrls: string[];
    }>;
    error?: string;
  }> {
    const response = await client.get<MockupTaskResult>(
      `/mockup-generator/task?task_key=${encodeURIComponent(taskKey)}`,
    );

    const result = response.result;

    return {
      status: result.status,
      mockups: (result.mockups ?? []).map((m) => ({
        placement: m.placement,
        variantIds: m.variant_ids,
        mockupUrl: m.mockup_url,
        extraUrls: (m.extra ?? []).map((e) => e.url),
      })),
      error: result.error,
    };
  }
}
