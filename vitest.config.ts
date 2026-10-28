import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@seo-partner/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@seo-partner/store': path.resolve(__dirname, 'packages/store/src/index.ts'),
      '@seo-partner/adapters': path.resolve(__dirname, 'packages/adapters/src/index.ts'),
      '@seo-partner/crawler': path.resolve(__dirname, 'packages/crawler/src/index.ts'),
      '@seo-partner/rules': path.resolve(__dirname, 'packages/rules/src/index.ts'),
      '@seo-partner/dashboard': path.resolve(__dirname, 'packages/dashboard/src/index.ts'),
      '@seo-partner/server': path.resolve(__dirname, 'packages/server/src/index.ts'),
      '@seo-partner/tools': path.resolve(__dirname, 'packages/tools/src/index.ts'),
      '@seo-partner/mcp': path.resolve(__dirname, 'packages/mcp/src/index.ts'),
      'seo-partner': path.resolve(__dirname, 'packages/cli/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 120000,
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/cli/src/bin.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});

