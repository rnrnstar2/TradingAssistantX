# TASK-003: TwitterAPI.io 認証レベル別エンドポイント再構築

## 🎯 タスク概要

現在の機能別エンドポイント構造（action、tweet、user、trend）を認証レベル別構造（public/、v1-auth/、v2-auth/）に完全再構築します。TwitterAPI.ioの3層認証要件に対応し、認証レベルによる機能制限を構造レベルで表現します。

## 📋 実装要件

### 1. 新エンドポイント構造作成

```
src/kaito-api/endpoints/
├── public/              # 📖 APIキー認証のみ（読み取り専用）
│   ├── user-info.ts         # ユーザー情報取得・プロフィール確認
│   ├── tweet-search.ts      # ツイート検索・高度検索機能
│   ├── trends.ts            # トレンド取得・地域別トレンド
│   └── follower-info.ts     # フォロワー・フォロー情報取得
├── v1-auth/             # 🔐 V1ログイン認証（標準投稿・非推奨）
│   ├── tweet-actions-v1.ts  # V1投稿作成（/twitter/create_tweet）
│   ├── engagement-v1.ts     # V1エンゲージメント（いいね・RT）
│   └── quote-tweet-v1.ts    # V1引用ツイート・コメント付きRT
└── v2-auth/             # 🚀 V2ログイン認証（高機能投稿・推奨）
    ├── tweet-actions-v2.ts  # V2投稿作成（/twitter/create_tweet_v2）
    ├── dm-management.ts     # DM送信・プライベートメッセージ管理
    ├── community-management.ts # コミュニティ作成・管理機能
    └── advanced-features.ts    # 長文投稿・Note機能・高度な投稿オプション
```

### 2. 認証レベル別エンドポイント実装

#### A. APIキー認証エンドポイント（読み取り専用）

**ファイル**: `src/kaito-api/endpoints/public/user-info.ts`
```typescript
export class UserInfoEndpoint {
  constructor(private httpClient: HttpClient, private apiKeyAuth: APIKeyAuth) {}
  
  async getUserInfo(userName: string): Promise<UserInfoResponse> {
    // APIキー認証のみで실행가능
    // /twitter/user/info?userName=XXX
  }
  
  async getUserFollowers(userName: string): Promise<FollowerResponse> {
    // フォロワー情報取得
  }
}
```

**ファイル**: `src/kaito-api/endpoints/public/tweet-search.ts`
```typescript
export class TweetSearchEndpoint {
  async searchTweets(query: string, options?: SearchOptions): Promise<TweetSearchResponse> {
    // /twitter/tweet/advanced_search
    // 高度検索・フィルタリング機能
  }
  
  async getTweetById(tweetId: string): Promise<TweetResponse> {
    // 特定ツイート取得
  }
}
```

#### B. V1ログイン認証エンドポイント（標準投稿・非推奨）

**ファイル**: `src/kaito-api/endpoints/v1-auth/tweet-actions-v1.ts`
```typescript
export class TweetActionsV1Endpoint {
  constructor(private httpClient: HttpClient, private v1Auth: V1LoginAuth) {}
  
  async createTweet(content: string): Promise<TweetCreateResponse> {
    // /twitter/create_tweet エンドポイント使用
    // 280文字制限・基本投稿のみ
    // auth_sessionが必要
  }
  
  async deleteTweet(tweetId: string): Promise<DeleteResponse> {
    // ツイート削除
    // auth_sessionが必要
  }
}
```

**ファイル**: `src/kaito-api/endpoints/v1-auth/engagement-v1.ts`
```typescript
export class EngagementV1Endpoint {
  async like(tweetId: string): Promise<EngagementResponse> {
    // いいね機能
    // auth_sessionが必要
  }
  
  async retweet(tweetId: string): Promise<EngagementResponse> {
    // リツイート機能
    // auth_sessionが必要
  }
  
  async follow(userId: string): Promise<FollowResponse> {
    // フォロー機能
    // auth_sessionが必要
  }
}
```

