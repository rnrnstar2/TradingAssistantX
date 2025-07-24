/**
 * 設定管理システム
 * REQUIREMENTS.md準拠版 - 統合設定管理クラス
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface SystemConfig {
  scheduler: {
    intervalMinutes: number;
    maxDailyExecutions: number;
    executionWindow: {
      start: string;
      end: string;
    };
    timezone: string;
  };
  kaito_api: {
    base_url: string;
    timeout: number;
    rate_limits: {
      posts_per_hour: number;
      retweets_per_hour: number;
      likes_per_hour: number;
    };
    retry: {
      max_attempts: number;
      base_delay: number;
      backoff_multiplier: number;
    };
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
    data_retention_days: number;
    max_cache_size: number;
  };
  quality: {
    min_confidence_threshold: number;
    engagement_threshold: number;
    content_min_length: number;
    content_max_length: number;
  };
}

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  KAITO_API_TOKEN: string;
  CLAUDE_API_KEY?: string;
  LOG_LEVEL?: string;
  DEBUG?: string;
  DATA_DIR?: string;
  TIMEZONE?: string;
}

/**
 * 設定管理システムクラス
 * システム全体の設定を一元管理し、環境別設定をサポート
 */
export class Config {
  private static instance: Config;
  private config: SystemConfig;
  private envConfig: EnvironmentConfig;
  private configPath: string;
  private lastLoadTime: number = 0;
  private readonly CACHE_TTL = 300000; // 5 minutes

  private constructor() {
    this.configPath = path.join(process.cwd(), 'src', 'data', 'config', 'api-config.yaml');
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
      
      await this.loadConfig();
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
      ...this.config.scheduler,
      timezone: this.envConfig.TIMEZONE || this.config.scheduler.timezone
    };
  }

  /**
   * Claude設定取得
   */
  getClaudeConfig(): SystemConfig['claude'] & { api_key?: string } {
    return {
      ...this.config.claude,
      api_key: this.envConfig.CLAUDE_API_KEY
    };
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
   * 品質設定取得
   */
  getQualityConfig(): SystemConfig['quality'] {
    return { ...this.config.quality };
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
   * 設定値の更新
   */
  async updateConfig(path: string, value: any): Promise<void> {
    try {
      const pathParts = path.split('.');
      let current = this.config as any;
      
      // ネストしたオブジェクトを辿る
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }
      
      // 最終的な値を設定
      current[pathParts[pathParts.length - 1]] = value;
      
      // ファイルに保存
      await this.saveConfig();
      
      console.log(`✅ Configuration updated: ${path} = ${JSON.stringify(value)}`);
      
    } catch (error) {
      console.error(`❌ Configuration update failed for ${path}:`, error);
      throw new Error(`Configuration update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 設定のリロード
   */
  async reloadConfig(): Promise<void> {
    try {
      console.log('🔄 Reloading configuration...');
      
      this.lastLoadTime = 0; // キャッシュをクリア
      await this.loadConfig();
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

    // 数値範囲チェック
    if (this.config.scheduler.intervalMinutes < 1) {
      errors.push('Scheduler interval must be at least 1 minute');
    }

    if (this.config.quality.min_confidence_threshold < 0 || this.config.quality.min_confidence_threshold > 1) {
      errors.push('Confidence threshold must be between 0 and 1');
    }

    // APIタイムアウトチェック
    if (this.config.kaito_api.timeout < 1000) {
      errors.push('API timeout must be at least 1000ms');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * 設定のデバッグ情報取得
   */
  getDebugInfo(): {
    configPath: string;
    lastLoadTime: string;
    environment: string;
    hasRequiredEnvVars: boolean;
    configSummary: any;
  } {
    return {
      configPath: this.configPath,
      lastLoadTime: new Date(this.lastLoadTime).toISOString(),
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

  private async loadConfig(): Promise<void> {
    const now = Date.now();
    
    // キャッシュチェック
    if (now - this.lastLoadTime < this.CACHE_TTL) {
      return;
    }

    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const yamlConfig = yaml.load(content) as Partial<SystemConfig>;
      
      // デフォルト設定とマージ
      this.config = this.mergeConfigs(this.getDefaultConfig(), yamlConfig);
      this.lastLoadTime = now;
      
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        console.warn('⚠️ Configuration file not found, creating default');
        await this.saveConfig();
      } else {
        console.error('❌ Failed to load configuration:', error);
        throw error;
      }
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      const yamlStr = yaml.dump(this.config, { indent: 2 });
      await fs.writeFile(this.configPath, yamlStr, 'utf-8');
      
    } catch (error) {
      console.error('❌ Failed to save configuration:', error);
      throw error;
    }
  }

  private loadEnvironmentConfig(): EnvironmentConfig {
    return {
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      KAITO_API_TOKEN: process.env.KAITO_API_TOKEN || '',
      CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
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
        maxDailyExecutions: 48,
        executionWindow: {
          start: '07:00',
          end: '23:00'
        },
        timezone: 'Asia/Tokyo'
      },
      kaito_api: {
        base_url: 'https://api.kaito.ai',
        timeout: 30000,
        rate_limits: {
          posts_per_hour: 10,
          retweets_per_hour: 20,
          likes_per_hour: 50
        },
        retry: {
          max_attempts: 3,
          base_delay: 1000,
          backoff_multiplier: 2
        }
      },
      claude: {
        model: 'claude-3-sonnet',
        max_tokens: 4000,
        temperature: 0.7,
        timeout: 15000
      },
      system: {
        debug_mode: false,
        log_level: 'info',
        data_retention_days: 30,
        max_cache_size: 100
      },
      quality: {
        min_confidence_threshold: 0.7,
        engagement_threshold: 2.0,
        content_min_length: 10,
        content_max_length: 280
      }
    };
  }

  private mergeConfigs(defaultConfig: SystemConfig, userConfig: Partial<SystemConfig>): SystemConfig {
    const merged = { ...defaultConfig };
    
    for (const [key, value] of Object.entries(userConfig)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        (merged as any)[key] = { ...(merged as any)[key], ...value };
      } else {
        (merged as any)[key] = value;
      }
    }
    
    return merged;
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