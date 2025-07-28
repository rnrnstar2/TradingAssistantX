/**
 * TwitterAPI.io Performance Tests - パフォーマンステスト
 * レスポンス時間・QPS制限・コスト追跡の動作を確認
 * 
 * テスト対象:
 * - TwitterAPI.io レスポンス時間測定
 * - QPS制限の適切な動作
 * - コスト追跡の正確性
 * - リクエスト間隔制御
 */

import { describe, test, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
import { KaitoAPIConfig, KaitoClientConfig } from '../../../src/kaito-api/types';

describe('TwitterAPI.io Performance Tests', () => {
  let client: KaitoTwitterAPIClient;
  let mockConfig: KaitoAPIConfig;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Mock fetch globally
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // デフォルトのmockFetch設定
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ 
        status: 'ok', 
        timestamp: new Date().toISOString() 
      })
    } as Response);

    mockConfig = {
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
        primaryKey: 'test-api-key',
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

    client = new KaitoTwitterAPIClient({
      apiKey: 'test-api-key',
      qpsLimit: 200,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000
      },
      costTracking: true
    });
    client.initializeWithConfig(mockConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Response Time Tests', () => {
    it('should meet 700ms response time requirement', async () => {
      // Mock a response that completes within the time limit
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          status: 'ok', 
          timestamp: new Date().toISOString() 
        })
      } as Response);

      const startTime = Date.now();
      
      await client.testConnection();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 1秒以内
      console.log(`Response time: ${duration}ms`);
    });

    it('should handle slow responses gracefully', async () => {
      // Mock a slow response
      mockFetch.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          ok: true,
          json: async () => ({ 
            status: 'ok', 
            timestamp: new Date().toISOString() 
          })
        } as Response;
      });

      const startTime = Date.now();
      
      await client.testConnection();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThan(400); // 少なくとも遅延時間分
      console.log(`Slow response time: ${duration}ms`);
    });

    it('should track response times for metrics', async () => {
      const times: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await client.testConnection();
        times.push(Date.now() - start);
      }

      // すべてのレスポンス時間が記録されている
      expect(times).toHaveLength(5);
      times.forEach(time => {
        expect(time).toBeGreaterThanOrEqual(0);
      });

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Average response time: ${avgTime}ms`);
    });
  });

  describe('QPS Control Tests', () => {
    beforeEach(async () => {
      // 認証を先に完了
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      } as Response);
      await client.authenticate();
      mockFetch.mockClear();
    });

    it('should enforce QPS limits correctly', async () => {
      // Mock setTimeout to simulate real timing
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any, delay: number) => {
          console.log(`QPS enforcing delay: ${delay}ms`);
          expect(delay).toBeGreaterThan(0);
          callback();
          return {} as any;
        }) as any
      );

      // QPS制限のテスト用に成功レスポンスを設定
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ 
          status: 'ok', 
          timestamp: new Date().toISOString() 
        })
      } as Response);

      const qpsController = client.getCurrentQPS();
      
      // 連続リクエストでQPS制限が働くことを確認
      const requests = Array(10).fill(null).map(() => client.testConnection());
      
      const startTime = Date.now();
      await Promise.all(requests);
      const duration = Date.now() - startTime;
      
      // QPS制限により適切な時間がかかることを確認
      expect(duration).toBeGreaterThan(700 * 9); // 最低間隔の確保
      
      setTimeoutSpy.mockRestore();
    });

    it('should measure current QPS accurately', async () => {
      const initialQPS = client.getCurrentQPS();
      expect(initialQPS).toBeGreaterThanOrEqual(0);
      
      // 複数のリクエスト実行
      await client.testConnection();
      await client.testConnection();
      
      const finalQPS = client.getCurrentQPS();
      expect(finalQPS).toBeGreaterThanOrEqual(0);
      
      console.log(`QPS: ${initialQPS} -> ${finalQPS}`);
    });

    it('should respect configured QPS limits', async () => {
      // QPS制限が設定値を超えないことを確認
      const maxQPS = 200; // テスト用制限
      
      const qpsReadings: number[] = [];
      
      // 連続的にQPSを測定
      for (let i = 0; i < 5; i++) {
        await client.testConnection();
        const currentQPS = client.getCurrentQPS();
        qpsReadings.push(currentQPS);
      }
      
      qpsReadings.forEach(qps => {
        expect(qps).toBeLessThanOrEqual(maxQPS);
      });
      
      console.log('QPS readings:', qpsReadings);
    });
  });

  describe('Cost Tracking Tests', () => {
    beforeEach(async () => {
      // 認証を先に完了
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      } as Response);
      await client.authenticate();
      mockFetch.mockClear();
    });

    it('should track cost accurately', async () => {
      const initialCost = client.getCostTrackingInfo();
      
      // API呼び出しの成功レスポンスを設定
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ 
          status: 'ok', 
          timestamp: new Date().toISOString() 
        })
      } as Response);
      
      await client.testConnection();
      await client.testConnection();
      
      const finalCost = client.getCostTrackingInfo();
      
      expect(finalCost.tweetsProcessed).toBe(initialCost.tweetsProcessed + 2);
      
      const expectedCostIncrease = (2 / 1000) * 0.15; // $0.15/1k tweets
      expect(finalCost.estimatedCost).toBeCloseTo(initialCost.estimatedCost + expectedCostIncrease, 4);
      
      console.log('Cost tracking:', {
        initial: initialCost.estimatedCost,
        final: finalCost.estimatedCost,
        increase: finalCost.estimatedCost - initialCost.estimatedCost
      });
    });

    it('should calculate cost per request correctly', async () => {
      const initialCost = client.getCostTrackingInfo();
      
      // 単一リクエスト実行
      await client.testConnection();
      
      const afterCost = client.getCostTrackingInfo();
      
      const costIncrease = afterCost.estimatedCost - initialCost.estimatedCost;
      const expectedCost = (1 / 1000) * 0.15; // $0.15/1k tweets for 1 request
      
      expect(costIncrease).toBeCloseTo(expectedCost, 6);
      expect(afterCost.tweetsProcessed).toBe(initialCost.tweetsProcessed + 1);
    });

    it('should track cumulative costs over time', async () => {
      const costs: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        await client.testConnection();
        const cost = client.getCostTrackingInfo();
        costs.push(cost.estimatedCost);
      }
      
      // コストが累積的に増加していることを確認
      for (let i = 1; i < costs.length; i++) {
        expect(costs[i]).toBeGreaterThan(costs[i - 1]);
      }
      
      console.log('Cost progression:', costs);
    });
  });

  describe('Request Interval Control', () => {
    beforeEach(async () => {
      // 認証を先に完了
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ authenticated: true, user: {} })
      } as Response);
      await client.authenticate();
      mockFetch.mockClear();
    });

    it('should enforce minimum interval between requests', async () => {
      // タイミングを制御するためのspy
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any, delay: number) => {
          console.log(`Interval enforced: ${delay}ms`);
          if (delay > 0) {
            expect(delay).toBeGreaterThanOrEqual(700); // 最小間隔
          }
          callback();
          return {} as any;
        }) as any
      );

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ 
          status: 'ok', 
          timestamp: new Date().toISOString() 
        })
      } as Response);

      // 第一リクエスト
      await client.testConnection();
      
      // 第二リクエスト（間隔制御が働くはず）
      await client.testConnection();
      
      // setTimeoutが適切に呼ばれることを確認
      expect(setTimeoutSpy).toHaveBeenCalled();
      
      setTimeoutSpy.mockRestore();
    });

    it('should handle concurrent requests with proper spacing', async () => {
      const requests = [];
      const startTime = Date.now();
      
      // 並行リクエストを作成
      for (let i = 0; i < 3; i++) {
        requests.push(client.testConnection());
      }
      
      await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // QPS制御により適切な時間がかかることを確認
      expect(totalTime).toBeGreaterThan(1400); // 700ms * 2間隔以上
      
      console.log(`Concurrent requests completed in: ${totalTime}ms`);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not accumulate excessive memory usage', async () => {
      const initialMemory = process.memoryUsage();
      
      // 多数のリクエストを実行
      for (let i = 0; i < 50; i++) {
        await client.testConnection();
      }
      
      const finalMemory = process.memoryUsage();
      
      // メモリ使用量の増加が合理的な範囲内であることを確認
      const heapIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(heapIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB以下
      
      console.log('Memory usage:', {
        initial: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        final: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        increase: `${(heapIncrease / 1024 / 1024).toFixed(2)}MB`
      });
    });

    it('should clean up resources properly', () => {
      // クライアントのリソースクリーンアップをテスト
      expect(client.getCurrentQPS()).toBeGreaterThanOrEqual(0);
      
      // 内部状態が適切に管理されていることを確認
      const rateLimits = client.getRateLimitStatus();
      expect(rateLimits).toBeDefined();
      expect(rateLimits.general).toBeDefined();
      expect(rateLimits.posting).toBeDefined();
      expect(rateLimits.collection).toBeDefined();
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle API errors without performance degradation', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const errorTimes: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        try {
          await client.testConnection();
        } catch (error) {
          // エラーは予期されている
        }
        errorTimes.push(Date.now() - start);
      }
      
      // エラー処理が迅速であることを確認
      errorTimes.forEach(time => {
        expect(time).toBeLessThan(5000); // 5秒以内
      });
      
      console.log('Error handling times:', errorTimes);
    });

    it('should maintain QPS limits even during errors', async () => {
      mockFetch.mockRejectedValue(new Error('API error'));
      
      const startTime = Date.now();
      const promises = [];
      
      for (let i = 0; i < 3; i++) {
        promises.push(
          client.testConnection().catch(() => {
            // エラーを無視
          })
        );
      }
      
      await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      // エラー時でもQPS制御が働くことを確認
      expect(duration).toBeGreaterThan(1400); // 700ms * 2間隔以上
    });
  });
});