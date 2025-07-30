/**
 * Public Follower Info Endpoint - APIキー認証専用
 * REQUIREMENTS.md準拠 - 読み取り専用フォロワー情報取得
 * 
 * 機能:
 * - フォロワー・フォロー情報取得
 * - フォロワー関係性分析
 * - ページネーション対応
 * 
 * 認証レベル: APIキー認証のみ（読み取り専用）
 */

import { 
  UserInfo,
  FollowerResponse,
  HttpClient,
  TwitterAPIUserResponse
} from '../../utils/types';
import { AuthManager } from '../../core/auth-manager';

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

interface FollowerInfoResponse {
  success: boolean;
  data: {
    followers: UserInfo[];
    totalCount: number;
    fetchedCount: number;
  };
  pagination?: {
    nextCursor?: string;
    previousCursor?: string;
    hasMore: boolean;
  };
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface FollowingInfoResponse {
  success: boolean;
  data: {
    following: UserInfo[];
    totalCount: number;
    fetchedCount: number;
  };
  pagination?: {
    nextCursor?: string;
    previousCursor?: string;
    hasMore: boolean;
  };
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface RelationshipResponse {
  success: boolean;
  data: {
    source: {
      id: string;
      username: string;
      following: boolean;
      followedBy: boolean;
      canDm: boolean;
      blocking: boolean;
      blockedBy: boolean;
      muting: boolean;
      wantRetweets: boolean;
      allReplies: boolean;
      markedSpam: boolean;
    };
    target: {
      id: string;
      username: string;
      following: boolean;
      followedBy: boolean;
    };
  };
}

// ============================================================================
// FILTER OPTIONS
// ============================================================================

interface FollowerFilterOptions {
  verified?: boolean;
  minFollowers?: number;
  maxFollowers?: number;
  hasProfileImage?: boolean;
  recentlyActive?: boolean; // 最近30日以内にツイート
  language?: string;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// FOLLOWER INFO ENDPOINT CLASS
// ============================================================================

/**
 * FollowerInfoEndpoint - 公開フォロワー情報API操作クラス
 * 
 * APIキー認証のみで実行可能な読み取り専用機能:
 * - ユーザーのフォロワー・フォロー一覧取得
 * - フォロワー関係性分析・統計情報
 * - フィルタリング・ソート機能
 */
export class FollowerInfoEndpoint {
  private readonly ENDPOINTS = {
    getFollowers: '/twitter/user/followers',
    getFollowing: '/twitter/user/following',
    getFriendship: '/twitter/user/friendship',
    getFollowersIds: '/twitter/user/followers/ids',
    getFollowingIds: '/twitter/user/following/ids'
  } as const;

  private readonly RATE_LIMITS = {
    followers: { limit: 15, window: 900 }, // 15/15min
    following: { limit: 15, window: 900 }, // 15/15min
    friendship: { limit: 180, window: 900 }, // 180/15min
    followerIds: { limit: 15, window: 900 }, // 15/15min
    followingIds: { limit: 15, window: 900 } // 15/15min
  } as const;

  private readonly VALIDATION_RULES = {
    userName: /^[a-zA-Z0-9_]{1,15}$/,
    userId: /^[0-9]+$/,
    cursor: /^-?\d+$/,
    count: { min: 1, max: 200 }
  } as const;

  private readonly DEFAULT_FETCH_COUNT = 20;
  private readonly MAX_FETCH_COUNT = 200;

  constructor(
    private httpClient: HttpClient,
    private authManager: AuthManager
  ) {}

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * ユーザーのフォロワー一覧取得
   * APIキー認証のみで実行可能
   */
  async getFollowers(
    userName: string, 
    options?: { 
      cursor?: string; 
      count?: number; 
      includeUserEntities?: boolean;
      skipStatus?: boolean;
      filter?: FollowerFilterOptions; 
    }
  ): Promise<FollowerInfoResponse> {
    // 入力バリデーション
    const validation = this.validateUserName(userName);
    if (!validation.isValid) {
      throw new Error(`Invalid userName: ${validation.errors.join(', ')}`);
    }

    if (options?.count) {
      const countValidation = this.validateCount(options.count);
      if (!countValidation.isValid) {
        throw new Error(`Invalid count: ${countValidation.errors.join(', ')}`);
      }
    }

    try {
      const headers = this.authManager.getAuthHeaders();
      
      const params: any = { 
        screen_name: userName,
        count: Math.min(options?.count || this.DEFAULT_FETCH_COUNT, this.MAX_FETCH_COUNT),
        include_user_entities: options?.includeUserEntities || true,
        skip_status: options?.skipStatus || true
      };
      
      if (options?.cursor) params.cursor = options.cursor;

      const response = await this.httpClient.get<any>(
        this.ENDPOINTS.getFollowers,
        { ...params, headers }
      );

      // レスポンス正規化
      const followers = await Promise.all(
        (response.users || []).map((user: any) => this.normalizeUserInfo(user))
      );

      // フィルタリング適用
      const filteredFollowers = options?.filter 
        ? this.applyFollowerFilter(followers, options.filter)
        : followers;

      return {
        success: true,
        data: {
          followers: filteredFollowers,
          totalCount: response.total_count || filteredFollowers.length,
          fetchedCount: filteredFollowers.length
        },
        pagination: {
          nextCursor: response.next_cursor_str,
          previousCursor: response.previous_cursor_str,
          hasMore: !!response.next_cursor_str
        },
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleAPIKeyError(error, 'getFollowers');
    }
  }

  /**
   * ユーザーのフォロー一覧取得
   * APIキー認証のみで実行可能
   */
  async getFollowing(
    userName: string, 
    options?: { 
      cursor?: string; 
      count?: number; 
      includeUserEntities?: boolean;
      skipStatus?: boolean;
      filter?: FollowerFilterOptions; 
    }
  ): Promise<FollowingInfoResponse> {
    // 入力バリデーション
    const validation = this.validateUserName(userName);
    if (!validation.isValid) {
      throw new Error(`Invalid userName: ${validation.errors.join(', ')}`);
    }

    try {
      const headers = this.authManager.getAuthHeaders();
      
      const params: any = { 
        screen_name: userName,
        count: Math.min(options?.count || this.DEFAULT_FETCH_COUNT, this.MAX_FETCH_COUNT),
        include_user_entities: options?.includeUserEntities || true,
        skip_status: options?.skipStatus || true
      };
      
      if (options?.cursor) params.cursor = options.cursor;

      const response = await this.httpClient.get<any>(
        this.ENDPOINTS.getFollowing,
        { ...params, headers }
      );

      // レスポンス正規化
      const following = await Promise.all(
        (response.users || []).map((user: any) => this.normalizeUserInfo(user))
      );

      // フィルタリング適用
      const filteredFollowing = options?.filter 
        ? this.applyFollowerFilter(following, options.filter)
        : following;

      return {
        success: true,
        data: {
          following: filteredFollowing,
          totalCount: response.total_count || filteredFollowing.length,
          fetchedCount: filteredFollowing.length
        },
        pagination: {
          nextCursor: response.next_cursor_str,
          previousCursor: response.previous_cursor_str,
          hasMore: !!response.next_cursor_str
        },
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleAPIKeyError(error, 'getFollowing');
    }
  }

  /**
   * ユーザー間の関係性確認
   * APIキー認証のみで実行可能
   */
  async getFriendship(sourceUser: string, targetUser: string): Promise<RelationshipResponse> {
    // 入力バリデーション
    const sourceValidation = this.validateUserName(sourceUser);
    const targetValidation = this.validateUserName(targetUser);
    
    if (!sourceValidation.isValid) {
      throw new Error(`Invalid sourceUser: ${sourceValidation.errors.join(', ')}`);
    }
    if (!targetValidation.isValid) {
      throw new Error(`Invalid targetUser: ${targetValidation.errors.join(', ')}`);
    }

    try {
      const headers = this.authManager.getAuthHeaders();
      
      const response = await this.httpClient.get<any>(
        this.ENDPOINTS.getFriendship,
        { 
          source_screen_name: sourceUser,
          target_screen_name: targetUser
        }
      );

      // レスポンス正規化
      const relationship = response.relationship || {};
      const source = relationship.source || {};
      const target = relationship.target || {};

      return {
        success: true,
        data: {
          source: {
            id: source.id_str || source.id,
            username: source.screen_name || sourceUser,
            following: source.following || false,
            followedBy: source.followed_by || false,
            canDm: source.can_dm || false,
            blocking: source.blocking || false,
            blockedBy: source.blocked_by || false,
            muting: source.muting || false,
            wantRetweets: source.want_retweets || false,
            allReplies: source.all_replies || false,
            markedSpam: source.marked_spam || false
          },
          target: {
            id: target.id_str || target.id,
            username: target.screen_name || targetUser,
            following: target.following || false,
            followedBy: target.followed_by || false
          }
        }
      };

    } catch (error: any) {
      throw this.handleAPIKeyError(error, 'getFriendship');
    }
  }

  /**
   * フォロワーIDリスト取得（軽量版）
   * APIキー認証のみで実行可能
   */
  async getFollowerIds(userName: string, options?: { cursor?: string; count?: number }): Promise<{
    success: boolean;
    data: { ids: string[]; totalCount: number };
    pagination?: { nextCursor?: string; hasMore: boolean };
  }> {
    const validation = this.validateUserName(userName);
    if (!validation.isValid) {
      throw new Error(`Invalid userName: ${validation.errors.join(', ')}`);
    }

    try {
      const headers = this.authManager.getAuthHeaders();
      
      const params: any = { 
        screen_name: userName,
        count: Math.min(options?.count || 5000, 5000) // TwitterAPI制限
      };
      
      if (options?.cursor) params.cursor = options.cursor;

      const response = await this.httpClient.get<any>(
        this.ENDPOINTS.getFollowersIds,
        { ...params, headers }
      );

      const ids = (response.ids || []).map((id: any) => String(id));

      return {
        success: true,
        data: {
          ids,
          totalCount: ids.length
        },
        pagination: {
          nextCursor: response.next_cursor_str,
          hasMore: !!response.next_cursor_str
        }
      };

    } catch (error: any) {
      throw this.handleAPIKeyError(error, 'getFollowerIds');
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

  private validateCount(count: number): ValidationResult {
    const errors: string[] = [];

    if (typeof count !== 'number' || !Number.isInteger(count)) {
      errors.push('count must be an integer');
    } else if (count < this.VALIDATION_RULES.count.min || count > this.VALIDATION_RULES.count.max) {
      errors.push(`count must be between ${this.VALIDATION_RULES.count.min} and ${this.VALIDATION_RULES.count.max}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  // ============================================================================
  // PRIVATE METHODS - FILTERING
  // ============================================================================

  private applyFollowerFilter(users: UserInfo[], filter: FollowerFilterOptions): UserInfo[] {
    return users.filter(user => {
      // 認証済みアカウントフィルタ
      if (filter.verified !== undefined && user.verified !== filter.verified) {
        return false;
      }

      // フォロワー数フィルタ
      if (filter.minFollowers !== undefined && (user.followersCount ?? 0) < filter.minFollowers) {
        return false;
      }
      if (filter.maxFollowers !== undefined && (user.followersCount ?? 0) > filter.maxFollowers) {
        return false;
      }

      // プロフィール画像有無フィルタ
      if (filter.hasProfileImage !== undefined) {
        const hasImage = user.profileImageUrl && 
          !user.profileImageUrl.includes('default_profile_image');
        if (hasImage !== filter.hasProfileImage) {
          return false;
        }
      }

      return true;
    });
  }

  // ============================================================================
  // PRIVATE METHODS - DATA NORMALIZATION
  // ============================================================================

  private async normalizeUserInfo(apiUser: any): Promise<UserInfo> {
    return {
      id: apiUser.id_str || apiUser.id,
      username: apiUser.screen_name || apiUser.username,
      name: apiUser.name || apiUser.display_name || '',
      displayName: apiUser.name || apiUser.display_name,
      bio: apiUser.description || '',
      profileImageUrl: apiUser.profile_image_url_https || apiUser.profile_image_url,
      verified: apiUser.verified || false,
      followersCount: apiUser.followers_count || 0,
      followingCount: apiUser.friends_count || apiUser.following_count || 0,
      tweetCount: apiUser.statuses_count || apiUser.tweet_count || 0,
      likeCount: apiUser.favourites_count || apiUser.like_count || 0,
      protected: apiUser.protected || false
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

    // プライベートアカウントエラー
    if (error.message?.includes('protected') || error.message?.includes('private')) {
      throw new Error(`Cannot access followers/following of protected account: ${operation}`);
    }

    // その他のエラー
    throw new Error(`API error in ${operation}: ${error.message || 'Unknown error'}`);
  }
}