/**
 * KaitoTwitterAPIClient Integration Tests - 統合テスト
 * src/kaito-api/core/client.tsのクラス間連携テスト
 * 
 * テスト対象:
 * - HttpClient + QPSController + APIErrorHandler + KaitoTwitterAPIClient の統合動作
 * - エンドツーエンドシナリオ
 * - リアルタイムでの複合機能テスト
 * - パフォーマンス・信頼性テスト
 */

import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
import { 
  KaitoClientConfig, 
  KaitoAPIConfig,
  PostResult,
  RetweetResult,
  LikeResult
} from '../../../src/kaito-api/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('KaitoTwitterAPIClient Integration Tests', () => {
  let client: KaitoTwitterAPIClient;
  let mockConfig: Partial<KaitoClientConfig>;
  let mockAPIConfig: KaitoAPIConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    process.env.KAITO_API_TOKEN = 'integration-test-token';

    mockConfig = {
      apiKey: 'integration-test-key',
      qpsLimit: 1000, // QPS制限を無効化してリトライテストに集中
      retryPolicy: {
        maxRetries: 2,
        backoffMs: 100
      },
      costTracking: true
    };

    mockAPIConfig = {
      api: {
        baseUrl: 'https://api.twitterapi.io',
        timeout: 5000, // 短いタイムアウトでテスト
        version: 'v1'
      },
      authentication: {
        primaryKey: 'integration-test-key',
        requiresAuth: true
      },
      environment: 'test' as const,
      rateLimits: {
        general: { rpm: 100, rph: 100 },
        posting: { rpm: 50, rph: 50 },
        collection: { rpm: 75, rph: 75 }
      }
    };

    client = new KaitoTwitterAPIClient(mockConfig);
    client.initializeWithConfig(mockAPIConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.KAITO_API_TOKEN;
  });

  describe('Authentication + HTTP Client Integration', () => {
    it('should complete full authentication flow with HTTP client', async () => {
      // Mock authentication response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          authenticated: true, 
          user: { id: '123', username: 'testuser' } 
        })
      });

      // Mock setTimeout for QPS control
      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      await expect(client.authenticate()).resolves.not.toThrow();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twitterapi.io/auth/verify',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer integration-test-key',
            'Content-Type': 'application/json',
            'User-Agent': 'TradingAssistantX/1.0'
          })
        })
      );
    });

    it('should handle authentication retry with exponential backoff', async () => {
      // First attempt fails
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        // Second attempt succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ authenticated: true, user: {} })
        });

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any, delay: number) => {
          callback();
          return {} as any;
        }) as any
      );

      await expect(client.authenticate()).resolves.not.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(setTimeoutSpy).toHaveBeenCalled();

      setTimeoutSpy.mockRestore();
    });
  });

  describe('QPS Controller + HTTP Client Integration', () => {
    beforeEach(async () => {
      // Authenticate client first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();
    });

    it('should enforce QPS limits across multiple requests', async () => {
      const mockPostResponse = {
        data: {
          id: '123',
          text: 'test',
          created_at: '2023-01-01T00:00:00.000Z'
        }
      };

      // Mock successful post responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockPostResponse
      });

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any, delay: number) => {
          callback();
          return {} as any;
        }) as any
      );

      // Make multiple rapid requests (exceeds QPS limit of 5)
      const posts = [];
      for (let i = 0; i < 7; i++) {
        posts.push(client.post(`Test post ${i}`));
      }

      await Promise.all(posts);

      // QPS controller should have enforced waiting
      expect(setTimeoutSpy).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(7);

      setTimeoutSpy.mockRestore();
    });

    it('should track QPS correctly across different request types', async () => {
      // Mock responses for different request types
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { id: '1', text: 'post', created_at: '2023-01-01T00:00:00.000Z' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { retweeted: true } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { liked: true } })
        });

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      const initialQPS = client.getCurrentQPS();
      
      await client.post('Test post');
      await client.retweet('123');
      await client.like('456');

      const finalQPS = client.getCurrentQPS();
      expect(finalQPS).toBeGreaterThan(initialQPS);
    });
  });

  describe('Error Handler + Retry Integration', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();
    });

    it('should handle network errors with retry and backoff', async () => {
      // First two attempts fail with network error
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        // Third attempt succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { id: '123', text: 'success', created_at: '2023-01-01T00:00:00.000Z' }
          })
        });

      const delays: number[] = [];
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any, delay: number) => {
          delays.push(delay);
          callback();
          return {} as any;
        }) as any
      );

      const result = await client.post('Test post');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      
      // Should have exponential backoff: 100ms, 200ms
      expect(delays).toContain(100);
      expect(delays).toContain(200);

      setTimeoutSpy.mockRestore();
    });

    it('should handle rate limit errors appropriately', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded'
      });

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      const result = await client.post('Test post');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should handle authentication errors appropriately', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid authentication'
      });

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      const result = await client.post('Test post');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });
  });

  describe('Rate Limiting + Cost Tracking Integration', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();
    });

    it('should update both rate limits and cost tracking', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { id: '123', text: 'test', created_at: '2023-01-01T00:00:00.000Z' }
        })
      });

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      const initialRateLimit = client.getRateLimitStatus().posting.remaining;
      const initialCost = client.getCostTrackingInfo().tweetsProcessed;

      await client.post('Test post');

      const finalRateLimit = client.getRateLimitStatus().posting.remaining;
      const finalCost = client.getCostTrackingInfo().tweetsProcessed;

      expect(finalRateLimit).toBe(initialRateLimit - 1);
      expect(finalCost).toBe(initialCost + 1);
    });

    it('should enforce rate limits and prevent excessive requests', async () => {
      // Simulate rate limit exhaustion
      const rateLimits = client.getRateLimitStatus();
      
      // Manually set posting limit to 1 for testing
      rateLimits.posting.remaining = 1;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: '123', text: 'test', created_at: '2023-01-01T00:00:00.000Z' }
        })
      });

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any, delay: number) => {
          // Should wait for rate limit reset
          expect(delay).toBeGreaterThan(0);
          callback();
          return {} as any;
        }) as any
      );

      // First post succeeds
      await client.post('First post');

      // Second post should trigger rate limit wait
      await client.post('Second post');

      expect(setTimeoutSpy).toHaveBeenCalled();
      setTimeoutSpy.mkRestore();
    });
  });

  describe('End-to-End Scenarios', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();
    });

    it('should complete full posting workflow', async () => {
      const mockPostResponse = {
        data: {
          id: '1234567890',
          text: 'Hello integration test!',
          created_at: '2023-01-01T00:00:00.000Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPostResponse
      });

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      const result: PostResult = await client.post('Hello integration test!');

      // Verify successful post
      expect(result.success).toBe(true);
      expect(result.id).toBe('1234567890');

      // Verify rate limit updated
      const rateLimits = client.getRateLimitStatus();
      expect(rateLimits.posting.remaining).toBeLessThan(50);

      // Verify cost tracking updated
      const costInfo = client.getCostTrackingInfo();
      expect(costInfo.tweetsProcessed).toBeGreaterThan(0);

      // Verify QPS tracking
      expect(client.getCurrentQPS()).toBeGreaterThan(0);
    });

    it('should handle complex multi-operation workflow', async () => {
      // Mock responses for multiple operations
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { id: '1', text: 'post', created_at: '2023-01-01T00:00:00.000Z' }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { retweeted: true } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { liked: true } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: '123',
            username: 'testuser',
            followersCount: 1000,
            followingCount: 500,
            tweetCount: 2000
          })
        });

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      // Execute multiple operations
      const postResult = await client.post('Multi-op test');
      const retweetResult = await client.retweet('existing-tweet-123');
      const likeResult = await client.like('another-tweet-456');
      const accountInfo = await client.getAccountInfo();

      // Verify all operations succeeded
      expect(postResult.success).toBe(true);
      expect(retweetResult.success).toBe(true);
      expect(likeResult.success).toBe(true);
      expect(accountInfo.username).toBe('testuser');

      // Verify cumulative effects
      const finalCostInfo = client.getCostTrackingInfo();
      expect(finalCostInfo.tweetsProcessed).toBe(4); // post + retweet + like + account info
    });

    it('should handle mixed success/failure scenarios gracefully', async () => {
      // Mock mixed responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: { id: '1', text: 'success', created_at: '2023-01-01T00:00:00.000Z' }
          })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          text: async () => 'Tweet not found'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { liked: true } })
        });

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      // Execute mixed operations
      const successPost = await client.post('This works');
      const failedRetweet = await client.retweet('nonexistent-tweet');
      const successLike = await client.like('valid-tweet-789');

      // Verify mixed results
      expect(successPost.success).toBe(true);
      expect(failedRetweet.success).toBe(false);
      expect(failedRetweet.error).toContain('not found');
      expect(successLike.success).toBe(true);

      // Verify that successful operations still update tracking
      const costInfo = client.getCostTrackingInfo();
      expect(costInfo.tweetsProcessed).toBe(3); // All operations count for cost tracking
    });
  });

  describe('Performance and Reliability', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await client.authenticate();
      mockFetch.mockClear();
    });

    it('should handle high-frequency requests within QPS limits', async () => {
      const requestCount = 10;
      const mockResponse = {
        data: { id: '123', text: 'test', created_at: '2023-01-01T00:00:00.000Z' }
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      const startTime = Date.now();
      const promises = Array(requestCount).fill(0).map((_, i) => 
        client.post(`High frequency test ${i}`)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      expect(results.every(r => r.success)).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(requestCount);

      // QPS control should have been enforced
      expect(setTimeoutSpy).toHaveBeenCalled();

      setTimeoutSpy.mockRestore();
    });

    it('should maintain stability under error conditions', async () => {
      const requestCount = 5;
      let successCount = 0;
      let errorCount = 0;

      // Mock intermittent failures
      mockFetch.mockImplementation(() => {
        if (Math.random() > 0.5) {
          successCount++;
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: { id: '123', text: 'success', created_at: '2023-01-01T00:00:00.000Z' }
            })
          });
        } else {
          errorCount++;
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: async () => 'Server error'
          });
        }
      });

      vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      const promises = Array(requestCount).fill(0).map((_, i) => 
        client.post(`Stability test ${i}`)
      );

      const results = await Promise.all(promises);

      // Client should handle both successes and failures gracefully
      expect(results).toHaveLength(requestCount);
      expect(results.some(r => r.success)).toBe(true);
      expect(results.some(r => !r.success)).toBe(true);

      // Cost tracking should count all attempts
      const costInfo = client.getCostTrackingInfo();
      expect(costInfo.tweetsProcessed).toBe(requestCount);
    });
  });

  describe('Configuration Integration', () => {
    it('should respect custom configuration across all components', async () => {
      const customConfig = {
        apiKey: 'custom-integration-key',
        qpsLimit: 2,
        retryPolicy: { maxRetries: 1, backoffMs: 50 },
        costTracking: true
      };

      const customClient = new KaitoTwitterAPIClient(customConfig);
      customClient.initializeWithConfig(mockAPIConfig);

      // Authentication
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      });
      await customClient.authenticate();
      mockFetch.mockClear();

      // Test QPS limit enforcement
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { id: '123', text: 'test', created_at: '2023-01-01T00:00:00.000Z' }
        })
      });

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      // Make 3 requests (exceeds QPS limit of 2)
      await customClient.post('Request 1');
      await customClient.post('Request 2');
      await customClient.post('Request 3');

      // QPS controller should enforce the custom limit
      expect(setTimeoutSpy).toHaveBeenCalled();

      setTimeoutSpy.mockRestore();
    });
  });
});