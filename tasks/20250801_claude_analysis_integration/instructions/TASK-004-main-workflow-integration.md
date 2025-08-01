# TASK-004: メインワークフロー統合

## 🎯 タスク概要
データ分析ワークフローをメインワークフローに統合し、生データではなく分析済みインサイトをプロンプトに含めるよう修正する。

## 📋 実装要件

### 1. 修正対象ファイル

#### `src/workflows/workflow-actions.ts`の`executePostAction`関数
**現状**: 生のツイートデータをSystemContextに含める
**修正後**: 分析済みインサイトをSystemContextに含める

#### 主な変更点
1. データ収集後、分析ワークフローを呼び出す
2. SystemContextに分析結果を追加
3. content-endpoint.tsでインサイトを活用

### 2. 実装フロー

```typescript
// 修正前のフロー
1. target_query検索 → 生データ
2. reference_users取得 → 生データ  
3. SystemContextに生データ追加
4. generateContent呼び出し

// 修正後のフロー
1. target_query検索 → 生データ
2. reference_users取得 → 生データ
3. executeDataAnalysis呼び出し → インサイト生成
4. SystemContextにインサイト追加
5. generateContent呼び出し
```

### 3. SystemContext拡張

```typescript
// SystemContextに追加
interface SystemContext {
  // 既存フィールド...
  
  // 新規追加
  analysisInsights?: CombinedAnalysisInsights;
  
  // 削除または非推奨
  referenceTweets?: any[];         // → analysisInsightsに置換
  referenceAccountTweets?: any[];  // → analysisInsightsに置換
}
```

### 4. content-endpoint.tsの修正

#### buildContentPrompt関数の修正
- 生データ参照部分を削除
- analysisInsightsを使用したプロンプト構築に変更

```typescript
// 例：インサイトベースのプロンプト
if (context?.analysisInsights) {
  prompt += `【市場分析インサイト】\n`;
  if (context.analysisInsights.targetQueryInsights) {
    prompt += `${context.analysisInsights.targetQueryInsights.summary}\n`;
    // キーポイントを箇条書きで追加
  }
  
  prompt += `【専門家の最新見解】\n`;
  context.analysisInsights.referenceUserInsights.forEach(userInsight => {
    prompt += `@${userInsight.username}: ${userInsight.summary}\n`;
  });
  
  prompt += `\n${context.analysisInsights.overallTheme}を踏まえて、`;
  prompt += `${context.analysisInsights.actionableInsights.join('、')}を考慮した投稿を作成してください。\n`;
}
```

### 5. 後方互換性の確保
- 旧フィールド（referenceTweets等）も一時的に残す
- 段階的な移行を可能にする

### 6. エラーハンドリング
- 分析失敗時は従来の生データフォールバックを使用
- ログで分析スキップを記録

## 📁 関連ドキュメント
- `docs/workflow.md` - ワークフロー仕様
- TASK-001, TASK-002, TASK-003の成果物に依存
- 現在のmain-workflow.tsの実装を確認

## ✅ 完了条件
- 既存機能を壊さない（テスト通過）
- 分析結果が正しくプロンプトに反映される
- TypeScript strict modeでエラーなし