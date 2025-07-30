/**
 * データ管理クラス
 * REQUIREMENTS.md準拠版 - 統合データ管理システム
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

// ============================================================================
// 簡素化されたインターフェース（MVP版）
// ============================================================================

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
  id: string;
  timestamp: string;
  content: string;
  metrics?: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

/**
 * 統合データ管理クラス
 * 設定・学習データ・実行コンテキストの一元管理
 */
export class DataManager {
  private readonly dataDir = path.join(process.cwd(), 'data');
  private readonly dataRoot = this.dataDir;
  private readonly learningDir = path.join(this.dataDir, 'learning');
  private readonly currentDir = path.join(this.dataDir, 'current');
  private readonly historyDir = path.join(this.dataDir, 'history');
  private currentExecutionId: string | null = null;

  constructor() {
    console.log('✅ DataManager initialized - 簡素化版');
    this.ensureDirectories();
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
  // 新学習データ管理メソッド（深夜大規模分析システム対応）
  // ============================================================================

  /**
   * 日次大規模分析結果の保存
   */
  async saveDailyInsights(insights: DailyInsight): Promise<void> {
    const filename = `daily-insights-${insights.date.replace(/-/g, '')}.yaml`;
    const filepath = path.join(this.dataRoot, 'learning', filename);
    
    try {
      const yamlContent = yaml.dump(insights, { 
        flowLevel: 2,
        indent: 2,
        lineWidth: 120
      });
      
      await fs.writeFile(filepath, yamlContent, 'utf8');
      console.log(`✅ 日次分析結果保存完了: ${filename}`);
      
      // 古いファイルのクリーンアップ（30日以上古いファイル削除）
      await this.cleanupOldDailyInsights();
      
    } catch (error) {
      console.error(`❌ 日次分析結果保存エラー: ${filename}`, error);
      throw error;
    }
  }

  /**
   * 翌日戦略の保存
   */
  async saveTomorrowStrategy(strategy: TomorrowStrategy): Promise<void> {
    const filepath = path.join(this.dataRoot, 'current', 'tomorrow-strategy.yaml');
    
    try {
      const yamlContent = yaml.dump(strategy, {
        flowLevel: 2,
        indent: 2,
        lineWidth: 120
      });
      
      await fs.writeFile(filepath, yamlContent, 'utf8');
      console.log('✅ 翌日戦略保存完了: tomorrow-strategy.yaml');
      
    } catch (error) {
      console.error('❌ 翌日戦略保存エラー:', error);
      throw error;
    }
  }

  /**
   * 日次パフォーマンス集計の保存
   */
  async savePerformanceSummary(summary: PerformanceSummary): Promise<void> {
    const filename = `performance-summary-${summary.date.replace(/-/g, '')}.yaml`;
    const filepath = path.join(this.dataRoot, 'learning', filename);
    
    try {
      const yamlContent = yaml.dump(summary, {
        flowLevel: 2,
        indent: 2,
        lineWidth: 120
      });
      
      await fs.writeFile(filepath, yamlContent, 'utf8');
      console.log(`✅ パフォーマンス集計保存完了: ${filename}`);
      
    } catch (error) {
      console.error(`❌ パフォーマンス集計保存エラー: ${filename}`, error);
      throw error;
    }
  }

  /**
   * 翌日戦略の読み込み
   */
  async loadTomorrowStrategy(): Promise<TomorrowStrategy | null> {
    const filepath = path.join(this.dataRoot, 'current', 'tomorrow-strategy.yaml');
    
    try {
      const content = await fs.readFile(filepath, 'utf8');
      const strategy = yaml.load(content) as TomorrowStrategy;
      
      // 有効期限チェック
      if (new Date() > new Date(strategy.validUntil)) {
        console.warn('⚠️ 翌日戦略の有効期限が切れています');
        return null;
      }
      
      console.log('✅ 翌日戦略読み込み完了');
      return strategy;
      
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('📝 翌日戦略ファイルが存在しません（初回実行）');
        return null;
      }
      console.error('❌ 翌日戦略読み込みエラー:', error);
      throw error;
    }
  }

