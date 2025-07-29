# TASK-005: 統合テスト・検証システム

## 🎯 タスク概要
- **担当**: Worker5
- **フェーズ**: Phase 3（並列実行 - Phase 2完了後）
- **優先度**: HIGH
- **期限**: Phase 2完了次第実行

## 🔄 依存関係
- **前提**: TASK-001, TASK-002, TASK-003, TASK-004の完了必須
- **並列実行**: Worker6（TASK-006）と並行実行可能

## 🎯 検証目標
Phase 1-2で実装された全システムが統合されて正常動作することを確認する。

## 🧪 テスト実装要件

### Phase 5-A: 環境変数検証テスト

#### tests/integration/environment-validation.test.ts（新規作成）
```typescript
/**
 * 環境変数検証統合テスト
 * TASK-001の実装内容を検証
 */

describe('Environment Variables Integration Test', () => {
  beforeEach(() => {
    // テスト環境の環境変数をクリア
    delete process.env.X_USERNAME;
    delete process.env.X_PASSWORD;
    delete process.env.X_EMAIL;
    delete process.env.X_PROXY;
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
    expect(result.errors).toHaveLength(0);
  });

  test('should fail when environment variables are missing', () => {
    // 環境変数未設定状態

    const result = validateEnvironmentVariables();
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('X_USERNAME is required');
    expect(result.errors).toContain('X_PASSWORD is required');
    expect(result.errors).toContain('X_EMAIL is required');
    expect(result.errors).toContain('X_PROXY is required');
  });

  test('should initialize AuthManager with environment variables', async () => {
    // 環境変数設定
    process.env.X_USERNAME = 'rnrnstar';
    process.env.X_PASSWORD = 'Rinstar_520';
    process.env.X_EMAIL = 'suzumura@rnrnstar.com';
    process.env.X_PROXY = 'http://etilmzge:ina8vl2juf1w@23.95.150.145:6114';
    process.env.KAITO_API_TOKEN = 'test_token';

    const authManager = new AuthManager();
    
    expect(authManager.isApiKeyValid()).toBe(true);
    
    // 環境変数が正しく読み込まれていることを確認
    const debugInfo = authManager.getDebugInfo();
    expect(debugInfo.hasApiKey).toBe(true);
  });
});
```

### Phase 5-B: API仕様統合テスト

#### tests/integration/api-specification.test.ts（新規作成）
```typescript
/**
 * 新API仕様統合テスト
 * TASK-002の実装内容を検証
 */

describe('API Specification Integration Test', () => {
  let authManager: AuthManager;
  let actionEndpoints: ActionEndpoints;

  beforeEach(() => {
    // テスト環境設定
    process.env.X_USERNAME = 'test_user';
    process.env.X_PASSWORD = 'test_pass';
    process.env.X_EMAIL = 'test@example.com';
    process.env.X_PROXY = 'http://proxy:port';
    process.env.KAITO_API_TOKEN = 'test_token';

    authManager = new AuthManager();
    actionEndpoints = new ActionEndpoints(mockHttpClient, authManager);
  });

  test('should use user_login_v2 endpoint', async () => {
    // モックHTTPクライアント設定
    const mockResponse = {
      success: true,
      login_cookie: 'test_cookie_12345',
      user_info: { id: '123', username: 'test_user' }
    };

    mockHttpClient.post.mockResolvedValue(mockResponse);

    // ログイン実行
    const result = await authManager.login();

    // 新API仕様のエンドポイントが使用されることを確認
    expect(mockHttpClient.post).toHaveBeenCalledWith(
      'https://api.twitterapi.io/twitter/user_login_v2',
      expect.objectContaining({
        username: 'test_user',
        email: 'test@example.com',
        password: 'test_pass',
        proxy: 'http://proxy:port'
      })
    );

    expect(result.success).toBe(true);
    expect(result.login_cookie).toBe('test_cookie_12345');
  });

  test('should use create_tweet_v2 endpoint for posting', async () => {
    // ログイン状態を設定
    await authManager.login();

    const mockPostResponse = {
      success: true,
      data: {
        id: '1234567890',
        text: 'Test tweet',
        created_at: '2025-07-28T18:40:00.000Z'
      }
    };

    mockHttpClient.post.mockResolvedValue(mockPostResponse);

    // 投稿実行
    const result = await actionEndpoints.createPost({
      content: 'Test tweet content'
    });

    // 新API仕様のエンドポイントが使用されることを確認
    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/twitter/create_tweet_v2',
      expect.objectContaining({
        text: 'Test tweet content',
        login_cookie: 'test_cookie_12345'
      })
    );

    expect(result.success).toBe(true);
    expect(result.tweetId).toBe('1234567890');
  });
});
```

### Phase 5-C: ワークフロー統合テスト

