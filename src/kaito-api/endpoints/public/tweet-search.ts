/**
 * Public Tweet Search Endpoint - APIキー認証専用
 * REQUIREMENTS.md準拠 - 読み取り専用ツイート検索
 * 
 * 機能:
 * - ツイート検索・高度検索機能
 * - 特定ツイート取得
 * - 検索フィルタリング・ソート
 * 
 * 認証レベル: APIキー認証のみ（読み取り専用）
 */

import { 
  TweetData,
  TweetSearchResult, 
  TweetSearchOptions,
  HttpClient,
  TwitterAPITweetResponse,
  TwitterAPISearchResponse
} from '../../types';
import { APIKeyAuth } from '../../core/api-key-auth';

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

interface TweetResponse {
  success: boolean;
  data: TweetData;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface SearchResponse {
  success: boolean;
  data: {
    tweets: TweetData[];
    totalCount: number;
    searchMetadata: {
      query: string;
      resultType: string;
      executedAt: Date;
    };
  };
  pagination?: {
    nextCursor?: string;
    hasMore: boolean;
  };
}

// ============================================================================
// SEARCH OPTIONS
// ============================================================================

interface AdvancedSearchOptions extends TweetSearchOptions {
  lang?: string;
  locale?: string;
  geocode?: string;
  since?: string;
  until?: string;
  includeEntities?: boolean;
  tweetMode?: 'extended' | 'compat';
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// TWEET SEARCH ENDPOINT CLASS
// ============================================================================

/**
 * TweetSearchEndpoint - 公開ツイート検索API操作クラス
 * 
 * APIキー認証のみで実行可能な読み取り専用機能:
 * - ツイート検索・高度検索・フィルタリング
 * - 特定ツイート取得
 * - 検索結果のソート・ページネーション
 */
export class TweetSearchEndpoint {
  private readonly ENDPOINTS = {
    searchTweets: '/twitter/tweet/advanced_search',
    getTweet: '/twitter/tweet/info',
    searchRecent: '/twitter/tweet/search',
    searchPopular: '/twitter/tweet/search/popular'
  } as const;

  private readonly RATE_LIMITS = {
    search: { limit: 450, window: 3600 }, // 450/hour
    getTweet: { limit: 900, window: 3600 }, // 900/hour
    advancedSearch: { limit: 180, window: 3600 } // 180/hour
  } as const;

  private readonly VALIDATION_RULES = {
    searchQuery: { minLength: 1, maxLength: 500 },
    tweetId: /^[0-9]+$/,
    maxResults: { min: 1, max: 100 },
    lang: /^[a-z]{2}$/,
    geocode: /^-?\d+\.?\d*,-?\d+\.?\d*,\d+\.?\d*(km|mi)$/
  } as const;

  private readonly SUPPORTED_LANGUAGES = [
    'en', 'ja', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ko', 'ar',
    'hi', 'th', 'tr', 'nl', 'sv', 'da', 'no', 'fi'
  ] as const;

  constructor(
    private httpClient: HttpClient,
    private apiKeyAuth: APIKeyAuth
  ) {}

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * 高度ツイート検索
   * APIキー認証のみで実行可能
   */
  async searchTweets(query: string, options?: AdvancedSearchOptions): Promise<SearchResponse> {
    // 入力バリデーション
    const validation = this.validateSearchQuery(query);
    if (!validation.isValid) {
      throw new Error(`Invalid search query: ${validation.errors.join(', ')}`);
    }

    if (options) {
      const optionsValidation = this.validateSearchOptions(options);
      if (!optionsValidation.isValid) {
        throw new Error(`Invalid search options: ${optionsValidation.errors.join(', ')}`);
      }
    }

    try {
      const headers = this.apiKeyAuth.getAuthHeaders();
      
      const params: any = { q: query };
      if (options?.count) params.count = Math.min(options.count, 100);
      if (options?.resultType) params.result_type = options.resultType;
      if (options?.lang) params.lang = options.lang;
      if (options?.locale) params.locale = options.locale;
      if (options?.geocode) params.geocode = options.geocode;
      if (options?.since) params.since = options.since;
      if (options?.until) params.until = options.until;
      if (options?.includeEntities) params.include_entities = options.includeEntities;
      if (options?.tweetMode) params.tweet_mode = options.tweetMode;

      const response = await this.httpClient.get<TwitterAPISearchResponse>(
        this.ENDPOINTS.searchTweets,
        params,
        { headers }
      );

      const normalizedTweets = await Promise.all(
        (response.statuses || response.tweets || []).map((tweet: any) => 
          this.normalizeTweetData(tweet)
        )
      );

      return {
        success: true,
        data: {
          tweets: normalizedTweets,
          totalCount: response.search_metadata?.count || normalizedTweets.length,
          searchMetadata: {
            query,
            resultType: options?.resultType || 'mixed',
            executedAt: new Date()
          }
        },
        pagination: {
          nextCursor: response.search_metadata?.next_results,
          hasMore: !!response.search_metadata?.next_results
        }
      };

    } catch (error: any) {
      throw this.handleAPIKeyError(error, 'searchTweets');
    }
  }

