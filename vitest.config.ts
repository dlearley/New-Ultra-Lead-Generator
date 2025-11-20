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
      ],
    },
  },
  resolve: {
    alias: {
      '@api': path.resolve(__dirname, './src/api'),
      '@common': path.resolve(__dirname, './src/common'),
      '@database': path.resolve(__dirname, './src/database'),
      '@modules': path.resolve(__dirname, './src/modules'),
    },
  },
});
