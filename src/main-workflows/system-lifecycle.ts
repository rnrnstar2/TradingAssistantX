import { systemLogger, Logger } from '../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../shared/component-container';
import { DataManager } from '../data/data-manager';
import { KaitoApiClient } from '../kaito-api';
import { Config } from '../shared/config';
import { SchedulerManager } from './scheduler-manager';

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
 * SystemLifecycle - システム起動・停止・初期化ワークフロー管理クラス
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • システム全体の起動・停止ワークフロー管理
 * • ComponentContainerを使った依存性注入コンテナ初期化
 * • 全コンポーネントのヘルスチェック・状態管理
 * • グレースフルシャットダウン・リソースクリーンアップ
 * • ApplicationRunner機能統合 + CLI実行サポート
 * 
 * 🔗 主要連携:
 * • main.ts → initializeComponents(), startSystem(), stopSystem()呼び出し
 * • ComponentContainer → 全コンポーネントの依存性管理
 * • SystemInitializer → コンポーネント初期化処理統合
 * • HealthChecker → システム健全性監視統合
 * • ShutdownManager → 安全なシステム停止処理統合
 */
// SystemInitializer統合クラス - コンポーネント初期化統合管理
class SystemInitializer {
  private logger: Logger;

  constructor() {
    this.logger = systemLogger;
  }

