/**
 * EngagementManagement - 認証必須エンゲージメント機能テスト
 * 
 * テスト対象（実際に使用されるメソッドのみ）:
 * - retweetTweet() - リツイート
 * - likeTweet() - いいね
 * - quoteTweet() - 引用ツイート
 */

import { EngagementManagement } from '../../../src/kaito-api/endpoints/authenticated/engagement';
import type {
  HttpClient,
  EngagementResponse
} from '../../../src/kaito-api/utils/types';
import { AuthManager } from '../../../src/kaito-api/core/auth-manager';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('EngagementManagement - 認証必須エンゲージメント機能テスト', () => {
  let engagementManagement: EngagementManagement;
  let mockHttpClient: jest.Mocked<HttpClient>;
  let mockAuthManager: jest.Mocked<AuthManager>;

  beforeEach(() => {
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn()
    };

    mockAuthManager = {
      getUserSession: jest.fn().mockReturnValue('valid_session_cookie'),
      getAuthStatus: jest.fn().mockReturnValue({ userSessionValid: true, apiKeyValid: true }),
      login: jest.fn().mockResolvedValue({ success: true, login_cookie: 'valid_session_cookie' })
    } as any;

    engagementManagement = new EngagementManagement(mockHttpClient, mockAuthManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('retweetTweet - リツイート機能', () => {
    it('should retweet successfully', async ()=> {
      const tweetId = '1234567890';
      mockHttpClient.post.mockResolvedValue({ 
        data: { retweeted: true } 
      });

      const result: EngagementResponse = await engagementManagement.retweetTweet(tweetId);

      expect(result.success).toBe(true);
      expect(result.tweet_id).toBe(tweetId);
      expect(result.action).toBe('retweet');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/twitter/retweet_tweet_v2', {
        tweet_id: tweetId,
        login_cookie: 'valid_session_cookie'
      });
    });

    it('should handle retweet permission error', async () => {
      const tweetId = '1234567890';
      mockHttpClient.post.mockRejectedValue({
        response: { 
          status: 403,
          statusText: 'Forbidden',
          data: { error: 'Cannot retweet this tweet' }
        }
      });

      const result = await engagementManagement.retweetTweet(tweetId);

      expect(result.success).toBe(false);
      expect(result.tweet_id).toBe(tweetId);
      expect(result.action).toBe('retweet');
      expect(result.error?.message).toContain('Action forbidden');
    });

    it('should validate tweet ID', async () => {
      const result = await engagementManagement.retweetTweet('');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Tweet ID is required');
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('should handle rate limit errors', async () => {
      const tweetId = '1234567890';
      mockHttpClient.post.mockRejectedValue({
        response: { 
          status: 429,
          statusText: 'Too Many Requests',
          data: { error: 'Rate limit exceeded' }
        }
      });

      const result = await engagementManagement.retweetTweet(tweetId);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      const tweetId = '1234567890';
      mockHttpClient.post.mockRejectedValue(new Error('Network timeout'));

      const result = await engagementManagement.retweetTweet(tweetId);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Network timeout');
    });
  });
});

// ============================================================================
// VITEST-BASED TESTS FOR LIKE() METHOD (TASK-004)
// ============================================================================

describe('EngagementManagement - likeTweet() method (Vitest)', () => {
  let engagementManagement: EngagementManagement;
  let mockHttpClient: any;
  let mockAuthManager: any;

  // ヘルパー関数
  function expectValidLikeResult(result: EngagementResponse): void {
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('action', 'like');
    expect(result).toHaveProperty('tweet_id');
    expect(result).toHaveProperty('timestamp');
  }

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
    };

    mockAuthManager = {
      getUserSession: vi.fn().mockReturnValue('valid_session_cookie'),
      getAuthStatus: vi.fn().mockReturnValue({ userSessionValid: true, apiKeyValid: true }),
      login: vi.fn().mockResolvedValue({ success: true, login_cookie: 'valid_session_cookie' })
    };

    engagementManagement = new EngagementManagement(mockHttpClient, mockAuthManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // LIKETWEET() METHOD TESTS
  // ============================================================================



















  // ============================================================================
  // LIKE() METHOD TESTS
  // ============================================================================

  describe('like() method', () => {
    describe('正常系テスト', () => {
      it('should like a tweet successfully', async () => {
        mockHttpClient.post.mockResolvedValue({
          data: { liked: true }
        });
        
        const result = await engagementManagement.likeTweet('1234567890');
        
        expectValidLikeResult(result);
        expect(result.tweetId).toBe('1234567890');
        expect(result.data.liked).toBe(true);
      });

      it('should return correct like result structure', async () => {
        mockHttpClient.post.mockResolvedValue({
          data: { liked: true }
        });
        
        const result = await engagementManagement.likeTweet('9876543210');
        
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('action');
        expect(result).toHaveProperty('tweetId');
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('data');
        
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.action).toBe('string');
        expect(typeof result.tweetId).toBe('string');
        expect(typeof result.timestamp).toBe('string');
        expect(typeof result.data).toBe('object');
      });

      it('should validate tweet ID format', async () => {
        mockHttpClient.post.mockResolvedValue({
          data: { liked: true }
        });
        
        const validIds = ['1234567890', '999999999999999999', '1'];
        
        for (const tweetId of validIds) {
          const result = await engagementManagement.likeTweet(tweetId);
          expectValidLikeResult(result);
        }
      });

      it('should handle numeric tweet IDs', async () => {
        mockHttpClient.post.mockResolvedValue({
          data: { liked: true }
        });
        
        const result = await engagementManagement.likeTweet('1234567890123456789');
        expectValidLikeResult(result);
      });

      it('should handle string tweet IDs', async () => {
        mockHttpClient.post.mockResolvedValue({
          data: { liked: true }
        });
        
        const result = await engagementManagement.likeTweet('123456');
        expectValidLikeResult(result);
      });
    });

    describe('異常系テスト', () => {
      it('should throw error when tweet ID is empty', async () => {
        try {
          await engagementManagement.likeTweet('');
          // Should not reach here
          expect(true).toBe(false);
        } catch (error: any) {
          expect(error.message).toContain('Tweet ID is required');
          expect(mockHttpClient.post).not.toHaveBeenCalled();
        }
      });

      it('should throw error for invalid tweet ID format', async () => {
        const invalidIds = ['abc123', '12345abc', 'not-a-tweet-id', '12345678901234567890'];
        
        for (const invalidId of invalidIds) {
          try {
            await engagementManagement.likeTweet(invalidId);
            // Should not reach here
            expect(true).toBe(false);
          } catch (error: any) {
            expect(error.message).toContain('Invalid tweet ID format');
          }
        }
      });

      it('should handle tweet not found error', async () => {
        mockHttpClient.post.mockRejectedValue({
          response: {
            status: 404,
            data: { error: 'Tweet not found' }
          }
        });
        
        const result = await engagementManagement.likeTweet('1234567890');
        
        expect(result.success).toBe(false);
        expect(result.data.liked).toBe(false);
      });

      it('should handle already liked error gracefully', async () => {
        mockHttpClient.post.mockRejectedValue({
          response: {
            status: 409,
            data: { error: 'You have already liked this Tweet' }
          }
        });
        
        const result = await engagementManagement.likeTweet('1234567890');
        
        expect(result.success).toBe(false);
        expect(result.data.liked).toBe(false);
      });

      it('should handle permission denied error', async () => {
        mockHttpClient.post.mockRejectedValue({
          response: {
            status: 403,
            data: { error: 'Permission denied' }
          }
        });
        
        const result = await engagementManagement.likeTweet('1234567890');
        
        expect(result.success).toBe(false);
        expect(result.data.liked).toBe(false);
      });

      it('should handle rate limit for likes', async () => {
        mockHttpClient.post.mockRejectedValue({
          response: {
            status: 429,
            headers: {
              'x-rate-limit-remaining': '0',
              'x-rate-limit-reset': '1234567890'
            },
            data: { error: 'Rate limit exceeded' }
          }
        });
        
        const result = await engagementManagement.likeTweet('1234567890');
        
        expect(result.success).toBe(false);
        expect(result.data.liked).toBe(false);
      });
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIO TESTS
  // ============================================================================

  describe('統合シナリオテスト', () => {
    it('should like a specific tweet', async () => {
      // Test liking a specific tweet ID
      mockHttpClient.post.mockResolvedValue({
        data: { liked: true }
      });
      
      const likeResult = await engagementManagement.likeTweet('1234567890');
      expectValidLikeResult(likeResult);
      
      expect(likeResult.tweetId).toBe('1234567890');
    });

    it('should handle multiple likes in sequence', async () => {
      const tweetIds = ['1234567890', '1234567891', '1234567892'];
      const results = [];
      
      for (let i = 0; i < tweetIds.length; i++) {
        mockHttpClient.post.mockResolvedValueOnce({
          data: { liked: true }
        });
        
        const result = await engagementManagement.likeTweet(tweetIds[i]);
        expectValidLikeResult(result);
        results.push(result);
      }
      
      expect(results).toHaveLength(3);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(3);
    });

    it('should respect rate limits across operations', async () => {
      // This test simulates rate limit behavior
      mockHttpClient.post.mockRejectedValue({
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' }
        }
      });
      
      const likeResult = await engagementManagement.likeTweet('1234567890');
      
      expect(likeResult.success).toBe(false);
      expect(likeResult.error).toContain('Rate limit exceeded');
    });

    it('should maintain authentication state', async () => {
      // Test that auth headers are consistent across calls
      mockHttpClient.post.mockResolvedValue({
        data: { liked: true }
      });
      
      await engagementManagement.likeTweet('1234567890');
      await engagementManagement.likeTweet('1234567891');
      
      // Verify both calls were made with login_cookie
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ login_cookie: 'valid_session_cookie' })
      );
    });
  });

  // ============================================================================
  // QUOTE TWEET TESTS
  // ============================================================================

  describe('quoteTweet() method', () => {
    it('should create quote tweet successfully', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: {
          id: '1234567890',
          text: 'Quote comment',
          created_at: '2024-01-28T10:00:00Z'
        }
      });
      
      const result = await engagementManagement.quoteTweet({
        tweet_id: '9876543210',
        quoteText: 'Quote comment'
      });
      
      expect(result.success).toBe(true);
      expect(result.quoteTweetId).toBe('1234567890');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/twitter/create_tweet_v2', {
        text: 'Quote comment https://twitter.com/i/status/9876543210',
        login_cookie: 'valid_session_cookie'
      });
    });

    it('should handle quote tweet validation errors', async () => {
      const result = await engagementManagement.quoteTweet({
        tweet_id: '',
        quoteText: 'Quote comment'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Tweet ID is required');
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });
  });
});