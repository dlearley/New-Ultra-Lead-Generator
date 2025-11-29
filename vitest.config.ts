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
        '.next/',
        '.turbo/',
      ],
    },
  },
  resolve: {
    alias: {
      '@ui': path.resolve(__dirname, './packages/ui/src'),
      '@core': path.resolve(__dirname, './packages/core/src'),
      '@db': path.resolve(__dirname, './packages/db/src'),
      '@search': path.resolve(__dirname, './packages/search/src'),
      '@ai': path.resolve(__dirname, './packages/ai/src'),
    },
  },
});
