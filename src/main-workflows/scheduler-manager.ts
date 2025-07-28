import { systemLogger } from '../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../shared/component-container';
import { Config } from '../shared/config';
import { ExecutionResult } from '../shared/types';
// KaitoAPI統合インポート
import { KaitoTwitterAPIClient } from '../kaito-api';
import { TweetEndpoints } from '../kaito-api/endpoints/tweet-endpoints';
import { ActionEndpoints } from '../kaito-api/endpoints/action-endpoints';
// 分割されたコアクラスのインポート
import { SchedulerCore, SchedulerConfig, ScheduleStatus } from './core/scheduler-core';
import type { ExecutionCallback } from './core/scheduler-core';
import { SchedulerMaintenance } from './core/scheduler-maintenance';

// 再エクスポート（外部APIとの互換性維持）
export type { SchedulerConfig, ScheduleStatus, ExecutionCallback } from './core/scheduler-core';

// KaitoAPI統合インターフェース
export interface SystemHealth {
  all_systems_operational: boolean;
  api_status: 'healthy' | 'degraded' | 'error';
  rate_limits_ok: boolean;
  kaitoHealth: boolean;
  searchHealth: boolean;
  executorHealth: boolean;
}

// MainLoop統合型定義
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
 * SchedulerManager - スケジューラー管理・30分間隔実行制御クラス
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • 分割されたコアクラスの統合管理
 * • 30分間隔でのメインループ実行制御
 * • スケジューラー状態の監視・報告
 * • MainLoop統合機能・公開API提供
 * 
 * 🔗 主要連携:
 * • main.ts → startScheduler()でexecuteMainLoop()をコールバック登録
 * • SchedulerCore → 内部タイマー管理とワークフロー実行
 * • SchedulerMaintenance → データメンテナンス機能
 * • Config → スケジューラー設定の動的読み込み
 * • StatusController → 手動実行との協調制御
 */
export class SchedulerManager {
  private container: ComponentContainer;
  private isSchedulerRunning: boolean = false;
  
  // 分割されたコアクラス
  private schedulerCore: SchedulerCore;
  private schedulerMaintenance: SchedulerMaintenance;
  
  // MainLoop統合フィールド
  private metrics!: LoopMetrics;
  private isExecuting: boolean = false;
  
  // KaitoAPI統合コンポーネント
  private kaitoClient?: KaitoTwitterAPIClient;
  private searchEngine?: TweetEndpoints;
  private actionExecutor?: ActionEndpoints;
  
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

  constructor(container: ComponentContainer) {
    this.container = container;
    this.schedulerCore = new SchedulerCore(this.DEFAULT_CONFIG);
    this.schedulerMaintenance = new SchedulerMaintenance(container);
    this.initializeMetrics();
    systemLogger.info('✅ SchedulerManager initialized - CoreScheduler & MainLoop統合版');
  }

