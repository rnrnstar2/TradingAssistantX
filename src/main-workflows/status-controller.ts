import { systemLogger, Logger } from '../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../shared/component-container';
import { ExecutionResult } from '../shared/types';
import { Config } from '../shared/config';
import { CoreScheduler } from '../scheduler/core-scheduler';
import { MainLoop } from '../scheduler/main-loop';

// SystemStatus統合クラス - 型安全版
interface SystemStatusReport {
  initialized: boolean;
  scheduler: SchedulerStatus | null;
  mainLoop: MainLoopStatus | null;
  lastHealthCheck: string;
  uptime: number;
  processId: number;
  memoryUsage: NodeJS.MemoryUsage;
  [key: string]: unknown;
}

interface SchedulerStatus {
  running: boolean;
  nextExecution?: string;
}

interface MainLoopStatus {
  lastExecution?: string;
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
}

class SystemStatus {
  private logger: Logger;

  constructor() {
    this.logger = systemLogger;
  }

  getSystemStatus(
    isInitialized: boolean,
    scheduler: CoreScheduler | null,
    mainLoop: MainLoop | null
  ): SystemStatusReport {
    return {
      initialized: isInitialized,
      scheduler: scheduler ? { 
        running: scheduler.getStatus()?.isRunning || false,
        nextExecution: scheduler.getStatus()?.nextExecution 
      } : null,
      mainLoop: mainLoop ? {
        lastExecution: mainLoop.getMetrics()?.lastExecutionTime,
        totalExecutions: mainLoop.getMetrics()?.totalExecutions || 0,
        successRate: mainLoop.getMetrics()?.successRate || 0,
        averageExecutionTime: mainLoop.getMetrics()?.avgExecutionTime || 0
      } : null,
      lastHealthCheck: new Date().toISOString(),
      uptime: process.uptime(),
      processId: process.pid,
      memoryUsage: process.memoryUsage()
    };
  }

  async triggerManualExecution(
    isInitialized: boolean,
    executeMainLoop: () => Promise<{ success: boolean; duration: number; error?: string }>
  ): Promise<void> {
    if (!isInitialized) {
      throw new Error('System not initialized');
    }

    this.logger.info('🔧 手動実行トリガー');
    await executeMainLoop();
  }

  async reloadConfiguration(
    config: Config,
    scheduler: CoreScheduler
  ): Promise<void> {
    try {
      this.logger.info('🔄 設定リロード中...');
      
      await config.reloadConfig();
      
      const newSchedulerConfig = config.getSchedulerConfig();
      scheduler.updateConfig(newSchedulerConfig);
      
      this.logger.success('✅ 設定リロード完了');
    } catch (error) {
      this.logger.error('❌ 設定リロードエラー:', error);
      throw error;
    }
  }
}

/**
 * StatusController - システム状態管理・手動実行・設定リロード制御クラス
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • システム全体の状態監視・情報収集
 * • 手動実行トリガーの安全な実行制御
 * • システム設定の動的リロード機能
 * • デバッグ・運用用情報の提供
 * 
 * 🔗 主要連携:
 * • main.ts → getSystemStatus(), triggerManualExecution()経由で呼び出し
 * • SystemLifecycle → 初期化状態の取得・状態連携
 * • ExecutionFlow → 手動実行時のexecuteMainLoop()呼び出し
 * • SchedulerManager → 設定リロード時の協調動作
 */
export class StatusController {
  private container: ComponentContainer;
  private systemStatus: SystemStatus;

  constructor(container: ComponentContainer) {
    this.container = container;
    this.systemStatus = new SystemStatus();
  }

