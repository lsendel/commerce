import { inArray } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import { productVariants, products } from "../../infrastructure/db/schema";

type ProductType = "physical" | "digital" | "subscription" | "bookable";

export interface ReorderSourceItem {
  id: string;
  variantId: string | null;
  productName: string;
  quantity: number;
}

export interface ReorderPlanLine {
  orderItemId: string;
  variantId: string | null;
  productName: string;
  productType: ProductType | null;
  requestedQuantity: number;
  plannedQuantity: number;
  status: "ready" | "adjusted" | "skipped";
  reason: string | null;
}

export interface ReorderPlan {
  action: "proceed" | "partial" | "blocked";
  lines: ReorderPlanLine[];
  requestedLineCount: number;
  readyLineCount: number;
  adjustedLineCount: number;
  skippedLineCount: number;
  requestedQuantity: number;
  plannedQuantity: number;
  messages: string[];
}

export class ReorderPlannerUseCase {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async execute(sourceItems: ReorderSourceItem[]): Promise<ReorderPlan> {
    const items = sourceItems.filter((item) => Number(item.quantity) > 0);
    const variantIds = [...new Set(items.map((item) => item.variantId).filter((id): id is string => Boolean(id)))];

    const variantRows = variantIds.length > 0
      ? await this.db
        .select()
        .from(productVariants)
        .where(inArray(productVariants.id, variantIds))
      : [];

    const productIds = [...new Set(variantRows.map((variant) => variant.productId))];
    const productRows = productIds.length > 0
      ? await this.db
        .select()
        .from(products)
        .where(inArray(products.id, productIds))
      : [];

    const variantMap = new Map(variantRows.map((variant) => [variant.id, variant]));
    const productMap = new Map(
      productRows
        .filter((product) => product.storeId === this.storeId)
        .map((product) => [product.id, product]),
    );

    const lines: ReorderPlanLine[] = [];

    for (const item of items) {
      if (!item.variantId) {
        lines.push({
          orderItemId: item.id,
          variantId: null,
          productName: item.productName,
          productType: null,
          requestedQuantity: item.quantity,
          plannedQuantity: 0,
          status: "skipped",
          reason: "Variant is no longer available.",
        });
        continue;
      }

      const variant = variantMap.get(item.variantId);
      if (!variant) {
        lines.push({
          orderItemId: item.id,
          variantId: item.variantId,
          productName: item.productName,
          productType: null,
          requestedQuantity: item.quantity,
          plannedQuantity: 0,
          status: "skipped",
          reason: "Variant no longer exists in the catalog.",
        });
        continue;
      }

      const product = productMap.get(variant.productId);
      if (!product) {
        lines.push({
          orderItemId: item.id,
          variantId: item.variantId,
          productName: item.productName,
          productType: null,
          requestedQuantity: item.quantity,
          plannedQuantity: 0,
          status: "skipped",
          reason: "Product is no longer available.",
        });
        continue;
      }

      const productType = product.type as ProductType;

      if (product.availableForSale === false || variant.availableForSale === false) {
        lines.push({
          orderItemId: item.id,
          variantId: item.variantId,
          productName: item.productName,
          productType,
          requestedQuantity: item.quantity,
          plannedQuantity: 0,
          status: "skipped",
          reason: "Item is currently unavailable for sale.",
        });
        continue;
      }

      if (productType === "bookable") {
        lines.push({
          orderItemId: item.id,
          variantId: item.variantId,
          productName: item.productName,
          productType,
          requestedQuantity: item.quantity,
          plannedQuantity: 0,
          status: "skipped",
          reason: "Bookable experiences require selecting a new date/time slot.",
        });
        continue;
      }

      if (productType === "physical") {
        const inventory = variant.inventoryQuantity ?? 0;
        if (inventory <= 0) {
          lines.push({
            orderItemId: item.id,
            variantId: item.variantId,
            productName: item.productName,
            productType,
            requestedQuantity: item.quantity,
            plannedQuantity: 0,
            status: "skipped",
            reason: "Item is currently out of stock.",
          });
          continue;
        }

        if (inventory < item.quantity) {
          lines.push({
            orderItemId: item.id,
            variantId: item.variantId,
            productName: item.productName,
            productType,
            requestedQuantity: item.quantity,
            plannedQuantity: inventory,
            status: "adjusted",
            reason: `Quantity adjusted to ${inventory} due to current stock.`,
          });
          continue;
        }
      }

      if (productType === "subscription" && item.quantity > 1) {
        lines.push({
          orderItemId: item.id,
          variantId: item.variantId,
          productName: item.productName,
          productType,
          requestedQuantity: item.quantity,
          plannedQuantity: 1,
          status: "adjusted",
          reason: "Subscription lines are limited to quantity 1 for reorder.",
        });
        continue;
      }

      lines.push({
        orderItemId: item.id,
        variantId: item.variantId,
        productName: item.productName,
        productType,
        requestedQuantity: item.quantity,
        plannedQuantity: item.quantity,
        status: "ready",
        reason: null,
      });
    }

    const requestedLineCount = lines.length;
    const readyLineCount = lines.filter((line) => line.status === "ready").length;
    const adjustedLineCount = lines.filter((line) => line.status === "adjusted").length;
    const skippedLineCount = lines.filter((line) => line.status === "skipped").length;
    const requestedQuantity = lines.reduce((sum, line) => sum + line.requestedQuantity, 0);
    const plannedQuantity = lines.reduce((sum, line) => sum + line.plannedQuantity, 0);
    const actionableCount = readyLineCount + adjustedLineCount;

    const messages = lines
      .filter((line) => line.reason)
      .map((line) => `${line.productName}: ${line.reason}`);

    const action: ReorderPlan["action"] = actionableCount === 0
      ? "blocked"
      : adjustedLineCount > 0 || skippedLineCount > 0
        ? "partial"
        : "proceed";

    return {
      action,
      lines,
      requestedLineCount,
      readyLineCount,
      adjustedLineCount,
      skippedLineCount,
      requestedQuantity,
      plannedQuantity,
      messages,
    };
  }
}
