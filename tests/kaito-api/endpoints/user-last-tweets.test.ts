/**
 * UserLastTweetsEndpoint - 完全テスト
 * TASK-002 準拠: getUserLastTweetsメソッドの包括的テスト
 * 
 * テスト対象:
 * - getUserLastTweets() - ユーザー最新ツイート取得機能
 * - getBatchUserLastTweets() - バッチ取得機能
 * - 正常系・異常系・境界値テスト完全実装
 */

import { UserLastTweetsEndpoint } from '../../../src/kaito-api/endpoints/read-only/user-last-tweets';
import type {
  UserLastTweetsParams,
  UserLastTweetsResponse,
  Tweet
} from '../../../src/kaito-api/endpoints/read-only/types';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('UserLastTweetsEndpoint - getUserLastTweetsメソッド完全テスト (TASK-002準拠)', () => {
  let userLastTweetsEndpoint: UserLastTweetsEndpoint;
  let mockHttpClient: any;
  let mockAuthManager: any;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn()
    };

    mockAuthManager = {
      ensureAuthenticated: vi.fn()
    };

    userLastTweetsEndpoint = new UserLastTweetsEndpoint(mockHttpClient, mockAuthManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserLastTweets - ユーザー最新ツイート取得機能', () => {
    describe('正常系テスト', () => {
      it('基本的なユーザーツイート取得が成功すること', async () => {
        const mockResponse = {
          success: true,
          tweets: [
            {
              id: '1234567890',
              text: '投資に関する教育的なツイート',
              author_id: '123456789',
              author_username: 'financialjuice',
              created_at: '2024-01-01T00:00:00.000Z',
              public_metrics: {
                like_count: 10,
                retweet_count: 5,
                reply_count: 2,
                quote_count: 1
              },
              lang: 'ja',
              possibly_sensitive: false
            }
          ],
          cursor: 'next_cursor_123',
          has_more: true
        };

        mockHttpClient.get.mockResolvedValue(mockResponse);

        const params: UserLastTweetsParams = {
          userName: 'financialjuice',
          limit: 20,
          includeReplies: false
        };

        const result = await userLastTweetsEndpoint.getUserLastTweets(params);

        expect(mockHttpClient.get).toHaveBeenCalledWith('/twitter/user_last_tweets', {
          userName: 'financialjuice',
          limit: '20',
          includeReplies: 'false'
        });

        expect(result).toEqual({
          success: true,
          tweets: mockResponse.tweets,
          cursor: 'next_cursor_123',
          has_more: true
        });
      });

      it('ページネーションパラメータ付きでツイート取得が成功すること', async () => {
        const mockResponse = {
          success: true,
          tweets: [],
          cursor: 'next_cursor_456',
          has_more: false
        };

        mockHttpClient.get.mockResolvedValue(mockResponse);

        const params: UserLastTweetsParams = {
          userName: 'testuser',
          cursor: 'prev_cursor_123'
        };

        const result = await userLastTweetsEndpoint.getUserLastTweets(params);

        expect(mockHttpClient.get).toHaveBeenCalledWith('/twitter/user_last_tweets', {
          userName: 'testuser',
          cursor: 'prev_cursor_123'
        });

        expect(result).toEqual(mockResponse);
      });

      it('リプライを含めてツイート取得が成功すること', async () => {
        const mockResponse = {
          success: true,
          tweets: [
            {
              id: '9876543210',
              text: '@someone への返信ツイート',
              author_id: '123456789',
              author_username: 'testuser',
              created_at: '2024-01-01T12:00:00.000Z',
              public_metrics: {
                like_count: 2,
                retweet_count: 0,
                reply_count: 1,
                quote_count: 0
              },
              referenced_tweets: [{ type: 'replied_to', id: '1111111111' }],
              lang: 'ja',
              possibly_sensitive: false
            }
          ]
        };

        mockHttpClient.get.mockResolvedValue(mockResponse);

        const params: UserLastTweetsParams = {
          userName: 'testuser',
          includeReplies: true
        };

        const result = await userLastTweetsEndpoint.getUserLastTweets(params);

        expect(mockHttpClient.get).toHaveBeenCalledWith('/twitter/user_last_tweets', {
          userName: 'testuser',
          includeReplies: 'true'
        });

        expect(result.tweets[0].referenced_tweets).toBeDefined();
      });
    });

    describe('異常系テスト', () => {
      it('必須パラメータuserNameが欠落している場合エラーを返すこと', async () => {
        const params = {
          limit: 20
        } as UserLastTweetsParams;

        const result = await userLastTweetsEndpoint.getUserLastTweets(params);

        expect(result).toEqual({
          success: false,
          error: 'Missing required parameter: userName',
          tweets: []
        });
      });

      it('APIエラーレスポンスを適切に処理すること', async () => {
        const mockErrorResponse = {
          success: false,
          error: 'User not found'
        };

        mockHttpClient.get.mockResolvedValue(mockErrorResponse);

        const params: UserLastTweetsParams = {
          userName: 'nonexistentuser'
        };

        const result = await userLastTweetsEndpoint.getUserLastTweets(params);

        expect(result).toEqual({
          success: false,
          error: 'User not found',
          tweets: []
        });
      });

      it('ネットワークエラーを適切に処理すること', async () => {
        mockHttpClient.get.mockRejectedValue(new Error('Network error'));

        const params: UserLastTweetsParams = {
          userName: 'testuser'
        };

        const result = await userLastTweetsEndpoint.getUserLastTweets(params);

        expect(result).toEqual({
          success: false,
          error: 'Failed to getUserLastTweets: Network error',
          tweets: []
        });
      });

      it('不正なレスポンス形式を適切に処理すること', async () => {
        mockHttpClient.get.mockResolvedValue({
          // success プロパティが欠落
          data: 'invalid response'
        });

        const params: UserLastTweetsParams = {
          userName: 'testuser'
        };

        const result = await userLastTweetsEndpoint.getUserLastTweets(params);

        expect(result).toEqual({
          success: false,
          error: 'Failed to fetch user tweets',
          tweets: []
        });
      });
    });

    describe('データ正規化テスト', () => {
      it('様々な形式のツイートデータを正規化すること', async () => {
        const mockResponse = {
          success: true,
          tweets: [
            // 新形式のツイート
            {
              id: '1234567890',
              text: 'Modern tweet format',
              author_id: '123456789',
              author_username: 'user1',
              created_at: '2024-01-01T00:00:00.000Z',
              public_metrics: {
                like_count: 10,
                retweet_count: 5,
                reply_count: 2,
                quote_count: 1
              }
            },
            // 旧形式のツイート
            {
              id_str: '9876543210',
              full_text: 'Legacy tweet format',
              user: {
                id_str: '987654321',
                screen_name: 'user2'
              },
              created_at: '2024-01-02T00:00:00.000Z',
              favorite_count: 20,
              retweet_count: 10
            },
            // 最小限のデータ
            {
              id: '5555555555',
              created_at: '2024-01-03T00:00:00.000Z'
            }
          ]
        };

        mockHttpClient.get.mockResolvedValue(mockResponse);

        const params: UserLastTweetsParams = {
          userName: 'testuser'
        };

        const result = await userLastTweetsEndpoint.getUserLastTweets(params);

        // 1つ目のツイート（新形式）
        expect(result.tweets[0]).toEqual({
          id: '1234567890',
          text: 'Modern tweet format',
          author_id: '123456789',
          author_username: 'user1',
          created_at: '2024-01-01T00:00:00.000Z',
          public_metrics: {
            like_count: 10,
            retweet_count: 5,
            reply_count: 2,
            quote_count: 1
          },
          entities: undefined,
          referenced_tweets: undefined,
          lang: undefined,
          possibly_sensitive: undefined
        });

        // 2つ目のツイート（旧形式）
        expect(result.tweets[1]).toEqual({
          id: '9876543210',
          text: 'Legacy tweet format',
          author_id: '987654321',
          author_username: 'user2',
          created_at: '2024-01-02T00:00:00.000Z',
          public_metrics: {
            like_count: 20,
            retweet_count: 10,
            reply_count: 0,
            quote_count: 0
          },
          entities: undefined,
          referenced_tweets: undefined,
          lang: undefined,
          possibly_sensitive: undefined
        });

        // 3つ目のツイート（最小限）
        expect(result.tweets[2]).toEqual({
          id: '5555555555',
          text: '',
          author_id: undefined,
          author_username: undefined,
          created_at: '2024-01-03T00:00:00.000Z',
          public_metrics: {
            like_count: 0,
            retweet_count: 0,
            reply_count: 0,
            quote_count: 0
          },
          entities: undefined,
          referenced_tweets: undefined,
          lang: undefined,
          possibly_sensitive: undefined
        });
      });
    });
  });

  describe('getBatchUserLastTweets - バッチ取得機能', () => {
    describe('正常系テスト', () => {
      it('複数ユーザーのツイートをバッチ取得できること', async () => {
        const mockResponses = {
          user1: {
            success: true,
            tweets: [{ id: '1', text: 'User1 tweet' }]
          },
          user2: {
            success: true,
            tweets: [{ id: '2', text: 'User2 tweet' }]
          }
        };

        mockHttpClient.get.mockImplementation((endpoint, params) => {
          if (params.userName === 'user1') {
            return Promise.resolve(mockResponses.user1);
          } else if (params.userName === 'user2') {
            return Promise.resolve(mockResponses.user2);
          }
          return Promise.reject(new Error('Unknown user'));
        });

        const usernames = ['user1', 'user2'];
        const result = await userLastTweetsEndpoint.getBatchUserLastTweets(usernames, 10);

        expect(result.size).toBe(2);
        
        // 正規化されたレスポンスをチェック
        const user1Result = result.get('user1');
        expect(user1Result?.success).toBe(true);
        expect(user1Result?.tweets.length).toBe(1);
        expect(user1Result?.tweets[0].id).toBe('1');
        expect(user1Result?.tweets[0].text).toBe('User1 tweet');
        
        const user2Result = result.get('user2');
        expect(user2Result?.success).toBe(true);
        expect(user2Result?.tweets.length).toBe(1);
        expect(user2Result?.tweets[0].id).toBe('2');
        expect(user2Result?.tweets[0].text).toBe('User2 tweet');

        expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      });

      it('大量のユーザーを適切にバッチ処理すること', async () => {
        const usernames = Array.from({ length: 12 }, (_, i) => `user${i + 1}`);
        
        mockHttpClient.get.mockResolvedValue({
          success: true,
          tweets: []
        });

        const startTime = Date.now();
        const result = await userLastTweetsEndpoint.getBatchUserLastTweets(usernames, 5);
        const endTime = Date.now();

        expect(result.size).toBe(12);
        expect(mockHttpClient.get).toHaveBeenCalledTimes(12);
        
        // バッチ処理により適切な遅延が入っていることを確認（3バッチ × 100ms = 200ms以上）
        expect(endTime - startTime).toBeGreaterThanOrEqual(200);
      });
    });

    describe('異常系テスト', () => {
      it('一部のユーザー取得が失敗してもバッチ処理を継続すること', async () => {
        mockHttpClient.get.mockImplementation((endpoint, params) => {
          if (params.userName === 'user2') {
            return Promise.resolve({
              success: false,
              error: 'User not found',
              tweets: []
            });
          }
          return Promise.resolve({
            success: true,
            tweets: [{ id: '1', text: 'Tweet' }]
          });
        });

        const usernames = ['user1', 'user2', 'user3'];
        const result = await userLastTweetsEndpoint.getBatchUserLastTweets(usernames);

        expect(result.size).toBe(3);
        expect(result.get('user1')?.success).toBe(true);
        expect(result.get('user2')?.success).toBe(false);
        expect(result.get('user3')?.success).toBe(true);
      });
    });
  });
});