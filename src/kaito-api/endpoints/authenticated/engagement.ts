/**
 * Authenticated Engagement Endpoint
 * V2ログイン認証が必要なエンゲージメント機能
 * REQUIREMENTS.md準拠
 */

import { 
  EngagementRequest, 
  EngagementResponse,
  HttpClient
} from '../../utils/types';
import { AuthManager } from '../../core/auth-manager';

// ============================================================================
// VALIDATION TYPES
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface QuoteTweetRequest {
  tweet_id: string;
  quoteText: string;
  mediaIds?: string[];
}

interface QuoteTweetResponse {
  success: boolean;
  quoteTweetId?: string;
  createdAt?: string;
  error?: string;
}

// ============================================================================
// ENGAGEMENT MANAGEMENT CLASS
// ============================================================================

/**
 * EngagementManagement - 認証必須エンゲージメント管理クラス
 * 
 * V2ログイン認証（login_cookie）が必要な機能:
 * - いいね・いいね解除
 * - リツイート・リツイート解除
 * - 引用リツイート
 */
export class EngagementManagement {
  private readonly ENDPOINTS = {
    likeTweet: '/twitter/like_tweet_v2',
    unlikeTweet: '/twitter/unlike_tweet_v2',
    retweetTweet: '/twitter/retweet_tweet_v2',
    unretweetTweet: '/twitter/unretweet_tweet_v2',
    quoteTweet: '/twitter/create_tweet_v2'
  } as const;

  private readonly RATE_LIMITS = {
    engagement: { limit: 500, window: 3600 }, // 500/hour
    quoting: { limit: 300, window: 3600 }    // 300/hour
  } as const;

  private readonly VALIDATION_RULES = {
    tweetId: /^\d{1,19}$/,
    quoteText: { minLength: 0, maxLength: 280 }
  } as const;

  constructor(
    private httpClient: HttpClient,
    private authManager: AuthManager
  ) {
    console.log('✅ EngagementManagement initialized with V2 authentication');
  }

  // ============================================================================
  // PUBLIC METHODS - LIKE OPERATIONS
  // ============================================================================

  /**
   * ツイートにいいねする
   * V2ログイン認証（login_cookie）必須
   */
  async likeTweet(tweetId: string): Promise<EngagementResponse> {
    return this.performEngagement({ tweet_id: tweetId, action: 'like', proxy: '' });
  }

  /**
   * ツイートのいいねを解除する
   * V2ログイン認証（login_cookie）必須
   */
  async unlikeTweet(tweetId: string): Promise<EngagementResponse> {
    // バリデーション
    const validation = this.validateTweetId(tweetId);
    if (!validation.isValid) {
      return {
        success: false,
        action: 'unlike',
        tweet_id: tweetId,
        timestamp: new Date().toISOString(),
        data: { liked: false, retweeted: false },
        error: {
          code: "VALIDATION_ERROR",
          message: validation.errors.join(', ')
        }
      };
    }

    try {
      // V2認証確認
      const loginCookie = this.authManager.getUserSession();
      if (!loginCookie) {
        throw new Error('No valid V2 login session available');
      }

      console.log(`❤️ Unliking tweet ${tweetId} with V2 authentication...`);

      await this.httpClient.post(this.ENDPOINTS.unlikeTweet, {
        tweet_id: tweetId,
        login_cookie: loginCookie
      });

      return {
        success: true,
        action: 'unlike',
        tweet_id: tweetId,
        timestamp: new Date().toISOString(),
        data: { liked: false, retweeted: false }
      };
    } catch (error: any) {
      return this.handleEngagementError(error, { tweet_id: tweetId, action: 'unlike' });
    }
  }

  // ============================================================================
  // PUBLIC METHODS - RETWEET OPERATIONS
  // ============================================================================

  /**
   * ツイートをリツイートする
   * V2ログイン認証（login_cookie）必須
   */
  async retweetTweet(tweetId: string): Promise<EngagementResponse> {
    return this.performEngagement({ tweet_id: tweetId, action: 'retweet', proxy: '' });
  }

