// Vitest configuration
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/claude/**/*.ts'],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90
      }
    },
    setupFiles: ['./tests/setup/test-env.ts'],
    testTimeout: 10000,
    globals: true
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});