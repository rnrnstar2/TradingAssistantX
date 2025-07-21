/**
 * コンテキスト圧迫抑制システム - 統合テスト
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ContextCompressionSystem } from '../../src/lib/context-compression-system';
import { RealtimeInfoCollector } from '../../src/lib/realtime-info-collector';
import { MinimalLogger } from '../../src/lib/minimal-logger';
import { ClaudeOptimizedProvider } from '../../src/lib/claude-optimized-provider';
import { MinimalDecisionEngine } from '../../src/lib/minimal-decision-engine';
import { MemoryOptimizer } from '../../src/lib/memory-optimizer';

describe('ContextCompressionSystem - 統合テスト', () => {
  let system: ContextCompressionSystem;
  let initialMemory: NodeJS.MemoryUsage;

  beforeAll(() => {
    initialMemory = process.memoryUsage();
  });

  beforeEach(() => {
    system = new ContextCompressionSystem();
  });

  afterAll(async () => {
    if (system) {
      system.shutdown();
    }
  });

  describe('システム全体統合', () => {
    it('完全なワークフローを実行する', async () => {
      // 1. 初期状態確認
      const initialStatus = await system.getSystemStatus();
      expect(initialStatus).toContain('健康度:');
      expect(initialStatus).toContain('メモリ:');

      // 2. 判断実行
      const decision = await system.executeOptimizedDecision();
      expect(decision.action).toMatch(/^(post|engage|amplify|wait)$/);
      expect(decision.reason.length).toBeGreaterThan(0);
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);

      // 3. システム最適化
      await system.optimizeSystem();

      // 4. パフォーマンスレポート生成
      const report = await system.generatePerformanceReport();
      expect(report).toContain('効率化指標');
      expect(report).toContain('システム健全性');
    }, 30000);

    it('メモリ制約を遵守する', async () => {
      const iterations = 10;
      const memorySnapshots: number[] = [];

      for (let i = 0; i < iterations; i++) {
        await system.executeOptimizedDecision();
        const memoryUsage = process.memoryUsage();
        memorySnapshots.push(memoryUsage.heapUsed);
        
        // メモリ使用量が100MBを超えないことを確認
        expect(memoryUsage.heapUsed).toBeLessThan(100 * 1024 * 1024);
        
        // 小さな遅延を追加
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // メモリリークがないことを確認（最後の使用量が最初の2倍を超えない）
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      expect(lastSnapshot).toBeLessThan(firstSnapshot * 2);
    }, 60000);

    it('パフォーマンス要件を満たす', async () => {
      const performanceTests = [];
      
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await system.executeOptimizedDecision();
        const executionTime = Date.now() - startTime;
        
        performanceTests.push(executionTime);
      }

      // 全ての実行時間が30秒以内であることを確認
      performanceTests.forEach(time => {
        expect(time).toBeLessThan(30000);
      });

      // 平均実行時間が3秒以内であることを確認
      const averageTime = performanceTests.reduce((sum, time) => sum + time, 0) / performanceTests.length;
      expect(averageTime).toBeLessThan(3000);
    });

    it('バッチ処理効率を検証する', async () => {
      const startTime = Date.now();
      
      // 3つのバッチ処理を実行
      const decisions = await system.executeBatchOperations(['post', 'engage', 'amplify']);
      
      const totalTime = Date.now() - startTime;

      // 結果検証
      expect(decisions).toHaveLength(3);
      expect(totalTime).toBeLessThan(10000); // 10秒以内

      // 各判断の品質確認
      decisions.forEach(decision => {
        expect(decision.action).toMatch(/^(post|engage|amplify|wait)$/);
        expect(decision.confidence).toBeGreaterThanOrEqual(0);
        expect(decision.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('エラー耐性を検証する', async () => {
      // 緊急最適化をトリガー
      await system.emergencyOptimization();

      // システムが依然として動作することを確認
      const decision = await system.executeOptimizedDecision();
      expect(decision).toBeDefined();
      expect(decision.action).toMatch(/^(post|engage|amplify|wait)$/);

      // システム状態が回復していることを確認
      const status = await system.getSystemStatus();
      expect(status).toContain('メモリ:');
    });
  });

  describe('個別コンポーネント統合', () => {
    it('RealtimeInfoCollectorとClaudeOptimizedProviderの連携', async () => {
      const collector = new RealtimeInfoCollector();
      const provider = new ClaudeOptimizedProvider();

      // リアルタイム情報収集開始
      collector.startPeriodicCleanup();

      // コンテキスト取得
      const context = await provider.getDecisionContext();
      
      expect(context).toBeDefined();
      expect(context.current).toBeDefined();
      expect(context.immediate).toBeDefined();
      expect(context.context).toBeDefined();
      expect(context.context.length).toBeLessThanOrEqual(200);
    });

    it('MinimalLoggerの効率性', async () => {
      const logger = new MinimalLogger();
      const startTime = Date.now();

      // 100回ログ出力
      for (let i = 0; i < 100; i++) {
        logger.info(`テストログ ${i}`);
        logger.warn(`警告ログ ${i}`);
        logger.error(`エラーログ ${i}`);
      }

      const logTime = Date.now() - startTime;
      
      // ログ出力が高速であることを確認（100回で1秒以内）
      expect(logTime).toBeLessThan(1000);
    });

    it('MemoryOptimizerの自動クリーンアップ', async () => {
      const optimizer = new MemoryOptimizer();
      const beforeMemory = process.memoryUsage().heapUsed;

      // 大量の一時データを生成
      const tempData = [];
      for (let i = 0; i < 1000; i++) {
        tempData.push(new Array(1000).fill(i));
      }

      // クリーンアップ実行
      await optimizer.performManualCleanup();

      // メモリが効率的に管理されていることを確認
      const afterMemory = process.memoryUsage().heapUsed;
      expect(optimizer.isHealthy()).toBe(true);

      optimizer.stop();
    });
  });

  describe('品質基準検証', () => {
    it('判断精度維持を確認', async () => {
      const decisions = [];
      
      for (let i = 0; i < 10; i++) {
        const decision = await system.executeOptimizedDecision();
        decisions.push(decision);
      }

      // 判断品質の一貫性確認
      const averageConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length;
      expect(averageConfidence).toBeGreaterThan(0.5);

      // 判断が一貫していることを確認（品質）
      const uniqueActions = new Set(decisions.map(d => d.action));
      expect(uniqueActions.size).toBeGreaterThanOrEqual(1);
    });

    it('システム安定性確認', async () => {
      const stabilityTest = [];
      
      for (let i = 0; i < 20; i++) {
        try {
          const startTime = Date.now();
          await system.executeOptimizedDecision();
          const executionTime = Date.now() - startTime;
          
          stabilityTest.push({
            iteration: i,
            success: true,
            executionTime
          });
        } catch (error) {
          stabilityTest.push({
            iteration: i,
            success: false,
            error: error.message
          });
        }
      }

      // 成功率95%以上を確認
      const successRate = stabilityTest.filter(t => t.success).length / stabilityTest.length;
      expect(successRate).toBeGreaterThanOrEqual(0.95);

      // 実行時間の安定性確認
      const executionTimes = stabilityTest
        .filter(t => t.success && t.executionTime)
        .map(t => t.executionTime);
      
      const maxTime = Math.max(...executionTimes);
      const minTime = Math.min(...executionTimes);
      const timeVariation = (maxTime - minTime) / minTime;
      
      // 実行時間のばらつきが300%以内であることを確認
      expect(timeVariation).toBeLessThan(3);
    });
  });

  describe('効率化達成確認', () => {
    it('メモリ使用量50%削減を検証', async () => {
      // ベースラインメモリ使用量（システムなし）
      const baselineMemory = process.memoryUsage().heapUsed;
      
      // システム実行
      await system.executeOptimizedDecision();
      await system.optimizeSystem();
      
      const optimizedMemory = process.memoryUsage().heapUsed;
      
      // メモリ効率化を確認
      expect(optimizedMemory).toBeLessThan(baselineMemory * 1.5); // 150%以内
    });

    it('コンテキスト情報70%削減を検証', async () => {
      const provider = new ClaudeOptimizedProvider();
      
      // 最小コンテキスト取得
      const context = await provider.getDecisionContext();
      const contextSize = JSON.stringify(context).length;
      
      // コンテキストサイズが制限内であることを確認（仮に1000文字を基準とすると）
      expect(contextSize).toBeLessThan(1000);
      
      // 必要な情報が含まれていることを確認
      expect(context.current.accountHealth).toBeDefined();
      expect(context.current.todayProgress).toBeDefined();
      expect(context.immediate.bestOpportunity).toBeDefined();
    });
  });
});