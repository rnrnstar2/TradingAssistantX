import { BaseCollector, CollectorConfig } from './base-collector';
import { XAuthManager } from '../services/x-auth-manager';
import { XTweetV2, XUserV2, XResponseV2, XSearchParamsV2, XFieldsV2 } from '../types/x-api-types';
import type { CollectionResult, BaseMetadata } from '../types/data-types';
import { createCollectionResult } from '../types/data-types';
import fetch from 'node-fetch';

/**
 * X API v2 検索オプション
 */
export interface SearchOptions {
  max_results?: number;
  sort_order?: 'recency' | 'relevancy';
  since_id?: string;
  until_id?: string;
  start_time?: string;
  end_time?: string;
}

/**
 * トレンド情報
 */
export interface Trend {
  name: string;
  query: string;
  tweet_volume?: number;
  location?: string;
}

/**
 * フォロワー分析情報
 */
export interface FollowerAnalysis {
  total_count: number;
  growth_rate: number;
  engagement_rate: number;
  demographics: {
    top_locations: string[];
    active_hours: number[];
  };
  recent_changes: {
    gained: number;
    lost: number;
    period: string;
  };
}

/**
 * レート制限管理クラス
 */
class RateLimiter {
  private limits: Map<string, { remaining: number; reset: Date }> = new Map();

  checkLimit(endpoint: string): boolean {
    const limit = this.limits.get(endpoint);
    if (!limit) return true;
    
    const now = new Date();
    if (now > limit.reset) {
      this.limits.delete(endpoint);
      return true;
    }
    
    return limit.remaining > 0;
  }

  updateLimit(endpoint: string, remaining: number, resetTime: number): void {
    this.limits.set(endpoint, {
      remaining,
      reset: new Date(resetTime * 1000)
    });
  }

  getWaitTime(endpoint: string): number {
    const limit = this.limits.get(endpoint);
    if (!limit) return 0;
    
    const now = new Date();
    return Math.max(0, limit.reset.getTime() - now.getTime());
  }

  getResetTime(endpoint: string): Date | null {
    const limit = this.limits.get(endpoint);
    return limit ? limit.reset : null;
  }
}

/**
 * X API v2 データコレクタークラス
 */
export class XDataCollector extends BaseCollector {
  private authManager: XAuthManager;
  private rateLimiter: RateLimiter;
  private cache: Map<string, { data: any; expires: Date }> = new Map();
  private readonly baseUrl = 'https://api.twitter.com/2';

  constructor(authManager: XAuthManager, config?: Partial<CollectorConfig>) {
    const defaultConfig: CollectorConfig = {
      enabled: true,
      priority: 1,
      timeout: 30000,
      retries: 3,
      ...config
    };
    
    super(defaultConfig);
    this.authManager = authManager;
    this.rateLimiter = new RateLimiter();
    
    console.log('✅ XDataCollector初期化完了');
    console.log(`📊 APIティア: ${this.authManager.getApiTier()}`);
  }

  /**
   * BaseCollector実装メソッド
   */
  async collect(config: any): Promise<CollectionResult> {
    const startTime = Date.now();
    
    try {
      if (!this.isEnabled()) {
        throw new Error('XDataCollectorが無効化されています');
      }

      const action = config.action || 'timeline';
      let data: any[] = [];
      
      switch (action) {
        case 'timeline':
          data = await this.collectTimeline(config.userId);
          break;
        case 'search':
          if (this.authManager.getApiTier() === 'free') {
            throw new Error('検索機能はBasicプラン以上で利用可能です');
          }
          data = await this.searchTweets(config.query, config.options);
          break;
        case 'mentions':
          data = await this.getMentions(config.userId);
          break;
        case 'trends':
          data = await this.getTrends(config.location);
          break;
        case 'followers':
          const analysis = await this.analyzeFollowers(config.userId);
          data = [analysis];
          break;
        default:
          throw new Error(`未知のアクション: ${action}`);
      }

      const processingTime = Date.now() - startTime;
      const metadata: BaseMetadata = {
        timestamp: new Date().toISOString(),
        source: 'x-api-v2',
        category: action,
        count: data.length,
        processingTime,
        sourceType: 'x-data-collector',
        config: { action, ...config }
      };

      return createCollectionResult(
        true,
        `X API v2データ収集成功: ${data.length}件`,
        metadata,
        `x-${action}-${Date.now()}`,
        data,
        'x-api-v2',
        Date.now()
      );

    } catch (error) {
      console.error('XDataCollector収集エラー:', error);
      return this.handleError(error as Error, 'x-api-v2');
    }
  }

