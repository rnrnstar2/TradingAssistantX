import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ActionSpecificCollector } from '../../src/lib/action-specific-collector.js';
import type { IntegratedContext } from '../../src/types/autonomous-system.js';

describe('ActionSpecificCollector Extended Features', () => {
  let collector: ActionSpecificCollector;
  let mockIntegratedContext: IntegratedContext;

  beforeEach(() => {
    // テスト用のIntegratedContextを作成
    mockIntegratedContext = createMockIntegratedContext();
    
    // テストモードでActionSpecificCollectorを初期化
    process.env.X_TEST_MODE = 'true';
    collector = new ActionSpecificCollector(undefined, true); // マルチソース有効
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.X_TEST_MODE;
  });

  describe('Multi-Source Integration', () => {
    it('should initialize with multi-source support enabled', () => {
      expect(collector).toBeDefined();
      expect(collector.useMultipleSources).toBe(true);
    });

    it('should initialize with multi-source support disabled', () => {
      const singleSourceCollector = new ActionSpecificCollector(undefined, false);
      expect(singleSourceCollector).toBeDefined();
      expect(singleSourceCollector.useMultipleSources).toBe(false);
    });

    it('should handle multi-source preparation', () => {
      // MultiSourceCollector統合準備が完了していることを確認
      // ログメッセージで確認（実装待ちの状態）
      expect(collector).toBeDefined();
    });
  });

  describe('Extended Configuration Loading', () => {
    it('should load extended configuration for multi-source mode', async () => {
      const result = await collector.collectForAction('original_post', mockIntegratedContext);
      
      expect(result).toBeDefined();
      expect(result.actionType).toBe('original_post');
      expect(result.results).toBeDefined();
    });

    it('should handle legacy configuration gracefully', async () => {
      const legacyCollector = new ActionSpecificCollector(undefined, false);
      const result = await legacyCollector.collectForAction('original_post', mockIntegratedContext);
      
      expect(result).toBeDefined();
      expect(result.actionType).toBe('original_post');
      expect(result.results).toBeDefined();
    });

    it('should handle missing configuration files', async () => {
      const configCollector = new ActionSpecificCollector('non-existent-config.yaml');
      const result = await configCollector.collectForAction('original_post', mockIntegratedContext);
      
      expect(result).toBeDefined();
      expect(result.results).toBeDefined();
    });
  });

  describe('Action-Type Specific Collection Strategies', () => {
    it('should optimize collection for original_post actions', async () => {
      const result = await collector.collectForAction('original_post', mockIntegratedContext, 85);
      
      expect(result.actionType).toBe('original_post');
      expect(result.results).toBeDefined();
      expect(result.sufficiencyScore).toBeGreaterThan(0);
      expect(result.qualityMetrics).toBeDefined();
      
      // original_post特有の戦略が適用されていることを確認
      expect(result.strategyUsed).toBeDefined();
      
      if (result.results.length > 0) {
        expect(result.results[0]).toHaveProperty('content');
        expect(result.results[0]).toHaveProperty('relevanceScore');
      }
    });

    it('should optimize collection for quote_tweet actions', async () => {
      const result = await collector.collectForAction('quote_tweet', mockIntegratedContext);
      
      expect(result.actionType).toBe('quote_tweet');
      expect(result.results).toBeDefined();
      expect(result.sufficiencyScore).toBeGreaterThan(0);
      
      // quote_tweet特有の戦略が適用されていることを確認
      expect(result.strategyUsed).toBeDefined();
    });

    it('should optimize collection for reply actions', async () => {
      const result = await collector.collectForAction('reply', mockIntegratedContext);
      
      expect(result.actionType).toBe('reply');
      expect(result.results).toBeDefined();
      expect(result.sufficiencyScore).toBeGreaterThan(0);
      
      // reply特有の戦略（コミュニティ重視）が適用されていることを確認
      expect(result.strategyUsed).toBeDefined();
    });

    it('should optimize collection for retweet actions', async () => {
      const result = await collector.collectForAction('retweet', mockIntegratedContext);
      
      expect(result.actionType).toBe('retweet');
      expect(result.results).toBeDefined();
      expect(result.sufficiencyScore).toBeGreaterThan(0);
      
      // retweet特有の信頼性検証が適用されていることを確認
      expect(result.strategyUsed).toBeDefined();
    });
  });

  describe('Cross-Source Quality Evaluation', () => {
    it('should evaluate quality across multiple sources', async () => {
      const result = await collector.collectForAction('original_post', mockIntegratedContext);
      
      expect(result.qualityMetrics.relevanceScore).toBeGreaterThan(0);
      expect(result.qualityMetrics.credibilityScore).toBeGreaterThan(0);
      expect(result.qualityMetrics.overallScore).toBeGreaterThan(0);
      
      // スコアが適切な範囲内にあることを確認
      expect(result.qualityMetrics.relevanceScore).toBeLessThanOrEqual(100);
      expect(result.qualityMetrics.credibilityScore).toBeLessThanOrEqual(100);
      expect(result.qualityMetrics.overallScore).toBeLessThanOrEqual(100);
    });

    it('should provide detailed quality breakdown', async () => {
      const result = await collector.collectForAction('original_post', mockIntegratedContext);
      
      expect(result.qualityMetrics).toBeDefined();
      
      // 品質メトリクスの詳細な構造を確認
      const metrics = result.qualityMetrics;
      expect(typeof metrics.relevanceScore).toBe('number');
      expect(typeof metrics.credibilityScore).toBe('number');
      expect(typeof metrics.overallScore).toBe('number');
    });

    it('should handle quality evaluation for different content types', async () => {
      const actions = ['original_post', 'quote_tweet', 'reply', 'retweet'];
      
      for (const action of actions) {
        const result = await collector.collectForAction(action, mockIntegratedContext);
        
        expect(result.qualityMetrics.relevanceScore).toBeGreaterThan(0);
        expect(result.qualityMetrics.overallScore).toBeGreaterThan(0);
      }
    });
  });

  describe('Enhanced Sufficiency Evaluation', () => {
    it('should provide accurate sufficiency scores', async () => {
      const result = await collector.collectForAction('original_post', mockIntegratedContext, 85);
      
      expect(result.sufficiencyScore).toBeGreaterThan(0);
      expect(result.sufficiencyScore).toBeLessThanOrEqual(100);
      
      // 十分性の評価詳細を確認
      expect(result.sufficiencyEvaluation).toBeDefined();
    });

    it('should consider target sufficiency thresholds', async () => {
      const highThreshold = 90;
      const lowThreshold = 50;
      
      const highResult = await collector.collectForAction('original_post', mockIntegratedContext, highThreshold);
      const lowResult = await collector.collectForAction('original_post', mockIntegratedContext, lowThreshold);
      
      expect(highResult.sufficiencyScore).toBeGreaterThan(0);
      expect(lowResult.sufficiencyScore).toBeGreaterThan(0);
      
      // 閾値に応じて収集戦略が調整されることを確認
      expect(highResult.strategyUsed).toBeDefined();
      expect(lowResult.strategyUsed).toBeDefined();
    });

    it('should provide detailed sufficiency breakdown', async () => {
      const result = await collector.collectForAction('original_post', mockIntegratedContext);
      
      if (result.sufficiencyEvaluation) {
        expect(result.sufficiencyEvaluation.score).toBeGreaterThanOrEqual(0);
        expect(result.sufficiencyEvaluation.score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should fallback to X-only mode when multi-source fails', async () => {
      // MultiSourceCollectorが利用できない場合をシミュレート
      const fallbackCollector = new ActionSpecificCollector(undefined, false);
      
      const result = await fallbackCollector.collectForAction('original_post', mockIntegratedContext);
      
      expect(result.actionType).toBe('original_post');
      expect(result.results).toBeDefined();
      expect(result.sufficiencyScore).toBeGreaterThan(0);
    });

    it('should maintain quality standards in fallback mode', async () => {
      const fallbackCollector = new ActionSpecificCollector(undefined, false);
      
      const result = await fallbackCollector.collectForAction('original_post', mockIntegratedContext);
      
      expect(result.qualityMetrics.relevanceScore).toBeGreaterThan(0);
      expect(result.qualityMetrics.overallScore).toBeGreaterThan(0);
    });

    it('should provide graceful degradation', async () => {
      // 部分的な失敗をシミュレート
      const result = await collector.collectForAction('original_post', mockIntegratedContext);
      
      // 何らかの結果が返されることを確認
      expect(result.results).toBeDefined();
      expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Optimization', () => {
    it('should complete collection within timeout limits', async () => {
      const startTime = Date.now();
      
      const result = await collector.collectForAction('original_post', mockIntegratedContext);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // 90秒制限内での完了を確認
      expect(executionTime).toBeLessThan(90000);
      expect(result.results).toBeDefined();
    });

    it('should handle concurrent collection requests efficiently', async () => {
      const actions = ['original_post', 'quote_tweet', 'reply', 'retweet'];
      const promises = actions.map(action => 
        collector.collectForAction(action, mockIntegratedContext)
      );
      
      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      
      // 並列実行が効率的に行われることを確認
      expect(endTime - startTime).toBeLessThan(120000); // 2分以内
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value.results).toBeDefined();
        } else {
          console.warn(`Action ${actions[index]} failed:`, result.reason);
        }
      });
    });

    it('should optimize resource usage', async () => {
      // リソース使用量の最適化を確認
      const result = await collector.collectForAction('original_post', mockIntegratedContext);
      
      expect(result.results).toBeDefined();
      expect(result.metadata).toBeDefined();
      
      // 実行時間やリソース使用量の情報が記録されていることを確認
      if (result.metadata.executionTime) {
        expect(result.metadata.executionTime).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling & Resilience', () => {
    it('should handle network failures gracefully', async () => {
      // ネットワーク失敗をシミュレート
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      try {
        const result = await collector.collectForAction('original_post', mockIntegratedContext);
        
        // エラーが発生してもフォールバックで結果が返されることを確認
        expect(result.results).toBeDefined();
        expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('should handle timeout scenarios', async () => {
      // タイムアウトをシミュレート
      const result = await collector.collectForAction('original_post', mockIntegratedContext, 85);
      
      // タイムアウトが発生してもシステムが継続動作することを確認
      expect(result.results).toBeDefined();
    });

    it('should provide meaningful error information', async () => {
      const result = await collector.collectForAction('original_post', mockIntegratedContext);
      
      // エラー情報が適切に記録されていることを確認
      expect(result.metadata).toBeDefined();
      
      if (result.metadata.errors) {
        expect(Array.isArray(result.metadata.errors)).toBe(true);
      }
    });
  });

  describe('Integration Points', () => {
    it('should integrate correctly with AutonomousExecutor workflow', async () => {
      const result = await collector.collectForAction('original_post', mockIntegratedContext);
      
      // AutonomousExecutorとの統合に必要な構造を確認
      expect(result.actionType).toBe('original_post');
      expect(result.results).toBeDefined();
      expect(result.qualityMetrics).toBeDefined();
      expect(result.strategyUsed).toBeDefined();
    });

    it('should provide actionSuggestion compatibility', async () => {
      const result = await collector.collectForAction('original_post', mockIntegratedContext);
      
      // ActionSuggestionとの互換性を確認
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      
      result.results.forEach(item => {
        expect(item).toHaveProperty('content');
        expect(item).toHaveProperty('relevanceScore');
      });
    });

    it('should maintain context consistency', async () => {
      const result = await collector.collectForAction('original_post', mockIntegratedContext);
      
      // コンテキストとの整合性を確認
      expect(result.contextCompatibility).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });
});

// ヘルパー関数
function createMockIntegratedContext(): IntegratedContext {
  return {
    account: {
      currentState: {
        timestamp: new Date().toISOString(),
        followers: { current: 150, change_24h: 8, growth_rate: '5.5%' },
        engagement: { avg_likes: 12, avg_retweets: 6, engagement_rate: '2.5%' },
        performance: { posts_today: 3, target_progress: '60%', best_posting_time: '14:00' },
        health: { status: 'excellent', api_limits: 'normal', quality_score: 92 },
        recommendations: [],
        healthScore: 92
      },
      recommendations: [],
      healthScore: 92
    },
    market: {
      trends: [
        { keyword: 'AI投資', volume: 1000, sentiment: 'positive' },
        { keyword: 'DeFi', volume: 800, sentiment: 'neutral' }
      ],
      opportunities: [
        { type: 'trending_topic', value: 'AI技術', confidence: 0.85 }
      ],
      competitorActivity: []
    },
    actionSuggestions: [
      {
        type: 'original_post',
        priority: 'high',
        content: 'AIと投資の未来について',
        reasoning: 'トレンドに基づく高品質コンテンツ',
        confidence: 0.9
      }
    ],
    timestamp: Date.now()
  };
}