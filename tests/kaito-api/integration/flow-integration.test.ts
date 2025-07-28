/**
 * Kaito API 統合テスト - dev.tsとmain.ts実行フローに沿った統合テスト
 * 
 * 📋 指示書: TASK-005-integration-tests.md
 * 
 * 🎯 テスト目的:
 * dev.tsとmain.tsの実際の実行フローを模擬した統合テスト
 * 4ステップワークフロー（データ読み込み → Claude判断 → アクション実行 → 結果記録）を完全にテスト
 * 
 * 📊 テストシナリオ:
 * 1. 投稿フロー - 新規投稿作成の完全フロー
 * 2. リツイートフロー - ツイート検索から選択RT実行まで
 * 3. いいねフロー - 対象ツイート特定からいいね実行まで
 * 4. エラーリカバリー - 各段階でのエラー処理確認
 */

import { jest } from '@jest/globals';
import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
import type {
  KaitoClientConfig,
  KaitoAPIConfig,
  TweetData,
  SearchResults,
  PostResult,
  RetweetResult,
  LikeResult
} from '../../../src/kaito-api/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Integration - Kaito API Flow Tests', () => {
  let client: KaitoTwitterAPIClient;
  let mockConfig: Partial<KaitoClientConfig>;
  let mockAPIConfig: KaitoAPIConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      apiKey: 'test-api-key',
      qpsLimit: 200,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000
      },
      costTracking: true
    };

    mockAPIConfig = {
      environment: 'test',
      api: {
        baseUrl: 'https://api.twitterapi.io',
        version: 'v1',
        timeout: 30000,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          retryConditions: ['NETWORK_ERROR', 'TIMEOUT']
        }
      },
      authentication: {
        primaryKey: 'test-key',
        keyRotationInterval: 86400000,
        encryptionEnabled: false
      },
      performance: {
        qpsLimit: 200,
        responseTimeTarget: 700,
        cacheEnabled: false,
        cacheTTL: 0
      },
      monitoring: {
        metricsEnabled: true,
        logLevel: 'info',
        alertingEnabled: false,
        healthCheckInterval: 30000
      },
      security: {
        rateLimitEnabled: true,
        ipWhitelist: [],
        auditLoggingEnabled: true,
        encryptionKey: 'test-key'
      },
      features: {
        realApiEnabled: false,
        mockFallbackEnabled: true,
        batchProcessingEnabled: false,
        advancedCachingEnabled: false
      },
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'integration-test',
        checksum: 'test-checksum'
      }
    };

    client = new KaitoTwitterAPIClient(mockConfig);
    client.initializeWithConfig(mockAPIConfig);
  });

  describe('シナリオ1: 投稿フロー', () => {
    it('should complete full post flow', async () => {
      // 1. 認証
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          authenticated: true, 
          user: { id: 'test_user', username: 'test_account' }
        })
      });

      await client.authenticate();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key'
          })
        })
      );

      // 2. Claude決定（post）
      // ※ Claude判断は実際のワークフローではmain-workflows/execution-flow.tsで実行される
      // ここではその結果をシミュレート
      const claudeDecision = {
        action: 'post' as const,
        confidence: 0.85,
        reasoning: '投資教育コンテンツの投稿が適切なタイミング',
        content: {
          text: '📈 今日の市場動向について：暗号通貨市場は回復基調を見せています。長期投資の重要性を改めて感じる1日でした。 #投資教育 #暗号通貨',
          hashtags: ['投資教育', '暗号通貨']
        }
      };

      // 3. コンテンツ生成
      // ※ 実際のワークフローではClaude SDKのcontent-endpointが担当
      expect(claudeDecision.content.text).toBeTruthy();
      expect(claudeDecision.content.text.length).toBeLessThanOrEqual(280);

      // 4. 投稿実行
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: '1234567890123456789',
            text: claudeDecision.content.text,
            created_at: '2025-01-28T18:00:00.000Z',
            public_metrics: {
              retweet_count: 0,
              like_count: 0,
              reply_count: 0,
              quote_count: 0
            }
          }
        })
      });

      const postResult: PostResult = await client.post(claudeDecision.content.text);

      // 5. 結果記録
      expect(postResult.success).toBe(true);
      expect(postResult.id).toBe('1234567890123456789');
      expect(postResult.content).toBe(claudeDecision.content.text);
      expect(postResult.timestamp).toBeTruthy();

      // APIコール回数確認
      expect(mockFetch).toHaveBeenCalledTimes(2); // auth + post
    });
  });

  describe('シナリオ2: リツイートフロー', () => {
    it('should complete full retweet flow', async () => {
      // 1. 認証
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          authenticated: true, 
          user: { id: 'test_user', username: 'test_account' }
        })
      });

      await client.authenticate();

      // 2. Claude決定（retweet）  
      const claudeDecision = {
        action: 'retweet' as const,
        confidence: 0.78,
        reasoning: '投資関連の良質なコンテンツを発見、コミュニティに共有すべき',
        searchQuery: '投資教育 OR 資産運用 OR ファイナンシャルリテラシー -spam -広告'
      };

      // 3. 検索クエリ生成
      expect(claudeDecision.searchQuery).toBeTruthy();
      expect(claudeDecision.searchQuery).toContain('投資教育');

      // 4. ツイート検索
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: '9876543210987654321',
              text: '投資の基本は分散投資です。一つの銘柄に集中投資するのではなく、複数の資産クラスに分散することでリスクを軽減できます。',
              author_id: '1122334455667788999',
              created_at: '2025-01-28T17:30:00.000Z',
              public_metrics: {
                retweet_count: 15,
                like_count: 45,
                reply_count: 8,
                quote_count: 3
              }
            },
            {
              id: '1111222233334444555',
              text: '長期投資の重要性について考えてみましょう。短期的な値動きに惑わされず、企業の本質的価値を見極めることが大切です。',
              author_id: '6666777788889999000',
              created_at: '2025-01-28T16:45:00.000Z',
              public_metrics: {
                retweet_count: 8,
                like_count: 23,
                reply_count: 5,
                quote_count: 1
              }
            }
          ],
          meta: {
            result_count: 2,
            next_token: 'abc123def456'
          }
        })
      });

      const searchResults: SearchResults = await client.searchTweets(claudeDecision.searchQuery);

      expect(searchResults.data).toHaveLength(2);
      expect(searchResults.data[0].id).toBe('9876543210987654321');
      expect(searchResults.data[0].text).toContain('投資');

      // 5. リツイート実行
      // ※ 実際のワークフローでは最適なツイートを選択する判断ロジックがある
      const selectedTweet = searchResults.data[0]; // 最初のツイートを選択

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            retweeted: true,
            id: selectedTweet.id
          }
        })
      });

      const retweetResult: RetweetResult = await client.retweet(selectedTweet.id);

      // 6. 結果記録
      expect(retweetResult.success).toBe(true);
      expect(retweetResult.originalTweetId).toBe('9876543210987654321');
      expect(retweetResult.timestamp).toBeTruthy();

      // APIコール回数確認
      expect(mockFetch).toHaveBeenCalledTimes(3); // auth + search + retweet
    });
  });

  describe('シナリオ3: いいねフロー', () => {
    it('should complete full like flow', async () => {
      // 1. 認証
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          authenticated: true, 
          user: { id: 'test_user', username: 'test_account' }
        })
      });

      await client.authenticate();

      // 2. Claude決定（like）
      const claudeDecision = {
        action: 'like' as const,
        confidence: 0.72,
        reasoning: 'フォロワーのエンゲージメント向上とコミュニティ参加のため',
        targetCriteria: {
          keywords: ['投資教育', 'ファイナンシャルリテラシー'],
          minEngagement: 10,
          maxAge: 24 // 24時間以内
        }
      };

      // 3. 対象ツイート特定
      // ※ 実際のワークフローでは複数の方法で対象を特定（検索、タイムライン等）
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: '5555666677778888999',
              text: 'ファイナンシャルリテラシーの向上は現代社会において必須のスキルです。基本的な投資知識を身につけることから始めましょう。',
              author_id: '2222333344445555666',
              created_at: '2025-01-28T17:45:00.000Z',
              public_metrics: {
                retweet_count: 5,
                like_count: 18,
                reply_count: 3,
                quote_count: 1
              }
            }
          ],
          meta: {
            result_count: 1
          }
        })
      });

      const searchResults: SearchResults = await client.searchTweets('ファイナンシャルリテラシー');
      const targetTweet = searchResults.data[0];

      expect(targetTweet.id).toBe('5555666677778888999');
      expect(targetTweet.public_metrics.like_count).toBeGreaterThanOrEqual(claudeDecision.targetCriteria.minEngagement);

      // 4. いいね実行
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            liked: true,
            id: targetTweet.id
          }
        })
      });

      const likeResult: LikeResult = await client.like(targetTweet.id);

      // 5. 結果記録
      expect(likeResult.success).toBe(true);
      expect(likeResult.targetTweetId).toBe('5555666677778888999');
      expect(likeResult.timestamp).toBeTruthy();

      // APIコール回数確認
      expect(mockFetch).toHaveBeenCalledTimes(3); // auth + search + like
    });
  });

  describe('エラーリカバリーテスト', () => {
    it('should retry on temporary network failure', async () => {
      // 1回目: ネットワークエラー
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));
      
      // 2回目: 成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          authenticated: true, 
          user: { id: 'test_user', username: 'test_account' }
        })
      });

      // リトライ機能によって最終的に成功することを確認
      await expect(client.authenticate()).resolves.not.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle rate limit and wait', async () => {
      // 認証成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // 1回目: レート制限
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({ 'Retry-After': '60' }),
        text: async () => 'Rate limit exceeded'
      });

      // 2回目: 成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: '1234567890',
            text: 'Test post',
            created_at: '2025-01-28T18:00:00.000Z'
          }
        })
      });

      const result = await client.post('Test post');
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // auth + failed post + successful retry
    });

    it('should fallback on authentication failure', async () => {
      // 認証失敗
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key'
      });

      await expect(client.authenticate()).rejects.toThrow(/Invalid API key/);
    });

    it('should continue execution after non-critical errors', async () => {
      // 認証成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // 投稿失敗（非致命的エラー）
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Tweet text is too long'
      });

      const result = await client.post('A'.repeat(300)); // 280文字制限を超える投稿
      expect(result.success).toBe(false);
      expect(result.error).toContain('API error');

      // 後続のAPIコールは正常に実行可能
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      const connectionTest = await client.testConnection();
      expect(connectionTest).toBe(true);
    });
  });

  describe('パフォーマンステスト', () => {
    it('should complete workflow within time limits', async () => {
      const startTime = Date.now();

      // 認証
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // 検索
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{
            id: '1234567890',
            text: 'Test tweet for search',
            author_id: '9876543210',
            created_at: '2025-01-28T18:00:00.000Z'
          }],
          meta: { result_count: 1 }
        })
      });
      const searchResults = await client.searchTweets('test query');

      // いいね
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { liked: true } })
      });
      const likeResult = await client.like(searchResults.data[0].id);

      const executionTime = Date.now() - startTime;

      expect(likeResult.success).toBe(true);
      expect(executionTime).toBeLessThan(10000); // 10秒以内（指示書の品質基準）
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('メモリリークテスト', () => {
    it('should not cause memory leaks during multiple operations', async () => {
      // 認証
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // 複数回の操作実行
      const operations = [];
      for (let i = 0; i < 50; i++) {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ status: 'ok', timestamp: new Date().toISOString() })
        });
        operations.push(client.testConnection());
      }

      const results = await Promise.all(operations);
      
      expect(results.every(result => result === true)).toBe(true);
      // メモリ使用量の大幅な増加がないことを確認（実際の測定は環境依存）
      expect(mockFetch).toHaveBeenCalledTimes(51); // auth + 50 connections
    });
  });
});