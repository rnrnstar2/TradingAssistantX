import { ActionEndpoints } from '../../../src/kaito-api/endpoints/action-endpoints';
import { TweetEndpoints } from '../../../src/kaito-api/endpoints/tweet-endpoints';
import { UserEndpoints } from '../../../src/kaito-api/endpoints/user-endpoints';
import { HttpClient } from '../../../src/kaito-api/types';

describe('TwitterAPI.io Endpoints Integration Tests', () => {
  let mockHttpClient: HttpClient;
  let actionEndpoints: ActionEndpoints;
  let tweetEndpoints: TweetEndpoints;
  let userEndpoints: UserEndpoints;

  beforeEach(() => {
    mockHttpClient = {
      post: jest.fn(),
      get: jest.fn(),
      delete: jest.fn()
    };

    actionEndpoints = new ActionEndpoints(mockHttpClient);
    tweetEndpoints = new TweetEndpoints(mockHttpClient);
    userEndpoints = new UserEndpoints(mockHttpClient);
  });

  describe('ActionEndpoints Tests', () => {
    it('should create post with TwitterAPI.io format', async () => {
      const mockResponse = {
        data: {
          id: '1234567890',
          text: 'Test tweet content',
          created_at: '2025-01-27T12:00:00.000Z'
        }
      };

      mockHttpClient.post = jest.fn().mockResolvedValue(mockResponse);

      const result = await actionEndpoints.createPost({
        content: 'Test tweet content'
      });

      expect(result.success).toBe(true);
      expect(result.tweetId).toBe('1234567890');
      expect(result.createdAt).toBe('2025-01-27T12:00:00.000Z');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/tweets', {
        text: 'Test tweet content'
      });
    });

    it('should perform engagement with correct endpoints', async () => {
      const mockResponse = { data: { liked: true } };
      mockHttpClient.post = jest.fn().mockResolvedValue(mockResponse);

      const result = await actionEndpoints.performEngagement({
        tweetId: '1234567890',
        action: 'like'
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('like');
      expect(result.data.liked).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/tweets/1234567890/like');
    });
  });

  describe('TweetEndpoints Tests', () => {
    it('should create tweet with correct TwitterAPI.io parameters', async () => {
      const mockResponse = {
        data: {
          id: '1234567890',
          text: 'Test tweet with media',
          created_at: '2025-01-27T12:00:00.000Z'
        }
      };

      mockHttpClient.post = jest.fn().mockResolvedValue(mockResponse);

      const result = await tweetEndpoints.createTweet({
        text: 'Test tweet with media',
        media_ids: ['media123', 'media456']
      });

      expect(result.success).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/tweets', {
        text: 'Test tweet with media',
        media_ids: ['media123', 'media456']
      });
    });

    it('should search tweets with correct parameters', async () => {
      const mockResponse = {
        data: [{
          id: '1234567890',
          text: 'Bitcoin trading analysis',
          author_id: 'user123',
          created_at: '2025-01-27T12:00:00.000Z',
          public_metrics: {
            retweet_count: 10,
            like_count: 25,
            quote_count: 5,
            reply_count: 3,
            impression_count: 1000
          }
        }],
        meta: {
          result_count: 1
        }
      };

      mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await tweetEndpoints.searchTweets({
        query: 'bitcoin trading',
        max_results: 10
      });

      expect(result.tweets).toHaveLength(1);
      expect(result.tweets[0].text).toBe('Bitcoin trading analysis');
      expect(result.tweets[0].public_metrics.like_count).toBe(25);
    });
  });

  describe('UserEndpoints Tests', () => {
    it('should get user info with correct format', async () => {
      const mockResponse = {
        data: {
          id: '123456789',
          username: 'testuser',
          name: 'Test User',
          description: 'Trading enthusiast',
          created_at: '2020-01-01T00:00:00.000Z',
          public_metrics: {
            followers_count: 1000,
            following_count: 500,
            tweet_count: 2000
          },
          verified: false
        }
      };

      mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await userEndpoints.getUserInfo('123456789');

      expect(result.username).toBe('testuser');
      expect(result.followersCount).toBe(1000);
      expect(result.verified).toBe(false);
    });

    it('should search users with correct parameters', async () => {
      const mockResponse = {
        data: [{
          id: '123456789',
          username: 'trader1',
          name: 'Crypto Trader',
          created_at: '2020-01-01T00:00:00.000Z',
          public_metrics: {
            followers_count: 5000,
            following_count: 1000,
            tweet_count: 10000
          }
        }],
        meta: {
          result_count: 1
        }
      };

      mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await userEndpoints.searchUsers({
        query: 'crypto trader',
        max_results: 10
      });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].username).toBe('trader1');
    });
  });
});