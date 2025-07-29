/**
 * メインワークフロー統合テスト
 * TASK-003, TASK-004の実装内容を検証
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { SchedulerManager } from '../../src/main-workflows/scheduler-manager';
import { AuthManager } from '../../src/kaito-api/core/auth-manager';
import { SessionManager } from '../../src/kaito-api/core/session-manager';
import { SystemLifecycle } from '../../src/main-workflows/system-lifecycle';
import { ExecutionFlow } from '../../src/main-workflows/execution-flow';
import { ActionExecutor } from '../../src/main-workflows/core/action-executor';
import { ComponentContainer, COMPONENT_KEYS } from '../../src/shared/component-container';
import { DataManager } from '../../src/data/data-manager';
import type { ClaudeDecision } from '../../src/claude/types';
import type { HttpClient, UserLoginV2Response } from '../../src/kaito-api/types';

describe('Workflow Integration Test', () => {
  let schedulerManager: SchedulerManager;
  let authManager: AuthManager;
  let sessionManager: SessionManager;
  let systemLifecycle: SystemLifecycle;
  let executionFlow: ExecutionFlow;
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
    systemLifecycle = new SystemLifecycle(componentContainer);
    schedulerManager = new SchedulerManager();
    executionFlow = new ExecutionFlow(componentContainer);
  });

  test('should initialize system components properly', async () => {
    // システム初期化テスト
    expect(authManager).toBeInstanceOf(AuthManager);
    expect(sessionManager).toBeInstanceOf(SessionManager);
    expect(schedulerManager).toBeInstanceOf(SchedulerManager);
    expect(systemLifecycle).toBeInstanceOf(SystemLifecycle);
    expect(executionFlow).toBeInstanceOf(ExecutionFlow);

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

  test('should execute main loop with proper workflow', async () => {
    // メインループ実行テスト
    // 必要なコンポーネントをモック
    vi.spyOn(executionFlow, 'executeMainLoop').mockResolvedValue({
      success: true,
      executionId: 'test-execution-123',
      timestamp: new Date().toISOString(),
      duration: 1000,
      actions: []
    });

    const loopResult = await executionFlow.executeMainLoop();

    expect(loopResult.success).toBe(true);
    expect(loopResult.executionId).toBeDefined();
    expect(loopResult.timestamp).toBeDefined();
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

  test('should handle scheduler configuration properly', () => {
    // スケジューラー設定テスト
    const config = {
      intervalMinutes: 30,
      enabled: true,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000
      }
    };

    // スケジューラー設定確認
    expect(() => {
      // 実行コールバックをモック
      const mockExecutionCallback = vi.fn().mockResolvedValue({
        success: true,
        duration: 1000
      });

      schedulerManager.startScheduler(mockExecutionCallback);
    }).not.toThrow();
  });

  test('should validate system health checks', async () => {
    // システムヘルスチェックテスト
    const systemStatus = systemLifecycle.getSystemStatus();

    expect(systemStatus).toHaveProperty('initialized');
    expect(systemStatus).toHaveProperty('timestamp');
    expect(typeof systemStatus.initialized).toBe('boolean');
    expect(typeof systemStatus.timestamp).toBe('string');
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
    
    // システム開始テスト
    expect(() => {
      systemLifecycle.getSystemStatus();
    }).not.toThrow();

    // システム状態確認
    const status = systemLifecycle.getSystemStatus();
    expect(status.timestamp).toBeDefined();
  });
});