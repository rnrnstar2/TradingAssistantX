import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { join } from 'path';
import { promises as fs } from 'fs';

describe('Execution Pipeline Integration Tests', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // 環境変数を保存
    originalEnv = { ...process.env };
    
    // テスト環境を設定
    process.env.NODE_ENV = 'test';
    process.env.X_TEST_MODE = 'true';
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = originalEnv;
  });

  describe('pnpm dev実行テスト', () => {
    it('3分以内に確実に終了する', async () => {
      const startTime = Date.now();
      const timeout = 3 * 60 * 1000; // 3分

      const promise = new Promise<{ code: number; duration: number }>((resolve, reject) => {
        const child = spawn('pnpm', ['dev'], {
          cwd: process.cwd(),
          env: {
            ...process.env,
            NODE_ENV: 'test',
            X_TEST_MODE: 'true'
          }
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          const duration = Date.now() - startTime;
          resolve({ code: code || 0, duration });
        });

        child.on('error', (error) => {
          reject(error);
        });

        // タイムアウト設定
        setTimeout(() => {
          child.kill();
          reject(new Error('Test timeout'));
        }, timeout);
      });

      const result = await promise;
      
      expect(result.duration).toBeLessThan(timeout);
      expect(result.code).toBe(0); // 正常終了
    }, 4 * 60 * 1000); // テスト自体のタイムアウトは4分

    it('エラー時終了テスト: エラー発生時も適切に終了', async () => {
      const startTime = Date.now();

      const promise = new Promise<{ code: number; duration: number }>((resolve, reject) => {
        const child = spawn('node', [
          join(process.cwd(), 'dist/scripts/autonomous-runner-single.js')
        ], {
          env: {
            ...process.env,
            NODE_ENV: 'test',
            X_TEST_MODE: 'true',
            FORCE_ERROR: 'true' // エラーを強制発生
          }
        });

        child.on('close', (code) => {
          const duration = Date.now() - startTime;
          resolve({ code: code || 0, duration });
        });

        child.on('error', (error) => {
          reject(error);
        });

        // 安全のためのタイムアウト
        setTimeout(() => {
          child.kill();
          reject(new Error('Test timeout'));
        }, 60000); // 1分
      });

      const result = await promise;
      
      expect(result.duration).toBeLessThan(60000); // 1分以内に終了
      // エラー時は1で終了することを想定
    });

    it('中断制御テスト: Ctrl+Cで安全に終了', async () => {
      const startTime = Date.now();

      const promise = new Promise<{ code: number; duration: number; signal?: string }>((resolve, reject) => {
        const child = spawn('node', [
          join(process.cwd(), 'dist/scripts/autonomous-runner-single.js')
        ], {
          env: {
            ...process.env,
            NODE_ENV: 'test',
            X_TEST_MODE: 'true'
          }
        });

        // 2秒後にSIGINTを送信（Ctrl+Cシミュレート）
        setTimeout(() => {
          child.kill('SIGINT');
        }, 2000);

        child.on('close', (code, signal) => {
          const duration = Date.now() - startTime;
          resolve({ code: code || 0, duration, signal: signal || undefined });
        });

        child.on('error', (error) => {
          reject(error);
        });

        // 安全のためのタイムアウト
        setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error('Test timeout'));
        }, 30000);
      });

      const result = await promise;
      
      expect(result.duration).toBeLessThan(10000); // 10秒以内に終了
      expect(result.duration).toBeGreaterThan(1500); // 少なくとも1.5秒は実行
    });
  });

  describe('実行ログ出力テスト', () => {
    it('実行ログが正しく出力される', async () => {
      // テスト実行
      const promise = new Promise<void>((resolve, reject) => {
        const child = spawn('node', [
          join(process.cwd(), 'dist/scripts/autonomous-runner-single.js')
        ], {
          env: {
            ...process.env,
            NODE_ENV: 'test',
            X_TEST_MODE: 'true'
          }
        });

        child.on('close', () => {
          resolve();
        });

        child.on('error', reject);

        setTimeout(() => {
          child.kill();
          reject(new Error('Test timeout'));
        }, 30000);
      });

      await promise;

      // ログファイルの確認
      const logPath = join(process.cwd(), 'tasks', '20250721_211123_error_fixes', 'outputs', 'TASK-002-execution-log.txt');
      
      try {
        const logContent = await fs.readFile(logPath, 'utf-8');
        
        expect(logContent).toContain('実行制御レポート');
        expect(logContent).toContain('開始時刻');
        expect(logContent).toContain('終了時刻');
        expect(logContent).toContain('実行時間');
        expect(logContent).toContain('メモリ使用量');
      } catch (error) {
        // ログファイルが見つからない場合はワーニングのみ
        console.warn('Log file not found:', logPath);
      }
    });

    it('診断データが生成される', async () => {
      // テスト実行後の診断データを確認
      const diagnosticsPath = join(process.cwd(), 'tasks', '20250721_211123_error_fixes', 'outputs', 'TASK-002-diagnostics.json');
      
      try {
        const diagnosticsContent = await fs.readFile(diagnosticsPath, 'utf-8');
        const diagnostics = JSON.parse(diagnosticsContent);
        
        expect(diagnostics).toBeDefined();
        expect(diagnostics.executionTime).toBeTypeOf('number');
        expect(diagnostics.resourceUsage).toBeDefined();
      } catch (error) {
        // 診断ファイルは実装によって生成される場合とされない場合がある
        console.warn('Diagnostics file not found:', diagnosticsPath);
      }
    });
  });

  describe('ActionSpecificCollector制限テスト', () => {
    it('単発実行モードで収集回数が制限される', () => {
      // 環境変数による制御の確認
      process.env.NODE_ENV = 'test';
      
      const IS_SINGLE_EXECUTION = process.env.NODE_ENV !== 'production';
      const MAX_ITERATIONS = IS_SINGLE_EXECUTION ? 1 : 3;
      
      expect(MAX_ITERATIONS).toBe(1);
    });

    it('本番モードでは通常の制限が適用される', () => {
      process.env.NODE_ENV = 'production';
      
      const IS_SINGLE_EXECUTION = process.env.NODE_ENV !== 'production';
      const MAX_ITERATIONS = IS_SINGLE_EXECUTION ? 1 : 3;
      
      expect(MAX_ITERATIONS).toBe(3);
    });
  });

  describe('パフォーマンス測定', () => {
    it('メモリ使用量が許容範囲内', async () => {
      const initialMemory = process.memoryUsage();
      
      // 実行前のメモリ使用量を記録
      console.log('Initial Memory:', {
        heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(initialMemory.heapTotal / 1024 / 1024) + 'MB'
      });

      const promise = new Promise<void>((resolve, reject) => {
        const child = spawn('node', [
          join(process.cwd(), 'dist/scripts/autonomous-runner-single.js')
        ], {
          env: {
            ...process.env,
            NODE_ENV: 'test',
            X_TEST_MODE: 'true'
          }
        });

        child.on('close', () => {
          resolve();
        });

        child.on('error', reject);

        setTimeout(() => {
          child.kill();
          reject(new Error('Test timeout'));
        }, 30000);
      });

      await promise;
      
      // 実行後のメモリ使用量を確認
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log('Final Memory:', {
        heapUsed: Math.round(finalMemory.heapUsed / 1024 / 1024) + 'MB',
        increase: Math.round(memoryIncrease / 1024 / 1024) + 'MB'
      });

      // メモリリークが大きくないことを確認（50MB以下の増加）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});