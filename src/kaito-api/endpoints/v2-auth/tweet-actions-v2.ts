/**
 * V2 Tweet Actions Endpoint - V2ログイン認証専用
 * REQUIREMENTS.md準拠 - 高機能投稿・推奨API
 * 
 * 機能:
 * - V2投稿作成（/twitter/create_tweet_v2）
 * - 長文投稿・Note機能・高度オプション対応
 * - メディア付き投稿・投票機能
 * 
 * 認証レベル: V2ログイン認証（login_cookies必要）
 */

import { 
  TweetData,
  TweetResult,
  CreateTweetOptions,
  HttpClient,
  CreateTweetV2Response
} from '../../types';
import { V2LoginAuth } from '../../core/v2-login-auth';

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

interface TweetV2Response {
  success: boolean;
  data: {
    id: string;
    text: string;
    createdAt: Date;
    authorId: string;
    authorUsername: string;
    isNoteTweet: boolean;
    mediaAttachments?: MediaAttachment[];
    poll?: PollData;
  };
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface MediaAttachment {
  mediaId: string;
  type: 'photo' | 'video' | 'gif';
  url: string;
  altText?: string;
}

interface PollData {
  id: string;
  options: Array<{
    position: number;
    label: string;
    votes: number;
  }>;
  durationMinutes: number;
  endDatetime: Date;
  votingStatus: 'open' | 'closed';
}

// ============================================================================
// REQUEST OPTIONS
// ============================================================================

interface V2TweetOptions extends CreateTweetOptions {
  isNoteTweet?: boolean;
  noteTweetText?: string;
  mediaIds?: string[];
  altText?: Record<string, string>; // mediaId -> altText mapping
  pollOptions?: string[];
  pollDurationMinutes?: number;
  excludeReplyUserIds?: string[];
  replySettings?: 'everyone' | 'following' | 'mentioned_users';
  geo?: {
    placeId?: string;
    coordinates?: {
      longitude: number;
      latitude: number;
    };
  };
  quoteTweetId?: string;
  superFollowersOnly?: boolean;
  forSuperFollowersOnly?: boolean;
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
// TWEET ACTIONS V2 ENDPOINT CLASS
// ============================================================================

/**
 * TweetActionsV2Endpoint - V2認証ツイート操作クラス
 * 
 * V2ログイン認証（login_cookies）で実行可能な機能:
 * - 高機能ツイート作成・削除（長文対応）
 * - Note機能・メディア付き投稿
 * - 投票機能・高度な設定オプション
 * 
 * 推奨: 新規実装でのメインAPI
 */
export class TweetActionsV2Endpoint {
  private readonly ENDPOINTS = {
    createTweetV2: '/twitter/create_tweet_v2',
    deleteTweet: '/twitter/tweet/destroy_v2',
    updateTweet: '/twitter/tweet/update_v2'
  } as const;

  private readonly RATE_LIMITS = {
    createTweet: { limit: 300, window: 3600 }, // 300/hour (V2制限)
    deleteTweet: { limit: 300, window: 3600 }, // 300/hour
    updateTweet: { limit: 300, window: 3600 } // 300/hour
  } as const;

  private readonly VALIDATION_RULES = {
    tweetText: { 
      minLength: 1, 
      maxLength: 280, // 通常ツイート
      noteMaxLength: 25000 // Note機能の場合
    },
    tweetId: /^[0-9]+$/,
    mediaIds: { maxCount: 4 },
    pollOptions: { 
      minCount: 2, 
      maxCount: 4,
      maxLength: 25
    },
    pollDuration: { 
      min: 30, // 30秒
      max: 10080 // 7日間（分）
    },
    coordinates: {
      lat: { min: -90, max: 90 },
      long: { min: -180, max: 180 }
    }
  } as const;

  // 禁止コンテンツ検出パターン（V2強化版）
  private readonly FORBIDDEN_PATTERNS = [
    /spam|スパム/i,
    /fake news|フェイクニュース/i,
    /hate speech|ヘイトスピーチ/i,
    /harassment|嫌がらせ/i,
    /misinformation|誤情報/i,
    /impersonation|なりすまし/i
  ] as const;

