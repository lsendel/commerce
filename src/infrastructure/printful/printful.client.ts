const BASE_URL = 'https://api.printful.com';
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

export interface PrintfulResponse<T = unknown> {
  code: number;
  result: T;
  extra?: unknown[];
  paging?: {
    total: number;
    offset: number;
    limit: number;
  };
}

export class PrintfulClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private shouldRetry(statusCode: number): boolean {
    return (
      statusCode === 429 ||
      statusCode === 500 ||
      statusCode === 502 ||
      statusCode === 503 ||
      statusCode === 504
    );
  }

  private parseRetryAfterMs(value: string | null): number | null {
    if (!value) return null;

    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.max(0, Math.floor(seconds * 1000));
    }

    const dateMs = Date.parse(value);
    if (Number.isFinite(dateMs)) {
      return Math.max(0, dateMs - Date.now());
    }

    return null;
  }

  private parseRateLimitResetMs(value: string | null): number | null {
    if (!value) return null;
    const resetSeconds = Number(value);
    if (!Number.isFinite(resetSeconds)) return null;
    return Math.max(0, Math.floor(resetSeconds * 1000 - Date.now()));
  }

  private calculateBackoffMs(attempt: number, headers: Headers): number {
    const retryAfterMs = this.parseRetryAfterMs(headers.get('retry-after'));
    const resetMs = this.parseRateLimitResetMs(headers.get('x-ratelimit-reset'));
    const headerDelayMs = [retryAfterMs, resetMs]
      .filter((v): v is number => v !== null)
      .reduce((max, value) => Math.max(max, value), 0);

    if (headerDelayMs > 0) {
      return Math.min(MAX_BACKOFF_MS, headerDelayMs);
    }

    const exponential = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, attempt));
    const jitter = Math.floor(Math.random() * 250);
    return exponential + jitter;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<PrintfulResponse<T>> {
    const url = `${BASE_URL}${path}`;
    let attempt = 0;

    while (true) {
      const res = await fetch(url, {
        method,
        headers: this.headers(),
        body: body ? JSON.stringify(body) : undefined,
      });

      if (res.ok) {
        return res.json() as Promise<PrintfulResponse<T>>;
      }

      const errorBody = await res.text();
      const retryable = this.shouldRetry(res.status);

      if (!retryable || attempt >= MAX_RETRIES) {
        throw new PrintfulApiError(
          `Printful API error ${res.status}: ${errorBody}`,
          res.status,
          errorBody,
        );
      }

      const delayMs = this.calculateBackoffMs(attempt, res.headers);
      attempt += 1;
      await this.sleep(delayMs);
    }
  }

  async get<T = unknown>(path: string): Promise<PrintfulResponse<T>> {
    return this.request<T>('GET', path);
  }

  async post<T = unknown>(path: string, body: unknown): Promise<PrintfulResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  async put<T = unknown>(path: string, body: unknown): Promise<PrintfulResponse<T>> {
    return this.request<T>('PUT', path, body);
  }

  async delete<T = unknown>(path: string): Promise<PrintfulResponse<T>> {
    return this.request<T>('DELETE', path);
  }
}

export class PrintfulApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody: string,
  ) {
    super(message);
    this.name = 'PrintfulApiError';
  }
}
