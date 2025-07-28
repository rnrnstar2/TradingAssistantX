# TASK-004: 型定義最適化・ドキュメント更新

## 🎯 実装目標

TwitterAPI.io統合完了後の型定義最適化、重複型解決、ドキュメント更新を行い、完璧な型安全性とドキュメント整合性を実現する。

## 📋 必須事前読み込み

**REQUIREMENTS.md読み込み必須**：
```bash
cat REQUIREMENTS.md | head -50
```

**前提条件確認**：
- TASK-001, TASK-002, TASK-003の実装完了
- TwitterAPI.io統合の動作確認完了

## 🔧 実装対象ファイル

### 1. 型定義統合・最適化
**対象**: `src/kaito-api/types.ts`

**型重複解決実装**：
```typescript
/**
 * KaitoAPI 統合型定義 - TwitterAPI.io完全対応版
 * 重複型解決済み、shared/types.tsとの整合性確保
 */

// ============================================================================
// CORE TYPES - TwitterAPI.io対応
// ============================================================================

/**
 * KaitoTwitterAPIクライアント設定
 * TwitterAPI.io仕様完全準拠
 */
export interface KaitoClientConfig {
  apiKey: string;
  qpsLimit: number; // TwitterAPI.io: 200 QPS
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  costTracking: boolean; // $0.15/1k tweets tracking
}

/**
 * TwitterAPI.ioレスポンス基底型
 */
export interface TwitterAPIBaseResponse<T> {
  data: T;
  meta?: {
    result_count: number;
    next_token?: string;
  };
}

// ============================================================================
// TWEET TYPES - TwitterAPI.io標準準拠
// ============================================================================

/**
 * TwitterAPI.ioツイートデータ標準形式
 */
export interface TweetData {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    quote_count: number;
    reply_count: number;
    impression_count: number;
  };
  context_annotations?: Array<{
    domain: { name: string; description: string };
    entity: { name: string; description: string };
  }>;
  lang?: string;
  in_reply_to_user_id?: string;
  conversation_id?: string;
}

/**
 * ツイート作成オプション - TwitterAPI.io準拠
 */
export interface CreateTweetOptions {
  text: string;
  media_ids?: string[];
  poll?: {
    options: string[];
    duration_minutes: number;
  };
  reply?: {
    in_reply_to_tweet_id: string;
  };
  quote_tweet_id?: string;
  location?: {
    place_id: string;
  };
}

/**
 * ツイート検索オプション - TwitterAPI.io準拠
 */
export interface TweetSearchOptions {
  query: string;
  max_results?: number;
  next_token?: string;
  start_time?: string;
  end_time?: string;
  sort_order?: 'recency' | 'relevancy';
  'tweet.fields'?: string;
  'user.fields'?: string;
}

// ============================================================================
// USER TYPES - TwitterAPI.io標準準拠
// ============================================================================

/**
 * TwitterAPI.ioユーザーデータ標準形式
 */
export interface UserData {
  id: string;
  username: string;
  name: string;
  description?: string;
  created_at: string;
  location?: string;
  url?: string;
  verified?: boolean;
  profile_image_url?: string;
  profile_banner_url?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

/**
 * ユーザー検索オプション - TwitterAPI.io準拠
 */
export interface UserSearchOptions {
  query: string;
  max_results?: number;
  next_token?: string;
  'user.fields'?: string;
}

// ============================================================================
// RESPONSE TYPES - TwitterAPI.io標準準拠
// ============================================================================

/**
 * ツイート作成レスポンス
 */
export interface TweetCreateResponse extends TwitterAPIBaseResponse<TweetData> {}

/**
 * ツイート検索レスポンス
 */
export interface TweetSearchResponse extends TwitterAPIBaseResponse<TweetData[]> {}

/**
 * ユーザー情報レスポンス
 */
export interface UserInfoResponse extends TwitterAPIBaseResponse<UserData> {}

/**
 * ユーザー検索レスポンス
 */
export interface UserSearchResponse extends TwitterAPIBaseResponse<UserData[]> {}

/**
 * エンゲージメントレスポンス
 */
export interface EngagementResponse extends TwitterAPIBaseResponse<{
  liked?: boolean;
  retweeted?: boolean;
}> {}

// ============================================================================
// ERROR TYPES - TwitterAPI.io準拠
// ============================================================================

/**
 * TwitterAPI.ioエラーレスポンス
 */
export interface TwitterAPIError {
  error: {
    code: string;
    message: string;
    type: 'authentication' | 'authorization' | 'validation' | 'rate_limit' | 'server_error';
  };
}

// ============================================================================
// LEGACY TYPE COMPATIBILITY - shared/types.ts互換性
// ============================================================================

/**
 * @deprecated Use TweetData instead
 * 既存コードとの互換性のため残存
 */
export interface TweetResult {
  id: string;
  text: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * @deprecated Use EngagementResponse instead
 * 既存コードとの互換性のため残存
 */
export interface PostResult {
  id: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

// Export consolidated types for external use
export type {
  // Modern TwitterAPI.io types (recommended)
  TweetData,
  UserData,
  TweetCreateResponse,
  TweetSearchResponse,
  UserInfoResponse,
  UserSearchResponse,
  EngagementResponse,
  TwitterAPIError,
  
  // Legacy compatibility types
  TweetResult,
  PostResult
};
```

