#!/usr/bin/env node
/**
 * システム起動スクリプト
 * REQUIREMENTS.md準拠版 - 30分間隔自動実行システム
 */

import 'dotenv/config';
import { CoreScheduler } from './scheduler/core-scheduler';
import { MainLoop } from './scheduler/main-loop';
import { DecisionEngine } from './claude/decision-engine';
import { ContentGenerator } from './claude/content-generator';
import { PostAnalyzer } from './claude/post-analyzer';
import { KaitoApiClient } from './kaito-api/client';
import { SearchEngine } from './kaito-api/search-engine';
import { ActionExecutor } from './kaito-api/action-executor';
import { DataManager } from './data/data-manager';
import { Config, getConfig } from './shared/config';
import { Logger, systemLogger } from './shared/logger';

/**
 * TradingAssistantX メインアプリケーションクラス
 * 30分間隔での自動実行システムを統合・管理
 */
class TradingAssistantX {
  private scheduler!: CoreScheduler;
  private mainLoop!: MainLoop;
  private decisionEngine!: DecisionEngine;
  private contentGenerator!: ContentGenerator;
  private postAnalyzer!: PostAnalyzer;
  private kaitoClient!: KaitoApiClient;
  private searchEngine!: SearchEngine;
  private actionExecutor!: ActionExecutor;
  private dataManager!: DataManager;
  private config: Config;
  private logger: Logger;
  private isInitialized: boolean = false;

  constructor() {
    this.logger = systemLogger;
    this.config = getConfig();
    
    // コンポーネント初期化
    this.initializeComponents();
    
    this.logger.info('TradingAssistantX initialized - REQUIREMENTS.md準拠版');
  }

  /**
   * システム起動
   */
  async start(): Promise<void> {
    try {
      this.logger.info('🚀 TradingAssistantX システム開始');

      // 初期化
      await this.initialize();

      // ヘルスチェック
      await this.performSystemHealthCheck();

      // スケジューラー開始
      this.startScheduler();

      this.logger.success('✅ システム起動完了 - 30分間隔自動実行開始');

    } catch (error) {
      this.logger.error('❌ システム起動失敗:', error);
      await this.gracefulShutdown();
      process.exit(1);
    }
  }

  /**
   * システム停止
   */
  async stop(): Promise<void> {
    this.logger.info('⏹️ システム停止処理開始');
    await this.gracefulShutdown();
    this.logger.success('✅ システム停止完了');
  }

  // ============================================================================
  // PRIVATE METHODS - INITIALIZATION
  // ============================================================================

  private initializeComponents(): void {
    this.scheduler = new CoreScheduler();
    this.mainLoop = new MainLoop();
    this.decisionEngine = new DecisionEngine();
    this.contentGenerator = new ContentGenerator();
    this.postAnalyzer = new PostAnalyzer();
    this.kaitoClient = new KaitoApiClient();
    this.searchEngine = new SearchEngine();
    this.actionExecutor = new ActionExecutor(this.kaitoClient);
    this.dataManager = new DataManager();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.logger.info('⚙️ システム初期化中...');

    try {
      // 設定システム初期化
      await this.config.initialize();

      // データマネージャー初期化
      await this.initializeDataManager();

      // KaitoAPI認証
      await this.kaitoClient.authenticate();

      // 接続テスト
      const connectionOk = await this.kaitoClient.testConnection();
      if (!connectionOk) {
        throw new Error('KaitoAPI connection test failed');
      }

      this.isInitialized = true;
      this.logger.success('✅ システム初期化完了');

    } catch (error) {
      this.logger.error('❌ システム初期化失敗:', error);
      throw error;
    }
  }

  private async initializeDataManager(): Promise<void> {
    try {
      // データベース健全性チェック
      const healthCheck = await this.dataManager.performHealthCheck();
      
      if (healthCheck.errors.length > 0) {
        this.logger.warn('⚠️ Data health check issues found:', healthCheck.errors);
      }

      // 古いデータのクリーンアップ
      await this.dataManager.cleanupOldData(30);

      this.logger.info('✅ DataManager初期化完了');

    } catch (error) {
      this.logger.error('❌ DataManager初期化失敗:', error);
      throw error;
    }
  }

  private startScheduler(): void {
    const schedulerConfig = this.config.getSchedulerConfig();
    
    this.scheduler.updateConfig(schedulerConfig);
    this.scheduler.setExecutionCallback(async () => {
      return await this.executeMainLoop();
    });

    this.scheduler.start();
    
    this.logger.info('⏰ スケジューラー開始:', {
      interval: schedulerConfig.intervalMinutes,
      maxDaily: schedulerConfig.maxDailyExecutions
    });
  }

  // ============================================================================
  // PRIVATE METHODS - EXECUTION
  // ============================================================================