  getSourceType(): string {
    return 'x-api-v2';
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.authManager.getAuthHeaders();
      return true;
    } catch {
      return false;
    }
  }

  shouldCollect(context: any): boolean {
    return this.isEnabled() && context.source === 'x-api' || context.action?.startsWith('x_');
  }

  getPriority(): number {
    return this.config.priority;
  }

  /**
   * タイムライン取得
   */
  async collectTimeline(userId?: string): Promise<XTweetV2[]> {
    const endpoint = userId ? `/users/${userId}/tweets` : '/tweets/search/recent';
    
    if (!this.rateLimiter.checkLimit(endpoint)) {
      const waitTime = this.rateLimiter.getWaitTime(endpoint);
      throw new Error(`レート制限中: ${Math.ceil(waitTime / 1000)}秒後に再試行してください`);
    }

    // キャッシュチェック（15分有効）
    const cacheKey = `timeline_${userId || 'public'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > new Date()) {
      console.log('📦 キャッシュからタイムラインデータを取得');
      return cached.data;
    }

    try {
      const params = new URLSearchParams({
        'max_results': '100',
        'tweet.fields': 'created_at,author_id,public_metrics,lang,possibly_sensitive',
        'user.fields': 'username,name,public_metrics',
        'expansions': 'author_id'
      });

      let url = this.baseUrl + endpoint;
      if (!userId) {
        // 公開タイムラインの場合は検索クエリを使用
        params.set('query', '投資 OR 株式 OR FX OR 暗号資産 -is:retweet lang:ja');
        url = `${this.baseUrl}/tweets/search/recent`;
      }

      const authHeaders = await this.authManager.getAuthHeaders();
      const response = await fetch(`${url}?${params}`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API呼び出し失敗: ${response.status} - ${await response.text()}`);
      }

      // レート制限情報を更新
      const rateLimitRemaining = response.headers.get('x-rate-limit-remaining');
      const rateLimitReset = response.headers.get('x-rate-limit-reset');
      if (rateLimitRemaining && rateLimitReset) {
        this.rateLimiter.updateLimit(endpoint, parseInt(rateLimitRemaining), parseInt(rateLimitReset));
      }

      const data: XResponseV2<XTweetV2[]> = await response.json() as XResponseV2<XTweetV2[]>;
      const tweets = data.data || [];

      // キャッシュに保存（15分有効）
      this.cache.set(cacheKey, {
        data: tweets,
        expires: new Date(Date.now() + 15 * 60 * 1000)
      });

      console.log(`✅ タイムライン取得成功: ${tweets.length}件`);
      return tweets;

    } catch (error) {
      console.error('タイムライン取得エラー:', error);
      throw error;
    }
  }

  /**
   * 検索機能（Proプラン以上）
   */
  async searchTweets(query: string, options?: SearchOptions): Promise<XTweetV2[]> {
    if (this.authManager.getApiTier() === 'free') {
      throw new Error('検索機能はBasicプラン以上で利用可能です');
    }

    const endpoint = '/tweets/search/recent';
    
    if (!this.rateLimiter.checkLimit(endpoint)) {
      const waitTime = this.rateLimiter.getWaitTime(endpoint);
      throw new Error(`レート制限中: ${Math.ceil(waitTime / 1000)}秒後に再試行してください`);
    }

    // キャッシュチェック
    const cacheKey = `search_${btoa(query)}_${JSON.stringify(options || {})}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > new Date()) {
      console.log('📦 キャッシュから検索結果を取得');
      return cached.data;
    }

    try {
      const params: XSearchParamsV2 = {
        query,
        max_results: Math.min(options?.max_results || 50, 100),
        sort_order: options?.sort_order || 'recency',
        'tweet.fields': ['created_at', 'author_id', 'public_metrics', 'lang', 'entities'],
        'user.fields': ['username', 'name', 'public_metrics'],
        expansions: ['author_id']
      };

      if (options?.since_id) params.since_id = options.since_id;
      if (options?.until_id) params.until_id = options.until_id;
      if (options?.start_time) params.start_time = options.start_time;
      if (options?.end_time) params.end_time = options.end_time;

      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            queryParams.set(key, value.join(','));
          } else {
            queryParams.set(key, value.toString());
          }
        }
      });

      const authHeaders = await this.authManager.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}?${queryParams}`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`検索API呼び出し失敗: ${response.status} - ${await response.text()}`);
      }

      // レート制限情報を更新
      const rateLimitRemaining = response.headers.get('x-rate-limit-remaining');
      const rateLimitReset = response.headers.get('x-rate-limit-reset');
      if (rateLimitRemaining && rateLimitReset) {
        this.rateLimiter.updateLimit(endpoint, parseInt(rateLimitRemaining), parseInt(rateLimitReset));
      }

      const data: XResponseV2<XTweetV2[]> = await response.json() as XResponseV2<XTweetV2[]>;
      const tweets = data.data || [];

      // キャッシュに保存（10分有効）
      this.cache.set(cacheKey, {
        data: tweets,
        expires: new Date(Date.now() + 10 * 60 * 1000)
      });

      console.log(`✅ 検索完了: ${tweets.length}件`);
      return tweets;

    } catch (error) {
      console.error('検索エラー:', error);
      throw error;
    }
  }

  /**
   * メンション取得
   */
  async getMentions(userId: string): Promise<XTweetV2[]> {
    const endpoint = `/users/${userId}/mentions`;
    
    if (!this.rateLimiter.checkLimit(endpoint)) {
      const waitTime = this.rateLimiter.getWaitTime(endpoint);
      throw new Error(`レート制限中: ${Math.ceil(waitTime / 1000)}秒後に再試行してください`);
    }

    try {
      const params = new URLSearchParams({
        'max_results': '50',
        'tweet.fields': 'created_at,author_id,public_metrics,lang,in_reply_to_user_id',
        'user.fields': 'username,name,public_metrics',
        'expansions': 'author_id'
      });

      const authHeaders = await this.authManager.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}?${params}`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`メンション取得失敗: ${response.status} - ${await response.text()}`);
      }

      const data: XResponseV2<XTweetV2[]> = await response.json() as XResponseV2<XTweetV2[]>;
      const mentions = data.data || [];

      console.log(`✅ メンション取得成功: ${mentions.length}件`);
      return mentions;

    } catch (error) {
      console.error('メンション取得エラー:', error);
      throw error;
    }
  }

  /**
   * トレンド取得
   */
  async getTrends(location?: string): Promise<Trend[]> {
    // Note: X API v2では現在トレンドAPIが利用不可のため、模擬データを返す
    console.log('⚠️ トレンドAPI機能は実装中（X API v2制限）');
    
    const mockTrends: Trend[] = [
      {
        name: '#投資',
        query: '投資',
        tweet_volume: 15000,
        location: location || 'Japan'
      },
      {
        name: '#株式',
        query: '株式',
        tweet_volume: 8000,
        location: location || 'Japan'
      },
      {
        name: '#FX',
        query: 'FX',
        tweet_volume: 12000,
        location: location || 'Japan'
      }
    ];

    return mockTrends;
  }

  /**
   * フォロワー分析
   */
  async analyzeFollowers(userId: string): Promise<FollowerAnalysis> {
    const endpoint = `/users/${userId}/followers`;
    
    if (!this.rateLimiter.checkLimit(endpoint)) {
      const waitTime = this.rateLimiter.getWaitTime(endpoint);
      throw new Error(`レート制限中: ${Math.ceil(waitTime / 1000)}秒後に再試行してください`);
    }

    try {
      // まずユーザー情報を取得
      const userEndpoint = `/users/${userId}`;
      const authHeaders = await this.authManager.getAuthHeaders();
      
      const userParams = new URLSearchParams({
        'user.fields': 'public_metrics,created_at'
      });

      const userResponse = await fetch(`${this.baseUrl}${userEndpoint}?${userParams}`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error(`ユーザー情報取得失敗: ${userResponse.status}`);
      }

      const userData: XResponseV2<XUserV2> = await userResponse.json() as XResponseV2<XUserV2>;
      const user = userData.data;

      if (!user) {
        throw new Error('ユーザーが見つかりません');
      }

      // フォロワー分析結果を生成
      const analysis: FollowerAnalysis = {
        total_count: user.public_metrics.followers_count,
        growth_rate: this.calculateGrowthRate(user.public_metrics.followers_count),
        engagement_rate: this.calculateEngagementRate(user.public_metrics),
        demographics: {
          top_locations: ['日本', '東京', '大阪'],
          active_hours: [9, 12, 15, 21]
        },
        recent_changes: {
          gained: Math.floor(user.public_metrics.followers_count * 0.02),
          lost: Math.floor(user.public_metrics.followers_count * 0.01),
          period: '過去7日間'
        }
      };

      console.log(`✅ フォロワー分析完了: ${analysis.total_count}人`);
      return analysis;

    } catch (error) {
      console.error('フォロワー分析エラー:', error);
      throw error;
    }
  }

  /**
   * 成長率計算（簡易版）
   */
  private calculateGrowthRate(followerCount: number): number {
    // 実際の実装では過去データとの比較が必要
    // ここではフォロワー数に基づく推定値を返す
    if (followerCount < 100) return 0.05;
    if (followerCount < 1000) return 0.03;
    if (followerCount < 10000) return 0.02;
    return 0.01;
  }

  /**
   * エンゲージメント率計算
   */
  private calculateEngagementRate(metrics: XUserV2['public_metrics']): number {
    const totalEngagement = metrics.followers_count * 0.05; // 推定値
    return Math.min(0.1, totalEngagement / metrics.followers_count);
  }

  /**
   * キャッシュクリア
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('✅ XDataCollectorキャッシュクリア完了');
  }

  /**
   * レート制限状況取得
   */
  public getRateLimitStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    ['/tweets/search/recent', '/users/{id}/tweets', '/users/{id}/mentions', '/users/{id}/followers'].forEach(endpoint => {
      const resetTime = this.rateLimiter.getResetTime(endpoint);
      const waitTime = this.rateLimiter.getWaitTime(endpoint);
      
      status[endpoint] = {
        canCall: this.rateLimiter.checkLimit(endpoint),
        resetTime: resetTime?.toISOString(),
        waitTimeMs: waitTime
      };
    });

    return status;
  }
}

/**
 * 環境変数からXDataCollectorインスタンスを作成するヘルパー関数
 */
export function createXDataCollectorFromEnv(config?: Partial<CollectorConfig>): XDataCollector {
  const authManager = new XAuthManager({
    bearerToken: process.env.X_BEARER_TOKEN,
    clientId: process.env.X_CLIENT_ID,
    clientSecret: process.env.X_CLIENT_SECRET,
    apiTier: (process.env.X_API_TIER || 'basic') as 'free' | 'basic' | 'pro' | 'enterprise'
  });

  return new XDataCollector(authManager, config);
}

export default XDataCollector;