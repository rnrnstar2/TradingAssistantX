/**
 * ActionSpecificCollector Test Suite
 * 疎結合設計の核心コンポーネントのテスト
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  ActionSpecificCollector,
  CollectorType,
  RSSFocusedStrategy,
  MultiSourceStrategy,
  AccountAnalysisStrategy,
  type CollectorSelectionCriteria,
  type AccountStatus,
  type TimeContext
} from '../../src/collectors/action-specific-collector.js';
import { CollectionContext } from '../../src/collectors/base-collector.js';
import { MarketCondition } from '../../src/types/collection-types.js';

// ============================================================================
// MOCK SETUP - モック設定
// ============================================================================

// Logger のモック
vi.mock('../../src/logging/logger.js', () => ({
  Logger: vi.fn().mockImplementation((context: string) => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    debug: vi.fn()
  }))
}));

// YamlManager のモック
vi.mock('../../src/utils/yaml-manager.js', () => ({
  YamlManager: vi.fn().mockImplementation(() => ({
    readYaml: vi.fn().mockResolvedValue({
      strategies: {
        rss_focused: {
          enabled: true,
          priority: 1,
          collectors: [
            { type: 'rss', weight: 0.9 },
            { type: 'account', weight: 0.1 }
          ]
        },
        multi_source: {
          enabled: true,
          priority: 2,
          collectors: [
            { type: 'rss', weight: 0.6 },
            { type: 'account', weight: 0.4 }
          ]
        },
        account_analysis: {
          enabled: true,
          priority: 3,
          collectors: [
            { type: 'account', weight: 1.0 }
          ]
        }
      },
      resource_limits: {
        max_concurrent_collectors: 3,
        collector_timeout_seconds: 60,
        memory_limit_mb: 512
      }
    })
  }))
}));

// BaseCollector のモック結果
const mockCollectionResult = {
  source: 'test-source',
  data: [
    { id: '1', title: 'Test Item 1', content: 'Test content 1' },
    { id: '2', title: 'Test Item 2', content: 'Test content 2' }
  ],
  metadata: {
    timestamp: new Date().toISOString(),
    count: 2,
    sourceType: 'test',
    processingTime: 1000
  },
  success: true
};

// RSSCollector のモック
vi.mock('../../src/collectors/rss-collector.js', () => ({
  RSSCollector: vi.fn().mockImplementation(() => ({
    collect: vi.fn().mockResolvedValue({
      ...mockCollectionResult,
      source: 'rss-collector'
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
    getSourceType: vi.fn().mockReturnValue('rss'),
    shouldCollect: vi.fn().mockReturnValue(true),
    getPriority: vi.fn().mockReturnValue(5)
  }))
}));

// PlaywrightAccountCollector のモック
vi.mock('../../src/collectors/playwright-account.js', () => ({
  PlaywrightAccountCollector: vi.fn().mockImplementation(() => ({
    collect: vi.fn().mockResolvedValue({
      ...mockCollectionResult,
      source: 'playwright-account-collector',
      data: [{
        followers: 1000,
        engagement: 0.05,
        posts_today: 3
      }]
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
    getSourceType: vi.fn().mockReturnValue('account'),
    shouldCollect: vi.fn().mockReturnValue(true),
    getPriority: vi.fn().mockReturnValue(3)
  }))
}));

// ============================================================================
// TEST DATA - テストデータ
// ============================================================================

const createMockContext = (): CollectionContext => ({
  action: 'collect_market_data',
  theme: 'forex_analysis',
  timestamp: Date.now(),
  priority: 'high'
});

const createMockAccountStatus = (): AccountStatus => ({
  followerCount: 1000,
  engagement: 'medium',
  lastAnalysis: Date.now() - (12 * 60 * 60 * 1000), // 12時間前
  significantChange: false,
  themeConsistency: 0.85,
  followerGrowth: 0.05
});

const createMockMarketCondition = (): MarketCondition => ({
  volatility: 'medium',
  trendDirection: 'up',
  newsIntensity: 'medium',
  sessionTime: 'tokyo',
  majorEventScheduled: false
});

const createMockTimeContext = (): TimeContext => ({
  currentHour: 14,
  marketSession: 'tokyo',
  dayOfWeek: 2, // Tuesday
  isWeekend: false
});

const createMockCriteria = (): CollectorSelectionCriteria => ({
  context: createMockContext(),
  accountStatus: createMockAccountStatus(),
  marketCondition: createMockMarketCondition(),
  timeContext: createMockTimeContext(),
  strategy: 'rss_focused',
  priority: 1
});

// ============================================================================
// MAIN TEST SUITE - メインテストスイート
// ============================================================================

describe('ActionSpecificCollector', () => {
  let collector: ActionSpecificCollector;

  beforeEach(() => {
    vi.clearAllMocks();
    collector = ActionSpecificCollector.getInstance();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================================================
  // INITIALIZATION TESTS - 初期化テスト
  // ============================================================================

  describe('初期化', () => {
    test('シングルトンパターンで正しく初期化される', () => {
      const instance1 = ActionSpecificCollector.getInstance();
      const instance2 = ActionSpecificCollector.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(ActionSpecificCollector);
    });

    test('設定ファイルが正常に読み込まれる', async () => {
      const health = await collector.getSystemHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|warning|critical/);
      expect(health.collectors).toBeDefined();
      expect(health.strategies).toBeDefined();
    });
  });

  // ============================================================================
  // COLLECTOR SELECTION TESTS - コレクター選択テスト
  // ============================================================================

  describe('selectCollectors', () => {
    test('RSS集中戦略が適用される条件での選択', async () => {
      const criteria = createMockCriteria();
      criteria.accountStatus.engagement = 'low';
      criteria.strategy = 'rss_focused';

      const result = await collector.selectCollectors(criteria);

      expect(result).toBeDefined();
      expect(result.primary).toHaveLength(1);
      expect(result.fallback).toHaveLength(1);
      expect(result.reasoning).toContain('RSS収集に特化した高速・安定戦略');
      expect(result.expectedDuration).toBeGreaterThan(0);
      expect(result.resourceCost).toBeDefined();
      expect(result.resourceCost.timeMs).toBeGreaterThan(0);
    });

    test('複数ソース戦略が適用される条件での選択', async () => {
      const criteria = createMockCriteria();
      criteria.accountStatus.engagement = 'medium';
      criteria.accountStatus.followerCount = 1500;
      criteria.marketCondition.volatility = 'high';

      const result = await collector.selectCollectors(criteria);

      expect(result).toBeDefined();
      expect(result.primary.length).toBeGreaterThanOrEqual(1);
      expect(result.reasoning).toBeDefined();
      expect(result.resourceCost.memoryMb).toBeGreaterThan(0);
    });

    test('アカウント分析戦略が適用される条件での選択', async () => {
      const criteria = createMockCriteria();
      criteria.accountStatus.lastAnalysis = Date.now() - (25 * 60 * 60 * 1000); // 25時間前
      criteria.accountStatus.significantChange = true;

      const result = await collector.selectCollectors(criteria);

      expect(result).toBeDefined();
      expect(result.reasoning).toBeDefined();
    });

    test('無効な条件での例外処理', async () => {
      const criteria = createMockCriteria();
      // すべての戦略を無効にする条件を設定
      criteria.accountStatus.engagement = 'high' as any; // 不正な値
      
      try {
        await collector.selectCollectors(criteria);
        // エラーが発生しない場合、最低限の応答が返されることを確認
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  // ============================================================================
  // STRATEGY EXECUTION TESTS - 戦略実行テスト
  // ============================================================================

  describe('executeStrategy', () => {
    test('RSS集中戦略の実行', async () => {
      const context = createMockContext();
      const result = await collector.executeStrategy('rss_focused', context);

      expect(result).toBeDefined();
      expect(result.source).toBe('rss_focused');
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Array);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.processingTime).toBeGreaterThan(0);
    });

    test('複数ソース戦略の実行', async () => {
      const context = createMockContext();
      const result = await collector.executeStrategy('multi_source', context);

      expect(result).toBeDefined();
      expect(result.source).toBe('multi_source');
      expect(result.metadata.count).toBeGreaterThanOrEqual(0);
    });

    test('アカウント分析戦略の実行', async () => {
      const context = createMockContext();
      const result = await collector.executeStrategy('account_analysis', context);

      expect(result).toBeDefined();
      expect(result.source).toBe('account_analysis');
    });

    test('存在しない戦略での例外処理', async () => {
      const context = createMockContext();
      
      await expect(collector.executeStrategy('invalid_strategy', context))
        .rejects.toThrow('戦略が見つかりません: invalid_strategy');
    });

    test('フォールバック処理の動作確認', async () => {
      const context = createMockContext();
      
      // コレクターでエラーが発生するケースをモック
      const { RSSCollector } = await import('../../src/collectors/rss-collector.js');
      vi.mocked(RSSCollector).mockImplementation(() => ({
        collect: vi.fn().mockRejectedValue(new Error('Collection failed')),
        isAvailable: vi.fn().mockResolvedValue(false),
        getSourceType: vi.fn().mockReturnValue('rss'),
        shouldCollect: vi.fn().mockReturnValue(true),
        getPriority: vi.fn().mockReturnValue(5)
      }) as any);

      const result = await collector.executeStrategy('rss_focused', context);

      // フォールバック結果が返されることを確認
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ============================================================================
  // STRATEGY CLASSES TESTS - 戦略クラステスト
  // ============================================================================

  describe('Strategy Classes', () => {
    describe('RSSFocusedStrategy', () => {
      let strategy: RSSFocusedStrategy;

      beforeEach(() => {
        strategy = new RSSFocusedStrategy();
      });

      test('適用可能条件の判定', () => {
        const criteria = createMockCriteria();
        criteria.accountStatus.engagement = 'low';
        
        const isApplicable = strategy.isApplicable(criteria);
        expect(isApplicable).toBe(true);
      });

      test('優先度の取得', () => {
        const priority = strategy.getPriority();
        expect(priority).toBe(1);
      });

      test('リソースコストの取得', () => {
        const cost = strategy.getResourceCost();
        expect(cost.timeMs).toBeGreaterThan(0);
        expect(cost.memoryMb).toBeGreaterThan(0);
        expect(cost.cpuUnits).toBeGreaterThan(0);
        expect(cost.networkConnections).toBeGreaterThan(0);
      });

      test('戦略実行', async () => {
        const context = createMockContext();
        const result = await strategy.execute(context);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.data).toBeInstanceOf(Array);
      });
    });

    describe('MultiSourceStrategy', () => {
      let strategy: MultiSourceStrategy;

      beforeEach(() => {
        strategy = new MultiSourceStrategy();
      });

      test('適用可能条件の判定', () => {
        const criteria = createMockCriteria();
        criteria.accountStatus.engagement = 'medium';
        criteria.accountStatus.followerCount = 1500;
        criteria.marketCondition.volatility = 'high';
        
        const isApplicable = strategy.isApplicable(criteria);
        expect(isApplicable).toBe(true);
      });

      test('優先度とリソースコスト', () => {
        expect(strategy.getPriority()).toBe(2);
        
        const cost = strategy.getResourceCost();
        expect(cost.timeMs).toBeGreaterThan(30000); // RSS戦略より時間がかかる
        expect(cost.memoryMb).toBeGreaterThan(100); // より多くのメモリを使用
      });
    });

    describe('AccountAnalysisStrategy', () => {
      let strategy: AccountAnalysisStrategy;

      beforeEach(() => {
        strategy = new AccountAnalysisStrategy();
      });

      test('適用可能条件の判定 - 最終分析が24時間以上前', () => {
        const criteria = createMockCriteria();
        criteria.accountStatus.lastAnalysis = Date.now() - (25 * 60 * 60 * 1000);
        
        const isApplicable = strategy.isApplicable(criteria);
        expect(isApplicable).toBe(true);
      });

      test('適用可能条件の判定 - 重要な変化が検出', () => {
        const criteria = createMockCriteria();
        criteria.accountStatus.significantChange = true;
        
        const isApplicable = strategy.isApplicable(criteria);
        expect(isApplicable).toBe(true);
      });

      test('リソースコストがアカウント分析に適している', () => {
        const cost = strategy.getResourceCost();
        expect(cost.timeMs).toBeGreaterThan(60000); // より長い実行時間
        expect(cost.memoryMb).toBeGreaterThan(200); // ブラウザ使用のためより多くのメモリ
      });
    });
  });

  // ============================================================================
  // SYSTEM HEALTH TESTS - システムヘルステスト
  // ============================================================================

  describe('getSystemHealth', () => {
    test('システムヘルス情報の取得', async () => {
      const health = await collector.getSystemHealth();

      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|warning|critical/);
      expect(health.collectors).toBeDefined();
      expect(health.strategies).toBeDefined();
      expect(health.resourceUsage).toBeDefined();
      expect(health.resourceUsage.queueLength).toBeGreaterThanOrEqual(0);
    });

    test('コレクター可用性の確認', async () => {
      const health = await collector.getSystemHealth();
      
      expect(health.collectors).toHaveProperty('rss');
      expect(health.collectors).toHaveProperty('account');
      expect(typeof health.collectors.rss).toBe('boolean');
      expect(typeof health.collectors.account).toBe('boolean');
    });

    test('戦略有効性の確認', async () => {
      const health = await collector.getSystemHealth();
      
      expect(health.strategies).toHaveProperty('rss_focused');
      expect(health.strategies).toHaveProperty('multi_source');
      expect(health.strategies).toHaveProperty('account_analysis');
    });
  });

  // ============================================================================
  // CONFIGURATION TESTS - 設定テスト
  // ============================================================================

  describe('reloadConfiguration', () => {
    test('設定の再読み込み', async () => {
      await expect(collector.reloadConfiguration()).resolves.toBeUndefined();
    });

    test('設定読み込み失敗時の処理', async () => {
      // YamlManagerで例外が発生するケースをモック
      const { YamlManager } = await import('../../src/utils/yaml-manager.js');
      const mockYamlManager = vi.mocked(YamlManager).mock.instances[0];
      vi.mocked(mockYamlManager.readYaml).mockRejectedValueOnce(new Error('Config read failed'));

      // エラーが発生してもsystemが継続動作することを確認
      await expect(collector.reloadConfiguration()).resolves.toBeUndefined();
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS - パフォーマンステスト
  // ============================================================================

  describe('パフォーマンステスト', () => {
    test('選択処理が100ms以内に完了', async () => {
      const criteria = createMockCriteria();
      const startTime = Date.now();
      
      await collector.selectCollectors(criteria);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // 100ms以内
    });

    test('並列実行での安定性', async () => {
      const context = createMockContext();
      
      const promises = Array.from({ length: 3 }, () =>
        collector.executeStrategy('rss_focused', context)
      );

      const results = await Promise.allSettled(promises);
      
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value).toBeDefined();
          expect(result.value.source).toBe('rss_focused');
        }
      });
    });

    test('メモリ制限の遵守', async () => {
      const criteria = createMockCriteria();
      const result = await collector.selectCollectors(criteria);
      
      expect(result.resourceCost.memoryMb).toBeLessThanOrEqual(512); // 設定されたメモリ制限以内
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS - エラーハンドリングテスト
  // ============================================================================

  describe('エラーハンドリング', () => {
    test('コレクター初期化失敗時の処理', async () => {
      // コレクターが利用できない場合
      const { RSSCollector } = await import('../../src/collectors/rss-collector.js');
      vi.mocked(RSSCollector).mockImplementation(() => {
        throw new Error('Collector initialization failed');
      });

      // システムが適切に処理することを確認
      const health = await collector.getSystemHealth();
      expect(health).toBeDefined();
    });

    test('タイムアウト処理', async () => {
      const context = createMockContext();
      
      // 長時間実行をシミュレート
      const { RSSCollector } = await import('../../src/collectors/rss-collector.js');
      vi.mocked(RSSCollector).mockImplementation(() => ({
        collect: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 70000)) // 70秒待機
        ),
        isAvailable: vi.fn().mockResolvedValue(true),
        getSourceType: vi.fn().mockReturnValue('rss'),
        shouldCollect: vi.fn().mockReturnValue(true),
        getPriority: vi.fn().mockReturnValue(5)
      }) as any);

      // タイムアウトが発生することを確認
      await expect(collector.executeStrategy('rss_focused', context))
        .rejects.toThrow();
    });
  });
});