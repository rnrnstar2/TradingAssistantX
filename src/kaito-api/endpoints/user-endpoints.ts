/**
 * KaitoAPI User Endpoints - ユーザー関連API実装
 * REQUIREMENTS.md準拠 - 疎結合ライブラリアーキテクチャ
 * 
 * 機能概要:
 * - ユーザー情報取得・管理
 * - フォロー関係の管理
 * - ユーザー検索機能
 * - プロフィール情報操作
 */

import { KaitoAPIConfig } from '../core/config';

// ============================================================================
// USER INTERFACES
// ============================================================================

export interface UserInfo {
  id: string;
  username: string;
  displayName: string;
  description: string;
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  verified: boolean;
  createdAt: string;
  location: string;
  website: string;
  profileImageUrl: string;
  bannerImageUrl: string;
}

export interface FollowResult {
  userId: string;
  following: boolean;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface UnfollowResult {
  userId: string;
  unfollowed: boolean;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface UserSearchResult {
  users: UserInfo[];
  totalCount: number;
  nextToken?: string;
  searchQuery: string;
  timestamp: string;
}

export interface UserSearchOptions {
  query: string;
  maxResults?: number;
  nextToken?: string;
  includeVerified?: boolean;
  minFollowers?: number;
  maxFollowers?: number;
}

export interface ProfileUpdateData {
  displayName?: string;
  description?: string;
  location?: string;
  website?: string;
  profileImageUrl?: string;
  bannerImageUrl?: string;
}

export interface ProfileUpdateResult {
  userId: string;
  updated: boolean;
  timestamp: string;
  success: boolean;
  updatedFields: string[];
  error?: string;
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
  private config: KaitoAPIConfig;
  private httpClient: any; // HttpClientインスタンス

  constructor(config: KaitoAPIConfig, httpClient: any) {
    this.config = config;
    this.httpClient = httpClient;
    
    console.log('✅ UserEndpoints initialized - 疎結合ライブラリアーキテクチャ');
  }

  // ============================================================================
  // USER INFORMATION METHODS
  // ============================================================================

  /**
   * ユーザー情報取得
   * 指定されたユーザーIDの詳細情報を取得
   */
  async getUserInfo(userId: string): Promise<UserInfo> {
    try {
      console.log('👤 ユーザー情報取得中...', { userId });

      if (!userId || userId.trim().length === 0) {
        throw new Error('User ID is required');
      }

      // API呼び出し
      const response = await this.httpClient.get<{
        data: {
          id: string;
          username: string;
          name: string;
          description: string;
          public_metrics: {
            followers_count: number;
            following_count: number;
            tweet_count: number;
          };
          verified: boolean;
          created_at: string;
          location: string;
          url: string;
          profile_image_url: string;
          profile_banner_url: string;
        }
      }>(`/users/${userId}`, {
        'user.fields': 'created_at,description,location,public_metrics,url,verified,profile_image_url,profile_banner_url'
      });

      const userData = response.data;
      
      const userInfo: UserInfo = {
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
      };

      console.log('✅ ユーザー情報取得完了:', { 
        username: userInfo.username, 
        followers: userInfo.followersCount 
      });

      return userInfo;

    } catch (error) {
      console.error('❌ ユーザー情報取得エラー:', error);
      throw new Error(`Failed to get user info: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const response = await this.httpClient.get<{
        data: Array<{
          id: string;
          username: string;
          name: string;
          description: string;
          public_metrics: {
            followers_count: number;
            following_count: number;
            tweet_count: number;
          };
          verified: boolean;
          created_at: string;
          location: string;
          url: string;
          profile_image_url: string;
          profile_banner_url: string;
        }>
      }>('/users', {
        ids: userIds.join(','),
        'user.fields': 'created_at,description,location,public_metrics,url,verified,profile_image_url,profile_banner_url'
      });

      const users: UserInfo[] = response.data.map(userData => ({
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
    try {
      console.log('➕ ユーザーフォロー実行中...', { userId });

      if (!userId || userId.trim().length === 0) {
        throw new Error('User ID is required');
      }

      // API呼び出し
      const response = await this.httpClient.post<{
        data: {
          following: boolean;
          pending_follow: boolean;
        }
      }>('/users/me/following', {
        target_user_id: userId
      });

      const result: FollowResult = {
        userId,
        following: response.data.following,
        timestamp: new Date().toISOString(),
        success: response.data.following || response.data.pending_follow
      };

      console.log(`${result.success ? '✅' : '❌'} ユーザーフォロー${result.success ? '完了' : '失敗'}:`, result);
      return result;

    } catch (error) {
      console.error('❌ ユーザーフォローエラー:', error);
      
      return {
        userId,
        following: false,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
      const response = await this.httpClient.delete<{
        data: {
          following: boolean;
        }
      }>(`/users/me/following/${userId}`);

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
    try {
      console.log('🔍 ユーザー検索実行中...', { query: options.query });

      if (!options.query || options.query.trim().length === 0) {
        throw new Error('Search query is required');
      }

      // 検索パラメータ構築
      const params: Record<string, any> = {
        q: options.query,
        max_results: Math.min(options.maxResults || 50, 100),
        'user.fields': 'created_at,description,location,public_metrics,url,verified,profile_image_url,profile_banner_url'
      };

      if (options.nextToken) {
        params.next_token = options.nextToken;
      }

      // API呼び出し
      const response = await this.httpClient.get<{
        data: Array<{
          id: string;
          username: string;
          name: string;
          description: string;
          public_metrics: {
            followers_count: number;
            following_count: number;
            tweet_count: number;
          };
          verified: boolean;
          created_at: string;
          location: string;
          url: string;
          profile_image_url: string;
          profile_banner_url: string;
        }>;
        meta: {
          result_count: number;
          next_token?: string;
        };
      }>('/users/search', params);

      let users: UserInfo[] = response.data.map(userData => ({
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

      // フィルタリング適用
      if (options.includeVerified !== undefined) {
        users = users.filter(user => user.verified === options.includeVerified);
      }

      if (options.minFollowers !== undefined) {
        users = users.filter(user => user.followersCount >= options.minFollowers!);
      }

      if (options.maxFollowers !== undefined) {
        users = users.filter(user => user.followersCount <= options.maxFollowers!);
      }

      const result: UserSearchResult = {
        users,
        totalCount: users.length,
        nextToken: response.meta.next_token,
        searchQuery: options.query,
        timestamp: new Date().toISOString()
      };

      console.log('✅ ユーザー検索完了:', { 
        query: options.query, 
        count: result.totalCount 
      });

      return result;

    } catch (error) {
      console.error('❌ ユーザー検索エラー:', error);
      throw new Error(`Failed to search users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================================================
  // PROFILE MANAGEMENT METHODS
  // ============================================================================

  /**
   * プロフィール更新
   * 自分のプロフィール情報を更新する
   */
  async updateProfile(updateData: ProfileUpdateData): Promise<ProfileUpdateResult> {
    try {
      console.log('📝 プロフィール更新実行中...', Object.keys(updateData));

      if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error('Update data is required');
      }

      // 更新データ準備
      const apiUpdateData: Record<string, any> = {};
      const updatedFields: string[] = [];

      if (updateData.displayName !== undefined) {
        apiUpdateData.name = updateData.displayName;
        updatedFields.push('displayName');
      }

      if (updateData.description !== undefined) {
        apiUpdateData.description = updateData.description;
        updatedFields.push('description');
      }

      if (updateData.location !== undefined) {
        apiUpdateData.location = updateData.location;
        updatedFields.push('location');
      }

      if (updateData.website !== undefined) {
        apiUpdateData.url = updateData.website;
        updatedFields.push('website');
      }

      // API呼び出し
      const response = await this.httpClient.post<{
        data: {
          id: string;
          name: string;
          username: string;
        }
      }>('/users/me', apiUpdateData);

      const result: ProfileUpdateResult = {
        userId: response.data.id,
        updated: true,
        timestamp: new Date().toISOString(),
        success: true,
        updatedFields
      };

      console.log('✅ プロフィール更新完了:', { 
        userId: result.userId, 
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
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
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

      const response = await this.httpClient.get<{
        data: {
          id: string;
          username: string;
        }
      }>(`/users/by/username/${cleanUsername}`);

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

      const response = await this.httpClient.get<{
        data: Array<{
          id: string;
          following: boolean;
        }>
      }>('/users/me/following', {
        ids: userId
      });

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

export {
  UserInfo,
  FollowResult,
  UnfollowResult,
  UserSearchResult,
  UserSearchOptions,
  ProfileUpdateData,
  ProfileUpdateResult,
  UserEndpoints
};

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