# TASK-002: TwitterAPI.io 認証レベル別型定義分離

## 🎯 タスク概要

現在の巨大なtypes.ts（1635行）を認証レベル別に分離し、TwitterAPI.ioの3層認証アーキテクチャに対応した型定義システムを構築します。各認証レベルの専用型定義により、型安全性と開発効率を向上させます。

## 📋 実装要件

### 1. 型定義ディレクトリ構造作成

```
src/kaito-api/types/
├── common.ts           # 共通型定義（基本Request/Response）
├── public-types.ts     # APIキー認証用型定義
├── v1-auth-types.ts    # V1ログイン認証用型定義
├── v2-auth-types.ts    # V2ログイン認証用型定義
└── index.ts           # 型定義エクスポート統合
```

### 2. 認証レベル別型定義分離

#### A. 共通型定義
**ファイル**: `src/kaito-api/types/common.ts`
```typescript
// TwitterAPI.io基本構造
export interface TwitterAPIBaseResponse<T> { ... }
export interface TwitterAPIError { ... }
export interface QPSInfo { ... }
export interface HttpClient { ... }
export type TwitterId = string;
export type ISO8601DateString = string;

// 基本データ構造（全認証レベル共通）
export interface TweetData { ... }
export interface UserData { ... }
export interface TrendData { ... }
```

#### B. APIキー認証専用型
**ファイル**: `src/kaito-api/types/public-types.ts`
```typescript
// 読み取り専用操作の型定義
export interface UserInfoRequest { userName: string; }
export interface TweetSearchRequest { query: string; queryType: string; count?: number; }
export interface TrendRequest { location?: string; }
export interface FollowerInfoRequest { userName: string; }

// レスポンス型
export interface UserInfoResponse extends TwitterAPIBaseResponse<UserData> {}
export interface TweetSearchResponse extends TwitterAPIBaseResponse<TweetData[]> {}
export interface TrendResponse extends TwitterAPIBaseResponse<TrendData[]> {}
```

#### C. V1ログイン認証専用型
**ファイル**: `src/kaito-api/types/v1-auth-types.ts`
```typescript
// V1認証プロセス型
export interface V1LoginStep1Request {
  username_or_email: string;
  password: string;
  proxy: string;
}
export interface V1LoginStep1Response {
  success: boolean;
  login_data?: string;
  error?: string;
}

export interface V1LoginStep2Request {
  login_data: string;
  '2fa_code': string;
  proxy: string;
}
export interface V1LoginStep2Response {
  success: boolean;
  session?: string;
  error?: string;
}

// V1投稿・アクション型
export interface V1TweetCreateRequest {
  text: string;
  auth_session: string;
  proxy: string;
}
export interface V1EngagementRequest {
  tweet_id: string;
  auth_session: string;
  proxy: string;
}
```

#### D. V2ログイン認証専用型
**ファイル**: `src/kaito-api/types/v2-auth-types.ts`
```typescript
// V2認証プロセス型
export interface V2LoginRequest {
  username: string;
  email: string;
  password: string;
  totp_secret: string;
  proxy: string;
}
export interface V2LoginResponse {
  success: boolean;
  login_cookie?: string;
  error?: string;
  user_info?: {
    id: string;
    username: string;
  };
}

// V2投稿・高機能型
export interface V2TweetCreateRequest {
  tweet_text: string;
  login_cookies: string;
  proxy: string;
  is_note_tweet?: boolean;
  reply_settings?: 'everyone' | 'mentioned_users' | 'followers';
}

export interface V2DMRequest {
  recipient_id: string;
  message: string;
  login_cookies: string;
  proxy: string;
}

export interface V2CommunityRequest {
  name: string;
  description: string;
  login_cookies: string;
  proxy: string;
}
```

### 3. 統合エクスポートシステム

**ファイル**: `src/kaito-api/types/index.ts`
```typescript
// 共通型定義
export * from './common';

// 認証レベル別型定義
export * from './public-types';
export * from './v1-auth-types';
export * from './v2-auth-types';

// 認証レベル判定型
export type AuthLevel = 'api-key' | 'v1-login' | 'v2-login';

export interface AuthLevelConfig {
  level: AuthLevel;
  capabilities: string[];
  requiredEnvVars: string[];
}
```

## 🔧 移行戦略

