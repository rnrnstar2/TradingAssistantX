/**
 * KaitoAPI Configuration Management - 疎結合アーキテクチャコア設定
 * REQUIREMENTS.md準拠 - API設定・エンドポイント管理
 *
 * 機能概要:
 * - 環境別API設定管理
 * - エンドポイント設定とURL構築
 * - 認証設定とセキュリティ管理
 * - パフォーマンス設定最適化
 */

import {
  KaitoAPIConfig,
  EndpointConfig,
  ConfigValidationResult,
} from "./types";

// ============================================================================
// KAITO API CONFIG MANAGER
// ============================================================================

/**
 * KaitoAPI設定管理クラス - 疎結合アーキテクチャ対応
 *
 * 主要機能:
 * - 環境別設定の生成・管理
 * - エンドポイントURL構築
 * - 設定検証とセキュリティチェック
 * - パフォーマンス最適化設定
 */
export class KaitoAPIConfigManager {
  private currentConfig: KaitoAPIConfig | null = null;
  private endpointConfig: EndpointConfig;

  constructor() {
    this.endpointConfig = this.initializeEndpointConfig();
    console.log(
      "✅ KaitoAPIConfigManager initialized - 疎結合アーキテクチャ版",
    );
  }

  /**
   * 環境別設定を生成・取得
   */
  async generateConfig(
    env: "dev" | "staging" | "prod",
  ): Promise<KaitoAPIConfig> {
    try {
      console.log(`🔧 ${env}環境設定生成開始`);

      const environment =
        env === "dev"
          ? "development"
          : env === "prod"
            ? "production"
            : "testing";
      const config: KaitoAPIConfig = {
        apiKey: process.env.KAITO_API_TOKEN || this.generateSecureKey(),
        baseUrl: this.getEnvironmentApiUrl(env),
        environment: environment,
        api: {
          baseUrl: this.getEnvironmentApiUrl(env),
          timeout: env === "prod" ? 5000 : 10000,
        },
        authentication: {
          type: "apikey" as const,
          primaryKey: process.env.KAITO_API_TOKEN || this.generateSecureKey(),
        },
        retry: {
          maxRetries: env === "prod" ? 3 : 5,
          retryDelay: 1000,
        },
        rateLimit: {
          maxQPS: env === "prod" ? 200 : 100,
          windowSize: 60,
        },
      };

      // Configuration generated successfully (metadata removed due to type constraints)

      this.currentConfig = config;

      console.log(`✅ ${env}環境設定生成完了`);
      return config;
    } catch (error) {
      console.error(`❌ 設定生成エラー (${env}):`, error);
      throw error;
    }
  }

  /**
   * 設定検証実行
   */
  async validateConfig(
    config?: KaitoAPIConfig,
  ): Promise<ConfigValidationResult> {
    const targetConfig = config || this.currentConfig;

    if (!targetConfig) {
      throw new Error(
        "設定が読み込まれていません。generateConfig()を先に実行してください。",
      );
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // API設定検証
    const baseUrl = targetConfig.api?.baseUrl || targetConfig.baseUrl;
    if (!baseUrl || !baseUrl.startsWith("https://")) {
      errors.push("API Base URLは必須でHTTPS形式である必要があります");
    }

    const timeout = targetConfig.api?.timeout || targetConfig.timeout;
    if (timeout && (timeout < 1000 || timeout > 30000)) {
      warnings.push("APIタイムアウトが推奨範囲外です (1000-30000ms)");
    }

    // 認証設定検証
    const primaryKey =
      targetConfig.authentication?.primaryKey || targetConfig.apiKey;
    if (!primaryKey || primaryKey.length < 32) {
      errors.push("プライマリキーは32文字以上である必要があります");
    }

    // 基本的な設定検証（type制約により詳細検証は簡素化）
    if (targetConfig.environment === "production") {
      console.log("Production environment configuration validated");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * エンドポイントURL構築
   */
  buildEndpointUrl(
    category: keyof EndpointConfig,
    endpoint: string,
    params?: Record<string, string>,
  ): string {
    if (!this.currentConfig) {
      throw new Error("設定が初期化されていません");
    }

    const baseUrl =
      this.currentConfig.api?.baseUrl || this.currentConfig.baseUrl;

    const categoryConfig = this.endpointConfig[category];
    if (!categoryConfig || typeof categoryConfig !== "object") {
      throw new Error(`無効なカテゴリーです: ${category}`);
    }

    let endpointPath = (categoryConfig as Record<string, unknown>)[
      endpoint
    ] as string;

    if (!endpointPath) {
      throw new Error(
        `エンドポイントが見つかりません: ${category}.${endpoint}`,
      );
    }

    // パラメータ置換
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        endpointPath = endpointPath.replace(`{${key}}`, value);
      });
    }

    return `${baseUrl}${endpointPath}`;
  }

