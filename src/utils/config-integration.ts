/**
 * 設定管理システム統合ユーティリティ
 * ConfigManager, ConfigValidator, ConfigTemplateManagerを統合して使いやすくする
 */

import { ConfigManager, ConfigChangeEvent } from './config-manager';
import { ConfigValidator, ValidationResult, defaultValidator } from './config-validator';
import { ConfigTemplateManager, defaultTemplateManager } from './config-templates';
import { writeYamlAsync } from './yaml-utils';
import * as path from 'path';

export interface ConfigSystemOptions {
  rootPath?: string;
  enableWatching?: boolean;
  enableValidation?: boolean;
  enableCache?: boolean;
  autoBackup?: boolean;
}

export interface ConfigSystemStatus {
  manager: {
    cachedConfigs: number;
    activeWatchers: number;
  };
  validator: {
    registeredValidators: number;
  };
  templates: {
    availableTemplates: string[];
  };
  isWatching: boolean;
}

/**
 * 統合設定管理システム
 */
export class ConfigSystem {
  private manager: ConfigManager;
  private validator: ConfigValidator;
  private templateManager: ConfigTemplateManager;
  private options: Required<ConfigSystemOptions>;
  private isInitialized = false;

  constructor(options: ConfigSystemOptions = {}) {
    this.options = {
      rootPath: 'data',
      enableWatching: true,
      enableValidation: true,
      enableCache: true,
      autoBackup: false,
      ...options
    };

    this.manager = new ConfigManager({
      rootPath: this.options.rootPath,
      enableWatching: this.options.enableWatching,
      enableValidation: this.options.enableValidation,
      enableCache: this.options.enableCache
    });

    this.validator = defaultValidator;
    this.templateManager = defaultTemplateManager;
  }

  /**
   * システム初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // 各設定タイプに対応するバリデーターを登録
    this.manager.registerValidator('autonomous-config.yaml', async (config) => {
      const result = await this.validator.validateConfig(config, 'autonomous');
      return result.isValid;
    });

    this.manager.registerValidator('account-config.yaml', async (config) => {
      const result = await this.validator.validateConfig(config, 'account');
      return result.isValid;
    });

    this.manager.registerValidator('multi-source-config.yaml', async (config) => {
      const result = await this.validator.validateConfig(config, 'multiSource');
      return result.isValid;
    });

    // イベントリスナー設定
    this.setupEventListeners();

    // ファイル監視開始
    if (this.options.enableWatching) {
      await this.manager.watchConfigFiles();
    }

    this.isInitialized = true;
    console.log('✅ ConfigSystem initialized successfully');
  }

  /**
   * 設定ファイル読み込み（バリデーション付き）
   */
  async loadAndValidateConfig<T>(configPath: string, configType?: string): Promise<{
    config: T | null;
    validation: ValidationResult;
  }> {
    const config = await this.manager.loadConfig<T>(configPath);
    
    let validation: ValidationResult;
    if (config && this.options.enableValidation) {
      validation = await this.validator.validateConfig(config, configType);
      
      if (!validation.isValid) {
        console.warn(`⚠️ Configuration validation failed for ${configPath}`);
        validation.errors.forEach(error => {
          console.warn(`  - ${error.path}: ${error.message}`);
        });
      }
    } else {
      validation = { isValid: true, errors: [], warnings: [] };
    }

    return { config, validation };
  }

  /**
   * 設定ファイル生成（テンプレートベース）
   */
  async generateConfigFile(
    templateName: string,
    outputPath: string,
    options: any = {},
    validate = true
  ): Promise<boolean> {
    try {
      const configContent = this.templateManager.generateConfigFile(templateName, options);
      const fullPath = path.join(this.options.rootPath, outputPath);
      
      // バリデーション実行
      if (validate) {
        const yaml = require('js-yaml');
        const config = yaml.load(configContent);
        const validation = await this.validator.validateConfig(config, templateName);
        
        if (!validation.isValid) {
          console.error(`❌ Generated config failed validation for ${outputPath}`);
          validation.errors.forEach(error => {
            console.error(`  - ${error.path}: ${error.message}`);
          });
          return false;
        }
      }

      // ファイル書き込み
      const success = await writeYamlAsync(fullPath, require('js-yaml').load(configContent));
      
      if (success) {
        console.log(`✅ Generated config file: ${fullPath}`);
      }
      
      return success;
    } catch (error) {
      console.error(`❌ Failed to generate config file ${outputPath}:`, error);
      return false;
    }
  }

