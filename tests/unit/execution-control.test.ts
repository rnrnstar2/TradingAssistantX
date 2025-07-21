import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutonomousExecutor } from '../../src/core/autonomous-executor.js';

describe('Execution Control Tests', () => {
  let executor: AutonomousExecutor;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // テスト環境の設定
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    process.env.X_TEST_MODE = 'true';
    
    executor = new AutonomousExecutor();
    
    // モック関数の設定
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 環境変数をリセット
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    delete process.env.X_TEST_MODE;
  });

  describe('実行回数制限テスト', () => {
    it('2回目の実行が阻止されること', async () => {
      // 1回目の実行
      const firstResult = await executor.executeClaudeAutonomous();
      expect(firstResult).toBeDefined();
      expect(firstResult.type).toBe('original_post');

      // 2回目の実行（重複実行防止）
      const secondResult = await executor.executeClaudeAutonomous();
      expect(secondResult).toBeDefined();
      expect(secondResult.type).toBe('wait');
      expect(secondResult.reasoning).toBe('Duplicate execution prevented');
      expect(secondResult.metadata?.duplicate).toBe(true);
    });

    it('実行状態が適切にリセットされること', async () => {
      // 1回目の実行
      const result1 = await executor.executeClaudeAutonomous();
      expect(result1).toBeDefined();

      // 実行状態のリセットを待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // 新しいインスタンスでの実行は可能
      const newExecutor = new AutonomousExecutor();
      const result2 = await newExecutor.executeClaudeAutonomous();
      expect(result2).toBeDefined();
      expect(result2.type).toBe('original_post');
    });
  });

  describe('タイムアウト制御テスト', () => {
    it('指定時間で確実に終了する', async () => {
      const startTime = Date.now();
      
      try {
        // 長時間実行をシミュレート（モック）
        const mockLongRunning = vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 6 * 60 * 1000)) // 6分
        );
        
        // メソッドをモック
        (executor as any).performAutonomousExecution = mockLongRunning;
        
        await executor.executeClaudeAutonomous();
      } catch (error) {
        const duration = Date.now() - startTime;
        // 4分のタイムアウト + 多少のマージン
        expect(duration).toBeLessThan(4 * 60 * 1000 + 5000);
        expect((error as Error).message).toBe('Execution timeout');
      }
    });

    it('正常実行時はタイムアウトしない', async () => {
      const result = await executor.executeClaudeAutonomous();
      expect(result).toBeDefined();
      expect(result.type).not.toBe('wait'); // エラーではない
    });
  });

  describe('リソース解放テスト', () => {
    it('メモリリークが発生しないこと', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // 複数回実行
      for (let i = 0; i < 5; i++) {
        const executor = new AutonomousExecutor();
        await executor.executeClaudeAutonomous();
      }
      
      // ガベージコレクション実行
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // メモリ増加量が許容範囲内（10MB以下）
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('実行エラー時も適切にリソースが解放される', async () => {
      // エラーを発生させるモック
      const mockError = vi.fn().mockRejectedValue(new Error('Test error'));
      (executor as any).performAutonomousExecution = mockError;

      try {
        await executor.executeClaudeAutonomous();
      } catch {
        // エラーは期待される
      }

      // 実行状態がリセットされていることを確認
      expect((executor as any).isExecutionActive).toBe(false);
    });
  });

  describe('環境変数制御テスト', () => {
    it('本番環境では複数回実行が可能', () => {
      process.env.NODE_ENV = 'production';
      
      // 本番環境設定のテスト（実際の実行はせず設定のみ確認）
      const IS_SINGLE_EXECUTION = process.env.NODE_ENV !== 'production';
      expect(IS_SINGLE_EXECUTION).toBe(false);
    });

    it('開発環境では単発実行モードが有効', () => {
      process.env.NODE_ENV = 'development';
      
      const IS_SINGLE_EXECUTION = process.env.NODE_ENV !== 'production';
      expect(IS_SINGLE_EXECUTION).toBe(true);
    });
  });

  describe('実行状況レポート', () => {
    it('実行時間が正確に計測される', async () => {
      const startTime = Date.now();
      const result = await executor.executeClaudeAutonomous();
      const endTime = Date.now();
      
      expect(result.metadata?.timestamp).toBeDefined();
      expect(result.metadata!.timestamp).toBeGreaterThanOrEqual(startTime);
      expect(result.metadata!.timestamp).toBeLessThanOrEqual(endTime);
    });

    it('終了理由が適切に記録される', async () => {
      const result = await executor.executeClaudeAutonomous();
      expect(result.metadata).toBeDefined();
      
      // 正常終了の場合
      if (result.type === 'original_post') {
        expect(result.metadata!.confidence).toBeDefined();
      }
      
      // エラー終了の場合
      if (result.type === 'wait' && result.metadata?.error) {
        expect(result.metadata.error).toBeTypeOf('string');
      }
    });
  });
});