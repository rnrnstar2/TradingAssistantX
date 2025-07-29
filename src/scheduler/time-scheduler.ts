import { MainWorkflow } from '../workflows/main-workflow';
import { ScheduleLoader } from './schedule-loader';
import { ScheduleItem } from './types';

export class TimeScheduler {
  private scheduleItems: ScheduleItem[] = [];
  private running: boolean = false;

  async start(): Promise<void> {
    console.log('⏰ スケジューラー起動');
    
    // スケジュール読み込み
    const config = ScheduleLoader.load();
    this.scheduleItems = ScheduleLoader.getTodaySchedule(config);
    
    console.log(`📅 本日のスケジュール: ${this.scheduleItems.length}件`);
    this.running = true;
    
    // 実行ループ
    while (this.running) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      // 該当時刻のタスクを検索
      const taskToRun = this.scheduleItems.find(item => item.time === currentTime);
      
      if (taskToRun) {
        console.log(`🎯 実行時刻: ${currentTime} - アクション: ${taskToRun.action}`);
        
        try {
          // MainWorkflowに追加パラメータを渡して実行
          await MainWorkflow.execute({
            scheduledAction: taskToRun.action,
            scheduledTopic: taskToRun.topic,
            scheduledQuery: taskToRun.target_query
          });
        } catch (error) {
          console.error(`❌ スケジュール実行エラー:`, error);
        }
      }
      
      // 1分待機
      await this.sleep(60000);
    }
  }

  stop(): void {
    this.running = false;
    console.log('⏹️ スケジューラー停止');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}