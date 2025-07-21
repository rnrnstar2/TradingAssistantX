# TASK-001 自律システムワークフロー最適化指示書

## 🎯 **実装目標**

**現在の非効率な二重判断を排除し、1日15回定期投稿に最適化された効率的ワークフローを実装**

## 🚨 **解決すべき問題**

### **1. 二重判断の非効率性**
```typescript
// 現在の問題: 定期実行なのに毎回投稿判断
autonomous-runner.ts (96分間隔起動)
    ↓
assessCurrentNeeds() (「投稿必要？」毎回判断)
    ↓  
「高優先度で投稿が必要」毎回同じ結論
    ↓
投稿実行
```

### **2. 動的時間決定の矛盾**
- `determineNextExecutionTime()`でClaude判断を使用
- 1日15回=96分間隔なら固定値にすべき

### **3. ニーズ分析の目的不明確**
- 投稿判断に特化、メンテナンス系判断が未活用

## ✅ **実装内容**

### **Task A: 実行モード分離システム実装**

#### **A-1. 実行モード定義 (autonomous-executor.ts)**
```typescript
export enum ExecutionMode {
  SCHEDULED_POSTING = 'scheduled_posting',  // 定期投稿モード
  DYNAMIC_ANALYSIS = 'dynamic_analysis'     // 動的判断モード
}

export class AutonomousExecutor {
  private mode: ExecutionMode = ExecutionMode.SCHEDULED_POSTING;
  
  async executeAutonomously(): Promise<void> {
    if (this.mode === ExecutionMode.SCHEDULED_POSTING) {
      await this.executeScheduledPosting();
    } else {
      await this.executeDynamicAnalysis();
    }
  }
}
```

#### **A-2. 定期投稿モード実装**
```typescript
// 投稿判断をスキップした効率的フロー
private async executeScheduledPosting(): Promise<void> {
  // ヘルスチェック
  const isCritical = await this.healthChecker.isCritical();
  if (isCritical) return;
  
  // 直接投稿実行（ニーズ分析スキップ）
  const postingAction = this.createDirectPostingAction();
  
  // メンテナンス系ニーズのみ分析
  const maintenanceNeeds = await this.assessMaintenanceNeeds();
  const maintenanceActions = await this.decisionEngine.planMaintenanceActions(maintenanceNeeds);
  
  // 並列実行: 投稿 + メンテナンス
  await this.parallelManager.executeActions([postingAction, ...maintenanceActions]);
}
```

### **Task B: ニーズ分析の再定義**

#### **B-1. メンテナンス特化ニーズ分析**
```typescript
private async assessMaintenanceNeeds(context: Context): Promise<Need[]> {
  const prompt = `
Current system context:
${JSON.stringify(context, null, 2)}

Analyze ONLY maintenance, optimization and information collection needs.
IGNORE content posting needs (handled separately in scheduled mode).

REQUIRED NEED TYPES (choose one):
- "maintenance": Data cleanup, file management, system health
- "optimization": Performance improvements, efficiency gains  
- "information_collection": Trend analysis, market data gathering

Return ONLY a JSON array of need objects with exact structure:
[{"id":"need-timestamp-random","type":"maintenance|optimization|information_collection","priority":"high|medium|low","description":"detailed description","context":{},"createdAt":"ISO timestamp"}]
`;

  // 実装...
}
```

#### **B-2. 直接投稿アクション生成**
```typescript
private createDirectPostingAction(): Action {
  return {
    id: `action-${Date.now()}-posting`,
    type: 'content_creation_and_post',
    priority: 'high',
    params: {
      mode: 'scheduled',
      skipDuplicateCheck: false,
      enforcePostingLimits: true
    },
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}
```

### **Task C: 固定間隔実行システム**

#### **C-1. autonomous-runner.ts修正**
```typescript
// 現在の動的時間決定を削除
// const waitTime = await executor.determineNextExecutionTime();

// 固定96分間隔に変更
const POSTING_INTERVAL_MS = 96 * 60 * 1000; // 96分 = 1日15回
console.log(`✅ [${new Date().toLocaleTimeString('ja-JP')}] 完了 (次回: 96分後)`);
await sleep(POSTING_INTERVAL_MS);
```

#### **C-2. 設定可能な間隔オプション**
```typescript
// config/autonomous-config.yaml
execution:
  mode: "scheduled_posting"
  posting_interval_minutes: 96
  health_check_enabled: true
  maintenance_enabled: true
```

### **Task D: パフォーマンス最適化**

#### **D-1. 不要メソッド削除**
- `determineNextExecutionTime()` → 削除
- 投稿特化の`assessCurrentNeeds()` → `assessMaintenanceNeeds()`に変更

#### **D-2. 並列実行最適化**
```typescript
// 投稿 + メンテナンスの効率的並列実行
await this.parallelManager.executeActions([
  postingAction,              // 必須: 投稿実行
  ...maintenanceActions       // オプション: メンテナンス実行
]);
```

## 🔧 **技術制約**

### **MVP原則遵守**
- 複雑な設定システム禁止
- 統計・分析機能禁止
- 最小限の実装に留める

### **型安全性**
- TypeScript strict mode
- 全て型定義済み

### **エラーハンドリング**
- Critical状態時の安全停止
- メンテナンス失敗時の処理継続

## 📋 **テスト要件**

### **動作確認項目**
1. **投稿頻度**: 正確に96分間隔で実行されるか
2. **メンテナンス**: 投稿と並列でメンテナンスが実行されるか
3. **エラー耐性**: 投稿失敗時もシステムが継続するか
4. **リソース効率**: 不要な判断処理が削除されているか

### **確認方法**
```bash
# 1. システム起動
pnpm dev

# 2. ログ確認: "投稿判断" "assessCurrentNeeds" が出力されないこと
# 3. 間隔確認: 正確に96分間隔で実行されること
# 4. 並列実行確認: 投稿とメンテナンスが同時実行されること
```

## 🚫 **実装禁止事項**

- 複雑な実行モード切り替えUI
- 投稿頻度の動的調整機能
- 高度なスケジューリングシステム
- パフォーマンス統計機能

## 📁 **修正対象ファイル**

```
src/core/autonomous-executor.ts        # メイン修正
src/scripts/autonomous-runner.ts       # 間隔固定化
src/types/autonomous-system.ts         # 型定義追加（必要時）
config/autonomous-config.yaml         # 設定ファイル（新規作成）
```

## ✅ **完了基準**

1. **機能確認**: 96分間隔で正確に投稿される
2. **効率化確認**: 不要な投稿判断が削除されている
3. **並列確認**: メンテナンスが投稿と並列実行される
4. **型チェック**: `pnpm check-types` でエラーなし
5. **動作テスト**: 最低3回連続の正常実行確認

---

**重要**: この修正により、システムは**真の定期投稿システム**となり、無駄な判断処理が排除され、効率的な自律実行を実現します。