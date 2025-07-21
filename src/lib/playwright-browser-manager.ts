import { chromium, Browser, BrowserContext, LaunchOptions, BrowserContextOptions } from 'playwright';
import { EventEmitter } from 'events';

export interface PlaywrightManagerConfig {
  timeout: number;
  maxRetries: number;
  requestDelay: number;
  testMode: boolean;
  maxBrowsers: number;
  maxContextsPerBrowser: number;
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

export interface BrowserSession {
  sessionId: string;
  browser: Browser;
  context: BrowserContext;
  createdAt: number;
  lastUsed: number;
  isActive: boolean;
}

/**
 * シングルトンパターンによるPlaywrightブラウザリソース管理
 * 並列実行時のブラウザセッション競合を回避
 */
export class PlaywrightBrowserManager {
  private static instance: PlaywrightBrowserManager;
  private browserPool: Browser[] = [];
  private activeSessions: Map<string, BrowserSession> = new Map();
  private config: PlaywrightManagerConfig;
  private sessionEventEmitter: EventEmitter;
  private sessionWaitingQueue: Array<{ resolve: () => void; reject: (error: Error) => void; timestamp: number }> = [];
  private sessionValidationCache: Map<string, { isValid: boolean; timestamp: number }> = new Map();
  
  private static readonly DEFAULT_CONFIG: PlaywrightManagerConfig = {
    timeout: 30000,
    maxRetries: 3,
    requestDelay: 2000,
    testMode: process.env.X_TEST_MODE === 'true',
    maxBrowsers: 1,      // 1ブラウザに制限
    maxContextsPerBrowser: 1,  // 1コンテキストに制限
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
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  };

  private static readonly CONTEXT_OPTIONS: BrowserContextOptions = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'ja-JP'
  };

  private constructor(config?: Partial<PlaywrightManagerConfig>) {
    this.config = { ...PlaywrightBrowserManager.DEFAULT_CONFIG, ...config };
    this.sessionEventEmitter = new EventEmitter();
    this.sessionEventEmitter.setMaxListeners(50); // 多数の同時リクエストをサポート
    if (!PlaywrightBrowserManager.isProductionEnvironment()) {
      console.log('🎭 [PlaywrightBrowserManager] EventEmitterベースのシングルトンインスタンスを初期化');
    }
  }

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(config?: Partial<PlaywrightManagerConfig>): PlaywrightBrowserManager {
    if (!PlaywrightBrowserManager.instance) {
      PlaywrightBrowserManager.instance = new PlaywrightBrowserManager(config);
    }
    return PlaywrightBrowserManager.instance;
  }

