import { chromium, Browser, BrowserContext, LaunchOptions, BrowserContextOptions } from 'playwright';
import { PlaywrightBrowserManager } from './playwright-browser-manager.js';

export interface PlaywrightConfig {
  timeout: number;
  maxRetries: number;
  requestDelay: number;
  testMode: boolean;
  parallelLimit: number;
  retryLimit: number;
  earlyTermination: boolean;
  fallbackTimeout: number;
  timeouts: {
    navigation: number;
    element: number;
    action: number;
  };
}

// OptimizedBrowserPool - DISABLED
// This class has been disabled to resolve browser pool conflicts
// All browser management is now unified under PlaywrightBrowserManager
/*
class OptimizedBrowserPool {
  // DISABLED: Class functionality moved to PlaywrightBrowserManager
  // This prevents conflicts between multiple browser management systems
}
*/

export class PlaywrightCommonSetup {
  private static readonly DEFAULT_CONFIG: PlaywrightConfig = {
    timeout: 30000,
    maxRetries: 3,
    requestDelay: 2000,
    testMode: process.env.X_TEST_MODE === 'true',
    parallelLimit: 1,    // 同期実行による安定性確保
    retryLimit: 2,       // リトライ制限強化
    earlyTermination: true,  // 早期終了を有効
    fallbackTimeout: 30000,  // 30秒フォールバック
    timeouts: {
      navigation: 15000,  // 15秒
      element: 10000,     // 10秒
      action: 5000        // 5秒
    }
  };