  /**
   * リツイートを解除する
   * V2ログイン認証（login_cookie）必須
   */
  async unretweetTweet(tweetId: string): Promise<EngagementResponse> {
    // バリデーション
    const validation = this.validateTweetId(tweetId);
    if (!validation.isValid) {
      return {
        success: false,
        action: 'unretweet',
        tweet_id: tweetId,
        timestamp: new Date().toISOString(),
        data: { liked: false, retweeted: false },
        error: {
          code: "VALIDATION_ERROR",
          message: validation.errors.join(', ')
        }
      };
    }

    try {
      // V2認証確認
      const loginCookie = this.authManager.getUserSession();
      if (!loginCookie) {
        throw new Error('No valid V2 login session available');
      }

      console.log(`🔄 Unretweeting tweet ${tweetId} with V2 authentication...`);

      await this.httpClient.post(this.ENDPOINTS.unretweetTweet, {
        tweet_id: tweetId,
        login_cookie: loginCookie
      });

      return {
        success: true,
        action: 'unretweet',
        tweet_id: tweetId,
        timestamp: new Date().toISOString(),
        data: { liked: false, retweeted: false }
      };
    } catch (error: any) {
      return this.handleEngagementError(error, { tweet_id: tweetId, action: 'unretweet' });
    }
  }

  // ============================================================================
  // PUBLIC METHODS - QUOTE TWEET
  // ============================================================================

