/**
 * Kaito API エラーリカバリー統合テスト
 * 
 * 📋 指示書: TASK-005-integration-tests.md
 * 
 * 🎯 テスト目的:
 * 実際の運用環境で発生し得る各種エラー条件でのリカバリー機能をテスト
 * システムの堅牢性と継続運用能力を確認
 * 
 * 📊 エラーシナリオ:
 * 1. ネットワーク障害リカバリー
 * 2. API認証エラー処理
 * 3. レート制限対応
 * 4. サーバーエラー処理
 * 5. タイムアウト処理
 * 6. データ形式エラー処理
 */

import { jest } from '@jest/globals';
import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
import type {
  KaitoClientConfig,
  KaitoAPIConfig,
  PostResult,
  RetweetResult,
  LikeResult
} from '../../../src/kaito-api/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Error Recovery Integration Tests', () => {
  let client: KaitoTwitterAPIClient;
  let mockConfig: Partial<KaitoClientConfig>;
  let mockAPIConfig: KaitoAPIConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

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
        updatedBy: 'error-recovery-test',
        checksum: 'test-checksum'
      }
    };

    client = new KaitoTwitterAPIClient(mockConfig);
    client.initializeWithConfig(mockAPIConfig);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('ネットワーク障害リカバリー', () => {
    it('should retry on temporary network failure', async () => {
      // 1回目: ネットワークエラー
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED: Connection refused'));
      
      // 2回目: タイムアウトエラー  
      mockFetch.mockRejectedValueOnce(new Error('ETIMEDOUT: Operation timed out'));
      
      // 3回目: 成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          authenticated: true, 
          user: { id: 'test_user', username: 'test_account' }
        })
      });

      const authPromise = client.authenticate();
      
      // タイマーを進めてリトライを実行
      jest.advanceTimersByTime(1000);
      jest.advanceTimersByTime(2000); // exponential backoff
      
      await authPromise;
      
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle DNS resolution failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ENOTFOUND: getaddrinfo failed'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });

      const authPromise = client.authenticate();
      jest.advanceTimersByTime(1000);
      
      await authPromise;
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries exceeded', async () => {
      // 4回すべてネットワークエラー（maxRetries: 3を超える）
      mockFetch.mockRejectedValue(new Error('Network failure'));

      const authPromise = client.authenticate();
      
      // すべてのリトライを実行
      jest.advanceTimersByTime(1000);
      jest.advanceTimersByTime(2000);
      jest.advanceTimersByTime(4000);
      
      await expect(authPromise).rejects.toThrow(/Network failure/);
      expect(mockFetch).toHaveBeenCalledTimes(4); // 初回 + 3回リトライ
    });
  });

  describe('API認証エラー処理', () => {
    it('should handle invalid API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({
          error: 'Invalid API key',
          code: 'AUTH_INVALID_KEY'
        })
      });

      await expect(client.authenticate()).rejects.toThrow(/Invalid API key/);
      expect(mockFetch).toHaveBeenCalledTimes(1); // 認証エラーはリトライしない
    });

    it('should handle expired API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({
          error: 'API key expired',
          code: 'AUTH_KEY_EXPIRED'
        })
      });

      await expect(client.authenticate()).rejects.toThrow(/API key expired/);
    });

    it('should handle suspended account', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => JSON.stringify({
          error: 'Account suspended',
          code: 'ACCOUNT_SUSPENDED'
        })
      });

      await expect(client.authenticate()).rejects.toThrow(/Account suspended/);
    });
  });

  describe('レート制限対応', () => {
    it('should handle rate limit with Retry-After header', async () => {
      // 認証成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // レート制限エラー
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({ 'Retry-After': '60' }),
        text: async () => JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED'
        })
      });

      // リトライ後成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: '1234567890',
            text: 'Test post after rate limit',
            created_at: '2025-01-28T18:00:00.000Z'
          }
        })
      });

      const postPromise = client.post('Test post');
      
      // Retry-Afterの時間を進める
      jest.advanceTimersByTime(60000);
      
      const result = await postPromise;
      
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // auth + rate limited + success
    });

    it('should handle rate limit without Retry-After header', async () => {
      // 認証成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // レート制限（Retry-Afterなし）
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => JSON.stringify({
          error: 'Rate limit exceeded'
        })
      });

      // リトライ後成功（デフォルトバックオフ時間使用）
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

      const postPromise = client.post('Test post');
      
      // デフォルトバックオフ時間を進める
      jest.advanceTimersByTime(1000);
      
      const result = await postPromise;
      
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple consecutive rate limits', async () => {
      // 認証成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // 1回目レート制限
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '30' }),
        text: async () => 'Rate limit exceeded'
      });

      // 2回目もレート制限
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '60' }),
        text: async () => 'Rate limit exceeded'
      });

      // 3回目成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: '123', text: 'Success', created_at: '2025-01-28T18:00:00.000Z' }
        })
      });

      const postPromise = client.post('Test post');
      
      jest.advanceTimersByTime(30000); // 1回目のRetry-After
      jest.advanceTimersByTime(60000); // 2回目のRetry-After
      
      const result = await postPromise;
      
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(4); // auth + 3 attempts
    });
  });

  describe('サーバーエラー処理', () => {
    it('should retry on 500 Internal Server Error', async () => {
      // 認証成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // サーバーエラー
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server temporarily unavailable'
      });

      // リトライ成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: '123', text: 'Success', created_at: '2025-01-28T18:00:00.000Z' }
        })
      });

      const postPromise = client.post('Test post');
      jest.advanceTimersByTime(1000);
      
      const result = await postPromise;
      
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on 502 Bad Gateway', async () => {
      // 認証成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // Bad Gateway
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: async () => 'Upstream server error'
      });

      // リトライ成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { retweeted: true, id: 'tweet123' }
        })
      });

      const retweetPromise = client.retweet('tweet123');
      jest.advanceTimersByTime(1000);
      
      const result = await retweetPromise;
      
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 400 Bad Request', async () => {
      // 認証成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // クライアントエラー（リトライしない）
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({
          error: 'Tweet text is too long',
          code: 'TWEET_TOO_LONG'
        })
      });

      const result = await client.post('A'.repeat(300)); // 280文字制限超過
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('API error');
      expect(mockFetch).toHaveBeenCalledTimes(2); // auth + 1回のみ（リトライなし）
    });
  });

  describe('タイムアウト処理', () => {
    it('should handle request timeout', async () => {
      // 認証成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // タイムアウトエラー
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 35000);
        })
      );

      // リトライ成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { liked: true, id: 'tweet123' }
        })
      });

      const likePromise = client.like('tweet123');
      
      // タイムアウト時間を進める
      jest.advanceTimersByTime(35000);
      jest.advanceTimersByTime(1000); // リトライ待機
      
      const result = await likePromise;
      
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle connection timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ETIMEDOUT'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });

      const authPromise = client.authenticate();
      jest.advanceTimersByTime(1000);
      
      await authPromise;
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('データ形式エラー処理', () => {
    it('should handle invalid JSON response', async () => {
      // 認証成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // 無効なJSON
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Unexpected token in JSON');
        },
        text: async () => 'Invalid JSON response'
      });

      // リトライで正常なレスポンス
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ id: '123', text: 'Valid response' }],
          meta: { result_count: 1 }
        })
      });

      const searchPromise = client.searchTweets('test query');
      jest.advanceTimersByTime(1000);
      
      const result = await searchPromise;
      
      expect(result.data).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle missing required fields', async () => {
      // 認証成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // 必須フィールドが欠如したレスポンス
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // data フィールドが欠如
          meta: { result_count: 0 }
        })
      });

      const result = await client.searchTweets('test query');
      
      // クライアントが適切にフォールバック処理を行うことを確認
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle empty response', async () => {
      // 認証成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // 空のレスポンス
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
        text: async () => '{}'
      });

      const result = await client.testConnection();
      
      // 適切なデフォルト値が返されることを確認
      expect(typeof result).toBe('boolean');
    });
  });

  describe('複合エラーシナリオ', () => {
    it('should handle network failure followed by rate limit', async () => {
      // 認証成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // 1. ネットワークエラー
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));
      
      // 2. レート制限
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '30' }),
        text: async () => 'Rate limit exceeded'
      });
      
      // 3. 成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: '123', text: 'Success', created_at: '2025-01-28T18:00:00.000Z' }
        })
      });

      const postPromise = client.post('Test post');
      
      jest.advanceTimersByTime(1000); // ネットワークエラーのリトライ
      jest.advanceTimersByTime(30000); // レート制限のRetry-After
      
      const result = await postPromise;
      
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(4); // auth + 3 attempts
    });

    it('should maintain operation continuity after multiple error types', async () => {
      // 認証成功
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true })
      });
      await client.authenticate();

      // 複数の操作で異なるエラーが発生するが、システムは継続動作する
      
      // 操作1: タイムアウト → リトライ成功
      mockFetch.mockRejectedValueOnce(new Error('ETIMEDOUT'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: '1', text: 'Post 1' } })
      });

      const post1Promise = client.post('Test post 1');
      jest.advanceTimersByTime(1000);
      const result1 = await post1Promise;
      expect(result1.success).toBe(true);

      // 操作2: レート制限 → 待機後成功
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '10' })
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { retweeted: true } })
      });

      const retweetPromise = client.retweet('tweet123');
      jest.advanceTimersByTime(10000);
      const result2 = await retweetPromise;
      expect(result2.success).toBe(true);

      // 操作3: サーバーエラー → リトライ成功
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal error'
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { liked: true } })
      });

      const likePromise = client.like('tweet456');
      jest.advanceTimersByTime(1000);
      const result3 = await likePromise;
      expect(result3.success).toBe(true);

      // すべての操作が最終的に成功することを確認
      expect([result1, result2, result3].every(r => r.success)).toBe(true);
    });
  });
});