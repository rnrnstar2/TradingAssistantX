/**
 * TwitterAPI.io 3層認証統合管理システム
 * 
 * 認証レベル:
 * 1. APIキー認証 - 読み取り専用操作
 * 2. V1ログイン認証 - 2段階認証（非推奨）
 * 3. V2ログイン認証 - 1段階認証（推奨）
 * 
 * REQUIREMENTS.md準拠 - MVP実装
 * TASK-001対応 - 3層認証アーキテクチャ
 */

import type { LoginCredentials, LoginResult, AuthStatus, UserLoginV2Response } from '../types';
import { validateEnvironmentVariables } from './config';
import { SessionManager } from './session-manager';
import { APIKeyAuth } from './api-key-auth';
import { V1LoginAuth } from './v1-login-auth';
import { V2LoginAuth } from './v2-login-auth';

// TwitterAPI.io 3層認証状態管理型
interface TwitterAPIAuthState {
  authenticated: boolean;
  authLevel: 'none' | 'api-key' | 'v1-login' | 'v2-login';
  apiKeyValid: boolean;
  v1SessionValid: boolean;
  v2SessionValid: boolean;
  canPerformReadOperations: boolean;
  canPerformWriteOperations: boolean;
  lastAuthCheck: number;
  activeAuthMethod: string;
}

export class AuthManager {
  private apiKeyAuth: APIKeyAuth;
  private v1LoginAuth: V1LoginAuth;
  private v2LoginAuth: V2LoginAuth;
  private sessionManager: SessionManager;
  private currentAuthLevel: 'none' | 'api-key' | 'v1-login' | 'v2-login' = 'none';
  private preferredAuthMethod: 'v1' | 'v2' = 'v2'; // V2を推奨

  // 後方互換性のための従来プロパティ
  private apiKey: string;
  private userSession: string | null = null;
  private sessionExpiry: number | null = null;

  constructor(config?: { apiKey?: string; preferredAuthMethod?: 'v1' | 'v2' }) {
    this.apiKey = config?.apiKey || process.env.KAITO_API_TOKEN || '';
    if (!this.apiKey) {
      throw new Error('KAITO_API_TOKEN is required');
    }
    
    // 3層認証システム初期化
    this.apiKeyAuth = new APIKeyAuth(this.apiKey);
    this.v1LoginAuth = new V1LoginAuth(this.apiKey);
    this.v2LoginAuth = new V2LoginAuth(this.apiKey);
    this.sessionManager = new SessionManager();
    
    // 設定
    this.preferredAuthMethod = config?.preferredAuthMethod || 'v2';
    
    console.log(`✅ AuthManager初期化完了 - 3層認証対応（推奨: ${this.preferredAuthMethod.toUpperCase()}）`);
  }

  // ============================================================================
  // Phase 1: 3層認証統合管理
  // ============================================================================

  /**
   * 認証レベル自動判定・ヘッダー生成
   * TASK-001対応: 3層認証アーキテクチャ
   */
  getAuthHeaders(): Record<string, string> {
    // 最高レベルの有効認証を使用
    if (this.v2LoginAuth.isSessionValid()) {
      this.currentAuthLevel = 'v2-login';
      return this.v2LoginAuth.getAuthHeaders();
    } else if (this.v1LoginAuth.isSessionValid()) {
      this.currentAuthLevel = 'v1-login';
      return this.v1LoginAuth.getAuthHeaders();
    } else if (this.apiKeyAuth.isValidFormat()) {
      this.currentAuthLevel = 'api-key';
      return this.apiKeyAuth.getAuthHeaders();
    }
    
    // フォールバック: 基本APIキー認証
    this.currentAuthLevel = 'api-key';
    return this.apiKeyAuth.getAuthHeaders();
  }

  /**
   * 認証レベル別パラメータ生成
   * TASK-001対応: 3層認証対応
   */
  getAuthParameters(): Record<string, any> {
    // 最高レベルの有効認証を使用
    if (this.v2LoginAuth.isSessionValid()) {
      return this.v2LoginAuth.getAuthParameters();
    } else if (this.v1LoginAuth.isSessionValid()) {
      return this.v1LoginAuth.getAuthParameters();
    }
    
    // APIキー認証の場合は空のパラメータ
    return {};
  }