  initializeComponents(config: Config): ComponentContainer {
    const container = new ComponentContainer();

    const schedulerManager = new SchedulerManager(container);
    const kaitoClient = new KaitoApiClient();
    const dataManager = new DataManager();

    container.register(COMPONENT_KEYS.SCHEDULER_MANAGER, schedulerManager);
    container.register(COMPONENT_KEYS.KAITO_CLIENT, kaitoClient);
    container.register(COMPONENT_KEYS.DATA_MANAGER, dataManager);
    container.register(COMPONENT_KEYS.CONFIG, config);

    this.logger.info('📦 コンポーネント初期化完了 - SchedulerManager統合版');
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
      
      // KaitoApiClientを初期化してから認証
      // デフォルト設定を作成し、API keyを環境変数から設定
      const { createDefaultConfig } = await import('../kaito-api/core/config.js');
      const kaitoConfig = await createDefaultConfig('dev');
      kaitoConfig.authentication.primaryKey = process.env.KAITO_API_TOKEN || '';
      
      kaitoClient.initializeWithConfig(kaitoConfig);
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

// HealthChecker統合クラス - システム健全性監視統合管理
interface ComponentHealth {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  details?: string;
  checkDuration?: number; // ヘルスチェックにかかった時間（ms）
  lastCheck?: string; // 最後のチェック時刻
}

interface HealthReport {
  overall: 'healthy' | 'warning' | 'error';
  components: ComponentHealth[];
  timestamp: string;
  totalCheckDuration: number; // 全体チェック時間
  systemResources: {
    memoryUsage: ReturnType<typeof process.memoryUsage>;
    uptime: number;
    cpuUsage: ReturnType<typeof process.cpuUsage>;
  };
}

class HealthChecker {
  private logger: Logger;

  constructor() {
    this.logger = systemLogger;
  }

  /**
   * システム全体ヘルスチェック - 型安全・パフォーマンス向上版
   * 各コンポーネントの健全性を並行チェックし、統合レポートを作成
   */
  async performSystemHealthCheck(
    schedulerManager: SchedulerManager,
    dataManager: DataManager, 
    kaitoClient: KaitoApiClient
  ): Promise<HealthReport> {
    const startTime = process.hrtime();
    const cpuUsageStart = process.cpuUsage();
    
    try {
      this.logger.info('🏥 システムヘルスチェック実行中...');

      // 並行ヘルスチェックの実行
      const healthCheckPromises = [
        this.checkSchedulerManagerHealth(schedulerManager),
        this.checkDataManagerHealth(dataManager),
        this.checkApiHealth(kaitoClient)
      ];
      
      const healthChecks = await Promise.allSettled(healthCheckPromises);
      const componentNames = ['SchedulerManager', 'DataManager', 'KaitoAPI'];

      // 結果の集約・分析
      const components: ComponentHealth[] = [];
      let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';

      healthChecks.forEach((check, index) => {
        const componentName = componentNames[index];
        
        if (check.status === 'fulfilled') {
          components.push(check.value);
          
          // 統合状態の更新
          if (check.value.status === 'error') {
            overallStatus = 'error';
          } else if (check.value.status === 'warning' && overallStatus !== 'error') {
            overallStatus = 'warning';
          }
        } else {
          // チェック自体が失敗した場合
          const errorComponent: ComponentHealth = {
            component: componentName,
            status: 'error',
            details: check.reason instanceof Error ? check.reason.message : 'Health check execution failed',
            lastCheck: new Date().toISOString()
          };
          components.push(errorComponent);
          overallStatus = 'error';
        }
      });

      // システムリソース情報の収集
      const endTime = process.hrtime(startTime);
      const totalCheckDuration = endTime[0] * 1000 + endTime[1] / 1000000; // ms
      const cpuUsageEnd = process.cpuUsage(cpuUsageStart);

      const report: HealthReport = {
        overall: overallStatus,
        components,
        timestamp: new Date().toISOString(),
        totalCheckDuration: Math.round(totalCheckDuration * 1000) / 1000, // 小数点3桁
        systemResources: {
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
          cpuUsage: cpuUsageEnd
        }
      };

      // 結果ログ出力
      if (report.overall === 'healthy') {
        this.logger.success('✅ システムヘルスチェック完了', {
          duration: `${report.totalCheckDuration}ms`,
          components: components.length,
          memoryHeapUsed: `${Math.round(report.systemResources.memoryUsage.heapUsed / 1024 / 1024)}MB`
        });
      } else {
        this.logger.warn('⚠️ システムヘルスチェック完了（問題あり）:', {
          overall: report.overall,
          problemComponents: components.filter(c => c.status !== 'healthy').map(c => c.component),
          duration: `${report.totalCheckDuration}ms`
        });
      }

      return report;
      
    } catch (error) {
      const endTime = process.hrtime(startTime);
      const duration = endTime[0] * 1000 + endTime[1] / 1000000;
      
      this.logger.error('❌ システムヘルスチェック失敗:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${Math.round(duration * 1000) / 1000}ms`
      });
      
      throw new Error(`System health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * SchedulerManagerコンポーネンツヘルスチェック
   */
  private async checkSchedulerManagerHealth(schedulerManager: SchedulerManager): Promise<ComponentHealth> {
    const checkStart = process.hrtime();
    
    try {
      const health = await schedulerManager.performHealthCheck();
      const checkEnd = process.hrtime(checkStart);
      const checkDuration = checkEnd[0] * 1000 + checkEnd[1] / 1000000; // ms
      
      return {
        component: 'SchedulerManager',
        status: health.overall === 'healthy' ? 'healthy' : 'warning',
        details: health.overall !== 'healthy' ? JSON.stringify(health) : undefined,
        checkDuration: Math.round(checkDuration * 1000) / 1000,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      const checkEnd = process.hrtime(checkStart);
      const checkDuration = checkEnd[0] * 1000 + checkEnd[1] / 1000000;
      
      return {
        component: 'SchedulerManager', 
        status: 'error',
        details: error instanceof Error ? error.message : 'Health check failed',
        checkDuration: Math.round(checkDuration * 1000) / 1000,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * DataManagerコンポーネントヘルスチェック
   */
  private async checkDataManagerHealth(dataManager: DataManager): Promise<ComponentHealth> {
    const checkStart = process.hrtime();
    
    try {
      const health = await dataManager.performHealthCheck();
      const checkEnd = process.hrtime(checkStart);
      const checkDuration = checkEnd[0] * 1000 + checkEnd[1] / 1000000; // ms
      
      const hasErrors = health.errors && health.errors.length > 0;
      
      return {
        component: 'DataManager',
        status: hasErrors ? 'warning' : 'healthy',
        details: hasErrors ? `Errors: ${health.errors.join(', ')}` : undefined,
        checkDuration: Math.round(checkDuration * 1000) / 1000,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      const checkEnd = process.hrtime(checkStart);
      const checkDuration = checkEnd[0] * 1000 + checkEnd[1] / 1000000;
      
      return {
        component: 'DataManager',
        status: 'error', 
        details: error instanceof Error ? error.message : 'Health check failed',
        checkDuration: Math.round(checkDuration * 1000) / 1000,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * KaitoApiClientコンポーネントヘルスチェック
   */
  private async checkApiHealth(kaitoClient: KaitoApiClient): Promise<ComponentHealth> {
    const checkStart = process.hrtime();
    
    try {
      const isHealthy = await kaitoClient.testConnection();
      const checkEnd = process.hrtime(checkStart);
      const checkDuration = checkEnd[0] * 1000 + checkEnd[1] / 1000000; // ms
      
      return {
        component: 'KaitoAPI',
        status: isHealthy ? 'healthy' : 'error',
        details: !isHealthy ? 'API connection test failed' : undefined,
        checkDuration: Math.round(checkDuration * 1000) / 1000,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      const checkEnd = process.hrtime(checkStart);
      const checkDuration = checkEnd[0] * 1000 + checkEnd[1] / 1000000;
      
      return {
        component: 'KaitoAPI',
        status: 'error',
        details: error instanceof Error ? error.message : 'Connection test failed',
        checkDuration: Math.round(checkDuration * 1000) / 1000,
        lastCheck: new Date().toISOString()
      };
    }
  }
}

// ShutdownManager統合クラス - グレースフルシャットダウン統合管理
class ShutdownManager {
  private logger: Logger;
  private shutdownStartTime?: number;

  constructor() {
    this.logger = systemLogger;
  }

  /**
   * グレースフルシャットダウン - 安全なシステム停止処理
   * 順序立てたシャットダウンでリソースの安全な解放を実行
   */
  async gracefulShutdown(
    schedulerManager: SchedulerManager | null,
    dataManager: DataManager | null
  ): Promise<void> {
    this.shutdownStartTime = Date.now();
    
    try {
      this.logger.info('🛑 グレースフルシャットダウン開始', {
        processId: process.pid,
        uptime: `${Math.round(process.uptime())}秒`,
        startTime: new Date().toISOString()
      });

      // シャットダウンステップの実行
      const shutdownSteps = [];
      
      if (schedulerManager) {
        shutdownSteps.push({ name: 'SchedulerManager停止', action: () => this.stopSchedulerManager(schedulerManager) });
      }
      
      if (dataManager) {
        shutdownSteps.push({ name: '最終データ保存', action: () => this.saveFinalData(dataManager) });
      }

      // 各ステップを順次実行
      for (const step of shutdownSteps) {
        try {
          this.logger.info(`🛠️ ${step.name}実行中...`);
          await step.action();
          this.logger.success(`✅ ${step.name}完了`);
        } catch (stepError) {
          this.logger.error(`❌ ${step.name}エラー:`, stepError);
          // 一つのステップが失敗しても続行
        }
      }

      const shutdownDuration = Date.now() - this.shutdownStartTime;
      this.logger.success('✅ グレースフルシャットダウン完了', {
        duration: `${shutdownDuration}ms`,
        stepsCompleted: shutdownSteps.length,
        finalMemoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
      });
      
    } catch (error) {
      const shutdownDuration = this.shutdownStartTime ? Date.now() - this.shutdownStartTime : 0;
      
      this.logger.error('❌ グレースフルシャットダウンエラー:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${shutdownDuration}ms`,
        processId: process.pid
      });
      
      // シャットダウンエラーでも続行（強制停止を防ぐ）
    }
  }

