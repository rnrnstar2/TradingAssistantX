# TASK-004: src/claude/endpoints/analysis-endpoint.ts 実装指示書

## 🎯 タスク概要
分析エンドポイント（analysis-endpoint.ts）を実装し、パフォーマンス分析と市場コンテキスト分析機能を提供してください。

## 📋 要件定義準拠
REQUIREMENTS.md の**エンドポイント別設計**に基づく実装：
- **役割**: プロンプト+変数+AnalysisResult返却
- **責任**: 実行結果分析・市場コンテキスト分析・学習インサイト生成
- **返却型**: AnalysisResult（types.ts で定義）

## 🔍 既存コード統合
以下2つのファイルからエンドポイント別設計に統合：

### 1. market-analyzer.ts から移行
- **MarketAnalyzer クラス** → **analyzeMarketContext 関数**
- **基本市場コンテキスト分析**
- **市場機会分析**
- **センチメント・ボラティリティ推定**

### 2. performance-tracker.ts から移行
- **PerformanceTracker クラス** → **analyzePerformance 関数**
- **実行結果記録・分析**
- **学習インサイト生成**
- **改善提案機能**

## ✅ 実装タスク

### 1. メイン分析エンドポイント実装
```typescript
/**
 * 分析エンドポイント - パフォーマンス・市場コンテキスト統合分析
 */
export async function analyzePerformance(input: AnalysisInput): Promise<AnalysisResult>
```

### 2. 市場コンテキスト分析機能
```typescript
/**
 * 市場コンテキスト分析 - 基本的な市場情報収集・分析
 */
export async function analyzeMarketContext(input: MarketAnalysisInput): Promise<MarketContext>
```

### 3. 統合分析結果構築
以下の分析要素を統合：
- **パフォーマンスメトリクス**: 成功率、アクション別分析
- **市場コンテキスト**: センチメント、ボラティリティ、トレンド
- **学習インサイト**: 成功パターン、改善提案
- **次回実行推奨**: データに基づく戦略提案

### 4. 実行結果記録機能
```typescript
/**
 * 実行結果記録 - 学習データとしての記録・蓄積
 */
export function recordExecution(record: ExecutionRecord): void
```

## 🏗️ 既存機能の統合設計

### MarketAnalyzer統合
```typescript
// 移行元: MarketAnalyzer.analyzeBasicMarketContext()
async analyzeBasicMarketContext(): Promise<BasicMarketContext> {
  const [trendData, sentimentInfo] = await Promise.allSettled([...]);
  const context = { sentiment, volatility, trendingTopics, timestamp };
  return context;
}
```

### PerformanceTracker統合
```typescript
// 移行元: PerformanceTracker.generateLearningInsights()
generateLearningInsights(): LearningInsight[] {
  const insights = [];
  const bestAction = this.findBestPerformingAction();
  const recentTrend = this.analyzeRecentTrend();
  return insights;
}
```

## 🎯 分析機能要件

### パフォーマンス分析
- 全実行の成功率計算
- アクション別成功率分析
- 最近のトレンド分析
- 最適なアクション特定

### 市場分析
- 基本センチメント推定（bearish/neutral/bullish）
- ボラティリティ推定（low/medium/high）
- 投資関連トピック抽出
- 市場機会の識別

### 学習インサイト
- 成功パターンの特定
- 改善提案の生成
- データドリブンな戦略推奨

## 📂 実装構造

### ファイル配置
- **ディレクトリ**: `src/claude/endpoints/`
- **ファイル**: `analysis-endpoint.ts`

### 依存関係
- `../types` から型定義をインポート
- `../../kaito-api/search-engine` （市場データ取得）
- `../../kaito-api/core/client` （API連携）

## 🚫 実装制約

### 禁止事項
- クラスベース実装禁止（関数ベースで実装）
- 過剰な統計処理禁止（MVP範囲内で実装）
- 複雑な機械学習アルゴリズム禁止

### 必須要件
- 基本的な分析機能に限定
- エラー時の適切なフォールバック
- ステートレス設計

## 🔄 品質チェック要件
- TypeScript コンパイルエラーなし
- Lint チェック通過
- 分析結果の妥当性確認
- エラーハンドリングの動作確認

## 📋 完了報告
実装完了後、以下の報告書を作成してください：
- **報告書**: `tasks/20250724_152556/reports/REPORT-004-analysis-endpoint.md`
- **内容**: 統合した機能の概要、分析アルゴリズムの詳細、品質チェック結果

## 🔗 依存関係
- **前提**: TASK-001 (types.ts) の完了が必要
- **実行順序**: TASK-001 完了後に開始可能（他のエンドポイントと並列実行可能）

---
**重要**: この分析エンドポイントはシステムの学習・改善機能の中核です。データドリブンな分析機能を適切に実装してください。