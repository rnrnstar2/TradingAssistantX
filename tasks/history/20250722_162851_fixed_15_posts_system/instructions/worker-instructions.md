# 固定15回投稿システム修正指示書

## 🎯 **問題概要**
現在のシステムはClaude自律判断で投稿頻度を決定しているため、設定された15個のゴールデンタイムでの確実な投稿が保証されていない。

**要求**：
- 15個の設定時間それぞれで必ず1投稿
- Claude自律判断での頻度決定を削除
- スケジュール実行時は必ず投稿

## 🔍 **特定された問題箇所**

### 1. 主要問題: `src/lib/daily-action-planner.ts`

#### 問題箇所1: `planDailyDistribution()` (47-78行)
```typescript
// 🚨 問題: Claude自律判断で頻度決定
const autonomousFrequency = await this.determineAutonomousFrequency(successfulActions.length);
const remaining = Math.max(0, autonomousFrequency - successfulActions.length);

if (remaining <= 0) {
  console.log('✅ [Claude判断] 本日の最適頻度に到達済み');
  return this.createCompletedDistribution();
}
```

#### 問題箇所2: `determineAutonomousFrequency()` メソッド (754-773行)
```typescript
// 🚨 削除対象: Claude自律頻度決定メソッド全体
private async determineAutonomousFrequency(currentSuccessful: number): Promise<number> {
  // Claude判断ロジック全体
}
```

#### 問題箇所3: `getAutonomousTarget()` メソッド (863-870行)
```typescript
// 🚨 問題: determineAutonomousFrequency を呼び出し
const autonomousFrequency = await this.determineAutonomousFrequency(0);
```

### 2. 関連問題: `src/core/parallel-manager.ts`

#### 問題箇所: 投稿停止ロジック (529-534行)
```typescript
// 🚨 問題: 残り投稿数チェックで投稿停止
const distribution = await this.dailyActionPlanner.planDailyDistribution();

if (distribution.remaining <= 0) {
  console.log('✅ [配分完了] 本日の目標回数に到達済み、実行をスキップ');
  return [];
}
```

## 🛠️ **修正作業**

### タスク1: `daily-action-planner.ts` の修正

#### 1-1: `planDailyDistribution()` を簡素化 (47-78行)
**修正方針**: Claude判断を削除し、常に投稿可能にする

**変更前**:
```typescript
async planDailyDistribution(): Promise<ActionDistribution> {
  console.log('🧠 [Claude自律配分] 制約なしの完全自律配分計画を策定中...');
  
  const currentActions = await this.getTodaysActions();
  const successfulActions = currentActions.filter(action => action.success);
  
  // Claude自律的頻度決定
  const autonomousFrequency = await this.determineAutonomousFrequency(successfulActions.length);
  const remaining = Math.max(0, autonomousFrequency - successfulActions.length);
  
  console.log(`📊 [Claude自律判断] Claude決定頻度: ${autonomousFrequency}回/日, 本日成功: ${successfulActions.length}, 残り: ${remaining}`);
  
  if (remaining <= 0) {
    console.log('✅ [Claude判断] 本日の最適頻度に到達済み');
    return this.createCompletedDistribution();
  }
  
  const distribution = {
    remaining,
    optimal_distribution: await this.calculateAutonomousDistribution(remaining),
    timing_recommendations: await this.getTimingRecommendations(remaining)
  };
  // ...
}
```

**変更後**:
```typescript
async planDailyDistribution(): Promise<ActionDistribution> {
  console.log('📊 [固定15回配分] スケジュール実行時は必ず1投稿を実行');
  
  // 固定配分: スケジュール実行時は必ず投稿
  const remaining = 1; // スケジュール実行時は必ず1投稿
  
  const distribution = {
    remaining,
    optimal_distribution: { 
      original_post: 1, 
      quote_tweet: 0, 
      retweet: 0, 
      reply: 0 
    },
    timing_recommendations: [{
      time: new Date().toTimeString().slice(0, 5), // 現在時刻
      actionType: 'original_post' as ActionType,
      priority: 10,
      reasoning: '固定15回システム: スケジュール実行時必須投稿'
    }]
  };
  
  console.log('✅ [固定15回配分完了] 必ず1投稿実行', distribution);
  return distribution;
}
```