#### C. V2ログイン認証エンドポイント（高機能投稿・推奨）

**ファイル**: `src/kaito-api/endpoints/v2-auth/tweet-actions-v2.ts`
```typescript
export class TweetActionsV2Endpoint {
  constructor(private httpClient: HttpClient, private v2Auth: V2LoginAuth) {}
  
  async createTweetV2(content: string, options?: V2TweetOptions): Promise<TweetV2Response> {
    // /twitter/create_tweet_v2 エンドポイント使用
    // 長文投稿・Note機能・高度オプション対応
    // login_cookieが必要
  }
  
  async createNoteTweet(content: string): Promise<TweetV2Response> {
    // 長文投稿（Note機能）
    // is_note_tweet: true
  }
}
```

**ファイル**: `src/kaito-api/endpoints/v2-auth/dm-management.ts`
```typescript
export class DMManagementEndpoint {
  async sendDM(recipientId: string, message: string): Promise<DMResponse> {
    // プライベートメッセージ送信機能
    // login_cookieが必要
  }
  
  async getDMHistory(conversationId: string): Promise<DMHistoryResponse> {
    // DM履歴取得
  }
}
```

### 3. 既存エンドポイント移行マッピング

#### A. 既存action-endpoints.ts → 認証レベル別分散
```typescript
// 現在のaction-endpoints.ts (449行)
// ↓ 移行先
// - createPost() → v2-auth/tweet-actions-v2.ts
// - performEngagement() → v1-auth/engagement-v1.ts
// - uploadMedia() → v2-auth/advanced-features.ts
```

#### B. 既存user-endpoints.ts → public/user-info.ts
```typescript
// 読み取り専用機能のため、APIキー認証エンドポイントに移行
// - getUserInfo() → public/user-info.ts
// - searchUsers() → public/user-info.ts
```

#### C. 既存tweet-endpoints.ts → 認証レベル別分散
```typescript
// - searchTweets() → public/tweet-search.ts
// - getTweetDetails() → public/tweet-search.ts
```

## 🔧 技術仕様

### 認証統合パターン

#### A. APIキー認証パターン
```typescript
export class UserInfoEndpoint {
  constructor(
    private httpClient: HttpClient,
    private apiKeyAuth: APIKeyAuth
  ) {}
  
  async getUserInfo(userName: string): Promise<UserInfoResponse> {
    // APIキー認証ヘッダー自動付与
    const headers = this.apiKeyAuth.getAuthHeaders();
    return await this.httpClient.get('/twitter/user/info', 
      { userName }, 
      { headers }
    );
  }
}
```

#### B. V1ログイン認証パターン
```typescript
export class TweetActionsV1Endpoint {
  constructor(
    private httpClient: HttpClient,
    private v1Auth: V1LoginAuth
  ) {}
  
  async createTweet(content: string): Promise<TweetCreateResponse> {
    // セッション取得・検証
    const authSession = await this.v1Auth.getValidSession();
    if (!authSession) {
      throw new Error('V1 authentication required');
    }
    
    return await this.httpClient.post('/twitter/create_tweet', {
      text: content,
      auth_session: authSession,
      proxy: process.env.X_PROXY
    });
  }
}
```

#### C. V2ログイン認証パターン
```typescript
export class TweetActionsV2Endpoint {
  constructor(
    private httpClient: HttpClient,
    private v2Auth: V2LoginAuth
  ) {}
  
  async createTweetV2(content: string, options?: V2TweetOptions): Promise<TweetV2Response> {
    // ログインクッキー取得・検証
    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required');
    }
    
    return await this.httpClient.post('/twitter/create_tweet_v2', {
      tweet_text: content,
      login_cookies: loginCookie,
      proxy: process.env.X_PROXY,
      ...options
    });
  }
}
```

### エラーハンドリング統一

