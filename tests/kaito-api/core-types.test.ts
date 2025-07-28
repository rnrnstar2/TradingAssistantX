/**
 * KaitoAPI Core Types Unit Test
 * 
 * Core関連型定義の詳細テスト
 * - KaitoClientConfig, RateLimitStatus, RateLimitInfo
 * - CostTrackingInfo, QuoteTweetResult, PostResult
 * - CoreRetweetResult, LikeResult, AccountInfo
 * - TrendData, TrendLocation
 */

import { describe, test, expect } from 'vitest';
import type {
  KaitoClientConfig,
  RateLimitStatus,
  RateLimitInfo,
  CostTrackingInfo,
  QuoteTweetResult,
  PostResult,
  CoreRetweetResult,
  LikeResult,
  AccountInfo,
  TrendData,
  TrendLocation
} from '../../src/kaito-api/types';

describe('Core Types Unit Tests', () => {
  
  describe('KaitoClientConfig Type Tests', () => {
    test('should accept valid KaitoClientConfig with nested retryPolicy', () => {
      const config: KaitoClientConfig = {
        apiKey: 'test-api-key-12345',
        qpsLimit: 10,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000
        },
        costTracking: true
      };
      
      expect(config.apiKey).toBe('test-api-key-12345');
      expect(config.qpsLimit).toBe(10);
      expect(config.retryPolicy.maxRetries).toBe(3);
      expect(config.retryPolicy.backoffMs).toBe(1000);
      expect(config.costTracking).toBe(true);
    });
    
    test('should enforce number type for qpsLimit', () => {
      const config: KaitoClientConfig = {
        apiKey: 'test-key',
        qpsLimit: 25,
        retryPolicy: {
          maxRetries: 5,
          backoffMs: 2000
        },
        costTracking: false
      };
      
      expect(typeof config.qpsLimit).toBe('number');
      expect(Number.isInteger(config.qpsLimit)).toBe(true);
      expect(config.qpsLimit).toBeGreaterThan(0);
    });
    
    test('should enforce nested retryPolicy structure', () => {
      const config: KaitoClientConfig = {
        apiKey: 'test-key',
        qpsLimit: 15,
        retryPolicy: {
          maxRetries: 2,
          backoffMs: 500
        },
        costTracking: true
      };
      
      expect(typeof config.retryPolicy.maxRetries).toBe('number');
      expect(typeof config.retryPolicy.backoffMs).toBe('number');
      expect(Number.isInteger(config.retryPolicy.maxRetries)).toBe(true);
      expect(Number.isInteger(config.retryPolicy.backoffMs)).toBe(true);
    });
    
    test('should enforce boolean type for costTracking', () => {
      const config: KaitoClientConfig = {
        apiKey: 'test-key',
        qpsLimit: 5,
        retryPolicy: {
          maxRetries: 1,
          backoffMs: 100
        },
        costTracking: false
      };
      
      expect(typeof config.costTracking).toBe('boolean');
    });
  });
  
  describe('RateLimitInfo Type Tests', () => {
    test('should accept valid RateLimitInfo', () => {
      const rateLimitInfo: RateLimitInfo = {
        remaining: 100,
        resetTime: '2023-12-01T13:00:00.000Z',
        limit: 300
      };
      
      expect(rateLimitInfo.remaining).toBe(100);
      expect(rateLimitInfo.resetTime).toBe('2023-12-01T13:00:00.000Z');
      expect(rateLimitInfo.limit).toBe(300);
    });
    
    test('should enforce number types for rate limits', () => {
      const rateLimitInfo: RateLimitInfo = {
        remaining: 50,
        resetTime: '2023-12-01T14:00:00.000Z',
        limit: 200
      };
      
      expect(typeof rateLimitInfo.remaining).toBe('number');
      expect(typeof rateLimitInfo.limit).toBe('number');
      expect(Number.isInteger(rateLimitInfo.remaining)).toBe(true);
      expect(Number.isInteger(rateLimitInfo.limit)).toBe(true);
      expect(rateLimitInfo.remaining).toBeLessThanOrEqual(rateLimitInfo.limit);
    });
    
    test('should accept resetTime as string', () => {
      const rateLimitInfo: RateLimitInfo = {
        remaining: 0,
        resetTime: '2023-12-01T15:00:00.000Z',
        limit: 100
      };
      
      expect(typeof rateLimitInfo.resetTime).toBe('string');
      expect(rateLimitInfo.resetTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
  
  describe('RateLimitStatus Type Tests', () => {
    test('should accept valid RateLimitStatus with all categories', () => {
      const rateLimitStatus: RateLimitStatus = {
        general: {
          remaining: 100,
          resetTime: '2023-12-01T13:00:00.000Z',
          limit: 300
        },
        posting: {
          remaining: 50,
          resetTime: '2023-12-01T13:00:00.000Z',
          limit: 100
        },
        collection: {
          remaining: 200,
          resetTime: '2023-12-01T13:00:00.000Z',
          limit: 500
        },
        lastUpdated: '2023-12-01T12:30:00.000Z'
      };
      
      expect(rateLimitStatus.general.remaining).toBe(100);
      expect(rateLimitStatus.posting.remaining).toBe(50);
      expect(rateLimitStatus.collection.remaining).toBe(200);
      expect(rateLimitStatus.lastUpdated).toBe('2023-12-01T12:30:00.000Z');
    });
    
    test('should enforce RateLimitInfo structure for each category', () => {
      const rateLimitStatus: RateLimitStatus = {
        general: {
          remaining: 75,
          resetTime: '2023-12-01T14:00:00.000Z',
          limit: 300
        },
        posting: {
          remaining: 25,
          resetTime: '2023-12-01T14:00:00.000Z',
          limit: 50
        },
        collection: {
          remaining: 150,
          resetTime: '2023-12-01T14:00:00.000Z',
          limit: 200
        },
        lastUpdated: '2023-12-01T13:30:00.000Z'
      };
      
      // Check each category has RateLimitInfo structure
      ['general', 'posting', 'collection'].forEach(category => {
        const categoryInfo = rateLimitStatus[category as keyof Omit<RateLimitStatus, 'lastUpdated'>];
        expect(typeof categoryInfo.remaining).toBe('number');
        expect(typeof categoryInfo.resetTime).toBe('string');
        expect(typeof categoryInfo.limit).toBe('number');
      });
    });
  });
  
  describe('CostTrackingInfo Type Tests', () => {
    test('should accept valid CostTrackingInfo', () => {
      const costInfo: CostTrackingInfo = {
        tweetsProcessed: 250,
        estimatedCost: 12.50,
        resetDate: '2023-12-31T23:59:59.999Z',
        lastUpdated: '2023-12-01T12:00:00.000Z'
      };
      
      expect(costInfo.tweetsProcessed).toBe(250);
      expect(costInfo.estimatedCost).toBe(12.50);
      expect(costInfo.resetDate).toBe('2023-12-31T23:59:59.999Z');
      expect(costInfo.lastUpdated).toBe('2023-12-01T12:00:00.000Z');
    });
    
    test('should enforce number types for counts and costs', () => {
      const costInfo: CostTrackingInfo = {
        tweetsProcessed: 1000,
        estimatedCost: 45.75,
        resetDate: '2024-01-01T00:00:00.000Z',
        lastUpdated: '2023-12-01T15:30:00.000Z'
      };
      
      expect(typeof costInfo.tweetsProcessed).toBe('number');
      expect(typeof costInfo.estimatedCost).toBe('number');
      expect(Number.isInteger(costInfo.tweetsProcessed)).toBe(true);
      expect(costInfo.estimatedCost).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('QuoteTweetResult Type Tests', () => {
    test('should accept successful QuoteTweetResult', () => {
      const quoteResult: QuoteTweetResult = {
        id: 'quote_tweet_123',
        originalTweetId: 'original_456',
        comment: 'This is an insightful analysis of market trends',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true
      };
      
      expect(quoteResult.id).toBe('quote_tweet_123');
      expect(quoteResult.originalTweetId).toBe('original_456');
      expect(quoteResult.comment).toBe('This is an insightful analysis of market trends');
      expect(quoteResult.success).toBe(true);
      expect(quoteResult.error).toBeUndefined();
    });
    
    test('should accept failed QuoteTweetResult with error', () => {
      const failedQuote: QuoteTweetResult = {
        id: '',
        originalTweetId: 'original_789',
        comment: 'Failed quote attempt',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: false,
        error: 'Original tweet is protected'
      };
      
      expect(failedQuote.success).toBe(false);
      expect(failedQuote.error).toBe('Original tweet is protected');
    });
  });
  
  describe('PostResult Type Tests', () => {
    test('should accept successful PostResult', () => {
      const postResult: PostResult = {
        id: 'post_123',
        url: 'https://x.com/user/status/post_123',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true
      };
      
      expect(postResult.id).toBe('post_123');
      expect(postResult.url).toBe('https://x.com/user/status/post_123');
      expect(postResult.success).toBe(true);
      expect(postResult.error).toBeUndefined();
    });
    
    test('should accept failed PostResult with error', () => {
      const failedPost: PostResult = {
        id: '',
        url: '',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: false,
        error: 'Content violates community guidelines'
      };
      
      expect(failedPost.success).toBe(false);
      expect(failedPost.error).toBe('Content violates community guidelines');
    });
  });
  
  describe('CoreRetweetResult Type Tests', () => {
    test('should accept successful CoreRetweetResult', () => {
      const retweetResult: CoreRetweetResult = {
        id: 'retweet_123',
        originalTweetId: 'original_456',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true
      };
      
      expect(retweetResult.id).toBe('retweet_123');
      expect(retweetResult.originalTweetId).toBe('original_456');
      expect(retweetResult.success).toBe(true);
      expect(retweetResult.error).toBeUndefined();
    });
    
    test('should accept failed CoreRetweetResult', () => {
      const failedRetweet: CoreRetweetResult = {
        id: '',
        originalTweetId: 'original_789',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: false,
        error: 'You have already retweeted this tweet'
      };
      
      expect(failedRetweet.success).toBe(false);
      expect(failedRetweet.error).toBe('You have already retweeted this tweet');
    });
  });
  
  describe('LikeResult Type Tests', () => {
    test('should accept successful LikeResult', () => {
      const likeResult: LikeResult = {
        tweetId: 'tweet_to_like_123',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true
      };
      
      expect(likeResult.tweetId).toBe('tweet_to_like_123');
      expect(likeResult.success).toBe(true);
      expect(likeResult.error).toBeUndefined();
    });
    
    test('should accept failed LikeResult with error', () => {
      const failedLike: LikeResult = {
        tweetId: 'tweet_456',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: false,
        error: 'Tweet not found'
      };
      
      expect(failedLike.success).toBe(false);
      expect(failedLike.error).toBe('Tweet not found');
    });
  });
  
  describe('AccountInfo Type Tests', () => {
    test('should accept valid AccountInfo with all required fields', () => {
      const accountInfo: AccountInfo = {
        id: 'account_12345',
        username: 'trading_educator',
        displayName: 'Trading Educator',
        followersCount: 15000,
        followingCount: 750,
        tweetsCount: 3500,
        verified: true,
        createdAt: '2019-01-01T00:00:00.000Z',
        description: 'Professional trading education and market analysis',
        location: 'New York, NY',
        website: 'https://trading-education.com',
        profileImageUrl: 'https://example.com/profile.jpg',
        bannerImageUrl: 'https://example.com/banner.jpg',
        timestamp: '2023-12-01T12:00:00.000Z'
      };
      
      expect(accountInfo.id).toBe('account_12345');
      expect(accountInfo.username).toBe('trading_educator');
      expect(accountInfo.followersCount).toBe(15000);
      expect(accountInfo.verified).toBe(true);
      expect(accountInfo.timestamp).toBe('2023-12-01T12:00:00.000Z');
    });
    
    test('should enforce number types for count fields', () => {
      const accountInfo: AccountInfo = {
        id: 'account_456',
        username: 'test_account',
        displayName: 'Test Account',
        followersCount: 500,
        followingCount: 100,
        tweetsCount: 250,
        verified: false,
        createdAt: '2022-01-01T00:00:00.000Z',
        description: 'Test account description',
        location: 'Test Location',
        website: 'https://test.com',
        profileImageUrl: 'https://test.com/profile.jpg',
        bannerImageUrl: 'https://test.com/banner.jpg',
        timestamp: '2023-12-01T12:00:00.000Z'
      };
      
      expect(typeof accountInfo.followersCount).toBe('number');
      expect(typeof accountInfo.followingCount).toBe('number');
      expect(typeof accountInfo.tweetsCount).toBe('number');
      expect(Number.isInteger(accountInfo.followersCount)).toBe(true);
      expect(Number.isInteger(accountInfo.followingCount)).toBe(true);
      expect(Number.isInteger(accountInfo.tweetsCount)).toBe(true);
    });
  });
  
  describe('TrendData Type Tests', () => {
    test('should accept TrendData with tweetVolume as number', () => {
      const trendWithVolume: TrendData = {
        name: 'Trading Education',
        query: 'trading education',
        tweetVolume: 15000,
        rank: 5
      };
      
      expect(trendWithVolume.name).toBe('Trading Education');
      expect(trendWithVolume.query).toBe('trading education');
      expect(trendWithVolume.tweetVolume).toBe(15000);
      expect(trendWithVolume.rank).toBe(5);
      expect(typeof trendWithVolume.tweetVolume).toBe('number');
    });
    
    test('should accept TrendData with tweetVolume as null', () => {
      const trendWithoutVolume: TrendData = {
        name: 'Market Analysis',
        query: 'market analysis',
        tweetVolume: null,
        rank: 8
      };
      
      expect(trendWithoutVolume.name).toBe('Market Analysis');
      expect(trendWithoutVolume.tweetVolume).toBeNull();
      expect(trendWithoutVolume.rank).toBe(8);
    });
    
    test('should enforce rank as number', () => {
      const trend: TrendData = {
        name: 'Financial Literacy',
        query: 'financial literacy',
        tweetVolume: 5000,
        rank: 12
      };
      
      expect(typeof trend.rank).toBe('number');
      expect(Number.isInteger(trend.rank)).toBe(true);
      expect(trend.rank).toBeGreaterThan(0);
    });
  });
  
  describe('TrendLocation Type Tests', () => {
    test('should accept valid TrendLocation', () => {
      const location: TrendLocation = {
        woeid: 2459115,
        name: 'New York',
        countryCode: 'US'
      };
      
      expect(location.woeid).toBe(2459115);
      expect(location.name).toBe('New York');
      expect(location.countryCode).toBe('US');
    });
    
    test('should enforce number type for woeid', () => {
      const location: TrendLocation = {
        woeid: 1118370,
        name: 'Tokyo',
        countryCode: 'JP'
      };
      
      expect(typeof location.woeid).toBe('number');
      expect(Number.isInteger(location.woeid)).toBe(true);
    });
    
    test('should enforce string types for name and countryCode', () => {
      const location: TrendLocation = {
        woeid: 44418,
        name: 'London',
        countryCode: 'GB'
      };
      
      expect(typeof location.name).toBe('string');
      expect(typeof location.countryCode).toBe('string');
      expect(location.countryCode.length).toBe(2); // Country codes are typically 2 characters
    });
  });
});