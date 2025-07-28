# TASK-007: main.ts リファクタリング

## 🎯 タスク概要
**責務**: 新しいクラス群を使用したmain.tsの大幅簡素化  
**対象**: src/main.ts の全面的な書き換え（426行→約80行に削減）  
**依存**: TASK-001〜006 全ての新クラス完了必須

## 📂 実装対象
**編集ファイル**: `src/main.ts`

## 🔧 実装内容

### 1. 新しいmain.ts実装
既存の src/main.ts を以下の内容で置き換え：

```typescript
#!/usr/bin/env node
/**
 * システム起動スクリプト
 * REQUIREMENTS.md準拠版 - 30分間隔自動実行システム（リファクタリング版）
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

/**
 * TradingAssistantX メインアプリケーションクラス（リファクタリング版）
 * 30分間隔での自動実行システムを統合・管理
 */
class TradingAssistantX {
  private container: ComponentContainer;
  private initializer: SystemInitializer;
  private healthChecker: HealthChecker;
  private shutdownManager: ShutdownManager;
  private systemStatus: SystemStatus;
  private isInitialized: boolean = false;

  constructor() {
    const config = getConfig();
    
    // 専用クラス初期化
    this.initializer = new SystemInitializer();
    this.healthChecker = new HealthChecker();
    this.shutdownManager = new ShutdownManager();
    this.systemStatus = new SystemStatus();
    
    // コンポーネント初期化
    this.container = this.initializer.initializeComponents(config);
    
    systemLogger.info('TradingAssistantX initialized - REQUIREMENTS.md準拠版（リファクタリング）');
  }

  /**
   * システム起動
   */
  async start(): Promise<void> {
    try {
      systemLogger.info('🚀 TradingAssistantX システム開始');

      // 初期化
      await this.initializer.initialize(this.container);
      this.isInitialized = true;

      // ヘルスチェック
      const mainLoop = this.container.get(COMPONENT_KEYS.MAIN_LOOP);
      const dataManager = this.container.get(COMPONENT_KEYS.DATA_MANAGER);
      const kaitoClient = this.container.get(COMPONENT_KEYS.KAITO_CLIENT);
      
      await this.healthChecker.performSystemHealthCheck(mainLoop, dataManager, kaitoClient);

      // スケジューラー開始
      this.startScheduler();

      systemLogger.success('✅ システム起動完了 - 30分間隔自動実行開始');

    } catch (error) {
      systemLogger.error('❌ システム起動失敗:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * システム停止
   */
  async stop(): Promise<void> {
    systemLogger.info('⏹️ システム停止処理開始');
    
    const scheduler = this.container.has(COMPONENT_KEYS.SCHEDULER) 
      ? this.container.get(COMPONENT_KEYS.SCHEDULER) : null;
    const dataManager = this.container.has(COMPONENT_KEYS.DATA_MANAGER) 
      ? this.container.get(COMPONENT_KEYS.DATA_MANAGER) : null;
    
    await this.shutdownManager.gracefulShutdown(scheduler, dataManager);
    systemLogger.success('✅ システム停止完了');
  }

  /**
   * システム状態取得
   */
  getSystemStatus(): any {
    const scheduler = this.container.has(COMPONENT_KEYS.SCHEDULER) 
      ? this.container.get(COMPONENT_KEYS.SCHEDULER) : null;
    const mainLoop = this.container.has(COMPONENT_KEYS.MAIN_LOOP) 
      ? this.container.get(COMPONENT_KEYS.MAIN_LOOP) : null;

    return this.systemStatus.getSystemStatus(this.isInitialized, scheduler, mainLoop);
  }

  /**
   * 手動実行トリガー（デバッグ用）
   */
  async triggerManualExecution(): Promise<void> {
    await this.systemStatus.triggerManualExecution(
      this.isInitialized, 
      () => this.executeMainLoop()
    );
  }

  /**
   * 設定リロード
   */
  async reloadConfiguration(): Promise<void> {
    const config = this.container.get(COMPONENT_KEYS.CONFIG);
    const scheduler = this.container.get(COMPONENT_KEYS.SCHEDULER);
    
    await this.systemStatus.reloadConfiguration(config, scheduler);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private startScheduler(): void {
    const config = this.container.get(COMPONENT_KEYS.CONFIG);
    const scheduler = this.container.get(COMPONENT_KEYS.SCHEDULER);
    
    const schedulerConfig = config.getSchedulerConfig();
    
    scheduler.updateConfig(schedulerConfig);
    scheduler.setExecutionCallback(async () => {
      return await this.executeMainLoop();
    });

    scheduler.start();
    
    systemLogger.info('⏰ スケジューラー開始:', {
      interval: schedulerConfig.intervalMinutes,
      maxDaily: schedulerConfig.maxDailyExecutions
    });
  }

  private async executeMainLoop(): Promise<{ success: boolean; duration: number; error?: string }> {
    const startTime = Date.now();

    try {
      systemLogger.info('🔄 メインループ実行開始');

      const mainLoop = this.container.get(COMPONENT_KEYS.MAIN_LOOP);
      const result = await mainLoop.runOnce();

      const duration = Date.now() - startTime;

      if (result.success) {
        systemLogger.success('✅ メインループ実行完了:', {
          action: result.action,
          duration: `${duration}ms`,
          confidence: result.metadata.confidence
        });

        return { success: true, duration };
      } else {
        systemLogger.error('❌ メインループ実行失敗:', result.error);
        return { success: false, duration, error: result.error };
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      systemLogger.error('❌ メインループ実行エラー:', error);
      
      return { 
        success: false, 
        duration, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
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

### 削減された機能（新クラスに移行）:
1. **コンポーネント初期化ロジック** → SystemInitializer
2. **ヘルスチェック機能** → HealthChecker  
3. **シャットダウン処理** → ShutdownManager
4. **システム状態管理** → SystemStatus
5. **CLI起動・シグナルハンドリング** → ApplicationRunner
6. **依存性管理** → ComponentContainer

### 残存機能（メインクラスの責務）:
1. 各専用クラスの協調制御
2. スケジューラー制御
3. メインループ実行制御

## 🚫 MVP制約遵守事項
- ✅ **シンプル実装**: 複雑な機能追加なし、既存機能の分離のみ
- ✅ **確実な動作**: 既存機能と完全に同等の動作を保証
- 🚫 **新機能追加禁止**: リファクタリングのみ、機能追加は行わない
- 🚫 **過剰な最適化禁止**: パフォーマンス最適化は行わない

## ✅ 完了条件
1. `src/main.ts` 書き換え完了（426行→約130行に削減）
2. TypeScript エラーなし (npm run typecheck)
3. ESLint エラーなし (npm run lint)
4. 既存機能との完全な互換性確認
5. システム起動・30分間隔実行・シャットダウンの動作確認

## 📄 出力管理
**報告書出力先**: `tasks/20250724_124302_main_refactor/reports/REPORT-007-main-refactor.md`

**報告書内容**:
- 実装完了確認（行数削減効果も記載）
- 型チェック・Lint結果
- 既存機能との互換性確認結果
- システム全体の動作確認結果