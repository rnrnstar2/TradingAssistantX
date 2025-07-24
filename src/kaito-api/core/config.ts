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

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

/**
 * KaitoAPI設定インターフェース
 */
export interface KaitoAPIConfig {
  environment: 'dev' | 'staging' | 'prod';
  api: {
    baseUrl: string;
    version: string;
    timeout: number;
    retryPolicy: {
      maxRetries: number;
      backoffMs: number;
      retryConditions: string[];
    };
  };
  authentication: {
    primaryKey: string;
    secondaryKey?: string;
    keyRotationInterval: number;
    encryptionEnabled: boolean;
  };
  performance: {
    qpsLimit: number;
    responseTimeTarget: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
  monitoring: {
    metricsEnabled: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    alertingEnabled: boolean;
    healthCheckInterval: number;
  };
  security: {
    rateLimitEnabled: boolean;
    ipWhitelist: string[];
    auditLoggingEnabled: boolean;
    encryptionKey: string;
  };
  features: {
    realApiEnabled: boolean;
    mockFallbackEnabled: boolean;
    batchProcessingEnabled: boolean;
    advancedCachingEnabled: boolean;
  };
  metadata: {
    version: string;
    lastUpdated: string;
    updatedBy: string;
    checksum: string;
  };
}

/**
 * エンドポイント設定インターフェース
 */
export interface EndpointConfig {
  user: {
    info: string;
    follow: string;
    unfollow: string;
    search: string;
  };
  tweet: {
    create: string;
    retweet: string;
    quote: string;
    search: string;
    delete: string;
  };
  engagement: {
    like: string;
    unlike: string;
    bookmark: string;
    unbookmark: string;
  };
  auth: {
    verify: string;
    refresh: string;
  };
  health: string;
}

/**
 * 設定検証結果インターフェース
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedAt: string;
  environment: string;
}

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
    console.log('✅ KaitoAPIConfigManager initialized - 疎結合アーキテクチャ版');
  }

  /**
   * 環境別設定を生成・取得
   */
  async generateConfig(env: 'dev' | 'staging' | 'prod'): Promise<KaitoAPIConfig> {
    try {
      console.log(`🔧 ${env}環境設定生成開始`);

      const config: KaitoAPIConfig = {
        environment: env,
        api: {
          baseUrl: this.getEnvironmentApiUrl(env),
          version: 'v1.0',
          timeout: env === 'prod' ? 5000 : 10000,
          retryPolicy: {
            maxRetries: env === 'prod' ? 3 : 5,
            backoffMs: 1000,
            retryConditions: ['429', '500', '502', '503', '504', 'ECONNRESET', 'ETIMEDOUT']
          }
        },
        authentication: {
          primaryKey: process.env.KAITO_API_TOKEN || this.generateSecureKey(),
          keyRotationInterval: env === 'prod' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000, // 本番7日、開発30日
          encryptionEnabled: env === 'prod'
        },
        performance: {
          qpsLimit: env === 'prod' ? 200 : 100,
          responseTimeTarget: 700,
          cacheEnabled: true,
          cacheTTL: env === 'prod' ? 300 : 600 // 本番5分、開発10分
        },
        monitoring: {
          metricsEnabled: true,
          logLevel: env === 'prod' ? 'warn' : env === 'staging' ? 'info' : 'debug',
          alertingEnabled: env === 'prod',
          healthCheckInterval: env === 'prod' ? 30000 : 60000
        },
        security: {
          rateLimitEnabled: true,
          ipWhitelist: env === 'prod' ? [] : ['127.0.0.1', '::1'],
          auditLoggingEnabled: env === 'prod',
          encryptionKey: this.generateEncryptionKey()
        },
        features: {
          realApiEnabled: env === 'prod',
          mockFallbackEnabled: env !== 'prod',
          batchProcessingEnabled: true,
          advancedCachingEnabled: env === 'prod'
        },
        metadata: {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          updatedBy: 'KaitoAPIConfigManager',
          checksum: ''
        }
      };

      // チェックサム生成
      config.metadata.checksum = this.generateChecksum(config);
      
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
  async validateConfig(config?: KaitoAPIConfig): Promise<ConfigValidationResult> {
    const targetConfig = config || this.currentConfig;
    
    if (!targetConfig) {
      throw new Error('設定が読み込まれていません。generateConfig()を先に実行してください。');
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // API設定検証
    if (!targetConfig.api.baseUrl || !targetConfig.api.baseUrl.startsWith('https://')) {
      errors.push('API Base URLは必須でHTTPS形式である必要があります');
    }

    if (targetConfig.api.timeout < 1000 || targetConfig.api.timeout > 30000) {
      warnings.push('APIタイムアウトが推奨範囲外です (1000-30000ms)');
    }

    // 認証設定検証
    if (!targetConfig.authentication.primaryKey || targetConfig.authentication.primaryKey.length < 32) {
      errors.push('プライマリキーは32文字以上である必要があります');
    }

    if (targetConfig.environment === 'prod' && !targetConfig.authentication.encryptionEnabled) {
      errors.push('本番環境では暗号化が必須です');
    }

    // パフォーマンス設定検証
    if (targetConfig.performance.qpsLimit < 1 || targetConfig.performance.qpsLimit > 1000) {
      warnings.push('QPS制限が推奨範囲外です (1-1000)');
    }

    if (targetConfig.performance.responseTimeTarget > 2000) {
      warnings.push('応答時間目標が長すぎます (2000ms以下推奨)');
    }

    // セキュリティ設定検証
    if (targetConfig.environment === 'prod' && !targetConfig.security.auditLoggingEnabled) {
      warnings.push('本番環境では監査ログが推奨されます');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      validatedAt: new Date().toISOString(),
      environment: targetConfig.environment
    };
  }

  /**
   * エンドポイントURL構築
   */
  buildEndpointUrl(category: keyof EndpointConfig, endpoint: string, params?: Record<string, string>): string {
    if (!this.currentConfig) {
      throw new Error('設定が初期化されていません');
    }

    const baseUrl = this.currentConfig.api.baseUrl;
    const version = this.currentConfig.api.version;
    
    // @ts-ignore - TypeScript認識問題の回避
    let endpointPath = this.endpointConfig[category][endpoint];
    
    if (!endpointPath) {
      throw new Error(`エンドポイントが見つかりません: ${category}.${endpoint}`);
    }

    // パラメータ置換
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        endpointPath = endpointPath.replace(`{${key}}`, value);
      });
    }

    return `${baseUrl}/${version}${endpointPath}`;
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
        info: '/users/{userId}',
        follow: '/users/{userId}/follow',
        unfollow: '/users/{userId}/unfollow',
        search: '/users/search'
      },
      tweet: {
        create: '/tweets',
        retweet: '/tweets/{tweetId}/retweet',
        quote: '/tweets/{tweetId}/quote',
        search: '/tweets/search',
        delete: '/tweets/{tweetId}'
      },
      engagement: {
        like: '/tweets/{tweetId}/like',
        unlike: '/tweets/{tweetId}/unlike',
        bookmark: '/tweets/{tweetId}/bookmark',
        unbookmark: '/tweets/{tweetId}/unbookmark'
      },
      auth: {
        verify: '/auth/verify',
        refresh: '/auth/refresh'
      },
      health: '/health'
    };
  }

  /**
   * 環境別API URL取得
   */
  private getEnvironmentApiUrl(env: 'dev' | 'staging' | 'prod'): string {
    const urls = {
      dev: 'https://dev-api.twitterapi.io',
      staging: 'https://staging-api.twitterapi.io',
      prod: 'https://api.twitterapi.io'
    };
    return urls[env];
  }

  /**
   * セキュアキー生成
   */
  private generateSecureKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 暗号化キー生成
   */
  private generateEncryptionKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
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
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return Math.abs(hash).toString(16);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * デフォルト設定生成関数
 */
export async function createDefaultConfig(env: 'dev' | 'staging' | 'prod' = 'dev'): Promise<KaitoAPIConfig> {
  const configManager = new KaitoAPIConfigManager();
  return await configManager.generateConfig(env);
}

/**
 * 設定検証ユーティリティ関数
 */
export async function validateKaitoConfig(config: KaitoAPIConfig): Promise<ConfigValidationResult> {
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
  params?: Record<string, string>
): string {
  const configManager = new KaitoAPIConfigManager();
  // 設定を一時的に設定してURL構築
  configManager['currentConfig'] = config;
  return configManager.buildEndpointUrl(category, endpoint, params);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  KaitoAPIConfig,
  EndpointConfig,
  ConfigValidationResult,
  KaitoAPIConfigManager
};

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