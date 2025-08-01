# TASK-001: analysis-endpoint.ts実装

## 🎯 タスク概要

深夜分析機能のClaude エンドポイント実装。既存のanalysis-builder.tsとanalysis.template.tsを活用し、投稿エンゲージメント分析機能を実装します。

## 📋 MVP制約確認

**✅ MVP適合性**:
- 深夜分析は23:55実行の核心機能
- analysis-builder.ts、analysis.template.ts既存のため最小実装
- 過剰な統計機能・将来拡張を含まない

**🚫 実装禁止項目**:
- 複雑な機械学習モデル
- リアルタイム分析機能  
- A/Bテスト機能
- 詳細な時間軸分析

## 🔧 実装仕様

### ファイル位置
`src/claude/endpoints/analysis-endpoint.ts`

### 基本設計
既存の`content-endpoint.ts`、`selection-endpoint.ts`と同じ構造で実装：
- `AnalysisBuilder`を使用したプロンプト生成
- Claude Code SDK呼び出し
- `AnalysisResult`型での返却

### 必須実装項目

#### 1. 関数シグネチャ
```typescript
export async function analyzePostEngagement(
  engagementData: PostEngagementData,
  context?: SystemContext
): Promise<AnalysisResult>
```

#### 2. 入力型定義
```typescript
interface PostEngagementData {
  posts: Array<{
    id: string;
    text: string;
    timestamp: string;
    metrics: {
      likes: number;
      retweets: number;
      replies: number;
      impressions: number;
    };
    engagementRate: number;
  }>;
  timeframe: string;
  totalPosts: number;
}
```

#### 3. 実装ステップ
1. **既存パターン踏襲**: content-endpoint.tsと同じ構造で実装
2. **AnalysisBuilder使用**: 既存のanalysis-builder.tsを活用
3. **エラーハンドリング**: try-catch + 詳細ログ出力
4. **タイムアウト設定**: 60秒（深夜分析専用）

#### 4. 出力内容
`AnalysisResult`型で以下を返却：
- `analysisType`: 'performance'固定
- `insights`: 投稿パフォーマンス分析結果（文字列配列）
- `recommendations`: 具体的な改善提案（文字列配列）
- `confidence`: 分析信頼度（0-1）
- `metadata`: 分析メタデータ

### 参考実装

#### 既存ファイル参照
- `src/claude/endpoints/content-endpoint.ts` - 基本構造
- `src/claude/endpoints/selection-endpoint.ts` - エラーハンドリング
- `src/claude/prompts/builders/analysis-builder.ts` - プロンプト生成
- `src/claude/types.ts` - 型定義確認

#### Claude Code SDK設定
```typescript
const response = await claude()
  .withModel('sonnet')  
  .withTimeout(60000)   // 深夜分析用60秒
  .skipPermissions()
  .query(prompt)
  .asText();
```

## 🧪 品質要件

### TypeScript Strict準拠
- 全ての型を明示的に定義
- any型の使用禁止
- strict nullチェック対応

### エラーハンドリング
```typescript
try {
  // Claude API呼び出し
} catch (error) {
  console.error('❌ 深夜分析エラー:', error);
  throw new Error(`分析実行失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

### ログ出力
- 分析開始/完了時のログ
- エラー発生時の詳細ログ  
- 実行時間計測

## 🔗 依存関係

### インポート依存
- `../prompts/builders/analysis-builder` (既存)
- `../types` (AnalysisResult型)
- `@instantlyeasy/claude-code-sdk-ts`

### 実行順序制約
**並列実行可能** - 他タスクに依存しない独立実装

## ✅ 完成基準

1. **機能動作**: analysis-endpoint.ts実装完了
2. **型安全性**: TypeScript strict通過  
3. **エラーハンドリング**: 適切な例外処理実装
4. **ログ出力**: 実行状況の可視化
5. **既存統合**: analysis-builder.tsとの連携動作

## 📄 報告書要件

実装完了後、以下を`tasks/20250731_030607/reports/REPORT-001-analysis-endpoint-implementation.md`に記載：

1. **実装サマリー**: 実装した機能の概要
2. **技術詳細**: 使用した技術・ライブラリ
3. **品質チェック**: TypeScript/lint通過確認
4. **テスト結果**: 基本動作確認結果
5. **統合確認**: analysis-builder.tsとの連携確認
6. **次ステップ**: TASK-003への引き渡し事項

## 🚨 注意事項

- **過剰実装回避**: MVPに不要な機能は実装しない
- **既存活用**: analysis-builder.ts、analysis.template.tsを最大活用
- **統一性保持**: 他endpointとの構造統一
- **パフォーマンス**: 60秒タイムアウト内での実行保証