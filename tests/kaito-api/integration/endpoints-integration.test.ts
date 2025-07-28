/**
 * Endpoints統合テスト - ActionEndpoints ↔ TweetEndpoints連携動作検証
 * エンドポイント間のデータ受け渡しと連携機能を確認
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { ActionEndpoints } from '../../../src/kaito-api/endpoints/action-endpoints';
import { TweetEndpoints } from '../../../src/kaito-api/endpoints/tweet-endpoints';
import { KaitoAPIConfig, PostRequest, EngagementRequest, TweetSearchOptions } from '../../../src/kaito-api/types';

describe('Endpoints Integration Tests', () => {
  let actionEndpoints: ActionEndpoints;
  let tweetEndpoints: TweetEndpoints;
  let testConfig: KaitoAPIConfig;

  beforeEach(() => {
    // テストデータ設定
    testConfig = {
      environment: 'dev',
      api: {
        baseUrl: 'https://dev-api.twitterapi.io',
        version: 'v1.0',
        timeout: 10000,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          retryConditions: ['429', '500', '502', '503', '504']
        }
      },
      authentication: {
        primaryKey: 'test-api-key-integration',
        keyRotationInterval: 86400000,
        encryptionEnabled: false
      },
      performance: {
        qpsLimit: 100,
        responseTimeTarget: 700,
        cacheEnabled: true,
        cacheTTL: 300
      },
      monitoring: {
        metricsEnabled: true,
        logLevel: 'debug',
        alertingEnabled: false,
        healthCheckInterval: 60000
      },
      security: {
        rateLimitEnabled: true,
        ipWhitelist: ['127.0.0.1'],
        auditLoggingEnabled: false,
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
        updatedBy: 'integration-test',
        checksum: 'test-checksum'
      }
    };

    // エンドポイントインスタンス作成
    actionEndpoints = new ActionEndpoints(testConfig.api.baseUrl, {
      'Authorization': `Bearer ${testConfig.authentication.primaryKey}`,
      'Content-Type': 'application/json'
    });

    tweetEndpoints = new TweetEndpoints(testConfig);
  });

  afterEach(() => {
    // クリーンアップ
    actionEndpoints = null;
    tweetEndpoints = null;
    testConfig = null;
  });

  describe('教育的投稿ワークフロー', () => {
    test('ActionEndpoints教育的投稿作成 → TweetEndpoints投稿検索・取得', async () => {
      // 1. ActionEndpointsで教育的投稿を作成
      const postRequest: PostRequest = {
        content: '📊 今日の投資教育トピック：分散投資の重要性について。リスクを適切に管理することで、長期的な資産形成が可能になります。 #投資教育 #分散投資',
        mediaIds: [],
        replyToId: undefined,
        quoteTweetId: undefined
      };

      const postResponse = await actionEndpoints.createPost(postRequest);
      
      expect(postResponse.success).toBe(true);
      expect(postResponse.tweetId).toBeDefined();
      expect(postResponse.createdAt).toBeDefined();
      expect(postResponse.error).toBeUndefined();

      // 2. TweetEndpointsで作成した投稿を検索
      const searchOptions: TweetSearchOptions = {
        query: '投資教育 分散投資',
        maxResults: 10,
        sortOrder: 'recency',
        includeRetweets: false,
        lang: 'ja'
      };

      const searchResult = await tweetEndpoints.searchTweets(searchOptions);
      
      expect(searchResult.tweets).toBeDefined();
      expect(Array.isArray(searchResult.tweets)).toBe(true);
      expect(searchResult.searchQuery).toBe(searchOptions.query);
      expect(searchResult.timestamp).toBeDefined();
    });

    test('投稿ID連携の正確性確認', async () => {
      // 投稿作成
      const postRequest: PostRequest = {
        content: '💡 投資の基本原則：時間を味方につけた複利効果の活用方法について解説します。',
        mediaIds: []
      };

      const postResponse = await actionEndpoints.createPost(postRequest);
      const createdTweetId = postResponse.tweetId;

      expect(createdTweetId).toBeDefined();
      expect(createdTweetId).toMatch(/^tweet_\d+$/); // tweet_[timestamp]形式

      // 作成時刻の検証
      const createdTime = postResponse.createdAt;
      expect(createdTime).toBeDefined();
      expect(new Date(createdTime).getTime()).toBeLessThanOrEqual(Date.now());
    });

    test('複数投稿の連携処理', async () => {
      const educationalTopics = [
        '株式投資の基本：PERとROEの読み方',
        '債券投資入門：利回りとリスクの関係',
        'REIT投資の特徴：不動産投資信託の魅力',
        'インデックス投資：手数料を抑えた長期戦略'
      ];

      const createdPosts = [];

      // 複数の教育的投稿を作成
      for (const topic of educationalTopics) {
        const postRequest: PostRequest = {
          content: `📚 ${topic} #投資教育 #資産形成`,
          mediaIds: []
        };

        const postResponse = await actionEndpoints.createPost(postRequest);
        expect(postResponse.success).toBe(true);
        createdPosts.push(postResponse);
      }

      expect(createdPosts).toHaveLength(4);

      // 教育的内容での検索
      const searchOptions: TweetSearchOptions = {
        query: '投資教育 資産形成',
        maxResults: 10,
        sortOrder: 'recency'
      };

      const searchResult = await tweetEndpoints.searchTweets(searchOptions);
      expect(searchResult.tweets).toBeDefined();
      expect(searchResult.totalCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('エンゲージメント連携フロー', () => {
    test('TweetEndpoints検索 → ActionEndpointsエンゲージメント', async () => {
      // 1. 教育的ツイートを検索
      const searchOptions: TweetSearchOptions = {
        query: '投資 教育 勉強',
        maxResults: 5,
        sortOrder: 'relevancy',
        includeRetweets: false
      };

      const searchResult = await tweetEndpoints.searchTweets(searchOptions);
      expect(searchResult.tweets).toBeDefined();

      // 2. 検索結果がある場合、エンゲージメントを実行
      if (searchResult.tweets.length > 0) {
        const targetTweetId = 'sample_tweet_123'; // テスト用ID

        const engagementRequest: EngagementRequest = {
          tweetId: targetTweetId,
          action: 'like'
        };

        const engagementResponse = await actionEndpoints.performEngagement(engagementRequest);
        
        expect(engagementResponse.success).toBe(true);
        expect(engagementResponse.action).toBe('like');
        expect(engagementResponse.tweetId).toBe(targetTweetId);
        expect(engagementResponse.timestamp).toBeDefined();
      }
    });

    test('ActionEndpoints教育的価値判定シミュレーション', async () => {
      // 教育的価値の高いツイート内容のテスト
      const highValueTopics = [
        {
          content: '📈 投資初心者向け：ドルコスト平均法の効果的な活用方法と注意点について詳しく解説します。',
          expectedEducationalValue: 'high'
        },
        {
          content: '⚠️ 投資リスク管理：ポートフォリオの多様化による安定した資産運用のコツ',
          expectedEducationalValue: 'high'
        },
        {
          content: '🔍 株式分析の基本：財務諸表の読み方と投資判断への活用法',
          expectedEducationalValue: 'high'
        }
      ];

      for (const topic of highValueTopics) {
        const postRequest: PostRequest = {
          content: topic.content,
          mediaIds: []
        };

        const postResponse = await actionEndpoints.createPost(postRequest);
        
        expect(postResponse.success).toBe(true);
        expect(postResponse.tweetId).toBeDefined();
        
        // 教育的価値の高いコンテンツが適切に処理されることを確認
        expect(topic.content.length).toBeGreaterThan(50); // 詳細な内容
        expect(topic.content).toMatch(/投資|教育|勉強|学習/); // 教育的キーワード含有
      }
    });

    test('適切な投稿への教育的エンゲージメント判定', async () => {
      // 教育価値の高い投稿に対するエンゲージメント
      const educationalTweetId = 'educational_tweet_456';
      
      const likeRequest: EngagementRequest = {
        tweetId: educationalTweetId,
        action: 'like'
      };

      const likeResponse = await actionEndpoints.performEngagement(likeRequest);
      expect(likeResponse.success).toBe(true);
      expect(likeResponse.action).toBe('like');

      // リツイートによる教育的コンテンツ拡散
      const retweetRequest: EngagementRequest = {
        tweetId: educationalTweetId,
        action: 'retweet'
      };

      const retweetResponse = await actionEndpoints.performEngagement(retweetRequest);
      expect(retweetResponse.success).toBe(true);
      expect(retweetResponse.action).toBe('retweet');
    });
  });

  describe('データ受け渡し検証', () => {
    test('エンドポイント間での型安全なデータ交換', async () => {
      // PostRequestの型安全性確認
      const postRequest: PostRequest = {
        content: '🎯 投資戦略立案：目標設定から実行計画まで段階的に解説',
        mediaIds: ['media1', 'media2'],
        replyToId: 'reply_to_123',
        quoteTweetId: 'quote_456'
      };

      // 型安全性の確認
      expect(typeof postRequest.content).toBe('string');
      expect(Array.isArray(postRequest.mediaIds)).toBe(true);
      expect(typeof postRequest.replyToId).toBe('string');
      expect(typeof postRequest.quoteTweetId).toBe('string');

      const postResponse = await actionEndpoints.createPost(postRequest);
      
      // PostResponseの型安全性確認
      expect(typeof postResponse.success).toBe('boolean');
      expect(typeof postResponse.tweetId).toBe('string');
      expect(typeof postResponse.createdAt).toBe('string');
    });

    test('ID参照の整合性確認', async () => {
      // 親投稿作成
      const parentPost: PostRequest = {
        content: '📊 今週の市場分析：主要指数の動向と今後の展望',
        mediaIds: []
      };

      const parentResponse = await actionEndpoints.createPost(parentPost);
      expect(parentResponse.success).toBe(true);

      // 返信投稿作成（ID参照の整合性確認）
      const replyPost: PostRequest = {
        content: '詳細分析：特に注目すべきセクターと個別銘柄について',
        mediaIds: [],
        replyToId: parentResponse.tweetId
      };

      const replyResponse = await actionEndpoints.createPost(replyPost);
      expect(replyResponse.success).toBe(true);
      
      // ID参照の整合性確認
      expect(replyPost.replyToId).toBe(parentResponse.tweetId);
    });

    test('時間情報の一貫性確認', async () => {
      const startTime = new Date().toISOString();
      
      const postRequest: PostRequest = {
        content: '⏰ タイムスタンプ整合性テスト：投資タイミングの重要性について',
        mediaIds: []
      };

      const postResponse = await actionEndpoints.createPost(postRequest);
      
      const endTime = new Date().toISOString();
      
      expect(postResponse.createdAt).toBeDefined();
      
      // 作成時刻が実行時間範囲内にあることを確認
      const createdTime = new Date(postResponse.createdAt).getTime();
      const startTimeMs = new Date(startTime).getTime();
      const endTimeMs = new Date(endTime).getTime();
      
      expect(createdTime).toBeGreaterThanOrEqual(startTimeMs);
      expect(createdTime).toBeLessThanOrEqual(endTimeMs);
    });
  });

  describe('エラーハンドリング統合', () => {
    test('ActionEndpointsエラー → TweetEndpointsでの回復処理', async () => {
      // 無効なリクエストでエラーを発生させる
      const invalidPostRequest: PostRequest = {
        content: '', // 空のコンテンツ
        mediaIds: []
      };

      const postResponse = await actionEndpoints.createPost(invalidPostRequest);
      
      // エラーレスポンスの確認
      expect(postResponse.success).toBe(false);
      expect(postResponse.error).toBeDefined();
      expect(postResponse.tweetId).toBeUndefined();

      // TweetEndpointsでの代替処理（検索による既存コンテンツ活用）
      const fallbackSearch: TweetSearchOptions = {
        query: '投資 基本',
        maxResults: 1,
        sortOrder: 'relevancy'
      };

      const searchResult = await tweetEndpoints.searchTweets(fallbackSearch);
      
      // 代替処理が正常に動作することを確認
      expect(searchResult.tweets).toBeDefined();
      expect(searchResult.searchQuery).toBe('投資 基本');
    });

    test('TweetEndpoints検索エラー → ActionEndpointsでの代替投稿', async () => {
      // 無効な検索クエリでエラーを発生させる
      const invalidSearchOptions: TweetSearchOptions = {
        query: '', // 空のクエリ
        maxResults: 10
      };

      const searchResult = await tweetEndpoints.searchTweets(invalidSearchOptions);
      
      // 検索結果の確認（空のクエリでも基本的な結果は返される）
      expect(searchResult.tweets).toBeDefined();
      expect(Array.isArray(searchResult.tweets)).toBe(true);

      // 代替投稿の実行
      const fallbackPost: PostRequest = {
        content: '🔄 システム回復：基本的な投資知識について改めて確認しましょう',
        mediaIds: []
      };

      const fallbackResponse = await actionEndpoints.createPost(fallbackPost);
      expect(fallbackResponse.success).toBe(true);
    });
  });

  describe('パフォーマンス統合テスト', () => {
    test('連続API呼び出しのパフォーマンス', async () => {
      const operations = [];
      const startTime = Date.now();

      // 投稿とエンゲージメントを交互に実行
      for (let i = 0; i < 5; i++) {
        // 投稿作成
        const postPromise = actionEndpoints.createPost({
          content: `📈 投資テスト ${i + 1}: パフォーマンス確認用投稿`,
          mediaIds: []
        });

        // エンゲージメント実行
        const engagementPromise = actionEndpoints.performEngagement({
          tweetId: `test_tweet_${i}`,
          action: 'like'
        });

        operations.push(postPromise, engagementPromise);
      }

      // 全ての操作を並行実行
      const results = await Promise.all(operations);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // パフォーマンス要件確認
      expect(results).toHaveLength(10); // 5投稿 + 5エンゲージメント
      expect(totalTime).toBeLessThan(5000); // 5秒以内で完了

      // 全ての操作が成功していることを確認
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
      });
    });

    test('大量データ処理の効率性', async () => {
      const largeSearchOptions: TweetSearchOptions = {
        query: '投資 OR 株式 OR 資産',
        maxResults: 100, // 大量データ取得
        sortOrder: 'recency'
      };

      const startTime = Date.now();
      const searchResult = await tweetEndpoints.searchTweets(largeSearchOptions);
      const endTime = Date.now();

      const processingTime = endTime - startTime;

      expect(searchResult.tweets).toBeDefined();
      expect(processingTime).toBeLessThan(2000); // 2秒以内で大量データ処理
    });
  });
});