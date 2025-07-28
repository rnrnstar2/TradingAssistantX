/**
 * KaitoAPI Tweet Endpoints - ツイート関連API実装
 * REQUIREMENTS.md準拠 - 疎結合ライブラリアーキテクチャ
 * 
 * 機能概要:
 * - ツイート作成・削除・更新
 * - リツイート・引用ツイート
 * - ツイート検索・取得
 * - リプライ・スレッド管理
 */

import { 
  KaitoAPIConfig,
  TweetData, 
  TweetResult, 
  RetweetResult, 
  QuoteResult, 
  TweetSearchResult, 
  TweetSearchOptions, 
  CreateTweetOptions, 
  DeleteTweetResult,
  HttpClient,
  TwitterAPITweetResponse,
  TwitterAPISearchResponse
} from '../types';

// ============================================================================
// VALIDATION TYPES
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// TWEET ENDPOINTS CLASS
// ============================================================================

/**
 * TweetEndpoints - ツイート関連API操作クラス
 * 
 * 主要機能:
 * - ツイートの作成・削除・取得
 * - リツイート・引用ツイート機能
 * - 高度なツイート検索・フィルタリング
 * - リプライ・会話管理
 */
export class TweetEndpoints {
  constructor(private httpClient: HttpClient) {
    console.log('✅ TweetEndpoints initialized - TwitterAPI.io対応版');
  }

  // ============================================================================
  // TWEET CREATION METHODS
  // ============================================================================

