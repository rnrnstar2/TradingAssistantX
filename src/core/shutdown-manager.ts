import { Logger, systemLogger } from '../shared/logger';
import { CoreScheduler } from '../scheduler/core-scheduler';
import { DataManager } from '../data/data-manager';

export class ShutdownManager {
  private logger: Logger;

  constructor() {
    this.logger = systemLogger;
  }

  /**
   * グレースフルシャットダウン実行
   */
  async gracefulShutdown(
    scheduler: CoreScheduler | null,
    dataManager: DataManager | null
  ): Promise<void> {
    try {
      this.logger.info('🛑 グレースフルシャットダウン開始');

      // スケジューラー停止
      if (scheduler) {
        await this.stopScheduler(scheduler);
      }

      // 最終データ保存
      if (dataManager) {
        await this.saveFinalData(dataManager);
      }

      this.logger.success('✅ グレースフルシャットダウン完了');

    } catch (error) {
      this.logger.error('❌ シャットダウンエラー:', error);
      // エラーが発生してもシャットダウンは継続
    }
  }

  private async stopScheduler(scheduler: CoreScheduler): Promise<void> {
    try {
      scheduler.stop();
      this.logger.info('⏹️ Scheduler stopped');
    } catch (error) {
      this.logger.error('❌ Scheduler停止エラー:', error);
      // エラーログのみ記録、処理は継続
    }
  }

  private async saveFinalData(dataManager: DataManager): Promise<void> {
    try {
      // 現在の状態を記録（既存ロジックと同じ）
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
      // エラーログのみ記録、シャットダウンは継続
    }
  }
}