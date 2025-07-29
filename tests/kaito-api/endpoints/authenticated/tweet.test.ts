/**
 * TweetManagement テスト - tweet.test.ts
 * REQUIREMENTS.md準拠 - 認証必須ツイート管理エンドポイントの包括的テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TweetManagement } from '../../../../src/kaito-api/endpoints/authenticated/tweet';
import type { HttpClient, PostRequest, PostResponse, DeleteTweetResult } from '../../../../src/kaito-api/utils/types';
import { AuthManager } from '../../../../src/kaito-api/core/auth-manager';

describe('TweetManagement', () => {
  let tweetManagement: TweetManagement;
  let mockHttpClient: Partial<HttpClient>;
  let mockAuthManager: Partial<AuthManager>;

  // テストデータ
  const validTweetRequest: PostRequest = {
    content: 'Investment education: Learn about diversified portfolio management #investing #education',
    mediaIds: undefined
  };

  const validTweetWithMediaRequest: PostRequest = {
    content: 'Check out this investment chart showing portfolio growth over time',
    mediaIds: ['media_123456789', 'media_987654321']
  };

  const mockCreateTweetResponse = {
    success: true,
    data: {
      id: '1234567890123456789',
      created_at: '2024-01-15T10:30:00Z'
    }
  };

  const mockDeleteTweetResponse = {
    data: {
      deleted: true
    }
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

    tweetManagement = new TweetManagement(
      mockHttpClient as HttpClient,
      mockAuthManager as AuthManager
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createTweet', () => {
    it('正常系: 投資教育コンテンツのツイートを作成できる', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockCreateTweetResponse);

      const result = await tweetManagement.createTweet(validTweetRequest);

      expect(result.success).toBe(true);
      expect(result.tweetId).toBe('1234567890123456789');
      expect(result.createdAt).toBe('2024-01-15T10:30:00Z');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/twitter/create_tweet_v2',
        {
          text: validTweetRequest.content,
          login_cookie: 'test-login-cookie'
        }
      );
    });

    it('正常系: メディア付きツイートを作成できる', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockCreateTweetResponse);

      const result = await tweetManagement.createTweet(validTweetWithMediaRequest);

      expect(result.success).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/twitter/create_tweet_v2',
        {
          text: validTweetWithMediaRequest.content,
          login_cookie: 'test-login-cookie',
          media_ids: ['media_123456789', 'media_987654321']
        }
      );
    });

    it('正常系: コンテンツのサニタイゼーションが正常に動作する', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockCreateTweetResponse);

      const contentWithControlChars = 'Investment\x00\x1F tip: Diversify\t\tyour\n\nportfolio   properly';
      const request: PostRequest = {
        content: contentWithControlChars
      };

      const result = await tweetManagement.createTweet(request);

      expect(result.success).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/twitter/create_tweet_v2',
        expect.objectContaining({
          text: 'Investment tip: Diversify your portfolio properly'
        })
      );
    });

    it('正常系: 長すぎるコンテンツが自動的に切り詰められる', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockCreateTweetResponse);

      const longContent = 'a'.repeat(285); // 280文字制限を超える
      const request: PostRequest = {
        content: longContent
      };

      const result = await tweetManagement.createTweet(request);

      expect(result.success).toBe(true);
      const expectedContent = 'a'.repeat(277) + '...'; // 280文字制限内
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/twitter/create_tweet_v2',
        expect.objectContaining({
          text: expectedContent
        })
      );
    });

    it('異常系: 空のコンテンツでバリデーションエラーが発生する', async () => {
      const emptyRequest: PostRequest = {
        content: ''
      };

      const result = await tweetManagement.createTweet(emptyRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Content cannot be empty');
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('異常系: メディアID数制限を超えるとバリデーションエラーが発生する', async () => {
      const invalidRequest: PostRequest = {
        content: 'Test tweet',
        mediaIds: ['media_1', 'media_2', 'media_3', 'media_4', 'media_5'] // 5個は制限超過
      };

      const result = await tweetManagement.createTweet(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum 4 media items allowed');
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('異常系: 無効なメディアID形式でバリデーションエラーが発生する', async () => {
      const invalidRequest: PostRequest = {
        content: 'Test tweet',
        mediaIds: ['invalid_media_id', 'media_123456789']
      };

      const result = await tweetManagement.createTweet(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid media ID format detected');
    });

    it('異常系: V2ログインセッションが無効な場合エラーが発生する', async () => {
      (mockAuthManager.getUserSession as any).mockReturnValue(null);

      const result = await tweetManagement.createTweet(validTweetRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid V2 login session available');
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('異常系: レート制限エラー(429)を適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 429 },
        message: 'Rate limit exceeded'
      });

      const result = await tweetManagement.createTweet(validTweetRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('異常系: V2認証エラー(401)を適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized'
      });

      const result = await tweetManagement.createTweet(validTweetRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('V2 authentication failed');
    });

    it('異常系: 権限不足エラー(403)を適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 403 },
        message: 'Forbidden'
      });

      const result = await tweetManagement.createTweet(validTweetRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Action forbidden');
    });

    it('異常系: 無効なリクエストデータエラー(422)を適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 422 },
        message: 'Unprocessable Entity'
      });

      const result = await tweetManagement.createTweet(validTweetRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid request data for V2 API');
    });

    describe('セキュリティチェック', () => {
      it('異常系: 禁止コンテンツを含むツイートがブロックされる', async () => {
        const prohibitedContent: PostRequest = {
          content: 'Get rich quick with this crypto pump and dump scheme! Click here for guaranteed profit!'
        };

        const result = await tweetManagement.createTweet(prohibitedContent);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Security check failed');
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });

      it('異常系: スパムパターンを含むツイートがブロックされる', async () => {
        const spamContent: PostRequest = {
          content: 'AMAZING!!!! INCREDIBLE!!!! CHECK THIS OUT NOW!!!!!!!!!!'
        };

        const result = await tweetManagement.createTweet(spamContent);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Security check failed');
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });

      it('異常系: 制御文字を含むツイートがブロックされる', async () => {
        const controlCharContent: PostRequest = {
          content: 'Investment tip\x00\x01\x02 with hidden control characters'
        };

        const result = await tweetManagement.createTweet(controlCharContent);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Security check failed');
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });

      it('正常系: 適切な投資教育コンテンツはセキュリティチェックを通過する', async () => {
        (mockHttpClient.post as any).mockResolvedValue(mockCreateTweetResponse);

        const safeContent: PostRequest = {
          content: 'Today we will learn about dollar-cost averaging (DCA) strategy. This approach helps reduce the impact of volatility when investing in financial markets. #investing #education'
        };

        const result = await tweetManagement.createTweet(safeContent);

        expect(result.success).toBe(true);
        expect(mockHttpClient.post).toHaveBeenCalled();
      });
    });
  });

  describe('deleteTweet', () => {
    const validTweetId = '1234567890123456789';

    it('正常系: ツイートを削除できる', async () => {
      (mockHttpClient.delete as any).mockResolvedValue(mockDeleteTweetResponse);

      const result = await tweetManagement.deleteTweet(validTweetId);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(true);
      expect(result.tweetId).toBe(validTweetId);
      expect(result.timestamp).toBeDefined();
      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        `/tweets/${validTweetId}`,
        {
          headers: {
            'x-login-cookie': 'test-login-cookie'
          }
        }
      );
    });

    it('正常系: 削除済みツイートでも適切に応答する', async () => {
      (mockHttpClient.delete as any).mockResolvedValue({
        data: { deleted: false }
      });

      const result = await tweetManagement.deleteTweet(validTweetId);

      expect(result.success).toBe(false);
      expect(result.deleted).toBe(false);
      expect(result.tweetId).toBe(validTweetId);
    });

    it('異常系: 無効なツイートIDでバリデーションエラーが発生する', async () => {
      const invalidTweetIds = ['', 'abc123', '12345678901234567890', 'invalid-id'];

      for (const invalidId of invalidTweetIds) {
        const result = await tweetManagement.deleteTweet(invalidId);

        expect(result.success).toBe(false);
        expect(result.deleted).toBe(false);
        expect(result.error).toBeDefined();
        expect(mockHttpClient.delete).not.toHaveBeenCalled();
      }
    });

    it('異常系: V2ログインセッションが無効な場合エラーが発生する', async () => {
      (mockAuthManager.getUserSession as any).mockReturnValue(null);

      const result = await tweetManagement.deleteTweet(validTweetId);

      expect(result.success).toBe(false);
      expect(result.deleted).toBe(false);
      expect(result.error).toContain('No valid V2 login session available');
      expect(mockHttpClient.delete).not.toHaveBeenCalled();
    });

    it('異常系: APIエラーを適切に処理する', async () => {
      (mockHttpClient.delete as any).mockRejectedValue(new Error('Network error'));

      const result = await tweetManagement.deleteTweet(validTweetId);

      expect(result.success).toBe(false);
      expect(result.deleted).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('異常系: ツイートが見つからない場合のエラーを処理する', async () => {
      (mockHttpClient.delete as any).mockRejectedValue({
        response: { status: 404 },
        message: 'Tweet not found'
      });

      const result = await tweetManagement.deleteTweet(validTweetId);

      expect(result.success).toBe(false);
      expect(result.deleted).toBe(false);
      expect(result.error).toBe('Tweet not found');
    });
  });

  describe('投資教育コンテンツ特化テスト', () => {
    it('正常系: 投資に関するハッシュタグを含むツイートを正常に投稿する', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockCreateTweetResponse);

      const investmentTweet: PostRequest = {
        content: 'Understanding risk management is crucial for successful investing. Diversification helps protect your portfolio from market volatility. #investing #riskmanagement #personalfinance'
      };

      const result = await tweetManagement.createTweet(investmentTweet);

      expect(result.success).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/twitter/create_tweet_v2',
        expect.objectContaining({
          text: investmentTweet.content
        })
      );
    });

    it('正常系: 日本語の投資教育コンテンツを正常に投稿する', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockCreateTweetResponse);

      const japaneseTweet: PostRequest = {
        content: '投資の基本：リスク分散の重要性について。一つの銘柄に集中投資するのではなく、複数の資産クラスに分散することで、ポートフォリオのリスクを軽減できます。#投資教育 #資産運用'
      };

      const result = await tweetManagement.createTweet(japaneseTweet);

      expect(result.success).toBe(true);
    });

    it('正常系: 教育的なチャート画像付きツイートを投稿する', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockCreateTweetResponse);

      const chartTweet: PostRequest = {
        content: 'This chart shows the power of compound interest over time. Starting early with consistent investments can significantly impact your long-term wealth.',
        mediaIds: ['media_chart_123456789']
      };

      const result = await tweetManagement.createTweet(chartTweet);

      expect(result.success).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/twitter/create_tweet_v2',
        expect.objectContaining({
          media_ids: ['media_chart_123456789']
        })
      );
    });

    it('異常系: 投機的・危険な投資を推奨するコンテンツがブロックされる', async () => {
      const dangerousContent: PostRequest = {
        content: 'GUARANTEED 1000% RETURNS! Join our crypto pump group for quick money! No risk, all profit! Click now!'
      };

      const result = await tweetManagement.createTweet(dangerousContent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Security check failed');
    });
  });

  describe('パフォーマンステスト', () => {
    it('連続ツイート作成時のメモリリークがない', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockCreateTweetResponse);

      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 10; i++) {
        await tweetManagement.createTweet({
          content: `Investment tip #${i}: Always do your own research before making investment decisions.`
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // 5MB未満
    });

    it('セキュリティチェック処理時間が適切である', async () => {
      const longContent = 'Investment education content. '.repeat(20); // 長いコンテンツ
      const request: PostRequest = { content: longContent };

      const startTime = Date.now();
      await tweetManagement.createTweet(request);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // 100ms以内
    });
  });

  describe('エラーハンドリング強化テスト', () => {
    it('異常系: login_cookie関連のエラーを適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        message: 'Invalid login_cookie format'
      });

      await expect(
        tweetManagement.createTweet(validTweetRequest)
      ).rejects.toThrow('V2 login session expired or invalid');
    });

    it('異常系: ネットワークエラーを適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        message: 'Network connection failed'
      });

      await expect(
        tweetManagement.createTweet(validTweetRequest)
      ).rejects.toThrow('Network connection failed');
    });

    it('異常系: 予期しないAPIレスポンス形式を処理する', async () => {
      (mockHttpClient.post as any).mockResolvedValue({
        success: false,
        error: 'Tweet could not be created'
      });

      const result = await tweetManagement.createTweet(validTweetRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tweet could not be created');
    });
  });
});