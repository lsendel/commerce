import type { DownloadRepository } from "../../infrastructure/repositories/download.repository";
import { NotFoundError, ValidationError, ExpiredError } from "../../shared/errors";

interface RedeemResult {
  assetStorageKey: string;
  assetFileName: string;
  assetContentType: string;
}

/**
 * Redeem a download token:
 * 1. Find token by value
 * 2. Check not expired and not already downloaded (downloadedAt === null)
 * 3. Check not revoked
 * 4. Mark as downloaded
 * 5. Return asset info for redirect/stream
 */
export class RedeemDownloadUseCase {
  constructor(private repo: DownloadRepository) {}

  async execute(tokenValue: string): Promise<RedeemResult> {
    // 1. Find token (findByToken already checks not revoked and not expired)
    const token = await this.repo.findByToken(tokenValue);
    if (!token) {
      throw new NotFoundError("Download token");
    }

    // 2. Check not already downloaded
    if (token.downloadedAt !== null) {
      throw new ValidationError("This download link has already been used");
    }

    // 3. Look up the digital asset via the order item
    // We need the orderItemId to find the associated digital asset
    if (!token.orderItemId) {
      throw new ValidationError("No downloadable content associated with this token");
    }

    // 4. Mark as downloaded
    await this.repo.markDownloaded(token.id);

    // Return the token info for the route to resolve the asset
    return {
      assetStorageKey: "", // Will be resolved at route level via variant lookup
      assetFileName: "",
      assetContentType: "",
    };
  }

  /** Validate and mark token, returning the raw token row for route-level asset resolution. */
  async validateAndConsume(tokenValue: string) {
    const token = await this.repo.findByToken(tokenValue);
    if (!token) {
      throw new NotFoundError("Download token");
    }

    if (token.downloadedAt !== null) {
      throw new ValidationError("This download link has already been used");
    }

    if (!token.orderItemId) {
      throw new ValidationError("No downloadable content associated with this token");
    }

    await this.repo.markDownloaded(token.id);

    return token;
  }
}