  /**
   * 設定ドキュメント生成
   */
  async generateDocumentation(templateName: string, outputPath?: string): Promise<string> {
    const documentation = this.templateManager.generateDocumentation(templateName);
    
    if (outputPath) {
      const fs = await import('fs/promises');
      const fullPath = path.join(this.options.rootPath, outputPath);
      
      try {
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, documentation, 'utf8');
        console.log(`✅ Generated documentation: ${fullPath}`);
      } catch (error) {
        console.error(`❌ Failed to write documentation to ${fullPath}:`, error);
      }
    }
    
    return documentation;
  }

  /**
   * 設定の健全性チェック
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 主要設定ファイルの存在確認
    const requiredConfigs = [
      'autonomous-config.yaml',
      'account-config.yaml'
    ];

    for (const configFile of requiredConfigs) {
      const { config, validation } = await this.loadAndValidateConfig(configFile);
      
      if (!config) {
        issues.push(`Missing required config: ${configFile}`);
        recommendations.push(`Generate ${configFile} using template system`);
      } else if (!validation.isValid) {
        issues.push(`Invalid config: ${configFile} (${validation.errors.length} errors)`);
        recommendations.push(`Fix validation errors in ${configFile}`);
      }
    }

    // 設定整合性チェック
    try {
      const autonomousConfig = await this.manager.loadConfig('autonomous-config.yaml');
      const accountConfig = await this.manager.loadConfig('account-config.yaml');
      
      if (autonomousConfig && accountConfig) {
        const integrityResult = await this.validator.validateConfigIntegrity({
          autonomous: autonomousConfig,
          account: accountConfig
        });
        
        if (!integrityResult.isValid) {
          issues.push(`Configuration integrity issues found`);
          recommendations.push(`Review and align configuration values`);
        }
      }
    } catch (error) {
      issues.push(`Failed to check configuration integrity`);
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * システムステータス取得
   */
  getStatus(): ConfigSystemStatus {
    const managerStats = this.manager.getStats();
    
    return {
      manager: {
        cachedConfigs: managerStats.cachedConfigs,
        activeWatchers: managerStats.activeWatchers
      },
      validator: {
        registeredValidators: managerStats.registeredValidators
      },
      templates: {
        availableTemplates: this.templateManager.getTemplatesByCategory().map(t => t.name)
      },
      isWatching: this.options.enableWatching
    };
  }

  /**
   * 設定最適化提案
   */
  async suggestOptimizations(): Promise<{ [configName: string]: any }> {
    const suggestions: { [configName: string]: any } = {};

    // 使用状況の収集（簡単な例）
    const currentUsage = await this.collectCurrentUsage();

    // 各テンプレートタイプに対する最適化提案
    const templates = ['autonomous', 'account', 'multi-source'];
    
    for (const templateName of templates) {
      try {
        const optimizedConfig = this.templateManager.suggestOptimizedConfig(
          templateName, 
          currentUsage
        );
        suggestions[templateName] = optimizedConfig;
      } catch (error) {
        console.warn(`Could not generate optimization for ${templateName}:`, error);
      }
    }

    return suggestions;
  }

  /**
   * システムクリーンアップ
   */
  async cleanup(): Promise<void> {
    await this.manager.cleanup();
    console.log('✅ ConfigSystem cleaned up');
  }

  // プライベートメソッド
  private setupEventListeners(): void {
    this.manager.on('config:changed', (event: ConfigChangeEvent) => {
      console.log(`🔄 Configuration changed: ${path.basename(event.filePath)}`);
      
      // バックアップ作成（オプション）
      if (this.options.autoBackup) {
        this.createBackup(event.filePath).catch(console.error);
      }
    });

    this.manager.on('config:error', (event) => {
      console.error(`❌ Configuration error: ${event.error?.message}`);
    });

    this.manager.on('config:validation-failed', (event) => {
      console.warn(`⚠️ Validation failed: ${path.basename(event.filePath)}`);
    });

    this.manager.on('config:watching-started', () => {
      console.log('👁️ Configuration file watching started');
    });
  }

  private async createBackup(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = filePath.replace(/\.ya?ml$/, `-backup-${timestamp}.yaml`);
      
      const content = await fs.readFile(filePath, 'utf8');
      await fs.writeFile(backupPath, content);
      
      console.log(`📦 Backup created: ${backupPath}`);
    } catch (error) {
      console.error(`Failed to create backup for ${filePath}:`, error);
    }
  }

  private async collectCurrentUsage(): Promise<any> {
    // 実際の実装では、パフォーマンスメトリクス、エラー率などを収集
    // ここでは簡易的な例を示す
    const usage = {
      averageResponseTime: Math.random() * 10000, // ms
      errorRate: Math.random() * 0.2, // 0-20%
      followers_count: 50 + Math.floor(Math.random() * 1000)
    };

    return usage;
  }
}

// デフォルトインスタンス
export const defaultConfigSystem = new ConfigSystem();