  /**
   * スケジューラー起動ワークフロー
   * 内蔵スケジューラーで30分間隔での自動実行を開始（CoreScheduler統合版）
   * 
   * @param executeCallback メインループ実行コールバック（ExecutionFlow.executeMainLoop）
   * @throws Error スケジューラー起動に失敗した場合
   */
  startScheduler(executeCallback: () => Promise<ExecutionResult>): void {
    try {
      // ===================================================================
      // 【スケジューラー起動ワークフロー - CoreScheduler統合版】
      // 0. 実行前チェック → 1. 設定読み込み → 2. 内蔵スケジューラー設定 → 3. スケジューラー開始
      // ===================================================================
      
      if (this.isSchedulerRunning) {
        systemLogger.warn('⚠️ Scheduler is already running');
        return;
      }
      
      systemLogger.info('🔍 【スケジューラー起動ステップ0】実行前チェック開始');
      this.schedulerMaintenance.performPreExecutionChecks();
      systemLogger.success('✅ 実行前チェック完了');
      
      systemLogger.info('⚙️ 【スケジューラー起動ステップ1】設定読み込み開始');
      
      // ComponentContainerから必要なコンポーネントを取得
      const config = this.container.get<Config>(COMPONENT_KEYS.CONFIG);
      if (!config) {
        throw new Error('Config component not found in container');
      }
      
      const schedulerConfig = config.getSchedulerConfig();
      // ConfigからmaxDailyExecutionsが取得できないため、DEFAULT_CONFIGから取得
      const fullSchedulerConfig = {
        ...schedulerConfig,
        maxDailyExecutions: this.DEFAULT_CONFIG.maxDailyExecutions,
        enableGracefulShutdown: this.DEFAULT_CONFIG.enableGracefulShutdown,
        executionWindow: this.DEFAULT_CONFIG.executionWindow
      };
      this.validateSchedulerConfig(fullSchedulerConfig);
      systemLogger.success('✅ スケジューラー設定読み込み・検証完了');

      systemLogger.info('🔧 【スケジューラー起動ステップ2】内蔵スケジューラー設定開始');
      this.schedulerCore.updateConfig(fullSchedulerConfig);
      this.schedulerCore.setExecutionCallback(executeCallback);
      systemLogger.success('✅ 内蔵スケジューラー設定完了');

      systemLogger.info('▶️ 【スケジューラー起動ステップ3】スケジューラー開始');
      this.schedulerCore.start();
      this.isSchedulerRunning = true;
      
      // グレースフルシャットダウン設定
      if (fullSchedulerConfig.enableGracefulShutdown) {
        this.schedulerCore.setupGracefulShutdown();
      }
      
      systemLogger.success('⏰ スケジューラー起動完了 - 30分毎自動実行開始:', {
        interval: `${fullSchedulerConfig.intervalMinutes}分間隔`,
        maxDaily: `最大${fullSchedulerConfig.maxDailyExecutions}回/日`,
        workflow: '【データ読み込み→Claude判断→アクション実行→結果記録】',
        status: 'RUNNING',
        nextExecution: this.schedulerCore.getStatus().nextExecution
      });

    } catch (error) {
      systemLogger.error('❌ スケジューラー起動失敗:', error);
      this.isSchedulerRunning = false;
      
      // 起動失敗時のクリーンアップ
      this.cleanupFailedStartup();
      
      throw new Error(`Scheduler startup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * スケジューラー停止ワークフロー
   * 実行中のスケジューラーを安全に停止し、リソースをクリーンアップ（CoreScheduler統合版）
   */
  stopScheduler(): void {
    try {
      systemLogger.info('⏹️ スケジューラー停止プロセス開始');
      
      if (!this.isSchedulerRunning) {
        systemLogger.info('ℹ️ スケジューラーは既に停止済み');
        return;
      }

      // スケジューラーの現在状態を記録（デバッグ用）
      const status = this.schedulerCore.getStatus();
      systemLogger.debug('📊 停止前スケジューラー状態:', status);
      
      // 安全な停止実行
      this.schedulerCore.stop();
      this.isSchedulerRunning = false;
      
      systemLogger.success('✅ スケジューラー停止完了', {
        previousStatus: status,
        stoppedAt: new Date().toISOString()
      });

    } catch (error) {
      systemLogger.error('❌ スケジューラー停止エラー:', error);
      // エラーが発生してもスケジューラーは停止状態にマーク
      this.isSchedulerRunning = false;
      
      // 緊急停止処理
      this.forceStopScheduler();
    }
  }

  /**
   * スケジューラー状態取得（CoreScheduler統合版）
   */
  getSchedulerStatus(): {
    running: boolean;
    config?: { intervalMinutes: number; maxDailyExecutions: number };
    nextExecution?: string;
  } {
    try {
      const config = this.container.get<Config>(COMPONENT_KEYS.CONFIG);
      
      const schedulerConfig = config?.getSchedulerConfig();
      const fullConfig = schedulerConfig ? {
        intervalMinutes: schedulerConfig.intervalMinutes,
        maxDailyExecutions: this.DEFAULT_CONFIG.maxDailyExecutions
      } : undefined;
      
      return {
        running: this.isSchedulerRunning,
        config: fullConfig,
        nextExecution: this.schedulerCore.getStatus()?.nextExecution
      };

    } catch (error) {
      systemLogger.error('❌ スケジューラー状態取得エラー:', error);
      return { running: false };
    }
  }

  /**
   * スケジューラー設定動的リロードワークフロー
   * システム稼働中に設定を再読み込みし、内蔵スケジューラーに反映（CoreScheduler統合版）
   * 
   * 処理フロー:
   * 1. 現在の設定をバックアップ
   * 2. 新しい設定を読み込み・検証
   * 3. スケジューラーが稼働中の場合は設定を更新
   * 4. 設定反映の確認・ログ出力
   */
  async reloadSchedulerConfig(): Promise<void> {
    let oldConfig: any = null;
    
    try {
      systemLogger.info('🔄 スケジューラー設定動的リロード開始');
      
      const config = this.container.get<Config>(COMPONENT_KEYS.CONFIG);
      if (!config) {
        throw new Error('Config component not found in container');
      }
      
      // 現在の設定をバックアップ（ロールバック用）
      oldConfig = { ...this.schedulerCore.getStatus() };
      systemLogger.debug('📋 現在の設定をバックアップ:', oldConfig);
      
      // 新しい設定を読み込み
      await config.reloadConfig();
      const schedulerConfig = config.getSchedulerConfig();
      
      // ConfigからmaxDailyExecutionsが取得できないため、DEFAULT_CONFIGから取得
      const newSchedulerConfig = {
        ...schedulerConfig,
        maxDailyExecutions: this.DEFAULT_CONFIG.maxDailyExecutions,
        enableGracefulShutdown: this.DEFAULT_CONFIG.enableGracefulShutdown,
        executionWindow: this.DEFAULT_CONFIG.executionWindow
      };
      
      // 設定の検証
      this.validateSchedulerConfig(newSchedulerConfig);
      
      if (this.isSchedulerRunning) {
        systemLogger.info('⚙️ 稼働中スケジューラーに新設定を適用中...');
        
        // 新設定を内蔵スケジューラーに適用
        this.schedulerCore.updateConfig(newSchedulerConfig);
        
        systemLogger.success('✅ 稼働中スケジューラー設定更新完了:', {
          oldInterval: `${oldConfig.intervalMinutes}分間隔`,
          newInterval: `${newSchedulerConfig.intervalMinutes}分間隔`,
          oldMaxDaily: `最大${oldConfig.maxDailyExecutions}回/日`,
          newMaxDaily: `最大${newSchedulerConfig.maxDailyExecutions}回/日`,
          appliedAt: new Date().toISOString()
        });
      } else {
        systemLogger.info('ℹ️ スケジューラー未稼働 - 設定のみリロード完了');
        this.schedulerCore.updateConfig(newSchedulerConfig);
      }
      
      systemLogger.success('🔄 スケジューラー設定リロード完了');

    } catch (error) {
      systemLogger.error('❌ スケジューラー設定リロードエラー:', error);
      
      // ロールバック処理（可能な場合）
      if (oldConfig && this.isSchedulerRunning) {
        try {
          systemLogger.info('🔙 設定ロールバック試行中...');
          this.schedulerCore.updateConfig(oldConfig);
          systemLogger.info('✅ 設定ロールバック完了');
        } catch (rollbackError) {
          systemLogger.error('❌ 設定ロールバック失敗:', rollbackError);
        }
      }
      
      throw new Error(`Scheduler config reload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ===================================================================
  // Private Helper Methods - 内部処理支援メソッド群
  // ===================================================================

  /**
   * スケジューラー設定の妥当性検証
   * @param config 検証対象のスケジューラー設定
   * @throws Error 設定が無効な場合
   */
  private validateSchedulerConfig(config: any): void {
    if (!config) {
      throw new Error('Scheduler config is undefined or null');
    }

    if (typeof config.intervalMinutes !== 'number' || config.intervalMinutes <= 0) {
      throw new Error(`Invalid interval: ${config.intervalMinutes}. Must be a positive number.`);
    }

    if (typeof config.maxDailyExecutions !== 'number' || config.maxDailyExecutions <= 0) {
      throw new Error(`Invalid maxDailyExecutions: ${config.maxDailyExecutions}. Must be a positive number.`);
    }

    // 実用的な制限チェック
    if (config.intervalMinutes < 1) {
      throw new Error('Interval too short. Minimum 1 minute required.');
    }

    if (config.maxDailyExecutions > 1000) {
      throw new Error('maxDailyExecutions too high. Maximum 1000 per day.');
    }

    systemLogger.debug('✅ スケジューラー設定検証完了:', {
      intervalMinutes: config.intervalMinutes,
      maxDailyExecutions: config.maxDailyExecutions
    });
  }

  /**
   * 起動失敗時のクリーンアップ処理（CoreScheduler統合版）
   */
  private cleanupFailedStartup(): void {
    try {
      systemLogger.info('🧹 起動失敗クリーンアップ実行中...');
      
      // スケジューラー状態をリセット
      this.isSchedulerRunning = false;
      
      // 内蔵スケジューラーのクリーンアップ
      try {
        this.schedulerCore.stop();
      } catch (stopError) {
        systemLogger.warn('⚠️ クリーンアップ中のスケジューラー停止で軽微なエラー:', stopError);
      }
      
      systemLogger.info('✅ 起動失敗クリーンアップ完了');
    } catch (cleanupError) {
      systemLogger.error('❌ クリーンアップ処理でエラー:', cleanupError);
    }
  }

  /**
   * 緊急停止処理（通常停止が失敗した場合）（CoreScheduler統合版）
   */
  private forceStopScheduler(): void {
    try {
      systemLogger.warn('⚠️ スケジューラー緊急停止処理実行中...');
      
      // 強制的に停止状態にマーク
      this.isSchedulerRunning = false;
      
      // スケジューラーコアを強制停止
      this.schedulerCore.stop();
      
      systemLogger.info('✅ スケジューラー緊急停止完了');
    } catch (error) {
      systemLogger.error('❌ 緊急停止処理でもエラー:', error);
      // 最終手段として状態だけリセット
      this.isSchedulerRunning = false;
    }
  }

  // ===================================================================
  // メンテナンス機能（委譲）
  // ===================================================================

  /**
   * 定期メンテナンス実行（委譲）
   */
  async performPeriodicMaintenance(): Promise<void> {
    return this.schedulerMaintenance.performPeriodicMaintenance();
  }

  /**
   * 自動メンテナンススケジュール設定（委譲）
   */
  setupMaintenanceSchedule(): void {
    this.schedulerMaintenance.setupMaintenanceSchedule();
  }

  // ===================================================================
  // MainLoop統合メソッド群 - 実行ループ制御機能
  // ===================================================================

  /**
   * 単一実行サイクル（30分間隔実行の1回分）
   * MainLoop統合版 - executeScheduledTaskと連携
   */
  async runOnce(): Promise<ExecutionResult> {
    if (this.isExecuting) {
      systemLogger.warn('⚠️ Execution already in progress, skipping');
      return this.createSkippedResult();
    }

    this.isExecuting = true;
    const startTime = Date.now();

    try {
      systemLogger.info('🚀 Starting scheduled execution cycle...');

      // ===================================================================
      // メインワークフロー実行 - main.tsに実装済み
      // MainLoopはスケジュール制御のみ担当
      // ===================================================================
      
      const result = await this.schedulerCore.triggerExecution();
      const executionTime = Date.now() - startTime;

      // ExecutionResultに変換
      const executionResult: ExecutionResult = {
        success: true,
        action: 'scheduled',
        executionTime,
        duration: executionTime,
        error: undefined,
        metadata: {
          executionTime,
          retryCount: 0,
          rateLimitHit: false,
          timestamp: new Date().toISOString()
        }
      };

      // メトリクス更新
      this.updateLoopMetrics(executionResult, true);

      systemLogger.success('✅ Scheduled execution completed:', {
        action: executionResult.action,
        duration: `${executionTime}ms`,
        success: executionResult.success
      });

      return executionResult;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorResult = this.createErrorResult(error as Error, executionTime);
      
      this.updateLoopMetrics(errorResult, false);
      
      systemLogger.error('❌ Scheduled execution failed:', error);
      return errorResult;

    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * ループメトリクス取得
   */
  getLoopMetrics(): LoopMetrics {
    return { ...this.metrics };
  }

  /**
   * メトリクスリセット
   */
  resetLoopMetrics(): void {
    this.initializeMetrics();
    systemLogger.info('📊 Loop metrics reset');
  }

  /**
   * 実行状態確認
   */
  isCurrentlyExecuting(): boolean {
    return this.isExecuting;
  }

  /**
   * システム健全性チェック（MainLoop統合版）
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
      systemLogger.info('🏥 Performing scheduler health check...');

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
        (health.components as any).scheduler = 'error';
      }

      if (!this.metrics || this.metrics.totalExecutions < 0) {
        (health.components as any).metrics = 'error';
      }

      // 全体状況判定
      const errorCount = Object.values(health.components).filter((status: any) => status === 'error').length;
      
      if (errorCount > 0) (health as any).overall = 'critical';

      systemLogger.success('✅ Scheduler health check completed');
      return health;

    } catch (error) {
      systemLogger.error('❌ Scheduler health check failed:', error);
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

  // ===================================================================
  // MainLoop統合プライベートメソッド群 - メトリクス管理
  // ===================================================================

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
        wait: { count: 0, successRate: 0, avgTime: 0 },
        scheduled: { count: 0, successRate: 0, avgTime: 0 }
      },
      learningUpdates: 0,
      lastExecutionTime: ''
    };
  }

  private updateLoopMetrics(result: ExecutionResult, learningUpdated: boolean): void {
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
      duration: 0,
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
      duration: executionTime,
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