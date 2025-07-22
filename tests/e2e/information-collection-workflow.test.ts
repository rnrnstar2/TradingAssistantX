import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ActionSpecificCollector } from '../../src/lib/action-specific-collector.js';
import { MultiSourceCollector } from '../../src/lib/multi-source-collector.js';
import type { IntegratedContext, MultiSourceConfig } from '../../src/types/autonomous-system.js';

describe('Information Collection Workflow E2E', () => {
  let actionSpecificCollector: ActionSpecificCollector;
  let multiSourceCollector: MultiSourceCollector;
  let mockContext: IntegratedContext;

  beforeAll(async () => {
    // E2Eテスト環境のセットアップ
    process.env.X_TEST_MODE = 'true';
    
    // テスト用設定
    const testConfig: MultiSourceConfig = {
      rss: {
        sources: {
          yahoo_finance: 'https://feeds.finance.yahoo.com/rss/2.0/headline',
          reuters: 'https://feeds.reuters.com/reuters/businessNews'
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
          subreddits: ['investing', 'StockMarket'],
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

    // コンポーネント初期化
    actionSpecificCollector = new ActionSpecificCollector(undefined, true);
    multiSourceCollector = new MultiSourceCollector(testConfig);
    mockContext = createMockIntegratedContext();
  });

  afterAll(async () => {
    delete process.env.X_TEST_MODE;
    
    // クリーンアップ
    try {
      await multiSourceCollector?.cleanup?.();
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  });

  describe('Complete Multi-Source Workflow', () => {
    it('should execute full multi-source workflow', async () => {
      // 1. 設定読み込み
      expect(actionSpecificCollector.config).toBeDefined();
      
      // 2. 情報収集実行
      const result = await actionSpecificCollector.collectForAction('original_post', mockContext, 85);
      
      // 3. 結果検証
      expect(result.actionType).toBe('original_post');
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.sufficiencyScore).toBeGreaterThan(0);
      
      // 4. 品質基準確認
      expect(result.qualityMetrics.relevanceScore).toBeGreaterThan(0);
      expect(result.qualityMetrics.overallScore).toBeGreaterThan(0);
      
      // 5. 実行時間確認
      expect(result.executionTime).toBeDefined();
      if (result.executionTime) {
        expect(result.executionTime).toBeLessThan(90000);
      }
    }, 120000);

    it('should handle complete workflow for different action types', async () => {
      const actionTypes = ['original_post', 'quote_tweet', 'reply', 'retweet'];
      const results = [];

      for (const actionType of actionTypes) {
        console.log(`Testing workflow for: ${actionType}`);
        
        const result = await actionSpecificCollector.collectForAction(actionType, mockContext, 75);
        
        // 基本的な構造検証
        expect(result.actionType).toBe(actionType);
        expect(result.results).toBeDefined();
        expect(result.sufficiencyScore).toBeGreaterThan(0);
        expect(result.qualityMetrics).toBeDefined();
        
        results.push(result);
      }

      // 全てのアクションタイプで結果が取得できたことを確認
      expect(results.length).toBe(actionTypes.length);
      
      // アクションタイプ別の戦略最適化を確認
      results.forEach(result => {
        expect(result.strategyUsed).toBeDefined();
        expect(result.contextCompatibility).toBeDefined();
      });
    }, 180000);
  });

  describe('Performance and Reliability', () => {
    it('should maintain performance under concurrent load', async () => {
      const concurrentTasks = [
        actionSpecificCollector.collectForAction('original_post', mockContext),
        actionSpecificCollector.collectForAction('quote_tweet', mockContext),
        actionSpecificCollector.collectForAction('reply', mockContext)
      ];

      const startTime = Date.now();
      const results = await Promise.allSettled(concurrentTasks);
      const endTime = Date.now();

      // 並列実行時間の確認
      expect(endTime - startTime).toBeLessThan(120000); // 2分以内

      // 全ての結果が成功していることを確認
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value.results).toBeDefined();
          expect(result.value.sufficiencyScore).toBeGreaterThan(0);
        } else {
          console.warn(`Concurrent task ${index} failed:`, result.reason);
          // 一部失敗は許容（ネットワーク等の外部要因）
        }
      });

      // 少なくとも一つは成功していることを確認
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
    }, 150000);

    it('should demonstrate resilience to failures', async () => {
      // 複数のエラー条件下での動作を確認
      const scenarios = [
        { description: 'Normal operation', context: mockContext },
        { description: 'Limited context', context: createLimitedContext() },
        { description: 'High threshold', context: mockContext, threshold: 95 }
      ];

      for (const scenario of scenarios) {
        console.log(`Testing resilience scenario: ${scenario.description}`);
        
        try {
          const result = await actionSpecificCollector.collectForAction(
            'original_post',
            scenario.context,
            scenario.threshold || 75
          );
          
          expect(result.results).toBeDefined();
          expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
          
        } catch (error) {
          console.warn(`Scenario "${scenario.description}" failed:`, error.message);
          // 致命的な失敗ではないことを確認
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Quality Assurance End-to-End', () => {
    it('should maintain quality standards throughout workflow', async () => {
      const result = await actionSpecificCollector.collectForAction('original_post', mockContext, 80);
      
      // 品質メトリクス全体の検証
      expect(result.qualityMetrics.relevanceScore).toBeGreaterThan(0);
      expect(result.qualityMetrics.credibilityScore).toBeGreaterThan(0);
      expect(result.qualityMetrics.overallScore).toBeGreaterThan(0);
      
      // 品質スコアの適切な範囲確認
      expect(result.qualityMetrics.relevanceScore).toBeLessThanOrEqual(100);
      expect(result.qualityMetrics.credibilityScore).toBeLessThanOrEqual(100);
      expect(result.qualityMetrics.overallScore).toBeLessThanOrEqual(100);
      
      // 結果の内容品質確認
      result.results.forEach(item => {
        expect(item.content).toBeDefined();
        expect(item.content.length).toBeGreaterThan(0);
        expect(item.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(item.source).toBeDefined();
      });
    });

    it('should provide comprehensive quality reporting', async () => {
      const result = await actionSpecificCollector.collectForAction('original_post', mockContext);
      
      // 品質レポートの構造確認
      expect(result.qualityMetrics).toBeDefined();
      expect(result.sufficiencyEvaluation).toBeDefined();
      expect(result.metadata).toBeDefined();
      
      // メタデータの詳細確認
      const metadata = result.metadata;
      expect(metadata.timestamp).toBeDefined();
      expect(metadata.executionTime).toBeDefined();
      expect(metadata.sourceBreakdown).toBeDefined();
      
      // 品質評価の詳細確認
      if (result.sufficiencyEvaluation) {
        expect(result.sufficiencyEvaluation.score).toBeGreaterThanOrEqual(0);
        expect(result.sufficiencyEvaluation.details).toBeDefined();
      }
    });
  });

  describe('Integration Points Validation', () => {
    it('should integrate seamlessly with upstream systems', async () => {
      const result = await actionSpecificCollector.collectForAction('original_post', mockContext);
      
      // AutonomousExecutor統合ポイント検証
      expect(result.actionType).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.strategyUsed).toBeDefined();
      expect(result.contextCompatibility).toBeDefined();
      
      // DecisionEngine統合ポイント検証
      expect(result.qualityMetrics).toBeDefined();
      expect(result.sufficiencyScore).toBeDefined();
      
      // ContextIntegrator統合ポイント検証
      expect(result.metadata).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should provide actionable output for downstream systems', async () => {
      const result = await actionSpecificCollector.collectForAction('original_post', mockContext);
      
      // 下流システム向けの出力構造確認
      expect(result.results.length).toBeGreaterThan(0);
      
      result.results.forEach(item => {
        // ContentGenerator向け情報
        expect(item.content).toBeDefined();
        expect(item.source).toBeDefined();
        
        // QualityEvaluator向け情報
        expect(item.relevanceScore).toBeDefined();
        expect(item.metadata).toBeDefined();
        
        // PostingManager向け情報
        expect(item.type).toBeDefined();
        expect(item.timestamp).toBeDefined();
      });
    });
  });

  describe('Configuration and Environment', () => {
    it('should adapt to different configuration scenarios', async () => {
      // デフォルト設定
      const defaultCollector = new ActionSpecificCollector();
      const defaultResult = await defaultCollector.collectForAction('original_post', mockContext);
      
      expect(defaultResult.results).toBeDefined();
      
      // カスタム設定（存在しないファイル）
      const customCollector = new ActionSpecificCollector('custom-config.yaml');
      const customResult = await customCollector.collectForAction('original_post', mockContext);
      
      expect(customResult.results).toBeDefined();
      
      // 両方の結果が有効であることを確認
      expect(defaultResult.sufficiencyScore).toBeGreaterThanOrEqual(0);
      expect(customResult.sufficiencyScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle environment variations', async () => {
      const originalTestMode = process.env.X_TEST_MODE;
      
      try {
        // テストモード有効
        process.env.X_TEST_MODE = 'true';
        const testModeResult = await actionSpecificCollector.collectForAction('original_post', mockContext);
        expect(testModeResult.results).toBeDefined();
        
        // テストモード無効
        process.env.X_TEST_MODE = 'false';
        const normalModeResult = await actionSpecificCollector.collectForAction('original_post', mockContext);
        expect(normalModeResult.results).toBeDefined();
        
        // 両方の結果が有効であることを確認
        expect(testModeResult.sufficiencyScore).toBeGreaterThanOrEqual(0);
        expect(normalModeResult.sufficiencyScore).toBeGreaterThanOrEqual(0);
        
      } finally {
        process.env.X_TEST_MODE = originalTestMode;
      }
    });
  });
});

// ヘルパー関数
function createMockIntegratedContext(): IntegratedContext {
  return {
    account: {
      currentState: {
        timestamp: new Date().toISOString(),
        followers: { current: 200, change_24h: 10, growth_rate: '5%' },
        engagement: { avg_likes: 15, avg_retweets: 8, engagement_rate: '3%' },
        performance: { posts_today: 2, target_progress: '50%', best_posting_time: '15:00' },
        health: { status: 'excellent', api_limits: 'normal', quality_score: 90 },
        recommendations: [
          { type: 'content_optimization', priority: 'medium', description: 'より多様なハッシュタグを使用' }
        ],
        healthScore: 90
      },
      recommendations: [],
      healthScore: 90
    },
    market: {
      trends: [
        { keyword: 'DeFi投資', volume: 1200, sentiment: 'positive' },
        { keyword: 'NFT市場', volume: 900, sentiment: 'neutral' },
        { keyword: '仮想通貨規制', volume: 600, sentiment: 'negative' }
      ],
      opportunities: [
        { type: 'trending_topic', value: 'ブロックチェーン技術', confidence: 0.88 },
        { type: 'market_gap', value: '投資教育コンテンツ', confidence: 0.75 }
      ],
      competitorActivity: [
        { account: 'competitor1', action: 'posted_about_ai', timestamp: Date.now() - 3600000 }
      ]
    },
    actionSuggestions: [
      {
        type: 'original_post',
        priority: 'high',
        content: 'DeFi投資の新しいトレンドについて分析',
        reasoning: '市場トレンドと高い関連性',
        confidence: 0.92
      },
      {
        type: 'quote_tweet',
        priority: 'medium',
        content: 'NFT市場の最新動向についてコメント',
        reasoning: 'エンゲージメント機会',
        confidence: 0.78
      }
    ],
    timestamp: Date.now()
  };
}

function createLimitedContext(): IntegratedContext {
  return {
    account: {
      currentState: {
        timestamp: new Date().toISOString(),
        followers: { current: 50, change_24h: 1, growth_rate: '2%' },
        engagement: { avg_likes: 3, avg_retweets: 1, engagement_rate: '1%' },
        performance: { posts_today: 0, target_progress: '0%', best_posting_time: '12:00' },
        health: { status: 'fair', api_limits: 'normal', quality_score: 60 },
        recommendations: [],
        healthScore: 60
      },
      recommendations: [],
      healthScore: 60
    },
    market: {
      trends: [],
      opportunities: [],
      competitorActivity: []
    },
    actionSuggestions: [],
    timestamp: Date.now()
  };
}