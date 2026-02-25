const BASE_URL = "https://api.printful.com";

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
      "Content-Type": "application/json",
    };
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<PrintfulResponse<T>> {
    const url = `${BASE_URL}${path}`;

    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new PrintfulApiError(
        `Printful API error ${res.status}: ${errorBody}`,
        res.status,
        errorBody,
      );
    }

    return res.json() as Promise<PrintfulResponse<T>>;
  }

  async get<T = unknown>(path: string): Promise<PrintfulResponse<T>> {
    return this.request<T>("GET", path);
  }

  async post<T = unknown>(
    path: string,
    body: unknown,
  ): Promise<PrintfulResponse<T>> {
    return this.request<T>("POST", path, body);
  }

  async put<T = unknown>(
    path: string,
    body: unknown,
  ): Promise<PrintfulResponse<T>> {
    return this.request<T>("PUT", path, body);
  }

  async delete<T = unknown>(path: string): Promise<PrintfulResponse<T>> {
    return this.request<T>("DELETE", path);
  }
}

export class PrintfulApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody: string,
  ) {
    super(message);
    this.name = "PrintfulApiError";
  }
}