  /**
   * 引用リツイートする
   * V2ログイン認証（login_cookie）必須
   */
  async quoteTweet(request: QuoteTweetRequest): Promise<QuoteTweetResponse> {
    // バリデーション
    const validation = this.validateQuoteTweetRequest(request);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    try {
      // V2認証確認
      const loginCookie = this.authManager.getUserSession();
      if (!loginCookie) {
        return {
          success: false,
          error: 'No valid V2 login session available'
        };
      }

      console.log('💬 Creating quote tweet with V2 authentication...');

      // 引用ツイートURL構築
      const quotedTweetUrl = `https://twitter.com/i/status/${request.tweet_id}`;
      const fullText = request.quoteText 
        ? `${request.quoteText} ${quotedTweetUrl}`
        : quotedTweetUrl;

      const response = await this.httpClient.post(this.ENDPOINTS.quoteTweet, {
        text: fullText,
        login_cookie: loginCookie,
        ...(request.mediaIds && { media_ids: request.mediaIds })
      });

      // 型ガードで安全にアクセス
      if (this.isAPIResponse(response) && response.success && response.data) {
        return {
          success: true,
          quoteTweetId: response.data.id,
          createdAt: response.data.created_at
        };
      } else if (this.isAPIResponse(response)) {
        return {
          success: false,
          error: response.error || 'Quote tweet creation failed'
        };
      } else {
        return {
          success: false,
          error: 'Invalid response format'
        };
      }
    } catch (error: any) {
      console.error('❌ Quote tweet error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS - CORE ENGAGEMENT
  // ============================================================================

  private async performEngagement(request: EngagementRequest): Promise<EngagementResponse> {
    // エンゲージメント要求バリデーション
    const validation = this.validateEngagementRequest(request);
    if (!validation.isValid) {
      return {
        success: false,
        action: request.action,
        tweet_id: request.tweet_id,
        timestamp: new Date().toISOString(),
        data: { liked: false, retweeted: false },
        error: {
          code: "VALIDATION_ERROR",
          message: validation.errors.join(', ')
        }
      };
    }

    try {
      // V2認証確認
      const loginCookie = this.authManager.getUserSession();
      if (!loginCookie) {
        throw new Error('No valid V2 login session available');
      }

      console.log(`🚀 Performing ${request.action} on tweet ${request.tweet_id} with V2 authentication...`);
      
      let endpoint: string;
      let requestData: any;
      
      switch (request.action) {
        case 'like':
          endpoint = this.ENDPOINTS.likeTweet;
          requestData = { tweet_id: request.tweet_id, login_cookie: loginCookie };
          break;
        case 'retweet':
          endpoint = this.ENDPOINTS.retweetTweet;
          requestData = { tweet_id: request.tweet_id, login_cookie: loginCookie };
          break;
        default:
          throw new Error(`Unsupported action: ${request.action}`);
      }

      await this.httpClient.post(endpoint, requestData);
      
      return {
        success: true,
        action: request.action,
        tweet_id: request.tweet_id,
        timestamp: new Date().toISOString(),
        data: {
          liked: request.action === 'like',
          retweeted: request.action === 'retweet'
        }
      };
    } catch (error: any) {
      return this.handleEngagementError(error, request);
    }
  }

  // ============================================================================
  // PRIVATE METHODS - VALIDATION
  // ============================================================================

  private validateEngagementRequest(request: EngagementRequest): ValidationResult {
    const errors: string[] = [];

    if (!request.tweet_id?.trim()) {
      errors.push('Tweet ID is required');
    }

    if (request.tweet_id && !this.validateTweetId(request.tweet_id).isValid) {
      errors.push('Invalid tweet ID format');
    }

    if (!['like', 'retweet'].includes(request.action)) {
      errors.push('Invalid action type. Must be "like" or "retweet"');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateTweetId(tweetId: string): ValidationResult {
    const errors: string[] = [];

    if (!tweetId || typeof tweetId !== 'string' || !tweetId.trim()) {
      errors.push('Tweet ID is required and must be a non-empty string');
    } else if (!this.VALIDATION_RULES.tweetId.test(tweetId)) {
      errors.push('Invalid tweet ID format (must be 1-19 digit number)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateQuoteTweetRequest(request: QuoteTweetRequest): ValidationResult {
    const errors: string[] = [];

    // Tweet ID validation
    const tweetIdValidation = this.validateTweetId(request.tweet_id);
    if (!tweetIdValidation.isValid) {
      errors.push(...tweetIdValidation.errors);
    }

    // Quote text validation
    if (request.quoteText && request.quoteText.length > this.VALIDATION_RULES.quoteText.maxLength) {
      errors.push(`Quote text exceeds ${this.VALIDATION_RULES.quoteText.maxLength} character limit`);
    }

    // Media IDs validation
    if (request.mediaIds && request.mediaIds.length > 4) {
      errors.push('Maximum 4 media items allowed');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============================================================================
  // PRIVATE METHODS - ERROR HANDLING
  // ============================================================================

  private handleEngagementError(error: any, request: { tweet_id: string; action: string }): EngagementResponse {
    console.error(`❌ Engagement ${request.action} error:`, error);

    let errorMessage = 'Unknown error occurred';

    if (error.response?.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
    } else if (error.response?.status === 401) {
      errorMessage = 'V2 authentication failed. Please re-authenticate.';
    } else if (error.response?.status === 403) {
      errorMessage = 'Action forbidden. Check account permissions or login_cookie validity.';
    } else if (error.response?.status === 404) {
      errorMessage = 'Tweet not found or already deleted.';
    } else if (error.message?.includes('login_cookie')) {
      errorMessage = 'V2 login session expired or invalid. Please re-authenticate.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      action: request.action,
      tweet_id: request.tweet_id,
      timestamp: new Date().toISOString(),
      data: {
        liked: false,
        retweeted: false
      },
      error: {
        code: "API_ERROR",
        message: errorMessage
      }
    };
  }

  // ============================================================================
  // TYPE GUARDS
  // ============================================================================

  /**
   * API応答の型ガード
   * unknown型のレスポンスを安全にチェック
   */
  private isAPIResponse(obj: unknown): obj is { success?: boolean; data?: any; error?: any } {
    return typeof obj === 'object' && obj !== null;
  }
}