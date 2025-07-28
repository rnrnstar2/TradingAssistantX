/**
 * TwitterAPI.io統合モックデータ生成システム
 * 指示書 TASK-004 準拠: TwitterAPI.io準拠モックレスポンス
 * 
 * 提供機能:
 * - TwitterAPI.io準拠のリアルなレスポンス生成
 * - エラーシナリオの包括的カバレッジ
 * - テスト用ファクトリー関数
 * - 境界値・エッジケース対応データ
 */

import type {
  TweetData,
  UserData,
  PostResponse,
  TweetSearchResult,
  UserSearchResult,
  EngagementResponse,
  TwitterAPIError,
  APIErrorResponse,
  AccountInfo,
  CostTrackingInfo,
  RateLimitStatus
} from '../../src/kaito-api/types';

// ============================================================================
// TwitterAPI.io準拠レスポンス生成ファクトリー
// ============================================================================

export class TwitterAPIResponseFactory {
  
  /**
   * TwitterAPI.io形式のツイートデータ生成
   */
  static createTweetData(overrides?: Partial<TweetData>): TweetData {
    const baseData: TweetData = {
      id: this.generateTweetId(),
      text: 'Investment education: Understanding risk management principles and portfolio diversification strategies.',
      author_id: this.generateUserId(),
      created_at: new Date().toISOString(),
      public_metrics: {
        retweet_count: Math.floor(Math.random() * 50),
        like_count: Math.floor(Math.random() * 100),
        quote_count: Math.floor(Math.random() * 10),
        reply_count: Math.floor(Math.random() * 20),
        impression_count: Math.floor(Math.random() * 1000) + 500
      },
      context_annotations: [
        {
          domain: { 
            id: '66', 
            name: 'Finance', 
            description: 'Financial and economic topics' 
          },
          entity: { 
            id: '1234567890', 
            name: 'Investment Education', 
            description: 'Educational content about investments' 
          }
        }
      ],
      lang: 'en',
      possibly_sensitive: false,
      reply_settings: 'everyone'
    };

    return { ...baseData, ...overrides };
  }

  /**
   * TwitterAPI.io形式のユーザーデータ生成
   */
  static createUserData(overrides?: Partial<UserData>): UserData {
    const baseData: UserData = {
      id: this.generateUserId(),
      username: 'investment_educator',
      name: 'Investment Educator',
      description: 'Professional trader and investment educator. Helping others build wealth through smart investing. 📈💰 #InvestmentEducation',
      created_at: '2020-01-01T00:00:00.000Z',
      verified: false,
      protected: false,
      public_metrics: {
        followers_count: Math.floor(Math.random() * 10000) + 1000,
        following_count: Math.floor(Math.random() * 1000) + 100,
        tweet_count: Math.floor(Math.random() * 5000) + 500,
        listed_count: Math.floor(Math.random() * 100) + 10
      },
      profile_image_url: 'https://pbs.twimg.com/profile_images/123456789/avatar.jpg',
      profile_banner_url: 'https://pbs.twimg.com/profile_banners/123456789/banner.jpg',
      location: 'New York, NY',
      url: 'https://example.com',
      entities: {
        url: {
          urls: [
            {
              start: 0,
              end: 23,
              url: 'https://t.co/example123',
              expanded_url: 'https://example.com',
              display_url: 'example.com'
            }
          ]
        },
        description: {
          urls: [],
          hashtags: [
            { start: 95, end: 115, tag: 'InvestmentEducation' }
          ]
        }
      }
    };

    return { ...baseData, ...overrides };
  }

  /**
   * ツイート検索結果の生成
   */
  static createTweetSearchResult(
    tweetCount: number = 10,
    options?: {
      includeNextToken?: boolean;
      includeMetrics?: boolean;
    }
  ): TweetSearchResult {
    const tweets = Array(tweetCount).fill(null).map((_, i) => 
      this.createTweetData({
        id: this.generateTweetId(),
        text: `Investment tip ${i + 1}: ${this.getRandomInvestmentTip()}`,
        public_metrics: options?.includeMetrics ? {
          retweet_count: Math.floor(Math.random() * 20),
          like_count: Math.floor(Math.random() * 50),
          quote_count: Math.floor(Math.random() * 5),
          reply_count: Math.floor(Math.random() * 10),
          impression_count: Math.floor(Math.random() * 500) + 100
        } : undefined
      })
    );

    return {
      success: true,
      tweets,
      meta: {
        result_count: tweetCount,
        next_token: options?.includeNextToken ? this.generateNextToken() : undefined
      }
    };
  }

