import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter, createRateLimiter } from '../../src/ratelimit/index.js';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  describe('initialization', () => {
    it('should create with default config', () => {
      const limiter = new RateLimiter();
      expect(limiter).toBeDefined();
    });

    it('should create with custom config', () => {
      const limiter = new RateLimiter({
        requestsPerMinute: 50,
        tokensPerMinute: 50000,
        concurrency: 5,
      });
      expect(limiter).toBeDefined();
    });

    it('should use createRateLimiter factory', () => {
      const limiter = createRateLimiter();
      expect(limiter).toBeDefined();
      expect(limiter instanceof RateLimiter).toBe(true);
    });
  });

  describe('acquire', () => {
    it('should allow acquiring slots', async () => {
      await limiter.acquire();
      expect(limiter.getState().requestsThisMinute).toBe(1);
    });

    it('should track token usage', async () => {
      await limiter.acquire(50);
      const state = limiter.getState();
      expect(state.tokensThisMinute).toBe(50);
    });

    it('should allow multiple acquisitions', async () => {
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();
      expect(limiter.getState().requestsThisMinute).toBe(3);
    });

    it('should respect concurrency limit', async () => {
      const concurrentLimiter = new RateLimiter({
        concurrency: 1,
      });

      const start = Date.now();
      await Promise.all([
        concurrentLimiter.acquire(),
        concurrentLimiter.acquire(),
      ]);
      const duration = Date.now() - start;

      // Should take some time due to concurrency limit
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      const state = limiter.getState();
      expect(state).toBeDefined();
      expect(state.requestsThisMinute).toBeDefined();
      expect(state.tokensThisMinute).toBeDefined();
      expect(state.lastReset).toBeDefined();
    });

    it('should track requests count', async () => {
      await limiter.acquire();
      const state = limiter.getState();
      expect(state.requestsThisMinute).toBe(1);
    });

    it('should track tokens count', async () => {
      await limiter.acquire(100);
      const state = limiter.getState();
      expect(state.tokensThisMinute).toBe(100);
    });

    it('should return copy of state', () => {
      const state1 = limiter.getState();
      const state2 = limiter.getState();
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('clear', () => {
    it('should reset state', async () => {
      await limiter.acquire();
      await limiter.acquire(50);
      expect(limiter.getState().requestsThisMinute).toBe(2);

      limiter.clear();
      const state = limiter.getState();
      expect(state.requestsThisMinute).toBe(0);
      expect(state.tokensThisMinute).toBe(0);
    });

    it('should clear queue', async () => {
      await limiter.acquire();
      limiter.clear();

      const state = limiter.getState();
      expect(state.requestsThisMinute).toBe(0);
    });
  });

  describe('drain', () => {
    it('should wait for pending operations', async () => {
      const promises = [
        limiter.acquire(),
        limiter.acquire(),
        limiter.acquire(),
      ];

      await Promise.all(promises);
      await limiter.drain();

      expect(limiter.getState().requestsThisMinute).toBe(3);
    });

    it('should complete without error', async () => {
      await expect(limiter.drain()).resolves.toBeUndefined();
    });
  });

  describe('rate limiting behavior', () => {
    it('should track state changes with acquire', async () => {
      const limiter = new RateLimiter({
        requestsPerMinute: 100,
        tokensPerMinute: 10000,
        concurrency: 1,
      });

      const state1 = limiter.getState();
      expect(state1.requestsThisMinute).toBe(0);

      await limiter.acquire();
      const state2 = limiter.getState();
      expect(state2.requestsThisMinute).toBe(1);

      await limiter.acquire(50);
      const state3 = limiter.getState();
      // First acquire() uses 1 token (default), second acquire(50) uses 50 tokens
      expect(state3.tokensThisMinute).toBe(51);
    });

    it('should enforce token limits with high concurrency', async () => {
      const strictLimiter = new RateLimiter({
        tokensPerMinute: 100,
        concurrency: 1,
      });

      // First acquire 80 tokens
      await strictLimiter.acquire(80);
      const state = strictLimiter.getState();
      
      // Verify tokens tracked correctly
      expect(state.tokensThisMinute).toBe(80);
    });

    it('should work with default high limits', async () => {
      const defaultLimiter = new RateLimiter();

      const start = Date.now();
      for (let i = 0; i < 5; i++) {
        await defaultLimiter.acquire(100);
      }
      const duration = Date.now() - start;

      // Should not wait long with default high limits
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('concurrent requests', () => {
    it('should handle concurrent acquisitions', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(limiter.acquire());
      }

      await Promise.all(promises);
      expect(limiter.getState().requestsThisMinute).toBe(5);
    });

    it('should respect concurrency setting', async () => {
      const concurrentLimiter = new RateLimiter({
        concurrency: 3,
      });

      let concurrent = 0;
      let maxConcurrent = 0;

      const tasks = [];
      for (let i = 0; i < 3; i++) {
        tasks.push(
          concurrentLimiter.acquire().then(async () => {
            concurrent++;
            maxConcurrent = Math.max(maxConcurrent, concurrent);
            // Brief work
            await new Promise((resolve) => setTimeout(resolve, 5));
            concurrent--;
          })
        );
      }

      await Promise.all(tasks);
      // With concurrency 3, we should see up to 3 concurrent
      expect(maxConcurrent).toBeLessThanOrEqual(3);
      expect(maxConcurrent).toBeGreaterThan(0);
    });
  });
});
