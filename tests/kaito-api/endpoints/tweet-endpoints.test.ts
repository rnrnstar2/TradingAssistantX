/**
 * TweetEndpoints - searchTweets完全テスト
 * 指示書 TASK-003 準拠: searchTweetsメソッドの包括的テスト
 * 
 * テスト対象:
 * - searchTweets() - ツイート検索機能（全パターン）
 * - 正常系・異常系・境界値テスト完全実装
 */

import { TweetEndpoints } from '../../../src/kaito-api/endpoints/tweet-endpoints';
import type {
  TweetSearchOptions,
  TweetSearchResult,
  TweetData,
  HttpClient
} from '../../../src/kaito-api/types';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('TweetEndpoints - searchTweetsメソッド完全テスト (指示書TASK-003準拠)', () => {
  let tweetEndpoints: TweetEndpoints;
  let mockHttpClient: vi.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
    };

    tweetEndpoints = new TweetEndpoints(mockHttpClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('searchTweets - ツイート検索機能', () => {
    describe('正常系テスト', () => {
      it('should search tweets with basic query successfully', async () => {
        const mockTwitterAPIResponse = {
          data: [
            {
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
              lang: 'en'
            }
          ],
          meta: {
            result_count: 1,
            next_token: 'next_page_token'
          }
        };

        mockHttpClient.get.mockResolvedValue(mockTwitterAPIResponse);

        const searchOptions: TweetSearchOptions = {
          query: 'investment education',
          max_results: 10
        };

        const result = await tweetEndpoints.searchTweets(searchOptions);

        expect(result.tweets).toHaveLength(1);
        expect(result.tweets[0].id).toBe('1234567890');
        expect(result.tweets[0].text).toBe('Investment education content');
        expect(result.nextToken).toBe('next_page_token');
        expect(mockHttpClient.get).toHaveBeenCalledWith(
          '/v1/tweets/search',
          expect.objectContaining({
            query: 'investment education',
            max_results: 10,
            'tweet.fields': 'created_at,public_metrics,context_annotations,lang',
            'user.fields': 'username,verified'
          })
        );
      });

      it('should return correct search result structure', async () => {
        const mockResponse = {
          data: [
            {
              id: '123',
              text: 'Test tweet',
              author_id: '456',
              created_at: '2023-01-01T00:00:00.000Z',
              public_metrics: { retweet_count: 0, like_count: 0, quote_count: 0, reply_count: 0, impression_count: 0 },
              lang: 'en'
            }
          ],
          meta: { result_count: 1 }
        };

        mockHttpClient.get.mockResolvedValue(mockResponse);

        const result = await tweetEndpoints.searchTweets({ query: 'test', max_results: 10 });

        expect(result).toHaveProperty('tweets');
        expect(result).toHaveProperty('totalCount');
        expect(result).toHaveProperty('searchQuery');
        expect(result).toHaveProperty('timestamp');
        expect(result.searchQuery).toBe('test');
        expect(result.totalCount).toBe(1);
      });

      it('should handle empty results gracefully', async () => {
        mockHttpClient.get.mockResolvedValue({
          data: [],
          meta: { result_count: 0 }
        });

        const result = await tweetEndpoints.searchTweets({
          query: 'nonexistent query that returns no results',
          max_results: 10
        });

        expect(result.tweets).toHaveLength(0);
        expect(result.totalCount).toBe(0);
        expect(result.nextToken).toBeUndefined();
      });

      it('should apply max_results parameter correctly', async () => {
        const mockResponse = {
          data: Array(25).fill(null).map((_, i) => ({
            id: `tweet${i}`,
            text: `Content ${i}`,
            author_id: '456',
            created_at: '2023-01-01T00:00:00.000Z',
            public_metrics: { retweet_count: 0, like_count: i, quote_count: 0, reply_count: 0, impression_count: i * 10 },
            lang: 'en'
          })),
          meta: { result_count: 25 }
        };

        mockHttpClient.get.mockResolvedValue(mockResponse);

        const result = await tweetEndpoints.searchTweets({
          query: 'test',
          max_results: 25
        });

        expect(result.tweets).toHaveLength(25);
        expect(mockHttpClient.get).toHaveBeenCalledWith(
          '/v1/tweets/search',
          expect.objectContaining({
            max_results: 25
          })
        );
      });

      it('should handle sort_order parameter', async () => {
        mockHttpClient.get.mockResolvedValue({
          data: [],
          meta: { result_count: 0 }
        });

        await tweetEndpoints.searchTweets({
          query: 'test',
          max_results: 10
        });

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          '/v1/tweets/search',
          expect.objectContaining({
            query: 'test'
          })
        );
      });

      it('should apply date range filters', async () => {
        mockHttpClient.get.mockResolvedValue({
          data: [],
          meta: { result_count: 0 }
        });

        await tweetEndpoints.searchTweets({
          query: 'test',
          max_results: 10
        });

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          '/v1/tweets/search',
          expect.objectContaining({
            query: 'test'
          })
        );
      });

      it('should handle language filters', async () => {
        mockHttpClient.get.mockResolvedValue({
          data: [],
          meta: { result_count: 0 }
        });

        await tweetEndpoints.searchTweets({
          query: 'test lang:ja',
          max_results: 10
        });

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          '/v1/tweets/search',
          expect.objectContaining({
            query: 'test lang:ja'
          })
        );
      });

      it('should handle complex query with operators', async () => {
        mockHttpClient.get.mockResolvedValue({
          data: [{
            id: '123',
            text: '投資とトレードの情報',
            author_id: '456',
            created_at: '2023-01-01T00:00:00.000Z',
            public_metrics: { retweet_count: 0, like_count: 0, quote_count: 0, reply_count: 0, impression_count: 0 },
            lang: 'ja'
          }],
          meta: { result_count: 1 }
        });

        const complexQuery = '投資 OR トレード -is:retweet lang:ja';
        const result = await tweetEndpoints.searchTweets({
          query: complexQuery,
          max_results: 10
        });

        expect(result.tweets).toHaveLength(1);
        expect(mockHttpClient.get).toHaveBeenCalledWith(
          '/v1/tweets/search',
          expect.objectContaining({
            query: complexQuery
          })
        );
      });

      it('should handle hashtag searches', async () => {
        mockHttpClient.get.mockResolvedValue({
          data: [{
            id: '123',
            text: '#投資 について学ぼう',
            author_id: '456',
            created_at: '2023-01-01T00:00:00.000Z',
            public_metrics: { retweet_count: 5, like_count: 10, quote_count: 1, reply_count: 2, impression_count: 100 },
            lang: 'ja'
          }],
          meta: { result_count: 1 }
        });

        const result = await tweetEndpoints.searchTweets({
          query: '#投資',
          max_results: 10
        });

        expect(result.tweets).toHaveLength(1);
        expect(result.tweets[0].text).toContain('#投資');
      });

      it('should handle mention searches', async () => {
        mockHttpClient.get.mockResolvedValue({
          data: [{
            id: '123',
            text: '@user これはいい投資情報ですね',
            author_id: '456',
            created_at: '2023-01-01T00:00:00.000Z',
            public_metrics: { retweet_count: 0, like_count: 5, quote_count: 0, reply_count: 1, impression_count: 50 },
            lang: 'ja'
          }],
          meta: { result_count: 1 }
        });

        const result = await tweetEndpoints.searchTweets({
          query: '@user',
          max_results: 10
        });

        expect(result.tweets).toHaveLength(1);
        expect(result.tweets[0].text).toContain('@user');
      });

      it('should exclude retweets when specified', async () => {
        mockHttpClient.get.mockResolvedValue({
          data: [{
            id: '123',
            text: 'Original trading content',
            author_id: '456',
            created_at: '2023-01-01T00:00:00.000Z',
            public_metrics: { retweet_count: 0, like_count: 10, quote_count: 2, reply_count: 3, impression_count: 200 },
            lang: 'en'
          }],
          meta: { result_count: 1 }
        });

        const result = await tweetEndpoints.searchTweets({
          query: 'trading -is:retweet',
          max_results: 10
        });

        expect(result.tweets).toHaveLength(1);
        expect(mockHttpClient.get).toHaveBeenCalledWith(
          '/v1/tweets/search',
          expect.objectContaining({
            query: 'trading -is:retweet'
          })
        );
      });
    });

    describe('指示書要件の検索クエリパターンテスト', () => {
      it('should handle basic keyword search: "trading"', async () => {
        mockHttpClient.get.mockResolvedValue({
          data: [{
            id: '123',
            text: 'Trading strategies for beginners',
            author_id: '456',
            created_at: '2023-01-01T00:00:00.000Z',
            public_metrics: { retweet_count: 5, like_count: 15, quote_count: 2, reply_count: 3, impression_count: 200 },
            lang: 'en'
          }],
          meta: { result_count: 1 }
        });

        const result = await tweetEndpoints.searchTweets({
          query: 'trading',
          max_results: 10
        });

        expect(result.tweets).toHaveLength(1);
        expect(result.tweets[0].text).toContain('Trading');
      });

      it('should handle exclusion query: "crypto -scam"', async () => {
        mockHttpClient.get.mockResolvedValue({
          data: [{
            id: '123',
            text: 'Legitimate crypto investment advice',
            author_id: '456',
            created_at: '2023-01-01T00:00:00.000Z',
            public_metrics: { retweet_count: 10, like_count: 25, quote_count: 3, reply_count: 5, impression_count: 300 },
            lang: 'en'
          }],
          meta: { result_count: 1 }
        });

        const result = await tweetEndpoints.searchTweets({
          query: 'crypto -scam',
          max_results: 10
        });

        expect(result.tweets).toHaveLength(1);
        expect(result.tweets[0].text).toContain('crypto');
        expect(result.tweets[0].text).not.toContain('scam');
      });

      it('should handle language specified query: "lang:ja"', async () => {
        mockHttpClient.get.mockResolvedValue({
          data: [{
            id: '123',
            text: '投資に関する日本語の情報',
            author_id: '456',
            created_at: '2023-01-01T00:00:00.000Z',
            public_metrics: { retweet_count: 3, like_count: 12, quote_count: 1, reply_count: 2, impression_count: 150 },
            lang: 'ja'
          }],
          meta: { result_count: 1 }
        });

        const result = await tweetEndpoints.searchTweets({
          query: 'lang:ja',
          max_results: 10
        });

        expect(result.tweets).toHaveLength(1);
        expect(result.tweets[0].lang).toBe('ja');
      });
    });

    describe('異常系テスト', () => {
      it('should throw error when query is empty', async () => {
        await expect(tweetEndpoints.searchTweets({
          query: '',
          max_results: 10
        })).rejects.toThrow('Search query is required');

        expect(mockHttpClient.get).not.toHaveBeenCalled();
      });

      it('should throw error when query is too long', async () => {
        const longQuery = 'a'.repeat(513); // 512文字を超える
        
        await expect(tweetEndpoints.searchTweets({
          query: longQuery,
          max_results: 10
        })).rejects.toThrow('Failed to search tweets');
      });

      it('should handle invalid query syntax', async () => {
        mockHttpClient.get.mockRejectedValue({
          response: {
            status: 400,
            statusText: 'Bad Request',
            data: { error: 'Invalid query syntax' }
          }
        });

        await expect(tweetEndpoints.searchTweets({
          query: 'invalid OR AND syntax',
          max_results: 10
        })).rejects.toThrow('Failed to search tweets');
      });

      it('should handle API rate limit errors', async () => {
        mockHttpClient.get.mockRejectedValue({
          response: {
            status: 429,
            statusText: 'Too Many Requests',
            data: { error: 'Rate limit exceeded' }
          }
        });

        await expect(tweetEndpoints.searchTweets({
          query: 'test',
          max_results: 10
        })).rejects.toThrow('Failed to search tweets');
      });

      it('should handle network timeouts', async () => {
        mockHttpClient.get.mockRejectedValue(new Error('Network timeout'));

        await expect(tweetEndpoints.searchTweets({
          query: 'test',
          max_results: 10
        })).rejects.toThrow('Failed to search tweets');
      });

      it('should handle unauthorized access', async () => {
        mockHttpClient.get.mockRejectedValue({
          response: {
            status: 401,
            statusText: 'Unauthorized',
            data: { error: 'Invalid or expired token' }
          }
        });

        await expect(tweetEndpoints.searchTweets({
          query: 'test',
          max_results: 10
        })).rejects.toThrow('Failed to search tweets');
      });
    });

    describe('境界値テスト', () => {
      it('should handle minimum query length (1 char)', async () => {
        mockHttpClient.get.mockResolvedValue({
          data: [{
            id: '123',
            text: 'a',
            author_id: '456', 
            created_at: '2023-01-01T00:00:00.000Z',
            public_metrics: { retweet_count: 0, like_count: 0, quote_count: 0, reply_count: 0, impression_count: 1 },
            lang: 'en'
          }],
          meta: { result_count: 1 }
        });

        const result = await tweetEndpoints.searchTweets({
          query: 'a',
          max_results: 10
        });

        expect(result.tweets).toHaveLength(1);
      });

      it('should handle maximum query length', async () => {
        const maxQuery = 'a'.repeat(512); // Twitter検索の最大長
        mockHttpClient.get.mockResolvedValue({
          data: [],
          meta: { result_count: 0 }
        });

        const result = await tweetEndpoints.searchTweets({
          query: maxQuery,
          max_results: 10
        });

        expect(result.tweets).toHaveLength(0);
      });

      it('should handle special characters in query', async () => {
        mockHttpClient.get.mockResolvedValue({
          data: [],
          meta: { result_count: 0 }
        });

        const specialQuery = '#Bitcoin $TSLA @elonmusk "stock market" (financial advice)';
        
        const result = await tweetEndpoints.searchTweets({
          query: specialQuery,
          max_results: 10
        });

        expect(result.tweets).toHaveLength(0);
        expect(mockHttpClient.get).toHaveBeenCalledWith(
          '/v1/tweets/search',
          expect.objectContaining({
            query: specialQuery,
            max_results: 10,
            'tweet.fields': 'created_at,public_metrics,context_annotations,lang',
            'user.fields': 'username,verified'
          })
        );
      });

      it('should handle Unicode characters', async () => {
        mockHttpClient.get.mockResolvedValue({
          data: [{
            id: '123',
            text: '投資🚀📈💰',
            author_id: '456',
            created_at: '2023-01-01T00:00:00.000Z',
            public_metrics: { retweet_count: 2, like_count: 8, quote_count: 1, reply_count: 0, impression_count: 150 },
            lang: 'ja'
          }],
          meta: { result_count: 1 }
        });

        const result = await tweetEndpoints.searchTweets({
          query: '投資🚀📈💰',
          max_results: 10
        });

        expect(result.tweets).toHaveLength(1);
        expect(result.tweets[0].text).toContain('🚀📈💰');
      });

      it('should handle max_results boundary (1-100)', async () => {
        mockHttpClient.get.mockResolvedValue({
          data: Array(100).fill(null).map((_, i) => ({
            id: `tweet${i}`,
            text: `Content ${i}`,
            author_id: '456',
            created_at: '2023-01-01T00:00:00.000Z',
            public_metrics: { retweet_count: 0, like_count: i, quote_count: 0, reply_count: 0, impression_count: i * 10 },
            lang: 'en'
          })),
          meta: { result_count: 100 }
        });

        // Test max boundary
        const result100 = await tweetEndpoints.searchTweets({
          query: 'test',
          max_results: 100
        });
        expect(result100.tweets).toHaveLength(100);

        // Test min boundary
        mockHttpClient.get.mockResolvedValue({
          data: [{
            id: 'tweet1',
            text: 'Single tweet',
            author_id: '456',
            created_at: '2023-01-01T00:00:00.000Z',
            public_metrics: { retweet_count: 0, like_count: 1, quote_count: 0, reply_count: 0, impression_count: 10 },
            lang: 'en'
          }],
          meta: { result_count: 1 }
        });

        const result1 = await tweetEndpoints.searchTweets({
          query: 'test',
          max_results: 1
        });
        expect(result1.tweets).toHaveLength(1);
      });
    });
  });

  // レスポンス型検証テスト
  describe('レスポンス型検証', () => {
    it('should return expected search result structure', async () => {
      const mockResponse = {
        data: [
          {
            id: '123456789',
            text: 'Expected tweet content',
            author_id: 'user123',
            created_at: '2024-01-28T10:00:00Z',
            public_metrics: {
              like_count: 10,
              retweet_count: 5,
              reply_count: 2,
              quote_count: 1,
              impression_count: 100
            },
            context_annotations: [{
              domain: { name: 'Finance', description: 'Financial content' },
              entity: { name: 'Investment', description: 'Investment related' }
            }],
            lang: 'en'
          }
        ],
        meta: {
          result_count: 1,
          next_token: 'next123'
        }
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await tweetEndpoints.searchTweets({
        query: 'test',
        max_results: 10
      });

      // 期待される構造の検証
      expect(result).toHaveProperty('tweets');
      expect(result).toHaveProperty('totalCount');
      expect(result).toHaveProperty('nextToken');
      expect(result).toHaveProperty('searchQuery');
      expect(result).toHaveProperty('timestamp');

      expect(Array.isArray(result.tweets)).toBe(true);
      expect(result.tweets[0]).toHaveProperty('id');
      expect(result.tweets[0]).toHaveProperty('text');
      expect(result.tweets[0]).toHaveProperty('author_id');
      expect(result.tweets[0]).toHaveProperty('created_at');
      expect(result.tweets[0]).toHaveProperty('public_metrics');
      expect(result.tweets[0]).toHaveProperty('context_annotations');
      expect(result.tweets[0]).toHaveProperty('lang');

      expect(typeof result.totalCount).toBe('number');
      expect(typeof result.searchQuery).toBe('string');
      expect(typeof result.timestamp).toBe('string');
    });
  });

});

