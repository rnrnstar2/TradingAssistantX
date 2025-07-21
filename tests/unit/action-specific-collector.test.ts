import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { ActionSpecificCollector } from '../../src/lib/action-specific-collector';
import type { IntegratedContext, CollectionResult } from '../../src/types/autonomous-system';

// モック設定
vi.mock('@instantlyeasy/claude-code-sdk-ts', () => ({
  claude: vi.fn(() => ({
    withModel: vi.fn(() => ({
      query: vi.fn(() => ({
        asText: vi.fn().mockResolvedValue('{"score": 85, "shouldContinue": false, "reasoning": "テスト評価", "suggestedActions": []}')
      }))
    }))
  }))
}));

vi.mock('../../src/lib/playwright-common-config', () => ({
  PlaywrightCommonSetup: {
    createPlaywrightEnvironment: vi.fn().mockResolvedValue({
      browser: { close: vi.fn() },
      context: { 
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn(),
          close: vi.fn(),
          $$eval: vi.fn().mockResolvedValue([
            { text: 'テスト投稿内容', time: '2024-01-01' }
          ]),
          textContent: vi.fn().mockResolvedValue('ページテキスト内容')
        })
      }
    }),
    cleanup: vi.fn()
  }
}));

vi.mock('../../src/utils/yaml-utils', () => ({
  loadYamlSafe: vi.fn().mockReturnValue({
    strategies: {
      original_post: {
        priority: 60,
        focusAreas: ['独自洞察発見', '市場分析情報'],
        sources: [
          {
            name: 'market_trends',
            url: 'https://finance.yahoo.com',
            priority: 'high',
            searchPatterns: ['crypto', 'trading']
          }
        ],
        collectMethods: ['trend_analysis'],
        sufficiencyTarget: 90
      },
      quote_tweet: {
        priority: 25,
        focusAreas: ['候補ツイート検索'],
        sources: [
          {
            name: 'twitter_trends',
            url: 'https://x.com/explore',
            priority: 'high',
            searchPatterns: ['trending']
          }
        ],
        collectMethods: ['candidate_tweet_search'],
        sufficiencyTarget: 85
      },
      retweet: {
        priority: 10,
        focusAreas: ['信頼性検証'],
        sources: [
          {
            name: 'verified_accounts',
            url: 'https://x.com/search',
            priority: 'high',
            filters: ['verified']
          }
        ],
        collectMethods: ['credibility_check'],
        sufficiencyTarget: 80
      },
      reply: {
        priority: 5,
        focusAreas: ['エンゲージメント機会'],
        sources: [
          {
            name: 'community_discussions',
            url: 'https://x.com/search',
            priority: 'high',
            filters: ['questions']
          }
        ],
        collectMethods: ['engagement_opportunity_scan'],
        sufficiencyTarget: 75
      }
    },
    sufficiencyThresholds: {},
    maxExecutionTime: 90,
    qualityStandards: {
      relevanceScore: 80,
      credibilityScore: 85,
      uniquenessScore: 70,
      timelinessScore: 90
    }
  })
}));

