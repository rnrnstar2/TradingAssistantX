# URGENT-001: TypeScriptエラー緊急修正 - 完全解消

## 🚨 緊急度: **最高** - 即座実行必須

TwitterAPI.io統合で発生した34件のTypeScriptコンパイルエラーを**完全解消**し、型安全性を確保する。

## 📋 必須事前確認

**現在のエラー状況**：
```bash
npx tsc --noEmit
# 34件のコンパイルエラー確認済み
```

**REQUIREMENTS.md準拠**：TypeScript strict対応必須

## 🔧 修正対象ファイル

### 1. 型定義統合修正
**対象**: `src/kaito-api/types.ts`

**修正内容**:
```typescript
// ============================================================================
// 欠落型定義追加 - URGENT
// ============================================================================

/**
 * トレンドデータ - trend-endpoints.ts用
 */
export interface TrendData {
  name: string;
  query: string;
  tweetVolume: number | null;
  rank: number;
}

/**
 * トレンド地域情報 - trend-endpoints.ts用
 */
export interface TrendLocation {
  woeid: number;
  name: string;
  countryCode: string;
}

// ============================================================================
// レスポンス型修正 - URGENT
// ============================================================================

/**
 * エンゲージメントレスポンス - data プロパティ必須対応
 */
export interface EngagementResponse {
  success: boolean;
  action: string;
  tweetId: string;
  timestamp: string;
  data: {
    liked?: boolean;
    retweeted?: boolean;
  };
}

// ============================================================================
// CreateTweetOptions修正 - プロパティ名統一
// ============================================================================

/**
 * ツイート作成オプション - TwitterAPI.io完全準拠
 */
export interface CreateTweetOptions {
  text: string;
  media_ids?: string[];  // mediaIds → media_ids
  poll?: {
    options: string[];
    duration_minutes: number;
  };
  reply?: {
    in_reply_to_tweet_id: string;  // inReplyToTweetId → in_reply_to_tweet_id
  };
  quote_tweet_id?: string;  // quoteTweetId → quote_tweet_id
  location?: {
    place_id: string;
  };
}

// ============================================================================
// TweetSearchOptions修正 - プロパティ名統一
// ============================================================================

/**
 * ツイート検索オプション - TwitterAPI.io完全準拠
 */
export interface TweetSearchOptions {
  query: string;
  max_results?: number;  // maxResults → max_results
  next_token?: string;
  start_time?: string;
  end_time?: string;
  sort_order?: 'recency' | 'relevancy';
  'tweet.fields'?: string;
  'user.fields'?: string;
}

// ============================================================================
// UserSearchOptions修正 - プロパティ名統一
// ============================================================================

/**
 * ユーザー検索オプション - TwitterAPI.io完全準拠
 */
export interface UserSearchOptions {
  query: string;
  max_results?: number;  // maxResults → max_results
  next_token?: string;
  'user.fields'?: string;
}

// ============================================================================
// TweetData修正 - プロパティ名統一
// ============================================================================

/**
 * TwitterAPI.ioツイートデータ標準形式 - 完全修正版
 */
export interface TweetData {
  id: string;
  text: string;
  author_id: string;  // authorId → author_id 統一
  created_at: string;
  public_metrics: {  // publicMetrics → public_metrics 統一
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
```

### 2. ActionEndpoints修正
**対象**: `src/kaito-api/endpoints/action-endpoints.ts`

**修正内容**:
```typescript
// EngagementResponse data プロパティ追加対応
async performEngagement(request: EngagementRequest): Promise<EngagementResponse> {
  try {
    console.log(`Performing ${request.action} on tweet ${request.tweetId} via TwitterAPI.io`);
    
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
      timestamp: new Date().toISOString(),
      data: {  // 修正: data プロパティ追加
        liked: request.action === 'like',
        retweeted: request.action === 'retweet'
      }
    };
  } catch (error) {
    throw new Error(`Engagement ${request.action} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### 3. TweetEndpoints修正  
**対象**: `src/kaito-api/endpoints/tweet-endpoints.ts`

