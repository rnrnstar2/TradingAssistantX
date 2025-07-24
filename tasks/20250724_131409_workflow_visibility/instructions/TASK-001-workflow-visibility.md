# TASK-001: ワークフロー可視化改善

## 🎯 タスク概要
**責務**: main.tsでの30分毎実行ワークフローの可視化改善  
**問題**: リファクタリング後、重要なワークフロー全体が見えにくくなった  
**対象**: src/main.ts の executeMainLoop() メソッド改善

## 📂 実装対象
**編集ファイル**: `src/main.ts`

## 🔧 実装内容

### 1. executeMainLoop() メソッドの改善
既存の単純な委譲から、ワークフローステップを明示的に表示・実行する形に変更：

```typescript
private async executeMainLoop(): Promise<{ success: boolean; duration: number; error?: string }> {
  const startTime = Date.now();

  try {
    systemLogger.info('🔄 メインループ実行開始');
    
    // ===================================================================
    // 30分毎自動実行ワークフロー (REQUIREMENTS.md準拠)
    // ===================================================================
    
    systemLogger.info('📋 【ステップ1】データ読み込み開始');
    // DataManager: 設定・学習データ読み込み, KaitoAPI: アカウント状況確認
    
    systemLogger.info('🤖 【ステップ2】Claude判断開始');  
    // 現在状況の分析, 最適なアクション決定（投稿/RT/いいね/待機）
    
    systemLogger.info('⚡【ステップ3】アクション実行開始');
    // 決定されたアクションの実行, 基本的なエラーハンドリング
    
    systemLogger.info('💾 【ステップ4】結果記録開始');
    // 実行結果の記録, 学習データの更新

    // MainLoopクラスによる実際の実行
    const mainLoop = this.container.get(COMPONENT_KEYS.MAIN_LOOP);
    const result = await mainLoop.runOnce();

    const duration = Date.now() - startTime;

    if (result.success) {
      systemLogger.success('✅ メインループ実行完了:', {
        action: result.action,
        duration: `${duration}ms`,
        confidence: result.metadata.confidence
      });
      
      systemLogger.info('📊 【完了】30分毎ワークフロー正常終了');
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
```

### 2. クラス上部にワークフロー概要コメント追加
TradingAssistantXクラスの上部に、システム全体のワークフロー概要を追加：

```typescript
/**
 * TradingAssistantX メインアプリケーションクラス（リファクタリング版）
 * 30分間隔での自動実行システムを統合・管理
 * 
 * 【30分毎自動実行ワークフロー】(REQUIREMENTS.md準拠)
 * ┌─────────────────────────────────────────────────────────────┐
 * │ 1. 【データ読み込み】                                         │
 * │    - DataManager: 設定・学習データ読み込み                   │ 
 * │    - KaitoAPI: アカウント状況確認                           │
 * │                                                           │
 * │ 2. 【Claude判断】                                           │
 * │    - 現在状況の分析                                         │
 * │    - 最適なアクション決定（投稿/RT/いいね/待機）              │
 * │                                                           │
 * │ 3. 【アクション実行】                                        │
 * │    - 決定されたアクションの実行                              │
 * │    - 基本的なエラーハンドリング                              │
 * │                                                           │
 * │ 4. 【結果記録】                                             │
 * │    - 実行結果の記録                                         │
 * │    - 学習データの更新                                       │
 * └─────────────────────────────────────────────────────────────┘
 */
class TradingAssistantX {
```

### 3. startScheduler() メソッドにワークフロー説明追加

```typescript
private startScheduler(): void {
  const config = this.container.get(COMPONENT_KEYS.CONFIG);
  const scheduler = this.container.get(COMPONENT_KEYS.SCHEDULER);
  
  const schedulerConfig = config.getSchedulerConfig();
  
  scheduler.updateConfig(schedulerConfig);
  scheduler.setExecutionCallback(async () => {
    return await this.executeMainLoop();
  });

  scheduler.start();
  
  systemLogger.info('⏰ スケジューラー開始 - 30分毎ワークフロー実行:', {
    interval: schedulerConfig.intervalMinutes,
    maxDaily: schedulerConfig.maxDailyExecutions,
    workflow: '【データ読み込み→Claude判断→アクション実行→結果記録】'
  });
}
```

## 🚫 MVP制約遵守事項
- ✅ **シンプル実装**: ログ出力とコメント追加のみ、機能変更なし
- ✅ **確実な動作**: 既存ロジックは完全に維持
- 🚫 **新機能追加禁止**: 実行ロジックの変更は行わない
- 🚫 **過剰な詳細化禁止**: 基本的なワークフロー表示のみ

## ✅ 完了条件
1. `src/main.ts` の executeMainLoop() メソッド改善完了
2. クラス上部にワークフロー概要コメント追加
3. TypeScript エラーなし 
4. 既存機能の完全な互換性維持
5. ワークフローの4ステップが明確に可視化されている

## 📄 出力管理
**報告書出力先**: `tasks/20250724_131409_workflow_visibility/reports/REPORT-001-workflow-visibility.md`

**報告書内容**:
- 実装完了確認
- ワークフロー可視化効果の確認
- 既存機能への影響なしの確認