// Vitest configuration
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    typecheck: {
      tsconfig: './tsconfig.test.json'
    },
    coverage: {
      include: [
        'src/claude/**/*.ts',
        'src/kaito-api/**/*.ts'
      ],
      exclude: [
        'src/kaito-api/types.ts',
        'src/kaito-api/index.ts',
        'src/claude/types.ts',
        'src/claude/index.ts',
        '**/*.d.ts',
        '**/node_modules/**'
      ],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90
      },
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './tasks/outputs/coverage'
    },
    setupFiles: ['./tests/test-env.ts'],
    testTimeout: 10000,
    globals: true
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});