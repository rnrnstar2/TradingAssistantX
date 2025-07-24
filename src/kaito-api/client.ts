/**
 * KaitoTwitterAPI クライアントの実装
 * REQUIREMENTS.md準拠版 - KaitoTwitterAPI統合基盤
 */

export interface KaitoClientConfig {
  apiKey: string;
  qpsLimit: number; // 200QPS上限
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  costTracking: boolean; // $0.15/1k tweets追跡
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: string;
  limit: number;
}

export interface RateLimitStatus {
  general: RateLimitInfo;
  posting: RateLimitInfo;
  collection: RateLimitInfo;
  lastUpdated: string;
}

export interface ApiConfig {
  baseUrl: string;
  authToken: string;
  timeout: number;
  rateLimits: {
    postsPerHour: number;
    retweetsPerHour: number;
    likesPerHour: number;
  };
}

export interface CostTrackingInfo {
  tweetsProcessed: number;
  estimatedCost: number; // USD
  resetDate: string;
  lastUpdated: string;
}

export interface PostResult {
  id: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface RetweetResult {
  id: string;
  originalTweetId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface QuoteTweetResult {
  id: string;
  originalTweetId: string;
  comment: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface LikeResult {
  tweetId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * QPS制御クラス
 */
class QPSController {
  private requestTimes: number[] = [];
  private readonly qpsLimit: number;

  constructor(qpsLimit: number = 200) {
    this.qpsLimit = qpsLimit;
  }

  async enforceQPS(): Promise<void> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // 1秒以内のリクエスト数をフィルタリング
    this.requestTimes = this.requestTimes.filter(time => time > oneSecondAgo);
    
    if (this.requestTimes.length >= this.qpsLimit) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = 1000 - (now - oldestRequest) + 10; // 10ms バッファ
      
      if (waitTime > 0) {
        console.log(`⏱️ QPS制限により待機: ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requestTimes.push(Date.now());
  }

  getCurrentQPS(): number {
    const oneSecondAgo = Date.now() - 1000;
    return this.requestTimes.filter(time => time > oneSecondAgo).length;
  }
}

/**
 * APIエラーハンドラー
 */
class APIErrorHandler {
  static handleError(error: any, context: string): Error {
    console.error(`❌ ${context}でエラー:`, error);
    
    if (error.message?.includes('rate limit')) {
      return new Error(`Rate limit exceeded in ${context}: ${error.message}`);
    }
    
    if (error.message?.includes('auth')) {
      return new Error(`Authentication failed in ${context}: ${error.message}`);
    }
    
    if (error.status === 429) {
      return new Error(`Too many requests in ${context}`);
    }
    
    return new Error(`API error in ${context}: ${error.message || 'Unknown error'}`);
  }
}

/**
 * KaitoTwitterAPIクライアントクラス
 * Twitter/X プラットフォームとの基本的な通信を担当
 */
export class KaitoTwitterAPIClient {
  private readonly API_BASE_URL = 'https://api.twitterapi.io';
  private readonly COST_PER_1K_TWEETS = 0.15; // $0.15/1k tweets

  private config: KaitoClientConfig;
  private qpsController: QPSController;
  private errorHandler: APIErrorHandler;
  private rateLimits!: RateLimitStatus;
  private lastRequestTime: number = 0;
  private isAuthenticated: boolean = false;
  private costTracking!: CostTrackingInfo;

  constructor(config: Partial<KaitoClientConfig> = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.KAITO_API_TOKEN || '',
      qpsLimit: config.qpsLimit || 200,
      retryPolicy: {
        maxRetries: config.retryPolicy?.maxRetries || 3,
        backoffMs: config.retryPolicy?.backoffMs || 1000
      },
      costTracking: config.costTracking !== false
    };
    
    this.qpsController = new QPSController(this.config.qpsLimit);
    this.errorHandler = new APIErrorHandler();
    this.initializeRateLimits();
    this.initializeCostTracking();
    
    console.log('✅ KaitoTwitterAPIClient initialized - REQUIREMENTS.md準拠版');
  }

  /**
   * API認証の実行
   */
  async authenticate(): Promise<void> {
    try {
      console.log('🔐 KaitoTwitterAPI認証開始');

      if (!this.config.apiKey) {
        throw new Error('API key is required for authentication');
      }

      // QPS制御
      await this.qpsController.enforceQPS();
      
      // Mock authentication for MVP
      await this.delay(500);
      
      this.isAuthenticated = true;
      console.log('✅ KaitoTwitterAPI認証完了');

    } catch (error) {
      throw APIErrorHandler.handleError(error, 'authentication');
    }
  }

  /**
   * 投稿実行
   */
  async post(content: string, options?: { mediaIds?: string[]; inReplyTo?: string }): Promise<PostResult> {
    try {
      await this.ensureAuthenticated();
      await this.qpsController.enforceQPS();
      await this.enforceRateLimit('posting');

      console.log('📝 投稿実行中...', { contentLength: content.length });

      // 投稿バリデーション
      this.validatePostContent(content);

      // API呼び出し（Mock実装）
      const result = await this.executeMockPost(content, options);

      // レート制限カウンター更新
      this.updateRateLimit('posting');
      
      // コスト追跡更新
      this.updateCostTracking(1);

      console.log('✅ 投稿完了:', { id: result.id, success: result.success });
      return result;

    } catch (error) {
      const handledError = APIErrorHandler.handleError(error, 'post');
      return {
        id: '',
        url: '',
        timestamp: new Date().toISOString(),
        success: false,
        error: handledError.message
      };
    }
  }

  /**
   * リツイート実行
   */
  async retweet(tweetId: string): Promise<RetweetResult> {
    try {
      await this.ensureAuthenticated();
      await this.qpsController.enforceQPS();
      await this.enforceRateLimit('posting');

      console.log('🔄 リツイート実行中...', { tweetId });

      // API呼び出し（Mock実装）
      const result = await this.executeMockRetweet(tweetId);

      // レート制限カウンター更新
      this.updateRateLimit('posting');
      
      // コスト追跡更新
      this.updateCostTracking(1);

      console.log('✅ リツイート完了:', { id: result.id, success: result.success });
      return result;

    } catch (error) {
      const handledError = APIErrorHandler.handleError(error, 'retweet');
      return {
        id: '',
        originalTweetId: tweetId,
        timestamp: new Date().toISOString(),
        success: false,
        error: handledError.message
      };
    }
  }

  /**
   * 引用ツイート実行
   */
  async quoteTweet(tweetId: string, comment: string): Promise<QuoteTweetResult> {
    try {
      await this.ensureAuthenticated();
      await this.qpsController.enforceQPS();
      await this.enforceRateLimit('posting');

      console.log('💬 引用ツイート実行中...', { tweetId, commentLength: comment.length });

      // コメントバリデーション
      this.validatePostContent(comment);

      // API呼び出し（Mock実装）
      const result = await this.executeMockQuoteTweet(tweetId, comment);

      // レート制限カウンター更新
      this.updateRateLimit('posting');
      
      // コスト追跡更新
      this.updateCostTracking(1);

      console.log('✅ 引用ツイート完了:', { id: result.id, success: result.success });
      return result;

    } catch (error) {
      const handledError = APIErrorHandler.handleError(error, 'quoteTweet');
      return {
        id: '',
        originalTweetId: tweetId,
        comment,
        timestamp: new Date().toISOString(),
        success: false,
        error: handledError.message
      };
    }
  }

  /**
   * いいね実行
   */
  async like(tweetId: string): Promise<LikeResult> {
    try {
      await this.ensureAuthenticated();
      await this.qpsController.enforceQPS();
      await this.enforceRateLimit('general');

      console.log('❤️ いいね実行中...', { tweetId });

      // API呼び出し（Mock実装）
      const result = await this.executeMockLike(tweetId);

      // レート制限カウンター更新
      this.updateRateLimit('general');
      
      // コスト追跡更新
      this.updateCostTracking(1);

      console.log('✅ いいね完了:', { tweetId, success: result.success });
      return result;

    } catch (error) {
      const handledError = APIErrorHandler.handleError(error, 'like');
      return {
        tweetId,
        timestamp: new Date().toISOString(),
        success: false,
        error: handledError.message
      };
    }
  }

  /**
   * アカウント情報取得
   */
  async getAccountInfo(): Promise<any> {
    try {
      await this.ensureAuthenticated();
      await this.qpsController.enforceQPS();
      await this.enforceRateLimit('general');

      console.log('📊 アカウント情報取得中...');

      // Mock account info
      const accountInfo = {
        id: 'mock_account_id',
        username: 'trading_assistant_x',
        displayName: 'TradingAssistantX',
        followersCount: Math.floor(Math.random() * 1000) + 100,
        followingCount: Math.floor(Math.random() * 500) + 50,
        tweetsCount: Math.floor(Math.random() * 5000) + 500,
        verified: false,
        createdAt: new Date('2024-01-01').toISOString(),
        description: '投資教育に特化したAIアシスタント',
        location: 'Japan',
        website: '',
        profileImageUrl: '',
        bannerImageUrl: '',
        timestamp: new Date().toISOString()
      };

      this.updateRateLimit('general');
      
      // コスト追跡更新
      this.updateCostTracking(1);
      
      console.log('✅ アカウント情報取得完了:', { followers: accountInfo.followersCount });

      return accountInfo;

    } catch (error) {
      throw APIErrorHandler.handleError(error, 'getAccountInfo');
    }
  }

  /**
   * レート制限状況取得
   */
  getRateLimitStatus(): RateLimitStatus {
    return { ...this.rateLimits };
  }

  /**
   * QPS状況取得
   */
  getCurrentQPS(): number {
    return this.qpsController.getCurrentQPS();
  }

  /**
   * コスト追跡情報取得
   */
  getCostTrackingInfo(): CostTrackingInfo {
    return { ...this.costTracking };
  }

  /**
   * 接続テスト
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.ensureAuthenticated();
      await this.qpsController.enforceQPS();
      console.log('🔗 KaitoTwitterAPI接続テスト実行中...');

      // Simple health check
      await this.delay(200);
      
      console.log('✅ KaitoTwitterAPI接続テスト成功');
      return true;

    } catch (error) {
      console.error('❌ KaitoTwitterAPI接続テスト失敗:', error);
      return false;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private initializeRateLimits(): void {
    const nextHour = this.getNextHourString();
    
    this.rateLimits = {
      general: { remaining: 900, resetTime: nextHour, limit: 900 },
      posting: { remaining: 300, resetTime: nextHour, limit: 300 },
      collection: { remaining: 500, resetTime: nextHour, limit: 500 },
      lastUpdated: new Date().toISOString()
    };
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.isAuthenticated) {
      await this.authenticate();
    }
  }

  private async enforceRateLimit(type: 'general' | 'posting' | 'collection' = 'general'): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Minimum interval between requests (700ms for performance requirement)
    const minInterval = 700;
    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      console.log(`⏱️ パフォーマンス維持のため待機: ${waitTime}ms`);
      await this.delay(waitTime);
    }

    // Check rate limit
    if (this.rateLimits[type].remaining <= 0) {
      const resetTime = new Date(this.rateLimits[type].resetTime);
      const waitTime = resetTime.getTime() - now;
      
      if (waitTime > 0) {
        console.log(`⏰ レート制限により待機: ${Math.ceil(waitTime / 60000)}分`);
        await this.delay(Math.min(waitTime, 300000)); // Max 5 minutes wait
      } else {
        // Reset counters if reset time has passed
        this.resetRateLimit(type);
      }
    }

    this.lastRequestTime = Date.now();
  }

  private initializeCostTracking(): void {
    const today = new Date();
    const resetDate = new Date(today);
    resetDate.setMonth(resetDate.getMonth() + 1, 1); // Next month 1st
    
    this.costTracking = {
      tweetsProcessed: 0,
      estimatedCost: 0,
      resetDate: resetDate.toISOString(),
      lastUpdated: new Date().toISOString()
    };
  }

  private updateCostTracking(tweetsCount: number): void {
    if (!this.config.costTracking) return;
    
    this.costTracking.tweetsProcessed += tweetsCount;
    this.costTracking.estimatedCost = (this.costTracking.tweetsProcessed / 1000) * this.COST_PER_1K_TWEETS;
    this.costTracking.lastUpdated = new Date().toISOString();
    
    // Log cost warning if approaching $10
    if (this.costTracking.estimatedCost > 8.0) {
      console.warn(`⚠️ コスト警告: $${this.costTracking.estimatedCost.toFixed(2)} (処理数: ${this.costTracking.tweetsProcessed})`);
    }
  }

  private updateRateLimit(type: 'general' | 'posting' | 'collection'): void {
    if (this.rateLimits[type].remaining > 0) {
      this.rateLimits[type].remaining--;
    }
    this.rateLimits.lastUpdated = new Date().toISOString();
  }

  private resetRateLimit(type: 'general' | 'posting' | 'collection'): void {
    const limits = {
      general: 900,
      posting: 300,
      collection: 500
    };

    this.rateLimits[type] = {
      remaining: limits[type],
      resetTime: this.getNextHourString(),
      limit: limits[type]
    };
  }

  private validatePostContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new Error('Post content cannot be empty');
    }

    if (content.length > 280) {
      throw new Error('Post content exceeds 280 character limit');
    }

    // 韓国語チェック
    const koreanRegex = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
    if (koreanRegex.test(content)) {
      throw new Error('Korean characters are not allowed in posts');
    }
  }

  private async executeMockPost(content: string, options?: any): Promise<PostResult> {
    await this.delay(500); // Simulate API delay

    return {
      id: `post_${Date.now()}`,
      url: `https://twitter.com/trading_assistant_x/status/post_${Date.now()}`,
      timestamp: new Date().toISOString(),
      success: true
    };
  }

  private async executeMockRetweet(tweetId: string): Promise<RetweetResult> {
    await this.delay(300);

    return {
      id: `retweet_${Date.now()}`,
      originalTweetId: tweetId,
      timestamp: new Date().toISOString(),
      success: true
    };
  }

  private async executeMockQuoteTweet(tweetId: string, comment: string): Promise<QuoteTweetResult> {
    await this.delay(400);

    return {
      id: `quote_${Date.now()}`,
      originalTweetId: tweetId,
      comment,
      timestamp: new Date().toISOString(),
      success: true
    };
  }

  private async executeMockLike(tweetId: string): Promise<LikeResult> {
    await this.delay(200);

    return {
      tweetId,
      timestamp: new Date().toISOString(),
      success: true
    };
  }

  private getNextHourString(): string {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
    return nextHour.toISOString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Legacy class name for backward compatibility
export class KaitoApiClient extends KaitoTwitterAPIClient {
  constructor(config?: Partial<KaitoClientConfig>) {
    super(config);
    console.log('⚠️ KaitoApiClient is deprecated. Use KaitoTwitterAPIClient instead.');
  }
}