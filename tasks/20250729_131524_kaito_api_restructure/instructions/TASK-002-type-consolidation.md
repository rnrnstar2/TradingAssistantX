# TASK-002: 型定義統合

## 概要
kaito-apiの型定義を仕様書（docs/kaito-api.md）に従って統合する。
現在のtypes/ディレクトリをutils/types.tsに一元化する。

## 要件定義書参照
- docs/kaito-api.md: 「アーキテクチャ設計原則」セクション
- docs/directory-structure.md: kaito-api型定義仕様

## 現状の構造
```
src/kaito-api/
├── types/
│   ├── common.ts
│   ├── index.ts
│   ├── public-types.ts
│   ├── v1-auth-types.ts
│   └── v2-auth-types.ts
├── utils/
│   ├── normalizer.ts
│   ├── response-handler.ts
│   ├── type-checker.ts
│   └── validation.ts
└── types.ts.backup（バックアップファイル）
```

## 目標の構造
```
src/kaito-api/utils/
├── types.ts         # 全型定義を統合
├── normalizer.ts    # 既存
├── response-handler.ts # 既存
├── type-checker.ts  # 既存
├── validation.ts    # 既存
└── index.ts        # utilsエクスポート
```

## 実装手順

### 1. 型定義の分析と整理
types/ディレクトリの各ファイルから必要な型定義を抽出：
- common.ts: 共通型（HttpClient, RateLimitInfo等）
- public-types.ts: 読み取り専用API型
- v2-auth-types.ts: V2認証必須API型
- v1-auth-types.ts: スキップ（V1は削除予定）

### 2. utils/types.ts作成
統合された型定義ファイルの構造：
```typescript
// ============================================================================
// KaitoTwitterAPI 統合型定義
// ============================================================================

// 共通型定義
export interface HttpClient { ... }
export interface RateLimitInfo { ... }
export interface CostTrackingInfo { ... }

// 認証関連型
export interface LoginCredentials { ... }
export interface LoginResult { ... }
export interface AuthStatus { ... }

// 読み取り専用API型
export interface UserInfoRequest { ... }
export interface UserInfoResponse { ... }
export interface SearchRequest { ... }
export interface SearchResponse { ... }
// ... その他read-only型

// 認証必須API型（V2）
export interface PostRequest { ... }
export interface PostResponse { ... }
export interface EngagementRequest { ... }
export interface EngagementResponse { ... }
// ... その他authenticated型

// レスポンス型
export interface TwitterAPIResponse<T> { ... }
export interface ErrorResponse { ... }
```

### 3. インポート文の更新
型定義を使用している全ファイルのインポート文を更新：
- `from '../types'` → `from '../utils/types'`
- `from './types'` → `from './utils/types'`

### 4. types/ディレクトリの削除
移行完了後、以下を削除：
- types/ディレクトリ全体
- types.ts.backup

### 5. utils/index.ts作成
utilsディレクトリのエクスポートを統合：
```typescript
export * from './types';
export * from './normalizer';
export * from './response-handler';
export * from './type-checker';
export * from './validation';
```

## 技術的制約
- 既存コードとの互換性維持
- 型の重複排除
- 循環参照の防止
- TypeScript 4.x以降対応

## 品質基準
- TypeScriptコンパイルエラーなし
- 全ての型定義が適切にエクスポートされること
- 既存コードが型エラーなく動作すること
- 不要な型定義の削除

## 注意事項
- V1認証関連の型は含めない（非推奨のため）
- MVPに不要な複雑な型定義は含めない
- 仕様書に記載されている型定義を優先
- 型の命名規則を統一（Request/Response suffix等）

## 成果物
- utils/types.ts: 統合された型定義ファイル
- utils/index.ts: utilsエクスポートファイル
- 全インポート文の更新完了
- 報告書: `tasks/20250729_131524_kaito_api_restructure/reports/REPORT-002-type-consolidation.md`