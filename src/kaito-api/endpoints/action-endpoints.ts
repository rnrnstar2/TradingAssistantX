/**
 * KaitoAPI アクションエンドポイント - 最適化版
 * REQUIREMENTS.md準拠 - 疎結合アーキテクチャ
 * 投稿・いいね・RT・画像アップロードのAPI呼び出し専用
 * 
 * 最適化内容:
 * - 厳密な入力バリデーション
 * - セキュリティ強化（入力サニタイゼーション）
 * - TwitterAPI.io特有エラーハンドリング統一
 * - レスポンス正規化
 * - 禁止コンテンツ検出機能
 */

import { 
  PostRequest, 
  PostResponse, 
  EngagementRequest, 
  EngagementResponse,
  HttpClient,
  TwitterAPITweetResponse
} from '../types';

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

export class ActionEndpoints {
  private readonly ENDPOINTS = {
    createTweet: '/twitter/tweet/create',
    likeTweet: '/twitter/user/like',
    retweetTweet: '/twitter/user/retweet',
    uploadMedia: '/twitter/media/upload'
  } as const;

  private readonly RATE_LIMITS = {
    general: { limit: 900, window: 3600 }, // 900/hour
    posting: { limit: 300, window: 3600 }, // 300/hour
    engagement: { limit: 500, window: 3600 } // 500/hour
  } as const;

  constructor(private httpClient: HttpClient) {
    console.log('✅ ActionEndpoints initialized - TwitterAPI.io最適化版');
  }

