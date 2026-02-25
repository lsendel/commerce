import {
  CIRCUIT_BREAKER_THRESHOLD,
  CIRCUIT_BREAKER_RESET_MS,
} from "../../shared/constants";

type CircuitState = "closed" | "open" | "half_open";

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold: number;
  private readonly resetMs: number;

  constructor(
    private readonly name: string,
    options?: { threshold?: number; resetMs?: number },
  ) {
    this.threshold = options?.threshold ?? CIRCUIT_BREAKER_THRESHOLD;
    this.resetMs = options?.resetMs ?? CIRCUIT_BREAKER_RESET_MS;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.resetMs) {
        this.state = "half_open";
      } else {
        throw new Error(
          `Circuit breaker "${this.name}" is open. Retry after ${this.resetMs}ms.`,
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = "closed";
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = "open";
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
