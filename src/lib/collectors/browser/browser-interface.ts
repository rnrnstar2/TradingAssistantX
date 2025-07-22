/**
 * Browser Interface
 * PlaywrightBrowserManager と PlaywrightCommonSetup の循環依存解決用インターフェース
 */

import type { Browser, BrowserContext } from 'playwright';

/**
 * ブラウザマネージャーインターフェース
 */
export interface IBrowserManager {
  getInstance(config?: any): IBrowserManager;
  acquireContext(sessionId: string): Promise<BrowserContext>;
  releaseContext(sessionId: string): Promise<void>;
  getSessionStats(): SessionStats;
}

/**
 * セッション統計情報
 */
export interface SessionStats {
  activeSessions: number;
  totalSessions: number;
  maxSessions?: number;
}

/**
 * ブラウザ環境
 */
export interface PlaywrightEnvironment {
  browser: Browser;
  context: BrowserContext;
  config: any;
}

/**
 * ブラウザファクトリーインターフェース
 */
export interface IBrowserFactory {
  createBrowser(config?: any): Promise<Browser>;
  createContext(browser: Browser, config?: any): Promise<BrowserContext>;
  createPlaywrightEnvironment(config?: any): Promise<PlaywrightEnvironment>;
  cleanup(browser?: Browser, context?: BrowserContext, sessionId?: string): Promise<void>;
}

/**
 * ブラウザ設定インターフェース
 */
export interface IBrowserConfig {
  determineHeadlessMode(): boolean;
  logCurrentConfig(): void;
}

/**
 * 統合ブラウザサービスインターフェース
 */
export interface IBrowserService extends IBrowserFactory, IBrowserConfig {
  // 全ての機能を統合
}