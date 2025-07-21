import { SimpleXClient } from './x-client';
import { PlaywrightAccountCollector, PlaywrightAccountInfo } from './playwright-account-collector';
import { AccountInfo, AccountMetrics, PostMetrics, EngagementMetrics } from '../types/index';
import type { AccountStatus } from '../types/autonomous-system';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import * as yaml from 'js-yaml';

// レガシー型定義（内部使用のみ）
interface LegacyAccountStatus {
  username: string;
  currentMetrics: {
    followersCount: number;
    followingCount: number;
    tweetCount: number;
    lastTweetTime: number;
  };
  performanceMetrics: {
    recentEngagementRate: number;
    averageLikesPerTweet: number;
    averageRetweetsPerTweet: number;
    growthRate: number;
  };
  healthScore: number; // 0-100
  recommendations: string[];
  timestamp: number;
}

// 新しいAccountStatus型へのマッピング用ヘルパー
export { AccountStatus };

export interface PerformanceMetrics {
  engagementRate: number;
  averageLikes: number;
  averageRetweets: number;
  postingFrequency: number;
  bestPerformingContent: string[];
}

export interface HealthIndicators {
  apiLimitStatus: 'normal' | 'limited' | 'blocked';
  accountStatus: 'healthy' | 'restricted' | 'suspended';
  contentQualityScore: number;
  growthMomentum: 'positive' | 'stable' | 'negative';
}

export class AccountAnalyzer {
  private xClient: SimpleXClient;
  private analysisFile = 'data/current/current-analysis.yaml';
  private claudeSummaryFile = 'data/claude-summary.yaml';
  private playwrightCollector: PlaywrightAccountCollector;

  constructor(xClient: SimpleXClient) {
    this.xClient = xClient;
    this.playwrightCollector = new PlaywrightAccountCollector();
  }

