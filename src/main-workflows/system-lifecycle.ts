import { systemLogger, Logger } from '../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../shared/component-container';
import { MainLoop } from '../scheduler/main-loop';
import { CoreScheduler } from '../scheduler/core-scheduler';
import { DataManager } from '../data/data-manager';
import { KaitoApiClient } from '../kaito-api/core/client';
import { Config } from '../shared/config';
import { ClaudeDecisionEngine } from '../claude/decision-engine';
import { MarketAnalyzer } from '../claude/market-analyzer';
import { ContentGenerator } from '../claude/content-generator';
import { SearchEngine } from '../kaito-api/search-engine';
import { ActionExecutor } from '../kaito-api/action-executor';

// TradingAssistantX のインターface定義（型安全性のため）
interface ITradingAssistantX {
  start(): Promise<void>;
  stop(): Promise<void>;
  getSystemStatus(): {
    initialized: boolean;
    timestamp: string;
    scheduler?: {
      running: boolean;
      nextExecution?: string;
    };
    system?: {
      health: 'healthy' | 'degraded' | 'error';
      uptime: number;
    };
  };
  triggerManualExecution(): Promise<void>;
  reloadConfiguration(): Promise<void>;
}

/**
 * SystemLifecycle - システム起動・停止・初期化ワークフロー管理
 * ApplicationRunner機能を統合したシステムライフサイクル管理クラス
 * main.tsから分離された生命周期管理専用クラス + CLI実行機能
 */
// SystemInitializer統合クラス
class SystemInitializer {
  private logger: Logger;

  constructor() {
    this.logger = systemLogger;
  }

  initializeComponents(config: Config): ComponentContainer {
    const container = new ComponentContainer();

    const scheduler = new CoreScheduler();
    const mainLoop = new MainLoop(() => Promise.resolve({
      success: true,
      action: 'wait',
      executionTime: 0,
      metadata: {
        executionTime: 0,
        retryCount: 0,
        rateLimitHit: false,
        timestamp: new Date().toISOString()
      }
    }));
    const contentGenerator = new ContentGenerator();
    const kaitoClient = new KaitoApiClient();
    const searchEngine = new SearchEngine();
    const marketAnalyzer = new MarketAnalyzer(searchEngine);
    const decisionEngine = new ClaudeDecisionEngine(searchEngine);
    const actionExecutor = new ActionExecutor();
    const dataManager = new DataManager();

    container.register(COMPONENT_KEYS.SCHEDULER, scheduler);
    container.register(COMPONENT_KEYS.MAIN_LOOP, mainLoop);
    container.register(COMPONENT_KEYS.DECISION_ENGINE, decisionEngine);
    container.register(COMPONENT_KEYS.CONTENT_GENERATOR, contentGenerator);
    container.register(COMPONENT_KEYS.KAITO_CLIENT, kaitoClient);
    container.register(COMPONENT_KEYS.SEARCH_ENGINE, searchEngine);
    container.register(COMPONENT_KEYS.ACTION_EXECUTOR, actionExecutor);
    container.register(COMPONENT_KEYS.DATA_MANAGER, dataManager);
    container.register(COMPONENT_KEYS.MARKET_ANALYZER, marketAnalyzer);
    container.register(COMPONENT_KEYS.CONFIG, config);

    this.logger.info('📦 コンポーネント初期化完了');
    return container;
  }

  async initialize(container: ComponentContainer): Promise<void> {
    try {
      this.logger.info('⚙️ システム初期化中...');

      const config = container.get<Config>(COMPONENT_KEYS.CONFIG);
      const dataManager = container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
      const kaitoClient = container.get<KaitoApiClient>(COMPONENT_KEYS.KAITO_CLIENT);

      await config.initialize();
      await this.initializeDataManager(dataManager);
      await kaitoClient.authenticate();

      const connectionOk = await kaitoClient.testConnection();
      if (!connectionOk) {
        throw new Error('KaitoAPI connection test failed');
      }

      this.logger.success('✅ システム初期化完了');
    } catch (error) {
      this.logger.error('❌ システム初期化失敗:', error);
      throw error;
    }
  }

  private async initializeDataManager(dataManager: DataManager): Promise<void> {
    try {
      const healthCheck = await dataManager.performHealthCheck();
      
      if (healthCheck.errors.length > 0) {
        this.logger.warn('⚠️ Data health check issues found:', healthCheck.errors);
      }

      await dataManager.cleanupOldData(30);
      this.logger.info('✅ DataManager初期化完了');
    } catch (error) {
      this.logger.error('❌ DataManager初期化失敗:', error);
      throw error;
    }
  }
}

// HealthChecker統合クラス
interface ComponentHealth {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  details?: string;
}

interface HealthReport {
  overall: 'healthy' | 'warning' | 'error';
  components: ComponentHealth[];
  timestamp: string;
}

class HealthChecker {
  private logger: Logger;

  constructor() {
    this.logger = systemLogger;
  }