  /**
   * 特定ツイート取得
   * APIキー認証のみで実行可能
   */
  async getTweetById(tweetId: string): Promise<TweetResponse> {
    // 入力バリデーション
    const validation = this.validateTweetId(tweetId);
    if (!validation.isValid) {
      throw new Error(`Invalid tweetId: ${validation.errors.join(', ')}`);
    }

    try {
      const headers = this.apiKeyAuth.getAuthHeaders();
      
      const response = await this.httpClient.get<TwitterAPITweetResponse>(
        this.ENDPOINTS.getTweet,
        { id: tweetId, tweet_mode: 'extended' },
        { headers }
      );

      const normalizedData = await this.normalizeTweetData(response);

      return {
        success: true,
        data: normalizedData,
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleAPIKeyError(error, 'getTweetById');
    }
  }

  /**
   * 最新ツイート検索
   * APIキー認証のみで実行可能
   */
  async searchRecentTweets(query: string, options?: { count?: number; lang?: string }): Promise<SearchResponse> {
    const validation = this.validateSearchQuery(query);
    if (!validation.isValid) {
      throw new Error(`Invalid search query: ${validation.errors.join(', ')}`);
    }

    try {
      const headers = this.apiKeyAuth.getAuthHeaders();
      
      const params: any = { 
        q: query,
        result_type: 'recent',
        count: Math.min(options?.count || 15, 100)
      };
      if (options?.lang) params.lang = options.lang;

      const response = await this.httpClient.get<TwitterAPISearchResponse>(
        this.ENDPOINTS.searchRecent,
        params,
        { headers }
      );

      const normalizedTweets = await Promise.all(
        (response.statuses || response.tweets || []).map((tweet: any) => 
          this.normalizeTweetData(tweet)
        )
      );

      return {
        success: true,
        data: {
          tweets: normalizedTweets,
          totalCount: normalizedTweets.length,
          searchMetadata: {
            query,
            resultType: 'recent',
            executedAt: new Date()
          }
        }
      };

    } catch (error: any) {
      throw this.handleAPIKeyError(error, 'searchRecentTweets');
    }
  }

  /**
   * 人気ツイート検索
   * APIキー認証のみで実行可能
   */
  async searchPopularTweets(query: string, options?: { count?: number; lang?: string }): Promise<SearchResponse> {
    const validation = this.validateSearchQuery(query);
    if (!validation.isValid) {
      throw new Error(`Invalid search query: ${validation.errors.join(', ')}`);
    }

    try {
      const headers = this.apiKeyAuth.getAuthHeaders();
      
      const params: any = { 
        q: query,
        result_type: 'popular',
        count: Math.min(options?.count || 15, 100)
      };
      if (options?.lang) params.lang = options.lang;

      const response = await this.httpClient.get<TwitterAPISearchResponse>(
        this.ENDPOINTS.searchPopular,
        params,
        { headers }
      );

      const normalizedTweets = await Promise.all(
        (response.statuses || response.tweets || []).map((tweet: any) => 
          this.normalizeTweetData(tweet)
        )
      );

      return {
        success: true,
        data: {
          tweets: normalizedTweets,
          totalCount: normalizedTweets.length,
          searchMetadata: {
            query,
            resultType: 'popular',
            executedAt: new Date()
          }
        }
      };

    } catch (error: any) {
      throw this.handleAPIKeyError(error, 'searchPopularTweets');
    }
  }

  // ============================================================================
  // PRIVATE METHODS - VALIDATION
  // ============================================================================

  private validateSearchQuery(query: string): ValidationResult {
    const errors: string[] = [];

    if (!query || typeof query !== 'string') {
      errors.push('Search query is required and must be a string');
    } else if (query.length < this.VALIDATION_RULES.searchQuery.minLength) {
      errors.push(`Search query must be at least ${this.VALIDATION_RULES.searchQuery.minLength} characters`);
    } else if (query.length > this.VALIDATION_RULES.searchQuery.maxLength) {
      errors.push(`Search query must not exceed ${this.VALIDATION_RULES.searchQuery.maxLength} characters`);
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateTweetId(tweetId: string): ValidationResult {
    const errors: string[] = [];

    if (!tweetId || typeof tweetId !== 'string') {
      errors.push('tweetId is required and must be a string');
    } else if (!this.VALIDATION_RULES.tweetId.test(tweetId)) {
      errors.push('tweetId must be numeric');
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateSearchOptions(options: AdvancedSearchOptions): ValidationResult {
    const errors: string[] = [];

    if (options.count !== undefined) {
      if (options.count < this.VALIDATION_RULES.maxResults.min || 
          options.count > this.VALIDATION_RULES.maxResults.max) {
        errors.push(`count must be between ${this.VALIDATION_RULES.maxResults.min} and ${this.VALIDATION_RULES.maxResults.max}`);
      }
    }

    if (options.lang && !this.VALIDATION_RULES.lang.test(options.lang)) {
      errors.push('lang must be a valid 2-letter language code');
    }

    if (options.geocode && !this.VALIDATION_RULES.geocode.test(options.geocode)) {
      errors.push('geocode must be in format "latitude,longitude,radius(km|mi)"');
    }

    return { isValid: errors.length === 0, errors };
  }

  // ============================================================================
  // PRIVATE METHODS - DATA NORMALIZATION
  // ============================================================================

  private async normalizeTweetData(apiTweet: any): Promise<TweetData> {
    return {
      id: apiTweet.id_str || apiTweet.id,
      text: apiTweet.full_text || apiTweet.text || '',
      createdAt: new Date(apiTweet.created_at),
      authorId: apiTweet.user?.id_str || apiTweet.author_id,
      authorUsername: apiTweet.user?.screen_name || apiTweet.author_username,
      authorDisplayName: apiTweet.user?.name || apiTweet.author_display_name,
      metrics: {
        retweetCount: apiTweet.retweet_count || 0,
        likeCount: apiTweet.favorite_count || apiTweet.like_count || 0,
        replyCount: apiTweet.reply_count || 0,
        quoteCount: apiTweet.quote_count || 0
      },
      publicMetrics: {
        retweetCount: apiTweet.public_metrics?.retweet_count || apiTweet.retweet_count || 0,
        likeCount: apiTweet.public_metrics?.like_count || apiTweet.favorite_count || 0,
        replyCount: apiTweet.public_metrics?.reply_count || apiTweet.reply_count || 0,
        quoteCount: apiTweet.public_metrics?.quote_count || apiTweet.quote_count || 0
      },
      isRetweet: !!apiTweet.retweeted_status,
      isReply: !!apiTweet.in_reply_to_status_id_str,
      isQuoteTweet: !!apiTweet.is_quote_status,
      lang: apiTweet.lang || 'en',
      source: apiTweet.source || 'unknown',
      entities: {
        hashtags: apiTweet.entities?.hashtags || [],
        mentions: apiTweet.entities?.user_mentions || [],
        urls: apiTweet.entities?.urls || [],
        media: apiTweet.entities?.media || []
      }
    };
  }

  // ============================================================================
  // PRIVATE METHODS - ERROR HANDLING
  // ============================================================================

  private handleAPIKeyError(error: any, operation: string): never {
    // APIキー認証特有のエラー処理
    if (error.status === 401) {
      throw new Error(`Invalid API key - check KAITO_API_TOKEN for operation: ${operation}`);
    }
    
    if (error.status === 403) {
      throw new Error(`API key lacks permission for operation: ${operation}`);
    }
    
    if (error.status === 429) {
      throw new Error(`Rate limit exceeded for operation: ${operation}. Please wait before retrying.`);
    }
    
    if (error.status === 404) {
      throw new Error(`Tweet not found or endpoint unavailable: ${operation}`);
    }

    if (error.status === 422) {
      throw new Error(`Invalid search parameters for operation: ${operation}`);
    }

    // その他のエラー
    throw new Error(`API error in ${operation}: ${error.message || 'Unknown error'}`);
  }
}