  private async executeMainLoop(): Promise<{ success: boolean; duration: number; error?: string }> {
    const startTime = Date.now();

    try {
      this.logger.info('🔄 メインループ実行開始');

      // メインループ実行
      const result = await this.mainLoop.runOnce();

      const duration = Date.now() - startTime;

      if (result.success) {
        this.logger.success('✅ メインループ実行完了:', {
          action: result.action,
          duration: `${duration}ms`,
          confidence: result.metadata.confidence
        });

        return { success: true, duration };
      } else {
        this.logger.error('❌ メインループ実行失敗:', result.error);
        return { success: false, duration, error: result.error };
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('❌ メインループ実行エラー:', error);
      
      return { 
        success: false, 
        duration, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async performSystemHealthCheck(): Promise<void> {
    try {
      this.logger.info('🏥 システムヘルスチェック実行中...');

      // メインループヘルスチェック
      const mainLoopHealth = await this.mainLoop.performHealthCheck();
      
      if (mainLoopHealth.overall !== 'healthy') {
        this.logger.warn('⚠️ Main loop health issues:', mainLoopHealth);
      }

      // データマネージャーヘルスチェック
      const dataHealth = await this.dataManager.performHealthCheck();
      
      if (dataHealth.errors.length > 0) {
        this.logger.warn('⚠️ Data manager health issues:', dataHealth.errors);
      }

      // KaitoAPI接続チェック
      const apiHealth = await this.kaitoClient.testConnection();
      
      if (!apiHealth) {
        throw new Error('KaitoAPI health check failed');
      }

      this.logger.success('✅ システムヘルスチェック完了');

    } catch (error) {
      this.logger.error('❌ システムヘルスチェック失敗:', error);
      throw error;
    }
  }

  private async gracefulShutdown(): Promise<void> {
    try {
      this.logger.info('🛑 グレースフルシャットダウン開始');

      // スケジューラー停止
      if (this.scheduler) {
        this.scheduler.stop();
        this.logger.info('⏹️ Scheduler stopped');
      }

      // 最終データ保存
      if (this.dataManager) {
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

        await this.dataManager.saveCurrentStatus(currentStatus);
        this.logger.info('💾 Final data saved');
      }

      this.logger.success('✅ グレースフルシャットダウン完了');

    } catch (error) {
      this.logger.error('❌ シャットダウンエラー:', error);
    }
  }

  // ============================================================================
  // PUBLIC METHODS - STATUS & CONTROL
  // ============================================================================

  /**
   * システム状態取得
   */
  getSystemStatus(): {
    initialized: boolean;
    scheduler: any;
    mainLoop: any;
    lastHealthCheck: string;
  } {
    return {
      initialized: this.isInitialized,
      scheduler: this.scheduler?.getStatus(),
      mainLoop: this.mainLoop?.getMetrics(),
      lastHealthCheck: new Date().toISOString()
    };
  }

  /**
   * 手動実行トリガー（デバッグ用）
   */
  async triggerManualExecution(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('System not initialized');
    }

    this.logger.info('🔧 手動実行トリガー');
    await this.executeMainLoop();
  }

  /**
   * 設定リロード
   */
  async reloadConfiguration(): Promise<void> {
    this.logger.info('🔄 設定リロード中...');
    
    await this.config.reloadConfig();
    
    // スケジューラー設定更新
    const newSchedulerConfig = this.config.getSchedulerConfig();
    this.scheduler.updateConfig(newSchedulerConfig);
    
    this.logger.success('✅ 設定リロード完了');
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                            TradingAssistantX                                 ║
║                    30分間隔自動実行システム - MVP版                           ║
║                        REQUIREMENTS.md準拠版                                ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

  const app = new TradingAssistantX();

  // グレースフルシャットダウンハンドラー
  const shutdownHandler = async (signal: string) => {
    console.log(`\n📧 ${signal} signal received`);
    await app.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdownHandler('SIGINT'));   // Ctrl+C
  process.on('SIGTERM', () => shutdownHandler('SIGTERM')); // Termination
  process.on('SIGQUIT', () => shutdownHandler('SIGQUIT')); // Quit

  // 未処理エラーハンドラー
  process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    shutdownHandler('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    shutdownHandler('UNHANDLED_REJECTION');
  });

  try {
    // システム開始
    await app.start();

    // プロセス情報表示
    console.log(`
📊 システム情報:
   - Process ID: ${process.pid}
   - Node Version: ${process.version}
   - Platform: ${process.platform}
   - Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
   - Started At: ${new Date().toLocaleString('ja-JP')}
`);

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
          await app.triggerManualExecution();
        } catch (error) {
          console.error('Manual execution failed:', error);
        }
      });

      process.on('SIGUSR2', async () => {
        try {
          await app.reloadConfiguration();
        } catch (error) {
          console.error('Configuration reload failed:', error);
        }
      });
    }

  } catch (error) {
    console.error('🚨 System startup failed:', error);
    process.exit(1);
  }
}

// エントリーポイント実行（ES module対応）
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('🚨 Fatal error:', error);
    process.exit(1);
  });
}

export { TradingAssistantX };