import type {
  AnalyticsRepository,
  TrackEventData,
} from "../../infrastructure/repositories/analytics.repository";

export class TrackEventUseCase {
  constructor(private analyticsRepo: AnalyticsRepository) {}

  /**
   * Track an analytics event. Hashes the IP address if provided.
   */
  async execute(
    data: TrackEventData & { ip?: string },
  ) {
    let ipHash: string | null = data.ipHash ?? null;

    // Hash IP via Web Crypto SHA-256 if raw IP is provided
    if (data.ip && !ipHash) {
      ipHash = await this.hashIp(data.ip);
    }

    return this.analyticsRepo.trackEvent({
      ...data,
      ipHash,
    });
  }

  private async hashIp(ip: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}
