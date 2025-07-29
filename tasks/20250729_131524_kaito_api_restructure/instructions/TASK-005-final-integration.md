# TASK-005: 最終統合とindex.ts更新

## 概要
kaito-apiの再構成完了後、index.tsを更新して新しい構造に対応させる。
全体の統合テストを実施し、仕様書（docs/kaito-api.md）との整合性を確認する。

## 要件定義書参照
- docs/kaito-api.md: 全体仕様
- docs/directory-structure.md: 最終的な構造
- REQUIREMENTS.md: MVP要件

## 前提条件
- TASK-001〜004が完了していること
- 新しいディレクトリ構造が実装されていること

## 最終構造確認
```
src/kaito-api/
├── core/
│   ├── auth-manager.ts      # V1削除済み、V2標準
│   ├── client.ts            # メインクライアント
│   ├── config.ts            # 設定管理
│   ├── api-key-auth.ts      # APIキー認証
│   ├── v2-login-auth.ts     # V2ログイン認証
│   ├── session-manager.ts   # セッション管理
│   └── index.ts             # coreエクスポート
├── endpoints/
│   ├── read-only/           # 読み取り専用
│   │   ├── user-info.ts
│   │   ├── tweet-search.ts
│   │   ├── trends.ts
│   │   ├── follower-info.ts
│   │   └── index.ts
│   ├── authenticated/       # 認証必須
│   │   ├── tweet.ts
│   │   ├── engagement.ts
│   │   ├── follow.ts
│   │   └── index.ts
│   └── index.ts             # endpointsエクスポート
├── utils/
│   ├── types.ts             # 統合型定義
│   ├── constants.ts         # API定数
│   ├── errors.ts            # エラークラス
│   ├── response-handler.ts  # レスポンス処理
│   ├── validator.ts         # 入力検証
│   ├── normalizer.ts        # データ正規化
│   ├── type-checker.ts      # 型チェック
│   └── index.ts             # utilsエクスポート
└── index.ts                 # kaito-api全体エクスポート
```

## 実装内容

### 1. メインindex.ts更新
```typescript
// ============================================================================
// KAITO API UNIFIED EXPORTS - V2 Standard Architecture
// ============================================================================

// Core exports
export { 
  KaitoApiClient, 
  KaitoTwitterAPIClient 
} from './core/client';
export { KaitoAPIConfigManager } from './core/config';
export { AuthManager } from './core/auth-manager';

// Type exports (from utils)
export type {
  // Common types
  HttpClient,
  RateLimitInfo,
  CostTrackingInfo,
  KaitoClientConfig,
  KaitoAPIConfig,
  
  // Auth types
  LoginCredentials,
  LoginResult,
  AuthStatus,
  
  // Read-only types
  UserInfoRequest,
  UserInfoResponse,
  SearchRequest,
  SearchResponse,
  TrendsResponse,
  FollowerInfoResponse,
  
  // Authenticated types
  PostRequest,
  PostResponse,
  EngagementRequest,
  EngagementResponse,
  FollowRequest,
  FollowResponse,
  
  // Response types
  TwitterAPIResponse,
  ErrorResponse
} from './utils/types';

// Endpoint exports (structured)
export * as readOnly from './endpoints/read-only';
export * as authenticated from './endpoints/authenticated';

// Utility exports
export { ResponseHandler } from './utils/response-handler';
export * as constants from './utils/constants';
export * as errors from './utils/errors';

// Re-export for backward compatibility (optional)
export { 
  KAITO_API_BASE_URL,
  API_ENDPOINTS,
  RATE_LIMITS 
} from './utils/constants';
```

### 2. 各サブモジュールのindex.ts確認
- core/index.ts
- endpoints/index.ts
- endpoints/read-only/index.ts
- endpoints/authenticated/index.ts
- utils/index.ts

### 3. インポートパスの全体更新
旧構造から新構造へのインポートパス変更：
- `'../types'` → `'../utils/types'`
- `'./action-endpoints'` → `'./authenticated/tweet'`
- 他の変更されたパスも同様に更新

### 4. TypeScriptコンパイル確認
```bash
# kaito-apiディレクトリでコンパイル確認
npx tsc --noEmit src/kaito-api/**/*.ts
```

### 5. 基本動作テスト
以下の基本シナリオが動作することを確認：
1. APIキー認証での読み取り操作
2. V2ログイン認証
3. 投稿作成
4. エンゲージメント操作

## 実装手順
1. メインindex.ts更新
2. 各サブモジュールのindex.ts確認・修正
3. インポートパスの全体更新
4. TypeScriptコンパイル確認
5. 削除予定ファイルの最終削除
6. 基本動作テスト実施

## 削除対象（最終確認）
- types/ディレクトリ（全体）
- endpoints/v1-auth/ディレクトリ（全体）
- endpoints/public/ディレクトリ（全体）
- 旧エンドポイントファイル（action-endpoints.ts等）
- types.ts.backup

## 品質基準
- TypeScriptコンパイルエラーなし
- 全てのエクスポートが適切に機能
- 仕様書との完全な整合性
- クリーンなディレクトリ構造

## 注意事項
- 後方互換性は最小限に（必要な場合のみ）
- 不要なファイルは完全に削除
- エクスポート構造はシンプルに保つ
- MVPに必要な機能のみエクスポート

## 成果物
- 更新されたindex.ts
- 動作確認済みの新構造
- 削除完了したファイル一覧
- 最終報告書: `tasks/20250729_131524_kaito_api_restructure/reports/REPORT-005-final-integration.md`

## 最終チェックリスト
- [ ] 全TASK（001-004）の完了確認
- [ ] TypeScriptコンパイル成功
- [ ] 基本動作テスト合格
- [ ] 不要ファイルの削除完了
- [ ] 仕様書との整合性確認
- [ ] エクスポート構造の確認