  /**
   * APIキー有効性確認（3層認証対応）
   * TASK-001対応: APIKeyAuthクラス使用
   */
  isApiKeyValid(): boolean {
    return this.apiKeyAuth.isValidFormat();
  }

  /**
   * APIキー形式確認（後方互換性）
   */
  validateBearerToken(): boolean {
    return this.apiKeyAuth.validateApiKey();
  }

  /**
   * 3層認証レベル別有効性確認
   */
  getValidAuthLevels(): string[] {
    const validLevels: string[] = [];
    
    if (this.apiKeyAuth.isValidFormat()) {
      validLevels.push('api-key');
    }
    
    if (this.v1LoginAuth.isSessionValid()) {
      validLevels.push('v1-login');
    }
    
    if (this.v2LoginAuth.isSessionValid()) {
      validLevels.push('v2-login');
    }
    
    return validLevels;
  }

  // ============================================================================
  // Phase 2: 3層ユーザー認証統合管理
  // ============================================================================

  /**
   * 統合ログイン実行（推奨認証方法を使用）
   * TASK-001対応: 3層認証自動切り替え
   */
  async login(): Promise<LoginResult> {
    try {
      console.log(`🔐 統合ログイン開始（推奨: ${this.preferredAuthMethod.toUpperCase()}）...`);

      // 推奨認証方法を先に試行
      let loginResult: LoginResult;
      
      if (this.preferredAuthMethod === 'v2') {
        loginResult = await this.v2LoginAuth.login();
        if (loginResult.success) {
          this.currentAuthLevel = 'v2-login';
          // 後方互換性のため従来プロパティも更新
          this.userSession = loginResult.login_cookie || null;
          this.sessionExpiry = loginResult.session_expires || null;
          console.log('✅ V2ログイン成功');
          return loginResult;
        }
        
        console.log('⚠️ V2ログイン失敗、V1にフォールバック...');
        loginResult = await this.v1LoginAuth.login();
        if (loginResult.success) {
          this.currentAuthLevel = 'v1-login';
          this.userSession = loginResult.auth_session || null;
          this.sessionExpiry = loginResult.session_expires || null;
          console.log('✅ V1ログイン成功（フォールバック）');
          return loginResult;
        }
      } else {
        // V1を先に試行
        loginResult = await this.v1LoginAuth.login();
        if (loginResult.success) {
          this.currentAuthLevel = 'v1-login';
          this.userSession = loginResult.auth_session || null;
          this.sessionExpiry = loginResult.session_expires || null;
          console.log('✅ V1ログイン成功');
          return loginResult;
        }
        
        console.log('⚠️ V1ログイン失敗、V2にフォールバック...');
        loginResult = await this.v2LoginAuth.login();
        if (loginResult.success) {
          this.currentAuthLevel = 'v2-login';
          this.userSession = loginResult.login_cookie || null;
          this.sessionExpiry = loginResult.session_expires || null;
          console.log('✅ V2ログイン成功（フォールバック）');
          return loginResult;
        }
      }

      console.log('❌ 全ての認証方法が失敗');
      return {
        success: false,
        error: 'All login methods failed'
      };

    } catch (error) {
      console.error('❌ 統合ログインエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Integrated login error'
      };
    }
  }

  /**
   * V2ログイン実行（直接指定）
   */
  async loginV2(): Promise<LoginResult> {
    const result = await this.v2LoginAuth.login();
    if (result.success) {
      this.currentAuthLevel = 'v2-login';
      this.userSession = result.login_cookie || null;
      this.sessionExpiry = result.session_expires || null;
    }
    return result;
  }

  /**
   * V1ログイン実行（直接指定）
   */
  async loginV1(): Promise<LoginResult> {
    const result = await this.v1LoginAuth.login();
    if (result.success) {
      this.currentAuthLevel = 'v1-login';
      this.userSession = result.auth_session || null;
      this.sessionExpiry = result.session_expires || null;
    }
    return result;
  }

  /**
   * セッション有効性確認（3層認証統合）
   * TASK-001対応: 統合セッション管理
   */
  isUserSessionValid(): boolean {
    // 最高レベルの有効セッションをチェック
    return this.v2LoginAuth.isSessionValid() || 
           this.v1LoginAuth.isSessionValid() || 
           this.sessionManager.isSessionValid();
  }

