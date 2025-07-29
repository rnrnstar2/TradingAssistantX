# TASK-006: 実投稿テスト・問題解決

## 🎯 タスク概要
- **担当**: Worker6
- **フェーズ**: Phase 3（並列実行 - Phase 2完了後）
- **優先度**: CRITICAL
- **期限**: Phase 2完了次第実行

## 🔄 依存関係
- **前提**: TASK-001, TASK-002, TASK-003, TASK-004の完了必須
- **並列実行**: Worker5（TASK-005）と並行実行可能

## 🎯 実投稿目標
**実際のXアカウント（rnrnstar）への投稿成功**を最終目標とし、問題解決とトラブルシューティングを実行する。

## 🧪 実投稿テスト要件

### Phase 6-A: 実投稿テストシステム

#### tests/real-api/posting-verification.test.ts（新規作成）
```typescript
/**
 * 実投稿テスト・検証システム
 * 実際のTwitterAPI.ioを使用した投稿テスト
 */

describe('Real Posting Verification Test', () => {
  let authManager: AuthManager;
  let actionEndpoints: ActionEndpoints;
  let realHttpClient: HttpClient;

  beforeAll(async () => {
    // 実環境設定確認
    const requiredEnvVars = ['X_USERNAME', 'X_PASSWORD', 'X_EMAIL', 'X_PROXY', 'KAITO_API_TOKEN'];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Environment variable ${envVar} is required for real posting test`);
      }
    }

    console.log('🚀 Real posting test initialization...');
    console.log(`📧 X_EMAIL: ${process.env.X_EMAIL}`);
    console.log(`👤 X_USERNAME: ${process.env.X_USERNAME}`);
    console.log(`🔗 X_PROXY: ${process.env.X_PROXY?.substring(0, 20)}...`);

    // 実HTTPクライアント使用
    realHttpClient = new HttpClient({ apiKey: process.env.KAITO_API_TOKEN });
    authManager = new AuthManager();
    actionEndpoints = new ActionEndpoints(realHttpClient, authManager);
  });

  test('should successfully login with real credentials', async () => {
    console.log('🔐 Testing real login...');
    
    const loginResult = await authManager.login();
    
    console.log('Login result:', {
      success: loginResult.success,
      hasLoginCookie: !!loginResult.login_cookie,
      error: loginResult.error
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.login_cookie).toBeDefined();
    expect(loginResult.login_cookie).not.toBe('');
    
    // セッション状態確認
    expect(authManager.isUserSessionValid()).toBe(true);
    expect(authManager.getUserSession()).toBe(loginResult.login_cookie);
  });

  test('should successfully post to real X account', async () => {
    console.log('📝 Testing real posting...');
    
    // ログイン実行
    const loginResult = await authManager.login();
    expect(loginResult.success).toBe(true);
    
    // テスト投稿内容
    const testContent = `📊 TradingAssistantX テスト投稿 ${new Date().toISOString()}\n\n投資・トレードの自動化システムが正常に動作しています。\n\n#投資教育 #TradingAssistant #自動投稿テスト`;
    
    console.log('投稿内容:', testContent.substring(0, 50) + '...');
    
    // 実投稿実行
    const postResult = await actionEndpoints.createPost({
      content: testContent
    });
    
    console.log('Post result:', {
      success: postResult.success,
      tweetId: postResult.tweetId,
      error: postResult.error
    });
    
    expect(postResult.success).toBe(true);
    expect(postResult.tweetId).toBeDefined();
    expect(postResult.tweetId).toMatch(/^\d+$/); // Twitter ID format
    
    // 投稿確認用にIDをログ出力
    if (postResult.tweetId) {
      console.log(`✅ 投稿成功！ツイートID: ${postResult.tweetId}`);
      console.log(`🔗 確認URL: https://twitter.com/rnrnstar/status/${postResult.tweetId}`);
    }
  });

  test('should handle API errors gracefully', async () => {
    console.log('❌ Testing error handling...');
    
    // 不正なコンテンツでエラーテスト
    const invalidContent = ''; // 空文字列
    
    const postResult = await actionEndpoints.createPost({
      content: invalidContent
    });
    
    expect(postResult.success).toBe(false);
    expect(postResult.error).toBeDefined();
    
    console.log('Expected error:', postResult.error);
  });
});
```

### Phase 6-B: トラブルシューティングシステム

#### src/utils/troubleshooting.ts（新規作成）
```typescript
/**
 * トラブルシューティング・問題診断システム
 */

