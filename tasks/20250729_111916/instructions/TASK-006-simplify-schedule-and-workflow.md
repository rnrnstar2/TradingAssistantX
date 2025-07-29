# TASK-006: スケジュール構造簡素化とワークフロー更新

## 🎯 タスク概要
schedule.yamlの階層構造を簡素化し、アクション決定フェーズを削除したワークフローに更新

## 📋 実装内容

### 1. schedule.yaml構造の簡素化

#### 現在の構造（階層が深い）
```yaml
daily_schedule:
  morning:
    - time: "07:00"
      action: "post"
  lunch:
    - time: "12:00"
      action: "post"
```

#### 新しい構造（フラット）
```yaml
daily_schedule:
  - time: "07:00"
    action: "post"
    topic: "朝の投資教育"
  - time: "08:00"
    action: "retweet"
    target_query: "投資初心者 lang:ja"
  - time: "12:00"
    action: "post"
    topic: "市場動向解説"
  - time: "12:30"
    action: "like"
    target_query: "投資教育 高品質"
  - time: "18:00"
    action: "quote_tweet"
    target_query: "投資ニュース"
    topic: "専門家視点の解説"
  - time: "21:00"
    action: "post"
    topic: "明日の注目ポイント"
```

### 2. ワークフロー変更（4ステップ→3ステップ）

#### 変更前
```
1. データ収集 → 2. アクション決定（Claude） → 3. アクション実行 → 4. 結果保存
```

#### 変更後（スケジュール実行時）
```
1. データ収集 → 2. アクション実行 → 3. 結果保存
```

**理由**: スケジュールでアクションが事前決定されているため、Claude判断は不要

### 3. schedule-loader.ts更新

#### getTodaySchedule()メソッドの簡素化
```typescript
static getTodaySchedule(config: ScheduleConfig): ScheduleItem[] {
  // 階層をフラット化する処理を削除
  // 直接daily_scheduleを返す
  return config.daily_schedule.sort((a, b) => a.time.localeCompare(b.time));
}
```

### 4. MainWorkflow.execute()の更新

#### スケジュール実行モードの追加
```typescript
static async execute(options?: WorkflowOptions): Promise<WorkflowResult> {
  // スケジュール実行時はClaude判断をスキップ
  if (options?.scheduledAction) {
    // 1. データ収集
    const context = await this.collectData();
    
    // 2. アクション実行（スケジュール指定）
    const result = await this.executeScheduledAction(options);
    
    // 3. 結果保存
    await this.saveResult(result);
    
    return result;
  }
  
  // 手動実行時は従来通り4ステップ
  return this.executeWithClaudeDecision();
}
```

### 5. 型定義の更新

#### ScheduleConfig型の簡素化
```typescript
export interface ScheduleConfig {
  daily_schedule: ScheduleItem[];  // 階層なしの配列
}
```

## ⚠️ 制約事項
- 手動実行（pnpm dev）時は従来通りClaude判断を使用
- スケジュール実行時のみ3ステップ化
- 既存の機能を壊さないよう注意

## 🔧 技術要件
- TypeScript型定義の整合性
- 既存のインターフェースとの互換性維持
- テスト可能な構造

## 📂 成果物
- 更新: `data/config/schedule.yaml`
- 更新: `src/scheduler/schedule-loader.ts`
- 更新: `src/scheduler/types.ts`
- 更新: `src/workflows/main-workflow.ts`

## ✅ 完了条件
- [ ] schedule.yamlがフラット構造になっている
- [ ] スケジュール実行時は3ステップで動作
- [ ] 手動実行時は4ステップを維持
- [ ] TypeScriptコンパイルエラーがない