  /**
   * システム状態取得ワークフロー
   */
  getSystemStatus(isInitialized: boolean): Record<string, unknown> {
    try {
      // ===================================================================
      // システム状態取得ワークフロー
      // ===================================================================
      
      systemLogger.debug('📊 システム状態取得開始');
      
      const scheduler = this.container.has(COMPONENT_KEYS.SCHEDULER) 
        ? this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER) : null;
      const mainLoop = this.container.has(COMPONENT_KEYS.MAIN_LOOP) 
        ? this.container.get<MainLoop>(COMPONENT_KEYS.MAIN_LOOP) : null;

      const status = this.getEnhancedSystemStatus(isInitialized, scheduler, mainLoop);
      
      systemLogger.debug('✅ システム状態取得完了');
      return status;

    } catch (error) {
      systemLogger.error('❌ システム状態取得エラー:', error);
      return {
        initialized: false,
        error: 'Status retrieval failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 手動実行トリガーワークフロー（デバッグ用）
   */
  async triggerManualExecution(
    isInitialized: boolean,
    executeCallback: () => Promise<ExecutionResult>
  ): Promise<void> {
    try {
      // ===================================================================
      // 手動実行ワークフロー
      // ===================================================================
      
      systemLogger.info('🔧 【手動実行ステップ1】前提条件確認開始');
      this.validateManualExecutionPreconditions(isInitialized);
      systemLogger.success('✅ 手動実行前提条件確認完了');

      systemLogger.info('⚡【手動実行ステップ2】手動実行開始');
      systemLogger.info('   → スケジューラーを経由せず直接実行');
      systemLogger.info('   → 30分毎ワークフローを即座に実行');

      await this.systemStatus.triggerManualExecution(isInitialized, executeCallback);
      
      systemLogger.success('✅ 手動実行完了');
      systemLogger.info('ℹ️ 次回の定期実行は予定通り30分後に実行されます');

    } catch (error) {
      systemLogger.error('❌ 手動実行失敗:', error);
      throw error;
    }
  }

  /**
   * 設定リロードワークフロー
   */
  async reloadConfiguration(): Promise<void> {
    try {
      // ===================================================================
      // 設定リロードワークフロー
      // ===================================================================
      
      systemLogger.info('🔄 【設定リロードステップ1】設定ファイル再読み込み開始');
      const config = this.container.get<Config>(COMPONENT_KEYS.CONFIG);
      const scheduler = this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER);
      
      // 設定リロードの安全性検証
      this.validateConfigReloadSafety(config, scheduler);
      
      await this.systemStatus.reloadConfiguration(config, scheduler);
      systemLogger.success('✅ 設定ファイル再読み込み完了');

      systemLogger.info('⚙️ 【設定リロードステップ2】スケジューラー設定更新開始');
      systemLogger.info('   → 新しい間隔設定の適用');
      systemLogger.info('   → 最大実行回数制限の更新');
      systemLogger.success('✅ スケジューラー設定更新完了');

      systemLogger.success('🔄 設定リロード完了 - 新設定で実行継続');

    } catch (error) {
      systemLogger.error('❌ 設定リロードエラー:', error);
      throw error;
    }
  }

  /**
   * システム概要表示
   */
  displaySystemOverview(isInitialized: boolean): void {
    systemLogger.info('📊 システム状態概要:');
    systemLogger.info('┌─────────────────────────────────────────────────────────────┐');
    systemLogger.info(`│ 初期化状態: ${isInitialized ? '✅ 完了' : '❌ 未完了'}                                      │`);
    systemLogger.info(`│ タイムスタンプ: ${new Date().toLocaleString('ja-JP')}                         │`);
    systemLogger.info('│                                                           │');
    systemLogger.info('│ 利用可能な操作:                                              │');
    systemLogger.info('│   • getSystemStatus()    - 詳細状態取得                    │');
    systemLogger.info('│   • triggerManualExecution() - 手動実行トリガー             │');
    systemLogger.info('│   • reloadConfiguration() - 設定リロード                   │');
    systemLogger.info('└─────────────────────────────────────────────────────────────┘');
  }

  /**
   * 手動実行ガイド表示
   */
  displayManualExecutionGuide(): void {
    systemLogger.info('🔧 手動実行ガイド:');
    systemLogger.info('┌─────────────────────────────────────────────────────────────┐');
    systemLogger.info('│ 手動実行の用途:                                              │');
    systemLogger.info('│   • デバッグ・テスト目的                                      │');
    systemLogger.info('│   • 設定変更後の動作確認                                      │');
    systemLogger.info('│   • 即座にアクション実行が必要な場合                           │');
    systemLogger.info('│                                                           │');
    systemLogger.info('│ 注意事項:                                                   │');
    systemLogger.info('│   • 手動実行は定期実行とは独立して動作                         │');
    systemLogger.info('│   • 手動実行後も30分毎の定期実行は継続                        │');
    systemLogger.info('│   • システム初期化完了後のみ実行可能                           │');
    systemLogger.info('└─────────────────────────────────────────────────────────────┘');
  }

  // ===================================================================
  // Private Helper Methods - 内部処理支援メソッド群
  // ===================================================================

  /**
   * 強化されたシステム状態取得（型安全版）
   * @param isInitialized システム初期化状態
   * @param scheduler CoreSchedulerインスタンス
   * @param mainLoop MainLoopインスタンス
   * @returns 詳細なシステム状態レポート
   */
  private getEnhancedSystemStatus(
    isInitialized: boolean,
    scheduler: CoreScheduler | null,
    mainLoop: MainLoop | null
  ): SystemStatusReport {
    try {
      const startTime = process.hrtime();
      
      // スケジューラー状態の安全な取得
      const schedulerStatus: SchedulerStatus | null = scheduler ? {
        running: scheduler.getStatus()?.isRunning || false,
        nextExecution: scheduler.getStatus()?.nextExecution
      } : null;

      // メインループ状態の安全な取得
      const mainLoopStatus: MainLoopStatus | null = mainLoop ? {
        lastExecution: mainLoop.getMetrics()?.lastExecutionTime,
        totalExecutions: mainLoop.getMetrics()?.totalExecutions || 0,
        successRate: mainLoop.getMetrics()?.successRate || 0,
        averageExecutionTime: mainLoop.getMetrics()?.avgExecutionTime || 0
      } : null;

      const endTime = process.hrtime(startTime);
      const processingTime = endTime[0] * 1000 + endTime[1] / 1000000; // ms

      return {
        initialized: isInitialized,
        scheduler: schedulerStatus,
        mainLoop: mainLoopStatus,
        lastHealthCheck: new Date().toISOString(),
        uptime: process.uptime(),
        processId: process.pid,
        memoryUsage: process.memoryUsage(),
        statusProcessingTime: Math.round(processingTime * 1000) / 1000, // 小数点3桁
        nodeVersion: process.version,
        platform: process.platform
      };

    } catch (error) {
      systemLogger.error('❌ 強化システム状態取得エラー:', error);
      
      // エラー時のフォールバック状態
      return {
        initialized: false,
        scheduler: null,
        mainLoop: null,
        lastHealthCheck: new Date().toISOString(),
        uptime: process.uptime(),
        processId: process.pid,
        memoryUsage: process.memoryUsage(),
        error: `Status retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * 手動実行の前提条件検証
   * @param isInitialized システム初期化状態
   * @throws Error 前提条件が満たされていない場合
   */
  private validateManualExecutionPreconditions(isInitialized: boolean): void {
    if (!isInitialized) {
      throw new Error('System not initialized - 手動実行不可');
    }

    // メモリ使用量チェック（安全性確保）
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > 500) { // 500MB以上の場合は警告
      systemLogger.warn(`⚠️ 高メモリ使用量検出 (${Math.round(heapUsedMB)}MB) - 手動実行継続`);
    }

    // プロセス負荷チェック（基本的な健全性確認）
    const uptime = process.uptime();
    if (uptime < 5) { // 起動から5秒未満の場合
      systemLogger.warn('⚠️ システム起動直後 - 手動実行は推奨されません');
    }

    systemLogger.debug('✅ 手動実行前提条件検証完了', {
      memoryHeapUsed: `${Math.round(heapUsedMB)}MB`,
      uptime: `${Math.round(uptime)}秒`,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 設定リロードの安全性検証
   * @param config Configインスタンス
   * @param scheduler CoreSchedulerインスタンス
   */
  private validateConfigReloadSafety(config: Config, scheduler: CoreScheduler): void {
    if (!config) {
      throw new Error('Config component not found - 設定リロード不可');
    }

    if (!scheduler) {
      throw new Error('CoreScheduler component not found - 設定リロード不可');
    }

    // スケジューラーが実行中かどうかの確認
    const schedulerStatus = scheduler.getStatus();
    if (schedulerStatus?.isRunning) {
      systemLogger.info('ℹ️ スケジューラー実行中 - 設定リロード時に一時的な動作変更が発生する可能性があります');
    }

    systemLogger.debug('✅ 設定リロード安全性検証完了');
  }
}