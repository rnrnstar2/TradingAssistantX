# TASK-002: Shared Types 整理・重複排除タスク

## 🎯 タスク概要
`shared/types.ts`を整理し、重複している型定義を排除。システム全体の型定義のハブとして機能させる。

## 📋 実装要件

### 1. 重複型定義の排除
以下の重複している型定義を解決：

#### 1.1 アクション結果型の重複
`kaito-api/core/client.ts`と重複している以下の型を削除し、kaito-apiからインポート：
- `PostResult`
- `RetweetResult`
- `QuoteTweetResult`
- `LikeResult`

#### 1.2 SystemContextの統一
`claude/types.ts`のSystemContextと重複しているため、以下の方針で統一：
- claudeの`SystemContext`をインポートして使用
- shared側の定義を削除
- 必要に応じて型拡張で対応

#### 1.3 TweetDataの整理
現在2つの異なる`TweetData`が存在：
- shared版: 簡潔な構造（`author`, `metrics`, `timestamp`）
- kaito-api版: 詳細なAPI形式（`authorId`, `publicMetrics`, `createdAt`）

解決方針：
- shared版を`SimpleTweetData`にリネーム
- kaito-api版の`TweetData`をインポート
- 用途に応じて使い分け可能にする

### 2. インポート構造の整理
以下の構造でインポートを整理：

```typescript
// ============================================================================
// IMPORTS - 外部型定義の集約
// ============================================================================

// Claude SDK Types
export {
  ClaudeDecision,
  GeneratedContent,
  AnalysisResult,
  SearchQuery,
  SystemContext,
  // ... 他のClaude型
} from '../claude/types';

// KaitoAPI Types (Worker1完了後)
export {
  TweetData,
  UserInfo,
  PostResult,
  RetweetResult,
  QuoteTweetResult,
  LikeResult,
  // ... 他のKaitoAPI型
} from '../kaito-api/types';

// ============================================================================
// SHARED SYSTEM TYPES - システム全体共通型
// ============================================================================

// 既存のshared独自の型定義はここに残す
export interface ExecutionResult { ... }
export interface ActionResult { ... }
// ... 他の共通型
```

### 3. 型定義の分類と整理
既存の型定義を以下のカテゴリに分類：

#### 3.1 削除対象（重複型）
- `PostResult`, `RetweetResult`, `QuoteTweetResult`, `LikeResult`
- `SystemContext`
- 重複している`TweetData`

#### 3.2 リネーム対象
- `TweetData` → `SimpleTweetData`

#### 3.3 維持対象（shared独自型）
- `ExecutionResult`
- `ActionResult`
- `AccountInfo`
- `LearningData`
- `SessionData`
- `DataArchive`
- その他のシステム共通型

### 4. 型の依存関係整理
- 循環参照を避ける
- 明確な依存方向を確立：shared → (claude, kaito-api)
- sharedは他モジュールの型を集約・再エクスポート

### 5. 実装手順
1. 既存ファイルのバックアップ（コメントで元の定義を残す）
2. インポート文の追加
3. 重複型の削除
4. 型定義の整理・分類
5. エクスポート文の整理
6. JSDocコメントの更新

### 6. 注意事項
- **破壊的変更を避ける**: 既存コードが動作するよう互換性を保つ
- **段階的移行**: 一度にすべて変更せず、段階的に整理
- **Worker1の完了待ち**: kaito-api/types.tsが作成されていない場合は、その部分のインポートはコメントアウト

## 🔧 実装完了後
- `tasks/20250724-200329/reports/REPORT-002-shared-types-cleanup.md`に実装報告書を作成
- 削除した型、リネームした型、整理した構造について詳細に記載