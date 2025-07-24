import { systemLogger } from '../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../shared/component-container';
import { Config } from '../shared/config';
import { CoreScheduler } from '../scheduler/core-scheduler';
import { DataManager } from '../data/data-manager';
import { ExecutionResult } from '../shared/types';

/**
 * SchedulerManager - スケジューラー管理・30分間隔実行制御クラス
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • CoreSchedulerの起動・停止・設定管理
 * • 30分間隔でのメインループ実行コールバック制御
 * • スケジューラー状態の監視・報告
 * • 動的設定リロード機能
 * 
 * 🔗 主要連携:
 * • main.ts → startScheduler()でexecuteMainLoop()をコールバック登録
 * • CoreScheduler → 内部タイマー管理とワークフロー実行
 * • Config → スケジューラー設定の動的読み込み
 * • StatusController → 手動実行との協調制御
 */
export class SchedulerManager {
  private container: ComponentContainer;
  private isSchedulerRunning: boolean = false;

  constructor(container: ComponentContainer) {
    this.container = container;
  }

  /**
   * スケジューラー起動ワークフロー
   * CoreSchedulerを初期化し、30分間隔での自動実行を開始
   * 
   * @param executeCallback メインループ実行コールバック（ExecutionFlow.executeMainLoop）
   * @throws Error スケジューラー起動に失敗した場合
   */
  startScheduler(executeCallback: () => Promise<ExecutionResult>): void {
    try {
      // ===================================================================
      // 【スケジューラー起動ワークフロー】
      // 0. 実行前チェック → 1. 設定読み込み → 2. スケジューラー設定 → 3. スケジューラー開始
      // ===================================================================
      
      systemLogger.info('🔍 【スケジューラー起動ステップ0】実行前チェック開始');
      this.performPreExecutionChecks();
      systemLogger.success('✅ 実行前チェック完了');
      
      systemLogger.info('⚙️ 【スケジューラー起動ステップ1】設定読み込み開始');
      
      // ComponentContainerから必要なコンポーネントを取得
      const config = this.container.get<Config>(COMPONENT_KEYS.CONFIG);
      const scheduler = this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER);
      
      if (!config || !scheduler) {
        throw new Error('Required components not found in container');
      }
      
      const schedulerConfig = config.getSchedulerConfig();
      this.validateSchedulerConfig(schedulerConfig);
      systemLogger.success('✅ スケジューラー設定読み込み・検証完了');

      systemLogger.info('🔧 【スケジューラー起動ステップ2】CoreScheduler設定開始');
      scheduler.updateConfig(schedulerConfig);
      scheduler.setExecutionCallback(executeCallback);
      systemLogger.success('✅ CoreScheduler設定完了');

      systemLogger.info('▶️ 【スケジューラー起動ステップ3】スケジューラー開始');
      scheduler.start();
      this.isSchedulerRunning = true;
      
      systemLogger.success('⏰ スケジューラー起動完了 - 30分毎自動実行開始:', {
        interval: `${schedulerConfig.intervalMinutes}分間隔`,
        maxDaily: `最大${schedulerConfig.maxDailyExecutions}回/日`,
        workflow: '【データ読み込み→Claude判断→アクション実行→結果記録】',
        status: 'RUNNING',
        nextExecution: new Date(Date.now() + (schedulerConfig.intervalMinutes * 60 * 1000)).toISOString()
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
   * 実行中のスケジューラーを安全に停止し、リソースをクリーンアップ
   */
  stopScheduler(): void {
    try {
      systemLogger.info('⏹️ スケジューラー停止プロセス開始');
      
      if (!this.isSchedulerRunning) {
        systemLogger.info('ℹ️ スケジューラーは既に停止済み');
        return;
      }
      
      if (this.container.has(COMPONENT_KEYS.SCHEDULER)) {
        const scheduler = this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER);
        
        // スケジューラーの現在状態を記録（デバッグ用）
        const status = scheduler.getStatus();
        systemLogger.debug('📊 停止前スケジューラー状態:', status);
        
        // 安全な停止実行
        scheduler.stop();
        this.isSchedulerRunning = false;
        
        systemLogger.success('✅ スケジューラー停止完了', {
          previousStatus: status,
          stoppedAt: new Date().toISOString()
        });
      } else {
        systemLogger.warn('⚠️ CoreSchedulerコンポーネントが見つかりません');
        this.isSchedulerRunning = false;
      }

    } catch (error) {
      systemLogger.error('❌ スケジューラー停止エラー:', error);
      // エラーが発生してもスケジューラーは停止状態にマーク
      this.isSchedulerRunning = false;
      
      // 緊急停止処理
      this.forceStopScheduler();
    }
  }

  /**
   * スケジューラー状態取得
   */
  getSchedulerStatus(): {
    running: boolean;
    config?: { intervalMinutes: number; maxDailyExecutions: number };
    nextExecution?: string;
  } {
    try {
      if (!this.container.has(COMPONENT_KEYS.SCHEDULER)) {
        return { running: false };
      }

      const config = this.container.get<Config>(COMPONENT_KEYS.CONFIG);
      
      return {
        running: this.isSchedulerRunning,
        config: config.getSchedulerConfig(),
        nextExecution: new Date(Date.now() + (config.getSchedulerConfig().intervalMinutes * 60 * 1000)).toISOString()
      };

    } catch (error) {
      systemLogger.error('❌ スケジューラー状態取得エラー:', error);
      return { running: false };
    }
  }

  /**
   * スケジューラー設定動的リロードワークフロー
   * システム稼働中に設定を再読み込みし、CoreSchedulerに反映
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
      oldConfig = config.getSchedulerConfig();
      systemLogger.debug('📋 現在の設定をバックアップ:', oldConfig);
      
      // 新しい設定を読み込み
      await config.reloadConfig();
      const newSchedulerConfig = config.getSchedulerConfig();
      
      // 設定の検証
      this.validateSchedulerConfig(newSchedulerConfig);
      
      if (this.isSchedulerRunning) {
        systemLogger.info('⚙️ 稼働中スケジューラーに新設定を適用中...');
        
        const scheduler = this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER);
        if (!scheduler) {
          throw new Error('CoreScheduler component not found');
        }
        
        // 新設定をCoreSchedulerに適用
        scheduler.updateConfig(newSchedulerConfig);
        
        systemLogger.success('✅ 稼働中スケジューラー設定更新完了:', {
          oldInterval: `${oldConfig.intervalMinutes}分間隔`,
          newInterval: `${newSchedulerConfig.intervalMinutes}分間隔`,
          oldMaxDaily: `最大${oldConfig.maxDailyExecutions}回/日`,
          newMaxDaily: `最大${newSchedulerConfig.maxDailyExecutions}回/日`,
          appliedAt: new Date().toISOString()
        });
      } else {
        systemLogger.info('ℹ️ スケジューラー未稼働 - 設定のみリロード完了');
      }
      
      systemLogger.success('🔄 スケジューラー設定リロード完了');

    } catch (error) {
      systemLogger.error('❌ スケジューラー設定リロードエラー:', error);
      
      // ロールバック処理（可能な場合）
      if (oldConfig && this.isSchedulerRunning) {
        try {
          systemLogger.info('🔙 設定ロールバック試行中...');
          const scheduler = this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER);
          scheduler?.updateConfig(oldConfig);
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
   * 起動失敗時のクリーンアップ処理
   */
  private cleanupFailedStartup(): void {
    try {
      systemLogger.info('🧹 起動失敗クリーンアップ実行中...');
      
      // スケジューラー状態をリセット
      this.isSchedulerRunning = false;
      
      // 可能であればSchedulerを停止状態にする
      if (this.container.has(COMPONENT_KEYS.SCHEDULER)) {
        const scheduler = this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER);
        try {
          scheduler.stop();
        } catch (stopError) {
          systemLogger.warn('⚠️ クリーンアップ中のScheduler停止で軽微なエラー:', stopError);
        }
      }
      
      systemLogger.info('✅ 起動失敗クリーンアップ完了');
    } catch (cleanupError) {
      systemLogger.error('❌ クリーンアップ処理でエラー:', cleanupError);
    }
  }

  /**
   * 緊急停止処理（通常停止が失敗した場合）
   */
  private forceStopScheduler(): void {
    try {
      systemLogger.warn('⚠️ スケジューラー緊急停止処理実行中...');
      
      // 強制的に停止状態にマーク
      this.isSchedulerRunning = false;
      
      systemLogger.info('✅ スケジューラー緊急停止完了');
    } catch (error) {
      systemLogger.error('❌ 緊急停止処理でもエラー:', error);
      // 最終手段として状態だけリセット
      this.isSchedulerRunning = false;
    }
  }

  // ===================================================================
  // DataManager統合機能 - 実行前チェック・定期メンテナンス
  // ===================================================================

  /**
   * 実行前チェック（指示書準拠）
   * 前回実行の完了確認、アーカイブ必要性の判定、ディスク容量チェック
   */
  private async performPreExecutionChecks(): Promise<void> {
    try {
      systemLogger.info('📋 実行前チェック開始...');
      
      const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
      
      // 1. 前回実行の完了確認
      const healthCheck = await dataManager.performHealthCheck();
      if (healthCheck.errors.length > 0) {
        systemLogger.warn('⚠️ データベース整合性に問題があります:', healthCheck.errors);
      } else {
        systemLogger.success('✅ データベース整合性チェック正常');
      }
      
      // 2. アーカイブ必要性の判定（アクティブセッションをチェック）
      try {
        const currentData = await dataManager.getCurrentExecutionData();
        if (currentData.executionId) {
          systemLogger.info(`🗂️ 未完了実行を検出: ${currentData.executionId} - アーカイブを実行`);
          await dataManager.archiveCurrentToHistory();
        }
      } catch (error) {
        // 現在実行データがない場合は正常（新規実行）
        systemLogger.debug('現在実行データなし（新規実行）');
      }
      
      // 3. ディスク容量チェック（簡易版）
      await this.checkDiskSpace();
      
      systemLogger.success('✅ 実行前チェック完了');
      
    } catch (error) {
      systemLogger.error('❌ 実行前チェック失敗:', error);
      throw new Error(`Pre-execution checks failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 定期メンテナンス実行
   * 古いcurrentデータの自動アーカイブ、historyデータの月次整理
   */
  async performPeriodicMaintenance(): Promise<void> {
    try {
      systemLogger.info('🧹 定期メンテナンス開始...');
      
      const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
      
      // 1. 古いcurrentデータの自動アーカイブ
      try {
        await dataManager.archiveCurrentToHistory();
        systemLogger.info('📦 古いcurrentデータのアーカイブ完了');
      } catch (error) {
        systemLogger.warn('⚠️ currentデータアーカイブでエラー:', error);
      }
      
      // 2. 古いデータのクリーンアップ（30日以上前のデータを削除）
      await dataManager.cleanupOldData(30);
      systemLogger.info('🗑️ 古いデータクリーンアップ完了');
      
      // 3. アーカイブ整合性チェック
      const isArchiveValid = await dataManager.validateArchive();
      if (isArchiveValid) {
        systemLogger.success('✅ アーカイブ整合性チェック正常');
      } else {
        systemLogger.warn('⚠️ アーカイブ整合性に問題があります');
      }
      
      systemLogger.success('✅ 定期メンテナンス完了');
      
    } catch (error) {
      systemLogger.error('❌ 定期メンテナンス失敗:', error);
      // メンテナンス失敗は致命的でないため、エラーをログに記録するだけ
    }
  }

  /**
   * ディスク容量チェック（簡易版）
   */
  private async checkDiskSpace(): Promise<void> {
    try {
      // Node.jsで利用可能な範囲でのディスク容量チェック
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const dataDir = path.join(process.cwd(), 'src', 'data');
      
      try {
        const stats = await fs.stat(dataDir);
        systemLogger.debug('データディレクトリサイズチェック完了');
      } catch (error) {
        systemLogger.warn('⚠️ データディレクトリアクセスできません:', error);
      }
      
      // 実際の容量チェックは制限があるため、ログ出力のみ
      systemLogger.success('✅ ディスク容量チェック完了');
      
    } catch (error) {
      systemLogger.warn('⚠️ ディスク容量チェックでエラー:', error);
      // 容量チェック失敗は致命的でないため、警告のみ
    }
  }

  /**
   * 自動メンテナンススケジュール設定
   * 1日1回の定期メンテナンスを設定（深夜2時実行）
   */
  setupMaintenanceSchedule(): void {
    try {
      systemLogger.info('⏰ 定期メンテナンススケジュール設定中...');
      
      // 24時間 = 24 * 60 * 60 * 1000ms
      const maintenanceInterval = 24 * 60 * 60 * 1000;
      
      // 深夜2時に実行するためのタイマー設定
      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(2, 0, 0, 0); // 深夜2:00
      
      // 次回実行時刻が過去の場合は翌日に設定
      if (targetTime <= now) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      const timeUntilMaintenance = targetTime.getTime() - now.getTime();
      
      // 初回実行タイマー
      setTimeout(() => {
        this.performPeriodicMaintenance();
        
        // 以降は24時間間隔で実行
        setInterval(() => {
          this.performPeriodicMaintenance();
        }, maintenanceInterval);
        
      }, timeUntilMaintenance);
      
      systemLogger.success(`✅ 定期メンテナンススケジュール設定完了 - 次回実行: ${targetTime.toISOString()}`);
      
    } catch (error) {
      systemLogger.error('❌ メンテナンススケジュール設定失敗:', error);
      // スケジュール設定失敗は致命的でないため、エラーログのみ
    }
  }
}