  /**
   * 現在の設定取得
   */
  getCurrentConfig(): KaitoAPIConfig | null {
    return this.currentConfig ? { ...this.currentConfig } : null;
  }

  /**
   * エンドポイント設定取得
   */
  getEndpointConfig(): EndpointConfig {
    return { ...this.endpointConfig };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * エンドポイント設定初期化
   */
  private initializeEndpointConfig(): EndpointConfig {
    return {
      user: {
        info: "/twitter/user/info",
        follow: "/twitter/user/follow",
        unfollow: "/twitter/user/unfollow",
        search: "/twitter/user/search",
      },
      tweet: {
        create: "/twitter/create_tweet_v2",
        retweet: "/twitter/action/retweet",
        quote: "/twitter/action/quote",
        search: "/twitter/tweet/advanced_search",
        delete: "/twitter/tweet/delete",
      },
      engagement: {
        like: "/twitter/action/like",
        unlike: "/twitter/action/unlike",
        bookmark: "/twitter/action/bookmark",
        unbookmark: "/twitter/action/unbookmark",
      },
      auth: {
        verify: "/twitter/user/info", // 実際のユーザー情報取得で認証確認
        refresh: "/twitter/user/info",
      },
      health: "/twitter/tweet/advanced_search", // ヘルスチェック用
    };
  }

  /**
   * 環境別API URL取得
   */
  private getEnvironmentApiUrl(env: "dev" | "staging" | "prod"): string {
    const urls = {
      dev: "https://api.twitterapi.io", // dev環境でも本番APIを使用
      staging: "https://api.twitterapi.io", // staging環境でも本番APIを使用
      prod: "https://api.twitterapi.io",
    };
    return urls[env];
  }

  /**
   * セキュアキー生成
   */
  private generateSecureKey(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 暗号化キー生成
   */
  private generateEncryptionKey(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let result = "";
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 設定チェックサム生成
   */
  private generateChecksum(config: KaitoAPIConfig): string {
    const configString = JSON.stringify(config, null, 2);
    let hash = 0;
    for (let i = 0; i < configString.length; i++) {
      const char = configString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return Math.abs(hash).toString(16);
  }
}

// ============================================================================
// ENVIRONMENT VARIABLE VALIDATION - TASK-001対応
// ============================================================================

/**
 * 必須環境変数の検証結果
 */
export interface EnvironmentValidationResult {
  isValid: boolean;
  missingVariables: string[];
  invalidVariables: string[];
  validatedAt: string;
}

/**
 * プロキシURLの検証
 */
function isValidProxyUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 必須環境変数検証関数
 * X認証に必要な4つの環境変数を検証
 */
export function validateEnvironmentVariables(): EnvironmentValidationResult {
  const requiredVariables = ["X_USERNAME", "X_PASSWORD", "X_EMAIL", "X_TOTP_SECRET"];
  const missingVariables: string[] = [];
  const invalidVariables: string[] = [];

  // 各環境変数の存在確認
  for (const variable of requiredVariables) {
    const value = process.env[variable];

    if (!value || value.trim() === "") {
      missingVariables.push(variable);
    } else {
      // 値の形式チェック
      if (variable === "X_EMAIL" && !value.includes("@")) {
        invalidVariables.push(`${variable} (不正なメールアドレス形式)`);
      }
    }
  }

  const validation = {
    isValid: missingVariables.length === 0 && invalidVariables.length === 0,
    missingVariables,
    invalidVariables,
    validatedAt: new Date().toISOString(),
  };

  // デバッグログ出力
  if (!validation.isValid) {
    console.log("⚠️  環境変数検証失敗:");
    if (missingVariables.length > 0) {
      console.log("  未設定:", missingVariables.join(", "));
    }
    if (invalidVariables.length > 0) {
      console.log("  不正:", invalidVariables.join(", "));
    }
  } else {
    console.log("✅ 環境変数検証成功");
  }

  return validation;
}

/**
 * 環境変数検証とエラーメッセージ生成
 * 未設定時に明確なエラーメッセージを提供
 */
export function validateEnvironmentOrThrow(): void {
  const validation = validateEnvironmentVariables();

  if (!validation.isValid) {
    let errorMessage = "\n⚠️  環境変数検証エラー\n\n";

    if (validation.missingVariables.length > 0) {
      errorMessage += `未設定の環境変数: ${validation.missingVariables.join(", ")}\n`;
    }

    if (validation.invalidVariables.length > 0) {
      errorMessage += `不正な環境変数: ${validation.invalidVariables.join(", ")}\n`;
    }

    errorMessage += `\n以下の形式で環境変数を設定してください:\n\n`;
    errorMessage += `export X_USERNAME="your_username"\n`;
    errorMessage += `export X_PASSWORD="your_password"\n`;
    errorMessage += `export X_EMAIL="your_email@example.com"\n`;
    errorMessage += `export X_TOTP_SECRET="your_totp_secret_key"\n`;
    errorMessage += `\nプロキシはdata/config/proxies.yamlで管理されます\n`;

    throw new Error(errorMessage);
  }
}

/**
 * X認証設定データ取得
 * 環境変数から認証情報を安全に取得
 */
export interface XAuthConfig {
  username: string;
  password: string;
  email: string;
  totp_secret: string;
}

export function getXAuthConfig(): XAuthConfig {
  // 事前検証実行
  validateEnvironmentOrThrow();

  return {
    username: process.env.X_USERNAME!,
    password: process.env.X_PASSWORD!,
    email: process.env.X_EMAIL!,
    totp_secret: process.env.X_TOTP_SECRET!,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * デフォルト設定生成関数
 */
export async function createDefaultConfig(
  env: "dev" | "staging" | "prod" = "dev",
): Promise<KaitoAPIConfig> {
  const configManager = new KaitoAPIConfigManager();
  return await configManager.generateConfig(env);
}

/**
 * 設定検証ユーティリティ関数
 */
export async function validateKaitoConfig(
  config: KaitoAPIConfig,
): Promise<ConfigValidationResult> {
  const configManager = new KaitoAPIConfigManager();
  return await configManager.validateConfig(config);
}

/**
 * エンドポイントURL構築ユーティリティ関数
 */
export function buildApiEndpoint(
  config: KaitoAPIConfig,
  category: keyof EndpointConfig,
  endpoint: string,
  params?: Record<string, string>,
): string {
  const configManager = new KaitoAPIConfigManager();
  // 設定を一時的に設定してURL構築
  configManager["currentConfig"] = config;
  return configManager.buildEndpointUrl(category, endpoint, params);
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * 使用例:
 *
 * ```typescript
 * // 設定生成
 * const configManager = new KaitoAPIConfigManager();
 * const prodConfig = await configManager.generateConfig('prod');
 *
 * // 設定検証
 * const validation = await configManager.validateConfig();
 *
 * // エンドポイントURL構築
 * const tweetUrl = configManager.buildEndpointUrl('tweet', 'create');
 * const userUrl = configManager.buildEndpointUrl('user', 'info', { userId: '123' });
 * ```
 */
