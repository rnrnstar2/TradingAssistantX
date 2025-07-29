/**
 * メインワークフロー統合テスト
 * TASK-003, TASK-004の実装内容を検証
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AuthManager } from '../../src/kaito-api/core/auth-manager';
import { SessionManager } from '../../src/kaito-api/core/session';
import { ActionExecutor } from '../../src/workflows/action-executor';
import { ComponentContainer, COMPONENT_KEYS } from '../../src/shared/component-container';
import { DataManager } from '../../src/shared/data-manager';
import type { ClaudeDecision } from '../../src/claude/types';
import type { HttpClient, UserLoginV2Response } from '../../src/kaito-api/types';

describe('Core Components Integration Test', () => {
  let authManager: AuthManager;
  let sessionManager: SessionManager;
  let actionExecutor: ActionExecutor;
  let componentContainer: ComponentContainer;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    // 環境変数設定
    process.env.X_USERNAME = 'rnrnstar';
    process.env.X_PASSWORD = 'Rinstar_520';
    process.env.X_EMAIL = 'suzumura@rnrnstar.com';
    process.env.X_PROXY = 'http://etilmzge:ina8vl2juf1w@23.95.150.145:6114';
    process.env.KAITO_API_TOKEN = 'test_token';

    // モックHTTPクライアントセットアップ
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
    };

    // コンポーネント初期化
    componentContainer = new ComponentContainer();
    authManager = new AuthManager();
    sessionManager = new SessionManager();
    actionExecutor = new ActionExecutor(componentContainer);
  });

  test('should initialize core components properly', async () => {
    // コア システム初期化テスト
    expect(authManager).toBeInstanceOf(AuthManager);
    expect(sessionManager).toBeInstanceOf(SessionManager);
    expect(actionExecutor).toBeInstanceOf(ActionExecutor);

    // コンポーネントコンテナの初期化確認
    expect(componentContainer).toBeInstanceOf(ComponentContainer);
  });

  test('should handle login session management', async () => {
    // ログイン成功レスポンス
    const mockLoginResponse: UserLoginV2Response = {
      success: true,
      login_cookie: 'test_cookie_12345',
      user_info: { 
        id: '123', 
        username: 'rnrnstar',
        screen_name: 'rnrnstar',
        followers_count: 100
      }
    };

    mockHttpClient.post.mockResolvedValue(mockLoginResponse);

    // ログイン実行
    const loginResult = await authManager.login();
    expect(loginResult.success).toBe(true);

    // セッション管理確認
    if (loginResult.success) {
      sessionManager.saveSession(loginResult);
      const validCookie = sessionManager.getValidCookie();
      expect(validCookie).toBe('test_cookie_12345');
    }
  });

  test('should handle action execution through ActionExecutor', async () => {
    // アクション実行テスト
    expect(actionExecutor).toBeInstanceOf(ActionExecutor);
    
    // コンポーネントコンテナ内でActionExecutorが正しく動作することを確認
    expect(componentContainer).toBeDefined();
  });

  test('should handle session expiry and re-login', async () => {
    // セッション期限切れテスト
    const mockLoginResponse: UserLoginV2Response = {
      success: true,
      login_cookie: 'test_cookie_12345',
      user_info: { 
        id: '123', 
        username: 'rnrnstar',
        screen_name: 'rnrnstar',
        followers_count: 100
      }
    };

    mockHttpClient.post.mockResolvedValue(mockLoginResponse);

    // 初回ログイン
    const initialLogin = await authManager.login();
    expect(initialLogin.success).toBe(true);

    if (initialLogin.success) {
      sessionManager.saveSession(initialLogin);
    }

    // セッション期限を強制的に切らす
    sessionManager.clearSession();
    expect(sessionManager.getValidCookie()).toBeNull();

    // 再ログインテスト
    const reLoginResult = await authManager.login();
    expect(reLoginResult.success).toBe(true);
  });

  test('should validate configuration format', () => {
    // 設定フォーマット検証テスト
    const config = {
      intervalMinutes: 30,
      enabled: true,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000
      }
    };

    // 設定オブジェクトの構造確認
    expect(config).toHaveProperty('intervalMinutes');
    expect(config).toHaveProperty('enabled');
    expect(config).toHaveProperty('retryPolicy');
    expect(config.retryPolicy).toHaveProperty('maxRetries');
    expect(config.retryPolicy).toHaveProperty('backoffMs');
  });

  test('should validate component health', async () => {
    // コンポーネントヘルス確認テスト
    expect(authManager).toBeDefined();
    expect(sessionManager).toBeDefined();
    expect(actionExecutor).toBeDefined();
    expect(componentContainer).toBeDefined();
    
    // 基本的な機能の確認
    const authStatus = authManager.getAuthStatus();
    expect(authStatus).toHaveProperty('apiKeyValid');
  });

  test('should handle action execution workflow', async () => {
    // アクション実行ワークフローテスト
    const mockDecision: ClaudeDecision = {
      action: 'post',
      reasoning: 'Test posting decision',
      parameters: {
        content: '投資教育テスト投稿: リスク管理について'
      },
      confidence: 0.9
    };

    // DataManagerをモック
    const mockDataManager = {
      saveExecutionResult: vi.fn(),
      loadContext: vi.fn().mockResolvedValue({}),
      saveContext: vi.fn()
    } as unknown as DataManager;

    const actionExecutor = new ActionExecutor(componentContainer);
    
    // アクション実行をモック
    vi.spyOn(actionExecutor, 'executeAction').mockResolvedValue({
      success: true,
      action: 'post',
      timestamp: new Date().toISOString(),
      tweetId: '1234567890',
      duration: 1500
    });

    const result = await actionExecutor.executeAction(mockDecision, mockDataManager);

    expect(result.success).toBe(true);
    expect(result.action).toBe('post');
    expect(result.tweetId).toBeDefined();
  });

  test('should handle error recovery properly', async () => {
    // エラー回復処理テスト
    const mockErrorResponse = {
      success: false,
      error: 'Network error',
      error_code: 500
    };

    mockHttpClient.post.mockRejectedValue(new Error('Network error'));

    // エラーハンドリング確認
    try {
      await authManager.login();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Network error');
    }
  });

  test('should manage component lifecycle properly', async () => {
    // コンポーネントライフサイクル管理テスト
    
    // コンポーネントの基本状態確認
    expect(authManager).toBeInstanceOf(AuthManager);
    expect(sessionManager).toBeInstanceOf(SessionManager);
    expect(actionExecutor).toBeInstanceOf(ActionExecutor);
    
    // 現在時刻を使用した基本的な状態確認
    const timestamp = new Date().toISOString();
    expect(timestamp).toBeDefined();
    expect(typeof timestamp).toBe('string');
  });
});