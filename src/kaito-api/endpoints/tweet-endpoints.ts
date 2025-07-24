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

import { KaitoAPIConfig } from '../core/config';

// ============================================================================
// TWEET INTERFACES
// ============================================================================

export interface TweetData {
  id: string;
  text: string;
  authorId: string;
  createdAt: string;
  publicMetrics: {
    retweetCount: number;
    likeCount: number;
    quoteCount: number;
    replyCount: number;
    impressionCount: number;
  };
  contextAnnotations?: Array<{
    domain: string;
    entity: string;
    description: string;
  }>;
  attachments?: {
    mediaKeys?: string[];
    pollIds?: string[];
  };
  referencedTweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to';
    id: string;
  }>;
  inReplyToUserId?: string;
  conversationId?: string;
  lang?: string;
}

export interface TweetResult {
  id: string;
  text: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface RetweetResult {
  id: string;
  originalTweetId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface QuoteResult {
  id: string;
  originalTweetId: string;
  comment: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface TweetSearchResult {
  tweets: TweetData[];
  totalCount: number;
  nextToken?: string;
  searchQuery: string;
  timestamp: string;
}

export interface TweetSearchOptions {
  query: string;
  maxResults?: number;
  nextToken?: string;
  startTime?: string;
  endTime?: string;
  sortOrder?: 'recency' | 'relevancy';
  includeRetweets?: boolean;
  lang?: string;
  tweetFields?: string[];
  expansions?: string[];
}

export interface CreateTweetOptions {
  text: string;
  mediaIds?: string[];
  pollOptions?: string[];
  pollDurationMinutes?: number;
  inReplyToTweetId?: string;
  quoteTweetId?: string;
  location?: {
    placeId: string;
  };
  directMessageDeepLink?: string;
  forSuperFollowersOnly?: boolean;
}

export interface DeleteTweetResult {
  tweetId: string;
  deleted: boolean;
  timestamp: string;
  success: boolean;
  error?: string;
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
  private config: KaitoAPIConfig;
  private httpClient: any; // HttpClientインスタンス

  constructor(config: KaitoAPIConfig, httpClient: any) {
    this.config = config;
    this.httpClient = httpClient;
    
    console.log('✅ TweetEndpoints initialized - 疎結合ライブラリアーキテクチャ');
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

      if (!options.text || options.text.trim().length === 0) {
        throw new Error('Tweet text is required');
      }

      if (options.text.length > 280) {
        throw new Error('Tweet text exceeds 280 character limit');
      }

      // ツイートデータ準備
      const tweetData: Record<string, any> = {
        text: options.text
      };

      // メディア添付
      if (options.mediaIds && options.mediaIds.length > 0) {
        tweetData.media = {
          media_ids: options.mediaIds
        };
      }

      // 投票設定
      if (options.pollOptions && options.pollOptions.length > 0) {
        tweetData.poll = {
          options: options.pollOptions,
          duration_minutes: options.pollDurationMinutes || 1440 // デフォルト24時間
        };
      }

      // リプライ設定
      if (options.inReplyToTweetId) {
        tweetData.reply = {
          in_reply_to_tweet_id: options.inReplyToTweetId
        };
      }

      // 引用ツイート設定
      if (options.quoteTweetId) {
        tweetData.quote_tweet_id = options.quoteTweetId;
      }

      // 位置情報設定
      if (options.location) {
        tweetData.geo = {
          place_id: options.location.placeId
        };
      }

      // その他設定
      if (options.forSuperFollowersOnly) {
        tweetData.for_super_followers_only = true;
      }

      if (options.directMessageDeepLink) {
        tweetData.direct_message_deep_link = options.directMessageDeepLink;
      }

      // API呼び出し
      const response = await this.httpClient.post<{
        data: {
          id: string;
          text: string;
        }
      }>('/tweets', tweetData);

      const result: TweetResult = {
        id: response.data.id,
        text: response.data.text,
        url: `https://twitter.com/i/status/${response.data.id}`,
        timestamp: new Date().toISOString(),
        success: true
      };

      console.log('✅ ツイート作成完了:', { id: result.id, success: result.success });
      return result;

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
      const response = await this.httpClient.delete<{
        data: {
          deleted: boolean;
        }
      }>(`/tweets/${tweetId}`);

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
      const response = await this.httpClient.post<{
        data: {
          retweeted: boolean;
        }
      }>('/users/me/retweets', {
        tweet_id: tweetId
      });

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
      const response = await this.httpClient.delete<{
        data: {
          retweeted: boolean;
        }
      }>(`/users/me/retweets/${tweetId}`);

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
        quoteTweetId: tweetId
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

      // 検索パラメータ構築
      const params: Record<string, any> = {
        query: options.query,
        max_results: Math.min(options.maxResults || 50, 100),
        sort_order: options.sortOrder || 'recency'
      };

      // ツイートフィールド指定
      const defaultTweetFields = [
        'id', 'text', 'author_id', 'created_at', 'public_metrics',
        'context_annotations', 'attachments', 'referenced_tweets',
        'in_reply_to_user_id', 'conversation_id', 'lang'
      ];
      params['tweet.fields'] = (options.tweetFields || defaultTweetFields).join(',');

      // 展開指定
      if (options.expansions && options.expansions.length > 0) {
        params.expansions = options.expansions.join(',');
      }

      // 時間範囲指定
      if (options.startTime) {
        params.start_time = options.startTime;
      }
      if (options.endTime) {
        params.end_time = options.endTime;
      }

      // 次ページトークン
      if (options.nextToken) {
        params.next_token = options.nextToken;
      }

      // 言語指定
      if (options.lang) {
        params.lang = options.lang;
      }

      // リツイート含むかどうか
      if (options.includeRetweets === false) {
        params.query += ' -is:retweet';
      }

      // API呼び出し
      const response = await this.httpClient.get<{
        data: Array<{
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
          attachments?: {
            media_keys?: string[];
            poll_ids?: string[];
          };
          referenced_tweets?: Array<{
            type: 'retweeted' | 'quoted' | 'replied_to';
            id: string;
          }>;
          in_reply_to_user_id?: string;
          conversation_id?: string;
          lang?: string;
        }>;
        meta: {
          result_count: number;
          next_token?: string;
        };
      }>('/tweets/search/recent', params);

      const tweets: TweetData[] = response.data.map((tweetData: any) => ({
        id: tweetData.id,
        text: tweetData.text,
        authorId: tweetData.author_id,
        createdAt: tweetData.created_at,
        publicMetrics: {
          retweetCount: tweetData.public_metrics.retweet_count,
          likeCount: tweetData.public_metrics.like_count,
          quoteCount: tweetData.public_metrics.quote_count,
          replyCount: tweetData.public_metrics.reply_count,
          impressionCount: tweetData.public_metrics.impression_count
        },
        contextAnnotations: tweetData.context_annotations?.map((annotation: any) => ({
          domain: annotation.domain.name,
          entity: annotation.entity.name,
          description: annotation.entity.description
        })),
        attachments: tweetData.attachments,
        referencedTweets: tweetData.referenced_tweets,
        inReplyToUserId: tweetData.in_reply_to_user_id,
        conversationId: tweetData.conversation_id,
        lang: tweetData.lang
      }));

      const result: TweetSearchResult = {
        tweets,
        totalCount: response.meta.result_count,
        nextToken: response.meta.next_token,
        searchQuery: options.query,
        timestamp: new Date().toISOString()
      };

      console.log('✅ ツイート検索完了:', { 
        query: options.query, 
        count: result.totalCount 
      });

      return result;

    } catch (error) {
      console.error('❌ ツイート検索エラー:', error);
      throw new Error(`Failed to search tweets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      const response = await this.httpClient.get<{
        data: {
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
          attachments?: {
            media_keys?: string[];
            poll_ids?: string[];
          };
          referenced_tweets?: Array<{
            type: 'retweeted' | 'quoted' | 'replied_to';
            id: string;
          }>;
          in_reply_to_user_id?: string;
          conversation_id?: string;
          lang?: string;
        }
      }>(`/tweets/${tweetId}`, {
        'tweet.fields': 'id,text,author_id,created_at,public_metrics,context_annotations,attachments,referenced_tweets,in_reply_to_user_id,conversation_id,lang'
      });

      const tweetData = response.data;
      
      const tweet: TweetData = {
        id: tweetData.id,
        text: tweetData.text,
        authorId: tweetData.author_id,
        createdAt: tweetData.created_at,
        publicMetrics: {
          retweetCount: tweetData.public_metrics.retweet_count,
          likeCount: tweetData.public_metrics.like_count,
          quoteCount: tweetData.public_metrics.quote_count,
          replyCount: tweetData.public_metrics.reply_count,
          impressionCount: tweetData.public_metrics.impression_count
        },
        contextAnnotations: tweetData.context_annotations?.map((annotation: any) => ({
          domain: annotation.domain.name,
          entity: annotation.entity.name,
          description: annotation.entity.description
        })),
        attachments: tweetData.attachments,
        referencedTweets: tweetData.referenced_tweets,
        inReplyToUserId: tweetData.in_reply_to_user_id,
        conversationId: tweetData.conversation_id,
        lang: tweetData.lang
      };

      console.log('✅ ツイート取得完了:', { 
        id: tweet.id, 
        likes: tweet.publicMetrics.likeCount 
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
      const response = await this.httpClient.get<{
        data: Array<{
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
        }>
      }>('/tweets', {
        ids: tweetIds.join(','),
        'tweet.fields': 'id,text,author_id,created_at,public_metrics'
      });

      const tweets: TweetData[] = response.data.map((tweetData: any) => ({
        id: tweetData.id,
        text: tweetData.text,
        authorId: tweetData.author_id,
        createdAt: tweetData.created_at,
        publicMetrics: {
          retweetCount: tweetData.public_metrics.retweet_count,
          likeCount: tweetData.public_metrics.like_count,
          quoteCount: tweetData.public_metrics.quote_count,
          replyCount: tweetData.public_metrics.reply_count,
          impressionCount: tweetData.public_metrics.impression_count
        }
      }));

      console.log('✅ 複数ツイート取得完了:', { count: tweets.length });
      return tweets;

    } catch (error) {
      console.error('❌ 複数ツイート取得エラー:', error);
      throw new Error(`Failed to get multiple tweets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
   */
  validateTweetText(text: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!text || text.trim().length === 0) {
      errors.push('Tweet text cannot be empty');
    }

    if (text.length > 280) {
      errors.push('Tweet text exceeds 280 character limit');
    }

    // 韓国語チェック
    const koreanRegex = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
    if (koreanRegex.test(text)) {
      errors.push('Korean characters are not allowed');
    }

    return {
      isValid: errors.length === 0,
      errors
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