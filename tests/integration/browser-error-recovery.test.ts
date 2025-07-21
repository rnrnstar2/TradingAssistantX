import { describe, test, expect, beforeEach, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { TestHelper, MockFactory, TEST_CONSTANTS } from '../../src/utils/test-helper';
import { ActionSpecificCollector } from '../../src/lib/action-specific-collector';
import { PlaywrightBrowserManager } from '../../src/lib/playwright-browser-manager';
import { BasicErrorHandler, handleError } from '../../src/utils/error-handler';

// ブラウザ操作とエラー回復のための統合テスト
describe('Browser Operations & Error Recovery Integration Tests', () => {
  let collector: ActionSpecificCollector;
  let browserManager: PlaywrightBrowserManager;
  let errorHandler: BasicErrorHandler;

  beforeAll(() => {
    TestHelper.setupTestEnvironment();
  });

  beforeEach(() => {
    collector = new ActionSpecificCollector();
    browserManager = new PlaywrightBrowserManager();
    errorHandler = new BasicErrorHandler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    TestHelper.cleanupTestEnvironment();
  });

  afterAll(() => {
    // グローバルクリーンアップ
  });

  describe('ブラウザ操作統合テスト', () => {
    test('複数タブでの並列データ収集', async () => {
      // 複数のブラウザタブでの並列操作をシミュレート
      const mockEnvironment = TestHelper.mockPlaywrightEnvironment();
      
      vi.doMock('../../src/lib/playwright-common-config', () => ({
        PlaywrightCommonSetup: {
          createPlaywrightEnvironment: vi.fn().mockResolvedValue(mockEnvironment),
          cleanup: vi.fn()
        }
      }));

      const urls = [
        'https://finance.yahoo.com',
        'https://coindesk.com',
        'https://cointelegraph.com'
      ];

      // 各URLでのデータ収集をモック
      mockEnvironment.page.goto.mockImplementation((url: string) => {
        console.log(`Navigating to: ${url}`);
        return Promise.resolve();
      });

      mockEnvironment.page.$$eval.mockImplementation((selector: string) => {
        return Promise.resolve([
          { text: `Content from ${selector}`, time: '2024-01-01' },
          { text: `More content from ${selector}`, time: '2024-01-01' }
        ]);
      });

      const mockContext = TestHelper.createMockContext();
      const result = await collector.collectForAction('original_post', mockContext, 85);

      expect(result).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      expect(mockEnvironment.page.goto).toHaveBeenCalled();
    });

    test('ブラウザクラッシュからの回復', async () => {
      let crashCount = 0;
      const maxCrashes = 2;

      // ブラウザクラッシュをシミュレート
      const mockEnvironment = TestHelper.mockPlaywrightEnvironment();
      mockEnvironment.page.goto.mockImplementation(() => {
        crashCount++;
        if (crashCount <= maxCrashes) {
          throw new Error('Browser crashed: Connection closed');
        }
        return Promise.resolve();
      });

      vi.doMock('../../src/lib/playwright-common-config', () => ({
        PlaywrightCommonSetup: {
          createPlaywrightEnvironment: vi.fn().mockResolvedValue(mockEnvironment),
          cleanup: vi.fn()
        }
      }));

      const mockContext = TestHelper.createMockContext();
      const result = await collector.collectForAction('original_post', mockContext, 85);

      // ブラウザクラッシュ後も結果が返されることを確認
      expect(result).toBeDefined();
      expect(crashCount).toBe(maxCrashes + 1); // 回復まで試行
    });

    test('ネットワークタイムアウト処理', async () => {
      const mockEnvironment = TestHelper.mockPlaywrightEnvironment();
      
      // ネットワークタイムアウトをシミュレート
      mockEnvironment.page.goto.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Navigation timeout: 30000ms exceeded'));
          }, 100);
        });
      });

      vi.doMock('../../src/lib/playwright-common-config', () => ({
        PlaywrightCommonSetup: {
          createPlaywrightEnvironment: vi.fn().mockResolvedValue(mockEnvironment),
          cleanup: vi.fn()
        }
      }));

      const mockContext = TestHelper.createMockContext();
      
      // タイムアウトが発生してもシステムが継続することを確認
      const startTime = Date.now();
      const result = await collector.collectForAction('original_post', mockContext, 85);
      const executionTime = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(TEST_CONSTANTS.DEFAULT_TIMEOUT);
    });

    test('メモリ不足エラーからの回復', async () => {
      const mockEnvironment = TestHelper.mockPlaywrightEnvironment();
      let memoryErrorOccurred = false;

      mockEnvironment.browser.newContext.mockImplementation(() => {
        if (!memoryErrorOccurred) {
          memoryErrorOccurred = true;
          throw new Error('ENOMEM: Cannot allocate memory');
        }
        return Promise.resolve(mockEnvironment.context);
      });

      vi.doMock('../../src/lib/playwright-common-config', () => ({
        PlaywrightCommonSetup: {
          createPlaywrightEnvironment: vi.fn().mockResolvedValue(mockEnvironment),
          cleanup: vi.fn()
        }
      }));

      const mockContext = TestHelper.createMockContext();
      const result = await collector.collectForAction('original_post', mockContext, 85);

      expect(result).toBeDefined();
      expect(memoryErrorOccurred).toBe(true);
    });
  });

  describe('エラー回復シナリオ統合テスト', () => {
    test('段階的エラー回復フロー', async () => {
      const errorSequence = [
        new Error('Network connection refused'),
        new Error('Playwright browser disconnected'),
        new Error('Page evaluation failed'),
        null // 成功
      ];

      let errorIndex = 0;
      const mockEnvironment = TestHelper.mockPlaywrightEnvironment();
      
      mockEnvironment.page.$$eval.mockImplementation(() => {
        const currentError = errorSequence[errorIndex];
        errorIndex++;
        
        if (currentError) {
          throw currentError;
        }
        
        return Promise.resolve([
          { text: 'Recovered data', time: '2024-01-01' }
        ]);
      });

      vi.doMock('../../src/lib/playwright-common-config', () => ({
        PlaywrightCommonSetup: {
          createPlaywrightEnvironment: vi.fn().mockResolvedValue(mockEnvironment),
          cleanup: vi.fn()
        }
      }));

      const mockContext = TestHelper.createMockContext();
      const result = await collector.collectForAction('original_post', mockContext, 85);

      expect(result).toBeDefined();
      expect(errorIndex).toBe(errorSequence.length); // すべてのエラーを経て成功
    });

    test('重要エラーの検出と対処', async () => {
      const criticalErrors = [
        new Error('ENOSPC: no space left on device'),
        new Error('EMFILE: too many open files'),
        new Error('MODULE_NOT_FOUND: Cannot find module')
      ];

      const errorResults = [];
      for (const error of criticalErrors) {
        await handleError(error);
        const isCritical = errorHandler.isCriticalError(error);
        errorResults.push({ error: error.message, critical: isCritical });
      }

      // すべて重要エラーとして検出されることを確認
      errorResults.forEach(result => {
        expect(result.critical).toBe(true);
      });

      // エラーログが記録されることを確認
      const recentErrors = await errorHandler.getRecentErrors(5);
      expect(recentErrors.length).toBeGreaterThanOrEqual(criticalErrors.length);
    });

    test('エラーログの蓄積と分析', async () => {
      // 様々なタイプのエラーを生成
      const errorTypes = [
        'Network timeout',
        'Browser crashed',
        'Memory allocation failed',
        'File system error',
        'API rate limit exceeded'
      ];

      // エラーログを蓄積
      for (const errorType of errorTypes) {
        const error = new Error(errorType);
        await errorHandler.logError(error);
      }

      // 蓄積されたエラーログを分析
      const allErrors = await errorHandler.getRecentErrors(10);
      expect(allErrors.length).toBeGreaterThanOrEqual(errorTypes.length);

      // エラータイプの分布を確認
      const errorTypeDistribution = allErrors.reduce((acc, log) => {
        const errorType = log.error.split(':')[0] || log.error;
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(Object.keys(errorTypeDistribution).length).toBeGreaterThan(0);
    });

    test('カスケードエラーの防止', async () => {
      // カスケードエラー（連鎖的エラー）の防止テスト
      const mockEnvironment = TestHelper.mockPlaywrightEnvironment();
      let cascadeErrorCount = 0;

      mockEnvironment.page.goto.mockImplementation(() => {
        cascadeErrorCount++;
        if (cascadeErrorCount === 1) {
          throw new Error('Primary error: Connection failed');
        } else if (cascadeErrorCount === 2) {
          throw new Error('Secondary error: Retry failed');
        } else {
          // 3回目で成功
          return Promise.resolve();
        }
      });

      vi.doMock('../../src/lib/playwright-common-config', () => ({
        PlaywrightCommonSetup: {
          createPlaywrightEnvironment: vi.fn().mockResolvedValue(mockEnvironment),
          cleanup: vi.fn()
        }
      }));

      const mockContext = TestHelper.createMockContext();
      const result = await collector.collectForAction('original_post', mockContext, 85);

      // カスケードエラー後でも最終的に成功することを確認
      expect(result).toBeDefined();
      expect(cascadeErrorCount).toBe(3);
    });
  });

  describe('リソース管理統合テスト', () => {
    test('ブラウザリソースの適切な解放', async () => {
      const mockEnvironment = TestHelper.mockPlaywrightEnvironment();
      let pageCloseCount = 0;
      let browserCloseCount = 0;

      mockEnvironment.page.close.mockImplementation(() => {
        pageCloseCount++;
        return Promise.resolve();
      });

      mockEnvironment.browser.close.mockImplementation(() => {
        browserCloseCount++;
        return Promise.resolve();
      });

      vi.doMock('../../src/lib/playwright-common-config', () => ({
        PlaywrightCommonSetup: {
          createPlaywrightEnvironment: vi.fn().mockResolvedValue(mockEnvironment),
          cleanup: vi.fn().mockImplementation(() => {
            mockEnvironment.page.close();
            mockEnvironment.browser.close();
            return Promise.resolve();
          })
        }
      }));

      const mockContext = TestHelper.createMockContext();
      await collector.collectForAction('original_post', mockContext, 85);

      const { PlaywrightCommonSetup } = await import('../../src/lib/playwright-common-config');
      await PlaywrightCommonSetup.cleanup();

      // リソースが適切に解放されることを確認
      expect(pageCloseCount).toBeGreaterThan(0);
      expect(browserCloseCount).toBeGreaterThan(0);
    });

    test('並列実行時のリソース競合回避', async () => {
      const concurrentTasks = 3;
      const mockEnvironments = Array.from({ length: concurrentTasks }, () =>
        TestHelper.mockPlaywrightEnvironment()
      );

      let envIndex = 0;
      vi.doMock('../../src/lib/playwright-common-config', () => ({
        PlaywrightCommonSetup: {
          createPlaywrightEnvironment: vi.fn().mockImplementation(() => {
            const env = mockEnvironments[envIndex % mockEnvironments.length];
            envIndex++;
            return Promise.resolve(env);
          }),
          cleanup: vi.fn()
        }
      }));

      const mockContext = TestHelper.createMockContext();
      const promises = Array.from({ length: concurrentTasks }, () =>
        collector.collectForAction('original_post', mockContext, 85)
      );

      const results = await Promise.allSettled(promises);
      
      // 並列実行でリソース競合が発生しないことを確認
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
    });

    test('長時間実行時のメモリ管理', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 5;

      const mockContext = TestHelper.createMockContext();
      
      for (let i = 0; i < iterations; i++) {
        await collector.collectForAction('original_post', mockContext, 85);
        
        // 手動でガベージコレクションを試行
        if (global.gc) {
          global.gc();
        }
        
        // 少し待機してメモリを安定させる
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // メモリ増加が適切な範囲内であることを確認（100MB以下）
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('パフォーマンス最適化統合テスト', () => {
    test('データ収集効率の最適化', async () => {
      const mockEnvironment = TestHelper.mockPlaywrightEnvironment();
      let evaluationCount = 0;

      mockEnvironment.page.$$eval.mockImplementation(() => {
        evaluationCount++;
        return Promise.resolve([
          { text: `Optimized data ${evaluationCount}`, time: '2024-01-01' }
        ]);
      });

      vi.doMock('../../src/lib/playwright-common-config', () => ({
        PlaywrightCommonSetup: {
          createPlaywrightEnvironment: vi.fn().mockResolvedValue(mockEnvironment),
          cleanup: vi.fn()
        }
      }));

      const mockContext = TestHelper.createMockContext();
      const { result, executionTime } = await TestHelper.measureExecutionTime(() =>
        collector.collectForAction('original_post', mockContext, 85)
      );

      expect(result).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      TestHelper.assertValidExecutionTime(executionTime, 60000); // 60秒以内
      
      // 効率的なデータ収集が行われたことを確認
      expect(evaluationCount).toBeGreaterThan(0);
    });

    test('並列処理での効率性確認', async () => {
      const startTime = Date.now();
      const concurrentTasks = 3;
      
      const results = await TestHelper.parallelTest(
        async () => {
          const mockContext = TestHelper.createMockContext();
          return collector.collectForAction('original_post', mockContext, 85);
        },
        concurrentTasks
      );

      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(concurrentTasks);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.results).toBeDefined();
      });

      // 並列処理による効率性を確認
      expect(totalTime).toBeLessThan(TEST_CONSTANTS.DEFAULT_TIMEOUT);
    });

    test('キャッシュ機能の効果確認', async () => {
      // 同じデータに対する複数回のアクセスでキャッシュ効果を確認
      const mockContext = TestHelper.createMockContext();
      
      const firstCall = await TestHelper.measureExecutionTime(() =>
        collector.collectForAction('original_post', mockContext, 85)
      );

      const secondCall = await TestHelper.measureExecutionTime(() =>
        collector.collectForAction('original_post', mockContext, 85)
      );

      expect(firstCall.result).toBeDefined();
      expect(secondCall.result).toBeDefined();
      
      // 2回目の呼び出しがより効率的であることを期待
      // （実際のキャッシュ実装に依存）
      expect(secondCall.executionTime).toBeLessThanOrEqual(firstCall.executionTime * 1.2);
    });
  });
});