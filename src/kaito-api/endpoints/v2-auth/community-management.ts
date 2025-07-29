/**
 * V2 Community Management Endpoint - V2ログイン認証専用
 * REQUIREMENTS.md準拠 - コミュニティ作成・管理機能
 * 
 * 機能:
 * - コミュニティ作成・管理機能
 * - メンバー管理・モデレーション
 * - コミュニティ投稿・イベント管理
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

interface CommunityResponse {
  success: boolean;
  data: Community;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface CommunityListResponse {
  success: boolean;
  data: {
    communities: Community[];
    totalCount: number;
  };
  pagination?: {
    nextCursor?: string;
    hasMore: boolean;
  };
}

interface MemberResponse {
  success: boolean;
  data: {
    members: CommunityMember[];
    totalCount: number;
  };
  pagination?: {
    nextCursor?: string;
    hasMore: boolean;
  };
}

interface MembershipResponse {
  success: boolean;
  data: {
    communityId: string;
    userId: string;
    membershipStatus: MembershipStatus;
    role: MemberRole;
    joinedAt: Date;
  };
}

// ============================================================================
// DATA INTERFACES
// ============================================================================

interface Community {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
  creatorUsername: string;
  memberCount: number;
  isPrivate: boolean;
  inviteOnly: boolean;
  verified: boolean;
  category: CommunityCategory;
  rules: CommunityRule[];
  moderators: CommunityMember[];
  bannerImageUrl?: string;
  profileImageUrl?: string;
  location?: string;
  website?: string;
  theme?: {
    primaryColor: string;
    accentColor: string;
  };
}

interface CommunityMember {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
  verified: boolean;
  role: MemberRole;
  joinedAt: Date;
  lastActiveAt?: Date;
  contributionScore: number;
  isModerator: boolean;
  isCreator: boolean;
}

interface CommunityRule {
  id: string;
  title: string;
  description: string;
  order: number;
  severity: 'low' | 'medium' | 'high';
  autoModEnabled: boolean;
}

// ============================================================================
// ENUMS & TYPES
// ============================================================================

type CommunityCategory = 
  | 'technology' | 'business' | 'entertainment' | 'sports' | 'news'
  | 'education' | 'health' | 'lifestyle' | 'gaming' | 'art'
  | 'music' | 'food' | 'travel' | 'finance' | 'other';

type MemberRole = 'creator' | 'admin' | 'moderator' | 'member' | 'restricted';

type MembershipStatus = 'active' | 'pending' | 'banned' | 'left' | 'removed';

type CommunityVisibility = 'public' | 'private' | 'invite_only';

// ============================================================================
// REQUEST OPTIONS
// ============================================================================

interface CreateCommunityOptions {
  description?: string;
  isPrivate?: boolean;
  inviteOnly?: boolean;
  category?: CommunityCategory;
  rules?: Omit<CommunityRule, 'id'>[];
  bannerImageId?: string;
  profileImageId?: string;
  location?: string;
  website?: string;
  theme?: {
    primaryColor: string;
    accentColor: string;
  };
}

interface UpdateCommunityOptions extends Partial<CreateCommunityOptions> {
  name?: string;
}

interface MemberManagementOptions {
  role?: MemberRole;
  reason?: string;
  duration?: number; // 制限期間（分）
  notifyUser?: boolean;
}

interface CommunitySearchOptions {
  category?: CommunityCategory;
  location?: string;
  minMembers?: number;
  maxMembers?: number;
  verified?: boolean;
  includePrivate?: boolean;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// COMMUNITY MANAGEMENT ENDPOINT CLASS
// ============================================================================

/**
 * CommunityManagementEndpoint - V2認証コミュニティ管理操作クラス
 * 
 * V2ログイン認証（login_cookies）で実行可能な機能:
 * - コミュニティ作成・更新・削除
 * - メンバー管理・招待・モデレーション
 * - コミュニティ設定・ルール管理
 * - 統計・分析機能
 */
