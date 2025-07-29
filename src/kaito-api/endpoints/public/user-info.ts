/**
 * Public User Info Endpoint - APIキー認証専用
 * REQUIREMENTS.md準拠 - 読み取り専用ユーザー情報取得
 * 
 * 機能:
 * - ユーザー情報取得・プロフィール確認
 * - フォロワー・フォロー情報取得
 * - ユーザー検索機能
 * 
 * 認証レベル: APIキー認証のみ（読み取り専用）
 */

import { 
  UserInfo, 
  UserSearchResult, 
  UserSearchOptions,
  HttpClient,
  TwitterAPIUserResponse,
  TwitterAPIUserSearchResponse,
  FollowerResponse
} from '../../types';
import { APIKeyAuth } from '../../core/api-key-auth';

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

interface UserInfoResponse {
  success: boolean;
  data: UserInfo;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface UserFollowerResponse {
  success: boolean;
  data: {
    followers: UserInfo[];
    following: UserInfo[];
    followerCount: number;
    followingCount: number;
  };
  pagination?: {
    nextCursor?: string;
    hasMore: boolean;
  };
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// USER INFO ENDPOINT CLASS
// ============================================================================

/**
 * UserInfoEndpoint - 公開ユーザー情報API操作クラス
 * 
 * APIキー認証のみで実行可能な読み取り専用機能:
 * - ユーザー情報の取得・プロフィール確認
 * - フォロワー・フォロー情報取得
 * - ユーザー検索・フィルタリング
 */
export class UserInfoEndpoint {
  private readonly ENDPOINTS = {
    userInfo: '/twitter/user/info',
    userSearch: '/twitter/user/search',
    userFollowers: '/twitter/user/followers',
    userFollowing: '/twitter/user/following'
  } as const;

  private readonly RATE_LIMITS = {
    userInfo: { limit: 300, window: 3600 }, // 300/hour
    userSearch: { limit: 900, window: 3600 }, // 900/hour
    followers: { limit: 15, window: 900 } // 15/15min
  } as const;

  private readonly VALIDATION_RULES = {
    userName: /^[a-zA-Z0-9_]{1,15}$/,
    userId: /^[0-9]+$/,
    searchQuery: { minLength: 1, maxLength: 100 }
  } as const;

  constructor(
    private httpClient: HttpClient,
    private apiKeyAuth: APIKeyAuth
  ) {}

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * ユーザー情報取得
   * APIキー認証のみで実行可能
   */
  async getUserInfo(userName: string): Promise<UserInfoResponse> {
    // 入力バリデーション
    const validation = this.validateUserName(userName);
    if (!validation.isValid) {
      throw new Error(`Invalid userName: ${validation.errors.join(', ')}`);
    }

    try {
      // APIキー認証ヘッダー取得
      const headers = this.apiKeyAuth.getAuthHeaders();
      
      // API呼び出し
      const response = await this.httpClient.get<TwitterAPIUserResponse>(
        this.ENDPOINTS.userInfo,
        { userName },
        { headers }
      );

      // レスポンス正規化
      const normalizedData = await this.normalizeUserInfo(response);

      return {
        success: true,
        data: normalizedData,
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleAPIKeyError(error, 'getUserInfo');
    }
  }

  /**
   * ユーザーフォロワー情報取得
   * APIキー認証のみで実行可能
   */
  async getUserFollowers(userName: string, options?: { cursor?: string; count?: number }): Promise<UserFollowerResponse> {
    // 入力バリデーション
    const validation = this.validateUserName(userName);
    if (!validation.isValid) {
      throw new Error(`Invalid userName: ${validation.errors.join(', ')}`);
    }

    try {
      const headers = this.apiKeyAuth.getAuthHeaders();
      
      const params: any = { userName };
      if (options?.cursor) params.cursor = options.cursor;
      if (options?.count) params.count = Math.min(options.count, 200); // Twitter API制限

      const response = await this.httpClient.get<FollowerResponse>(
        this.ENDPOINTS.userFollowers,
        params,
        { headers }
      );

      const normalizedData = await this.normalizeFollowerData(response);

      return {
        success: true,
        data: normalizedData,
        pagination: {
          nextCursor: response.nextCursor,
          hasMore: !!response.nextCursor
        }
      };

    } catch (error: any) {
      throw this.handleAPIKeyError(error, 'getUserFollowers');
    }
  }

  /**
   * ユーザーフォロー情報取得
   * APIキー認証のみで実行可能
   */
  async getUserFollowing(userName: string, options?: { cursor?: string; count?: number }): Promise<UserFollowerResponse> {
    // 入力バリデーション
    const validation = this.validateUserName(userName);
    if (!validation.isValid) {
      throw new Error(`Invalid userName: ${validation.errors.join(', ')}`);
    }

    try {
      const headers = this.apiKeyAuth.getAuthHeaders();
      
      const params: any = { userName };
      if (options?.cursor) params.cursor = options.cursor;
      if (options?.count) params.count = Math.min(options.count, 200);

      const response = await this.httpClient.get<FollowerResponse>(
        this.ENDPOINTS.userFollowing,
        params,
        { headers }
      );

      const normalizedData = await this.normalizeFollowerData(response);

      return {
        success: true,
        data: normalizedData,
        pagination: {
          nextCursor: response.nextCursor,
          hasMore: !!response.nextCursor
        }
      };

    } catch (error: any) {
      throw this.handleAPIKeyError(error, 'getUserFollowing');
    }
  }

  /**
   * ユーザー検索
   * APIキー認証のみで実行可能
   */
  async searchUsers(query: string, options?: UserSearchOptions): Promise<UserSearchResult> {
    // 入力バリデーション
    const validation = this.validateSearchQuery(query);
    if (!validation.isValid) {
      throw new Error(`Invalid search query: ${validation.errors.join(', ')}`);
    }

    try {
      const headers = this.apiKeyAuth.getAuthHeaders();
      
      const params: any = { q: query };
      if (options?.count) params.count = Math.min(options.count, 20);
      if (options?.resultType) params.result_type = options.resultType;

      const response = await this.httpClient.get<TwitterAPIUserSearchResponse>(
        this.ENDPOINTS.userSearch,
        params,
        { headers }
      );

      const normalizedUsers = await Promise.all(
        response.users?.map(user => this.normalizeUserInfo(user)) || []
      );

      return {
        users: normalizedUsers,
        totalCount: response.totalCount || normalizedUsers.length,
        searchQuery: query,
        executedAt: new Date()
      };

    } catch (error: any) {
      throw this.handleAPIKeyError(error, 'searchUsers');
    }
  }

  // ============================================================================
  // PRIVATE METHODS - VALIDATION
  // ============================================================================

  private validateUserName(userName: string): ValidationResult {
    const errors: string[] = [];

    if (!userName || typeof userName !== 'string') {
      errors.push('userName is required and must be a string');
    } else if (!this.VALIDATION_RULES.userName.test(userName)) {
      errors.push('userName must be 1-15 characters, alphanumeric and underscore only');
    }

    return { isValid: errors.length === 0, errors };
  }

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

  // ============================================================================
  // PRIVATE METHODS - DATA NORMALIZATION
  // ============================================================================

  private async normalizeUserInfo(apiUser: any): Promise<UserInfo> {
    return {
      id: apiUser.id_str || apiUser.id,
      username: apiUser.screen_name || apiUser.username,
      displayName: apiUser.name || apiUser.display_name,
      bio: apiUser.description || '',
      profileImageUrl: apiUser.profile_image_url_https || apiUser.profile_image_url,
      verified: apiUser.verified || false,
      followersCount: apiUser.followers_count || 0,
      followingCount: apiUser.friends_count || apiUser.following_count || 0,
      tweetCount: apiUser.statuses_count || apiUser.tweet_count || 0,
      likeCount: apiUser.favourites_count || apiUser.like_count || 0,
      location: apiUser.location || null,
      url: apiUser.url || null,
      createdAt: apiUser.created_at ? new Date(apiUser.created_at) : new Date(),
      isProtected: apiUser.protected || false
    };
  }

  private async normalizeFollowerData(response: any): Promise<{
    followers: UserInfo[];
    following: UserInfo[];
    followerCount: number;
    followingCount: number;
  }> {
    const followers = await Promise.all(
      (response.followers || []).map((user: any) => this.normalizeUserInfo(user))
    );
    
    const following = await Promise.all(
      (response.following || []).map((user: any) => this.normalizeUserInfo(user))
    );

    return {
      followers,
      following,
      followerCount: response.followerCount || followers.length,
      followingCount: response.followingCount || following.length
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
      throw new Error(`User not found or endpoint unavailable: ${operation}`);
    }

    // その他のエラー
    throw new Error(`API error in ${operation}: ${error.message || 'Unknown error'}`);
  }
}