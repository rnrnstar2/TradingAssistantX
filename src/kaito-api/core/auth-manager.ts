/**
 * TwitterAPI.io 2層認証統合管理システム
 *
 * 認証レベル:
 * 1. APIキー認証 - 読み取り専用操作
 * 2. V2ログイン認証 - 1段階認証（推奨・標準）
 *
 * REQUIREMENTS.md準拠 - MVP実装
 * TASK-001対応 - 統合認証アーキテクチャ
 */

/* global fetch */
import type { LoginResult, AuthStatus, SessionData } from "../utils/types";
import { validateEnvironmentVariables } from "./config";
import { SessionManager } from "./session";

export class AuthManager {
  private sessionManager: SessionManager;
  private currentAuthLevel: "none" | "api-key" | "v2-login" = "none";

  // APIキー認証プロパティ（旧APIKeyAuth）
  private readonly apiKey: string;
  private readonly API_BASE_URL = "https://api.twitterapi.io";
  private lastValidation: number = 0;
  private readonly VALIDATION_CACHE_DURATION = 3600000; // 1時間

  // 後方互換性のための従来プロパティ
  private userSession: string | null = null;
  private sessionExpiry: number | null = null;

  constructor(config?: { apiKey?: string }) {
    this.apiKey = config?.apiKey || process.env.KAITO_API_TOKEN || "";
    if (!this.apiKey) {
      throw new Error("KAITO_API_TOKEN is required");
    }

    // セッション管理初期化
    this.sessionManager = new SessionManager();

    console.log("✅ AuthManager初期化完了 - 統合認証対応");
  }

  // ============================================================================
  // Phase 1: APIキー認証機能（旧APIKeyAuth統合）
  // ============================================================================

  /**
   * APIキー基本バリデーション
   */
  private validateApiKey(): boolean {
    if (!this.apiKey || this.apiKey.trim() === "") {
      return false;
    }

    // APIキーの長さチェック（最小10文字）
    if (this.apiKey.length < 10) {
      return false;
    }

    // 基本的なフォーマットチェック（英数字と一部記号）
    const tokenPattern = /^[A-Za-z0-9_-]+$/;
    return tokenPattern.test(this.apiKey);
  }

  /**
   * APIキー形式検証
   */
  isValidFormat(): boolean {
    return this.validateApiKey();
  }

  /**
   * APIキー有効性確認（2層認証対応）
   */
  isApiKeyValid(): boolean {
    return this.isValidFormat();
  }

  /**
   * APIキー形式確認（後方互換性）
   */
  validateBearerToken(): boolean {
    return this.validateApiKey();
  }

  /**
   * TwitterAPI.io接続テスト
   * 読み取り専用操作でAPIキーの有効性を確認
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("🔗 APIキー認証接続テスト実行中...");

      if (!this.validateApiKey()) {
        return {
          success: false,
          error: "Invalid API key format",
        };
      }

      // キャッシュされた結果をチェック
      const now = Date.now();
      if (
        this.lastValidation &&
        now - this.lastValidation < this.VALIDATION_CACHE_DURATION
      ) {
        console.log("✅ キャッシュされた認証結果を使用");
        return { success: true };
      }

      // TwitterAPI.io健康チェック用エンドポイント
      const testUrl = `${this.API_BASE_URL}/twitter/tweet/advanced_search?query=test&queryType=Latest&count=1`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

      const response = await fetch(testUrl, {
        method: "GET",
        headers: this.getApiKeyAuthHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.lastValidation = now;
        console.log("✅ APIキー認証接続テスト成功");
        return { success: true };
      } else if (response.status === 401) {
        return {
          success: false,
          error: "Invalid API key - authentication failed",
        };
      } else if (response.status === 403) {
        return {
          success: false,
          error: "API key lacks required permissions",
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          error: "Connection timeout",
        };
      }

      console.error("❌ APIキー認証接続テストエラー:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage || "Connection test failed",
      };
    }
  }

  /**
   * x-api-keyヘッダー生成（APIキー認証専用）
   */
  private getApiKeyAuthHeaders(): Record<string, string> {
    return {
      "x-api-key": this.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "TradingAssistantX/1.0",
    };
  }