#### tests/integration/workflow-integration.test.ts（新規作成）
```typescript
/**
 * メインワークフロー統合テスト
 * TASK-003, TASK-004の実装内容を検証
 */

describe('Workflow Integration Test', () => {
  let schedulerManager: SchedulerManager;
  let authManager: AuthManager;
  let sessionManager: SessionManager;

  beforeEach(() => {
    // 環境変数設定
    process.env.X_USERNAME = 'rnrnstar';
    process.env.X_PASSWORD = 'Rinstar_520';
    process.env.X_EMAIL = 'suzumura@rnrnstar.com';
    process.env.X_PROXY = 'http://etilmzge:ina8vl2juf1w@23.95.150.145:6114';
    process.env.KAITO_API_TOKEN = 'test_token';

    schedulerManager = new SchedulerManager();
    authManager = new AuthManager();
    sessionManager = new SessionManager();
  });

  test('should initialize system with automatic login', async () => {
    // システム初期化テスト
    const initResult = await initializeSystem();

    expect(initResult.success).toBe(true);
    expect(authManager.isUserSessionValid()).toBe(true);
    
    const sessionInfo = sessionManager.getSessionInfo();
    expect(sessionInfo).not.toBeNull();
    expect(sessionInfo?.login_cookie).toBeDefined();
  });

  test('should execute main loop with session validation', async () => {
    // メインループ実行テスト
    await initializeSystem();

    const loopResult = await schedulerManager.executeMainLoop();

    expect(loopResult.success).toBe(true);
    expect(loopResult.actions_executed).toBeGreaterThan(0);
    
    // セッション状態が維持されていることを確認
    expect(authManager.isUserSessionValid()).toBe(true);
  });

  test('should handle session expiry and re-login', async () => {
    // セッション期限切れテスト
    await initializeSystem();

    // セッション期限を強制的に切らす
    sessionManager.clearSession();
    expect(authManager.isUserSessionValid()).toBe(false);

    // メインループ実行で自動再ログインされることを確認
    const loopResult = await schedulerManager.executeMainLoop();

    expect(loopResult.success).toBe(true);
    expect(authManager.isUserSessionValid()).toBe(true);
  });

  test('should execute real posting without mock', async () => {
    // 実投稿テスト（モック投稿無効化確認）
    await initializeSystem();

    const decision: ClaudeDecision = {
      action: 'post',
      reasoning: 'Test posting',
      parameters: {
        content: '投資教育テスト投稿'
      },
      confidence: 0.9
    };

    const actionExecutor = new ActionExecutor();
    const result = await actionExecutor.executeAction(decision);

    // モック投稿ではなく実投稿が実行されることを確認
    expect(result.success).toBe(true);
    expect(result.action).toBe('post');
    expect(result.tweetId).toBeDefined();
    expect(result.mock_execution).toBeUndefined(); // モック実行フラグがないことを確認
  });
});
```

## 📋 実装ステップ

### Step 1: テスト環境セットアップ
1. 統合テスト用の環境変数設定
2. モックHTTPクライアントの準備
3. テストデータベースまたはファイルシステムの準備

### Step 2: 単体機能テスト
1. 環境変数検証テスト実装
2. API仕様対応テスト実装
3. セッション管理テスト実装

### Step 3: 統合機能テスト
1. システム初期化テスト実装
2. メインワークフロー実行テスト実装
3. エラーハンドリングテスト実装

### Step 4: 品質検証
1. TypeScriptコンパイル確認
2. Lintチェック実行
3. テストカバレッジ確認

## ✅ 完了条件
- [ ] 全ての統合テストが正常に通過する
- [ ] 環境変数検証システムが動作する
- [ ] 新API仕様が正しく使用される
- [ ] セッション管理が適切に動作する
- [ ] モック投稿が無効化されている
- [ ] TypeScriptコンパイルエラーなし
- [ ] npm run lint 通過
- [ ] テストカバレッジ85%以上

## 🚫 制約・注意事項
- **テスト分離**: 各テストが独立して実行される
- **セキュリティ**: テスト用の認証情報の適切な管理
- **MVP制約**: 必要最小限のテストのみ実装
- **実API**: 統合テストは実APIを使用しない（モック使用）

## ⚠️ 重要な検証ポイント
- **全フェーズ統合**: Phase 1-2の実装が正しく統合される
- **エラー処理**: 各種エラーケースが適切に処理される
- **パフォーマンス**: 30分間隔実行に影響しない
- **セキュリティ**: 認証情報が適切に保護される

## 📄 報告書要件
完了後、以下を含む報告書を作成：
- 統合テスト結果の詳細
- 発見された問題と解決方法
- システム全体の動作確認結果
- Phase 3での最終確認事項

## 📁 出力先
- 報告書: `tasks/20250728_184021_kaito_login_integration/reports/REPORT-005-integration-testing-verification.md`
- テスト結果: `tasks/20250728_184021_kaito_login_integration/outputs/test-results/`配下
- 実装ログ: `tasks/20250728_184021_kaito_login_integration/outputs/`配下