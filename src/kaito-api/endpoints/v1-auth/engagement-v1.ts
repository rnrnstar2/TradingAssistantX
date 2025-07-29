/**
 * V1 Engagement Endpoint - V1ログイン認証専用
 * REQUIREMENTS.md準拠 - エンゲージメント操作・非推奨API
 * 
 * 機能:
 * - いいね機能（V1 favorite API）
 * - リツイート機能（V1 retweet API）
 * - フォロー・アンフォロー機能
 * 
 * 認証レベル: V1ログイン認証（auth_session必要）
 */

import { 
  EngagementRequest,
  EngagementResponse,
  FollowResult,
  UnfollowResult,
  HttpClient,
  TwitterAPIEngagementResponse
} from '../../types';
import { V1LoginAuth } from '../../core/v1-login-auth';

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

interface LikeResponse {
  success: boolean;
  data: {
    tweetId: string;
    liked: boolean;
    likeCount: number;
    executedAt: Date;
  };
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface RetweetResponse {
  success: boolean;
  data: {
    originalTweetId: string;
    retweetId: string;
    retweeted: boolean;
    retweetCount: number;
    executedAt: Date;
  };
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface FollowResponse {
  success: boolean;
  data: {
    userId: string;
    username: string;
    followed: boolean;
    isFollowingBack: boolean;
    executedAt: Date;
  };
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

// ============================================================================
// REQUEST OPTIONS
// ============================================================================

interface EngagementOptions {
  skipStatus?: boolean;
  includeEntities?: boolean;
  trimUser?: boolean;
}

interface FollowOptions {
  follow?: boolean; // リツイート通知設定
  device?: boolean; // デバイス通知設定
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// ENGAGEMENT V1 ENDPOINT CLASS
// ============================================================================

/**
 * EngagementV1Endpoint - V1認証エンゲージメント操作クラス
 * 
 * V1ログイン認証（auth_session）で実行可能な機能:
 * - ツイートへのいいね・いいね取り消し
 * - リツイート・リツイート取り消し
 * - ユーザーフォロー・アンフォロー
 * 
 * 注意: 非推奨API。新規実装ではV2エンドポイント使用を推奨
 */
export class EngagementV1Endpoint {
  private readonly ENDPOINTS = {
    likeTweet: '/twitter/user/like',
    unlikeTweet: '/twitter/user/unlike',
    retweetTweet: '/twitter/user/retweet',
    unretweetTweet: '/twitter/user/unretweet',
    followUser: '/twitter/user/follow',
    unfollowUser: '/twitter/user/unfollow',
    // V1 API互換エンドポイント
    favoritesCreate: '/twitter/favorites/create',
    favoritesDestroy: '/twitter/favorites/destroy',
    statusesRetweet: '/twitter/statuses/retweet',
    statusesUnretweet: '/twitter/statuses/unretweet',
    friendshipsCreate: '/twitter/friendships/create',
    friendshipsDestroy: '/twitter/friendships/destroy'
  } as const;

  private readonly RATE_LIMITS = {
    like: { limit: 1000, window: 3600 }, // 1000/hour (V1制限)
    retweet: { limit: 300, window: 3600 }, // 300/hour
    follow: { limit: 400, window: 3600 }, // 400/hour
    unfollow: { limit: 400, window: 3600 } // 400/hour
  } as const;

  private readonly VALIDATION_RULES = {
    tweetId: /^[0-9]+$/,
    userId: /^[0-9]+$/,
    username: /^[a-zA-Z0-9_]{1,15}$/
  } as const;

  // エンゲージメント制限（スパム防止）
  private readonly ENGAGEMENT_LIMITS = {
    maxLikesPerHour: 1000,
    maxRetweetsPerHour: 300,
    maxFollowsPerHour: 400,
    cooldownBetweenActions: 1000 // 1秒
  } as const;

  // アクション間隔管理
  private lastActionTime: number = 0;

  constructor(
    private httpClient: HttpClient,
    private v1Auth: V1LoginAuth
  ) {}

  // ============================================================================
  // PUBLIC METHODS - LIKE OPERATIONS
  // ============================================================================

  /**
   * ツイートにいいね
   * auth_session認証が必要
   */
  async like(tweetId: string, options?: EngagementOptions): Promise<LikeResponse> {
    // 入力バリデーション
    const validation = this.validateTweetId(tweetId);
    if (!validation.isValid) {
      throw new Error(`Invalid tweetId: ${validation.errors.join(', ')}`);
    }

    // レート制限チェック
    await this.enforceRateLimit();

    // V1認証セッション取得・検証
    const authSession = await this.v1Auth.getValidSession();
    if (!authSession) {
      throw new Error('V1 authentication required - auth_session not available');
    }

    try {
      const payload: any = {
        id: tweetId,
        auth_session: authSession,
        proxy: process.env.X_PROXY
      };

      // オプション設定
      if (options?.skipStatus) payload.skip_status = options.skipStatus;
      if (options?.includeEntities) payload.include_entities = options.includeEntities;
      if (options?.trimUser) payload.trim_user = options.trimUser;

      const response = await this.httpClient.post<TwitterAPIEngagementResponse>(
        this.ENDPOINTS.likeTweet,
        payload
      );

      return {
        success: true,
        data: {
          tweetId,
          liked: true,
          likeCount: response.favorite_count || 0,
          executedAt: new Date()
        },
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV1AuthError(error, 'like');
    }
  }

  /**
   * ツイートのいいね取り消し
   * auth_session認証が必要
   */
  async unlike(tweetId: string, options?: EngagementOptions): Promise<LikeResponse> {
    const validation = this.validateTweetId(tweetId);
    if (!validation.isValid) {
      throw new Error(`Invalid tweetId: ${validation.errors.join(', ')}`);
    }

    await this.enforceRateLimit();

    const authSession = await this.v1Auth.getValidSession();
    if (!authSession) {
      throw new Error('V1 authentication required - auth_session not available');
    }

    try {
      const payload = {
        id: tweetId,
        auth_session: authSession,
        proxy: process.env.X_PROXY,
        ...options
      };

      const response = await this.httpClient.post<TwitterAPIEngagementResponse>(
        this.ENDPOINTS.unlikeTweet,
        payload
      );

      return {
        success: true,
        data: {
          tweetId,
          liked: false,
          likeCount: response.favorite_count || 0,
          executedAt: new Date()
        },
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV1AuthError(error, 'unlike');
    }
  }

  // ============================================================================
  // PUBLIC METHODS - RETWEET OPERATIONS
  // ============================================================================

  /**
   * リツイート
   * auth_session認証が必要
   */
  async retweet(tweetId: string, options?: EngagementOptions): Promise<RetweetResponse> {
    const validation = this.validateTweetId(tweetId);
    if (!validation.isValid) {
      throw new Error(`Invalid tweetId: ${validation.errors.join(', ')}`);
    }

    await this.enforceRateLimit();

    const authSession = await this.v1Auth.getValidSession();
    if (!authSession) {
      throw new Error('V1 authentication required - auth_session not available');
    }

    try {
      const payload = {
        id: tweetId,
        auth_session: authSession,
        proxy: process.env.X_PROXY,
        ...options
      };

      const response = await this.httpClient.post<TwitterAPIEngagementResponse>(
        this.ENDPOINTS.retweetTweet,
        payload
      );

      return {
        success: true,
        data: {
          originalTweetId: tweetId,
          retweetId: response.id_str || response.id || '',
          retweeted: true,
          retweetCount: response.retweet_count || 0,
          executedAt: new Date()
        },
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV1AuthError(error, 'retweet');
    }
  }

  /**
   * リツイート取り消し
   * auth_session認証が必要
   */
  async unretweet(tweetId: string, options?: EngagementOptions): Promise<RetweetResponse> {
    const validation = this.validateTweetId(tweetId);
    if (!validation.isValid) {
      throw new Error(`Invalid tweetId: ${validation.errors.join(', ')}`);
    }

    await this.enforceRateLimit();

    const authSession = await this.v1Auth.getValidSession();
    if (!authSession) {
      throw new Error('V1 authentication required - auth_session not available');
    }

    try {
      const payload = {
        id: tweetId,
        auth_session: authSession,
        proxy: process.env.X_PROXY,
        ...options
      };

      const response = await this.httpClient.post<TwitterAPIEngagementResponse>(
        this.ENDPOINTS.unretweetTweet,
        payload
      );

      return {
        success: true,
        data: {
          originalTweetId: tweetId,
          retweetId: '',
          retweeted: false,
          retweetCount: response.retweet_count || 0,
          executedAt: new Date()
        },
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV1AuthError(error, 'unretweet');
    }
  }

  // ============================================================================
  // PUBLIC METHODS - FOLLOW OPERATIONS
  // ============================================================================

  /**
   * ユーザーフォロー
   * auth_session認証が必要
   */
  async follow(userId: string, options?: FollowOptions): Promise<FollowResponse> {
    const validation = this.validateUserId(userId);
    if (!validation.isValid) {
      throw new Error(`Invalid userId: ${validation.errors.join(', ')}`);
    }

    await this.enforceRateLimit();

    const authSession = await this.v1Auth.getValidSession();
    if (!authSession) {
      throw new Error('V1 authentication required - auth_session not available');
    }

    try {
      const payload: any = {
        user_id: userId,
        auth_session: authSession,
        proxy: process.env.X_PROXY
      };

      // フォロー設定
      if (options?.follow !== undefined) payload.follow = options.follow;
      if (options?.device !== undefined) payload.device = options.device;

      const response = await this.httpClient.post<any>(
        this.ENDPOINTS.followUser,
        payload
      );

      return {
        success: true,
        data: {
          userId,
          username: response.screen_name || '',
          followed: true,
          isFollowingBack: response.following || false,
          executedAt: new Date()
        },
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV1AuthError(error, 'follow');
    }
  }

  /**
   * ユーザーフォロー（ユーザー名指定）
   * auth_session認証が必要
   */
  async followByUsername(username: string, options?: FollowOptions): Promise<FollowResponse> {
    const validation = this.validateUsername(username);
    if (!validation.isValid) {
      throw new Error(`Invalid username: ${validation.errors.join(', ')}`);
    }

    await this.enforceRateLimit();

    const authSession = await this.v1Auth.getValidSession();
    if (!authSession) {
      throw new Error('V1 authentication required - auth_session not available');
    }

    try {
      const payload = {
        screen_name: username,
        auth_session: authSession,
        proxy: process.env.X_PROXY,
        ...options
      };

      const response = await this.httpClient.post<any>(
        this.ENDPOINTS.followUser,
        payload
      );

      return {
        success: true,
        data: {
          userId: response.id_str || response.id || '',
          username,
          followed: true,
          isFollowingBack: response.following || false,
          executedAt: new Date()
        },
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV1AuthError(error, 'followByUsername');
    }
  }

  /**
   * ユーザーアンフォロー
   * auth_session認証が必要
   */
  async unfollow(userId: string): Promise<FollowResponse> {
    const validation = this.validateUserId(userId);
    if (!validation.isValid) {
      throw new Error(`Invalid userId: ${validation.errors.join(', ')}`);
    }

    await this.enforceRateLimit();

    const authSession = await this.v1Auth.getValidSession();
    if (!authSession) {
      throw new Error('V1 authentication required - auth_session not available');
    }

    try {
      const payload = {
        user_id: userId,
        auth_session: authSession,
        proxy: process.env.X_PROXY
      };

      const response = await this.httpClient.post<any>(
        this.ENDPOINTS.unfollowUser,
        payload
      );

      return {
        success: true,
        data: {
          userId,
          username: response.screen_name || '',
          followed: false,
          isFollowingBack: false,
          executedAt: new Date()
        },
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV1AuthError(error, 'unfollow');
    }
  }

  // ============================================================================
  // PRIVATE METHODS - VALIDATION
  // ============================================================================

  private validateTweetId(tweetId: string): ValidationResult {
    const errors: string[] = [];

    if (!tweetId || typeof tweetId !== 'string') {
      errors.push('tweetId is required and must be a string');
    } else if (!this.VALIDATION_RULES.tweetId.test(tweetId)) {
      errors.push('tweetId must be numeric');
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateUserId(userId: string): ValidationResult {
    const errors: string[] = [];

    if (!userId || typeof userId !== 'string') {
      errors.push('userId is required and must be a string');
    } else if (!this.VALIDATION_RULES.userId.test(userId)) {
      errors.push('userId must be numeric');
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateUsername(username: string): ValidationResult {
    const errors: string[] = [];

    if (!username || typeof username !== 'string') {
      errors.push('username is required and must be a string');
    } else if (!this.VALIDATION_RULES.username.test(username)) {
      errors.push('username must be 1-15 characters, alphanumeric and underscore only');
    }

    return { isValid: errors.length === 0, errors };
  }

  // ============================================================================
  // PRIVATE METHODS - RATE LIMITING
  // ============================================================================

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastAction = now - this.lastActionTime;
    
    if (timeSinceLastAction < this.ENGAGEMENT_LIMITS.cooldownBetweenActions) {
      const waitTime = this.ENGAGEMENT_LIMITS.cooldownBetweenActions - timeSinceLastAction;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastActionTime = Date.now();
  }

  // ============================================================================
  // PRIVATE METHODS - ERROR HANDLING
  // ============================================================================

  private handleV1AuthError(error: any, operation: string): never {
    // V1認証特有のエラー処理
    if (error.message?.includes('auth_session')) {
      throw new Error(`V1 session expired or invalid - re-authentication required for operation: ${operation}`);
    }
    
    if (error.status === 401) {
      throw new Error(`V1 authentication failed for operation: ${operation}`);
    }
    
    if (error.status === 403) {
      throw new Error(`V1 operation forbidden - check account permissions: ${operation}`);
    }
    
    if (error.status === 429) {
      throw new Error(`V1 rate limit exceeded for operation: ${operation}. Please wait before retrying.`);
    }

    // エンゲージメント特有のエラー
    if (error.message?.includes('already liked') || error.message?.includes('already favorited')) {
      throw new Error(`Tweet already liked: ${operation}`);
    }

    if (error.message?.includes('already retweeted')) {
      throw new Error(`Tweet already retweeted: ${operation}`);
    }

    if (error.message?.includes('already following')) {
      throw new Error(`User already followed: ${operation}`);
    }

    if (error.message?.includes('not following')) {
      throw new Error(`User not currently followed: ${operation}`);
    }

    if (error.message?.includes('cannot follow yourself')) {
      throw new Error(`Cannot follow your own account: ${operation}`);
    }

    if (error.status === 404) {
      throw new Error(`Tweet or user not found for operation: ${operation}`);
    }

    // その他のエラー
    throw new Error(`V1 engagement API error in ${operation}: ${error.message || 'Unknown error'}`);
  }
}