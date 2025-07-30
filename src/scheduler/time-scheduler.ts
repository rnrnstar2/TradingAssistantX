import { MainWorkflow } from '../workflows/main-workflow';
import { ScheduleLoader } from './schedule-loader';
import { 
  ScheduleItem, 
  ExecutionStats, 
  ExtendedExecutionStats,
  ErrorRecord, 
  SchedulerConfig,
  ScheduleLoadError,
  ScheduleExecutionError,
  ActionType 
} from './types';

/**
 * 時刻ベーススケジューラー - 定時実行・エラーハンドリング・統計機能付き
 */
export class TimeScheduler {
  // ====================================================================
  // PRIVATE PROPERTIES
  // ====================================================================
  
  private scheduleItems: ScheduleItem[] = [];
  private running: boolean = false;
  private lastConfigCheck: Date = new Date();
  
  // 実行統計
  private executionStats: ExtendedExecutionStats = {
    totalExecutions: 0,
    successCount: 0,
    errorCount: 0,
    averageExecutionTime: 0,
    errorHistory: []
  };
  
  // TODO: 深夜大規模分析状態管理 - 実装待ち
  
  // スケジューラー設定（デフォルト値）
  private config: SchedulerConfig = {
    configReloadInterval: 60 * 60 * 1000, // 1時間
    executionInterval: 60 * 1000,         // 1分
    maxErrorHistory: 10,
    enableDetailedLogging: true
  };
  
  // プロセス識別
  private readonly processId: string;
  
  // ====================================================================
  // CONSTRUCTOR
  // ====================================================================
  
