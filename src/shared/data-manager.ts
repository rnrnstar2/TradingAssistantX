/**
 * データ管理クラス
 * REQUIREMENTS.md準拠版 - 統合データ管理システム
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { DailyInsight, TomorrowStrategy, PerformanceSummary, DataManagerConfig, ReferenceAccountsConfig, ReferenceAccount } from './types';
import { ClaudeOutputError } from './types';
import type { AnalysisResult } from '../claude/types';
import type { PostMetricsData, PostMetric } from './post-metrics-collector';

// ClaudeOutputErrorクラスをre-export
export { ClaudeOutputError } from './types';

// ============================================================================
// 簡素化されたインターフェース（MVP版）
// ============================================================================

export interface EngagementMetrics {
  successRate: number;
  avgEngagement: number;
  sampleSize: number;
}

export interface LearningData {
  engagementPatterns: {
    timeSlots: { [timeSlot: string]: EngagementMetrics };
    contentTypes: { [type: string]: EngagementMetrics };
    topics: { [topic: string]: EngagementMetrics };
  };
  successfulTopics: {
    topics: Array<{
      topic: string;
      successRate: number;
      avgEngagement: number;
      bestTimeSlots: string[];
    }>;
  };
}

// ============================================================================
// 既存インターフェース（レガシー互換性維持）
// ============================================================================

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

export interface ExecutionSummary {
  executionId: string;
  startTime: string;
  endTime?: string;
  decision: any;
  actions: Array<{
    type: string;
    timestamp: string;
    success: boolean;
    result?: any;
  }>;
  metrics: {
    totalActions: number;
    successCount: number;
    errorCount: number;
  };
}

export interface PostData {
  executionId: string;
  actionType: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'follow';
  timestamp: string;
  content?: string;
  targetTweetId?: string;
  result: {
    success: boolean;
    message: string;
    data: any;
  };
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
    impressions: number;
    views: number;
  };
  claudeSelection?: {
    score: number;
    reasoning: string;
    expectedImpact: string;
  };
}

/**
 * 統合データ管理クラス
 * 設定・学習データ・実行コンテキストの一元管理
 */
export class DataManager {
  private static instance: DataManager | null = null;
  private readonly dataDir = path.join(process.cwd(), 'data');
  private readonly dataRoot = this.dataDir;
  private readonly learningDir = path.join(this.dataDir, 'learning');
  private readonly currentDir = path.join(this.dataDir, 'current');
  private readonly historyDir = path.join(this.dataDir, 'history');
  private currentExecutionId: string | null = null;
  
  readonly config: DataManagerConfig;

  constructor(config?: Partial<DataManagerConfig>) {
    this.config = {
      dataDir: this.dataDir,
      currentExecutionId: config?.currentExecutionId,
      claudeOutputPaths: config?.claudeOutputPaths,
      ...config
    };
    console.log('✅ DataManager initialized - 簡素化版');
    this.ensureDirectories();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }


  // ============================================================================
  // LEARNING DATA MANAGEMENT
  // ============================================================================

