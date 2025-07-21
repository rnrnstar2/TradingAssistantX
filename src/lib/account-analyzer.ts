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
  private analysisFile = 'data/account-analysis-results.json';
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
      const targetInterval = (24 * 60 * 60 * 1000) / dailyPostTarget; // 96分

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
      const accountFile = 'data/account-info.yaml';
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
      // 過去の分析結果を読み込み
      let analysisHistory: any[] = [];
      if (existsSync(this.analysisFile)) {
        const existingData = JSON.parse(readFileSync(this.analysisFile, 'utf8'));
        analysisHistory = Array.isArray(existingData) ? existingData : [existingData];
      }

      // 新しい分析結果を追加
      analysisHistory.push(accountStatus);

      // 最新10件のみ保持
      const limitedHistory = analysisHistory.slice(-10);

      // ファイルに保存
      writeFileSync(this.analysisFile, JSON.stringify(limitedHistory, null, 2));

      // account-config.yamlも更新
      this.updateAccountConfig(accountStatus);
    } catch (error) {
      console.error('Error saving analysis result:', error);
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
      return this.getDefaultAccountInfo();
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
   * デフォルトのアカウント情報を生成
   */
  private getDefaultAccountInfo(): AccountInfo & AccountMetrics {
    const defaultUsername = process.env.X_USERNAME || 'trading_assistant';
    
    return {
      username: defaultUsername,
      user_id: defaultUsername,
      display_name: 'Trading Assistant',
      verified: false,
      followers_count: 0,
      following_count: 0,
      tweet_count: 0,
      listed_count: 0,
      last_updated: Date.now()
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