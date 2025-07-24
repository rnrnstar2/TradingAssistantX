# TASK-001: SystemLifecycle クラス作成

## 🎯 タスク概要
**責務**: システム起動・停止・初期化のワークフロー管理  
**対象**: main.ts の start(), stop() メソッドを分離  
**新設ディレクトリ**: `src/main-workflows/`

## 📂 実装対象
**新規作成ファイル**: `src/main-workflows/system-lifecycle.ts`

## 🔧 実装内容

### 1. ディレクトリ作成
```bash
mkdir -p src/main-workflows
```

### 2. SystemLifecycle クラス実装
```typescript
import { systemLogger } from '../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../core/component-container';
import { SystemInitializer } from '../core/system-initializer';
import { HealthChecker } from '../core/health-checker';
import { ShutdownManager } from '../core/shutdown-manager';

/**
 * システム起動・停止・初期化ワークフロー管理
 * main.tsから分離された生命周期管理専用クラス
 */
export class SystemLifecycle {
  private container: ComponentContainer;
  private initializer: SystemInitializer;
  private healthChecker: HealthChecker;
  private shutdownManager: ShutdownManager;
  private isInitialized: boolean = false;

  constructor(
    container: ComponentContainer,
    initializer: SystemInitializer,
    healthChecker: HealthChecker,  
    shutdownManager: ShutdownManager
  ) {
    this.container = container;
    this.initializer = initializer;
    this.healthChecker = healthChecker;
    this.shutdownManager = shutdownManager;
  }

  /**
   * システム起動ワークフロー
   */
  async startSystem(): Promise<void> {
    try {
      systemLogger.info('🚀 TradingAssistantX システム開始');

      // ===================================================================
      // システム起動ワークフロー
      // ===================================================================
      
      systemLogger.info('⚙️ 【起動ステップ1】システム初期化開始');
      await this.initializer.initialize(this.container);
      this.isInitialized = true;
      systemLogger.success('✅ システム初期化完了');

      systemLogger.info('🏥 【起動ステップ2】ヘルスチェック開始');
      const mainLoop = this.container.get(COMPONENT_KEYS.MAIN_LOOP);
      const dataManager = this.container.get(COMPONENT_KEYS.DATA_MANAGER);
      const kaitoClient = this.container.get(COMPONENT_KEYS.KAITO_CLIENT);
      
      await this.healthChecker.performSystemHealthCheck(mainLoop, dataManager, kaitoClient);
      systemLogger.success('✅ ヘルスチェック完了');

      systemLogger.success('✅ システム起動完了 - 30分間隔自動実行準備完了');

    } catch (error) {
      systemLogger.error('❌ システム起動失敗:', error);
      await this.stopSystem();
      throw error;
    }
  }

  /**
   * システム停止ワークフロー
   */
  async stopSystem(): Promise<void> {
    try {
      systemLogger.info('⏹️ システム停止処理開始');
      
      // ===================================================================
      // システム停止ワークフロー
      // ===================================================================
      
      systemLogger.info('🛑 【停止ステップ1】コンポーネント停止開始');
      const scheduler = this.container.has(COMPONENT_KEYS.SCHEDULER) 
        ? this.container.get(COMPONENT_KEYS.SCHEDULER) : null;
      const dataManager = this.container.has(COMPONENT_KEYS.DATA_MANAGER) 
        ? this.container.get(COMPONENT_KEYS.DATA_MANAGER) : null;
      
      await this.shutdownManager.gracefulShutdown(scheduler, dataManager);
      systemLogger.success('✅ コンポーネント停止完了');

      this.isInitialized = false;
      systemLogger.success('✅ システム停止完了');

    } catch (error) {
      systemLogger.error('❌ システム停止エラー:', error);
      // エラーが発生してもシステム停止は継続
    }
  }

  /**
   * 初期化状態取得
   */
  getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * システム状態概要取得
   */
  getSystemOverview(): {
    initialized: boolean;
    startedAt: string;
    components: string[];
  } {
    return {
      initialized: this.isInitialized,
      startedAt: new Date().toISOString(),
      components: this.container.getRegisteredKeys()
    };
  }
}
```

## 🚫 MVP制約遵守事項
- ✅ **シンプル実装**: 既存ロジックの単純移行、新機能追加なし
- ✅ **確実な動作**: main.tsの既存機能と完全に同等の動作
- 🚫 **複雑なライフサイクル管理禁止**: 基本的な起動・停止処理のみ
- 🚫 **詳細な状態管理禁止**: 必要最小限の状態管理のみ

## ✅ 完了条件
1. `src/main-workflows/system-lifecycle.ts` ファイル作成完了
2. TypeScript エラーなし
3. ESLint エラーなし  
4. 既存のmain.tsの起動・停止機能と同等の動作

## 📄 出力管理
**報告書出力先**: `tasks/20250724_131752_main_workflow_split/reports/REPORT-001-system-lifecycle.md`

**報告書内容**:
- 実装完了確認
- 型チェック・Lint結果
- 起動・停止ワークフローの動作確認