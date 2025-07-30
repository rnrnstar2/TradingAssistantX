/**
 * Authenticated Tweet Management Endpoint
 * V2ログイン認証が必要な投稿管理機能
 * REQUIREMENTS.md準拠
 */

import { 
  PostRequest, 
  PostResponse, 
  DeleteTweetResult,
  HttpClient,
  CreateTweetV2Response
} from '../../utils/types';
import { AuthManager } from '../../core/auth-manager';

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
// TWEET MANAGEMENT CLASS
// ============================================================================

/**
 * TweetManagement - 認証必須ツイート管理クラス
 * 
 * V2ログイン認証（login_cookie）が必要な機能:
 * - ツイートの作成
 * - ツイートの削除
 * - 高度な投稿オプション（メディア付き投稿など）
 */
export class TweetManagement {
  private readonly ENDPOINTS = {
    createTweet: '/twitter/create_tweet_v2',
    deleteTweet: '/twitter/delete_tweet_v2'
  } as const;

  private readonly RATE_LIMITS = {
    posting: { limit: 300, window: 3600 }, // 300/hour
    deletion: { limit: 50, window: 3600 }  // 50/hour
  } as const;

  private readonly VALIDATION_RULES = {
    tweetContent: { minLength: 1, maxLength: 280 },
    mediaIds: { maxCount: 4 },
    tweetId: /^\d{1,19}$/
  } as const;

