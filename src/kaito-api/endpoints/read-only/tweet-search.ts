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
  TwitterAPISearchResponse,
  SimpleTwitterAPIError,
  APIResult,
  RateLimitInfo
} from '../../utils/types';
import { AuthManager } from '../../core/auth-manager';
import { 
  validateSearchQuery,
  validateTwitterTweetId,
  createAPIError, 
  createSuccessResult, 
  createFailureResult,
  performSecurityCheck
} from '../../utils/validator';

// ============================================================================
// RESPONSE INTERFACES - 統一型定義
// ============================================================================

/**
 * ツイート取得レスポンス（成功）
 */
interface TweetResponse {
  success: true;
  data: TweetData;
  timestamp: string;
  rateLimit?: RateLimitInfo;
}

/**
 * ツイート取得レスポンス（エラー）
 */
interface TweetResponseError {
  success: false;
  error: SimpleTwitterAPIError;
  timestamp: string;
  rateLimit?: RateLimitInfo;
}

/**
 * 完全ツイートレスポンス型
 */
type CompleteTweetResponse = TweetResponse | TweetResponseError;

/**
 * ツイート検索レスポンス（成功）
 */
interface SearchResponse {
  success: true;
  data: {
    tweets: TweetData[];
    totalCount: number;
    searchMetadata: {
      query: string;
      resultType?: string;
      executedAt: string;
      processedCount: number;
      filteredCount?: number;
    };
  };
  timestamp: string;
  pagination?: {
    nextCursor?: string;
    hasMore: boolean;
    currentPage?: number;
    itemsPerPage?: number;
  };
  rateLimit?: RateLimitInfo;
}

/**
 * ツイート検索レスポンス（エラー）
 */
interface SearchResponseError {
  success: false;
  error: SimpleTwitterAPIError;
  timestamp: string;
  rateLimit?: RateLimitInfo;
}

/**
 * 完全検索レスポンス型
 */
type CompleteSearchResponse = SearchResponse | SearchResponseError;

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
// VALIDATION TYPES - 統一バリデーション
// ============================================================================

/**
 * バリデーション結果
 * より詳細なエラー情報を含む統一型
 */
interface ValidationResult {
  /** バリデーション成功フラグ */
  isValid: boolean;
  /** エラーメッセージ配列 */
  errors: string[];
  /** エラーコード配列（診断用） */
  errorCodes?: string[];
  /** 修正提案（可能な場合） */
  suggestions?: string[];
}

// ============================================================================
// TWEET SEARCH ENDPOINT CLASS
// ============================================================================

/**
 * TweetSearchEndpoint - 読み取り専用ツイート検索API操作クラス
 * 
 * @description APIキー認証のみで実行可能な読み取り専用ツイート関連機能の統一インターフェース
 * 
 * **主要機能:**
 * - 高度ツイート検索・包括的フィルタリング機能
 * - 特定ツイートの詳細情報取得
 * - 検索結果の高度ソート・効率的ページネーション
 * - 投資教育コンテンツの精度向上フィルタリング
 * - 多言語・地域対応検索機能
 * 
 * **認証レベル:** APIキー認証のみ（読み取り専用操作）
 * **レート制限:** TwitterAPI.io標準制限に準拠（検索: 450/時間2、取得: 900/時間）
 * **エラーハンドリング:** 統一エラーハンドラーによる包括的エラー処理
 * 
 * @example
 * ```typescript
 * const tweetEndpoint = new TweetSearchEndpoint(httpClient, authManager);
 * 
 * // 基本的なツイート検索
 * const searchResult = await tweetEndpoint.searchTweets('investment education');
 * 
 * // 高度検索オプション
 * const advancedResult = await tweetEndpoint.searchTweets('trading tips', {
 *   lang: 'en',
 *   maxResults: 50,
 *   since: '2025-01-01',
 *   includeEntities: true
 * });
 * 
 * // 特定ツイート取得
 * const tweet = await tweetEndpoint.getTweetById('1234567890123456789');
 * ```
 * 
 * @version 2.1.0
 * @since 2025-07-29
 */
