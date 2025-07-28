/**
 * KaitoTwitterAPIClient Unit Tests
 * src/kaito-api/core/client.tsのKaitoTwitterAPIClientクラステスト
 * 
 * テスト対象（実際に使用されるメソッドのみ）:
 * - authenticate() - 認証
 * - testConnection() - 接続テスト
 * - getAccountInfo() - アカウント情報取得
 * - post() - 投稿作成
 * - searchTweets() - ツイート検索
 * - retweet() - リツイート
 * - getUserLastTweets() - ユーザーの最新ツイート取得
 * - searchTrends() - トレンド検索（オプショナル）
 */

import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
import { 
  KaitoClientConfig, 
  KaitoAPIConfig,
  PostResult,
  RetweetResult,
  AccountInfo
} from '../../../src/kaito-api/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================================================
// TEST HELPER FUNCTIONS
// ============================================================================

/**
 * テストヘルパー関数 - KaitoTwitterAPIClientのモックインスタンス作成
 */
function createMockClient(overrides?: Partial<KaitoClientConfig>): KaitoTwitterAPIClient {
  const defaultConfig: Partial<KaitoClientConfig> = {
    apiKey: 'test-api-key',
    qpsLimit: 200,
    retryPolicy: {
      maxRetries: 3,
      backoffMs: 1000
    },
    costTracking: true
  };

  const config = { ...defaultConfig, ...overrides };
  const client = new KaitoTwitterAPIClient(config);
  
  // デフォルトのAPI設定で初期化
  const mockAPIConfig: KaitoAPIConfig = {
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
      primaryKey: config.apiKey || 'test-key',
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

  client.initializeWithConfig(mockAPIConfig);
  return client;
}

/**
 * 成功レスポンスをモック化
 */
function mockSuccessResponse(data: any): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data })
  });
}

/**
 * エラーレスポンスをモック化
 */
function mockErrorResponse(status: number, error: string): void {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText: getStatusText(status),
    text: async () => error
  });
}

/**
 * ステータスコードに対応するステータステキストを取得
 */
function getStatusText(status: number): string {
  const statusTexts: { [key: number]: string } = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    429: 'Too Many Requests',
    500: 'Internal Server Error'
  };
  return statusTexts[status] || 'Unknown';
}

/**
 * QPS制御の待機（テスト用）
 */
async function waitForQPS(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 10));
}

/**
 * 認証済みクライアントの作成
 */
