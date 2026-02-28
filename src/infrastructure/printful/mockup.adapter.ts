import type { PrintfulClient } from "./printful.client";

// ─── Printful Mockup API response shapes ───────────────────────────────────

interface MockupTaskCreated {
  task_key: string;
  status: string;
}

interface ProductVariantsResponse {
  product: {
    id: number;
    title: string;
  };
  variants: Array<{
    id: number;
  }>;
}

interface MockupTemplateResponse {
  variant_mapping: Array<{
    variant_id: number;
    templates: Array<{
      placement: string;
      template_id: number;
    }>;
  }>;
  templates: Array<{
    template_id: number;
    template_width: number;
    template_height: number;
    print_area_width: number;
    print_area_height: number;
    print_area_top: number;
    print_area_left: number;
  }>;
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
    const [productData, templateData] = await Promise.all([
      client.get<ProductVariantsResponse>(`/products/${printfulProductId}`),
      client.get<MockupTemplateResponse>(
        `/mockup-generator/templates/${printfulProductId}`,
      ),
    ]);

    const variantIds = (productData.result.variants ?? [])
      .map((v) => v.id)
      .filter((id) => Number.isFinite(id));

    if (variantIds.length === 0) {
      throw new Error(
        `Printful product ${printfulProductId} has no variants for mockups`,
      );
    }

    const firstMapping = templateData.result.variant_mapping?.[0];
    const firstPlacement = firstMapping?.templates?.[0];
    const placement = firstPlacement?.placement ?? "front";

    const template =
      templateData.result.templates.find(
        (t) => t.template_id === firstPlacement?.template_id,
      ) ?? templateData.result.templates[0];

    if (!template) {
      throw new Error(
        `No mockup templates available for Printful product ${printfulProductId}`,
      );
    }

    const response = await client.post<MockupTaskCreated>(
      `/mockup-generator/create-task/${printfulProductId}`,
      {
        variant_ids: variantIds,
        format: "jpg",
        files: [
          {
            placement,
            image_url: imageUrl,
            position: {
              area_width: template.template_width,
              area_height: template.template_height,
              width: template.print_area_width,
              height: template.print_area_height,
              top: template.print_area_top,
              left: template.print_area_left,
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