  constructor(
    private httpClient: HttpClient,
    private authManager: AuthManager
  ) {
    console.log('✅ TweetManagement initialized with V2 authentication');
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * ツイート作成
   * V2ログイン認証（login_cookie）必須
   */
  async createTweet(request: PostRequest): Promise<PostResponse> {
    // 入力バリデーション
    const validation = this.validatePostRequest(request);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // セキュリティチェック
    const securityCheck = this.performSecurityCheck(request.tweet_text);
    if (!securityCheck.isSafe) {
      throw new Error(`Security check failed: ${securityCheck.issues.join(', ')}`);
    }

    try {
      // V2認証（login_cookie）取得
      const loginCookie = this.authManager.getUserSession();
      if (!loginCookie) {
        throw new Error('No valid V2 login session available. Please authenticate first.');
      }

      console.log('📝 Creating tweet with V2 authentication...');
      
      // サニタイズされたコンテンツで投稿
      const sanitizedContent = this.sanitizeContent(request.tweet_text);
      
      const response = await this.httpClient.post<CreateTweetV2Response>(
        this.ENDPOINTS.createTweet,
        {
          text: sanitizedContent,
          login_cookie: loginCookie,
          ...(request.media_ids && { media_ids: request.media_ids })
        }
      );

      // create_tweet_v2の新レスポンス形式に対応
      if (response.data) {
        return {
          data: {
            id: response.data.id,
            text: sanitizedContent,
            author_id: '',
            created_at: response.data.created_at,
            public_metrics: {
              retweet_count: 0,
              reply_count: 0,
              like_count: 0,
              quote_count: 0,
              impression_count: 0
            },
            ...(request.is_note_tweet && { note_tweet: request.is_note_tweet }),
            ...(request.reply_settings && { reply_settings: request.reply_settings })
          }
        };
      } else {
        throw new Error('Tweet creation failed');
      }
    } catch (error: any) {
      this.handleTweetError(error, 'createTweet');
    }
  }

  /**
   * ツイート削除
   * V2ログイン認証（login_cookie）必須
   */
  async deleteTweet(tweetId: string): Promise<DeleteTweetResult> {
    // 入力バリデーション
    const validation = this.validateTweetId(tweetId);
    if (!validation.isValid) {
      return {
        tweetId,
        timestamp: new Date().toISOString(),
        success: false,
        error: validation.errors.join(', ')
      };
    }

    try {
      // V2認証確認
      const loginCookie = this.authManager.getUserSession();
      if (!loginCookie) {
        throw new Error('No valid V2 login session available');
      }

      console.log('🗑️ Deleting tweet with V2 authentication...', { tweetId });

      const response = await this.httpClient.post(this.ENDPOINTS.deleteTweet, {
        tweet_id: tweetId,
        login_cookie: loginCookie
      }) as any;

      const result: DeleteTweetResult = {
        tweetId,
        timestamp: new Date().toISOString(),
        success: response.data?.deleted !== false
      };

      console.log(`${result.success ? '✅' : '❌'} Tweet deletion ${result.success ? 'completed' : 'failed'}:`, result);
      return result;

    } catch (error: any) {
      console.error('❌ Tweet deletion error:', error);
      
      return {
        tweetId,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS - VALIDATION
  // ============================================================================

  private validatePostRequest(request: PostRequest): ValidationResult {
    const errors: string[] = [];

    // コンテンツ基本検証
    if (!request.tweet_text?.trim()) {
      errors.push('Content cannot be empty');
    }

    if (request.tweet_text && request.tweet_text.length > this.VALIDATION_RULES.tweetContent.maxLength) {
      errors.push(`Content exceeds ${this.VALIDATION_RULES.tweetContent.maxLength} character limit`);
    }

    // メディアID検証
    if (request.media_ids) {
      if (request.media_ids.length > this.VALIDATION_RULES.mediaIds.maxCount) {
        errors.push(`Maximum ${this.VALIDATION_RULES.mediaIds.maxCount} media items allowed`);
      }
      if (request.media_ids.some((id: string) => !this.isValidMediaId(id))) {
        errors.push('Invalid media ID format detected');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateTweetId(tweetId: string): ValidationResult {
    const errors: string[] = [];

    if (!tweetId || typeof tweetId !== 'string' || !tweetId.trim()) {
      errors.push('Tweet ID is required and must be a non-empty string');
    } else if (!this.VALIDATION_RULES.tweetId.test(tweetId)) {
      errors.push('Invalid tweet ID format (must be 1-19 digit number)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============================================================================
  // PRIVATE METHODS - SECURITY
  // ============================================================================

  private performSecurityCheck(content: string): SecurityCheckResult {
    const issues: string[] = [];

    // 禁止コンテンツチェック
    if (this.containsProhibitedContent(content)) {
      issues.push('Content contains prohibited patterns');
    }

    // スパムパターンチェック
    if (this.detectSpamPatterns(content)) {
      issues.push('Content detected as potential spam');
    }

    // 不適切な文字チェック
    if (this.containsInappropriateCharacters(content)) {
      issues.push('Content contains inappropriate characters');
    }

    return {
      isSafe: issues.length === 0,
      issues
    };
  }

  private containsProhibitedContent(content: string): boolean {
    // 韓国語チェック（指示書に従い）
    const koreanRegex = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
    if (koreanRegex.test(content)) return true;

    // 禁止キーワードパターン
    const prohibitedPatterns = [
      /spam/i,
      /scam/i,
      /crypto.*pump/i,
      /guaranteed.*profit/i,
      /click.*here/i,
      /free.*money/i
    ];

    return prohibitedPatterns.some(pattern => pattern.test(content));
  }

  private detectSpamPatterns(content: string): boolean {
    // 過度な繰り返し文字
    if (/(..)\1{4,}/.test(content)) return true;
    
    // 過度な大文字
    const upperCaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (upperCaseRatio > 0.7) return true;
    
    // 過度な絵文字
    const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]+/g;
    const emojiCount = (content.match(emojiRegex) || []).length;
    if (emojiCount > content.length * 0.3) return true;

    return false;
  }

  private containsInappropriateCharacters(content: string): boolean {
    // 制御文字チェック
    const controlCharRegex = /[\x00-\x1F\x7F-\x9F]/;
    return controlCharRegex.test(content);
  }

  private sanitizeContent(content: string): string {
    // 不適切な文字の除去
    let sanitized = content
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // 制御文字除去
      .replace(/\s+/g, ' ') // 連続空白の正規化
      .trim();

    // 長さ制限の確認
    if (sanitized.length > this.VALIDATION_RULES.tweetContent.maxLength) {
      sanitized = sanitized.substring(0, this.VALIDATION_RULES.tweetContent.maxLength - 3) + '...';
    }

    return sanitized;
  }

  // ============================================================================
  // PRIVATE METHODS - ERROR HANDLING
  // ============================================================================

  private handleTweetError(error: any, operation: string): never {
    console.error(`❌ ${operation} error (V2 API):`, error);

    // TwitterAPI.io V2 API特有エラーハンドリング
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    if (error.response?.status === 401) {
      throw new Error('V2 authentication failed. Please re-authenticate with login_cookie.');
    }

    if (error.response?.status === 403) {
      throw new Error('Action forbidden. Check account permissions or login_cookie validity.');
    }

    if (error.response?.status === 422) {
      throw new Error('Invalid request data for V2 API. Please check your input format.');
    }

    // V2 API特有エラー（login_cookie関連）
    if (error.message?.includes('login_cookie')) {
      throw new Error('V2 login session expired or invalid. Please re-authenticate.');
    }

    throw new Error(error.message || 'Unknown error occurred in V2 API');
  }

  // ============================================================================
  // PRIVATE METHODS - UTILITY
  // ============================================================================

  private isValidMediaId(mediaId: string): boolean {
    // メディアIDの基本的な形式チェック
    return /^media_\d+/.test(mediaId) || /^\d+_\d+/.test(mediaId);
  }
}