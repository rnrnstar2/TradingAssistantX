# TASK-001: ActionSpecificCollector メソッドシグネチャ精密化

## 🎯 実装概要

**重要**: ActionSpecificCollectorは既に99%実装済みです。この作業は**メソッドシグネチャの精密化**に特化した最小限の調整です。

## 📊 現状確認

**既存実装**: `/Users/rnrnstar/github/TradingAssistantX/src/lib/action-specific-collector.ts` (604行)
- ✅ 核心機能完全実装済み
- ✅ Claude-Playwright連鎖実装済み
- ✅ 品質評価システム実装済み
- ✅ 包括的テストスイート実装済み (383行)

**調整必要項目**: ユーザー要求との具体的なシグネチャ差異のみ

## 🔧 実装要件

### 1. メソッドシグネチャ精密化

#### 1.1 collectForAction メソッド調整
**現在**: `collectForAction(actionType, context, targetSufficiency): Promise<ActionSpecificResult>`
**要求**: `collectForAction(decision: ActionDecision): Promise<ActionSpecificResult>`

```typescript
// 新規追加（既存メソッドは保持）
async collectForAction(decision: ActionDecision): Promise<ActionSpecificResult> {
  // decision.type, decision.params等からactionType, context等を抽出
  // 既存の内部実装を活用
}
```

#### 1.2 executeCollectionCycle メソッド追加
**要求**: `executeCollectionCycle(strategy: ActionCollectionStrategy): Promise<CollectionCycleResult>`

```typescript
async executeCollectionCycle(strategy: ActionCollectionStrategy): Promise<CollectionCycleResult> {
  // 既存のexecuteCollectionChainを内部で活用
  // CollectionResult[] → CollectionCycleResult 変換
}
```

#### 1.3 evaluateInformationSufficiency メソッド追加
**要求**: `evaluateInformationSufficiency(data: CollectedData): Promise<SufficiencyEvaluation>`

```typescript
async evaluateInformationSufficiency(data: CollectedData): Promise<SufficiencyEvaluation> {
  // 既存のevaluateCollectionSufficiencyを活用
  // CollectedData → CollectionResult[] 変換処理
}
```

### 2. Claude-Playwright連鎖分離

#### 2.1 明示的メソッド分離
**要求メソッド**:
- `private async claudeInitialJudgment(actionType: string, context: any): Promise<JudgmentResult>`
- `private async playwrightExecution(requirements: CollectionRequirements): Promise<PlaywrightResult>`
- `private async claudeReevaluation(initialData: any, playwrightData: any): Promise<ReevaluationResult>`

**実装方針**: 既存の統合処理から論理分離（内部実装を活用）

### 3. 型定義追加

#### 3.1 新規型定義（autonomous-system.ts）

```typescript
export interface CollectionCycleResult {
  cycleId: string;
  results: CollectionResult[];
  totalExecutionTime: number;
  cycleMetrics: {
    iterationCount: number;
    averageIterationTime: number;
    successfulTargets: number;
    failedTargets: number;
  };
  qualityAssessment: QualityEvaluation;
  sufficiencyAchieved: boolean;
}

export interface CollectedData {
  source: string;
  collectionType: string;
  rawData: any[];
  metadata: {
    collectedAt: number;
    dataSize: number;
    processingTime: number;
  };
}

export interface JudgmentResult {
  recommendation: 'proceed' | 'skip' | 'adjust';
  confidence: number;
  reasoning: string;
  suggestedTargets: CollectionTarget[];
}

export interface CollectionRequirements {
  targets: CollectionTarget[];
  maxDuration: number;
  qualityThresholds: QualityStandards;
  priority: 'high' | 'medium' | 'low';
}

export interface PlaywrightResult {
  success: boolean;
  collectTime: number;
  collectedData: CollectionResult[];
  errors: string[];
  targetResults: {
    [targetUrl: string]: {
      status: 'success' | 'failed' | 'timeout';
      dataCount: number;
    };
  };
}

export interface ReevaluationResult {
  finalDecision: 'sufficient' | 'continue' | 'abort';
  combinedScore: number;
  enhancement: {
    improvedResults: CollectionResult[];
    addedInsights: string[];
  };
  nextStepRecommendation: string;
}
```

## 📋 実装手順

### Step 1: 型定義追加
1. `/Users/rnrnstar/github/TradingAssistantX/src/types/autonomous-system.ts` に新規型定義追加

### Step 2: メソッド追加（既存実装活用）
1. `collectForAction(decision: ActionDecision)` オーバーロード追加
2. `executeCollectionCycle()` メソッド追加
3. `evaluateInformationSufficiency()` メソッド追加

### Step 3: 内部メソッド分離
1. Claude-Playwright連鎖の明示的分離
2. 既存機能を保持しつつ、新規メソッドから内部呼び出し

### Step 4: テスト更新
1. 新規メソッドシグネチャ用テストケース追加
2. 既存テストの維持

## ⚡ 品質要件

- **実行時間**: 90秒以内（既存要件維持）
- **充足度保証**: 85%以上（既存要件維持）
- **TypeScript**: 完全型安全（strict mode）
- **テスト**: 新規メソッド用テストケース追加
- **後方互換性**: 既存メソッドの動作保証

## 🚫 重要制約

- **既存実装保護**: 既存の動作する実装を削除・破壊しない
- **最小変更原則**: 必要最小限の追加・調整のみ実行
- **テスト保護**: 既存の383行のテストコードを保持
- **機能保証**: 現在動作している全機能の継続保証

## 📄 出力管理

**承認された出力場所**:
- 実装ファイル: 既存ファイル編集のみ
- テストファイル: 既存テストファイル編集のみ
- 報告書: `tasks/20250721_154706_actionspecific_refinement/reports/REPORT-001-actionspecific-method-refinement.md`

## 🎯 成功基準

1. ✅ ユーザー要求の全メソッドシグネチャ実装
2. ✅ 既存機能の完全保持
3. ✅ 全テスト通過（既存+新規）
4. ✅ TypeScript型チェック完全通過
5. ✅ 90秒以内実行時間保証

---

**注記**: この作業は既存の優秀な実装への「精密調整」です。破壊的変更は一切行わず、追加的な改善のみを実行してください。