  /**
   * スケジューラーマネージャーの安全停止
   */
  private async stopSchedulerManager(schedulerManager: SchedulerManager): Promise<void> {
    try {
      // スケジューラーマネージャーの現在状態をログ出力
      const status = schedulerManager.getSchedulerStatus();
      this.logger.debug('📊 停止前スケジューラーマネージャー状態:', status);
      
      // 停止実行
      schedulerManager.stopScheduler();
      
      // 少し待って停止確認
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.logger.info('⏹️ SchedulerManager停止完了');
    } catch (error) {
      this.logger.error('❌ SchedulerManager停止エラー:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      throw error; // シャットダウンステップでエラーを伝播
    }
  }

  /**
   * 最終データ保存 - シャットダウン時の状態保存
   */
  private async saveFinalData(dataManager: DataManager): Promise<void> {
    try {
      const shutdownTimestamp = new Date().toISOString();
      const uptime = process.uptime();
      const memoryUsage = process.memoryUsage();
      
      const finalStatus = {
        account_status: {
          followers: 0, // 実際の値はシャットダウン時に取得不可
          following: 0,
          tweets_today: 0,
          engagement_rate_24h: 0
        },
        system_status: {
          last_execution: shutdownTimestamp,
          next_execution: '', // シャットダウンのため空
          errors_today: 0,
          success_rate: 0.95, // デフォルト値
          shutdown_reason: 'graceful_shutdown',
          uptime_seconds: Math.round(uptime)
        },
        rate_limits: {
          posts_remaining: 10, // 保守的なデフォルト値
          retweets_remaining: 20,
          likes_remaining: 50,
          reset_time: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        },
        shutdown_info: {
          timestamp: shutdownTimestamp,
          process_id: process.pid,
          memory_usage_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          uptime_seconds: Math.round(uptime)
        }
      };

      await dataManager.saveCurrentStatus(finalStatus);
      
      this.logger.info('💾 最終データ保存完了', {
        timestamp: shutdownTimestamp,
        memoryUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        uptime: `${Math.round(uptime)}秒`
      });
      
    } catch (error) {
      this.logger.error('❌ 最終データ保存エラー:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      throw error; // シャットダウンステップでエラーを伝播
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
    this.container = this.initializer.initializeComponents(config);
    return this.container;
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
      const schedulerManager = this.container.get<SchedulerManager>(COMPONENT_KEYS.SCHEDULER_MANAGER);
      const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
      const kaitoClient = this.container.get<KaitoApiClient>(COMPONENT_KEYS.KAITO_CLIENT);
      
      await this.healthChecker.performSystemHealthCheck(schedulerManager, dataManager, kaitoClient);
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
      const schedulerManager = this.container.has(COMPONENT_KEYS.SCHEDULER_MANAGER) 
        ? this.container.get<SchedulerManager>(COMPONENT_KEYS.SCHEDULER_MANAGER) : null;
      const dataManager = this.container.has(COMPONENT_KEYS.DATA_MANAGER) 
        ? this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER) : null;
      
      await this.shutdownManager.gracefulShutdown(schedulerManager, dataManager);
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