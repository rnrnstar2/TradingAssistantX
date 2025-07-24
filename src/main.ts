#!/usr/bin/env node
/**
 * TradingAssistantX システム起動スクリプト（エンドポイント別設計対応版）
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 ファイルの役割:
 * • システム全体のエントリーポイント・アプリケーション統合管理
 * • 30分間隔自動実行システムのメイン制御クラス提供
 * • 4つのワークフロークラス（SystemLifecycle, SchedulerManager, ExecutionFlow, StatusController）との連携
 * • エンドポイント別Claude SDK統合によるインテリジェントな投稿自動化
 * 
 * 🔗 他ファイルとの関係性:
 * • SystemLifecycle: システム起動・停止・初期化ワークフロー管理
 * • SchedulerManager: 30分間隔スケジューラー制御・設定管理
 * • ExecutionFlow: メインループ実行フロー・4ステップワークフロー管理
 * • StatusController: システム状態監視・手動実行・設定リロード制御
 * • claude/: エンドポイント別Claude SDK（判断・生成・分析・検索）
 * 
 * 📋 REQUIREMENTS.md準拠:
 * • エンドポイント別Claude SDK統合アーキテクチャ
 * • 30分間隔自動実行システム実装
 * • 投資教育コンテンツの自動投稿・学習機能
 */

import 'dotenv/config';
import { getConfig } from './shared/config';
import { systemLogger } from './shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from './shared/component-container';
import { DataManager } from './data/data-manager';

// エンドポイント別Claude SDK統合
import { makeDecision, generateContent, analyzePerformance } from './claude';
import type { ClaudeDecision, GeneratedContent, AnalysisResult } from './claude/types';

// main-workflows 4つのワークフロー専用クラス群
import { SystemLifecycle } from './main-workflows/system-lifecycle';
import { SchedulerManager } from './main-workflows/scheduler-manager';
import { ExecutionFlow } from './main-workflows/execution-flow';
import { StatusController } from './main-workflows/status-controller';

/**
 * TradingAssistantX メインアプリケーションクラス（エンドポイント別設計版）
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 クラスの責任範囲:
 * • システム全体の統合管理・エントリーポイント機能
 * • 4つのワークフロークラスとの協調制御
 * • 外部からのシステム操作インターフェース提供
 * • アプリケーションライフサイクル全体の管理
 * 
 * 🔄 主要メソッド:
 * • constructor(): 段階的な初期化プロセス・依存性注入コンテナ構築
 * • start(): システム起動・スケジューラー開始
 * • stop(): グレースフルシャットダウン・リソースクリーンアップ
 * • executeOnce(): 手動実行（テスト・デバッグ用）
 * • getSystemStatus(): システム状態取得・監視情報提供
 * 
 * 🏗️ アーキテクチャ設計:
 * • 疎結合設計: 各ワークフロークラスが独立した責任範囲を持つ
 * • 依存性注入: ComponentContainerによる統一されたコンポーネント管理
 * • エラー分離: 各段階でのエラーハンドリング・適切な例外伝播
 */
class TradingAssistantX {
  private container: ComponentContainer;
  private systemLifecycle: SystemLifecycle;
  private schedulerManager: SchedulerManager;
  private executionFlow: ExecutionFlow;
  private statusController: StatusController;