  /**
   * ユーザー検索結果の生成
   */
  static createUserSearchResult(
    userCount: number = 5,
    options?: {
      verifiedOnly?: boolean;
      includeNextToken?: boolean;
    }
  ): UserSearchResult {
    const users = Array(userCount).fill(null).map((_, i) => 
      this.createUserData({
        id: this.generateUserId(),
        username: `trader_${i + 1}`,
        name: `Professional Trader ${i + 1}`,
        verified: options?.verifiedOnly ? true : Math.random() > 0.7,
        public_metrics: {
          followers_count: Math.floor(Math.random() * 50000) + 1000,
          following_count: Math.floor(Math.random() * 2000) + 200,
          tweet_count: Math.floor(Math.random() * 10000) + 1000,
          listed_count: Math.floor(Math.random() * 200) + 20
        }
      })
    );

    return {
      success: true,
      users,
      meta: {
        result_count: userCount,
        next_token: options?.includeNextToken ? this.generateNextToken() : undefined
      }
    };
  }

  /**
   * 投稿レスポンスの生成
   */
  static createPostResponse(success: boolean = true, tweetId?: string): PostResponse {
    if (success) {
      return {
        success: true,
        tweetId: tweetId || this.generateTweetId(),
        createdAt: new Date().toISOString(),
        url: `https://twitter.com/i/status/${tweetId || this.generateTweetId()}`
      };
    } else {
      return {
        success: false,
        error: 'Tweet creation failed: Content violates platform rules'
      };
    }
  }

  /**
   * エンゲージメントレスポンスの生成
   */
  static createEngagementResponse(
    action: 'like' | 'retweet' | 'quote',
    success: boolean = true,
    tweetId?: string
  ): EngagementResponse {
    const baseResponse = {
      success,
      action,
      tweetId: tweetId || this.generateTweetId(),
      timestamp: new Date().toISOString()
    };

    if (success) {
      const actionData = {
        like: { liked: true },
        retweet: { retweeted: true },
        quote: { quoted: true, quote_id: this.generateTweetId() }
      };

      return {
        ...baseResponse,
        data: actionData[action]
      };
    } else {
      const errorMessages = {
        like: 'Cannot like this tweet: Tweet not found',
        retweet: 'Cannot retweet this tweet: You have already retweeted this',
        quote: 'Cannot quote tweet this tweet: Original tweet is protected'
      };

      return {
        ...baseResponse,
        error: errorMessages[action]
      };
    }
  }

  // ============================================================================
  // エラーレスポンス生成
  // ============================================================================