### 2. 型安全性チェッカー実装
**作成**: `src/kaito-api/utils/type-checker.ts`

```typescript
/**
 * TwitterAPI.io型安全性チェッカー
 * 実行時型検証とデバッグ支援
 */

import { TweetData, UserData, TwitterAPIError } from '../types';

export class TwitterAPITypeChecker {
  /**
   * ツイートデータの型検証
   */
  static validateTweetData(data: any): data is TweetData {
    return (
      typeof data === 'object' &&
      typeof data.id === 'string' &&
      typeof data.text === 'string' &&
      typeof data.author_id === 'string' &&
      typeof data.created_at === 'string' &&
      typeof data.public_metrics === 'object' &&
      typeof data.public_metrics.retweet_count === 'number' &&
      typeof data.public_metrics.like_count === 'number'
    );
  }

  /**
   * ユーザーデータの型検証
   */
  static validateUserData(data: any): data is UserData {
    return (
      typeof data === 'object' &&
      typeof data.id === 'string' &&
      typeof data.username === 'string' &&
      typeof data.name === 'string' &&
      typeof data.created_at === 'string'
    );
  }

  /**
   * TwitterAPI.ioエラーの型検証
   */
  static validateTwitterAPIError(data: any): data is TwitterAPIError {
    return (
      typeof data === 'object' &&
      typeof data.error === 'object' &&
      typeof data.error.code === 'string' &&
      typeof data.error.message === 'string' &&
      typeof data.error.type === 'string'
    );
  }

  /**
   * レスポンス型の実行時検証
   */
  static validateResponse<T>(
    data: any,
    validator: (item: any) => item is T
  ): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    if (Array.isArray(data.data)) {
      return data.data.every(validator);
    } else {
      return validator(data.data);
    }
  }
}
```

### 3. shared/types.tsとの統合対応
**対象**: `src/shared/types.ts`

**kaito-api型定義との重複解決**：
```typescript
// kaito-api型定義をre-exportして重複を解消
export type {
  // Core types from kaito-api
  KaitoClientConfig,
  TweetData,
  UserData,
  
  // Response types from kaito-api
  TweetCreateResponse,
  TweetSearchResponse,
  UserInfoResponse,
  
  // Legacy compatibility
  TweetResult,
  PostResult
} from '../kaito-api/types';

// shared独自の型定義のみ残存
export interface SystemConfig {
  // システム固有の型定義
}

export interface ExecutionMetrics {
  // 実行メトリクス固有の型定義
}
```

### 4. ドキュメント更新
**対象**: `docs/kaito-api.md`

