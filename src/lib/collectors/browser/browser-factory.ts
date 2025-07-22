/**
 * Browser Factory
 * PlaywrightCommonSetup から循環依存を解決するためのファクトリー実装
 */

import { chromium, Browser, BrowserContext, LaunchOptions, BrowserContextOptions } from 'playwright';
import type { 
  IBrowserFactory, 
  IBrowserConfig, 
  IBrowserService, 
  PlaywrightEnvironment 
} from './browser-interface.js';

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

/**
 * ブラウザファクトリー実装
 * 循環依存を回避するため、PlaywrightBrowserManagerとは独立して動作
 */
export class BrowserFactory implements IBrowserService {
  private static readonly DEFAULT_CONFIG: PlaywrightConfig = {
    timeout: 30000,
    maxRetries: 3,
    requestDelay: 2000,
    testMode: process.env.X_TEST_MODE === 'true',
    parallelLimit: 1,
    retryLimit: 2,
    earlyTermination: true,
    fallbackTimeout: 30000,
    timeouts: {
      navigation: 15000,
      element: 10000,
      action: 5000
    }
  };

  private static readonly LAUNCH_OPTIONS: LaunchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images',
      '--disable-javascript',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-web-security',
      '--disable-features=TranslateUI'
    ]
  };

  private static readonly CONTEXT_OPTIONS: BrowserContextOptions = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'ja-JP',
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
   * ヘッドレスモード判定
   */
  determineHeadlessMode(): boolean {
    const envHeadless = process.env.PLAYWRIGHT_HEADLESS;
    if (envHeadless === 'true') return true;
    if (envHeadless === 'false') return false;
    
    const npmScript = process.env.npm_lifecycle_event;
    const isDevMode = npmScript === 'dev' || npmScript === 'dev:watch';
    
    const hasDevArg = process.argv.some(arg => 
      arg.includes('autonomous-runner-single') || 
      arg.includes('tsx watch')
    );
    
    if (isDevMode || hasDevArg) {
      console.log('🎭 [ヘッドレスモード] DEV環境を検出 - ヘッドレスOFF');
      return false;
    }
    
    console.log('🎭 [ヘッドレスモード] PROD環境を検出 - ヘッドレスON');
    return true;
  }

  /**
   * 設定情報出力
   */
  logCurrentConfig(): void {
    const headless = this.determineHeadlessMode();
    const npmScript = process.env.npm_lifecycle_event;
    const envHeadless = process.env.PLAYWRIGHT_HEADLESS;
    
    console.log('🔍 [Playwright設定情報]');
    console.log(`  ヘッドレスモード: ${headless ? 'ON' : 'OFF'}`);
    console.log(`  npmスクリプト: ${npmScript || 'N/A'}`);
    console.log(`  PLAYWRIGHT_HEADLESS: ${envHeadless || 'N/A'}`);
    console.log(`  X_TEST_MODE: ${process.env.X_TEST_MODE || 'N/A'}`);
  }

  /**
   * ブラウザ作成
   */
  async createBrowser(config?: Partial<PlaywrightConfig>): Promise<Browser> {
    const finalConfig = { ...BrowserFactory.DEFAULT_CONFIG, ...config };
    const headlessMode = this.determineHeadlessMode();
    
    console.log(`🌐 [BrowserFactory] ブラウザを起動中... (テストモード: ${finalConfig.testMode})`);
    console.log(`🎭 [ブラウザ起動] ヘッドレスモード: ${headlessMode ? 'ON' : 'OFF'}`);
    
    const launchOptions = {
      ...BrowserFactory.LAUNCH_OPTIONS,
      headless: headlessMode,
      ...(headlessMode ? {} : { slowMo: 1000 })
    };

    return await chromium.launch(launchOptions);
  }

  /**
   * コンテキスト作成
   */
  async createContext(
    browser: Browser, 
    config?: Partial<PlaywrightConfig>
  ): Promise<BrowserContext> {
    const finalConfig = { ...BrowserFactory.DEFAULT_CONFIG, ...config };
    const context = await browser.newContext(BrowserFactory.CONTEXT_OPTIONS);

    context.setDefaultTimeout(finalConfig.timeouts.navigation);
    
    // ステルス機能適用
    await this.applyStealthFeatures(context);
    
    console.log('✅ [BrowserFactory] ブラウザコンテキスト作成完了');
    return context;
  }

  /**
   * 完全なPlaywright環境作成（独立実装）
   */
  async createPlaywrightEnvironment(config?: Partial<PlaywrightConfig>): Promise<PlaywrightEnvironment> {
    const finalConfig = { ...BrowserFactory.DEFAULT_CONFIG, ...config };
    
    console.log('🏗️ [BrowserFactory] 独立Playwright環境を作成中...');
    
    const browser = await this.createBrowser(finalConfig);
    const context = await this.createContext(browser, finalConfig);
    
    return {
      browser,
      context,
      config: finalConfig
    };
  }

  /**
   * クリーンアップ（独立実装）
   */
  async cleanup(browser?: Browser, context?: BrowserContext, sessionId?: string): Promise<void> {
    try {
      if (context) {
        try {
          await context.pages();
          await context.close();
          console.log(`🧹 [BrowserFactory] コンテキスト解放完了${sessionId ? `: ${sessionId}` : ''}`);
        } catch (contextError) {
          console.log('🔄 [BrowserFactory] コンテキストは既に閉じられています');
        }
      }
      
      if (browser) {
        try {
          await browser.close();
          console.log('🧹 [BrowserFactory] ブラウザ解放完了');
        } catch (browserError) {
          console.log('🔄 [BrowserFactory] ブラウザは既に閉じられています');
        }
      }
      
      console.log('✅ [BrowserFactory] リソース解放完了');
    } catch (error) {
      console.warn('⚠️ [BrowserFactory] クリーンアップエラー:', error);
    }
  }

  /**
   * ステルス機能適用
   */
  private async applyStealthFeatures(context: BrowserContext): Promise<void> {
    // ボット検出回避機能
    await context.addInitScript(() => {
      // webdriver プロパティを隠す
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Chrome runtime を偽装
      (window as any).chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };

      // Plugin 配列を偽装
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // Language を偽装
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ja-JP', 'ja', 'en-US', 'en'],
      });
    });
    
    console.log('🛡️ [BrowserFactory] ステルス機能適用完了');
  }
}