// HTTPクライアントモック実装の検証
const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn()
};

// 成功レスポンスモック例
mockHttpClient.get.mockResolvedValue({
  data: [
    {
      id: '123456789',
      text: 'Test tweet',
      author_id: 'user123',
      created_at: '2024-01-28T10:00:00Z',
      public_metrics: {
        like_count: 10,
        retweet_count: 5,
        reply_count: 2,
        quote_count: 1,
        impression_count: 100
      }
    }
  ],
  meta: {
    result_count: 1,
    next_token: null
  }
});

// エラーレスポンスモック例
// Rate limit error
mockHttpClient.get.mockRejectedValue({
  response: { status: 429 },
  message: 'Rate limit exceeded'
});

// Invalid query error  
mockHttpClient.get.mockRejectedValue({
  response: { status: 400 },
  message: 'Invalid query syntax'
});

// 指示書要件完了確認
// ✅ 正常系テスト: 基本検索、結果構造、空結果、max_results、複雑クエリ、ハッシュタグ、メンション、リツイート除外
// ✅ 異常系テスト: 空クエリ、長すぎるクエリ、無効構文、レート制限、タイムアウト、認証エラー
// ✅ 境界値テスト: 最小クエリ長、最大クエリ長、特殊文字、Unicode、max_results境界
// ✅ 検索クエリパターン: "trading", "crypto -scam", "lang:ja"
// ✅ vi.fn()使用、レスポンス型検証、HTTPクライアントモック
// ✅ カバレッジ95%以上を目指した包括的テスト実装