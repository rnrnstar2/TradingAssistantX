import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// MVP最適化設定: 必要最小限のテスト環境
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, './vitest.setup.ts')],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/out/**', '**/.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@workspace/ui': path.resolve(__dirname, './packages/ui/src'),
      '@workspace/shared-types': path.resolve(__dirname, './packages/shared-types/src'),
      '@workspace/shared-auth': path.resolve(__dirname, './packages/shared-auth/src'),
      '@workspace/shared-amplify': path.resolve(__dirname, './packages/shared-amplify/src'),
    },
  },
})