# TASK-003: ExecutionFlow クラス作成

## 🎯 タスク概要
**責務**: メインループ実行フロー・30分毎4ステップワークフローの管理  
**対象**: main.ts の executeMainLoop() メソッドを分離

## 📂 実装対象
**新規作成ファイル**: `src/main-workflows/execution-flow.ts`

## 🔧 実装内容

### 1. ExecutionFlow クラス実装
```typescript
import { systemLogger } from '../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../core/component-container';
import { MainLoop } from '../scheduler/main-loop';

/**
 * メインループ実行フロー・30分毎4ステップワークフロー管理
 * main.tsから分離された実行フロー専用クラス
 */
export class ExecutionFlow {
  private container: ComponentContainer;

  constructor(container: ComponentContainer) {
    this.container = container;
  }

  /**
   * 30分毎メインループ実行ワークフロー
   * REQUIREMENTS.md準拠の4ステップワークフロー実行
   */
  async executeMainLoop(): Promise<{ success: boolean; duration: number; error?: string }> {
    const startTime = Date.now();

    try {
      systemLogger.info('🔄 メインループ実行開始');
      
      // ===================================================================
      // 30分毎自動実行ワークフロー (REQUIREMENTS.md準拠)
      // ===================================================================
      
      systemLogger.info('📋 【ステップ1】データ読み込み開始');
      systemLogger.info('   → DataManager: 設定・学習データ読み込み');
      systemLogger.info('   → KaitoAPI: アカウント状況確認');
      
      systemLogger.info('🤖 【ステップ2】Claude判断開始');  
      systemLogger.info('   → 現在状況の分析');
      systemLogger.info('   → 最適なアクション決定（投稿/RT/いいね/待機）');
      
      systemLogger.info('⚡【ステップ3】アクション実行開始');
      systemLogger.info('   → 決定されたアクションの実行');
      systemLogger.info('   → 基本的なエラーハンドリング');
      
      systemLogger.info('💾 【ステップ4】結果記録開始');
      systemLogger.info('   → 実行結果の記録');
      systemLogger.info('   → 学習データの更新');

      // MainLoopクラスによる実際の実行
      const mainLoop = this.container.get<MainLoop>(COMPONENT_KEYS.MAIN_LOOP);
      const result = await mainLoop.runOnce();

      const duration = Date.now() - startTime;

      if (result.success) {
        systemLogger.success('✅ メインループ実行完了:', {
          action: result.action,
          duration: `${duration}ms`,
          confidence: result.metadata?.confidence || 'N/A'
        });
        
        systemLogger.info('📊 【完了】30分毎ワークフロー正常終了');
        systemLogger.info('   ┌─────────────────────────────────────┐');
        systemLogger.info('   │ 次回実行まで30分間待機               │');
        systemLogger.info('   └─────────────────────────────────────┘');
        
        return { success: true, duration };
      } else {
        systemLogger.error('❌ メインループ実行失敗:', result.error);
        systemLogger.info('🔄 次回30分後に再実行します');
        return { success: false, duration, error: result.error };
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      systemLogger.error('❌ メインループ実行エラー:', error);
      systemLogger.info('🔄 次回30分後に再実行します');
      
      return { 
        success: false, 
        duration, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * 実行フロー状態取得
   */
  getExecutionStatus(): {
    lastExecution?: string;
    isRunning: boolean;
    workflow: string[];
  } {
    return {
      lastExecution: new Date().toISOString(),
      isRunning: false, // 実行中フラグは実装なし（MVP制約）
      workflow: [
        '【ステップ1】データ読み込み',
        '【ステップ2】Claude判断', 
        '【ステップ3】アクション実行',
        '【ステップ4】結果記録'
      ]
    };
  }

  /**
   * ワークフロー概要表示
   */
  displayWorkflowOverview(): void {
    systemLogger.info('📋 30分毎実行ワークフロー概要:');
    systemLogger.info('┌─────────────────────────────────────────────────────────────┐');
    systemLogger.info('│ 1. 【データ読み込み】                                         │');
    systemLogger.info('│    - DataManager: 設定・学習データ読み込み                   │'); 
    systemLogger.info('│    - KaitoAPI: アカウント状況確認                           │');
    systemLogger.info('│                                                           │');
    systemLogger.info('│ 2. 【Claude判断】                                           │');
    systemLogger.info('│    - 現在状況の分析                                         │');
    systemLogger.info('│    - 最適なアクション決定（投稿/RT/いいね/待機）              │');
    systemLogger.info('│                                                           │');
    systemLogger.info('│ 3. 【アクション実行】                                        │');
    systemLogger.info('│    - 決定されたアクションの実行                              │');
    systemLogger.info('│    - 基本的なエラーハンドリング                              │');
    systemLogger.info('│                                                           │');
    systemLogger.info('│ 4. 【結果記録】                                             │');
    systemLogger.info('│    - 実行結果の記録                                         │');
    systemLogger.info('│    - 学習データの更新                                       │');
    systemLogger.info('└─────────────────────────────────────────────────────────────┘');
  }
}
```

## 🚫 MVP制約遵守事項
- ✅ **シンプル実装**: 既存ロジックの単純移行、新機能追加なし
- ✅ **確実な動作**: main.tsの既存実行フロー機能と完全に同等の動作
- 🚫 **複雑な実行制御禁止**: 並列実行・条件分岐等の複雑な制御は含めない
- 🚫 **詳細な実行分析禁止**: パフォーマンス分析・実行統計は含めない

## ✅ 完了条件
1. `src/main-workflows/execution-flow.ts` ファイル作成完了
2. TypeScript エラーなし
3. ESLint エラーなし
4. 既存のmain.tsの実行フロー機能と同等の動作
5. 4ステップワークフローの明確な可視化

## 📄 出力管理
**報告書出力先**: `tasks/20250724_131752_main_workflow_split/reports/REPORT-003-execution-flow.md`

**報告書内容**:
- 実装完了確認
- 型チェック・Lint結果
- 実行フロー・ワークフロー可視化の動作確認