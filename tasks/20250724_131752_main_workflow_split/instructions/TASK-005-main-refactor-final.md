# TASK-005: main.ts 最終リファクタリング

## 🎯 タスク概要
**責務**: 新しいワークフロークラス群を使用したmain.tsの最終簡素化  
**対象**: src/main.ts を約240行→約60行に大幅削減（エントリーポイントのみ残す）  
**依存**: TASK-001〜004 全ての新ワークフロークラス完了必須

## 📂 実装対象
**編集ファイル**: `src/main.ts`

## 🔧 実装内容

### 1. 最終版main.ts実装
既存の src/main.ts を以下の内容で置き換え：

```typescript
#!/usr/bin/env node
/**
 * システム起動スクリプト（エントリーポイント）
 * REQUIREMENTS.md準拠版 - 30分間隔自動実行システム（最終リファクタリング版）
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
import { ComponentContainer, COMPONENT_KEYS } from './core/component-container';
import { SystemInitializer } from './core/system-initializer';
import { HealthChecker } from './core/health-checker';
import { ShutdownManager } from './core/shutdown-manager';
import { SystemStatus } from './core/system-status';
import { ApplicationRunner } from './cli/application-runner';

// ワークフロー専用クラス群
import { SystemLifecycle } from './main-workflows/system-lifecycle';
import { SchedulerManager } from './main-workflows/scheduler-manager';
import { ExecutionFlow } from './main-workflows/execution-flow';
import { StatusController } from './main-workflows/status-controller';

/**
 * TradingAssistantX メインアプリケーションクラス（最終リファクタリング版）
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
    
    // 基盤クラス初期化
    const initializer = new SystemInitializer();
    const healthChecker = new HealthChecker();
    const shutdownManager = new ShutdownManager();
    const systemStatus = new SystemStatus();
    
    // コンポーネントコンテナ初期化
    this.container = initializer.initializeComponents(config);
    
    // ワークフロー専用クラス群初期化
    this.systemLifecycle = new SystemLifecycle(
      this.container, initializer, healthChecker, shutdownManager
    );
    this.schedulerManager = new SchedulerManager(this.container);
    this.executionFlow = new ExecutionFlow(this.container);
    this.statusController = new StatusController(this.container, systemStatus);
    
    systemLogger.info('TradingAssistantX initialized - ワークフロー分離アーキテクチャ版');
  }

  /**
   * システム起動（SystemLifecycleに委譲）
   */
  async start(): Promise<void> {
    await this.systemLifecycle.startSystem();
    
    // スケジューラー開始
    this.schedulerManager.startScheduler(() => this.executionFlow.executeMainLoop());
  }

  /**
   * システム停止（SystemLifecycleに委譲）
   */
  async stop(): Promise<void> {
    this.schedulerManager.stopScheduler();
    await this.systemLifecycle.stopSystem();
  }

  /**
   * システム状態取得（StatusControllerに委譲）
   */
  getSystemStatus(): Record<string, unknown> {
    return this.statusController.getSystemStatus(
      this.systemLifecycle.getInitializationStatus()
    );
  }

  /**
   * 手動実行トリガー（StatusControllerに委譲）
   */
  async triggerManualExecution(): Promise<void> {
    await this.statusController.triggerManualExecution(
      this.systemLifecycle.getInitializationStatus(),
      () => this.executionFlow.executeMainLoop()
    );
  }

  /**
   * 設定リロード（StatusControllerに委譲）
   */
  async reloadConfiguration(): Promise<void> {
    await this.statusController.reloadConfiguration();
    await this.schedulerManager.reloadSchedulerConfig();
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  const app = new TradingAssistantX();
  const runner = new ApplicationRunner();
  
  await runner.run(app);
}

// エントリーポイント実行（ES module対応）
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('🚨 Fatal error:', error);
    process.exit(1);
  });
}

export { TradingAssistantX };
```

## 🔧 リファクタリング要点

### 削減された機能（ワークフロークラスに移行）:
1. **システム起動・停止ロジック** → SystemLifecycle  
2. **スケジューラー管理** → SchedulerManager
3. **メインループ実行フロー** → ExecutionFlow
4. **状態管理・手動実行** → StatusController

### 残存機能（メインクラスの責務）:
1. ワークフロークラス群の初期化・協調制御
2. 公開インターフェース（start/stop/getSystemStatus等）の提供
3. エントリーポイントとしての基本責務のみ

## 🚫 MVP制約遵守事項
- ✅ **シンプル実装**: 既存機能の分離のみ、新機能追加なし
- ✅ **確実な動作**: 既存機能と完全に同等の動作を保証
- 🚫 **新機能追加禁止**: ワークフロー分離のみ実施
- 🚫 **過剰な最適化禁止**: パフォーマンス最適化は行わない

## ✅ 完了条件
1. `src/main.ts` 最終書き換え完了（240行→約80行に削減）
2. TypeScript エラーなし
3. ESLint エラーなし
4. 既存機能との完全な互換性確認
5. 4つのワークフロークラスとの正常な連携確認

## 📄 出力管理
**報告書出力先**: `tasks/20250724_131752_main_workflow_split/reports/REPORT-005-main-refactor-final.md`

**報告書内容**:
- 実装完了確認（行数削減効果も記載）
- 型チェック・Lint結果
- 既存機能との互換性確認結果
- ワークフロー分離効果の確認