import { systemLogger } from '../../shared/logger';
import { CommonErrorHandler } from './common-error-handler';
import { TypeGuards } from './type-guards';
import { WorkflowLogger } from './workflow-logger';
import { WORKFLOW_CONSTANTS } from './workflow-constants';

// ===================================================================
// CoreScheduler統合型定義
// ===================================================================

export interface SchedulerConfig {
  intervalMinutes: number;
  maxDailyExecutions: number;
  enableGracefulShutdown: boolean;
  timezone: string;
  executionWindow: {
    start: string; // "07:00"
    end: string;   // "23:00"
  };
}

export interface ScheduleStatus {
  isRunning: boolean;
  currentInterval: number;
  nextExecution: string;
  lastExecution?: string;
  executionsToday: number;
  remainingToday: number;
  totalExecutions: number;
}

export type ExecutionCallback = () => Promise<{ success: boolean; duration: number; error?: string }>;

/**
 * SchedulerCore - 内蔵スケジューラー基本機能
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • 内蔵スケジューラーの起動・停止・設定管理
 * • 30分間隔でのスケジューリング制御
 * • スケジュール状態の監視・報告
 * • 実行時間窓の制御・日次制限の管理
 * 
 * 🔗 主要機能:
 * • start() - スケジューラー開始
 * • stop() - スケジューラー停止
 * • scheduleNextExecution() - 次回実行スケジューリング
 * • calculateNextExecutionTime() - 次回実行時刻計算
 * • executeScheduledTask() - スケジュールされたタスク実行
 */
export class SchedulerCore {
  private isSchedulerRunning: boolean = false;
  private config: SchedulerConfig;
  private intervalId: ReturnType<typeof setTimeout> | null = null;
  private executionCallback: ExecutionCallback | null = null;
  private scheduleStatus!: ScheduleStatus;

