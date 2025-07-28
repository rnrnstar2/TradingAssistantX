/**
 * TweetEndpoints - TwitterAPI.io統合テストスイート
 * 指示書 TASK-004 準拠: ツイート検索・取得・削除機能の包括的テスト
 * 
 * テスト対象:
 * - ツイート検索・フィルタリング
 * - ツイート取得・詳細情報
 * - ツイート削除機能
 * - TwitterAPI.io固有エラーハンドリング
 * - 検索パラメータ・境界値テスト
 */

import { TweetEndpoints } from '../../../src/kaito-api/endpoints/tweet-endpoints';
import type {
  TweetSearchOptions,
  TweetSearchResult,
  TweetData,
  DeleteTweetResult,
  HttpClient
} from '../../../src/kaito-api/types';

describe('TweetEndpoints - TwitterAPI.io統合テスト', () => {
  let tweetEndpoints: TweetEndpoints;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn()
    };

    tweetEndpoints = new TweetEndpoints(mockHttpClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchTweets - ツイート検索機能', () => {
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
        maxResults: 10,
        sortOrder: 'recent'
      };

      const result = await tweetEndpoints.searchTweets(searchOptions);

      expect(result.success).toBe(true);
      expect(result.tweets).toHaveLength(1);
      expect(result.tweets[0].id).toBe('1234567890');
      expect(result.tweets[0].text).toBe('Investment education content');
      expect(result.nextToken).toBe('next_page_token');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweet/advanced_search',
        expect.objectContaining({
          params: expect.objectContaining({
            query: 'investment education',
            queryType: 'Latest',
            count: 10
          })
        })
      );
    });

    it('should handle advanced search with filters', async () => {
      const mockResponse = {
        data: [
          {
            id: '9876543210',
            text: 'Advanced crypto trading strategies',
            author_id: '987654321',
            created_at: '2023-01-02T00:00:00.000Z',
            public_metrics: {
              retweet_count: 50,
              like_count: 150,
              quote_count: 10,
              reply_count: 25,
              impression_count: 5000
            },
            lang: 'en'
          }
        ],
        meta: {
          result_count: 1
        }
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const advancedOptions: TweetSearchOptions = {
        query: 'crypto trading',
        maxResults: 50,
        sortOrder: 'popular',
        since: '2023-01-01T00:00:00.000Z',
        until: '2023-01-31T23:59:59.000Z',
        lang: 'en',
        minRetweets: 10,
        minLikes: 50,
        hasMedia: true
      };

      await tweetEndpoints.searchTweets(advancedOptions);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweet/advanced_search',
        expect.objectContaining({
          params: expect.objectContaining({
            query: 'crypto trading',
            queryType: 'Popular',
            count: 50,
            since: '2023-01-01T00:00:00.000Z',
            until: '2023-01-31T23:59:59.000Z',
            lang: 'en',
            min_retweets: 10,
            min_faves: 50,
            has_media: true
          })
        })
      );
    });

    describe('検索パラメータバリデーション', () => {
      it('should reject empty query', async () => {
        const result = await tweetEndpoints.searchTweets({
          query: '',
          maxResults: 10
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Query cannot be empty');
        expect(mockHttpClient.get).not.toHaveBeenCalled();
      });

      it('should limit maxResults to 100', async () => {
        mockHttpClient.get.mockResolvedValue({ data: [], meta: { result_count: 0 } });

        await tweetEndpoints.searchTweets({
          query: 'test',
          maxResults: 150 // 100を超える値
        });

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          '/twitter/tweet/advanced_search',
          expect.objectContaining({
            params: expect.objectContaining({
              count: 100 // 100に制限される
            })
          })
        );
      });

      it('should validate date format', async () => {
        const result = await tweetEndpoints.searchTweets({
          query: 'test',
          since: 'invalid-date'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid date format');
        expect(mockHttpClient.get).not.toHaveBeenCalled();
      });

      it('should validate language code', async () => {
        const result = await tweetEndpoints.searchTweets({
          query: 'test',
          lang: 'invalid-lang'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid language code');
        expect(mockHttpClient.get).not.toHaveBeenCalled();
      });
    });

    describe('TwitterAPI.io固有検索機能', () => {
      it('should handle sentiment-based search', async () => {
        mockHttpClient.get.mockResolvedValue({ data: [], meta: { result_count: 0 } });

        await tweetEndpoints.searchTweets({
          query: 'bitcoin',
          sentiment: 'positive'
        });

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          '/twitter/tweet/advanced_search',
          expect.objectContaining({
            params: expect.objectContaining({
              sentiment: 'positive'
            })
          })
        );
      });

      it('should handle user verification filter', async () => {
        mockHttpClient.get.mockResolvedValue({ data: [], meta: { result_count: 0 } });

        await tweetEndpoints.searchTweets({
          query: 'finance',
          verifiedOnly: true
        });

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          '/twitter/tweet/advanced_search',
          expect.objectContaining({
            params: expect.objectContaining({
              verified_only: true
            })
          })
        );
      });

      it('should handle geographic filtering', async () => {
        mockHttpClient.get.mockResolvedValue({ data: [], meta: { result_count: 0 } });

        await tweetEndpoints.searchTweets({
          query: 'investment',
          geoCode: '37.781157,-122.398720,1mi'
        });

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          '/twitter/tweet/advanced_search',
          expect.objectContaining({
            params: expect.objectContaining({
              geocode: '37.781157,-122.398720,1mi'
            })
          })
        );
      });
    });
  });

  describe('getTweet - ツイート取得機能', () => {
    it('should get tweet by ID successfully', async () => {
      const mockTweetResponse = {
        data: {
          id: '1234567890',
          text: 'Detailed tweet content',
          author_id: '123456789',
          created_at: '2023-01-01T00:00:00.000Z',
          public_metrics: {
            retweet_count: 15,
            like_count: 35,
            quote_count: 5,
            reply_count: 8,
            impression_count: 1500
          },
          context_annotations: [
            {
              domain: { name: 'Finance', description: 'Financial content' },
              entity: { name: 'Stock Market', description: 'Stock market related' }
            }
          ],
          attachments: {
            media_keys: ['3_1234567890']
          },
          lang: 'en'
        },
        includes: {
          media: [
            {
              media_key: '3_1234567890',
              type: 'photo',
              url: 'https://pbs.twimg.com/media/example.jpg'
            }
          ]
        }
      };

      mockHttpClient.get.mockResolvedValue(mockTweetResponse);

      const result = await tweetEndpoints.getTweet('1234567890');

      expect(result.success).toBe(true);
      expect(result.tweet).toBeDefined();
      expect(result.tweet.id).toBe('1234567890');
      expect(result.tweet.text).toBe('Detailed tweet content');
      expect(result.tweet.attachments).toBeDefined();
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweet/1234567890',
        expect.objectContaining({
          params: expect.objectContaining({
            expansions: 'attachments.media_keys,author_id',
            'tweet.fields': 'created_at,public_metrics,context_annotations,lang,geo',
            'media.fields': 'type,url,preview_image_url'
          })
        })
      );
    });

    it('should handle tweet not found error', async () => {
      mockHttpClient.get.mockRejectedValue({
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'Tweet not found' }
        }
      });

      const result = await tweetEndpoints.getTweet('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tweet not found');
    });

    it('should validate tweet ID format', async () => {
      const result = await tweetEndpoints.getTweet('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid tweet ID');
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('should handle deleted or private tweets', async () => {
      mockHttpClient.get.mockRejectedValue({
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: { error: 'Tweet is private or deleted' }
        }
      });

      const result = await tweetEndpoints.getTweet('1234567890');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tweet is private or deleted');
    });
  });

  describe('getTweetThread - スレッド取得機能', () => {
    it('should get tweet thread successfully', async () => {
      const mockThreadResponse = {
        data: [
          {
            id: '1234567890',
            text: 'Thread 1/3: Investment basics',
            author_id: '123456789',
            created_at: '2023-01-01T00:00:00.000Z',
            conversation_id: '1234567890'
          },
          {
            id: '1234567891',
            text: 'Thread 2/3: Risk management',
            author_id: '123456789',
            created_at: '2023-01-01T00:01:00.000Z',
            conversation_id: '1234567890',
            in_reply_to_user_id: '123456789'
          },
          {
            id: '1234567892',
            text: 'Thread 3/3: Portfolio diversification',
            author_id: '123456789',
            created_at: '2023-01-01T00:02:00.000Z',
            conversation_id: '1234567890',
            in_reply_to_user_id: '123456789'
          }
        ]
      };

      mockHttpClient.get.mockResolvedValue(mockThreadResponse);

      const result = await tweetEndpoints.getTweetThread('1234567890');

      expect(result.success).toBe(true);
      expect(result.thread).toHaveLength(3);
      expect(result.thread[0].text).toContain('Thread 1/3');
      expect(result.thread[2].text).toContain('Thread 3/3');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweet/conversation/1234567890'
      );
    });
  });

  describe('deleteTweet - ツイート削除機能', () => {
    it('should delete tweet successfully', async () => {
      mockHttpClient.delete.mockResolvedValue({
        data: { deleted: true }
      });

      const result = await tweetEndpoints.deleteTweet('1234567890');

      expect(result.success).toBe(true);
      expect(result.tweetId).toBe('1234567890');
      expect(result.deleted).toBe(true);
      expect(mockHttpClient.delete).toHaveBeenCalledWith('/twitter/tweet/1234567890');
    });

    it('should handle delete permission error', async () => {
      mockHttpClient.delete.mockRejectedValue({
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: { error: 'Cannot delete this tweet' }
        }
      });

      const result = await tweetEndpoints.deleteTweet('1234567890');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot delete this tweet');
    });

    it('should handle tweet already deleted', async () => {
      mockHttpClient.delete.mockRejectedValue({
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'Tweet already deleted or does not exist' }
        }
      });

      const result = await tweetEndpoints.deleteTweet('1234567890');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tweet already deleted');
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle TwitterAPI.io rate limit errors', async () => {
      mockHttpClient.get.mockRejectedValue({
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: { 
            error: 'Rate limit exceeded for search endpoint',
            reset_time: '2023-01-01T01:00:00.000Z'
          }
        }
      });

      const result = await tweetEndpoints.searchTweets({
        query: 'test',
        maxResults: 10
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      mockHttpClient.get.mockRejectedValue({
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { error: 'Invalid or expired token' }
        }
      });

      const result = await tweetEndpoints.searchTweets({
        query: 'test',
        maxResults: 10
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired token');
    });

    it('should handle network timeout errors', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network timeout'));

      const result = await tweetEndpoints.searchTweets({
        query: 'test',
        maxResults: 10
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle malformed search responses', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: null, // 不正なレスポンス
        meta: null
      });

      const result = await tweetEndpoints.searchTweets({
        query: 'test',
        maxResults: 10
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid search response');
    });
  });

  describe('パフォーマンステスト', () => {
    it('should handle concurrent tweet searches efficiently', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: [{ id: '123', text: 'test', created_at: '2023-01-01T00:00:00.000Z' }],
        meta: { result_count: 1 }
      });

      const startTime = Date.now();
      const concurrentSearches = Array(5).fill(null).map((_, i) =>
        tweetEndpoints.searchTweets({
          query: `search ${i}`,
          maxResults: 10
        })
      );

      await Promise.all(concurrentSearches);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // 1秒以内
      expect(mockHttpClient.get).toHaveBeenCalledTimes(5);
    });

    it('should handle large result sets efficiently', async () => {
      const largeMockResponse = {
        data: Array(100).fill(null).map((_, i) => ({
          id: `tweet${i}`,
          text: `Tweet content ${i}`,
          created_at: '2023-01-01T00:00:00.000Z',
          author_id: '123456789'
        })),
        meta: { result_count: 100 }
      };

      mockHttpClient.get.mockResolvedValue(largeMockResponse);

      const startTime = Date.now();
      const result = await tweetEndpoints.searchTweets({
        query: 'popular topic',
        maxResults: 100
      });

      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.tweets).toHaveLength(100);
      expect(processingTime).toBeLessThan(500); // 500ms以内でデータ処理
    });
  });

  describe('境界値テスト', () => {
    it('should handle maximum allowed search results (100)', async () => {
      const maxResultsResponse = {
        data: Array(100).fill(null).map((_, i) => ({
          id: `tweet${i}`,
          text: `Content ${i}`,
          created_at: '2023-01-01T00:00:00.000Z'
        })),
        meta: { result_count: 100 }
      };

      mockHttpClient.get.mockResolvedValue(maxResultsResponse);

      const result = await tweetEndpoints.searchTweets({
        query: 'test',
        maxResults: 100
      });

      expect(result.success).toBe(true);
      expect(result.tweets).toHaveLength(100);
    });

    it('should handle minimum search parameters', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: [{ id: '123', text: 'minimal', created_at: '2023-01-01T00:00:00.000Z' }],
        meta: { result_count: 1 }
      });

      const result = await tweetEndpoints.searchTweets({
        query: 'a' // 最小クエリ
      });

      expect(result.success).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweet/advanced_search',
        expect.objectContaining({
          params: expect.objectContaining({
            query: 'a',
            count: 10 // デフォルト値
          })
        })
      );
    });

    it('should handle special characters in search query', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: [],
        meta: { result_count: 0 }
      });

      const specialQuery = '#Bitcoin $TSLA @elonmusk "stock market" (financial advice)';
      
      const result = await tweetEndpoints.searchTweets({
        query: specialQuery,
        maxResults: 10
      });

      expect(result.success).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweet/advanced_search',
        expect.objectContaining({
          params: expect.objectContaining({
            query: specialQuery
          })
        })
      );
    });
  });
});