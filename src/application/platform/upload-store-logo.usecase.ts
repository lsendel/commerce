import type { StoreRepository } from "../../infrastructure/repositories/store.repository";
import { NotFoundError } from "../../shared/errors";

export class UploadStoreLogoUseCase {
  constructor(
    private storeRepo: StoreRepository,
    private r2Bucket: R2Bucket,
  ) {}

  async execute(storeId: string, file: File) {
    const store = await this.storeRepo.findById(storeId);
    if (!store) {
      throw new NotFoundError("Store", storeId);
    }

    const ext = file.name.split(".").pop() ?? "png";
    const key = `stores/${storeId}/logo.${ext}`;
    await this.r2Bucket.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const logoUrl = `/cdn/${key}`;
    await this.storeRepo.update(storeId, { logo: logoUrl });

    return { logoUrl };
  }
}