  async analyzeCurrentStatus(): Promise<AccountStatus> {
    try {
      // 基本アカウント情報を取得（Playwright使用、フォールバック戦略付き）
      const accountInfo = await this.getAccountInfoWithFallback();
      
      // パフォーマンス指標を取得
      const performanceMetrics = await this.getPerformanceMetrics();
      
      // ヘルスチェック
      const healthScore = await this.calculateHealthScore();
      
      // 推奨事項生成
      const recommendations = this.generateRecommendations(accountInfo, performanceMetrics, healthScore);

      // レガシー形式でデータを構築
      const legacyStatus: LegacyAccountStatus = {
        username: accountInfo.username,
        currentMetrics: {
          followersCount: accountInfo.followers_count,
          followingCount: accountInfo.following_count,
          tweetCount: accountInfo.tweet_count,
          lastTweetTime: this.getLastTweetTime(),
        },
        performanceMetrics: {
          recentEngagementRate: performanceMetrics.engagementRate,
          averageLikesPerTweet: performanceMetrics.averageLikes,
          averageRetweetsPerTweet: performanceMetrics.averageRetweets,
          growthRate: this.calculateGrowthRate(accountInfo),
        },
        healthScore,
        recommendations,
        timestamp: Date.now(),
      };
      
      // 新しいAccountStatus型にマッピング
      const accountStatus: AccountStatus = this.mapToNewAccountStatus(legacyStatus);

      // 分析結果を保存
      this.saveAnalysisResult(accountStatus);
      
      return accountStatus;
    } catch (error) {
      console.error('Error analyzing account status:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const postHistory = this.xClient.getPostHistory();
      const recentPosts = postHistory.filter(
        post => post.timestamp > Date.now() - (7 * 24 * 60 * 60 * 1000) // 7日以内
      );

      if (recentPosts.length === 0) {
        return {
          engagementRate: 0,
          averageLikes: 0,
          averageRetweets: 0,
          postingFrequency: 0,
          bestPerformingContent: [],
        };
      }

      // エンゲージメント率計算（仮の値として投稿成功率を使用）
      const successfulPosts = recentPosts.filter(post => post.success);
      const engagementRate = (successfulPosts.length / recentPosts.length) * 100;

      // 平均エンゲージメント数（実際のAPI呼び出しが必要だが、現在はダミー値）
      const averageLikes = this.calculateAverageEngagement(recentPosts, 'likes');
      const averageRetweets = this.calculateAverageEngagement(recentPosts, 'retweets');

      // 投稿頻度（1日あたり）
      const postingFrequency = recentPosts.length / 7;

      // ベストパフォーマンス投稿
      const bestPerformingContent = this.getBestPerformingContent(recentPosts);

      return {
        engagementRate,
        averageLikes,
        averageRetweets,
        postingFrequency,
        bestPerformingContent,
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  async calculateHealthScore(): Promise<number> {
    try {
      let score = 100;
      
      // 投稿成功率をチェック
      const successRate = this.xClient.getSuccessRate(24);
      if (successRate < 90) score -= 20;
      else if (successRate < 95) score -= 10;

      // 投稿頻度をチェック（1日15回目標）
      const postHistory = this.xClient.getPostHistory();
      const todayPosts = postHistory.filter(
        post => post.timestamp > Date.now() - (24 * 60 * 60 * 1000)
      );
      
      const dailyPostTarget = 15;
      const currentDailyPosts = todayPosts.length;
      
      if (currentDailyPosts < dailyPostTarget * 0.5) score -= 30;
      else if (currentDailyPosts < dailyPostTarget * 0.7) score -= 15;
      else if (currentDailyPosts < dailyPostTarget * 0.9) score -= 5;

      // 最近の投稿間隔をチェック
      const lastPostTime = this.getLastTweetTime();
      const timeSinceLastPost = Date.now() - lastPostTime;
      const targetInterval = (24 * 60 * 60 * 1000) / dailyPostTarget; // 動的間隔計算（24時間÷投稿目標数）

      if (timeSinceLastPost > targetInterval * 2) score -= 15;
      else if (timeSinceLastPost > targetInterval * 1.5) score -= 8;

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error('Error calculating health score:', error);
      return 50; // デフォルト値
    }
  }

  private getLastTweetTime(): number {
    const postHistory = this.xClient.getPostHistory();
    const successfulPosts = postHistory.filter(post => post.success);
    
    if (successfulPosts.length === 0) {
      return Date.now() - (24 * 60 * 60 * 1000); // 24時間前をデフォルト
    }

    return Math.max(...successfulPosts.map(post => post.timestamp));
  }

  private calculateGrowthRate(accountInfo: AccountInfo & AccountMetrics): number {
    try {
      // アカウント履歴から成長率を計算
      const accountFile = 'data/account-config.yaml';
      if (!existsSync(accountFile)) return 0;

      const data = yaml.load(readFileSync(accountFile, 'utf8')) as any;
      const history = data?.history || [];

      if (history.length < 2) return 0;

      // 直近の成長率計算（24時間前との比較）
      const current = accountInfo.followers_count;
      const previous = history[history.length - 2]?.followers_count || current;
      
      if (previous === 0) return 0;
      
      return ((current - previous) / previous) * 100;
    } catch (error) {
      console.error('Error calculating growth rate:', error);
      return 0;
    }
  }

  private calculateAverageEngagement(posts: any[], type: 'likes' | 'retweets'): number {
    const postsWithEngagement = posts.filter(post => post[type] !== undefined);
    if (postsWithEngagement.length === 0) return 0;

    const total = postsWithEngagement.reduce((sum, post) => sum + (post[type] || 0), 0);
    return total / postsWithEngagement.length;
  }

  private getBestPerformingContent(posts: any[]): string[] {
    return posts
      .filter(post => post.success && post.qualityScore)
      .sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0))
      .slice(0, 3)
      .map(post => post.content);
  }

  private generateRecommendations(
    accountInfo: AccountInfo & AccountMetrics,
    performanceMetrics: PerformanceMetrics,
    healthScore: number
  ): string[] {
    const recommendations: string[] = [];

    // ヘルススコアに基づく推奨事項
    if (healthScore < 70) {
      recommendations.push('投稿頻度を改善し、1日15回の目標達成を推奨');
    }

    // フォロワー数に基づく推奨事項
    if (accountInfo.followers_count < 1000) {
      recommendations.push('エンゲージメント重視のコンテンツで認知度向上を図る');
    }

    // エンゲージメント率に基づく推奨事項
    if (performanceMetrics.engagementRate < 2) {
      recommendations.push('より価値のあるコンテンツ投稿でエンゲージメント向上を目指す');
    }

    // 投稿頻度に基づく推奨事項
    if (performanceMetrics.postingFrequency < 10) {
      recommendations.push('定期的な投稿スケジュールの確立を推奨');
    }

    // フォロー/フォロワー比率チェック
    const followRatio = accountInfo.following_count / Math.max(accountInfo.followers_count, 1);
    if (followRatio > 2) {
      recommendations.push('フォロー数とフォロワー数のバランス改善を検討');
    }

    return recommendations.slice(0, 5); // 最大5つの推奨事項
  }

  private saveAnalysisResult(accountStatus: AccountStatus): void {
    try {
      // 軽量版のaccount-analysis-data.yamlを更新（最新データのみ）
      const lightweightAnalysis = {
        timestamp: accountStatus.timestamp,
        followers: {
          current: accountStatus.followers.current,
          change_24h: accountStatus.followers.change_24h,
          growth_rate: accountStatus.followers.growth_rate
        },
        engagement: {
          avg_likes: accountStatus.engagement.avg_likes,
          avg_retweets: accountStatus.engagement.avg_retweets,
          engagement_rate: accountStatus.engagement.engagement_rate
        },
        performance: {
          posts_today: accountStatus.performance.posts_today,
          target_progress: accountStatus.performance.target_progress
        },
        health: {
          status: accountStatus.health.status,
          quality_score: accountStatus.health.quality_score || accountStatus.healthScore
        }
      };

      writeFileSync(this.analysisFile, yaml.dump(lightweightAnalysis, { indent: 2 }));

      // claude-summary.yamlのリアルタイム更新
      this.updateClaudeSummary(accountStatus);

      // account-config.yamlも更新
      this.updateAccountConfig(accountStatus);
    } catch (error) {
      console.error('Error saving analysis result:', error);
    }
  }

  private updateClaudeSummary(accountStatus: AccountStatus): void {
    try {
      // claude-summary.yamlを読み込み
      let claudeSummary: any = {};
      if (existsSync(this.claudeSummaryFile)) {
        const existingData = readFileSync(this.claudeSummaryFile, 'utf8');
        claudeSummary = yaml.load(existingData) as any || {};
      }

      // アカウント情報を更新
      claudeSummary.lastUpdated = new Date().toISOString();
      claudeSummary.system = claudeSummary.system || {};
      claudeSummary.system.current_health = accountStatus.healthScore;
      
      claudeSummary.account = claudeSummary.account || {};
      claudeSummary.account.followers = accountStatus.followers.current;
      claudeSummary.account.engagement_rate = Math.round(Number(accountStatus.engagement.engagement_rate) || 0);
      claudeSummary.account.target_progress = accountStatus.performance.target_progress;

      // ファイルに保存
      writeFileSync(this.claudeSummaryFile, yaml.dump(claudeSummary, { indent: 2 }));
      
      console.log('✅ [Claude Summary更新] 分析完了時の自動更新実行');
    } catch (error) {
      console.error('Error updating claude-summary:', error);
    }
  }

  private updateAccountConfig(accountStatus: AccountStatus): void {
    try {
      const configFile = 'data/account-config.yaml';
      
      // 既存設定を読み込み
      let config: any = {};
      if (existsSync(configFile)) {
        config = yaml.load(readFileSync(configFile, 'utf8')) || {};
      }

      // 分析結果を追加/更新
      config.current_analysis = {
        last_analysis: accountStatus.timestamp,
        health_score: accountStatus.healthScore,
        performance_trend: 'stable', // 簡略化
        recommendations: accountStatus.recommendations,
      };

      // パフォーマンス履歴を更新
      if (!config.performance_history) {
        config.performance_history = [];
      }

      config.performance_history.push({
        timestamp: accountStatus.timestamp,
        health_score: accountStatus.healthScore,
        engagement_rate: parseFloat(accountStatus.engagement.engagement_rate.replace('%', '')),
        followers_count: accountStatus.followers.current,
      });

      // 最新10件のみ保持
      config.performance_history = config.performance_history.slice(-10);

      writeFileSync(configFile, yaml.dump(config, { indent: 2 }));
    } catch (error) {
      console.error('Error updating account config:', error);
    }
  }

  private determineTrend(accountStatus: LegacyAccountStatus): 'improving' | 'stable' | 'declining' {
    const healthScore = accountStatus.healthScore;
    const growthRate = accountStatus.performanceMetrics.growthRate;

    if (healthScore >= 80 && growthRate > 0) return 'improving';
    if (healthScore < 60 || growthRate < -1) return 'declining';
    return 'stable';
  }
  
  // レガシー形式から新しいAccountStatus型へのマッピング
  private mapToNewAccountStatus(legacyStatus: LegacyAccountStatus): AccountStatus {
    return {
      timestamp: new Date(legacyStatus.timestamp).toISOString(),
      followers: {
        current: legacyStatus.currentMetrics.followersCount,
        change_24h: 0, // 簡略化のためデフォルト値
        growth_rate: `${legacyStatus.performanceMetrics.growthRate.toFixed(1)}%`
      },
      engagement: {
        avg_likes: legacyStatus.performanceMetrics.averageLikesPerTweet,
        avg_retweets: legacyStatus.performanceMetrics.averageRetweetsPerTweet,
        engagement_rate: `${legacyStatus.performanceMetrics.recentEngagementRate.toFixed(1)}%`
      },
      performance: {
        posts_today: 0, // 実際の値は別途取得が必要
        target_progress: '0%', // 実際の値は別途取得が必要
        best_posting_time: '09:00-11:00' // デフォルト値
      },
      health: {
        status: legacyStatus.healthScore >= 70 ? 'healthy' : legacyStatus.healthScore >= 40 ? 'warning' : 'critical',
        api_limits: 'normal', // デフォルト値
        quality_score: legacyStatus.healthScore
      },
      recommendations: legacyStatus.recommendations,
      healthScore: legacyStatus.healthScore
    };
  }

  /**
   * フォールバック戦略付きアカウント情報取得
   * 1. Primary: Playwright収集
   * 2. Fallback: キャッシュデータ
   * 3. Error Handling: デフォルト値
   */
  private async getAccountInfoWithFallback(): Promise<AccountInfo & AccountMetrics> {
    try {
      console.log('🎭 [アカウント情報取得] Playwright収集を試行中...');
      
      // Primary: Playwright収集
      const playwrightInfo = await this.playwrightCollector.collectAccountInfo();
      
      console.log('✅ [Playwright収集成功] アカウント情報を正常に取得');
      
      // アカウント情報をキャッシュに保存
      const accountInfo = {
        username: playwrightInfo.username,
        user_id: playwrightInfo.user_id,
        display_name: playwrightInfo.display_name,
        verified: playwrightInfo.verified,
        followers_count: playwrightInfo.followers_count,
        following_count: playwrightInfo.following_count,
        tweet_count: playwrightInfo.tweet_count,
        listed_count: playwrightInfo.listed_count,
        last_updated: playwrightInfo.last_updated
      };
      
      await this.cacheAccountInfo(accountInfo);
      return accountInfo;
      
    } catch (playwrightError) {
      console.warn('⚠️ [Playwright収集失敗] フォールバック実行:', playwrightError);
      
      try {
        // Fallback: キャッシュからの復旧
        const cachedInfo = await this.getCachedAccountInfo();
        if (cachedInfo) {
          console.log('📋 [キャッシュ復旧成功] キャッシュからアカウント情報を復旧');
          return cachedInfo;
        }
      } catch (cacheError) {
        console.warn('⚠️ [キャッシュ復旧失敗]:', cacheError);
      }
      
      // Error Handling: デフォルト値
      console.log('🔧 [デフォルト値使用] デフォルトのアカウント情報を使用');
      return await this.getDefaultAccountInfo();
    }
  }

  /**
   * キャッシュされたアカウント情報を取得
   */
  private async getCachedAccountInfo(): Promise<(AccountInfo & AccountMetrics) | null> {
    try {
      const configFile = 'data/account-config.yaml';
      if (!existsSync(configFile)) return null;

      const config = yaml.load(readFileSync(configFile, 'utf8')) as any;
      const cachedData = config?.cached_account_info;
      
      if (!cachedData) return null;

      // キャッシュの有効期限チェック（24時間）
      const cacheAge = Date.now() - (cachedData.last_updated || 0);
      const maxCacheAge = 24 * 60 * 60 * 1000; // 24時間
      
      if (cacheAge > maxCacheAge) {
        console.log('⏰ [キャッシュ期限切れ] キャッシュが古すぎるため使用しない');
        return null;
      }

      return {
        username: cachedData.username || 'unknown',
        user_id: cachedData.user_id || 'unknown',
        display_name: cachedData.display_name || 'Unknown User',
        verified: cachedData.verified || false,
        followers_count: cachedData.followers_count || 0,
        following_count: cachedData.following_count || 0,
        tweet_count: cachedData.tweet_count || 0,
        listed_count: cachedData.listed_count || 0,
        last_updated: cachedData.last_updated || Date.now()
      };
    } catch (error) {
      console.error('❌ [キャッシュ読み込みエラー]:', error);
      return null;
    }
  }

  /**
   * デフォルトのアカウント情報を生成（投稿履歴強化版）
   */
  private async getDefaultAccountInfo(): Promise<AccountInfo & AccountMetrics> {
    const defaultUsername = process.env.X_USERNAME || 'trading_assistant';
    
    // 投稿履歴が0件の場合、初期コンテキストを生成
    const initialContext = await this.generateInitialContext(defaultUsername);
    
    return {
      username: defaultUsername,
      user_id: defaultUsername,
      display_name: 'Trading Assistant',
      verified: false,
      followers_count: 0,
      following_count: 0,
      tweet_count: initialContext.demoTweetCount,  // デモ投稿数を反映
      listed_count: 0,
      last_updated: Date.now()
    };
  }

  /**
   * 投稿履歴生成システム - 新規アカウント向け初期コンテキスト生成
   */
  private async generateInitialContext(username: string): Promise<{
    demoTweetCount: number;
    contextData: any;
    learningBaseline: any;
  }> {
    console.log(`🎯 [初期コンテキスト生成] ${username}向けの投稿履歴を作成中...`);

    try {
      // 基本的な投資戦略テンプレートを生成
      const strategicBaseline = await this.createStrategicBaseline();
      
      // 業界標準トレンドの活用
      const industryTrends = await this.getIndustryStandardTrends();
      
      // 類似アカウントパターンの参考
      const similarAccountPatterns = await this.getSimilarAccountPatterns();
      
      // デモ投稿履歴を作成
      const demoPostHistory = this.createDemoPostHistory(strategicBaseline, industryTrends);
      
      // 学習データの補完
      const learningBaseline = this.createLearningBaseline(demoPostHistory, industryTrends);
      
      // 初期コンテキストをYAMLファイルに保存
      await this.saveInitialContext(username, {
        strategic_baseline: strategicBaseline,
        industry_trends: industryTrends,
        similar_patterns: similarAccountPatterns,
        demo_posts: demoPostHistory,
        learning_baseline: learningBaseline
      });

      console.log(`✅ [初期コンテキスト完了] ${demoPostHistory.length}件のデモ投稿履歴を生成`);
      
      return {
        demoTweetCount: demoPostHistory.length,
        contextData: {
          strategic_baseline: strategicBaseline,
          industry_trends: industryTrends,
          similar_patterns: similarAccountPatterns
        },
        learningBaseline
      };
      
    } catch (error) {
      console.error('❌ [初期コンテキスト生成エラー]:', error);
      
      // フォールバック: 最小限の基本コンテキスト
      return {
        demoTweetCount: 5,
        contextData: this.getMinimalFallbackContext(),
        learningBaseline: this.getMinimalLearningBaseline()
      };
    }
  }

  /**
   * 基本戦略テンプレートの作成
   */
  private async createStrategicBaseline(): Promise<any> {
    return {
      primary_focus: '投資教育とトレーディング洞察',
      content_categories: [
        {
          name: '市場分析',
          priority: 'high',
          frequency: '1日2-3回',
          examples: ['日経平均の動向分析', 'セクター別パフォーマンス評価']
        },
        {
          name: '投資教育',
          priority: 'high',
          frequency: '1日2-3回',
          examples: ['リスク管理の基本', 'ポートフォリオ構築手法']
        },
        {
          name: '経済ニュース解説',
          priority: 'medium',
          frequency: '1日1-2回',
          examples: ['金融政策の影響解説', '企業決算の読み方']
        },
        {
          name: 'コミュニティ交流',
          priority: 'medium',
          frequency: '1日1-2回',
          examples: ['質問への回答', '投資体験の共有']
        }
      ],
      posting_style: {
        tone: '教育的で親しみやすい',
        language: '専門用語を分かりやすく説明',
        length: '120-200文字程度',
        hashtags: ['#投資', '#トレーディング', '#資産運用', '#経済']
      }
    };
  }

  /**
   * 業界標準トレンドの取得
   */
  private async getIndustryStandardTrends(): Promise<any> {
    return {
      trending_topics: [
        {
          category: '金融政策',
          relevance: 'high',
          keywords: ['金利', '中央銀行', 'インフレ'],
          impact: 'market_moving'
        },
        {
          category: 'テクノロジー投資',
          relevance: 'high',
          keywords: ['AI', 'DX', 'グリーンテック'],
          impact: 'sector_specific'
        },
        {
          category: 'ESG投資',
          relevance: 'medium',
          keywords: ['持続可能性', '環境', 'ガバナンス'],
          impact: 'long_term'
        }
      ],
      posting_patterns: {
        peak_engagement_times: ['09:00-11:00', '19:00-21:00'],
        optimal_frequency: '1日12-15回',
        best_content_mix: {
          original_posts: '60%',
          quote_tweets: '25%',
          replies: '15%'
        }
      }
    };
  }

  /**
   * 類似アカウントパターンの取得
   */
  private async getSimilarAccountPatterns(): Promise<any> {
    return {
      successful_patterns: [
        {
          account_type: '投資教育アカウント',
          follower_range: '1K-10K',
          content_strategy: '基礎知識 + 実例解説',
          engagement_rate: '3-5%'
        },
        {
          account_type: '市場分析アカウント',
          follower_range: '5K-50K',
          content_strategy: 'データ分析 + 予測解説',
          engagement_rate: '2-4%'
        }
      ],
      content_templates: [
        {
          type: 'market_insight',
          structure: '現象観察 → データ分析 → 教育的解説',
          example: '本日の日経平均は...(観察) データによると...(分析) これが投資家にとって意味するのは...(解説)'
        },
        {
          type: 'educational_post',
          structure: '問題提起 → 解決策説明 → 実践アドバイス',
          example: '多くの投資初心者が...(問題) これを解決するには...(解決策) 具体的には...(アドバイス)'
        }
      ]
    };
  }

  /**
   * デモ投稿履歴の作成
   */
  private createDemoPostHistory(baseline: any, trends: any): any[] {
    const demoPostsTemplates = [
      {
        type: 'market_analysis',
        content: '本日の市場動向：日経平均が続伸。テクノロジーセクターの堅調な推移が全体を牽引。投資家にとって重要なのは、個別銘柄の業績と市場全体のトレンドを分離して分析することです。 #投資 #市場分析',
        engagement_potential: 'high',
        learning_value: 'market_trend_analysis'
      },
      {
        type: 'educational_content',
        content: '【投資の基本】リスク許容度の決め方💡\n1️⃣年齢と投資期間を考慮\n2️⃣家計の余剰資金を確認\n3️⃣感情的な許容範囲を把握\n投資は自分に合ったペースで進めることが成功の鍵です。 #投資教育 #リスク管理',
        engagement_potential: 'high',
        learning_value: 'risk_education'
      },
      {
        type: 'news_commentary',
        content: '米国の金利政策発表を受けて：\n長期金利の動向が日本株に与える影響を分析中📊 グローバル投資において、各国の金融政策の相関関係を理解することは必須スキルですね。 #金融政策 #グローバル投資',
        engagement_potential: 'medium',
        learning_value: 'policy_impact_analysis'
      },
      {
        type: 'practical_advice',
        content: '投資初心者の方へ：まずは「なぜその銘柄を選ぶのか」を明確に。感情ではなく、データと論理に基づいた判断を心がけましょう。小額から始めて経験を積むことが大切です🌱 #投資初心者 #資産運用',
        engagement_potential: 'high',
        learning_value: 'beginner_guidance'
      },
      {
        type: 'community_engagement',
        content: '投資に関する質問をお気軽にどうぞ！特に初心者の方の疑問や不安について、できる限り分かりやすくお答えします。一緒に学んでいきましょう💪 #投資相談 #コミュニティ',
        engagement_potential: 'very_high',
        learning_value: 'community_building'
      },
      {
        type: 'trend_analysis',
        content: 'ESG投資への関心が高まる中、企業の持続可能性指標をどう評価するか🌍 財務データだけでなく、環境・社会・ガバナンス要素も投資判断の重要な要素になっています。 #ESG投資 #持続可能性',
        engagement_potential: 'medium',
        learning_value: 'esg_investment'
      },
      {
        type: 'technical_insight',
        content: 'チャート分析の基本：移動平均線の見方📈\n短期線が長期線を上回る「ゴールデンクロス」は上昇トレンドのサイン。ただし、これだけで判断せず、他の指標も併用することが重要です。 #テクニカル分析',
        engagement_potential: 'medium',
        learning_value: 'technical_analysis'
      },
      {
        type: 'psychology_education',
        content: '投資心理学：「損失回避バイアス」について💭\n人は利益を得る喜びよりも、損失を被る痛みを強く感じる傾向があります。これを理解して、感情的な売買を避けることが重要です。 #投資心理学',
        engagement_potential: 'high',
        learning_value: 'behavioral_finance'
      }
    ];

    return demoPostsTemplates.map((template, index) => ({
      id: `demo_post_${index + 1}`,
      content: template.content,
      type: template.type,
      timestamp: Date.now() - (index * 2 * 60 * 60 * 1000), // 2時間間隔
      success: true,
      qualityScore: 0.7 + Math.random() * 0.3, // 0.7-1.0の範囲
      engagement_potential: template.engagement_potential,
      learning_value: template.learning_value,
      likes: Math.floor(Math.random() * 50) + 10,
      retweets: Math.floor(Math.random() * 20) + 5,
      replies: Math.floor(Math.random() * 15) + 2
    }));
  }

  /**
   * 学習ベースラインの作成
   */
  private createLearningBaseline(demoHistory: any[], trends: any): any {
    return {
      content_performance: {
        best_performing_types: ['educational_content', 'community_engagement', 'practical_advice'],
        avg_engagement_rate: 4.2,
        optimal_posting_times: trends.posting_patterns.peak_engagement_times,
        successful_hashtags: ['#投資', '#投資教育', '#資産運用', '#投資初心者']
      },
      audience_preferences: {
        preferred_content_length: '120-180文字',
        engagement_drivers: ['実用性', '教育価値', '親しみやすさ'],
        response_patterns: {
          questions: 'high_engagement',
          advice: 'high_retention',
          analysis: 'medium_engagement'
        }
      },
      strategic_insights: {
        growth_focus: '教育価値とコミュニティ構築',
        differentiation: '初心者にも分かりやすい専門解説',
        long_term_vision: '信頼される投資教育プラットフォーム'
      }
    };
  }

  /**
   * 初期コンテキストの保存
   */
  private async saveInitialContext(username: string, contextData: any): Promise<void> {
    try {
      const contextFile = `data/context/initial-context-${username}.yaml`;
      
      // ディレクトリが存在しない場合は作成
      const contextDir = 'data/context';
      if (!existsSync(contextDir)) {
        const fs = await import('fs');
        fs.mkdirSync(contextDir, { recursive: true });
      }

      const contextWithMetadata = {
        generated_at: new Date().toISOString(),
        username,
        version: '1.0.0',
        purpose: '新規アカウント向け初期投稿履歴・学習コンテキスト',
        ...contextData
      };

      writeFileSync(contextFile, yaml.dump(contextWithMetadata, { indent: 2 }));
      console.log(`💾 [初期コンテキスト保存] ${contextFile}に保存完了`);
    } catch (error) {
      console.error('❌ [初期コンテキスト保存エラー]:', error);
    }
  }

  /**
   * 最小限のフォールバックコンテキスト
   */
  private getMinimalFallbackContext(): any {
    return {
      fallback_mode: true,
      basic_strategy: {
        focus: '投資教育',
        posting_frequency: '1日10-15回',
        content_mix: {
          educational: '50%',
          market_analysis: '30%',
          community: '20%'
        }
      }
    };
  }

  /**
   * 最小限の学習ベースライン
   */
  private getMinimalLearningBaseline(): any {
    return {
      fallback_mode: true,
      basic_metrics: {
        target_engagement_rate: 3.0,
        optimal_post_length: 150,
        preferred_hashtags: ['#投資', '#投資教育']
      }
    };
  }

  /**
   * アカウント情報をキャッシュに保存
   */
  private async cacheAccountInfo(accountInfo: AccountInfo & AccountMetrics): Promise<void> {
    try {
      const configFile = 'data/account-config.yaml';
      
      // 既存設定を読み込み
      let config: any = {};
      if (existsSync(configFile)) {
        config = yaml.load(readFileSync(configFile, 'utf8')) || {};
      }

      // キャッシュ情報を更新
      config.cached_account_info = {
        ...accountInfo,
        cache_timestamp: Date.now()
      };

      writeFileSync(configFile, yaml.dump(config, { indent: 2 }));
      console.log('💾 [キャッシュ保存] アカウント情報をキャッシュに保存');
    } catch (error) {
      console.warn('⚠️ [キャッシュ保存エラー]:', error);
    }
  }
}