**TwitterAPI.io統合完了版ドキュメント**：
```markdown
# KaitoTwitterAPI 仕様書 - TwitterAPI.io統合完了版

## 🌐 TwitterAPI.io統合概要

### 統合仕様
- **API Provider**: TwitterAPI.io (https://docs.twitterapi.io)
- **Base URL**: `https://api.twitterapi.io`
- **認証方式**: API Key Bearer Token
- **QPS制限**: 200リクエスト/秒
- **コスト**: $0.15/1k tweets
- **応答時間**: 平均700ms

### 実装完了機能
✅ **投稿機能**: テキスト投稿、メディア添付対応
✅ **エンゲージメント**: いいね、リツイート、引用ツイート
✅ **検索機能**: ツイート検索、ユーザー検索
✅ **ユーザー管理**: ユーザー情報取得、プロフィール更新
✅ **認証システム**: API Key認証、セッション管理
✅ **QPS制御**: リクエスト間隔制御、レート制限管理
✅ **エラーハンドリング**: TwitterAPI.io固有エラー対応
✅ **コスト追跡**: API使用量・コスト管理

## 📊 使用例

### 基本的な使用例
\`\`\`typescript
import { KaitoTwitterAPIClient } from './kaito-api';

// クライアント初期化
const client = new KaitoTwitterAPIClient({
  apiKey: process.env.KAITO_API_TOKEN,
  qpsLimit: 200,
  costTracking: true
});

// 認証
await client.authenticate();

// ツイート投稿
const result = await client.post('教育的な投資コンテンツ');
console.log(`投稿完了: ${result.id}`);

// ユーザー情報取得
const accountInfo = await client.getAccountInfo();
console.log(`フォロワー数: ${accountInfo.followersCount}`);
\`\`\`

### エンドポイント別使用例
\`\`\`typescript
import { 
  ActionEndpoints, 
  TweetEndpoints, 
  UserEndpoints 
} from './kaito-api';

// アクションエンドポイント
const actions = new ActionEndpoints();
await actions.createPost({ content: '投稿内容' });
await actions.performEngagement({ tweetId: '123', action: 'like' });

// ツイートエンドポイント  
const tweets = new TweetEndpoints();
const searchResult = await tweets.searchTweets({ 
  query: 'bitcoin',
  max_results: 10 
});

// ユーザーエンドポイント
const users = new UserEndpoints();
const userInfo = await users.getUserInfo('username');
\`\`\`

## 🔧 設定とカスタマイズ

### 環境変数
\`\`\`bash
# 必須設定
KAITO_API_TOKEN=your_twitterapi_io_token

# オプション設定
KAITO_QPS_LIMIT=200
KAITO_COST_TRACKING=true
KAITO_RETRY_MAX=3
\`\`\`

### カスタム設定
\`\`\`typescript
const customConfig: KaitoClientConfig = {
  apiKey: 'your-token',
  qpsLimit: 150, // QPS制限カスタマイズ
  retryPolicy: {
    maxRetries: 5,
    backoffMs: 2000
  },
  costTracking: true
};
\`\`\`

## 📈 パフォーマンス・制限

### QPS制御
- **制限値**: 200リクエスト/秒
- **制御方式**: 自動間隔調整
- **監視**: リアルタイムQPS監視

### レート制限
- **一般API**: 900リクエスト/時間
- **投稿API**: 300リクエスト/時間
- **検索API**: 500リクエスト/時間

### コスト管理
- **料金**: $0.15/1k tweets
- **追跡**: 自動コスト計算
- **アラート**: 8ドル超過時警告

## 🚨 エラーハンドリング

### TwitterAPI.io固有エラー
\`\`\`typescript
try {
  await client.post('投稿内容');
} catch (error) {
  if (error.message.includes('Rate limit exceeded')) {
    // レート制限エラー対応
    console.log('レート制限中、待機します');
  } else if (error.message.includes('Authentication failed')) {
    // 認証エラー対応
    await client.authenticate();
  }
}
\`\`\`

## 🧪 テスト・動作確認

### テスト実行
\`\`\`bash
# 単体テスト
npm test kaito-api

# 統合テスト
npm run test:integration

# 実API動作確認（環境変数設定必要）
RUN_REAL_API_TESTS=true npm run test:real-api
\`\`\`

### 動作確認スクリプト
\`\`\`bash
# 接続・認証確認
npm run kaito-api:verify

# パフォーマンステスト
npm run kaito-api:performance
\`\`\`

## 📋 型定義リファレンス

### 主要型定義
- **TweetData**: TwitterAPI.ioツイートデータ標準形式
- **UserData**: TwitterAPI.ioユーザーデータ標準形式
- **KaitoClientConfig**: クライアント設定
- **TwitterAPIError**: エラーレスポンス形式

### レスポンス型
- **TweetCreateResponse**: ツイート作成レスポンス
- **TweetSearchResponse**: ツイート検索レスポンス
- **UserInfoResponse**: ユーザー情報レスポンス
- **EngagementResponse**: エンゲージメントレスポンス

## 🔄 マイグレーション

### 旧バージョンからの移行
1. 型定義の更新（TweetResult → TweetData）
2. エンドポイントURLの確認
3. レスポンス形式の調整
4. エラーハンドリングの更新

## 🚀 今後の拡張

### 計画中の機能
- リアルタイムストリーミング（WebSocket対応）
- バッチ処理機能
- 高度なキャッシュ機能
- 分析・統計機能

### 制限事項
- MVP制約により統計・分析機能は含まない
- リアルタイム機能は基本版のみ
- バッチ処理は後続リリースで対応
```

