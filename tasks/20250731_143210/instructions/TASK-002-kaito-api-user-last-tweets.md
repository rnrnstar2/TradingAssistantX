# TASK-002: KaitoAPI ユーザー最新ツイート取得エンドポイントの実装

## 🎯 タスク概要
KaitoAPIに新しいエンドポイント（`user-last-tweets.ts`）を追加し、特定ユーザーの最新ツイートを取得する機能を実装する。TwitterAPI.ioの`/twitter/user_last_tweets`エンドポイントを使用する。

## 📋 実装要件

### 1. エンドポイントファイルの作成
**ファイルパス**: `src/kaito-api/endpoints/read-only/user-last-tweets.ts`

**実装内容**:
```typescript
import { KaitoClient } from '../../core/client';
import { 
  BaseResponse, 
  PaginationParams,
  buildCommonHeaders,
  validateRequiredParams,
  handleApiError
} from '../../utils';
import { UserLastTweetsParams, UserLastTweetsResponse, Tweet } from './types';

/**
 * 特定ユーザーの最新ツイートを取得
 * 
 * @endpoint GET /twitter/user_last_tweets
 * @docs https://docs.twitterapi.io/api-reference/endpoint/get_user_last_tweets
 * @auth APIキーのみ（読み取り専用）
 */
export class UserLastTweetsEndpoint {
  constructor(private client: KaitoClient) {}

  /**
   * 指定したユーザーの最新ツイートを取得
   * 
   * @param params - 検索パラメータ
   * @returns ユーザーの最新ツイート
   * 
   * @example
   * ```typescript
   * const tweets = await kaitoClient.getUserLastTweets({
   *   userName: 'financialjuice',
   *   limit: 20,
   *   includeReplies: false
   * });
   * ```
   */
  async getUserLastTweets(params: UserLastTweetsParams): Promise<UserLastTweetsResponse> {
    try {
      // 必須パラメータの検証
      validateRequiredParams(params, ['userName']);

      // クエリパラメータの構築
      const queryParams = new URLSearchParams();
      queryParams.append('userName', params.userName);
      
      if (params.limit !== undefined) {
        queryParams.append('limit', params.limit.toString());
      }
      
      if (params.includeReplies !== undefined) {
        queryParams.append('includeReplies', params.includeReplies.toString());
      }
      
      if (params.cursor) {
        queryParams.append('cursor', params.cursor);
      }

      // APIリクエスト
      const response = await this.client.request({
        method: 'GET',
        endpoint: '/twitter/user_last_tweets',
        params: queryParams,
        requiresAuth: false // APIキーのみ必要
      });

      // レスポンスの正規化
      return this.normalizeResponse(response);
    } catch (error) {
      return handleApiError(error, 'getUserLastTweets');
    }
  }

  /**
   * 複数ユーザーの最新ツイートを並列取得（バッチ処理）
   * 
   * @param usernames - ユーザー名のリスト
   * @param limit - 各ユーザーから取得する最大ツイート数
   * @returns ユーザーごとの最新ツイート
   */
  async getBatchUserLastTweets(
    usernames: string[], 
    limit: number = 20
  ): Promise<Map<string, UserLastTweetsResponse>> {
    const results = new Map<string, UserLastTweetsResponse>();
    
    // 並列処理での取得（レート制限を考慮）
    const batchSize = 5; // 同時実行数を制限
    for (let i = 0; i < usernames.length; i += batchSize) {
      const batch = usernames.slice(i, i + batchSize);
      const promises = batch.map(userName => 
        this.getUserLastTweets({ userName, limit, includeReplies: false })
          .then(response => ({ userName, response }))
      );
      
      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ userName, response }) => {
        results.set(userName, response);
      });
      
      // レート制限対策：バッチ間に短い待機時間
      if (i + batchSize < usernames.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * レスポンスの正規化
   */
  private normalizeResponse(rawResponse: any): UserLastTweetsResponse {
    if (!rawResponse.success) {
      return {
        success: false,
        error: rawResponse.error || 'Failed to fetch user tweets',
        tweets: []
      };
    }

    const tweets = Array.isArray(rawResponse.tweets) 
      ? rawResponse.tweets.map(this.normalizeTweet)
      : [];

    return {
      success: true,
      tweets,
      cursor: rawResponse.cursor,
      has_more: rawResponse.has_more || false
    };
  }

  /**
   * ツイートデータの正規化
   */
  private normalizeTweet(tweet: any): Tweet {
    return {
      id: tweet.id || tweet.id_str,
      text: tweet.text || tweet.full_text || '',
      author_id: tweet.author_id || tweet.user?.id_str,
      author_username: tweet.author_username || tweet.user?.screen_name,
      created_at: tweet.created_at,
      public_metrics: {
        like_count: tweet.public_metrics?.like_count || tweet.favorite_count || 0,
        retweet_count: tweet.public_metrics?.retweet_count || tweet.retweet_count || 0,
        reply_count: tweet.public_metrics?.reply_count || 0,
        quote_count: tweet.public_metrics?.quote_count || 0
      },
      entities: tweet.entities,
      referenced_tweets: tweet.referenced_tweets,
      lang: tweet.lang,
      possibly_sensitive: tweet.possibly_sensitive
    };
  }
}
```