  /**
   * セッション更新（3層認証対応）
   */
  async refreshSession(): Promise<boolean> {
    try {
      // V2セッションが有効な場合
      if (this.v2LoginAuth.isSessionValid()) {
        return await this.v2LoginAuth.refreshSession();
      }
      
      // V1セッションが有効な場合
      if (this.v1LoginAuth.isSessionValid()) {
        // V1は自動更新不可のため再ログイン
        const result = await this.v1LoginAuth.login();
        return result.success;
      }
      
      // セッションが無効な場合は再ログイン
      const loginResult = await this.login();
      return loginResult.success;
      
    } catch (error) {
      console.error('❌ セッション更新エラー:', error);
      return false;
    }
  }

  /**
   * 有効なセッション取得（統合）
   */
  getUserSession(): string | null {
    // 最高レベルの有効セッションを取得
    if (this.v2LoginAuth.isSessionValid()) {
      return this.v2LoginAuth.getLoginCookie();
    } else if (this.v1LoginAuth.isSessionValid()) {
      return this.v1LoginAuth.getAuthSession();
    } else {
      return this.sessionManager.getValidCookie();
    }
  }

  /**
   * 統合ログアウト
   */
  async logout(): Promise<void> {
    // 全ての認証レベルでログアウト
    await this.v2LoginAuth.logout();
    this.v1LoginAuth.logout();
    this.sessionManager.clearSession();
    
    // 従来プロパティもクリア
    this.userSession = null;
    this.sessionExpiry = null;
    this.currentAuthLevel = 'none';
    
    console.log('🚪 統合認証ログアウト完了');
  }

  // ============================================================================
  // Phase 3: 3層認証別エンドポイント判定
  // ============================================================================

  /**
   * エンドポイント別認証レベル要件判定
   * TASK-001対応: 3層認証別要件
   */
  getRequiredAuthLevel(endpoint: string): 'api-key' | 'v1-login' | 'v2-login' {
    // 書き込み系操作（ログイン認証必須）
    const writeEndpoints = [
      '/twitter/tweet/create',    // 投稿作成
      '/twitter/action/like',     // いいね
      '/twitter/action/retweet',  // リツイート
      '/twitter/action/quote',    // 引用ツイート
      '/twitter/user/follow',     // フォロー
      '/twitter/user/unfollow',   // アンフォロー
      '/twitter/tweet/delete'     // ツイート削除
    ];

    const isWriteOperation = writeEndpoints.some(writeEndpoint => 
      endpoint.includes(writeEndpoint)
    );

    // 書き込み操作にはログイン認証が必要
    if (isWriteOperation) {
      return this.preferredAuthMethod === 'v1' ? 'v1-login' : 'v2-login';
    }

    // 読み取り専用操作はAPIキー認証で十分
    return 'api-key';
  }

  /**
   * 従来互換性メソッド
   */
  requiresUserSession(endpoint: string): boolean {
    return this.getRequiredAuthLevel(endpoint) !== 'api-key';
  }

  /**
   * エンドポイントアクセス可能性確認（3層認証対応）
   */
  canAccessEndpoint(endpoint: string): boolean {
    const requiredLevel = this.getRequiredAuthLevel(endpoint);

    switch (requiredLevel) {
      case 'api-key':
        return this.isApiKeyValid();
      
      case 'v1-login':
        return this.isApiKeyValid() && this.v1LoginAuth.isSessionValid();
      
      case 'v2-login':
        return this.isApiKeyValid() && this.v2LoginAuth.isSessionValid();
      
      default:
        return false;
    }
  }

  /**
   * 認証レベル自動判定・昇格
   */
  async ensureAuthLevel(requiredLevel: 'api-key' | 'v1-login' | 'v2-login'): Promise<boolean> {
    try {
      switch (requiredLevel) {
        case 'api-key':
          return this.isApiKeyValid();
        
        case 'v1-login':
          if (!this.v1LoginAuth.isSessionValid()) {
            const result = await this.v1LoginAuth.login();
            return result.success;
          }
          return true;
        
        case 'v2-login':
          if (!this.v2LoginAuth.isSessionValid()) {
            const result = await this.v2LoginAuth.login();
            return result.success;
          }
          return true;
        
        default:
          return false;
      }
    } catch (error) {
      console.error(`❌ 認証レベル昇格エラー (${requiredLevel}):`, error);
      return false;
    }
  }