export class TweetSearchEndpoint {
  private readonly ENDPOINTS = {
    searchTweets: '/twitter/tweet/advanced_search',
    getTweet: '/twitter/tweet/info',
    searchRecent: '/twitter/tweet/advanced_search',
    searchPopular: '/twitter/tweet/advanced_search'
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
  
  // 警告ログ制御フラグ
  private hasLoggedEmptyDateWarning = false;
  private hasLoggedTweetStructure = false;

  constructor(
    private httpClient: HttpClient,
    private authManager: AuthManager
  ) {}

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * 高度ツイート検索
   * 
   * @description 指定されたキーワードで高度なツイート検索を実行します
 * 投資教育コンテンツの精度向上フィルタリングと多言語対応を実装
 * 
 * @param query - 検索キーワード（1-500文字、最大50単語）
 * @param options - 高度検索オプション
 * @param options.maxResults - 取得件数（最大100件）
 * @param options.lang - 言語コード（ISO 639-1形式）
 * @param options.geocode - 地理的フィルタリング（緯度,経度,半径）
 * @param options.since - 検索開始日時（YYYY-MM-DD形式）
 * @param options.until - 検索終了日時（YYYY-MM-DD形式）
 * @param options.includeEntities - エンティティ情報含有フラグ
 * @param options.tweetMode - ツイートモード（extended/compat）
 * @returns 検索結果とメタデータ
 * 
 * @throws {Error} 検索クエリバリデーションエラー
 * @throws {Error} 検索オプションバリデーションエラー
 * @throws {Error} API認証・権限エラー
 * @throws {Error} レート制限エラー
 * 
 * @example
 * ```typescript
 * // 基本的な検索
 * const result = await tweetEndpoint.searchTweets('investment education');
 * 
 * // 高度検索（日本語・地域限定）
 * const advancedResult = await tweetEndpoint.searchTweets('trading tips', {
 *   lang: 'ja',
 *   geocode: '35.6762,139.6503,100km', // 東京周辺100km
 *   since: '2025-01-01',
 *   maxResults: 50
 * });
 * ```
 * 
 * @since 2.0.0
 */
  async searchTweets(query: string, options?: AdvancedSearchOptions): Promise<CompleteSearchResponse> {
    // 統一バリデーション処理
    const queryValidation = this.validateSearchQuery(query);
    if (!queryValidation.isValid) {
      const errorMessage = `ツイート検索クエリバリデーションエラー: ${queryValidation.errors.join(', ')}`;
      const suggestions = queryValidation.suggestions?.join(', ') || '有効な検索キーワードを指定してください';
      throw createAPIError('validation', 'INVALID_SEARCH_QUERY', `${errorMessage}. 修正提案: ${suggestions}`);
    }

    // オプションバリデーション
    if (options) {
      const optionsValidation = this.validateSearchOptions(options);
      if (!optionsValidation.isValid) {
        const errorMessage = `検索オプションバリデーションエラー: ${optionsValidation.errors.join(', ')}`;
        const suggestions = optionsValidation.suggestions?.join(', ') || '有効なオプションを指定してください';
        throw createAPIError('validation', 'INVALID_SEARCH_OPTIONS', `${errorMessage}. 修正提案: ${suggestions}`);
      }
    }

    try {
      // APIキー認証の確認
      if (!this.authManager.isAuthenticated()) {
        throw createAPIError('authentication', 'NO_API_KEY', 'APIキーが設定されていません。KAITO_API_TOKENを磺認してください。');
      }
      
      // TwitterAPI.io公式仕様準拠パラメータ構築
      const params: Record<string, string | number | boolean> = { 
        query: query.trim(),
        queryType: "Latest"  // "Latest" または "Top" - 最新ツイートを取得
      };
      
      console.log(`🔍 検索パラメータ: query="${query.trim()}", queryType="Latest"`);
      
      // オプションパラメータの効率的設定
      if (options?.lang && this.SUPPORTED_LANGUAGES.includes(options.lang as any)) {
        params.lang = options.lang;
      }
      if (options?.locale) params.locale = options.locale;
      if (options?.geocode) params.geocode = options.geocode;
      if (options?.since) params.since_date = options.since;
      if (options?.until) params.until_date = options.until;
      if (options?.includeEntities) params.include_entities = options.includeEntities;
      if (options?.tweetMode) params.tweet_mode = options.tweetMode;

      const response = await this.httpClient.get<TwitterAPISearchResponse>(
        this.ENDPOINTS.searchTweets,
        params
      );

      // バッチ処理でパフォーマンス向上
      const tweets = response.data || response.statuses || response.tweets || [];
      const normalizedTweets = await this.batchNormalizeTweets(tweets);
      
      // 投資教育コンテンツのフィルタリング
      const filteredTweets = this.filterEducationalContent(normalizedTweets);

      const searchMetadata = {
        query,
        resultType: options?.tweetMode || 'mixed',
        executedAt: new Date().toISOString(),
        processedCount: normalizedTweets.length,
        filteredCount: filteredTweets.length
      };

      return {
        success: true,
        data: {
          tweets: filteredTweets,
          totalCount: response.meta?.result_count || response.search_metadata?.count || filteredTweets.length,
          searchMetadata
        },
        timestamp: new Date().toISOString(),
        pagination: {
          nextCursor: response.meta?.next_token || response.search_metadata?.next_results,
          hasMore: !!(response.meta?.next_token || response.search_metadata?.next_results),
          currentPage: 1,
          itemsPerPage: filteredTweets.length
        },
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      return this.handleTweetSearchError(error, 'searchTweets', { query, options });
    }
  }

  /**
   * 特定ツイート取得
   * 
   * @description 指定したツイートIDの詳細情報を取得します
   * エンゲージメントメトリクスやコンテキスト情報を含む完全なデータ
   * 
   * @param tweetId - 取得対象のツイートID（1-19桁の数値文字列）
   * @returns ツイートの詳細情報とメタデータ
   * 
   * @throws {Error} ツイートIDバリデーションエラー
   * @throws {Error} API認証・権限エラー
   * @throws {Error} ツイートが存在しない、またはアクセス不可エラー（404）
   * @throws {Error} レート制限エラー
   * 
   * @example
   * ```typescript
   * try {
   *   const result = await tweetEndpoint.getTweetById('1234567890123456789');
   *   if (result.success) {
   *     console.log(`Tweet: ${result.data.text}`);
   *     console.log(`Likes: ${result.data.public_metrics.like_count}`);
   *   }
   * } catch (error) {
   *   console.error('Failed to get tweet:', error.message);
   * }
   * ```
   * 
   * @since 2.0.0
   */
  async getTweetById(tweetId: string): Promise<CompleteTweetResponse> {
    // 統一バリデーション処理
    const validation = this.validateTweetId(tweetId);
    if (!validation.isValid) {
      const errorMessage = `ツイートIDバリデーシ̍5ンエラー: ${validation.errors.join(', ')}`;
      const suggestions = validation.suggestions?.join(', ') || '有効なツイートID形式: 1-19桁の数値文字列';
      throw createAPIError('validation', 'INVALID_TWEET_ID', `${errorMessage}. 修正提案: ${suggestions}`);
    }

    try {
      // APIキー認証の確認
      if (!this.authManager.isAuthenticated()) {
        throw createAPIError('authentication', 'NO_API_KEY', 'APIキーが設定されていません。KAITO_API_TOKENを確認してください。');
      }
      
      const response = await this.httpClient.get<TwitterAPITweetResponse>(
        this.ENDPOINTS.getTweet,
        { id: tweetId, tweet_mode: 'extended' }
      );

      const normalizedData = await this.normalizeTweetData(response);

      return {
        success: true,
        data: normalizedData,
        timestamp: new Date().toISOString(),
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
  async searchRecentTweets(query: string, options?: { count?: number; lang?: string }): Promise<CompleteSearchResponse> {
    const validation = this.validateSearchQuery(query);
    if (!validation.isValid) {
      throw new Error(`Invalid search query: ${validation.errors.join(', ')}`);
    }

    try {
      // APIキー認証の確認
      if (!this.authManager.isAuthenticated()) {
        throw createAPIError('authentication', 'NO_API_KEY', 'APIキーが設定されていません。KAITO_API_TOKENを確認してください。');
      }
      
      const params: any = { 
        q: query,
        count: Math.min(options?.count || 15, 100)
      };
      if (options?.lang) params.lang = options.lang;

      const response = await this.httpClient.get<TwitterAPISearchResponse>(
        this.ENDPOINTS.searchRecent,
        params
      );

      const normalizedTweets = await this.batchNormalizeTweets(
        response.statuses || response.tweets || []
      );

      return {
        success: true,
        data: {
          tweets: normalizedTweets,
          totalCount: normalizedTweets.length,
          searchMetadata: {
            query,
            resultType: 'recent',
            executedAt: new Date().toISOString(),
            processedCount: normalizedTweets.length
          }
        },
        timestamp: new Date().toISOString()
      };

    } catch (error: any) {
      throw this.handleAPIKeyError(error, 'searchRecentTweets');
    }
  }

  /**
   * 人気ツイート検索
   * APIキー認証のみで実行可能
   */
  async searchPopularTweets(query: string, options?: { count?: number; lang?: string }): Promise<CompleteSearchResponse> {
    const validation = this.validateSearchQuery(query);
    if (!validation.isValid) {
      throw new Error(`Invalid search query: ${validation.errors.join(', ')}`);
    }

    try {
      // APIキー認証の確認
      if (!this.authManager.isAuthenticated()) {
        throw createAPIError('authentication', 'NO_API_KEY', 'APIキーが設定されていません。KAITO_API_TOKENを確認してください。');
      }
      
      const params: any = { 
        q: query,
        count: Math.min(options?.count || 15, 100)
      };
      if (options?.lang) params.lang = options.lang;

      const response = await this.httpClient.get<TwitterAPISearchResponse>(
        this.ENDPOINTS.searchPopular,
        params
      );

      const normalizedTweets = await this.batchNormalizeTweets(
        response.statuses || response.tweets || []
      );

      return {
        success: true,
        data: {
          tweets: normalizedTweets,
          totalCount: normalizedTweets.length,
          searchMetadata: {
            query,
            resultType: 'popular',
            executedAt: new Date().toISOString(),
            processedCount: normalizedTweets.length
          }
        },
        timestamp: new Date().toISOString()
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

    // count validation removed - not part of AdvancedSearchOptions interface

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
    // デバッグ: 簡潔なデータ構造確認（開発時のみ）
    if (!this.hasLoggedTweetStructure && process.env.NODE_ENV === 'development') {
      console.log(`🔍 ツイートデータ取得: ID=${apiTweet.id}, 作者=${apiTweet.author?.userName || 'unknown'}`);
      this.hasLoggedTweetStructure = true;
    }
    
    // TwitterAPI.ioの実際の構造に基づく author_id 取得ロジック
    const authorId = apiTweet.author?.id ||           // TwitterAPI.ioの構造
                     apiTweet.user?.id_str || 
                     apiTweet.user?.id || 
                     apiTweet.author_id ||
                     apiTweet.user?.rest_id ||
                     apiTweet.authorId;
    
    return {
      id: apiTweet.id_str || apiTweet.id,
      text: apiTweet.full_text || apiTweet.text || '',
      created_at: this.safeDateToISO(apiTweet.createdAt || apiTweet.created_at, 'created_at'),
      author_id: authorId,
      public_metrics: {
        retweet_count: apiTweet.public_metrics?.retweet_count || apiTweet.retweet_count || 0,
        like_count: apiTweet.public_metrics?.like_count || apiTweet.favorite_count || 0,
        reply_count: apiTweet.public_metrics?.reply_count || apiTweet.reply_count || 0,
        quote_count: apiTweet.public_metrics?.quote_count || apiTweet.quote_count || 0,
        impression_count: apiTweet.public_metrics?.impression_count || 0
      },
      lang: apiTweet.lang || 'en',
      in_reply_to_user_id: apiTweet.in_reply_to_user_id_str,
      conversation_id: apiTweet.conversation_id_str
    };
  }

  /**
   * バッチツイート正規化（パフォーマンス向上）
   * 大量ツイート処理時のエラーハンドリング強化
   */
  private async batchNormalizeTweets(tweets: any[]): Promise<TweetData[]> {
    if (!Array.isArray(tweets) || tweets.length === 0) {
      return [];
    }

    const normalizedTweets: TweetData[] = [];
    
    for (const tweet of tweets) {
      try {
        const normalized = await this.normalizeTweetData(tweet);
        normalizedTweets.push(normalized);
      } catch (error) {
        console.warn('⚠️ Tweet normalization failed, skipping:', {
          tweetId: tweet?.id || tweet?.id_str || 'unknown',
          error: error instanceof Error ? error.message : String(error)
        });
        // エラーが発生したツイートはスキップして処理継続
      }
    }

    console.log(`✅ Batch normalization completed: ${normalizedTweets.length}/${tweets.length} tweets processed`);
    return normalizedTweets;
  }

  /**
   * 投資教育コンテンツフィルタリング
   * line 274で呼び出されるメソッド
   */
  private filterEducationalContent(tweets: TweetData[]): TweetData[] {
    return tweets.filter(tweet => {
      // 基本的な内容フィルタリング
      if (!tweet.text || tweet.text.length < 10) {
        return false;
      }
      
      // スパム的な内容の除外
      const spamPatterns = [
        /(.)\1{10,}/,  // 同じ文字の過度な繰り返し
        /^.{1,10}$/,   // 極端に短いツイート
      ];
      
      return !spamPatterns.some(pattern => pattern.test(tweet.text));
    });
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

  /**
   * ツイート検索エラーハンドリング
   */
  private handleTweetSearchError(error: any, operation: string, context: any): CompleteSearchResponse {
    console.error(`❌ ${operation} error:`, error);

    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = error.message || 'Unknown error occurred';

    if (error.status === 401) {
      errorCode = 'AUTHENTICATION_FAILED';
      errorMessage = 'API authentication failed';
    } else if (error.status === 429) {
      errorCode = 'RATE_LIMIT_EXCEEDED';
      errorMessage = 'Rate limit exceeded';
    } else if (error.status === 404) {
      errorCode = 'NOT_FOUND';
      errorMessage = 'Resource not found';
    }

    return {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        operation,
        context
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 安全な日時変換ヘルパー
   * TwitterAPI.ioからの様々な日時フォーマットに対応
   */
  private safeDateToISO(dateValue: any, context?: string): string {
    try {
      // null/undefined/空文字列の場合は現在時刻を使用
      if (!dateValue || dateValue === '') {
        // 警告頻度を制限（初回のみ詳細警告、以降は簡潔に）
        if (!this.hasLoggedEmptyDateWarning) {
          console.warn(`⚠️ TwitterAPI.ioレスポンスでcreatedAt/created_atフィールドが空です。現在時刻を使用します。`);
          console.warn(`📋 今後同様の警告は簡潔に表示されます。`);
          this.hasLoggedEmptyDateWarning = true;
        }
        return new Date().toISOString();
      }

      // 既にDateオブジェクトの場合
      if (dateValue instanceof Date) {
        if (isNaN(dateValue.getTime())) {
          console.warn('⚠️ Invalid Date object, using current time');
          return new Date().toISOString();
        }
        return dateValue.toISOString();
      }

      // 文字列の場合、一般的なTwitter日付形式を正規化
      if (typeof dateValue === 'string') {
        let normalizedDate = dateValue.trim();
        
        // Twitter API v1.1形式: "Wed Oct 10 20:19:24 +0000 2018"
        if (normalizedDate.match(/^\w{3} \w{3} \d{2} \d{2}:\d{2}:\d{2} [+-]\d{4} \d{4}$/)) {
          // この形式はnew Date()で直接パースできるはず
        }
        // ISO 8601形式の場合はそのまま使用
        else if (normalizedDate.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
          // そのまま使用
        }
        // その他の一般的な形式
        else if (normalizedDate.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
          normalizedDate = normalizedDate.replace(' ', 'T') + 'Z';
        }
        
        const date = new Date(normalizedDate);
        
        // 無効な日時の場合
        if (isNaN(date.getTime())) {
          console.warn(`⚠️ Invalid date format: "${dateValue}", using current time`);
          return new Date().toISOString();
        }
        
        return date.toISOString();
      }

      // 数値の場合（Unix timestamp）
      if (typeof dateValue === 'number') {
        // ミリ秒かどうか判定（Unix timestampは通常10桁）
        const timestamp = dateValue.toString().length === 10 ? dateValue * 1000 : dateValue;
        const date = new Date(timestamp);
        
        if (isNaN(date.getTime())) {
          console.warn(`⚠️ Invalid timestamp: ${dateValue}, using current time`);
          return new Date().toISOString();
        }
        
        return date.toISOString();
      }

      // その他の型は直接Dateコンストラクタに渡す
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        console.warn(`⚠️ Invalid date value: ${dateValue}, using current time`);
        return new Date().toISOString();
      }
      
      return date.toISOString();
      
    } catch (error) {
      console.error(`❌ Date parsing error for "${dateValue}":`, error);
      return new Date().toISOString();
    }
  }
}