# TASK-001: Kaito API型システム最適化

## 🎯 タスク概要

src/kaito-api/types.tsの型定義システムを最適化し、TwitterAPI.io仕様に完全準拠した型安全性を確保する。

## 📋 実装要件

### 1. 型定義ファイルの最適化

**対象ファイル**: `src/kaito-api/types.ts`

**改善項目**:
- 重複型定義の統合と整理
- TwitterAPI.io仕様に基づく型の正確性向上
- 型定義のカテゴリ別整理（Core, Tweet, User, Response, Error）
- 不使用型定義の削除
- JSDoc コメントの充実

### 2. TwitterAPI.io完全準拠の型定義

**参考仕様**: https://docs.twitterapi.io/introduction

**重要な仕様ポイント**:
- 200 QPS制限に対応した型定義
- $0.15/1k tweets のコスト計算型
- Bearer Token認証型
- User Session認証型
- エラーレスポンス標準化

### 3. 型安全性の向上

**改善ポイント**:
- Optional/Required プロパティの正確な定義
- Union型の適切な使用
- Generic型の活用
- Discriminated Union の使用（エラー処理）

## 🔧 具体的な実装内容

### Phase 1: 型定義の再構築

```typescript
// Core Types - TwitterAPI.io基本構造
export interface TwitterAPIConfig {
  apiKey: string;
  qpsLimit: 200; // TwitterAPI.io固定値
  costTracking: {
    enabled: boolean;
    ratePerThousand: 0.15; // $0.15/1k tweets
  };
}

// Response Types - 統一レスポンス構造
export interface TwitterAPIBaseResponse<T> {
  data: T;
  meta?: {
    result_count: number;
    next_token?: string;
  };
}

// Error Types - 標準化エラー構造
export interface TwitterAPIError {
  error: {
    code: string;
    message: string;
    type: 'authentication' | 'authorization' | 'validation' | 'rate_limit' | 'server_error';
  };
}
```

### Phase 2: エンドポイント別型定義

```typescript
// Tweet Types
export interface TweetCreateRequest {
  text: string;
  media_ids?: string[];
  reply?: {
    in_reply_to_tweet_id: string;
  };
  quote_tweet_id?: string;
}

// User Types  
export interface UserInfoResponse extends TwitterAPIBaseResponse<UserData> {}

// Engagement Types
export interface EngagementRequest {
  tweetId: string;
  action: 'like' | 'retweet';
}
```

### Phase 3: 型安全性の強化

```typescript
// Discriminated Union for Results
export type APIResult<T> = 
  | { success: true; data: T }
  | { success: false; error: TwitterAPIError };

// Strict Type Guards
export function isTwitterAPIError(obj: any): obj is TwitterAPIError {
  return obj && obj.error && typeof obj.error.code === 'string';
}
```

## 📝 必須実装項目

### 1. 型定義の整理統合
- [ ] 重複型定義の特定と統合
- [ ] 使用されていない型定義の削除
- [ ] カテゴリ別の論理的整理

### 2. TwitterAPI.io仕様準拠
- [ ] API仕様書に基づく型の正確性確認
- [ ] レスポンス形式の統一
- [ ] エラー形式の標準化

### 3. 型安全性向上
- [ ] Optional/Required の正確な定義
- [ ] Union型の適切な使用
- [ ] Type Guard関数の実装

### 4. ドキュメント充実
- [ ] JSDoc コメントの追加
- [ ] 使用例の記載
- [ ]型関係図のコメント

## 🚫 制約事項

### MVP制約
- **過剰な抽象化禁止**: 実際に使用される型のみ定義
- **複雑なGeneric型避ける**: 理解しやすさ重視
- **将来性考慮しない**: 現在のMVP要件に集中

### 互換性制約
- **既存コードの破壊的変更禁止**: 段階的移行を実施
- **shared/types.tsとの整合性**: 型の重複を避ける
- **import/export構造維持**: 既存の依存関係を保持

## 📊 品質基準

### TypeScript Strict適合
- `strict: true` でエラーなし
- `noImplicitAny: true` 完全対応
- `strictNullChecks: true` 対応

### Lint適合
- ESLint エラーなし
- Prettier フォーマット適用
- コメント規約遵守

### テスト適合
- 型定義テストの更新
- 型安全性テストの追加
- edge case カバレッジ向上

## 🔄 実装順序

1. **現状分析**: 既存型定義の詳細調査
2. **再設計**: TwitterAPI.io仕様に基づく型設計
3. **段階的実装**: 破壊的変更を避けた移行
4. **テスト更新**: 型定義テストの更新
5. **動作確認**: 全エンドポイントでの動作テスト

## 📋 完了条件

- [ ] src/kaito-api/types.ts の完全リファクタリング
- [ ] TypeScript strict mode エラーなし
- [ ] ESLint/Prettier エラーなし
- [ ] 全既存テストが通過
- [ ] JSDoc コメント 90%以上カバレッジ
- [ ] TwitterAPI.io仕様書との完全一致確認

## 📄 成果物

### 必須ファイル
- `src/kaito-api/types.ts` (最適化版)
- `tasks/20250727_223237_kaito_api_quality_improvement/outputs/type-analysis-report.md`
- `tasks/20250727_223237_kaito_api_quality_improvement/outputs/type-migration-log.md`

### テストファイル更新
- `tests/kaito-api/types.test.ts`
- `tests/kaito-api/core/client.test.ts` (型関連テスト)

## 🎯 重要な注意事項

1. **破壊的変更回避**: 既存APIインターフェースは維持
2. **段階的移行**: 一度に大量変更せず、段階的実装
3. **テスト優先**: 型変更前に対応テストを準備
4. **文書化重視**: 変更内容の詳細記録
5. **レビュー必須**: Manager による品質確認

---

**実装完了後、報告書を作成してください**:
📋 報告書: `tasks/20250727_223237_kaito_api_quality_improvement/reports/REPORT-001-type-system-optimization.md`