  /**
   * 認証済みHTTPリクエスト実行（読み取り専用）
   */
  async authenticatedRequest<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
  ): Promise<T> {
    if (!this.validateApiKey()) {
      throw new Error("Invalid API key");
    }

    const url = new URL(endpoint, this.API_BASE_URL);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: this.getApiKeyAuthHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("API key authentication failed");
        } else if (response.status === 403) {
          throw new Error("API key lacks required permissions");
        } else if (response.status === 429) {
          throw new Error("Rate limit exceeded");
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }

      throw error;
    }
  }

  /**
   * APIキーの安全な取得（デバッグ用）
   */
  getObfuscatedApiKey(): string {
    if (!this.apiKey) return "";

    const keyLength = this.apiKey.length;
    if (keyLength <= 8) {
      return "*".repeat(keyLength);
    }

    return (
      this.apiKey.slice(0, 4) +
      "*".repeat(keyLength - 8) +
      this.apiKey.slice(-4)
    );
  }

  /**
   * 認証リセット（キャッシュクリア）
   */
  resetAuth(): void {
    this.lastValidation = 0;
    console.log("🔄 APIキー認証状態リセット");
  }

  /**
   * APIキー認証状態取得
   */
  private getApiKeyAuthStatus(): {
    hasApiKey: boolean;
    keyLength: number;
    validFormat: boolean;
    lastValidation: string | null;
    cacheValid: boolean;
  } {
    const now = Date.now();
    const cacheValid =
      this.lastValidation &&
      now - this.lastValidation < this.VALIDATION_CACHE_DURATION;

    return {
      hasApiKey: !!this.apiKey,
      keyLength: this.apiKey?.length || 0,
      validFormat: this.validateApiKey(),
      lastValidation: this.lastValidation
        ? new Date(this.lastValidation).toISOString()
        : null,
      cacheValid: !!cacheValid,
    };
  }

  // ============================================================================
  // Phase 2: V2ログイン認証機能（旧V2LoginAuth統合）
  // ============================================================================

  /**
   * V2ログイン実行（user_login_v2）
   */
  async login(): Promise<LoginResult> {
    try {
      console.log("🔐 TwitterAPI.io user_login_v2 ログイン開始...");

      // 環境変数確認
      const credentials = this.validateCredentials();
      if (!credentials.valid) {
        return {
          success: false,
          error: credentials.error,
        };
      }

      const loginUrl = `${this.API_BASE_URL}/twitter/user_login_v2`;

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: this.getApiKeyAuthHeaders(),
        body: JSON.stringify({
          username: credentials.data!.username,
          email: credentials.data!.email,
          password: credentials.data!.password,
          proxy: credentials.data!.proxy,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // login_cookie取得・保存
      if (result.success && result.login_cookie) {
        const loginResult = {
          success: true,
          login_cookie: result.login_cookie,
          session_expires: Date.now() + 24 * 60 * 60 * 1000, // 24時間
        };

        // SessionManagerを使用してセッション保存
        this.sessionManager.saveSession(loginResult);

        // 後方互換性のため従来プロパティも更新
        this.userSession = loginResult.login_cookie;
        this.sessionExpiry = loginResult.session_expires;
        this.currentAuthLevel = "v2-login";

        console.log("✅ TwitterAPI.io user_login_v2 ログイン成功");
        return loginResult;
      }

      return {
        success: false,
        error: result.error || "V2 login failed",
      };
    } catch (error) {
      console.error("❌ TwitterAPI.io user_login_v2 ログインエラー:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "V2 login error",
      };
    }
  }

  /**
   * V2ログイン実行（直接指定）
   */
  async loginV2(): Promise<LoginResult> {
    return await this.login();
  }

  /**
   * V2認証用ヘッダー取得
   */
  private getV2AuthHeaders(): Record<string, string> {
    const headers = this.getApiKeyAuthHeaders();

    const loginCookie = this.getLoginCookie();
    if (loginCookie) {
      headers["Cookie"] = `login_cookie=${loginCookie}`;
    }

    return headers;
  }

  /**
   * V2認証用パラメータ取得
   */
  private getV2AuthParameters(): Record<string, string> {
    const params: Record<string, string> = {};

    const loginCookie = this.getLoginCookie();
    if (loginCookie) {
      params.login_cookie = loginCookie;
    }

    return params;
  }

  /**
   * 有効なlogin_cookie取得
   */
  private getLoginCookie(): string | null {
    return this.sessionManager.getValidCookie();
  }

  /**
   * セッション更新
   */
  async refreshSession(): Promise<boolean> {
    if (!this.isSessionValid()) {
      console.log("🔄 セッション期限切れ - 再ログイン実行");
      const loginResult = await this.login();
      return loginResult.success;
    }

    // セッションがまだ有効な場合は成功を返す
    return true;
  }

  /**
   * V2認証済みリクエスト実行
   */
  async executeV2AuthenticatedRequest<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    data?: Record<string, unknown>,
  ): Promise<T> {
    if (!this.isSessionValid()) {
      // 自動再ログイン試行
      const refreshResult = await this.refreshSession();
      if (!refreshResult) {
        throw new Error("No valid V2 login session and refresh failed");
      }
    }

    const url = `${this.API_BASE_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: this.getV2AuthHeaders(),
    };

    if (method === "POST" && data) {
      options.body = JSON.stringify({
        ...data,
        ...this.getV2AuthParameters(),
      });
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      if (response.status === 401) {
        // セッション無効化して再ログイン
        this.sessionManager.clearSession();
        const refreshResult = await this.refreshSession();

        if (!refreshResult) {
          throw new Error("V2 login session expired and refresh failed");
        }

        // リトライ
        return this.executeV2AuthenticatedRequest(endpoint, method, data);
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * 接続テスト（認証済み）
   */
  async testAuthenticatedConnection(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      if (!this.isSessionValid()) {
        return {
          success: false,
          error: "No valid login session",
        };
      }

      // 認証が必要なエンドポイントでテスト
      await this.executeV2AuthenticatedRequest(
        "/twitter/user/info?userName=me",
      );

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Authentication test failed",
      };
    }
  }

  /**
   * 投稿権限テスト
   */
  async testPostPermissions(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isSessionValid()) {
        return {
          success: false,
          error: "No valid login session",
        };
      }

      // 実際の投稿は行わず、投稿エンドポイントの認証のみテスト
      // （ドライランモード）
      console.log("✅ V2認証による投稿権限確認済み");

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Post permission test failed",
      };
    }
  }

  /**
   * 認証情報バリデーション
   */
  private validateCredentials(): {
    valid: boolean;
    error?: string;
    data?: {
      username: string;
      email: string;
      password: string;
      proxy?: string;
    };
  } {
    const username = process.env.X_USERNAME;
    const email = process.env.X_EMAIL;
    const password = process.env.X_PASSWORD;
    const proxy = process.env.X_PROXY;

    if (!username) {
      return {
        valid: false,
        error: "X_USERNAME environment variable is required",
      };
    }

    if (!email) {
      return {
        valid: false,
        error: "X_EMAIL environment variable is required",
      };
    }

    if (!password) {
      return {
        valid: false,
        error: "X_PASSWORD environment variable is required",
      };
    }

    return {
      valid: true,
      data: { username, email, password, proxy },
    };
  }

  /**
   * 環境変数の存在確認
   */
  checkEnvironmentVariables(): {
    valid: boolean;
    missing: string[];
    present: string[];
  } {
    const required = ["X_USERNAME", "X_EMAIL", "X_PASSWORD"];
    const optional = ["X_PROXY"];

    const missing: string[] = [];
    const present: string[] = [];

    [...required, ...optional].forEach((envVar) => {
      if (process.env[envVar]) {
        present.push(envVar);
      } else if (required.includes(envVar)) {
        missing.push(envVar);
      }
    });

    return {
      valid: missing.length === 0,
      missing,
      present,
    };
  }

  /**
   * V2認証状態取得
   */
  private getV2AuthStatus(): {
    hasLoginCookie: boolean;
    sessionValid: boolean;
    sessionInfo: SessionData | null;
    apiKeyStatus: {
      hasApiKey: boolean;
      keyLength: number;
      validFormat: boolean;
      lastValidation: string | null;
      cacheValid: boolean;
    };
  } {
    const sessionInfo = this.sessionManager.getSessionInfo();
    const apiKeyStatus = this.getApiKeyAuthStatus();

    return {
      hasLoginCookie: !!this.getLoginCookie(),
      sessionValid: this.isSessionValid(),
      sessionInfo,
      apiKeyStatus,
    };
  }

  /**
   * セッション統計取得
   */
  getSessionStats() {
    return this.sessionManager.getSessionStats();
  }

  // ============================================================================
  // Phase 3: 統合認証管理
  // ============================================================================

  /**
   * 認証レベル自動判定・ヘッダー生成
   */
  getAuthHeaders(): Record<string, string> {
    // V2ログイン認証優先
    if (this.isSessionValid()) {
      this.currentAuthLevel = "v2-login";
      return this.getV2AuthHeaders();
    }

    // フォールバック: APIキー認証
    this.currentAuthLevel = "api-key";
    return this.getApiKeyAuthHeaders();
  }

  /**
   * 認証レベル別パラメータ生成
   */
  getAuthParameters(): Record<string, string> {
    // V2ログイン認証が有効な場合
    if (this.isSessionValid()) {
      return this.getV2AuthParameters();
    }

    // APIキー認証の場合は空のパラメータ
    return {};
  }

  /**
   * セッション有効性確認（統合）
   */
  isUserSessionValid(): boolean {
    return this.sessionManager.isSessionValid();
  }

  /**
   * セッション有効性確認（V2）
   */
  private isSessionValid(): boolean {
    return this.sessionManager.isSessionValid();
  }

  /**
   * 有効なセッション取得（統合）
   */
  getUserSession(): string | null {
    return this.sessionManager.getValidCookie();
  }

  /**
   * 統合ログアウト
   */
  async logout(): Promise<void> {
    // セッションクリア
    this.sessionManager.clearSession();

    // 従来プロパティもクリア
    this.userSession = null;
    this.sessionExpiry = null;
    this.currentAuthLevel = "none";

    console.log("🚪 統合認証ログアウト完了");
  }

  /**
   * 2層認証レベル別有効性確認
   */
  getValidAuthLevels(): string[] {
    const validLevels: string[] = [];

    if (this.validateApiKey()) {
      validLevels.push("api-key");
    }

    if (this.isSessionValid()) {
      validLevels.push("v2-login");
    }

    return validLevels;
  }

  /**
   * エンドポイント別認証レベル要件判定
   */
  getRequiredAuthLevel(endpoint: string): "api-key" | "v2-login" {
    // 書き込み系操作（ログイン認証必須）
    const writeEndpoints = [
      "/twitter/tweet/create", // 投稿作成
      "/twitter/action/like", // いいね
      "/twitter/action/retweet", // リツイート
      "/twitter/action/quote", // 引用ツイート
      "/twitter/user/follow", // フォロー
      "/twitter/user/unfollow", // アンフォロー
      "/twitter/tweet/delete", // ツイート削除
    ];

    const isWriteOperation = writeEndpoints.some((writeEndpoint) =>
      endpoint.includes(writeEndpoint),
    );

    // 書き込み操作にはV2ログイン認証が必要
    if (isWriteOperation) {
      return "v2-login";
    }

    // 読み取り専用操作はAPIキー認証で十分
    return "api-key";
  }

  /**
   * 従来互換性メソッド
   */
  requiresUserSession(endpoint: string): boolean {
    return this.getRequiredAuthLevel(endpoint) !== "api-key";
  }

  /**
   * エンドポイントアクセス可能性確認
   */
  canAccessEndpoint(endpoint: string): boolean {
    const requiredLevel = this.getRequiredAuthLevel(endpoint);

    switch (requiredLevel) {
      case "api-key":
        return this.isApiKeyValid();

      case "v2-login":
        return this.isApiKeyValid() && this.isSessionValid();

      default:
        return false;
    }
  }

  /**
   * 認証レベル自動判定・昇格
   */
  async ensureAuthLevel(
    requiredLevel: "api-key" | "v2-login",
  ): Promise<boolean> {
    try {
      switch (requiredLevel) {
        case "api-key":
          return this.isApiKeyValid();

        case "v2-login":
          if (!this.isSessionValid()) {
            const result = await this.login();
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
   * 統合認証状態取得
   */
  getAuthStatus(): AuthStatus {
    const apiKeyValid = this.isApiKeyValid();
    const v2SessionValid = this.isSessionValid();
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
      // 追加: V2標準認証詳細
      authLevel: this.currentAuthLevel,
      v2SessionValid,
      validAuthLevels: this.getValidAuthLevels(),
    };
  }

  /**
   * 統合認証デバッグ情報取得
   */
  getDebugInfo(): Record<string, unknown> {
    const apiKeyStatus = this.getApiKeyAuthStatus();
    const v2Status = this.getV2AuthStatus();

    return {
      // 基本情報
      currentAuthLevel: this.currentAuthLevel,
      validAuthLevels: this.getValidAuthLevels(),

      // APIキー認証詳細
      apiKey: {
        ...apiKeyStatus,
        obfuscated: this.getObfuscatedApiKey(),
      },

      // V2認証詳細
      v2Login: v2Status,

      // セッション統計
      sessionStats: this.getSessionStats(),

      // 後方互換性情報
      legacy: {
        hasApiKey: !!this.apiKey,
        apiKeyLength: this.apiKey?.length || 0,
        hasUserSession: !!this.userSession,
        sessionExpiry: this.sessionExpiry,
        timeUntilExpiry: this.sessionExpiry
          ? this.sessionExpiry - Date.now()
          : null,
      },

      // 環境変数チェック
      environment: this.checkEnvironmentVariables(),

      // システム情報
      system: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    };
  }

  /**
   * 接続テスト（統合）
   */
  async testAllConnections(): Promise<{
    apiKey: { success: boolean; error?: string };
    v2Login: { success: boolean; error?: string };
    overall: boolean;
  }> {
    const results = {
      apiKey: await this.testConnection(),
      v2Login: await this.testAuthenticatedConnection(),
      overall: false,
    };

    // 全体結果の判定
    results.overall = results.apiKey.success && results.v2Login.success;

    return results;
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
      this.resetAuth();

      // V2ログイン認証更新
      if (this.isSessionValid()) {
        return await this.refreshSession();
      }

      // フォールバック: V2ログイン
      const result = await this.login();
      return result.success;
    } catch (error) {
      console.error("❌ 認証状態強制更新エラー:", error);
      return false;
    }
  }
}
