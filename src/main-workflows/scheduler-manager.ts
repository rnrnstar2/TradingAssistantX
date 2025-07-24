import { systemLogger } from '../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../shared/component-container';
import { Config } from '../shared/config';
import { CoreScheduler } from '../scheduler/core-scheduler';
import { ExecutionResult } from '../shared/types';

/**
 * スケジューラー管理・30分間隔実行制御
 * main.tsから分離されたスケジュール管理専用クラス
 */
export class SchedulerManager {
  private container: ComponentContainer;
  private isSchedulerRunning: boolean = false;

  constructor(container: ComponentContainer) {
    this.container = container;
  }

  /**
   * スケジューラー起動ワークフロー
   */
  startScheduler(executeCallback: () => Promise<ExecutionResult>): void {
    try {
      // ===================================================================
      // スケジューラー起動ワークフロー
      // ===================================================================
      
      systemLogger.info('⚙️ 【スケジューラー起動ステップ1】設定読み込み開始');
      const config = this.container.get<Config>(COMPONENT_KEYS.CONFIG);
      const scheduler = this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER);
      
      const schedulerConfig = config.getSchedulerConfig();
      systemLogger.info('✅ スケジューラー設定読み込み完了');

      systemLogger.info('🔧 【スケジューラー起動ステップ2】スケジューラー設定開始');
      scheduler.updateConfig(schedulerConfig);
      scheduler.setExecutionCallback(executeCallback);
      systemLogger.info('✅ スケジューラー設定完了');

      systemLogger.info('▶️ 【スケジューラー起動ステップ3】スケジューラー開始');
      scheduler.start();
      this.isSchedulerRunning = true;
      
      systemLogger.success('⏰ スケジューラー開始完了 - 30分毎ワークフロー実行開始:', {
        interval: `${schedulerConfig.intervalMinutes}分間隔`,
        maxDaily: `最大${schedulerConfig.maxDailyExecutions}回/日`,
        workflow: '【データ読み込み→Claude判断→アクション実行→結果記録】',
        status: 'RUNNING'
      });

    } catch (error) {
      systemLogger.error('❌ スケジューラー起動失敗:', error);
      this.isSchedulerRunning = false;
      throw error;
    }
  }

  /**
   * スケジューラー停止ワークフロー
   */
  stopScheduler(): void {
    try {
      systemLogger.info('⏹️ スケジューラー停止開始');
      
      if (this.container.has(COMPONENT_KEYS.SCHEDULER)) {
        const scheduler = this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER);
        scheduler.stop();
        this.isSchedulerRunning = false;
        systemLogger.success('✅ スケジューラー停止完了');
      } else {
        systemLogger.info('ℹ️ スケジューラーは既に停止済み');
      }

    } catch (error) {
      systemLogger.error('❌ スケジューラー停止エラー:', error);
      this.isSchedulerRunning = false;
    }
  }

  /**
   * スケジューラー状態取得
   */
  getSchedulerStatus(): {
    running: boolean;
    config?: { intervalMinutes: number; maxDailyExecutions: number };
    nextExecution?: string;
  } {
    try {
      if (!this.container.has(COMPONENT_KEYS.SCHEDULER)) {
        return { running: false };
      }

      const config = this.container.get<Config>(COMPONENT_KEYS.CONFIG);
      
      return {
        running: this.isSchedulerRunning,
        config: config.getSchedulerConfig(),
        nextExecution: new Date(Date.now() + (config.getSchedulerConfig().intervalMinutes * 60 * 1000)).toISOString()
      };

    } catch (error) {
      systemLogger.error('❌ スケジューラー状態取得エラー:', error);
      return { running: false };
    }
  }

  /**
   * スケジューラー設定リロード
   */
  async reloadSchedulerConfig(): Promise<void> {
    try {
      systemLogger.info('🔄 スケジューラー設定リロード開始');
      
      const config = this.container.get<Config>(COMPONENT_KEYS.CONFIG);
      await config.reloadConfig();
      
      if (this.isSchedulerRunning) {
        const scheduler = this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER);
        const newSchedulerConfig = config.getSchedulerConfig();
        scheduler.updateConfig(newSchedulerConfig);
        
        systemLogger.success('✅ スケジューラー設定リロード完了:', {
          interval: `${newSchedulerConfig.intervalMinutes}分間隔`,
          maxDaily: `最大${newSchedulerConfig.maxDailyExecutions}回/日`
        });
      } else {
        systemLogger.info('ℹ️ スケジューラー未実行のため設定のみリロード完了');
      }

    } catch (error) {
      systemLogger.error('❌ スケジューラー設定リロードエラー:', error);
      throw error;
    }
  }
}