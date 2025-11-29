import { randomUUID } from 'crypto';
import type { TracingContext, TracingHook, AIGenerationResponse } from '../types/index.js';

export { TracingContext, TracingHook };

export class TracingManager {
  private hooks: TracingHook[] = [];
  private activeRequests: Map<string, TracingContext> = new Map();

  register(hook: TracingHook): void {
    this.hooks.push(hook);
  }

  createContext(provider: string, model: string, metadata?: Record<string, unknown>): TracingContext {
    const context: TracingContext = {
      requestId: randomUUID(),
      provider,
      model,
      timestamp: Date.now(),
      metadata,
    };

    this.activeRequests.set(context.requestId, context);
    return context;
  }

  onRequestStart(context: TracingContext): void {
    for (const hook of this.hooks) {
      hook.onRequestStart?.(context);
    }
  }

  onRequestEnd(context: TracingContext, response: AIGenerationResponse): void {
    for (const hook of this.hooks) {
      hook.onRequestEnd?.(context, response);
    }
    this.activeRequests.delete(context.requestId);
  }

  onRequestError(context: TracingContext, error: Error): void {
    for (const hook of this.hooks) {
      hook.onRequestError?.(context, error);
    }
    this.activeRequests.delete(context.requestId);
  }

  onStreamChunk(context: TracingContext, chunk: string): void {
    for (const hook of this.hooks) {
      hook.onStreamChunk?.(context, chunk);
    }
  }

  getActiveRequests(): TracingContext[] {
    return Array.from(this.activeRequests.values());
  }

  clear(): void {
    this.hooks = [];
    this.activeRequests.clear();
  }
}

export const createTracingManager = (): TracingManager => {
  return new TracingManager();
};

export class LoggingHook implements TracingHook {
  onRequestStart(context: TracingContext): void {
    console.log(
      `[TRACE] Request started: ${context.requestId} | Provider: ${context.provider} | Model: ${context.model}`
    );
  }

  onRequestEnd(context: TracingContext, response: AIGenerationResponse): void {
    const duration = Date.now() - context.timestamp;
    console.log(
      `[TRACE] Request completed: ${context.requestId} | Duration: ${duration}ms | Tokens: ${response.usage?.totalTokens || 0}`
    );
  }

  onRequestError(context: TracingContext, error: Error): void {
    const duration = Date.now() - context.timestamp;
    console.error(
      `[TRACE] Request failed: ${context.requestId} | Duration: ${duration}ms | Error: ${error.message}`
    );
  }

  onStreamChunk(context: TracingContext, chunk: string): void {
    console.log(`[TRACE] Stream chunk: ${context.requestId} | Length: ${chunk.length}`);
  }
}

export class MetricsHook implements TracingHook {
  private requestCount = 0;
  private totalTokens = 0;
  private errorCount = 0;
  private totalDuration = 0;

  onRequestStart(): void {
    this.requestCount++;
  }

  onRequestEnd(_context: TracingContext, response: AIGenerationResponse): void {
    const duration = Date.now() - _context.timestamp;
    this.totalDuration += duration;
    this.totalTokens += response.usage?.totalTokens || 0;
  }

  onRequestError(): void {
    this.errorCount++;
  }

  getMetrics() {
    return {
      requestCount: this.requestCount,
      totalTokens: this.totalTokens,
      errorCount: this.errorCount,
      averageDuration: this.requestCount > 0 ? this.totalDuration / this.requestCount : 0,
    };
  }

  reset(): void {
    this.requestCount = 0;
    this.totalTokens = 0;
    this.errorCount = 0;
    this.totalDuration = 0;
  }
}
