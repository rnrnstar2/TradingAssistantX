/**
 * V2 Advanced Features Endpoint - V2ログイン認証専用
 * REQUIREMENTS.md準拠 - 長文投稿・Note機能・高度な投稿オプション
 * 
 * 機能:
 * - 長文投稿・Note機能・高度な投稿オプション
 * - メディアアップロード・画像処理
 * - Spaces（音声チャット）管理
 * - 高度な分析・統計機能
 * 
 * 認証レベル: V2ログイン認証（login_cookies必要）
 */

import { 
  HttpClient
} from '../../types';
import { V2LoginAuth } from '../../core/v2-login-auth';

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

interface MediaUploadResponse {
  success: boolean;
  data: {
    mediaId: string;
    mediaKey: string;
    type: MediaType;
    url: string;
    size: number;
    altText?: string;
    processingInfo?: MediaProcessingInfo;
  };
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface SpaceResponse {
  success: boolean;
  data: Space;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface AnalyticsResponse {
  success: boolean;
  data: {
    metrics: AnalyticsMetrics;
    period: AnalyticsPeriod;
    generatedAt: Date;
  };
}

interface FleetResponse {
  success: boolean;
  data: Fleet;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

// ============================================================================
// DATA INTERFACES
// ============================================================================

interface MediaProcessingInfo {
  state: 'pending' | 'in_progress' | 'failed' | 'succeeded';
  checkAfterSecs?: number;
  progressPercent?: number;
  error?: {
    code: number;
    name: string;
    message: string;
  };
}

interface Space {
  id: string;
  title: string;
  description?: string;
  state: SpaceState;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  hostId: string;
  hostUsername: string;
  coHosts: SpaceParticipant[];
  speakers: SpaceParticipant[];
  listeners: SpaceParticipant[];
  isTicketed: boolean;
  ticketPrice?: number;
  maxParticipants?: number;
  language?: string;
  topic?: SpaceTopic;
  isRecorded: boolean;
  recordingUrl?: string;
}

interface SpaceParticipant {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
  role: SpaceRole;
  joinedAt: Date;
  isMuted: boolean;
  isHandRaised: boolean;
}

interface Fleet {
  id: string;
  text: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  createdAt: Date;
  expiresAt: Date;
  authorId: string;
  authorUsername: string;
  viewCount: number;
  reactionCount: number;
  backgroundColor?: string;
  textAlignment?: 'left' | 'center' | 'right';
}

interface AnalyticsMetrics {
  tweets: {
    count: number;
    impressions: number;
    engagements: number;
    engagementRate: number;
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
  };
  profile: {
    followers: number;
    following: number;
    profileVisits: number;
    mentionCount: number;
  };
  audience: {
    demographics: {
      ageGroups: Record<string, number>;
      genders: Record<string, number>;
      locations: Record<string, number>;
      languages: Record<string, number>;
    };
    interests: string[];
    activeHours: number[];
  };
  topTweets: Array<{
    id: string;
    text: string;
    impressions: number;
    engagements: number;
    createdAt: Date;
  }>;
}

// ============================================================================
// ENUMS & TYPES
// ============================================================================

type MediaType = 'photo' | 'video' | 'gif' | 'audio' | 'document';

type SpaceState = 'live' | 'scheduled' | 'ended' | 'cancelled';

type SpaceRole = 'host' | 'co_host' | 'speaker' | 'listener';

type SpaceTopic = 'music' | 'sports' | 'news' | 'entertainment' | 'technology' | 'business' | 'other';

type AnalyticsPeriod = '1d' | '7d' | '30d' | '90d' | '1y';

// ============================================================================
// REQUEST OPTIONS
// ============================================================================

interface MediaUploadOptions {
  altText?: string;
  category?: 'tweet_image' | 'tweet_video' | 'tweet_gif' | 'dm_image' | 'dm_video';
  additionalOwners?: string[];
  shared?: boolean;
}

interface CreateSpaceOptions {
  description?: string;
  isTicketed?: boolean;
  ticketPrice?: number;
  maxParticipants?: number;
  language?: string;
  topic?: SpaceTopic;
  isRecorded?: boolean;
  scheduledStart?: Date;
  coHostIds?: string[];
}

interface CreateFleetOptions {
  mediaId?: string;
  backgroundColor?: string;
  textAlignment?: 'left' | 'center' | 'right';
  duration?: number; // seconds (max 24 hours)
}

interface AnalyticsOptions {
  period: AnalyticsPeriod;
  includeAudience?: boolean;
  includeTopTweets?: boolean;
  tweetCount?: number;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// ADVANCED FEATURES ENDPOINT CLASS
// ============================================================================

/**
 * AdvancedFeaturesEndpoint - V2認証高度機能操作クラス
 * 
 * V2ログイン認証（login_cookies）で実行可能な機能:
 * - 高度なメディアアップロード・処理
 * - Spaces（音声チャット）作成・管理
 * - Fleet（24時間限定投稿）機能
 * - 詳細な分析・統計データ取得
 */
export class AdvancedFeaturesEndpoint {
  private readonly ENDPOINTS = {
    uploadMedia: '/twitter/media/upload',
    getMediaStatus: '/twitter/media/upload/status',
    createSpace: '/twitter/spaces/create',
    updateSpace: '/twitter/spaces/update',
    startSpace: '/twitter/spaces/start',
    endSpace: '/twitter/spaces/end',
    getSpace: '/twitter/spaces/info',
    joinSpace: '/twitter/spaces/join',
    leaveSpace: '/twitter/spaces/leave',
    inviteToSpace: '/twitter/spaces/invite',
    createFleet: '/twitter/fleets/create',
    deleteFleet: '/twitter/fleets/delete',
    getFleets: '/twitter/fleets/list',
    getAnalytics: '/twitter/analytics/tweets',
    getProfileAnalytics: '/twitter/analytics/profile',
    getAudienceInsights: '/twitter/analytics/audience'
  } as const;

  private readonly RATE_LIMITS = {
    uploadMedia: { limit: 300, window: 3600 }, // 300/hour
    spaceOperations: { limit: 100, window: 3600 }, // 100/hour
    fleetOperations: { limit: 500, window: 3600 }, // 500/hour
    analytics: { limit: 200, window: 3600 } // 200/hour
  } as const;

  private readonly VALIDATION_RULES = {
    mediaSize: {
      image: 5 * 1024 * 1024, // 5MB
      video: 512 * 1024 * 1024, // 512MB
      gif: 15 * 1024 * 1024 // 15MB
    },
    spaceTitle: { minLength: 3, maxLength: 100 },
    spaceDescription: { maxLength: 500 },
    fleetText: { maxLength: 280 },
    altText: { maxLength: 1000 },
    ticketPrice: { min: 1, max: 999 },
    maxParticipants: { min: 2, max: 13 } // Twitter Spaces limit
  } as const;

  private readonly SUPPORTED_MEDIA_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    video: ['video/mp4', 'video/mov', 'video/webm'],
    audio: ['audio/mp3', 'audio/wav', 'audio/aac']
  };

  constructor(
    private httpClient: HttpClient,
    private v2Auth: V2LoginAuth
  ) {}

  // ============================================================================
  // PUBLIC METHODS - MEDIA UPLOAD
  // ============================================================================

  /**
   * メディアアップロード（高度版）
   * login_cookies認証が必要
   */
  async uploadMedia(
    mediaData: Buffer | Uint8Array, 
    mediaType: MediaType,
    options?: MediaUploadOptions
  ): Promise<MediaUploadResponse> {
    // メディアサイズバリデーション
    const sizeValidation = this.validateMediaSize(mediaData, mediaType);
    if (!sizeValidation.isValid) {
      throw new Error(`Invalid media size: ${sizeValidation.errors.join(', ')}`);
    }

    // V2認証クッキー取得・検証
    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      // マルチパート形式でアップロード
      const formData = new FormData();
      formData.append('media', new Blob([mediaData]), `media.${this.getFileExtension(mediaType)}`);
      formData.append('media_category', options?.category || 'tweet_image');
      formData.append('login_cookies', loginCookie);
      
      if (options?.altText) {
        formData.append('alt_text', options.altText);
      }
      if (options?.additionalOwners?.length) {
        formData.append('additional_owners', options.additionalOwners.join(','));
      }
      if (options?.shared !== undefined) {
        formData.append('shared', options.shared.toString());
      }

      const response = await this.httpClient.postMultipart<any>(
        this.ENDPOINTS.uploadMedia,
        formData
      );

      // 処理状態確認が必要な場合
      let finalResponse = response;
      if (response.processing_info?.state === 'pending' || response.processing_info?.state === 'in_progress') {
        finalResponse = await this.waitForMediaProcessing(response.media_id_string, loginCookie);
      }

      const normalizedData = await this.normalizeMediaUploadResponse(finalResponse);

      return {
        success: true,
        data: normalizedData,
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'uploadMedia');
    }
  }

  /**
   * メディア処理状態確認
   * login_cookies認証が必要
   */
  async getMediaStatus(mediaId: string): Promise<{
    success: boolean;
    data: { mediaId: string; processingInfo: MediaProcessingInfo };
  }> {
    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const response = await this.httpClient.get<any>(
        this.ENDPOINTS.getMediaStatus,
        { 
          media_id: mediaId,
          login_cookies: loginCookie
        }
      );

      return {
        success: true,
        data: {
          mediaId,
          processingInfo: {
            state: response.processing_info.state,
            checkAfterSecs: response.processing_info.check_after_secs,
            progressPercent: response.processing_info.progress_percent,
            error: response.processing_info.error
          }
        }
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'getMediaStatus');
    }
  }

  // ============================================================================
  // PUBLIC METHODS - SPACES
  // ============================================================================

  /**
   * Space作成
   * login_cookies認証が必要
   */
  async createSpace(title: string, options?: CreateSpaceOptions): Promise<SpaceResponse> {
    // タイトルバリデーション
    const titleValidation = this.validateSpaceTitle(title);
    if (!titleValidation.isValid) {
      throw new Error(`Invalid space title: ${titleValidation.errors.join(', ')}`);
    }

    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const payload: any = {
        title,
        login_cookies: loginCookie,
        proxy: process.env.X_PROXY
      };

      // オプション設定
      if (options?.description) payload.description = options.description;
      if (options?.isTicketed) payload.is_ticketed = options.isTicketed;
      if (options?.ticketPrice) payload.ticket_price = options.ticketPrice;
      if (options?.maxParticipants) payload.max_participants = options.maxParticipants;
      if (options?.language) payload.language = options.language;
      if (options?.topic) payload.topic = options.topic;
      if (options?.isRecorded !== undefined) payload.is_recorded = options.isRecorded;
      if (options?.scheduledStart) payload.scheduled_start = options.scheduledStart.toISOString();
      if (options?.coHostIds?.length) payload.co_host_ids = options.coHostIds;

      const response = await this.httpClient.post<any>(
        this.ENDPOINTS.createSpace,
        payload
      );

      const normalizedData = await this.normalizeSpace(response);

      return {
        success: true,
        data: normalizedData,
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'createSpace');
    }
  }

