# TASK-004: login_cookie管理システム実装

## 🎯 タスク概要
- **担当**: Worker4
- **フェーズ**: Phase 2（直列実行 - Phase 1完了後）
- **優先度**: HIGH
- **期限**: Phase 1完了次第実行

## 🔄 依存関係
- **前提**: TASK-001、TASK-002の完了必須
- **並列実行**: Worker3（TASK-003）と並行実行可能

## 🎯 実装目標
TwitterAPI.ioの`user_login_v2`で取得した`login_cookie`を適切に管理し、投稿時に使用するシステムを構築する。

## 🔧 実装要件

### Phase 4-A: Cookie管理クラス実装

#### src/kaito-api/core/session-manager.ts（新規作成）
```typescript
/**
 * TwitterAPI.io login_cookie管理システム
 * REQUIREMENTS.md準拠 - セッション管理機能
 */

interface SessionData {
  login_cookie: string;
  expires_at: number;
  created_at: number;
  user_info?: {
    username: string;
    user_id: string;
  };
}

export class SessionManager {
  private sessionData: SessionData | null = null;
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24時間

  /**
   * login_cookieを保存
   */
  saveSession(loginResult: LoginResult): void {
    if (!loginResult.success || !loginResult.login_cookie) {
      throw new Error('Invalid login result for session save');
    }

    this.sessionData = {
      login_cookie: loginResult.login_cookie,
      expires_at: Date.now() + this.SESSION_DURATION,
      created_at: Date.now(),
      user_info: {
        username: process.env.X_USERNAME || 'unknown',
        user_id: 'extracted_from_login_response'
      }
    };

    console.log('✅ Session saved successfully');
    console.log(`🕐 Session expires at: ${new Date(this.sessionData.expires_at).toISOString()}`);
  }

  /**
   * 有効な login_cookie を取得
   */
  getValidCookie(): string | null {
    if (!this.sessionData) {
      console.log('❌ No session data available');
      return null;
    }

    if (Date.now() > this.sessionData.expires_at) {
      console.log('⏰ Session expired, clearing data');
      this.sessionData = null;
      return null;
    }

    return this.sessionData.login_cookie;
  }

  /**
   * セッション有効性確認
   */
  isSessionValid(): boolean {
    return this.getValidCookie() !== null;
  }

  /**
   * セッション情報取得
   */
  getSessionInfo(): SessionData | null {
    if (!this.isSessionValid()) {
      return null;
    }
    return { ...this.sessionData! };
  }

  /**
   * セッションクリア
   */
  clearSession(): void {
    this.sessionData = null;
    console.log('🧹 Session cleared');
  }

  /**
   * セッション統計取得
   */
  getSessionStats(): {
    hasSession: boolean;
    timeRemaining: number;
    expiresAt: string | null;
  } {
    if (!this.sessionData) {
      return {
        hasSession: false,
        timeRemaining: 0,
        expiresAt: null
      };
    }

    const timeRemaining = Math.max(0, this.sessionData.expires_at - Date.now());
    
    return {
      hasSession: true,
      timeRemaining,
      expiresAt: new Date(this.sessionData.expires_at).toISOString()
    };
  }
}
```

### Phase 4-B: AuthManager統合

#### auth-manager.ts修正
```typescript
import { SessionManager } from './session-manager';

export class AuthManager {
  private sessionManager: SessionManager;

  constructor(config?: { apiKey?: string }) {
    // 既存のコンストラクタ
    this.sessionManager = new SessionManager();
  }

  async login(): Promise<LoginResult> {
    try {
      // 既存のログイン処理...
      const result = await response.json();

      if (result.success && result.login_cookie) {
        // SessionManager を使用してcookie保存
        const loginResult = {
          success: true,
          login_cookie: result.login_cookie,
          session_expires: Date.now() + (24 * 60 * 60 * 1000)
        };
        
        this.sessionManager.saveSession(loginResult);
        return loginResult;
      }

      return {
        success: false,
        error: result.error?.message || 'Login failed'
      };
    } catch (error) {
      console.error('❌ ログインエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login error'
      };
    }
  }

  /**
   * 有効なセッション取得
   */
  getUserSession(): string | null {
    return this.sessionManager.getValidCookie();
  }

  /**
   * セッション有効性確認（既存メソッド更新）
   */
  isUserSessionValid(): boolean {
    return this.sessionManager.isSessionValid();
  }
}
```