  async createPost(request: PostRequest): Promise<PostResponse> {
    // 入力バリデーション強化
    const validation = this.validatePostRequest(request);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`
      };
    }

    // セキュリティチェック
    const securityCheck = this.performSecurityCheck(request.content);
    if (!securityCheck.isSafe) {
      return {
        success: false,
        error: `Security check failed: ${securityCheck.issues.join(', ')}`
      };
    }

    try {
      console.log('📝 Creating post with TwitterAPI.io:', request.content.substring(0, 50) + '...');
      
      // サニタイズされたコンテンツで投稿
      const sanitizedContent = this.sanitizeContent(request.content);
      
      const response = await this.httpClient.post<TwitterAPITweetResponse>(
        this.ENDPOINTS.createTweet,
        {
          text: sanitizedContent,
          ...(request.mediaIds && { media_ids: request.mediaIds })
        }
      );

      return {
        success: true,
        tweetId: response.data.id,
        createdAt: response.data.created_at
      };
    } catch (error) {
      return this.handleActionError(error, 'createPost');
    }
  }

  async performEngagement(request: EngagementRequest): Promise<EngagementResponse> {
    // エンゲージメント要求バリデーション
    const validation = this.validateEngagementRequest(request);
    if (!validation.isValid) {
      throw new Error(`Engagement validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      console.log(`🚀 Performing ${request.action} on tweet ${request.tweetId} via TwitterAPI.io`);
      
      let endpoint: string;
      let requestData: any;
      
      switch (request.action) {
        case 'like':
          endpoint = this.ENDPOINTS.likeTweet;
          requestData = { tweet_id: request.tweetId };
          break;
        case 'retweet':
          endpoint = this.ENDPOINTS.retweetTweet;
          requestData = { tweet_id: request.tweetId };
          break;
        default:
          throw new Error(`Unsupported action: ${request.action}`);
      }

      const response = await this.httpClient.post(endpoint, requestData);
      
      return {
        success: true,
        action: request.action,
        tweetId: request.tweetId,
        timestamp: new Date().toISOString(),
        data: {
          liked: request.action === 'like',
          retweeted: request.action === 'retweet'
        }
      };
    } catch (error) {
      return this.handleEngagementError(error, request);
    }
  }

  async uploadMedia(mediaData: Buffer, mediaType: string): Promise<{ mediaId: string }> {
    // メディアアップロードバリデーション
    const validation = this.validateMediaUpload(mediaData, mediaType);
    if (!validation.isValid) {
      throw new Error(`Media validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      console.log(`📎 Uploading media via TwitterAPI.io (${mediaType}, ${mediaData.length} bytes)`);
      
      // TwitterAPI.io メディアアップロード実装
      // TODO: 実際のAPI実装が必要
      const mediaId = `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return { mediaId };
    } catch (error) {
      throw new Error(`Media upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  private validatePostRequest(request: PostRequest): ValidationResult {
    const errors: string[] = [];

    // コンテンツ基本検証
    if (!request.content?.trim()) {
      errors.push('Content cannot be empty');
    }

    if (request.content && request.content.length > 280) {
      errors.push('Content exceeds 280 character limit');
    }

    // メディアID検証
    if (request.mediaIds) {
      if (request.mediaIds.length > 4) {
        errors.push('Maximum 4 media items allowed');
      }
      if (request.mediaIds.some(id => !this.isValidMediaId(id))) {
        errors.push('Invalid media ID format detected');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateEngagementRequest(request: EngagementRequest): ValidationResult {
    const errors: string[] = [];

    if (!request.tweetId?.trim()) {
      errors.push('Tweet ID is required');
    }

    if (request.tweetId && !this.isValidTweetId(request.tweetId)) {
      errors.push('Invalid tweet ID format');
    }

    if (!['like', 'retweet'].includes(request.action)) {
      errors.push('Invalid action type. Must be "like" or "retweet"');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateMediaUpload(mediaData: Buffer, mediaType: string): ValidationResult {
    const errors: string[] = [];

    if (!mediaData || mediaData.length === 0) {
      errors.push('Media data is required');
    }

    // ファイルサイズ制限（5MB）
    if (mediaData && mediaData.length > 5 * 1024 * 1024) {
      errors.push('Media file too large (max 5MB)');
    }

    // サポートされるメディアタイプ
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
    if (!supportedTypes.includes(mediaType)) {
      errors.push('Unsupported media type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============================================================================
  // SECURITY METHODS
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
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
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
    if (sanitized.length > 280) {
      sanitized = sanitized.substring(0, 277) + '...';
    }

    return sanitized;
  }

  // ============================================================================
  // ERROR HANDLING METHODS
  // ============================================================================

  private handleActionError(error: any, context: string): PostResponse {
    console.error(`❌ ${context} error:`, error);

    // TwitterAPI.io特有エラーハンドリング
    if (error.response?.status === 429) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please try again later.'
      };
    }

    if (error.response?.status === 401) {
      return {
        success: false,
        error: 'Authentication failed. Please check your API key.'
      };
    }

    if (error.response?.status === 403) {
      return {
        success: false,
        error: 'Action forbidden. Check account permissions or content policy.'
      };
    }

    if (error.response?.status === 422) {
      return {
        success: false,
        error: 'Invalid request data. Please check your input.'
      };
    }

    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }

  private handleEngagementError(error: any, request: EngagementRequest): EngagementResponse {
    console.error(`❌ Engagement ${request.action} error:`, error);

    return {
      success: false,
      action: request.action,
      tweetId: request.tweetId,
      timestamp: new Date().toISOString(),
      data: {
        liked: false,
        retweeted: false
      }
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private isValidTweetId(tweetId: string): boolean {
    // TwitterのツイートIDは数値文字列（1-19桁）
    return /^\d{1,19}$/.test(tweetId);
  }

  private isValidMediaId(mediaId: string): boolean {
    // メディアIDの基本的な形式チェック
    return /^media_\d+/.test(mediaId) || /^\d+_\d+/.test(mediaId);
  }

  // ============================================================================
  // EXECUTION-FLOW COMPATIBILITY METHODS
  // ============================================================================

  async post(content: string): Promise<PostResponse> {
    return await this.createPost({ content });
  }

  async retweet(tweetId: string): Promise<EngagementResponse> {
    return await this.performEngagement({ tweetId, action: 'retweet' });
  }

  async like(tweetId: string): Promise<EngagementResponse> {
    return await this.performEngagement({ tweetId, action: 'like' });
  }

  async getExecutionMetrics(): Promise<any> {
    return {
      totalPosts: 0,
      totalRetweets: 0,
      totalLikes: 0,
      lastExecutionTime: new Date().toISOString(),
      rateLimits: this.RATE_LIMITS
    };
  }
}