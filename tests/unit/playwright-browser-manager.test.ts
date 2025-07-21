import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlaywrightBrowserManager } from '../../src/lib/playwright-browser-manager';

describe('PlaywrightBrowserManager', () => {
  let browserManager: PlaywrightBrowserManager;
  
  beforeEach(() => {
    // シングルトンのためテスト前にインスタンスをクリア
    (PlaywrightBrowserManager as any).instance = undefined;
    browserManager = PlaywrightBrowserManager.getInstance();
  });

  afterEach(async () => {
    // テスト後のクリーンアップ
    await browserManager.cleanupAll();
    (PlaywrightBrowserManager as any).instance = undefined;
  });

  describe('シングルトンパターン', () => {
    it('同一インスタンスを返すこと', () => {
      const instance1 = PlaywrightBrowserManager.getInstance();
      const instance2 = PlaywrightBrowserManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('セッション管理', () => {
    it('新しいコンテキストを取得できること', async () => {
      const sessionId = 'test-session-1';
      
      const context = await browserManager.acquireContext(sessionId);
      
      expect(context).toBeDefined();
      
      const stats = browserManager.getSessionStats();
      expect(stats.activeSessions).toBe(1);
    });

    it('同じセッションIDで再利用できること', async () => {
      const sessionId = 'test-session-reuse';
      
      const context1 = await browserManager.acquireContext(sessionId);
      const context2 = await browserManager.acquireContext(sessionId);
      
      expect(context1).toBe(context2);
      
      const stats = browserManager.getSessionStats();
      expect(stats.activeSessions).toBe(1);
    });

    it('複数セッションを並列で取得できること', async () => {
      const sessionIds = ['session-1', 'session-2', 'session-3'];
      
      const contexts = await Promise.all(
        sessionIds.map(id => browserManager.acquireContext(id))
      );
      
      expect(contexts).toHaveLength(3);
      contexts.forEach(context => expect(context).toBeDefined());
      
      const stats = browserManager.getSessionStats();
      expect(stats.activeSessions).toBe(3);
    });

    it('セッション解放が正常に動作すること', async () => {
      const sessionId = 'test-session-release';
      
      await browserManager.acquireContext(sessionId);
      await browserManager.releaseContext(sessionId);
      
      const stats = browserManager.getSessionStats();
      // releaseContext は即座にcleanupしないため、セッション数は維持される
      expect(stats.totalSessions).toBe(1);
    });
  });

  describe('エラーハンドリング', () => {
    it('無効なセッションIDでエラーが発生しないこと', async () => {
      await expect(browserManager.releaseContext('non-existent-session')).resolves.not.toThrow();
    });

    it('並列実行でエラーが発生した場合でも他のセッションに影響しないこと', async () => {
      const sessionId1 = 'session-error-1';
      const sessionId2 = 'session-error-2';
      
      // 正常なセッション
      const context1 = await browserManager.acquireContext(sessionId1);
      expect(context1).toBeDefined();
      
      // エラーが発生する可能性があるセッション（モック）
      try {
        const context2 = await browserManager.acquireContext(sessionId2);
        expect(context2).toBeDefined();
      } catch (error) {
        // エラーが発生しても、既存のセッションには影響しない
      }
      
      const stats = browserManager.getSessionStats();
      expect(stats.activeSessions).toBeGreaterThanOrEqual(1);
    });
  });

  describe('リソース管理', () => {
    it('非アクティブセッションのクリーンアップが動作すること', async () => {
      const sessionId = 'test-cleanup-session';
      
      await browserManager.acquireContext(sessionId);
      await browserManager.releaseContext(sessionId);
      
      // 非アクティブセッションをクリーンアップ
      await browserManager.cleanupInactiveSessions();
      
      // クリーンアップ後の状態確認
      const stats = browserManager.getSessionStats();
      expect(stats.activeSessions).toBe(0);
    });

    it('全セッションの完全クリーンアップが動作すること', async () => {
      const sessionIds = ['cleanup-1', 'cleanup-2', 'cleanup-3'];
      
      // 複数セッション作成
      for (const sessionId of sessionIds) {
        await browserManager.acquireContext(sessionId);
      }
      
      // 完全クリーンアップ実行
      await browserManager.cleanupAll();
      
      const stats = browserManager.getSessionStats();
      expect(stats.totalSessions).toBe(0);
      expect(stats.activeSessions).toBe(0);
      expect(stats.totalBrowsers).toBe(0);
      expect(stats.activeBrowsers).toBe(0);
    });
  });

  describe('統計情報', () => {
    it('セッション統計が正確に返されること', async () => {
      const sessionId1 = 'stats-session-1';
      const sessionId2 = 'stats-session-2';
      
      await browserManager.acquireContext(sessionId1);
      await browserManager.acquireContext(sessionId2);
      
      const stats = browserManager.getSessionStats();
      
      expect(stats.totalSessions).toBe(2);
      expect(stats.activeSessions).toBe(2);
      expect(stats.totalBrowsers).toBeGreaterThanOrEqual(1);
      expect(stats.activeBrowsers).toBeGreaterThanOrEqual(1);
    });
  });

  describe('設定とカスタマイゼーション', () => {
    it('カスタム設定でインスタンスを作成できること', () => {
      (PlaywrightBrowserManager as any).instance = undefined;
      
      const customConfig = {
        maxBrowsers: 5,
        maxContextsPerBrowser: 10,
        timeout: 60000
      };
      
      const customManager = PlaywrightBrowserManager.getInstance(customConfig);
      expect(customManager).toBeDefined();
    });
  });
});