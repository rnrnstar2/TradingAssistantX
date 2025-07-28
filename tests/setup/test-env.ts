/**
 * テスト環境初期化
 * REQUIREMENTS.md準拠 - 実データ使用禁止・モック強制
 */

import { vi } from 'vitest';

// テスト環境変数設定
process.env.REAL_DATA_MODE = 'false';
process.env.NODE_ENV = 'test';

// Claude SDK モック設定
vi.mock('@instantlyeasy/claude-code-sdk-ts');

// Jest互換性のためのグローバル設定
global.jest = {
  spyOn: vi.spyOn,
  fn: vi.fn,
  clearAllMocks: vi.clearAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
} as any;

// グローバルテストセットアップ
beforeEach(() => {
  // 各テストの前にモック状態をリセット
  vi.clearAllMocks();
});

// コンソール出力は実際のものを使用（テスト実行時の問題回避）
// 必要に応じて個別テストでモック化