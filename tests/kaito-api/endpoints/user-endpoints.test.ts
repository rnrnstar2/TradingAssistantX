/**
 * UserEndpoints - TwitterAPI.io統合テストスイート
 * 指示書 TASK-004 準拠: ユーザー管理機能の包括的テスト
 * 
 * テスト対象:
 * - ユーザー情報取得・プロフィール詳細
 * - ユーザー検索・フィルタリング
 * - フォロー・フォロワー管理
 * - TwitterAPI.io固有エラーハンドリング
 * - ユーザーデータバリデーション
 */

import { UserEndpoints } from '../../../src/kaito-api/endpoints/user-endpoints';
import type {
  UserSearchOptions,
  UserSearchResult,
  UserData,
  FollowResult,
  UnfollowResult,
  HttpClient
} from '../../../src/kaito-api/types';

describe('UserEndpoints - TwitterAPI.io統合テスト', () => {
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

  describe('getUserInfo - ユーザー情報取得', () => {
    it('should get user info by username successfully', async () => {
      const mockTwitterAPIResponse = {
        data: {
          id: '123456789',
          username: 'testuser',
          name: 'Test User',
          description: 'Investment educator and trader',
          created_at: '2020-01-01T00:00:00.000Z',
          verified: false,
          public_metrics: {
            followers_count: 1000,
            following_count: 500,
            tweet_count: 2000,
            listed_count: 10
          },
          profile_image_url: 'https://pbs.twimg.com/profile_images/123/avatar.jpg',
          profile_banner_url: 'https://pbs.twimg.com/profile_banners/123/banner.jpg',
          location: 'New York, NY',
          url: 'https://example.com',
          entities: {
            url: {
              urls: [
                {
                  start: 0,
                  end: 23,
                  url: 'https://t.co/example',
                  expanded_url: 'https://example.com',
                  display_url: 'example.com'
                }
              ]
            }
          }
        }
      };

      mockHttpClient.get.mockResolvedValue(mockTwitterAPIResponse);

      const result = await userEndpoints.getUserInfo('testuser');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.id).toBe('123456789');
      expect(result.user.username).toBe('testuser');
      expect(result.user.displayName).toBe('Test User');
      expect(result.user.followersCount).toBe(1000);
      expect(result.user.verified).toBe(false);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/info',
        expect.objectContaining({
          params: expect.objectContaining({
            userName: 'testuser'
          })
        })
      );
    });

    it('should get user info by ID successfully', async () => {
      const mockResponse = {
        data: {
          id: '987654321',
          username: 'financial_expert',
          name: 'Financial Expert',
          description: 'Professional trader with 15+ years experience',
          verified: true,
          public_metrics: {
            followers_count: 50000,
            following_count: 200,
            tweet_count: 5000,
            listed_count: 100
          }
        }
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await userEndpoints.getUserInfo('987654321', { byId: true });

      expect(result.success).toBe(true);
      expect(result.user.id).toBe('987654321');
      expect(result.user.verified).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/info',
        expect.objectContaining({
          params: expect.objectContaining({
            userId: '987654321'
          })
        })
      );
    });

    describe('ユーザー情報バリデーション', () => {
      it('should reject empty username', async () => {
        const result = await userEndpoints.getUserInfo('');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Username cannot be empty');
        expect(mockHttpClient.get).not.toHaveBeenCalled();
      });

      it('should validate username format', async () => {
        const result = await userEndpoints.getUserInfo('invalid-username!@#');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid username format');
        expect(mockHttpClient.get).not.toHaveBeenCalled();
      });

      it('should validate user ID format when byId is true', async () => {
        const result = await userEndpoints.getUserInfo('invalid-id', { byId: true });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid user ID format');
        expect(mockHttpClient.get).not.toHaveBeenCalled();
      });
    });

    describe('TwitterAPI.io固有エラー処理', () => {
      it('should handle user not found error', async () => {
        mockHttpClient.get.mockRejectedValue({
          response: {
            status: 404,
            statusText: 'Not Found',
            data: { error: 'User not found' }
          }
        });

        const result = await userEndpoints.getUserInfo('nonexistent');

        expect(result.success).toBe(false);
        expect(result.error).toContain('User not found');
      });

      it('should handle suspended user account', async () => {
        mockHttpClient.get.mockRejectedValue({
          response: {
            status: 403,
            statusText: 'Forbidden',
            data: { error: 'User account is suspended' }
          }
        });

        const result = await userEndpoints.getUserInfo('suspended_user');

        expect(result.success).toBe(false);
        expect(result.error).toContain('User account is suspended');
      });

      it('should handle private user account', async () => {
        mockHttpClient.get.mockRejectedValue({
          response: {
            status: 401,
            statusText: 'Unauthorized',
            data: { error: 'User account is private' }
          }
        });

        const result = await userEndpoints.getUserInfo('private_user');

        expect(result.success).toBe(false);
        expect(result.error).toContain('User account is private');
      });
    });
  });

  describe('searchUsers - ユーザー検索機能', () => {
    it('should search users with basic query successfully', async () => {
      const mockSearchResponse = {
        data: [
          {
            id: '123456789',
            username: 'crypto_trader',
            name: 'Crypto Trader',
            description: 'Cryptocurrency trading expert',
            verified: false,
            public_metrics: {
              followers_count: 5000,
              following_count: 300,
              tweet_count: 1000
            },
            profile_image_url: 'https://pbs.twimg.com/profile_images/123/avatar.jpg'
          },
          {
            id: '987654321',
            username: 'stock_analyst',
            name: 'Stock Analyst',
            description: 'Professional stock market analyst',
            verified: true,
            public_metrics: {
              followers_count: 25000,
              following_count: 100,
              tweet_count: 3000
            }
          }
        ],
        meta: {
          result_count: 2,
          next_token: 'next_page_token'
        }
      };

      mockHttpClient.get.mockResolvedValue(mockSearchResponse);

      const searchOptions: UserSearchOptions = {
        query: 'investment trader',
        maxResults: 10
      };

      const result = await userEndpoints.searchUsers(searchOptions);

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(2);
      expect(result.users[0].username).toBe('crypto_trader');
      expect(result.users[1].verified).toBe(true);
      expect(result.nextToken).toBe('next_page_token');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/search',
        expect.objectContaining({
          params: expect.objectContaining({
            query: 'investment trader',
            count: 10
          })
        })
      );
    });

    it('should handle advanced search with filters', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: [],
        meta: { result_count: 0 }
      });

      const advancedOptions: UserSearchOptions = {
        query: 'finance expert',
        maxResults: 50,
        verifiedOnly: true,
        minFollowers: 1000,
        maxFollowers: 100000,
        hasProfileImage: true,
        location: 'New York'
      };

      await userEndpoints.searchUsers(advancedOptions);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/search',
        expect.objectContaining({
          params: expect.objectContaining({
            query: 'finance expert',
            count: 50,
            verified_only: true,
            min_followers: 1000,
            max_followers: 100000,
            has_profile_image: true,
            location: 'New York'
          })
        })
      );
    });

    describe('検索パラメータバリデーション', () => {
      it('should reject empty search query', async () => {
        const result = await userEndpoints.searchUsers({
          query: '',
          maxResults: 10
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Query cannot be empty');
        expect(mockHttpClient.get).not.toHaveBeenCalled();
      });

      it('should limit maxResults to 100', async () => {
        mockHttpClient.get.mockResolvedValue({ data: [], meta: { result_count: 0 } });

        await userEndpoints.searchUsers({
          query: 'test',
          maxResults: 150
        });

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          '/twitter/user/search',
          expect.objectContaining({
            params: expect.objectContaining({
              count: 100 // 100に制限される
            })
          })
        );
      });

      it('should validate follower count ranges', async () => {
        const result = await userEndpoints.searchUsers({
          query: 'test',
          minFollowers: 1000,
          maxFollowers: 500 // minより小さい
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('maxFollowers must be greater than minFollowers');
        expect(mockHttpClient.get).not.toHaveBeenCalled();
      });
    });
  });

  describe('getUserTweets - ユーザーツイート取得', () => {
    it('should get user tweets successfully', async () => {
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

      const result = await userEndpoints.getUserTweets('123456789', {
        maxResults: 10,
        excludeReplies: true,
        excludeRetweets: true
      });

      expect(result.success).toBe(true);
      expect(result.tweets).toHaveLength(2);
      expect(result.tweets[0].text).toContain('Investment tip');
      expect(result.nextToken).toBe('next_tweets_token');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/last_tweets',
        expect.objectContaining({
          params: expect.objectContaining({
            userName: '123456789',
            count: 10,
            exclude_replies: true,
            exclude_retweets: true
          })
        })
      );
    });
  });

  describe('followUser - フォロー機能', () => {
    it('should follow user successfully', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: { following: true, pending_follow: false }
      });

      const result = await userEndpoints.followUser('123456789');

      expect(result.success).toBe(true);
      expect(result.following).toBe(true);
      expect(result.targetUserId).toBe('123456789');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/twitter/user/123456789/follow');
    });

    it('should handle pending follow for private accounts', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: { following: false, pending_follow: true }
      });

      const result = await userEndpoints.followUser('private_user_123');

      expect(result.success).toBe(true);
      expect(result.following).toBe(false);
      expect(result.pending).toBe(true);
    });

    it('should handle already following error', async () => {
      mockHttpClient.post.mockRejectedValue({
        response: {
          status: 409,
          statusText: 'Conflict',
          data: { error: 'You are already following this user' }
        }
      });

      const result = await userEndpoints.followUser('123456789');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already following');
    });

    it('should handle blocked user error', async () => {
      mockHttpClient.post.mockRejectedValue({
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: { error: 'You have been blocked by this user' }
        }
      });

      const result = await userEndpoints.followUser('blocked_user');

      expect(result.success).toBe(false);
      expect(result.error).toContain('blocked by this user');
    });
  });

  describe('unfollowUser - アンフォロー機能', () => {
    it('should unfollow user successfully', async () => {
      mockHttpClient.delete.mockResolvedValue({
        data: { following: false }
      });

      const result = await userEndpoints.unfollowUser('123456789');

      expect(result.success).toBe(true);
      expect(result.following).toBe(false);
      expect(result.targetUserId).toBe('123456789');
      expect(mockHttpClient.delete).toHaveBeenCalledWith('/twitter/user/123456789/unfollow');
    });

    it('should handle not following error', async () => {
      mockHttpClient.delete.mockRejectedValue({
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { error: 'You are not following this user' }
        }
      });

      const result = await userEndpoints.unfollowUser('123456789');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not following this user');
    });
  });

  describe('getFollowers - フォロワー取得', () => {
    it('should get user followers successfully', async () => {
      const mockFollowersResponse = {
        data: [
          {
            id: '111111111',
            username: 'follower1',
            name: 'Follower One',
            public_metrics: {
              followers_count: 100,
              following_count: 200
            }
          },
          {
            id: '222222222',
            username: 'follower2',
            name: 'Follower Two',
            verified: true,
            public_metrics: {
              followers_count: 5000,
              following_count: 300
            }
          }
        ],
        meta: {
          result_count: 2,
          next_token: 'followers_next_token'
        }
      };

      mockHttpClient.get.mockResolvedValue(mockFollowersResponse);

      const result = await userEndpoints.getFollowers('123456789', { maxResults: 100 });

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(2);
      expect(result.users[1].verified).toBe(true);
      expect(result.nextToken).toBe('followers_next_token');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/123456789/followers',
        expect.objectContaining({
          params: expect.objectContaining({
            max_results: 100
          })
        })
      );
    });
  });

  describe('getFollowing - フォロー中ユーザー取得', () => {
    it('should get users being followed successfully', async () => {
      const mockFollowingResponse = {
        data: [
          {
            id: '333333333',
            username: 'following1',
            name: 'Following One',
            description: 'Crypto expert'
          }
        ],
        meta: {
          result_count: 1
        }
      };

      mockHttpClient.get.mockResolvedValue(mockFollowingResponse);

      const result = await userEndpoints.getFollowing('123456789');

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(1);
      expect(result.users[0].username).toBe('following1');
      expect(mockHttpClient.get).toHaveBeenCalledWith('/twitter/user/123456789/following');
    });
  });

  describe('パフォーマンステスト', () => {
    it('should handle concurrent user info requests efficiently', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: {
          id: '123',
          username: 'test',
          name: 'Test',
          public_metrics: { followers_count: 100 }
        }
      });

      const startTime = Date.now();
      const concurrentRequests = Array(5).fill(null).map((_, i) =>
        userEndpoints.getUserInfo(`user${i}`)
      );

      await Promise.all(concurrentRequests);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(5);
    });

    it('should handle large follower lists efficiently', async () => {
      const largeFollowerList = {
        data: Array(1000).fill(null).map((_, i) => ({
          id: `user${i}`,
          username: `follower${i}`,
          name: `Follower ${i}`,
          public_metrics: { followers_count: i * 10 }
        })),
        meta: { result_count: 1000 }
      };

      mockHttpClient.get.mockResolvedValue(largeFollowerList);

      const startTime = Date.now();
      const result = await userEndpoints.getFollowers('popular_user');

      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.users).toHaveLength(1000);
      expect(processingTime).toBeLessThan(500);
    });
  });

  describe('境界値テスト', () => {
    it('should handle maximum username length', async () => {
      const longUsername = 'a'.repeat(15); // Twitter最大ユーザー名長
      
      mockHttpClient.get.mockResolvedValue({
        data: {
          id: '123',
          username: longUsername,
          name: 'Test',
          public_metrics: { followers_count: 0 }
        }
      });

      const result = await userEndpoints.getUserInfo(longUsername);
      expect(result.success).toBe(true);
    });

    it('should reject overly long usernames', async () => {
      const tooLongUsername = 'a'.repeat(16); // 制限超過
      
      const result = await userEndpoints.getUserInfo(tooLongUsername);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Username too long');
    });

    it('should handle minimum and maximum follower counts in search', async () => {
      mockHttpClient.get.mockResolvedValue({ data: [], meta: { result_count: 0 } });

      const result = await userEndpoints.searchUsers({
        query: 'test',
        minFollowers: 0,
        maxFollowers: 999999999
      });

      expect(result.success).toBe(true);
    });
  });

  describe('エラー回復テスト', () => {
    it('should retry on temporary network failures', async () => {
      let callCount = 0;
      mockHttpClient.get.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Temporary network error'));
        }
        return Promise.resolve({
          data: {
            id: '123',
            username: 'test',
            name: 'Test',
            public_metrics: { followers_count: 100 }
          }
        });
      });

      const result = await userEndpoints.getUserInfo('test_user');

      expect(result.success).toBe(true);
      expect(callCount).toBe(3);
    });

    it('should handle malformed user data gracefully', async () => {
      mockHttpClient.get.mockResolvedValue({
        data: null // 不正なレスポンス
      });

      const result = await userEndpoints.getUserInfo('test_user');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid user data');
    });
  });
});