  private readonly DEFAULT_CONFIG: SchedulerConfig = {
    intervalMinutes: WORKFLOW_CONSTANTS.SCHEDULER.DEFAULT_INTERVAL_MINUTES,
    maxDailyExecutions: WORKFLOW_CONSTANTS.SCHEDULER.MAX_DAILY_EXECUTIONS,
    enableGracefulShutdown: WORKFLOW_CONSTANTS.SCHEDULER.GRACEFUL_SHUTDOWN_ENABLED,
    timezone: WORKFLOW_CONSTANTS.SCHEDULER.TIMEZONE,
    executionWindow: {
      start: WORKFLOW_CONSTANTS.SCHEDULER.EXECUTION_WINDOW.start,
      end: WORKFLOW_CONSTANTS.SCHEDULER.EXECUTION_WINDOW.end
    }
  };

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.initializeScheduleStatus();
    WorkflowLogger.logSuccess('SchedulerCore初期化完了');
  }

  // ===================================================================
  // 公開メソッド - SchedulerManagerから呼び出される
  // ===================================================================

  /**
   * 内蔵スケジューラー開始
   */
  start(): void {
    if (this.isSchedulerRunning) {
      WorkflowLogger.logWarning(WORKFLOW_CONSTANTS.ERROR_MESSAGES.SCHEDULER_ALREADY_RUNNING);
      return;
    }

    if (!TypeGuards.isFunction(this.executionCallback)) {
      throw new Error(WORKFLOW_CONSTANTS.ERROR_MESSAGES.EXECUTION_CALLBACK_MISSING);
    }

    WorkflowLogger.logInfo(WORKFLOW_CONSTANTS.LOG_MESSAGES.SCHEDULER_START);
    
    this.isSchedulerRunning = true;
    this.scheduleStatus.isRunning = true;
    
    // 即座に最初の実行をチェック
    this.scheduleNextExecution();
    
    WorkflowLogger.logSuccess('スケジューラー開始完了');
  }

  /**
   * 内蔵スケジューラー停止
   */
  stop(): void {
    if (!this.isSchedulerRunning) {
      WorkflowLogger.logWarning(WORKFLOW_CONSTANTS.ERROR_MESSAGES.SCHEDULER_NOT_RUNNING);
      return;
    }

    WorkflowLogger.logInfo(WORKFLOW_CONSTANTS.LOG_MESSAGES.SCHEDULER_STOP);
    
    this.isSchedulerRunning = false;
    this.scheduleStatus.isRunning = false;

    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }

    WorkflowLogger.logSuccess('スケジューラー停止完了');
  }

  /**
   * 実行コールバック設定
   */
  setExecutionCallback(callback: ExecutionCallback): void {
    this.executionCallback = callback;
  }

  /**
   * スケジュール状態取得
   */
  getStatus(): ScheduleStatus {
    return { ...this.scheduleStatus };
  }

  /**
   * 設定更新
   */
  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    const oldInterval = this.config.intervalMinutes;
    this.config = { ...this.config, ...newConfig };

    systemLogger.info('⚙️ Scheduler config updated:', newConfig);

    // インターバルが変更された場合、スケジュールを再設定
    if (newConfig.intervalMinutes && newConfig.intervalMinutes !== oldInterval) {
      if (this.isSchedulerRunning) {
        this.stop();
        this.start();
      }
    }
  }

  /**
   * 次回実行を手動トリガー（テスト用）
   */
  async triggerExecution(): Promise<void> {
    if (!this.executionCallback) {
      throw new Error('No execution callback set');
    }

    systemLogger.info('🔄 Manual execution triggered');
    await this.executeScheduledTask();
  }

  /**
   * グレースフルシャットダウンの設定
   */
  setupGracefulShutdown(): void {
    const shutdownHandler = () => {
      systemLogger.info('📧 Shutdown signal received, gracefully stopping scheduler...');
      this.stop();
      process.exit(0);
    };

    // 複数のシャットダウンシグナルに対応
    process.on('SIGINT', shutdownHandler);  // Ctrl+C
    process.on('SIGTERM', shutdownHandler); // Termination signal
    process.on('SIGQUIT', shutdownHandler); // Quit signal

    // プロセス終了前の最終処理
    process.on('beforeExit', () => {
      if (this.isSchedulerRunning) {
        systemLogger.info('🔄 Process exiting, stopping scheduler...');
        this.stop();
      }
    });

    systemLogger.info('🛡️ Graceful shutdown handlers registered');
  }

  // ===================================================================
  // スケジューリングロジック - コア機能
  // ===================================================================

  private initializeScheduleStatus(): void {
    this.scheduleStatus = {
      isRunning: false,
      currentInterval: this.config.intervalMinutes,
      nextExecution: this.calculateNextExecutionTime().toISOString(),
      executionsToday: 0,
      remainingToday: this.config.maxDailyExecutions,
      totalExecutions: 0
    };
  }

  private scheduleNextExecution(): void {
    if (!this.isSchedulerRunning) {
      return;
    }

    const nextExecutionTime = this.calculateNextExecutionTime();
    const delay = nextExecutionTime.getTime() - Date.now();

    systemLogger.info(`⏰ Next execution scheduled for: ${nextExecutionTime.toLocaleString('ja-JP', { timeZone: this.config.timezone })}`);
    systemLogger.info(`⏱️ Time until next execution: ${Math.round(delay / 60000)} minutes`);

    this.scheduleStatus.nextExecution = nextExecutionTime.toISOString();

    this.intervalId = setTimeout(async () => {
      if (this.isSchedulerRunning) {
        await this.executeScheduledTask();
        this.scheduleNextExecution(); // 次の実行をスケジュール
      }
    }, delay);
  }

  private calculateNextExecutionTime(): Date {
    const now = new Date();
    const nextExecution = new Date(now.getTime() + this.config.intervalMinutes * 60 * 1000);

    // 実行時間窓の制限をチェック
    const executionHour = nextExecution.getHours();
    const startHour = parseInt(this.config.executionWindow.start.split(':')[0]);
    const endHour = parseInt(this.config.executionWindow.end.split(':')[0]);

    // 実行時間窓外の場合は次の開始時間まで調整
    if (executionHour < startHour || executionHour >= endHour) {
      const nextDay = executionHour >= endHour;
      const targetDate = nextDay ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : now;
      
      targetDate.setHours(startHour, 0, 0, 0);
      return targetDate;
    }

    return nextExecution;
  }

  private async executeScheduledTask(): Promise<void> {
    if (!TypeGuards.isFunction(this.executionCallback)) {
      WorkflowLogger.logError('実行コールバックが設定されていません');
      return;
    }

    // 日次実行制限チェック
    if (this.scheduleStatus.executionsToday >= this.config.maxDailyExecutions) {
      WorkflowLogger.logInfo('日次実行制限に達したため、スキップします');
      return;
    }

    // 実行時間窓チェック
    if (!this.isWithinExecutionWindow()) {
      WorkflowLogger.logInfo('実行時間窓外のため、スキップします');
      return;
    }

    const result = await CommonErrorHandler.handleTimedOperation(
      () => this.executionCallback!(),
      'スケジュールタスク実行'
    );

    // 統計更新
    this.updateExecutionStats(result.result?.success || false, result.duration);

    if (result.result?.success) {
      WorkflowLogger.logSuccess(`スケジュールタスク実行完了 (${result.duration}ms)`);
    } else {
      WorkflowLogger.logError(`スケジュールタスク失敗: ${result.result?.error || WORKFLOW_CONSTANTS.ERROR_MESSAGES.UNKNOWN_ERROR}`);
    }
  }

  private isWithinExecutionWindow(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const startHour = parseInt(this.config.executionWindow.start.split(':')[0]);
    const startMinute = parseInt(this.config.executionWindow.start.split(':')[1]);
    const endHour = parseInt(this.config.executionWindow.end.split(':')[0]);
    const endMinute = parseInt(this.config.executionWindow.end.split(':')[1]);

    const currentTime = currentHour * 60 + currentMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    return currentTime >= startTime && currentTime < endTime;
  }

  private updateExecutionStats(_success: boolean, _duration: number): void {
    this.scheduleStatus.totalExecutions++;
    this.scheduleStatus.executionsToday++;
    this.scheduleStatus.remainingToday = Math.max(0, this.config.maxDailyExecutions - this.scheduleStatus.executionsToday);
    this.scheduleStatus.lastExecution = new Date().toISOString();

    // 日付が変わった場合は日次カウンターをリセット
    this.resetDailyCountersIfNeeded();
  }

  private resetDailyCountersIfNeeded(): void {
    const now = new Date();
    const lastExecutionDate = this.scheduleStatus.lastExecution 
      ? new Date(this.scheduleStatus.lastExecution).toDateString()
      : '';
    
    if (now.toDateString() !== lastExecutionDate) {
      systemLogger.info('📅 New day detected, resetting daily counters');
      this.scheduleStatus.executionsToday = 0;
      this.scheduleStatus.remainingToday = this.config.maxDailyExecutions;
    }
  }
}