interface DiagnosticResult {
  category: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export class TroubleshootingManager {
  
  /**
   * 環境変数診断
   */
  async diagnoseEnvironmentVariables(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    const requiredVars = [
      { name: 'KAITO_API_TOKEN', description: 'TwitterAPI.io API Key' },
      { name: 'X_USERNAME', description: 'Twitter Username' },
      { name: 'X_PASSWORD', description: 'Twitter Password' },
      { name: 'X_EMAIL', description: 'Twitter Email' },
      { name: 'X_PROXY', description: 'Proxy Configuration' }
    ];
    
    for (const envVar of requiredVars) {
      const value = process.env[envVar.name];
      
      if (!value) {
        results.push({
          category: 'Environment',
          status: 'error',
          message: `❌ ${envVar.name} is not set`,
          details: { description: envVar.description }
        });
      } else if (value.length < 5) {
        results.push({
          category: 'Environment',
          status: 'warning',
          message: `⚠️  ${envVar.name} seems too short`,
          details: { length: value.length }
        });
      } else {
        results.push({
          category: 'Environment',
          status: 'success',
          message: `✅ ${envVar.name} is set correctly`,
          details: { description: envVar.description }
        });
      }
    }
    
    return results;
  }
  
  /**
   * API接続診断
   */
  async diagnoseAPIConnection(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    try {
      // API基本接続テスト
      const response = await fetch('https://api.twitterapi.io/health', {
        method: 'GET',
        headers: {
          'x-api-key': process.env.KAITO_API_TOKEN || ''
        }
      });
      
      if (response.ok) {
        results.push({
          category: 'API Connection',
          status: 'success',
          message: '✅ TwitterAPI.io connection successful',
          details: { status: response.status }
        });
      } else {
        results.push({
          category: 'API Connection',
          status: 'error',
          message: `❌ TwitterAPI.io connection failed: ${response.status}`,
          details: { status: response.status, statusText: response.statusText }
        });
      }
    } catch (error) {
      results.push({
        category: 'API Connection',
        status: 'error',
        message: `❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      });
    }
    
    return results;
  }
  
  /**
   * ログイン診断
   */
  async diagnoseLogin(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    try {
      const authManager = new AuthManager();
      const loginResult = await authManager.login();
      
      if (loginResult.success) {
        results.push({
          category: 'Login',
          status: 'success',
          message: '✅ Login successful',
          details: { 
            hasLoginCookie: !!loginResult.login_cookie,
            sessionExpires: loginResult.session_expires
          }
        });
      } else {
        results.push({
          category: 'Login',
          status: 'error',
          message: `❌ Login failed: ${loginResult.error}`,
          details: { error: loginResult.error }
        });
      }
    } catch (error) {
      results.push({
        category: 'Login',
        status: 'error',
        message: `❌ Login error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      });
    }
    
    return results;
  }
  
  /**
   * 総合診断実行
   */
  async runFullDiagnostic(): Promise<DiagnosticResult[]> {
    console.log('🔍 Running full system diagnostic...');
    
    const allResults: DiagnosticResult[] = [];
    
    // 環境変数診断
    const envResults = await this.diagnoseEnvironmentVariables();
    allResults.push(...envResults);
    
    // API接続診断
    const apiResults = await this.diagnoseAPIConnection();
    allResults.push(...apiResults);
    
    // ログイン診断
    const loginResults = await this.diagnoseLogin();
    allResults.push(...loginResults);
    
    // 結果サマリー
    const successCount = allResults.filter(r => r.status === 'success').length;
    const warningCount = allResults.filter(r => r.status === 'warning').length;
    const errorCount = allResults.filter(r => r.status === 'error').length;
    
    console.log(`📊 Diagnostic Summary: ${successCount} success, ${warningCount} warnings, ${errorCount} errors`);
    
    return allResults;
  }
}
```

### Phase 6-C: 問題解決ガイド

#### 一般的な問題と解決方法
```typescript
/**
 * 問題解決ガイド・トラブルシューティング手順
 */

const TROUBLESHOOTING_GUIDE = {
  
  // 環境変数関連
  'MISSING_ENV_VARS': {
    problem: '必須環境変数が未設定',
    solution: [
      '1. .env ファイルを作成',
      '2. 以下の環境変数を設定:',
      '   X_USERNAME=rnrnstar',
      '   X_PASSWORD=Rinstar_520',
      '   X_EMAIL=suzumura@rnrnstar.com',
      '   X_PROXY=http://etilmzge:ina8vl2juf1w@23.95.150.145:6114',
      '   KAITO_API_TOKEN=your_api_key',
      '3. システム再起動'
    ]
  },
  
  // API接続関連
  'API_CONNECTION_FAILED': {
    problem: 'TwitterAPI.io への接続が失敗',
    solution: [
      '1. KAITO_API_TOKEN の有効性確認',
      '2. プロキシ設定の確認 (X_PROXY)',
      '3. ネットワーク接続の確認',
      '4. TwitterAPI.io サービス状況確認'
    ]
  },
  
  // ログイン関連
  'LOGIN_FAILED': {
    problem: 'user_login_v2 でのログインが失敗',
    solution: [
      '1. X_USERNAME, X_PASSWORD, X_EMAIL の正確性確認',
      '2. プロキシ設定の確認',
      '3. アカウントロック状況の確認',
      '4. API使用制限の確認'
    ]
  },
  
  // 投稿関連
  'POSTING_FAILED': {
    problem: 'create_tweet_v2 での投稿が失敗',
    solution: [
      '1. login_cookie の有効性確認',
      '2. 投稿内容の確認（文字数制限等）',
      '3. セッション期限切れの確認',
      '4. アカウント凍結状況の確認'
    ]
  }
};
```

## 📋 実装ステップ

### Step 1: 実投稿テスト環境
1. 実環境での環境変数設定確認
2. 実API接続テストシステム構築
3. テスト投稿用のコンテンツ準備

### Step 2: 診断システム実装
1. TroubleshootingManagerクラス実装
2. 各種診断メソッドの実装
3. 問題解決ガイドの整備

### Step 3: 実投稿テスト実行
1. 段階的テスト実行
2. 問題発見と解決の繰り返し
3. 成功確認とドキュメント化

### Step 4: 継続動作確認
1. 30分間隔での連続投稿テスト
2. セッション管理の動作確認
3. エラー回復機能の確認

## ✅ 完了条件
- [ ] 実際のXアカウントへの投稿が成功する
- [ ] 診断システムがすべて正常を示す
- [ ] 30分間隔の連続動作が確認される
- [ ] エラー時の自動回復が機能する
- [ ] 全ての問題が解決される

## 🚫 制約・注意事項
- **実アカウント使用**: rnrnstarアカウントへの実投稿
- **API使用制限**: TwitterAPI.ioの使用制限に注意
- **投稿内容**: 適切な投資教育コンテンツのみ
- **セキュリティ**: 認証情報の適切な管理

## ⚠️ 重要な確認ポイント
- **投稿成功**: Xアカウントに実際に投稿されることを確認
- **問題解決**: 発見されたすべての問題を解決
- **継続動作**: システムが継続的に動作することを確認
- **品質保証**: 投稿内容の品質を確保

## 📄 報告書要件
完了後、以下を含む報告書を作成：
- 実投稿テスト結果の詳細
- 発見された問題と解決方法の記録
- トラブルシューティングシステムの説明
- 最終的なシステム状態の確認

## 📁 出力先
- 報告書: `tasks/20250728_184021_kaito_login_integration/reports/REPORT-006-real-posting-test-troubleshooting.md`
- テスト結果: `tasks/20250728_184021_kaito_login_integration/outputs/real-test-results/`配下
- 診断ログ: `tasks/20250728_184021_kaito_login_integration/outputs/diagnostic-logs/`配下

## 🎯 最終目標
**rnrnstarアカウントに投資教育コンテンツが正常に投稿され、システムが継続的に動作すること**