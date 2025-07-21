import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { DecisionEngine } from '../../src/core/decision-engine.js';
import { AutonomousExecutor } from '../../src/core/autonomous-executor.js';
import { ActionSpecificCollector } from '../../src/lib/action-specific-collector.js';
import type { IntegratedContext, ActionSpecificResult, Decision } from '../../src/types/autonomous-system.js';

describe('ActionSpecificCollector システム統合', () => {
  let decisionEngine: DecisionEngine;
  let autonomousExecutor: AutonomousExecutor;
  let actionSpecificCollector: ActionSpecificCollector;
  let mockIntegratedContext: IntegratedContext;

  beforeEach(() => {
    // テストモードの設定
    process.env.X_TEST_MODE = 'true';
    
    // モックコンテキストの設定
    mockIntegratedContext = {
      account: {
        currentState: {
          timestamp: new Date().toISOString(),
          followers: { current: 1000, change_24h: 10, growth_rate: '1.0%' },
          engagement: { avg_likes: 25, avg_retweets: 5, engagement_rate: '2.5%' },
          performance: { posts_today: 3, target_progress: '20%', best_posting_time: '12:00' },
          health: { status: 'healthy', api_limits: 'normal', quality_score: 85 },
          recommendations: [],
          healthScore: 85
        },
        recommendations: ['高品質コンテンツの継続'],
        healthScore: 85
      },
      market: {
        trends: [
          {
            id: 'trend-1',
            type: 'trend',
            content: '市場分析: 最新のトレーディング手法について',
            source: 'test-source',
            relevanceScore: 0.9,
            timestamp: Date.now(),
            metadata: { engagement: 150, author: 'test-expert' }
          }
        ],
        opportunities: [
          {
            type: 'original_post',
            content: '投資戦略の最新動向について解説',
            priority: 'high',
            reasoning: 'トレンドに基づく高価値コンテンツ',
            estimatedEngagement: 0.8
          }
        ],
        competitorActivity: []
      },
      actionSuggestions: [
        {
          type: 'original_post',
          content: 'テストコンテンツ',
          reasoning: 'テスト用のアクション提案',
          priority: 'high',
          expectedImpact: 0.7
        }
      ],
      timestamp: Date.now()
    };

    // ActionSpecificCollectorの初期化
    actionSpecificCollector = new ActionSpecificCollector();
    
    // DecisionEngineの初期化（ActionSpecificCollector付き）
    decisionEngine = new DecisionEngine(actionSpecificCollector);
    
    // AutonomousExecutorの初期化
    autonomousExecutor = new AutonomousExecutor();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.X_TEST_MODE;
  });

  describe('DecisionEngine統合', () => {
    test('makeExpandedActionDecisions: ActionSpecific収集による決定強化', async () => {
      // テスト実行
      const decisions = await decisionEngine.makeExpandedActionDecisions(
        mockIntegratedContext
      );

      // 検証
      expect(decisions).toBeDefined();
      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBeGreaterThan(0);

      // 決定の基本構造を確認
      const firstDecision = decisions[0];
      expect(firstDecision).toHaveProperty('id');
      expect(firstDecision).toHaveProperty('type');
      expect(firstDecision).toHaveProperty('priority');
      expect(firstDecision).toHaveProperty('reasoning');
      
      // ActionSpecific統合のメタデータ確認
      if (firstDecision.metadata?.enhancedWithSpecificCollection) {
        expect(firstDecision.metadata).toHaveProperty('collectionSufficiency');
        expect(firstDecision.metadata).toHaveProperty('collectionQuality');
        expect(firstDecision.metadata).toHaveProperty('enhancementTimestamp');
        expect(typeof firstDecision.metadata.collectionSufficiency).toBe('number');
        expect(typeof firstDecision.metadata.collectionQuality).toBe('number');
      }
    }, 30000); // 30秒タイムアウト

    test('フォールバック動作: ActionSpecificCollector無効時の正常動作', async () => {
      // ActionSpecificCollectorなしのDecisionEngineを作成
      const decisionEngineWithoutCollector = new DecisionEngine();

      // テスト実行
      const decisions = await decisionEngineWithoutCollector.makeExpandedActionDecisions(
        mockIntegratedContext
      );

      // 検証: エラーなく動作し、基本的な決定が生成される
      expect(decisions).toBeDefined();
      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBeGreaterThan(0);

      // ActionSpecific統合のメタデータが存在しないことを確認
      const firstDecision = decisions[0];
      expect(firstDecision.metadata?.enhancedWithSpecificCollection).toBeFalsy();
    }, 30000);
  });

  describe('AutonomousExecutor統合', () => {
    test('Step 2: ActionSpecific情報収集プリロードの動作確認', async () => {
      // プリベートメソッドのテストのため、型アサーションを使用
      const executor = autonomousExecutor as any;
      
      // テスト実行
      const result = await executor.preloadActionSpecificInformation();

      // 検証
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      expect(['success', 'partial', 'fallback']).toContain(result.status);
      expect(typeof result.executionTime).toBe('number');

      if (result.status === 'success') {
        // 成功時の詳細検証
        expect(result.original_post).toBeDefined();
        expect(result.quote_tweet).toBeDefined();
        expect(result.retweet).toBeDefined();
        expect(result.reply).toBeDefined();
        
        // 各ActionSpecificResultの構造確認
        const originalPostResult = result.original_post;
        if (originalPostResult) {
          expect(originalPostResult).toHaveProperty('actionType');
          expect(originalPostResult).toHaveProperty('results');
          expect(originalPostResult).toHaveProperty('sufficiencyScore');
          expect(originalPostResult).toHaveProperty('executionTime');
          expect(originalPostResult).toHaveProperty('qualityMetrics');
          expect(Array.isArray(originalPostResult.results)).toBe(true);
        }
      } else if (result.status === 'fallback') {
        // フォールバック時の検証
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    }, 60000); // 60秒タイムアウト

    test('Step 2並列分析の完全実行', async () => {
      // プリベートメソッドのテストのため、型アサーションを使用
      const executor = autonomousExecutor as any;
      
      // テスト実行
      const parallelResult = await executor.step2_executeParallelAnalysis();

      // 検証
      expect(parallelResult).toBeDefined();
      expect(parallelResult.account).toBeDefined();
      expect(parallelResult.information).toBeDefined();
      expect(parallelResult.timestamp).toBeDefined();
      expect(typeof parallelResult.timestamp).toBe('number');

      // アカウント分析結果の確認
      expect(parallelResult.account).toHaveProperty('healthScore');
      expect(typeof parallelResult.account.healthScore).toBe('number');

      // ActionSpecific情報収集結果の確認
      const infoResult = parallelResult.information;
      expect(infoResult.status).toBeDefined();
      expect(['success', 'partial', 'fallback']).toContain(infoResult.status);
      expect(typeof infoResult.executionTime).toBe('number');
    }, 60000);

    test('統合コンテキスト生成との互換性確認', async () => {
      // プリベートメソッドのテストのため、型アサーションを使用
      const executor = autonomousExecutor as any;
      
      // Step 2結果を取得
      const parallelResult = await executor.step2_executeParallelAnalysis();
      
      // 統合コンテキスト生成に適切な形式であることを確認
      expect(parallelResult.account).toBeDefined();
      expect(parallelResult.information).toBeDefined();
      
      // ContextIntegratorが期待する形式かチェック
      // （実際の統合テストは別途実装される想定）
      expect(typeof parallelResult.account).toBe('object');
      expect(typeof parallelResult.information).toBe('object');
    }, 45000);
  });

  describe('エラーハンドリング', () => {
    test('ActionSpecific収集失敗時のフォールバック動作', async () => {
      // ActionSpecificCollectorのcollectForActionメソッドをモック化してエラーを発生させる
      const mockCollector = vi.spyOn(actionSpecificCollector, 'collectForAction');
      mockCollector.mockRejectedValue(new Error('収集処理エラー'));

      // DecisionEngineを再初期化
      const decisionEngineWithErrorCollector = new DecisionEngine(actionSpecificCollector);

      // テスト実行（エラーが発生しても正常に処理されることを確認）
      const decisions = await decisionEngineWithErrorCollector.makeExpandedActionDecisions(
        mockIntegratedContext
      );

      // 検証: エラーが発生してもフォールバックで決定が生成される
      expect(decisions).toBeDefined();
      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBeGreaterThan(0);

      // モックが呼ばれたことを確認
      expect(mockCollector).toHaveBeenCalled();
    }, 30000);

    test('プリロード処理の部分的失敗に対する耐性', async () => {
      // ActionSpecificCollectorの一部のメソッドでエラーを発生させる
      const mockCollector = vi.spyOn(actionSpecificCollector, 'collectForAction');
      mockCollector
        .mockResolvedValueOnce({
          actionType: 'original_post',
          results: [],
          sufficiencyScore: 75,
          executionTime: 1000,
          strategyUsed: { actionType: 'original_post', targets: [], priority: 'medium', expectedDuration: 30, searchTerms: [], sources: [] },
          qualityMetrics: { relevanceScore: 80, credibilityScore: 85, uniquenessScore: 70, timelinessScore: 90, overallScore: 81, feedback: [] }
        })
        .mockRejectedValueOnce(new Error('quote_tweet収集エラー'))
        .mockResolvedValueOnce({
          actionType: 'retweet',
          results: [],
          sufficiencyScore: 65,
          executionTime: 800,
          strategyUsed: { actionType: 'retweet', targets: [], priority: 'low', expectedDuration: 20, searchTerms: [], sources: [] },
          qualityMetrics: { relevanceScore: 70, credibilityScore: 80, uniquenessScore: 65, timelinessScore: 85, overallScore: 75, feedback: [] }
        })
        .mockResolvedValueOnce({
          actionType: 'reply',
          results: [],
          sufficiencyScore: 60,
          executionTime: 600,
          strategyUsed: { actionType: 'reply', targets: [], priority: 'low', expectedDuration: 15, searchTerms: [], sources: [] },
          qualityMetrics: { relevanceScore: 65, credibilityScore: 75, uniquenessScore: 60, timelinessScore: 80, overallScore: 70, feedback: [] }
        });

      // プリベートメソッドのテストのため、型アサーションを使用
      const executor = autonomousExecutor as any;
      
      // テスト実行
      const result = await executor.preloadActionSpecificInformation();

      // 検証: 部分的失敗でも処理が継続され、可能な限りの結果が返される
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
      
      // 成功した部分の結果は存在する
      expect(result.original_post).toBeDefined();
      expect(result.retweet).toBeDefined();
      expect(result.reply).toBeDefined();
      
      // エラーが発生した部分（quote_tweet）は未定義またはエラー情報
      // （実装によってはundefinedまたはエラー情報が入る）
    }, 45000);

    test('完全なActionSpecific失敗時のフォールバック', async () => {
      // ActionSpecificCollectorの全メソッドでエラーを発生させる
      const mockCollector = vi.spyOn(actionSpecificCollector, 'collectForAction');
      mockCollector.mockRejectedValue(new Error('全体的な収集エラー'));

      // プリベートメソッドのテストのため、型アサーションを使用
      const executor = autonomousExecutor as any;
      
      // テスト実行
      const result = await executor.preloadActionSpecificInformation();

      // 検証: フォールバック状態になっている
      expect(result).toBeDefined();
      expect(result.status).toBe('fallback');
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(typeof result.executionTime).toBe('number');
    }, 30000);
  });

  describe('パフォーマンス要件', () => {
    test('プリロード処理時間の確認', async () => {
      // プリベートメソッドのテストのため、型アサーションを使用
      const executor = autonomousExecutor as any;
      
      const startTime = Date.now();
      const result = await executor.preloadActionSpecificInformation();
      const actualExecutionTime = Date.now() - startTime;

      // 検証: 実行時間要件（60秒以内）
      expect(actualExecutionTime).toBeLessThan(60000); // 60秒
      
      // 結果に記録された実行時間と実際の時間の整合性確認
      expect(result.executionTime).toBeLessThan(actualExecutionTime + 1000); // 1秒の誤差許容
    }, 65000);

    test('Step 2並列分析の実行時間確認', async () => {
      // プリベートメソッドのテストのため、型アサーションを使用
      const executor = autonomousExecutor as any;
      
      const startTime = Date.now();
      const result = await executor.step2_executeParallelAnalysis();
      const executionTime = Date.now() - startTime;

      // 検証: 実行時間要件（90秒以内）
      expect(executionTime).toBeLessThan(90000); // 90秒
      
      // 結果の存在確認
      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();
    }, 95000);
  });

  describe('統合システムの完全性', () => {
    test('型安全性の確認', async () => {
      // 統合システム全体の型安全性を確認
      const decisions = await decisionEngine.makeExpandedActionDecisions(
        mockIntegratedContext
      );

      // TypeScriptの型チェックが通るかを確認（コンパイル時）
      expect(decisions).toBeDefined();
      
      decisions.forEach((decision: Decision) => {
        expect(typeof decision.id).toBe('string');
        expect(typeof decision.type).toBe('string');
        expect(['critical', 'high', 'medium', 'low']).toContain(decision.priority);
        if (decision.reasoning) expect(typeof decision.reasoning).toBe('string');
        if (decision.estimatedDuration) expect(typeof decision.estimatedDuration).toBe('number');
      });
    });

    test('既存システムとの互換性確認', async () => {
      // 既存システムで期待される形式のコンテキストが正しく処理されることを確認
      const minimalContext: IntegratedContext = {
        account: {
          currentState: {
            timestamp: new Date().toISOString(),
            followers: { current: 0, change_24h: 0, growth_rate: '0%' },
            engagement: { avg_likes: 0, avg_retweets: 0, engagement_rate: '0%' },
            performance: { posts_today: 0, target_progress: '0%', best_posting_time: '12:00' },
            health: { status: 'healthy', api_limits: 'normal', quality_score: 50 },
            recommendations: [],
            healthScore: 50
          },
          recommendations: [],
          healthScore: 50
        },
        market: {
          trends: [],
          opportunities: [],
          competitorActivity: []
        },
        actionSuggestions: [],
        timestamp: Date.now()
      };

      // テスト実行
      const decisions = await decisionEngine.makeExpandedActionDecisions(minimalContext);

      // 検証: 最小限のコンテキストでも正常に動作する
      expect(decisions).toBeDefined();
      expect(Array.isArray(decisions)).toBe(true);
    });
  });
});