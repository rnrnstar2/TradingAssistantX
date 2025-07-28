# TASK-001: main.ts緊急クリーンアップ

## 🚨 緊急タスク概要
**責務**: main.tsから詳細ワークフロー実装を削除し80行に削減  
**現状問題**: 538行（目標80行の6.7倍）、MVP制約違反の過剰実装  
**緊急度**: 最高優先度

## 📄 必須事前確認
1. **REQUIREMENTS.md読み込み**: 疎結合設計原則・MVP制約の理解
2. **現状把握**: main.tsが538行に肥大化した状況の確認

## 📂 実装対象
**編集ファイル**: `src/main.ts`

## 🔧 緊急修正内容

### 1. 削除対象コード（130-517行）
以下の詳細実装を**完全削除**：
- `executeWorkflow()` メソッド（130-224行）
- `loadSystemContext()` メソッド（226-283行）  
- `makeClaudeDecision()` メソッド（285-315行）
- `executeAction()` メソッド（317-409行）
- `recordResults()` メソッド（411-453行）
- その他のヘルパーメソッド群（455-517行）

### 2. 修正後のmain.ts（約80行）
```typescript
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
import { ComponentContainer } from './core/component-container';
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
  const runner = new ApplicationRunner();
  await runner.run(app);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('🚨 Fatal error:', error);
    process.exit(1);
  });
}

export { TradingAssistantX };
```

## 🚫 MVP制約遵守事項（厳守）
- ✅ **シンプル実装**: エントリーポイントとしての基本責務のみ
- ✅ **確実な動作**: 詳細実装はワークフロークラスに完全委譲
- 🚫 **詳細実装禁止**: main.tsに具体的なワークフロー実装は絶対に含めない
- 🚫 **行数制限**: 80行を厳守、過剰な実装は一切禁止

## ✅ 完了条件
1. `src/main.ts` が約80行に削減完了
2. 詳細ワークフロー実装の完全削除
3. ExecutionFlowクラスへの適切な委譲確認
4. TypeScript エラーなし
5. 既存インターフェース完全維持

## 📄 出力管理
**報告書出力先**: `tasks/20250724_134201_main_emergency_fix/reports/REPORT-001-main-cleanup-emergency.md`

**報告書内容**:
- 削除前後の行数比較
- 削除したコード量の詳細
- 委譲確認結果