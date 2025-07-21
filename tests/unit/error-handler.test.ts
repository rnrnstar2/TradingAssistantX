import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { BasicErrorHandler, errorHandler, handleError, withErrorHandling } from '../../src/utils/error-handler';
import { TestHelper, TEST_CONSTANTS } from '../../src/utils/test-helper';
import { promises as fs } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

// モック設定
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      access: vi.fn()
    }
  };
});

vi.mock('js-yaml');

describe('BasicErrorHandler', () => {
  let handler: BasicErrorHandler;
  const mockFs = vi.mocked(fs);
  const mockYaml = vi.mocked(yaml);

  beforeEach(() => {
    TestHelper.setupTestEnvironment();
    handler = new BasicErrorHandler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    TestHelper.cleanupTestEnvironment();
  });

  describe('Constructor', () => {
    test('正常にインスタンスが作成される', () => {
      expect(handler).toBeDefined();
      expect(handler).toBeInstanceOf(BasicErrorHandler);
    });
  });

  describe('logError', () => {
    test('正常なエラーログ記録', async () => {
      const testError = new Error('Test error message');
      const existingLogs = [
        {
          timestamp: '2024-01-01T00:00:00Z',
          error: 'Previous error',
          stack: 'Previous stack'
        }
      ];

      mockFs.readFile.mockResolvedValue(JSON.stringify(existingLogs));
      mockYaml.load.mockReturnValue(existingLogs);
      mockYaml.dump.mockReturnValue('updated yaml content');
      mockFs.writeFile.mockResolvedValue(undefined);

      await handler.logError(testError);

      expect(mockFs.readFile).toHaveBeenCalledWith(
        join(process.cwd(), 'data/context/error-log.yaml'),
        'utf-8'
      );
      expect(mockYaml.load).toHaveBeenCalledWith(JSON.stringify(existingLogs));
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    test('新規エラーログファイルの作成', async () => {
      const testError = new Error('First error');

      // ファイルが存在しない場合のモック
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: file not found'));
      mockYaml.dump.mockReturnValue('new yaml content');
      mockFs.writeFile.mockResolvedValue(undefined);

      await handler.logError(testError);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        join(process.cwd(), 'data/context/error-log.yaml'),
        'new yaml content'
      );
    });

    test('スタック情報付きエラーの記録', async () => {
      const testError = new Error('Error with stack');
      testError.stack = 'Error: Error with stack\n    at test (test.js:1:1)';

      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockYaml.dump.mockReturnValue('yaml content');
      mockFs.writeFile.mockResolvedValue(undefined);

      await handler.logError(testError);

      expect(mockYaml.dump).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            error: 'Error with stack',
            stack: 'Error: Error with stack\n    at test (test.js:1:1)'
          })
        ]),
        expect.any(Object)
      );
    });

    test('エラーログ記録失敗時のフォールバック', async () => {
      const testError = new Error('Original error');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // ファイル書き込みに失敗するモック
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      await handler.logError(testError);

      expect(consoleErrorSpy).toHaveBeenCalledWith('エラーログ記録失敗:', expect.any(Error));
      expect(consoleErrorSpy).toHaveBeenCalledWith('元のエラー:', testError);

      consoleErrorSpy.mockRestore();
    });

    test('空のファイル内容の処理', async () => {
      const testError = new Error('Test error');

      mockFs.readFile.mockResolvedValue('');
      mockYaml.dump.mockReturnValue('yaml content');
      mockFs.writeFile.mockResolvedValue(undefined);

      await handler.logError(testError);

      expect(mockYaml.dump).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            error: 'Test error'
          })
        ]),
        expect.any(Object)
      );
    });

    test('不正なYAMLファイルの処理', async () => {
      const testError = new Error('Test error');

      mockFs.readFile.mockResolvedValue('existing content');
      mockYaml.load.mockReturnValue(null); // 不正なYAML
      mockYaml.dump.mockReturnValue('yaml content');
      mockFs.writeFile.mockResolvedValue(undefined);

      await handler.logError(testError);

      // 不正なYAMLの場合は空配列からスタート
      expect(mockYaml.dump).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            error: 'Test error'
          })
        ]),
        expect.any(Object)
      );
    });
  });

  describe('getRecentErrors', () => {
    test('最近のエラーログの取得', async () => {
      const mockLogs = Array.from({ length: 15 }, (_, i) => ({
        timestamp: `2024-01-01T00:${i.toString().padStart(2, '0')}:00Z`,
        error: `Error ${i + 1}`,
        stack: `Stack ${i + 1}`
      }));

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockLogs));
      mockYaml.load.mockReturnValue(mockLogs);

      const recentErrors = await handler.getRecentErrors(10);

      expect(recentErrors).toHaveLength(10);
      expect(recentErrors[0]).toEqual(mockLogs[5]); // 最後の10件を取得
      expect(recentErrors[9]).toEqual(mockLogs[14]);
    });

    test('空のエラーログファイルの処理', async () => {
      mockFs.readFile.mockResolvedValue('');

      const recentErrors = await handler.getRecentErrors();

      expect(recentErrors).toEqual([]);
    });

    test('存在しないエラーログファイルの処理', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: file not found'));

      const recentErrors = await handler.getRecentErrors();

      expect(recentErrors).toEqual([]);
    });

    test('カスタム制限数での取得', async () => {
      const mockLogs = Array.from({ length: 20 }, (_, i) => ({
        timestamp: `2024-01-01T00:${i.toString().padStart(2, '0')}:00Z`,
        error: `Error ${i + 1}`
      }));

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockLogs));
      mockYaml.load.mkReturnValue(mockLogs);

      const recentErrors = await handler.getRecentErrors(5);

      expect(recentErrors).toHaveLength(5);
      expect(recentErrors[0]).toEqual(mockLogs[15]); // 最後の5件
    });

    test('制限数がログ数より大きい場合', async () => {
      const mockLogs = [
        { timestamp: '2024-01-01T00:00:00Z', error: 'Error 1' },
        { timestamp: '2024-01-01T00:01:00Z', error: 'Error 2' }
      ];

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockLogs));
      mockYaml.load.mockReturnValue(mockLogs);

      const recentErrors = await handler.getRecentErrors(10);

      expect(recentErrors).toHaveLength(2);
      expect(recentErrors).toEqual(mockLogs);
    });
  });

  describe('isCriticalError', () => {
    test('ディスク容量不足エラーの検出', () => {
      const diskError = new Error('ENOSPC: no space left on device');
      
      expect(handler.isCriticalError(diskError)).toBe(true);
    });

    test('ファイルハンドル不足エラーの検出', () => {
      const fileHandleError = new Error('EMFILE: too many open files');
      
      expect(handler.isCriticalError(fileHandleError)).toBe(true);
    });

    test('メモリ不足エラーの検出', () => {
      const memoryError = new Error('ENOMEM: not enough memory');
      
      expect(handler.isCriticalError(memoryError)).toBe(true);
    });

    test('モジュール不見エラーの検出', () => {
      const moduleError = new Error('MODULE_NOT_FOUND: Cannot resolve module');
      
      expect(handler.isCriticalError(moduleError)).toBe(true);
    });

    test('null参照エラーの検出', () => {
      const nullError = new Error('Cannot read properties of null');
      
      expect(handler.isCriticalError(nullError)).toBe(true);
    });

    test('スタック内のキーワード検出', () => {
      const error = new Error('Generic error');
      error.stack = 'Error: Generic error\n    at ENOSPC handler (file.js:1:1)';
      
      expect(handler.isCriticalError(error)).toBe(true);
    });

    test('非重要エラーの判定', () => {
      const normalError = new Error('Normal application error');
      
      expect(handler.isCriticalError(normalError)).toBe(false);
    });

    test('空のエラーメッセージの処理', () => {
      const emptyError = new Error('');
      
      expect(handler.isCriticalError(emptyError)).toBe(false);
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量エラーログ処理のパフォーマンス', async () => {
      const largeErrorLogs = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        error: `Performance test error ${i}`,
        stack: `Stack trace ${i}`.repeat(10)
      }));

      mockFs.readFile.mockResolvedValue(JSON.stringify(largeErrorLogs));
      mockYaml.load.mockReturnValue(largeErrorLogs);

      const { result, executionTime } = await TestHelper.measureExecutionTime(() =>
        handler.getRecentErrors(100)
      );

      expect(result).toHaveLength(100);
      expect(executionTime).toBeLessThan(1000); // 1秒以内で処理完了
    });

    test('並列エラーログ記録の安定性', async () => {
      const errors = Array.from({ length: 10 }, (_, i) => 
        new Error(`Parallel error ${i}`)
      );

      mockFs.readFile.mockResolvedValue('[]');
      mockYaml.load.mockReturnValue([]);
      mockYaml.dump.mockReturnValue('yaml content');
      mockFs.writeFile.mockResolvedValue(undefined);

      const promises = errors.map(error => handler.logError(error));

      await Promise.all(promises);

      expect(mockFs.writeFile).toHaveBeenCalledTimes(10);
    });
  });
});