  constructor() {
    try {
      systemLogger.info('🚀 TradingAssistantX初期化開始 - エンドポイント別設計版');
      
      // ===================================================================
      // 【初期化ステップ1】基本設定・環境変数読み込み
      // ===================================================================
      
      systemLogger.info('⚙️ 【初期化ステップ1】基本設定読み込み開始');
      const config = getConfig();
      if (!config) {
        throw new Error('Configuration loading failed - 設定ファイルの読み込みに失敗しました');
      }
      systemLogger.success('✅ 基本設定読み込み完了');

      // ===================================================================
      // 【初期化ステップ2】依存性注入コンテナ・コンポーネント初期化
      // ===================================================================
      
      systemLogger.info('📦 【初期化ステップ2】ComponentContainer初期化開始');
      this.container = new ComponentContainer();
      this.systemLifecycle = new SystemLifecycle(this.container);
      
      // SystemLifecycle経由でのコンポーネント初期化（統一された方法）
      this.container = this.systemLifecycle.initializeComponents(config);
      if (!this.container) {
        throw new Error('Component container initialization failed - コンポーネントコンテナの初期化に失敗しました');
      }
      systemLogger.success('✅ ComponentContainer初期化完了');
      
      // ===================================================================
      // 【初期化ステップ3】ワークフロークラス群の初期化・連携構築
      // ===================================================================
      
      systemLogger.info('🔄 【初期化ステップ3】ワークフロークラス群初期化開始');
      
      // 各ワークフロークラスの初期化（依存関係順序を考慮）
      this.schedulerManager = new SchedulerManager(this.container);
      this.executionFlow = new ExecutionFlow(this.container);
      this.statusController = new StatusController(this.container);
      
      // 初期化完了の検証
      if (!this.schedulerManager || !this.executionFlow || !this.statusController) {
        throw new Error('Workflow classes initialization failed - ワークフロークラスの初期化に失敗しました');
      }
      
      systemLogger.success('✅ ワークフロークラス群初期化完了');
      systemLogger.success('✅ TradingAssistantX初期化完了 - 30分間隔自動実行準備完了');
      
    } catch (error) {
      systemLogger.error('❌ TradingAssistantX初期化失敗:', error);
      throw new Error(`TradingAssistantX initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * システム起動ワークフロー
   * SystemLifecycle → SchedulerManager の順序でシステムを起動
   * 
   * 🔄 処理フロー:
   * 1. SystemLifecycle.startSystem(): システム初期化・ヘルスチェック
   * 2. SchedulerManager.startScheduler(): 30分間隔スケジューラー開始
   * 3. ExecutionFlow.executeMainLoop()をコールバックとして登録
   */
  async start(): Promise<void> {
    try {
      systemLogger.info('🚀 【システム起動ワークフロー】開始');
      
      // ===================================================================
      // 【システム起動ステップ1】SystemLifecycle起動
      // ===================================================================
      
      systemLogger.info('⚙️ 【起動ステップ1】SystemLifecycle起動開始');
      await this.systemLifecycle.startSystem();
      systemLogger.success('✅ SystemLifecycle起動完了');
      
      // ===================================================================
      // 【システム起動ステップ2】SchedulerManager起動・メインループ登録
      // ===================================================================
      
      systemLogger.info('⏰ 【起動ステップ2】SchedulerManager起動・30分間隔実行開始');
      this.schedulerManager.startScheduler(() => this.executionFlow.executeMainLoop());
      systemLogger.success('✅ SchedulerManager起動完了');
      
      systemLogger.success('🎉 システム起動ワークフロー完了 - 30分間隔自動実行開始');
      
    } catch (error) {
      systemLogger.error('❌ システム起動ワークフロー失敗:', error);
      throw new Error(`System startup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * システム停止ワークフロー（グレースフルシャットダウン）
   * SchedulerManager → SystemLifecycle の順序で安全にシステムを停止
   * 
   * 🔄 処理フロー:
   * 1. SchedulerManager.stopScheduler(): スケジューラー停止・実行中処理完了待機
   * 2. SystemLifecycle.stopSystem(): 全コンポーネント停止・データ保存・リソースクリーンアップ
   */
  async stop(): Promise<void> {
    try {
      systemLogger.info('⏹️ 【システム停止ワークフロー】開始');
      
      // ===================================================================
      // 【システム停止ステップ1】SchedulerManager停止
      // ===================================================================
      
      systemLogger.info('⏰ 【停止ステップ1】SchedulerManager停止開始');
      this.schedulerManager.stopScheduler();
      systemLogger.success('✅ SchedulerManager停止完了');
      
      // ===================================================================
      // 【システム停止ステップ2】SystemLifecycle停止・リソースクリーンアップ
      // ===================================================================
      
      systemLogger.info('🛑 【停止ステップ2】SystemLifecycle停止・リソースクリーンアップ開始');
      await this.systemLifecycle.stopSystem();
      systemLogger.success('✅ SystemLifecycle停止完了');
      
      systemLogger.success('🎯 システム停止ワークフロー完了 - グレースフルシャットダウン成功');
      
    } catch (error) {
      systemLogger.error('❌ システム停止ワークフロー失敗:', error);
      throw new Error(`System shutdown failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 手動実行（テスト・デバッグ用）
   * スケジューラーを経由せずに即座にメインループを実行
   * 
   * 🎯 用途:
   * • デバッグ・開発時のテスト実行
   * • 設定変更後の動作確認
   * • 緊急時の手動アクション実行
   * 
   * ⚠️ 注意:
   * • 手動実行は定期実行とは独立して動作
   * • 手動実行後も30分毎の定期実行は継続
   */
  async executeOnce(): Promise<void> {
    try {
      systemLogger.info('🔧 【手動実行】開始 - スケジューラー経由なしの即座実行');
      
      const isInitialized = this.systemLifecycle.getInitializationStatus();
      if (!isInitialized) {
        throw new Error('System not initialized - システム初期化未完了');
      }
      
      // DataManager統合: 実行サイクル初期化
      const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
      const executionId = await dataManager.initializeExecutionCycle();
      systemLogger.info(`📊 [DataManager] 実行サイクル初期化完了: ${executionId}`);
      
      // 前回実行のアーカイブ（必要な場合）
      await dataManager.archiveCurrentToHistory();
      systemLogger.info('📦 [DataManager] 前回実行データアーカイブ完了');
      
      await this.executionFlow.executeMainLoop();
      systemLogger.success('✅ 手動実行完了 - 定期実行は予定通り継続');
      
    } catch (error) {
      systemLogger.error('❌ 手動実行失敗:', error);
      throw new Error(`Manual execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * システム状態取得・監視情報提供
   * StatusController経由で詳細なシステム状態を取得
   * 
   * 🔄 連携フロー:
   * • StatusController.getSystemStatus(): 詳細状態情報収集
   * • SchedulerManager.getSchedulerStatus(): スケジューラー状態取得
   * • ExecutionFlow.getExecutionStatus(): 実行フロー状態取得
   * 
   * 📊 返却情報:
   * • 初期化状態・スケジューラー状態・実行状態
   * • システムリソース情報・パフォーマンス情報
   * • 最終実行時刻・次回実行予定・エラー情報
   */
  getSystemStatus(): Record<string, unknown> {
    try {
      systemLogger.debug('📊 システム状態取得開始');
      
      const isInitialized = this.systemLifecycle.getInitializationStatus();
      
      // StatusController経由での詳細状態取得
      const detailedStatus = this.statusController.getSystemStatus(isInitialized);
      
      // SchedulerManager状態の追加
      const schedulerStatus = this.schedulerManager.getSchedulerStatus();
      
      // ExecutionFlow状態の追加
      const executionStatus = this.executionFlow.getExecutionStatus();
      
      const systemStatus = {
        ...detailedStatus,
        scheduler: schedulerStatus,
        execution: executionStatus,
        applicationLevel: {
          mainClass: 'TradingAssistantX',
          architecture: 'エンドポイント別設計版',
          workflows: ['SystemLifecycle', 'SchedulerManager', 'ExecutionFlow', 'StatusController']
        }
      };
      
      systemLogger.debug('✅ システム状態取得完了');
      return systemStatus;
      
    } catch (error) {
      systemLogger.error('❌ システム状態取得エラー:', error);
      return {
        error: 'System status retrieval failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        initialized: false
      };
    }
  }

  /**
   * 手動実行トリガー（外部インターフェース）
   * StatusController経由で手動実行を安全に実行
   */
  async triggerManualExecution(): Promise<void> {
    try {
      systemLogger.info('🔧 外部トリガー経由手動実行開始');
      
      const isInitialized = this.systemLifecycle.getInitializationStatus();
      await this.statusController.triggerManualExecution(
        isInitialized,
        () => this.executionFlow.executeMainLoop()
      );
      
      systemLogger.success('✅ 外部トリガー経由手動実行完了');
      
    } catch (error) {
      systemLogger.error('❌ 外部トリガー経由手動実行失敗:', error);
      throw new Error(`Trigger manual execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * システム設定リロード（外部インターフェース）
   * StatusController経由で設定を安全にリロード
   */
  async reloadConfiguration(): Promise<void> {
    try {
      systemLogger.info('🔄 外部トリガー経由設定リロード開始');
      
      await this.statusController.reloadConfiguration();
      
      systemLogger.success('✅ 外部トリガー経由設定リロード完了');
      
    } catch (error) {
      systemLogger.error('❌ 外部トリガー経由設定リロード失敗:', error);
      throw new Error(`Configuration reload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * メイン実行関数 - TradingAssistantXアプリケーション起動
 * システム全体の起動・エラーハンドリング・シグナル対応を統合管理
 * 
 * 🔄 実行フロー:
 * 1. TradingAssistantXインスタンス作成・初期化
 * 2. システム起動（SystemLifecycle → SchedulerManager）
 * 3. エラー発生時のグレースフルシャットダウン
 * 
 * 🛡️ エラーハンドリング:
 * • 初期化エラー: システム起動前の設定・依存関係エラー
 * • 起動エラー: SystemLifecycle・SchedulerManager起動エラー
 * • 実行時エラー: uncaughtException・unhandledRejection対応
 */
async function main(): Promise<void> {
  let app: TradingAssistantX | null = null;
  
  try {
    systemLogger.info('🚀 【メイン実行関数】TradingAssistantX起動開始');
    
    // ===================================================================
    // 【メイン実行ステップ1】TradingAssistantXインスタンス作成・初期化
    // ===================================================================
    
    systemLogger.info('⚙️ 【メインステップ1】TradingAssistantXインスタンス作成開始');
    app = new TradingAssistantX();
    systemLogger.success('✅ TradingAssistantXインスタンス作成完了');
    
    // ===================================================================
    // 【メイン実行ステップ2】システム起動（SystemLifecycle + SchedulerManager）
    // ===================================================================
    
    systemLogger.info('🚀 【メインステップ2】システム起動開始');
    await app.start();
    systemLogger.success('✅ システム起動完了');
    
    systemLogger.success('🎉 TradingAssistantX起動完了 - 30分間隔自動実行システム稼働中');
    
  } catch (error) {
    systemLogger.error('❌ TradingAssistantX起動失敗:', error);
    
    // グレースフルシャットダウンの試行
    if (app) {
      try {
        systemLogger.info('🛑 緊急シャットダウン実行中...');
        await app.stop();
        systemLogger.info('✅ 緊急シャットダウン完了');
      } catch (shutdownError) {
        systemLogger.error('❌ 緊急シャットダウンもエラー:', shutdownError);
      }
    }
    
    throw new Error(`TradingAssistantX startup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ===================================================================
// ESM対応のエントリーポイント判定・プロセス起動管理
// ===================================================================

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);

/**
 * プロセス直接実行時のエントリーポイント
 * 未処理エラー・シグナルハンドリング・プロセス終了制御を統合管理
 */
if (process.argv[1] === __filename) {
  // ===================================================================
  // グローバルエラーハンドリング・プロセス安全性確保
  // ===================================================================
  
  // 未処理例外の捕捉
  process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception - システム緊急停止:', error);
    console.error('スタックトレース:', error.stack);
    process.exit(1);
  });

  // 未処理Promise拒否の捕捉
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Promise Rejection - システム緊急停止:');
    console.error('Promise:', promise);
    console.error('Reason:', reason);
    process.exit(1);
  });

  // メイン実行・エラー対応
  main().catch((error) => {
    console.error('🚨 Fatal system error - TradingAssistantX起動失敗:', error);
    console.error('詳細エラー情報:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace available',
      timestamp: new Date().toISOString(),
      processId: process.pid
    });
    
    // システム終了前のクリーンアップ猶予時間
    setTimeout(() => {
      console.error('🛑 プロセス終了実行');
      process.exit(1);
    }, 1000);
  });
}

export { TradingAssistantX };