  private static readonly LAUNCH_OPTIONS: LaunchOptions = {
    headless: true, // デフォルト値、実際の値は動的に決定される
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      // X対応の追加設定
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-field-trial-config',
      '--disable-back-forward-cache',
      '--disable-ipc-flooding-protection',
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--force-color-profile=srgb',
      '--metrics-recording-only',
      '--use-mock-keychain'
    ]
  };

  private static readonly CONTEXT_OPTIONS: BrowserContextOptions = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'ja-JP',
    // X対応のためのヘッダー設定
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    }
  };

  /**
   * ヘッドレスモードを動的に判定
   */
  static determineHeadlessMode(): boolean {
    // 1. 環境変数の直接指定をチェック
    const envHeadless = process.env.PLAYWRIGHT_HEADLESS;
    if (envHeadless === 'true') return true;
    if (envHeadless === 'false') return false;
    
    // 2. 自動判定（npm scriptまたはコマンドライン引数から）
    const npmScript = process.env.npm_lifecycle_event;
    const isDevMode = npmScript === 'dev' || npmScript === 'dev:watch';
    
    // 3. process.argvからの判定（フォールバック）
    const hasDevArg = process.argv.some(arg => 
      arg.includes('autonomous-runner-single') || 
      arg.includes('tsx watch')
    );
    
    // 4. 最終判定
    if (isDevMode || hasDevArg) {
      console.log('🎭 [ヘッドレスモード] DEV環境を検出 - ヘッドレスOFF');
      return false;
    }
    
    console.log('🎭 [ヘッドレスモード] PROD環境を検出 - ヘッドレスON');
    return true;
  }

  /**
   * 現在のPlaywright設定情報を出力（デバッグ用）
   */
  static logCurrentConfig(): void {
    const headless = PlaywrightCommonSetup.determineHeadlessMode();
    const npmScript = process.env.npm_lifecycle_event;
    const envHeadless = process.env.PLAYWRIGHT_HEADLESS;
    
    console.log('🔍 [Playwright設定情報]');
    console.log(`  ヘッドレスモード: ${headless ? 'ON' : 'OFF'}`);
    console.log(`  npmスクリプト: ${npmScript || 'N/A'}`);
    console.log(`  PLAYWRIGHT_HEADLESS: ${envHeadless || 'N/A'}`);
    console.log(`  X_TEST_MODE: ${process.env.X_TEST_MODE || 'N/A'}`);
  }

  /**
   * 標準的なブラウザインスタンスを作成
   */
  static async createBrowser(config?: Partial<PlaywrightConfig>): Promise<Browser> {
    const finalConfig = { ...PlaywrightCommonSetup.DEFAULT_CONFIG, ...config };
    
    // ヘッドレスモードを動的に判定
    const headlessMode = PlaywrightCommonSetup.determineHeadlessMode();
    
    console.log(`🌐 [Playwright初期化] ブラウザを起動中... (テストモード: ${finalConfig.testMode})`);
    console.log(`🎭 [ブラウザ起動] ヘッドレスモード: ${headlessMode ? 'ON' : 'OFF'} (環境: ${process.env.npm_lifecycle_event || 'unknown'})`);
    
    const launchOptions = {
      ...PlaywrightCommonSetup.LAUNCH_OPTIONS,
      headless: headlessMode,
      ...(headlessMode ? {} : { slowMo: 1000 }) // 非ヘッドレス時のみslowMo追加
    };

    return await chromium.launch(launchOptions);
  }

  /**
   * 標準的なブラウザコンテキストを作成
   */
  static async createContext(
    browser: Browser, 
    config?: Partial<PlaywrightConfig>
  ): Promise<BrowserContext> {
    const finalConfig = { ...PlaywrightCommonSetup.DEFAULT_CONFIG, ...config };
    
    const context = await browser.newContext(PlaywrightCommonSetup.CONTEXT_OPTIONS);

    // 詳細タイムアウト設定を適用
    context.setDefaultTimeout(finalConfig.timeouts.navigation);
    context.setDefaultNavigationTimeout(finalConfig.timeouts.navigation);

    // ボット検出回避のためのスクリプト実行
    await context.addInitScript(`() => {
      // webdriverプロパティの除去
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Chrome runtime の追加
      window.chrome = {
        runtime: {}
      };

      // permissionsプロパティの追加
      Object.defineProperty(navigator, 'permissions', {
        get: () => ({
          query: () => Promise.resolve({ state: 'granted' })
        })
      });

      // pluginsの設定
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });

      // languagesの設定
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ja-JP', 'ja', 'en-US', 'en']
      });
    }`);

    // リクエスト間隔制御
    if (finalConfig.requestDelay > 0) {
      context.on('request', async () => {
        await new Promise(resolve => setTimeout(resolve, finalConfig.requestDelay));
      });
    }

    console.log('🛡️ [ボット検出回避] ブラウザコンテキストにステルス機能を適用');
    return context;
  }

  /**
   * 完全なPlaywright環境を作成（PlaywrightBrowserManager統一管理）
   */
  static async createPlaywrightEnvironment(config?: Partial<PlaywrightConfig>): Promise<{
    browser: Browser;
    context: BrowserContext;
    config: PlaywrightConfig;
  }> {
    const finalConfig = { ...PlaywrightCommonSetup.DEFAULT_CONFIG, ...config };
    
    // PlaywrightBrowserManagerから統一取得（1セッション制限適用）
    const browserManager = PlaywrightBrowserManager.getInstance({
      maxBrowsers: 1,           // 1ブラウザに制限
      maxContextsPerBrowser: 1, // 1コンテキストに制限
      ...finalConfig
    });
    
    const sessionId = `common-setup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const context = await browserManager.acquireContext(sessionId);
    
    // browser参照取得（互換性のため）
    const browser = context.browser();
    if (!browser) {
      throw new Error('Browser reference could not be obtained from context');
    }

    return { browser, context, config: finalConfig };
  }

  /**
   * レガシー方式での環境作成（直接作成）
   */
  static async createPlaywrightEnvironmentDirect(config?: Partial<PlaywrightConfig>): Promise<{
    browser: Browser;
    context: BrowserContext;
    config: PlaywrightConfig;
  }> {
    const finalConfig = { ...PlaywrightCommonSetup.DEFAULT_CONFIG, ...config };
    
    const browser = await PlaywrightCommonSetup.createBrowser(finalConfig);
    const context = await PlaywrightCommonSetup.createContext(browser, finalConfig);

    return { browser, context, config: finalConfig };
  }

  /**
   * 共通のページ読み込み待機処理
   */
  static async waitForPageLoad(page: any, selectors: string[], timeout: number = 30000): Promise<void> {
    try {
      // 複数の待機条件を試行
      await Promise.race(
        selectors.map(selector => 
          page.waitForSelector(selector, { timeout })
        )
      );
      
      // 追加の読み込み待機
      await page.waitForTimeout(3000);
    } catch (error) {
      console.warn('⚠️ [ページ読み込み] 完全な読み込み待機に失敗、処理を継続:', error);
    }
  }

  /**
   * 複数セレクターでのテキスト取得（フォールバック付き）
   */
  static async tryMultipleSelectors(page: any, selectors: string[]): Promise<string | null> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch (error) {
        // 次のセレクターを試行
        continue;
      }
    }
    return null;
  }

  /**
   * 数値テキストのパース（K, M, B, 万 対応）
   */
  static parseNumber(text: string): number {
    if (!text) return 0;
    
    // カンマを除去
    let cleanText = text.replace(/,/g, '');
    
    // K, M, B サフィックスを処理
    const multipliers: Record<string, number> = {
      'K': 1000,
      'M': 1000000,
      'B': 1000000000,
      '万': 10000,
      '千': 1000
    };

    for (const [suffix, multiplier] of Object.entries(multipliers)) {
      if (cleanText.toUpperCase().includes(suffix)) {
        const number = parseFloat(cleanText.replace(new RegExp(suffix, 'i'), ''));
        return Math.floor(number * multiplier);
      }
    }

    return parseInt(cleanText) || 0;
  }

  /**
   * リソースのクリーンアップ（PlaywrightBrowserManager統一管理）
   */
  static async cleanup(browser?: Browser, context?: BrowserContext, sessionId?: string): Promise<void> {
    try {
      if (context && sessionId) {
        try {
          // コンテキストが既に閉じられていないかチェック
          await context.pages(); // これが例外を投げる場合、コンテキストは既に閉じられている
          
          // PlaywrightBrowserManagerを使用してセッションを解放
          const browserManager = PlaywrightBrowserManager.getInstance();
          await browserManager.releaseContext(sessionId);
          console.log(`🧹 [統一クリーンアップ] セッション解放: ${sessionId}`);
        } catch (contextError) {
          // コンテキストが既に閉じられている場合は無視
          console.log('🔄 [クリーンアップ] コンテキストは既に閉じられています');
        }
      } else if (context) {
        // sessionIdがない場合は直接クリーンアップ（互換性のため）
        console.log('⚠️ [クリーンアップ] sessionIDがないため直接クリーンアップを実行');
        await this.cleanupDirect(browser, context);
        return;
      }
      
      // 統計情報を表示
      const browserManager = PlaywrightBrowserManager.getInstance();
      const stats = browserManager.getSessionStats();
      console.log(`🧹 [Playwright クリーンアップ] リソースを正常に解放 (アクティブセッション: ${stats.activeSessions}/${stats.totalSessions})`);
    } catch (error) {
      console.warn('⚠️ [クリーンアップエラー]:', error);
    }
  }

  /**
   * レガシークリーンアップ（プール管理を使用しない場合）
   */
  static async cleanupDirect(browser?: Browser, context?: BrowserContext): Promise<void> {
    try {
      if (context) {
        try {
          await context.pages();
          await context.close();
        } catch (contextError) {
          console.log('🔄 [直接クリーンアップ] コンテキストは既に閉じられています');
        }
      }
      
      if (browser && browser.isConnected()) {
        try {
          await browser.close();
        } catch (browserError) {
          console.log('🔄 [直接クリーンアップ] ブラウザは既に閉じられています');
        }
      }
      console.log('🧹 [Playwright 直接クリーンアップ] リソースを正常に解放');
    } catch (error) {
      console.warn('⚠️ [直接クリーンアップエラー]:', error);
    }
  }

  /**
   * エラーハンドリング付きのリトライ実行
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = PlaywrightCommonSetup.DEFAULT_CONFIG.retryLimit,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [${operationName}] 試行 ${attempt}/${maxRetries}`);
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ [${operationName}] 試行 ${attempt} で成功`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ [${operationName}] 試行 ${attempt} が失敗:`, error);
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff
          console.log(`⏳ [${operationName}] ${delay}ms 待機してリトライ...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`❌ [${operationName}] 全ての試行が失敗`);
    throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
  }
}

// OptimizedBrowserPool export removed - functionality moved to PlaywrightBrowserManager