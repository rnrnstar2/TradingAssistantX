/**
 * KaitoAPI Action Types Unit Test
 * 
 * Action関連型定義の詳細テスト
 * - PostRequest, PostResponse, EngagementRequest, EngagementResponse
 * - EducationalTweetResult, ContentValidation, FrequencyCheck
 * - EducationalRetweetResult, EducationalLikeResult
 */

import { describe, test, expect } from 'vitest';
import type {
  PostRequest,
  PostResponse,
  EngagementRequest,
  EngagementResponse,
  EducationalTweetResult,
  ContentValidation,
  FrequencyCheck,
  EducationalRetweetResult,
  EducationalLikeResult
} from '../../src/kaito-api/types';

describe('Action Types Unit Tests', () => {
  
  describe('PostRequest Type Tests', () => {
    test('should accept minimal PostRequest with only content', () => {
      const minimalRequest: PostRequest = {
        content: 'This is a test post about trading education'
      };
      
      expect(minimalRequest.content).toBe('This is a test post about trading education');
      expect(minimalRequest.mediaIds).toBeUndefined();
      expect(minimalRequest.replyToId).toBeUndefined();
      expect(minimalRequest.quoteTweetId).toBeUndefined();
    });
    
    test('should accept PostRequest with all optional fields', () => {
      const fullRequest: PostRequest = {
        content: 'Educational post with media and reply',
        mediaIds: ['media_1', 'media_2'],
        replyToId: 'tweet_to_reply_to',
        quoteTweetId: 'tweet_to_quote'
      };
      
      expect(fullRequest.content).toBe('Educational post with media and reply');
      expect(fullRequest.mediaIds).toHaveLength(2);
      expect(fullRequest.replyToId).toBe('tweet_to_reply_to');
      expect(fullRequest.quoteTweetId).toBe('tweet_to_quote');
    });
    
    test('should enforce mediaIds as string array', () => {
      const request: PostRequest = {
        content: 'Post with media',
        mediaIds: ['media_123', 'media_456', 'media_789']
      };
      
      expect(Array.isArray(request.mediaIds)).toBe(true);
      expect(request.mediaIds?.every(id => typeof id === 'string')).toBe(true);
    });
  });
  
  describe('PostResponse Type Tests', () => {
    test('should accept successful PostResponse', () => {
      const successResponse: PostResponse = {
        success: true,
        tweetId: 'tweet_12345',
        createdAt: '2023-12-01T12:00:00.000Z'
      };
      
      expect(successResponse.success).toBe(true);
      expect(successResponse.tweetId).toBe('tweet_12345');
      expect(successResponse.createdAt).toBe('2023-12-01T12:00:00.000Z');
      expect(successResponse.error).toBeUndefined();
    });
    
    test('should accept failed PostResponse with error', () => {
      const errorResponse: PostResponse = {
        success: false,
        error: 'Rate limit exceeded'
      };
      
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBe('Rate limit exceeded');
      expect(errorResponse.tweetId).toBeUndefined();
      expect(errorResponse.createdAt).toBeUndefined();
    });
    
    test('should enforce success field as boolean', () => {
      const response: PostResponse = {
        success: true
      };
      
      expect(typeof response.success).toBe('boolean');
    });
  });
  
  describe('EngagementRequest Type Tests', () => {
    test('should accept valid EngagementRequest with like action', () => {
      const likeRequest: EngagementRequest = {
        tweetId: 'target_tweet_123',
        action: 'like'
      };
      
      expect(likeRequest.tweetId).toBe('target_tweet_123');
      expect(likeRequest.action).toBe('like');
    });
    
    test('should enforce action union type correctly', () => {
      const actions: Array<'like' | 'unlike' | 'retweet' | 'unretweet'> = [
        'like', 'unlike', 'retweet', 'unretweet'
      ];
      
      actions.forEach(action => {
        const request: EngagementRequest = {
          tweetId: 'tweet_123',
          action
        };
        
        expect(request.action).toBe(action);
      });
    });
    
    test('should require both tweetId and action fields', () => {
      const request: EngagementRequest = {
        tweetId: 'required_tweet_id',
        action: 'retweet'
      };
      
      expect(request.tweetId).toBeDefined();
      expect(request.action).toBeDefined();
      expect(typeof request.tweetId).toBe('string');
    });
  });
  
  describe('EngagementResponse Type Tests', () => {
    test('should accept successful EngagementResponse', () => {
      const successResponse: EngagementResponse = {
        success: true,
        action: 'like',
        tweetId: 'tweet_123',
        timestamp: '2023-12-01T12:00:00.000Z'
      };
      
      expect(successResponse.success).toBe(true);
      expect(successResponse.action).toBe('like');
      expect(successResponse.tweetId).toBe('tweet_123');
      expect(successResponse.timestamp).toBe('2023-12-01T12:00:00.000Z');
    });
    
    test('should accept failed EngagementResponse', () => {
      const failedResponse: EngagementResponse = {
        success: false,
        action: 'retweet',
        tweetId: 'tweet_456',
        timestamp: '2023-12-01T12:00:00.000Z'
      };
      
      expect(failedResponse.success).toBe(false);
      expect(failedResponse.action).toBe('retweet');
    });
    
    test('should require all fields', () => {
      const response: EngagementResponse = {
        success: true,
        action: 'unlike',
        tweetId: 'tweet_789',
        timestamp: '2023-12-01T12:00:00.000Z'
      };
      
      // All fields should be defined
      expect(response.success).toBeDefined();
      expect(response.action).toBeDefined();
      expect(response.tweetId).toBeDefined();
      expect(response.timestamp).toBeDefined();
    });
  });
  
  describe('EducationalTweetResult Type Tests', () => {
    test('should accept successful EducationalTweetResult', () => {
      const result: EducationalTweetResult = {
        id: 'educational_tweet_123',
        content: 'Learn about risk management in trading',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true,
        educationalValue: 0.85,
        qualityScore: 0.9
      };
      
      expect(result.id).toBe('educational_tweet_123');
      expect(result.content).toBe('Learn about risk management in trading');
      expect(result.success).toBe(true);
      expect(result.educationalValue).toBe(0.85);
      expect(result.qualityScore).toBe(0.9);
      expect(result.error).toBeUndefined();
    });
    
    test('should accept failed EducationalTweetResult with error', () => {
      const failedResult: EducationalTweetResult = {
        id: '',
        content: 'Failed educational content',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: false,
        educationalValue: 0.2,
        qualityScore: 0.3,
        error: 'Content did not meet educational standards'
      };
      
      expect(failedResult.success).toBe(false);
      expect(failedResult.educationalValue).toBe(0.2);
      expect(failedResult.qualityScore).toBe(0.3);
      expect(failedResult.error).toBe('Content did not meet educational standards');
    });
    
    test('should enforce number types for scores', () => {
      const result: EducationalTweetResult = {
        id: 'test_123',
        content: 'Test content',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true,
        educationalValue: 0.75,
        qualityScore: 0.8
      };
      
      expect(typeof result.educationalValue).toBe('number');
      expect(typeof result.qualityScore).toBe('number');
      expect(result.educationalValue).toBeGreaterThanOrEqual(0);
      expect(result.educationalValue).toBeLessThanOrEqual(1);
    });
  });
  
  describe('ContentValidation Type Tests', () => {
    test('should accept valid ContentValidation result', () => {
      const validation: ContentValidation = {
        isEducational: true,
        hasValue: true,
        isAppropriate: true,
        qualityScore: 0.88,
        topics: ['trading', 'risk-management', 'education'],
        reasons: ['Contains educational content', 'Appropriate language', 'Relevant topics']
      };
      
      expect(validation.isEducational).toBe(true);
      expect(validation.hasValue).toBe(true);
      expect(validation.isAppropriate).toBe(true);
      expect(validation.qualityScore).toBe(0.88);
      expect(validation.topics).toHaveLength(3);
      expect(validation.reasons).toHaveLength(3);
    });
    
    test('should accept ContentValidation with failed checks', () => {
      const failedValidation: ContentValidation = {
        isEducational: false,
        hasValue: false,
        isAppropriate: true,
        qualityScore: 0.2,
        topics: ['spam'],
        reasons: ['Not educational', 'Low quality content', 'Irrelevant topic']
      };
      
      expect(failedValidation.isEducational).toBe(false);
      expect(failedValidation.hasValue).toBe(false);
      expect(failedValidation.qualityScore).toBe(0.2);
      expect(failedValidation.topics).toContain('spam');
    });
    
    test('should enforce boolean types for validation flags', () => {
      const validation: ContentValidation = {
        isEducational: true,
        hasValue: false,
        isAppropriate: true,
        qualityScore: 0.5,
        topics: ['test'],
        reasons: ['test reason']
      };
      
      expect(typeof validation.isEducational).toBe('boolean');
      expect(typeof validation.hasValue).toBe('boolean');
      expect(typeof validation.isAppropriate).toBe('boolean');
    });
  });
  
  describe('FrequencyCheck Type Tests', () => {
    test('should accept FrequencyCheck when posting is allowed', () => {
      const allowedCheck: FrequencyCheck = {
        canPost: true,
        lastPostTime: Date.now() - 3600000, // 1 hour ago
        nextAllowedTime: Date.now() - 1800000, // 30 minutes ago
        waitTimeMs: 0
      };
      
      expect(allowedCheck.canPost).toBe(true);
      expect(allowedCheck.waitTimeMs).toBe(0);
      expect(typeof allowedCheck.lastPostTime).toBe('number');
      expect(typeof allowedCheck.nextAllowedTime).toBe('number');
    });
    
    test('should accept FrequencyCheck when posting is not allowed', () => {
      const blockedCheck: FrequencyCheck = {
        canPost: false,
        lastPostTime: Date.now() - 600000, // 10 minutes ago
        nextAllowedTime: Date.now() + 1200000, // 20 minutes from now
        waitTimeMs: 1200000
      };
      
      expect(blockedCheck.canPost).toBe(false);
      expect(blockedCheck.waitTimeMs).toBe(1200000);
      expect(blockedCheck.waitTimeMs).toBeGreaterThan(0);
    });
    
    test('should enforce number types for time fields', () => {
      const check: FrequencyCheck = {
        canPost: true,
        lastPostTime: 1700000000000,
        nextAllowedTime: 1700001800000,
        waitTimeMs: 0
      };
      
      expect(typeof check.lastPostTime).toBe('number');
      expect(typeof check.nextAllowedTime).toBe('number');
      expect(typeof check.waitTimeMs).toBe('number');
      expect(Number.isInteger(check.lastPostTime)).toBe(true);
      expect(Number.isInteger(check.waitTimeMs)).toBe(true);
    });
  });
  
  describe('EducationalRetweetResult Type Tests', () => {
    test('should accept successful EducationalRetweetResult', () => {
      const result: EducationalRetweetResult = {
        id: 'retweet_123',
        originalTweetId: 'original_456',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true,
        educationalReason: 'Contains valuable trading insights'
      };
      
      expect(result.id).toBe('retweet_123');
      expect(result.originalTweetId).toBe('original_456');
      expect(result.success).toBe(true);
      expect(result.educationalReason).toBe('Contains valuable trading insights');
      expect(result.error).toBeUndefined();
    });
    
    test('should accept failed EducationalRetweetResult with error', () => {
      const failedResult: EducationalRetweetResult = {
        id: '',
        originalTweetId: 'original_789',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: false,
        educationalReason: '',
        error: 'Original tweet not found'
      };
      
      expect(failedResult.success).toBe(false);
      expect(failedResult.error).toBe('Original tweet not found');
    });
  });
  
  describe('EducationalLikeResult Type Tests', () => {
    test('should accept successful EducationalLikeResult', () => {
      const result: EducationalLikeResult = {
        tweetId: 'tweet_to_like_123',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true,
        educationalJustification: 'Tweet promotes financial literacy'
      };
      
      expect(result.tweetId).toBe('tweet_to_like_123');
      expect(result.success).toBe(true);
      expect(result.educationalJustification).toBe('Tweet promotes financial literacy');
      expect(result.error).toBeUndefined();
    });
    
    test('should accept failed EducationalLikeResult with error', () => {
      const failedResult: EducationalLikeResult = {
        tweetId: 'tweet_456',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: false,
        educationalJustification: '',
        error: 'Tweet does not meet educational criteria'
      };
      
      expect(failedResult.success).toBe(false);
      expect(failedResult.error).toBe('Tweet does not meet educational criteria');
    });
    
    test('should require tweetId field', () => {
      const result: EducationalLikeResult = {
        tweetId: 'required_tweet_id',
        timestamp: '2023-12-01T12:00:00.000Z',
        success: true,
        educationalJustification: 'Educational content'
      };
      
      expect(result.tweetId).toBeDefined();
      expect(typeof result.tweetId).toBe('string');
      expect(result.tweetId.length).toBeGreaterThan(0);
    });
  });
});