  /**
   * TwitterAPI.io固有エラーレスポンス生成
   */
  static createTwitterAPIError(
    type: 'rate_limit' | 'authentication' | 'validation' | 'not_found' | 'forbidden'
  ): TwitterAPIError {
    const errorConfigs = {
      rate_limit: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded for this endpoint',
        status: 429,
        details: {
          endpoint: '/twitter/tweet/advanced_search',
          reset_time: new Date(Date.now() + 900000).toISOString(), // 15 minutes
          remaining_requests: 0
        }
      },
      authentication: {
        code: 'AUTHENTICATION_FAILED',
        message: 'Invalid API key - authentication failed',
        status: 401,
        details: {
          provided_key: 'xxxx...xxxx',
          key_status: 'invalid'
        }
      },
      validation: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        status: 400,
        details: {
          field_errors: [
            { field: 'text', message: 'Tweet content exceeds 280 characters' },
            { field: 'media_ids', message: 'Maximum 4 media items allowed' }
          ]
        }
      },
      not_found: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'The requested resource was not found',
        status: 404,
        details: {
          resource_type: 'tweet',
          resource_id: '1234567890'
        }
      },
      forbidden: {
        code: 'ACCESS_FORBIDDEN',
        message: 'You do not have permission to access this resource',
        status: 403,
        details: {
          reason: 'protected_account',
          required_permission: 'read_protected_tweets'
        }
      }
    };

    const config = errorConfigs[type];
    return {
      code: config.code,
      message: config.message,
      type,
      status: config.status,
      details: config.details
    };
  }

  /**
   * APIエラーレスポンス生成
   */
  static createAPIErrorResponse(
    errorType: 'rate_limit' | 'authentication' | 'validation' | 'not_found' | 'forbidden'
  ): APIErrorResponse {
    const error = this.createTwitterAPIError(errorType);
    
    const baseResponse: APIErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        type: error.type
      },
      timestamp: new Date().toISOString(),
      request_id: this.generateRequestId()
    };

    if (errorType === 'validation') {
      baseResponse.errors = [
        { field: 'text', message: 'Tweet content exceeds 280 characters' },
        { field: 'media_ids', message: 'Maximum 4 media items allowed' }
      ];
    }

    return baseResponse;
  }

  // ============================================================================
  // システム情報・メトリクス生成
  // ============================================================================

  /**
   * アカウント情報の生成
   */
  static createAccountInfo(overrides?: Partial<AccountInfo>): AccountInfo {
    const baseInfo: AccountInfo = {
      id: this.generateUserId(),
      username: 'investment_bot',
      displayName: 'Investment Education Bot',
      followersCount: 12500,
      followingCount: 850,
      tweetCount: 3200,
      listedCount: 45,
      verified: false,
      profileImageUrl: 'https://pbs.twimg.com/profile_images/bot/avatar.jpg',
      bannerImageUrl: 'https://pbs.twimg.com/profile_banners/bot/banner.jpg',
      bio: 'Automated investment education content. Building financial literacy one tweet at a time. 🤖📊',
      location: 'Global',
      website: 'https://investment-education.com',
      createdAt: '2022-01-01T00:00:00.000Z',
      timestamp: new Date().toISOString()
    };

    return { ...baseInfo, ...overrides };
  }

  /**
   * コスト追跡情報の生成
   */
  static createCostTrackingInfo(
    tweetsProcessed: number = 1500,
    overrides?: Partial<CostTrackingInfo>
  ): CostTrackingInfo {
    const baseInfo: CostTrackingInfo = {
      tweetsProcessed,
      estimatedCost: (tweetsProcessed / 1000) * 0.15, // $0.15 per 1k tweets
      resetDate: this.getNextMonthFirstDay().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    return { ...baseInfo, ...overrides };
  }

  /**
   * レート制限状況の生成
   */
  static createRateLimitStatus(overrides?: Partial<RateLimitStatus>): RateLimitStatus {
    const baseStatus: RateLimitStatus = {
      general: {
        limit: 900,
        remaining: Math.floor(Math.random() * 900),
        resetTime: new Date(Date.now() + 3600000).toISOString() // 1 hour
      },
      posting: {
        limit: 300,
        remaining: Math.floor(Math.random() * 300),
        resetTime: new Date(Date.now() + 3600000).toISOString()
      },
      collection: {
        limit: 500,
        remaining: Math.floor(Math.random() * 500),
        resetTime: new Date(Date.now() + 3600000).toISOString()
      },
      lastUpdated: new Date().toISOString()
    };

    return { ...baseStatus, ...overrides };
  }

  // ============================================================================
  // エッジケース・境界値データ生成
  // ============================================================================

  /**
   * 境界値テスト用データ
   */
  static createBoundaryTestData() {
    return {
      // 280文字ちょうどのツイート
      maxLengthTweet: this.createTweetData({
        text: 'a'.repeat(280)
      }),

      // 最大メディア数（4個）
      maxMediaTweet: this.createTweetData({
        text: 'Tweet with maximum media attachments',
        attachments: {
          media_keys: ['3_1', '3_2', '3_3', '3_4']
        }
      }),

      // 空のメトリクス
      zeroMetricsTweet: this.createTweetData({
        public_metrics: {
          retweet_count: 0,
          like_count: 0,
          quote_count: 0,
          reply_count: 0,
          impression_count: 0
        }
      }),

      // 最大フォロワー数
      maxFollowersUser: this.createUserData({
        public_metrics: {
          followers_count: 999999999,
          following_count: 7500,
          tweet_count: 50000,
          listed_count: 10000
        }
      }),

      // 認証済みユーザー
      verifiedUser: this.createUserData({
        verified: true,
        public_metrics: {
          followers_count: 1000000,
          following_count: 500,
          tweet_count: 25000,
          listed_count: 500
        }
      }),

      // プライベートアカウント
      protectedUser: this.createUserData({
        protected: true,
        public_metrics: {
          followers_count: 150,
          following_count: 300,
          tweet_count: 500,
          listed_count: 5
        }
      })
    };
  }

  // ============================================================================
  // ユーティリティ関数
  // ============================================================================

  private static generateTweetId(): string {
    return Math.floor(Math.random() * 9000000000000000000 + 1000000000000000000).toString();
  }

  private static generateUserId(): string {
    return Math.floor(Math.random() * 900000000 + 100000000).toString();
  }

  private static generateNextToken(): string {
    return Buffer.from(Math.random().toString()).toString('base64').substring(0, 16);
  }

  private static generateRequestId(): string {
    return `req_${Math.random().toString(36).substring(2, 15)}`;
  }

  private static getRandomInvestmentTip(): string {
    const tips = [
      'Diversify your portfolio across different asset classes',
      'Never invest more than you can afford to lose',
      'Dollar-cost averaging reduces timing risk',
      'Research before investing in any stock or fund',
      'Keep emergency fund separate from investments',
      'Understand the fees associated with your investments',
      'Review and rebalance your portfolio regularly',
      'Consider your risk tolerance and time horizon',
      'Avoid emotional decision-making during market volatility',
      'Start investing early to benefit from compound growth'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  private static getNextMonthFirstDay(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
}

// ============================================================================
// 事前定義されたモックデータセット
// ============================================================================

export const mockTwitterAPIResponses = {
  // 成功レスポンス
  success: {
    tweet: {
      create: TwitterAPIResponseFactory.createPostResponse(true),
      search: TwitterAPIResponseFactory.createTweetSearchResult(10, { includeMetrics: true }),
      single: TwitterAPIResponseFactory.createTweetData(),
      delete: { success: true, deleted: true }
    },
    user: {
      info: TwitterAPIResponseFactory.createUserData(),
      search: TwitterAPIResponseFactory.createUserSearchResult(5, { verifiedOnly: false }),
      follow: { success: true, following: true },
      unfollow: { success: true, following: false }
    },
    engagement: {
      like: TwitterAPIResponseFactory.createEngagementResponse('like', true),
      retweet: TwitterAPIResponseFactory.createEngagementResponse('retweet', true),
      quote: TwitterAPIResponseFactory.createEngagementResponse('quote', true)
    }
  },

  // エラーレスポンス
  errors: {
    rateLimitExceeded: TwitterAPIResponseFactory.createAPIErrorResponse('rate_limit'),
    authenticationFailed: TwitterAPIResponseFactory.createAPIErrorResponse('authentication'),
    validationError: TwitterAPIResponseFactory.createAPIErrorResponse('validation'),
    notFound: TwitterAPIResponseFactory.createAPIErrorResponse('not_found'),
    forbidden: TwitterAPIResponseFactory.createAPIErrorResponse('forbidden')
  },

  // システム情報
  system: {
    accountInfo: TwitterAPIResponseFactory.createAccountInfo(),
    costTracking: TwitterAPIResponseFactory.createCostTrackingInfo(),
    rateLimits: TwitterAPIResponseFactory.createRateLimitStatus()
  },

  // 境界値・エッジケース
  boundary: TwitterAPIResponseFactory.createBoundaryTestData()
};

// デフォルトエクスポート
export default TwitterAPIResponseFactory;