#### 認証レベル別エラー処理
```typescript
// 各エンドポイントで共通のエラーハンドリング
class AuthLevelErrorHandler {
  static handleAPIKeyError(error: any): never {
    if (error.status === 401) {
      throw new Error('Invalid API key - check KAITO_API_TOKEN');
    }
    // ... APIキー特有のエラー処理
  }
  
  static handleV1AuthError(error: any): never {
    if (error.message?.includes('auth_session')) {
      throw new Error('V1 session expired - re-authentication required');
    }
    // ... V1認証特有のエラー処理
  }
  
  static handleV2AuthError(error: any): never {
    if (error.message?.includes('login_cookie')) {
      throw new Error('V2 session expired - re-authentication required');
    }
    // ... V2認証特有のエラー処理
  }
}
```

## 🔄 段階的移行戦略

### Phase 1: 新構造並行実装
1. **新ディレクトリ作成**: public/、v1-auth/、v2-auth/
2. **エンドポイントクラス実装**: 既存機能を新構造で再実装
3. **認証統合**: Phase 2の認証コアとの統合

### Phase 2: 互換性レイヤー
```typescript
// 既存import互換性のため
export class ActionEndpoints {
  private v1Engagement: EngagementV1Endpoint;
  private v2TweetActions: TweetActionsV2Endpoint;
  
  // 既存メソッドをプロキシ
  async createPost(content: string): Promise<PostResponse> {
    return await this.v2TweetActions.createTweetV2(content);
  }
  
  async performEngagement(request: EngagementRequest): Promise<EngagementResponse> {
    return await this.v1Engagement.like(request.tweetId);
  }
}
```

### Phase 3: 段階的切り替え
1. **デュアル実装期間**: 新旧両方のエンドポイントが動作
2. **依存関係更新**: main-workflows等の段階的更新
3. **既存エンドポイント削除**: 移行完了後の旧ファイル削除

## ✅ 完了基準

### 機能検証
1. **認証レベル別動作**: 各認証レベルでの適切な機能制限
2. **API通信成功**: 実TwitterAPI.ioでの動作確認
3. **エラーハンドリング**: 認証エラー・レート制限の適切な処理
4. **セッション管理**: 認証状態の適切な管理・更新

### 構造検証
1. **ディレクトリ構造**: docs/directory-structure.md完全準拠
2. **認証分離**: 認証レベル間での機能混在なし
3. **依存関係**: 明確な認証レベル別依存関係
4. **コード重複**: 共通処理の適切な抽象化

### 統合検証
1. **後方互換性**: 既存importパスでの動作継続
2. **パフォーマンス**: 認証オーバーヘッドの最小化
3. **メモリ効率**: エンドポイントインスタンスの効率管理
4. **QPS制御**: 認証レベル問わず200 QPS制限遵守

## 🚨 重要制約

### MVP制約
- **実用機能のみ**: 使用しない高度機能は実装しない
- **シンプル設計**: 過度な抽象化・デザインパターン禁止
- **確実な動作**: 実API通信での動作確認必須

### 認証セキュリティ
- **秘密情報保護**: セッション・クッキーの安全な管理
- **認証状態検証**: 期限切れセッションの適切な検出
- **権限チェック**: エンドポイント実行前の認証レベル確認

### システム統合
- **既存システム無影響**: main-workflows等への影響最小化
- **段階的移行**: 一度に全てを変更しない
- **ロールバック可能**: 問題発生時の迅速な復旧

## 📋 出力先

- **実装ファイル**: `src/kaito-api/endpoints/` 配下の新構造
- **テストファイル**: `tests/kaito-api/endpoints/` 配下
- **報告書**: `tasks/20250728-1911/reports/REPORT-003-endpoints-auth-rebuild.md`

## ⚠️ 注意事項

1. **既存endpoints保持**: 移行完了まで削除禁止
2. **実API使用**: モックではなく実際のTwitterAPI.io使用
3. **認証情報**: 本物の認証情報での動作確認
4. **影響範囲確認**: 変更が他モジュールに与える影響の事前評価

---

**重要**: このエンドポイント再構築は、3層認証アーキテクチャの最終形態です。Phase 2の認証コアとPhase 3の型定義との密接な連携が必要です。段階的な実装と十分なテストを行ってください。