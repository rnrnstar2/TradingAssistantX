/**
 * KaitoAPI Types - TwitterAPI.io統合テストスイート
 * 指示書 TASK-004 準拠: 型定義の包括的テスト
 * 
 * テスト対象:
 * - TwitterAPI.io準拠型定義の検証
 * - 型安全性・互換性テスト
 * - エラー型・レスポンス型の妥当性
 * - ユニオン型・オプショナル型の動作確認
 */

import { describe, test, expect } from 'vitest';
import type {
  // Core Client Types
  KaitoClientConfig,
  KaitoAPIConfig,
  HttpClient,
  QpsController,
  CostTrackingInfo,
  RateLimitStatus,
  
  // Tweet Types - TwitterAPI.io準拠
  TweetData,
  TweetResult,
  TweetSearchResult,
  TweetSearchOptions,
  PostRequest,
  PostResponse,
  RetweetResult,
  QuoteTweetResult,
  DeleteTweetResult,
  
  // User Types - TwitterAPI.io準拠
  UserData,
  UserSearchResult,
  UserSearchOptions,
  FollowResult,
  UnfollowResult,
  AccountInfo,
  
  // Engagement Types
  EngagementRequest,
  EngagementResponse,
  LikeResult,
  
  // Error Types
  TwitterAPIError,
  APIErrorResponse,
  
  // Utility Types
  Timestamp,
  APIResponse
} from '../../src/kaito-api/types';

