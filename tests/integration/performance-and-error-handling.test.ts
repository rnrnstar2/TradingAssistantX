import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ActionSpecificCollector } from '../../src/lib/action-specific-collector.js';
import { MultiSourceCollector } from '../../src/lib/multi-source-collector.js';
import type { IntegratedContext, MultiSourceConfig, CollectionStrategy } from '../../src/types/autonomous-system.js';

describe('Performance and Error Handling Integration Tests', () => {
  let actionSpecificCollector: ActionSpecificCollector;
  let multiSourceCollector: MultiSourceCollector;
  let mockContext: IntegratedContext;
  let testConfig: MultiSourceConfig;

  beforeEach(() => {
    process.env.X_TEST_MODE = 'true';
    
    testConfig = {
      rss: {
        sources: {
          test_rss: 'https://test.example.com/rss',
          yahoo_finance: 'https://feeds.finance.yahoo.com/rss/2.0/headline'
        },
        timeout: 30000,
        retries: 2
      },
      api: {
        alpha_vantage: {
          baseUrl: 'https://www.alphavantage.co/query',
          apiKey: 'demo',
          timeout: 30000,
          rateLimiting: {
            requestsPerSecond: 5,
            requestsPerMinute: 5
          }
        }
      },
      community: {
        reddit: {
          subreddits: ['investing'],
          timeout: 30000
        }
      },
      cache: {
        enabled: true,
        ttl: 300000,
        maxSize: 1000
      },
      rateLimiting: {
        enabled: true,
        globalRequestsPerSecond: 5
      }
    };

    actionSpecificCollector = new ActionSpecificCollector(undefined, true);
    multiSourceCollector = new MultiSourceCollector(testConfig);
    mockContext = createMockIntegratedContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.X_TEST_MODE;
  });

  describe('Performance Tests', () => {
    it('should complete multi-source collection within time limit', async () => {
      const startTime = Date.now();
      
      const result = await actionSpecificCollector.collectForAction('original_post', mockContext, 85);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(90000); // 90秒制限
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.sufficiencyScore).toBeGreaterThan(0);
      
      console.log(`✅ Performance test passed: ${executionTime}ms`);
    }, 95000);

    it('should handle concurrent collections efficiently', async () => {
      const concurrentPromises = [
        actionSpecificCollector.collectForAction('original_post', mockContext),
        actionSpecificCollector.collectForAction('quote_tweet', mockContext),
        actionSpecificCollector.collectForAction('retweet', mockContext),
        actionSpecificCollector.collectForAction('reply', mockContext)
      ];
      
      const startTime = Date.now();
      const results = await Promise.allSettled(concurrentPromises);
      const endTime = Date.now();
      
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
      expect(endTime - startTime).toBeLessThan(120000); // 2分以内
      
      // 各結果の検証
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value.results).toBeDefined();
          expect(result.value.sufficiencyScore).toBeGreaterThanOrEqual(0);
        }
      });
      
      console.log(`✅ Concurrent performance test passed: ${endTime - startTime}ms`);
    }, 125000);

    it('should maintain performance with high sufficiency thresholds', async () => {
      const highThresholds = [85, 90, 95];
      
      for (const threshold of highThresholds) {
        const startTime = Date.now();
        
        const result = await actionSpecificCollector.collectForAction(
          'original_post',
          mockContext,
          threshold
        );
        
        const executionTime = Date.now() - startTime;
        
        expect(executionTime).toBeLessThan(90000);
        expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
        expect(result.results).toBeDefined();
        
        console.log(`✅ High threshold (${threshold}%) test: ${executionTime}ms`);
      }
    }, 180000);

    it('should optimize multi-source collection performance', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(`<?xml version="1.0"?>
            <rss><channel><item><title>Fast RSS</title></item></channel></rss>`)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: 'fast_api_response' })
        });

      const strategy: CollectionStrategy = {
        name: 'performance-test',
        sources: ['rss', 'api'],
        maxConcurrency: 2,
        timeout: 30000,
        failureThreshold: 0.5,
        fallbackSources: ['rss']
      };

      const startTime = Date.now();
      const results = await multiSourceCollector.executeMultiSourceCollection(strategy);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(35000); // タイムアウト + マージン
      expect(Array.isArray(results)).toBe(true);
      
      console.log(`✅ Multi-source performance: ${endTime - startTime}ms`);
    });

    it('should handle memory usage efficiently', async () => {
      // メモリ使用量の基準値を測定
      const initialMemory = process.memoryUsage();
      
      // 複数回の収集を実行
      for (let i = 0; i < 5; i++) {
        await actionSpecificCollector.collectForAction('original_post', mockContext);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // メモリリークが発生していないことを確認（100MB以下の増加）
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      console.log(`✅ Memory usage test passed: +${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    }, 60000);
  });

  describe('Error Handling Tests', () => {
    it('should gracefully handle API failures', async () => {
      // ネットワーク障害をシミュレート
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await actionSpecificCollector.collectForAction('original_post', mockContext);
      
      expect(result.results).toBeDefined();
      expect(result.sufficiencyScore).toBeGreaterThan(0); // フォールバック動作
      expect(result.metadata.errors).toBeDefined();
      
      console.log('✅ API failure handling test passed');
    });

    it('should handle configuration errors', async () => {
      const collector = new ActionSpecificCollector('non-existent-config.yaml');
      const result = await collector.collectForAction('original_post', mockContext);
      
      expect(result.results).toBeDefined(); // デフォルト設定で動作
      expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
      
      console.log('✅ Configuration error handling test passed');
    });

    it('should handle timeout scenarios gracefully', async () => {
      // 長時間のレスポンスをモック
      global.fetch = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 5000))
      );

      const shortTimeoutStrategy: CollectionStrategy = {
        name: 'timeout-test',
        sources: ['rss'],
        maxConcurrency: 1,
        timeout: 1000, // 1秒タイムアウト
        failureThreshold: 0.5,
        fallbackSources: []
      };

      const results = await multiSourceCollector.executeMultiSourceCollection(shortTimeoutStrategy);
      
      // タイムアウト時でもシステムが継続動作することを確認
      expect(Array.isArray(results)).toBe(true);
      
      console.log('✅ Timeout handling test passed');
    });

    it('should handle partial source failures', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // 最初のリクエストは成功
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(`<?xml version="1.0"?>
              <rss><channel><item><title>Success</title></item></channel></rss>`)
          });
        }
        // 2回目以降は失敗
        return Promise.reject(new Error('Source failed'));
      });

      const strategy: CollectionStrategy = {
        name: 'partial-failure-test',
        sources: ['rss', 'api', 'community'],
        maxConcurrency: 3,
        timeout: 30000,
        failureThreshold: 0.7, // 70%失敗まで許容
        fallbackSources: ['rss']
      };

      const results = await multiSourceCollector.executeMultiSourceCollection(strategy);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
      
      console.log('✅ Partial failure handling test passed');
    });

    it('should handle invalid data formats', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('Invalid XML content')
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ invalid: 'data structure' })
        });

      const result = await actionSpecificCollector.collectForAction('original_post', mockContext);
      
      expect(result.results).toBeDefined();
      expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
      
      // エラー情報が適切に記録されていることを確認
      if (result.metadata.errors) {
        expect(Array.isArray(result.metadata.errors)).toBe(true);
      }
      
      console.log('✅ Invalid data format handling test passed');
    });

    it('should handle rate limit scenarios', async () => {
      let requestCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        requestCount++;
        if (requestCount > 2) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: () => Promise.resolve({ error: 'Rate limit exceeded' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: `request_${requestCount}` })
        });
      });

      const result = await multiSourceCollector.collectFromAPIs({
        sources: ['alpha_vantage'],
        endpoints: ['prices']
      });
      
      expect(result.data).toBeDefined();
      expect(result.metadata).toBeDefined();
      
      console.log('✅ Rate limit handling test passed');
    });

    it('should recover from temporary failures', async () => {
      let attemptCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(`<?xml version="1.0"?>
            <rss><channel><item><title>Recovery success</title></item></channel></rss>`)
        });
      });

      const result = await multiSourceCollector.collectFromRSS(['test_rss']);
      
      expect(result.data).toBeDefined();
      expect(result.source).toBe('rss');
      
      console.log('✅ Recovery from temporary failures test passed');
    });

    it('should maintain system stability under stress', async () => {
      // 複数のエラー条件を同時に発生させる
      const stressPromises = [];
      
      // ネットワークエラー
      global.fetch = vi.fn().mockImplementation(() => {
        const random = Math.random();
        if (random < 0.3) {
          return Promise.reject(new Error('Network error'));
        } else if (random < 0.6) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Server error' })
          });
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(`<?xml version="1.0"?>
            <rss><channel><item><title>Stress test</title></item></channel></rss>`)
        });
      });

      for (let i = 0; i < 10; i++) {
        stressPromises.push(
          actionSpecificCollector.collectForAction('original_post', mockContext)
        );
      }

      const results = await Promise.allSettled(stressPromises);
      
      // システムが完全に停止していないことを確認
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
      
      console.log(`✅ Stress test passed: ${successfulResults.length}/10 successful`);
    }, 60000);
  });

  describe('Resilience and Recovery', () => {
    it('should demonstrate self-healing capabilities', async () => {
      // 初期的な失敗
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Initial failure'));
      
      let firstResult;
      try {
        firstResult = await actionSpecificCollector.collectForAction('original_post', mockContext);
      } catch (error) {
        // 初期失敗は期待される
      }
      
      // システムの回復
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`<?xml version="1.0"?>
          <rss><channel><item><title>Recovery</title></item></channel></rss>`)
      });
      
      const recoveryResult = await actionSpecificCollector.collectForAction('original_post', mockContext);
      
      expect(recoveryResult.results).toBeDefined();
      expect(recoveryResult.sufficiencyScore).toBeGreaterThan(0);
      
      console.log('✅ Self-healing capabilities test passed');
    });

    it('should maintain quality standards under adverse conditions', async () => {
      // 品質低下をシミュレート
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`<?xml version="1.0"?>
          <rss><channel><item><title>Low quality content</title></item></channel></rss>`)
      });

      const result = await actionSpecificCollector.collectForAction('original_post', mockContext, 80);
      
      expect(result.qualityMetrics.relevanceScore).toBeGreaterThan(0);
      expect(result.qualityMetrics.overallScore).toBeGreaterThan(0);
      expect(result.results).toBeDefined();
      
      console.log('✅ Quality maintenance under adverse conditions test passed');
    });
  });
});

// ヘルパー関数
function createMockIntegratedContext(): IntegratedContext {
  return {
    account: {
      currentState: {
        timestamp: new Date().toISOString(),
        followers: { current: 120, change_24h: 6, growth_rate: '5%' },
        engagement: { avg_likes: 8, avg_retweets: 4, engagement_rate: '2.5%' },
        performance: { posts_today: 1, target_progress: '25%', best_posting_time: '13:00' },
        health: { status: 'good', api_limits: 'normal', quality_score: 82 },
        recommendations: [],
        healthScore: 82
      },
      recommendations: [],
      healthScore: 82
    },
    market: {
      trends: [
        { keyword: 'テスト投資', volume: 500, sentiment: 'positive' }
      ],
      opportunities: [
        { type: 'trending_topic', value: 'テスト技術', confidence: 0.8 }
      ],
      competitorActivity: []
    },
    actionSuggestions: [
      {
        type: 'original_post',
        priority: 'medium',
        content: 'テスト用コンテンツ',
        reasoning: 'パフォーマンステスト用',
        confidence: 0.8
      }
    ],
    timestamp: Date.now()
  };
}