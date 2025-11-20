import { describe, it, expect } from 'vitest';
import {
  StreamBuffer,
  combineStreams,
  collectStream,
  filterStream,
  mapStream,
  throttleStream,
  batchStream,
  StreamProcessor,
} from '../../src/streaming/index.js';

async function makeStream(chunks: string[]): Promise<AsyncIterable<string>> {
  return (async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  })();
}

describe('Streaming Utilities', () => {
  describe('StreamBuffer', () => {
    it('should push and retrieve chunks', () => {
      const buffer = new StreamBuffer();
      buffer.push('Hello ');
      buffer.push('World');

      expect(buffer.getAll()).toBe('Hello World');
    });

    it('should reset buffer', () => {
      const buffer = new StreamBuffer();
      buffer.push('Hello');
      buffer.reset();

      expect(buffer.getAll()).toBe('');
    });

    it('should close and ignore new pushes', () => {
      const buffer = new StreamBuffer();
      buffer.push('Before');
      buffer.close();
      buffer.push('After');

      expect(buffer.getAll()).toBe('Before');
      expect(buffer.isClosed()).toBe(true);
    });

    it('should track closed state', () => {
      const buffer = new StreamBuffer();
      expect(buffer.isClosed()).toBe(false);

      buffer.close();
      expect(buffer.isClosed()).toBe(true);
    });
  });

  describe('collectStream', () => {
    it('should collect all chunks', async () => {
      const stream = await makeStream(['Hello', ' ', 'World']);
      const result = await collectStream(stream);

      expect(result).toBe('Hello World');
    });

    it('should handle empty stream', async () => {
      const stream = await makeStream([]);
      const result = await collectStream(stream);

      expect(result).toBe('');
    });

    it('should handle single chunk', async () => {
      const stream = await makeStream(['Hello']);
      const result = await collectStream(stream);

      expect(result).toBe('Hello');
    });
  });

  describe('filterStream', () => {
    it('should filter chunks based on predicate', async () => {
      const stream = await makeStream(['a', 'b', 'c', 'd']);
      const filtered = filterStream(stream, (chunk) => chunk !== 'b');

      let result = '';
      for await (const chunk of filtered) {
        result += chunk;
      }

      expect(result).toBe('acd');
    });

    it('should handle no matches', async () => {
      const stream = await makeStream(['x', 'y', 'z']);
      const filtered = filterStream(stream, (chunk) => chunk === 'a');

      let result = '';
      for await (const chunk of filtered) {
        result += chunk;
      }

      expect(result).toBe('');
    });

    it('should handle all matches', async () => {
      const stream = await makeStream(['a', 'b', 'c']);
      const filtered = filterStream(stream, (chunk) => chunk !== 'x');

      let result = '';
      for await (const chunk of filtered) {
        result += chunk;
      }

      expect(result).toBe('abc');
    });
  });

  describe('mapStream', () => {
    it('should transform chunks', async () => {
      const stream = await makeStream(['a', 'b', 'c']);
      const mapped = mapStream(stream, (chunk) => chunk.toUpperCase());

      const result = [];
      for await (const chunk of mapped) {
        result.push(chunk);
      }

      expect(result).toEqual(['A', 'B', 'C']);
    });

    it('should handle identity mapping', async () => {
      const stream = await makeStream(['Hello']);
      const mapped = mapStream(stream, (chunk) => chunk);

      let result = '';
      for await (const chunk of mapped) {
        result += chunk;
      }

      expect(result).toBe('Hello');
    });

    it('should handle object mapping', async () => {
      const stream = await makeStream(['1', '2', '3']);
      const mapped = mapStream(stream, (chunk) => parseInt(chunk));

      const result = [];
      for await (const chunk of mapped) {
        result.push(chunk);
      }

      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('throttleStream', () => {
    it('should add delay between chunks', async () => {
      const stream = await makeStream(['a', 'b']);
      const start = Date.now();

      let count = 0;
      for await (const _chunk of throttleStream(stream, 50)) {
        count++;
      }

      const duration = Date.now() - start;
      expect(count).toBe(2);
      expect(duration).toBeGreaterThanOrEqual(50);
    });

    it('should work with zero delay', async () => {
      const stream = await makeStream(['a', 'b', 'c']);
      let result = '';

      for await (const chunk of throttleStream(stream, 0)) {
        result += chunk;
      }

      expect(result).toBe('abc');
    });
  });

  describe('batchStream', () => {
    it('should batch chunks', async () => {
      const stream = await makeStream(['a', 'b', 'c', 'd', 'e']);
      const batches: string[] = [];

      for await (const batch of batchStream(stream, 2)) {
        batches.push(batch);
      }

      expect(batches).toEqual(['ab', 'cd', 'e']);
    });

    it('should handle exact batch size', async () => {
      const stream = await makeStream(['a', 'b', 'c', 'd']);
      const batches: string[] = [];

      for await (const batch of batchStream(stream, 2)) {
        batches.push(batch);
      }

      expect(batches).toEqual(['ab', 'cd']);
    });

    it('should handle batch size larger than stream', async () => {
      const stream = await makeStream(['a', 'b']);
      const batches: string[] = [];

      for await (const batch of batchStream(stream, 10)) {
        batches.push(batch);
      }

      expect(batches).toEqual(['ab']);
    });

    it('should handle empty stream', async () => {
      const stream = await makeStream([]);
      const batches: string[] = [];

      for await (const batch of batchStream(stream, 2)) {
        batches.push(batch);
      }

      expect(batches).toEqual([]);
    });
  });

  describe('combineStreams', () => {
    it('should combine multiple streams', async () => {
      const stream1 = await makeStream(['a', 'b']);
      const stream2 = await makeStream(['c', 'd']);

      let result = '';
      for await (const chunk of combineStreams(stream1, stream2)) {
        result += chunk;
      }

      expect(result).toBe('abcd');
    });

    it('should handle empty combined streams', async () => {
      const stream1 = await makeStream([]);
      const stream2 = await makeStream([]);

      let result = '';
      for await (const chunk of combineStreams(stream1, stream2)) {
        result += chunk;
      }

      expect(result).toBe('');
    });

    it('should handle single stream', async () => {
      const stream = await makeStream(['Hello']);

      let result = '';
      for await (const chunk of combineStreams(stream)) {
        result += chunk;
      }

      expect(result).toBe('Hello');
    });

    it('should handle multiple streams', async () => {
      const s1 = await makeStream(['1']);
      const s2 = await makeStream(['2']);
      const s3 = await makeStream(['3']);

      let result = '';
      for await (const chunk of combineStreams(s1, s2, s3)) {
        result += chunk;
      }

      expect(result).toBe('123');
    });
  });

  describe('StreamProcessor', () => {
    it('should provide collect static method', async () => {
      const stream = await makeStream(['Hello', ' ', 'World']);
      const result = await StreamProcessor.collect(stream);

      expect(result).toBe('Hello World');
    });

    it('should provide filter static method', async () => {
      const stream = await makeStream(['a', 'b', 'c']);
      const filtered = StreamProcessor.filter(stream, (chunk) => chunk !== 'b');

      let result = '';
      for await (const chunk of filtered) {
        result += chunk;
      }

      expect(result).toBe('ac');
    });

    it('should provide map static method', async () => {
      const stream = await makeStream(['1', '2', '3']);
      const mapped = StreamProcessor.map(stream, (chunk) => parseInt(chunk));

      const result = [];
      for await (const chunk of mapped) {
        result.push(chunk);
      }

      expect(result).toEqual([1, 2, 3]);
    });

    it('should provide throttle static method', async () => {
      const stream = await makeStream(['a', 'b']);
      const start = Date.now();

      let count = 0;
      for await (const _chunk of StreamProcessor.throttle(stream, 30)) {
        count++;
      }

      const duration = Date.now() - start;
      expect(count).toBe(2);
      expect(duration).toBeGreaterThanOrEqual(30);
    });

    it('should provide batch static method', async () => {
      const stream = await makeStream(['a', 'b', 'c', 'd']);
      const batches: string[] = [];

      for await (const batch of StreamProcessor.batch(stream, 2)) {
        batches.push(batch);
      }

      expect(batches).toEqual(['ab', 'cd']);
    });

    it('should provide combine static method', async () => {
      const s1 = await makeStream(['a', 'b']);
      const s2 = await makeStream(['c', 'd']);

      let result = '';
      for await (const chunk of StreamProcessor.combine(s1, s2)) {
        result += chunk;
      }

      expect(result).toBe('abcd');
    });

    it('should chain multiple operations', async () => {
      const stream = await makeStream(['a', 'b', 'c', 'd', 'e']);
      const filtered = StreamProcessor.filter(stream, (c) => c !== 'b');
      const mapped = StreamProcessor.map(filtered, (c) => c.toUpperCase());

      const result = [];
      for await (const chunk of mapped) {
        result.push(chunk);
      }

      expect(result).toEqual(['A', 'C', 'D', 'E']);
    });
  });
});
