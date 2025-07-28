/**
 * ワークフロー統合テスト - 実際のワークフローをシミュレート
 * 
 * テスト対象（実際に使用されるワークフローのみ）:
 * - 認証 → アカウント情報取得 → 投稿
 * - 検索 → リツイート
 * - エラーハンドリング
 */

import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
import type {
  KaitoClientConfig,
  KaitoAPIConfig
} from '../../../src/kaito-api/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('実際のワークフロー統合テスト', () => {
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
        updatedBy: 'test',
        checksum: 'test-checksum'
      }
    };

    client = new KaitoTwitterAPIClient(mockConfig);
    client.initializeWithConfig(mockAPIConfig);
  });

  describe('実際のワークフロー統合テスト', () => {
    it('認証 → アカウント情報取得 → 投稿', async () => {
      // 1. 認証
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });

      await client.authenticate();

      // 2. アカウント情報取得
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: '123456789',
          username: 'testuser',
          displayName: 'Test User',
          followersCount: 1000,
          followingCount: 500,
          tweetCount: 2000,
          timestamp: new Date().toISOString()
        })
      });

      const account = await client.getAccountInfo();
      expect(account.id).toBe('123456789');
      expect(account.username).toBe('testuser');

      // 3. 投稿
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: '1234567890',
            text: 'テスト投稿',
            created_at: '2023-01-01T00:00:00.000Z'
          }
        })
      });

      const result = await client.post('テスト投稿');
      expect(result.success).toBe(true);
      expect(result.id).toBe('1234567890');
    });

    it('検索 → リツイート', async () => {
      // 1. 認証
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });

      await client.authenticate();

      // 2. ツイート検索
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: '1234567890',
              text: '投資教育に関する重要な話',
              author_id: '987654321',
              created_at: '2023-01-01T00:00:00.000Z'
            }
          ],
          meta: {
            result_count: 1,
            next_token: 'abc123'
          }
        })
      });

      const tweets = await client.searchTweets('投資教育');
      expect(tweets.data).toHaveLength(1);
      expect(tweets.data[0].id).toBe('1234567890');

      // 3. リツイート
      if (tweets.data.length > 0) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { retweeted: true } })
        });

        const retweetResult = await client.retweet(tweets.data[0].id);
        expect(retweetResult.success).toBe(true);
        expect(retweetResult.originalTweetId).toBe('1234567890');
      }
    });

    it('getUserLastTweets → 分析', async () => {
      // 1. 認証
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });

      await client.authenticate();

      // 2. ユーザーの最新ツイート取得（モック実装）
      const tweets = await client.getUserLastTweets('123456789', 10);
      expect(Array.isArray(tweets)).toBe(true);
      expect(tweets.length).toBe(0); // Mock implementation returns empty array
    });

    it('エラーハンドリングワークフロー', async () => {
      // 1. 認証失敗
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Authentication failed'
      });

      await expect(client.authenticate()).rejects.toThrow(/Authentication failed/);

      // 2. 再認証成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });

      await expect(client.authenticate()).resolves.not.toThrow();

      // 3. 投稿エラー処理
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid request'
      });

      const result = await client.post('Valid content');
      expect(result.success).toBe(false);
      expect(result.error).toContain('API error');
    });

    it('レート制限対応', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });

      await client.authenticate();

      // レート制限エラー → リトライ成功
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: async () => 'Rate limit exceeded'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { id: '123', text: 'test', created_at: '2023-01-01T00:00:00.000Z' }
          })
        });

      const result = await client.post('Test post');
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // auth + failed post + successful retry
    });

    it('接続テスト', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });

      await client.authenticate();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          status: 'ok', 
          timestamp: '2023-01-01T00:00:00.000Z' 
        })
      });

      const connectionResult = await client.testConnection();
      expect(connectionResult).toBe(true);
    });
  });

  describe('パフォーマンステスト', () => {
    it('複数操作の連続実行', async () => {
      // 認証
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });

      await client.authenticate();

      // 連続操作のモック設定
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { id: '1', text: 'post1', created_at: '2023-01-01T00:00:00.000Z' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { retweeted: true } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'ok' })
        });

      const startTime = Date.now();
      
      // 連続実行
      const postResult = await client.post('Test post');
      const retweetResult = await client.retweet('1234567890');
      const connectionResult = await client.testConnection();

      const duration = Date.now() - startTime;

      expect(postResult.success).toBe(true);
      expect(retweetResult.success).toBe(true);
      expect(connectionResult).toBe(true);
      expect(duration).toBeLessThan(1000); // 1秒以内
    });
  });
});