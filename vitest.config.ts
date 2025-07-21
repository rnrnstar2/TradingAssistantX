import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 基本設定
    environment: 'node',
    globals: true,
    
    // ファイル対象
    include: ['tests/**/*.test.ts'],
    exclude: [
      '**/node_modules/**', 
      '**/dist/**',
      '**/tasks/**'
    ],
    
    // タイムアウト設定（重要）
    timeout: 120000,        // 全体タイムアウト: 2分
    testTimeout: 90000,     // 個別テスト: 90秒
    hookTimeout: 60000,     // フック: 60秒
    
    // 並列実行制御
    threads: false,         // Playwright競合回避
    maxConcurrency: 1,      // 統合テストは順次実行
    
    // カバレッジ設定
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'tests/',
        'dist/',
        '**/*.d.ts',
        'tasks/',
        'scripts/'
      ],
      include: ['src/**/*.ts']
    },
    
    // セットアップ
    setupFiles: './vitest.setup.ts'
  }
})