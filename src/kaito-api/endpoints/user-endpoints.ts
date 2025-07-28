/**
 * KaitoAPI User Endpoints - 最適化版
 * REQUIREMENTS.md準拠 - 疎結合ライブラリアーキテクチャ
 * 
 * 最適化内容:
 * - 厳密なユーザーIDバリデーション
 * - TwitterAPI.ioユーザーエンドポイント準拠
 * - ユーザーデータ正規化強化
 * - プライバシー保護強化
 * - エラーハンドリング統一
 * - フォロー操作セキュリティ強化
 */

import { 
  UserInfo, 
  FollowResult, 
  UnfollowResult, 
  UserSearchResult, 
  UserSearchOptions, 
  ProfileUpdateData, 
  ProfileUpdateResult,
  HttpClient,
  TwitterAPIUserResponse,
  TwitterAPIUserSearchResponse
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

// ============================================================================
// USER ENDPOINTS CLASS
// ============================================================================

/**
 * UserEndpoints - ユーザー関連API操作クラス
 * 
 * 主要機能:
 * - ユーザー情報の取得・更新
 * - フォロー・アンフォロー操作
 * - ユーザー検索・フィルタリング
 * - プロフィール管理
 */
export class UserEndpoints {
  private readonly USER_ENDPOINTS = {
    getUserById: '/twitter/user/info',
    getUserByUsername: '/twitter/user/info', // TwitterAPI.ioではuserNameパラメータで区別
    searchUsers: '/twitter/user/search',
    followUser: '/twitter/user/follow',
    unfollowUser: '/twitter/user/unfollow',
    getFollowers: '/twitter/user/followers',
    getFollowing: '/twitter/user/following'
  } as const;

  private readonly USER_LIMITS = {
    username: { min: 1, max: 15 },
    displayName: { min: 1, max: 50 },
    description: { min: 0, max: 160 },
    searchQuery: { min: 1, max: 100 },
    maxResults: { min: 1, max: 100 }
  } as const;

  constructor(private httpClient: HttpClient) {
    console.log('✅ UserEndpoints initialized - TwitterAPI.io最適化版');
  }

  // ============================================================================
  // USER INFORMATION METHODS
  // ============================================================================

  /**
   * ユーザー情報取得
   * 指定されたユーザーIDの詳細情報を取得
   */
  async getUserInfo(userId: string): Promise<UserInfo> {
    // ユーザーIDバリデーション強化
    const validation = this.validateUserId(userId);
    if (!validation.isValid) {
      throw new Error(`User ID validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      console.log('👤 Enhanced user info retrieval via TwitterAPI.io:', { 
        userId: this.maskSensitiveData(userId) 
      });

      const params = this.buildUserInfoParams();
      
      // TwitterAPI.io用のパラメータ調整
      if (this.isValidUserId(userId)) {
        params.userId = userId;
      } else {
        // ユーザー名として扱う
        params.userName = userId;
      }

      const response = await this.httpClient.get<TwitterAPIUserResponse>(
        this.USER_ENDPOINTS.getUserById, 
        params
      );

      // レスポンス正規化強化
      return this.normalizeUserData(response.data);

    } catch (error) {
      throw this.handleUserError(error, 'getUserInfo');
    }
  }

  /**
   * 複数ユーザー情報取得
   * 複数のユーザーIDに対して一括でユーザー情報を取得
   */
  async getMultipleUsers(userIds: string[]): Promise<UserInfo[]> {
    try {
      console.log('👥 複数ユーザー情報取得中...', { count: userIds.length });

      if (!userIds || userIds.length === 0) {
        throw new Error('User IDs are required');
      }

      if (userIds.length > 100) {
        throw new Error('Maximum 100 user IDs allowed per request');
      }

      // API呼び出し
      const response = await this.httpClient.get('/users', {
        ids: userIds.join(','),
        'user.fields': 'created_at,description,location,public_metrics,url,verified,profile_image_url,profile_banner_url'
      }) as any;

      const users: UserInfo[] = response.data.map((userData: any) => ({
        id: userData.id,
        username: userData.username,
        displayName: userData.name,
        description: userData.description || '',
        followersCount: userData.public_metrics.followers_count,
        followingCount: userData.public_metrics.following_count,
        tweetsCount: userData.public_metrics.tweet_count,
        verified: userData.verified,
        createdAt: userData.created_at,
        location: userData.location || '',
        website: userData.url || '',
        profileImageUrl: userData.profile_image_url || '',
        bannerImageUrl: userData.profile_banner_url || ''
      }));

      console.log('✅ 複数ユーザー情報取得完了:', { count: users.length });
      return users;

    } catch (error) {
      console.error('❌ 複数ユーザー情報取得エラー:', error);
      throw new Error(`Failed to get multiple users info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // FOLLOW RELATIONSHIP METHODS
  // ============================================================================

  /**
   * ユーザーフォロー
   * 指定されたユーザーをフォローする
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
      console.log('➕ Enhanced user follow via TwitterAPI.io:', { 
        userId: this.maskSensitiveData(userId) 
      });

      // TwitterAPI.ioフォローエンドポイント
      const requestData = {
        userId: this.isValidUserId(userId) ? userId : undefined,
        userName: this.isValidUsername(userId) ? userId.replace(/^@/, '') : undefined
      };

      const response = await this.httpClient.post(
        this.USER_ENDPOINTS.followUser, 
        requestData
      ) as any;

      const result: FollowResult = {
        userId,
        following: Boolean(response.data?.following || response.success),
        timestamp: new Date().toISOString(),
        success: Boolean(response.data?.following || response.success)
      };

      console.log(`${result.success ? '✅' : '❌'} User follow ${result.success ? 'completed' : 'failed'}:`, {
        userId: this.maskSensitiveData(userId),
        success: result.success
      });
      
      return result;

    } catch (error) {
      console.error('❌ ユーザーフォローエラー:', error);
      
      return {
        userId,
        following: false,
        timestamp: new Date().toISOString(),
        success: false,
        error: this.handleUserError(error, 'followUser').message
      };
    }
  }

  /**
   * ユーザーアンフォロー
   * 指定されたユーザーのフォローを解除する
   */
  async unfollowUser(userId: string): Promise<UnfollowResult> {
    try {
      console.log('➖ ユーザーアンフォロー実行中...', { userId });

      if (!userId || userId.trim().length === 0) {
        throw new Error('User ID is required');
      }

      // API呼び出し
      const response = await this.httpClient.delete(`/users/me/following/${userId}`) as any;

      const result: UnfollowResult = {
        userId,
        unfollowed: !response.data.following,
        timestamp: new Date().toISOString(),
        success: !response.data.following
      };

      console.log(`${result.success ? '✅' : '❌'} ユーザーアンフォロー${result.success ? '完了' : '失敗'}:`, result);
      return result;

    } catch (error) {
      console.error('❌ ユーザーアンフォローエラー:', error);
      
      return {
        userId,
        unfollowed: false,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // USER SEARCH METHODS
  // ============================================================================

  /**
   * ユーザー検索
   * 指定されたクエリでユーザーを検索する
   */
  async searchUsers(options: UserSearchOptions): Promise<UserSearchResult> {
    // 検索オプション検証強化
    const validation = this.validateSearchOptions(options);
    if (!validation.isValid) {
      throw new Error(`User search validation failed: ${validation.errors.join(', ')}`);
    }

    // セキュリティチェック
    const securityCheck = this.performSecurityCheck(options.query);
    if (!securityCheck.isSafe) {
      throw new Error(`Security check failed: ${securityCheck.issues.join(', ')}`);
    }

    try {
      console.log('🔍 Enhanced user search via TwitterAPI.io:', { 
        query: this.maskSensitiveData(options.query),
        maxResults: options.max_results || 10
      });

      const params = this.buildSearchParams(options);
      
      const response = await this.httpClient.get<TwitterAPIUserSearchResponse>(
        this.USER_ENDPOINTS.searchUsers, 
        params
      );

      return this.normalizeSearchResponse(response, options.query);

    } catch (error) {
      throw this.handleUserError(error, 'searchUsers');
    }
  }

  // ============================================================================
  // VALIDATION METHODS - 厳密な入力検証
  // ============================================================================

  private validateUserId(userId: string): ValidationResult {
    const errors: string[] = [];

    if (!userId?.trim()) {
      errors.push('User ID is required');
      return { isValid: false, errors };
    }

    const trimmedId = userId.trim();

    // ユーザーIDまたはユーザー名の検証
    if (!this.isValidUserId(trimmedId) && !this.isValidUsername(trimmedId)) {
      errors.push('Invalid user ID or username format');
    }

    // 長さ制限
    if (trimmedId.length > 50) {
      errors.push('User ID too long (max 50 characters)');
    }

    // セキュリティチェック
    if (this.containsMaliciousPatterns(trimmedId)) {
      errors.push('User ID contains suspicious patterns');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateSearchOptions(options: UserSearchOptions): ValidationResult {
    const errors: string[] = [];

    // クエリ検証
    if (!options.query?.trim()) {
      errors.push('Search query is required');
    } else {
      const queryLength = options.query.trim().length;
      if (queryLength < this.USER_LIMITS.searchQuery.min) {
        errors.push(`Query too short (min ${this.USER_LIMITS.searchQuery.min} characters)`);
      }
      if (queryLength > this.USER_LIMITS.searchQuery.max) {
        errors.push(`Query too long (max ${this.USER_LIMITS.searchQuery.max} characters)`);
      }
    }

    // 結果数検証
    if (options.max_results !== undefined) {
      if (options.max_results < this.USER_LIMITS.maxResults.min || 
          options.max_results > this.USER_LIMITS.maxResults.max) {
        errors.push(`Max results must be between ${this.USER_LIMITS.maxResults.min} and ${this.USER_LIMITS.maxResults.max}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateProfileUpdate(updateData: ProfileUpdateData): ValidationResult {
    const errors: string[] = [];

    if (!updateData || Object.keys(updateData).length === 0) {
      errors.push('Update data is required');
      return { isValid: false, errors };
    }

    // 表示名検証
    if (updateData.displayName !== undefined) {
      const nameLength = updateData.displayName.length;
      if (nameLength < this.USER_LIMITS.displayName.min || nameLength > this.USER_LIMITS.displayName.max) {
        errors.push(`Display name must be between ${this.USER_LIMITS.displayName.min} and ${this.USER_LIMITS.displayName.max} characters`);
      }
    }

    // 説明文検証
    if (updateData.description !== undefined) {
      const descLength = updateData.description.length;
      if (descLength > this.USER_LIMITS.description.max) {
        errors.push(`Description too long (max ${this.USER_LIMITS.description.max} characters)`);
      }
    }

    // URL検証
    if (updateData.website && !this.isValidUrl(updateData.website)) {
      errors.push('Invalid website URL format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============================================================================
  // SECURITY METHODS - セキュリティ強化
  // ============================================================================

  private performSecurityCheck(input: string): SecurityCheckResult {
    const issues: string[] = [];

    if (this.containsMaliciousPatterns(input)) {
      issues.push('Input contains potentially malicious patterns');
    }

    if (this.detectSQLInjection(input)) {
      issues.push('Potential SQL injection detected');
    }

    if (this.detectXSSAttempt(input)) {
      issues.push('Potential XSS attempt detected');
    }

    return {
      isSafe: issues.length === 0,
      issues
    };
  }

  private containsMaliciousPatterns(input: string): boolean {
    const maliciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /\beval\b/i,
      /\bdocument\./i,
      /\bwindow\./i
    ];

    return maliciousPatterns.some(pattern => pattern.test(input));
  }

  private detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /\bUNION\b.*\bSELECT\b/i,
      /\bDROP\b.*\bTABLE\b/i,
      /\bINSERT\b.*\bINTO\b/i,
      /\bDELETE\b.*\bFROM\b/i,
      /\bUPDATE\b.*\bSET\b/i,
      /'\s*(OR|AND)\s*'\d+\s*'\s*=\s*'\d+/i
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  private detectXSSAttempt(input: string): boolean {
    const xssPatterns = [
      /<[^>]*>/,
      /javascript:/i,
      /on\w+\s*=/i,
      /\balert\s*\(/i,
      /\bconfirm\s*\(/i,
      /\bprompt\s*\(/i
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  // ============================================================================
  // RESPONSE NORMALIZATION - データ正規化強化
  // ============================================================================

  private normalizeUserData(apiUser: any): UserInfo {
    return {
      id: String(apiUser.id || ''),
      username: String(apiUser.username || '').toLowerCase(),
      displayName: String(apiUser.name || ''),
      description: this.sanitizeText(apiUser.description || ''),
      followersCount: Math.max(0, Number(apiUser.public_metrics?.followers_count || apiUser.followersCount || 0)),
      followingCount: Math.max(0, Number(apiUser.public_metrics?.following_count || apiUser.followingCount || 0)),
      tweetsCount: Math.max(0, Number(apiUser.public_metrics?.tweet_count || apiUser.tweetsCount || 0)),
      verified: Boolean(apiUser.verified || apiUser.verified_type === 'blue'),
      createdAt: this.normalizeTimestamp(apiUser.created_at || apiUser.createdAt),
      location: this.sanitizeText(apiUser.location || ''),
      website: this.normalizeUrl(apiUser.url || apiUser.website || ''),
      profileImageUrl: this.normalizeUrl(apiUser.profile_image_url || apiUser.profileImageUrl || ''),
      bannerImageUrl: this.normalizeUrl(apiUser.profile_banner_url || apiUser.bannerImageUrl || '')
    };
  }

  private normalizeSearchResponse(
    response: TwitterAPIUserSearchResponse, 
    originalQuery: string
  ): UserSearchResult {
    const normalizedUsers = response.data.map(user => this.normalizeUserData(user));
    
    return {
      users: normalizedUsers,
      totalCount: response.meta?.result_count || normalizedUsers.length,
      nextToken: response.meta?.next_token,
      searchQuery: originalQuery,
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // UTILITY METHODS - ヘルパーメソッド
  // ============================================================================

  private isValidUserId(userId: string): boolean {
    // TwitterのユーザーIDは数値文字列（1-20桁）
    return /^\d{1,20}$/.test(userId);
  }

  private isValidUsername(username: string): boolean {
    // Twitterのユーザー名は英数字とアンダースコア（1-15文字）
    return /^[a-zA-Z0-9_]{1,15}$/.test(username.replace(/^@/, ''));
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return /^https?:\/\//.test(url);
    } catch {
      return false;
    }
  }

  private sanitizeText(text: string): string {
    return text
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // 制御文字除去
      .replace(/<[^>]*>/g, '') // HTMLタグ除去
      .trim();
  }

  private normalizeUrl(url: string): string {
    if (!url || !this.isValidUrl(url)) return '';
    return url.trim();
  }

  private normalizeTimestamp(timestamp: any): string {
    if (!timestamp) return new Date().toISOString();
    
    try {
      return new Date(timestamp).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private maskSensitiveData(data: string): string {
    if (data.length <= 4) return '***';
    return data.substring(0, 2) + '*'.repeat(data.length - 4) + data.substring(data.length - 2);
  }

  // ============================================================================
  // PARAMETER BUILDING - TwitterAPI.io最適化
  // ============================================================================

  private buildUserInfoParams(): Record<string, any> {
    return {
      // TwitterAPI.ioの標準パラメータ
      // userIdまたはuserNameは呼び出し時に追加
    };
  }

  private buildSearchParams(options: UserSearchOptions): Record<string, any> {
    return {
      query: this.sanitizeText(options.query),
      count: options.max_results || 10,
      ...(options.next_token && { nextToken: options.next_token })
    };
  }

  // ============================================================================
  // ERROR HANDLING - 統一されたエラーハンドリング
  // ============================================================================

  private handleUserError(error: any, context: string): Error {
    console.error(`❌ ${context} error:`, error);

    // TwitterAPI.io特有エラーハンドリング
    if (error.response?.status === 429) {
      return new Error('Rate limit exceeded. Please try again later.');
    }

    if (error.response?.status === 401) {
      return new Error('Authentication failed. Please check your API key.');
    }

    if (error.response?.status === 403) {
      return new Error('Access forbidden. Check permissions or privacy settings.');
    }

    if (error.response?.status === 404) {
      return new Error('User not found or endpoint unavailable.');
    }

    if (error.response?.status === 422) {
      return new Error('Invalid request data. Please check your input.');
    }

    // ネットワークエラー
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new Error('Network error. Please check your internet connection.');
    }

    return new Error(`${context} failed: ${error.message || 'Unknown error'}`);
  }

  // ============================================================================
  // PROFILE MANAGEMENT METHODS
  // ============================================================================

  /**
   * プロフィール更新
   * 自分のプロフィール情報を更新する
   */
  async updateProfile(updateData: ProfileUpdateData): Promise<ProfileUpdateResult> {
    // プロフィール更新データ検証
    const validation = this.validateProfileUpdate(updateData);
    if (!validation.isValid) {
      return {
        userId: '',
        updated: false,
        timestamp: new Date().toISOString(),
        success: false,
        updatedFields: [],
        error: `Profile validation failed: ${validation.errors.join(', ')}`
      };
    }

    try {
      console.log('📝 Enhanced profile update via TwitterAPI.io:', {
        fields: Object.keys(updateData),
        fieldCount: Object.keys(updateData).length
      });

      // サニタイズされた更新データ構築
      const { apiUpdateData, updatedFields } = this.buildProfileUpdateData(updateData);

      // API呼び出し（TwitterAPI.ioの実際のエンドポイントに合わせて調整が必要）
      const response = await this.httpClient.post('/users/me', apiUpdateData) as any;

      const result: ProfileUpdateResult = {
        userId: String(response.data?.id || 'unknown'),
        updated: true,
        timestamp: new Date().toISOString(),
        success: true,
        updatedFields
      };

      console.log('✅ Profile update completed:', { 
        userId: this.maskSensitiveData(result.userId), 
        fields: updatedFields 
      });

      return result;

    } catch (error) {
      console.error('❌ プロフィール更新エラー:', error);
      
      return {
        userId: '',
        updated: false,
        timestamp: new Date().toISOString(),
        success: false,
        updatedFields: [],
        error: this.handleUserError(error, 'updateProfile').message
      };
    }
  }

  private buildProfileUpdateData(updateData: ProfileUpdateData): {
    apiUpdateData: Record<string, any>;
    updatedFields: string[];
  } {
    const apiUpdateData: Record<string, any> = {};
    const updatedFields: string[] = [];

    if (updateData.displayName !== undefined) {
      apiUpdateData.name = this.sanitizeText(updateData.displayName);
      updatedFields.push('displayName');
    }

    if (updateData.description !== undefined) {
      apiUpdateData.description = this.sanitizeText(updateData.description);
      updatedFields.push('description');
    }

    if (updateData.location !== undefined) {
      apiUpdateData.location = this.sanitizeText(updateData.location);
      updatedFields.push('location');
    }

    if (updateData.website !== undefined) {
      const normalizedUrl = this.normalizeUrl(updateData.website);
      if (normalizedUrl) {
        apiUpdateData.url = normalizedUrl;
        updatedFields.push('website');
      }
    }

    return { apiUpdateData, updatedFields };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * ユーザー名からユーザーID取得
   */
  async getUserIdByUsername(username: string): Promise<string | null> {
    try {
      if (!username || username.trim().length === 0) {
        throw new Error('Username is required');
      }

      // @マークを除去
      const cleanUsername = username.replace(/^@/, '');

      const response = await this.httpClient.get(`/users/by/username/${cleanUsername}`) as any;

      return response.data.id;

    } catch (error) {
      console.error('❌ ユーザーID取得エラー:', error);
      return null;
    }
  }

  /**
   * フォロー関係確認
   */
  async checkFollowingStatus(userId: string): Promise<boolean> {
    try {
      if (!userId || userId.trim().length === 0) {
        return false;
      }

      const response = await this.httpClient.get('/users/me/following', {
        ids: userId
      }) as any;

      return response.data.length > 0 && response.data[0].following;

    } catch (error) {
      console.error('❌ フォロー状態確認エラー:', error);
      return false;
    }
  }

}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * 使用例:
 * 
 * ```typescript
 * const userEndpoints = new UserEndpoints(config, httpClient);
 * 
 * // ユーザー情報取得
 * const userInfo = await userEndpoints.getUserInfo('123456789');
 * 
 * // ユーザーフォロー
 * const followResult = await userEndpoints.followUser('123456789');
 * 
 * // ユーザー検索
 * const searchResult = await userEndpoints.searchUsers({
 *   query: 'trading crypto',
 *   maxResults: 20,
 *   includeVerified: true
 * });
 * 
 * // プロフィール更新
 * const updateResult = await userEndpoints.updateProfile({
 *   displayName: 'New Name',
 *   description: 'Updated bio'
 * });
 * ```
 */