  constructor(
    private httpClient: HttpClient,
    private v2Auth: V2LoginAuth
  ) {}

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * V2ツイート作成（高機能版）
   * login_cookies認証が必要
   */
  async createTweetV2(content: string, options?: V2TweetOptions): Promise<TweetV2Response> {
    // 入力バリデーション
    const validation = this.validateTweetContent(content, options?.isNoteTweet);
    if (!validation.isValid) {
      throw new Error(`Invalid tweet content: ${validation.errors.join(', ')}`);
    }

    // オプションバリデーション
    if (options) {
      const optionsValidation = this.validateTweetOptions(options);
      if (!optionsValidation.isValid) {
        throw new Error(`Invalid tweet options: ${optionsValidation.errors.join(', ')}`);
      }
    }

    // セキュリティチェック
    const securityCheck = this.performSecurityCheck(content);
    if (!securityCheck.isSafe) {
      throw new Error(`Security check failed: ${securityCheck.issues.join(', ')}`);
    }

    // V2認証クッキー取得・検証
    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      // リクエストペイロード構築
      const payload: any = {
        tweet_text: content,
        login_cookies: loginCookie,
        proxy: process.env.X_PROXY
      };

      // V2高機能オプション設定
      if (options?.isNoteTweet) {
        payload.is_note_tweet = true;
        if (options.noteTweetText) {
          payload.note_tweet_text = options.noteTweetText;
        }
      }

      if (options?.mediaIds?.length) {
        payload.media_ids = options.mediaIds;
        
        // メディアのalt-textを設定
        if (options.altText) {
          payload.media_alt_texts = options.altText;
        }
      }

      // 投票機能
      if (options?.pollOptions?.length) {
        payload.poll = {
          options: options.pollOptions,
          duration_minutes: options.pollDurationMinutes || 1440 // デフォルト24時間
        };
      }

      // 返信設定
      if (options?.replySettings) {
        payload.reply_settings = options.replySettings;
      }

      // 位置情報
      if (options?.geo) {
        payload.geo = options.geo;
      }

      // 引用ツイート
      if (options?.quoteTweetId) {
        payload.quote_tweet_id = options.quoteTweetId;
      }

      // SuperFollowers専用投稿
      if (options?.superFollowersOnly) {
        payload.for_super_followers_only = true;
      }

      // その他のオプション
      if (options?.excludeReplyUserIds?.length) {
        payload.exclude_reply_user_ids = options.excludeReplyUserIds;
      }

      // API呼び出し
      const response = await this.httpClient.post<CreateTweetV2Response>(
        this.ENDPOINTS.createTweetV2,
        payload
      );

      // レスポンス正規化
      const normalizedData = await this.normalizeTweetV2Response(response);

      return {
        success: true,
        data: normalizedData,
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'createTweetV2');
    }
  }

  /**
   * 長文投稿（Note機能）
   * login_cookies認証が必要
   */
  async createNoteTweet(content: string, options?: Omit<V2TweetOptions, 'isNoteTweet'>): Promise<TweetV2Response> {
    return this.createTweetV2(content, {
      ...options,
      isNoteTweet: true
    });
  }

  /**
   * メディア付き投稿
   * login_cookies認証が必要
   */
  async createTweetWithMedia(
    content: string, 
    mediaIds: string[], 
    altTexts?: Record<string, string>,
    options?: Omit<V2TweetOptions, 'mediaIds' | 'altText'>
  ): Promise<TweetV2Response> {
    return this.createTweetV2(content, {
      ...options,
      mediaIds,
      altText: altTexts
    });
  }

  /**
   * 投票付きツイート
   * login_cookies認証が必要
   */
  async createTweetWithPoll(
    content: string,
    pollOptions: string[],
    durationMinutes?: number,
    options?: Omit<V2TweetOptions, 'pollOptions' | 'pollDurationMinutes'>
  ): Promise<TweetV2Response> {
    return this.createTweetV2(content, {
      ...options,
      pollOptions,
      pollDurationMinutes: durationMinutes
    });
  }

