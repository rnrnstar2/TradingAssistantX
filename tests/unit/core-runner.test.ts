import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CoreRunner } from '../../src/scripts/core-runner.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * CoreRunner MVP基盤テスト
 * 
 * 指示書要求のテストケース：
 * - dev.ts正常実行テスト（CoreRunnerの基本フロー）
 * - 設定ファイル読み込みテスト
 * - エラーハンドリングテスト
 * - ログ出力テスト
 */

describe('CoreRunner MVP Tests', () => {
  let coreRunner: CoreRunner;
  let testOutputDir: string;

  beforeEach(async () => {
    testOutputDir = path.join(process.cwd(), 'tests', 'temp', `test-${Date.now()}`);
    await fs.mkdir(testOutputDir, { recursive: true });
    
    coreRunner = new CoreRunner({
      enableLogging: true,
      outputDir: testOutputDir
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // テスト終了後のクリーンアップエラーは無視
    }
  });

  describe('設定ファイル読み込みテスト', () => {
    it('必要なディレクトリが作成されること', async () => {
      // CoreRunnerの初期化時に設定読み込みをテスト
      const testDataDir = path.join(testOutputDir, 'data');
      
      // テスト用CoreRunnerを作成（内部でディレクトリ作成を行う）
      const testRunner = new CoreRunner({
        enableLogging: false,
        outputDir: testOutputDir
      });

      // validateExecution を実行してディレクトリ作成をテスト
      const validation = await testRunner.validateExecution();
      
      // ディレクトリが作成されているかチェック
      const configDir = path.join(process.cwd(), 'data', 'config');
      const currentDir = path.join(process.cwd(), 'data', 'current');
      
      // ディレクトリの存在確認
      await expect(fs.access(configDir)).resolves.toBeUndefined();
      await expect(fs.access(currentDir)).resolves.toBeUndefined();
      await expect(fs.access(testOutputDir)).resolves.toBeUndefined();
    });

    it('RSS Collector の可用性チェックが動作すること', async () => {
      const validation = await coreRunner.validateExecution();
      
      // validationが正しい形式を持っていることを確認
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('issues');
      expect(Array.isArray(validation.issues)).toBe(true);
    });
  });

  describe('エラーハンドリングテスト', () => {
    it('実行検証で環境変数不足エラーを検出すること', async () => {
      // 環境変数をクリア（テスト用）
      const originalEnvVars = {
        X_API_KEY: process.env.X_API_KEY,
        X_API_SECRET: process.env.X_API_SECRET,
        X_ACCESS_TOKEN: process.env.X_ACCESS_TOKEN,
        X_ACCESS_TOKEN_SECRET: process.env.X_ACCESS_TOKEN_SECRET
      };

      delete process.env.X_API_KEY;
      delete process.env.X_API_SECRET;
      delete process.env.X_ACCESS_TOKEN;
      delete process.env.X_ACCESS_TOKEN_SECRET;

      try {
        const validation = await coreRunner.validateExecution();
        
        // 環境変数不足でvalidationが失敗することを確認
        expect(validation.isValid).toBe(false);
        expect(validation.issues.length).toBeGreaterThan(0);
        expect(validation.issues.some(issue => issue.includes('環境変数'))).toBe(true);
      } finally {
        // 環境変数を復元
        if (originalEnvVars.X_API_KEY) process.env.X_API_KEY = originalEnvVars.X_API_KEY;
        if (originalEnvVars.X_API_SECRET) process.env.X_API_SECRET = originalEnvVars.X_API_SECRET;
        if (originalEnvVars.X_ACCESS_TOKEN) process.env.X_ACCESS_TOKEN = originalEnvVars.X_ACCESS_TOKEN;
        if (originalEnvVars.X_ACCESS_TOKEN_SECRET) process.env.X_ACCESS_TOKEN_SECRET = originalEnvVars.X_ACCESS_TOKEN_SECRET;
      }
    });

    it('ループ実行準備が基本構造のみ実装されていること', async () => {
      // ループ実行準備はエラーを投げずに完了すること
      await expect(coreRunner.prepareLoopExecution()).resolves.toBeUndefined();
    });
  });

  describe('ログ出力テスト', () => {
    it('成功ログが正しく出力されること', async () => {
      const mockResult = {
        success: true,
        timestamp: new Date().toISOString(),
        rssDataCount: 5,
        postResult: {
          success: true,
          postId: 'test-post-123',
          timestamp: new Date(),
          finalContent: 'テストコンテンツ'
        },
        executionTime: 1500
      };

      await coreRunner.logSuccess(mockResult);

      // ログファイルが作成されることを確認
      const files = await fs.readdir(testOutputDir);
      const successFiles = files.filter(file => file.startsWith('core-runner-success-'));
      expect(successFiles.length).toBeGreaterThan(0);
    });

    it('エラーハンドリング機能が動作すること', async () => {
      const testError = new Error('テストエラー');
      const mockResult = {
        success: false,
        timestamp: new Date().toISOString(),
        rssDataCount: 0,
        error: 'テストエラー',
        executionTime: 500
      };

      // エラーハンドリングメソッドを直接テスト
      await (coreRunner as any).handleError(testError, mockResult);

      // エラーログファイルが作成されることを確認
      const files = await fs.readdir(testOutputDir);
      const errorFiles = files.filter(file => file.startsWith('core-runner-error-'));
      expect(errorFiles.length).toBeGreaterThan(0);
    });
  });

  describe('基本フロー実行テスト（統合テスト的側面）', () => {
    it('基本フローが適切にエラーハンドリングされること', async () => {
      // 環境変数が不足している状態での基本フロー実行
      // （実際のAPI呼び出しを避けるため、エラーが予想される）
      const result = await coreRunner.runBasicFlow();
      
      // 結果オブジェクトが正しい形式を持っていることを確認
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('rssDataCount');
      expect(result).toHaveProperty('executionTime');
      expect(typeof result.executionTime).toBe('number');
    });

    it('実行結果記録機能が動作すること', async () => {
      const mockResult = {
        success: true,
        timestamp: new Date().toISOString(),
        rssDataCount: 3,
        executionTime: 1200
      };

      // recordExecution メソッドを直接テスト
      await (coreRunner as any).recordExecution(mockResult);

      // today-posts.yamlが作成されることを確認
      const todayPostsPath = path.join(process.cwd(), 'data', 'current', 'today-posts.yaml');
      await expect(fs.access(todayPostsPath)).resolves.toBeUndefined();
    });
  });

  describe('MVP制約事項テスト', () => {
    it('複雑なスケジュール機能が含まれていないこと', () => {
      // CoreRunnerクラスにスケジュール関連メソッドが存在しないことを確認
      const runner = new CoreRunner();
      
      expect(runner).not.toHaveProperty('scheduleExecution');
      expect(runner).not.toHaveProperty('setupInterval');
      expect(runner).not.toHaveProperty('cronJob');
    });

    it('高度な並列処理が含まれていないこと', () => {
      // 高度な並列処理メソッドが存在しないことを確認
      const runner = new CoreRunner();
      
      expect(runner).not.toHaveProperty('parallelExecution');
      expect(runner).not.toHaveProperty('workerPool');
      expect(runner).not.toHaveProperty('clusterManager');
    });

    it('統計分析機能が含まれていないこと', () => {
      // 統計分析メソッドが存在しないことを確認
      const runner = new CoreRunner();
      
      expect(runner).not.toHaveProperty('generateStatistics');
      expect(runner).not.toHaveProperty('analyzePerformance');
      expect(runner).not.toHaveProperty('calculateMetrics');
    });
  });
});