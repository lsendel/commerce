export class R2StorageAdapter {
  constructor(private bucket: R2Bucket) {}

  async upload(
    key: string,
    data: string | Uint8Array | ArrayBuffer,
    contentType: string,
  ): Promise<void> {
    await this.bucket.put(key, data, {
      httpMetadata: {
        contentType,
      },
    });
  }

  getUrl(key: string): string {
    // Public URL via custom domain or R2.dev subdomain
    // The bucket is bound as IMAGES, public access is configured in wrangler.toml
    return `/cdn/${key}`;
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  async getSignedUrl(key: string): Promise<string> {
    // For private objects (pet photos), generate a presigned-style URL
    // In Cloudflare Workers, we serve private objects through a worker route
    // that checks auth before proxying from R2
    return `/api/studio/assets/${key}`;
  }
}
