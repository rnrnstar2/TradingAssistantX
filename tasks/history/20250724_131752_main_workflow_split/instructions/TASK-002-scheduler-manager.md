# TASK-002: SchedulerManager クラス作成

## 🎯 タスク概要
**責務**: スケジューラー管理・30分間隔実行制御のワークフロー管理  
**対象**: main.ts の startScheduler() メソッドとスケジュール関連機能を分離

## 📂 実装対象
**新規作成ファイル**: `src/main-workflows/scheduler-manager.ts`

## 🔧 実装内容

### 1. SchedulerManager クラス実装
```typescript
import { systemLogger } from '../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../core/component-container';
import { Config } from '../shared/config';
import { CoreScheduler } from '../scheduler/core-scheduler';

/**
 * スケジューラー管理・30分間隔実行制御
 * main.tsから分離されたスケジュール管理専用クラス
 */
export class SchedulerManager {
  private container: ComponentContainer;
  private isSchedulerRunning: boolean = false;

  constructor(container: ComponentContainer) {
    this.container = container;
  }

  /**
   * スケジューラー起動ワークフロー
   */
  startScheduler(executeCallback: () => Promise<{ success: boolean; duration: number; error?: string }>): void {
    try {
      // ===================================================================
      // スケジューラー起動ワークフロー
      // ===================================================================
      
      systemLogger.info('⚙️ 【スケジューラー起動ステップ1】設定読み込み開始');
      const config = this.container.get<Config>(COMPONENT_KEYS.CONFIG);
      const scheduler = this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER);
      
      const schedulerConfig = config.getSchedulerConfig();
      systemLogger.info('✅ スケジューラー設定読み込み完了');

      systemLogger.info('🔧 【スケジューラー起動ステップ2】スケジューラー設定開始');
      scheduler.updateConfig(schedulerConfig);
      scheduler.setExecutionCallback(executeCallback);
      systemLogger.info('✅ スケジューラー設定完了');

      systemLogger.info('▶️ 【スケジューラー起動ステップ3】スケジューラー開始');
      scheduler.start();
      this.isSchedulerRunning = true;
      
      systemLogger.success('⏰ スケジューラー開始完了 - 30分毎ワークフロー実行開始:', {
        interval: `${schedulerConfig.intervalMinutes}分間隔`,
        maxDaily: `最大${schedulerConfig.maxDailyExecutions}回/日`,
        workflow: '【データ読み込み→Claude判断→アクション実行→結果記録】',
        status: 'RUNNING'
      });

    } catch (error) {
      systemLogger.error('❌ スケジューラー起動失敗:', error);
      this.isSchedulerRunning = false;
      throw error;
    }
  }

  /**
   * スケジューラー停止ワークフロー
   */
  stopScheduler(): void {
    try {
      systemLogger.info('⏹️ スケジューラー停止開始');
      
      if (this.container.has(COMPONENT_KEYS.SCHEDULER)) {
        const scheduler = this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER);
        scheduler.stop();
        this.isSchedulerRunning = false;
        systemLogger.success('✅ スケジューラー停止完了');
      } else {
        systemLogger.info('ℹ️ スケジューラーは既に停止済み');
      }

    } catch (error) {
      systemLogger.error('❌ スケジューラー停止エラー:', error);
      this.isSchedulerRunning = false;
    }
  }

  /**
   * スケジューラー状態取得
   */
  getSchedulerStatus(): {
    running: boolean;
    config?: any;
    nextExecution?: string;
  } {
    try {
      if (!this.container.has(COMPONENT_KEYS.SCHEDULER)) {
        return { running: false };
      }

      const scheduler = this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER);
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
   * スケジューラー設定リロード
   */
  async reloadSchedulerConfig(): Promise<void> {
    try {
      systemLogger.info('🔄 スケジューラー設定リロード開始');
      
      const config = this.container.get<Config>(COMPONENT_KEYS.CONFIG);
      await config.reloadConfig();
      
      if (this.isSchedulerRunning) {
        const scheduler = this.container.get<CoreScheduler>(COMPONENT_KEYS.SCHEDULER);
        const newSchedulerConfig = config.getSchedulerConfig();
        scheduler.updateConfig(newSchedulerConfig);
        
        systemLogger.success('✅ スケジューラー設定リロード完了:', {
          interval: `${newSchedulerConfig.intervalMinutes}分間隔`,
          maxDaily: `最大${newSchedulerConfig.maxDailyExecutions}回/日`
        });
      } else {
        systemLogger.info('ℹ️ スケジューラー未実行のため設定のみリロード完了');
      }

    } catch (error) {
      systemLogger.error('❌ スケジューラー設定リロードエラー:', error);
      throw error;
    }
  }
}
```

## 🚫 MVP制約遵守事項
- ✅ **シンプル実装**: 既存ロジックの単純移行、新機能追加なし
- ✅ **確実な動作**: main.tsの既存スケジューラー機能と完全に同等の動作
- 🚫 **複雑なスケジュール管理禁止**: 基本的な起動・停止・設定管理のみ
- 🚫 **詳細な分析機能禁止**: 実行統計・パフォーマンス分析は含めない

## ✅ 完了条件
1. `src/main-workflows/scheduler-manager.ts` ファイル作成完了
2. TypeScript エラーなし
3. ESLint エラーなし
4. 既存のmain.tsのスケジューラー機能と同等の動作

## 📄 出力管理
**報告書出力先**: `tasks/20250724_131752_main_workflow_split/reports/REPORT-002-scheduler-manager.md`

**報告書内容**:
- 実装完了確認
- 型チェック・Lint結果  
- スケジューラー管理機能の動作確認