  /**
   * ツイート削除（V2版）
   * login_cookies認証が必要
   */
  async deleteTweet(tweetId: string): Promise<{
    success: boolean;
    data: { deletedTweetId: string; deletedAt: Date };
  }> {
    const validation = this.validateTweetId(tweetId);
    if (!validation.isValid) {
      throw new Error(`Invalid tweetId: ${validation.errors.join(', ')}`);
    }

    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const payload = {
        tweet_id: tweetId,
        login_cookies: loginCookie,
        proxy: process.env.X_PROXY
      };

      await this.httpClient.post<any>(
        this.ENDPOINTS.deleteTweet,
        payload
      );

      return {
        success: true,
        data: {
          deletedTweetId: tweetId,
          deletedAt: new Date()
        }
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'deleteTweet');
    }
  }

  /**
   * SuperFollowers専用投稿
   * login_cookies認証が必要
   */
  async createSuperFollowersTweet(
    content: string, 
    options?: Omit<V2TweetOptions, 'superFollowersOnly'>
  ): Promise<TweetV2Response> {
    return this.createTweetV2(content, {
      ...options,
      superFollowersOnly: true
    });
  }

  // ============================================================================
  // PRIVATE METHODS - VALIDATION
  // ============================================================================

  private validateTweetContent(content: string, isNoteTweet?: boolean): ValidationResult {
    const errors: string[] = [];

    if (!content || typeof content !== 'string') {
      errors.push('Tweet content is required and must be a string');
      return { isValid: false, errors };
    }

    // 長さチェック
    const maxLength = isNoteTweet 
      ? this.VALIDATION_RULES.tweetText.noteMaxLength 
      : this.VALIDATION_RULES.tweetText.maxLength;

    if (content.length < this.VALIDATION_RULES.tweetText.minLength) {
      errors.push(`Tweet must be at least ${this.VALIDATION_RULES.tweetText.minLength} characters`);
    } else if (content.length > maxLength) {
      errors.push(`Tweet exceeds ${maxLength} character limit`);
    }

    // 空白のみチェック
    if (content.trim().length === 0) {
      errors.push('Tweet cannot be empty or contain only whitespace');
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

  private validateTweetOptions(options: V2TweetOptions): ValidationResult {
    const errors: string[] = [];

    // メディアID制限
    if (options.mediaIds?.length && options.mediaIds.length > this.VALIDATION_RULES.mediaIds.maxCount) {
      errors.push(`Cannot attach more than ${this.VALIDATION_RULES.mediaIds.maxCount} media items`);
    }

    // 投票オプション検証
    if (options.pollOptions) {
      if (options.pollOptions.length < this.VALIDATION_RULES.pollOptions.minCount || 
          options.pollOptions.length > this.VALIDATION_RULES.pollOptions.maxCount) {
        errors.push(`Poll must have ${this.VALIDATION_RULES.pollOptions.minCount}-${this.VALIDATION_RULES.pollOptions.maxCount} options`);
      }

      for (const option of options.pollOptions) {
        if (option.length > this.VALIDATION_RULES.pollOptions.maxLength) {
          errors.push(`Poll option exceeds ${this.VALIDATION_RULES.pollOptions.maxLength} characters`);
        }
      }
    }

    // 投票期間検証
    if (options.pollDurationMinutes) {
      if (options.pollDurationMinutes < this.VALIDATION_RULES.pollDuration.min || 
          options.pollDurationMinutes > this.VALIDATION_RULES.pollDuration.max) {
        errors.push(`Poll duration must be ${this.VALIDATION_RULES.pollDuration.min}-${this.VALIDATION_RULES.pollDuration.max} minutes`);
      }
    }

    // 座標検証
    if (options.geo?.coordinates) {
      const { latitude, longitude } = options.geo.coordinates;
      if (latitude < this.VALIDATION_RULES.coordinates.lat.min || 
          latitude > this.VALIDATION_RULES.coordinates.lat.max) {
        errors.push('Invalid latitude coordinates');
      }
      if (longitude < this.VALIDATION_RULES.coordinates.long.min || 
          longitude > this.VALIDATION_RULES.coordinates.long.max) {
        errors.push('Invalid longitude coordinates');
      }
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

    // 過度なメンション検出（V2では制限緩和）
    const mentions = content.match(/@[a-zA-Z0-9_]+/g) || [];
    if (mentions.length > 50) { // V2では50まで許可
      issues.push('Excessive mentions detected (spam-like behavior)');
    }

    // 同一文字の過度な繰り返し
    if (/(.)\1{15,}/.test(content)) {
      issues.push('Excessive character repetition detected');
    }

    // URL数制限
    const urls = content.match(/https?:\/\/\S+/g) || [];
    if (urls.length > 10) {
      issues.push('Excessive URLs detected (spam-like behavior)');
    }

    return { isSafe: issues.length === 0, issues };
  }

  // ============================================================================
  // PRIVATE METHODS - DATA NORMALIZATION
  // ============================================================================

  private async normalizeTweetV2Response(apiResponse: any): Promise<{
    id: string;
    text: string;
    createdAt: Date;
    authorId: string;
    authorUsername: string;
    isNoteTweet: boolean;
    mediaAttachments?: MediaAttachment[];
    poll?: PollData;
  }> {
    const data = {
      id: apiResponse.data?.id || apiResponse.id_str || apiResponse.id,
      text: apiResponse.data?.text || apiResponse.full_text || apiResponse.text || '',
      createdAt: new Date(apiResponse.data?.created_at || apiResponse.created_at || Date.now()),
      authorId: apiResponse.data?.author_id || apiResponse.user?.id_str || '',
      authorUsername: apiResponse.data?.author_username || apiResponse.user?.screen_name || '',
      isNoteTweet: apiResponse.data?.note_tweet || apiResponse.is_note_tweet || false
    };

    // メディア添付ファイル
    if (apiResponse.includes?.media?.length) {
      data.mediaAttachments = apiResponse.includes.media.map((media: any): MediaAttachment => ({
        mediaId: media.media_key || media.id_str,
        type: media.type || 'photo',
        url: media.url || media.media_url_https,
        altText: media.alt_text
      }));
    }

    // 投票データ
    if (apiResponse.includes?.polls?.length) {
      const poll = apiResponse.includes.polls[0];
      data.poll = {
        id: poll.id,
        options: poll.options.map((option: any, index: number) => ({
          position: index + 1,
          label: option.label,
          votes: option.votes || 0
        })),
        durationMinutes: poll.duration_minutes,
        endDatetime: new Date(poll.end_datetime),
        votingStatus: poll.voting_status
      };
    }

    return data;
  }

  // ============================================================================
  // PRIVATE METHODS - ERROR HANDLING
  // ============================================================================

  private handleV2AuthError(error: any, operation: string): never {
    // V2認証特有のエラー処理
    if (error.message?.includes('login_cookie')) {
      throw new Error(`V2 session expired or invalid - re-authentication required for operation: ${operation}`);
    }
    
    if (error.status === 401) {
      throw new Error(`V2 authentication failed for operation: ${operation}`);
    }
    
    if (error.status === 403) {
      throw new Error(`V2 operation forbidden - check account permissions: ${operation}`);
    }
    
    if (error.status === 429) {
      throw new Error(`V2 rate limit exceeded for operation: ${operation}. Please wait before retrying.`);
    }

    if (error.status === 422) {
      throw new Error(`Invalid tweet parameters for V2 operation: ${operation}`);
    }

    // V2特有のエラー
    if (error.message?.includes('tweet_text too long')) {
      throw new Error(`Tweet text exceeds character limit for V2 API: ${operation}`);
    }

    if (error.message?.includes('duplicate content')) {
      throw new Error(`Duplicate tweet content detected for V2 operation: ${operation}`);
    }

    if (error.message?.includes('media not found')) {
      throw new Error(`Media files not found or expired for V2 operation: ${operation}`);
    }

    if (error.message?.includes('poll invalid')) {
      throw new Error(`Invalid poll configuration for V2 operation: ${operation}`);
    }

    if (error.status === 400) {
      throw new Error(`Bad request for V2 operation: ${operation}. Check input parameters.`);
    }

    // その他のエラー
    throw new Error(`V2 API error in ${operation}: ${error.message || 'Unknown error'}`);
  }
}