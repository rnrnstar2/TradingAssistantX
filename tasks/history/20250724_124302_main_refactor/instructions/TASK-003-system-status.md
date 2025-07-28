# TASK-003: SystemStatus クラス作成

## 🎯 タスク概要
**責務**: システム状態管理・制御機能の独立クラス化  
**対象**: src/main.ts の 287-329行のシステム状態機能を分離

## 📂 実装対象
**新規作成ファイル**: `src/core/system-status.ts`

## 🔧 実装内容

### 1. SystemStatus クラス実装
```typescript
import { Logger, systemLogger } from '../shared/logger';
import { Config } from '../shared/config';
import { CoreScheduler } from '../scheduler/core-scheduler';
import { MainLoop } from '../scheduler/main-loop';

interface SystemStatusReport {
  initialized: boolean;
  scheduler: any;
  mainLoop: any;
  lastHealthCheck: string;
}

export class SystemStatus {
  private logger: Logger;

  constructor() {
    this.logger = systemLogger;
  }

  /**
   * システム状態取得
   */
  getSystemStatus(
    isInitialized: boolean,
    scheduler: CoreScheduler | null,
    mainLoop: MainLoop | null
  ): SystemStatusReport {
    return {
      initialized: isInitialized,
      scheduler: scheduler?.getStatus(),
      mainLoop: mainLoop?.getMetrics(),
      lastHealthCheck: new Date().toISOString()
    };
  }

  /**
   * 手動実行トリガー（デバッグ用）
   */
  async triggerManualExecution(
    isInitialized: boolean,
    executeMainLoop: () => Promise<{ success: boolean; duration: number; error?: string }>
  ): Promise<void> {
    if (!isInitialized) {
      throw new Error('System not initialized');
    }

    this.logger.info('🔧 手動実行トリガー');
    await executeMainLoop();
  }

  /**
   * 設定リロード
   */
  async reloadConfiguration(
    config: Config,
    scheduler: CoreScheduler
  ): Promise<void> {
    try {
      this.logger.info('🔄 設定リロード中...');
      
      // 設定ファイル再読み込み
      await config.reloadConfig();
      
      // スケジューラー設定更新
      const newSchedulerConfig = config.getSchedulerConfig();
      scheduler.updateConfig(newSchedulerConfig);
      
      this.logger.success('✅ 設定リロード完了');

    } catch (error) {
      this.logger.error('❌ 設定リロードエラー:', error);
      throw error;
    }
  }
}
```

## 🚫 MVP制約遵守事項
- ✅ **シンプル実装**: 基本的な状態管理・制御機能のみ
- ✅ **確実な動作**: 既存機能の単純移行、新機能追加なし
- 🚫 **統計・分析機能禁止**: 詳細なメトリクス収集・分析は含めない
- 🚫 **複雑な制御機能禁止**: 高度なシステム制御機能は追加しない

## ✅ 完了条件
1. `src/core/system-status.ts` ファイル作成完了
2. TypeScript エラーなし (npm run typecheck)
3. ESLint エラーなし (npm run lint)
4. 既存のmain.tsのシステム状態機能と同等の動作

## 📄 出力管理
**報告書出力先**: `tasks/20250724_124302_main_refactor/reports/REPORT-003-system-status.md`

**報告書内容**:
- 実装完了確認
- 型チェック・Lint結果
- 状態取得・制御機能の動作確認