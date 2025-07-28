/**
 * TwitterAPI.io 認証管理システム
 * 
 * TwitterAPI.io認証仕様:
 * - Bearer Token Authentication (API Keyベース)
 * - 全エンドポイントでBearer Token必須
 * - User Sessionはユーザーアクション系のみ必須
 * 
 * REQUIREMENTS.md準拠 - MVP実装
 */

import type { LoginCredentials, LoginResult, AuthStatus } from '../types';

// TwitterAPI.io認証状態管理型
interface TwitterAPIAuthState {
  authenticated: boolean;
  hasValidBearerToken: boolean;
  hasValidUserSession: boolean;
  canPerformActions: boolean;
  lastAuthCheck: number;
}

export class AuthManager {
  private apiKey: string;
  private userSession: string | null = null;
  private sessionExpiry: number | null = null;

  constructor(config?: { apiKey?: string }) {
    this.apiKey = config?.apiKey || process.env.KAITO_API_TOKEN || '';
    if (!this.apiKey) {
      throw new Error('KAITO_API_TOKEN is required');
    }
  }

  // ============================================================================
  // Phase 1: 基本認証管理
  // ============================================================================

  /**
   * TwitterAPI.io Bearer Token認証ヘッダー生成
   */
  getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * User Session認証パラメータ生成
   */
  getAuthParameters(): Record<string, any> {
    const params: Record<string, any> = {};
    if (this.userSession) {
      params.auth_session = this.userSession;
    }
    return params;
  }

  /**
   * TwitterAPI.io API Key有効性確認
   */
  isApiKeyValid(): boolean {
    return this.apiKey !== null && this.apiKey.trim() !== '' && this.apiKey.length > 10;
  }

  /**
   * TwitterAPI.io Bearer Tokenフォーマット確認
   */
  validateBearerToken(): boolean {
    if (!this.isApiKeyValid()) {
      return false;
    }
    
    // TwitterAPI.ioのAPI Keyは通常英数字と一部記号で構成
    const tokenPattern = /^[A-Za-z0-9_-]+$/;
    return tokenPattern.test(this.apiKey);
  }

  // ============================================================================
  // Phase 2: ユーザーセッション管理
  // ============================================================================

  /**
   * TwitterAPI.ioユーザーログイン実行
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    try {
      console.log('🔐 TwitterAPI.ioユーザーログイン開始...');
      
      const response = await fetch('https://api.twitterapi.io/v1/user/login', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          username: credentials.user_name,
          email: credentials.email,
          password: credentials.password,
          totp_code: credentials.totp_secret,
          proxy: credentials.proxy
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.data?.success === true && result.data?.session_token) {
        this.userSession = result.data.session_token;
        this.sessionExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24時間

        console.log('✅ TwitterAPI.ioユーザーログイン成功');
        return {
          success: true,
          login_cookie: result.data.session_token,
          session_expires: this.sessionExpiry
        };
      }

      return {
        success: false,
        error: result.error?.message || 'Login failed'
      };
    } catch (error) {
      console.error('❌ TwitterAPI.ioユーザーログインエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login error'
      };
    }
  }

  /**
   * セッション有効性確認
   */
  isUserSessionValid(): boolean {
    return this.userSession !== null && 
           this.sessionExpiry !== null && 
           Date.now() < this.sessionExpiry;
  }

  /**
   * セッション更新（基本実装）
   */
  async refreshSession(): Promise<boolean> {
    // MVP実装: 基本的なセッション延長のみ
    if (this.userSession && this.sessionExpiry) {
      this.sessionExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24時間延長
      return true;
    }
    return false;
  }

  /**
   * ログアウト
   */
  async logout(): Promise<void> {
    this.userSession = null;
    this.sessionExpiry = null;
  }

  // ============================================================================
  // Phase 3: エンドポイント別認証判定
  // ============================================================================

  /**
   * TwitterAPI.ioエンドポイント別認証要件判定
   */
  requiresUserSession(endpoint: string): boolean {
    const userActionEndpoints = [
      '/v1/tweets',           // 投稿作成
      '/v1/tweets/:id/like',  // いいね
      '/v1/tweets/:id/retweet', // リツイート
      '/v1/users/follow',     // フォロー
      '/v1/users/unfollow',   // アンフォロー
      '/v1/tweets/:id/delete' // ツイート削除
    ];

    return userActionEndpoints.some(action => endpoint.includes(action) || endpoint.includes(action.replace('/:id', '')));
  }

  /**
   * エンドポイントアクセス可能性確認
   */
  canAccessEndpoint(endpoint: string): boolean {
    // API Key は常に必要
    if (!this.isApiKeyValid()) {
      return false;
    }

    // ユーザーアクション系の場合、User Session も必要
    if (this.requiresUserSession(endpoint)) {
      return this.isUserSessionValid();
    }

    return true;
  }

  /**
   * TwitterAPI.io統合認証状態取得
   */
  getAuthStatus(): AuthStatus {
    const apiKeyValid = this.isApiKeyValid();
    const bearerTokenValid = this.validateBearerToken();
    const userSessionValid = this.isUserSessionValid();
    
    return {
      apiKeyValid: apiKeyValid && bearerTokenValid,
      userSessionValid,
      sessionExpiry: this.sessionExpiry,
      canPerformUserActions: apiKeyValid && bearerTokenValid && userSessionValid
    };
  }

  /**
   * TwitterAPI.io認証デバッグ情報取得
   */
  getDebugInfo(): Record<string, any> {
    return {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length || 0,
      apiKeyValid: this.isApiKeyValid(),
      bearerTokenValid: this.validateBearerToken(),
      hasUserSession: !!this.userSession,
      userSessionValid: this.isUserSessionValid(),
      sessionExpiry: this.sessionExpiry,
      timeUntilExpiry: this.sessionExpiry ? this.sessionExpiry - Date.now() : null
    };
  }
}