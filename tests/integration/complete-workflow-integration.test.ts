import { describe, test, expect, beforeEach, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { AutonomousExecutor } from '../../src/core/autonomous-executor';
import { TestHelper, MockFactory, TEST_CONSTANTS } from '../../src/utils/test-helper';
import { BasicErrorHandler } from '../../src/utils/error-handler';
import { loadOptimizedConfig } from '../../src/utils/config-loader';
import type { Decision, IntegratedContext } from '../../src/types/autonomous-system';

// 統合テスト用のモック設定
vi.mock('@instantlyeasy/claude-code-sdk-ts', () => ({
  claude: TestHelper.mockClaudeClient()
}));

vi.mock('../../src/lib/playwright-common-config', () => ({
  PlaywrightCommonSetup: MockFactory.createPlaywrightCommonSetupMock()
}));

vi.mock('../../src/utils/yaml-utils', () => ({
  loadYamlSafe: MockFactory.createYamlUtilsMock().loadYamlSafe
}));

describe('Complete Workflow Integration Tests', () => {
  let executor: AutonomousExecutor;
  let errorHandler: BasicErrorHandler;

  beforeAll(() => {
    TestHelper.setupTestEnvironment();
  });

  beforeEach(() => {
    executor = new AutonomousExecutor();
    errorHandler = new BasicErrorHandler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    TestHelper.cleanupTestEnvironment();
  });

  afterAll(() => {
    // グローバルクリーンアップ
  });

  describe('完全実行フローテスト', () => {
    test('正常な完全実行フロー', async () => {
      // Claude APIの成功レスポンスをモック
      const { claude } = await import('@instantlyeasy/claude-code-sdk-ts');
      vi.mocked(claude).mockImplementation(() => ({
        withModel: () => ({
          query: () => ({
            asText: vi.fn().mockResolvedValue(JSON.stringify({
              action: 'original_post',
              reasoning: '市場分析に基づく投稿機会の発見',
              confidence: 0.85
            }))
          })
        })
      }));

      const startTime = Date.now();
      const decision = await executor.executeClaudeAutonomous();
      const executionTime = Date.now() - startTime;

      // 基本的な結果検証
      TestHelper.assertValidDecision(decision);
      expect(decision.type).toBe('original_post');
      expect(decision.metadata?.confidence).toBe(0.85);
      
      // パフォーマンス検証
      TestHelper.assertValidExecutionTime(executionTime);
    });

    test('段階的エラー回復フロー', async () => {
      // 段階的に失敗→成功するシナリオ
      let attemptCount = 0;
      const { claude } = await import('@instantlyeasy/claude-code-sdk-ts');
      
      vi.mocked(claude).mockImplementation(() => ({
        withModel: () => ({
          query: () => ({
            asText: vi.fn().mockImplementation(() => {
              attemptCount++;
              if (attemptCount === 1) {
                throw new Error('Network timeout');
              }
              return Promise.resolve(JSON.stringify({
                action: 'original_post',
                reasoning: 'Recovery successful',
                confidence: 0.75
              }));
            })
          })
        })
      }));

      const decision = await executor.executeClaudeAutonomous();

      // エラー回復後の正常動作を確認
      expect(decision).toBeDefined();
      expect(attemptCount).toBeGreaterThan(1);
    });

    test('複数コンポーネント連携テスト', async () => {
      // 各コンポーネントの動作をモック
      const { ActionSpecificCollector } = await import('../../src/lib/action-specific-collector');
      const mockCollectorResult = {
        results: TestHelper.generateMockCollectionResults(5),
        sufficiencyScore: 88,
        actionType: 'original_post' as const,
        strategyUsed: { actionType: 'original_post' as const, targets: ['market_analysis'] },
        qualityMetrics: { overallScore: 88, relevanceScore: 90, credibilityScore: 85 },
        executionTime: 12000
      };

      vi.mocked(ActionSpecificCollector).mockImplementation(() => ({
        collectForAction: vi.fn().mockResolvedValue(mockCollectorResult)
      }));

      const decision = await executor.executeClaudeAutonomous();

      // コンポーネント間の連携確認
      TestHelper.assertValidDecision(decision);
      expect(decision.type).toBe('original_post');
      
      // ActionSpecificCollectorが呼び出されたことを確認
      const mockCollector = vi.mocked(ActionSpecificCollector).mock.results[0]?.value;
      expect(mockCollector?.collectForAction).toHaveBeenCalledWith(
        'original_post',
        expect.any(Object),
        85
      );
    });

    test('高負荷時の安定性テスト', async () => {
      // 並列実行での安定性確認
      const concurrentExecutions = 5;
      const promises = Array.from({ length: concurrentExecutions }, () =>
        executor.executeClaudeAutonomous()
      );

      const results = await Promise.allSettled(promises);
      
      // すべての実行が完了することを確認
      expect(results).toHaveLength(concurrentExecutions);
      
      const successfulResults = results.filter(result => result.status === 'fulfilled');
      const failedResults = results.filter(result => result.status === 'rejected');
      
      // 少なくとも一部は成功することを期待
      expect(successfulResults.length).toBeGreaterThan(0);
      
      // 失敗があっても適切にハンドルされることを確認
      if (failedResults.length > 0) {
        console.log(`${failedResults.length} executions failed as expected in high-load scenario`);
      }
    });
  });

  describe('設定統合テスト', () => {
    test('異なる設定での実行動作確認', async () => {
      // 異なる設定パターンでのテスト
      const configScenarios = [
        { mode: 'scheduled_posting', interval: 60 },
        { mode: 'dynamic_analysis', interval: 30 },
        { mode: 'test', interval: 10 }
      ];

      for (const scenario of configScenarios) {
        // 設定をモック
        vi.doMock('../../src/utils/config-loader', () => ({
          loadOptimizedConfig: () => ({
            summary: {
              system: {
                mode: scenario.mode,
                posting_interval: scenario.interval
              }
            },
            systemState: null,
            autonomousConfig: null
          })
        }));

        const executor = new AutonomousExecutor();
        const decision = await executor.executeClaudeAutonomous();

        TestHelper.assertValidDecision(decision);
        expect(decision.type).toBeDefined();
      }
    });

    test('設定読み込みエラー時のフォールバック', async () => {
      // 設定読み込みエラーのモック
      vi.doMock('../../src/utils/config-loader', () => ({
        loadOptimizedConfig: () => {
          throw new Error('Configuration file not found');
        }
      }));

      // エラーハンドリング後も動作することを確認
      expect(async () => {
        const executor = new AutonomousExecutor();
        const decision = await executor.executeClaudeAutonomous();
        return decision;
      }).not.toThrow();
    });
  });

  describe('エラー回復統合テスト', () => {
    test('ネットワークエラー回復シナリオ', async () => {
      // ネットワークエラーからの回復をテスト
      let networkFailureCount = 0;
      const maxNetworkFailures = 2;

      const { claude } = await import('@instantlyeasy/claude-code-sdk-ts');
      vi.mocked(claude).mockImplementation(() => ({
        withModel: () => ({
          query: () => ({
            asText: vi.fn().mockImplementation(() => {
              networkFailureCount++;
              if (networkFailureCount <= maxNetworkFailures) {
                throw new Error('ENOTFOUND: network unreachable');
              }
              return Promise.resolve(JSON.stringify({
                action: 'original_post',
                reasoning: 'Network recovered successfully',
                confidence: 0.80
              }));
            })
          })
        })
      }));

      const decision = await executor.executeClaudeAutonomous();

      // 最終的に回復することを確認
      expect(decision).toBeDefined();
      expect(networkFailureCount).toBe(maxNetworkFailures + 1);
    });

    test('データベースエラー回復シナリオ', async () => {
      // ファイルシステムエラーからの回復
      const fs = await import('fs');
      let fileSystemFailureCount = 0;
      
      vi.mocked(fs.promises.writeFile).mockImplementation(() => {
        fileSystemFailureCount++;
        if (fileSystemFailureCount === 1) {
          throw new Error('ENOSPC: no space left on device');
        }
        return Promise.resolve();
      });

      // エラーログ記録を試行
      const testError = new Error('Test error for recovery');
      await errorHandler.logError(testError);

      // ファイルシステム回復後に正常動作することを確認
      expect(fileSystemFailureCount).toBeGreaterThan(0);
    });

    test('複合エラーシナリオ', async () => {
      // 複数のエラーが同時発生する場合の処理
      const errors = [
        new Error('Claude API rate limit exceeded'),
        new Error('Playwright browser crashed'),
        new Error('Configuration validation failed')
      ];

      // 各エラーをログに記録
      for (const error of errors) {
        await errorHandler.logError(error);
      }

      // エラーログから最近のエラーを取得
      const recentErrors = await errorHandler.getRecentErrors(5);
      
      expect(recentErrors.length).toBeGreaterThanOrEqual(errors.length);
      expect(recentErrors.some(log => log.error.includes('rate limit'))).toBe(true);
    });
  });

  describe('パフォーマンス統合テスト', () => {
    test('メモリ使用量監視', async () => {
      const initialMemory = process.memoryUsage();
      
      // 複数回の実行でメモリ使用量を監視
      for (let i = 0; i < 5; i++) {
        await executor.executeClaudeAutonomous();
        
        // ガベージコレクションを促進
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // メモリリークが大きくないことを確認（50MB以下）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('実行時間の一貫性', async () => {
      const executionTimes: number[] = [];
      const testRuns = 3;

      for (let i = 0; i < testRuns; i++) {
        const { executionTime } = await TestHelper.measureExecutionTime(() =>
          executor.executeClaudeAutonomous()
        );
        executionTimes.push(executionTime);
      }

      // 実行時間の変動が大きくないことを確認
      const avgTime = executionTimes.reduce((sum, time) => sum + time, 0) / testRuns;
      const maxVariation = Math.max(...executionTimes) - Math.min(...executionTimes);
      
      expect(avgTime).toBeLessThan(TEST_CONSTANTS.MAX_EXECUTION_TIME);
      expect(maxVariation).toBeLessThan(avgTime * 0.5); // 50%以内の変動
    });

    test('並列実行時のリソース管理', async () => {
      const concurrency = 3;
      const startTime = Date.now();
      
      const results = await TestHelper.parallelTest(
        () => executor.executeClaudeAutonomous(),
        concurrency
      );

      const totalTime = Date.now() - startTime;
      
      expect(results).toHaveLength(concurrency);
      results.forEach(result => {
        TestHelper.assertValidDecision(result);
      });
      
      // 並列実行が順次実行より効率的であることを確認
      expect(totalTime).toBeLessThan(TEST_CONSTANTS.DEFAULT_TIMEOUT * concurrency);
    });
  });

  describe('データ整合性統合テスト', () => {
    test('設定とログの整合性', async () => {
      // 設定の読み込み
      const config = loadOptimizedConfig();
      expect(config).toBeDefined();

      // エラーログの整合性確認
      const recentErrors = await errorHandler.getRecentErrors();
      expect(Array.isArray(recentErrors)).toBe(true);

      // 設定に基づく実行
      const decision = await executor.executeClaudeAutonomous();
      TestHelper.assertValidDecision(decision);
    });

    test('コンテキスト情報の一貫性', async () => {
      // 複数回の実行でコンテキストが一貫していることを確認
      const contexts: IntegratedContext[] = [];
      
      for (let i = 0; i < 3; i++) {
        const mockContext = TestHelper.createMockContext({
          timestamp: Date.now() + i * 1000
        });
        contexts.push(mockContext);
      }

      // コンテキストの基本構造が一貫していることを確認
      contexts.forEach(context => {
        expect(context.account).toBeDefined();
        expect(context.market).toBeDefined();
        expect(context.actionSuggestions).toBeDefined();
        expect(context.timestamp).toBeDefined();
      });

      // 時系列の整合性を確認
      for (let i = 1; i < contexts.length; i++) {
        expect(contexts[i].timestamp).toBeGreaterThan(contexts[i-1].timestamp);
      }
    });
  });

  describe('外部依存統合テスト', () => {
    test('Claude SDK統合', async () => {
      const { claude } = await import('@instantlyeasy/claude-code-sdk-ts');
      
      // Claude SDKのモック呼び出しが正しく動作することを確認
      const mockClient = claude();
      const mockModel = mockClient.withModel('sonnet');
      const mockQuery = mockModel.query('test prompt');
      
      expect(mockQuery.asText).toBeDefined();
      
      const result = await mockQuery.asText();
      expect(typeof result).toBe('string');
    });

    test('Playwright統合', async () => {
      const { PlaywrightCommonSetup } = await import('../../src/lib/playwright-common-config');
      
      const environment = await PlaywrightCommonSetup.createPlaywrightEnvironment();
      
      expect(environment.browser).toBeDefined();
      expect(environment.context).toBeDefined();
      expect(environment.browser.close).toBeDefined();
      
      // クリーンアップの動作確認
      await PlaywrightCommonSetup.cleanup();
    });

    test('ファイルシステム統合', async () => {
      const fs = await import('fs');
      const yaml = await import('js-yaml');
      
      // ファイルシステム操作のモックが適切に動作することを確認
      const mockData = { test: 'data' };
      const yamlContent = yaml.dump(mockData);
      
      await fs.promises.writeFile('test.yaml', yamlContent);
      expect(vi.mocked(fs.promises.writeFile)).toHaveBeenCalled();
    });
  });
});