# TASK-007: 型定義統合・緊急修正

## 🎯 タスク概要
TASK-002の基本型定義とTASK-005のFX特化型定義の不整合を解決し、TypeScriptエラーを完全に修正する。

## 🚨 修正対象エラー

### 1. TargetQueryInsights型の不整合
**エラー**: `technicalLevels`, `contrarianViews`, `predictions`, `riskWarnings`が欠如

**修正ファイル**: `src/claude/types.ts`

**修正内容**:
```typescript
// 既存のTargetQueryInsightsを以下に置換
export interface TargetQueryInsights {
  summary: string;
  keyPoints: Array<{
    point: string;
    importance: 'critical' | 'high' | 'medium';
    category: 'warning' | 'news' | 'trend' | 'analysis' | 'technical' | 'fundamental' | 'sentiment' | 'prediction';
    uniquenessScore?: number;
  }>;
  marketSentiment?: 'bullish' | 'bearish' | 'neutral';
  mentionedPairs?: string[];
  confidence: number;
  analyzedAt: string;
  dataPoints: number;
  
  // TASK-005で追加されたFX特化フィールドを統合
  technicalLevels: {
    [pair: string]: {
      support: number[];
      resistance: number[];
    };
  };
  contrarianViews: string[];
  predictions: Array<{
    pair: string;
    direction: 'up' | 'down' | 'range';
    target?: number;
    timeframe: string;
    confidence: number;
  }>;
  riskWarnings: string[];
}
```

### 2. SystemContext型の拡張
**修正ファイル**: `src/shared/types.ts`

**修正内容**:
```typescript
// SystemContextにanalysisInsightsフィールドを追加
export interface SystemContext {
  timestamp?: string;
  executionId?: string;
  account?: AccountInfo;
  system?: {
    health: {
      all_systems_operational: boolean;
      api_status: string;
      rate_limits_ok: boolean;
    };
    executionCount: {
      today: number;
      total: number;
    };
  };
  learningData?: {
    recentTopics: string[];
    avgEngagement: number;
    totalPatterns?: number;
    optimalTimeSlot?: string;
  };
  market?: {
    sentiment: 'bullish' | 'bearish' | 'neutral';
    volatility: 'high' | 'medium' | 'low';
    trendingTopics: string[];
  };
  referenceTweets?: any[];
  referenceAccountTweets?: any[];
  
  // 新規追加：分析インサイトフィールド
  analysisInsights?: CombinedAnalysisInsights;
}
```

### 3. インポート文の追加
**修正ファイル**: `src/shared/types.ts`

**修正内容**:
```typescript
// ファイル上部にインポート追加
import { CombinedAnalysisInsights } from '../claude/types';
```

## 🔧 検証要件

### 1. TypeScript型チェック
```bash
npx tsc --noEmit --project .
```
**成功条件**: エラー0件

### 2. 既存機能の動作確認
- Claude分析エンドポイントの動作
- メインワークフローの実行
- 型安全性の確保

## 📁 関連ファイル
- `src/claude/types.ts` - 主要修正対象
- `src/shared/types.ts` - SystemContext拡張
- `src/workflows/workflow-actions.ts` - エラー発生箇所

## ✅ 完了条件
- TypeScriptエラー0件
- 既存のテスト通過
- FX特化機能の型安全性確保