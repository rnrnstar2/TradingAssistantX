# TASK-004: スケジューラー23:55特別処理実装

## 🎯 タスク概要
src/scheduler/time-scheduler.ts を拡張し、23:55時に深夜大規模分析処理の特別ハンドリングを実装する。通常の1-3ステップに加えてStep 4処理時間（15-30分）を考慮した実行管理を行う。

## ⚠️ 依存関係
このタスクは以下のタスクの完了後に実行してください：
- ✅ **TASK-001**: 深夜大規模分析エンドポイント実装
- ✅ **TASK-002**: 新学習データ構造対応実装  
- ✅ **TASK-003**: MainWorkflow Step 4実装

## 📋 参照必須ドキュメント
実装前に以下のドキュメントを必ず読み込んでください：
- `docs/workflow.md` - スケジュール実行システム・23:55特別処理
- `docs/claude.md` - 🌙 深夜大規模分析システム：分析実行スケジュール
- `docs/directory-structure.md` - 深夜大規模分析システム（新設計）

## 🎯 実装目標
現在のスケジューラーに23:55時の特別処理機能を追加し、深夜大規模分析（15-30分の長時間処理）を適切に管理する。処理中の重複実行防止と完了後の正常復帰を保証する。

## 📊 実装内容詳細

### 1. 深夜分析処理状態管理
スケジューラークラスに新しい状態管理を追加：

```typescript
export class TimeScheduler {
  // 既存のプライベートプロパティ...
  
  // 深夜大規模分析状態管理
  private deepNightAnalysisRunning: boolean = false;
  private deepNightAnalysisStartTime: Date | null = null;
  private deepNightAnalysisTimeout: NodeJS.Timeout | null = null;
  
  // 深夜分析設定
  private readonly DEEP_NIGHT_ANALYSIS_TIME = '23:55';
  private readonly DEEP_NIGHT_ANALYSIS_MAX_DURATION = 35 * 60 * 1000; // 35分（安全マージン）
  private readonly DEEP_NIGHT_ANALYSIS_EXPECTED_DURATION = 30 * 60 * 1000; // 30分
```

### 2. 23:55特別処理判定機能
processScheduledTasks()メソッドを拡張：

```typescript
/**
 * スケジュールされたタスクの処理（23:55特別処理対応版）
 */
private async processScheduledTasks(): Promise<void> {
  const now = new Date();
  const currentTime = this.formatCurrentTime(now);
  
  // 深夜大規模分析実行中の場合は通常タスクをスキップ
  if (this.deepNightAnalysisRunning) {
    if (this.config.enableDetailedLogging) {
      const elapsed = now.getTime() - (this.deepNightAnalysisStartTime?.getTime() || 0);
      console.log(`🌙 深夜大規模分析実行中 (${Math.round(elapsed / 1000)}秒経過) - 通常タスクをスキップ`);
    }
    return;
  }
  
  // 該当時刻のタスクを検索
  const taskToRun = this.scheduleItems.find(item => item.time === currentTime);
  
  if (!taskToRun) {
    // 該当なしの場合は詳細ログのみ
    if (this.config.enableDetailedLogging) {
      console.log(`🔍 時刻チェック: ${currentTime} - 該当タスクなし`);
    }
    return;
  }
  
  // 23:55時刻の特別処理判定
  if (currentTime === this.DEEP_NIGHT_ANALYSIS_TIME) {
    console.log(`🌙 深夜大規模分析時刻検出: ${currentTime} - 特別処理モード開始`);
    await this.executeDeepNightAnalysisTask(taskToRun, currentTime);
  } else {
    // 通常タスクの実行
    console.log(`🎯 実行時刻: ${currentTime} - アクション: ${taskToRun.action} - トピック: ${taskToRun.topic || 'なし'}`);
    await this.executeScheduledTask(taskToRun, currentTime);
  }
}
```

### 3. 深夜大規模分析専用実行メソッド
新しい専用実行メソッドを追加：