  /**
   * 日次分析結果の読み込み（指定日または最新）
   */
  async loadDailyInsights(date?: string): Promise<DailyInsight | null> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const filename = `daily-insights-${targetDate.replace(/-/g, '')}.yaml`;
    const filepath = path.join(this.dataRoot, 'learning', filename);
    
    try {
      const content = await fs.readFile(filepath, 'utf8');
      const insights = yaml.load(content) as DailyInsight;
      
      console.log(`✅ 日次分析結果読み込み完了: ${filename}`);
      return insights;
      
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log(`📝 日次分析結果ファイルが存在しません: ${filename}`);
        return null;
      }
      console.error(`❌ 日次分析結果読み込みエラー: ${filename}`, error);
      throw error;
    }
  }

  /**
   * 最近N日間の日次分析結果を取得
   */
  async loadRecentDailyInsights(days: number = 7): Promise<DailyInsight[]> {
    const insights: DailyInsight[] = [];
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setUTCDate(date.getUTCDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dailyInsight = await this.loadDailyInsights(dateStr);
      if (dailyInsight) {
        insights.push(dailyInsight);
      }
    }
    
    console.log(`✅ 最近${days}日間の分析結果読み込み完了: ${insights.length}件`);
    return insights;
  }

  /**
   * 古い日次分析ファイルのクリーンアップ（30日以上前）
   */
  private async cleanupOldDailyInsights(): Promise<void> {
    const learningDir = path.join(this.dataRoot, 'learning');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
    
    try {
      const files = await fs.readdir(learningDir);
      const insightFiles = files.filter(file => 
        file.startsWith('daily-insights-') && file.endsWith('.yaml')
      );
      
      for (const file of insightFiles) {
        // ファイル名から日付を抽出 (daily-insights-YYYYMMDD.yaml)
        const dateMatch = file.match(/daily-insights-(\d{8})\.yaml/);
        if (dateMatch) {
          const fileDateStr = dateMatch[1];
          const fileDate = new Date(
            `${fileDateStr.slice(0,4)}-${fileDateStr.slice(4,6)}-${fileDateStr.slice(6,8)}`
          );
          
          if (fileDate < thirtyDaysAgo) {
            const filepath = path.join(learningDir, file);
            await fs.unlink(filepath);
            console.log(`🗑️ 古い分析ファイルを削除: ${file}`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ 古いファイルクリーンアップでエラー:', error);
      // クリーンアップエラーは致命的でない
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

  async savePost(postData: {
    actionType: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'follow';
    content?: string;
    tweetId?: string;
    result: any;
    engagement?: any;
  }): Promise<void> {
    if (!this.currentExecutionId) {
      throw new Error('No active execution cycle');
    }

    const post = {
      executionId: this.currentExecutionId,
      actionType: postData.actionType,
      timestamp: new Date().toISOString(),
      content: postData.content || '',
      result: postData.result,
      engagement: postData.engagement || {
        likes: 0,
        retweets: 0,
        replies: 0
      }
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

    console.log(`✅ 投稿データ保存完了: ${postData.actionType}`);
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

  async saveClaudeOutput(type: string, data: any): Promise<void> {
    console.log(`✅ Claude出力保存簡素化版: ${type}`);
  }

  async saveKaitoResponse(type: string, data: any): Promise<void> {
    console.log(`✅ Kaito応答保存簡素化版: ${type}`);
  }

  async updateAccountStatus(kaitoAccountInfo: any): Promise<void> {
    console.log('✅ アカウント情報更新簡素化版');
  }

  async getCurrentExecutionData(): Promise<any> {
    return {
      executionId: this.currentExecutionId,
      claudeOutputs: {},
      kaitoResponses: {},
      posts: [],
      summary: null
    };
  }

  async updateExecutionSummary(summary: ExecutionSummary): Promise<void> {
    console.log('✅ 実行サマリー更新簡素化版');
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
   * KaitoAPIアカウント情報をCurrentStatus.account_status形式に正規化
   */
  private normalizeKaitoAccountInfo(kaitoAccountInfo: any): Partial<CurrentStatus['account_status']> {
    // KaitoAPIの様々なレスポンス形式に対応
    const normalized: Partial<CurrentStatus['account_status']> = {};

    // フォロワー数の正規化
    if (kaitoAccountInfo.followers_count !== undefined) {
      normalized.followers = parseInt(kaitoAccountInfo.followers_count, 10) || 0;
    } else if (kaitoAccountInfo.followersCount !== undefined) {
      normalized.followers = parseInt(kaitoAccountInfo.followersCount, 10) || 0;
    } else if (kaitoAccountInfo.followers !== undefined) {
      normalized.followers = parseInt(kaitoAccountInfo.followers, 10) || 0;
    }

    // フォロー数の正規化
    if (kaitoAccountInfo.friends_count !== undefined) {
      normalized.following = parseInt(kaitoAccountInfo.friends_count, 10) || 0;
    } else if (kaitoAccountInfo.followingCount !== undefined) {
      normalized.following = parseInt(kaitoAccountInfo.followingCount, 10) || 0;
    } else if (kaitoAccountInfo.following !== undefined) {
      normalized.following = parseInt(kaitoAccountInfo.following, 10) || 0;
    }

    // ツイート数の正規化（今日分は計算が複雑なので、とりあえず総ツイート数から推定）
    if (kaitoAccountInfo.statuses_count !== undefined) {
      normalized.tweets_today = this.estimateTodayTweets(kaitoAccountInfo.statuses_count);
    } else if (kaitoAccountInfo.tweetsCount !== undefined) {
      normalized.tweets_today = this.estimateTodayTweets(kaitoAccountInfo.tweetsCount);
    }

    // エンゲージメント率の計算（可能な場合）
    if (normalized.followers && normalized.followers > 0) {
      // 簡易的なエンゲージメント率計算
      normalized.engagement_rate_24h = Math.min(
        (normalized.followers / 1000) * 2.5, // フォロワー1000人につき2.5%
        10.0 // 最大10%
      );
    }

    return normalized;
  }

  /**
   * 今日のツイート数推定（簡易版）
   * 実際のAPIでは日付別のツイート情報が必要だが、とりあえずの推定値
   */
  private estimateTodayTweets(totalTweets: number): number {
    // 総ツイート数から今日の推定値を計算（非常に簡易的）
    // アクティブユーザーは平均1日5-10ツイートと仮定
    const dailyAverage = Math.max(1, Math.min(totalTweets / 365, 10));
    return Math.floor(Math.random() * dailyAverage); // 0-平均の範囲でランダム
  }

  private async loadExecutionSummary(): Promise<ExecutionSummary> {
    if (!this.currentExecutionId) {
      throw new Error('No active execution cycle');
    }

    const summaryPath = path.join(
      this.currentDir,
      this.currentExecutionId,
      'execution-summary.yaml'
    );

    try {
      const content = await fs.readFile(summaryPath, 'utf-8');
      return yaml.load(content) as ExecutionSummary;
    } catch (error) {
      throw new Error(`Failed to load execution summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async saveExecutionSummary(summary: ExecutionSummary): Promise<void> {
    if (!this.currentExecutionId) {
      throw new Error('No active execution cycle');
    }

    const summaryPath = path.join(
      this.currentDir,
      this.currentExecutionId,
      'execution-summary.yaml'
    );

    await fs.writeFile(
      summaryPath,
      yaml.dump(summary, { indent: 2 }),
      'utf-8'
    );
  }

  private async updatePostIndex(post: PostData): Promise<void> {
    if (!this.currentExecutionId) {
      throw new Error('No active execution cycle');
    }

    const indexPath = path.join(
      this.currentDir,
      this.currentExecutionId,
      'posts',
      'post-index.yaml'
    );

    let index: { posts: Array<{ id: string; timestamp: string; summary: string }> } = { posts: [] };

    // 既存インデックスの読み込み
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      index = yaml.load(content) as typeof index;
    } catch {
      // ファイルが存在しない場合は新規作成
    }

    // 新規投稿を追加
    index.posts.push({
      id: post.id,
      timestamp: post.timestamp,
      summary: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : '')
    });

    // インデックスを保存
    await fs.writeFile(
      indexPath,
      yaml.dump(index, { indent: 2 }),
      'utf-8'
    );
  }

  private async loadPostsFromDirectory(directory: string): Promise<PostData[]> {
    const posts: PostData[] = [];

    try {
      const files = await fs.readdir(directory);
      
      for (const file of files) {
        if (file.startsWith('post-') && file.endsWith('.yaml')) {
          try {
            const content = await fs.readFile(path.join(directory, file), 'utf-8');
            const post = yaml.load(content) as PostData;
            posts.push(post);
          } catch (error) {
            console.warn(`⚠️ 投稿ファイル読み込みスキップ: ${file}`);
          }
        }
      }
    } catch (error) {
      // ディレクトリが存在しない場合は空配列を返す
    }

    return posts;
  }

  private async getRecentPostsFromHistory(limit: number): Promise<PostData[]> {
    const posts: PostData[] = [];

    try {
      // 最新月から順に検索
      const monthDirs = await fs.readdir(this.historyDir);
      const sortedMonths = monthDirs
        .filter(dir => /^\d{4}-\d{2}$/.test(dir))
        .sort((a, b) => b.localeCompare(a)); // 新しい月順

      for (const monthDir of sortedMonths) {
        if (posts.length >= limit) break;

        const monthPath = path.join(this.historyDir, monthDir);
        const execDirs = await fs.readdir(monthPath);
        const sortedExecs = execDirs
          .filter(dir => /^\d{2}-\d{4}$/.test(dir))
          .sort((a, b) => b.localeCompare(a)); // 新しい実行順

        for (const execDir of sortedExecs) {
          if (posts.length >= limit) break;

          const postsDir = path.join(monthPath, execDir, 'posts');
          const execPosts = await this.loadPostsFromDirectory(postsDir);
          
          // 新しい順にソートして必要な分だけ追加
          execPosts.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          
          const needed = limit - posts.length;
          posts.push(...execPosts.slice(0, needed));
        }
      }
    } catch (error) {
      console.warn('⚠️ History層からの投稿取得でエラー:', error);
    }

    return posts;
  }

  private async checkFileCountLimit(directory: string, maxFiles: number): Promise<void> {
    try {
      const files = await fs.readdir(directory);
      const yamlFiles = files.filter(f => f.endsWith('.yaml'));
      
      if (yamlFiles.length >= maxFiles) {
        console.warn(`⚠️ ファイル数が上限に達しています: ${yamlFiles.length}/${maxFiles}`);
        // 最も古いファイルを削除
        const sortedFiles = yamlFiles.sort((a, b) => a.localeCompare(b));
        const toDelete = sortedFiles[0];
        await fs.unlink(path.join(directory, toDelete));
        console.log(`🧹 古いファイルを削除: ${toDelete}`);
      }
    } catch (error) {
      // ディレクトリが存在しない場合は無視
    }
  }

  private async checkDirectorySize(directory: string, maxSizeMB: number): Promise<boolean> {
    try {
      let totalSize = 0;
      
      const calculateDirSize = async (dir: string): Promise<number> => {
        let size = 0;
        const items = await fs.readdir(dir);
        
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = await fs.stat(itemPath);
          
          if (stat.isDirectory()) {
            size += await calculateDirSize(itemPath);
          } else {
            size += stat.size;
          }
        }
        
        return size;
      };
      
      totalSize = await calculateDirSize(directory);
      const sizeMB = totalSize / (1024 * 1024);
      
      if (sizeMB > maxSizeMB) {
        console.warn(`⚠️ ディレクトリサイズが制限を超えています: ${sizeMB.toFixed(2)}MB / ${maxSizeMB}MB`);
        return false;
      }
      
      return true;
    } catch (error) {
      // ディレクトリが存在しない場合はtrue
      return true;
    }
  }
}