/**
 * テスト環境初期化
 * モックAPIテストベース - コスト発生防止
 */

import { vi } from 'vitest';
import dotenv from 'dotenv';

// .envファイルから環境変数を読み込み
dotenv.config();

// テスト環境変数設定
process.env.NODE_ENV = 'test';

// Jest互換性のためのグローバル設定
global.jest = {
  spyOn: vi.spyOn,
  fn: vi.fn,
  clearAllMocks: vi.clearAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
} as any;

// Fetchのグローバルモック化（実APIコール防止）
global.fetch = vi.fn();

// モックレスポンス設定
const mockFetch = global.fetch as any;

// Kaito API ログインのモックレスポンス
const createMockLoginResponse = (success: boolean = true) => ({
  ok: success,
  status: success ? 200 : 400,
  statusText: success ? 'OK' : 'Bad Request',
  json: async () => success 
    ? {
        status: 'success',
        login_cookie: 'mock-login-cookie-12345',
        session_expires: new Date(Date.now() + 3600000).toISOString(),
        user_id: 'mock-user-123'
      }
    : {
        status: 'error',
        error: 'Authentication failed: mock error'
      },
  text: async () => success 
    ? JSON.stringify({
        status: 'success',
        login_cookie: 'mock-login-cookie-12345',
        session_expires: new Date(Date.now() + 3600000).toISOString()
      })
    : JSON.stringify({
        status: 'error',
        error: 'Authentication failed: mock error'
      }),
  headers: new Map([
    ['content-type', 'application/json']
  ])
});

// グローバルテストセットアップ
beforeEach(() => {
  // 各テストの前にモック状態をリセット
  vi.clearAllMocks();
  
  // デフォルトのfetchモック設定
  mockFetch.mockImplementation((url: string) => {
    // Twitter API.io ログインエンドポイントをモック
    if (url.includes('/twitter/user_login_v2')) {
      return Promise.resolve(createMockLoginResponse(true));
    }
    
    // その他のエンドポイントもモック成功レスポンスを返す
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success', data: {} }),
      text: async () => JSON.stringify({ status: 'success', data: {} }),
      headers: new Map([['content-type', 'application/json']])
    });
  });
});

// 実APIテスト実行時の環境変数
// テスト時は実APIを使わずモックを使用（コスト削減）
// 実APIテストが必要な場合は別途専用テストファイルを作成