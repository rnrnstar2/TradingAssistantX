import { 
  TwitterAPIError,
  createAPIError,
  ValidationError,
  KaitoAPIError,
  API_ENDPOINTS
} from '../../utils';
import { UserLastTweetsParams, UserLastTweetsResponse, Tweet } from './types';

/**
 * 特定ユーザーの最新ツイートを取得
 * 
 * @endpoint GET /twitter/user/last_tweets
 * @docs https://docs.twitterapi.io/api-reference/endpoint/get_user_last_tweets
 * @auth APIキーのみ（読み取り専用）
 */
export class UserLastTweetsEndpoint {
  constructor(private httpClient: any, private authManager: any) {}

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
      this.validateRequiredParams(params, ['userName']);

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
      const response = await this.httpClient.get(API_ENDPOINTS.userLastTweets, Object.fromEntries(queryParams));

      // レスポンスの正規化
      return this.normalizeResponse(response);
    } catch (error) {
      return this.handleApiError(error, 'getUserLastTweets');
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

    // レスポンスの基本検証
    if (!rawResponse) {
      console.warn('⚠️ Empty response received');
      return {
        success: false,
        error: 'Empty response from API',
        tweets: []
      };
    }

    // パターン1: 直接tweets配列
    if (Array.isArray(rawResponse.tweets)) {
      return {
        success: true,
        tweets: rawResponse.tweets.map((tweet: any) => this.normalizeTweet(tweet)),
        cursor: rawResponse.next_cursor || rawResponse.cursor,
        has_more: rawResponse.has_next_page || rawResponse.has_more || false
      };
    }

    // パターン2: data でラップされている
    if (rawResponse.data && Array.isArray(rawResponse.data.tweets)) {
      return {
        success: true,
        tweets: rawResponse.data.tweets.map((tweet: any) => this.normalizeTweet(tweet)),
        cursor: rawResponse.next_cursor || rawResponse.data.next_cursor || rawResponse.data.cursor,
        has_more: rawResponse.has_next_page || rawResponse.data.has_next_page || rawResponse.data.has_more || false
      };
    }

    // パターン3: results配列
    if (Array.isArray(rawResponse.results)) {
      return {
        success: true,
        tweets: rawResponse.results.map((tweet: any) => this.normalizeTweet(tweet)),
        cursor: rawResponse.meta?.next_token || rawResponse.meta?.cursor,
        has_more: rawResponse.meta?.has_next_page || rawResponse.meta?.has_more || false
      };
    }

    // パターン4: 空のレスポンス（ツイートなし）
    if (rawResponse.success === true && !rawResponse.tweets) {
      return {
        success: true,
        tweets: [],
        cursor: undefined,
        has_more: false
      };
    }

    // パターン5: success: false
    if (rawResponse.success === false) {
      return {
        success: false,
        error: rawResponse.error || rawResponse.message || 'API request failed',
        tweets: []
      };
    }

    // 未知の構造
    return {
      success: false,
      error: 'Unknown response structure from API',
      tweets: []
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
        quote_count: tweet.public_metrics?.quote_count || 0,
        // 追加: impressionsとbookmarksの取得
        impression_count: tweet.public_metrics?.impression_count || tweet.impression_count || 0,
        bookmark_count: tweet.public_metrics?.bookmark_count || tweet.bookmark_count || 0
      },
      entities: tweet.entities,
      referenced_tweets: tweet.referenced_tweets,
      lang: tweet.lang,
      possibly_sensitive: tweet.possibly_sensitive
    };
  }

  /**
   * 必須パラメータの検証
   */
  private validateRequiredParams(params: any, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!params[field]) {
        throw new ValidationError(`Missing required parameter: ${field}`, field);
      }
    }
  }

  /**
   * APIエラーのハンドリング
   */
  private handleApiError(error: any, operation: string): UserLastTweetsResponse {
    console.error(`[UserLastTweetsEndpoint] Error in ${operation}:`, error);

    if (error instanceof KaitoAPIError) {
      return {
        success: false,
        error: error.message,
        tweets: []
      };
    }

    // その他のエラー
    return {
      success: false,
      error: `Failed to ${operation}: ${error.message || 'Unknown error'}`,
      tweets: []
    };
  }
}