```typescript
/**
 * 深夜大規模分析タスクの実行（23:55専用）
 */
private async executeDeepNightAnalysisTask(task: ScheduleItem, currentTime: string): Promise<void> {
  const executionId = `deep_night_analysis_${Date.now()}`;
  
  try {
    // 分析実行状態を設定
    this.deepNightAnalysisRunning = true;
    this.deepNightAnalysisStartTime = new Date();
    
    console.log(`🌙 深夜大規模分析開始 - ExecutionID: ${executionId}`);
    console.log(`⏰ 推定完了時刻: ${this.calculateExpectedCompletionTime()}`);
    
    // タイムアウト設定（最大実行時間の監視）
    this.setDeepNightAnalysisTimeout(executionId);
    
    // WorkflowOptionsの構築（通常タスクと同様）
    const workflowOptions = this.buildWorkflowOptions(task);
    
    // MainWorkflow実行（Step 4が自動的に実行される）
    const result = await MainWorkflow.execute(workflowOptions);
    
    // タイムアウトクリア
    this.clearDeepNightAnalysisTimeout();
    
    const totalTime = Date.now() - this.deepNightAnalysisStartTime.getTime();
    
    // 成功処理
    this.handleDeepNightAnalysisSuccess(task, result, totalTime, executionId);
    
  } catch (error) {
    const totalTime = this.deepNightAnalysisStartTime 
      ? Date.now() - this.deepNightAnalysisStartTime.getTime()
      : 0;
    
    // エラー処理
    this.handleDeepNightAnalysisError(task, error as Error, totalTime, executionId);
    
  } finally {
    // 状態リセット（成功・失敗問わず実行）
    this.deepNightAnalysisRunning = false;
    this.deepNightAnalysisStartTime = null;
    this.clearDeepNightAnalysisTimeout();
    
    console.log('🌙 深夜大規模分析処理完了 - 通常スケジュール復帰');
  }
}

/**
 * 完了予定時刻の計算
 */
private calculateExpectedCompletionTime(): string {
  if (!this.deepNightAnalysisStartTime) return 'unknown';
  
  const expectedCompletion = new Date(
    this.deepNightAnalysisStartTime.getTime() + this.DEEP_NIGHT_ANALYSIS_EXPECTED_DURATION
  );
  
  return expectedCompletion.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

/**
 * 深夜分析タイムアウト設定
 */
private setDeepNightAnalysisTimeout(executionId: string): void {
  this.deepNightAnalysisTimeout = setTimeout(() => {
    console.error(`🚨 深夜大規模分析タイムアウト - ExecutionID: ${executionId}`);
    console.error(`⏰ 最大実行時間 ${this.DEEP_NIGHT_ANALYSIS_MAX_DURATION / 1000 / 60}分 を超過しました`);
    
    // タイムアウト時のクリーンアップ
    this.deepNightAnalysisRunning = false;
    this.deepNightAnalysisStartTime = null;
    
    // エラー統計更新
    this.executionStats.totalExecutions++;
    this.executionStats.errorCount++;
    
    const errorRecord: ErrorRecord = {
      timestamp: new Date(),
      errorType: 'DEEP_NIGHT_ANALYSIS_TIMEOUT',
      message: `Deep night analysis exceeded maximum duration of ${this.DEEP_NIGHT_ANALYSIS_MAX_DURATION / 1000 / 60} minutes`,
      recoveryAction: 'continue_scheduler',
      stackTrace: undefined
    };
    
    this.addErrorRecord(errorRecord);
    
    console.log('🔄 タイムアウト後の通常スケジュール復帰');
    
  }, this.DEEP_NIGHT_ANALYSIS_MAX_DURATION);
}

/**
 * 深夜分析タイムアウトクリア
 */
private clearDeepNightAnalysisTimeout(): void {
  if (this.deepNightAnalysisTimeout) {
    clearTimeout(this.deepNightAnalysisTimeout);
    this.deepNightAnalysisTimeout = null;
  }
}
```

### 4. 深夜分析専用結果処理メソッド
成功・エラー処理の専用メソッドを実装：

