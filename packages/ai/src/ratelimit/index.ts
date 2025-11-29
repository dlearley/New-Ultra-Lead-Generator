import PQueue from 'p-queue';
import type { RateLimitConfig } from '../types/index.js';

export interface RateLimitState {
  requestsThisMinute: number;
  tokensThisMinute: number;
  lastReset: number;
}

export class RateLimiter {
  private config: RateLimitConfig;
  private queue: PQueue;
  private state: RateLimitState;
  private readonly MINUTE_MS = 60000;

  constructor(config: RateLimitConfig = {}) {
    this.config = {
      requestsPerMinute: config.requestsPerMinute || 100,
      tokensPerMinute: config.tokensPerMinute || 90000,
      concurrency: config.concurrency || 10,
    };

    this.queue = new PQueue({
      concurrency: this.config.concurrency || 10,
    });

    this.state = {
      requestsThisMinute: 0,
      tokensThisMinute: 0,
      lastReset: Date.now(),
    };
  }

  async acquire(tokens: number = 1): Promise<void> {
    return this.queue.add(() => this.waitForSlot(tokens));
  }

  private async waitForSlot(tokens: number): Promise<void> {
    this.resetIfNeeded();

    while (
      (this.state.requestsThisMinute >= (this.config.requestsPerMinute || 100)) ||
      (this.state.tokensThisMinute + tokens > (this.config.tokensPerMinute || 90000))
    ) {
      const timeUntilReset = this.MINUTE_MS - (Date.now() - this.state.lastReset);
      if (timeUntilReset > 0) {
        await this.sleep(Math.min(100, timeUntilReset));
      }
      this.resetIfNeeded();
    }

    this.state.requestsThisMinute++;
    this.state.tokensThisMinute += tokens;
  }

  private resetIfNeeded(): void {
    const timeSinceReset = Date.now() - this.state.lastReset;
    if (timeSinceReset >= this.MINUTE_MS) {
      this.state.requestsThisMinute = 0;
      this.state.tokensThisMinute = 0;
      this.state.lastReset = Date.now();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getState(): RateLimitState {
    this.resetIfNeeded();
    return { ...this.state };
  }

  async drain(): Promise<void> {
    await this.queue.onIdle();
  }

  clear(): void {
    this.queue.clear();
    this.state = {
      requestsThisMinute: 0,
      tokensThisMinute: 0,
      lastReset: Date.now(),
    };
  }
}

export const createRateLimiter = (config?: RateLimitConfig): RateLimiter => {
  return new RateLimiter(config);
};