  /**
   * Space開始
   * login_cookies認証が必要
   */
  async startSpace(spaceId: string): Promise<SpaceResponse> {
    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const payload = {
        space_id: spaceId,
        login_cookies: loginCookie,
        proxy: process.env.X_PROXY
      };

      const response = await this.httpClient.post<any>(
        this.ENDPOINTS.startSpace,
        payload
      );

      const normalizedData = await this.normalizeSpace(response);

      return {
        success: true,
        data: normalizedData,
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'startSpace');
    }
  }

  // ============================================================================
  // PUBLIC METHODS - FLEETS
  // ============================================================================

  /**
   * Fleet作成（24時間限定投稿）
   * login_cookies認証が必要
   */
  async createFleet(text: string, options?: CreateFleetOptions): Promise<FleetResponse> {
    // テキストバリデーション
    const textValidation = this.validateFleetText(text);
    if (!textValidation.isValid) {
      throw new Error(`Invalid fleet text: ${textValidation.errors.join(', ')}`);
    }

    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const payload: any = {
        text,
        login_cookies: loginCookie,
        proxy: process.env.X_PROXY
      };

      // オプション設定
      if (options?.mediaId) payload.media_id = options.mediaId;
      if (options?.backgroundColor) payload.background_color = options.backgroundColor;
      if (options?.textAlignment) payload.text_alignment = options.textAlignment;
      if (options?.duration) payload.duration = options.duration;

      const response = await this.httpClient.post<any>(
        this.ENDPOINTS.createFleet,
        payload
      );

      const normalizedData = await this.normalizeFleet(response);

      return {
        success: true,
        data: normalizedData,
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'createFleet');
    }
  }

  // ============================================================================
  // PUBLIC METHODS - ANALYTICS
  // ============================================================================

  /**
   * 詳細分析データ取得
   * login_cookies認証が必要
   */
  async getAnalytics(options: AnalyticsOptions): Promise<AnalyticsResponse> {
    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const params: any = {
        period: options.period,
        login_cookies: loginCookie
      };

      if (options.includeAudience) params.include_audience = options.includeAudience;
      if (options.includeTopTweets) params.include_top_tweets = options.includeTopTweets;
      if (options.tweetCount) params.tweet_count = options.tweetCount;

      const response = await this.httpClient.get<any>(
        this.ENDPOINTS.getAnalytics,
        params
      );

      const normalizedMetrics = await this.normalizeAnalyticsMetrics(response);

      return {
        success: true,
        data: {
          metrics: normalizedMetrics,
          period: options.period,
          generatedAt: new Date()
        }
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'getAnalytics');
    }
  }

  // ============================================================================
  // PRIVATE METHODS - VALIDATION
  // ============================================================================

  private validateMediaSize(mediaData: Buffer | Uint8Array, mediaType: MediaType): ValidationResult {
    const errors: string[] = [];
    const size = mediaData.byteLength;

    let maxSize: number;
    switch (mediaType) {
      case 'photo':
        maxSize = this.VALIDATION_RULES.mediaSize.image;
        break;
      case 'video':
        maxSize = this.VALIDATION_RULES.mediaSize.video;
        break;
      case 'gif':
        maxSize = this.VALIDATION_RULES.mediaSize.gif;
        break;
      default:
        maxSize = this.VALIDATION_RULES.mediaSize.image;
    }

    if (size > maxSize) {
      errors.push(`Media size ${size} bytes exceeds limit of ${maxSize} bytes for ${mediaType}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateSpaceTitle(title: string): ValidationResult {
    const errors: string[] = [];

    if (!title || typeof title !== 'string') {
      errors.push('Space title is required and must be a string');
    } else if (title.length < this.VALIDATION_RULES.spaceTitle.minLength) {
      errors.push(`Space title must be at least ${this.VALIDATION_RULES.spaceTitle.minLength} characters`);
    } else if (title.length > this.VALIDATION_RULES.spaceTitle.maxLength) {
      errors.push(`Space title must not exceed ${this.VALIDATION_RULES.spaceTitle.maxLength} characters`);
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateFleetText(text: string): ValidationResult {
    const errors: string[] = [];

    if (!text || typeof text !== 'string') {
      errors.push('Fleet text is required and must be a string');
    } else if (text.length > this.VALIDATION_RULES.fleetText.maxLength) {
      errors.push(`Fleet text must not exceed ${this.VALIDATION_RULES.fleetText.maxLength} characters`);
    }

    if (text && text.trim().length === 0) {
      errors.push('Fleet text cannot be empty or contain only whitespace');
    }

    return { isValid: errors.length === 0, errors };
  }

  // ============================================================================
  // PRIVATE METHODS - MEDIA PROCESSING
  // ============================================================================

  private async waitForMediaProcessing(mediaId: string, loginCookie: string): Promise<any> {
    let attempts = 0;
    const maxAttempts = 60; // 最大5分待機
    
    while (attempts < maxAttempts) {
      const statusResponse = await this.httpClient.get<any>(
        this.ENDPOINTS.getMediaStatus,
        { 
          media_id: mediaId,
          login_cookies: loginCookie
        }
      );

      const state = statusResponse.processing_info?.state;
      
      if (state === 'succeeded') {
        return statusResponse;
      } else if (state === 'failed') {
        throw new Error(`Media processing failed: ${statusResponse.processing_info?.error?.message || 'Unknown error'}`);
      }

      // 次のチェックまで待機
      const waitTime = statusResponse.processing_info?.check_after_secs || 5;
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      attempts++;
    }

    throw new Error('Media processing timeout - please try again later');
  }

  private getFileExtension(mediaType: MediaType): string {
    switch (mediaType) {
      case 'photo': return 'jpg';
      case 'video': return 'mp4';
      case 'gif': return 'gif';
      case 'audio': return 'mp3';
      default: return 'bin';
    }
  }

  // ============================================================================
  // PRIVATE METHODS - DATA NORMALIZATION
  // ============================================================================

  private async normalizeMediaUploadResponse(apiResponse: any): Promise<{
    mediaId: string;
    mediaKey: string;
    type: MediaType;
    url: string;
    size: number;
    altText?: string;
    processingInfo?: MediaProcessingInfo;
  }> {
    return {
      mediaId: apiResponse.media_id_string || apiResponse.media_id,
      mediaKey: apiResponse.media_key || '',
      type: apiResponse.media_type || 'photo',
      url: apiResponse.media_url_https || apiResponse.media_url || '',
      size: apiResponse.size || 0,
      altText: apiResponse.alt_text,
      processingInfo: apiResponse.processing_info ? {
        state: apiResponse.processing_info.state,
        checkAfterSecs: apiResponse.processing_info.check_after_secs,
        progressPercent: apiResponse.processing_info.progress_percent,
        error: apiResponse.processing_info.error
      } : undefined
    };
  }

  private async normalizeSpace(apiSpace: any): Promise<Space> {
    return {
      id: apiSpace.id,
      title: apiSpace.title,
      description: apiSpace.description,
      state: apiSpace.state,
      createdAt: new Date(apiSpace.created_at),
      startedAt: apiSpace.started_at ? new Date(apiSpace.started_at) : undefined,
      endedAt: apiSpace.ended_at ? new Date(apiSpace.ended_at) : undefined,
      hostId: apiSpace.host_id,
      hostUsername: apiSpace.host_username || '',
      coHosts: [],
      speakers: [],
      listeners: [],
      isTicketed: apiSpace.is_ticketed || false,
      ticketPrice: apiSpace.ticket_price,
      maxParticipants: apiSpace.max_participants,
      language: apiSpace.language,
      topic: apiSpace.topic,
      isRecorded: apiSpace.is_recorded || false,
      recordingUrl: apiSpace.recording_url
    };
  }

  private async normalizeFleet(apiFleet: any): Promise<Fleet> {
    return {
      id: apiFleet.id,
      text: apiFleet.text,
      mediaUrl: apiFleet.media_url,
      mediaType: apiFleet.media_type,
      createdAt: new Date(apiFleet.created_at),
      expiresAt: new Date(apiFleet.expires_at),
      authorId: apiFleet.author_id,
      authorUsername: apiFleet.author_username,
      viewCount: apiFleet.view_count || 0,
      reactionCount: apiFleet.reaction_count || 0,
      backgroundColor: apiFleet.background_color,
      textAlignment: apiFleet.text_alignment
    };
  }

  private async normalizeAnalyticsMetrics(apiResponse: any): Promise<AnalyticsMetrics> {
    return {
      tweets: {
        count: apiResponse.tweets?.count || 0,
        impressions: apiResponse.tweets?.impressions || 0,
        engagements: apiResponse.tweets?.engagements || 0,
        engagementRate: apiResponse.tweets?.engagement_rate || 0,
        likes: apiResponse.tweets?.likes || 0,
        retweets: apiResponse.tweets?.retweets || 0,
        replies: apiResponse.tweets?.replies || 0,
        quotes: apiResponse.tweets?.quotes || 0
      },
      profile: {
        followers: apiResponse.profile?.followers || 0,
        following: apiResponse.profile?.following || 0,
        profileVisits: apiResponse.profile?.profile_visits || 0,
        mentionCount: apiResponse.profile?.mention_count || 0
      },
      audience: {
        demographics: apiResponse.audience?.demographics || {
          ageGroups: {},
          genders: {},
          locations: {},
          languages: {}
        },
        interests: apiResponse.audience?.interests || [],
        activeHours: apiResponse.audience?.active_hours || []
      },
      topTweets: apiResponse.top_tweets || []
    };
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

    // 高度機能特有のエラー
    if (error.message?.includes('media processing failed')) {
      throw new Error(`Media processing failed: ${operation}`);
    }

    if (error.message?.includes('space not found')) {
      throw new Error(`Space not found: ${operation}`);
    }

    if (error.message?.includes('fleet not available')) {
      throw new Error(`Fleet feature not available: ${operation}`);
    }

    if (error.message?.includes('analytics not available')) {
      throw new Error(`Analytics data not available: ${operation}`);
    }

    if (error.status === 413) {
      throw new Error(`Media file too large for operation: ${operation}`);
    }

    if (error.status === 415) {
      throw new Error(`Unsupported media type for operation: ${operation}`);
    }

    if (error.status === 404) {
      throw new Error(`Resource not found for advanced feature operation: ${operation}`);
    }

    if (error.status === 400) {
      throw new Error(`Bad request for advanced feature operation: ${operation}. Check input parameters.`);
    }

    // その他のエラー
    throw new Error(`V2 advanced features API error in ${operation}: ${error.message || 'Unknown error'}`);
  }
}