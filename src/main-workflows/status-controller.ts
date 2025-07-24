import { systemLogger, Logger } from '../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../shared/component-container';
import { ExecutionResult } from '../shared/types';
import { Config } from '../shared/config';
import { CoreScheduler } from '../scheduler/core-scheduler';
import { MainLoop } from '../scheduler/main-loop';

// SystemStatus統合クラス
interface SystemStatusReport {
  initialized: boolean;
  scheduler: any;
  mainLoop: any;
  lastHealthCheck: string;
  [key: string]: unknown;
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
      scheduler: scheduler?.getStatus(),
      mainLoop: mainLoop?.getMetrics(),
      lastHealthCheck: new Date().toISOString()
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
 * システム状態管理・手動実行・設定リロード制御
 * main.tsから分離された状態制御専用クラス
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
        ? this.container.get(COMPONENT_KEYS.SCHEDULER) : null;
      const mainLoop = this.container.has(COMPONENT_KEYS.MAIN_LOOP) 
        ? this.container.get(COMPONENT_KEYS.MAIN_LOOP) : null;

      const status = this.systemStatus.getSystemStatus(isInitialized, scheduler, mainLoop);
      
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
      if (!isInitialized) {
        throw new Error('System not initialized - 手動実行不可');
      }
      systemLogger.info('✅ システム初期化確認完了');

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
      const config = this.container.get(COMPONENT_KEYS.CONFIG);
      const scheduler = this.container.get(COMPONENT_KEYS.SCHEDULER);
      
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
}