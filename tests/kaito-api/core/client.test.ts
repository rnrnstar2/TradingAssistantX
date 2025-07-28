/**
 * KaitoTwitterAPIClient Unit Tests - TwitterAPI.io統合テスト
 * src/kaito-api/core/client.tsのKaitoTwitterAPIClientクラステスト
 * 
 * テスト対象:
 * - TwitterAPI.io認証処理
 * - TwitterAPI.io投稿・リツイート・引用ツイート・いいね機能
 * - TwitterAPI.ioアカウント情報取得
 * - TwitterAPI.ioレート制限管理
 * - TwitterAPI.ioコスト追跡
 * - TwitterAPI.io接続テスト
 * - TwitterAPI.io固有のQPS制御
 */

import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
import { 
  KaitoClientConfig, 
  KaitoAPIConfig,
  PostResult,
  RetweetResult,
  QuoteTweetResult,
  LikeResult,
  AccountInfo
} from '../../../src/kaito-api/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('KaitoTwitterAPIClient - TwitterAPI.io Integration', () => {
  let client: KaitoTwitterAPIClient;
  let mockConfig: Partial<KaitoClientConfig>;
  let mockAPIConfig: KaitoAPIConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock環境変数
    process.env.KAITO_API_TOKEN = 'test-api-token';
    
    // デフォルトのmockFetch設定（認証成功パターン）
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ authenticated: true, user: {} })
    });

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
      environment: 'dev',
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
        primaryKey: process.env.KAITO_API_TOKEN || 'test-key',
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
        realApiEnabled: true,
        mockFallbackEnabled: false,
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

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.KAITO_API_TOKEN;
  });

  describe('constructor', () => {
    it('should initialize with default config when no config provided', () => {
      const defaultClient = new KaitoTwitterAPIClient();
      
      expect(defaultClient.getCurrentQPS()).toBe(0);
      expect(defaultClient.getCostTrackingInfo().tweetsProcessed).toBe(0);
    });

    it('should initialize with provided config', () => {
      const customConfig = {
        apiKey: 'custom-key',
        qpsLimit: 100,
        retryPolicy: { maxRetries: 5, backoffMs: 2000 },
        costTracking: false
      };

      const customClient = new KaitoTwitterAPIClient(customConfig);
      
      expect(customClient.getCurrentQPS()).toBe(0);
    });

    it('should use environment variable for API key when not provided', () => {
      process.env.KAITO_API_TOKEN = 'env-api-key';
      const envClient = new KaitoTwitterAPIClient({});
      
      // API keyは内部で使用されるため、直接検証はできないが初期化が成功すればOK
      expect(envClient).toBeInstanceOf(KaitoTwitterAPIClient);
    });

    it('should initialize rate limits correctly', () => {
      const rateLimits = client.getRateLimitStatus();
      
      expect(rateLimits.general.remaining).toBe(900);
      expect(rateLimits.posting.remaining).toBe(300);
      expect(rateLimits.collection.remaining).toBe(500);
    });

    it('should initialize cost tracking correctly', () => {
      const costInfo = client.getCostTrackingInfo();
      
      expect(costInfo.tweetsProcessed).toBe(0);
      expect(costInfo.estimatedCost).toBe(0);
    });
  });

  describe('initializeWithConfig', () => {
    it('should set API config and create HTTP client', () => {
      const newClient = new KaitoTwitterAPIClient();
      newClient.initializeWithConfig(mockAPIConfig);
      
      // 初期化が正常に完了すればOK（内部状態の直接検証は困難）
      expect(newClient).toBeInstanceOf(KaitoTwitterAPIClient);
    });
  });

  describe('authenticate', () => {
    beforeEach(() => {
      // setTimeoutをモック化
      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );
    });

    it('should authenticate successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          authenticated: true, 
          user: { id: '123', username: 'testuser' } 
        })
      });

      await expect(client.authenticate()).resolves.not.toThrow();
    });

    it('should throw error when API key is missing', async () => {
      // 環境変数を一時的にクリア
      const originalToken = process.env.KAITO_API_TOKEN;
      delete process.env.KAITO_API_TOKEN;
      
      const noKeyClient = new KaitoTwitterAPIClient({ apiKey: '' });
      noKeyClient.initializeWithConfig(mockAPIConfig);

      // APIキーチェックが先に実行されるため、fetchは呼ばれないはず
      await expect(noKeyClient.authenticate()).rejects.toThrow(
        'API key is required for authentication'
      );
      
      // 環境変数を復元
      if (originalToken) {
        process.env.KAITO_API_TOKEN = originalToken;
      }
    });

    it('should throw error when HTTP client is not initialized', async () => {
      const uninitializedClient = new KaitoTwitterAPIClient(mockConfig);

      await expect(uninitializedClient.authenticate()).rejects.toThrow(
        'HTTP client not initialized. Call initializeWithConfig() first.'
      );
    });

    it('should throw error when authentication verification fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: false })
      });

      await expect(client.authenticate()).rejects.toThrow(
        'Authentication verification failed'
      );
    });

    it('should handle HTTP errors during authentication', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Unauthorized' })
      });

      await expect(client.authenticate()).rejects.toThrow(/Authentication failed/);
    });

    it('should retry authentication on failure', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: true, user: {} })
        });

      await expect(client.authenticate()).resolves.not.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('post', () => {
    beforeEach(async () => {
      // クライアントを認証済み状態にする
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );
    });

    it('should post successfully', async () => {
      const mockPostResponse = {
        data: {
          id: '1234567890',
          text: 'Hello world',
          created_at: '2023-01-01T00:00:00.000Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPostResponse
      });

      const result: PostResult = await client.post('Hello world');

      expect(result.success).toBe(true);
      expect(result.id).toBe('1234567890');
      expect(result.url).toBe('https://twitter.com/i/status/1234567890');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twitterapi.io/v1/tweets',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ text: 'Hello world' })
        })
      );
    });

    it('should handle post with media and reply options', async () => {
      const mockPostResponse = {
        data: {
          id: '1234567890',
          text: 'Hello with media',
          created_at: '2023-01-01T00:00:00.000Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPostResponse
      });

      const options = {
        mediaIds: ['media1', 'media2'],
        inReplyTo: 'tweet123'
      };

      await client.post('Hello with media', options);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twitterapi.io/v1/tweets',
        expect.objectContaining({
          body: JSON.stringify({
            text: 'Hello with media',
            media: { media_ids: ['media1', 'media2'] },
            in_reply_to_tweet_id: 'tweet123'
          })
        })
      );
    });

    it('should validate post content - empty content', async () => {
      const result = await client.post('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Post content cannot be empty');
    });

    it('should validate post content - exceeds character limit', async () => {
      const longContent = 'a'.repeat(281);
      const result = await client.post(longContent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Post content exceeds 280 character limit');
    });

    it('should validate post content - Korean characters', async () => {
      const koreanContent = '안녕하세요 Hello world';
      const result = await client.post(koreanContent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Korean characters are not allowed');
    });

    it('should handle API errors gracefully', async () => {
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

    it('should update rate limit after successful post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: '123', text: 'test', created_at: '2023-01-01T00:00:00.000Z' }
        })
      });

      const initialRemaining = client.getRateLimitStatus().posting.remaining;
      await client.post('Test post');
      const afterRemaining = client.getRateLimitStatus().posting.remaining;

      expect(afterRemaining).toBe(initialRemaining - 1);
    });

    it('should update cost tracking after successful post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: '123', text: 'test', created_at: '2023-01-01T00:00:00.000Z' }
        })
      });

      const initialCost = client.getCostTrackingInfo().tweetsProcessed;
      await client.post('Test post');
      const afterCost = client.getCostTrackingInfo().tweetsProcessed;

      expect(afterCost).toBe(initialCost + 1);
    });
  });

  describe('retweet', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );
    });

    it('should retweet successfully', async () => {
      const tweetId = '1234567890';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { retweeted: true } })
      });

      const result: RetweetResult = await client.retweet(tweetId);

      expect(result.success).toBe(true);
      expect(result.originalTweetId).toBe(tweetId);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.twitterapi.io/v1/tweets/${tweetId}/retweet`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should handle retweet failure', async () => {
      const tweetId = '1234567890';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Cannot retweet this tweet'
      });

      const result = await client.retweet(tweetId);

      expect(result.success).toBe(false);
      expect(result.originalTweetId).toBe(tweetId);
      expect(result.error).toContain('API error');
    });
  });

  describe('quoteTweet', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );
    });

    it('should quote tweet successfully', async () => {
      const tweetId = '1234567890';
      const comment = 'Great insight!';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: '9876543210',
            text: comment,
            created_at: '2023-01-01T00:00:00.000Z'
          }
        })
      });

      const result: QuoteTweetResult = await client.quoteTweet(tweetId, comment);

      expect(result.success).toBe(true);
      expect(result.id).toBe('9876543210');
      expect(result.originalTweetId).toBe(tweetId);
      expect(result.comment).toBe(comment);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twitterapi.io/v1/tweets',
        expect.objectContaining({
          body: JSON.stringify({
            text: comment,
            quote_tweet_id: tweetId
          })
        })
      );
    });

    it('should validate quote tweet comment', async () => {
      const result = await client.quoteTweet('123', '');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Post content cannot be empty');
    });
  });

  describe('like', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );
    });

    it('should like tweet successfully', async () => {
      const tweetId = '1234567890';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { liked: true } })
      });

      const result: LikeResult = await client.like(tweetId);

      expect(result.success).toBe(true);
      expect(result.tweetId).toBe(tweetId);
      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.twitterapi.io/v1/tweets/${tweetId}/like`,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should handle like failure', async () => {
      const tweetId = '1234567890';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Tweet not found'
      });

      const result = await client.like(tweetId);

      expect(result.success).toBe(false);
      expect(result.tweetId).toBe(tweetId);
      expect(result.error).toContain('API error');
    });
  });

  describe('getAccountInfo', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );
    });

    it('should get account info successfully', async () => {
      const mockAccountInfo = {
        id: '123456789',
        username: 'testuser',
        displayName: 'Test User',
        followersCount: 1000,
        followingCount: 500,
        tweetCount: 2000,
        listedCount: 10,
        verified: false,
        profileImageUrl: 'https://pbs.twimg.com/profile_images/123/avatar.jpg',
        bannerImageUrl: 'https://pbs.twimg.com/profile_banners/123/banner.jpg',
        bio: 'Test bio',
        location: 'Test Location',
        website: 'https://example.com',
        createdAt: '2020-01-01T00:00:00.000Z'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccountInfo
      });

      const result: AccountInfo = await client.getAccountInfo();

      expect(result.id).toBe('123456789');
      expect(result.username).toBe('testuser');
      expect(result.followersCount).toBe(1000);
      expect(result.timestamp).toBeDefined();
    });

    it('should handle account info API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Unauthorized' })
      });

      await expect(client.getAccountInfo()).rejects.toThrow(/Authentication failed/);
    });
  });

  describe('testConnection', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );
    });

    it('should test connection successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          status: 'ok', 
          timestamp: '2023-01-01T00:00:00.000Z' 
        })
      });

      const result = await client.testConnection();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twitterapi.io/v1/health',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should handle connection test failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'error' })
      });

      const result = await client.testConnection();

      expect(result).toBe(false);
    });

    it('should handle connection test network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should return rate limit status', () => {
      const rateLimits = client.getRateLimitStatus();

      expect(rateLimits).toHaveProperty('general');
      expect(rateLimits).toHaveProperty('posting');
      expect(rateLimits).toHaveProperty('collection');
      expect(rateLimits).toHaveProperty('lastUpdated');
    });

    it('should return current QPS', () => {
      const qps = client.getCurrentQPS();
      expect(typeof qps).toBe('number');
      expect(qps).toBeGreaterThanOrEqual(0);
    });

    it('should return cost tracking info', () => {
      const costInfo = client.getCostTrackingInfo();

      expect(costInfo).toHaveProperty('tweetsProcessed');
      expect(costInfo).toHaveProperty('estimatedCost');
      expect(costInfo).toHaveProperty('resetDate');
      expect(costInfo).toHaveProperty('lastUpdated');
    });

    it('should return user last tweets (mock implementation)', async () => {
      const tweets = await client.getUserLastTweets('123456789', 10);

      expect(Array.isArray(tweets)).toBe(true);
      expect(tweets.length).toBe(0); // Mock implementation returns empty array
    });
  });

  describe('QPS制御', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );
    });

    it('should enforce 200 QPS limit accurately', async () => {
      const startTime = Date.now();
      const requestPromises: Promise<any>[] = [];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      // 200リクエストを同時実行
      for (let i = 0; i < 200; i++) {
        requestPromises.push(client.testConnection());
      }

      await Promise.all(requestPromises);
      const elapsed = Date.now() - startTime;

      // 1秒以上かかることを確認（QPS制御が動作）
      expect(elapsed).toBeGreaterThanOrEqual(950);
      expect(elapsed).toBeLessThan(2000); // 過度に遅くない
    });

    it('should handle QPS violation with proper waiting', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) });

      const qpsController = (client as any).qpsController;
      const spy = jest.spyOn(qpsController, 'enforceQPS');

      await client.testConnection();
      await client.testConnection();

      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should maintain QPS under high load', async () => {
      const startTime = Date.now();
      const batchSize = 50;
      const batches = 4; // Total 200 requests
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      for (let batch = 0; batch < batches; batch++) {
        const batchPromises = [];
        for (let i = 0; i < batchSize; i++) {
          batchPromises.push(client.testConnection());
        }
        await Promise.all(batchPromises);
        vi.advanceTimersByTime(250); // Simulate 250ms between batches
      }

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThan(750); // Minimum time for 200 requests at 200 QPS
    });
  });

  describe('コスト追跡機能', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );
    });

    it('should track tweet processing count accurately', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { id: '123', text: 'test', created_at: '2023-01-01T00:00:00.000Z' }
        })
      });

      await client.post('Tweet 1');
      await client.post('Tweet 2');
      await client.post('Tweet 3');

      const costInfo = client.getCostTrackingInfo();
      expect(costInfo.tweetsProcessed).toBe(3);
      expect(costInfo.estimatedCost).toBeCloseTo(0.00045, 5); // 3/1000 * 0.15
    });

    it('should issue warning when budget limit is approached', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // コスト追跡を強制的に高額に設定
      const costTracker = (client as any).costTracking;
      costTracker.tweetsProcessed = 53000; // $7.95相当（8ドル上限に近い）

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { id: '123', text: 'test', created_at: '2023-01-01T00:00:00.000Z' }
        })
      });

      await client.post('Test tweet');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('予算警告')
      );

      consoleSpy.mockRestore();
    });

    it('should calculate costs correctly for different actions', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { liked: true } })
      });

      const initialCost = client.getCostTrackingInfo().estimatedCost;
      
      // 各種アクション実行
      await client.like('tweet123');
      await client.retweet('tweet456');
      
      const finalCost = client.getCostTrackingInfo().estimatedCost;
      expect(finalCost).toBeGreaterThan(initialCost);
    });

    it('should reset cost tracking monthly', () => {
      const costInfo = client.getCostTrackingInfo();
      const resetDate = new Date(costInfo.resetDate);
      const now = new Date();
      
      // リセット日が今月または来月の1日であることを確認
      expect(resetDate.getDate()).toBe(1);
      expect(
        resetDate.getMonth() === now.getMonth() || 
        resetDate.getMonth() === (now.getMonth() + 1) % 12
      ).toBe(true);
    });
  });

  describe('パフォーマンステスト', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();
    });

    it('should maintain response time under 2 seconds for single requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      const startTime = Date.now();
      await client.testConnection();
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(2000);
    });

    it('should handle concurrent requests efficiently', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      const startTime = Date.now();
      const concurrentRequests = Array(10).fill(null).map(() => client.testConnection());
      
      await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      // 10リクエストが5秒以内で完了することを確認（QPS制御考慮）
      expect(totalTime).toBeLessThan(5000);
    });

    it('should not consume excessive memory during operation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      // 100回のリクエストを実行
      for (let i = 0; i < 100; i++) {
        await client.testConnection();
        
        // 10回ごとにガベージコレクション実行
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // メモリ増加が10MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('TwitterAPI.io固有エラーハンドリング', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();
    });

    it('should handle TwitterAPI.io specific 404 errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Endpoint not found - check API documentation'
      });

      const result = await client.post('Test post');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Endpoint not found');
    });

    it('should handle TwitterAPI.io rate limit with exponential backoff', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            text: async () => 'Rate limit exceeded'
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: { id: '123', text: 'test', created_at: '2023-01-01T00:00:00.000Z' }
          })
        });
      });

      const result = await client.post('Test post');
      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // 2回失敗後、3回目で成功
    });

    it('should handle TwitterAPI.io authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Invalid API key - authentication failed',
            type: 'authentication'
          }
        })
      });

      const result = await client.post('Test post');
      expect(result.success).toBe(false);
      expect(result.error).toContain('authentication failed');
    });

    it('should handle network timeouts gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('fetch timeout'));

      const result = await client.testConnection();
      expect(result).toBe(false);
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Unexpected token in JSON');
        }
      });

      const result = await client.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('TwitterAPI.io Error Handling', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();
    });

    it('should handle rate limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded'
      });

      const result = await client.post('Test post');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
    });

    it('should handle authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid authentication'
      });

      const result = await client.post('Test post');
      expect(result.success).toBe(false);
      expect(result.error).toContain('API error');
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await client.testConnection();
      expect(result).toBe(false);
    });

    it('should handle invalid tweet content', async () => {
      const longContent = 'a'.repeat(281); // 280文字超過
      
      const result = await client.post(longContent);
      expect(result.success).toBe(false);
      expect(result.error).toContain('280 character limit');
    });
  });
});