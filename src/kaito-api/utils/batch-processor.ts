/**
 * バッチ処理ユーティリティ
 * 複数のAPI呼び出しを効率的に処理
 * 
 * 機能概要:
 * - 並行処理の制御
 * - キューベースのタスク管理
 * - レート制限を考慮した遅延制御
 * - エラーハンドリングとリトライ機能
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface BatchTask<T = any> {
  id: string;
  task: () => Promise<T>;
  priority?: 'high' | 'normal' | 'low';
  retryCount?: number;
  maxRetries?: number;
}

export interface BatchResult<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: Error;
  executionTime: number;
  retryCount: number;
}

export interface BatchProcessorConfig {
  concurrency?: number;
  defaultDelay?: number;
  maxRetries?: number;
  retryDelay?: number;
  timeoutMs?: number;
}

export interface ProcessorStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  isProcessing: boolean;
  queueLength: number;
}

// ============================================================================
// BATCH PROCESSOR CLASS
// ============================================================================

export class BatchProcessor {
  private queue: Array<{
    task: BatchTask;
    resolve: (value: BatchResult) => void;
    reject: (error: any) => void;
  }> = [];
  
  private processing = false;
  private concurrency: number;
  private defaultDelay: number;
  private maxRetries: number;
  private retryDelay: number;
  private timeoutMs: number;
  
  private stats = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    totalExecutionTime: 0
  };

  constructor(config: BatchProcessorConfig = {}) {
    this.concurrency = config.concurrency || 3;
    this.defaultDelay = config.defaultDelay || 100;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    this.timeoutMs = config.timeoutMs || 30000;
    
    console.log('✅ BatchProcessor initialized:', {
      concurrency: this.concurrency,
      defaultDelay: this.defaultDelay,
      maxRetries: this.maxRetries
    });
  }

  /**
   * タスクをキューに追加
   * @param task - 実行するタスク
   * @returns Promise<BatchResult>
   */
  async add<T>(task: BatchTask<T>): Promise<BatchResult<T>> {
    return new Promise((resolve, reject) => {
      const taskWithDefaults: BatchTask<T> = {
        priority: 'normal',
        retryCount: 0,
        maxRetries: this.maxRetries,
        ...task
      };
      
      this.queue.push({ 
        task: taskWithDefaults, 
        resolve: resolve as (value: BatchResult) => void, 
        reject 
      });
      
      this.stats.totalTasks++;
      
      // 優先度でソート
      this.sortQueue();
      
      // 処理開始
      this.processQueue();
    });
  }
  
  /**
   * 複数タスクの一括追加
   * @param tasks - タスク配列
   * @returns Promise<BatchResult[]>
   */
  async addBatch<T>(tasks: BatchTask<T>[]): Promise<BatchResult<T>[]> {
    const promises = tasks.map(task => this.add(task));
    return Promise.all(promises);
  }
  
  /**
   * キューの処理
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    try {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.concurrency);
        
        await Promise.all(
          batch.map(async ({ task, resolve, reject }) => {
            try {
              const result = await this.executeTask(task);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          })
        );
        
        // レート制限考慮の待機
        if (this.queue.length > 0) {
          await this.delay(this.defaultDelay);
        }
      }
    } finally {
      this.processing = false;
    }
  }
  
  /**
   * 単一タスクの実行（リトライ付き）
   * @param task - 実行するタスク
   * @returns Promise<BatchResult>
   */
  private async executeTask<T>(task: BatchTask<T>): Promise<BatchResult<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    
    const maxRetries = task.maxRetries || this.maxRetries;
    let retryCount = task.retryCount || 0;
    
    while (retryCount <= maxRetries) {
      try {
        // タイムアウト付きでタスク実行
        const data = await this.executeWithTimeout(task.task(), this.timeoutMs);
        const executionTime = Date.now() - startTime;
        
        this.stats.completedTasks++;
        this.stats.totalExecutionTime += executionTime;
        
        return {
          id: task.id,
          success: true,
          data,
          executionTime,
          retryCount
        };
        
      } catch (error) {
        lastError = error as Error;
        retryCount++;
        
        console.warn(`⚠️ Task ${task.id} failed (attempt ${retryCount}/${maxRetries + 1}):`, error);
        
        if (retryCount <= maxRetries) {
          await this.delay(this.retryDelay * retryCount); // 指数バックオフ
        }
      }
    }
    
    // 最大リトライ回数に達した場合
    const executionTime = Date.now() - startTime;
    this.stats.failedTasks++;
    
    console.error(`❌ Task ${task.id} failed after ${retryCount} attempts:`, lastError);
    
    return {
      id: task.id,
      success: false,
      error: lastError!,
      executionTime,
      retryCount
    };
  }
  
  /**
   * タイムアウト付きPromise実行
   * @param promise - 実行するPromise
   * @param timeoutMs - タイムアウト時間（ミリ秒）
   * @returns Promise<T>
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Task timeout after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  }
  
  /**
   * キューの優先度ソート
   */
  private sortQueue(): void {
    const priorityOrder = { 'high': 0, 'normal': 1, 'low': 2 };
    
    this.queue.sort((a, b) => {
      const aPriority = priorityOrder[a.task.priority || 'normal'];
      const bPriority = priorityOrder[b.task.priority || 'normal'];
      return aPriority - bPriority;
    });
  }
  
  /**
   * 統計情報の取得
   * @returns ProcessorStats
   */
  getStats(): ProcessorStats {
    return {
      totalTasks: this.stats.totalTasks,
      completedTasks: this.stats.completedTasks,
      failedTasks: this.stats.failedTasks,
      averageExecutionTime: this.stats.completedTasks > 0 ? 
        this.stats.totalExecutionTime / this.stats.completedTasks : 0,
      isProcessing: this.processing,
      queueLength: this.queue.length
    };
  }
  
  /**
   * キューのクリア
   */
  clearQueue(): void {
    const clearedCount = this.queue.length;
    this.queue = [];
    console.log(`🧹 Cleared ${clearedCount} tasks from queue`);
  }
  
  /**
   * 統計のリセット
   */
  resetStats(): void {
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      totalExecutionTime: 0
    };
    console.log('📊 Statistics reset');
  }
  
  /**
   * 現在の設定を更新
   * @param config - 新しい設定
   */
  updateConfig(config: Partial<BatchProcessorConfig>): void {
    if (config.concurrency !== undefined) {
      this.concurrency = config.concurrency;
    }
    if (config.defaultDelay !== undefined) {
      this.defaultDelay = config.defaultDelay;
    }
    if (config.maxRetries !== undefined) {
      this.maxRetries = config.maxRetries;
    }
    if (config.retryDelay !== undefined) {
      this.retryDelay = config.retryDelay;
    }
    if (config.timeoutMs !== undefined) {
      this.timeoutMs = config.timeoutMs;
    }
    
    console.log('⚙️ BatchProcessor config updated:', config);
  }
  
  /**
   * 処理待機
   * @returns Promise<void> - 全ての処理が完了するまで待機
   */
  async waitForCompletion(): Promise<void> {
    while (this.processing || this.queue.length > 0) {
      await this.delay(50);
    }
  }
  
  /**
   * 遅延実行
   * @param ms - 遅延時間（ミリ秒）
   * @returns Promise<void>
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * シンプルなバッチ実行ヘルパー
 * @param tasks - 実行するPromiseの配列
 * @param concurrency - 並行実行数
 * @param delay - タスク間の遅延時間（ミリ秒）
 * @returns Promise<T[]>
 */
