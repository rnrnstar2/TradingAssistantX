# TypeScriptエラー修正指示書

## 🎯 目的
型定義の簡潔化により発生したTypeScriptエラー（約90件）を解消し、ビルド可能な状態に復旧する

## 🚨 現状の問題
- 必要な型定義が削除されビルドエラー発生
- CollectionResult型のプロパティ不整合
- 型インポートの不整合

## 📋 修正作業（優先順位順）

### Phase 1: 不足型定義の追加（最優先）

#### 1.1 data-types.tsへの型追加
以下の型定義を`src/types/data-types.ts`の末尾に追加：

```typescript
// ============================================================================
// MARKET AND ANALYSIS TYPES - 市場分析関連型
// ============================================================================

export interface MarketCondition {
  volatility: 'low' | 'medium' | 'high';
  trend: 'bullish' | 'bearish' | 'neutral';
  volume: number;
  lastUpdate: number;
}

export interface ProcessedData {
  data: CollectionResult[];
  processedAt: number;
  dataQuality: number;
  totalItems: number;
}

export interface TrendData {
  trend: string;
  momentum: number;
  sources: string[];
  expiresAt: number;
}

export interface MarketTopic {
  topic: string;
  relevance: number;
  sources: string[];
  timestamp: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
  charCount?: number;
}

export type ContentStrategy = 'educational' | 'trend' | 'analytical';
```

#### 1.2 レガシー互換性型の追加
CollectionResult型の互換性のため、以下も追加：

```typescript
// ============================================================================
// LEGACY COMPATIBILITY - レガシー互換性型
// ============================================================================

// 既存コードとの互換性のための型
export interface LegacyCollectionResult {
  source: string;
  data: any[];
  metadata: {
    timestamp: string;
    count: number;
    sourceType: string;
    processingTime: number;
    config?: any;
  };
  success: boolean;
  error?: string;
}

// 型変換ヘルパー
export function toLegacyResult(result: CollectionResult): LegacyCollectionResult {
  const isSuccess = result.status === 'success' || !result.status;
  return {
    source: result.source,
    data: Array.isArray(result.content) ? result.content : [result.content],
    metadata: {
      timestamp: new Date(result.timestamp).toISOString(),
      count: Array.isArray(result.content) ? result.content.length : 1,
      sourceType: result.source,
      processingTime: 0,
      ...(result.metadata as any)
    },
    success: isSuccess,
    error: result.errors?.[0]
  };
}
```

### Phase 2: 型インポートの修正

#### 2.1 action-specific-collector.ts
ファイル先頭のインポートに追加：
```typescript
import type { 
  CollectionResult, 
  MarketCondition,
  LegacyCollectionResult,
  toLegacyResult 
} from '../types/data-types';
```

#### 2.2 content-creator.ts
ファイル先頭のインポートを修正：
```typescript
import type { 
  PostContent, 
  CollectionResult,
  ProcessedData,
  TrendData,
  MarketTopic,
  ValidationResult,
  ContentStrategy
} from '../types/data-types';
```

#### 2.3 core-runner.ts
CollectionResult使用箇所の修正が必要

### Phase 3: 使用箇所の修正

#### 3.1 CollectionResult互換性対応
action-specific-collector.ts内の以下のパターンを修正：

**現在のコード:**
```typescript
return {
  source: strategyName,
  data: combinedData,
  metadata: { ... },
  success: !hasErrors,
  error: hasErrors ? errorMessage : undefined
};
```

**修正後:**
```typescript
const result: CollectionResult = {
  id: `${strategyName}-${Date.now()}`,
  content: combinedData,
  source: strategyName,
  timestamp: Date.now(),
  metadata: { ... },
  status: hasErrors ? 'failure' : 'success',
  errors: hasErrors ? [errorMessage] : undefined
};

// レガシー互換性が必要な場合
return toLegacyResult(result);
```

#### 3.2 プロパティアクセスの修正
以下のパターンを検索して修正：
- `result.data` → `Array.isArray(result.content) ? result.content : [result.content]`
- `result.success` → `result.status === 'success'`
- `result.error` → `result.errors?.[0]`

### Phase 4: エクスポートエラーの修正

#### 4.1 index.ts重複エクスポート修正
`src/types/index.ts`の以下を修正：

```typescript
// 重複している箇所を削除
export type { PostTemplate } from './data-types';

// Config interfaceの修正
export interface Config {
  targets: ScrapeTarget[];
  templates: PostTemplate[];  // PostTemplateは既にdata-typesからインポート済み
}
```

#### 4.2 不足している型の追加
```typescript
// index.tsの末尾に追加
export type ActionResult = ActionDecision & { result: any };
export type ExecutionResult = SystemExecutionResult;
export type PostingResult = PostingHistory;
```

### Phase 5: 検証とクリーンアップ

#### 5.1 ビルド検証
```bash
pnpm tsc --noEmit
```

#### 5.2 残存エラーの個別対応
- エラーが残る場合は、具体的なファイルと行番号を確認
- 型の使用方法を調整

## ⚠️ 注意事項

1. **互換性維持**: 既存の動作を壊さないよう、レガシー互換性レイヤーを使用
2. **段階的修正**: 一度にすべて修正せず、Phase毎に検証
3. **型安全性**: any型の使用は最小限に留める

## 🎯 期待される成果

- TypeScriptビルドエラー0件
- 型定義の整合性確保
- MVP機能の正常動作維持

---

作成日: 2025-01-23
作成者: Manager (Claude Code SDK)