/**
 * TweetEndpoints 統合テスト
 * 
 * テスト対象: src/kaito-api/endpoints/tweet-endpoints.ts - 全機能連携
 * 目的: 全機能の統合動作確認・execution-flow.ts互換性確認
 * 
 * テストカテゴリ:
 * - 全機能連携テスト
 * - execution-flow.ts互換性確認
 * - エラー回復・リトライ処理
 * - 実際のワークフロー模擬
 */

import { TweetEndpoints } from '../../../src/kaito-api/endpoints/tweet-endpoints';
import type { 
  KaitoAPIConfig,
  CreateTweetOptions,
  TweetSearchOptions,
  TweetResult,
  RetweetResult,
  QuoteResult,
  TweetSearchResult,
  TweetData,
  DeleteTweetResult
} from '../../../src/kaito-api/types';

describe('TweetEndpoints - 統合テスト', () => {
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
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn()
    };

    tweetEndpoints = new TweetEndpoints(mockConfig, mockHttpClient);

    // コンソール出力をモック化
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('全機能連携テスト', () => {
    it('ツイート作成 → 検索 → 取得 → 削除の完全ワークフロー', async () => {
      // 1. ツイート作成
      const createMockResponse = {
        data: {
          id: '123456789',
          text: 'Test integration tweet'
        }
      };
      mockHttpClient.post.mockResolvedValueOnce(createMockResponse);

      const createOptions: CreateTweetOptions = {
        text: 'Test integration tweet'
      };
      const createResult = await tweetEndpoints.createTweet(createOptions);

      expect(createResult.success).toBe(true);
      expect(createResult.id).toBe('123456789');

      // 2. ツイート検索
      const searchMockResponse = {
        data: [
          {
            id: '123456789',
            text: 'Test integration tweet',
            author_id: 'user123',
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              retweet_count: 0,
              like_count: 0,
              quote_count: 0,
              reply_count: 0,
              impression_count: 10
            }
          }
        ],
        meta: {
          result_count: 1
        }
      };
      mockHttpClient.get.mockResolvedValueOnce(searchMockResponse);

      const searchOptions: TweetSearchOptions = {
        query: 'Test integration tweet'
      };
      const searchResult = await tweetEndpoints.searchTweets(searchOptions);

      expect(searchResult.tweets).toHaveLength(1);
      expect(searchResult.tweets[0].id).toBe('123456789');

      // 3. ツイート取得
      const getMockResponse = {
        data: {
          id: '123456789',
          text: 'Test integration tweet',
          author_id: 'user123',
          created_at: '2024-01-01T00:00:00Z',
          public_metrics: {
            retweet_count: 0,
            like_count: 0,
            quote_count: 0,
            reply_count: 0,
            impression_count: 10
          }
        }
      };
      mockHttpClient.get.mockResolvedValueOnce(getMockResponse);

      const getResult = await tweetEndpoints.getTweet('123456789');

      expect(getResult.id).toBe('123456789');
      expect(getResult.text).toBe('Test integration tweet');

      // 4. ツイート削除
      const deleteMockResponse = {
        data: {
          deleted: true
        }
      };
      mockHttpClient.delete.mockResolvedValueOnce(deleteMockResponse);

      const deleteResult = await tweetEndpoints.deleteTweet('123456789');

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.deleted).toBe(true);

      // 全APIが適切に呼ばれたことを確認
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      expect(mockHttpClient.delete).toHaveBeenCalledTimes(1);
    });

    it('リツイート → 引用ツイート → リツイート取り消しの連携', async () => {
      const originalTweetId = '987654321';

      // 1. リツイート
      const retweetMockResponse = {
        data: {
          retweeted: true
        }
      };
      mockHttpClient.post.mockResolvedValueOnce(retweetMockResponse);

      const retweetResult = await tweetEndpoints.retweetTweet(originalTweetId);

      expect(retweetResult.success).toBe(true);
      expect(retweetResult.originalTweetId).toBe(originalTweetId);

      // 2. 引用ツイート
      const quoteMockResponse = {
        data: {
          id: '555555555',
          text: 'Great insight!'
        }
      };
      mockHttpClient.post.mockResolvedValueOnce(quoteMockResponse);

      const quoteResult = await tweetEndpoints.quoteTweet(originalTweetId, 'Great insight!');

      expect(quoteResult.success).toBe(true);
      expect(quoteResult.originalTweetId).toBe(originalTweetId);
      expect(quoteResult.comment).toBe('Great insight!');

      // 3. リツイート取り消し
      const unretweetMockResponse = {
        data: {
          retweeted: false
        }
      };
      mockHttpClient.delete.mockResolvedValueOnce(unretweetMockResponse);

      const unretweetResult = await tweetEndpoints.unretweetTweet(originalTweetId);

      expect(unretweetResult.success).toBe(true);
      expect(unretweetResult.originalTweetId).toBe(originalTweetId);

      // POST（リツイート + 引用ツイート）とDELETE（リツイート取り消し）が呼ばれたことを確認
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
      expect(mockHttpClient.delete).toHaveBeenCalledTimes(1);
    });

    it('複数ツイート取得 → 個別バリデーション → 集計処理', async () => {
      // 複数ツイート取得
      const multiMockResponse = {
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
            text: 'Third tweet with 한국어', // 韓国語含む
            author_id: 'user3',
            created_at: '2024-01-03T00:00:00Z',
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
      mockHttpClient.get.mockResolvedValue(multiMockResponse);

      const tweetIds = ['111111111', '222222222', '333333333'];
      const tweets = await tweetEndpoints.getMultipleTweets(tweetIds);

      expect(tweets).toHaveLength(3);

      // 各ツイートのバリデーション
      const validationResults = tweets.map(tweet => 
        tweetEndpoints.validateTweetText(tweet.text)
      );

      expect(validationResults[0].isValid).toBe(true);
      expect(validationResults[1].isValid).toBe(true);
      expect(validationResults[2].isValid).toBe(false); // 韓国語含む

      // 集計処理例
      const totalLikes = tweets.reduce((sum, tweet) => sum + tweet.publicMetrics.likeCount, 0);
      const totalRetweets = tweets.reduce((sum, tweet) => sum + tweet.publicMetrics.retweetCount, 0);
      const validTweets = validationResults.filter(r => r.isValid).length;

      expect(totalLikes).toBe(25); // 10 + 15 + 0
      expect(totalRetweets).toBe(13); // 5 + 8 + 0
      expect(validTweets).toBe(2);
    });
  });

  describe('execution-flow.ts 互換性確認', () => {
    it('searchTrends メソッドが execution-flow.ts で使用できる', async () => {
      const trends = await tweetEndpoints.searchTrends();

      // execution-flow.ts で期待される形式
      expect(Array.isArray(trends)).toBe(true);
      expect(trends).toHaveLength(5);
      expect(trends).toContain('投資教育');
      expect(trends).toContain('資産運用');
      expect(trends).toContain('金融リテラシー');
      expect(trends).toContain('株式投資');
      expect(trends).toContain('暗号資産');

      // 各要素が文字列であることを確認
      trends.forEach(trend => {
        expect(typeof trend).toBe('string');
        expect(trend.length).toBeGreaterThan(0);
      });
    });

    it('getCapabilities メソッドが core-scheduler.ts で使用できる', async () => {
      const capabilities = await tweetEndpoints.getCapabilities();

      // core-scheduler.ts で期待される形式
      expect(capabilities).toHaveProperty('canSearchTweets');
      expect(capabilities).toHaveProperty('canCreateTweets');
      expect(capabilities).toHaveProperty('canDeleteTweets');
      expect(capabilities).toHaveProperty('canRetweet');
      expect(capabilities).toHaveProperty('canQuoteTweet');
      expect(capabilities).toHaveProperty('searchTrendsSupported');

      // 全機能がサポートされていることを確認
      expect(capabilities.canSearchTweets).toBe(true);
      expect(capabilities.canCreateTweets).toBe(true);
      expect(capabilities.canDeleteTweets).toBe(true);
      expect(capabilities.canRetweet).toBe(true);
      expect(capabilities.canQuoteTweet).toBe(true);
      expect(capabilities.searchTrendsSupported).toBe(true);
    });

    it('buildTweetUrl がユーザー名有無両対応で動作', () => {
      const tweetId = '123456789';

      // ユーザー名なし（execution-flow.ts での一般的な使用）
      const urlWithoutUser = tweetEndpoints.buildTweetUrl(tweetId);
      expect(urlWithoutUser).toBe('https://twitter.com/i/status/123456789');

      // ユーザー名あり（詳細表示時の使用）
      const urlWithUser = tweetEndpoints.buildTweetUrl(tweetId, 'testuser');
      expect(urlWithUser).toBe('https://twitter.com/testuser/status/123456789');

      // 両方とも有効なTwitter URLであることを確認
      expect(urlWithoutUser).toMatch(/^https:\/\/twitter\.com\//);
      expect(urlWithUser).toMatch(/^https:\/\/twitter\.com\//);
    });

    it('投資教育関連のツイート検索が適切に動作', async () => {
      // execution-flow.ts で使用される投資教育関連の検索
      const educationalSearchMockResponse = {
        data: [
          {
            id: 'edu123',
            text: '投資教育の重要性について',
            author_id: 'educator1',
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              retweet_count: 10,
              like_count: 25,
              quote_count: 5,
              reply_count: 8,
              impression_count: 500
            },
            context_annotations: [
              {
                domain: { name: 'Finance' },
                entity: { name: 'Investment Education', description: 'Educational content about investing' }
              }
            ]
          }
        ],
        meta: {
          result_count: 1
        }
      };
      mockHttpClient.get.mockResolvedValue(educationalSearchMockResponse);

      const searchOptions: TweetSearchOptions = {
        query: '投資教育 OR 資産運用 OR 金融リテラシー',
        maxResults: 20,
        lang: 'ja',
        includeRetweets: false
      };

      const result = await tweetEndpoints.searchTweets(searchOptions);

      expect(result.tweets).toHaveLength(1);
      expect(result.tweets[0].text).toContain('投資教育');
      expect(result.tweets[0].contextAnnotations![0].domain).toBe('Finance');
      expect(mockHttpClient.get).toHaveBeenCalledWith('/tweets/search/recent', 
        expect.objectContaining({
          query: '投資教育 OR 資産運用 OR 金融リテラシー -is:retweet',
          lang: 'ja',
          max_results: 20
        })
      );
    });
  });

  describe('エラー回復・リトライ処理', () => {
    it('一時的なエラー後の成功パターン', async () => {
      // 最初の呼び出しでエラー、2回目で成功
      mockHttpClient.post
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          data: {
            id: '999999999',
            text: 'Retry success'
          }
        });

      // 最初のツイート作成は失敗
      const firstResult = await tweetEndpoints.createTweet({ text: 'Retry test' });
      expect(firstResult.success).toBe(false);
      expect(firstResult.error).toBe('Network timeout');

      // 2回目のツイート作成は成功
      const secondResult = await tweetEndpoints.createTweet({ text: 'Retry test' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.id).toBe('999999999');

      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });

    it('複数機能での部分的エラー処理', async () => {
      const tweetId = '444444444';

      // リツイートは成功
      mockHttpClient.post.mockResolvedValueOnce({
        data: { retweeted: true }
      });

      // 引用ツイートは失敗
      mockHttpClient.post.mockRejectedValueOnce(new Error('Quote failed'));

      // リツイート取り消しは成功
      mockHttpClient.delete.mockResolvedValueOnce({
        data: { retweeted: false }
      });

      const retweetResult = await tweetEndpoints.retweetTweet(tweetId);
      const quoteResult = await tweetEndpoints.quoteTweet(tweetId, 'Failed quote');
      const unretweetResult = await tweetEndpoints.unretweetTweet(tweetId);

      expect(retweetResult.success).toBe(true);
      expect(quoteResult.success).toBe(false);
      expect(quoteResult.error).toBe('Quote failed');
      expect(unretweetResult.success).toBe(true);

      // エラーが発生しても他の操作に影響しないことを確認
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
      expect(mockHttpClient.delete).toHaveBeenCalledTimes(1);
    });

    it('検索エラー時の例外処理', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Search service unavailable'));

      await expect(tweetEndpoints.searchTweets({ query: 'test' }))
        .rejects.toThrow('Failed to search tweets: Search service unavailable');

      await expect(tweetEndpoints.getTweet('123'))
        .rejects.toThrow('Failed to get tweet: Search service unavailable');

      await expect(tweetEndpoints.getMultipleTweets(['123', '456']))
        .rejects.toThrow('Failed to get multiple tweets: Search service unavailable');

      // searchTrends はモックデータを返すため、エラーはHTTPクライアントに依存しない
      const trends = await tweetEndpoints.searchTrends();
      expect(Array.isArray(trends)).toBe(true);
      expect(trends).toHaveLength(5);
    });
  });

  describe('実際のワークフロー模擬', () => {
    it('30分間隔実行での投資教育コンテンツ投稿ワークフロー', async () => {
      // 1. トレンド検索（execution-flow.ts での使用）
      const trends = await tweetEndpoints.searchTrends();
      expect(trends).toContain('投資教育');

      // 2. 関連ツイート検索
      const trendSearchMockResponse = {
        data: [
          {
            id: 'trend123',
            text: '今日の投資教育：リスク分散の重要性',
            author_id: 'expert1',
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              retweet_count: 15,
              like_count: 30,
              quote_count: 8,
              reply_count: 12,
              impression_count: 800
            }
          }
        ],
        meta: { result_count: 1 }
      };
      mockHttpClient.get.mockResolvedValueOnce(trendSearchMockResponse);

      const searchResult = await tweetEndpoints.searchTweets({
        query: '投資教育',
        maxResults: 10,
        includeRetweets: false
      });

      expect(searchResult.tweets).toHaveLength(1);

      // 3. コンテンツ作成（バリデーション含む）
      const newContent = '投資の基本：分散投資でリスクを軽減しましょう。#投資教育 #資産運用';
      const validation = tweetEndpoints.validateTweetText(newContent);
      expect(validation.isValid).toBe(true);

      // 4. ツイート投稿
      const createMockResponse = {
        data: {
          id: 'new123',
          text: newContent
        }
      };
      mockHttpClient.post.mockResolvedValueOnce(createMockResponse);

      const createResult = await tweetEndpoints.createTweet({ text: newContent });
      expect(createResult.success).toBe(true);

      // 5. 投稿確認（取得）
      const getMockResponse = {
        data: {
          id: 'new123',
          text: newContent,
          author_id: 'bot_account',
          created_at: '2024-01-01T12:00:00Z',
          public_metrics: {
            retweet_count: 0,
            like_count: 0,
            quote_count: 0,
            reply_count: 0,
            impression_count: 1
          }
        }
      };
      mockHttpClient.get.mockResolvedValueOnce(getMockResponse);

      const verifyResult = await tweetEndpoints.getTweet('new123');
      expect(verifyResult.text).toBe(newContent);

      // 全ステップが正常に完了
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
    });

    it('エンゲージメント向上のためのリツイート・引用戦略', async () => {
      // 1. 高エンゲージメントツイート検索
      const highEngagementMockResponse = {
        data: [
          {
            id: 'popular123',
            text: '暗号資産の最新動向について',
            author_id: 'influencer1',
            created_at: '2024-01-01T00:00:00Z',
            public_metrics: {
              retweet_count: 100,
              like_count: 500,
              quote_count: 50,
              reply_count: 200,
              impression_count: 10000
            }
          }
        ],
        meta: { result_count: 1 }
      };
      mockHttpClient.get.mockResolvedValueOnce(highEngagementMockResponse);

      const popularTweets = await tweetEndpoints.searchTweets({
        query: '暗号資産 OR 仮想通貨',
        maxResults: 5,
        sortOrder: 'relevancy'
      });

      const popularTweet = popularTweets.tweets[0];
      expect(popularTweet.publicMetrics.likeCount).toBeGreaterThan(100);

      // 2. 引用ツイートで価値ある情報を追加
      const quoteComment = '暗号資産投資には十分な知識と リスク管理が必要です。初心者の方は少額から始めることをお勧めします。';
      
      // バリデーション
      const quoteValidation = tweetEndpoints.validateTweetText(quoteComment);
      expect(quoteValidation.isValid).toBe(true);

      // 引用ツイート実行
      const quoteMockResponse = {
        data: {
          id: 'quote123',
          text: quoteComment
        }
      };
      mockHttpClient.post.mockResolvedValueOnce(quoteMockResponse);

      const quoteResult = await tweetEndpoints.quoteTweet(popularTweet.id, quoteComment);
      expect(quoteResult.success).toBe(true);
      expect(quoteResult.comment).toBe(quoteComment);

      // 3. 元ツイートをリツイート（追加のリーチ）
      const retweetMockResponse = {
        data: { retweeted: true }
      };
      mockHttpClient.post.mockResolvedValueOnce(retweetMockResponse);

      const retweetResult = await tweetEndpoints.retweetTweet(popularTweet.id);
      expect(retweetResult.success).toBe(true);

      // エンゲージメント戦略が完了
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });

    it('コンテンツ品質管理のためのバリデーション統合', async () => {
      const testContents = [
        '投資の基本原則について学びましょう。', // 有効
        '', // 無効：空
        'a'.repeat(281), // 無効：長すぎる
        '한국어로 된 투자 정보', // 無効：韓国語
        '素晴らしい投資チャンスです！#投資 #資産運用 #金融' // 有効
      ];

      const validationResults = testContents.map(content => ({
        content,
        validation: tweetEndpoints.validateTweetText(content)
      }));

      // 有効なコンテンツのみを投稿
      const validContents = validationResults.filter(r => r.validation.isValid);
      expect(validContents).toHaveLength(2);

      // 各有効コンテンツを投稿
      for (const [index, { content }] of validContents.entries()) {
        const mockResponse = {
          data: {
            id: `valid_${index}`,
            text: content
          }
        };
        mockHttpClient.post.mockResolvedValueOnce(mockResponse);

        const result = await tweetEndpoints.createTweet({ text: content });
        expect(result.success).toBe(true);
      }

      // 無効なコンテンツのエラー詳細確認
      const invalidContents = validationResults.filter(r => !r.validation.isValid);
      expect(invalidContents).toHaveLength(3);
      
      expect(invalidContents[0].validation.errors).toContain('Tweet text cannot be empty');
      expect(invalidContents[1].validation.errors).toContain('Tweet text exceeds 280 character limit');
      expect(invalidContents[2].validation.errors).toContain('Korean characters are not allowed');

      // 有効なコンテンツのみが投稿された
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('パフォーマンス・スケーラビリティテスト', () => {
    it('大量のツイート処理における一貫性', async () => {
      const tweetCount = 50;
      const mockResponses = Array.from({ length: tweetCount }, (_, i) => ({
        data: {
          id: `bulk_${i}`,
          text: `Bulk tweet ${i}`,
          author_id: `user_${i}`,
          created_at: '2024-01-01T00:00:00Z',
          public_metrics: {
            retweet_count: i,
            like_count: i * 2,
            quote_count: 0,
            reply_count: 0,
            impression_count: i * 10
          }
        }
      }));

      // 複数ツイート取得のモック
      mockHttpClient.get.mockResolvedValue({
        data: mockResponses.map(r => r.data)
      });

      const tweetIds = Array.from({ length: tweetCount }, (_, i) => `bulk_${i}`);
      const tweets = await tweetEndpoints.getMultipleTweets(tweetIds);

      expect(tweets).toHaveLength(tweetCount);

      // 各ツイートのバリデーション（並列処理）
      const startTime = Date.now();
      const validationPromises = tweets.map(tweet => 
        Promise.resolve(tweetEndpoints.validateTweetText(tweet.text))
      );
      const validations = await Promise.all(validationPromises);
      const endTime = Date.now();

      // 全て有効であることを確認
      const allValid = validations.every(v => v.isValid);
      expect(allValid).toBe(true);

      // 処理時間が合理的であることを確認（1秒以内）
      expect(endTime - startTime).toBeLessThan(1000);

      // メトリクス集計
      const totalLikes = tweets.reduce((sum, tweet) => sum + tweet.publicMetrics.likeCount, 0);
      const expectedTotalLikes = Array.from({ length: tweetCount }, (_, i) => i * 2).reduce((a, b) => a + b, 0);
      expect(totalLikes).toBe(expectedTotalLikes);
    });

    it('エラー耐性のある連続処理', async () => {
      const operations = [
        { type: 'create', shouldFail: false },
        { type: 'retweet', shouldFail: true },
        { type: 'create', shouldFail: false },
        { type: 'quote', shouldFail: true },
        { type: 'create', shouldFail: false }
      ];

      let successCount = 0;
      let failureCount = 0;

      for (const [index, op] of operations.entries()) {
        if (op.type === 'create') {
          if (op.shouldFail) {
            mockHttpClient.post.mockRejectedValueOnce(new Error('Create failed'));
          } else {
            mockHttpClient.post.mockResolvedValueOnce({
              data: { id: `create_${index}`, text: `Tweet ${index}` }
            });
          }

          const result = await tweetEndpoints.createTweet({ text: `Tweet ${index}` });
          if (result.success) successCount++;
          else failureCount++;

        } else if (op.type === 'retweet') {
          if (op.shouldFail) {
            mockHttpClient.post.mockRejectedValueOnce(new Error('Retweet failed'));
          } else {
            mockHttpClient.post.mockResolvedValueOnce({
              data: { retweeted: true }
            });
          }

          const result = await tweetEndpoints.retweetTweet(`target_${index}`);
          if (result.success) successCount++;
          else failureCount++;

        } else if (op.type === 'quote') {
          if (op.shouldFail) {
            mockHttpClient.post.mockRejectedValueOnce(new Error('Quote failed'));
          } else {
            mockHttpClient.post.mockResolvedValueOnce({
              data: { id: `quote_${index}`, text: `Quote ${index}` }
            });
          }

          const result = await tweetEndpoints.quoteTweet(`target_${index}`, `Quote ${index}`);
          if (result.success) successCount++;
          else failureCount++;
        }
      }

      // 部分的な成功・失敗が正確にカウントされている
      expect(successCount).toBe(3); // create×3が成功
      expect(failureCount).toBe(2); // retweet×1 + quote×1が失敗
      expect(successCount + failureCount).toBe(operations.length);
    });
  });
});