import type { DownloadRepository } from "../../infrastructure/repositories/download.repository";
import { ValidationError } from "../../shared/errors";

interface UploadAssetInput {
  productId: string;
  fileName: string;
  fileSize: number;
  storageKey: string;
  contentType: string;
}

export class ManageDigitalAssetsUseCase {
  constructor(private repo: DownloadRepository) {}

  /** Record metadata for a digital asset (actual R2 upload happens at route level). */
  async createAsset(input: UploadAssetInput) {
    if (!input.fileName.trim()) {
      throw new ValidationError("File name is required");
    }
    if (input.fileSize <= 0) {
      throw new ValidationError("File size must be positive");
    }
    if (!input.storageKey.trim()) {
      throw new ValidationError("Storage key is required");
    }
    if (!input.contentType.trim()) {
      throw new ValidationError("Content type is required");
    }

    return this.repo.createAsset({
      productId: input.productId,
      fileName: input.fileName,
      fileSize: input.fileSize,
      storageKey: input.storageKey,
      contentType: input.contentType,
    });
  }

  /** List all digital assets for a product. */
  async listByProduct(productId: string) {
    return this.repo.findAssetsByProduct(productId);
  }
}
