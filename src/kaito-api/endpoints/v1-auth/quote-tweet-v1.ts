/**
 * V1 Quote Tweet Endpoint - V1ログイン認証専用
 * REQUIREMENTS.md準拠 - 引用ツイート・コメント付きRT・非推奨API
 * 
 * 機能:
 * - V1引用ツイート・コメント付きRT
 * - 引用ツイート削除
 * - 引用ツイート検索・取得
 * 
 * 認証レベル: V1ログイン認証（auth_session必要）
 */

import { 
  QuoteResult,
  TweetData,
  HttpClient,
  TwitterAPITweetResponse
} from '../../types';
import { V1LoginAuth } from '../../core/v1-login-auth';

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

interface QuoteTweetResponse {
  success: boolean;
  data: {
    quoteTweetId: string;
    originalTweetId: string;
    text: string;
    authorId: string;
    authorUsername: string;
    createdAt: Date;
    originalTweet?: {
      id: string;
      text: string;
      authorUsername: string;
    };
  };
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface QuoteSearchResponse {
  success: boolean;
  data: {
    quotes: TweetData[];
    originalTweetId: string;
    totalCount: number;
  };
  pagination?: {
    nextCursor?: string;
    hasMore: boolean;
  };
}

// ============================================================================
// REQUEST OPTIONS
// ============================================================================

interface QuoteTweetOptions {
  attachmentUrl?: string;
  mediaIds?: string[];
  lat?: number;
  long?: number;
  placeId?: string;
  trimUser?: boolean;
  autoPopulateReplyMetadata?: boolean;
}

interface QuoteSearchOptions {
  count?: number;
  resultType?: 'recent' | 'popular' | 'mixed';
  lang?: string;
  includeEntities?: boolean;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface SecurityCheckResult {
  isSafe: boolean;
  issues: string[];
}

// ============================================================================
// QUOTE TWEET V1 ENDPOINT CLASS
// ============================================================================

/**
 * QuoteTweetV1Endpoint - V1認証引用ツイート操作クラス
 * 
 * V1ログイン認証（auth_session）で実行可能な機能:
 * - 引用ツイート作成・削除
 * - コメント付きリツイート機能
 * - 引用ツイート検索・一覧取得
 * 
 * 注意: 非推奨API。新規実装ではV2エンドポイント使用を推奨
 */
export class QuoteTweetV1Endpoint {
  private readonly ENDPOINTS = {
    createQuoteTweet: '/twitter/create_tweet',
    deleteQuoteTweet: '/twitter/tweet/destroy',
    searchQuotes: '/twitter/tweet/search',
    getQuoteTweet: '/twitter/tweet/info'
  } as const;

  private readonly RATE_LIMITS = {
    createQuote: { limit: 300, window: 3600 }, // 300/hour (V1制限)
    deleteQuote: { limit: 300, window: 3600 }, // 300/hour
    searchQuotes: { limit: 450, window: 3600 } // 450/hour
  } as const;

  private readonly VALIDATION_RULES = {
    quoteText: { 
      minLength: 0, // 引用のみも許可
      maxLength: 280, // 引用URLを含む総文字数制限
      urlLength: 23 // Twitter短縮URL長
    },
    tweetId: /^[0-9]+$/,
    maxMediaIds: 4,
    coordinates: {
      lat: { min: -90, max: 90 },
      long: { min: -180, max: 180 }
    }
  } as const;

  // 禁止コンテンツ検出パターン（引用ツイート用）
  private readonly FORBIDDEN_PATTERNS = [
    /spam|スパム/i,
    /fake news|フェイクニュース/i,
    /harassment|嫌がらせ/i,
    /hate speech|ヘイトスピーチ/i,
    /quote spam|引用スパム/i
  ] as const;

