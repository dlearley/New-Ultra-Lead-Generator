import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@ai': path.resolve(__dirname, './packages/ai/src'),
      '@ai-test': path.resolve(__dirname, './packages/ai/tests'),
    },
  },
});
