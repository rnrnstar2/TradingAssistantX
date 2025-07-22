import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SystemDecisionEngine } from '../../src/core/decision-engine';
import * as path from 'path';

// テスト用YAMLデータ
const mockAccountStatus = {
  timestamp: "2025-07-22T21:00:00.000Z",
  followers: {
    current: 500,
    change_24h: 5,
    growth_rate: "1.0%"
  },
  engagement: {
    avg_likes: 2,
    avg_retweets: 1,
    engagement_rate: "4.5%"
  },
  performance: {
    posts_today: 3,
    target_progress: "20.0%",
    best_posting_time: "21:00"
  },
  health: {
    status: "healthy" as const,
    api_limits: "normal" as const,
    quality_score: 80
  },
  recommendations: [],
  healthScore: 82
};

const mockBrandStrategy = {
  brand_identity: {
    core_theme: "投資初心者向け基礎教育",
    target_audience: "20-40代投資初心者・兼業トレーダー",
    tone_style: "教育的で親しみやすい",
    expertise_areas: ["リスク管理", "基礎知識", "投資心理"]
  },
  growth_stage_rules: {
    stage_1: {
      theme_consistency: 80,
      allowed_themes: ["investment_basics"]
    },
    stage_2: {
      theme_consistency: 60,
      allowed_themes: ["investment_basics", "market_analysis"]
    },
    stage_3: {
      theme_consistency: 40,
      allowed_themes: ["all"]
    }
  }
};

// loadYamlSafeのモック
vi.mock('../../src/utils/yaml-utils', () => ({
  loadYamlSafe: vi.fn(),
  loadYamlArraySafe: vi.fn(() => [])
}));

