/**
 * KaitoAPI User Endpoints - ユーザー関連API実装 + プライバシー保護統合版
 * REQUIREMENTS.md準拠 - 疎結合ライブラリアーキテクチャ
 * 
 * 機能概要:
 * - ユーザー情報取得・管理
 * - フォロー関係の管理
 * - ユーザー検索機能
 * - プロフィール情報操作
 * 
 * 統合機能:
 * - プライバシー保護
 * - 教育的価値評価
 * - アカウント安全性チェック
 * - データ最小化原則
 */

import { 
  KaitoAPIConfig,
  UserInfo, 
  FollowResult, 
  UnfollowResult, 
  UserSearchResult, 
  UserSearchOptions, 
  ProfileUpdateData, 
  ProfileUpdateResult,
  SafeUserProfile,
  UserAnalytics,
  AccountSafetyCheck,
  EducationalSearchOptions
} from '../types';

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
  private userCache: Map<string, { data: UserInfo; timestamp: number }> = new Map();
  private analyticsCache: Map<string, { data: UserAnalytics; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15分キャッシュ

  // === 統合: 教育関連キーワード ===
  private readonly EDUCATIONAL_INDICATORS = [
    '投資教育', '金融教育', 'アナリスト', 'ファイナンシャルプランナー',
    'FP', '証券', '銀行', '投資顧問', '教育', '解説', '初心者向け'
  ];

  constructor(config: KaitoAPIConfig, httpClient: any) {
    this.config = config;
    this.httpClient = httpClient;
    
    console.log('✅ UserEndpoints initialized - 疎結合ライブラリアーキテクチャ + プライバシー保護統合版');
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
      const response = await this.httpClient.get(`/users/${userId}`, {
        'user.fields': 'created_at,description,location,public_metrics,url,verified,profile_image_url,profile_banner_url'
      }) as any;

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
    try {
      console.log('➕ ユーザーフォロー実行中...', { userId });

      if (!userId || userId.trim().length === 0) {
        throw new Error('User ID is required');
      }

      // API呼び出し
      const response = await this.httpClient.post('/users/me/following', {
        target_user_id: userId
      }) as any;

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
      const response = await this.httpClient.get('/users/search', params) as any;

      let users: UserInfo[] = response.data.map((userData: any) => ({
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
      const response = await this.httpClient.post('/users/me', apiUpdateData) as any;

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

  // ============================================================================
  // === 統合: プライバシー保護・教育的価値評価機能 ===
  // ============================================================================

  /**
   * 安全なユーザープロフィール取得
   */
  async getSafeUserProfile(userId: string): Promise<SafeUserProfile | null> {
    try {
      console.log('👤 安全なユーザープロフィール取得開始:', { userId });

      // キャッシュチェック
      const cached = this.getUserFromCache(userId);
      if (cached) {
        console.log('📋 キャッシュからユーザー情報を取得');
        return this.createSafeProfile(cached);
      }

      // API呼び出し（レート制限考慮）
      await this.enforceRateLimit();
      const userInfo = await this.getUserInfo(userId);
      
      // プライバシー保護処理
      const protectedUserInfo = this.applyPrivacyProtection(userInfo);
      
      // キャッシュに保存
      this.setUserCache(userId, protectedUserInfo);

      // 安全なプロフィール作成
      const safeProfile = this.createSafeProfile(protectedUserInfo);

      console.log('✅ 安全なユーザープロフィール取得完了:', {
        username: safeProfile.basicInfo.username,
        safetyLevel: safeProfile.safetyLevel
      });

      return safeProfile;

    } catch (error) {
      console.error('❌ ユーザープロフィール取得失敗:', error);
      return null;
    }
  }

  /**
   * 教育的アカウントの検索
   */
  async searchEducationalAccounts(options: EducationalSearchOptions): Promise<SafeUserProfile[]> {
    try {
      console.log('🎓 教育的アカウント検索開始:', options);

      // 検索クエリに教育キーワードを追加
      let enhancedQuery = options.query;
      if (options.educationalOnly) {
        enhancedQuery += ' ' + this.EDUCATIONAL_INDICATORS.slice(0, 3).join(' OR ');
      }

      // 基本検索実行
      const searchResult = await this.searchUsers({
        ...options,
        query: enhancedQuery
      });
      
      // 各ユーザーの安全プロフィール作成
      const safeProfiles = await Promise.all(
        searchResult.users.map(user => this.createSafeProfile(user))
      );

      // 教育的価値でフィルタリング・ソート
      const filteredProfiles = safeProfiles
        .filter(profile => options.educationalOnly ? 
          profile.educationalValue.isEducationalAccount : true)
        .filter(profile => options.minCredibilityLevel ? 
          this.matchesCredibilityLevel(profile.educationalValue.credibilityLevel, options.minCredibilityLevel) : true)
        .sort((a, b) => {
          if (a.educationalValue.credibilityLevel === 'high' && b.educationalValue.credibilityLevel !== 'high') return -1;
          if (b.educationalValue.credibilityLevel === 'high' && a.educationalValue.credibilityLevel !== 'high') return 1;
          return b.publicMetrics.followersCount - a.publicMetrics.followersCount;
        })
        .slice(0, options.maxResults || 20);

      console.log('✅ 教育的アカウント検索完了:', {
        found: filteredProfiles.length,
        highCredibility: filteredProfiles.filter(p => p.educationalValue.credibilityLevel === 'high').length
      });

      return filteredProfiles;

    } catch (error) {
      console.error('❌ 教育的アカウント検索失敗:', error);
      return [];
    }
  }

  /**
   * アカウント安全性チェック
   */
  async checkAccountSafety(userId: string): Promise<AccountSafetyCheck> {
    try {
      console.log('🔒 アカウント安全性チェック開始:', { userId });

      const userProfile = await this.getSafeUserProfile(userId);
      if (!userProfile) {
        return {
          isSafe: false,
          safetyLevel: 'restricted',
          concerns: ['ユーザー情報の取得に失敗'],
          recommendations: ['このアカウントとの相互作用を避けてください']
        };
      }

      const concerns: string[] = [];
      const recommendations: string[] = [];

      // 基本安全性チェック
      if (userProfile.basicInfo.verified) {
        recommendations.push('認証済みアカウントのため信頼性が高いです');
      } else if (userProfile.publicMetrics.followersCount < 100) {
        concerns.push('フォロワー数が少なく信頼性が不明です');
      }

      // 教育的価値チェック
      if (userProfile.educationalValue.isEducationalAccount) {
        recommendations.push('教育的価値の高いアカウントです');
      } else if (userProfile.educationalValue.credibilityLevel === 'low') {
        concerns.push('教育的価値が低い可能性があります');
      }

      // 安全レベル決定
      const safetyLevel = userProfile.safetyLevel;
      const isSafe = safetyLevel === 'safe' || (safetyLevel === 'caution' && concerns.length <= 1);

      console.log('✅ アカウント安全性チェック完了:', {
        userId,
        isSafe,
        safetyLevel,
        concernsCount: concerns.length
      });

      return {
        isSafe,
        safetyLevel,
        concerns,
        recommendations
      };

    } catch (error) {
      console.error('❌ 安全性チェック失敗:', error);
      return {
        isSafe: false,
        safetyLevel: 'restricted',
        concerns: ['チェック処理でエラーが発生しました'],
        recommendations: ['注意深く利用してください']
      };
    }
  }

  /**
   * ユーザー分析（教育的価値重視）
   */
  async analyzeUserEducationalValue(userId: string): Promise<UserAnalytics | null> {
    try {
      console.log('📊 ユーザー教育的価値分析開始:', { userId });

      // 分析キャッシュチェック
      const cachedAnalytics = this.getAnalyticsFromCache(userId);
      if (cachedAnalytics) {
        console.log('📋 キャッシュから分析結果を取得');
        return cachedAnalytics;
      }

      // ユーザー情報取得
      const userInfo = await this.getSafeUserProfile(userId);
      if (!userInfo) {
        throw new Error('ユーザー情報の取得に失敗しました');
      }

      // 教育的価値分析実行
      const analytics = await this.performEducationalAnalysis(userInfo);
      
      // キャッシュに保存
      this.setAnalyticsCache(userId, analytics);

      console.log('✅ ユーザー教育的価値分析完了:', {
        userId,
        credibilityScore: analytics.credibilityScore,
        educationalRatio: analytics.educationalContentRatio
      });

      return analytics;

    } catch (error) {
      console.error('❌ ユーザー分析失敗:', error);
      return null;
    }
  }

  // ============================================================================
  // === 統合: プライベートメソッド ===
  // ============================================================================

  private applyPrivacyProtection(userInfo: UserInfo): UserInfo {
    // プライバシー保護: 必要最小限の情報のみ取得
    return {
      ...userInfo,
      followingCount: Math.min(userInfo.followingCount || 0, 999999), // 上限設定
      description: this.sanitizeDescription(userInfo.description || ''),
      location: userInfo.location ? this.sanitizeLocation(userInfo.location) : '',
      website: userInfo.website ? this.sanitizeUrl(userInfo.website) : ''
    };
  }

  private createSafeProfile(userInfo: UserInfo): SafeUserProfile {
    const educationalValue = this.assessEducationalValue(userInfo);
    const safetyLevel = this.assessSafetyLevel(userInfo, educationalValue);

    return {
      basicInfo: {
        username: userInfo.username,
        displayName: userInfo.displayName,
        verified: userInfo.verified,
        description: userInfo.description
      },
      publicMetrics: {
        followersCount: userInfo.followersCount,
        tweetsCount: userInfo.tweetsCount
      },
      educationalValue,
      safetyLevel
    };
  }

  private assessEducationalValue(userInfo: UserInfo): SafeUserProfile['educationalValue'] {
    const description = userInfo.description.toLowerCase();
    const displayName = userInfo.displayName.toLowerCase();
    
    // 教育的キーワードのマッチング
    const matchedKeywords = this.EDUCATIONAL_INDICATORS.filter(keyword =>
      description.includes(keyword.toLowerCase()) || displayName.includes(keyword.toLowerCase())
    );

    const isEducationalAccount = matchedKeywords.length > 0;
    
    // 信頼性レベル決定
    let credibilityLevel: 'high' | 'medium' | 'low' = 'low';
    if (userInfo.verified && matchedKeywords.length >= 2) {
      credibilityLevel = 'high';
    } else if (userInfo.followersCount > 1000 && matchedKeywords.length >= 1) {
      credibilityLevel = 'medium';
    }

    return {
      isEducationalAccount,
      educationalTopics: matchedKeywords,
      credibilityLevel
    };
  }

  private assessSafetyLevel(userInfo: UserInfo, educationalValue: SafeUserProfile['educationalValue']): 'safe' | 'caution' | 'restricted' {
    let safetyScore = 50;

    // 認証済みアカウント
    if (userInfo.verified) safetyScore += 30;

    // フォロワー数
    if (userInfo.followersCount > 10000) safetyScore += 20;
    else if (userInfo.followersCount > 1000) safetyScore += 10;
    else if (userInfo.followersCount < 100) safetyScore -= 10;

    // 教育的価値
    if (educationalValue.credibilityLevel === 'high') safetyScore += 25;
    else if (educationalValue.credibilityLevel === 'medium') safetyScore += 15;

    // アカウント年数（仮想計算）
    const accountAge = Date.now() - new Date(userInfo.createdAt).getTime();
    const ageInYears = accountAge / (365 * 24 * 60 * 60 * 1000);
    if (ageInYears > 2) safetyScore += 10;

    if (safetyScore >= 80) return 'safe';
    if (safetyScore >= 60) return 'caution';
    return 'restricted';
  }

  private async performEducationalAnalysis(userProfile: SafeUserProfile): Promise<UserAnalytics> {
    // Mock分析結果
    const credibilityScore = userProfile.educationalValue.credibilityLevel === 'high' ? 
      Math.random() * 20 + 80 : 
      userProfile.educationalValue.credibilityLevel === 'medium' ? 
      Math.random() * 30 + 50 : 
      Math.random() * 40 + 20;

    return {
      userId: 'analyzed_user',
      engagementRate: Math.random() * 10 + 2,
      educationalContentRatio: userProfile.educationalValue.isEducationalAccount ? 
        Math.random() * 30 + 70 : Math.random() * 50 + 10,
      activityLevel: credibilityScore > 70 ? 'high' : credibilityScore > 50 ? 'medium' : 'low',
      credibilityScore,
      topTopics: userProfile.educationalValue.educationalTopics.slice(0, 5),
      lastAnalyzed: new Date().toISOString()
    };
  }

  // キャッシュ管理
  private getUserFromCache(userId: string): UserInfo | null {
    const cached = this.userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.userCache.delete(userId);
    return null;
  }

  private setUserCache(userId: string, data: UserInfo): void {
    this.userCache.set(userId, { data, timestamp: Date.now() });
  }

  private getAnalyticsFromCache(userId: string): UserAnalytics | null {
    const cached = this.analyticsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.analyticsCache.delete(userId);
    return null;
  }

  private setAnalyticsCache(userId: string, data: UserAnalytics): void {
    this.analyticsCache.set(userId, { data, timestamp: Date.now() });
  }

  // ユーティリティメソッド
  private sanitizeDescription(description: string): string {
    return description.slice(0, 160); // 長さ制限
  }

  private sanitizeLocation(location: string): string {
    return location.slice(0, 50);
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.href;
    } catch {
      return '';
    }
  }

  private matchesCredibilityLevel(level: 'high' | 'medium' | 'low', minLevel: 'high' | 'medium' | 'low'): boolean {
    const levels = { low: 0, medium: 1, high: 2 };
    return levels[level] >= levels[minLevel];
  }

  private async enforceRateLimit(): Promise<void> {
    // 簡単なレート制限実装
    await new Promise(resolve => setTimeout(resolve, 100));
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