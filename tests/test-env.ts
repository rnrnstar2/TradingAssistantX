/**
 * テスト環境初期化
 * 実APIテストベース - 環境変数で実行制御
 */

import { vi } from 'vitest';

// テスト環境変数設定
process.env.NODE_ENV = 'test';

// 実APIテスト実行制御
// デフォルトでは実行しない（CI/CD環境での誤実行防止）
// 実行時は以下の環境変数を設定:
// - KAITO_API_TOKEN=xxx : Kaito APIトークン（設定時のみテスト実行）

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