describe('グローバルエラーハンドラー関数', () => {
  beforeEach(() => {
    TestHelper.setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    TestHelper.cleanupTestEnvironment();
  });

  describe('handleError', () => {
    test('エラーハンドラーインスタンスの使用', async () => {
      const testError = new Error('Test error');
      const logSpy = vi.spyOn(errorHandler, 'logError').mockResolvedValue();
      const criticalSpy = vi.spyOn(errorHandler, 'isCriticalError').mockReturnValue(false);

      await handleError(testError);

      expect(logSpy).toHaveBeenCalledWith(testError);
      expect(criticalSpy).toHaveBeenCalledWith(testError);
    });

    test('重要エラー検出時のコンソール出力', async () => {
      const criticalError = new Error('ENOSPC: no space left');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = vi.spyOn(errorHandler, 'logError').mockResolvedValue();
      const criticalSpy = vi.spyOn(errorHandler, 'isCriticalError').mockReturnValue(true);

      await handleError(criticalError);

      expect(logSpy).toHaveBeenCalledWith(criticalError);
      expect(criticalSpy).toHaveBeenCalledWith(criticalError);
      expect(consoleErrorSpy).toHaveBeenCalledWith('🚨 重要エラー検出:', 'ENOSPC: no space left');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('withErrorHandling', () => {
    test('正常関数実行時の値返却', async () => {
      const testFunction = vi.fn().mockResolvedValue('success result');
      const wrappedFunction = withErrorHandling(testFunction);

      const result = await wrappedFunction('arg1', 'arg2');

      expect(result).toBe('success result');
      expect(testFunction).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('エラー発生時のnull返却とログ記録', async () => {
      const testError = new Error('Function error');
      const testFunction = vi.fn().mockRejectedValue(testError);
      const wrappedFunction = withErrorHandling(testFunction);
      const handleErrorSpy = vi.spyOn(errorHandler, 'logError').mockResolvedValue();

      const result = await wrappedFunction('test arg');

      expect(result).toBeNull();
      expect(handleErrorSpy).toHaveBeenCalledWith(testError);
    });

    test('非Errorオブジェクトの処理', async () => {
      const testFunction = vi.fn().mockRejectedValue('string error');
      const wrappedFunction = withErrorHandling(testFunction);
      const handleErrorSpy = vi.spyOn(errorHandler, 'logError').mockResolvedValue();

      const result = await wrappedFunction();

      expect(result).toBeNull();
      expect(handleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(handleErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'string error' })
      );
    });

    test('複数引数関数の処理', async () => {
      const testFunction = vi.fn((a: number, b: string, c: boolean) => 
        Promise.resolve(`${a}-${b}-${c}`)
      );
      const wrappedFunction = withErrorHandling(testFunction);

      const result = await wrappedFunction(42, 'test', true);

      expect(result).toBe('42-test-true');
      expect(testFunction).toHaveBeenCalledWith(42, 'test', true);
    });

    test('引数なし関数の処理', async () => {
      const testFunction = vi.fn().mockResolvedValue('no args result');
      const wrappedFunction = withErrorHandling(testFunction);

      const result = await wrappedFunction();

      expect(result).toBe('no args result');
      expect(testFunction).toHaveBeenCalledWith();
    });
  });

  describe('統合テスト', () => {
    test('完全なエラーハンドリングフローの確認', async () => {
      const fs = await import('fs');
      const yaml = await import('js-yaml');
      const mockFs = vi.mocked(fs.promises);
      const mockYaml = vi.mocked(yaml);

      // ファイルシステムとYAMLのセットアップ
      mockFs.readFile.mockResolvedValue('[]');
      mockYaml.load.mockReturnValue([]);
      mockYaml.dump.mockReturnValue('yaml output');
      mockFs.writeFile.mockResolvedValue(undefined);

      // テスト関数の作成
      let callCount = 0;
      const unstableFunction = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('ENOSPC: disk full');
        }
        return Promise.resolve('success after retry');
      });

      const wrappedFunction = withErrorHandling(unstableFunction);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // 最初の実行（エラー発生）
      const result1 = await wrappedFunction();
      expect(result1).toBeNull();

      // 2回目の実行（成功）
      const result2 = await wrappedFunction();
      expect(result2).toBe('success after retry');

      // エラーログが記録されることを確認
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('🚨 重要エラー検出:', 'ENOSPC: disk full');

      consoleErrorSpy.mockRestore();
    });
  });
});