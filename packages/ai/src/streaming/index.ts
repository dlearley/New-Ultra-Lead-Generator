export class StreamBuffer {
  private chunks: string[] = [];
  private closed = false;

  push(chunk: string): void {
    if (!this.closed) {
      this.chunks.push(chunk);
    }
  }

  getAll(): string {
    return this.chunks.join('');
  }

  reset(): void {
    this.chunks = [];
  }

  close(): void {
    this.closed = true;
  }

  isClosed(): boolean {
    return this.closed;
  }
}

export async function* combineStreams(
  ...streams: AsyncIterable<string>[]
): AsyncGenerator<string> {
  for (const stream of streams) {
    for await (const chunk of stream) {
      yield chunk;
    }
  }
}

export async function collectStream(stream: AsyncIterable<string>): Promise<string> {
  let result = '';
  for await (const chunk of stream) {
    result += chunk;
  }
  return result;
}

export async function* filterStream(
  stream: AsyncIterable<string>,
  predicate: (chunk: string) => boolean
): AsyncGenerator<string> {
  for await (const chunk of stream) {
    if (predicate(chunk)) {
      yield chunk;
    }
  }
}

export async function* mapStream<T>(
  stream: AsyncIterable<string>,
  mapper: (chunk: string) => T
): AsyncGenerator<T> {
  for await (const chunk of stream) {
    yield mapper(chunk);
  }
}

export async function* throttleStream(
  stream: AsyncIterable<string>,
  delayMs: number
): AsyncGenerator<string> {
  for await (const chunk of stream) {
    yield chunk;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

export async function* batchStream(
  stream: AsyncIterable<string>,
  batchSize: number
): AsyncGenerator<string> {
  let buffer = '';
  
  for await (const chunk of stream) {
    buffer += chunk;
    
    while (buffer.length >= batchSize) {
      yield buffer.substring(0, batchSize);
      buffer = buffer.substring(batchSize);
    }
  }
  
  if (buffer.length > 0) {
    yield buffer;
  }
}

export class StreamProcessor {
  static async collect(stream: AsyncIterable<string>): Promise<string> {
    return collectStream(stream);
  }

  static filter(stream: AsyncIterable<string>, predicate: (chunk: string) => boolean) {
    return filterStream(stream, predicate);
  }

  static map<T>(stream: AsyncIterable<string>, mapper: (chunk: string) => T) {
    return mapStream(stream, mapper);
  }

  static throttle(stream: AsyncIterable<string>, delayMs: number) {
    return throttleStream(stream, delayMs);
  }

  static batch(stream: AsyncIterable<string>, batchSize: number) {
    return batchStream(stream, batchSize);
  }

  static combine(...streams: AsyncIterable<string>[]) {
    return combineStreams(...streams);
  }
}
