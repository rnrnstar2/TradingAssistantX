import { Logger, systemLogger } from '../shared/logger';
import { Config } from '../shared/config';
import { CoreScheduler } from '../scheduler/core-scheduler';
import { MainLoop } from '../scheduler/main-loop';

interface SystemStatusReport {
  initialized: boolean;
  scheduler: any;
  mainLoop: any;
  lastHealthCheck: string;
}

export class SystemStatus {
  private logger: Logger;

  constructor() {
    this.logger = systemLogger;
  }

  /**
   * システム状態取得
   */
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

  /**
   * 手動実行トリガー（デバッグ用）
   */
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

  /**
   * 設定リロード
   */
  async reloadConfiguration(
    config: Config,
    scheduler: CoreScheduler
  ): Promise<void> {
    try {
      this.logger.info('🔄 設定リロード中...');
      
      // 設定ファイル再読み込み
      await config.reloadConfig();
      
      // スケジューラー設定更新
      const newSchedulerConfig = config.getSchedulerConfig();
      scheduler.updateConfig(newSchedulerConfig);
      
      this.logger.success('✅ 設定リロード完了');

    } catch (error) {
      this.logger.error('❌ 設定リロードエラー:', error);
      throw error;
    }
  }
}