export class CommunityManagementEndpoint {
  private readonly ENDPOINTS = {
    createCommunity: '/twitter/community/create',
    updateCommunity: '/twitter/community/update',
    deleteCommunity: '/twitter/community/delete',
    getCommunity: '/twitter/community/info',
    searchCommunities: '/twitter/community/search',
    joinCommunity: '/twitter/community/join',
    leaveCommunity: '/twitter/community/leave',
    inviteMember: '/twitter/community/invite',
    removeMember: '/twitter/community/remove_member',
    banMember: '/twitter/community/ban_member',
    unbanMember: '/twitter/community/unban_member',
    updateMemberRole: '/twitter/community/update_member_role',
    getMembers: '/twitter/community/members',
    getCommunityStats: '/twitter/community/analytics',
    addRule: '/twitter/community/add_rule',
    updateRule: '/twitter/community/update_rule',
    deleteRule: '/twitter/community/delete_rule'
  } as const;

  private readonly RATE_LIMITS = {
    createCommunity: { limit: 10, window: 3600 }, // 10/hour
    updateCommunity: { limit: 50, window: 3600 }, // 50/hour
    memberOperations: { limit: 100, window: 3600 }, // 100/hour
    searchCommunities: { limit: 300, window: 3600 }, // 300/hour
    getMembers: { limit: 300, window: 3600 } // 300/hour
  } as const;

  private readonly VALIDATION_RULES = {
    communityName: { 
      minLength: 3, 
      maxLength: 50 
    },
    communityDescription: { 
      maxLength: 500 
    },
    communityId: /^[a-zA-Z0-9_-]+$/,
    userId: /^[0-9]+$/,
    username: /^[a-zA-Z0-9_]{1,15}$/,
    memberLimit: { max: 10000 }, // コミュニティメンバー上限
    ruleTitle: { minLength: 3, maxLength: 100 },
    ruleDescription: { maxLength: 500 },
    websiteUrl: /^https?:\/\/.+/,
    colorHex: /^#[0-9A-Fa-f]{6}$/
  } as const;

  private readonly COMMUNITY_CATEGORIES: CommunityCategory[] = [
    'technology', 'business', 'entertainment', 'sports', 'news',
    'education', 'health', 'lifestyle', 'gaming', 'art',
    'music', 'food', 'travel', 'finance', 'other'
  ];

  constructor(
    private httpClient: HttpClient,
    private v2Auth: V2LoginAuth
  ) {}

  // ============================================================================
  // PUBLIC METHODS - COMMUNITY MANAGEMENT
  // ============================================================================

