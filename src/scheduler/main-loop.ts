/**
 * メイン実行ループクラス（スケジュール制御専用）
 * REQUIREMENTS.md準拠版 - 30分間隔自動実行システム
 * スケジューリング機能のみを担当、ワークフローはmain.tsに委譲
 */

// ワークフロー実行関数の型定義
type WorkflowExecutor = () => Promise<ExecutionResult>;

// shared/types.tsから型をimport
import { ExecutionResult } from '../shared/types';

export interface LoopMetrics {
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  actionBreakdown: {
    [action: string]: {
      count: number;
      successRate: number;
      avgTime: number;
    };
  };
  learningUpdates: number;
  lastExecutionTime: string;
}


/**
 * メイン実行ループクラス（スケジュール制御専用）
 * 30分間隔でのスケジューリング機能のみを担当
 * 実際のワークフローはmain.tsのexecuteWorkflow()に委譲
 */
export class MainLoop {
  private metrics!: LoopMetrics;
  private isExecuting: boolean = false;
  private executeWorkflow: WorkflowExecutor;

  constructor(executeWorkflow: WorkflowExecutor) {
    this.executeWorkflow = executeWorkflow;
    this.initializeMetrics();
    console.log('✅ MainLoop initialized - Schedule control only');
  }

  /**
   * 単一実行サイクル（30分間隔実行の1回分）
   * main.tsのexecuteWorkflow()を呼び出すだけの薄いラッパー
   */
  async runOnce(): Promise<ExecutionResult> {
    if (this.isExecuting) {
      console.warn('⚠️ Execution already in progress, skipping');
      return this.createSkippedResult();
    }

    this.isExecuting = true;
    const startTime = Date.now();

    try {
      console.log('🚀 Starting scheduled execution cycle...');

      // ===================================================================
      // メインワークフロー実行 - main.tsに実装済み
      // MainLoopはスケジュール制御のみ担当
      // ===================================================================
      
      const result = await this.executeWorkflow(); // main.tsのワークフロー呼び出し
      const executionTime = Date.now() - startTime;

      // メトリクス更新
      this.updateMetrics(result, true);

      console.log('✅ Scheduled execution completed:', {
        action: result.action,
        duration: `${executionTime}ms`,
        success: result.success
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorResult = this.createErrorResult(error as Error, executionTime);
      
      this.updateMetrics(errorResult, false);
      
      console.error('❌ Scheduled execution failed:', error);
      return errorResult;

    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * ループメトリクス取得
   */
  getMetrics(): LoopMetrics {
    return { ...this.metrics };
  }

  /**
   * メトリクスリセット
   */
  resetMetrics(): void {
    this.initializeMetrics();
    console.log('📊 Loop metrics reset');
  }

  /**
   * 実行状態確認
   */
  isCurrentlyExecuting(): boolean {
    return this.isExecuting;
  }


  /**
   * システム健全性チェック（スケジューラー機能のみ）
   */
  async performHealthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'critical';
    components: {
      scheduler: 'healthy' | 'error';
      metrics: 'healthy' | 'error';
    };
    timestamp: string;
  }> {
    try {
      console.log('🏥 Performing scheduler health check...');

      // スケジューラー関連の健全性をチェック
      const health = {
        overall: 'healthy' as const,
        components: {
          scheduler: 'healthy' as const,
          metrics: 'healthy' as const
        },
        timestamp: new Date().toISOString()
      };

      // 基本的な健全性チェック
      if (this.isExecuting && Date.now() - new Date(this.metrics.lastExecutionTime).getTime() > 300000) {
        // 5分以上実行中の場合は異常
        health.components.scheduler = 'error';
      }

      if (!this.metrics || this.metrics.totalExecutions < 0) {
        health.components.metrics = 'error';
      }

      // 全体状況判定
      const errorCount = Object.values(health.components).filter(status => status === 'error').length;
      
      if (errorCount > 0) health.overall = 'critical';

      console.log('✅ Scheduler health check completed');
      return health;

    } catch (error) {
      console.error('❌ Scheduler health check failed:', error);
      return {
        overall: 'critical',
        components: {
          scheduler: 'error',
          metrics: 'error'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS - SCHEDULE CONTROL ONLY
  // ============================================================================

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private initializeMetrics(): void {
    this.metrics = {
      totalExecutions: 0,
      successRate: 0,
      avgExecutionTime: 0,
      actionBreakdown: {
        post: { count: 0, successRate: 0, avgTime: 0 },
        retweet: { count: 0, successRate: 0, avgTime: 0 },
        quote_tweet: { count: 0, successRate: 0, avgTime: 0 },
        like: { count: 0, successRate: 0, avgTime: 0 },
        wait: { count: 0, successRate: 0, avgTime: 0 }
      },
      learningUpdates: 0,
      lastExecutionTime: ''
    };
  }

  private updateMetrics(result: ExecutionResult, learningUpdated: boolean): void {
    this.metrics.totalExecutions++;
    
    // 成功率更新
    const successCount = this.metrics.successRate * (this.metrics.totalExecutions - 1) + (result.success ? 1 : 0);
    this.metrics.successRate = successCount / this.metrics.totalExecutions;

    // 平均実行時間更新
    const totalTime = this.metrics.avgExecutionTime * (this.metrics.totalExecutions - 1) + result.executionTime;
    this.metrics.avgExecutionTime = totalTime / this.metrics.totalExecutions;

    // アクション別統計更新
    if (this.metrics.actionBreakdown[result.action]) {
      const actionStats = this.metrics.actionBreakdown[result.action];
      actionStats.count++;
      
      const actionSuccess = actionStats.successRate * (actionStats.count - 1) + (result.success ? 1 : 0);
      actionStats.successRate = actionSuccess / actionStats.count;
      
      const actionTime = actionStats.avgTime * (actionStats.count - 1) + result.executionTime;
      actionStats.avgTime = actionTime / actionStats.count;
    }

    // 学習更新カウント
    if (learningUpdated) {
      this.metrics.learningUpdates++;
    }

    this.metrics.lastExecutionTime = new Date().toISOString();
  }

  private createSkippedResult(): ExecutionResult {
    return {
      success: false,
      action: 'skip',
      executionTime: 0,
      error: 'Execution already in progress',
      metadata: {
        executionTime: 0,
        retryCount: 0,
        rateLimitHit: false,
        timestamp: new Date().toISOString()
      }
    };
  }

  private createErrorResult(error: Error, executionTime: number): ExecutionResult {
    return {
      success: false,
      action: 'error',
      executionTime,
      error: error.message,
      metadata: {
        executionTime,
        retryCount: 0,
        rateLimitHit: false,
        timestamp: new Date().toISOString()
      }
    };
  }
}