#### 1-2: `determineAutonomousFrequency()` メソッド削除 (754-773行)
**修正**: メソッド全体を削除

#### 1-3: `getAutonomousTarget()` メソッド修正 (863-870行)
**変更前**:
```typescript
private async getAutonomousTarget(): Promise<number> {
  try {
    const autonomousFrequency = await this.determineAutonomousFrequency(0);
    return autonomousFrequency;
  } catch {
    return 8; // フォールバック目標
  }
}
```

**変更後**:
```typescript
private async getAutonomousTarget(): Promise<number> {
  // 固定15回システム
  return 15;
}
```

#### 1-4: `calculateAutonomousDistribution()` メソッド簡素化 (82-112行)
**変更前**: Claude判断での複雑な配分
**変更後**: original_postのみ固定配分
```typescript
private async calculateAutonomousDistribution(remaining: number): Promise<ActionDistribution['optimal_distribution']> {
  console.log(`📊 [固定配分] original_postのみ: ${remaining}回`);
  
  return { 
    original_post: remaining, 
    quote_tweet: 0, 
    retweet: 0, 
    reply: 0 
  };
}
```

### タスク2: `src/core/parallel-manager.ts` の修正

#### 2-1: 投稿停止ロジック削除 (529-534行)
**変更前**:
```typescript
const distribution = await this.dailyActionPlanner.planDailyDistribution();
console.log(`📋 [日次配分] 残り${distribution.remaining}/${15}回`);

if (distribution.remaining <= 0) {
  console.log('✅ [配分完了] 本日の目標回数に到達済み、実行をスキップ');
  return [];
}
```

**変更後**:
```typescript
const distribution = await this.dailyActionPlanner.planDailyDistribution();
console.log(`📋 [固定15回システム] スケジュール実行時必須投稿`);

// 🚨 削除: 投稿停止チェックを削除（スケジュール時は必ず実行）
```

### タスク3: 関連メソッドの確認・修正

#### 3-1: `getTodayProgress()` メソッド確認
- `planDailyDistribution()` 呼び出し箇所の動作確認

#### 3-2: `createMarketAdjustedPlan()` メソッド確認  
- `planDailyDistribution()` 呼び出し箇所の動作確認

#### 3-3: `createDailyPlan()` メソッド確認
- `planDailyDistribution()` 呼び出し箇所の動作確認

## ⚡ **期待される結果**

### 修正後の動作:
1. **スケジュール実行**: 15個の時間それぞれで必ず1投稿
2. **頻度判断削除**: Claude自律判断による投稿停止なし
3. **一貫性**: 設定時間での確実な投稿実行
4. **シンプル**: 複雑な頻度計算ロジック削除

### 動作確認:
```bash
pnpm dev
```

**期待ログ**:
```
📊 [固定15回配分] スケジュール実行時は必ず1投稿を実行
✅ [固定15回配分完了] 必ず1投稿実行
🎯 [実行] original_post: [投稿内容]
✅ [投稿成功] original_post: [投稿ID]
```

## 📋 **品質基準**
- Claude自律頻度判断を完全削除
- スケジュール実行時は必ず投稿
- TypeScript型安全性維持
- 既存テストケースの動作確認

## ⚠️ **重要注意事項**
- `determineAutonomousFrequency()` メソッド削除により、呼び出し箇所でエラーが発生する可能性
- 削除時は呼び出し元もすべて修正
- 投稿頻度は設定ファイル `data/content-strategy.yaml` の `frequency: 15` に依存しない固定システム

## ✅ **完了確認**
1. Claude自律判断ロジックがすべて削除されている
2. スケジュール実行時に必ず投稿される
3. 15個のゴールデンタイムで確実に投稿される
4. エラーが発生せず正常動作する