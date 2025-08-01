/**
 * Authenticated Follow Management Endpoint
 * V2ログイン認証が必要なフォロー管理機能
 * REQUIREMENTS.md準拠
 */

import { 
  FollowResult, 
  UnfollowResult,
  HttpClient
} from '../../utils/types';
import { AuthManager } from '../../core/auth-manager';

// ============================================================================
// VALIDATION TYPES
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface FollowListResponse {
  success: boolean;
  data: {
    users: Array<{
      id: string;
      username: string;
      displayName: string;
      isFollowing: boolean;
      isFollowedBy: boolean;
    }>;
    totalCount: number;
  };
  pagination?: {
    nextCursor?: string;
    hasMore: boolean;
  };
}

// ============================================================================
// FOLLOW MANAGEMENT CLASS
// ============================================================================

/**
 * FollowManagement - 認証必須フォロー管理クラス
 * 
 * V2ログイン認証（login_cookie）が必要な機能:
 * - ユーザーのフォロー
 * - フォロー解除
 * - フォロー状態の確認
 */
export class FollowManagement {
  private readonly ENDPOINTS = {
    followUser: '/twitter/follow_user_v2',
    unfollowUser: '/twitter/unfollow_user_v2',
    checkFollowing: '/twitter/user/following/check'
  } as const;

  private readonly RATE_LIMITS = {
    follow: { limit: 400, window: 86400 },      // 400/day
    unfollow: { limit: 400, window: 86400 },    // 400/day
    checkFollowing: { limit: 15, window: 900 }  // 15/15min
  } as const;

  private readonly VALIDATION_RULES = {
    userId: /^\d{1,19}$/,
    username: /^[a-zA-Z0-9_]{1,15}$/
  } as const;