### 既存types.ts分析・分類

#### 1. 保持対象（common.ts移行）
- `TwitterAPIBaseResponse<T>`
- `TwitterAPIError`
- `TweetData`、`UserData`
- 基本ユーティリティ型
- Type guards（実行時型安全性）

#### 2. 認証レベル別分離対象
- **API key用**: 検索・情報取得関連型
- **V1用**: 基本投稿・エンゲージメント型
- **V2用**: 高機能投稿・DM・コミュニティ型

#### 3. 廃止対象（互換性維持のみ）
- Legacy型定義（@deprecatedマーク）
- OAuth1関連型（TwitterAPI.ioでは未使用）
- 過度に複雑な統計型（MVP範囲外）

### 後方互換性維持

#### レガシーインポート対応
```typescript
// 既存コードで以下が継続動作するように
import { TweetData, UserData } from '../kaito-api/types';
import type { PostResult } from '../kaito-api/types';
```

#### 型エイリアス提供
```typescript
// types/index.ts内で既存型名の互換性確保
export type { PostResult as TweetResult } from './v1-auth-types';
export type { V2TweetCreateRequest as CreateTweetV2Request } from './v2-auth-types';
```

## 📊 型定義最適化指針

### 1. 認証レベル特化
- **各認証レベルで実際に使用する型のみ定義**
- **クロスレベル参照を最小限に抑制**
- **認証要件の型レベル表現**

### 2. 開発効率向上
- **IDE自動補完最適化**: 認証レベル別に適切な型候補表示
- **型エラー早期発見**: 認証レベル不適合を型レベルで検出
- **ドキュメント統合**: 型定義内のJSDoc充実

### 3. 保守性確保
- **単一責任原則**: 1つの型ファイル = 1つの認証レベル
- **循環依存回避**: common.tsを基底とした単方向依存
- **バージョン管理**: 型変更の影響範囲明確化

## ✅ 完了基準

### 機能検証
1. **型安全性**: 全認証レベルでstrict TypeScript通過
2. **インポート動作**: 既存コードのimport文が正常動作
3. **IDE支援**: 自動補完・型チェックが認証レベル別に適切動作
4. **コンパイル通過**: 全関連ファイルがエラーなしでコンパイル

### 構造検証
1. **ディレクトリ構造**: docs/directory-structure.md準拠
2. **命名規則**: ファイル名・型名の一貫性
3. **エクスポート統合**: index.tsによる統一的なエクスポート
4. **循環依存なし**: 型定義間の健全な依存関係

### ドキュメント
1. **型定義コメント**: 各型の用途・認証要件を明記
2. **使用例記載**: 認証レベル別の具体的な使用例
3. **移行ガイド**: 既存コードから新型定義への移行手順
4. **API対応表**: TwitterAPI.ioエンドポイントと型の対応

## 🚨 重要制約

### MVP制約
- **実用型のみ**: 実際に使用しない型は定義しない
- **過度な抽象化禁止**: 複雑なジェネリック型を避ける
- **シンプル設計**: 理解しやすい型構造を優先

### 互換性制約
- **既存importパス保持**: 段階的移行のため既存パス継続使用可能
- **型名互換性**: 既存の型名を可能な限り保持
- **段階的導入**: 新旧型定義の並行利用期間を設ける

### パフォーマンス制約
- **コンパイル時間**: 型定義分離によるコンパイル時間増加を最小限に
- **メモリ使用量**: TypeScriptコンパイラーのメモリ効率考慮
- **開発体験**: IDE応答性の維持

## 📋 出力先

- **実装ファイル**: `src/kaito-api/types/` 配下
- **テストファイル**: `tests/kaito-api/types/` 配下  
- **報告書**: `tasks/20250728-1911/reports/REPORT-002-types-auth-separation.md`

## ⚠️ 注意事項

1. **既存types.ts保持**: 移行完了まで既存ファイル削除禁止
2. **段階的移行**: 一度に全てを変更せず、段階的に移行
3. **依存関係確認**: 型変更が他モジュールに与える影響の事前確認
4. **型テスト**: 型定義の正確性を検証するテストコード作成

---

**重要**: この型定義分離は、Phase 2の認証コア実装とPhase 4のエンドポイント再構築の基盤となります。型安全性を最優先に、段階的かつ慎重に実装してください。