## 📝 JSDocコメント追加

### 全メソッドにJSDoc追加
**対象**: `src/kaito-api/core/client.ts`, `src/kaito-api/endpoints/*.ts`

```typescript
/**
 * TwitterAPI.ioを使用してツイートを投稿します
 * 
 * @param content - 投稿するテキスト内容（280文字以内）
 * @param options - 投稿オプション（メディア、リプライ等）
 * @returns 投稿結果（ID、URL、タイムスタンプ）
 * 
 * @example
 * ```typescript
 * const result = await client.post('投資教育コンテンツ');
 * console.log(`投稿ID: ${result.id}`);
 * ```
 * 
 * @throws {Error} API認証エラー、レート制限エラー、バリデーションエラー
 */
async post(content: string, options?: PostOptions): Promise<PostResult>
```

## 📊 実装品質要件

### TypeScript strict対応
- 全ての型定義に完全なアノテーション
- 重複型の完全解消
- 型ガードの実装

### ドキュメント品質
- JSDoc完全対応
- 使用例の充実
- エラー対応ガイド

### 保守性
- 型定義の集約化
- 重複コードの削除
- 明確な依存関係

## 🚫 MVP制約事項

### 実装禁止事項
- 過度に複雑な型システム
- 統計・分析用型定義
- 将来機能用の型定義
- 未使用型定義の追加

### 実装必須事項
- TwitterAPI.io完全対応
- 既存コードとの互換性
- 型安全性の確保
- 基本的なドキュメント

## 📝 完了基準

### 型定義最適化完了チェックリスト
- [ ] 重複型定義の完全解消
- [ ] TwitterAPI.io標準型の実装
- [ ] shared/types.tsとの統合完了
- [ ] 型安全性チェッカーの実装
- [ ] JSDocコメントの完全追加

### ドキュメント更新完了チェックリスト
- [ ] docs/kaito-api.mdの完全更新
- [ ] 使用例の充実
- [ ] エラーハンドリングガイド更新
- [ ] パフォーマンス情報の更新
- [ ] マイグレーションガイドの作成

### 依存関係
- **前提条件**: TASK-001, TASK-002, TASK-003の完了
- **並列可能**: ドキュメント作成、型定義整理

## 📋 出力先

**報告書**: `tasks/20250727_193649_kaito_api_implementation/reports/REPORT-004-type-optimization-documentation.md`

**更新されたドキュメント**: `docs/kaito-api.md`（直接更新）