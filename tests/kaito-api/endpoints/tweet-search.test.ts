/**
 * TweetEndpoints ツイート検索機能テスト
 * 
 * テスト対象: src/kaito-api/endpoints/tweet-endpoints.ts - searchTweets メソッド
 * 目的: ツイート検索機能の全オプション・正常系・異常系の動作確認
 * 
 * テストカテゴリ:
 * - 基本検索機能
 * - 高度なオプション指定
 * - フィールド・展開オプション
 * - 異常系・エラーハンドリング
 * - データ変換処理
 */

import { TweetEndpoints } from '../../../src/kaito-api/endpoints/tweet-endpoints';
import type { 
  KaitoAPIConfig,
  TweetSearchOptions,
  TweetSearchResult,
  TweetData
} from '../../../src/kaito-api/types';

describe('TweetEndpoints - ツイート検索機能', () => {
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

  describe('基本検索機能', () => {
    it('基本クエリで検索成功', async () => {
      const mockResponse = {
        data: [
          {
            id: '123456789',
            text: 'Test tweet about crypto',
            author_id: 'user123',
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              retweet_count: 5,
              like_count: 10,
              quote_count: 2,
              reply_count: 3,
              impression_count: 100
            },
            context_annotations: [
              {
                domain: { name: 'Cryptocurrency' },
                entity: { name: 'Bitcoin', description: 'Digital currency' }
              }
            ],
            attachments: { media_keys: ['media_123'] },
            referenced_tweets: [
              { type: 'replied_to', id: '987654321' }
            ],
            in_reply_to_user_id: 'user456',
            conversation_id: 'conv123',
            lang: 'en'
          }
        ],
        meta: {
          result_count: 1,
          next_token: 'next123'
        }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const options: TweetSearchOptions = {
        query: 'crypto trading'
      };

      const result = await tweetEndpoints.searchTweets(options);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets/search/recent', {
        query: 'crypto trading',
        max_results: 50,
        sort_order: 'recency',
        'tweet.fields': 'id,text,author_id,created_at,public_metrics,context_annotations,attachments,referenced_tweets,in_reply_to_user_id,conversation_id,lang'
      });

      expect(result.tweets).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.nextToken).toBe('next123');
      expect(result.searchQuery).toBe('crypto trading');
      expect(result.timestamp).toBeDefined();

      // TweetDataの構造確認
      const tweet = result.tweets[0];
      expect(tweet.id).toBe('123456789');
      expect(tweet.text).toBe('Test tweet about crypto');
      expect(tweet.authorId).toBe('user123');
      expect(tweet.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(tweet.publicMetrics.retweetCount).toBe(5);
      expect(tweet.publicMetrics.likeCount).toBe(10);
      expect(tweet.contextAnnotations).toHaveLength(1);
      expect(tweet.contextAnnotations![0].domain).toBe('Cryptocurrency');
      expect(tweet.contextAnnotations![0].entity).toBe('Bitcoin');
      expect(tweet.lang).toBe('en');
    });

    it('検索結果が0件の場合', async () => {
      const mockResponse = {
        data: [],
        meta: {
          result_count: 0
        }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await tweetEndpoints.searchTweets({ query: 'nonexistent' });

      expect(result.tweets).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.nextToken).toBeUndefined();
      expect(result.searchQuery).toBe('nonexistent');
    });

    it('複数ツイートの検索結果処理', async () => {
      const mockResponse = {
        data: [
          {
            id: '111111111',
            text: 'First tweet',
            author_id: 'user1',
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              retweet_count: 1,
              like_count: 2,
              quote_count: 0,
              reply_count: 0,
              impression_count: 50
            }
          },
          {
            id: '222222222',
            text: 'Second tweet',
            author_id: 'user2',
            created_at: '2024-01-02T00:00:00Z',
            public_metrics: {
              retweet_count: 3,
              like_count: 4,
              quote_count: 1,
              reply_count: 2,
              impression_count: 75
            }
          }
        ],
        meta: {
          result_count: 2
        }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await tweetEndpoints.searchTweets({ query: 'multiple' });

      expect(result.tweets).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(result.tweets[0].id).toBe('111111111');
      expect(result.tweets[1].id).toBe('222222222');
    });
  });

  describe('オプション指定テスト', () => {
    it('最大結果数指定（上限100）', async () => {
      const mockResponse = {
        data: [],
        meta: { result_count: 0 }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const options: TweetSearchOptions = {
        query: 'test',
        maxResults: 25
      };

      await tweetEndpoints.searchTweets(options);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets/search/recent', 
        expect.objectContaining({
          max_results: 25
        })
      );
    });

    it('最大結果数100超過時の制限適用', async () => {
      const mockResponse = {
        data: [],
        meta: { result_count: 0 }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const options: TweetSearchOptions = {
        query: 'test',
        maxResults: 150 // 100を超過
      };

      await tweetEndpoints.searchTweets(options);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets/search/recent', 
        expect.objectContaining({
          max_results: 100 // 100に制限される
        })
      );
    });

    it('ソート順序指定（relevancy）', async () => {
      const mockResponse = {
        data: [],
        meta: { result_count: 0 }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const options: TweetSearchOptions = {
        query: 'test',
        sortOrder: 'relevancy'
      };

      await tweetEndpoints.searchTweets(options);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets/search/recent', 
        expect.objectContaining({
          sort_order: 'relevancy'
        })
      );
    });

    it('時間範囲指定（start_time/end_time）', async () => {
      const mockResponse = {
        data: [],
        meta: { result_count: 0 }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const options: TweetSearchOptions = {
        query: 'test',
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z'
      };

      await tweetEndpoints.searchTweets(options);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets/search/recent', 
        expect.objectContaining({
          start_time: '2024-01-01T00:00:00Z',
          end_time: '2024-01-02T00:00:00Z'
        })
      );
    });

    it('次ページトークン使用', async () => {
      const mockResponse = {
        data: [],
        meta: { result_count: 0 }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const options: TweetSearchOptions = {
        query: 'test',
        nextToken: 'token123'
      };

      await tweetEndpoints.searchTweets(options);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets/search/recent', 
        expect.objectContaining({
          next_token: 'token123'
        })
      );
    });

    it('言語指定', async () => {
      const mockResponse = {
        data: [],
        meta: { result_count: 0 }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const options: TweetSearchOptions = {
        query: 'test',
        lang: 'ja'
      };

      await tweetEndpoints.searchTweets(options);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets/search/recent', 
        expect.objectContaining({
          lang: 'ja'
        })
      );
    });

    it('リツイート除外設定', async () => {
      const mockResponse = {
        data: [],
        meta: { result_count: 0 }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const options: TweetSearchOptions = {
        query: 'test',
        includeRetweets: false
      };

      await tweetEndpoints.searchTweets(options);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets/search/recent', 
        expect.objectContaining({
          query: 'test -is:retweet'
        })
      );
    });

    it('リツイート含有設定（デフォルト）', async () => {
      const mockResponse = {
        data: [],
        meta: { result_count: 0 }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const options: TweetSearchOptions = {
        query: 'test',
        includeRetweets: true
      };

      await tweetEndpoints.searchTweets(options);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets/search/recent', 
        expect.objectContaining({
          query: 'test' // -is:retweetが追加されない
        })
      );
    });
  });

  describe('フィールド・展開テスト', () => {
    it('デフォルトツイートフィールド設定', async () => {
      const mockResponse = {
        data: [],
        meta: { result_count: 0 }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      await tweetEndpoints.searchTweets({ query: 'test' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets/search/recent', 
        expect.objectContaining({
          'tweet.fields': 'id,text,author_id,created_at,public_metrics,context_annotations,attachments,referenced_tweets,in_reply_to_user_id,conversation_id,lang'
        })
      );
    });

    it('カスタムフィールド指定', async () => {
      const mockResponse = {
        data: [],
        meta: { result_count: 0 }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const options: TweetSearchOptions = {
        query: 'test',
        tweetFields: ['id', 'text', 'author_id']
      };

      await tweetEndpoints.searchTweets(options);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets/search/recent', 
        expect.objectContaining({
          'tweet.fields': 'id,text,author_id'
        })
      );
    });

    it('展開オプション指定', async () => {
      const mockResponse = {
        data: [],
        meta: { result_count: 0 }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const options: TweetSearchOptions = {
        query: 'test',
        expansions: ['author_id', 'referenced_tweets.id']
      };

      await tweetEndpoints.searchTweets(options);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets/search/recent', 
        expect.objectContaining({
          expansions: 'author_id,referenced_tweets.id'
        })
      );
    });
  });

  describe('複合オプション設定', () => {
    it('全オプションを組み合わせた検索', async () => {
      const mockResponse = {
        data: [],
        meta: { result_count: 0 }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const options: TweetSearchOptions = {
        query: 'crypto trading',
        maxResults: 20,
        sortOrder: 'relevancy',
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
        nextToken: 'token456',
        lang: 'en',
        includeRetweets: false,
        tweetFields: ['id', 'text', 'created_at'],
        expansions: ['author_id']
      };

      await tweetEndpoints.searchTweets(options);

      expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets/search/recent', {
        query: 'crypto trading -is:retweet',
        max_results: 20,
        sort_order: 'relevancy',
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-01-02T00:00:00Z',
        next_token: 'token456',
        lang: 'en',
        'tweet.fields': 'id,text,created_at',
        expansions: 'author_id'
      });
    });
  });

  describe('データ変換処理', () => {
    it('完全なTweetDataへの正確な変換', async () => {
      const mockResponse = {
        data: [
          {
            id: '123456789',
            text: 'Complete tweet data',
            author_id: 'user123',
            created_at: '2024-01-01T12:00:00Z',
            public_metrics: {
              retweet_count: 10,
              like_count: 25,
              quote_count: 5,
              reply_count: 8,
              impression_count: 500
            },
            context_annotations: [
              {
                domain: { name: 'Technology' },
                entity: { name: 'AI', description: 'Artificial Intelligence' }
              },
              {
                domain: { name: 'Business' },
                entity: { name: 'Startup', description: 'New business venture' }
              }
            ],
            attachments: {
              media_keys: ['media_1', 'media_2'],
              poll_ids: ['poll_1']
            },
            referenced_tweets: [
              { type: 'retweeted', id: '987654321' },
              { type: 'quoted', id: '555555555' }
            ],
            in_reply_to_user_id: 'user456',
            conversation_id: 'conv789',
            lang: 'en'
          }
        ],
        meta: {
          result_count: 1
        }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await tweetEndpoints.searchTweets({ query: 'complete' });

      const tweet = result.tweets[0];
      expect(tweet.id).toBe('123456789');
      expect(tweet.text).toBe('Complete tweet data');
      expect(tweet.authorId).toBe('user123');
      expect(tweet.createdAt).toBe('2024-01-01T12:00:00Z');
      
      expect(tweet.publicMetrics.retweetCount).toBe(10);
      expect(tweet.publicMetrics.likeCount).toBe(25);
      expect(tweet.publicMetrics.quoteCount).toBe(5);
      expect(tweet.publicMetrics.replyCount).toBe(8);
      expect(tweet.publicMetrics.impressionCount).toBe(500);

      expect(tweet.contextAnnotations).toHaveLength(2);
      expect(tweet.contextAnnotations![0].domain).toBe('Technology');
      expect(tweet.contextAnnotations![0].entity).toBe('AI');
      expect(tweet.contextAnnotations![0].description).toBe('Artificial Intelligence');
      expect(tweet.contextAnnotations![1].domain).toBe('Business');

      expect(tweet.attachments).toEqual({
        media_keys: ['media_1', 'media_2'],
        poll_ids: ['poll_1']
      });

      expect(tweet.referencedTweets).toHaveLength(2);
      expect(tweet.referencedTweets![0].type).toBe('retweeted');
      expect(tweet.referencedTweets![0].id).toBe('987654321');
      expect(tweet.referencedTweets![1].type).toBe('quoted');

      expect(tweet.inReplyToUserId).toBe('user456');
      expect(tweet.conversationId).toBe('conv789');
      expect(tweet.lang).toBe('en');
    });

    it('オプショナルフィールドが未定義でも正常処理', async () => {
      const mockResponse = {
        data: [
          {
            id: '999999999',
            text: 'Minimal tweet data',
            author_id: 'user999',
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              retweet_count: 0,
              like_count: 0,
              quote_count: 0,
              reply_count: 0,
              impression_count: 1
            }
            // オプショナルフィールドは含まない
          }
        ],
        meta: {
          result_count: 1
        }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await tweetEndpoints.searchTweets({ query: 'minimal' });

      const tweet = result.tweets[0];
      expect(tweet.id).toBe('999999999');
      expect(tweet.contextAnnotations).toBeUndefined();
      expect(tweet.attachments).toBeUndefined();
      expect(tweet.referencedTweets).toBeUndefined();
      expect(tweet.inReplyToUserId).toBeUndefined();
      expect(tweet.conversationId).toBeUndefined();
      expect(tweet.lang).toBeUndefined();
    });
  });

  describe('異常系・エラーハンドリング', () => {
    it('空クエリで検索失敗', async () => {
      const options: TweetSearchOptions = {
        query: ''
      };

      await expect(tweetEndpoints.searchTweets(options))
        .rejects.toThrow('Search query is required');

      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('スペースのみのクエリで検索失敗', async () => {
      const options: TweetSearchOptions = {
        query: '   '
      };

      await expect(tweetEndpoints.searchTweets(options))
        .rejects.toThrow('Search query is required');
    });

    it('nullクエリで検索失敗', async () => {
      const options: TweetSearchOptions = {
        query: null as any
      };

      await expect(tweetEndpoints.searchTweets(options))
        .rejects.toThrow('Search query is required');
    });

    it('HTTPエラー時に例外が投げられる', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('API error'));

      await expect(tweetEndpoints.searchTweets({ query: 'test' }))
        .rejects.toThrow('Failed to search tweets: API error');

      expect(console.error).toHaveBeenCalledWith('❌ ツイート検索エラー:', expect.any(Error));
    });

    it('ネットワークタイムアウトエラー', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network timeout'));

      await expect(tweetEndpoints.searchTweets({ query: 'test' }))
        .rejects.toThrow('Failed to search tweets: Network timeout');
    });

    it('レート制限エラー', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(tweetEndpoints.searchTweets({ query: 'test' }))
        .rejects.toThrow('Failed to search tweets: Rate limit exceeded');
    });

    it('認証エラー', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(tweetEndpoints.searchTweets({ query: 'test' }))
        .rejects.toThrow('Failed to search tweets: Unauthorized');
    });

    it('不明なエラー時の処理', async () => {
      mockHttpClient.get.mockRejectedValue('Unknown error string');

      await expect(tweetEndpoints.searchTweets({ query: 'test' }))
        .rejects.toThrow('Failed to search tweets: Unknown error');
    });

    it('不正なパラメータでの処理', async () => {
      const options: TweetSearchOptions = {
        query: 'test',
        maxResults: -1 // 不正な値
      };

      // maxResultsは内部でMath.minで制御されるため、エラーにはならない
      const mockResponse = {
        data: [],
        meta: { result_count: 0 }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await tweetEndpoints.searchTweets(options);

      expect(result.tweets).toHaveLength(0);
      // Math.min(-1, 100) = -1 が設定される
      expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets/search/recent', 
        expect.objectContaining({
          max_results: -1
        })
      );
    });
  });

  describe('コンソール出力確認', () => {
    it('正常な検索時のログ出力', async () => {
      const mockResponse = {
        data: [{ id: '123', text: 'test', author_id: 'user', created_at: '2024-01-01T00:00:00Z', public_metrics: { retweet_count: 0, like_count: 0, quote_count: 0, reply_count: 0, impression_count: 0 } }],
        meta: { result_count: 1 }
      };
      mockHttpClient.get.mockResolvedValue(mockResponse);

      await tweetEndpoints.searchTweets({ query: 'test query' });

      expect(console.log).toHaveBeenCalledWith('🔍 ツイート検索実行中...', { query: 'test query' });
      expect(console.log).toHaveBeenCalledWith('✅ ツイート検索完了:', { query: 'test query', count: 1 });
    });

    it('エラー時のログ出力', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Test error'));

      await expect(tweetEndpoints.searchTweets({ query: 'error' }))
        .rejects.toThrow();

      expect(console.error).toHaveBeenCalledWith('❌ ツイート検索エラー:', expect.any(Error));
    });
  });
});