```typescript
/**
 * 深夜大規模分析成功時の処理
 */
private handleDeepNightAnalysisSuccess(
  task: ScheduleItem,
  result: any,
  executionTime: number,
  executionId: string
): void {
  const executionMinutes = Math.round(executionTime / 1000 / 60);
  
  console.log(`✅ 深夜大規模分析完了 - ExecutionID: ${executionId}`);
  console.log(`⏱️  総実行時間: ${executionMinutes}分 (${executionTime}ms)`);
  
  // Step 4の結果詳細ログ
  if (result.deepNightAnalysis) {
    const analysis = result.deepNightAnalysis;
    console.log(`📊 分析結果: 洞察${analysis.insights}件, 機会${analysis.opportunities}件, 戦略${analysis.strategies}件`);
    console.log(`🎯 信頼度: ${Math.round((analysis.confidence || 0) * 100)}%`);
    console.log(`📁 生成ファイル: ${analysis.filesGenerated?.length || 0}件`);
    
    if (analysis.filesGenerated?.length > 0) {
      console.log(`   - ${analysis.filesGenerated.join(', ')}`);
    }
  }
  
  // 統計更新（深夜分析専用統計）
  this.executionStats.totalExecutions++;
  this.executionStats.successCount++;
  this.executionStats.lastExecutionTime = new Date();
  this.updateAverageExecutionTime(executionTime);
  
  // 深夜分析固有の統計情報を記録
  const analysisStats = {
    executionTime,
    executionMinutes,
    insights: result.deepNightAnalysis?.insights || 0,
    opportunities: result.deepNightAnalysis?.opportunities || 0,
    strategies: result.deepNightAnalysis?.strategies || 0,
    confidence: result.deepNightAnalysis?.confidence || 0,
    filesGenerated: result.deepNightAnalysis?.filesGenerated?.length || 0
  };
  
  console.log(`📈 深夜分析統計更新: 成功=${this.executionStats.successCount}/${this.executionStats.totalExecutions}, 平均実行時間=${Math.round(this.executionStats.averageExecutionTime)}ms`);
  
  // 翌日の実行準備完了ログ
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(7, 0, 0, 0); // 翌日7:00
  
  console.log(`🌅 翌日戦略準備完了 - 次回実行: ${tomorrow.toLocaleString('ja-JP')} から新戦略適用`);
}

/**
 * 深夜大規模分析エラー時の処理
 */
private handleDeepNightAnalysisError(
  task: ScheduleItem,
  error: Error,
  executionTime: number,
  executionId: string
): void {
  const executionMinutes = Math.round(executionTime / 1000 / 60);
  
  console.error(`❌ 深夜大規模分析エラー - ExecutionID: ${executionId}`);
  console.error(`⏱️  実行時間: ${executionMinutes}分 (${executionTime}ms)`);
  console.error(`🚨 エラー内容: ${error.message}`);
  
  // エラー記録（深夜分析専用）
  const errorRecord: ErrorRecord = {
    timestamp: new Date(),
    errorType: 'DEEP_NIGHT_ANALYSIS_ERROR',
    message: `Deep night analysis failed: ${error.message}`,
    action: task.action,
    recoveryAction: 'continue_scheduler_tomorrow_fallback',
    stackTrace: this.config.enableDetailedLogging ? error.stack : undefined
  };
  
  // 統計更新
  this.executionStats.totalExecutions++;
  this.executionStats.errorCount++;
  this.executionStats.lastExecutionTime = new Date();
  this.updateAverageExecutionTime(executionTime);
  this.addErrorRecord(errorRecord);
  
  // 翌日実行への影響評価
  console.warn('⚠️ 深夜大規模分析に失敗しました');
  console.warn('🔄 翌日は前回戦略または基本戦略で実行継続されます');
  console.warn(`📊 エラー統計: ${this.executionStats.errorCount}/${this.executionStats.totalExecutions}`);
  
  // 重要: スケジューラーは継続動作（深夜分析失敗でもシステム停止しない）
  console.log('🔄 スケジューラー継続動作 - 通常実行に復帰');
}
```

### 5. スケジューラー統計の拡張
深夜分析専用の統計情報を追加：

```typescript
/**
 * 拡張された実行統計
 */
interface ExtendedExecutionStats extends ExecutionStats {
  deepNightAnalysis?: {
    totalAttempts: number;
    successfulAnalysis: number;
    averageAnalysisTime: number;
    lastAnalysisDate: string;
    lastAnalysisSuccess: boolean;
  };
}

/**
 * 深夜分析統計の更新
 */
private updateDeepNightAnalysisStats(
  success: boolean, 
  analysisTime: number, 
  date: string
): void {
  if (!this.executionStats.deepNightAnalysis) {
    this.executionStats.deepNightAnalysis = {
      totalAttempts: 0,
      successfulAnalysis: 0,
      averageAnalysisTime: 0,
      lastAnalysisDate: '',
      lastAnalysisSuccess: false
    };
  }
  
  const stats = this.executionStats.deepNightAnalysis;
  stats.totalAttempts++;
  stats.lastAnalysisDate = date;
  stats.lastAnalysisSuccess = success;
  
  if (success) {
    stats.successfulAnalysis++;
    
    // 平均分析時間の更新
    const totalTime = stats.averageAnalysisTime * (stats.successfulAnalysis - 1);
    stats.averageAnalysisTime = (totalTime + analysisTime) / stats.successfulAnalysis;
  }
}
```

### 6. 深夜分析用ログ出力強化
実行統計ログに深夜分析情報を追加：