### Phase 4-C: ActionEndpoints統合

#### action-endpoints.ts修正
```typescript
export class ActionEndpoints {
  private authManager: AuthManager;

  constructor(private httpClient: HttpClient, authManager: AuthManager) {
    this.authManager = authManager;
    console.log('✅ ActionEndpoints initialized with AuthManager integration');
  }

  async createPost(request: PostRequest): Promise<PostResponse> {
    // バリデーション...

    try {
      // login_cookie取得
      const loginCookie = this.authManager.getUserSession();
      if (!loginCookie) {
        return {
          success: false,
          error: 'No valid login session available'
        };
      }

      console.log('📝 Creating post with login_cookie...');
      
      const response = await this.httpClient.post<TwitterAPITweetResponse>(
        this.ENDPOINTS.createTweet, // /twitter/create_tweet_v2
        {
          text: sanitizedContent,
          login_cookie: loginCookie,  // 追加
          ...(request.mediaIds && { media_ids: request.mediaIds })
        }
      );

      return {
        success: true,
        tweetId: response.data.id,
        createdAt: response.data.created_at
      };
    } catch (error) {
      return this.handleActionError(error, 'createPost');
    }
  }
}
```

## 📋 実装ステップ

### Step 1: SessionManager実装
1. `src/kaito-api/core/session-manager.ts`新規作成
2. login_cookie保存・取得・検証機能
3. セッション期限管理機能
4. 統計・デバッグ情報提供機能

### Step 2: AuthManager統合
1. SessionManagerインスタンス追加
2. `login()`メソッドでのセッション保存
3. `getUserSession()`メソッド実装
4. 既存メソッドの更新

### Step 3: ActionEndpoints統合
1. AuthManagerインスタンス受け取り
2. 投稿時のlogin_cookie使用
3. セッション無効時のエラーハンドリング

### Step 4: 型定義更新
1. `SessionData`型定義
2. `LoginResult`型の拡張
3. エラー型の追加

## ✅ 完了条件
- [ ] SessionManagerクラスが適切に実装される
- [ ] AuthManagerがSessionManagerを使用する
- [ ] ActionEndpointsが投稿時にlogin_cookieを使用する
- [ ] セッション期限切れが適切に検出される
- [ ] TypeScriptコンパイルエラーなし
- [ ] npm run lint 通過

## 🚫 制約・注意事項
- **セキュリティ**: login_cookieの平文ログ出力禁止
- **メモリ管理**: セッションデータの適切なクリア
- **MVP制約**: 永続化機能は実装しない（メモリ管理のみ）
- **エラー処理**: セッション関連エラーの適切な処理

## ⚠️ 重要な統合ポイント
- **TASK-002**: 新API仕様のlogin_cookie形式に準拠
- **TASK-003**: メインワークフローでのセッション確認
- **後続テスト**: Phase 3での統合テストで使用

## 📄 報告書要件
完了後、以下を含む報告書を作成：
- SessionManagerの実装詳細
- AuthManagerとActionEndpointsの統合方法
- login_cookie管理フローの説明
- セキュリティ考慮事項

## 📁 出力先
- 報告書: `tasks/20250728_184021_kaito_login_integration/reports/REPORT-004-login-cookie-management-system.md`
- 実装ログ: `tasks/20250728_184021_kaito_login_integration/outputs/`配下

## 🔄 実行タイミング
- **開始条件**: TASK-001、TASK-002の完了確認後
- **並列実行**: TASK-003と並行実行可能
- **完了判定**: login_cookieが投稿時に正しく使用される