  /**
   * ツイート作成
   * 新しいツイートを投稿する
   */
  async createTweet(options: CreateTweetOptions): Promise<TweetResult> {
    try {
      console.log('📝 ツイート作成実行中...', { textLength: options.text.length });

      // バリデーション
      if (!options.text || options.text.length > 280) {
        throw new Error('Invalid tweet text');
      }

      // TwitterAPI.io形式のリクエスト
      const requestData: any = {
        text: options.text
      };

      if (options.media_ids?.length) {
        requestData.media_ids = options.media_ids;
      }

      if (options.reply?.in_reply_to_tweet_id) {
        requestData.reply = {
          in_reply_to_tweet_id: options.reply.in_reply_to_tweet_id
        };
      }

      if (options.quote_tweet_id) {
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

  /**
   * ツイート削除
   * 指定されたツイートを削除する
   */
  async deleteTweet(tweetId: string): Promise<DeleteTweetResult> {
    try {
      console.log('🗑️ ツイート削除実行中...', { tweetId });

      if (!tweetId || tweetId.trim().length === 0) {
        throw new Error('Tweet ID is required');
      }

      // API呼び出し
      const response = await this.httpClient.delete(`/tweets/${tweetId}`) as any;

      const result: DeleteTweetResult = {
        tweetId,
        deleted: response.data.deleted,
        timestamp: new Date().toISOString(),
        success: response.data.deleted
      };

      console.log(`${result.success ? '✅' : '❌'} ツイート削除${result.success ? '完了' : '失敗'}:`, result);
      return result;

    } catch (error) {
      console.error('❌ ツイート削除エラー:', error);
      
      return {
        tweetId,
        deleted: false,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // RETWEET METHODS
  // ============================================================================

  /**
   * リツイート実行
   * 指定されたツイートをリツイートする
   */
  async retweetTweet(tweetId: string): Promise<RetweetResult> {
    try {
      console.log('🔄 リツイート実行中...', { tweetId });

      if (!tweetId || tweetId.trim().length === 0) {
        throw new Error('Tweet ID is required');
      }

      // API呼び出し
      const response = await this.httpClient.post('/users/me/retweets', {
        tweet_id: tweetId
      }) as any;

      const result: RetweetResult = {
        id: `retweet_${Date.now()}`,
        originalTweetId: tweetId,
        timestamp: new Date().toISOString(),
        success: response.data.retweeted
      };

      console.log(`${result.success ? '✅' : '❌'} リツイート${result.success ? '完了' : '失敗'}:`, result);
      return result;

    } catch (error) {
      console.error('❌ リツイートエラー:', error);
      
      return {
        id: '',
        originalTweetId: tweetId,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * リツイート取り消し
   * 指定されたツイートのリツイートを取り消す
   */
  async unretweetTweet(tweetId: string): Promise<RetweetResult> {
    try {
      console.log('🔄❌ リツイート取り消し実行中...', { tweetId });

      if (!tweetId || tweetId.trim().length === 0) {
        throw new Error('Tweet ID is required');
      }

      // API呼び出し
      const response = await this.httpClient.delete(`/users/me/retweets/${tweetId}`) as any;

      const result: RetweetResult = {
        id: `unretweet_${Date.now()}`,
        originalTweetId: tweetId,
        timestamp: new Date().toISOString(),
        success: !response.data.retweeted
      };

      console.log(`${result.success ? '✅' : '❌'} リツイート取り消し${result.success ? '完了' : '失敗'}:`, result);
      return result;

    } catch (error) {
      console.error('❌ リツイート取り消しエラー:', error);
      
      return {
        id: '',
        originalTweetId: tweetId,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 引用ツイート作成
   * 指定されたツイートを引用して新しいツイートを作成
   */
  async quoteTweet(tweetId: string, comment: string): Promise<QuoteResult> {
    try {
      console.log('💬 引用ツイート作成実行中...', { tweetId, commentLength: comment.length });

      if (!tweetId || tweetId.trim().length === 0) {
        throw new Error('Tweet ID is required');
      }

      if (!comment || comment.trim().length === 0) {
        throw new Error('Quote comment is required');
      }

      if (comment.length > 280) {
        throw new Error('Quote comment exceeds 280 character limit');
      }

      // 引用ツイート作成
      const createResult = await this.createTweet({
        text: comment,
        quote_tweet_id: tweetId
      });

      const result: QuoteResult = {
        id: createResult.id,
        originalTweetId: tweetId,
        comment,
        url: createResult.url,
        timestamp: createResult.timestamp,
        success: createResult.success,
        error: createResult.error
      };

      console.log(`${result.success ? '✅' : '❌'} 引用ツイート${result.success ? '完了' : '失敗'}:`, result);
      return result;

    } catch (error) {
      console.error('❌ 引用ツイートエラー:', error);
      
      return {
        id: '',
        originalTweetId: tweetId,
        comment,
        url: '',
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // TWEET SEARCH METHODS
  // ============================================================================

  /**
   * ツイート検索
   * 指定されたクエリでツイートを検索する
   */
  async searchTweets(options: TweetSearchOptions): Promise<TweetSearchResult> {
    try {
      console.log('🔍 ツイート検索実行中...', { query: options.query });

      if (!options.query || options.query.trim().length === 0) {
        throw new Error('Search query is required');
      }

      const params = {
        query: options.query,
        max_results: options.max_results || 10,
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

  private mapTweetData(apiTweet: any): TweetData {
    return {
      id: apiTweet.id,
      text: apiTweet.text,
      author_id: apiTweet.author_id,
      created_at: apiTweet.created_at,
      public_metrics: {
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

  // ============================================================================
  // TWEET RETRIEVAL METHODS
  // ============================================================================

  /**
   * ツイート取得
   * 指定されたIDのツイートを取得する
   */
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
        author_id: tweetData.author_id,
        created_at: tweetData.created_at,
        public_metrics: {
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

  /**
   * 複数ツイート取得
   * 複数のツイートIDに対して一括でツイートを取得
   */
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
        author_id: tweetData.author_id,
        created_at: tweetData.created_at,
        public_metrics: {
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

  /**
   * トレンド検索（execution-flow.tsで使用）
   * 注意: トレンド検索は trend-endpoints.ts で実装されています
   */
  async searchTrends(): Promise<string[]> {
    console.log('⚠️ トレンド検索はtrend-endpoints.tsを使用してください');
    throw new Error('Trend search should use TrendEndpoints class');
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * ツイートURL構築
   */
  buildTweetUrl(tweetId: string, username?: string): string {
    if (username) {
      return `https://twitter.com/${username}/status/${tweetId}`;
    }
    return `https://twitter.com/i/status/${tweetId}`;
  }

  /**
   * ツイートテキスト検証
   * 注意: バリデーションロジックはutils層に移動済み
   */
  validateTweetText(text: string): { isValid: boolean; errors: string[] } {
    console.log('⚠️ バリデーションロジックはutils層を使用してください');
    throw new Error('Validation logic should use utils layer');
  }

  /**
   * エンドポイントの機能を取得（core-scheduler.tsで使用）
   */
  async getCapabilities(): Promise<any> {
    return {
      canSearchTweets: true,
      canCreateTweets: true,
      canDeleteTweets: true,
      canRetweet: true,
      canQuoteTweet: true,
      searchTrendsSupported: true
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * 使用例:
 * 
 * ```typescript
 * const tweetEndpoints = new TweetEndpoints(config, httpClient);
 * 
 * // ツイート作成
 * const tweetResult = await tweetEndpoints.createTweet({
 *   text: 'Hello, World! 🌍',
 *   mediaIds: ['media123'],
 * });
 * 
 * // リツイート
 * const retweetResult = await tweetEndpoints.retweetTweet('123456789');
 * 
 * // 引用ツイート
 * const quoteResult = await tweetEndpoints.quoteTweet('123456789', 'Great insight!');
 * 
 * // ツイート検索
 * const searchResult = await tweetEndpoints.searchTweets({
 *   query: 'crypto trading -is:retweet',
 *   maxResults: 20,
 *   sortOrder: 'relevancy'
 * });
 * 
 * // ツイート削除
 * const deleteResult = await tweetEndpoints.deleteTweet('123456789');
 * ```
 */