import { describe, it, expect, beforeEach } from 'vitest';
import {
  TracingManager,
  createTracingManager,
  LoggingHook,
  MetricsHook,
} from '../../src/tracing/index.js';

describe('TracingManager', () => {
  let tracingManager: TracingManager;

  beforeEach(() => {
    tracingManager = createTracingManager();
  });

  describe('createContext', () => {
    it('should create context with unique requestId', () => {
      const context1 = tracingManager.createContext('openai', 'gpt-4');
      const context2 = tracingManager.createContext('anthropic', 'claude-3');

      expect(context1.requestId).toBeDefined();
      expect(context2.requestId).toBeDefined();
      expect(context1.requestId).not.toBe(context2.requestId);
    });

    it('should set provider and model in context', () => {
      const context = tracingManager.createContext('openai', 'gpt-4');
      expect(context.provider).toBe('openai');
      expect(context.model).toBe('gpt-4');
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const context = tracingManager.createContext('openai', 'gpt-4');
      const after = Date.now();

      expect(context.timestamp).toBeGreaterThanOrEqual(before);
      expect(context.timestamp).toBeLessThanOrEqual(after);
    });

    it('should include metadata when provided', () => {
      const metadata = { userId: '123', version: '1.0' };
      const context = tracingManager.createContext('openai', 'gpt-4', metadata);

      expect(context.metadata).toEqual(metadata);
    });

    it('should track active requests', () => {
      tracingManager.createContext('openai', 'gpt-4');
      tracingManager.createContext('anthropic', 'claude-3');

      const active = tracingManager.getActiveRequests();
      expect(active).toHaveLength(2);
    });
  });

  describe('hooks registration', () => {
    it('should register hook', () => {
      const hook = { onRequestStart: () => {} };
      tracingManager.register(hook);

      expect(tracingManager.getActiveRequests()).toBeDefined();
    });

    it('should register multiple hooks', () => {
      const hook1 = { onRequestStart: () => {} };
      const hook2 = { onRequestEnd: () => {} };

      tracingManager.register(hook1);
      tracingManager.register(hook2);

      expect(tracingManager.getActiveRequests()).toBeDefined();
    });
  });

  describe('hook invocation', () => {
    it('should invoke onRequestStart hook', () => {
      let called = false;
      tracingManager.register({
        onRequestStart: () => {
          called = true;
        },
      });

      const context = tracingManager.createContext('openai', 'gpt-4');
      tracingManager.onRequestStart(context);

      expect(called).toBe(true);
    });

    it('should invoke onRequestEnd hook', () => {
      let called = false;
      const response = { content: 'test', finishReason: 'stop' };

      tracingManager.register({
        onRequestEnd: () => {
          called = true;
        },
      });

      const context = tracingManager.createContext('openai', 'gpt-4');
      tracingManager.onRequestEnd(context, response);

      expect(called).toBe(true);
    });

    it('should invoke onRequestError hook', () => {
      let called = false;
      const error = new Error('Test error');

      tracingManager.register({
        onRequestError: () => {
          called = true;
        },
      });

      const context = tracingManager.createContext('openai', 'gpt-4');
      tracingManager.onRequestError(context, error);

      expect(called).toBe(true);
    });

    it('should invoke onStreamChunk hook', () => {
      let called = false;
      tracingManager.register({
        onStreamChunk: () => {
          called = true;
        },
      });

      const context = tracingManager.createContext('openai', 'gpt-4');
      tracingManager.onStreamChunk(context, 'chunk');

      expect(called).toBe(true);
    });

    it('should remove context after request end', () => {
      const context = tracingManager.createContext('openai', 'gpt-4');
      expect(tracingManager.getActiveRequests()).toHaveLength(1);

      tracingManager.onRequestEnd(context, { content: 'test', finishReason: 'stop' });
      expect(tracingManager.getActiveRequests()).toHaveLength(0);
    });

    it('should remove context after request error', () => {
      const context = tracingManager.createContext('openai', 'gpt-4');
      expect(tracingManager.getActiveRequests()).toHaveLength(1);

      tracingManager.onRequestError(context, new Error('error'));
      expect(tracingManager.getActiveRequests()).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should clear hooks and contexts', () => {
      tracingManager.register({ onRequestStart: () => {} });
      tracingManager.createContext('openai', 'gpt-4');

      expect(tracingManager.getActiveRequests()).toHaveLength(1);
      tracingManager.clear();
      expect(tracingManager.getActiveRequests()).toHaveLength(0);
    });
  });

  describe('LoggingHook', () => {
    it('should log on request start', () => {
      const hook = new LoggingHook();
      const context = {
        requestId: '123',
        provider: 'openai',
        model: 'gpt-4',
        timestamp: Date.now(),
      };

      expect(() => hook.onRequestStart(context)).not.toThrow();
    });

    it('should log on request end', () => {
      const hook = new LoggingHook();
      const context = {
        requestId: '123',
        provider: 'openai',
        model: 'gpt-4',
        timestamp: Date.now(),
      };
      const response = {
        content: 'test',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      };

      expect(() => hook.onRequestEnd(context, response)).not.toThrow();
    });

    it('should log on request error', () => {
      const hook = new LoggingHook();
      const context = {
        requestId: '123',
        provider: 'openai',
        model: 'gpt-4',
        timestamp: Date.now(),
      };
      const error = new Error('Test error');

      expect(() => hook.onRequestError(context, error)).not.toThrow();
    });

    it('should log stream chunk', () => {
      const hook = new LoggingHook();
      const context = {
        requestId: '123',
        provider: 'openai',
        model: 'gpt-4',
        timestamp: Date.now(),
      };

      expect(() => hook.onStreamChunk(context, 'chunk')).not.toThrow();
    });
  });

  describe('MetricsHook', () => {
    it('should track request count', () => {
      const hook = new MetricsHook();
      hook.onRequestStart();
      hook.onRequestStart();

      const metrics = hook.getMetrics();
      expect(metrics.requestCount).toBe(2);
    });

    it('should track token usage', () => {
      const hook = new MetricsHook();
      const context = {
        requestId: '123',
        provider: 'openai',
        model: 'gpt-4',
        timestamp: Date.now(),
      };

      hook.onRequestStart();
      hook.onRequestEnd(context, {
        content: 'test',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      });

      const metrics = hook.getMetrics();
      expect(metrics.totalTokens).toBe(30);
    });

    it('should track error count', () => {
      const hook = new MetricsHook();
      hook.onRequestError();
      hook.onRequestError();

      const metrics = hook.getMetrics();
      expect(metrics.errorCount).toBe(2);
    });

    it('should calculate average duration', () => {
      const hook = new MetricsHook();
      const context = {
        requestId: '123',
        provider: 'openai',
        model: 'gpt-4',
        timestamp: Date.now() - 100,
      };

      hook.onRequestStart();
      hook.onRequestEnd(context, { content: 'test' });

      const metrics = hook.getMetrics();
      expect(metrics.averageDuration).toBeGreaterThan(0);
    });

    it('should reset metrics', () => {
      const hook = new MetricsHook();
      hook.onRequestStart();
      hook.onRequestError();

      let metrics = hook.getMetrics();
      expect(metrics.requestCount).toBe(1);
      expect(metrics.errorCount).toBe(1);

      hook.reset();
      metrics = hook.getMetrics();
      expect(metrics.requestCount).toBe(0);
      expect(metrics.errorCount).toBe(0);
    });
  });
});
