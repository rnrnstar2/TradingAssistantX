/**
 * データ管理クラス
 * REQUIREMENTS.md準拠版 - 統合データ管理システム
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface ApiConfig {
  kaito_api: {
    base_url: string;
    auth: {
      bearer_token: string;
    };
    rate_limits: {
      posts_per_hour: number;
      retweets_per_hour: number;
      likes_per_hour: number;
    };
  };
  claude: {
    model: string;
    max_tokens: number;
    temperature: number;
  };
}

export interface DecisionPattern {
  timestamp: string;
  context: {
    followers: number;
    last_post_hours_ago: number;
    market_trend: string;
  };
  decision: {
    action: string;
    reasoning: string;
    confidence: number;
  };
  result: {
    engagement_rate: number;
    new_followers: number;
    success: boolean;
  };
}

export interface SuccessStrategy {
  high_engagement: {
    post_times: string[];
    topics: string[];
    hashtags: string[];
  };
  content_types: {
    [type: string]: {
      success_rate: number;
      avg_engagement: number;
    };
  };
}

export interface ActionResult {
  timestamp: string;
  action: string;
  content: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    engagement_rate: number;
  };
  success: boolean;
}

export interface SessionMemory {
  current_session: {
    start_time: string;
    actions_taken: number;
    last_action: string;
    next_scheduled: string;
  };
  memory: {
    recent_topics: string[];
    successful_hashtags: string[];
    follower_growth_trend: string;
  };
}

export interface CurrentStatus {
  account_status: {
    followers: number;
    following: number;
    tweets_today: number;
    engagement_rate_24h: number;
  };
  system_status: {
    last_execution: string;
    next_execution: string;
    errors_today: number;
    success_rate: number;
  };
  rate_limits: {
    posts_remaining: number;
    retweets_remaining: number;
    likes_remaining: number;
    reset_time: string;
  };
}

/**
 * 統合データ管理クラス
 * 設定・学習データ・実行コンテキストの一元管理
 */
export class DataManager {
  private readonly dataDir = path.join(process.cwd(), 'src', 'data');
  private readonly configDir = path.join(this.dataDir, 'config');
  private readonly learningDir = path.join(this.dataDir, 'learning');
  private readonly contextDir = path.join(this.dataDir, 'context');

  constructor() {
    console.log('✅ DataManager initialized - REQUIREMENTS.md準拠版');
    this.ensureDirectories();
  }

  // ============================================================================
  // CONFIG MANAGEMENT
  // ============================================================================