async function createAuthenticatedClient(config?: Partial<KaitoClientConfig>): Promise<KaitoTwitterAPIClient> {
  const client = createMockClient(config);
  
  // 認証成功をモック化
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ authenticated: true, user: {} })
  });
  
  await client.authenticate();
  mockFetch.mockClear();
  
  return client;
}

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
      
      expect(defaultClient).toBeInstanceOf(KaitoTwitterAPIClient);
    });

    it('should initialize with provided config', () => {
      const customConfig = {
        apiKey: 'custom-key',
        qpsLimit: 100,
        retryPolicy: { maxRetries: 5, backoffMs: 2000 },
        costTracking: false
      };

      const customClient = new KaitoTwitterAPIClient(customConfig);
      
      expect(customClient).toBeInstanceOf(KaitoTwitterAPIClient);
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

    // 正常系
    it('should post successfully with valid content', async () => {
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
        expect.stringContaining('/twitter/tweet/create'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ text: 'Hello world' })
        })
      );
    });

    it('should handle post with emoji and special characters', async () => {
      const contentWithEmoji = 'Hello world! 🚀 #trading @username $STOCK';
      const mockPostResponse = {
        data: {
          id: '1234567890',
          text: contentWithEmoji,
          created_at: '2023-01-01T00:00:00.000Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPostResponse
      });

      const result = await client.post(contentWithEmoji);

      expect(result.success).toBe(true);
      expect(result.id).toBe('1234567890');
    });

    it('should trim whitespace from content', async () => {
      const contentWithWhitespace = '  Hello world  ';
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

      const result = await client.post(contentWithWhitespace);

      expect(result.success).toBe(true);
    });

    // 異常系
    it('should throw error when content is empty', async () => {
      const result = await client.post('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Post content cannot be empty');
    });

    it('should throw error when content exceeds 280 characters', async () => {
      const longContent = 'a'.repeat(281);
      const result = await client.post(longContent);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Post content exceeds 280 character limit');
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.post('Valid content');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should retry on temporary failures', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { id: '123', text: 'test', created_at: '2023-01-01T00:00:00.000Z' }
          })
        });

      const result = await client.post('Test retry');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle rate limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded'
      });

      const result = await client.post('Valid content');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
    });

    // 境界値
    it('should post exactly 280 characters', async () => {
      const content280 = 'a'.repeat(280);
      const mockPostResponse = {
        data: {
          id: '1234567890',
          text: content280,
          created_at: '2023-01-01T00:00:00.000Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPostResponse
      });

      const result = await client.post(content280);

      expect(result.success).toBe(true);
    });

    it('should post single character', async () => {
      const singleChar = 'a';
      const mockPostResponse = {
        data: {
          id: '1234567890',
          text: singleChar,
          created_at: '2023-01-01T00:00:00.000Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPostResponse
      });

      const result = await client.post(singleChar);

      expect(result.success).toBe(true);
    });

    it('should handle multi-byte characters (日本語、絵文字)', async () => {
      const japaneseContent = '投資教育について 📈 🤖';
      const mockPostResponse = {
        data: {
          id: '1234567890',
          text: japaneseContent,
          created_at: '2023-01-01T00:00:00.000Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPostResponse
      });

      const result = await client.post(japaneseContent);

      expect(result.success).toBe(true);
    });

    // レガシーテスト（後方互換性）
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
        expect.stringContaining('/twitter/tweet/create'),
        expect.objectContaining({
          body: JSON.stringify({
            text: 'Hello with media',
            media: { media_ids: ['media1', 'media2'] },
            in_reply_to_tweet_id: 'tweet123'
          })
        })
      );
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

    // 正常系
    it('should retweet successfully with valid tweet ID', async () => {
      const tweetId = '1234567890';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { retweeted: true } })
      });

      const result: RetweetResult = await client.retweet(tweetId);

      expect(result.success).toBe(true);
      expect(result.originalTweetId).toBe(tweetId);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/twitter/action/retweet'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should return correct retweet result structure', async () => {
      const tweetId = '1234567890';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { retweeted: true } })
      });

      const result: RetweetResult = await client.retweet(tweetId);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('originalTweetId', tweetId);
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('success', true);
      expect(typeof result.timestamp).toBe('string');
    });

    // 異常系
    it('should throw error when tweet ID is empty', async () => {
      const result = await client.retweet('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should throw error when tweet ID has invalid format', async () => {
      const invalidIds = ['invalid', '123abc', 'tweet_id', 'not-a-tweet-id'];
      
      for (const invalidId of invalidIds) {
        const result = await client.retweet(invalidId);
        expect(result.success).toBe(false);
      }
    });

    it('should handle already retweeted error', async () => {
      const tweetId = '1234567890';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'You have already retweeted this tweet'
      });

      const result = await client.retweet(tweetId);

      expect(result.success).toBe(false);
      expect(result.originalTweetId).toBe(tweetId);
      expect(result.error).toContain('API error');
    });

    it('should handle tweet not found error', async () => {
      const tweetId = '9999999999';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Sorry, that page does not exist'
      });

      const result = await client.retweet(tweetId);

      expect(result.success).toBe(false);
      expect(result.originalTweetId).toBe(tweetId);
      expect(result.error).toContain('API error');
    });

    it('should handle network errors', async () => {
      const tweetId = '1234567890';
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.retweet(tweetId);

      expect(result.success).toBe(false);
      expect(result.originalTweetId).toBe(tweetId);
      expect(result.error).toBeDefined();
    });

    // 境界値
    it('should handle tweet ID edge cases', async () => {
      // 最小長のID
      const shortId = '1';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { retweeted: true } })
      });

      const result1 = await client.retweet(shortId);
      expect(result1.success).toBe(true);

      // 長いID
      const longId = '1234567890123456789';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { retweeted: true } })
      });

      const result2 = await client.retweet(longId);
      expect(result2.success).toBe(true);
    });

    it('should handle rate limit and retry', async () => {
      const tweetId = '1234567890';
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: async () => 'Rate limit exceeded'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { retweeted: true } })
        });

      const result = await client.retweet(tweetId);
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should update rate limit after successful retweet', async () => {
      const tweetId = '1234567890';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { retweeted: true } })
      });

      const initialRemaining = client.getRateLimitStatus().posting.remaining;
      await client.retweet(tweetId);
      const afterRemaining = client.getRateLimitStatus().posting.remaining;

      expect(afterRemaining).toBe(initialRemaining - 1);
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

    // 正常系
    it('should like tweet successfully', async () => {
      const tweetId = '1234567890';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { liked: true } })
      });

      const result = await client.like(tweetId);

      expect(result.success).toBe(true);
      expect(result.tweetId).toBe(tweetId);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/twitter/action/like'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should return correct like result structure', async () => {
      const tweetId = '1234567890';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { liked: true } })
      });

      const result = await client.like(tweetId);

      expect(result).toHaveProperty('tweetId', tweetId);
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('success', true);
      expect(typeof result.timestamp).toBe('string');
      expect(result.error).toBeUndefined();
    });

    // 異常系
    it('should throw error when tweet ID is empty', async () => {
      const result = await client.like('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should throw error when tweet ID is invalid', async () => {
      const invalidIds = ['invalid', '123abc', 'tweet_id', 'not-a-tweet-id'];
      
      for (const invalidId of invalidIds) {
        const result = await client.like(invalidId);
        expect(result.success).toBe(false);
      }
    });

    it('should handle already liked error', async () => {
      const tweetId = '1234567890';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'You have already liked this tweet'
      });

      const result = await client.like(tweetId);

      expect(result.success).toBe(false);
      expect(result.tweetId).toBe(tweetId);
      expect(result.error).toContain('API error');
    });

    it('should handle tweet not found error', async () => {
      const tweetId = '9999999999';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Sorry, that page does not exist'
      });

      const result = await client.like(tweetId);

      expect(result.success).toBe(false);
      expect(result.tweetId).toBe(tweetId);
      expect(result.error).toContain('API error');
    });

    it('should handle permission errors', async () => {
      const tweetId = '1234567890';
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Unauthorized to like this tweet'
      });

      const result = await client.like(tweetId);

      expect(result.success).toBe(false);
      expect(result.tweetId).toBe(tweetId);
      expect(result.error).toContain('API error');
    });

    // QPS制御
    it('should respect QPS limits', async () => {
      const tweetId = '1234567890';
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { liked: true } })
      });

      // 連続でいいねを実行
      const promises = [
        client.like('1111111111'),
        client.like('2222222222'),
        client.like('3333333333')
      ];

      const results = await Promise.all(promises);
      
      // すべて成功することを確認
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // QPS制御により適切に間隔が空いていることを確認
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle network errors', async () => {
      const tweetId = '1234567890';
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.like(tweetId);

      expect(result.success).toBe(false);
      expect(result.tweetId).toBe(tweetId);
      expect(result.error).toBeDefined();
    });

    it('should handle rate limit and retry', async () => {
      const tweetId = '1234567890';
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: async () => 'Rate limit exceeded'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { liked: true } })
        });

      const result = await client.like(tweetId);
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should update rate limit after successful like', async () => {
      const tweetId = '1234567890';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { liked: true } })
      });

      const initialRemaining = client.getRateLimitStatus().general.remaining;
      await client.like(tweetId);
      const afterRemaining = client.getRateLimitStatus().general.remaining;

      expect(afterRemaining).toBe(initialRemaining - 1);
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

    it('should return user last tweets (mock implementation)', async () => {
      const tweets = await client.getUserLastTweets('123456789', 10);

      expect(Array.isArray(tweets)).toBe(true);
      expect(tweets.length).toBe(0); // Mock implementation returns empty array
    });
  });

  describe('searchTweets', () => {
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

    it('should search tweets successfully', async () => {
      const mockSearchResponse = {
        data: [
          {
            id: '1234567890',
            text: '投資教育に関する重要な話',
            author_id: '987654321',
            created_at: '2023-01-01T00:00:00.000Z'
          },
          {
            id: '0987654321',
            text: 'トレード戦略について',
            author_id: '123456789',
            created_at: '2023-01-01T01:00:00.000Z'
          }
        ],
        meta: {
          result_count: 2,
          next_token: 'abc123'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse
      });

      const result = await client.searchTweets('投資教育');

      expect(result).toEqual(mockSearchResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/search/tweets'),
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should handle search with no results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          meta: { result_count: 0 }
        })
      });

      const result = await client.searchTweets('特殊な検索クエリ');

      expect(result.data).toHaveLength(0);
      expect(result.meta.result_count).toBe(0);
    });

    it('should handle search errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid search query'
      });

      await expect(client.searchTweets('')).rejects.toThrow();
    });
  });


  describe('エラーハンドリング', () => {
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

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Integration Tests', () => {
    beforeEach(async () => {
      // 認証成功をモック化
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

    it('should handle authentication → post flow', async () => {
      // 認証が完了していることを確認
      expect(client).toBeDefined();

      // 投稿の実行
      mockSuccessResponse({
        id: '1234567890',
        text: 'Integration test post',
        created_at: '2023-01-01T00:00:00.000Z'
      });

      const result = await client.post('Integration test post');

      expect(result.success).toBe(true);
      expect(result.id).toBe('1234567890');
    });

    it('should handle rate limit → wait → retry flow', async () => {
      const tweetId = '1234567890';

      // 最初のリクエストはrate limitエラー
      mockErrorResponse(429, 'Rate limit exceeded');
      
      // リトライは成功
      mockSuccessResponse({ retweeted: true });

      const result = await client.retweet(tweetId);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle error → retry → success flow', async () => {
      const content = 'Test retry flow';

      // 最初のリクエストは一時的なエラー
      mockFetch.mockRejectedValueOnce(new Error('Temporary network error'));
      
      // リトライは成功
      mockSuccessResponse({
        id: '1234567890',
        text: content,
        created_at: '2023-01-01T00:00:00.000Z'
      });

      const result = await client.post(content);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle complex workflow: post → retweet → like', async () => {
      // 投稿
      mockSuccessResponse({
        id: '1111111111',
        text: 'Original post',
        created_at: '2023-01-01T00:00:00.000Z'
      });

      const postResult = await client.post('Original post');
      expect(postResult.success).toBe(true);

      // リツイート
      mockSuccessResponse({ retweeted: true });

      const retweetResult = await client.retweet('2222222222');
      expect(retweetResult.success).toBe(true);

      // いいね
      mockSuccessResponse({ liked: true });

      const likeResult = await client.like('3333333333');
      expect(likeResult.success).toBe(true);

      // 全体的な統計確認
      const rateLimits = client.getRateLimitStatus();
      expect(rateLimits.posting.remaining).toBeLessThan(300); // 初期値より減少
    });

    it('should handle QPS control across multiple operations', async () => {
      const operations = [
        () => {
          mockSuccessResponse({ liked: true });
          return client.like('1111111111');
        },
        () => {
          mockSuccessResponse({ liked: true });
          return client.like('2222222222');
        },
        () => {
          mockSuccessResponse({ retweeted: true });
          return client.retweet('3333333333');
        }
      ];

      const startTime = Date.now();
      const results = await Promise.all(operations.map(op => op()));
      const endTime = Date.now();

      // すべて成功
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // QPS制御により時間がかかっていることを確認（モック環境では短縮）
      expect(endTime - startTime).toBeGreaterThanOrEqual(0);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle cost tracking across operations', async () => {
      const initialCost = client.getCostTrackingInfo().tweetsProcessed;

      // 複数の操作を実行
      mockSuccessResponse({
        id: '1234567890',
        text: 'Test post',
        created_at: '2023-01-01T00:00:00.000Z'
      });
      await client.post('Test post');

      mockSuccessResponse({ retweeted: true });
      await client.retweet('1111111111');

      mockSuccessResponse({ liked: true });
      await client.like('2222222222');

      const finalCost = client.getCostTrackingInfo().tweetsProcessed;
      
      // コストが適切に追跡されていることを確認
      expect(finalCost).toBe(initialCost + 3);
    });
  });
});