describe('SystemDecisionEngine - REQUIREMENTS.md準拠テスト', () => {
  let engine: SystemDecisionEngine;

  beforeEach(async () => {
    vi.clearAllMocks();
    engine = new SystemDecisionEngine();
    
    // デフォルトのYAMLローダーモック設定
    const yamlUtils = await import('../../src/utils/yaml-utils');
    vi.mocked(yamlUtils.loadYamlSafe).mockImplementation((filePath: string) => {
      if (filePath.includes('account-status.yaml')) {
        return mockAccountStatus;
      }
      if (filePath.includes('brand-strategy.yaml')) {
        return mockBrandStrategy;
      }
      return null;
    });
  });

  describe('REQUIREMENTS.md準拠の意思決定フロー', () => {
    it('現在状況分析が正常に動作する', async () => {
      const analysis = await engine.analyzeCurrentSituation();

      expect(analysis).toBeDefined();
      expect(analysis.accountStatus).toEqual(mockAccountStatus);
      expect(analysis.healthScore).toBeGreaterThan(50);
      expect(['low', 'medium', 'high']).toContain(analysis.urgencyLevel);
      expect(analysis.timeContext.currentTime).toBeDefined();
      expect(analysis.marketCondition.volatility).toMatch(/^(low|medium|high)$/);
    });

    it('戦略選択が正常に動作する', async () => {
      const mockAnalysis = {
        accountStatus: mockAccountStatus,
        marketCondition: {
          volatility: 'medium' as const,
          newsUrgency: { level: 'daily' as const, events: [] },
          economicEvents: []
        },
        timeContext: {
          currentTime: new Date().toISOString(),
          dayOfWeek: '金',
          optimalPostingTime: true
        },
        healthScore: 82,
        urgencyLevel: 'medium' as const
      };

      const strategy = await engine.selectStrategy(mockAnalysis);

      expect(strategy).toBeDefined();
      expect(strategy.collectionStrategy.method).toMatch(/^(rss_focused|multi_source|account_analysis)$/);
      expect(strategy.contentStrategy.type).toMatch(/^(educational|trend_responsive|analysis_focused)$/);
      expect(strategy.postingStrategy.strategy).toMatch(/^(scheduled|opportunity|optimized)$/);
      expect(strategy.reasoning).toBeDefined();
    });
  });

  describe('判断基準テスト (REQUIREMENTS.md準拠)', () => {
    it('アカウント状態による分岐 - 成長初期段階 (< 1000フォロワー)', async () => {
      const smallAccountStatus = {
        ...mockAccountStatus,
        followers: { current: 500, change_24h: 0, growth_rate: "0%" }
      };

      const strategy = await engine.determineCollectionStrategy(
        smallAccountStatus,
        { volatility: 'medium' as const, newsUrgency: { level: 'daily' as const, events: [] }, economicEvents: [] }
      );

      expect(strategy.method).toBe('rss_focused');
      expect(strategy.sources).toContain('rss_feeds');
      expect(strategy.priority).toBe('high');
    });

    it('アカウント状態による分岐 - 成長軌道段階 (1000-10000)', async () => {
      const mediumAccountStatus = {
        ...mockAccountStatus,
        followers: { current: 5000, change_24h: 10, growth_rate: "2.0%" }
      };

      const strategy = await engine.determineCollectionStrategy(
        mediumAccountStatus,
        { volatility: 'medium' as const, newsUrgency: { level: 'daily' as const, events: [] }, economicEvents: [] }
      );

      expect(strategy.method).toBe('multi_source');
      expect(strategy.sources).toEqual(expect.arrayContaining(['rss_feeds', 'market_data']));
      expect(strategy.priority).toBe('medium');
    });

    it('エンゲージメントによる分岐 - 低エンゲージメント (< 3%)', async () => {
      const lowEngagementProfile = {
        stage: 'growth_initial' as const,
        demographics: '投資初心者',
        preferences: ['基礎教育']
      };

      const lowEngagementMetrics = {
        averageRate: 2.0,
        trend: 'stable' as const,
        variance: 1.2
      };

      const strategy = await engine.determineContentStrategy(
        lowEngagementProfile,
        lowEngagementMetrics
      );

      expect(strategy.type).toBe('trend_responsive');
      expect(strategy.themes).toContain('市場トレンド');
    });

    it('外部環境による分岐 - 緊急ニュース', async () => {
      const urgentNews = {
        level: 'immediate' as const,
        events: ['重要経済指標発表']
      };

      const historicalData = {
        recentPosts: 5,
        successfulTimes: ['21:00', '20:00'],
        engagementPattern: { '21:00': 1.4, '20:00': 1.3 }
      };

      const timing = await engine.determinePostingTiming(urgentNews, historicalData);

      expect(timing.strategy).toBe('opportunity');
      expect(timing.urgency).toBe('immediate');
    });
  });

  describe('統合決定テスト', () => {
    it('完全フロー実行が成功する', async () => {
      const decisions = await engine.executeComprehensiveDecision();

      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBeGreaterThan(0);
      
      const decision = decisions[0];
      expect(decision.id).toBeDefined();
      expect(decision.type).toBe('content_creation');
      expect(['critical', 'high', 'medium', 'low']).toContain(decision.priority);
      expect(decision.reasoning).toBeDefined();
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);
    });

    it('ブランド一貫性チェックが動作する', async () => {
      const testDecision = {
        id: 'test-decision',
        type: 'content_creation' as const,
        priority: 'medium' as const,
        reasoning: 'テスト決定',
        confidence: 0.8,
        data: {
          context: { environment: 'test', constraints: [], objectives: [], timeframe: 'test' },
          factors: [],
          alternatives: []
        },
        timestamp: new Date().toISOString(),
        status: 'pending' as const,
        params: {
          actionType: 'original_post',
          originalContent: '投資の基本について学ぼう'
        },
        dependencies: [],
        estimatedDuration: 30
      };

      // privateメソッドのテストのため、any型でアクセス
      const checkedDecision = await (engine as any).checkBrandConsistency(testDecision);

      expect(checkedDecision).toBeDefined();
      expect(checkedDecision.id).toBe(testDecision.id);
      expect(checkedDecision.reasoning).toContain('投資初心者向け基礎教育');
    });
  });

  describe('エラーハンドリングテスト', () => {
    it('YAML読み込み失敗時にフォールバック戦略を使用する', async () => {
      // YAMLローダーがエラーを投げるようにモック
      const yamlUtils = await import('../../src/utils/yaml-utils');
      vi.mocked(yamlUtils.loadYamlSafe).mockImplementation(() => {
        throw new Error('YAML読み込みエラー');
      });

      const analysis = await engine.analyzeCurrentSituation();

      // フォールバック値が使用されることを確認
      expect(analysis).toBeDefined();
      expect(analysis.accountStatus.followers.current).toBe(5); // デフォルト値
      expect(analysis.healthScore).toBeGreaterThan(0);
    });

    it('戦略選択失敗時にフォールバック戦略を返す', async () => {
      // 異常な状況をシミュレート（フォロワー数が負の値でも対応する）
      const abnormalAnalysis = {
        accountStatus: {
          ...mockAccountStatus,
          followers: { current: -1, change_24h: 0, growth_rate: "0%" } // 異常値
        },
        marketCondition: {
          volatility: 'medium' as const,
          newsUrgency: { level: 'daily' as const, events: [] },
          economicEvents: []
        },
        timeContext: {
          currentTime: new Date().toISOString(),
          dayOfWeek: '金',
          optimalPostingTime: true
        },
        healthScore: 0,
        urgencyLevel: 'high' as const
      };

      const strategy = await engine.selectStrategy(abnormalAnalysis);

      // 戦略が正常に生成されることを確認（堅牢性テスト）
      expect(strategy).toBeDefined();
      expect(strategy.collectionStrategy.method).toBe('rss_focused'); // -1 < 1000なのでrss_focused
      expect(strategy.reasoning).toBeDefined();
      expect(strategy.contentStrategy.type).toMatch(/^(educational|trend_responsive|analysis_focused)$/);
    });
  });

  describe('YAML依存機能テスト', () => {
    it('データ最適化・クレンジングの利用', async () => {
      // データ保存機能のテスト
      const testDecisions = [{
        id: 'test-save',
        type: 'content_creation' as const,
        priority: 'medium' as const,
        reasoning: 'テスト保存',
        confidence: 0.8,
        data: {
          context: { environment: 'test', constraints: [], objectives: [], timeframe: 'test' },
          factors: [],
          alternatives: []
        },
        timestamp: new Date().toISOString(),
        status: 'pending' as const,
        params: {},
        dependencies: [],
        estimatedDuration: 30
      }];

      // privateメソッドのテスト
      await expect((engine as any).saveDecisions(testDecisions)).resolves.not.toThrow();
    });
  });

  describe('MVP制約準拠テスト', () => {
    it('複雑な機械学習アルゴリズムを使用していない', () => {
      // SystemDecisionEngineクラスのメソッド一覧を取得
      const methods = Object.getOwnPropertyNames(SystemDecisionEngine.prototype);
      
      // MLやAI関連の複雑な処理を示すメソッド名がないことを確認
      const forbiddenPatterns = [
        /neuralnetwork/i,
        /deeplearning/i,
        /tensorflow/i,
        /pytorch/i,
        /machinelearning/i
      ];

      methods.forEach(method => {
        forbiddenPatterns.forEach(pattern => {
          expect(method).not.toMatch(pattern);
        });
      });
    });

    it('ルールベースの明確な判断ロジックを使用している', async () => {
      const testAccountStatus = {
        ...mockAccountStatus,
        followers: { current: 100, change_24h: 0, growth_rate: "0%" }
      };

      const strategy = await engine.determineCollectionStrategy(
        testAccountStatus,
        { volatility: 'medium' as const, newsUrgency: { level: 'daily' as const, events: [] }, economicEvents: [] }
      );

      // 明確なルールベースの判断結果
      expect(strategy.method).toBe('rss_focused'); // < 1000なのでrss_focused
      expect(strategy.timeAllocation).toBe(80); // 固定値
    });
  });
});