/**
 * TweetEndpoints ツイート取得機能テスト
 * 
 * テスト対象: src/kaito-api/endpoints/tweet-endpoints.ts - ツイート取得メソッド
 * 目的: 単体・複数ツイート取得機能の動作確認
 * 
 * テストカテゴリ:
 * - getTweet: 単体ツイート取得機能
 * - getMultipleTweets: 複数ツイート取得機能
 * - TweetDataの正確な構造化
 * - エラーハンドリング・異常系
 */

import { TweetEndpoints } from '../../../src/kaito-api/endpoints/tweet-endpoints';
import type { 
  KaitoAPIConfig,
  TweetData
} from '../../../src/kaito-api/types';

describe('TweetEndpoints - ツイート取得機能', () => {
  let tweetEndpoints: TweetEndpoints;
  let mockConfig: KaitoAPIConfig;
  let mockHttpClient: any;

  beforeEach(() => {
    // モック設定の準備
    mockConfig = {
      environment: 'dev',
      api: {
        baseUrl: 'https://api.kaito.com',
        version: 'v1',
        timeout: 30000,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          retryConditions: ['TIMEOUT', 'RATE_LIMIT']
        }
      },
      authentication: {
        primaryKey: 'test-key',
        keyRotationInterval: 86400,
        encryptionEnabled: true
      },
      performance: {
        qpsLimit: 10,
        responseTimeTarget: 1000,
        cacheEnabled: true,
        cacheTTL: 300
      },
      monitoring: {
        metricsEnabled: true,
        logLevel: 'info',
        alertingEnabled: false,
        healthCheckInterval: 60
      },
      security: {
        rateLimitEnabled: true,
        ipWhitelist: [],
        auditLoggingEnabled: true,
        encryptionKey: 'test-encryption-key'
      },
      features: {
        realApiEnabled: false,
        mockFallbackEnabled: true,
        batchProcessingEnabled: true,
        advancedCachingEnabled: false
      },
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'test',
        checksum: 'test-checksum'
      }
    } as KaitoAPIConfig;

    // モックHTTPクライアントの準備
    mockHttpClient = {
      get: jest.fn()
    };

    tweetEndpoints = new TweetEndpoints(mockConfig, mockHttpClient);

    // コンソール出力をモック化
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getTweet - 単体ツイート取得機能', () => {
    describe('正常系', () => {
      it('有効なIDでツイート取得成功', async () => {
        const mockResponse = {
          data: {
            id: '123456789',
            text: 'This is a test tweet',
            author_id: 'user123',
            created_at: '2024-01-01T12:00:00Z',
            public_metrics: {
              retweet_count: 15,
              like_count: 50,
              quote_count: 5,
              reply_count: 10,
              impression_count: 1000
            },
            context_annotations: [
              {
                domain: { name: 'Technology' },
                entity: { name: 'Programming', description: 'Software development' }
              }
            ],
            attachments: {
              media_keys: ['media_456'],
              poll_ids: []
            },
            referenced_tweets: [
              { type: 'replied_to', id: '987654321' }
            ],
            in_reply_to_user_id: 'user456',
            conversation_id: 'conv789',
            lang: 'en'
          }
        };
        mockHttpClient.get.mockResolvedValue(mockResponse);

        const tweetId = '123456789';
        const result = await tweetEndpoints.getTweet(tweetId);

        expect(mockHttpClient.get).toHaveBeenCalledWith(`/tweets/${tweetId}`, {
          'tweet.fields': 'id,text,author_id,created_at,public_metrics,context_annotations,attachments,referenced_tweets,in_reply_to_user_id,conversation_id,lang'
        });

        expect(result.id).toBe('123456789');
        expect(result.text).toBe('This is a test tweet');
        expect(result.authorId).toBe('user123');
        expect(result.createdAt).toBe('2024-01-01T12:00:00Z');

        expect(result.publicMetrics.retweetCount).toBe(15);
        expect(result.publicMetrics.likeCount).toBe(50);
        expect(result.publicMetrics.quoteCount).toBe(5);
        expect(result.publicMetrics.replyCount).toBe(10);
        expect(result.publicMetrics.impressionCount).toBe(1000);

        expect(result.contextAnnotations).toHaveLength(1);
        expect(result.contextAnnotations![0].domain).toBe('Technology');
        expect(result.contextAnnotations![0].entity).toBe('Programming');
        expect(result.contextAnnotations![0].description).toBe('Software development');

        expect(result.attachments).toEqual({
          media_keys: ['media_456'],
          poll_ids: []
        });

        expect(result.referencedTweets).toHaveLength(1);
        expect(result.referencedTweets![0].type).toBe('replied_to');
        expect(result.referencedTweets![0].id).toBe('987654321');

        expect(result.inReplyToUserId).toBe('user456');
        expect(result.conversationId).toBe('conv789');
        expect(result.lang).toBe('en');

        expect(console.log).toHaveBeenCalledWith('📄 ツイート取得中...', { tweetId });
        expect(console.log).toHaveBeenCalledWith('✅ ツイート取得完了:', { 
          id: '123456789', 
          likes: 50 
        });
      });

      it('最小限のフィールドを持つツイートの取得', async () => {
        const mockResponse = {
          data: {
            id: '987654321',
            text: 'Minimal tweet',
            author_id: 'user999',
            created_at: '2024-01-02T00:00:00Z',
            public_metrics: {
              retweet_count: 0,
              like_count: 1,
              quote_count: 0,
              reply_count: 0,
              impression_count: 5
            }
            // オプショナルフィールドは含まない
          }
        };
        mockHttpClient.get.mockResolvedValue(mockResponse);

        const result = await tweetEndpoints.getTweet('987654321');

        expect(result.id).toBe('987654321');
        expect(result.text).toBe('Minimal tweet');
        expect(result.authorId).toBe('user999');
        expect(result.publicMetrics.likeCount).toBe(1);

        // オプショナルフィールドはundefinedまたは未設定
        expect(result.contextAnnotations).toBeUndefined();
        expect(result.attachments).toBeUndefined();
        expect(result.referencedTweets).toBeUndefined();
        expect(result.inReplyToUserId).toBeUndefined();
        expect(result.conversationId).toBeUndefined();
        expect(result.lang).toBeUndefined();
      });

      it('複雑なcontext_annotationsの正確な変換', async () => {
        const mockResponse = {
          data: {
            id: '111111111',
            text: 'Tweet with complex annotations',
            author_id: 'user111',
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              retweet_count: 0,
              like_count: 0,
              quote_count: 0,
              reply_count: 0,
              impression_count: 0
            },
            context_annotations: [
              {
                domain: { name: 'Cryptocurrency' },
                entity: { name: 'Bitcoin', description: 'Digital currency' }
              },
              {
                domain: { name: 'Financial Markets' },
                entity: { name: 'Trading', description: 'Buying and selling assets' }
              },
              {
                domain: { name: 'Technology' },
                entity: { name: 'Blockchain', description: 'Distributed ledger technology' }
              }
            ]
          }
        };
        mockHttpClient.get.mockResolvedValue(mockResponse);

        const result = await tweetEndpoints.getTweet('111111111');

        expect(result.contextAnnotations).toHaveLength(3);
        expect(result.contextAnnotations![0].domain).toBe('Cryptocurrency');
        expect(result.contextAnnotations![0].entity).toBe('Bitcoin');
        expect(result.contextAnnotations![0].description).toBe('Digital currency');
        expect(result.contextAnnotations![1].domain).toBe('Financial Markets');
        expect(result.contextAnnotations![2].domain).toBe('Technology');
      });
    });

    describe('異常系', () => {
      it('空のツイートIDで取得失敗', async () => {
        await expect(tweetEndpoints.getTweet(''))
          .rejects.toThrow('Tweet ID is required');

        expect(mockHttpClient.get).not.toHaveBeenCalled();
      });

      it('スペースのみのツイートIDで取得失敗', async () => {
        await expect(tweetEndpoints.getTweet('   '))
          .rejects.toThrow('Tweet ID is required');
      });

      it('nullツイートIDで取得失敗', async () => {
        await expect(tweetEndpoints.getTweet(null as any))
          .rejects.toThrow('Tweet ID is required');
      });

      it('存在しないツイートIDでAPI呼び出し失敗', async () => {
        mockHttpClient.get.mockRejectedValue(new Error('Tweet not found'));

        await expect(tweetEndpoints.getTweet('999999999'))
          .rejects.toThrow('Failed to get tweet: Tweet not found');

        expect(console.error).toHaveBeenCalledWith('❌ ツイート取得エラー:', expect.any(Error));
      });

      it('HTTPネットワークエラー', async () => {
        mockHttpClient.get.mockRejectedValue(new Error('Network timeout'));

        await expect(tweetEndpoints.getTweet('123456789'))
          .rejects.toThrow('Failed to get tweet: Network timeout');
      });

      it('認証エラー', async () => {
        mockHttpClient.get.mockRejectedValue(new Error('Unauthorized'));

        await expect(tweetEndpoints.getTweet('123456789'))
          .rejects.toThrow('Failed to get tweet: Unauthorized');
      });

      it('不明なエラー時の処理', async () => {
        mockHttpClient.get.mockRejectedValue('Unknown error string');

        await expect(tweetEndpoints.getTweet('123456789'))
          .rejects.toThrow('Failed to get tweet: Unknown error');
      });
    });
  });

  describe('getMultipleTweets - 複数ツイート取得機能', () => {
    describe('正常系', () => {
      it('複数IDでの一括取得成功', async () => {
        const mockResponse = {
          data: [
            {
              id: '111111111',
              text: 'First tweet',
              author_id: 'user1',
              created_at: '2024-01-01T00:00:00Z',
              public_metrics: {
                retweet_count: 5,
                like_count: 10,
                quote_count: 2,
                reply_count: 3,
                impression_count: 100
              }
            },
            {
              id: '222222222',
              text: 'Second tweet',
              author_id: 'user2',
              created_at: '2024-01-02T00:00:00Z',
              public_metrics: {
                retweet_count: 8,
                like_count: 15,
                quote_count: 1,
                reply_count: 5,
                impression_count: 200
              }
            },
            {
              id: '333333333',
              text: 'Third tweet',
              author_id: 'user3',
              created_at: '2024-01-03T00:00:00Z',
              public_metrics: {
                retweet_count: 12,
                like_count: 25,
                quote_count: 4,
                reply_count: 8,
                impression_count: 300
              }
            }
          ]
        };
        mockHttpClient.get.mockResolvedValue(mockResponse);

        const tweetIds = ['111111111', '222222222', '333333333'];
        const result = await tweetEndpoints.getMultipleTweets(tweetIds);

        expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets', {
          ids: '111111111,222222222,333333333',
          'tweet.fields': 'id,text,author_id,created_at,public_metrics'
        });

        expect(result).toHaveLength(3);

        expect(result[0].id).toBe('111111111');
        expect(result[0].text).toBe('First tweet');
        expect(result[0].authorId).toBe('user1');
        expect(result[0].publicMetrics.retweetCount).toBe(5);

        expect(result[1].id).toBe('222222222');
        expect(result[1].text).toBe('Second tweet');
        expect(result[1].publicMetrics.likeCount).toBe(15);

        expect(result[2].id).toBe('333333333');
        expect(result[2].publicMetrics.impressionCount).toBe(300);

        expect(console.log).toHaveBeenCalledWith('📄📄 複数ツイート取得中...', { count: 3 });
        expect(console.log).toHaveBeenCalledWith('✅ 複数ツイート取得完了:', { count: 3 });
      });

      it('単一IDでの複数取得（配列に1つ）', async () => {
        const mockResponse = {
          data: [
            {
              id: '444444444',
              text: 'Single tweet in array',
              author_id: 'user4',
              created_at: '2024-01-04T00:00:00Z',
              public_metrics: {
                retweet_count: 1,
                like_count: 2,
                quote_count: 0,
                reply_count: 1,
                impression_count: 50
              }
            }
          ]
        };
        mockHttpClient.get.mockResolvedValue(mockResponse);

        const result = await tweetEndpoints.getMultipleTweets(['444444444']);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('444444444');
        expect(result[0].text).toBe('Single tweet in array');
      });

      it('最大100件の制限確認', async () => {
        const mockResponse = {
          data: [] // 空のレスポンス
        };
        mockHttpClient.get.mockResolvedValue(mockResponse);

        const ids = Array.from({ length: 100 }, (_, i) => `tweet_${i}`);
        const result = await tweetEndpoints.getMultipleTweets(ids);

        expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets', {
          ids: ids.join(','),
          'tweet.fields': 'id,text,author_id,created_at,public_metrics'
        });
        expect(result).toHaveLength(0);
      });

      it('TweetDataの正確な構造化', async () => {
        const mockResponse = {
          data: [
            {
              id: '555555555',
              text: 'Complete structure test',
              author_id: 'user5',
              created_at: '2024-01-05T12:30:45Z',
              public_metrics: {
                retweet_count: 20,
                like_count: 40,
                quote_count: 8,
                reply_count: 15,
                impression_count: 800
              }
            }
          ]
        };
        mockHttpClient.get.mockResolvedValue(mockResponse);

        const result = await tweetEndpoints.getMultipleTweets(['555555555']);

        const tweet = result[0];
        expect(tweet.id).toBe('555555555');
        expect(tweet.text).toBe('Complete structure test');
        expect(tweet.authorId).toBe('user5');
        expect(tweet.createdAt).toBe('2024-01-05T12:30:45Z');
        expect(tweet.publicMetrics.retweetCount).toBe(20);
        expect(tweet.publicMetrics.likeCount).toBe(40);
        expect(tweet.publicMetrics.quoteCount).toBe(8);
        expect(tweet.publicMetrics.replyCount).toBe(15);
        expect(tweet.publicMetrics.impressionCount).toBe(800);
      });
    });

    describe('異常系', () => {
      it('空配列でツイート取得失敗', async () => {
        await expect(tweetEndpoints.getMultipleTweets([]))
          .rejects.toThrow('Tweet IDs are required');

        expect(mockHttpClient.get).not.toHaveBeenCalled();
      });

      it('nullまたはundefined配列で取得失敗', async () => {
        await expect(tweetEndpoints.getMultipleTweets(null as any))
          .rejects.toThrow('Failed to get multiple tweets: Cannot read properties of null');

        await expect(tweetEndpoints.getMultipleTweets(undefined as any))
          .rejects.toThrow('Failed to get multiple tweets: Cannot read properties of undefined');
      });

      it('100件超過で取得失敗', async () => {
        const ids = Array.from({ length: 101 }, (_, i) => `tweet_${i}`);

        await expect(tweetEndpoints.getMultipleTweets(ids))
          .rejects.toThrow('Maximum 100 tweet IDs allowed per request');

        expect(mockHttpClient.get).not.toHaveBeenCalled();
      });

      it('HTTPエラー時に例外が投げられる', async () => {
        mockHttpClient.get.mockRejectedValue(new Error('API error'));

        await expect(tweetEndpoints.getMultipleTweets(['123', '456']))
          .rejects.toThrow('Failed to get multiple tweets: API error');

        expect(console.error).toHaveBeenCalledWith('❌ 複数ツイート取得エラー:', expect.any(Error));
      });

      it('一部のツイートが存在しない場合の処理', async () => {
        mockHttpClient.get.mockRejectedValue(new Error('Some tweets not found'));

        await expect(tweetEndpoints.getMultipleTweets(['existing', 'nonexistent']))
          .rejects.toThrow('Failed to get multiple tweets: Some tweets not found');
      });

      it('ネットワークエラー', async () => {
        mockHttpClient.get.mockRejectedValue(new Error('Network error'));

        await expect(tweetEndpoints.getMultipleTweets(['123']))
          .rejects.toThrow('Failed to get multiple tweets: Network error');
      });

      it('認証エラー', async () => {
        mockHttpClient.get.mockRejectedValue(new Error('Unauthorized access'));

        await expect(tweetEndpoints.getMultipleTweets(['123']))
          .rejects.toThrow('Failed to get multiple tweets: Unauthorized access');
      });
    });

    describe('制限・境界値テスト', () => {
      it('99件での取得（制限以内）', async () => {
        const mockResponse = {
          data: Array.from({ length: 99 }, (_, i) => ({
            id: `tweet_${i}`,
            text: `Tweet ${i}`,
            author_id: `user_${i}`,
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              retweet_count: i,
              like_count: i * 2,
              quote_count: 0,
              reply_count: 0,
              impression_count: i * 10
            }
          }))
        };
        mockHttpClient.get.mockResolvedValue(mockResponse);

        const ids = Array.from({ length: 99 }, (_, i) => `tweet_${i}`);
        const result = await tweetEndpoints.getMultipleTweets(ids);

        expect(result).toHaveLength(99);
        expect(result[0].id).toBe('tweet_0');
        expect(result[98].id).toBe('tweet_98');
      });

      it('100件での取得（制限ちょうど）', async () => {
        const mockResponse = {
          data: Array.from({ length: 100 }, (_, i) => ({
            id: `tweet_${i}`,
            text: `Tweet ${i}`,
            author_id: `user_${i}`,
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              retweet_count: 0,
              like_count: 0,
              quote_count: 0,
              reply_count: 0,
              impression_count: 0
            }
          }))
        };
        mockHttpClient.get.mockResolvedValue(mockResponse);

        const ids = Array.from({ length: 100 }, (_, i) => `tweet_${i}`);
        const result = await tweetEndpoints.getMultipleTweets(ids);

        expect(result).toHaveLength(100);
        expect(result[99].id).toBe('tweet_99');
      });
    });
  });

  describe('共通機能テスト', () => {
    describe('データ変換処理', () => {
      it('publicMetricsの全フィールドが正確に変換される', async () => {
        const mockResponse = {
          data: {
            id: '666666666',
            text: 'Metrics test',
            author_id: 'metrics_user',
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              retweet_count: 123,
              like_count: 456,
              quote_count: 78,
              reply_count: 90,
              impression_count: 9999
            }
          }
        };
        mockHttpClient.get.mockResolvedValue(mockResponse);

        const result = await tweetEndpoints.getTweet('666666666');

        expect(result.publicMetrics.retweetCount).toBe(123);
        expect(result.publicMetrics.likeCount).toBe(456);
        expect(result.publicMetrics.quoteCount).toBe(78);
        expect(result.publicMetrics.replyCount).toBe(90);
        expect(result.publicMetrics.impressionCount).toBe(9999);
      });

      it('attachments構造の正確な変換', async () => {
        const mockResponse = {
          data: {
            id: '777777777',
            text: 'Attachments test',
            author_id: 'attach_user',
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              retweet_count: 0,
              like_count: 0,
              quote_count: 0,
              reply_count: 0,
              impression_count: 0
            },
            attachments: {
              media_keys: ['media1', 'media2', 'media3'],
              poll_ids: ['poll1']
            }
          }
        };
        mockHttpClient.get.mockResolvedValue(mockResponse);

        const result = await tweetEndpoints.getTweet('777777777');

        expect(result.attachments).toEqual({
          media_keys: ['media1', 'media2', 'media3'],
          poll_ids: ['poll1']
        });
      });
    });

    describe('コンソール出力確認', () => {
      it('getTweetの正常時ログ出力', async () => {
        const mockResponse = {
          data: {
            id: '888888888',
            text: 'Log test',
            author_id: 'log_user',
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              retweet_count: 0,
              like_count: 33,
              quote_count: 0,
              reply_count: 0,
              impression_count: 0
            }
          }
        };
        mockHttpClient.get.mockResolvedValue(mockResponse);

        await tweetEndpoints.getTweet('888888888');

        expect(console.log).toHaveBeenCalledWith('📄 ツイート取得中...', { tweetId: '888888888' });
        expect(console.log).toHaveBeenCalledWith('✅ ツイート取得完了:', { 
          id: '888888888', 
          likes: 33 
        });
      });

      it('getMultipleTweetsの正常時ログ出力', async () => {
        const mockResponse = {
          data: [
            {
              id: '999999999',
              text: 'Multi log test',
              author_id: 'multi_user',
              created_at: '2024-01-01T00:00:00Z',
              public_metrics: {
                retweet_count: 0,
                like_count: 0,
                quote_count: 0,
                reply_count: 0,
                impression_count: 0
              }
            }
          ]
        };
        mockHttpClient.get.mockResolvedValue(mockResponse);

        await tweetEndpoints.getMultipleTweets(['999999999']);

        expect(console.log).toHaveBeenCalledWith('📄📄 複数ツイート取得中...', { count: 1 });
        expect(console.log).toHaveBeenCalledWith('✅ 複数ツイート取得完了:', { count: 1 });
      });
    });
  });
});