  /**
   * 並列実行用のブラウザコンテキスト取得
   * セッションIDに基づく独立したブラウザコンテキストを提供
   */
  async acquireContext(sessionId: string): Promise<BrowserContext> {
    console.log(`🔍 [セッション取得] セッションID: ${sessionId}`);
    
    try {
      // 既存セッションがある場合は再利用
      const existingSession = this.activeSessions.get(sessionId);
      if (existingSession && existingSession.isActive) {
        await this.validateSession(existingSession);
        existingSession.lastUsed = Date.now();
        if (!PlaywrightBrowserManager.isProductionEnvironment()) {
          console.log(`♻️ [セッション再利用] ${sessionId}`);
        }
        return existingSession.context;
      }

      // アクティブセッション数チェック強化（parallelLimit制限）
      const activeSessions = Array.from(this.activeSessions.values())
        .filter(s => s.isActive).length;
      
      if (activeSessions >= this.config.parallelLimit) {
        console.log(`⚠️ [セッション制限] 最大${this.config.parallelLimit}セッション到達、待機中... (現在: ${activeSessions})`);
        await this.waitForAvailableSession();
      }

      // 新しいセッションを作成
      const browser = await this.getOrCreateBrowser();
      const context = await this.createContext(browser);
      
      const session: BrowserSession = {
        sessionId,
        browser,
        context,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        isActive: true
      };

      this.activeSessions.set(sessionId, session);
      
      const newActiveCount = Array.from(this.activeSessions.values()).filter(s => s.isActive).length;
      if (!PlaywrightBrowserManager.isProductionEnvironment()) {
        console.log(`✅ [新セッション作成] ${sessionId} - アクティブセッション数: ${newActiveCount}/${this.config.parallelLimit}`);
      }
      return context;
      
    } catch (error) {
      console.error(`❌ [セッション取得エラー] ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * セッション解放（即座にcleanupしない）
   */
  async releaseContext(sessionId: string): Promise<void> {
    console.log(`🔄 [セッション解放] ${sessionId}`);
    
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.lastUsed = Date.now();
      
      // 即座にクリーンアップせず、後で一括処理
      if (!PlaywrightBrowserManager.isProductionEnvironment()) {
        const activeCount = Array.from(this.activeSessions.values()).filter(s => s.isActive).length;
        console.log(`📋 [セッション非アクティブ化] ${sessionId} - アクティブセッション: ${activeCount}/${this.config.parallelLimit}`);
      }
    }
  }

  /**
   * 使用可能なセッションが出るまで待機
   */
  private async waitForAvailableSession(maxWaitMs: number = this.config.fallbackTimeout): Promise<void> {
    const startTime = Date.now();
    console.log('⏳ [イベントベース待機] セッション解放を待機中...');
    
    return new Promise<void>((resolve, reject) => {
      // キューに追加
      this.sessionWaitingQueue.push({ resolve, reject, timestamp: startTime });
      
      // タイムアウト設定
      const timeoutId = setTimeout(() => {
        const index = this.sessionWaitingQueue.findIndex(
          req => req.resolve === resolve && req.reject === reject
        );
        if (index !== -1) {
          this.sessionWaitingQueue.splice(index, 1);
          reject(new Error(`セッション待機タイムアウト: ${maxWaitMs}ms経過後もセッションが利用できません`));
        }
      }, maxWaitMs);
      
      // resolve時にタイムアウトをクリア
      const originalResolve = resolve;
      const wrappedResolve = () => {
        clearTimeout(timeoutId);
        originalResolve();
      };
      
      // キューのアイテムを更新
      const queueItem = this.sessionWaitingQueue[this.sessionWaitingQueue.length - 1];
      if (queueItem) {
        queueItem.resolve = wrappedResolve;
      }
      
      // 即座にセッションが利用可能かチェック
      this.processWaitingQueue();
    });
  }
  
  /**
   * 待機キューの処理（キューイング機能）
   */
  private processWaitingQueue(): void {
    const activeSessions = Array.from(this.activeSessions.values()).filter(s => s.isActive).length;
    
    while (this.sessionWaitingQueue.length > 0 && activeSessions < this.config.parallelLimit) {
      const waitingRequest = this.sessionWaitingQueue.shift();
      if (waitingRequest) {
        console.log('✅ [キュー処理] 待機中のリクエストを解決');
        waitingRequest.resolve();
        break; // 1つずつ処理
      }
    }
    
    if (this.sessionWaitingQueue.length > 0) {
      console.log(`📊 [キュー状態] 待機中: ${this.sessionWaitingQueue.length}件, アクティブ: ${activeSessions}/${this.config.parallelLimit}`);
    }
  }

  /**
   * 効率化されたセッション検証（キャッシュ付き）
   */
  private async validateSession(session: BrowserSession): Promise<void> {
    const cacheKey = session.sessionId;
    const now = Date.now();
    const cacheValidityDuration = 30000; // 30秒間有効
    
    // キャッシュされた検証結果をチェック
    const cached = this.sessionValidationCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < cacheValidityDuration) {
      if (!cached.isValid) {
        throw new Error('キャッシュされた検証結果: セッション無効');
      }
      if (!PlaywrightBrowserManager.isProductionEnvironment()) {
        console.log(`💰 [キャッシュヒット] セッション検証: ${cacheKey}`);
      }
      return;
    }
    
    try {
      // 軽量な基本検証
      if (!session.browser.isConnected()) {
        this.cacheValidationResult(cacheKey, false, now);
        throw new Error('ブラウザが切断されています');
      }
      
      // コンテキストの軽量な状態チェック
      const pages = await Promise.race([
        session.context.pages(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('コンテキスト検証タイムアウト')), 5000)
        )
      ]) as any[];
      
      // 基本的なコンテキスト状態を確認
      if (!Array.isArray(pages)) {
        this.cacheValidationResult(cacheKey, false, now);
        throw new Error('コンテキストが無効な状態です');
      }
      
      // 検証成功をキャッシュ
      this.cacheValidationResult(cacheKey, true, now);
      
      if (!PlaywrightBrowserManager.isProductionEnvironment()) {
        console.log(`✅ [セッション検証成功] ${session.sessionId} - ページ数: ${pages.length}`);
      }
      
    } catch (error) {
      console.warn(`⚠️ [セッション検証失敗] ${session.sessionId}:`, error);
      
      // 失敗をキャッシュ
      this.cacheValidationResult(cacheKey, false, now);
      session.isActive = false;
      
      // 失敗したセッションを即座クリーンアップ
      try {
        await session.context.close();
      } catch (cleanupError) {
        console.warn(`⚠️ [クリーンアップ警告] ${session.sessionId}:`, cleanupError);
      }
      
      throw error;
    }
  }
  
  /**
   * 検証結果のキャッシュ
   */
  private cacheValidationResult(sessionId: string, isValid: boolean, timestamp: number): void {
    this.sessionValidationCache.set(sessionId, { isValid, timestamp });
    
    // キャッシュサイズを制限（50件まで）
    if (this.sessionValidationCache.size > 50) {
      const oldestKey = this.sessionValidationCache.keys().next().value;
      if (oldestKey) {
        this.sessionValidationCache.delete(oldestKey);
      }
    }
  }
  
  /**
   * キャッシュクリーンアップ（期限切れエントリを削除）
   */
  private cleanupValidationCache(): void {
    const now = Date.now();
    const cacheValidityDuration = 30000; // 30秒
    
    for (const [key, cached] of this.sessionValidationCache.entries()) {
      if (now - cached.timestamp > cacheValidityDuration) {
        this.sessionValidationCache.delete(key);
      }
    }
  }

  /**
   * 利用可能なブラウザを取得または新規作成
   */
  private async getOrCreateBrowser(): Promise<Browser> {
    // 既存のブラウザで利用可能なものを探す
    for (const browser of this.browserPool) {
      if (browser.isConnected()) {
        const contexts = browser.contexts();
        if (contexts.length < this.config.maxContextsPerBrowser) {
          return browser;
        }
      }
    }

    // 新しいブラウザを作成
    if (this.browserPool.length < this.config.maxBrowsers) {
      const browser = await this.createBrowser();
      this.browserPool.push(browser);
      if (!PlaywrightBrowserManager.isProductionEnvironment()) {
        console.log(`🌐 [新ブラウザ作成] プール内ブラウザ数: ${this.browserPool.length}`);
      }
      return browser;
    }

    // プールが満杯の場合、最初の利用可能なブラウザを返す
    const activeBrowser = this.browserPool.find(b => b.isConnected());
    if (activeBrowser) {
      return activeBrowser;
    }

    // すべてのブラウザが無効の場合、新しいブラウザを作成
    const newBrowser = await this.createBrowser();
    this.browserPool[0] = newBrowser; // 最初のスロットを置き換え
    return newBrowser;
  }

  /**
   * ヘッドレスモードを動的に判定
   */
  private determineHeadlessMode(): boolean {
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
   * ブラウザインスタンス作成
   */
  private async createBrowser(): Promise<Browser> {
    // ヘッドレスモードを動的に判定
    const headlessMode = this.determineHeadlessMode();
    
    const launchOptions = {
      ...PlaywrightBrowserManager.LAUNCH_OPTIONS,
      headless: headlessMode,
      ...(headlessMode ? {} : { slowMo: 1000 })
    };

    if (!PlaywrightBrowserManager.isProductionEnvironment()) {
      console.log(`🚀 [ブラウザ起動] テストモード: ${this.config.testMode}`);
      console.log(`🎭 [ブラウザ起動] ヘッドレスモード: ${headlessMode ? 'ON' : 'OFF'} (環境: ${process.env.npm_lifecycle_event || 'unknown'})`);
    }
    return await chromium.launch(launchOptions);
  }

  /**
   * ブラウザコンテキスト作成
   */
  private async createContext(browser: Browser): Promise<BrowserContext> {
    const context = await browser.newContext(PlaywrightBrowserManager.CONTEXT_OPTIONS);

    // 詳細タイムアウト設定を適用
    context.setDefaultTimeout(this.config.timeouts.navigation);
    context.setDefaultNavigationTimeout(this.config.timeouts.navigation);

    // リクエスト間隔制御
    if (this.config.requestDelay > 0) {
      context.on('request', async () => {
        await new Promise(resolve => setTimeout(resolve, this.config.requestDelay));
      });
    }

    return context;
  }

  /**
   * 非アクティブセッションのクリーンアップ
   * 定期実行や手動実行用
   */
  async cleanupInactiveSessions(): Promise<void> {
    if (!PlaywrightBrowserManager.isProductionEnvironment()) {
      console.log('🧹 [非アクティブセッション清理] 開始');
    }
    
    const currentTime = Date.now();
    const inactiveTimeout = 5 * 60 * 1000; // 5分
    const sessionsToCleanup: string[] = [];

    // 非アクティブセッションを特定
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (!session.isActive && (currentTime - session.lastUsed) > inactiveTimeout) {
        sessionsToCleanup.push(sessionId);
      }
    }

    // セッションをクリーンアップ
    for (const sessionId of sessionsToCleanup) {
      await this.forceCleanupSession(sessionId);
    }

    if (!PlaywrightBrowserManager.isProductionEnvironment() && sessionsToCleanup.length > 0) {
      console.log(`🧹 [清理完了] ${sessionsToCleanup.length}件のセッションを清理`);
    }
  }

  /**
   * 特定セッションの強制クリーンアップ
   */
  private async forceCleanupSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      // コンテキストを閉じる
      if (session.context) {
        try {
          await session.context.close();
        } catch (error) {
          console.warn(`⚠️ [コンテキスト終了エラー] ${sessionId}:`, error);
        }
      }

      // セッションを削除
      this.activeSessions.delete(sessionId);
      if (!PlaywrightBrowserManager.isProductionEnvironment()) {
        console.log(`🗑️ [セッション削除] ${sessionId}`);
      }
      
    } catch (error) {
      console.error(`❌ [セッション清理エラー] ${sessionId}:`, error);
    }
  }

  /**
   * 全セッション終了時のクリーンアップ
   */
  async cleanupAll(): Promise<void> {
    console.log('🧹 [完全クリーンアップ] 全セッション・ブラウザを終了中...');
    
    try {
      // 全セッションをクリーンアップ
      const activeSessionIds = Array.from(this.activeSessions.keys());
      for (const sessionId of activeSessionIds) {
        await this.forceCleanupSession(sessionId);
      }

      // 全ブラウザを終了
      for (const browser of this.browserPool) {
        if (browser.isConnected()) {
          try {
            await browser.close();
          } catch (error) {
            console.warn('⚠️ [ブラウザ終了エラー]:', error);
          }
        }
      }

      // プールをクリア
      this.browserPool = [];
      this.activeSessions.clear();
      
      console.log('✅ [完全クリーンアップ完了] 全リソースを解放');
      
    } catch (error) {
      console.error('❌ [完全クリーンアップエラー]:', error);
    }
  }

  /**
   * 現在のセッション状況を取得（デバッグ用）
   */
  getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    totalBrowsers: number;
    activeBrowsers: number;
  } {
    const activeSessions = Array.from(this.activeSessions.values()).filter(s => s.isActive).length;
    const activeBrowsers = this.browserPool.filter(b => b.isConnected()).length;

    return {
      totalSessions: this.activeSessions.size,
      activeSessions,
      totalBrowsers: this.browserPool.length,
      activeBrowsers
    };
  }

  /**
   * 定期メンテナンス
   * 自動的に非アクティブセッションをクリーンアップ
   */
  startPeriodicMaintenance(intervalMinutes: number = 10): NodeJS.Timeout {
    const interval = intervalMinutes * 60 * 1000;
    
    if (!PlaywrightBrowserManager.isProductionEnvironment()) {
      console.log(`⏰ [定期メンテナンス開始] ${intervalMinutes}分間隔`);
    }
    
    return setInterval(async () => {
      if (!PlaywrightBrowserManager.isProductionEnvironment()) {
        console.log('🔄 [定期メンテナンス] セッション清理を実行');
      }
      await this.cleanupInactiveSessions();
      
      // 本番環境ではセッション統計ログを抑制
      if (!PlaywrightBrowserManager.isProductionEnvironment()) {
        const stats = this.getSessionStats();
        console.log(`📊 [セッション統計] アクティブセッション: ${stats.activeSessions}/${this.config.parallelLimit}, 総セッション: ${stats.totalSessions}, ブラウザ: ${stats.activeBrowsers}/${stats.totalBrowsers}`);
      }
    }, interval);
  }

  /**
   * 本番環境かどうかを判定
   */
  private static isProductionEnvironment(): boolean {
    // NODE_ENVが明示的にproductionに設定されている場合
    if (process.env.NODE_ENV === 'production') {
      return true;
    }
    
    // 本番っぽい環境の判定
    const npmScript = process.env.npm_lifecycle_event;
    const isDev = npmScript === 'dev' || npmScript === 'dev:watch';
    
    return !isDev && !process.stdout.isTTY;
  }
}