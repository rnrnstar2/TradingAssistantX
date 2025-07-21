import { chromium, Browser, BrowserContext, LaunchOptions, BrowserContextOptions } from 'playwright';

export interface PlaywrightConfig {
  timeout: number;
  maxRetries: number;
  requestDelay: number;
  testMode: boolean;
}

export class PlaywrightCommonSetup {
  private static readonly DEFAULT_CONFIG: PlaywrightConfig = {
    timeout: 30000,
    maxRetries: 3,
    requestDelay: 2000,
    testMode: process.env.X_TEST_MODE === 'true'
  };

  private static readonly LAUNCH_OPTIONS: LaunchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  };

  private static readonly CONTEXT_OPTIONS: BrowserContextOptions = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'ja-JP'
  };

  /**
   * 標準的なブラウザインスタンスを作成
   */
  static async createBrowser(config?: Partial<PlaywrightConfig>): Promise<Browser> {
    const finalConfig = { ...PlaywrightCommonSetup.DEFAULT_CONFIG, ...config };
    
    console.log(`🌐 [Playwright初期化] ブラウザを起動中... (テストモード: ${finalConfig.testMode})`);
    
    const launchOptions = finalConfig.testMode 
      ? { ...PlaywrightCommonSetup.LAUNCH_OPTIONS, headless: false, slowMo: 1000 }
      : PlaywrightCommonSetup.LAUNCH_OPTIONS;

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

    // リクエスト間隔制御
    if (finalConfig.requestDelay > 0) {
      context.on('request', async () => {
        await new Promise(resolve => setTimeout(resolve, finalConfig.requestDelay));
      });
    }

    return context;
  }

  /**
   * 完全なPlaywright環境を作成
   */
  static async createPlaywrightEnvironment(config?: Partial<PlaywrightConfig>): Promise<{
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
   * リソースのクリーンアップ
   */
  static async cleanup(browser?: Browser, context?: BrowserContext): Promise<void> {
    try {
      if (context) {
        await context.close();
      }
      if (browser) {
        await browser.close();
      }
      console.log('🧹 [Playwright クリーンアップ] リソースを正常に解放');
    } catch (error) {
      console.warn('⚠️ [クリーンアップエラー]:', error);
    }
  }

  /**
   * エラーハンドリング付きのリトライ実行
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
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