**修正内容**:
```typescript
// プロパティ名統一修正
async createTweet(options: CreateTweetOptions): Promise<TweetResult> {
  try {
    console.log('📝 ツイート作成実行中...', { textLength: options.text.length });

    // バリデーション
    if (!options.text || options.text.length > 280) {
      throw new Error('Invalid tweet text');
    }

    // TwitterAPI.io形式のリクエスト - プロパティ名修正
    const requestData: any = {
      text: options.text
    };

    if (options.media_ids?.length) {  // mediaIds → media_ids
      requestData.media_ids = options.media_ids;
    }

    if (options.reply?.in_reply_to_tweet_id) {  // inReplyToTweetId → reply.in_reply_to_tweet_id
      requestData.reply = {
        in_reply_to_tweet_id: options.reply.in_reply_to_tweet_id
      };
    }

    if (options.quote_tweet_id) {  // quoteTweetId → quote_tweet_id
      requestData.quote_tweet_id = options.quote_tweet_id;
    }

    const response = await this.httpClient.post<TwitterAPITweetResponse>('/v1/tweets', requestData);

    return {
      id: response.data.id,
      text: response.data.text,
      url: `https://twitter.com/i/status/${response.data.id}`,
      timestamp: response.data.created_at,
      success: true
    };

  } catch (error) {
    console.error('❌ ツイート作成エラー:', error);
    
    return {
      id: '',
      text: options.text,
      url: '',
      timestamp: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// 検索メソッド修正
async searchTweets(options: TweetSearchOptions): Promise<TweetSearchResult> {
  try {
    console.log('🔍 ツイート検索実行中...', { query: options.query });

    if (!options.query || options.query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    const params = {
      query: options.query,
      max_results: options.max_results || 10,  // maxResults → max_results
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

  } catch (error) {
    console.error('❌ ツイート検索エラー:', error);
    throw new Error(`Failed to search tweets: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// mapTweetData メソッド修正
private mapTweetData(apiTweet: any): TweetData {
  return {
    id: apiTweet.id,
    text: apiTweet.text,
    author_id: apiTweet.author_id,  // authorId → author_id
    created_at: apiTweet.created_at,
    public_metrics: {  // publicMetrics → public_metrics
      retweet_count: apiTweet.public_metrics?.retweet_count || 0,
      like_count: apiTweet.public_metrics?.like_count || 0,
      quote_count: apiTweet.public_metrics?.quote_count || 0,
      reply_count: apiTweet.public_metrics?.reply_count || 0,
      impression_count: apiTweet.public_metrics?.impression_count || 0
    },
    context_annotations: apiTweet.context_annotations,
    lang: apiTweet.lang
  };
}

// getTweet メソッド修正
async getTweet(tweetId: string): Promise<TweetData> {
  try {
    console.log('📄 ツイート取得中...', { tweetId });

    if (!tweetId || tweetId.trim().length === 0) {
      throw new Error('Tweet ID is required');
    }

    // API呼び出し
    const response = await this.httpClient.get(`/tweets/${tweetId}`, {
      'tweet.fields': 'id,text,author_id,created_at,public_metrics,context_annotations,attachments,referenced_tweets,in_reply_to_user_id,conversation_id,lang'
    }) as any;

    const tweetData = response.data;
    
    const tweet: TweetData = {
      id: tweetData.id,
      text: tweetData.text,
      author_id: tweetData.author_id,  // authorId → author_id
      created_at: tweetData.created_at,
      public_metrics: {  // publicMetrics → public_metrics
        retweet_count: tweetData.public_metrics.retweet_count,
        like_count: tweetData.public_metrics.like_count,
        quote_count: tweetData.public_metrics.quote_count,
        reply_count: tweetData.public_metrics.reply_count,
        impression_count: tweetData.public_metrics.impression_count
      },
      context_annotations: tweetData.context_annotations?.map((annotation: any) => ({
        domain: annotation.domain.name,
        entity: annotation.entity.name,
        description: annotation.entity.description
      })),
      lang: tweetData.lang,
      in_reply_to_user_id: tweetData.in_reply_to_user_id,
      conversation_id: tweetData.conversation_id
    };

    console.log('✅ ツイート取得完了:', { 
      id: tweet.id, 
      likes: tweet.public_metrics.like_count 
    });

    return tweet;

  } catch (error) {
    console.error('❌ ツイート取得エラー:', error);
    throw new Error(`Failed to get tweet: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// getMultipleTweets修正
async getMultipleTweets(tweetIds: string[]): Promise<TweetData[]> {
  try {
    console.log('📄📄 複数ツイート取得中...', { count: tweetIds.length });

    if (!tweetIds || tweetIds.length === 0) {
      throw new Error('Tweet IDs are required');
    }

    if (tweetIds.length > 100) {
      throw new Error('Maximum 100 tweet IDs allowed per request');
    }

    // API呼び出し
    const response = await this.httpClient.get('/tweets', {
      ids: tweetIds.join(','),
      'tweet.fields': 'id,text,author_id,created_at,public_metrics'
    }) as any;

    const tweets: TweetData[] = response.data.map((tweetData: any) => ({
      id: tweetData.id,
      text: tweetData.text,
      author_id: tweetData.author_id,  // authorId → author_id
      created_at: tweetData.created_at,
      public_metrics: {  // publicMetrics → public_metrics
        retweet_count: tweetData.public_metrics.retweet_count,
        like_count: tweetData.public_metrics.like_count,
        quote_count: tweetData.public_metrics.quote_count,
        reply_count: tweetData.public_metrics.reply_count,
        impression_count: tweetData.public_metrics.impression_count
      }
    }));

    console.log('✅ 複数ツイート取得完了:', { count: tweets.length });
    return tweets;

  } catch (error) {
    console.error('❌ 複数ツイート取得エラー:', error);
    throw new Error(`Failed to get multiple tweets: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### 4. UserEndpoints修正
**対象**: `src/kaito-api/endpoints/user-endpoints.ts`

**修正内容**:
```typescript
// searchUsers メソッド修正
async searchUsers(options: UserSearchOptions): Promise<UserSearchResult> {
  try {
    console.log('🔍 ユーザー検索実行中...', { query: options.query });

    if (!options.query || options.query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    const params = {
      query: options.query,
      max_results: options.max_results || 10,  // maxResults → max_results
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

  } catch (error) {
    console.error('❌ ユーザー検索エラー:', error);
    throw new Error(`Failed to search users: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### 5. shared/types.ts修正
**対象**: `src/shared/types.ts`

**修正内容**:
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
  PostResult,      // 追加
  RetweetResult,   // 追加  
  QuoteTweetResult,// 追加
  LikeResult,      // 追加
  AccountInfo      // 追加
} from '../kaito-api/types';
```

## ⚡ 修正検証

### 1. TypeScriptコンパイル確認
```bash
npx tsc --noEmit
# エラー0件になることを確認
```

### 2. 型整合性確認
```bash
# 全てのimportが正常に解決されることを確認
grep -r "from.*kaito-api" src/
```

### 3. エンドポイント動作確認
```bash
# 基本的な型チェックのみ（実APIコール不要）
npm run test -- --typecheck
```

## 📊 完了基準

### 必須チェックリスト
- [ ] TypeScriptコンパイルエラー0件
- [ ] 全プロパティ名がTwitterAPI.io標準に準拠
- [ ] EngagementResponseのdataプロパティ実装完了
- [ ] TrendData、TrendLocation型定義追加完了
- [ ] shared/types.ts統合完了

### 成功指標
- `npx tsc --noEmit` でエラー0件
- 全import文の正常解決
- 型安全性の完全確保

## 🚫 MVP制約

### 実装禁止
- 新機能追加
- 過度な抽象化
- 統計・分析機能

### 実装必須
- 既存機能の型安全性確保
- TwitterAPI.io完全準拠
- MVP要件内での品質最大化

## 📝 完了報告

実装完了後、以下を含む報告書を作成：
- 修正した全ファイルの一覧
- TypeScriptコンパイル結果（エラー0件確認）
- 型整合性確認結果
- 次工程（テスト実装）への引き継ぎ事項

**報告書**: `tasks/20250727_193649_kaito_api_implementation/reports/URGENT-001-typescript-errors-emergency-fix.md`