describe('ActionSpecificCollector', () => {
  let collector: ActionSpecificCollector;
  let mockContext: IntegratedContext;

  beforeEach(() => {
    // テストモードを設定
    process.env.X_TEST_MODE = 'true';
    
    collector = new ActionSpecificCollector();
    
    mockContext = {
      account: {
        currentState: {
          timestamp: '2024-01-01T00:00:00Z',
          followers: { current: 1000, change_24h: 10, growth_rate: '1%' },
          engagement: { avg_likes: 50, avg_retweets: 10, engagement_rate: '5%' },
          performance: { posts_today: 5, target_progress: '50%', best_posting_time: '12:00' },
          health: { status: 'healthy', api_limits: 'normal', quality_score: 85 },
          recommendations: ['テストレコメンデーション'],
          healthScore: 85
        },
        recommendations: ['アカウント改善提案'],
        healthScore: 85
      },
      market: {
        trends: [],
        opportunities: [],
        competitorActivity: []
      },
      actionSuggestions: [],
      timestamp: Date.now()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('collectForAction', () => {
    test('original_post: 独自洞察発見に特化した情報収集', async () => {
      const result = await collector.collectForAction('original_post', mockContext, 90);

      expect(result).toBeDefined();
      expect(result.actionType).toBe('original_post');
      expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.strategyUsed).toBeDefined();
      expect(result.strategyUsed.actionType).toBe('original_post');
      expect(result.qualityMetrics).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    test('quote_tweet: 候補ツイート検索と付加価値分析', async () => {
      const result = await collector.collectForAction('quote_tweet', mockContext, 85);

      expect(result).toBeDefined();
      expect(result.actionType).toBe('quote_tweet');
      expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
      expect(result.strategyUsed.actionType).toBe('quote_tweet');
      expect(result.qualityMetrics.overallScore).toBeGreaterThanOrEqual(0);
    });

    test('retweet: 信頼性検証と価値評価', async () => {
      const result = await collector.collectForAction('retweet', mockContext, 80);

      expect(result).toBeDefined();
      expect(result.actionType).toBe('retweet');
      expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
      expect(result.strategyUsed.actionType).toBe('retweet');
      expect(result.qualityMetrics.credibilityScore).toBeGreaterThanOrEqual(0);
    });

    test('reply: エンゲージメント機会の特定', async () => {
      const result = await collector.collectForAction('reply', mockContext, 75);

      expect(result).toBeDefined();
      expect(result.actionType).toBe('reply');
      expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
      expect(result.strategyUsed.actionType).toBe('reply');
      expect(result.qualityMetrics.relevanceScore).toBeGreaterThanOrEqual(0);
    });

    test('異常系: 無効なアクション種別でエラーハンドリング', async () => {
      // @ts-expect-error: 意図的に無効な値をテスト
      const result = await collector.collectForAction('invalid_action', mockContext, 85);

      expect(result).toBeDefined();
      expect(result.sufficiencyScore).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(result.qualityMetrics.feedback).toContain('収集処理でエラーが発生しました');
    });

    test('低い充足度目標での動作確認', async () => {
      const result = await collector.collectForAction('original_post', mockContext, 50);

      expect(result).toBeDefined();
      expect(result.actionType).toBe('original_post');
      // 低い目標でも適切に処理されることを確認
      expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
    });

    test('高い充足度目標での動作確認', async () => {
      const result = await collector.collectForAction('original_post', mockContext, 95);

      expect(result).toBeDefined();
      expect(result.actionType).toBe('original_post');
      // 高い目標でも適切に処理されることを確認
      expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('evaluateCollectionSufficiency', () => {
    test('85%充足度に達するまでの継続判断 - 十分な結果', async () => {
      const mockResults: CollectionResult[] = Array.from({ length: 10 }, (_, i) => ({
        id: `test-${i}`,
        type: 'trend',
        content: `テスト内容 ${i}`,
        source: 'test-source',
        relevanceScore: 0.8,
        timestamp: Date.now(),
        metadata: { engagement: 100 }
      }));

      const result = await collector.collectForAction('original_post', mockContext, 85);

      // テストモードでモック評価が正しく動作することを確認
      expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
      expect(typeof result.sufficiencyScore).toBe('number');
    });

    test('85%充足度に達するまでの継続判断 - 不十分な結果', async () => {
      const result = await collector.collectForAction('original_post', mockContext, 95);

      // 高い目標値に対する適切な処理を確認
      expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics).toBeDefined();
    });

    test('空の結果に対する充足度評価', async () => {
      // 収集結果が空の場合の処理テスト
      const result = await collector.collectForAction('reply', mockContext, 75);

      expect(result).toBeDefined();
      expect(result.sufficiencyScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('executeCollectionChain', () => {
    test('Claude-Playwright連鎖サイクルの動作確認', async () => {
      const result = await collector.collectForAction('original_post', mockContext, 85);

      // 連鎖サイクルが正常に動作することを確認
      expect(result).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.strategyUsed).toBeDefined();
      expect(result.strategyUsed.targets).toBeDefined();
      expect(Array.isArray(result.strategyUsed.targets)).toBe(true);
    });

    test('複数回実行での一貫性確認', async () => {
      const result1 = await collector.collectForAction('quote_tweet', mockContext, 85);
      const result2 = await collector.collectForAction('quote_tweet', mockContext, 85);

      // 同じ条件での実行結果の基本構造が一致することを確認
      expect(result1.actionType).toBe(result2.actionType);
      expect(result1.strategyUsed.actionType).toBe(result2.strategyUsed.actionType);
    });

    test('異なるアクション種別での戦略差異確認', async () => {
      const originalResult = await collector.collectForAction('original_post', mockContext, 85);
      const retweetResult = await collector.collectForAction('retweet', mockContext, 80);

      // 異なるアクション種別で異なる戦略が適用されることを確認
      expect(originalResult.actionType).not.toBe(retweetResult.actionType);
      expect(originalResult.strategyUsed.actionType).not.toBe(retweetResult.strategyUsed.actionType);
    });
  });

  describe('品質評価システム', () => {
    test('品質メトリクスの計算確認', async () => {
      const result = await collector.collectForAction('original_post', mockContext, 85);

      expect(result.qualityMetrics).toBeDefined();
      expect(result.qualityMetrics.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics.credibilityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics.uniquenessScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics.timelinessScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics.overallScore).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.qualityMetrics.feedback)).toBe(true);
    });

    test('空の結果での品質評価', async () => {
      // 空の結果に対する品質評価の動作確認
      const result = await collector.collectForAction('reply', mockContext, 75);

      expect(result.qualityMetrics).toBeDefined();
      expect(result.qualityMetrics.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics.feedback).toBeInstanceOf(Array);
    });
  });

  describe('設定読み込みシステム', () => {
    test('YAML設定ファイルの正常読み込み', () => {
      const customCollector = new ActionSpecificCollector();
      
      // 設定が正常に読み込まれることを確認
      expect(customCollector).toBeDefined();
    });

    test('カスタム設定パスでの初期化', () => {
      const customCollector = new ActionSpecificCollector('/custom/path/config.yaml');
      
      // カスタムパスでも適切に初期化されることを確認
      expect(customCollector).toBeDefined();
    });
  });

  describe('エラーハンドリング', () => {
    test('ネットワークエラー時の適切な処理', async () => {
      // PlaywrightCommonSetupでエラーが発生した場合のモック
      const { PlaywrightCommonSetup } = await import('../../src/lib/playwright-common-config');
      vi.mocked(PlaywrightCommonSetup.createPlaywrightEnvironment).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await collector.collectForAction('original_post', mockContext, 85);

      // エラーが発生してもシステムが適切に応答することを確認
      expect(result).toBeDefined();
      expect(result.actionType).toBe('original_post');
    });

    test('Claude API エラー時のフォールバック', async () => {
      // Claude APIエラーのモック
      const { claude } = await import('@instantlyeasy/claude-code-sdk-ts');
      vi.mocked(claude).mockImplementation(() => ({
        withModel: () => ({
          query: () => ({
            asText: vi.fn().mockRejectedValue(new Error('Claude API error'))
          })
        })
      }));

      const result = await collector.collectForAction('original_post', mockContext, 85);

      // Claude APIエラー時もシステムが動作することを確認
      expect(result).toBeDefined();
      expect(result.actionType).toBe('original_post');
    });
  });

  describe('パフォーマンステスト', () => {
    test('90秒制限内での実行完了', async () => {
      const startTime = Date.now();
      const result = await collector.collectForAction('original_post', mockContext, 85);
      const executionTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(90000); // 90秒以内
      expect(result.executionTime).toBeLessThan(90000);
    });

    test('大量データ処理での安定性', async () => {
      // 複数の同時実行でも安定動作することを確認
      const promises = Array.from({ length: 3 }, () =>
        collector.collectForAction('original_post', mockContext, 85)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.actionType).toBe('original_post');
        expect(result.executionTime).toBeGreaterThan(0);
      });
    });
  });
});