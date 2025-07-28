/**
 * 設定管理システム - 環境変数ベース
 * REQUIREMENTS.md準拠版 - シンプル設定管理
 */

export interface SystemConfig {
  scheduler: {
    intervalMinutes: number;
    timezone: string;
  };
  kaito_api: {
    base_url: string;
    timeout: number;
  };
  claude: {
    model: string;
    max_tokens: number;
    temperature: number;
    timeout: number;
  };
  system: {
    debug_mode: boolean;
    log_level: 'debug' | 'info' | 'warn' | 'error';
  };
}

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  KAITO_API_TOKEN: string;
  LOG_LEVEL?: string;
  DEBUG?: string;
  DATA_DIR?: string;
  TIMEZONE?: string;
}

/**
 * 設定管理システムクラス - 環境変数ベース
 * システム全体の設定を環境変数から一元管理
 */
export class Config {
  private static instance: Config;
  private config: SystemConfig;
  private envConfig: EnvironmentConfig;

  private constructor() {
    this.envConfig = this.loadEnvironmentConfig();
    this.config = this.getDefaultConfig();
  }

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  /**
   * 設定の初期化（アプリケーション起動時）
   */
  async initialize(): Promise<void> {
    try {
      console.log('⚙️ Initializing configuration system...');
      
      this.validateConfig();
      
      console.log('✅ Configuration system initialized');
      
    } catch (error) {
      console.error('❌ Configuration initialization failed:', error);
      console.log('⚠️ Using default configuration');
    }
  }

  /**
   * KaitoAPI設定取得
   */
  getKaitoApiConfig(): SystemConfig['kaito_api'] & { auth_token: string } {
    return {
      ...this.config.kaito_api,
      auth_token: this.envConfig.KAITO_API_TOKEN
    };
  }

  /**
   * スケジューラー設定取得
   */
  getSchedulerConfig(): SystemConfig['scheduler'] {
    return {
      intervalMinutes: 30,
      timezone: this.envConfig.TIMEZONE || 'Asia/Tokyo'
    };
  }

  /**
   * Claude設定取得
   */
  getClaudeConfig(): SystemConfig['claude'] {
    return this.config.claude;
  }

  /**
   * システム設定取得
   */
  getSystemConfig(): SystemConfig['system'] {
    return {
      ...this.config.system,
      debug_mode: this.envConfig.NODE_ENV === 'development' || this.config.system.debug_mode,
      log_level: (this.envConfig.LOG_LEVEL as any) || this.config.system.log_level
    };
  }


  /**
   * 完全な設定オブジェクト取得
   */
  getAllConfig(): SystemConfig {
    return { ...this.config };
  }

  /**
   * 環境変数設定取得
   */
  getEnvironmentConfig(): EnvironmentConfig {
    return { ...this.envConfig };
  }


  /**
   * 設定のリロード
   */
  async reloadConfig(): Promise<void> {
    try {
      console.log('🔄 Reloading configuration...');
      
      this.envConfig = this.loadEnvironmentConfig();
      this.validateConfig();
      
      console.log('✅ Configuration reloaded successfully');
      
    } catch (error) {
      console.error('❌ Configuration reload failed:', error);
      throw error;
    }
  }

  /**
   * 設定の検証
   */
  validateConfig(): void {
    const errors: string[] = [];

    // 必須環境変数チェック
    if (!this.envConfig.KAITO_API_TOKEN) {
      errors.push('KAITO_API_TOKEN environment variable is required');
    }

    // 基本的な検証のみ

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * 設定のデバッグ情報取得
   */
  getDebugInfo(): {
    environment: string;
    hasRequiredEnvVars: boolean;
    configSummary: any;
  } {
    return {
      environment: this.envConfig.NODE_ENV,
      hasRequiredEnvVars: !!this.envConfig.KAITO_API_TOKEN,
      configSummary: {
        scheduler_interval: this.config.scheduler.intervalMinutes,
        api_timeout: this.config.kaito_api.timeout,
        claude_model: this.config.claude.model,
        debug_mode: this.getSystemConfig().debug_mode
      }
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private loadEnvironmentConfig(): EnvironmentConfig {
    return {
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      KAITO_API_TOKEN: process.env.KAITO_API_TOKEN || '',
      LOG_LEVEL: process.env.LOG_LEVEL,
      DEBUG: process.env.DEBUG,
      DATA_DIR: process.env.DATA_DIR,
      TIMEZONE: process.env.TIMEZONE
    };
  }

  private getDefaultConfig(): SystemConfig {
    return {
      scheduler: {
        intervalMinutes: 30,
        timezone: 'Asia/Tokyo'
      },
      kaito_api: {
        base_url: 'https://api.kaito.ai',
        timeout: 30000
      },
      claude: {
        model: 'claude-3-sonnet',
        max_tokens: 4000,
        temperature: 0.7,
        timeout: 15000
      },
      system: {
        debug_mode: false,
        log_level: 'info'
      }
    };
  }

}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * シングルトン設定インスタンス取得
 */
export function getConfig(): Config {
  return Config.getInstance();
}

/**
 * 環境変数から設定値を取得
 */
export function getEnvVar(key: string, defaultValue?: string): string {
  return process.env[key] || defaultValue || '';
}

/**
 * 必須環境変数の取得（存在しない場合はエラー）
 */
export function getRequiredEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * 環境判定ユーティリティ
 */
export const isDevelopment = () => process.env.NODE_ENV === 'development';
export const isProduction = () => process.env.NODE_ENV === 'production';
export const isTest = () => process.env.NODE_ENV === 'test';

/**
 * デバッグモード判定
 */
export const isDebugMode = () => {
  return isDevelopment() || process.env.DEBUG === 'true';
};

// グローバル設定インスタンス
export const config = Config.getInstance();