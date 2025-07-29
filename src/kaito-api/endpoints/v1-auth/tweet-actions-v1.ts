/**
 * V1 Tweet Actions Endpoint - V1ログイン認証専用
 * REQUIREMENTS.md準拠 - 標準投稿・非推奨API
 * 
 * 機能:
 * - V1投稿作成（/twitter/create_tweet）
 * - ツイート削除
 * - 280文字制限・基本投稿のみ
 * 
 * 認証レベル: V1ログイン認証（auth_session必要）
 */

import { 
  PostRequest,
  PostResponse,
  DeleteTweetResult,
  HttpClient,
  TwitterAPITweetResponse,
  TweetCreateResponse
} from '../../types';
import { V1LoginAuth } from '../../core/v1-login-auth';

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

interface TweetCreateV1Response {
  success: boolean;
  data: {
    id: string;
    text: string;
    createdAt: Date;
    authorId: string;
    authorUsername: string;
  };
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface TweetDeleteResponse {
  success: boolean;
  data: {
    deletedTweetId: string;
    deletedAt: Date;
  };
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

// ============================================================================
// REQUEST OPTIONS
// ============================================================================

interface CreateTweetV1Options {
  inReplyTo?: string;
  mediaIds?: string[];
  lat?: number;
  long?: number;
  placeId?: string;
  trimUser?: boolean;
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
// TWEET ACTIONS V1 ENDPOINT CLASS
// ============================================================================

/**
 * TweetActionsV1Endpoint - V1認証ツイート操作クラス
 * 
 * V1ログイン認証（auth_session）で実行可能な機能:
 * - 基本ツイート作成・削除（280文字制限）
 * - リプライ投稿
 * - メディア付き投稿（制限あり）
 * 
 * 注意: 非推奨API。新規実装ではV2エンドポイント使用を推奨
 */
export class TweetActionsV1Endpoint {
  private readonly ENDPOINTS = {
    createTweet: '/twitter/create_tweet',
    deleteTweet: '/twitter/tweet/destroy',
    updateStatus: '/twitter/statuses/update'
  } as const;

  private readonly RATE_LIMITS = {
    createTweet: { limit: 300, window: 3600 }, // 300/hour (V1制限)
    deleteTweet: { limit: 300, window: 3600 }, // 300/hour
    updateStatus: { limit: 300, window: 3600 } // 300/hour
  } as const;

  private readonly VALIDATION_RULES = {
    tweetText: { 
      minLength: 1, 
      maxLength: 280, // V1の厳格な制限
      urlLength: 23 // Twitter短縮URL長
    },
    tweetId: /^[0-9]+$/,
    mediaIds: { maxCount: 4 },
    coordinates: {
      lat: { min: -90, max: 90 },
      long: { min: -180, max: 180 }
    }
  } as const;

  // 禁止コンテンツ検出パターン
  private readonly FORBIDDEN_PATTERNS = [
    /spam|スパム/i,
    /fake news|フェイクニュース/i,
    /hate speech|ヘイトスピーチ/i,
    /harassment|嫌がらせ/i,
    /@[a-zA-Z0-9_]{1,15}\s*(die|死ね|殺す)/i
  ] as const;

  constructor(
    private httpClient: HttpClient,
    private v1Auth: V1LoginAuth
  ) {}

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * V1ツイート作成
   * auth_session認証が必要
   */
  async createTweet(content: string, options?: CreateTweetV1Options): Promise<TweetCreateV1Response> {
    // 入力バリデーション
    const validation = this.validateTweetContent(content);
    if (!validation.isValid) {
      throw new Error(`Invalid tweet content: ${validation.errors.join(', ')}`);
    }

    // セキュリティチェック
    const securityCheck = this.performSecurityCheck(content);
    if (!securityCheck.isSafe) {
      throw new Error(`Security check failed: ${securityCheck.issues.join(', ')}`);
    }

    // V1認証セッション取得・検証
    const authSession = await this.v1Auth.getValidSession();
    if (!authSession) {
      throw new Error('V1 authentication required - auth_session not available');
    }

    try {
      // リクエストペイロード構築
      const payload: any = {
        text: content,
        auth_session: authSession,
        proxy: process.env.X_PROXY
      };

      // オプション設定
      if (options?.inReplyTo) payload.in_reply_to_status_id = options.inReplyTo;
      if (options?.mediaIds?.length) payload.media_ids = options.mediaIds.join(',');
      if (options?.lat && options?.long) {
        payload.lat = options.lat;
        payload.long = options.long;
      }
      if (options?.placeId) payload.place_id = options.placeId;
      if (options?.trimUser) payload.trim_user = options.trimUser;

      // API呼び出し
      const response = await this.httpClient.post<TwitterAPITweetResponse>(
        this.ENDPOINTS.createTweet,
        payload
      );

      // レスポンス正規化
      const normalizedData = await this.normalizeTweetResponse(response);

      return {
        success: true,
        data: normalizedData,
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV1AuthError(error, 'createTweet');
    }
  }

  /**
   * ツイート削除
   * auth_session認証が必要
   */
  async deleteTweet(tweetId: string): Promise<TweetDeleteResponse> {
    // 入力バリデーション
    const validation = this.validateTweetId(tweetId);
    if (!validation.isValid) {
      throw new Error(`Invalid tweetId: ${validation.errors.join(', ')}`);
    }

    // V1認証セッション取得・検証
    const authSession = await this.v1Auth.getValidSession();
    if (!authSession) {
      throw new Error('V1 authentication required - auth_session not available');
    }

    try {
      const payload = {
        id: tweetId,
        auth_session: authSession,
        proxy: process.env.X_PROXY
      };

      const response = await this.httpClient.post<any>(
        this.ENDPOINTS.deleteTweet,
        payload
      );

      return {
        success: true,
        data: {
          deletedTweetId: tweetId,
          deletedAt: new Date()
        },
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV1AuthError(error, 'deleteTweet');
    }
  }

  /**
   * リプライツイート作成
   * auth_session認証が必要
   */
  async createReply(content: string, inReplyToTweetId: string, options?: { mediaIds?: string[] }): Promise<TweetCreateV1Response> {
    // 入力バリデーション
    const contentValidation = this.validateTweetContent(content);
    const tweetIdValidation = this.validateTweetId(inReplyToTweetId);
    
    if (!contentValidation.isValid) {
      throw new Error(`Invalid reply content: ${contentValidation.errors.join(', ')}`);
    }
    if (!tweetIdValidation.isValid) {
      throw new Error(`Invalid reply target tweetId: ${tweetIdValidation.errors.join(', ')}`);
    }

    return this.createTweet(content, {
      inReplyTo: inReplyToTweetId,
      mediaIds: options?.mediaIds
    });
  }

  /**
   * ステータス更新（旧API互換）
   * auth_session認証が必要
   */
  async updateStatus(status: string, options?: { inReplyTo?: string }): Promise<TweetCreateV1Response> {
    // 旧TwitterAPI v1.1互換メソッド
    return this.createTweet(status, {
      inReplyTo: options?.inReplyTo
    });
  }

  // ============================================================================
  // PRIVATE METHODS - VALIDATION
  // ============================================================================

  private validateTweetContent(content: string): ValidationResult {
    const errors: string[] = [];

    if (!content || typeof content !== 'string') {
      errors.push('Tweet content is required and must be a string');
      return { isValid: false, errors };
    }

    // 長さチェック
    if (content.length < this.VALIDATION_RULES.tweetText.minLength) {
      errors.push(`Tweet must be at least ${this.VALIDATION_RULES.tweetText.minLength} characters`);
    } else if (content.length > this.VALIDATION_RULES.tweetText.maxLength) {
      errors.push(`Tweet exceeds ${this.VALIDATION_RULES.tweetText.maxLength} character limit`);
    }

    // 空白のみチェック
    if (content.trim().length === 0) {
      errors.push('Tweet cannot be empty or contain only whitespace');
    }

    // URL長考慮（簡易計算）
    const urlCount = (content.match(/https?:\/\/\S+/g) || []).length;
    const adjustedLength = content.length - (urlCount * (this.VALIDATION_RULES.tweetText.urlLength - 10));
    if (adjustedLength > this.VALIDATION_RULES.tweetText.maxLength) {
      errors.push('Tweet exceeds character limit when URLs are counted');
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

  // ============================================================================
  // PRIVATE METHODS - SECURITY
  // ============================================================================

  private performSecurityCheck(content: string): SecurityCheckResult {
    const issues: string[] = [];

    // 禁止コンテンツパターンチェック
    for (const pattern of this.FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) {
        issues.push('Content contains potentially harmful patterns');
        break;
      }
    }

    // 過度なメンション検出
    const mentions = content.match(/@[a-zA-Z0-9_]+/g) || [];
    if (mentions.length > 10) {
      issues.push('Excessive mentions detected (spam-like behavior)');
    }

    // 同一文字の過度な繰り返し
    if (/(.)\1{10,}/.test(content)) {
      issues.push('Excessive character repetition detected');
    }

    return { isSafe: issues.length === 0, issues };
  }

  // ============================================================================
  // PRIVATE METHODS - DATA NORMALIZATION
  // ============================================================================

  private async normalizeTweetResponse(apiResponse: any): Promise<{
    id: string;
    text: string;
    createdAt: Date;
    authorId: string;
    authorUsername: string;
  }> {
    return {
      id: apiResponse.id_str || apiResponse.id,
      text: apiResponse.full_text || apiResponse.text || '',
      createdAt: new Date(apiResponse.created_at || Date.now()),
      authorId: apiResponse.user?.id_str || apiResponse.author_id || '',
      authorUsername: apiResponse.user?.screen_name || apiResponse.author_username || ''
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

    if (error.status === 422) {
      throw new Error(`Invalid tweet parameters for V1 operation: ${operation}`);
    }

    if (error.status === 400) {
      throw new Error(`Bad request for V1 operation: ${operation}. Check input parameters.`);
    }

    // 文字数制限エラー
    if (error.message?.includes('status is over 280 characters') || 
        error.message?.includes('Your Tweet was over the character limit')) {
      throw new Error(`Tweet exceeds 280 character limit for V1 API: ${operation}`);
    }

    // 重複投稿エラー
    if (error.message?.includes('Status is a duplicate') || 
        error.message?.includes('duplicate')) {
      throw new Error(`Duplicate tweet detected for V1 operation: ${operation}`);
    }

    // その他のエラー
    throw new Error(`V1 API error in ${operation}: ${error.message || 'Unknown error'}`);
  }
}