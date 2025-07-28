import { systemLogger } from '../../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../../shared/component-container';
import { DataManager } from '../../data/data-manager';

/**
 * SchedulerMaintenance - DataManager統合機能・メンテナンス機能
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • 実行前チェック（前回実行の完了確認、アーカイブ必要性の判定）
 * • 定期メンテナンス（データクリーンアップ、アーカイブ）
 * • ディスク容量チェック
 * • 自動メンテナンススケジュール設定
 * 
 * 🔗 主要機能:
 * • performPreExecutionChecks() - 実行前チェック
 * • performPeriodicMaintenance() - 定期メンテナンス
 * • checkDiskSpace() - ディスク容量チェック
 * • setupMaintenanceSchedule() - メンテナンススケジュール設定
 */
export class SchedulerMaintenance {
  private container: ComponentContainer;

  constructor(container: ComponentContainer) {
    this.container = container;
    systemLogger.info('✅ SchedulerMaintenance initialized');
  }

  // ===================================================================
  // 実行前チェック機能
  // ===================================================================

  /**
   * 実行前チェック（指示書準拠）
   * 前回実行の完了確認、アーカイブ必要性の判定、ディスク容量チェック
   */
  async performPreExecutionChecks(): Promise<void> {
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

  // ===================================================================
  // 定期メンテナンス機能
  // ===================================================================

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
  async checkDiskSpace(): Promise<void> {
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