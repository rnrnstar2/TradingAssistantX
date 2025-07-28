# TASK-002: TwitterAPI.io完全対応エンドポイント実装

## 🎯 実装目標

TwitterAPI.ioの実際のエンドポイント仕様に完全対応し、正確なレスポンス処理とエラーハンドリングを実装する。

## 📋 必須事前読み込み

**REQUIREMENTS.md読み込み必須**：
```bash
cat REQUIREMENTS.md | head -50
```

**TwitterAPI.ioエンドポイント仕様確認**：
- POST /v1/tweets (投稿作成)
- GET /v1/tweets/search (ツイート検索)  
- GET /v1/tweets/:id (ツイート詳細)
- POST /v1/tweets/:id/like (いいね)
- POST /v1/tweets/:id/retweet (リツイート)
- GET /v1/users/:username (ユーザー情報)

## 🔧 実装対象ファイル

### 1. アクションエンドポイント実装
**対象**: `src/kaito-api/endpoints/action-endpoints.ts`

**TwitterAPI.io対応修正**：
```typescript
export class ActionEndpoints {
  constructor(private httpClient: HttpClient) {}

  async createPost(request: PostRequest): Promise<PostResponse> {
    // TwitterAPI.io POST /v1/tweets エンドポイント
    const response = await this.httpClient.post<TwitterAPITweetResponse>('/v1/tweets', {
      text: request.content,
      ...(request.mediaIds && { media_ids: request.mediaIds })
    });

    return {
      success: true,
      tweetId: response.data.id,
      createdAt: response.data.created_at
    };
  }

  async performEngagement(request: EngagementRequest): Promise<EngagementResponse> {
    let endpoint: string;
    switch (request.action) {
      case 'like':
        endpoint = `/v1/tweets/${request.tweetId}/like`;
        break;
      case 'retweet':
        endpoint = `/v1/tweets/${request.tweetId}/retweet`;
        break;
      default:
        throw new Error(`Unsupported action: ${request.action}`);
    }

    const response = await this.httpClient.post(endpoint);
    
    return {
      success: true,
      action: request.action,
      tweetId: request.tweetId,
      timestamp: new Date().toISOString()
    };
  }
}
```

### 2. ツイートエンドポイント実装
**対象**: `src/kaito-api/endpoints/tweet-endpoints.ts`

**TwitterAPI.io対応実装**：
```typescript
export class TweetEndpoints {
  constructor(private httpClient: HttpClient) {}

  async createTweet(options: CreateTweetOptions): Promise<TweetResult> {
    // バリデーション
    if (!options.text || options.text.length > 280) {
      throw new Error('Invalid tweet text');
    }

    // TwitterAPI.io形式のリクエスト
    const requestData: any = {
      text: options.text
    };

    if (options.mediaIds?.length) {
      requestData.media_ids = options.mediaIds;
    }

    if (options.inReplyToTweetId) {
      requestData.reply = {
        in_reply_to_tweet_id: options.inReplyToTweetId
      };
    }

    const response = await this.httpClient.post<TwitterAPITweetResponse>('/v1/tweets', requestData);

    return {
      id: response.data.id,
      text: response.data.text,
      url: `https://twitter.com/i/status/${response.data.id}`,
      timestamp: response.data.created_at,
      success: true
    };
  }

  async searchTweets(options: TweetSearchOptions): Promise<TweetSearchResult> {
    const params = {
      query: options.query,
      max_results: options.maxResults || 10,
      'tweet.fields': 'created_at,public_metrics,context_annotations,lang',
      'user.fields': 'username,verified'
    };

    const response = await this.httpClient.get<TwitterAPISearchResponse>('/v1/tweets/search', params);

    return {
      tweets: response.data.map(this.mapTweetData),
      totalCount: response.meta?.result_count || 0,
      nextToken: response.meta?.next_token,
      searchQuery: options.query,
      timestamp: new Date().toISOString()
    };
  }

  private mapTweetData(apiTweet: any): TweetData {
    return {
      id: apiTweet.id,
      text: apiTweet.text,
      authorId: apiTweet.author_id,
      createdAt: apiTweet.created_at,
      publicMetrics: {
        retweetCount: apiTweet.public_metrics?.retweet_count || 0,
        likeCount: apiTweet.public_metrics?.like_count || 0,
        quoteCount: apiTweet.public_metrics?.quote_count || 0,
        replyCount: apiTweet.public_metrics?.reply_count || 0,
        impressionCount: apiTweet.public_metrics?.impression_count || 0
      },
      contextAnnotations: apiTweet.context_annotations,
      lang: apiTweet.lang
    };
  }
}
```

### 3. ユーザーエンドポイント実装  
**対象**: `src/kaito-api/endpoints/user-endpoints.ts`

**TwitterAPI.io対応実装**：
```typescript
export class UserEndpoints {
  constructor(private httpClient: HttpClient) {}

  async getUserInfo(userId: string): Promise<UserInfo> {
    if (!userId?.trim()) {
      throw new Error('User ID is required');
    }

    const response = await this.httpClient.get<TwitterAPIUserResponse>(`/v1/users/${userId}`, {
      'user.fields': 'created_at,description,location,public_metrics,url,verified,profile_image_url'
    });

    const userData = response.data;
    
    return {
      id: userData.id,
      username: userData.username,
      displayName: userData.name,
      description: userData.description || '',
      followersCount: userData.public_metrics?.followers_count || 0,
      followingCount: userData.public_metrics?.following_count || 0,
      tweetsCount: userData.public_metrics?.tweet_count || 0,
      verified: userData.verified || false,
      createdAt: userData.created_at,
      location: userData.location || '',
      website: userData.url || '',
      profileImageUrl: userData.profile_image_url || '',
      bannerImageUrl: userData.profile_banner_url || ''
    };
  }

