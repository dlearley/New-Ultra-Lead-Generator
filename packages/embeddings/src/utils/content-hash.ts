/**
 * Content hashing utilities
 */

import { createHash } from 'crypto';

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function contentHasChanged(oldHash: string, newContent: string): boolean {
  const newHash = hashContent(newContent);
  return oldHash !== newHash;
}

export function generateContentHash(sources: { type: string; content: string }[]): string {
  const combined = sources
    .map((s) => `${s.type}:${s.content}`)
    .join('|');
  return hashContent(combined);
}
