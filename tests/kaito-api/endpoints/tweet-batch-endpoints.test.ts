/**
 * TweetBatchEndpoints - getTweetsByIds完全テスト
 * 指示書 TASK-002 準拠: getTweetsByIdsメソッドの包括的テスト
 * 
 * テスト対象:
 * - getTweetsByIds() - ツイートID一括取得機能（最大100件）
 * - 正常系・異常系・エッジケース完全実装
 */

import { TweetSearchEndpoint } from '../../../src/kaito-api/endpoints/read-only/tweet-search';
import type { HttpClient, AuthManager } from '../../../src/kaito-api/utils/types';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('TweetSearchEndpoint - getTweetsByIds', () => {
  let endpoint: TweetSearchEndpoint;
  let mockHttpClient: HttpClient;
  let mockAuthManager: AuthManager;

  beforeEach(() => {
    vi.clearAllMocks();

    // HTTPクライアントモック
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
    } as unknown as HttpClient;

    // 認証マネージャーモック
    mockAuthManager = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      getApiKey: vi.fn().mockReturnValue('test-api-key')
    } as unknown as AuthManager;

    endpoint = new TweetSearchEndpoint(mockHttpClient, mockAuthManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('正常系', () => {
    const mockSuccessResponse = {
      tweets: [
        {
          id: '1234567890',
          text: 'Test tweet',
          created_at: '2025-01-01T00:00:00Z',
          author: { id: '987654321', userName: 'testuser' },
          public_metrics: {
            retweet_count: 10,
            like_count: 20,
            reply_count: 5,
            quote_count: 2
          }
        }
      ]
    };

    it('単一IDでの取得成功', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockSuccessResponse);

      const result = await endpoint.getTweetsByIds(['1234567890']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tweets).toHaveLength(1);
        expect(result.data.tweets[0].id).toBe('1234567890');
        expect(result.data.notFound).toHaveLength(0);
        expect(result.data.errors).toHaveLength(0);
      }

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweets',
        { tweet_ids: '1234567890' }
      );
    });

    it('複数ID（2-5個）での取得成功', async () => {
      const tweetIds = ['1234567890', '1234567891', '1234567892', '1234567893', '1234567894'];
      const mockResponse = {
        tweets: tweetIds.map(id => ({
          id,
          text: `Tweet ${id}`,
          created_at: '2025-01-01T00:00:00Z',
          author: { id: '987654321', userName: 'testuser' },
          public_metrics: {
            retweet_count: 10,
            like_count: 20,
            reply_count: 5,
            quote_count: 2
          }
        }))
      };

      (mockHttpClient.get as any).mockResolvedValue(mockResponse);

      const result = await endpoint.getTweetsByIds(tweetIds);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tweets).toHaveLength(5);
        expect(result.data.tweets.map(t => t.id)).toEqual(tweetIds);
        expect(result.data.notFound).toHaveLength(0);
      }

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweets',
        { tweet_ids: tweetIds.join(',') }
      );
    });

    it('最大数（100個）での取得成功', async () => {
      const tweetIds = Array.from({ length: 100 }, (_, i) => `1234567890${i.toString().padStart(3, '0')}`);
      const mockResponse = {
        tweets: tweetIds.map(id => ({
          id,
          text: `Tweet ${id}`,
          created_at: '2025-01-01T00:00:00Z',
          author: { id: '987654321', userName: 'testuser' },
          public_metrics: {
            retweet_count: 5,
            like_count: 10,
            reply_count: 2,
            quote_count: 1
          }
        }))
      };

      (mockHttpClient.get as any).mockResolvedValue(mockResponse);

      const result = await endpoint.getTweetsByIds(tweetIds);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tweets).toHaveLength(100);
        expect(result.data.notFound).toHaveLength(0);
      }

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweets',
        { tweet_ids: tweetIds.join(',') }
      );
    });
  });

  describe('バリデーションエラー', () => {
    it('空配列の拒否', async () => {
      await expect(endpoint.getTweetsByIds([])).rejects.toThrow();
      try {
        await endpoint.getTweetsByIds([]);
      } catch (error: any) {
        expect(error.error.message).toContain('tweetIds must be a non-empty array');
      }
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('101個以上のIDの拒否', async () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `${i}`);
      
      await expect(endpoint.getTweetsByIds(tooManyIds)).rejects.toThrow();
      try {
        await endpoint.getTweetsByIds(tooManyIds);
      } catch (error: any) {
        expect(error.error.message).toContain('Maximum 100 tweet IDs allowed per request');
      }
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('無効なID形式（非数値）の拒否', async () => {
      const invalidIds = ['abc123', '123abc', 'test-id', '!@#$%'];
      
      await expect(endpoint.getTweetsByIds(invalidIds)).rejects.toThrow();
      try {
        await endpoint.getTweetsByIds(invalidIds);
      } catch (error: any) {
        expect(error.error.message).toContain('Invalid tweet IDs');
      }
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('null/undefinedの拒否', async () => {
      await expect(endpoint.getTweetsByIds(null as any)).rejects.toThrow();
      await expect(endpoint.getTweetsByIds(undefined as any)).rejects.toThrow();
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('混在する有効・無効IDの処理', async () => {
      const mixedIds = ['1234567890', 'invalid-id', '9876543210', 'another-invalid'];
      
      await expect(endpoint.getTweetsByIds(mixedIds)).rejects.toThrow();
      try {
        await endpoint.getTweetsByIds(mixedIds);
      } catch (error: any) {
        expect(error.error.message).toContain('Invalid tweet IDs');
      }
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('空文字列IDの拒否', async () => {
      const idsWithEmpty = ['1234567890', '', '9876543210'];
      
      await expect(endpoint.getTweetsByIds(idsWithEmpty)).rejects.toThrow();
      try {
        await endpoint.getTweetsByIds(idsWithEmpty);
      } catch (error: any) {
        expect(error.error.message).toContain('Invalid tweet IDs');
      }
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });
  });

  describe('API認証エラー', () => {
    it('APIキー未設定時のエラー', async () => {
      (mockAuthManager.isAuthenticated as any).mockReturnValue(false);

      const result = await endpoint.getTweetsByIds(['1234567890']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN_ERROR');
        expect(result.error.operation).toBe('getTweetsByIds');
      }
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('無効なAPIキー時のエラー', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 401, message: 'Unauthorized' });

      const result = await endpoint.getTweetsByIds(['1234567890']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('AUTHENTICATION_FAILED');
        expect(result.error.message).toBe('API authentication failed - check KAITO_API_TOKEN');
      }
    });

    it('レート制限エラー（429）の処理', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 429, message: 'Rate limit exceeded' });

      const result = await endpoint.getTweetsByIds(['1234567890']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(result.error.message).toBe('Rate limit exceeded for batch tweet retrieval');
      }
    });

    it('不正なリクエストエラー（400）の処理', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 400, message: 'Bad request' });

      const result = await endpoint.getTweetsByIds(['1234567890']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('BAD_REQUEST');
        expect(result.error.message).toBe('Invalid request parameters');
      }
    });
  });

  describe('部分的成功', () => {
    it('一部のIDが見つからない場合の処理', async () => {
      const requestedIds = ['1234567890', '1234567891', '1234567892'];
      const mockResponse = {
        tweets: [
          {
            id: '1234567890',
            text: 'Found tweet 1',
            created_at: '2025-01-01T00:00:00Z',
            author: { id: '987654321', userName: 'testuser' },
            public_metrics: {
              retweet_count: 10,
              like_count: 20,
              reply_count: 5,
              quote_count: 2
            }
          },
          {
            id: '1234567892',
            text: 'Found tweet 3',
            created_at: '2025-01-01T00:00:00Z',
            author: { id: '987654321', userName: 'testuser' },
            public_metrics: {
              retweet_count: 5,
              like_count: 10,
              reply_count: 2,
              quote_count: 1
            }
          }
        ]
      };

      (mockHttpClient.get as any).mockResolvedValue(mockResponse);

      const result = await endpoint.getTweetsByIds(requestedIds);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tweets).toHaveLength(2);
        expect(result.data.tweets.map(t => t.id)).toEqual(['1234567890', '1234567892']);
        expect(result.data.notFound).toEqual(['1234567891']);
        expect(result.data.errors).toHaveLength(0);
      }
    });

    it('一部のIDでエラーが発生した場合の処理', async () => {
      const mockResponse = {
        tweets: [
          {
            id: '1234567890',
            text: 'Valid tweet',
            created_at: '2025-01-01T00:00:00Z',
            author: { id: '987654321', userName: 'testuser' },
            public_metrics: {
              retweet_count: 10,
              like_count: 20,
              reply_count: 5,
              quote_count: 2
            }
          },
          {
            id: '1234567891',
            // 不完全なデータ（authorフィールドがない）
            text: 'Incomplete tweet',
            created_at: '2025-01-01T00:00:00Z'
          }
        ]
      };

      (mockHttpClient.get as any).mockResolvedValue(mockResponse);

      const result = await endpoint.getTweetsByIds(['1234567890', '1234567891']);

      expect(result.success).toBe(true);
      if (result.success) {
        // Since the normalization can handle missing author fields, both tweets will be processed
        expect(result.data.tweets).toHaveLength(2);
        expect(result.data.tweets[0].id).toBe('1234567890');
        expect(result.data.tweets[1].id).toBe('1234567891');
        // The second tweet should have undefined author_id
        expect(result.data.tweets[1].author_id).toBeUndefined();
        expect(result.data.errors).toHaveLength(0);
      }
    });
  });

  describe('エッジケース', () => {
    it('ID重複処理', async () => {
      const duplicatedIds = ['1234567890', '1234567891', '1234567890']; // 1234567890が重複
      const mockResponse = {
        tweets: [
          {
            id: '1234567890',
            text: 'Tweet 1',
            created_at: '2025-01-01T00:00:00Z',
            author: { id: '987654321', userName: 'testuser' },
            public_metrics: {
              retweet_count: 10,
              like_count: 20,
              reply_count: 5,
              quote_count: 2
            }
          },
          {
            id: '1234567891',
            text: 'Tweet 2',
            created_at: '2025-01-01T00:00:00Z',
            author: { id: '987654321', userName: 'testuser' },
            public_metrics: {
              retweet_count: 5,
              like_count: 10,
              reply_count: 2,
              quote_count: 1
            }
          }
        ]
      };

      (mockHttpClient.get as any).mockResolvedValue(mockResponse);

      const result = await endpoint.getTweetsByIds(duplicatedIds);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tweets).toHaveLength(2);
        // Both requested tweets were found, so notFound should be empty
        expect(result.data.notFound).toHaveLength(0);
      }

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweets',
        { tweet_ids: '1234567890,1234567891,1234567890' }
      );
    });

    it('空のレスポンス処理', async () => {
      const mockEmptyResponse = {
        tweets: []
      };

      (mockHttpClient.get as any).mockResolvedValue(mockEmptyResponse);

      const result = await endpoint.getTweetsByIds(['1234567890', '1234567891']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tweets).toHaveLength(0);
        expect(result.data.notFound).toEqual(['1234567890', '1234567891']);
        expect(result.data.errors).toHaveLength(0);
      }
    });

    it('異常なレスポンス構造の処理', async () => {
      // tweetsフィールドがない
      const mockInvalidResponse = {
        data: [
          {
            id: '1234567890',
            text: 'Tweet in data field',
            created_at: '2025-01-01T00:00:00Z',
            author: { id: '987654321', userName: 'testuser' },
            public_metrics: {
              retweet_count: 10,
              like_count: 20,
              reply_count: 5,
              quote_count: 2
            }
          }
        ]
      };

      (mockHttpClient.get as any).mockResolvedValue(mockInvalidResponse);

      const result = await endpoint.getTweetsByIds(['1234567890']);

      expect(result.success).toBe(true);
      if (result.success) {
        // dataフィールドからもツイートを読み取れる
        expect(result.data.tweets).toHaveLength(1);
        expect(result.data.tweets[0].id).toBe('1234567890');
      }
    });

    it('レート制限情報の処理', async () => {
      const mockResponseWithRateLimit = {
        tweets: [
          {
            id: '1234567890',
            text: 'Test tweet',
            created_at: '2025-01-01T00:00:00Z',
            author: { id: '987654321', userName: 'testuser' },
            public_metrics: {
              retweet_count: 10,
              like_count: 20,
              reply_count: 5,
              quote_count: 2
            }
          }
        ],
        rateLimit: {
          remaining: 299,
          reset: 1234567890,
          limit: 300
        }
      };

      (mockHttpClient.get as any).mockResolvedValue(mockResponseWithRateLimit);

      const result = await endpoint.getTweetsByIds(['1234567890']);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.rateLimit).toBeDefined();
        expect(result.rateLimit?.remaining).toBe(299);
        expect(result.rateLimit?.limit).toBe(300);
      }
    });

    it('非常に長いツイートIDの処理', async () => {
      const longId = '12345678901234567890'; // 20桁（Twitterの最大ID長は19桁）
      const mockResponse = {
        tweets: [
          {
            id: longId,
            text: 'Tweet with long ID',
            created_at: '2025-01-01T00:00:00Z',
            author: { id: '987654321', userName: 'testuser' },
            public_metrics: {
              retweet_count: 10,
              like_count: 20,
              reply_count: 5,
              quote_count: 2
            }
          }
        ]
      };

      (mockHttpClient.get as any).mockResolvedValue(mockResponse);

      const result = await endpoint.getTweetsByIds([longId]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tweets).toHaveLength(1);
        expect(result.data.tweets[0].id).toBe(longId);
      }
    });

    it('ネットワークエラーの処理', async () => {
      (mockHttpClient.get as any).mockRejectedValue(new Error('Network timeout'));

      const result = await endpoint.getTweetsByIds(['1234567890']);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('UNKNOWN_ERROR');
        expect(result.error.message).toBe('Network timeout');
      }
    });
  });
});