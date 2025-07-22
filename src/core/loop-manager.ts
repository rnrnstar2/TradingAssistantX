/**
 * LoopManager - 定時実行とスケジュール管理
 * 
 * 責務:
 * - 1日15回の定時実行管理
 * - 緊急実行判定
 * - 実行履歴記録
 * - グレースフルシャットダウン
 */

import { AutonomousExecutor } from './autonomous-executor';
import { YamlManager } from '../utils/yaml-manager';
import { Logger } from '../logging/logger';
import { format } from 'date-fns-tz';
import { parseISO, differenceInMinutes, addMinutes } from 'date-fns';

/**
 * 投稿スケジュール設定（REQUIREMENTS.md準拠）
 * 1日15回の最適投稿時間
 */
export const POSTING_SCHEDULE = {
  morning: ["07:00", "07:30", "08:00", "08:30"],    // 朝（4回）
  noon: ["12:00", "12:30"],                          // 昼（2回）
  afternoon: ["15:00", "16:00", "17:00"],            // 午後（3回）
  evening: ["18:00", "18:30", "19:00", "19:30"],    // 夕方（4回）
  night: ["21:00", "22:00"]                          // 夜（2回）
};

/**
 * 実行条件設定
 */
interface ExecutionConditions {
  scheduled: boolean;             // 定時実行
  urgent: boolean;                // 緊急実行（重要ニュース検出時）
  minIntervalMinutes: number;     // 前回実行からの最小間隔
  maxDailyExecutions: number;     // 1日の最大実行回数
}

/**
 * 実行結果
 */
interface ExecutionResult {
  timestamp: string;
  type: 'scheduled' | 'urgent' | 'manual';
  result: 'success' | 'failure' | 'skipped';
  duration: number;
  error?: string;
}

/**
 * 実行履歴
 */
interface ExecutionHistory {
  executions: ExecutionResult[];
  daily_count: number;
  remaining: number;
  last_execution: string;
}

/**
 * ループ管理クラス
 */
export class LoopManager {
  private executor: AutonomousExecutor;
  private logger: Logger;
  private yamlManager: YamlManager;
  private isRunning: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private executionHistory: ExecutionHistory;
  
  /**
   * 実行条件のデフォルト設定
   */
  private readonly conditions: ExecutionConditions = {
    scheduled: true,
    urgent: true,
    minIntervalMinutes: 30,
    maxDailyExecutions: 15
  };
  
  constructor() {
    this.executor = new AutonomousExecutor();
    this.logger = new Logger('LoopManager');
    this.yamlManager = new YamlManager();
    this.executionHistory = this.loadExecutionHistory();
  }
  
  /**
   * ループ実行開始
   */
  async startLoop(): Promise<void> {
    this.logger.info('Starting loop execution system');
    this.isRunning = true;
    
    // グレースフルシャットダウンのセットアップ
    this.setupGracefulShutdown();
    
    // 実行ループ開始
    await this.runLoop();
  }
  
  /**
   * メインループ実装
   */
  private async runLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const now = new Date();
        