  constructor(
    private httpClient: HttpClient,
    private authManager: AuthManager
  ) {
    console.log('✅ FollowManagement initialized with V2 authentication');
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * ユーザーをフォローする
   * V2ログイン認証（login_cookie）必須
   */
  async followUser(userId: string): Promise<FollowResult> {
    // フォロー対象バリデーション
    const validation = this.validateUserId(userId);
    if (!validation.isValid) {
      return {
        userId,
        following: false,
        timestamp: new Date().toISOString(),
        success: false,
        error: `Follow validation failed: ${validation.errors.join(', ')}`
      };
    }

    try {
      // V2認証確認
      const loginCookie = this.authManager.getUserSession();
      if (!loginCookie) {
        return {
          userId,
          following: false,
          timestamp: new Date().toISOString(),
          success: false,
          error: 'No valid V2 login session available. Please authenticate first.'
        };
      }

      console.log('➕ Following user with V2 authentication:', { 
        userId: this.maskSensitiveData(userId) 
      });

      // プロキシ設定を取得
      const currentProxy = this.authManager.getCurrentProxy();
      if (!currentProxy) {
        return {
          userId,
          following: false,
          timestamp: new Date().toISOString(),
          success: false,
          error: 'No available proxy for follow action. Proxy is required for TwitterAPI.io follow_user_v2.'
        };
      }

      // TwitterAPI.ioフォローエンドポイント（API仕様準拠）
      const requestData: any = {
        login_cookies: loginCookie,  // 複数形
        user_id: this.isNumericUserId(userId) ? userId : undefined,
        proxy: currentProxy
      };

      // ユーザー名の場合は別途ユーザーID取得が必要
      if (!this.isNumericUserId(userId)) {
        return {
          userId,
          following: false,
          timestamp: new Date().toISOString(),
          success: false,
          error: 'Username-based follow not supported. Please provide numeric user ID.'
        };
      }

      const response = await this.httpClient.post(
        this.ENDPOINTS.followUser, 
        requestData
      ) as any;

      // TwitterAPI.ioレスポンス: {"status":"success","message":"follow_user success."}
      const isSuccess = response?.status === "success";
      
      const result: FollowResult = {
        userId,
        following: isSuccess,
        timestamp: new Date().toISOString(),
        success: isSuccess
      };

      console.log(`${result.success ? '✅' : '❌'} User follow ${result.success ? 'completed' : 'failed'}:`, {
        userId: this.maskSensitiveData(userId),
        success: result.success
      });
      
      return result;

    } catch (error: any) {
      console.error('❌ User follow error:', error);
      
      return {
        userId,
        following: false,
        timestamp: new Date().toISOString(),
        success: false,
        error: this.handleFollowError(error, 'follow')
      };
    }
  }

  /**
   * ユーザーのフォローを解除する
   * V2ログイン認証（login_cookie）必須
   */
  async unfollowUser(userId: string): Promise<UnfollowResult> {
    // アンフォロー対象バリデーション
    const validation = this.validateUserId(userId);
    if (!validation.isValid) {
      return {
        userId,
        unfollowed: false,
        timestamp: new Date().toISOString(),
        success: false,
        error: `Unfollow validation failed: ${validation.errors.join(', ')}`
      };
    }

    try {
      // V2認証確認
      const loginCookie = this.authManager.getUserSession();
      if (!loginCookie) {
        return {
          userId,
          unfollowed: false,
          timestamp: new Date().toISOString(),
          success: false,
          error: 'No valid V2 login session available. Please authenticate first.'
        };
      }

      console.log('➖ Unfollowing user with V2 authentication:', { 
        userId: this.maskSensitiveData(userId) 
      });

      // プロキシ設定を取得
      const currentProxy = this.authManager.getCurrentProxy();
      if (!currentProxy) {
        return {
          userId,
          unfollowed: false,
          timestamp: new Date().toISOString(),
          success: false,
          error: 'No available proxy for unfollow action. Proxy is required for TwitterAPI.io unfollow_user_v2.'
        };
      }

      // TwitterAPI.ioアンフォローエンドポイント（API仕様準拠）
      const requestData: any = {
        login_cookies: loginCookie,  // 複数形
        user_id: this.isNumericUserId(userId) ? userId : undefined,
        proxy: currentProxy
      };

      // ユーザー名の場合は別途ユーザーID取得が必要
      if (!this.isNumericUserId(userId)) {
        return {
          userId,
          unfollowed: false,
          timestamp: new Date().toISOString(),
          success: false,
          error: 'Username-based unfollow not supported. Please provide numeric user ID.'
        };
      }

      const response = await this.httpClient.post(
        this.ENDPOINTS.unfollowUser,
        requestData
      ) as any;

      // TwitterAPI.ioレスポンス: {"status":"success","message":"unfollow_user success."}
      const isSuccess = response?.status === "success";
      
      const result: UnfollowResult = {
        userId,
        unfollowed: isSuccess,
        timestamp: new Date().toISOString(),
        success: isSuccess
      };

      console.log(`${result.success ? '✅' : '❌'} User unfollow ${result.success ? 'completed' : 'failed'}:`, {
        userId: this.maskSensitiveData(userId),
        success: result.success
      });

      return result;

    } catch (error: any) {
      console.error('❌ User unfollow error:', error);
      
      return {
        userId,
        unfollowed: false,
        timestamp: new Date().toISOString(),
        success: false,
        error: this.handleFollowError(error, 'unfollow')
      };
    }
  }

  /**
   * フォロー状態を確認する
   * V2ログイン認証（login_cookie）必須
   */
  async checkFollowingStatus(userId: string): Promise<boolean> {
    try {
      // V2認証確認
      const loginCookie = this.authManager.getUserSession();
      if (!loginCookie) {
        throw new Error('No valid V2 login session available');
      }

      console.log('🔍 Checking following status with V2 authentication...');

      // プロキシ設定を取得
      const currentProxy = this.authManager.getCurrentProxy();
      if (!currentProxy) {
        throw new Error('No available proxy for follow status check');
      }

      const requestData: any = {
        login_cookies: loginCookie,  // 複数形
        user_id: this.isNumericUserId(userId) ? userId : undefined,
        proxy: currentProxy
      };

      // ユーザー名の場合は別途ユーザーID取得が必要
      if (!this.isNumericUserId(userId)) {
        throw new Error('Username-based follow status check not supported. Please provide numeric user ID.');
      }

      const response = await this.httpClient.get(
        this.ENDPOINTS.checkFollowing,
        requestData
      ) as any;

      return Boolean(response.data?.isFollowing || false);
    } catch (error) {
      console.error('❌ Check following status error:', error);
      return false;
    }
  }

  // ============================================================================
  // PRIVATE METHODS - VALIDATION
  // ============================================================================

  private validateUserId(userId: string): ValidationResult {
    const errors: string[] = [];

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      errors.push('User ID is required and must be a non-empty string');
      return { isValid: false, errors };
    }

    const cleanUserId = userId.replace(/^@/, '');

    // 数値IDまたはユーザー名のどちらかであることを確認
    const isNumericId = this.VALIDATION_RULES.userId.test(cleanUserId);
    const isUsername = this.VALIDATION_RULES.username.test(cleanUserId);

    if (!isNumericId && !isUsername) {
      errors.push('Invalid user ID format. Must be a numeric ID (1-19 digits) or username (1-15 alphanumeric characters)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isNumericUserId(userId: string): boolean {
    const cleanUserId = userId.replace(/^@/, '');
    return this.VALIDATION_RULES.userId.test(cleanUserId);
  }

  // ============================================================================
  // PRIVATE METHODS - ERROR HANDLING
  // ============================================================================

  private handleFollowError(error: any, operation: 'follow' | 'unfollow'): string {
    // Rate limit error
    if (error.response?.status === 429) {
      return `Daily ${operation} limit reached. Please try again tomorrow.`;
    }

    // Authentication error
    if (error.response?.status === 401) {
      return 'V2 authentication failed. Please re-authenticate with login_cookie.';
    }

    // Permission error
    if (error.response?.status === 403) {
      if (operation === 'follow' && error.message?.includes('already following')) {
        return 'Already following this user.';
      }
      if (operation === 'unfollow' && error.message?.includes('not following')) {
        return 'Not following this user.';
      }
      return `Cannot ${operation} this user. Account may be suspended or protected.`;
    }

    // User not found
    if (error.response?.status === 404) {
      return 'User not found or account has been deleted.';
    }

    // Login cookie error
    if (error.message?.includes('login_cookie')) {
      return 'V2 login session expired or invalid. Please re-authenticate.';
    }

    // Default error
    return error.message || `Failed to ${operation} user. Please try again later.`;
  }

  // ============================================================================
  // PRIVATE METHODS - UTILITY
  // ============================================================================

  private maskSensitiveData(data: string): string {
    if (!data || data.length < 4) return '***';
    return data.substring(0, 3) + '***';
  }
}