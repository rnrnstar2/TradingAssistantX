# TASK-005: Loop Manager実装

## 📋 タスク概要
**目的**: 1日15回の定時実行システムの実装  
**優先度**: 中（自動化の要）  
**実行順序**: 直列（TASK-004完了後）  

## 🎯 実装要件

### 1. 基本要件
- **ファイル**: `src/core/loop-manager.ts`
- **責務**: 定時実行とスケジュール管理
- **連携**: main.tsから呼び出される

### 2. 実装すべき機能

#### コア機能
```typescript
export class LoopManager {
  private executor: AutonomousExecutor;
  private schedule: PostingSchedule;
  
  // ループ実行開始
  async startLoop(): Promise<void>
  
  // 次回実行時間計算
  private calculateNextExecutionTime(): Date
  
  // 実行時間チェック
  private isExecutionTime(): boolean
  
  // 実行履歴管理
  private recordExecution(result: ExecutionResult): void
  
  // 緊急実行判定
  private shouldExecuteImmediately(): boolean
  
  // グレースフルシャットダウン
  async shutdown(): Promise<void>
}
```

#### スケジュール設定（REQUIREMENTS.md準拠）
```typescript
// 最適投稿時間（15回/日）
const POSTING_SCHEDULE = {
  morning: ["07:00", "07:30", "08:00", "08:30"],    // 朝（4回）
  noon: ["12:00", "12:30"],                          // 昼（2回）
  afternoon: ["15:00", "16:00", "17:00"],            // 午後（3回）
  evening: ["18:00", "18:30", "19:00", "19:30"],    // 夕方（4回）
  night: ["21:00", "22:00"]                          // 夜（2回）
};
```

### 3. 実行制御
```typescript
// 実行条件
interface ExecutionConditions {
  // 定時実行
  scheduled: boolean;
  
  // 緊急実行（重要ニュース検出時）
  urgent: boolean;
  
  // 前回実行からの経過時間
  minIntervalMinutes: 30;
  
  // 1日の最大実行回数
  maxDailyExecutions: 15;
}
```

### 4. ループ実装
```typescript
// メインループ
while (this.isRunning) {
  if (this.isExecutionTime() || this.shouldExecuteImmediately()) {
    try {
      await this.executor.executeAutonomously();
      this.recordExecution(result);
    } catch (error) {
      // エラーハンドリング
    }
  }
  
  // 次回実行まで待機
  await this.waitUntilNext();
}
```

### 5. MVP制約
- 🚫 複雑なスケジューリングアルゴリズムは不要
- 🚫 分散実行は実装しない
- ✅ シンプルな時間ベース実行
- ✅ 実行履歴の記録

### 6. 実行ログ
```yaml
# data/current/execution-history.yaml
executions:
  - timestamp: "2025-01-23T07:00:00Z"
    type: "scheduled"
    result: "success"
    duration: 23.5
  - timestamp: "2025-01-23T07:35:00Z"
    type: "urgent"
    result: "success"
    duration: 18.2
daily_count: 2
remaining: 13
```

## 📊 成功基準
- [ ] 15回/日の定時実行
- [ ] 緊急実行対応
- [ ] 実行履歴記録
- [ ] グレースフルシャットダウン
- [ ] メモリリーク防止

## 🔧 実装のヒント
1. `node-cron` または `setTimeout` ベース実装
2. 実行時間の揺らぎ（±5分）で自然な投稿
3. プロセス終了時の適切なクリーンアップ
4. 実行履歴はYAMLで永続化

## ⚠️ 注意事項
- タイムゾーン考慮（JST）
- システム時刻変更への対応
- 重複実行の防止
- リソース管理

## 📁 出力ファイル
- `src/core/loop-manager.ts` - メイン実装
- `tests/core/loop-manager.test.ts` - テストコード
- 本報告書完了時: `tasks/20250723_001451_phase3_core_services/reports/REPORT-005-loop-manager-implementation.md`