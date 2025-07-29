/**
 * EngagementManagement テスト - engagement.test.ts
 * REQUIREMENTS.md準拠 - 認証必須エンゲージメント管理エンドポイントの包括的テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EngagementManagement } from '../../../../src/kaito-api/endpoints/authenticated/engagement';
import type { HttpClient, EngagementRequest, EngagementResponse } from '../../../../src/kaito-api/utils/types';
import { AuthManager } from '../../../../src/kaito-api/core/auth-manager';

describe('EngagementManagement', () => {
  let engagementManagement: EngagementManagement;
  let mockHttpClient: Partial<HttpClient>;
  let mockAuthManager: Partial<AuthManager>;

  // テストデータ
  const validTweetId = '1234567890123456789';
  const invalidTweetIds = ['', 'abc123', '12345678901234567890', 'invalid-id'];

  const mockEngagementSuccessResponse = {
    success: true,
    action: 'like',
    tweetId: validTweetId,
    timestamp: '2024-01-15T10:30:00Z',
    data: {
      liked: true,
      retweeted: false
    }
  };

  const mockQuoteTweetSuccessResponse = {
    success: true,
    quoteTweetId: '9876543210987654321',
    createdAt: '2024-01-15T10:30:00Z'
  };

  const mockQuoteTweetRequest = {
    tweetId: validTweetId,
    quoteText: 'Great insight on investment strategies! This aligns with our educational content on portfolio diversification.',
    mediaIds: undefined
  };

  beforeEach(() => {
    // HttpClientモック設定
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
    };
    
    // AuthManagerモック設定
    mockAuthManager = {
      getAuthHeaders: vi.fn().mockReturnValue({ 'x-api-key': 'test-api-key' }),
      getUserSession: vi.fn().mockReturnValue('test-login-cookie'),
      isAuthenticated: vi.fn().mockReturnValue(true)
    };

    engagementManagement = new EngagementManagement(
      mockHttpClient as HttpClient,
      mockAuthManager as AuthManager
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('likeTweet', () => {
    it('正常系: ツイートにいいねできる', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockEngagementSuccessResponse);

      const result = await engagementManagement.likeTweet(validTweetId);

      expect(result.success).toBe(true);
      expect(result.action).toBe('like');
      expect(result.tweetId).toBe(validTweetId);
      expect(result.data?.liked).toBe(true);
      expect(result.timestamp).toBeDefined();
    });

    it('正常系: 投資教育ツイートへの適切なエンゲージメントが記録される', async () => {
      const educationalTweetId = '1111111111111111111';
      const educationalEngagementResponse = {
        ...mockEngagementSuccessResponse,
        tweetId: educationalTweetId,
        data: {
          liked: true,
          retweeted: false,
          engagementContext: 'educational_content'
        }
      };
      (mockHttpClient.post as any).mockResolvedValue(educationalEngagementResponse);

      const result = await engagementManagement.likeTweet(educationalTweetId);

      expect(result.success).toBe(true);
      expect(result.tweetId).toBe(educationalTweetId);
      expect(result.data?.liked).toBe(true);
    });

    it('異常系: 無効なツイートIDでエラーが発生する', async () => {
      for (const invalidId of invalidTweetIds) {
        const result = await engagementManagement.likeTweet(invalidId);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      }
    });

    it('異常系: V2認証エラー(401)を適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized'
      });

      const result = await engagementManagement.likeTweet(validTweetId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('authentication');
    });

    it('異常系: レート制限エラー(429)を適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 429 },
        message: 'Rate limit exceeded'
      });

      const result = await engagementManagement.likeTweet(validTweetId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });
  });

  describe('unlikeTweet', () => {
    it('正常系: ツイートのいいねを解除できる', async () => {
      const unlikeResponse = {
        ...mockEngagementSuccessResponse,
        action: 'unlike',
        data: {
          liked: false,
          retweeted: false
        }
      };
      (mockHttpClient.post as any).mockResolvedValue(unlikeResponse);

      const result = await engagementManagement.unlikeTweet(validTweetId);

      expect(result.success).toBe(true);
      expect(result.action).toBe('unlike');
      expect(result.data?.liked).toBe(false);
    });

    it('異常系: 無効なツイートIDでバリデーションエラーが発生する', async () => {
      const result = await engagementManagement.unlikeTweet('');

      expect(result.success).toBe(false);
      expect(result.action).toBe('unlike');
      expect(result.error).toBeDefined();
    });
  });

  describe('retweetTweet', () => {
    it('正常系: ツイートをリツイートできる', async () => {
      const retweetResponse = {
        ...mockEngagementSuccessResponse,
        action: 'retweet',
        data: {
          liked: false,
          retweeted: true
        }
      };
      (mockHttpClient.post as any).mockResolvedValue(retweetResponse);

      const result = await engagementManagement.retweetTweet(validTweetId);

      expect(result.success).toBe(true);
      expect(result.action).toBe('retweet');
      expect(result.data?.retweeted).toBe(true);
    });

    it('正常系: 投資教育コンテンツの拡散が正常に実行される', async () => {
      const educationalTweetId = '2222222222222222222';
      const educationalRetweetResponse = {
        ...mockEngagementSuccessResponse,
        action: 'retweet',
        tweetId: educationalTweetId,
        data: {
          liked: false,
          retweeted: true,
          engagementReason: 'educational_content_amplification'
        }
      };
      (mockHttpClient.post as any).mockResolvedValue(educationalRetweetResponse);

      const result = await engagementManagement.retweetTweet(educationalTweetId);

      expect(result.success).toBe(true);
      expect(result.data?.retweeted).toBe(true);
    });

    it('異常系: 自分のツイートをリツイートしようとした場合のエラー処理', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 403 },
        message: 'Cannot retweet your own tweet'
      });

      const result = await engagementManagement.retweetTweet(validTweetId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('unretweetTweet', () => {
    it('正常系: リツイートを取り消すことができる', async () => {
      const unretweetResponse = {
        ...mockEngagementSuccessResponse,
        action: 'unretweet',
        data: {
          liked: false,
          retweeted: false
        }
      };
      (mockHttpClient.post as any).mockResolvedValue(unretweetResponse);

      const result = await engagementManagement.unretweetTweet(validTweetId);

      expect(result.success).toBe(true);
      expect(result.action).toBe('unretweet');
      expect(result.data?.retweeted).toBe(false);
    });

    it('異常系: リツイートしていないツイートの取り消し試行', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 404 },
        message: 'Retweet not found'
      });

      const result = await engagementManagement.unretweetTweet(validTweetId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('quoteTweet', () => {
    it('正常系: 引用リツイートを作成できる', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockQuoteTweetSuccessResponse);

      const result = await engagementManagement.quoteTweet(mockQuoteTweetRequest);

      expect(result.success).toBe(true);
      expect(result.quoteTweetId).toBe('9876543210987654321');
      expect(result.createdAt).toBeDefined();
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/twitter/create_tweet_v2',
        expect.objectContaining({
          text: mockQuoteTweetRequest.quoteText,
          quote_tweet_id: mockQuoteTweetRequest.tweetId
        })
      );
    });

    it('正常系: メディア付き引用リツイートを作成できる', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockQuoteTweetSuccessResponse);

      const requestWithMedia = {
        ...mockQuoteTweetRequest,
        mediaIds: ['media_123456789', 'media_987654321']
      };

      const result = await engagementManagement.quoteTweet(requestWithMedia);

      expect(result.success).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/twitter/create_tweet_v2',
        expect.objectContaining({
          media_ids: ['media_123456789', 'media_987654321']
        })
      );
    });

    it('正常系: 投資教育コンテンツへの価値追加コメントが適切に処理される', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockQuoteTweetSuccessResponse);

      const educationalQuoteRequest = {
        tweetId: '3333333333333333333',
        quoteText: 'Adding to this excellent point: Risk tolerance assessment is crucial before any investment decision. Consider your time horizon, financial goals, and emotional capacity to handle market volatility. #FinancialEducation'
      };

      const result = await engagementManagement.quoteTweet(educationalQuoteRequest);

      expect(result.success).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/twitter/create_tweet_v2',
        expect.objectContaining({
          text: educationalQuoteRequest.quoteText,
          quote_tweet_id: educationalQuoteRequest.tweetId
        })
      );
    });

    it('異常系: 無効な引用テキスト長でバリデーションエラーが発生する', async () => {
      const invalidRequest = {
        tweetId: validTweetId,
        quoteText: 'a'.repeat(281) // 280文字制限を超える
      };

      const result = await engagementManagement.quoteTweet(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('quote text length');
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('異常系: 無効なツイートIDでバリデーションエラーが発生する', async () => {
      const invalidRequest = {
        tweetId: 'invalid-tweet-id',
        quoteText: 'Valid quote text'
      };

      const result = await engagementManagement.quoteTweet(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid tweet ID');
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('異常系: 削除されたツイートを引用しようとした場合のエラー処理', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 404 },
        message: 'Tweet not found or deleted'
      });

      const result = await engagementManagement.quoteTweet(mockQuoteTweetRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tweet not found');
    });

    it('異常系: プライベートツイートを引用しようとした場合のエラー処理', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 403 },
        message: 'Cannot quote private tweet'
      });

      const result = await engagementManagement.quoteTweet(mockQuoteTweetRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot quote private tweet');
    });
  });

  describe('投資教育コンテンツ特化テスト', () => {
    it('正常系: 複数の教育的ツイートに連続してエンゲージメントできる', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockEngagementSuccessResponse);

      const educationalTweetIds = [
        '1111111111111111111', // Diversification tips
        '2222222222222222222', // Risk management
        '3333333333333333333'  // Market analysis
      ];

      const results = [];
      for (const tweetId of educationalTweetIds) {
        const result = await engagementManagement.likeTweet(tweetId);
        results.push(result);
      }

      expect(results.every(r => r.success)).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(3);
    });

    it('正常系: 価値のある投資教育コンテンツの引用リツイートチェーン', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockQuoteTweetSuccessResponse);

      const educationalQuotes = [
        {
          tweetId: '4444444444444444444',
          quoteText: 'Essential reading for new investors! This thread explains compound interest beautifully. Time is your greatest asset when investing.'
        },
        {
          tweetId: '5555555555555555555',
          quoteText: 'Building on this great explanation of dollar-cost averaging: it\'s particularly effective in volatile markets like crypto.'
        }
      ];

      for (const quote of educationalQuotes) {
        const result = await engagementManagement.quoteTweet(quote);
        expect(result.success).toBe(true);
      }

      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });

    it('正常系: 異なる言語の投資教育コンテンツへのエンゲージメント', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockEngagementSuccessResponse);

      // 日本語の投資教育コンテンツ
      const japaneseTweetId = '6666666666666666666';
      const result = await engagementManagement.likeTweet(japaneseTweetId);

      expect(result.success).toBe(true);
    });
  });

  describe('パフォーマンステスト', () => {
    it('高頻度エンゲージメント時のメモリリークがない', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockEngagementSuccessResponse);

      const initialMemory = process.memoryUsage().heapUsed;
      
      // 50回の連続エンゲージメント
      for (let i = 0; i < 50; i++) {
        await engagementManagement.likeTweet(`123456789012345678${i % 10}`);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB未満
    });

    it('バリデーション処理のパフォーマンスが適切である', async () => {
      const startTime = Date.now();
      
      // 複数のバリデーションを並行実行
      const validationPromises = [];
      for (let i = 0; i < 100; i++) {
        validationPromises.push(
          engagementManagement.likeTweet('1234567890123456789')
        );
      }

      (mockHttpClient.post as any).mockResolvedValue(mockEngagementSuccessResponse);
      await Promise.all(validationPromises);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
    });
  });

  describe('エラーハンドリング強化テスト', () => {
    it('異常系: ネットワークエラーを適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue(new Error('Network connection failed'));

      const result = await engagementManagement.likeTweet(validTweetId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network connection failed');
    });

    it('異常系: サーバーエラー(500)を適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 500 },
        message: 'Internal server error'
      });

      const result = await engagementManagement.likeTweet(validTweetId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('異常系: 予期しないAPIレスポンス形式を処理する', async () => {
      (mockHttpClient.post as any).mockResolvedValue('invalid response');

      const result = await engagementManagement.likeTweet(validTweetId);

      // 適切なデフォルト値が設定されることを確認
      expect(result.success).toBe(false);
      expect(result.action).toBe('like');
      expect(result.tweetId).toBe(validTweetId);
    });

    it('異常系: 複数同時エラーを適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue(new Error('Multiple errors occurred'));

      const promises = [
        engagementManagement.likeTweet('1111111111111111111'),
        engagementManagement.retweetTweet('2222222222222222222'),
        engagementManagement.quoteTweet({
          tweetId: '3333333333333333333',
          quoteText: 'Test quote'
        })
      ];

      const results = await Promise.allSettled(promises);
      
      // すべてのエラーが適切に処理されることを確認
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value.success).toBe(false);
        }
      });
    });
  });
});