  /**
   * コミュニティ作成
   * login_cookies認証が必要
   */
  async createCommunity(name: string, options?: CreateCommunityOptions): Promise<CommunityResponse> {
    // 入力バリデーション
    const nameValidation = this.validateCommunityName(name);
    if (!nameValidation.isValid) {
      throw new Error(`Invalid community name: ${nameValidation.errors.join(', ')}`);
    }

    if (options) {
      const optionsValidation = this.validateCreateCommunityOptions(options);
      if (!optionsValidation.isValid) {
        throw new Error(`Invalid community options: ${optionsValidation.errors.join(', ')}`);
      }
    }

    // V2認証クッキー取得・検証
    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const payload: any = {
        name,
        login_cookies: loginCookie,
        proxy: process.env.X_PROXY
      };

      // オプション設定
      if (options?.description) payload.description = options.description;
      if (options?.isPrivate !== undefined) payload.is_private = options.isPrivate;
      if (options?.inviteOnly !== undefined) payload.invite_only = options.inviteOnly;
      if (options?.category) payload.category = options.category;
      if (options?.rules?.length) payload.rules = options.rules;
      if (options?.bannerImageId) payload.banner_image_id = options.bannerImageId;
      if (options?.profileImageId) payload.profile_image_id = options.profileImageId;
      if (options?.location) payload.location = options.location;
      if (options?.website) payload.website = options.website;
      if (options?.theme) payload.theme = options.theme;

      const response = await this.httpClient.post<any>(
        this.ENDPOINTS.createCommunity,
        payload
      );

      const normalizedData = await this.normalizeCommunity(response);

      return {
        success: true,
        data: normalizedData,
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'createCommunity');
    }
  }

  /**
   * コミュニティ情報更新
   * login_cookies認証が必要
   */
  async updateCommunity(communityId: string, options: UpdateCommunityOptions): Promise<CommunityResponse> {
    const validation = this.validateCommunityId(communityId);
    if (!validation.isValid) {
      throw new Error(`Invalid communityId: ${validation.errors.join(', ')}`);
    }

    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const payload = {
        community_id: communityId,
        login_cookies: loginCookie,
        proxy: process.env.X_PROXY,
        ...options
      };

      const response = await this.httpClient.post<any>(
        this.ENDPOINTS.updateCommunity,
        payload
      );

      const normalizedData = await this.normalizeCommunity(response);

      return {
        success: true,
        data: normalizedData,
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'updateCommunity');
    }
  }

  /**
   * コミュニティ情報取得
   * login_cookies認証が必要
   */
  async getCommunity(communityId: string): Promise<CommunityResponse> {
    const validation = this.validateCommunityId(communityId);
    if (!validation.isValid) {
      throw new Error(`Invalid communityId: ${validation.errors.join(', ')}`);
    }

    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const response = await this.httpClient.get<any>(
        this.ENDPOINTS.getCommunity,
        { 
          community_id: communityId,
          login_cookies: loginCookie
        }
      );

      const normalizedData = await this.normalizeCommunity(response);

      return {
        success: true,
        data: normalizedData,
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'getCommunity');
    }
  }

  /**
   * コミュニティ検索
   * login_cookies認証が必要
   */
  async searchCommunities(query: string, options?: CommunitySearchOptions & { cursor?: string; count?: number }): Promise<CommunityListResponse> {
    if (!query?.trim()) {
      throw new Error('Search query is required');
    }

    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const params: any = {
        q: query,
        count: Math.min(options?.count || 20, 50),
        login_cookies: loginCookie
      };

      if (options?.cursor) params.cursor = options.cursor;
      if (options?.category) params.category = options.category;
      if (options?.location) params.location = options.location;
      if (options?.minMembers) params.min_members = options.minMembers;
      if (options?.maxMembers) params.max_members = options.maxMembers;
      if (options?.verified !== undefined) params.verified = options.verified;
      if (options?.includePrivate) params.include_private = options.includePrivate;

      const response = await this.httpClient.get<any>(
        this.ENDPOINTS.searchCommunities,
        params
      );

      const communities = await Promise.all(
        (response.communities || []).map((community: any) => this.normalizeCommunity(community))
      );

      return {
        success: true,
        data: {
          communities,
          totalCount: response.total_count || communities.length
        },
        pagination: {
          nextCursor: response.next_cursor,
          hasMore: !!response.next_cursor
        }
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'searchCommunities');
    }
  }

  // ============================================================================
  // PUBLIC METHODS - MEMBERSHIP MANAGEMENT
  // ============================================================================

  /**
   * コミュニティ参加
   * login_cookies認証が必要
   */
  async joinCommunity(communityId: string): Promise<MembershipResponse> {
    const validation = this.validateCommunityId(communityId);
    if (!validation.isValid) {
      throw new Error(`Invalid communityId: ${validation.errors.join(', ')}`);
    }

    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const payload = {
        community_id: communityId,
        login_cookies: loginCookie,
        proxy: process.env.X_PROXY
      };

      const response = await this.httpClient.post<any>(
        this.ENDPOINTS.joinCommunity,
        payload
      );

      return {
        success: true,
        data: {
          communityId,
          userId: response.user_id || '',
          membershipStatus: response.status || 'active',
          role: response.role || 'member',
          joinedAt: new Date(response.joined_at || Date.now())
        }
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'joinCommunity');
    }
  }

  /**
   * コミュニティ脱退
   * login_cookies認証が必要
   */
  async leaveCommunity(communityId: string): Promise<{ success: boolean; data: { leftAt: Date } }> {
    const validation = this.validateCommunityId(communityId);
    if (!validation.isValid) {
      throw new Error(`Invalid communityId: ${validation.errors.join(', ')}`);
    }

    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const payload = {
        community_id: communityId,
        login_cookies: loginCookie,
        proxy: process.env.X_PROXY
      };

      await this.httpClient.post<any>(
        this.ENDPOINTS.leaveCommunity,
        payload
      );

      return {
        success: true,
        data: {
          leftAt: new Date()
        }
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'leaveCommunity');
    }
  }

  /**
   * メンバー招待
   * login_cookies認証が必要
   */
  async inviteMember(communityId: string, userId: string, options?: { message?: string; role?: MemberRole }): Promise<{ success: boolean; data: { invitedAt: Date } }> {
    const communityValidation = this.validateCommunityId(communityId);
    const userValidation = this.validateUserId(userId);
    
    if (!communityValidation.isValid) {
      throw new Error(`Invalid communityId: ${communityValidation.errors.join(', ')}`);
    }
    if (!userValidation.isValid) {
      throw new Error(`Invalid userId: ${userValidation.errors.join(', ')}`);
    }

    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const payload: any = {
        community_id: communityId,
        user_id: userId,
        login_cookies: loginCookie,
        proxy: process.env.X_PROXY
      };

      if (options?.message) payload.message = options.message;
      if (options?.role) payload.role = options.role;

      await this.httpClient.post<any>(
        this.ENDPOINTS.inviteMember,
        payload
      );

      return {
        success: true,
        data: {
          invitedAt: new Date()
        }
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'inviteMember');
    }
  }

  /**
   * メンバー一覧取得
   * login_cookies認証が必要
   */
  async getMembers(
    communityId: string, 
    options?: { 
      role?: MemberRole; 
      cursor?: string; 
      count?: number;
      includeInactive?: boolean;
    }
  ): Promise<MemberResponse> {
    const validation = this.validateCommunityId(communityId);
    if (!validation.isValid) {
      throw new Error(`Invalid communityId: ${validation.errors.join(', ')}`);
    }

    const loginCookie = await this.v2Auth.getValidCookie();
    if (!loginCookie) {
      throw new Error('V2 authentication required - login_cookies not available');
    }

    try {
      const params: any = {
        community_id: communityId,
        count: Math.min(options?.count || 50, 200),
        login_cookies: loginCookie
      };

      if (options?.role) params.role = options.role;
      if (options?.cursor) params.cursor = options.cursor;
      if (options?.includeInactive) params.include_inactive = options.includeInactive;

      const response = await this.httpClient.get<any>(
        this.ENDPOINTS.getMembers,
        params
      );

      const members = await Promise.all(
        (response.members || []).map((member: any) => this.normalizeCommunityMember(member))
      );

      return {
        success: true,
        data: {
          members,
          totalCount: response.total_count || members.length
        },
        pagination: {
          nextCursor: response.next_cursor,
          hasMore: !!response.next_cursor
        }
      };

    } catch (error: any) {
      throw this.handleV2AuthError(error, 'getMembers');
    }
  }

  // ============================================================================
  // PRIVATE METHODS - VALIDATION
  // ============================================================================

  private validateCommunityName(name: string): ValidationResult {
    const errors: string[] = [];

    if (!name || typeof name !== 'string') {
      errors.push('Community name is required and must be a string');
    } else if (name.length < this.VALIDATION_RULES.communityName.minLength) {
      errors.push(`Community name must be at least ${this.VALIDATION_RULES.communityName.minLength} characters`);
    } else if (name.length > this.VALIDATION_RULES.communityName.maxLength) {
      errors.push(`Community name must not exceed ${this.VALIDATION_RULES.communityName.maxLength} characters`);
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateCommunityId(communityId: string): ValidationResult {
    const errors: string[] = [];

    if (!communityId || typeof communityId !== 'string') {
      errors.push('communityId is required and must be a string');
    } else if (!this.VALIDATION_RULES.communityId.test(communityId)) {
      errors.push('communityId format is invalid');
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateUserId(userId: string): ValidationResult {
    const errors: string[] = [];

    if (!userId || typeof userId !== 'string') {
      errors.push('userId is required and must be a string');
    } else if (!this.VALIDATION_RULES.userId.test(userId)) {
      errors.push('userId must be numeric');
    }

    return { isValid: errors.length === 0, errors };
  }

  private validateCreateCommunityOptions(options: CreateCommunityOptions): ValidationResult {
    const errors: string[] = [];

    if (options.description && options.description.length > this.VALIDATION_RULES.communityDescription.maxLength) {
      errors.push(`Community description must not exceed ${this.VALIDATION_RULES.communityDescription.maxLength} characters`);
    }

    if (options.category && !this.COMMUNITY_CATEGORIES.includes(options.category)) {
      errors.push(`Invalid community category. Must be one of: ${this.COMMUNITY_CATEGORIES.join(', ')}`);
    }

    if (options.website && !this.VALIDATION_RULES.websiteUrl.test(options.website)) {
      errors.push('Invalid website URL format');
    }

    if (options.theme) {
      if (options.theme.primaryColor && !this.VALIDATION_RULES.colorHex.test(options.theme.primaryColor)) {
        errors.push('Invalid primary color format (must be hex)');
      }
      if (options.theme.accentColor && !this.VALIDATION_RULES.colorHex.test(options.theme.accentColor)) {
        errors.push('Invalid accent color format (must be hex)');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // ============================================================================
  // PRIVATE METHODS - DATA NORMALIZATION
  // ============================================================================

  private async normalizeCommunity(apiCommunity: any): Promise<Community> {
    return {
      id: apiCommunity.id,
      name: apiCommunity.name,
      description: apiCommunity.description || '',
      createdAt: new Date(apiCommunity.created_at),
      updatedAt: new Date(apiCommunity.updated_at || apiCommunity.created_at),
      creatorId: apiCommunity.creator_id,
      creatorUsername: apiCommunity.creator_username || '',
      memberCount: apiCommunity.member_count || 0,
      isPrivate: apiCommunity.is_private || false,
      inviteOnly: apiCommunity.invite_only || false,
      verified: apiCommunity.verified || false,
      category: apiCommunity.category || 'other',
      rules: apiCommunity.rules || [],
      moderators: await Promise.all(
        (apiCommunity.moderators || []).map((mod: any) => this.normalizeCommunityMember(mod))
      ),
      bannerImageUrl: apiCommunity.banner_image_url,
      profileImageUrl: apiCommunity.profile_image_url,
      location: apiCommunity.location,
      website: apiCommunity.website,
      theme: apiCommunity.theme
    };
  }

  private async normalizeCommunityMember(apiMember: any): Promise<CommunityMember> {
    return {
      id: apiMember.id || apiMember.user_id,
      username: apiMember.username || apiMember.screen_name,
      displayName: apiMember.display_name || apiMember.name,
      profileImageUrl: apiMember.profile_image_url || '',
      verified: apiMember.verified || false,
      role: apiMember.role || 'member',
      joinedAt: new Date(apiMember.joined_at),
      lastActiveAt: apiMember.last_active_at ? new Date(apiMember.last_active_at) : undefined,
      contributionScore: apiMember.contribution_score || 0,
      isModerator: apiMember.role === 'moderator' || apiMember.role === 'admin',
      isCreator: apiMember.role === 'creator'
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

    // コミュニティ特有のエラー
    if (error.message?.includes('community name already exists')) {
      throw new Error(`Community name already exists: ${operation}`);
    }

    if (error.message?.includes('community not found')) {
      throw new Error(`Community not found: ${operation}`);
    }

    if (error.message?.includes('not a member')) {
      throw new Error(`User is not a member of this community: ${operation}`);
    }

    if (error.message?.includes('insufficient permissions')) {
      throw new Error(`Insufficient permissions for community operation: ${operation}`);
    }

    if (error.message?.includes('member limit exceeded')) {
      throw new Error(`Community member limit exceeded: ${operation}`);
    }

    if (error.message?.includes('private community')) {
      throw new Error(`Cannot access private community: ${operation}`);
    }

    if (error.status === 404) {
      throw new Error(`Community or user not found: ${operation}`);
    }

    if (error.status === 400) {
      throw new Error(`Bad request for community operation: ${operation}. Check input parameters.`);
    }

    // その他のエラー
    throw new Error(`V2 community API error in ${operation}: ${error.message || 'Unknown error'}`);
  }
}