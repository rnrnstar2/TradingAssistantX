/**
 * Collection Configuration Manager
 * ActionSpecificCollectorから設定管理機能を分離
 */

import { join } from 'path';
import { loadYamlSafe } from '../../../utils/yaml-utils';
import type { 
  ActionCollectionConfig, 
  ExtendedActionCollectionConfig,
  SourceConfig 
} from '../../../types/autonomous-system';

export class CollectionConfigManager {
  private config: ActionCollectionConfig | null = null;
  private extendedConfig: ExtendedActionCollectionConfig | null = null;
  private multiSourceConfig: ExtendedActionCollectionConfig['multiSources'] | null = null;

  /**
   * 設定を読み込み
   */
  loadConfig(configPath?: string): {
    config: ActionCollectionConfig | null;
    extendedConfig: ExtendedActionCollectionConfig | null;
    multiSourceConfig: ExtendedActionCollectionConfig['multiSources'] | null;
  } {
    const defaultPath = join(process.cwd(), 'data', 'action-collection-strategies.yaml');
    const finalPath = configPath || defaultPath;
    
    // 拡張設定の読み込みを試行
    const rawConfig = loadYamlSafe<any>(finalPath);
    
    if (!rawConfig) {
      console.warn('⚠️ [設定読み込み] YAML設定の読み込みに失敗、デフォルト設定を使用');
      this.config = this.getDefaultConfig();
      this.extendedConfig = null;
      this.multiSourceConfig = null;
      return this.getConfigs();
    }

    // multi-source-config.yamlの読み込み
    const multiSourcePath = join(process.cwd(), 'data', 'multi-source-config.yaml');
    this.multiSourceConfig = loadYamlSafe<ExtendedActionCollectionConfig['multiSources']>(multiSourcePath);
    if (this.multiSourceConfig) {
      console.log('✅ [設定読み込み] multi-source-config.yaml 読み込み完了');
    } else {
      console.warn('⚠️ [設定読み込み] multi-source-config.yaml の読み込みに失敗');
    }

    // 拡張設定が含まれているか確認
    if (this.validateModernConfig(rawConfig)) {
      console.log('✅ [設定読み込み] 拡張設定を検出、多様情報源モードで初期化');
      
      // 拡張設定として読み込み
      this.extendedConfig = {
        strategies: rawConfig.strategies,
        sufficiencyThresholds: {},
        maxExecutionTime: rawConfig.system?.maxExecutionTime || 90,
        qualityStandards: {
          relevanceScore: rawConfig.qualityStandards.relevanceScore || 80,
          credibilityScore: rawConfig.qualityStandards.credibilityScore || 85,
          uniquenessScore: rawConfig.qualityStandards.uniquenessScore || 70,
          timelinessScore: rawConfig.qualityStandards.timelinessScore || 90
        },
        multiSources: this.parseMultiSourceConfig(rawConfig),
        sourceSelection: rawConfig.sourceSelection,
        qualityWeights: this.parseQualityWeights(rawConfig.qualityStandards)
      };
      
      // レガシー設定も作成（互換性のため）
      this.config = {
        strategies: rawConfig.strategies,
        sufficiencyThresholds: {},
        maxExecutionTime: rawConfig.system?.maxExecutionTime || 90,
        qualityStandards: {
          relevanceScore: rawConfig.qualityStandards.relevanceScore || 80,
          credibilityScore: rawConfig.qualityStandards.credibilityScore || 85,
          uniquenessScore: rawConfig.qualityStandards.uniquenessScore || 70,
          timelinessScore: rawConfig.qualityStandards.timelinessScore || 90
        }
      };
    } else {
      // レガシー形式として読み込み
      console.log('✅ [設定読み込み] 従来設定を検出、標準モードで初期化');
      this.config = rawConfig as ActionCollectionConfig;
      this.extendedConfig = null;
    }

    return this.getConfigs();
  }

  /**
   * 設定を取得
   */
  private getConfigs() {
    return {
      config: this.config,
      extendedConfig: this.extendedConfig,
      multiSourceConfig: this.multiSourceConfig
    };
  }

