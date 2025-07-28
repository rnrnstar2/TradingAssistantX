/**
 * UserEndpoints - 実際に使用されるメソッドのテスト
 * 
 * テスト対象（実際に使用されるメソッドのみ）:
 * - getUserLastTweets() - ユーザーの最新ツイート取得
 * - searchTrends() - トレンド検索（オプショナル）
 */

import { UserEndpoints } from '../../../src/kaito-api/endpoints/user-endpoints';
import type {
  UserTweetsResult,
  TrendsResult,
  HttpClient
} from '../../../src/kaito-api/types';

describe('UserEndpoints - 実際に使用されるメソッドのテスト', () => {
  let userEndpoints: UserEndpoints;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn()
    };

    userEndpoints = new UserEndpoints(mockHttpClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserLastTweets - ユーザーの最新ツイート取得', () => {
    it('should get user last tweets successfully', async () => {
      const mockTweetsResponse = {
        data: [
          {
            id: '1234567890',
            text: 'Investment tip of the day: diversify your portfolio',
            created_at: '2023-01-01T00:00:00.000Z',
            author_id: '123456789',
            public_metrics: {
              retweet_count: 10,
              like_count: 25,
              quote_count: 3,
              reply_count: 5
            }
          },
          {
            id: '1234567891',
            text: 'Market analysis for this week',
            created_at: '2023-01-02T00:00:00.000Z',
            author_id: '123456789',
            public_metrics: {
              retweet_count: 5,
              like_count: 15,
              quote_count: 1,
              reply_count: 3
            }
          }
        ],
        meta: {
          result_count: 2,
          next_token: 'next_tweets_token'
        }
      };

      mockHttpClient.get.mockResolvedValue(mockTweetsResponse);

      const result = await userEndpoints.getUserLastTweets('123456789', 10);

      expect(result.success).toBe(true);
      expect(result.tweets).toHaveLength(2);
      expect(result.tweets[0].text).toContain('Investment tip');
      expect(result.nextToken).toBe('next_tweets_token');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/last_tweets',
        expect.objectContaining({
          params: expect.objectContaining({
            userName: '123456789',
            count: 10
          })
        })
      );
    });

    it('should handle empty user ID', async () => {
      const result = await userEndpoints.getUserLastTweets('', 10);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID cannot be empty');
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      mockHttpClient.get.mockRejectedValue({
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'User not found' }
        }
      });

      const result = await userEndpoints.getUserLastTweets('nonexistent', 10);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });

    it('should limit count parameter', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: [],
        meta: { result_count: 0 }
      });

      await userEndpoints.getUserLastTweets('123456789', 150);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/last_tweets',
        expect.objectContaining({
          params: expect.objectContaining({
            count: 100 // 100に制限される
          })
        })
      );
    });
  });

  describe('searchTrends - トレンド検索', () => {
    it('should search trends successfully', async () => {
      const mockTrendsResponse = {
        data: [
          {
            name: '#Bitcoin',
            query: 'Bitcoin OR BTC',
            tweet_volume: 50000,
            trend_type: 'hashtag'
          },
          {
            name: 'Stock Market',
            query: 'Stock Market',
            tweet_volume: 25000,
            trend_type: 'phrase'
          }
        ],
        meta: {
          result_count: 2,
          location: 'worldwide'
        }
      };

      mockHttpClient.get.mockResolvedValue(mockTrendsResponse);

      const result = await userEndpoints.searchTrends();

      expect(result.success).toBe(true);
      expect(result.trends).toHaveLength(2);
      expect(result.trends[0].name).toBe('#Bitcoin');
      expect(result.trends[1].tweet_volume).toBe(25000);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/twitter/trends/search');
    });

    it('should search trends with location filter', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: [],
        meta: { result_count: 0, location: 'US' }
      });

      const result = await userEndpoints.searchTrends({ location: 'US' });

      expect(result.success).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/trends/search',
        expect.objectContaining({
          params: expect.objectContaining({
            woeid: 'US'
          })
        })
      );
    });

    it('should handle trends API errors', async () => {
      mockHttpClient.get.mockRejectedValue({
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Service unavailable' }
        }
      });

      const result = await userEndpoints.searchTrends();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service unavailable');
    });

    it('should handle empty trends response', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: [],
        meta: { result_count: 0 }
      });

      const result = await userEndpoints.searchTrends();

      expect(result.success).toBe(true);
      expect(result.trends).toHaveLength(0);
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle network timeouts', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network timeout'));

      const result = await userEndpoints.getUserLastTweets('123456789', 10);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    it('should handle rate limit errors', async () => {
      mockHttpClient.get.mockRejectedValue({
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: { error: 'Rate limit exceeded' }
        }
      });

      const result = await userEndpoints.searchTrends();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });
  });
});