  async searchUsers(options: UserSearchOptions): Promise<UserSearchResult> {
    const params = {
      query: options.query,
      max_results: options.maxResults || 10,
      'user.fields': 'created_at,description,public_metrics,verified'
    };

    const response = await this.httpClient.get<TwitterAPIUserSearchResponse>('/v1/users/search', params);

    return {
      users: response.data.map(user => this.mapUserData(user)),
      totalCount: response.meta?.result_count || 0,
      nextToken: response.meta?.next_token,
      searchQuery: options.query,
      timestamp: new Date().toISOString()
    };
  }

  private mapUserData(apiUser: any): UserInfo {
    return {
      id: apiUser.id,
      username: apiUser.username,
      displayName: apiUser.name,
      description: apiUser.description || '',
      followersCount: apiUser.public_metrics?.followers_count || 0,
      followingCount: apiUser.public_metrics?.following_count || 0,
      tweetsCount: apiUser.public_metrics?.tweet_count || 0,
      verified: apiUser.verified || false,
      createdAt: apiUser.created_at,
      location: apiUser.location || '',
      website: apiUser.url || '',
      profileImageUrl: apiUser.profile_image_url || '',
      bannerImageUrl: ''
    };
  }
}
```

## 🌐 TwitterAPI.ioレスポンス型定義

### 新規型定義追加
**対象**: `src/kaito-api/types.ts`

```typescript
// TwitterAPI.io レスポンス型定義
export interface TwitterAPITweetResponse {
  data: {
    id: string;
    text: string;
    created_at: string;
    author_id: string;
    public_metrics?: {
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
  };
}

export interface TwitterAPISearchResponse {
  data: Array<TwitterAPITweetResponse['data']>;
  meta?: {
    result_count: number;
    next_token?: string;
  };
}

export interface TwitterAPIUserResponse {
  data: {
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
  };
}

export interface TwitterAPIUserSearchResponse {
  data: Array<TwitterAPIUserResponse['data']>;
  meta?: {
    result_count: number;
    next_token?: string;
  };
}
```

## ⚡ エラーハンドリング強化

### TwitterAPI.io固有エラー対応
```typescript
class TwitterAPIErrorHandler {
  static handleTwitterAPIError(error: any): Error {
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      
      switch (apiError.code) {
        case 'RATE_LIMIT_EXCEEDED':
          return new Error(`Rate limit exceeded: ${apiError.message}`);
        case 'INVALID_TOKEN':
          return new Error(`Authentication failed: ${apiError.message}`);
        case 'TWEET_NOT_FOUND':
          return new Error(`Tweet not found: ${apiError.message}`);
        default:
          return new Error(`TwitterAPI error: ${apiError.message}`);
      }
    }
    
    return new Error(`Unknown TwitterAPI error: ${error.message}`);
  }
}
```

## 🧪 動作確認要件

### 1. エンドポイント動作テスト
```typescript
// 実際のTwitterAPI.ioエンドポイントでの動作確認
async function testEndpoints() {
  console.log('🧪 エンドポイント動作テスト開始');
  
  // ツイート作成テスト（最小限）
  const createResult = await tweetEndpoints.createTweet({
    text: 'API integration test tweet'
  });
  
  // ツイート検索テスト
  const searchResult = await tweetEndpoints.searchTweets({
    query: 'bitcoin',
    maxResults: 5
  });
  
  console.log('✅ エンドポイント動作テスト完了');
}
```

### 2. レスポンス形式検証
```typescript
// TwitterAPI.ioの実際のレスポンス形式と型定義の整合性確認
function validateResponseTypes() {
  // 実際のAPIレスポンスとTypeScript型定義の一致確認
}
```

## 📊 実装品質要件

### TypeScript strict対応
- 全ての型アノテーション記載
- optional chainingの適切な使用
- nullish coalescingの活用

### エラーハンドリング
- TwitterAPI.io固有エラーの適切な処理
- try-catch文の漏れなし実装
- ユーザーフレンドリーなエラーメッセージ

### パフォーマンス
- 不要なAPIコールの削除
- レスポンスデータの効率的な変換
- メモリ使用量の最適化

## 🚫 MVP制約事項

### 実装禁止事項
- WebSocket/ストリーミング機能
- 高度なキャッシュ機能
- 統計・分析機能
- バッチ処理機能

### 実装必須事項
- 基本的なCRUD操作
- エラーハンドリング
- 型安全性
- 基本的なバリデーション

## 📝 完了基準

### 実装完了チェックリスト
- [ ] 全エンドポイントのTwitterAPI.io対応完了
- [ ] レスポンス型定義の正確性確認
- [ ] エラーハンドリングの動作確認
- [ ] TypeScript型安全性の確保
- [ ] 基本的な動作テストの実行

### 依存関係
- **前提条件**: TASK-001のHTTPクライアント実装完了
- **並列可能**: 型定義の準備、エラーハンドリング設計

## 📋 出力先

**報告書**: `tasks/20250727_193649_kaito_api_implementation/reports/REPORT-002-endpoints-twitterapi-compliance.md`