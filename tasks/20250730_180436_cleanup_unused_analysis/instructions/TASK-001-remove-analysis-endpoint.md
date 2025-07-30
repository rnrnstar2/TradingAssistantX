# TASK-001: 未使用のanalysis-endpointコードの削除

## 🎯 タスク概要
現在使用されていない`analysis-endpoint.ts`とその関連コードを削除する。このコードは深夜分析機能用に準備されていたが、深夜分析機能自体が未実装のため、現在はどこからも呼び出されていない。

## 📋 前提条件
- `src/claude/endpoints/analysis-endpoint.ts`は実装済みだが未使用
- 深夜分析機能（23:55のanalyzeアクション）は未実装
- `main-workflow.ts`の`executeAnalyzeAction()`は未実装エラーをスロー

## 🔧 実装内容

### 1. ファイル削除
以下のファイルを完全に削除してください：
- `src/claude/endpoints/analysis-endpoint.ts`

### 2. エクスポートの削除
`src/claude/index.ts`から以下の修正を行ってください：

#### 削除対象のexport文
```typescript
// Analysis endpoint
export { 
  analyzePerformance,
  analyzeMarketContext,
  recordExecution,
  generateLearningInsights,
  getPerformanceMetrics,
  generateImprovementSuggestions
} from './endpoints/analysis-endpoint';
```

#### 削除対象の型export文
```typescript
// Additional analysis types - 追加分析型
export type {
  MarketContext,
  MarketOpportunity,
  MarketAnalysisInput
} from './endpoints/analysis-endpoint';
```

#### コメント修正
以下のコメントを修正してください：
```typescript
// 変更前
 * - 分析エンドポイント: analyzePerformance(), analyzeMarketContext(), recordExecution()

// 変更後
 * - 分析エンドポイント: （深夜分析機能実装時に追加予定）
```

### 3. 型定義の確認と調整
`src/claude/types.ts`で以下を確認してください：
- `AnalysisInput`と`AnalysisResult`の型定義は残す（将来の深夜分析実装時に使用）
- コメントは適切に更新

#### コメント修正
```typescript
// 変更前
 * analysis-endpoint.ts の専用返却型

// 変更後
 * 深夜分析機能の返却型（実装予定）
```

```typescript
// 変更前
 * analysis-endpoint.ts への入力型

// 変更後
 * 深夜分析機能への入力型（実装予定）
```

## ⚠️ 注意事項
- `ExecutionRecord`、`LearningInsight`、`PerformanceMetrics`の型定義は`types.ts`に残す（他で使用される可能性）
- 深夜分析のドキュメント（`docs/deep-night-analysis.md`）はそのまま残す
- `main-workflow.ts`の`executeAnalyzeAction()`は未実装のまま残す

## ✅ 完了条件
- [ ] `analysis-endpoint.ts`が削除されている
- [ ] `claude/index.ts`から関連export文が削除されている
- [ ] コメントが適切に更新されている
- [ ] `pnpm type-check`でエラーが発生しない
- [ ] `pnpm lint`でエラーが発生しない

## 📝 出力先
- 報告書: `tasks/20250730_180436_cleanup_unused_analysis/reports/REPORT-001-remove-analysis-endpoint.md`