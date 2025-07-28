# TASK-006: src/claude/index.ts 作成指示書

## 🎯 タスク概要
src/claude/index.ts ファイルを作成し、エンドポイント別設計の統合エクスポートを実装してください。

## 📋 要件定義準拠
REQUIREMENTS.md の**エンドポイント別設計**に基づく実装：
- **役割**: エクスポート統合
- **責任**: 全エンドポイント・型定義の統一的な提供
- **目的**: kaito-apiと同様のendpoints/構造での設計統一

## ✅ 実装タスク

### 1. エンドポイント関数エクスポート
4つのエンドポイントから主要関数をインポート・リエクスポート：

```typescript
// Decision endpoint
export { 
  makeDecision,
  type DecisionInput 
} from './endpoints/decision-endpoint';

// Content endpoint  
export { 
  generateContent,
  generateQuoteComment,
  type ContentInput,
  type QuoteCommentInput
} from './endpoints/content-endpoint';

// Analysis endpoint
export { 
  analyzePerformance,
  analyzeMarketContext,
  recordExecution,
  type AnalysisInput,
  type MarketAnalysisInput
} from './endpoints/analysis-endpoint';

// Search endpoint
export { 
  generateSearchQuery,
  generateRetweetQuery,
  generateLikeQuery,
  generateQuoteQuery,
  type SearchInput,
  type RetweetSearchInput,
  type LikeSearchInput,
  type QuoteSearchInput
} from './endpoints/search-endpoint';
```

### 2. 型定義統合エクスポート
types.ts から全返却型をリエクスポート：

```typescript
// Return types
export type {
  ClaudeDecision,
  GeneratedContent,
  AnalysisResult,
  SearchQuery
} from './types';

// Supporting types
export type {
  SystemContext,
  BasicMarketContext,
  ExecutionRecord,
  LearningInsight,
  PerformanceMetrics
} from './types';
```

### 3. 使いやすさ最適化
main.ts での使用例に基づく最適なエクスポート構造：

```typescript
// REQUIREMENTS.md main.ts使用例への対応
import { 
  makeDecision, 
  generateContent, 
  analyzePerformance, 
  generateSearchQuery 
} from './claude';
import type { 
  ClaudeDecision, 
  GeneratedContent, 
  AnalysisResult 
} from './claude/types';
```

### 4. ファイルヘッダー・ドキュメント
適切なファイル説明とエンドポイント概要：

```typescript
/**
 * TradingAssistantX Claude Code SDK - エンドポイント別設計統合
 * REQUIREMENTS.md準拠版 - Claude強み活用MVP設計
 * 
 * 提供機能:
 * - 判断エンドポイント: makeDecision()
 * - コンテンツ生成エンドポイント: generateContent()
 * - 分析エンドポイント: analyzePerformance()
 * - 検索クエリエンドポイント: generateSearchQuery()
 * 
 * 設計原則:
 * - 1エンドポイント = 1つの役割
 * - 専用入力/出力型での型安全
 * - kaito-apiと同様のendpoints/構造
 */
```

## 🏗️ エクスポート設計原則

### 明確な役割分離
- 各エンドポイントの責任範囲を明確に分離
- 機能別の論理的グルーピング
- 直感的な関数名でのエクスポート

### 型安全確保
- 入力型・返却型の完全なエクスポート
- TypeScript strict モード対応
- main.ts での型安全な使用をサポート

### 使いやすさ最適化
-REQUIREMENTS.md のmain.ts使用例に完全対応
- 必要な機能に素早くアクセス可能
- kaito-apiと一貫した構造

## 📂 実装構造

### ファイル配置
- **ファイルパス**: `/Users/rnrnstar/github/TradingAssistantX/src/claude/index.ts`

### 依存関係確認
以下のファイルが存在することを前提：
- `./types.ts` （TASK-001）
- `./endpoints/decision-endpoint.ts` （TASK-002）
- `./endpoints/content-endpoint.ts` （TASK-003）
- `./endpoints/analysis-endpoint.ts` （TASK-004）
- `./endpoints/search-endpoint.ts` （TASK-005）

## 🔄 統合テスト要件

### インポート確認
以下のインポートパターンが正常に動作することを確認：

```typescript
// 個別インポート
import { makeDecision } from './claude';
import type { ClaudeDecision } from './claude';

// 複数インポート
import { 
  makeDecision, 
  generateContent, 
  analyzePerformance,
  generateSearchQuery 
} from './claude';

// 型のみインポート
import type { 
  ClaudeDecision, 
  GeneratedContent, 
  AnalysisResult,
  SearchQuery 
} from './claude';
```

### エクスポート完全性確認
- 全エンドポイント関数のエクスポート確認
- 全型定義のエクスポート確認
- main.ts使用例との互換性確認

## 🚫 実装制約

### 禁止事項
- 不要な抽象化・ラッパー関数の作成禁止
- エンドポイント実装の重複禁止
- 複雑な統合ロジックの実装禁止

### 必須要件
- 純粋なエクスポート統合のみ実装
- 各エンドポイントの独立性維持
- TypeScript strict モード対応

## 🔄 品質チェック要件
- TypeScript コンパイルエラーなし
- Lint チェック通過  
- 全エクスポート項目のアクセス確認
- main.ts からの利用確認

## 📋 完了報告
実装完了後、以下の報告書を作成してください：
- **報告書**: `tasks/20250724_152556/reports/REPORT-006-index-export.md`
- **内容**: エクスポート構造の概要、main.ts互換性確認結果、品質チェック結果

## 🔗 依存関係
- **前提**: TASK-001〜005の完了が必要
- **実行順序**: 全エンドポイント実装完了後に開始

---
**重要**: このindex.tsファイルはsrc/claude/モジュールの窓口となる重要なファイルです。使いやすさと型安全を両立した統合エクスポートを実装してください。