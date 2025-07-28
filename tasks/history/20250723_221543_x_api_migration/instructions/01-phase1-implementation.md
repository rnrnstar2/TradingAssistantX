# X API v2 Phase 1 実装指示書

## 実装者向け指示
この指示書に従って、X API v2への移行作業Phase 1を実装してください。

## 実装優先順位

### 1. OAuth 2.0認証対応（x-auth-manager.ts）
新規ファイルを作成し、OAuth 2.0認証を実装します。

```typescript
// src/services/x-auth-manager.ts
export interface XAuthConfig {
  bearerToken?: string;
  clientId?: string;
  clientSecret?: string;
  apiTier: 'free' | 'basic' | 'pro' | 'enterprise';
}

export class XAuthManager {
  // Bearer Token認証
  getBearerToken(): string
  
  // OAuth 2.0フロー実装
  async getAccessToken(): Promise<string>
  
  // 認証ヘッダー生成
  getAuthHeaders(): Record<string, string>
}
```

### 2. X API v2型定義（x-api-types.ts）
API v2のレスポンス型を定義します。

```typescript
// src/types/x-api-types.ts
export interface XTweetV2 {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
}

export interface XUserV2 {
  id: string;
  username: string;
  name: string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}
```

### 3. 投稿機能のv2対応（x-poster-v2.ts）
既存のx-poster.tsをベースに、v2エンドポイント対応版を作成します。

```typescript
// src/services/x-poster-v2.ts
export class XPosterV2 {
  // v2エンドポイントを使用
  private readonly TWEET_ENDPOINT = '/2/tweets';
  
  // OAuth 2.0認証を使用
  constructor(private authManager: XAuthManager) {}
  
  // 基本投稿機能
  async post(content: string): Promise<PostResult>
  
  // ユーザー情報取得
  async getUserInfo(): Promise<XUserV2>
  
  // エンゲージメント取得（Proプラン以上）
  async getEngagement(tweetId: string): Promise<XTweetV2>
}
```

### 4. 設定ファイル作成（x-api-config.yaml）
X API v2の設定ファイルを作成します。

```yaml
# data/config/x-api-config.yaml
api_version: "v2"
tier: "basic"  # free/basic/pro/enterprise
auth_type: "bearer_token"  # bearer_token/oauth2

endpoints:
  tweets: "/2/tweets"
  users: "/2/users"
  timeline: "/2/users/:id/tweets"
  search: "/2/tweets/search/recent"  # Proプラン以上

rate_limits:
  free:
    posts_per_month: 500
    reads_per_month: 100
  basic:
    posts_per_month: 3000
    reads_per_month: 10000
  pro:
    posts_per_month: 300000
    reads_per_month: 1000000
```

## 実装時の注意事項

### 環境変数の追加
`.env`ファイルに以下を追加してください：

```bash
# X API v2認証情報
X_BEARER_TOKEN=your_bearer_token
X_CLIENT_ID=your_client_id
X_CLIENT_SECRET=your_client_secret
X_API_TIER=basic  # free/basic/pro/enterprise

# 既存のv1.1認証情報は維持（段階的移行のため）
X_CONSUMER_KEY=existing_key
X_CONSUMER_SECRET=existing_secret
X_ACCESS_TOKEN=existing_token
X_ACCESS_TOKEN_SECRET=existing_secret
```

### 段階的移行戦略
1. 新規実装はv2を使用
2. 既存のv1.1実装は当面維持
3. 環境変数で切り替え可能にする
4. 十分なテスト後にv1.1を廃止

### エラーハンドリング
- APIレート制限エラーの適切な処理
- 認証エラーの詳細なログ出力
- ネットワークエラーのリトライ機能

## テスト要件

### 単体テスト
- 認証フローのテスト
- エンドポイント呼び出しのモックテスト
- エラーケースのテスト

### 統合テスト
- 実際のAPI呼び出しテスト（開発環境）
- レート制限の確認
- 投稿・取得の動作確認

## 完了条件
1. OAuth 2.0認証が動作すること
2. v2エンドポイントで投稿ができること
3. ユーザー情報が取得できること
4. 適切なエラーハンドリングが実装されていること
5. テストが全て通ること

## 次のPhase 2への準備
Phase 1完了後、以下の機能をPhase 2で実装予定：
- タイムライン収集機能
- 検索機能（Proプラン）
- メディア投稿
- スレッド投稿
- 詳細分析機能