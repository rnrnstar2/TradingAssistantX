# TASK-002: 型システム整理とレガシーインターフェース除去

## 🎯 作業目標
collectors関連の型定義を整理し、ActionSpecificCollector中心設計に不要なレガシーインターフェースを除去して、型システムを簡素化する。

## 📋 要件定義確認事項
- **REQUIREMENTS.md準拠**: 疎結合設計・統一インターフェース・データソース独立性
- **MVP制約**: 複雑な型定義を避け、必要最小限の型のみ維持
- **Type Safety**: TypeScript strict modeでの完全型安全性

## 🔍 現状分析結果
### 対象ファイル
- `src/types/data-types.ts` (主要対象)
- `src/types/index.ts` (エクスポート整理)
- `src/types/config-types.ts` (設定関連型)

### 検出された問題点
1. **過剰な型定義**: 使用されていない複雑な型が多数存在
2. **レガシー互換性型**: 既に使用されていない旧型定義
3. **重複型定義**: 同じ概念の型が複数箇所で定義
4. **不適切なexport**: 使用されない型のエクスポート

## 🛠️ 実装タスク

### Phase 1: data-types.ts のレガシー型除去

#### 1. 使用されていない複雑な型の特定と削除
削除対象候補:
```typescript
// 過剰な設定型（簡素化対象）
export interface PostingConfig {
  enabled: boolean;
  mode: 'test' | 'production';
  schedule: PostingSchedule; // 複雑すぎる
  constraints: PostingConstraints; // 複雑すぎる
  quality: QualityRequirements; // 複雑すぎる
  templates: PostTemplate[]; // MVP不要
  automation: AutomationSettings; // MVP不要
}

// 複雑なスケジュール型（削除対象）
export interface PostingSchedule {
  timezone: string;
  optimalTimes: TimeSlot[];
  blackoutPeriods: TimeSlot[];
  frequency: { min: number; max: number; unit: 'minute' | 'hour' | 'day'; };
}

// 複雑な制約型（削除対象）
export interface PostingConstraints {
  maxLength: number;
  minLength: number;
  maxHashtags: number;
  maxMentions: number;
  allowMedia: boolean;
  requireApproval: boolean;
  cooldownPeriod: number;
}
```

#### 2. コレクター関連の核心型のみ維持
保持対象:
```typescript
// 疎結合設計の核心型（保持）
export interface BaseCollectionResult<T = any, M = BaseMetadata>
export type CollectionResult
export interface CollectionExecutionResult
export interface CollectionSummary

// RSS関連の必要最小限型（保持）
export interface RSSSourceConfig
export interface RSSItem
export interface RSSFeedResult
export interface MultiSourceCollectionResult
export interface RssYamlSettings
export interface RSSSource
```

### Phase 2: index.ts のエクスポート整理

#### 1. 不要なエクスポートの削除
```typescript
// 削除対象のエクスポート
export type {
  PostingConfig,        // 複雑すぎる
  PostingSchedule,      // MVP不要
  PostingConstraints,   // MVP不要
  QualityRequirements,  // MVP不要 
  AutomationSettings,   // MVP不要
  PostTemplate,         // MVP不要
  TemplateConstraints   // MVP不要
} from './data-types';
```

#### 2. Collector関連の核心エクスポートのみ維持
```typescript
// 維持すべきエクスポート
export type {
  // Collection Types (疎結合の核心)
  BaseMetadata,
  BaseCollectionResult,
  CollectionResult,
  CollectionExecutionResult,
  CollectionSummary,

  // RSS Configuration (MVP必要)
  RSSSourceConfig,
  RSSItem,
  RSSFeedResult,
  MultiSourceCollectionResult,
  RssYamlSettings,
  RSSSource,

  // Content Types (最小限)
  PostContent,
  ContentType,
  ContentMetadata,
  QualityMetrics
} from './data-types';
```

### Phase 3: 型整合性の確認

#### 1. ActionSpecificCollectorで使用される型の確認
現在使用されている型:
- `CollectionResult` / `LegacyCollectionResult`
- `MarketCondition`
- `BaseCollector` (from base-collector.ts)
- `CollectionContext` (from base-collector.ts)

#### 2. RSSCollector・PlaywrightAccountCollectorで使用される型の確認
必要な型のみを保持し、未使用型を削除

## 🔧 具体的変更指示

### 1. data-types.ts の簡素化

```typescript
// 削除する複雑な型セクション
// ============================================================================
// POSTING CONFIGURATION (削除対象)
// ============================================================================

// 削除: PostingConfig, PostingSchedule, TimeSlot, PostingConstraints, 
//       QualityRequirements, AutomationSettings, PostTemplate, TemplateConstraints

// 削除: POST HISTORY AND TRACKING の複雑な部分
// ============================================================================
// POST HISTORY AND TRACKING (簡素化)
// ============================================================================

// PostHistory, EngagementData は基本形のみ保持
```

### 2. 型ガード関数の整理

```typescript
// 保持する型ガード（collectors で使用）
export function isLegacyCollectionResult(obj: any): obj is LegacyCollectionResult
export function createCollectionResult(...)
export function toLegacyResult(result: CollectionResult): LegacyCollectionResult

// 削除する型ガード（未使用）
// calculateOverallQuality, getQualityGrade など複雑な品質計算関数
```

### 3. レガシー互換性型の最小化

```typescript
// 最小限のレガシー型（ActionSpecificCollector用）
export interface LegacyCollectionResult {
  source: string;
  data: any[];
  metadata: {
    timestamp: string;
    count: number;
    sourceType: string;
    processingTime: number;
  };
  success: boolean;
  error?: string;
}

// 複雑な変換関数は削除し、シンプルな変換のみ保持
```

## ✅ 品質要件
1. **TypeScript Strict**: 全ての型定義がstrict mode準拠
2. **インポートエラーゼロ**: 既存コードからの型インポートエラーなし
3. **循環依存なし**: 型定義間の循環依存を避ける
4. **命名一貫性**: 統一された命名規則

## 🚫 MVP制約・禁止事項
1. **新機能型追加禁止**: 既存型の整理のみ
2. **複雑な品質計算型禁止**: QualityMetricsの複雑化禁止
3. **投稿設定型禁止**: PostingConfig等の詳細設定型削除

## 📝 完了条件
1. 不要な型定義の完全削除
2. TypeScriptコンパイルエラーゼロ
3. 既存collectors コードからの型インポートエラーなし
4. index.ts エクスポートの整理完了

## 📤 成果物
1. **整理済み型ファイル**: `src/types/data-types.ts`, `src/types/index.ts`
2. **削除型一覧**: 削除した型の詳細リスト
3. **型依存関係図**: 整理後の型関係マップ

## 🎛️ 作業指針
1. **段階的削除**: 段階的に型を削除し、各段階でコンパイル確認
2. **依存確認**: 削除前に他ファイルでの使用を確認
3. **バックアップ**: 重要な型は一時的にコメントアウトで保持

---

**重要**: この作業により型システムが大幅に簡素化されます。collectors の動作に必要な型のみを残し、MVP範囲外の複雑な型は確実に削除してください。