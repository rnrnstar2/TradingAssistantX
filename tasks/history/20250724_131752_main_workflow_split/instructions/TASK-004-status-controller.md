# TASK-004: StatusController クラス作成

## 🎯 タスク概要
**責務**: システム状態管理・手動実行・設定リロードのワークフロー管理  
**対象**: main.ts の getSystemStatus(), triggerManualExecution(), reloadConfiguration() を分離

## 📂 実装対象
**新規作成ファイル**: `src/main-workflows/status-controller.ts`

## 🔧 実装内容

### 1. StatusController クラス実装
```typescript
import { systemLogger } from '../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../core/component-container';
import { SystemStatus } from '../core/system-status';

/**
 * システム状態管理・手動実行・設定リロード制御
 * main.tsから分離された状態制御専用クラス
 */
export class StatusController {
  private container: ComponentContainer;
  private systemStatus: SystemStatus;

  constructor(container: ComponentContainer, systemStatus: SystemStatus) {
    this.container = container;
    this.systemStatus = systemStatus;
  }

  /**
   * システム状態取得ワークフロー
   */
  getSystemStatus(isInitialized: boolean): Record<string, unknown> {
    try {
      // ===================================================================
      // システム状態取得ワークフロー
      // ===================================================================
      
      systemLogger.debug('📊 システム状態取得開始');
      
      const scheduler = this.container.has(COMPONENT_KEYS.SCHEDULER) 
        ? this.container.get(COMPONENT_KEYS.SCHEDULER) : null;
      const mainLoop = this.container.has(COMPONENT_KEYS.MAIN_LOOP) 
        ? this.container.get(COMPONENT_KEYS.MAIN_LOOP) : null;

      const status = this.systemStatus.getSystemStatus(isInitialized, scheduler, mainLoop);
      
      systemLogger.debug('✅ システム状態取得完了');
      return status;

    } catch (error) {
      systemLogger.error('❌ システム状態取得エラー:', error);
      return {
        initialized: false,
        error: 'Status retrieval failed',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 手動実行トリガーワークフロー（デバッグ用）
   */
  async triggerManualExecution(
    isInitialized: boolean,
    executeCallback: () => Promise<{ success: boolean; duration: number; error?: string }>
  ): Promise<void> {
    try {
      // ===================================================================
      // 手動実行ワークフロー
      // ===================================================================
      
      systemLogger.info('🔧 【手動実行ステップ1】前提条件確認開始');
      if (!isInitialized) {
        throw new Error('System not initialized - 手動実行不可');
      }
      systemLogger.info('✅ システム初期化確認完了');

      systemLogger.info('⚡【手動実行ステップ2】手動実行開始');
      systemLogger.info('   → スケジューラーを経由せず直接実行');
      systemLogger.info('   → 30分毎ワークフローを即座に実行');

      await this.systemStatus.triggerManualExecution(isInitialized, executeCallback);
      
      systemLogger.success('✅ 手動実行完了');
      systemLogger.info('ℹ️ 次回の定期実行は予定通り30分後に実行されます');

    } catch (error) {
      systemLogger.error('❌ 手動実行失敗:', error);
      throw error;
    }
  }

  /**
   * 設定リロードワークフロー
   */
  async reloadConfiguration(): Promise<void> {
    try {
      // ===================================================================
      // 設定リロードワークフロー
      // ===================================================================
      
      systemLogger.info('🔄 【設定リロードステップ1】設定ファイル再読み込み開始');
      const config = this.container.get(COMPONENT_KEYS.CONFIG);
      const scheduler = this.container.get(COMPONENT_KEYS.SCHEDULER);
      
      await this.systemStatus.reloadConfiguration(config, scheduler);
      systemLogger.success('✅ 設定ファイル再読み込み完了');

      systemLogger.info('⚙️ 【設定リロードステップ2】スケジューラー設定更新開始');
      systemLogger.info('   → 新しい間隔設定の適用');
      systemLogger.info('   → 最大実行回数制限の更新');
      systemLogger.success('✅ スケジューラー設定更新完了');

      systemLogger.success('🔄 設定リロード完了 - 新設定で実行継続');

    } catch (error) {
      systemLogger.error('❌ 設定リロードエラー:', error);
      throw error;
    }
  }

  /**
   * システム概要表示
   */
  displaySystemOverview(isInitialized: boolean): void {
    const status = this.getSystemStatus(isInitialized);
    
    systemLogger.info('📊 システム状態概要:');
    systemLogger.info('┌─────────────────────────────────────────────────────────────┐');
    systemLogger.info(`│ 初期化状態: ${isInitialized ? '✅ 完了' : '❌ 未完了'}                                      │`);
    systemLogger.info(`│ タイムスタンプ: ${new Date().toLocaleString('ja-JP')}                         │`);
    systemLogger.info('│                                                           │');
    systemLogger.info('│ 利用可能な操作:                                              │');
    systemLogger.info('│   • getSystemStatus()    - 詳細状態取得                    │');
    systemLogger.info('│   • triggerManualExecution() - 手動実行トリガー             │');
    systemLogger.info('│   • reloadConfiguration() - 設定リロード                   │');
    systemLogger.info('└─────────────────────────────────────────────────────────────┘');
  }

  /**
   * 手動実行ガイド表示
   */
  displayManualExecutionGuide(): void {
    systemLogger.info('🔧 手動実行ガイド:');
    systemLogger.info('┌─────────────────────────────────────────────────────────────┐');
    systemLogger.info('│ 手動実行の用途:                                              │');
    systemLogger.info('│   • デバッグ・テスト目的                                      │');
    systemLogger.info('│   • 設定変更後の動作確認                                      │');
    systemLogger.info('│   • 即座にアクション実行が必要な場合                           │');
    systemLogger.info('│                                                           │');
    systemLogger.info('│ 注意事項:                                                   │');
    systemLogger.info('│   • 手動実行は定期実行とは独立して動作                         │');
    systemLogger.info('│   • 手動実行後も30分毎の定期実行は継続                        │');
    systemLogger.info('│   • システム初期化完了後のみ実行可能                           │');
    systemLogger.info('└─────────────────────────────────────────────────────────────┘');
  }
}
```

## 🚫 MVP制約遵守事項
- ✅ **シンプル実装**: 既存ロジックの単純移行、新機能追加なし
- ✅ **確実な動作**: main.tsの既存状態管理機能と完全に同等の動作
- 🚫 **複雑な状態管理禁止**: 詳細な状態追跡・分析機能は含めない
- 🚫 **高度な制御機能禁止**: 複雑な実行制御・条件分岐は含めない

## ✅ 完了条件
1. `src/main-workflows/status-controller.ts` ファイル作成完了
2. TypeScript エラーなし
3. ESLint エラーなし
4. 既存のmain.tsの状態管理機能と同等の動作

## 📄 出力管理
**報告書出力先**: `tasks/20250724_131752_main_workflow_split/reports/REPORT-004-status-controller.md`

**報告書内容**:
- 実装完了確認
- 型チェック・Lint結果
- 状態管理・手動実行・設定リロード機能の動作確認