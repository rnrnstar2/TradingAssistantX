/**
 * 30分間隔制御システム
 * REQUIREMENTS.md準拠版 - 定期自動実行スケジューラー
 */

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

export interface ExecutionCallback {
  (): Promise<{ success: boolean; duration: number; error?: string }>;
}

/**
 * 30分間隔制御システムクラス
 * 定期的な自動実行を管理し、実行頻度とタイミングを制御
 */
export class CoreScheduler {
  private config: SchedulerConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private executionCallback: ExecutionCallback | null = null;
  private scheduleStatus!: ScheduleStatus;

  private readonly DEFAULT_CONFIG: SchedulerConfig = {
    intervalMinutes: 30,
    maxDailyExecutions: 48, // 30分間隔で24時間 = 48回
    enableGracefulShutdown: true,
    timezone: 'Asia/Tokyo',
    executionWindow: {
      start: '07:00',
      end: '23:00'
    }
  };

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
    this.initializeScheduleStatus();
    console.log('✅ CoreScheduler initialized - REQUIREMENTS.md準拠版:', {
      intervalMinutes: this.config.intervalMinutes,
      maxDailyExecutions: this.config.maxDailyExecutions
    });
  }

  /**
   * スケジューラー開始
   */
  start(callback?: ExecutionCallback): void {
    if (this.isRunning) {
      console.warn('⚠️ Scheduler is already running');
      return;
    }

    if (callback) {
      this.executionCallback = callback;
    }

    if (!this.executionCallback) {
      throw new Error('Execution callback is required to start scheduler');
    }

    console.log('🚀 Starting 30-minute interval scheduler...');
    
    this.isRunning = true;
    this.scheduleStatus.isRunning = true;
    
    // 即座に最初の実行をチェック
    this.scheduleNextExecution();
    
    // グレースフルシャットダウン設定
    if (this.config.enableGracefulShutdown) {
      this.setupGracefulShutdown();
    }

    console.log('✅ Scheduler started successfully');
  }

  /**
   * スケジューラー停止
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('⚠️ Scheduler is already stopped');
      return;
    }

    console.log('⏹️ Stopping scheduler...');
    
    this.isRunning = false;
    this.scheduleStatus.isRunning = false;

    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ Scheduler stopped successfully');
  }

  /**
   * 実行コールバック設定
   */
  setExecutionCallback(callback: ExecutionCallback): void {
    this.executionCallback = callback;
  }

  /**
   * スケジュール状況取得
   */
  getStatus(): ScheduleStatus {
    return { ...this.scheduleStatus };
  }

  /**
   * 次回実行を手動トリガー（テスト用）
   */
  async triggerExecution(): Promise<void> {
    if (!this.executionCallback) {
      throw new Error('No execution callback set');
    }

    console.log('🔄 Manual execution triggered');
    await this.executeScheduledTask();
  }

  /**
   * 設定更新
   */
  updateConfig(newConfig: Partial<SchedulerConfig>): void {
    const oldInterval = this.config.intervalMinutes;
    this.config = { ...this.config, ...newConfig };

    console.log('⚙️ Scheduler config updated:', newConfig);

    // インターバルが変更された場合、スケジュールを再設定
    if (newConfig.intervalMinutes && newConfig.intervalMinutes !== oldInterval) {
      if (this.isRunning) {
        this.stop();
        this.start();
      }
    }
  }

  /**
   * 実行履歴統計取得
   */
  getExecutionStats(): {
    totalExecutions: number;
    executionsToday: number;
    successRate: number;
    averageExecutionTime: number;
    lastExecutionStatus: 'success' | 'failure' | 'never';
  } {
    // 簡易統計（実装は拡張可能）
    return {
      totalExecutions: this.scheduleStatus.totalExecutions,
      executionsToday: this.scheduleStatus.executionsToday,
      successRate: 0.95, // 仮の値
      averageExecutionTime: 2500, // ms
      lastExecutionStatus: this.scheduleStatus.lastExecution ? 'success' : 'never'
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

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
    if (!this.isRunning) {
      return;
    }

    const nextExecutionTime = this.calculateNextExecutionTime();
    const delay = nextExecutionTime.getTime() - Date.now();

    console.log(`⏰ Next execution scheduled for: ${nextExecutionTime.toLocaleString('ja-JP', { timeZone: this.config.timezone })}`);
    console.log(`⏱️ Time until next execution: ${Math.round(delay / 60000)} minutes`);

    this.scheduleStatus.nextExecution = nextExecutionTime.toISOString();

    this.intervalId = setTimeout(async () => {
      if (this.isRunning) {
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
    if (!this.executionCallback) {
      console.error('❌ No execution callback set');
      return;
    }

    // 日次実行制限チェック
    if (this.scheduleStatus.executionsToday >= this.config.maxDailyExecutions) {
      console.log('⏭️ Daily execution limit reached, skipping');
      return;
    }

    // 実行時間窓チェック
    if (!this.isWithinExecutionWindow()) {
      console.log('⏭️ Outside execution window, skipping');
      return;
    }

    const startTime = Date.now();
    
    try {
      console.log('🚀 Executing scheduled task...');
      
      const result = await this.executionCallback();
      const duration = Date.now() - startTime;

      // 統計更新
      this.updateExecutionStats(result.success, duration);

      if (result.success) {
        console.log(`✅ Scheduled task completed successfully in ${duration}ms`);
      } else {
        console.error(`❌ Scheduled task failed: ${result.error || 'Unknown error'}`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateExecutionStats(false, duration);
      
      console.error('❌ Scheduled task execution error:', error);
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

  private updateExecutionStats(success: boolean, duration: number): void {
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
      console.log('📅 New day detected, resetting daily counters');
      this.scheduleStatus.executionsToday = 0;
      this.scheduleStatus.remainingToday = this.config.maxDailyExecutions;
    }
  }

  private setupGracefulShutdown(): void {
    const shutdownHandler = () => {
      console.log('📧 Shutdown signal received, gracefully stopping scheduler...');
      this.stop();
      process.exit(0);
    };

    // 複数のシャットダウンシグナルに対応
    process.on('SIGINT', shutdownHandler);  // Ctrl+C
    process.on('SIGTERM', shutdownHandler); // Termination signal
    process.on('SIGQUIT', shutdownHandler); // Quit signal

    // プロセス終了前の最終処理
    process.on('beforeExit', () => {
      if (this.isRunning) {
        console.log('🔄 Process exiting, stopping scheduler...');
        this.stop();
      }
    });

    console.log('🛡️ Graceful shutdown handlers registered');
  }

  /**
   * デバッグ情報取得
   */
  getDebugInfo(): {
    config: SchedulerConfig;
    status: ScheduleStatus;
    systemInfo: {
      nodeVersion: string;
      platform: string;
      uptime: number;
    };
  } {
    return {
      config: this.config,
      status: this.scheduleStatus,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime()
      }
    };
  }

  /**
   * 強制実行（緊急時用）
   */
  async forceExecution(): Promise<void> {
    if (!this.executionCallback) {
      throw new Error('No execution callback set');
    }

    console.log('🚨 Force execution triggered (emergency mode)');
    
    try {
      const result = await this.executionCallback();
      const duration = Date.now() - Date.now();
      
      this.updateExecutionStats(result.success, duration);
      
      console.log('🚨 Force execution completed:', { success: result.success });
      
    } catch (error) {
      console.error('🚨 Force execution failed:', error);
      throw error;
    }
  }
}