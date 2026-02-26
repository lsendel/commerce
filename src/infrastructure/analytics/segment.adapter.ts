/**
 * Stub adapter for Segment (external analytics pipeline).
 * Replace with real implementation when Segment integration is configured.
 */

export interface SegmentEvent {
  id: string;
  eventType: string;
  sessionId: string | null;
  userId: string | null;
  properties: Record<string, unknown>;
  pageUrl: string | null;
  referrer: string | null;
  userAgent: string | null;
  createdAt: Date | null;
}

export class SegmentAdapter {
  private configured: boolean;

  constructor(writeKey?: string) {
    this.configured = Boolean(writeKey);
  }

  /**
   * Send a batch of events to Segment.
   * Returns the number of events successfully sent.
   */
  async sendBatch(events: SegmentEvent[]): Promise<number> {
    if (!this.configured) {
      console.log(
        `[segment-adapter] Segment integration not configured — skipping ${events.length} event(s)`,
      );
      return 0;
    }

    // TODO: Implement actual Segment HTTP API call
    // POST https://api.segment.io/v1/batch
    console.log(
      `[segment-adapter] Would send ${events.length} event(s) to Segment`,
    );
    return events.length;
  }
}