describe('KaitoAPI Types - TwitterAPI.io統合テスト', () => {
  
  describe('Core Client Types - 基本クライアント型', () => {
    test('KaitoClientConfig should have correct structure', () => {
      const config: KaitoClientConfig = {
        apiKey: 'test-key',
        qpsLimit: 200,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000
        },
        costTracking: true
      };

      expect(typeof config.apiKey).toBe('string');
      expect(typeof config.qpsLimit).toBe('number');
      expect(typeof config.retryPolicy.maxRetries).toBe('number');
      expect(typeof config.retryPolicy.backoffMs).toBe('number');
      expect(typeof config.costTracking).toBe('boolean');
    });

    test('KaitoAPIConfig should support development and production environments', () => {
      const devConfig: KaitoAPIConfig = {
        environment: 'dev',
        api: {
          baseUrl: 'https://api.twitterapi.io',
          version: 'v1',
          timeout: 30000,
          retryPolicy: {
            maxRetries: 3,
            backoffMs: 1000,
            retryConditions: ['NETWORK_ERROR', 'TIMEOUT']
          }
        },
        authentication: {
          primaryKey: 'dev-key',
          keyRotationInterval: 86400000,
          encryptionEnabled: false
        },
        performance: {
          qpsLimit: 200,
          responseTimeTarget: 700,
          cacheEnabled: false,
          cacheTTL: 0
        },
        monitoring: {
          metricsEnabled: true,
          logLevel: 'info',
          alertingEnabled: false,
          healthCheckInterval: 30000
        },
        security: {
          rateLimitEnabled: true,
          ipWhitelist: [],
          auditLoggingEnabled: true,
          encryptionKey: 'test-key'
        },
        features: {
          realApiEnabled: true,
          mockFallbackEnabled: false,
          batchProcessingEnabled: false,
          advancedCachingEnabled: false
        },
        metadata: {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          updatedBy: 'test',
          checksum: 'test-checksum'
        }
      };

      expect(devConfig.environment).toBe('dev');
      expect(devConfig.api.baseUrl).toBe('https://api.twitterapi.io');
      expect(devConfig.performance.qpsLimit).toBe(200);
    });

    test('HttpClient interface should define required methods', () => {
      const mockHttpClient: HttpClient = {
        get: async (url: string, options?: any) => ({ data: {} }),
        post: async (url: string, data?: any, options?: any) => ({ data: {} }),
        delete: async (url: string, options?: any) => ({ data: {} })
      };

      expect(typeof mockHttpClient.get).toBe('function');
      expect(typeof mockHttpClient.post).toBe('function');
      expect(typeof mockHttpClient.delete).toBe('function');
    });

    test('RateLimitStatus should track all endpoint categories', () => {
      const rateLimits: RateLimitStatus = {
        general: {
          limit: 900,
          remaining: 850,
          resetTime: new Date().toISOString()
        },
        posting: {
          limit: 300,
          remaining: 250,
          resetTime: new Date().toISOString()
        },
        collection: {
          limit: 500,
          remaining: 450,
          resetTime: new Date().toISOString()
        },
        lastUpdated: new Date().toISOString()
      };

      expect(rateLimits.general.limit).toBe(900);
      expect(rateLimits.posting.limit).toBe(300);
      expect(rateLimits.collection.limit).toBe(500);
      expect(typeof rateLimits.lastUpdated).toBe('string');
    });

    test('CostTrackingInfo should calculate costs correctly', () => {
      const costInfo: CostTrackingInfo = {
        tweetsProcessed: 1000,
        estimatedCost: 0.15, // $0.15 for 1000 tweets
        resetDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      expect(costInfo.tweetsProcessed).toBe(1000);
      expect(costInfo.estimatedCost).toBe(0.15);
      expect(typeof costInfo.resetDate).toBe('string');
    });
  });

  describe('Tweet Types - TwitterAPI.io準拠', () => {
    test('TweetData should match TwitterAPI.io response format', () => {
      const tweetData: TweetData = {
        id: '1234567890',
        text: 'Investment education content',
        author_id: '123456789',
        created_at: '2023-01-01T00:00:00.000Z',
        public_metrics: {
          retweet_count: 10,
          like_count: 25,
          quote_count: 3,
          reply_count: 5,
          impression_count: 1000
        },
        context_annotations: [
          {
            domain: { name: 'Finance', description: 'Financial content' },
            entity: { name: 'Investment', description: 'Investment related' }
          }
        ],
        lang: 'en',
        possibly_sensitive: false,
        reply_settings: 'everyone'
      };

      expect(typeof tweetData.id).toBe('string');
      expect(typeof tweetData.text).toBe('string');
      expect(typeof tweetData.author_id).toBe('string');
      expect(typeof tweetData.created_at).toBe('string');
      expect(typeof tweetData.public_metrics.like_count).toBe('number');
      expect(Array.isArray(tweetData.context_annotations)).toBe(true);
    });

    test('PostRequest should support all Twitter post options', () => {
      const postRequest: PostRequest = {
        content: 'Test tweet with all features',
        mediaIds: ['media1', 'media2'],
        inReplyTo: 'reply_tweet_id',
        quoteTweetId: 'quote_tweet_id',
        poll: {
          options: ['Option A', 'Option B'],
          duration_minutes: 1440
        },
        geo: {
          place_id: 'place_123'
        }
      };

      expect(typeof postRequest.content).toBe('string');
      expect(Array.isArray(postRequest.mediaIds)).toBe(true);
      expect(postRequest.mediaIds?.length).toBe(2);
      expect(postRequest.poll?.options).toHaveLength(2);
    });

    test('TweetSearchOptions should support advanced filtering', () => {
      const searchOptions: TweetSearchOptions = {
        query: 'investment education',
        maxResults: 100,
        sortOrder: 'recent',
        since: '2023-01-01T00:00:00.000Z',
        until: '2023-01-31T23:59:59.000Z',
        lang: 'en',
        minRetweets: 10,
        minLikes: 50,
        hasMedia: true,
        verifiedOnly: true,
        sentiment: 'positive',
        geoCode: '37.781157,-122.398720,1mi'
      };

      expect(typeof searchOptions.query).toBe('string');
      expect(typeof searchOptions.maxResults).toBe('number');
      expect(searchOptions.sortOrder).toMatch(/^(recent|popular)$/);
      expect(typeof searchOptions.hasMedia).toBe('boolean');
    });

    test('TweetResult should support success and error states', () => {
      const successResult: TweetResult = {
        success: true,
        id: '1234567890',
        url: 'https://twitter.com/i/status/1234567890',
        createdAt: '2023-01-01T00:00:00.000Z'
      };

      const errorResult: TweetResult = {
        success: false,
        error: 'Tweet creation failed'
      };

      expect(successResult.success).toBe(true);
      expect(successResult.id).toBeDefined();
      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBeDefined();
    });
  });

  describe('User Types - TwitterAPI.io準拠', () => {
    test('UserData should match TwitterAPI.io user format', () => {
      const userData: UserData = {
        id: '123456789',
        username: 'testuser',
        name: 'Test User',
        description: 'Investment educator and trader',
        created_at: '2020-01-01T00:00:00.000Z',
        verified: false,
        protected: false,
        public_metrics: {
          followers_count: 1000,
          following_count: 500,
          tweet_count: 2000,
          listed_count: 10
        },
        profile_image_url: 'https://pbs.twimg.com/profile_images/123/avatar.jpg',
        profile_banner_url: 'https://pbs.twimg.com/profile_banners/123/banner.jpg',
        location: 'New York, NY',
        url: 'https://example.com',
        entities: {
          url: {
            urls: [
              {
                start: 0,
                end: 23,
                url: 'https://t.co/example',
                expanded_url: 'https://example.com',
                display_url: 'example.com'
              }
            ]
          }
        }
      };

      expect(typeof userData.id).toBe('string');
      expect(typeof userData.username).toBe('string');
      expect(typeof userData.verified).toBe('boolean');
      expect(typeof userData.public_metrics.followers_count).toBe('number');
      expect(Array.isArray(userData.entities?.url?.urls)).toBe(true);
    });

    test('UserSearchOptions should support comprehensive filtering', () => {
      const searchOptions: UserSearchOptions = {
        query: 'investment expert',
        maxResults: 50,
        verifiedOnly: true,
        minFollowers: 1000,
        maxFollowers: 100000,
        hasProfileImage: true,
        location: 'New York',
        createdAfter: '2020-01-01T00:00:00.000Z',
        activeRecently: true
      };

      expect(typeof searchOptions.query).toBe('string');
      expect(typeof searchOptions.verifiedOnly).toBe('boolean');
      expect(typeof searchOptions.minFollowers).toBe('number');
      expect(typeof searchOptions.maxFollowers).toBe('number');
    });

    test('AccountInfo should provide comprehensive user data', () => {
      const accountInfo: AccountInfo = {
        id: '123456789',
        username: 'testuser',
        displayName: 'Test User',
        followersCount: 1000,
        followingCount: 500,
        tweetCount: 2000,
        listedCount: 10,
        verified: false,
        profileImageUrl: 'https://example.com/avatar.jpg',
        bannerImageUrl: 'https://example.com/banner.jpg',
        bio: 'Investment educator',
        location: 'NYC',
        website: 'https://example.com',
        createdAt: '2020-01-01T00:00:00.000Z',
        timestamp: new Date().toISOString()
      };

      expect(typeof accountInfo.id).toBe('string');
      expect(typeof accountInfo.followersCount).toBe('number');
      expect(typeof accountInfo.verified).toBe('boolean');
      expect(typeof accountInfo.timestamp).toBe('string');
    });
  });

  describe('Engagement Types - アクション型', () => {
    test('EngagementRequest should support all action types', () => {
      const likeRequest: EngagementRequest = {
        tweetId: '1234567890',
        action: 'like'
      };

      const retweetRequest: EngagementRequest = {
        tweetId: '1234567890',
        action: 'retweet'
      };

      const quoteRequest: EngagementRequest = {
        tweetId: '1234567890',
        action: 'quote',
        comment: 'Great insight!'
      };

      expect(likeRequest.action).toBe('like');
      expect(retweetRequest.action).toBe('retweet');
      expect(quoteRequest.action).toBe('quote');
      expect(quoteRequest.comment).toBeDefined();
    });

    test('EngagementResponse should provide action feedback', () => {
      const response: EngagementResponse = {
        success: true,
        action: 'like',
        tweetId: '1234567890',
        timestamp: new Date().toISOString(),
        data: {
          liked: true
        }
      };

      expect(response.success).toBe(true);
      expect(response.action).toBe('like');
      expect(typeof response.timestamp).toBe('string');
      expect(response.data.liked).toBe(true);
    });

    test('LikeResult should handle success and failure states', () => {
      const successResult: LikeResult = {
        success: true,
        tweetId: '1234567890',
        liked: true,
        timestamp: new Date().toISOString()
      };

      const errorResult: LikeResult = {
        success: false,
        tweetId: '1234567890',
        error: 'Tweet not found'
      };

      expect(successResult.success).toBe(true);
      expect(successResult.liked).toBe(true);
      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBeDefined();
    });
  });

  describe('Error Types - TwitterAPI.io エラー型', () => {
    test('TwitterAPIError should capture comprehensive error information', () => {
      const error: TwitterAPIError = {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded for search endpoint',
        type: 'rate_limit',
        status: 429,
        details: {
          endpoint: '/twitter/tweet/advanced_search',
          reset_time: '2023-01-01T01:00:00.000Z',
          remaining_requests: 0
        }
      };

      expect(typeof error.code).toBe('string');
      expect(typeof error.message).toBe('string');
      expect(typeof error.status).toBe('number');
      expect(error.type).toBe('rate_limit');
      expect(error.details?.reset_time).toBeDefined();
    });

    test('APIErrorResponse should handle various error scenarios', () => {
      const authError: APIErrorResponse = {
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Invalid API key',
          type: 'authentication'
        },
        timestamp: new Date().toISOString(),
        request_id: 'req_123456'
      };

      const validationError: APIErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid tweet content',
          type: 'validation'
        },
        errors: [
          {
            field: 'text',
            message: 'Tweet content exceeds 280 characters'
          }
        ],
        timestamp: new Date().toISOString()
      };

      expect(authError.error.type).toBe('authentication');
      expect(validationError.errors).toBeDefined();
      expect(validationError.errors?.[0].field).toBe('text');
    });
  });

  describe('Union Types and Optional Fields - ユニオン型・オプション型', () => {
    test('should handle optional fields correctly', () => {
      const minimalTweet: TweetData = {
        id: '1234567890',
        text: 'Minimal tweet',
        author_id: '123456789',
        created_at: '2023-01-01T00:00:00.000Z'
        // public_metrics, context_annotations等はオプション
      };

      expect(minimalTweet.id).toBeDefined();
      expect(minimalTweet.public_metrics).toBeUndefined();
    });

    test('should handle union types for sort order', () => {
      const recentSearch: TweetSearchOptions = {
        query: 'test',
        sortOrder: 'recent'
      };

      const popularSearch: TweetSearchOptions = {
        query: 'test',
        sortOrder: 'popular'
      };

      expect(recentSearch.sortOrder).toBe('recent');
      expect(popularSearch.sortOrder).toBe('popular');
    });

    test('should handle union types for engagement actions', () => {
      const actions: EngagementRequest['action'][] = ['like', 'retweet', 'quote'];
      
      actions.forEach(action => {
        const request: EngagementRequest = {
          tweetId: '123',
          action
        };
        expect(['like', 'retweet', 'quote']).toContain(request.action);
      });
    });
  });

  describe('Type Compatibility - 型互換性', () => {
    test('should ensure backward compatibility with existing types', () => {
      // 既存のコードが新しい型定義でも動作することを確認
      interface LegacyTweetData {
        id: string;
        text: string;
        created_at: string;
      }

      const legacyTweet: LegacyTweetData = {
        id: '123',
        text: 'test',
        created_at: '2023-01-01T00:00:00.000Z'
      };

      // 新しいTweetData型に代入可能であることを確認
      const newTweet: Partial<TweetData> = legacyTweet;
      expect(newTweet.id).toBe('123');
    });

    test('should support generic APIResponse wrapper', () => {
      interface CustomData {
        customField: string;
      }

      const response: APIResponse<CustomData> = {
        data: {
          customField: 'test value'
        },
        meta: {
          request_id: 'req_123',
          rate_limit: {
            remaining: 100,
            reset: '2023-01-01T01:00:00.000Z'
          }
        }
      };

      expect(response.data.customField).toBe('test value');
      expect(response.meta?.request_id).toBe('req_123');
    });
  });

  describe('Type Guards and Validation - 型ガード・バリデーション', () => {
    test('should validate tweet data structure', () => {
      const isValidTweetData = (data: any): data is TweetData => {
        return (
          typeof data.id === 'string' &&
          typeof data.text === 'string' &&
          typeof data.author_id === 'string' &&
          typeof data.created_at === 'string'
        );
      };

      const validTweet = {
        id: '123',
        text: 'test',
        author_id: '456',
        created_at: '2023-01-01T00:00:00.000Z'
      };

      const invalidTweet = {
        id: 123, // 数値なので無効
        text: 'test'
      };

      expect(isValidTweetData(validTweet)).toBe(true);
      expect(isValidTweetData(invalidTweet)).toBe(false);
    });

    test('should validate search options', () => {
      const isValidSearchOptions = (options: any): options is TweetSearchOptions => {
        return (
          typeof options.query === 'string' &&
          options.query.length > 0 &&
          (options.maxResults === undefined || 
           (typeof options.maxResults === 'number' && options.maxResults <= 100))
        );
      };

      const validOptions = {
        query: 'investment',
        maxResults: 50
      };

      const invalidOptions = {
        query: '',
        maxResults: 150
      };

      expect(isValidSearchOptions(validOptions)).toBe(true);
      expect(isValidSearchOptions(invalidOptions)).toBe(false);
    });
  });

  describe('Timestamp and Date Handling - 日時処理', () => {
    test('should handle ISO timestamp format consistently', () => {
      const timestamp: Timestamp = new Date().toISOString();
      
      expect(typeof timestamp).toBe('string');
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should support date range in search options', () => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const searchOptions: TweetSearchOptions = {
        query: 'test',
        since: oneWeekAgo.toISOString(),
        until: now.toISOString()
      };

      expect(searchOptions.since).toBeDefined();
      expect(searchOptions.until).toBeDefined();
      expect(new Date(searchOptions.until!).getTime()).toBeGreaterThan(
        new Date(searchOptions.since!).getTime()
      );
    });
  });
});