  async performSystemHealthCheck(
    mainLoop: MainLoop,
    dataManager: DataManager, 
    kaitoClient: KaitoApiClient
  ): Promise<HealthReport> {
    try {
      this.logger.info('🏥 システムヘルスチェック実行中...');

      const healthChecks = await Promise.allSettled([
        this.checkMainLoopHealth(mainLoop),
        this.checkDataManagerHealth(dataManager),
        this.checkApiHealth(kaitoClient)
      ]);

      const components: ComponentHealth[] = [];
      let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';

      healthChecks.forEach((check, index) => {
        if (check.status === 'fulfilled') {
          components.push(check.value);
          if (check.value.status === 'error') {
            overallStatus = 'error';
          } else if (check.value.status === 'warning' && overallStatus !== 'error') {
            overallStatus = 'warning';
          }
        } else {
          components.push({
            component: ['MainLoop', 'DataManager', 'KaitoAPI'][index],
            status: 'error',
            details: check.reason instanceof Error ? check.reason.message : 'Unknown error'
          });
          overallStatus = 'error';
        }
      });

      const report: HealthReport = {
        overall: overallStatus,
        components,
        timestamp: new Date().toISOString()
      };

      if (report.overall === 'healthy') {
        this.logger.success('✅ システムヘルスチェック完了');
      } else {
        this.logger.warn('⚠️ システムヘルスチェック完了（問題あり）:', report);
      }

      return report;
    } catch (error) {
      this.logger.error('❌ システムヘルスチェック失敗:', error);
      throw error;
    }
  }