  /**
   * API設定の読み込み
   */
  async loadConfig(): Promise<ApiConfig> {
    try {
      const configPath = path.join(this.configDir, 'api-config.yaml');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = yaml.load(content) as ApiConfig;

      console.log('✅ API設定読み込み完了');
      return config;

    } catch (error) {
      console.warn('⚠️ API設定読み込み失敗、デフォルト設定使用:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * API設定の保存
   */
  async saveConfig(config: ApiConfig): Promise<void> {
    try {
      const configPath = path.join(this.configDir, 'api-config.yaml');
      const yamlStr = yaml.dump(config, { indent: 2 });
      await fs.writeFile(configPath, yamlStr, 'utf-8');

      console.log('✅ API設定保存完了');

    } catch (error) {
      console.error('❌ API設定保存失敗:', error);
      throw new Error(`Config save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // LEARNING DATA MANAGEMENT
  // ============================================================================

  /**
   * 学習データの読み込み
   */
  async loadLearningData(): Promise<{
    decisionPatterns: DecisionPattern[];
    successStrategies: SuccessStrategy;
    actionResults: ActionResult[];
  }> {
    try {
      const [decisionPatterns, successStrategies, actionResults] = await Promise.all([
        this.loadDecisionPatterns(),
        this.loadSuccessStrategies(),
        this.loadActionResults()
      ]);

      console.log('✅ 学習データ読み込み完了:', {
        patterns: decisionPatterns.length,
        results: actionResults.length
      });

      return {
        decisionPatterns,
        successStrategies,
        actionResults
      };

    } catch (error) {
      console.error('❌ 学習データ読み込み失敗:', error);
      return {
        decisionPatterns: [],
        successStrategies: this.getDefaultSuccessStrategies(),
        actionResults: []
      };
    }
  }

  /**
   * 決定結果の記録
   */
  async saveDecisionResult(decision: any, result: any): Promise<void> {
    try {
      const pattern: DecisionPattern = {
        timestamp: new Date().toISOString(),
        context: {
          followers: result.context?.followers || 0,
          last_post_hours_ago: result.context?.last_post_hours_ago || 0,
          market_trend: result.context?.market_trend || 'neutral'
        },
        decision: {
          action: decision.action,
          reasoning: decision.reasoning,
          confidence: decision.confidence
        },
        result: {
          engagement_rate: result.engagement_rate || 0,
          new_followers: result.new_followers || 0,
          success: result.success || false
        }
      };

      await this.appendToLearningFile('decision-patterns.yaml', pattern);
      console.log('✅ 決定結果記録完了:', { action: decision.action, success: result.success });

    } catch (error) {
      console.error('❌ 決定結果記録失敗:', error);
    }
  }

  /**
   * 成功パターンの更新
   */
  async updateSuccessPatterns(patterns: any): Promise<void> {
    try {
      const strategiesPath = path.join(this.learningDir, 'success-strategies.yaml');
      const yamlStr = yaml.dump(patterns, { indent: 2 });
      await fs.writeFile(strategiesPath, yamlStr, 'utf-8');

      console.log('✅ 成功パターン更新完了');

    } catch (error) {
      console.error('❌ 成功パターン更新失敗:', error);
    }
  }

  /**
   * アクション結果の記録
   */
  async recordActionResult(action: string, content: string, metrics: any): Promise<void> {
    try {
      const result: ActionResult = {
        timestamp: new Date().toISOString(),
        action,
        content: content.substring(0, 200), // 最初の200文字のみ保存
        metrics: {
          likes: metrics.likes || 0,
          retweets: metrics.retweets || 0,
          replies: metrics.replies || 0,
          engagement_rate: metrics.engagement_rate || 0
        },
        success: metrics.engagement_rate > 2.0 // 2%以上をサクセスと判定
      };

      await this.appendToLearningFile('action-results.yaml', result);
      console.log('✅ アクション結果記録完了:', { action, engagement: result.metrics.engagement_rate });

    } catch (error) {
      console.error('❌ アクション結果記録失敗:', error);
    }
  }

  // ============================================================================
  // CONTEXT MANAGEMENT
  // ============================================================================

  /**
   * セッションメモリの読み込み
   */
  async loadSessionMemory(): Promise<SessionMemory> {
    try {
      const memoryPath = path.join(this.contextDir, 'session-memory.yaml');
      const content = await fs.readFile(memoryPath, 'utf-8');
      const memory = yaml.load(content) as SessionMemory;

      console.log('✅ セッションメモリ読み込み完了');
      return memory;

    } catch (error) {
      console.warn('⚠️ セッションメモリ読み込み失敗、デフォルト値使用');
      return this.getDefaultSessionMemory();
    }
  }

  /**
   * セッションメモリの保存
   */
  async saveSessionMemory(memory: SessionMemory): Promise<void> {
    try {
      const memoryPath = path.join(this.contextDir, 'session-memory.yaml');
      const yamlStr = yaml.dump(memory, { indent: 2 });
      await fs.writeFile(memoryPath, yamlStr, 'utf-8');

      console.log('✅ セッションメモリ保存完了');

    } catch (error) {
      console.error('❌ セッションメモリ保存失敗:', error);
    }
  }

  /**
   * 現在状況の読み込み
   */
  async loadCurrentStatus(): Promise<CurrentStatus> {
    try {
      const statusPath = path.join(this.contextDir, 'current-status.yaml');
      const content = await fs.readFile(statusPath, 'utf-8');
      const status = yaml.load(content) as CurrentStatus;

      console.log('✅ 現在状況読み込み完了');
      return status;

    } catch (error) {
      console.warn('⚠️ 現在状況読み込み失敗、デフォルト値使用');
      return this.getDefaultCurrentStatus();
    }
  }

  /**
   * 現在状況の保存
   */
  async saveCurrentStatus(status: CurrentStatus): Promise<void> {
    try {
      const statusPath = path.join(this.contextDir, 'current-status.yaml');
      const yamlStr = yaml.dump(status, { indent: 2 });
      await fs.writeFile(statusPath, yamlStr, 'utf-8');

      console.log('✅ 現在状況保存完了');

    } catch (error) {
      console.error('❌ 現在状況保存失敗:', error);
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * データベースの健全性チェック
   */
  async performHealthCheck(): Promise<{
    config: boolean;
    learning: boolean;
    context: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let configOk = false;
    let learningOk = false;
    let contextOk = false;

    try {
      await this.loadConfig();
      configOk = true;
    } catch (error) {
      errors.push(`Config health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await this.loadLearningData();
      learningOk = true;
    } catch (error) {
      errors.push(`Learning data health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await this.loadCurrentStatus();
      contextOk = true;
    } catch (error) {
      errors.push(`Context health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('🏥 データベース健全性チェック完了:', {
      config: configOk,
      learning: learningOk,
      context: contextOk,
      errorCount: errors.length
    });

    return { config: configOk, learning: learningOk, context: contextOk, errors };
  }

  /**
   * データのクリーンアップ（古いデータの削除）
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // 決定パターンのクリーンアップ
      const patterns = await this.loadDecisionPatterns();
      const filteredPatterns = patterns.filter(pattern => 
        new Date(pattern.timestamp) > cutoffDate
      );

      if (filteredPatterns.length !== patterns.length) {
        await this.saveLearningFile('decision-patterns.yaml', { patterns: filteredPatterns });
        console.log(`🧹 古い決定パターンを削除: ${patterns.length - filteredPatterns.length}件`);
      }

      // アクション結果のクリーンアップ
      const results = await this.loadActionResults();
      const filteredResults = results.filter(result => 
        new Date(result.timestamp) > cutoffDate
      );

      if (filteredResults.length !== results.length) {
        await this.saveLearningFile('action-results.yaml', { results: filteredResults });
        console.log(`🧹 古いアクション結果を削除: ${results.length - filteredResults.length}件`);
      }

      console.log('✅ データクリーンアップ完了');

    } catch (error) {
      console.error('❌ データクリーンアップ失敗:', error instanceof Error ? error.message : error);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async ensureDirectories(): Promise<void> {
    try {
      await Promise.all([
        fs.mkdir(this.configDir, { recursive: true }),
        fs.mkdir(this.learningDir, { recursive: true }),
        fs.mkdir(this.contextDir, { recursive: true })
      ]);
    } catch (error) {
      console.error('❌ ディレクトリ作成失敗:', error instanceof Error ? error.message : error);
    }
  }

  private async loadDecisionPatterns(): Promise<DecisionPattern[]> {
    try {
      const patternsPath = path.join(this.learningDir, 'decision-patterns.yaml');
      const content = await fs.readFile(patternsPath, 'utf-8');
      const data = yaml.load(content) as { patterns: DecisionPattern[] };
      return data.patterns || [];
    } catch (error) {
      return [];
    }
  }

  private async loadSuccessStrategies(): Promise<SuccessStrategy> {
    try {
      const strategiesPath = path.join(this.learningDir, 'success-strategies.yaml');
      const content = await fs.readFile(strategiesPath, 'utf-8');
      const strategies = yaml.load(content) as { strategies: SuccessStrategy };
      return strategies.strategies || this.getDefaultSuccessStrategies();
    } catch (error) {
      return this.getDefaultSuccessStrategies();
    }
  }

  private async loadActionResults(): Promise<ActionResult[]> {
    try {
      const resultsPath = path.join(this.learningDir, 'action-results.yaml');
      const content = await fs.readFile(resultsPath, 'utf-8');
      const data = yaml.load(content) as { results: ActionResult[] };
      return data.results || [];
    } catch (error) {
      return [];
    }
  }

  private async appendToLearningFile(filename: string, data: any): Promise<void> {
    const filePath = path.join(this.learningDir, filename);
    
    try {
      // 既存データを読み込み
      let existingData: any = { patterns: [], results: [], strategies: {} };
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        existingData = yaml.load(content) as any;
      } catch (error) {
        // ファイルが存在しない場合は新規作成
      }

      // データを追加
      if (filename === 'decision-patterns.yaml') {
        existingData.patterns = existingData.patterns || [];
        existingData.patterns.push(data);
      } else if (filename === 'action-results.yaml') {
        existingData.results = existingData.results || [];
        existingData.results.push(data);
      }

      // ファイルに保存
      const yamlStr = yaml.dump(existingData, { indent: 2 });
      await fs.writeFile(filePath, yamlStr, 'utf-8');

    } catch (error) {
      console.error(`❌ 学習データファイル更新失敗 (${filename}):`, error instanceof Error ? error.message : error);
    }
  }

  private async saveLearningFile(filename: string, data: any): Promise<void> {
    const filePath = path.join(this.learningDir, filename);
    const yamlStr = yaml.dump(data, { indent: 2 });
    await fs.writeFile(filePath, yamlStr, 'utf-8');
  }

  // デフォルト値生成メソッド群
  private getDefaultConfig(): ApiConfig {
    return {
      kaito_api: {
        base_url: 'https://api.kaito.ai',
        auth: {
          bearer_token: '${KAITO_API_TOKEN}'
        },
        rate_limits: {
          posts_per_hour: 10,
          retweets_per_hour: 20,
          likes_per_hour: 50
        }
      },
      claude: {
        model: 'claude-3-sonnet',
        max_tokens: 4000,
        temperature: 0.7
      }
    };
  }

  private getDefaultSuccessStrategies(): SuccessStrategy {
    return {
      high_engagement: {
        post_times: ['09:00', '12:00', '18:00'],
        topics: ['market_analysis', 'educational_content'],
        hashtags: ['#投資', '#資産形成']
      },
      content_types: {
        educational: {
          success_rate: 0.78,
          avg_engagement: 2.8
        },
        market_commentary: {
          success_rate: 0.65,
          avg_engagement: 2.1
        }
      }
    };
  }

  private getDefaultSessionMemory(): SessionMemory {
    return {
      current_session: {
        start_time: new Date().toISOString(),
        actions_taken: 0,
        last_action: 'none',
        next_scheduled: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      },
      memory: {
        recent_topics: ['市場分析', '投資戦略', 'リスク管理'],
        successful_hashtags: ['#投資', '#資産形成', '#投資教育'],
        follower_growth_trend: 'stable'
      }
    };
  }

  private getDefaultCurrentStatus(): CurrentStatus {
    return {
      account_status: {
        followers: 100,
        following: 50,
        tweets_today: 0,
        engagement_rate_24h: 2.5
      },
      system_status: {
        last_execution: '',
        next_execution: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        errors_today: 0,
        success_rate: 1.0
      },
      rate_limits: {
        posts_remaining: 10,
        retweets_remaining: 20,
        likes_remaining: 50,
        reset_time: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      }
    };
  }
}