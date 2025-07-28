/**
 * ActionEndpoints - TwitterAPI.io統合テストスイート
 * 指示書 TASK-004 準拠: 包括的テスト環境構築
 * 
 * テスト対象:
 * - 投稿作成・バリデーション
 * - エンゲージメント操作（いいね、リツイート、引用ツイート）
 * - TwitterAPI.io固有エラーハンドリング
 * - 境界値・エッジケーステスト
 */

import { ActionEndpoints } from '../../../src/kaito-api/endpoints/action-endpoints';
import type {
  PostRequest,
  PostResponse,
  EngagementRequest,
  EngagementResponse,
  HttpClient
} from '../../../src/kaito-api/types';

describe('ActionEndpoints - TwitterAPI.io統合テスト', () => {
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

  describe('createPost - 投稿作成機能', () => {
    it('should create post successfully with TwitterAPI.io response format', async () => {
      const mockTwitterAPIResponse = {
        data: {
          id: '1234567890',
          text: 'Test tweet content',
          created_at: '2023-01-01T00:00:00.000Z',
          author_id: '123456789',
          public_metrics: {
            retweet_count: 0,
            like_count: 0,
            quote_count: 0,
            reply_count: 0,
            impression_count: 0
          }
        }
      };

      mockHttpClient.post.mockResolvedValue(mockTwitterAPIResponse);

      const result = await actionEndpoints.createPost({
        content: 'Test tweet content'
      });

      expect(result.success).toBe(true);
      expect(result.tweetId).toBe('1234567890');
      expect(result.createdAt).toBe('2023-01-01T00:00:00.000Z');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/twitter/tweet/create', {
        text: 'Test tweet content'
      });
    });

    it('should handle post with media and reply options', async () => {
      const mockResponse = {
        data: {
          id: '1234567890',
          text: 'Hello with media',
          created_at: '2023-01-01T00:00:00.000Z'
        }
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const options = {
        content: 'Hello with media',
        mediaIds: ['media1', 'media2'],
        inReplyTo: 'tweet123'
      };

      await actionEndpoints.createPost(options);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/twitter/tweet/create', {
        text: 'Hello with media',
        media: { media_ids: ['media1', 'media2'] },
        in_reply_to_tweet_id: 'tweet123'
      });
    });

    describe('投稿バリデーション', () => {
      it('should reject empty content', async () => {
        const result = await actionEndpoints.createPost({
          content: ''
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Content cannot be empty');
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });

      it('should reject content exceeding 280 characters', async () => {
        const longContent = 'a'.repeat(281);

        const result = await actionEndpoints.createPost({
          content: longContent
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('exceeds 280 character limit');
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });

      it('should reject Korean characters', async () => {
        const result = await actionEndpoints.createPost({
          content: 'Test tweet with 한국어'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('prohibited characters');
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });

      it('should reject more than 4 media items', async () => {
        const result = await actionEndpoints.createPost({
          content: 'Test tweet',
          mediaIds: ['1', '2', '3', '4', '5']
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Maximum 4 media items allowed');
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });

      it('should accept content at character limit (280 chars)', async () => {
        const exactLimitContent = 'a'.repeat(280);
        
        mockHttpClient.post.mockResolvedValue({
          data: { id: '123', text: exactLimitContent, created_at: '2023-01-01T00:00:00.000Z' }
        });

        const result = await actionEndpoints.createPost({
          content: exactLimitContent
        });

        expect(result.success).toBe(true);
        expect(mockHttpClient.post).toHaveBeenCalled();
      });

      it('should handle special characters correctly', async () => {
        const specialContent = 'Test with emojis 🚀💰📈 and symbols @#$%^&*()';
        
        mockHttpClient.post.mockResolvedValue({
          data: { id: '123', text: specialContent, created_at: '2023-01-01T00:00:00.000Z' }
        });

        const result = await actionEndpoints.createPost({
          content: specialContent
        });

        expect(result.success).toBe(true);
        expect(mockHttpClient.post).toHaveBeenCalledWith('/twitter/tweet/create', {
          text: specialContent
        });
      });
    });

    describe('TwitterAPI.io エラー処理', () => {
      it('should handle API error responses', async () => {
        mockHttpClient.post.mockRejectedValue({
          response: { 
            status: 400, 
            statusText: 'Bad Request',
            data: { error: 'Invalid tweet content' }
          }
        });

        const result = await actionEndpoints.createPost({
          content: 'Valid content'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('API error');
      });

      it('should handle rate limit errors (429)', async () => {
        mockHttpClient.post.mockRejectedValue({
          response: { 
            status: 429,
            statusText: 'Too Many Requests',
            data: { error: 'Rate limit exceeded' }
          }
        });

        const result = await actionEndpoints.createPost({
          content: 'Test content'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Rate limit exceeded');
      });

      it('should handle authentication errors (401)', async () => {
        mockHttpClient.post.mockRejectedValue({
          response: { 
            status: 401,
            statusText: 'Unauthorized',
            data: { error: 'Authentication failed' }
          }
        });

        const result = await actionEndpoints.createPost({
          content: 'Test content'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Authentication failed');
      });

      it('should handle network timeouts', async () => {
        mockHttpClient.post.mockRejectedValue(new Error('Network timeout'));

        const result = await actionEndpoints.createPost({
          content: 'Test content'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Network timeout');
      });
    });
  });

  describe('performEngagement - エンゲージメント操作', () => {
    describe('いいね操作', () => {
      it('should like tweet successfully', async () => {
        mockHttpClient.post.mockResolvedValue({ 
          data: { liked: true } 
        });

        const result = await actionEndpoints.performEngagement({
          tweetId: '1234567890',
          action: 'like'
        });

        expect(result.success).toBe(true);
        expect(result.action).toBe('like');
        expect(result.tweetId).toBe('1234567890');
        expect(result.data.liked).toBe(true);
        expect(mockHttpClient.post).toHaveBeenCalledWith('/twitter/tweet/1234567890/like');
      });

      it('should handle like failure', async () => {
        mockHttpClient.post.mockRejectedValue({
          response: { 
            status: 404,
            statusText: 'Not Found',
            data: { error: 'Tweet not found' }
          }
        });

        const result = await actionEndpoints.performEngagement({
          tweetId: '1234567890',
          action: 'like'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Tweet not found');
      });
    });

    describe('リツイート操作', () => {
      it('should retweet successfully', async () => {
        mockHttpClient.post.mockResolvedValue({ 
          data: { retweeted: true } 
        });

        const result = await actionEndpoints.performEngagement({
          tweetId: '1234567890',
          action: 'retweet'
        });

        expect(result.success).toBe(true);
        expect(result.action).toBe('retweet');
        expect(result.data.retweeted).toBe(true);
        expect(mockHttpClient.post).toHaveBeenCalledWith('/twitter/tweet/1234567890/retweet');
      });

      it('should handle retweet permission error', async () => {
        mockHttpClient.post.mockRejectedValue({
          response: { 
            status: 403,
            statusText: 'Forbidden',
            data: { error: 'Cannot retweet this tweet' }
          }
        });

        const result = await actionEndpoints.performEngagement({
          tweetId: '1234567890',
          action: 'retweet'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Cannot retweet this tweet');
      });
    });

    describe('引用ツイート操作', () => {
      it('should quote tweet successfully', async () => {
        const mockResponse = {
          data: {
            id: '9876543210',
            text: 'Great insight!',
            created_at: '2023-01-01T00:00:00.000Z'
          }
        };

        mockHttpClient.post.mockResolvedValue(mockResponse);

        const result = await actionEndpoints.performEngagement({
          tweetId: '1234567890',
          action: 'quote',
          comment: 'Great insight!'
        });

        expect(result.success).toBe(true);
        expect(result.action).toBe('quote');
        expect(mockHttpClient.post).toHaveBeenCalledWith('/twitter/tweet/create', {
          text: 'Great insight!',
          quote_tweet_id: '1234567890'
        });
      });

      it('should validate quote tweet comment', async () => {
        const result = await actionEndpoints.performEngagement({
          tweetId: '1234567890',
          action: 'quote',
          comment: ''
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Quote comment cannot be empty');
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });
    });

    describe('無効なアクション', () => {
      it('should reject unsupported actions', async () => {
        await expect(
          actionEndpoints.performEngagement({
            tweetId: '1234567890',
            action: 'bookmark' as any
          })
        ).rejects.toThrow('Unsupported action: bookmark');
      });

      it('should validate tweet ID format', async () => {
        const result = await actionEndpoints.performEngagement({
          tweetId: '',
          action: 'like'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid tweet ID');
      });
    });
  });

  describe('パフォーマンステスト', () => {
    it('should handle concurrent post requests efficiently', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: { id: '123', text: 'test', created_at: '2023-01-01T00:00:00.000Z' }
      });

      const startTime = Date.now();
      const concurrentPosts = Array(5).fill(null).map((_, i) => 
        actionEndpoints.createPost({ content: `Post ${i}` })
      );

      await Promise.all(concurrentPosts);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // 1秒以内
      expect(mockHttpClient.post).toHaveBeenCalledTimes(5);
    });

    it('should handle rapid engagement requests', async () => {
      mockHttpClient.post.mockResolvedValue({ data: { liked: true } });

      const startTime = Date.now();
      const rapidLikes = Array(10).fill(null).map((_, i) => 
        actionEndpoints.performEngagement({
          tweetId: `tweet${i}`,
          action: 'like'
        })
      );

      await Promise.all(rapidLikes);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // 2秒以内
      expect(mockHttpClient.post).toHaveBeenCalledTimes(10);
    });
  });

  describe('境界値テスト', () => {
    it('should handle exactly 280 character tweets', async () => {
      const exactContent = 'a'.repeat(280);
      
      mockHttpClient.post.mockResolvedValue({
        data: { id: '123', text: exactContent, created_at: '2023-01-01T00:00:00.000Z' }
      });

      const result = await actionEndpoints.createPost({ content: exactContent });
      expect(result.success).toBe(true);
    });

    it('should handle exactly 4 media items', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: { id: '123', text: 'test', created_at: '2023-01-01T00:00:00.000Z' }
      });

      const result = await actionEndpoints.createPost({
        content: 'Test with media',
        mediaIds: ['1', '2', '3', '4']
      });

      expect(result.success).toBe(true);
    });

    it('should handle Unicode edge cases', async () => {
      const unicodeContent = '🚀💰📈💹📊🎯⚡️🔥💎🌟';
      
      mockHttpClient.post.mockResolvedValue({
        data: { id: '123', text: unicodeContent, created_at: '2023-01-01T00:00:00.000Z' }
      });

      const result = await actionEndpoints.createPost({ content: unicodeContent });
      expect(result.success).toBe(true);
    });
  });

  describe('エラー回復テスト', () => {
    it('should retry on temporary network failures', async () => {
      let callCount = 0;
      mockHttpClient.post.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Temporary network error'));
        }
        return Promise.resolve({
          data: { id: '123', text: 'test', created_at: '2023-01-01T00:00:00.000Z' }
        });
      });

      const result = await actionEndpoints.createPost({ content: 'Test tweet' });

      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // 2回失敗後、3回目で成功
    });

    it('should handle malformed API responses gracefully', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: null // 不正なレスポンス
      });

      const result = await actionEndpoints.createPost({ content: 'Test tweet' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API response');
    });
  });
});