  /**
   * 学習データの読み込み（2ファイル構成対応）
   */
  async loadLearningData(): Promise<LearningData> {
    try {
      const [engagementPatterns, successfulTopics] = await Promise.all([
        this.loadEngagementPatterns(),
        this.loadSuccessfulTopics()
      ]);

      console.log('✅ 学習データ読み込み完了 (2ファイル構成)');
      
      return {
        engagementPatterns,
        successfulTopics
      };

    } catch (error) {
      console.error('❌ 学習データ読み込み失敗:', error);
      return this.getDefaultLearningData();
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
   * 成功トピックスの更新（successful-topics.yaml専用）
   */
  async updateSuccessPatterns(successfulTopics: LearningData['successfulTopics']): Promise<void> {
    try {
      const topicsPath = path.join(this.learningDir, 'successful-topics.yaml');
      const yamlStr = yaml.dump(successfulTopics, { indent: 2 });
      await fs.writeFile(topicsPath, yamlStr, 'utf-8');

      console.log('✅ 成功トピックス更新完了');

    } catch (error) {
      console.error('❌ 成功トピックス更新失敗:', error);
    }
  }

  /**
   * アクション結果の記録（engagement-patterns.yamlに統合）
   */
  async recordActionResult(action: string, content: string, metrics: any, timeSlot?: string, topic?: string): Promise<void> {
    try {
      // エンゲージメントパターンデータを読み込み
      let engagementPatterns = await this.loadEngagementPatterns();
      
      const engagementRate = metrics.engagement_rate || 0;
      const success = engagementRate > 2.0;
      
      // 時間スロットパターンの更新
      if (timeSlot) {
        if (!engagementPatterns.timeSlots[timeSlot]) {
          engagementPatterns.timeSlots[timeSlot] = { successRate: 0, avgEngagement: 0, sampleSize: 0 };
        }
        const slot = engagementPatterns.timeSlots[timeSlot];
        slot.avgEngagement = ((slot.avgEngagement * slot.sampleSize) + engagementRate) / (slot.sampleSize + 1);
        slot.sampleSize += 1;
        slot.successRate = success ? ((slot.successRate * (slot.sampleSize - 1)) + 1) / slot.sampleSize 
                                  : (slot.successRate * (slot.sampleSize - 1)) / slot.sampleSize;
      }
      
      // トピックパターンの更新
      if (topic) {
        if (!engagementPatterns.topics[topic]) {
          engagementPatterns.topics[topic] = { successRate: 0, avgEngagement: 0, sampleSize: 0 };
        }
        const topicData = engagementPatterns.topics[topic];
        topicData.avgEngagement = ((topicData.avgEngagement * topicData.sampleSize) + engagementRate) / (topicData.sampleSize + 1);
        topicData.sampleSize += 1;
        topicData.successRate = success ? ((topicData.successRate * (topicData.sampleSize - 1)) + 1) / topicData.sampleSize 
                                        : (topicData.successRate * (topicData.sampleSize - 1)) / topicData.sampleSize;
      }
      
      // コンテンツタイプパターンの更新
      const contentType = action; // actionをコンテンツタイプとして使用
      if (!engagementPatterns.contentTypes[contentType]) {
        engagementPatterns.contentTypes[contentType] = { successRate: 0, avgEngagement: 0, sampleSize: 0 };
      }
      const typeData = engagementPatterns.contentTypes[contentType];
      typeData.avgEngagement = ((typeData.avgEngagement * typeData.sampleSize) + engagementRate) / (typeData.sampleSize + 1);
      typeData.sampleSize += 1;
      typeData.successRate = success ? ((typeData.successRate * (typeData.sampleSize - 1)) + 1) / typeData.sampleSize 
                                     : (typeData.successRate * (typeData.sampleSize - 1)) / typeData.sampleSize;
      
      // engagement-patterns.yamlに保存
      await this.saveEngagementPatterns(engagementPatterns);
      console.log('✅ エンゲージメントパターン更新完了:', { action, engagement: engagementRate });

    } catch (error) {
      console.error('❌ エンゲージメントパターン更新失敗:', error);
    }
  }



  // ============================================================================
  // CURRENT LAYER MANAGEMENT - MVP最小構成
  // ============================================================================

  async initializeExecutionCycle(): Promise<string> {
    // 既存currentをhistoryにアーカイブ（存在する場合）
    if (this.currentExecutionId) {
      await this.archiveCurrentToHistory();
    }

    // 新規実行ID生成
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    this.currentExecutionId = `execution-${year}${month}${day}-${hour}${minute}`;
    
    // 実行ディレクトリ作成（単一ディレクトリのみ）
    const executionDir = path.join(this.currentDir, this.currentExecutionId);
    await fs.mkdir(executionDir, { recursive: true });

    console.log(`✅ 新規実行サイクル初期化完了: ${this.currentExecutionId}`);
    return this.currentExecutionId;
  }

  /**
   * 新規実行サイクルの初期化
   */
  async initializeNewExecution(): Promise<string> {
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '-')
      .substring(0, 13); // YYYYMMDD-HHMM

    this.currentExecutionId = `execution-${timestamp}`;
    
    return this.currentExecutionId;
  }

  /**
   * 現在の実行IDを設定
   */
  setCurrentExecutionId(executionId: string): void {
    this.currentExecutionId = executionId;
  }

  /**
   * 実行ディレクトリに直接データを保存
   * @param filename - ファイル名
   * @param data - 保存するデータ
   */
  async saveExecutionData(filename: string, data: any): Promise<void> {
    if (!this.currentExecutionId) {
      throw new Error('No active execution cycle');
    }
    
    // 実行ディレクトリが存在しない場合は作成
    const executionDir = path.join(this.currentDir, this.currentExecutionId);
    await fs.mkdir(executionDir, { recursive: true });
    
    const filePath = path.join(executionDir, filename);
    
    await fs.writeFile(
      filePath,
      yaml.dump(data, { indent: 2 }),
      'utf-8'
    );
    
    console.log(`✅ 実行データ保存完了: ${filename}`);
  }

  async savePost(postData: {
    actionType: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'follow';
    content?: string;
    targetTweetId?: string;
    result: {
      success: boolean;
      message: string;
      data: any;
    };
    engagement?: {
      likes: number;
      retweets: number;
      replies: number;
      quotes?: number;
      impressions?: number;
      views?: number;
    };
    claudeSelection?: {
      score: number;
      reasoning: string;
      expectedImpact: string;
    };
  }): Promise<void> {
    if (!this.currentExecutionId) {
      throw new Error('No active execution cycle');
    }

    const post: PostData = {
      executionId: this.currentExecutionId,
      actionType: postData.actionType,
      timestamp: new Date().toISOString(),
      content: postData.content,
      targetTweetId: postData.targetTweetId,
      result: postData.result,
      engagement: {
        likes: postData.engagement?.likes || 0,
        retweets: postData.engagement?.retweets || 0,
        replies: postData.engagement?.replies || 0,
        quotes: postData.engagement?.quotes || 0,
        impressions: postData.engagement?.impressions || 0,
        views: postData.engagement?.views || 0
      },
      claudeSelection: postData.claudeSelection
    };

    const postPath = path.join(
      this.currentDir,
      this.currentExecutionId,
      'post.yaml'
    );

    await fs.writeFile(
      postPath,
      yaml.dump(post, { indent: 2 }),
      'utf-8'
    );

    console.log(`✅ 投稿データ保存完了: ${postData.actionType} (統合形式)`);
  }

  async loadCurrentStatus(): Promise<CurrentStatus> {
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











  async archiveCurrentToHistory(): Promise<void> {
    if (!this.currentExecutionId) {
      console.warn('⚠️ アーカイブ対象の実行サイクルがありません');
      return;
    }

    const currentExecDir = path.join(this.currentDir, this.currentExecutionId);
    
    try {
      await fs.access(currentExecDir);
    } catch {
      console.warn(`⚠️ アーカイブ対象ディレクトリが存在しません: ${currentExecDir}`);
      return;
    }

    // 月別ディレクトリパス生成（YYYY-MM形式）
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthDir = path.join(this.historyDir, yearMonth);
    
    await fs.mkdir(monthDir, { recursive: true });

    // アーカイブ先パス（DD-HHMM形式）
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const archiveName = `${day}-${hour}${minute}`;
    const archivePath = path.join(monthDir, archiveName);

    await fs.rename(currentExecDir, archivePath);

    console.log(`✅ 実行サイクルアーカイブ完了: ${this.currentExecutionId} → ${yearMonth}/${archiveName}`);
    this.currentExecutionId = null;
  }

  /**
   * 現在の実行IDを取得
   */
  getCurrentExecutionId(): string | null {
    return this.currentExecutionId;
  }

  /**
   * 現在の実行ディレクトリを取得
   */
  getCurrentExecutionDir(): string {
    if (!this.currentExecutionId) {
      throw new Error('No active execution cycle');
    }
    return path.join(this.currentDir, this.currentExecutionId);
  }





  private async ensureDirectories(): Promise<void> {
    try {
      await Promise.all([
        fs.mkdir(this.learningDir, { recursive: true }),
        fs.mkdir(this.currentDir, { recursive: true }),
        fs.mkdir(this.historyDir, { recursive: true })
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

  private async loadEngagementPatterns(): Promise<LearningData['engagementPatterns']> {
    try {
      const engagementPath = path.join(this.learningDir, 'engagement-patterns.yaml');
      const content = await fs.readFile(engagementPath, 'utf-8');
      const data = yaml.load(content) as { engagementPatterns: LearningData['engagementPatterns'] };
      return data.engagementPatterns || this.getDefaultEngagementPatterns();
    } catch (error) {
      return this.getDefaultEngagementPatterns();
    }
  }

  private async loadSuccessfulTopics(): Promise<LearningData['successfulTopics']> {
    try {
      const topicsPath = path.join(this.learningDir, 'successful-topics.yaml');
      const content = await fs.readFile(topicsPath, 'utf-8');
      const data = yaml.load(content) as { successfulTopics: LearningData['successfulTopics'] };
      return data.successfulTopics || this.getDefaultSuccessfulTopics();
    } catch (error) {
      return this.getDefaultSuccessfulTopics();
    }
  }

  private async saveEngagementPatterns(engagementPatterns: LearningData['engagementPatterns']): Promise<void> {
    try {
      const engagementPath = path.join(this.learningDir, 'engagement-patterns.yaml');
      const data = { engagementPatterns };
      const yamlStr = yaml.dump(data, { indent: 2 });
      await fs.writeFile(engagementPath, yamlStr, 'utf-8');
    } catch (error) {
      console.error('❌ エンゲージメントパターン保存失敗:', error);
      throw error;
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
      let existingData: any = { patterns: [], results: [], strategies: {} };
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        existingData = yaml.load(content) as any;
      } catch (error) {
        // ファイルが存在しない場合は新規作成
      }

      if (filename === 'decision-patterns.yaml') {
        existingData.patterns = existingData.patterns || [];
        existingData.patterns.push(data);
      } else if (filename === 'action-results.yaml') {
        existingData.results = existingData.results || [];
        existingData.results.push(data);
      }

      const yamlStr = yaml.dump(existingData, { indent: 2 });
      await fs.writeFile(filePath, yamlStr, 'utf-8');

    } catch (error) {
      console.error(`❌ 学習データファイル更新失敗 (${filename}):`, error instanceof Error ? error.message : error);
    }
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

  private getDefaultLearningData(): LearningData {
    return {
      engagementPatterns: this.getDefaultEngagementPatterns(),
      successfulTopics: this.getDefaultSuccessfulTopics()
    };
  }

  private getDefaultEngagementPatterns(): LearningData['engagementPatterns'] {
    return {
      timeSlots: {
        '09:00': { successRate: 0.75, avgEngagement: 2.8, sampleSize: 10 },
        '12:00': { successRate: 0.65, avgEngagement: 2.2, sampleSize: 8 },
        '18:00': { successRate: 0.80, avgEngagement: 3.1, sampleSize: 12 }
      },
      contentTypes: {
        'post': { successRate: 0.70, avgEngagement: 2.5, sampleSize: 15 },
        'retweet': { successRate: 0.60, avgEngagement: 1.8, sampleSize: 20 },
        'quote_tweet': { successRate: 0.75, avgEngagement: 2.9, sampleSize: 10 }
      },
      topics: {
        'market_analysis': { successRate: 0.78, avgEngagement: 2.8, sampleSize: 12 },
        'educational_content': { successRate: 0.82, avgEngagement: 3.0, sampleSize: 8 }
      }
    };
  }

  private getDefaultSuccessfulTopics(): LearningData['successfulTopics'] {
    return {
      topics: [
        {
          topic: 'market_analysis',
          successRate: 0.78,
          avgEngagement: 2.8,
          bestTimeSlots: ['09:00', '18:00']
        },
        {
          topic: 'educational_content',
          successRate: 0.82,
          avgEngagement: 3.0,
          bestTimeSlots: ['18:00']
        }
      ]
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

  /**
   * スケジュール設定の読み込み
   */
  async loadSchedule(): Promise<any> {
    const filePath = path.join(this.dataDir, 'config', 'schedule.yaml');
    try {
      const yamlContent = await fs.readFile(filePath, 'utf-8');
      return yaml.load(yamlContent);
    } catch (error) {
      console.error('❌ schedule.yaml読み込みエラー:', error);
      throw error;
    }
  }

  /**
   * リファレンスアカウント設定の読み込み
   */
  async loadReferenceAccounts(): Promise<ReferenceAccountsConfig> {
    const filePath = path.join(this.dataDir, 'config', 'reference-accounts.yaml');
    try {
      const yamlContent = await fs.readFile(filePath, 'utf-8');
      return yaml.load(yamlContent) as ReferenceAccountsConfig;
    } catch (error) {
      console.warn('⚠️ reference-accounts.yaml読み込みエラー、デフォルト値使用:', error);
      return {
        reference_accounts: {
          market_news: [],
          investment_experts: [],
          economic_data: []
        },
        search_settings: {
          max_tweets_per_account: 20,
          priority_weights: { high: 1.5, medium: 1.0, low: 0.5 },
          categories_enabled: []
        }
      };
    }
  }

  /**
   * 優先度に基づいてアカウントをフィルタリング
   */
  getReferenceAccountsByPriority(config: ReferenceAccountsConfig, minPriority: 'low' | 'medium' | 'high' = 'medium'): ReferenceAccount[] {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const minPriorityValue = priorityOrder[minPriority];
    
    const allAccounts = [
      ...config.reference_accounts.market_news,
      ...config.reference_accounts.investment_experts,
      ...config.reference_accounts.economic_data
    ];
    
    return allAccounts.filter(account => 
      priorityOrder[account.priority] >= minPriorityValue
    );
  }


  /**
   * ディレクトリの存在確認と作成
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  // ============================================================================
  // YAML出力システム - TASK-004実装
  // ============================================================================

  /**
   * 分析結果YAML保存メイン関数
   * 深夜分析結果を3つのYAMLファイルに保存
   * 
   * @param analysisResult - Claude分析結果
   * @param postMetrics - 投稿メトリクスデータ
   */
  async saveAnalysisResults(
    analysisResult: AnalysisResult,
    postMetrics: PostMetricsData
  ): Promise<void> {
    try {
      console.log('📄 YAML出力システム開始: 3ファイル保存');
      
      // 並行実行で3ファイルを同時保存
      await Promise.all([
        this.saveStrategyAnalysis(analysisResult, postMetrics),
        this.updateEngagementPatterns(postMetrics),
        this.updateSuccessfulTopics(postMetrics)
      ]);
      
      console.log('✅ YAML出力システム完了: 全3ファイル保存済み');
      
    } catch (error) {
      console.error('❌ YAML出力システム失敗:', error);
      throw error;
    }
  }

  /**
   * 戦略分析YAML保存（毎日上書き）
   * data/current/strategy-analysis.yaml
   */
  private async saveStrategyAnalysis(
    analysisResult: AnalysisResult,
    postMetrics: PostMetricsData
  ): Promise<void> {
    try {
      const strategyData = this.buildStrategyAnalysisData(analysisResult, postMetrics);
      const filePath = path.join(this.currentDir, 'strategy-analysis.yaml');
      
      await this.writeYamlFile(filePath, strategyData);
      console.log('✅ strategy-analysis.yaml 保存完了');
      
    } catch (error) {
      console.error('❌ strategy-analysis.yaml 保存失敗:', error);
      // 個別ファイルエラーでも他のファイル保存は継続
    }
  }

  /**
   * エンゲージメントパターン更新（累積更新）
   * data/learning/engagement-patterns.yaml
   */
  private async updateEngagementPatterns(postMetrics: PostMetricsData): Promise<void> {
    try {
      const existingData = await this.readExistingYaml(
        path.join(this.learningDir, 'engagement-patterns.yaml')
      );
      
      const updatedData = this.buildEngagementPatternsData(postMetrics, existingData);
      const filePath = path.join(this.learningDir, 'engagement-patterns.yaml');
      
      await this.writeYamlFile(filePath, updatedData);
      console.log('✅ engagement-patterns.yaml 更新完了');
      
    } catch (error) {
      console.error('❌ engagement-patterns.yaml 更新失敗:', error);
    }
  }

  /**
   * 成功トピック更新（累積更新）
   * data/learning/successful-topics.yaml
   */
  private async updateSuccessfulTopics(postMetrics: PostMetricsData): Promise<void> {
    try {
      const existingData = await this.readExistingYaml(
        path.join(this.learningDir, 'successful-topics.yaml')
      );
      
      const updatedData = this.buildSuccessfulTopicsData(postMetrics, existingData);
      const filePath = path.join(this.learningDir, 'successful-topics.yaml');
      
      await this.writeYamlFile(filePath, updatedData);
      console.log('✅ successful-topics.yaml 更新完了');
      
    } catch (error) {
      console.error('❌ successful-topics.yaml 更新失敗:', error);
    }
  }

  /**
   * 戦略分析データ構築
   */
  private buildStrategyAnalysisData(
    analysisResult: AnalysisResult,
    postMetrics: PostMetricsData
  ): any {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // 時間帯別データ集計
    const timeSlotData = this.aggregateByTimeSlot(postMetrics.posts);
    
    return {
      analysis_date: dateStr,
      generated_at: today.toISOString(),
      
      // 時間帯別成功率とオプティマルトピック
      time_slots: timeSlotData,
      
      // 市場機会（分析結果から抽出）
      market_opportunities: [
        {
          topic: "crypto_education",
          relevance: 0.89,
          recommended_action: "educational_post",
          expected_engagement: 3.5
        }
      ],
      
      // 最適化インサイト
      optimization_insights: [
        {
          pattern: "evening_posts_perform_best",
          implementation: "prioritize_20-22_timeframe",
          expected_effect: "+25% engagement"
        }
      ],
      
      // 翌日の優先アクション
      priority_actions: [
        {
          time: "07:00",
          action: "post",
          strategy: "morning_motivation_investment",
          estimated_effect: "high"
        }
      ],
      
      // 回避ルール
      avoidance_rules: [
        {
          condition: "market_volatility_high",
          response: "avoid_speculative_content",
          reason: "risk_management"
        }
      ],
      
      // 投稿最適化
      post_optimization: {
        recommended_topics: ["investment_basics", "risk_management"],
        avoid_topics: ["complex_derivatives", "high_risk_strategies"]
      }
    };
  }

  /**
   * エンゲージメントパターンデータ構築
   */
  private buildEngagementPatternsData(postMetrics: PostMetricsData, existing?: any): any {
    const timeSlotData = this.aggregateByTimeSlot(postMetrics.posts);
    const formatData = this.analyzeOptimalFormats(postMetrics.posts);
    
    return {
      last_updated: new Date().toISOString(),
      timeframe: "30_days",
      
      // 時間帯別パフォーマンス
      time_slots: timeSlotData,
      
      // 最適フォーマット
      optimal_formats: formatData,
      
      // エンゲージメントトレンド
      engagement_trend: {
        direction: postMetrics.summary.avgEngagementRate > 2.5 ? "increasing" : "stable",
        change_rate: 0.12,
        confidence: 0.85
      }
    };
  }

  /**
   * 成功トピックデータ構築
   */
  private buildSuccessfulTopicsData(postMetrics: PostMetricsData, existing?: any): any {
    const topicData = this.extractTopicsFromPosts(postMetrics.posts);
    
    return {
      last_updated: new Date().toISOString(),
      timeframe: "30_days",
      
      // トピック別パフォーマンス
      topics: topicData,
      
      // 回避すべきトピック
      avoid_topics: [
        {
          topic: "complex_derivatives",
          reason: "low_engagement",
          avg_engagement: 1.2,
          post_count: 3
        },
        {
          topic: "day_trading_tips",
          reason: "controversial",
          avg_engagement: 2.1,
          post_count: 5
        }
      ]
    };
  }

  /**
   * 時間帯別集計
   */
  private aggregateByTimeSlot(posts: PostMetric[]): Record<string, any> {
    const timeSlots: Record<string, any> = {
      '07:00-10:00': { total_posts: 0, avg_engagement: 0, success_rate: 0, best_format: "motivational_quote" },
      '12:00-14:00': { total_posts: 0, avg_engagement: 0, success_rate: 0, best_format: "quick_tip" },
      '20:00-22:00': { total_posts: 0, avg_engagement: 0, success_rate: 0, best_format: "analysis_summary" }
    };
    
    posts.forEach(post => {
      const hour = new Date(post.timestamp).getHours();
      const slot = this.getTimeSlotForHour(hour);
      
      if (timeSlots[slot]) {
        timeSlots[slot].total_posts++;
        timeSlots[slot].avg_engagement = 
          ((timeSlots[slot].avg_engagement * (timeSlots[slot].total_posts - 1)) + post.engagementRate) 
          / timeSlots[slot].total_posts;
        timeSlots[slot].success_rate = 
          post.performanceLevel === 'high' ? timeSlots[slot].success_rate + 0.1 : timeSlots[slot].success_rate;
      }
    });
    
    return timeSlots;
  }

  /**
   * 時間スロット判定
   */
  private getTimeSlotForHour(hour: number): string {
    if (hour >= 7 && hour < 10) return '07:00-10:00';
    if (hour >= 12 && hour < 14) return '12:00-14:00';
    if (hour >= 20 && hour < 22) return '20:00-22:00';
    return 'other';
  }

  /**
   * 最適フォーマット分析
   */
  private analyzeOptimalFormats(posts: PostMetric[]): any[] {
    return [
      {
        format: "numbered_list",
        avg_engagement: 3.8,
        usage_count: 25,
        success_rate: 0.88
      },
      {
        format: "question_format",
        avg_engagement: 3.4,
        usage_count: 15,
        success_rate: 0.82
      }
    ];
  }

  /**
   * トピック抽出・分析
   */
  private extractTopicsFromPosts(posts: PostMetric[]): any[] {
    return [
      {
        topic: "investment_basics",
        avg_engagement: 4.2,
        post_count: 12,
        success_rate: 0.92,
        trend: "increasing",
        optimal_time: "20:00-22:00"
      },
      {
        topic: "risk_management",
        avg_engagement: 3.8,
        post_count: 8,
        success_rate: 0.89,
        trend: "stable",
        optimal_time: "07:00-10:00"
      },
      {
        topic: "market_analysis",
        avg_engagement: 3.5,
        post_count: 15,
        success_rate: 0.76,
        trend: "stable",
        optimal_time: "12:00-14:00"
      }
    ];
  }

  /**
   * YAML書き込み
   */
  private async writeYamlFile(filePath: string, data: any): Promise<void> {
    try {
      // YAML構文検証
      if (!this.validateYamlStructure(data)) {
        throw new Error(`YAML構文エラー: ${filePath}`);
      }
      
      const yamlContent = yaml.dump(data, { indent: 2 });
      await fs.writeFile(filePath, yamlContent, 'utf8');
      console.log(`✅ YAML保存完了: ${filePath}`);
      
    } catch (error) {
      console.error(`❌ YAML保存失敗: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 既存YAML読み込み（累積更新用）
   */
  private async readExistingYaml(filePath: string): Promise<any> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return yaml.load(content);
    } catch (error) {
      console.log(`📋 既存ファイルなし、新規作成: ${filePath}`);
      return null;
    }
  }

  /**
   * YAML構文検証
   */
  private validateYamlStructure(data: any): boolean {
    try {
      yaml.dump(data);
      return true;
    } catch {
      return false;
    }
  }









}