export async function executeBatch<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number = 3,
  delay: number = 100
): Promise<T[]> {
  const processor = new BatchProcessor({ concurrency, defaultDelay: delay });
  
  const batchTasks: BatchTask[] = tasks.map((task, index) => ({
    id: `batch_task_${index}`,
    task
  }));
  
  const results = await processor.addBatch(batchTasks);
  
  // 成功したタスクのデータのみ返す
  return results
    .filter(result => result.success)
    .map(result => result.data!);
}

/**
 * レート制限を考慮したAPI呼び出しバッチ処理
 * @param apiCalls - API呼び出し関数の配列
 * @param rateLimit - レート制限（requests per second）
 * @returns Promise<any[]>
 */
export async function executeRateLimitedBatch<T>(
  apiCalls: (() => Promise<T>)[],
  rateLimit: number = 5
): Promise<T[]> {
  const delay = Math.ceil(1000 / rateLimit); // requests per secondからms間隔を計算
  const concurrency = Math.min(3, rateLimit); // 並行数を制限
  
  return executeBatch(apiCalls, concurrency, delay);
}

/**
 * バッチ結果の成功・失敗分析
 * @param results - バッチ実行結果
 * @returns 分析結果
 */
export function analyzeBatchResults<T>(results: BatchResult<T>[]): {
  total: number;
  successful: number;
  failed: number;
  successRate: number;
  averageExecutionTime: number;
  errors: Error[];
} {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    successRate: results.length > 0 ? successful.length / results.length : 0,
    averageExecutionTime: results.length > 0 ? 
      results.reduce((sum, r) => sum + r.executionTime, 0) / results.length : 0,
    errors: failed.map(r => r.error!).filter(Boolean)
  };
}

/**
 * グローバル バッチプロセッサ インスタンス
 */
const globalBatchProcessor = new BatchProcessor();

/**
 * グローバル バッチプロセッサの取得
 * @returns BatchProcessor
 */
export function getGlobalBatchProcessor(): BatchProcessor {
  return globalBatchProcessor;
}

// ============================================================================
// EXPORT
// ============================================================================

export default BatchProcessor;