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
  
  // 深夜大規模分析状態管理
  private deepNightAnalysisRunning: boolean = false;
  private deepNightAnalysisStartTime: Date | null = null;
  private deepNightAnalysisTimeout: NodeJS.Timeout | null = null;
  
  // 深夜分析設定
  private readonly DEEP_NIGHT_ANALYSIS_TIME = '23:55';
  private readonly DEEP_NIGHT_ANALYSIS_MAX_DURATION = 35 * 60 * 1000; // 35分（安全マージン）
  private readonly DEEP_NIGHT_ANALYSIS_EXPECTED_DURATION = 30 * 60 * 1000; // 30分
  
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
   * スケジュールされたタスクの処理（23:55特別処理対応版）
   */
  private async processScheduledTasks(): Promise<void> {
    const now = new Date();
    const currentTime = this.formatCurrentTime(now);
    
    // 深夜大規模分析実行中の場合は通常タスクをスキップ
    if (this.deepNightAnalysisRunning) {
      if (this.config.enableDetailedLogging) {
        const elapsed = now.getTime() - (this.deepNightAnalysisStartTime?.getTime() || 0);
        console.log(`🌙 深夜大規模分析実行中 (${Math.round(elapsed / 1000)}秒経過) - 通常タスクをスキップ`);
      }
      return;
    }
    
    // 該当時刻のタスクを検索
    const taskToRun = this.scheduleItems.find(item => item.time === currentTime);
    
    if (!taskToRun) {
      // 該当なしの場合は詳細ログのみ
      if (this.config.enableDetailedLogging) {
        console.log(`🔍 時刻チェック: ${currentTime} - 該当タスクなし`);
      }
      return;
    }
    
    // 23:55時刻の特別処理判定
    if (currentTime === this.DEEP_NIGHT_ANALYSIS_TIME) {
      console.log(`🌙 深夜大規模分析時刻検出: ${currentTime} - 特別処理モード開始`);
      await this.executeDeepNightAnalysisTask(taskToRun, currentTime);
    } else {
      // 通常タスクの実行
      console.log(`🎯 実行時刻: ${currentTime} - アクション: ${taskToRun.action} - トピック: ${taskToRun.topic || 'なし'}`);
      await this.executeScheduledTask(taskToRun, currentTime);
    }
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
   */
  private async executeDeepNightAnalysisTask(task: ScheduleItem, currentTime: string): Promise<void> {
    const executionId = `deep_night_analysis_${Date.now()}`;
    
    try {
      // 分析実行状態を設定
      this.deepNightAnalysisRunning = true;
      this.deepNightAnalysisStartTime = new Date();
      
      console.log(`🌙 深夜大規模分析開始 - ExecutionID: ${executionId}`);
      console.log(`⏰ 推定完了時刻: ${this.calculateExpectedCompletionTime()}`);
      
      // タイムアウト設定（最大実行時間の監視）
      this.setDeepNightAnalysisTimeout(executionId);
      
      // WorkflowOptionsの構築（通常タスクと同様）
      const workflowOptions = this.buildWorkflowOptions(task);
      
      // MainWorkflow実行（Step 4が自動的に実行される）
      const result = await MainWorkflow.execute(workflowOptions);
      
      // タイムアウトクリア
      this.clearDeepNightAnalysisTimeout();
      
      const totalTime = Date.now() - this.deepNightAnalysisStartTime.getTime();
      
      // 成功処理
      this.handleDeepNightAnalysisSuccess(task, result, totalTime, executionId);
      
    } catch (error) {
      const totalTime = this.deepNightAnalysisStartTime 
        ? Date.now() - this.deepNightAnalysisStartTime.getTime()
        : 0;
      
      // エラー処理
      this.handleDeepNightAnalysisError(task, error as Error, totalTime, executionId);
      
    } finally {
      // 状態リセット（成功・失敗問わず実行）
      this.deepNightAnalysisRunning = false;
      this.deepNightAnalysisStartTime = null;
      this.clearDeepNightAnalysisTimeout();
      
      console.log('🌙 深夜大規模分析処理完了 - 通常スケジュール復帰');
    }
  }

  /**
   * 完了予定時刻の計算
   */
  private calculateExpectedCompletionTime(): string {
    if (!this.deepNightAnalysisStartTime) return 'unknown';
    
    const expectedCompletion = new Date(
      this.deepNightAnalysisStartTime.getTime() + this.DEEP_NIGHT_ANALYSIS_EXPECTED_DURATION
    );
    
    return expectedCompletion.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * 深夜分析タイムアウト設定
   */
  private setDeepNightAnalysisTimeout(executionId: string): void {
    this.deepNightAnalysisTimeout = setTimeout(() => {
      console.error(`🚨 深夜大規模分析タイムアウト - ExecutionID: ${executionId}`);
      console.error(`⏰ 最大実行時間 ${this.DEEP_NIGHT_ANALYSIS_MAX_DURATION / 1000 / 60}分 を超過しました`);
      
      // タイムアウト時のクリーンアップ
      this.deepNightAnalysisRunning = false;
      this.deepNightAnalysisStartTime = null;
      
      // エラー統計更新
      this.executionStats.totalExecutions++;
      this.executionStats.errorCount++;
      
      const errorRecord: ErrorRecord = {
        timestamp: new Date(),
        errorType: 'DEEP_NIGHT_ANALYSIS_TIMEOUT',
        message: `Deep night analysis exceeded maximum duration of ${this.DEEP_NIGHT_ANALYSIS_MAX_DURATION / 1000 / 60} minutes`,
        recoveryAction: 'continue_scheduler',
        stackTrace: undefined
      };
      
      this.addErrorRecord(errorRecord);
      
      console.log('🔄 タイムアウト後の通常スケジュール復帰');
      
    }, this.DEEP_NIGHT_ANALYSIS_MAX_DURATION);
  }

  /**
   * 深夜分析タイムアウトクリア
   */
  private clearDeepNightAnalysisTimeout(): void {
    if (this.deepNightAnalysisTimeout) {
      clearTimeout(this.deepNightAnalysisTimeout);
      this.deepNightAnalysisTimeout = null;
    }
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
   */
  private handleDeepNightAnalysisSuccess(
    task: ScheduleItem,
    result: any,
    executionTime: number,
    executionId: string
  ): void {
    const executionMinutes = Math.round(executionTime / 1000 / 60);
    
    console.log(`✅ 深夜大規模分析完了 - ExecutionID: ${executionId}`);
    console.log(`⏱️  総実行時間: ${executionMinutes}分 (${executionTime}ms)`);
    
    // Step 4の結果詳細ログ
    if (result.deepNightAnalysis) {
      const analysis = result.deepNightAnalysis;
      console.log(`📊 分析結果: 洞察${analysis.insights}件, 機会${analysis.opportunities}件, 戦略${analysis.strategies}件`);
      console.log(`🎯 信頼度: ${Math.round((analysis.confidence || 0) * 100)}%`);
      console.log(`📁 生成ファイル: ${analysis.filesGenerated?.length || 0}件`);
      
      if (analysis.filesGenerated?.length > 0) {
        console.log(`   - ${analysis.filesGenerated.join(', ')}`);
      }
    }
    
    // 統計更新（深夜分析専用統計）
    this.executionStats.totalExecutions++;
    this.executionStats.successCount++;
    this.executionStats.lastExecutionTime = new Date();
    this.updateAverageExecutionTime(executionTime);
    
    // 深夜分析統計の更新
    this.updateDeepNightAnalysisStats(true, executionTime, new Date().toISOString().split('T')[0]);
    
    console.log(`📈 深夜分析統計更新: 成功=${this.executionStats.successCount}/${this.executionStats.totalExecutions}, 平均実行時間=${Math.round(this.executionStats.averageExecutionTime)}ms`);
    
    // 翌日の実行準備完了ログ
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(7, 0, 0, 0); // 翌日7:00
    
    console.log(`🌅 翌日戦略準備完了 - 次回実行: ${tomorrow.toLocaleString('ja-JP')} から新戦略適用`);
  }

  /**
   * 深夜大規模分析エラー時の処理
   */
  private handleDeepNightAnalysisError(
    task: ScheduleItem,
    error: Error,
    executionTime: number,
    executionId: string
  ): void {
    const executionMinutes = Math.round(executionTime / 1000 / 60);
    
    console.error(`❌ 深夜大規模分析エラー - ExecutionID: ${executionId}`);
    console.error(`⏱️  実行時間: ${executionMinutes}分 (${executionTime}ms)`);
    console.error(`🚨 エラー内容: ${error.message}`);
    
    // エラー記録（深夜分析専用）
    const errorRecord: ErrorRecord = {
      timestamp: new Date(),
      errorType: 'DEEP_NIGHT_ANALYSIS_ERROR',
      message: `Deep night analysis failed: ${error.message}`,
      action: task.action,
      recoveryAction: 'continue_scheduler_tomorrow_fallback',
      stackTrace: this.config.enableDetailedLogging ? error.stack : undefined
    };
    
    // 統計更新
    this.executionStats.totalExecutions++;
    this.executionStats.errorCount++;
    this.executionStats.lastExecutionTime = new Date();
    this.updateAverageExecutionTime(executionTime);
    this.addErrorRecord(errorRecord);
    
    // 深夜分析統計の更新
    this.updateDeepNightAnalysisStats(false, executionTime, new Date().toISOString().split('T')[0]);
    
    // 翌日実行への影響評価
    console.warn('⚠️ 深夜大規模分析に失敗しました');
    console.warn('🔄 翌日は前回戦略または基本戦略で実行継続されます');
    console.warn(`📊 エラー統計: ${this.executionStats.errorCount}/${this.executionStats.totalExecutions}`);
    
    // 重要: スケジューラーは継続動作（深夜分析失敗でもシステム停止しない）
    console.log('🔄 スケジューラー継続動作 - 通常実行に復帰');
  }

  /**
   * 深夜分析統計の更新
   */
  private updateDeepNightAnalysisStats(
    success: boolean, 
    analysisTime: number, 
    date: string
  ): void {
    if (!this.executionStats.deepNightAnalysis) {
      this.executionStats.deepNightAnalysis = {
        totalAttempts: 0,
        successfulAnalysis: 0,
        averageAnalysisTime: 0,
        lastAnalysisDate: '',
        lastAnalysisSuccess: false
      };
    }
    
    const stats = this.executionStats.deepNightAnalysis;
    stats.totalAttempts++;
    stats.lastAnalysisDate = date;
    stats.lastAnalysisSuccess = success;
    
    if (success) {
      stats.successfulAnalysis++;
      
      // 平均分析時間の更新
      const totalTime = stats.averageAnalysisTime * (stats.successfulAnalysis - 1);
      stats.averageAnalysisTime = (totalTime + analysisTime) / stats.successfulAnalysis;
    }
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
   * 実行統計のログ出力（深夜分析情報追加版）
   */
  private logExecutionStats(): void {
    console.log('📊 最終実行統計:');
    console.log(`  総実行回数: ${this.executionStats.totalExecutions}`);
    console.log(`  成功回数: ${this.executionStats.successCount}`);
    console.log(`  エラー回数: ${this.executionStats.errorCount}`);
    console.log(`  成功率: ${this.executionStats.totalExecutions > 0 ? Math.round((this.executionStats.successCount / this.executionStats.totalExecutions) * 100) : 0}%`);
    console.log(`  平均実行時間: ${Math.round(this.executionStats.averageExecutionTime)}ms`);
    
    // 深夜分析統計
    if (this.executionStats.deepNightAnalysis) {
      const dna = this.executionStats.deepNightAnalysis;
      console.log('🌙 深夜大規模分析統計:');
      console.log(`  分析実行回数: ${dna.totalAttempts}`);
      console.log(`  分析成功回数: ${dna.successfulAnalysis}`);
      console.log(`  分析成功率: ${dna.totalAttempts > 0 ? Math.round((dna.successfulAnalysis / dna.totalAttempts) * 100) : 0}%`);
      console.log(`  平均分析時間: ${Math.round(dna.averageAnalysisTime / 1000 / 60)}分`);
      console.log(`  最終分析日: ${dna.lastAnalysisDate}`);
      console.log(`  最終分析結果: ${dna.lastAnalysisSuccess ? '成功' : '失敗'}`);
    }
    
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