        // 実行判定
        if (this.shouldExecute(now)) {
          const startTime = Date.now();
          const executionType = this.getExecutionType();
          
          this.logger.info(`Starting ${executionType} execution`);
          
          try {
            // 自律実行
            await this.executor.executeAutonomously();
            
            // 実行成功を記録
            const duration = (Date.now() - startTime) / 1000;
            await this.recordExecution({
              timestamp: format(now, "yyyy-MM-dd'T'HH:mm:ss'Z'", { timeZone: 'UTC' }),
              type: executionType,
              result: 'success',
              duration
            });
            
            this.logger.success(`Execution completed in ${duration}s`);
          } catch (error) {
            // 実行失敗を記録
            const duration = (Date.now() - startTime) / 1000;
            await this.recordExecution({
              timestamp: format(now, "yyyy-MM-dd'T'HH:mm:ss'Z'", { timeZone: 'UTC' }),
              type: executionType,
              result: 'failure',
              duration,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            this.logger.error(`Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        
        // 次回チェックまで待機（1分）
        await this.waitForNextCheck();
        
      } catch (error) {
        this.logger.error(`Loop error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // エラーが発生してもループは継続
        await this.waitForNextCheck();
      }
    }
  }
  
  /**
   * 実行すべきかどうかを判定
   */
  private shouldExecute(now: Date): boolean {
    // 1日の実行制限チェック
    if (this.executionHistory.daily_count >= this.conditions.maxDailyExecutions) {
      return false;
    }
    
    // 最小間隔チェック
    if (!this.checkMinInterval()) {
      return false;
    }
    
    // 定時実行チェック
    if (this.isExecutionTime(now)) {
      return true;
    }
    
    // 緊急実行チェック
    if (this.shouldExecuteImmediately()) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 実行タイプを取得
   */
  private getExecutionType(): 'scheduled' | 'urgent' | 'manual' {
    if (this.shouldExecuteImmediately()) {
      return 'urgent';
    }
    return 'scheduled';
  }
  
  /**
   * 実行時間チェック
   */
  private isExecutionTime(now: Date): boolean {
    const currentTime = format(now, 'HH:mm', { timeZone: 'Asia/Tokyo' });
    const allTimes = [
      ...POSTING_SCHEDULE.morning,
      ...POSTING_SCHEDULE.noon,
      ...POSTING_SCHEDULE.afternoon,
      ...POSTING_SCHEDULE.evening,
      ...POSTING_SCHEDULE.night
    ];
    
    // 揺らぎを考慮（±5分）
    for (const scheduledTime of allTimes) {
      const [hour, minute] = scheduledTime.split(':').map(Number);
      const scheduledDate = new Date(now);
      scheduledDate.setHours(hour, minute, 0, 0);
      
      const diffMinutes = Math.abs(differenceInMinutes(now, scheduledDate));
      if (diffMinutes <= 5) {
        // 同じ時間帯で既に実行済みかチェック
        const recentExecution = this.executionHistory.executions.find(exec => {
          const execTime = parseISO(exec.timestamp);
          return differenceInMinutes(now, execTime) < 10 && exec.result === 'success';
        });
        
        if (!recentExecution) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * 次回実行時間計算
   */
  private calculateNextExecutionTime(): Date {
    const now = new Date();
    const currentTime = format(now, 'HH:mm', { timeZone: 'Asia/Tokyo' });
    const allTimes = [
      ...POSTING_SCHEDULE.morning,
      ...POSTING_SCHEDULE.noon,
      ...POSTING_SCHEDULE.afternoon,
      ...POSTING_SCHEDULE.evening,
      ...POSTING_SCHEDULE.night
    ].sort();
    
    // 次の実行時間を探す
    for (const scheduledTime of allTimes) {
      if (scheduledTime > currentTime) {
        const [hour, minute] = scheduledTime.split(':').map(Number);
        const nextDate = new Date(now);
        nextDate.setHours(hour, minute, 0, 0);
        return nextDate;
      }
    }
    
    // 今日の予定が終了している場合は翌日の最初の時間
    const [hour, minute] = allTimes[0].split(':').map(Number);
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + 1);
    nextDate.setHours(hour, minute, 0, 0);
    return nextDate;
  }
  
  /**
   * 最小間隔チェック
   */
  private checkMinInterval(): boolean {
    if (!this.executionHistory.last_execution) {
      return true;
    }
    
    const lastExecution = parseISO(this.executionHistory.last_execution);
    const now = new Date();
    const diffMinutes = differenceInMinutes(now, lastExecution);
    
    return diffMinutes >= this.conditions.minIntervalMinutes;
  }
  
  /**
   * 緊急実行判定
   */
  private shouldExecuteImmediately(): boolean {
    if (!this.conditions.urgent) {
      return false;
    }
    
    // 緊急実行の判定ロジック（将来実装）
    // - 重要ニュースの検出
    // - 市場急変の検知
    // - 手動トリガー
    
    // MVP段階では常にfalse
    return false;
  }
  
  /**
   * 実行履歴記録
   */
  private async recordExecution(result: ExecutionResult): Promise<void> {
    // 履歴に追加
    this.executionHistory.executions.push(result);
    
    // 今日の実行のみカウント
    const today = format(new Date(), 'yyyy-MM-dd', { timeZone: 'Asia/Tokyo' });
    const todayExecutions = this.executionHistory.executions.filter(exec => {
      const execDate = format(parseISO(exec.timestamp), 'yyyy-MM-dd', { timeZone: 'Asia/Tokyo' });
      return execDate === today && exec.result === 'success';
    });
    
    this.executionHistory.daily_count = todayExecutions.length;
    this.executionHistory.remaining = this.conditions.maxDailyExecutions - todayExecutions.length;
    this.executionHistory.last_execution = result.timestamp;
    
    // 古い履歴を削除（7日分保持）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    this.executionHistory.executions = this.executionHistory.executions.filter(exec => {
      return parseISO(exec.timestamp) > sevenDaysAgo;
    });
    
    // 履歴を保存
    await this.saveExecutionHistory();
  }
  
  /**
   * 実行履歴の読み込み
   */
  private loadExecutionHistory(): ExecutionHistory {
    try {
      // 同期的に読み込むため、非同期メソッドをPromiseで包んで即座に解決
      const loadPromise = this.yamlManager.loadConfig<ExecutionHistory>('data/current/execution-history.yaml');
      let history: ExecutionHistory | null = null;
      
      // 初期化時は同期的に処理する必要があるため、ファイル読み込みをスキップ
      // 実際の読み込みは非同期で後から行う
      loadPromise.then(result => {
        if (result.success && result.data) {
          const today = format(new Date(), 'yyyy-MM-dd', { timeZone: 'Asia/Tokyo' });
          const lastExecDate = result.data.last_execution 
            ? format(parseISO(result.data.last_execution), 'yyyy-MM-dd', { timeZone: 'Asia/Tokyo' })
            : '';
          
          if (lastExecDate !== today) {
            result.data.daily_count = 0;
            result.data.remaining = this.conditions.maxDailyExecutions;
          }
          
          this.executionHistory = result.data;
        }
      }).catch(error => {
        this.logger.warn('Failed to load execution history, using default');
      });
      
    } catch (error) {
      this.logger.warn('Failed to load execution history, creating new');
    }
    
    return {
      executions: [],
      daily_count: 0,
      remaining: this.conditions.maxDailyExecutions,
      last_execution: ''
    };
  }
  
  /**
   * 実行履歴の保存
   */
  private async saveExecutionHistory(): Promise<void> {
    try {
      const result = await this.yamlManager.saveConfig('data/current/execution-history.yaml', this.executionHistory);
      if (!result.success) {
        this.logger.error(`Failed to save execution history: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(`Failed to save execution history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * 次回チェックまで待機
   */
  private async waitForNextCheck(): Promise<void> {
    // 1分待機
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
  
  /**
   * グレースフルシャットダウンのセットアップ
   */
  private setupGracefulShutdown(): void {
    const shutdownHandler = async () => {
      this.logger.info('Shutdown signal received');
      await this.shutdown();
      process.exit(0);
    };
    
    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);
  }
  
  /**
   * グレースフルシャットダウン
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down loop manager...');
    this.isRunning = false;
    
    // タイマーのクリア
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    // 最終履歴の保存
    await this.saveExecutionHistory();
    
    this.logger.success('Loop manager shutdown complete');
  }
  
  /**
   * 現在の状態を取得（デバッグ用）
   */
  getStatus(): {
    isRunning: boolean;
    dailyCount: number;
    remaining: number;
    nextExecution: string;
    lastExecution: string;
  } {
    const nextExecution = this.calculateNextExecutionTime();
    
    return {
      isRunning: this.isRunning,
      dailyCount: this.executionHistory.daily_count,
      remaining: this.executionHistory.remaining,
      nextExecution: format(nextExecution, 'yyyy-MM-dd HH:mm:ss', { timeZone: 'Asia/Tokyo' }),
      lastExecution: this.executionHistory.last_execution || 'Never'
    };
  }
}