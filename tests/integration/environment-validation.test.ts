/**
 * 環境変数検証統合テスト
 * TASK-001の実装内容を検証
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { validateEnvironmentVariables } from '../../src/kaito-api/core/config';
import { AuthManager } from '../../src/kaito-api/core/auth-manager';

describe('Environment Variables Integration Test', () => {
  beforeEach(() => {
    // テスト環境の環境変数をクリア
    delete process.env.X_USERNAME;
    delete process.env.X_PASSWORD;
    delete process.env.X_EMAIL;
    delete process.env.X_PROXY;
    delete process.env.KAITO_API_TOKEN;
  });

  test('should validate all required environment variables', () => {
    // 必須環境変数設定
    process.env.X_USERNAME = 'test_user';
    process.env.X_PASSWORD = 'test_pass';
    process.env.X_EMAIL = 'test@example.com';
    process.env.X_PROXY = 'http://proxy:port';
    process.env.KAITO_API_TOKEN = 'test_token';

    // 検証実行
    const result = validateEnvironmentVariables();
    
    expect(result.isValid).toBe(true);
    expect(result.missingVariables).toHaveLength(0);
    expect(result.validatedAt).toBeDefined();
  });

  test('should fail when environment variables are missing', () => {
    // 環境変数未設定状態

    const result = validateEnvironmentVariables();
    
    expect(result.isValid).toBe(false);
    expect(result.missingVariables).toContain('X_USERNAME');
    expect(result.missingVariables).toContain('X_PASSWORD');
    expect(result.missingVariables).toContain('X_EMAIL');
    expect(result.missingVariables).toContain('X_PROXY');
  });

  test('should fail when environment variables are empty strings', () => {
    // 空文字列の環境変数設定
    process.env.X_USERNAME = '';
    process.env.X_PASSWORD = '';
    process.env.X_EMAIL = 'test@example.com';
    process.env.X_PROXY = 'http://proxy:port';

    const result = validateEnvironmentVariables();
    
    expect(result.isValid).toBe(false);
    expect(result.missingVariables).toContain('X_USERNAME');
    expect(result.missingVariables).toContain('X_PASSWORD');
    expect(result.missingVariables).not.toContain('X_EMAIL');
    expect(result.missingVariables).not.toContain('X_PROXY');
  });

  test('should initialize AuthManager with environment variables', () => {
    // 環境変数設定
    process.env.X_USERNAME = 'rnrnstar';
    process.env.X_PASSWORD = 'Rinstar_520';
    process.env.X_EMAIL = 'suzumura@rnrnstar.com';
    process.env.X_PROXY = 'http://etilmzge:ina8vl2juf1w@23.95.150.145:6114';
    process.env.KAITO_API_TOKEN = 'test_token';

    // AuthManager初期化テスト
    expect(() => {
      const authManager = new AuthManager();
      expect(authManager).toBeInstanceOf(AuthManager);
    }).not.toThrow();
    
    const authManager = new AuthManager();
    
    // 認証ヘッダーが正しく設定されることを確認
    const authHeaders = authManager.getAuthHeaders();
    expect(authHeaders['x-api-key']).toBe('test_token');
    expect(authHeaders['Content-Type']).toBe('application/json');
  });

  test('should fail AuthManager initialization without KAITO_API_TOKEN', () => {
    // KAITO_API_TOKEN未設定
    process.env.X_USERNAME = 'rnrnstar';
    process.env.X_PASSWORD = 'Rinstar_520';
    process.env.X_EMAIL = 'suzumura@rnrnstar.com';
    process.env.X_PROXY = 'http://etilmzge:ina8vl2juf1w@23.95.150.145:6114';
    // KAITO_API_TOKEN は意図的に未設定

    // AuthManager初期化がエラーになることを確認
    expect(() => {
      new AuthManager();
    }).toThrow('KAITO_API_TOKEN is required');
  });

  test('should handle whitespace-only environment variables', () => {
    // 空白のみの環境変数設定
    process.env.X_USERNAME = '   ';
    process.env.X_PASSWORD = '\t';
    process.env.X_EMAIL = 'test@example.com';
    process.env.X_PROXY = 'http://proxy:port';

    const result = validateEnvironmentVariables();
    
    expect(result.isValid).toBe(false);
    expect(result.missingVariables).toContain('X_USERNAME');
    expect(result.missingVariables).toContain('X_PASSWORD');
  });
});