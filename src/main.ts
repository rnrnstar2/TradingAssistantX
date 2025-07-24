#!/usr/bin/env node
/**
 * システム起動スクリプト（エントリーポイント）
 * REQUIREMENTS.md準拠版 - 30分間隔自動実行システム（クリーンアップ版）
 * 
 * ワークフロー別クラス構成:
 * • SystemLifecycle    - システム起動・停止・初期化
 * • SchedulerManager   - スケジューラー管理・30分間隔制御
 * • ExecutionFlow      - メインループ実行・4ステップワークフロー
 * • StatusController   - 状態管理・手動実行・設定リロード
 */

import 'dotenv/config';
import { getConfig } from './shared/config';
import { systemLogger } from './shared/logger';
import { ComponentContainer } from './shared/component-container';

// ワークフロー専用クラス群
import { SystemLifecycle } from './main-workflows/system-lifecycle';
import { SchedulerManager } from './main-workflows/scheduler-manager';
import { ExecutionFlow } from './main-workflows/execution-flow';
import { StatusController } from './main-workflows/status-controller';

/**
 * TradingAssistantX メインアプリケーションクラス（クリーンアップ版）
 * ワークフロー別クラス群による完全分離アーキテクチャ
 */
class TradingAssistantX {
  private container: ComponentContainer;
  private systemLifecycle: SystemLifecycle;
  private schedulerManager: SchedulerManager;
  private executionFlow: ExecutionFlow;
  private statusController: StatusController;

  constructor() {
    const config = getConfig();
    
    // ワークフロー専用クラス群初期化
    this.systemLifecycle = new SystemLifecycle(new ComponentContainer());
    
    // SystemLifecycleでコンポーネント初期化を実行
    this.container = this.systemLifecycle.initializeComponents(config);
    
    this.schedulerManager = new SchedulerManager(this.container);
    this.executionFlow = new ExecutionFlow(this.container);
    this.statusController = new StatusController(this.container);
    
    systemLogger.info('TradingAssistantX initialized - ワークフロー分離アーキテクチャ版');
  }

  async start(): Promise<void> {
    await this.systemLifecycle.startSystem();
    this.schedulerManager.startScheduler(() => this.executionFlow.executeMainLoop());
  }

  async stop(): Promise<void> {
    this.schedulerManager.stopScheduler();
    await this.systemLifecycle.stopSystem();
  }

  getSystemStatus(): Record<string, unknown> {
    return this.statusController.getSystemStatus(
      this.systemLifecycle.getInitializationStatus()
    );
  }

  async triggerManualExecution(): Promise<void> {
    await this.statusController.triggerManualExecution(
      this.systemLifecycle.getInitializationStatus(),
      () => this.executionFlow.executeMainLoop()
    );
  }

  async reloadConfiguration(): Promise<void> {
    await this.statusController.reloadConfiguration();
    await this.schedulerManager.reloadSchedulerConfig();
  }
}

async function main(): Promise<void> {
  const app = new TradingAssistantX();
  // ApplicationRunner functionality is integrated into SystemLifecycle
  await app.start();
}

// Check if this module is being run directly (CommonJS compatible)
if (require.main === module) {
  main().catch((error) => {
    console.error('🚨 Fatal error:', error);
    process.exit(1);
  });
}

export { TradingAssistantX };