```typescript
/**
 * 実行統計のログ出力（深夜分析情報追加版）
 */
private logExecutionStats(): void {
  console.log('📊 最終実行統計:');
  console.log(`  総実行回数: ${this.executionStats.totalExecutions}`);
  console.log(`  成功回数: ${this.executionStats.successCount}`);
  console.log(`  エラー回数: ${this.executionStats.errorCount}`);
  console.log(`  成功率: ${this.executionStats.totalExecutions > 0 ? Math.round((this.executionStats.successCount / this.executionStats.totalExecutions) * 100) : 0}%`);
  console.log(`  平均実行時間: ${Math.round(this.executionStats.averageExecutionTime)}ms`);
  
  // 深夜分析統計
  if (this.executionStats.deepNightAnalysis) {
    const dna = this.executionStats.deepNightAnalysis;
    console.log('🌙 深夜大規模分析統計:');
    console.log(`  分析実行回数: ${dna.totalAttempts}`);
    console.log(`  分析成功回数: ${dna.successfulAnalysis}`);
    console.log(`  分析成功率: ${dna.totalAttempts > 0 ? Math.round((dna.successfulAnalysis / dna.totalAttempts) * 100) : 0}%`);
    console.log(`  平均分析時間: ${Math.round(dna.averageAnalysisTime / 1000 / 60)}分`);
    console.log(`  最終分析日: ${dna.lastAnalysisDate}`);
    console.log(`  最終分析結果: ${dna.lastAnalysisSuccess ? '成功' : '失敗'}`);
  }
  
  if (this.executionStats.errorHistory.length > 0) {
    console.log(`  最新エラー: ${this.executionStats.errorHistory[0].message}`);
  }
}
```

## 🚨 重要な制約・注意事項

### システム継続性制約
- **ノンブロッキング設計**: 深夜分析失敗でもスケジューラーは継続
- **タイムアウト保護**: 最大35分でタイムアウト、状態自動復旧
- **重複実行防止**: 深夜分析中は他のタスク実行をブロック

### 運用制約
- **23:55固定**: 深夜分析時刻は設定変更不可
- **メモリ効率**: 長時間実行でもメモリリークしない設計
- **ログ適切性**: 深夜分析中の詳細ログで運用状況を把握可能

### エラーハンドリング制約
- **分析エラー≠システム停止**: 深夜分析失敗は警告レベル
- **翌日実行保証**: 分析失敗でも翌日の通常実行は継続
- **統計完全性**: エラー情報も含めた完全な実行統計を記録

## 📂 出力管理
- ❌ **ルートディレクトリ出力禁止**: 深夜分析ログも適切な場所に出力
- ✅ **コンソールログ**: 実行状況の詳細ログ出力
- ✅ **統計情報**: 深夜分析専用の統計情報管理

## 🧪 テスト要件
1. **23:55判定テスト**: 時刻判定の正確性・特別処理発動確認
2. **状態管理テスト**: 分析中フラグ・タイムアウト処理・状態復旧
3. **タイムアウトテスト**: 最大実行時間超過時の自動復旧確認
4. **エラーハンドリングテスト**: 分析失敗時のスケジューラー継続確認
5. **統計更新テスト**: 深夜分析専用統計の正確な記録確認

## ✅ 完了基準
1. 23:55時に深夜大規模分析専用処理が実行される
2. 分析実行中は他のタスクが適切にスキップされる
3. タイムアウト機能が正常に動作する
4. 分析完了後にスケジューラーが正常復帰する
5. 分析失敗時でもスケジューラーが継続する
6. 深夜分析専用の統計情報が正確に記録される
7. npm run lint および npm run typecheck が通る
8. すべてのテストが通る

## 📋 実装後の報告書作成
実装完了後、以下の報告書を作成してください：
- 📄 **報告書パス**: `tasks/20250730_151951/reports/REPORT-004-scheduler-deep-night-handling.md`
- 📊 **実装内容**: 23:55特別処理・状態管理・タイムアウト処理詳細
- 🧪 **テスト結果**: 時刻判定・状態管理・エラーハンドリングテスト結果
- 📈 **統計確認**: 深夜分析統計の正確な記録確認
- 🚨 **重要**: TypeScript型チェックとlintの通過確認を含める

## 🎯 最重要事項
この実装により、TradingAssistantXスケジューラーは**24時間学習サイクル対応**の高度なシステムへ進化します。23:55→00:30の深夜時間帯に確実に学習を完了し、翌日7:00から新戦略での実行を保証する、信頼性の高いスケジューラーを実現してください。システムの継続性と学習の確実性を両立する、プロダクションレベルの実装をお願いします。