  constructor(
    private httpClient: HttpClient,
    private v1Auth: V1LoginAuth
  ) {}

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * 引用ツイート作成
   * auth_session認証が必要
   */
  async createQuoteTweet(
    originalTweetId: string,
    comment: string = '',
    options?: QuoteTweetOptions
  ): Promise<QuoteTweetResponse> {
    // 入力バリデーション
    const tweetIdValidation = this.validateTweetId(originalTweetId);
    if (!tweetIdValidation.isValid) {
      throw new Error(`Invalid originalTweetId: ${tweetIdValidation.errors.join(', ')}`);
    }

    const textValidation = this.validateQuoteText(comment, originalTweetId);
    if (!textValidation.isValid) {
      throw new Error(`Invalid quote comment: ${textValidation.errors.join(', ')}`);
    }

    // セキュリティチェック
    if (comment.trim()) {
      const securityCheck = this.performSecurityCheck(comment);
      if (!securityCheck.isSafe) {
        throw new Error(`Security check failed: ${securityCheck.issues.join(', ')}`);
      }
    }

    // V1認証セッション取得・検証
    const authSession = await this.v1Auth.getValidSession();
    if (!authSession) {
      throw new Error('V1 authentication required - auth_session not available');
    }

    try {
      // 引用URLを構築
      const quoteUrl = `https://twitter.com/i/status/${originalTweetId}`;
      const fullText = comment.trim() ? `${comment.trim()} ${quoteUrl}` : quoteUrl;

      // リクエストペイロード構築
      const payload: any = {
        text: fullText,
        auth_session: authSession,
        proxy: process.env.X_PROXY
      };

      // オプション設定
      if (options?.mediaIds?.length) payload.media_ids = options.mediaIds.join(',');
      if (options?.lat && options?.long) {
        payload.lat = options.lat;
        payload.long = options.long;
      }
      if (options?.placeId) payload.place_id = options.placeId;
      if (options?.trimUser) payload.trim_user = options.trimUser;
      if (options?.autoPopulateReplyMetadata) {
        payload.auto_populate_reply_metadata = options.autoPopulateReplyMetadata;
      }

      // API呼び出し
      const response = await this.httpClient.post<TwitterAPITweetResponse>(
        this.ENDPOINTS.createQuoteTweet,
        payload
      );

      // レスポンス正規化
      const normalizedData = await this.normalizeQuoteTweetResponse(response, originalTweetId);

      return {
        success: true,
        data: normalizedData,
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV1AuthError(error, 'createQuoteTweet');
    }
  }

  /**
   * コメントなし引用ツイート（純粋なリツイート風）
   * auth_session認証が必要
   */
  async quoteWithoutComment(originalTweetId: string, options?: QuoteTweetOptions): Promise<QuoteTweetResponse> {
    return this.createQuoteTweet(originalTweetId, '', options);
  }

  /**
   * 引用ツイート削除
   * auth_session認証が必要
   */
  async deleteQuoteTweet(quoteTweetId: string): Promise<{
    success: boolean;
    data: { deletedQuoteTweetId: string; deletedAt: Date };
  }> {
    const validation = this.validateTweetId(quoteTweetId);
    if (!validation.isValid) {
      throw new Error(`Invalid quoteTweetId: ${validation.errors.join(', ')}`);
    }

    const authSession = await this.v1Auth.getValidSession();
    if (!authSession) {
      throw new Error('V1 authentication required - auth_session not available');
    }

    try {
      const payload = {
        id: quoteTweetId,
        auth_session: authSession,
        proxy: process.env.X_PROXY
      };

      await this.httpClient.post<any>(
        this.ENDPOINTS.deleteQuoteTweet,
        payload
      );

      return {
        success: true,
        data: {
          deletedQuoteTweetId: quoteTweetId,
          deletedAt: new Date()
        }
      };

    } catch (error: any) {
      throw this.handleV1AuthError(error, 'deleteQuoteTweet');
    }
  }

  /**
   * 特定ツイートの引用ツイート検索
   * auth_session認証が必要（検索機能）
   */
  async searchQuoteTweets(
    originalTweetId: string, 
    options?: QuoteSearchOptions
  ): Promise<QuoteSearchResponse> {
    const validation = this.validateTweetId(originalTweetId);
    if (!validation.isValid) {
      throw new Error(`Invalid originalTweetId: ${validation.errors.join(', ')}`);
    }

    const authSession = await this.v1Auth.getValidSession();
    if (!authSession) {
      throw new Error('V1 authentication required - auth_session not available');
    }

    try {
      // 引用ツイート検索クエリ構築
      const searchQuery = `url:twitter.com/i/status/${originalTweetId}`;
      
      const params: any = {
        q: searchQuery,
        count: Math.min(options?.count || 15, 100),
        result_type: options?.resultType || 'mixed',
        auth_session: authSession
      };

      if (options?.lang) params.lang = options.lang;
      if (options?.includeEntities) params.include_entities = options.includeEntities;

      const response = await this.httpClient.get<any>(
        this.ENDPOINTS.searchQuotes,
        params
      );

      // レスポンス正規化
      const quotes = await Promise.all(
        (response.statuses || response.tweets || []).map((tweet: any) => 
          this.normalizeTweetData(tweet)
        )
      );

      return {
        success: true,
        data: {
          quotes,
          originalTweetId,
          totalCount: quotes.length
        },
        pagination: {
          nextCursor: response.search_metadata?.next_results,
          hasMore: !!response.search_metadata?.next_results
        }
      };

    } catch (error: any) {
      throw this.handleV1AuthError(error, 'searchQuoteTweets');
    }
  }

  /**
   * 引用ツイート詳細取得
   * auth_session認証が必要
   */
  async getQuoteTweetDetails(quoteTweetId: string): Promise<{
    success: boolean;
    data: TweetData & { quotedTweet?: TweetData };
  }> {
    const validation = this.validateTweetId(quoteTweetId);
    if (!validation.isValid) {
      throw new Error(`Invalid quoteTweetId: ${validation.errors.join(', ')}`);
    }

    const authSession = await this.v1Auth.getValidSession();
    if (!authSession) {
      throw new Error('V1 authentication required - auth_session not available');
    }

    try {
      const response = await this.httpClient.get<TwitterAPITweetResponse>(
        this.ENDPOINTS.getQuoteTweet,
        { 
          id: quoteTweetId,
          include_entities: true,
          tweet_mode: 'extended',
          auth_session: authSession
        }
      );

      const normalizedTweet = await this.normalizeTweetData(response);
      
      // 引用されたツイート情報も含める
      let quotedTweet;
      if (response.quoted_status) {
        quotedTweet = await this.normalizeTweetData(response.quoted_status);
      }

      return {
        success: true,
        data: {
          ...normalizedTweet,
          quotedTweet
        }
      };

    } catch (error: any) {
      throw this.handleV1AuthError(error, 'getQuoteTweetDetails');
    }
  }

  // ============================================================================
  // PRIVATE METHODS - VALIDATION
  // ============================================================================

  private validateTweetId(tweetId: string): ValidationResult {
    const errors: string[] = [];

    if (!tweetId || typeof tweetId !== 'string') {
      errors.push('tweetId is required and must be a string');
    } else if (!this.VALIDATION_RULES.tweetId.test(tweetId)) {
      errors.push('tweetId must be numeric');
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateQuoteText(text: string, originalTweetId: string): ValidationResult {
    const errors: string[] = [];

    if (typeof text !== 'string') {
      errors.push('Quote text must be a string');
      return { isValid: false, errors };
    }

    // 引用URLを含む総文字数チェック
    const quoteUrl = `https://twitter.com/i/status/${originalTweetId}`;
    const fullText = text.trim() ? `${text.trim()} ${quoteUrl}` : quoteUrl;
    
    if (fullText.length > this.VALIDATION_RULES.quoteText.maxLength) {
      errors.push(`Quote tweet exceeds ${this.VALIDATION_RULES.quoteText.maxLength} character limit including URL`);
    }

    // コメント部分の長さチェック（URLを除く）
    if (text.length > this.VALIDATION_RULES.quoteText.maxLength - this.VALIDATION_RULES.quoteText.urlLength - 1) {
      errors.push('Quote comment is too long when URL length is considered');
    }

    return { isValid: errors.length === 0, errors };
  }

  // ============================================================================
  // PRIVATE METHODS - SECURITY
  // ============================================================================

  private performSecurityCheck(content: string): SecurityCheckResult {
    const issues: string[] = [];

    // 禁止コンテンツパターンチェック
    for (const pattern of this.FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) {
        issues.push('Quote content contains potentially harmful patterns');
        break;
      }
    }

    // 過度なメンション検出
    const mentions = content.match(/@[a-zA-Z0-9_]+/g) || [];
    if (mentions.length > 5) {
      issues.push('Excessive mentions in quote tweet (spam-like behavior)');
    }

    // 同一文字の過度な繰り返し
    if (/(.)\1{8,}/.test(content)) {
      issues.push('Excessive character repetition in quote tweet');
    }

    return { isSafe: issues.length === 0, issues };
  }

  // ============================================================================
  // PRIVATE METHODS - DATA NORMALIZATION
  // ============================================================================

  private async normalizeQuoteTweetResponse(apiResponse: any, originalTweetId: string): Promise<{
    quoteTweetId: string;
    originalTweetId: string;
    text: string;
    authorId: string;
    authorUsername: string;
    createdAt: Date;
    originalTweet?: {
      id: string;
      text: string;
      authorUsername: string;
    };
  }> {
    const data = {
      quoteTweetId: apiResponse.id_str || apiResponse.id,
      originalTweetId,
      text: apiResponse.full_text || apiResponse.text || '',
      authorId: apiResponse.user?.id_str || apiResponse.author_id || '',
      authorUsername: apiResponse.user?.screen_name || apiResponse.author_username || '',
      createdAt: new Date(apiResponse.created_at || Date.now())
    };

    // 引用元ツイート情報
    if (apiResponse.quoted_status) {
      data.originalTweet = {
        id: apiResponse.quoted_status.id_str || apiResponse.quoted_status.id,
        text: apiResponse.quoted_status.full_text || apiResponse.quoted_status.text || '',
        authorUsername: apiResponse.quoted_status.user?.screen_name || ''
      };
    }

    return data;
  }

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
      isQuoteTweet: !!apiTweet.is_quote_status || !!apiTweet.quoted_status,
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

  private handleV1AuthError(error: any, operation: string): never {
    // V1認証特有のエラー処理
    if (error.message?.includes('auth_session')) {
      throw new Error(`V1 session expired or invalid - re-authentication required for operation: ${operation}`);
    }
    
    if (error.status === 401) {
      throw new Error(`V1 authentication failed for operation: ${operation}`);
    }
    
    if (error.status === 403) {
      throw new Error(`V1 operation forbidden - check account permissions: ${operation}`);
    }
    
    if (error.status === 429) {
      throw new Error(`V1 rate limit exceeded for operation: ${operation}. Please wait before retrying.`);
    }

    // 引用ツイート特有のエラー
    if (error.message?.includes('duplicate')) {
      throw new Error(`Duplicate quote tweet detected: ${operation}`);
    }

    if (error.message?.includes('status is over 280 characters')) {
      throw new Error(`Quote tweet exceeds character limit: ${operation}`);
    }

    if (error.message?.includes('quoted tweet not found')) {
      throw new Error(`Original tweet not found or unavailable for quoting: ${operation}`);
    }

    if (error.message?.includes('cannot quote protected')) {
      throw new Error(`Cannot quote protected tweets: ${operation}`);
    }

    if (error.status === 404) {
      throw new Error(`Tweet not found for quote operation: ${operation}`);
    }

    // その他のエラー
    throw new Error(`V1 quote tweet API error in ${operation}: ${error.message || 'Unknown error'}`);
  }
}