  /**
   * モダン設定の妥当性を検証
   */
  private validateModernConfig(config: any): boolean {
    const hasSourceSelection = config.sourceSelection && 
      Object.keys(config.sourceSelection).length > 0;
    const hasQualityStandards = config.qualityStandards && 
      config.qualityStandards.relevanceScore;
      
    if (!hasSourceSelection) {
      console.error('❌ [設定エラー] sourceSelection セクションが必要です');
    }
    if (!hasQualityStandards) {
      console.error('❌ [設定エラー] qualityStandards セクションが必要です');
    }
    
    return hasSourceSelection && hasQualityStandards;
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultConfig(): ActionCollectionConfig {
    return {
      strategies: {
        original_post: {
          priority: 60,
          focusAreas: ['独自洞察発見', '市場分析情報'],
          sources: [],
          collectMethods: [],
          sufficiencyTarget: 90
        },
        quote_tweet: {
          priority: 25,
          focusAreas: ['候補ツイート検索'],
          sources: [],
          collectMethods: [],
          sufficiencyTarget: 85
        },
        retweet: {
          priority: 10,
          focusAreas: ['信頼性検証'],
          sources: [],
          collectMethods: [],
          sufficiencyTarget: 80
        },
        reply: {
          priority: 5,
          focusAreas: ['コミュニティ情報'],
          sources: [],
          collectMethods: [],
          sufficiencyTarget: 70
        }
      },
      sufficiencyThresholds: {
        original_post: 90,
        quote_tweet: 85,
        retweet: 80,
        reply: 70
      },
      maxExecutionTime: 90,
      qualityStandards: {
        relevanceScore: 80,
        credibilityScore: 85,
        uniquenessScore: 70,
        timelinessScore: 90
      }
    };
  }

  /**
   * 多様情報源設定の解析
   */
  private parseMultiSourceConfig(rawConfig: any): ExtendedActionCollectionConfig['multiSources'] {
    return {
      rss: {
        type: 'rss',
        sources: this.extractSourcesByType(rawConfig.strategies, 'rss')
      },
      apis: {
        type: 'api',
        sources: this.extractSourcesByType(rawConfig.strategies, 'api')
      },
      community: {
        type: 'community',
        sources: this.extractSourcesByType(rawConfig.strategies, 'community')
      },
      web: {
        type: 'web',
        sources: this.extractSourcesByType(rawConfig.strategies, 'web')
      },
      dynamic: {
        type: 'dynamic',
        sources: this.extractSourcesByType(rawConfig.strategies, 'dynamic')
      }
    };
  }

  /**
   * タイプ別ソース抽出
   */
  private extractSourcesByType(strategies: any, sourceType: string): SourceConfig[] {
    const sources: SourceConfig[] = [];
    
    Object.values(strategies).forEach((strategy: any) => {
      if (strategy.sources) {
        strategy.sources.forEach((source: any) => {
          if (source.type === sourceType) {
            sources.push({
              name: source.name,
              type: source.type,
              priority: source.priority,
              url: source.url,
              enabled: source.enabled !== false
            });
          }
        });
      }
    });

    return sources;
  }

  /**
   * 品質重み設定の解析
   */
  private parseQualityWeights(qualityStandards: any): Record<string, number> {
    return {
      relevance: qualityStandards?.relevanceWeight || 0.3,
      credibility: qualityStandards?.credibilityWeight || 0.25,
      uniqueness: qualityStandards?.uniquenessWeight || 0.2,
      timeliness: qualityStandards?.timelinessWeight || 0.25
    };
  }

  /**
   * 設定の妥当性チェック
   */
  validateConfig(): boolean {
    if (!this.config) {
      console.error('❌ [設定エラー] 設定が読み込まれていません');
      return false;
    }

    // 基本的な設定項目の存在チェック
    if (!this.config.strategies || Object.keys(this.config.strategies).length === 0) {
      console.error('❌ [設定エラー] strategies設定が必要です');
      return false;
    }

    if (!this.config.qualityStandards) {
      console.error('❌ [設定エラー] qualityStandards設定が必要です');
      return false;
    }

    // 戦略ごとの妥当性チェック
    for (const [actionType, strategy] of Object.entries(this.config.strategies)) {
      if (!strategy.focusAreas || strategy.focusAreas.length === 0) {
        console.warn(`⚠️ [設定警告] ${actionType}にfocusAreasが設定されていません`);
      }
      
      if (!strategy.sources) {
        console.warn(`⚠️ [設定警告] ${actionType}にsourcesが設定されていません`);
      }
    }

    return true;
  }

  /**
   * 現在の設定を取得
   */
  getCurrentConfig(): ActionCollectionConfig | null {
    return this.config;
  }

  /**
   * 拡張設定を取得
   */
  getExtendedConfig(): ExtendedActionCollectionConfig | null {
    return this.extendedConfig;
  }

  /**
   * マルチソース設定を取得
   */
  getMultiSourceConfig(): ExtendedActionCollectionConfig['multiSources'] | null {
    return this.multiSourceConfig;
  }

  /**
   * アクションタイプ別設定を取得
   */
  getActionConfig(actionType: string): any | null {
    if (!this.config?.strategies) return null;
    return this.config.strategies[actionType as keyof typeof this.config.strategies] || null;
  }

  /**
   * 品質基準を取得
   */
  getQualityStandards(): any | null {
    return this.config?.qualityStandards || null;
  }

  /**
   * 最大実行時間を取得
   */
  getMaxExecutionTime(): number {
    return this.config?.maxExecutionTime || 90;
  }
}