  private async checkMainLoopHealth(mainLoop: MainLoop): Promise<ComponentHealth> {
    try {
      const health = await mainLoop.performHealthCheck();
      
      return {
        component: 'MainLoop',
        status: health.overall === 'healthy' ? 'healthy' : 'warning',
        details: health.overall !== 'healthy' ? JSON.stringify(health) : undefined
      };
    } catch (error) {
      return {
        component: 'MainLoop', 
        status: 'error',
        details: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  private async checkDataManagerHealth(dataManager: DataManager): Promise<ComponentHealth> {
    try {
      const health = await dataManager.performHealthCheck();
      
      return {
        component: 'DataManager',
        status: health.errors.length === 0 ? 'healthy' : 'warning',
        details: health.errors.length > 0 ? `Errors: ${health.errors.join(', ')}` : undefined
      };
    } catch (error) {
      return {
        component: 'DataManager',
        status: 'error', 
        details: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  private async checkApiHealth(kaitoClient: KaitoApiClient): Promise<ComponentHealth> {
    try {
      const isHealthy = await kaitoClient.testConnection();
      
      return {
        component: 'KaitoAPI',
        status: isHealthy ? 'healthy' : 'error',
        details: !isHealthy ? 'API connection test failed' : undefined
      };
    } catch (error) {
      return {
        component: 'KaitoAPI',
        status: 'error',
        details: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }
}

// ShutdownManager統合クラス
class ShutdownManager {
  private logger: Logger;

  constructor() {
    this.logger = systemLogger;
  }

  async gracefulShutdown(
    scheduler: CoreScheduler | null,
    dataManager: DataManager | null
  ): Promise<void> {
    try {
      this.logger.info('🛑 グレースフルシャットダウン開始');

      if (scheduler) {
        await this.stopScheduler(scheduler);
      }

      if (dataManager) {
        await this.saveFinalData(dataManager);
      }

      this.logger.success('✅ グレースフルシャットダウン完了');
    } catch (error) {
      this.logger.error('❌ シャットダウンエラー:', error);
    }
  }

  private async stopScheduler(scheduler: CoreScheduler): Promise<void> {
    try {
      scheduler.stop();
      this.logger.info('⏹️ Scheduler stopped');
    } catch (error) {
      this.logger.error('❌ Scheduler停止エラー:', error);
    }
  }

  private async saveFinalData(dataManager: DataManager): Promise<void> {
    try {
      const currentStatus = {
        account_status: {
          followers: 0,
          following: 0,
          tweets_today: 0,
          engagement_rate_24h: 0
        },
        system_status: {
          last_execution: new Date().toISOString(),
          next_execution: '',
          errors_today: 0,
          success_rate: 0.95
        },
        rate_limits: {
          posts_remaining: 10,
          retweets_remaining: 20,
          likes_remaining: 50,
          reset_time: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        }
      };

      await dataManager.saveCurrentStatus(currentStatus);
      this.logger.info('💾 Final data saved');
    } catch (error) {
      this.logger.error('❌ 最終データ保存エラー:', error);
    }
  }
}

export class SystemLifecycle {
  private container: ComponentContainer;
  private initializer: SystemInitializer;
  private healthChecker: HealthChecker;
  private shutdownManager: ShutdownManager;
  private logger: Logger;
  private app: ITradingAssistantX | null = null;
  private isInitialized: boolean = false;

  constructor(container: ComponentContainer) {
    this.container = container;
    this.initializer = new SystemInitializer();
    this.healthChecker = new HealthChecker();
    this.shutdownManager = new ShutdownManager();
    this.logger = systemLogger;
  }

  /**
   * コンポーネント初期化（main.tsから呼び出し）
   */
  initializeComponents(config: Config): ComponentContainer {
    return this.initializer.initializeComponents(config);
  }

  /**
   * アプリケーション実行（ApplicationRunner統合機能）
   */
  async run(appInstance: ITradingAssistantX): Promise<void> {
    this.app = appInstance;

    this.displayStartupBanner();
    this.setupSignalHandlers();

    try {
      // システム開始
      await this.app.start();

      this.displaySystemInfo();
      this.setupDevelopmentMode();

    } catch (error) {
      console.error('🚨 System startup failed:', error);
      process.exit(1);
    }
  }

  /**
   * システム起動ワークフロー
   */
  async startSystem(): Promise<void> {
    try {
      systemLogger.info('🚀 TradingAssistantX システム開始');

      // ===================================================================
      // システム起動ワークフロー
      // ===================================================================
      
      systemLogger.info('⚙️ 【起動ステップ1】システム初期化開始');
      await this.initializer.initialize(this.container);
      this.isInitialized = true;
      systemLogger.success('✅ システム初期化完了');

      systemLogger.info('🏥 【起動ステップ2】ヘルスチェック開始');
      const mainLoop = this.container.get<MainLoop>(COMPONENT_KEYS.MAIN_LOOP);
      const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
      const kaitoClient = this.container.get<KaitoApiClient>(COMPONENT_KEYS.KAITO_CLIENT);
      
      await this.healthChecker.performSystemHealthCheck(mainLoop, dataManager, kaitoClient);
      systemLogger.success('✅ ヘルスチェック完了');

      systemLogger.success('✅ システム起動完了 - 30分間隔自動実行準備完了');

    } catch (error) {
      systemLogger.error('❌ システム起動失敗:', error);
      await this.stopSystem();
      throw error;
    }
  }

  /**
   * システム停止ワークフロー
   */
  async stopSystem(): Promise<void> {
    try {
      systemLogger.info('⏹️ システム停止処理開始');
      
      // ===================================================================
      // システム停止ワークフロー
      // ===================================================================
      
      systemLogger.info('🛑 【停止ステップ1】コンポーネント停止開始');
      const scheduler = this.container.has(COMPONENT_KEYS.SCHEDULER) 
        ? this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER) : null;
      const dataManager = this.container.has(COMPONENT_KEYS.DATA_MANAGER) 
        ? this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER) : null;
      
      await this.shutdownManager.gracefulShutdown(scheduler, dataManager);
      systemLogger.success('✅ コンポーネント停止完了');

      this.isInitialized = false;
      systemLogger.success('✅ システム停止完了');

    } catch (error) {
      systemLogger.error('❌ システム停止エラー:', error);
      // エラーが発生してもシステム停止は継続
    }
  }

  /**
   * 初期化状態取得
   */
  getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * システム状態概要取得
   */
  getSystemOverview(): {
    initialized: boolean;
    startedAt: string;
    components: string[];
  } {
    return {
      initialized: this.isInitialized,
      startedAt: new Date().toISOString(),
      components: this.container.getRegisteredKeys()
    };
  }

  // ===================================================================
  // ApplicationRunner統合機能 - Private Methods
  // ===================================================================

  private displayStartupBanner(): void {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                            TradingAssistantX                                 ║
║                    30分間隔自動実行システム - MVP版                           ║
║                        REQUIREMENTS.md準拠版                                ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
  }

  private setupSignalHandlers(): void {
    if (!this.app) {
      throw new Error('App instance not set');
    }

    // グレースフルシャットダウンハンドラー
    const shutdownHandler = async (signal: string) => {
      console.log(`\n📧 ${signal} signal received`);
      if (this.app) {
        await this.app.stop();
      }
      process.exit(0);
    };

    process.on('SIGINT', () => void shutdownHandler('SIGINT'));   // Ctrl+C
    process.on('SIGTERM', () => void shutdownHandler('SIGTERM')); // Termination
    process.on('SIGQUIT', () => void shutdownHandler('SIGQUIT')); // Quit

    // 未処理エラーハンドラー
    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception:', error);
      void shutdownHandler('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
      void shutdownHandler('UNHANDLED_REJECTION');
    });
  }

  private displaySystemInfo(): void {
    console.log(`
📊 システム情報:
   - Process ID: ${process.pid}
   - Node Version: ${process.version}
   - Platform: ${process.platform}
   - Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
   - Started At: ${new Date().toLocaleString('ja-JP')}
`);
  }

  private setupDevelopmentMode(): void {
    if (!this.app) {
      return;
    }

    // デバッグモードでの追加情報
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode enabled');
      
      // 手動実行コマンド例
      console.log(`
💡 手動実行コマンド例:
   kill -USR1 ${process.pid}  # 手動実行トリガー
   kill -USR2 ${process.pid}  # 設定リロード
`);

      // 開発用シグナルハンドラー
      process.on('SIGUSR1', async () => {
        try {
          if (this.app) {
            await this.app.triggerManualExecution();
          }
        } catch (error) {
          console.error('Manual execution failed:', error);
        }
      });

      process.on('SIGUSR2', async () => {
        try {
          if (this.app) {
            await this.app.reloadConfiguration();
          }
        } catch (error) {
          console.error('Configuration reload failed:', error);
        }
      });
    }
  }
}