  constructor(config?: Partial<SchedulerConfig>) {
    this.processId = `scheduler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    console.log(`🏗️  TimeScheduler初期化完了 - PID: ${this.processId}`);
  }
  
  // ====================================================================
  // PUBLIC METHODS
  // ====================================================================
  
  /**
   * スケジューラー開始
   * @returns Promise<void>
   */
  async start(): Promise<void> {
    const startupTime = Date.now();
    
    try {
      console.log(`⏰ スケジューラー起動開始 - PID: ${this.processId}`);
      console.log(`⚙️  設定: 設定再読み込み間隔=${this.config.configReloadInterval/1000/60}分, 実行間隔=${this.config.executionInterval/1000}秒`);
      
      // 初期設定読み込み
      await this.loadScheduleConfig();
      
      // 統計初期化
      this.initializeStats();
      
      // 実行フラグ設定
      this.running = true;
      
      const startupDuration = Date.now() - startupTime;
      console.log(`✅ スケジューラー起動完了 - 起動時間: ${startupDuration}ms`);
      
      // メインループ開始
      await this.mainExecutionLoop();
      
    } catch (error) {
      const startupDuration = Date.now() - startupTime;
      console.error(`❌ スケジューラー起動失敗 - 起動時間: ${startupDuration}ms`);
      this.handleSchedulerError(error as Error, 'STARTUP_ERROR');
      throw error;
    }
  }
  
  /**
   * スケジューラー停止
   */
  stop(): void {
    this.running = false;
    this.logExecutionStats();
    console.log(`⏹️  スケジューラー停止 - PID: ${this.processId}`);
  }
  
  /**
   * 実行統計の取得
   * @returns ExecutionStats
   */
  getExecutionStats(): ExecutionStats {
    return { ...this.executionStats };
  }
  
  /**
   * 現在のスケジュールアイテム取得
   * @returns ScheduleItem[]
   */
  getCurrentSchedule(): ScheduleItem[] {
    return [...this.scheduleItems];
  }
  
  // ====================================================================
  // PRIVATE METHODS - メインループ
  // ====================================================================
  
  /**
   * メイン実行ループ
   */
  private async mainExecutionLoop(): Promise<void> {
    while (this.running) {
      const loopStartTime = Date.now();
      
      try {
        // 設定の定期再読み込みチェック
        await this.checkAndReloadConfig();
        
        // 時刻チェックと実行
        await this.processScheduledTasks();
        
        // 統計更新
        this.updateLoopStats(loopStartTime);
        
      } catch (error) {
        // 個別エラーハンドリング - ループは継続
        this.handleSchedulerError(error as Error, 'LOOP_ERROR');
      }
      
      // 実行間隔での待機
      await this.sleep(this.config.executionInterval);
    }
  }
  
  /**
   * スケジュールされたタスクの処理
   */
  private async processScheduledTasks(): Promise<void> {
    const now = new Date();
    const currentTime = this.formatCurrentTime(now);
    
    // TODO: 深夜大規模分析実行中の処理 - 実装待ち
    
    // 該当時刻のタスクを検索
    const taskToRun = this.scheduleItems.find(item => item.time === currentTime);
    
    if (!taskToRun) {
      // 該当なしの場合は詳細ログのみ
      if (this.config.enableDetailedLogging) {
        console.log(`🔍 時刻チェック: ${currentTime} - 該当タスクなし`);
      }
      return;
    }
    
    // TODO: 23:55時刻の特別処理判定 - 実装待ち
    
    // 通常タスクの実行
    console.log(`🎯 実行時刻: ${currentTime} - アクション: ${taskToRun.action} - トピック: ${taskToRun.topic || 'なし'}`);
    await this.executeScheduledTask(taskToRun, currentTime);
  }
  
  /**
   * 個別タスクの実行
   */
  private async executeScheduledTask(task: ScheduleItem, currentTime: string): Promise<void> {
    const executionId = `exec_${Date.now()}_${task.action}`;
    const executionStartTime = Date.now();
    
    try {
      console.log(`⚡ MainWorkflow実行開始 - ExecutionID: ${executionId}`);
      
      // WorkflowOptionsの型安全な構築
      const workflowOptions = this.buildWorkflowOptions(task);
      
      // MainWorkflow実行
      const result = await MainWorkflow.execute(workflowOptions);
      
      const executionTime = Date.now() - executionStartTime;
      
      // 成功処理
      this.handleTaskSuccess(task, result, executionTime, executionId);
      
    } catch (error) {
      const executionTime = Date.now() - executionStartTime;
      
      // エラー処理
      this.handleTaskError(task, error as Error, executionTime, executionId);
    }
  }
  
  /**
   * 深夜大規模分析タスクの実行（23:55専用）
   * TODO: 深夜分析機能の実装待ち
   */
  private async executeDeepNightAnalysisTask(task: ScheduleItem, currentTime: string): Promise<void> {
    throw new Error('Deep night analysis is not implemented yet');
  }
  
  // ====================================================================
  // PRIVATE METHODS - 設定管理
  // ====================================================================
  
  /**
   * スケジュール設定の読み込み
   */
  private async loadScheduleConfig(): Promise<void> {
    const loadStartTime = Date.now();
    
    try {
      console.log('📄 スケジュール設定読み込み開始');
      
      const config = ScheduleLoader.load();
      this.scheduleItems = ScheduleLoader.getTodaySchedule(config);
      this.lastConfigCheck = new Date();
      
      const loadTime = Date.now() - loadStartTime;
      console.log(`📅 本日のスケジュール読み込み完了: ${this.scheduleItems.length}件 - 読み込み時間: ${loadTime}ms`);
      
      // スケジュール概要ログ
      this.logScheduleOverview();
      
    } catch (error) {
      const loadTime = Date.now() - loadStartTime;
      console.error(`❌ スケジュール設定読み込みエラー: ${loadTime}ms`);
      throw new ScheduleLoadError(
        `スケジュール設定の読み込みに失敗しました: ${(error as Error).message}`,
        error as Error
      );
    }
  }
  
  /**
   * 設定の定期再読み込みチェック
   */
  private async checkAndReloadConfig(): Promise<void> {
    const now = new Date();
    const timeSinceLastCheck = now.getTime() - this.lastConfigCheck.getTime();
    
    if (timeSinceLastCheck < this.config.configReloadInterval) {
      return; // 再読み込み間隔未満の場合はスキップ
    }
    
    try {
      console.log('🔄 スケジュール設定の定期再読み込み開始');
      await this.loadScheduleConfig();
      
    } catch (error) {
      // 再読み込みエラーは既存設定で継続
      console.warn(`⚠️  設定再読み込みに失敗しました。既存設定で継続します: ${(error as Error).message}`);
      this.lastConfigCheck = now; // 次回再試行のためタイムスタンプは更新
    }
  }
  
  // ====================================================================
  // PRIVATE METHODS - WorkflowOptions構築
  // ====================================================================
  
  /**
   * 型安全なWorkflowOptionsの構築
   */
  private buildWorkflowOptions(task: ScheduleItem): {
    scheduledAction?: string;
    scheduledTopic?: string;
    scheduledQuery?: string;
  } {
    // 明示的な型安全性確保
    const options: {
      scheduledAction?: string;
      scheduledTopic?: string;
      scheduledQuery?: string;
    } = {
      scheduledAction: task.action,
      scheduledTopic: task.topic || undefined,
      scheduledQuery: task.target_query || undefined
    };
    
    // ログ出力（デバッグ用）
    if (this.config.enableDetailedLogging) {
      console.log('🔧 WorkflowOptions構築:', {
        scheduledAction: options.scheduledAction,
        scheduledTopic: options.scheduledTopic ? '設定済み' : '未設定',  
        scheduledQuery: options.scheduledQuery ? '設定済み' : '未設定'
      });
    }
    
    return options;
  }
  
  // ====================================================================
  // PRIVATE METHODS - 結果処理
  // ====================================================================
  
  /**
   * タスク成功時の処理
   */
  private handleTaskSuccess(
    task: ScheduleItem, 
    result: any, 
    executionTime: number, 
    executionId: string
  ): void {
    console.log(`✅ MainWorkflow実行完了 - ExecutionID: ${executionId} - 実行時間: ${executionTime}ms - 結果: success`);
    
    // 統計更新
    this.executionStats.totalExecutions++;
    this.executionStats.successCount++;
    this.executionStats.lastExecutionTime = new Date();
    this.updateAverageExecutionTime(executionTime);
    
    // 詳細ログ
    if (this.config.enableDetailedLogging) {
      console.log(`📊 実行統計更新: 成功=${this.executionStats.successCount}/${this.executionStats.totalExecutions}, 平均実行時間=${Math.round(this.executionStats.averageExecutionTime)}ms`);
    }
  }
  
  /**
   * タスクエラー時の処理
   */
  private handleTaskError(
    task: ScheduleItem, 
    error: Error, 
    executionTime: number, 
    executionId: string
  ): void {
    console.error(`❌ MainWorkflow実行エラー - ExecutionID: ${executionId} - 実行時間: ${executionTime}ms - エラー: ${error.message}`);
    
    // エラー記録
    const errorRecord: ErrorRecord = {
      timestamp: new Date(),
      errorType: error.constructor.name,
      message: error.message,
      action: task.action,
      recoveryAction: 'continue_scheduler',
      stackTrace: this.config.enableDetailedLogging ? error.stack : undefined
    };
    
    // 統計更新
    this.executionStats.totalExecutions++;
    this.executionStats.errorCount++;
    this.executionStats.lastExecutionTime = new Date();
    this.updateAverageExecutionTime(executionTime);
    this.addErrorRecord(errorRecord);
    
    // 継続動作ログ
    console.log(`🔄 スケジューラー継続動作 - エラー統計: ${this.executionStats.errorCount}/${this.executionStats.totalExecutions}`);
  }
  
  /**
   * 深夜大規模分析成功時の処理
   * TODO: 深夜分析機能の実装待ち
   */
  private handleDeepNightAnalysisSuccess(
    task: ScheduleItem,
    result: any,
    executionTime: number,
    executionId: string
  ): void {
    // TODO: 深夜分析機能の実装待ち
  }

  /**
   * 深夜大規模分析エラー時の処理
   * TODO: 深夜分析機能の実装待ち
   */
  private handleDeepNightAnalysisError(
    task: ScheduleItem,
    error: Error,
    executionTime: number,
    executionId: string
  ): void {
    // TODO: 深夜分析機能の実装待ち
  }
  
  // ====================================================================
  // PRIVATE METHODS - エラーハンドリング
  // ====================================================================
  
  /**
   * スケジューラーレベルのエラーハンドリング
   */
  private handleSchedulerError(error: Error, errorType: string): void {
    console.error(`🚨 スケジューラーエラー [${errorType}]:`, error.message);
    
    const errorRecord: ErrorRecord = {
      timestamp: new Date(),
      errorType,
      message: error.message,
      recoveryAction: 'continue_scheduler',
      stackTrace: this.config.enableDetailedLogging ? error.stack : undefined
    };
    
    this.addErrorRecord(errorRecord);
    
    // 致命的エラーの判定
    if (this.isFatalError(error, errorType)) {
      console.error(`💀 致命的エラーが発生しました。スケジューラーを停止します。`);
      this.running = false;
      throw error;
    }
    
    console.log(`🔄 エラーから復旧してスケジューラーを継続します`);
  }
  
  /**
   * 致命的エラーの判定
   */
  private isFatalError(error: Error, errorType: string): boolean {
    // 致命的エラーの条件
    if (errorType === 'STARTUP_ERROR') return true;
    if (error instanceof ScheduleLoadError && errorType === 'LOOP_ERROR') {
      // 設定読み込みエラーが連続で発生する場合
      const recentLoadErrors = this.executionStats.errorHistory
        .filter(record => record.errorType === 'ScheduleLoadError')
        .filter(record => Date.now() - record.timestamp.getTime() < 10 * 60 * 1000); // 10分以内
      
      return recentLoadErrors.length >= 3; // 3回連続で失敗
    }
    
    return false;
  }
  
  // ====================================================================
  // PRIVATE METHODS - 統計・ログ管理
  // ====================================================================
  
  /**
   * 統計初期化
   */
  private initializeStats(): void {
    this.executionStats = {
      totalExecutions: 0,
      successCount: 0,
      errorCount: 0,
      averageExecutionTime: 0,
      errorHistory: []
    };
    
    console.log('📊 実行統計を初期化しました');
  }
  
  /**
   * 平均実行時間の更新
   */
  private updateAverageExecutionTime(newExecutionTime: number): void {
    const totalTime = this.executionStats.averageExecutionTime * (this.executionStats.totalExecutions - 1);
    this.executionStats.averageExecutionTime = (totalTime + newExecutionTime) / this.executionStats.totalExecutions;
  }
  
  /**
   * エラー記録の追加
   */
  private addErrorRecord(errorRecord: ErrorRecord): void {
    this.executionStats.errorHistory.unshift(errorRecord);
    
    // 最大保持数を超えた場合は古いものを削除
    if (this.executionStats.errorHistory.length > this.config.maxErrorHistory) {
      this.executionStats.errorHistory = this.executionStats.errorHistory.slice(0, this.config.maxErrorHistory);
    }
  }
  
  /**
   * ループ統計の更新
   */
  private updateLoopStats(loopStartTime: number): void {
    if (this.config.enableDetailedLogging) {
      const loopTime = Date.now() - loopStartTime;
      if (loopTime > 1000) { // 1秒以上かかった場合のみログ
        console.log(`⏱️  ループ実行時間: ${loopTime}ms`);
      }
    }
  }
  
  /**
   * スケジュール概要のログ出力
   */
  private logScheduleOverview(): void {
    if (this.scheduleItems.length === 0) {
      console.log('📋 本日のスケジュール: なし');
      return;
    }
    
    console.log('📋 本日のスケジュール概要:');
    this.scheduleItems.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.time} - ${item.action}${item.topic ? ` (${item.topic})` : ''}${item.target_query ? ` [${item.target_query}]` : ''}`);
    });
  }
  
  /**
   * 実行統計のログ出力
   */
  private logExecutionStats(): void {
    console.log('📊 最終実行統計:');
    console.log(`  総実行回数: ${this.executionStats.totalExecutions}`);
    console.log(`  成功回数: ${this.executionStats.successCount}`);
    console.log(`  エラー回数: ${this.executionStats.errorCount}`);
    console.log(`  成功率: ${this.executionStats.totalExecutions > 0 ? Math.round((this.executionStats.successCount / this.executionStats.totalExecutions) * 100) : 0}%`);
    console.log(`  平均実行時間: ${Math.round(this.executionStats.averageExecutionTime)}ms`);
    
    // TODO: 深夜分析統計 - 実装待ち
    
    if (this.executionStats.errorHistory.length > 0) {
      console.log(`  最新エラー: ${this.executionStats.errorHistory[0].message}`);
    }
  }
  
  // ====================================================================
  // PRIVATE METHODS - ユーティリティ
  // ====================================================================
  
  /**
   * 現在時刻のフォーマット
   */
  private formatCurrentTime(date: Date): string {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  /**
   * 待機処理
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}