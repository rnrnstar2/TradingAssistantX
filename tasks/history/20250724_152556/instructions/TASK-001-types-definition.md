# TASK-001: src/claude/types.ts 作成指示書

## 🎯 タスク概要
src/claude/types.ts ファイルを作成し、エンドポイント別設計の各返却型定義を実装してください。

## 📋 要件定義準拠
REQUIREMENTS.md の**エンドポイント別設計**に基づき、以下の型定義を実装：

### 必須返却型定義
1. **ClaudeDecision** - decision-endpoint.ts の返却型
2. **GeneratedContent** - content-endpoint.ts の返却型  
3. **AnalysisResult** - analysis-endpoint.ts の返却型
4. **SearchQuery** - search-endpoint.ts の返却型

## 🔍 既存コード分析結果
既存ファイルから以下の型定義を抽出・統合：

### decision-engine.ts から抽出
```typescript
export interface ClaudeDecision {
  action: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'wait';
  reasoning: string;
  parameters: {
    topic?: string;
    searchQuery?: string;
    content?: string;
    targetTweetId?: string;
    duration?: number;
    reason?: string;
    retry_action?: string;
  };
  confidence: number;
}
```

### content-generator.ts から抽出
```typescript
export interface GeneratedContent {
  content: string;
  hashtags: string[];
  qualityScore: number;
  metadata: {
    wordCount: number;
    contentType: string;
    generatedAt: string;
  };
}
```

## ✅ 実装タスク

### 1. 基本構造作成
- ファイルヘッダーコメント作成
- 各エンドポイント返却型の定義

### 2. 型定義実装
- **ClaudeDecision型**: 判断エンドポイント専用返却型
- **GeneratedContent型**: コンテンツ生成エンドポイント専用返却型
- **AnalysisResult型**: 分析エンドポイント専用返却型（新規設計）
- **SearchQuery型**: 検索クエリエンドポイント専用返却型（新規設計）

### 3. 共通入力型定義
- **DecisionInput**: decision-endpoint への入力型
- **ContentInput**: content-endpoint への入力型
- **AnalysisInput**: analysis-endpoint への入力型  
- **SearchInput**: search-endpoint への入力型

### 4. 補助型定義
既存コードから抽出した補助型：
- **ContentRequest** (content-generator.ts から)
- **SystemContext** (decision-engine.ts から)
- **BasicMarketContext** (market-analyzer.ts から)

## 📏 型安全設計原則

### エンドポイント別型安全確保
- 各エンドポイントの入力・出力型を明確に分離
- 型の再利用より明確性を優先
- 各エンドポイントが独立して動作可能な型設計

### MVP制約遵守
- 過剰な型抽象化は避ける
- 実際に使用する型のみ定義
- シンプルで理解しやすい型構造

## 🚫 実装制約

### 禁止事項
- 過剰な型抽象化・ジェネリクス使用禁止
- 未使用型定義の作成禁止
- 複雑な型演算の使用禁止

### 必須要件
- TypeScript strict モード対応
- 全型に適切な JSDoc コメント付与
- エンドポイント専用型の明確な分離

## 📂 出力先
- **ファイルパス**: `/Users/rnrnstar/github/TradingAssistantX/src/claude/types.ts`
- **権限**: Manager権限での例外適用（指示書作成後にWorkerが実装）

## 🔄 品質チェック要件
- TypeScript コンパイルエラーなし
- Lint チェック通過
- 各型の用途と責任範囲が明確

## 📋 完了報告
実装完了後、以下の報告書を作成してください：
- **報告書**: `tasks/20250724_152556/reports/REPORT-001-types-definition.md`
- **内容**: 実装した型の概要、設計判断の理由、品質チェック結果

---
**重要**: この指示書は要件定義に完全準拠し、エンドポイント別設計の基盤となる重要なタスクです。型安全性を最優先に実装してください。