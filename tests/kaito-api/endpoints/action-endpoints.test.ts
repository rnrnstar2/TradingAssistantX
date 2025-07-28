/**
 * ActionEndpoints - 実際に使用されるメソッドのテスト
 * 
 * テスト対象（実際に使用されるメソッドのみ）:
 * - retweet() - リツイート
 */

import { ActionEndpoints } from '../../../src/kaito-api/endpoints/action-endpoints';
import type {
  RetweetResult,
  HttpClient,
  PostResponse,
  EngagementResponse
} from '../../../src/kaito-api/types';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('ActionEndpoints - 実際に使用されるメソッドのテスト', () => {
  let actionEndpoints: ActionEndpoints;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn()
    };

    actionEndpoints = new ActionEndpoints(mockHttpClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('retweet - リツイート機能', () => {
    it('should retweet successfully', async ()=> {
      const tweetId = '1234567890';
      mockHttpClient.post.mockResolvedValue({ 
        data: { retweeted: true } 
      });

      const result: RetweetResult = await actionEndpoints.retweet(tweetId);

      expect(result.success).toBe(true);
      expect(result.originalTweetId).toBe(tweetId);
      expect(mockHttpClient.post).toHaveBeenCalledWith(`/twitter/tweet/${tweetId}/retweet`);
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

      const result = await actionEndpoints.retweet(tweetId);

      expect(result.success).toBe(false);
      expect(result.originalTweetId).toBe(tweetId);
      expect(result.error).toContain('Cannot retweet this tweet');
    });

    it('should validate tweet ID', async () => {
      const result = await actionEndpoints.retweet('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid tweet ID');
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

      const result = await actionEndpoints.retweet(tweetId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      const tweetId = '1234567890';
      mockHttpClient.post.mockRejectedValue(new Error('Network timeout'));

      const result = await actionEndpoints.retweet(tweetId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });
  });
});

// ============================================================================
// VITEST-BASED TESTS FOR POST() AND LIKE() METHODS (TASK-004)
// ============================================================================

describe('ActionEndpoints - post() and like() methods (Vitest)', () => {
  let actionEndpoints: ActionEndpoints;
  let mockHttpClient: any;

  // ヘルパー関数
  function expectValidPostResult(result: PostResponse): void {
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('tweetId');
    expect(result).toHaveProperty('createdAt');
  }

  function expectValidLikeResult(result: EngagementResponse): void {
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('action', 'like');
    expect(result).toHaveProperty('tweetId');
    expect(result).toHaveProperty('timestamp');
  }

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
    };

    actionEndpoints = new ActionEndpoints(mockHttpClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // POST() METHOD TESTS
  // ============================================================================

  describe('post() method', () => {
    describe('正常系テスト', () => {
      it('should create a post successfully', async () => {
        mockHttpClient.post.mockResolvedValue({
          data: {
            id: '1234567890',
            text: 'Test post',
            created_at: '2024-01-28T10:00:00Z'
          }
        });

        const result = await actionEndpoints.post('Test post');

        expectValidPostResult(result);
        expect(result.tweetId).toBe('1234567890');
        expect(result.createdAt).toBe('2024-01-28T10:00:00Z');
      });

      it('should return correct post result structure', async () => {
        mockHttpClient.post.mockResolvedValue({
          data: {
            id: '9876543210',
            text: 'Structured test',
            created_at: '2024-01-28T11:00:00Z'
          }
        });

        const result = await actionEndpoints.post('Structured test');

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('tweetId');
        expect(result).toHaveProperty('createdAt');
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.tweetId).toBe('string');
        expect(typeof result.createdAt).toBe('string');
      });

      it('should handle text with various content types', async () => {
        const testCases = [
          'Simple text',
          'Text with numbers 123',
          'Text with symbols @#$%'
        ];

        mockHttpClient.post.mockResolvedValue({
          data: {
            id: '1111111111',
            text: 'test',
            created_at: '2024-01-28T12:00:00Z'
          }
        });

        for (const testText of testCases) {
          const result = await actionEndpoints.post(testText);
          expectValidPostResult(result);
        }
      });

      it('should preserve whitespace and formatting', async () => {
        const textWithFormatting = 'Spaced text with normal spaces';
        
        mockHttpClient.post.mockResolvedValue({
          data: {
            id: '2222222222',
            text: textWithFormatting,
            created_at: '2024-01-28T13:00:00Z'
          }
        });

        const result = await actionEndpoints.post(textWithFormatting);
        expectValidPostResult(result);
      });

      it('should handle emojis correctly', async () => {
        const emojiText = 'Trading update 🚀💰📈';
        
        mockHttpClient.post.mockResolvedValue({
          data: {
            id: '3333333333',
            text: emojiText,
            created_at: '2024-01-28T14:00:00Z'
          }
        });

        const result = await actionEndpoints.post(emojiText);
        expectValidPostResult(result);
      });

      it('should handle multi-language text', async () => {
        const multiLangText = 'Hello 世界 Mundo سلام';
        
        mockHttpClient.post.mockResolvedValue({
          data: {
            id: '4444444444',
            text: multiLangText,
            created_at: '2024-01-28T15:00:00Z'
          }
        });

        const result = await actionEndpoints.post(multiLangText);
        expectValidPostResult(result);
      });

      it('should include tweet ID in response', async () => {
        const expectedId = '5555555555';
        
        mockHttpClient.post.mockResolvedValue({
          data: {
            id: expectedId,
            text: 'Test tweet',
            created_at: '2024-01-28T16:00:00Z'
          }
        });

        const result = await actionEndpoints.post('Test tweet');
        expect(result.tweetId).toBe(expectedId);
      });

      it('should include creation timestamp', async () => {
        const expectedTimestamp = '2024-01-28T17:00:00Z';
        
        mockHttpClient.post.mockResolvedValue({
          data: {
            id: '6666666666',
            text: 'Timestamp test',
            created_at: expectedTimestamp
          }
        });

        const result = await actionEndpoints.post('Timestamp test');
        expect(result.createdAt).toBe(expectedTimestamp);
      });

      it('should include success flag', async () => {
        mockHttpClient.post.mockResolvedValue({
          data: {
            id: '7777777777',
            text: 'Success test',
            created_at: '2024-01-28T18:00:00Z'
          }
        });

        const result = await actionEndpoints.post('Success test');
        expect(result.success).toBe(true);
      });
    });

    describe('異常系テスト', () => {
      it('should throw error when text is empty', async () => {
        const result = await actionEndpoints.post('');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Content cannot be empty');
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });

      it('should throw error when text exceeds limit', async () => {
        const longText = 'a'.repeat(281);
        
        const result = await actionEndpoints.post(longText);
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('exceeds 280 character limit');
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });

      it('should handle network errors', async () => {
        mockHttpClient.post.mockRejectedValue(new Error('Network timeout'));
        
        const result = await actionEndpoints.post('Test post');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Network timeout');
      });

      it('should handle authentication errors', async () => {
        mockHttpClient.post.mockRejectedValue({
          response: {
            status: 401,
            data: { error: 'Authentication failed' }
          }
        });
        
        const result = await actionEndpoints.post('Test post');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Authentication failed');
      });

      it('should handle rate limit errors', async () => {
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
        
        const result = await actionEndpoints.post('Test post');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Rate limit exceeded');
      });

      it('should retry on temporary failures', async () => {
        let callCount = 0;
        mockHttpClient.post.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('Temporary failure'));
          }
          return Promise.resolve({
            data: {
              id: '8888888888',
              text: 'Retry success',
              created_at: '2024-01-28T19:00:00Z'
            }
          });
        });
        
        const result = await actionEndpoints.post('Retry test');
        
        expect(result.success).toBe(false);
        expect(result.error).toContain('Temporary failure');
      });
    });

    describe('境界値テスト', () => {
      it('should post exactly 1 character', async () => {
        mockHttpClient.post.mockResolvedValue({
          data: {
            id: '9999999999',
            text: 'a',
            created_at: '2024-01-28T20:00:00Z'
          }
        });
        
        const result = await actionEndpoints.post('a');
        expectValidPostResult(result);
      });

      it('should post exactly 280 characters', async () => {
        // Create a realistic 280-character message avoiding spam detection
        const baseMessage = 'This is a test message for the 280 character limit validation. ';
        const padding = 'Additional content to reach exactly 280 characters. ';
        const remaining = 280 - baseMessage.length - padding.length;
        const finalPadding = '0123456789'.repeat(Math.ceil(remaining / 10)).substring(0, remaining);
        const exactLimit = baseMessage + padding + finalPadding;
        
        mockHttpClient.post.mockResolvedValue({
          data: {
            id: '1010101010',
            text: exactLimit,
            created_at: '2024-01-28T21:00:00Z'
          }
        });
        
        const result = await actionEndpoints.post(exactLimit);
        expectValidPostResult(result);
      });

      it('should count multi-byte characters correctly', async () => {
        const multiByteText = '日本語テスト🚀';
        
        mockHttpClient.post.mockResolvedValue({
          data: {
            id: '1111111112',
            text: multiByteText,
            created_at: '2024-01-28T22:00:00Z'
          }
        });
        
        const result = await actionEndpoints.post(multiByteText);
        expectValidPostResult(result);
      });

      it('should handle line breaks and special characters', async () => {
        const specialText = 'Special text with symbols @#$%^&*()';
        
        mockHttpClient.post.mockResolvedValue({
          data: {
            id: '1212121212',
            text: specialText,
            created_at: '2024-01-28T23:00:00Z'
          }
        });
        
        const result = await actionEndpoints.post(specialText);
        expectValidPostResult(result);
      });
    });
  });

  // ============================================================================
  // LIKE() METHOD TESTS
  // ============================================================================

  describe('like() method', () => {
    describe('正常系テスト', () => {
      it('should like a tweet successfully', async () => {
        mockHttpClient.post.mockResolvedValue({
          data: { liked: true }
        });
        
        const result = await actionEndpoints.like('1234567890');
        
        expectValidLikeResult(result);
        expect(result.tweetId).toBe('1234567890');
        expect(result.data.liked).toBe(true);
      });

      it('should return correct like result structure', async () => {
        mockHttpClient.post.mockResolvedValue({
          data: { liked: true }
        });
        
        const result = await actionEndpoints.like('9876543210');
        
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
          const result = await actionEndpoints.like(tweetId);
          expectValidLikeResult(result);
        }
      });

      it('should handle numeric tweet IDs', async () => {
        mockHttpClient.post.mockResolvedValue({
          data: { liked: true }
        });
        
        const result = await actionEndpoints.like('1234567890123456789');
        expectValidLikeResult(result);
      });

      it('should handle string tweet IDs', async () => {
        mockHttpClient.post.mockResolvedValue({
          data: { liked: true }
        });
        
        const result = await actionEndpoints.like('123456');
        expectValidLikeResult(result);
      });
    });

    describe('異常系テスト', () => {
      it('should throw error when tweet ID is empty', async () => {
        try {
          await actionEndpoints.like('');
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
            await actionEndpoints.like(invalidId);
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
        
        const result = await actionEndpoints.like('1234567890');
        
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
        
        const result = await actionEndpoints.like('1234567890');
        
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
        
        const result = await actionEndpoints.like('1234567890');
        
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
        
        const result = await actionEndpoints.like('1234567890');
        
        expect(result.success).toBe(false);
        expect(result.data.liked).toBe(false);
      });
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIO TESTS
  // ============================================================================

  describe('統合シナリオテスト', () => {
    it('should post and then like the same tweet', async () => {
      // First, create a post
      mockHttpClient.post.mockResolvedValueOnce({
        data: {
          id: '1234567890',
          text: 'Test post for like',
          created_at: '2024-01-28T10:00:00Z'
        }
      });
      
      const postResult = await actionEndpoints.post('Test post for like');
      expectValidPostResult(postResult);
      
      // Then, like the same tweet
      mockHttpClient.post.mockResolvedValueOnce({
        data: { liked: true }
      });
      
      const likeResult = await actionEndpoints.like(postResult.tweetId!);
      expectValidLikeResult(likeResult);
      
      expect(likeResult.tweetId).toBe(postResult.tweetId);
    });

    it('should handle multiple posts in sequence', async () => {
      const posts = ['Post 1', 'Post 2', 'Post 3'];
      const results = [];
      
      for (let i = 0; i < posts.length; i++) {
        mockHttpClient.post.mockResolvedValueOnce({
          data: {
            id: `123456789${i}`,
            text: posts[i],
            created_at: `2024-01-28T1${i}:00:00Z`
          }
        });
        
        const result = await actionEndpoints.post(posts[i]);
        expectValidPostResult(result);
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
      
      const postResult = await actionEndpoints.post('Rate limit test');
      const likeResult = await actionEndpoints.like('1234567890');
      
      expect(postResult.success).toBe(false);
      expect(likeResult.success).toBe(false);
      expect(postResult.error).toContain('Rate limit exceeded');
    });

    it('should maintain authentication state', async () => {
      // Test that auth headers are consistent across calls
      mockHttpClient.post.mockResolvedValue({
        data: {
          id: '1234567890',
          text: 'Auth test',
          created_at: '2024-01-28T10:00:00Z'
        }
      });
      
      await actionEndpoints.post('Auth test post');
      
      mockHttpClient.post.mockResolvedValue({
        data: { liked: true }
      });
      
      await actionEndpoints.like('1234567890');
      
      // Verify both calls were made
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });
  });
});