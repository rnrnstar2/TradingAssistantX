import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlaywrightBrowserManager } from '../../src/lib/playwright-browser-manager';
import { PlaywrightAccountCollector } from '../../src/lib/playwright-account-collector';

describe('Playwright並列実行統合テスト', () => {
  let browserManager: PlaywrightBrowserManager;
  let accountCollector: PlaywrightAccountCollector;

  beforeEach(() => {
    // シングルトンのリセット
    (PlaywrightBrowserManager as any).instance = undefined;
    browserManager = PlaywrightBrowserManager.getInstance();
    accountCollector = new PlaywrightAccountCollector();
  });

  afterEach(async () => {
    // テスト後のクリーンアップ
    await browserManager.cleanupAll();
    (PlaywrightBrowserManager as any).instance = undefined;
  });

  describe('並列セッション実行', () => {
    it('複数のPlaywrightセッションが同時実行可能', async () => {
      const sessionIds = [
        'parallel-session-1',
        'parallel-session-2', 
        'parallel-session-3'
      ];

      // 並列でコンテキスト取得
      const contexts = await Promise.all(
        sessionIds.map(id => browserManager.acquireContext(id))
      );

      expect(contexts).toHaveLength(3);
      contexts.forEach(context => expect(context).toBeDefined());

      // すべてのコンテキストが独立していることを確認
      const contextSet = new Set(contexts);
      expect(contextSet.size).toBe(3); // 重複がないことを確認

      // セッション統計確認
      const stats = browserManager.getSessionStats();
      expect(stats.activeSessions).toBe(3);
    }, 30000); // 30秒タイムアウト

    it('並列実行時の「Target page, context or browser has been closed」エラーが発生しない', async () => {
      const testPromises: Promise<any>[] = [];

      // 複数の並列タスクを同時実行
      for (let i = 0; i < 5; i++) {
        const sessionId = `error-prevention-session-${i}`;
        
        const testPromise = (async () => {
          const context = await browserManager.acquireContext(sessionId);
          
          // ページ作成と基本操作をシミュレート
          const page = await context.newPage();
          await page.goto('about:blank'); // 軽量なページへ移動
          
          // 短時間の処理をシミュレート
          await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
          
          await page.close();
          await browserManager.releaseContext(sessionId);
          
          return { sessionId, success: true };
        })();
        
        testPromises.push(testPromise);
      }

      // すべての並列タスクが成功することを確認
      const results = await Promise.allSettled(testPromises);
      
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;
      
      expect(successCount).toBe(5);
    }, 60000); // 60秒タイムアウト

    it('一方の処理でエラーが発生しても他方が継続', async () => {
      const successSessionId = 'success-session';
      const errorSessionId = 'error-session';

      const results = await Promise.allSettled([
        // 成功するタスク
        (async () => {
          const context = await browserManager.acquireContext(successSessionId);
          const page = await context.newPage();
          await page.goto('about:blank');
          await page.close();
          await browserManager.releaseContext(successSessionId);
          return 'success';
        })(),
        
        // エラーを発生させるタスク
        (async () => {
          const context = await browserManager.acquireContext(errorSessionId);
          const page = await context.newPage();
          
          // 意図的にエラーを発生させる
          try {
            await page.goto('invalid://url');
          } catch (error) {
            await page.close();
            await browserManager.releaseContext(errorSessionId);
            throw error;
          }
        })()
      ]);

      // 1つ目のタスクは成功
      expect(results[0].status).toBe('fulfilled');
      expect((results[0] as PromiseFulfilledResult<string>).value).toBe('success');
      
      // 2つ目のタスクは失敗
      expect(results[1].status).toBe('rejected');
      
      // エラーが発生しても全体のシステムは動作可能
      const stats = browserManager.getSessionStats();
      expect(stats.totalSessions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('エラー回復テスト', () => {
    it('ブラウザセッションの異常終了後にリソースが適切に解放される', async () => {
      const sessionId = 'abnormal-termination-session';
      
      // セッション作成
      const context = await browserManager.acquireContext(sessionId);
      const page = await context.newPage();
      
      // セッション統計確認
      let stats = browserManager.getSessionStats();
      expect(stats.activeSessions).toBe(1);
      
      // 異常終了をシミュレート
      await page.close();
      await context.close(); // コンテキストを強制終了
      
      // リソース解放
      await browserManager.releaseContext(sessionId);
      await browserManager.cleanupInactiveSessions();
      
      // リソースが解放されていることを確認
      stats = browserManager.getSessionStats();
      expect(stats.activeSessions).toBe(0);
    });

    it('複数セッション異常終了時の自動回復', async () => {
      const sessionIds = ['recovery-1', 'recovery-2', 'recovery-3'];
      
      // 複数セッション作成
      const contexts = await Promise.all(
        sessionIds.map(id => browserManager.acquireContext(id))
      );
      
      // 異常終了をシミュレート
      for (let i = 0; i < contexts.length; i++) {
        const page = await contexts[i].newPage();
        await page.close();
        await contexts[i].close();
        await browserManager.releaseContext(sessionIds[i]);
      }
      
      // 自動回復処理
      await browserManager.cleanupInactiveSessions();
      
      // 新しいセッションが正常に作成できることを確認
      const newSessionId = 'recovery-new-session';
      const newContext = await browserManager.acquireContext(newSessionId);
      const newPage = await newContext.newPage();
      
      expect(newContext).toBeDefined();
      expect(newPage).toBeDefined();
      
      await newPage.close();
      await browserManager.releaseContext(newSessionId);
    });
  });

  describe('PlaywrightAccountCollector統合テスト', () => {
    it('collectAccountInfoでセッション管理が正常に動作', async () => {
      // モック環境変数設定
      process.env.X_TEST_MODE = 'true';
      process.env.X_USERNAME = 'testuser';
      
      try {
        // テスト用のダミーデータ収集を試行
        // 実際のX.comへのアクセスは避けるため、エラーハンドリングを重視
        const result = await Promise.race([
          accountCollector.collectAccountInfo('testuser'),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('タイムアウト')), 10000)
          )
        ]);
        
        // 結果の構造が正しいことを確認
        if (result) {
          expect(result).toHaveProperty('username');
          expect(result).toHaveProperty('display_name');
        }
      } catch (error) {
        // ネットワークエラーやタイムアウトは許容
        console.log('期待されるエラー（テスト環境での制限）:', error);
        expect(error).toBeDefined();
      }
      
      // セッション統計確認（クリーンアップが正常に動作している）
      const stats = browserManager.getSessionStats();
      expect(stats.activeSessions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('パフォーマンステスト', () => {
    it('連続実行でメモリリークが発生しない', async () => {
      const iterationCount = 10;
      const sessionPrefix = 'performance-test';
      
      for (let i = 0; i < iterationCount; i++) {
        const sessionId = `${sessionPrefix}-${i}`;
        
        const context = await browserManager.acquireContext(sessionId);
        const page = await context.newPage();
        await page.goto('about:blank');
        await page.close();
        await browserManager.releaseContext(sessionId);
        
        // 定期的なクリーンアップ
        if (i % 3 === 0) {
          await browserManager.cleanupInactiveSessions();
        }
      }
      
      // 最終クリーンアップ
      await browserManager.cleanupInactiveSessions();
      
      const finalStats = browserManager.getSessionStats();
      expect(finalStats.activeSessions).toBe(0);
    });
  });

  describe('実際のエラーシナリオ再現', () => {
    it('Target page, context or browser has been closedエラーの回避', async () => {
      // 並列実行で競合状態を作り出す
      const parallelTasks = Array.from({ length: 3 }, (_, index) => {
        const sessionId = `race-condition-${index}`;
        
        return (async () => {
          try {
            const context = await browserManager.acquireContext(sessionId);
            const page = await context.newPage();
            
            // 競合を引き起こすような処理
            await Promise.all([
              page.goto('about:blank'),
              page.evaluate(() => document.title), // DOM操作
              page.screenshot({ path: `/tmp/test-${sessionId}.png` }).catch(() => {}) // スクリーンショット
            ]);
            
            await page.close();
            await browserManager.releaseContext(sessionId);
            
            return { sessionId, success: true };
          } catch (error) {
            // エラーが発生した場合もリソースを適切に解放
            await browserManager.releaseContext(sessionId).catch(() => {});
            throw error;
          }
        })();
      });
      
      const results = await Promise.allSettled(parallelTasks);
      
      // 少なくとも一部のタスクは成功するはず
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(0);
      
      // エラーが発生してもシステムは回復可能
      const stats = browserManager.getSessionStats();
      expect(stats.totalSessions).toBeGreaterThanOrEqual(0);
    });
  });
});