### 2. 型定義の追加
**修正ファイル**: `src/kaito-api/endpoints/read-only/types.ts`

**追加する型定義**:
```typescript
// ユーザー最新ツイート取得パラメータ
export interface UserLastTweetsParams {
  userName: string;           // ユーザー名（必須）
  limit?: number;            // 取得する最大ツイート数（デフォルト: 20）
  includeReplies?: boolean;  // リプライを含めるか（デフォルト: false）
  cursor?: string;           // ページネーション用カーソル
}

// ユーザー最新ツイート取得レスポンス
export interface UserLastTweetsResponse extends BaseResponse {
  tweets: Tweet[];
  cursor?: string;
  has_more?: boolean;
}
```

### 3. エンドポイントのエクスポート追加
**修正ファイル**: `src/kaito-api/endpoints/read-only/index.ts`

**追加内容**:
```typescript
export { UserLastTweetsEndpoint } from './user-last-tweets';
export type { UserLastTweetsParams, UserLastTweetsResponse } from './types';
```

### 4. KaitoClientへの統合
**修正ファイル**: `src/kaito-api/core/client.ts`

**追加内容**:
```typescript
import { UserLastTweetsEndpoint } from '../endpoints/read-only/user-last-tweets';

// プロパティ追加
private userLastTweetsEndpoint: UserLastTweetsEndpoint;

// コンストラクタで初期化
constructor(config?: KaitoConfig) {
  // 既存のコード...
  this.userLastTweetsEndpoint = new UserLastTweetsEndpoint(this);
}

// メソッド追加
/**
 * 特定ユーザーの最新ツイートを取得
 */
async getUserLastTweets(params: UserLastTweetsParams): Promise<UserLastTweetsResponse> {
  return this.userLastTweetsEndpoint.getUserLastTweets(params);
}

/**
 * 複数ユーザーの最新ツイートをバッチ取得
 */
async getBatchUserLastTweets(usernames: string[], limit: number = 20): Promise<Map<string, UserLastTweetsResponse>> {
  return this.userLastTweetsEndpoint.getBatchUserLastTweets(usernames, limit);
}
```

## ⚠️ 実装時の注意事項

1. **APIドキュメント確認**: https://docs.twitterapi.io/api-reference/endpoint/get_user_last_tweets を参照
2. **認証レベル**: APIキーのみで動作（読み取り専用）
3. **レート制限**: 200 QPSを超えないよう、バッチ処理では同時実行数を制限
4. **エラーハンドリング**: ユーザーが存在しない場合やプライベートアカウントの場合の処理
5. **型安全性**: 既存の型定義との整合性を保つ

## 🧪 テスト要件

1. 単一ユーザーのツイート取得テスト
2. 複数ユーザーのバッチ取得テスト
3. エラーケース（存在しないユーザー、プライベートアカウント）のテスト
4. ページネーションのテスト
5. レート制限対策の動作確認

## 📁 成果物

1. `src/kaito-api/endpoints/read-only/user-last-tweets.ts` - 新規作成
2. `src/kaito-api/endpoints/read-only/types.ts` - 型定義追加
3. `src/kaito-api/endpoints/read-only/index.ts` - エクスポート追加
4. `src/kaito-api/core/client.ts` - メソッド追加

## ✅ 完了条件

- [ ] user-last-tweets.tsが正しく実装されている
- [ ] 型定義が追加されている
- [ ] KaitoClientに統合されている
- [ ] エラーハンドリングが適切に実装されている
- [ ] TypeScriptのコンパイルエラーがない
- [ ] 既存のKaitoAPIの構造と一貫性がある