  /**
   * TwitterAPI.io 3層統合認証状態取得
   * TASK-001対応: 3層認証状態統合
   */
  getAuthStatus(): AuthStatus {
    const apiKeyValid = this.isApiKeyValid();
    const v1SessionValid = this.v1LoginAuth.isSessionValid();
    const v2SessionValid = this.v2LoginAuth.isSessionValid();
    const userSessionValid = this.isUserSessionValid();
    
    // 環境変数検証実行
    const envValidation = validateEnvironmentVariables();
    
    return {
      apiKeyValid,
      userSessionValid,
      sessionExpiry: this.sessionExpiry,
      canPerformUserActions: apiKeyValid && userSessionValid,
      environmentVariablesValid: envValidation.isValid,
      missingEnvironmentVariables: envValidation.missingVariables,
      // TASK-001追加: 3層認証詳細
      authLevel: this.currentAuthLevel,
      v1SessionValid,
      v2SessionValid,
      validAuthLevels: this.getValidAuthLevels(),
      preferredAuthMethod: this.preferredAuthMethod
    };
  }

  /**
   * 3層認証統合デバッグ情報取得
   * TASK-001対応: 詳細デバッグ情報
   */
  getDebugInfo(): Record<string, any> {
    const apiKeyStatus = this.apiKeyAuth.getAuthStatus();
    const v1Status = this.v1LoginAuth.getAuthStatus();
    const v2Status = this.v2LoginAuth.getAuthStatus();

    return {
      // 基本情報
      currentAuthLevel: this.currentAuthLevel,
      preferredAuthMethod: this.preferredAuthMethod,
      validAuthLevels: this.getValidAuthLevels(),
      
      // APIキー認証詳細
      apiKey: {
        ...apiKeyStatus,
        obfuscated: this.apiKeyAuth.getObfuscatedApiKey()
      },
      
      // V1認証詳細
      v1Login: v1Status,
      
      // V2認証詳細
      v2Login: v2Status,
      
      // セッション統計
      sessionStats: this.v2LoginAuth.getSessionStats(),
      
      // 後方互換性情報
      legacy: {
        hasApiKey: !!this.apiKey,
        apiKeyLength: this.apiKey?.length || 0,
        hasUserSession: !!this.userSession,
        sessionExpiry: this.sessionExpiry,
        timeUntilExpiry: this.sessionExpiry ? this.sessionExpiry - Date.now() : null
      },
      
      // 環境変数チェック
      environment: this.v2LoginAuth.checkEnvironmentVariables(),
      
      // システム情報
      system: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    };
  }

  // ============================================================================
  // 追加メソッド: 3層認証統合操作
  // ============================================================================

  /**
   * 接続テスト（全認証レベル）
   */
  async testAllConnections(): Promise<{
    apiKey: { success: boolean; error?: string };
    v1Login: { success: boolean; error?: string };
    v2Login: { success: boolean; error?: string };
    overall: boolean;
  }> {
    const results = {
      apiKey: await this.apiKeyAuth.testConnection(),
      v1Login: { success: false, error: 'Not implemented in V1' },
      v2Login: await this.v2LoginAuth.testAuthenticatedConnection(),
      overall: false
    };

    // 全体結果の判定
    results.overall = results.apiKey.success && 
                     (results.v1Login.success || results.v2Login.success);

    return results;
  }

  /**
   * 推奨認証方法切り替え
   */
  setPreferredAuthMethod(method: 'v1' | 'v2'): void {
    this.preferredAuthMethod = method;
    console.log(`🔄 推奨認証方法を${method.toUpperCase()}に変更`);
  }

  /**
   * 現在の認証レベル取得
   */
  getCurrentAuthLevel(): string {
    return this.currentAuthLevel;
  }

  /**
   * 認証状態強制更新
   */
  async forceRefreshAuth(): Promise<boolean> {
    try {
      // APIキー認証リセット
      this.apiKeyAuth.resetAuth();
      
      // ログイン認証更新
      if (this.preferredAuthMethod === 'v2' && this.v2LoginAuth.isSessionValid()) {
        return await this.v2LoginAuth.refreshSession();
      } else if (this.preferredAuthMethod === 'v1' && this.v1LoginAuth.isSessionValid()) {
        const result = await this.v1LoginAuth.login();
        return result.success;
      }
      
      // フォールバック: 統合ログイン
      const result = await this.login();
      return result.success;
      
    } catch (error) {
      console.error('❌ 認証状態強制更新エラー:', error);
      return false;
    }
  }
}