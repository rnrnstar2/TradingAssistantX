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
  FollowerResponse,
  TwitterAPIError,
  APIResult,
  RateLimitInfo
} from '../../utils/types';
import { AuthManager } from '../../core/auth-manager';
import { 
  validateTwitterUsername, 
  validateSearchQuery,
  createAPIError, 
  createSuccessResult, 
  createFailureResult,
  performSecurityCheck
} from '../../utils/validator';

// ============================================================================
// RESPONSE INTERFACES - 統一型定義
// ============================================================================

/**
 * ユーザー情報取得レスポンス
 * APIResult型との整合性を保った統一レスポンス形式
 */
// APIResultはUnion型なので直接継承できない
interface UserInfoResponseSuccess {
  success: true;
  data: UserInfo;
  timestamp: string;
  rateLimit?: RateLimitInfo;
}

interface UserInfoResponseError {
  success: false;
  error: TwitterAPIError;
  timestamp: string;
  rateLimit?: RateLimitInfo;
}

type UserInfoResponse = UserInfoResponseSuccess | UserInfoResponseError;

/**
 * フォロワー情報レスポンス
 * APIResult型との整合性を保った統一レスポンス形式
 */
// APIResultはUnion型なので直接継承できない
interface UserFollowerResponseSuccess {
  success: true;
  data: {
    followers: UserInfo[];
    following: UserInfo[];
    followerCount: number;
    followingCount: number;
  };
  timestamp: string;
  pagination?: {
    nextCursor?: string;
    hasMore: boolean;
  };
  rateLimit?: RateLimitInfo;
}

interface UserFollowerResponseError {
  success: false;
  error: TwitterAPIError;
  timestamp: string;
  pagination?: {
    nextCursor?: string;
    hasMore: boolean;
  };
  rateLimit?: RateLimitInfo;
}

type UserFollowerResponse = UserFollowerResponseSuccess | UserFollowerResponseError;

// ============================================================================
// VALIDATION TYPES - 統一バリデーション
// ============================================================================

/**
 * バリデーション結果
 * より詳細なエラー情報を含む統一型
 */
interface ValidationResult {
  /** バリデーション成功フラグ */
  isValid: boolean;
  /** エラーメッセージ配列 */
  errors: string[];
  /** エラーコード配列（診断用） */
  errorCodes?: string[];
  /** 修正提案（可能な場合） */
  suggestions?: string[];
}

// ============================================================================
// USER INFO ENDPOINT CLASS
// ============================================================================

/**
 * UserInfoEndpoint - 読み取り専用ユーザー情報API操作クラス
 * 
 * @description APIキー認証のみで実行可能な読み取り専用ユーザー関連機能の統一インターフェース
 * 
 * **主要機能:**
 * - ユーザープロフィール情報の取得・詳細確認
 * - フォロワー・フォロイー情報の効率的取得
 * - ユーザー検索・高度フィルタリング機能
 * - 大量データの最適化処理・ページネーション対応
 * 
 * **認証レベル:** APIキー認証のみ（読み取り専用操作）
 * **レート制限:** TwitterAPI.io標準制限に準拠
 * **エラーハンドリング:** 統一エラーハンドラーによる包括的エラー処理
 * 
 * @example
 * ```typescript
 * const userEndpoint = new UserInfoEndpoint(httpClient, authManager);
 * 
 * // 基本的なユーザー情報取得
 * const userInfo = await userEndpoint.getUserInfo('elonmusk');
 * 
 * // フォロワー情報取得（ページネーション対応）
 * const followers = await userEndpoint.getUserFollowers('elonmusk', { count: 100 });
 * 
 * // ユーザー検索
 * const searchResult = await userEndpoint.searchUsers('investment education');
 * ```
 * 
 * @version 2.1.0
 * @since 2025-07-29
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
    /** Twitter仕様準拠のユーザー名パターン（1-15文字、英数字・アンダースコア） */
    userName: /^[a-zA-Z0-9_]{1,15}$/,
    /** TwitterユーザーID形式（数値のみ） */
    userId: /^[0-9]+$/,
    /** 検索クエリ制限（TwitterAPI.io準拠） */
    searchQuery: { 
      minLength: 1, 
      maxLength: 500,  // より現実的な制限値に変更
      maxWords: 50     // 単語数制限を追加
    },
    /** セキュリティパターン（悪意のある入力の検出） */
    security: {
      sqlInjection: /(['"`;\-\-\/\*]|union|select|insert|update|delete|drop|create|alter)/i,
      xss: /[<>"'&]|javascript:|data:|vbscript:/i,
      pathTraversal: /\.\.[\/\\]/
    }
  } as const;

  constructor(
    private httpClient: HttpClient,
    private authManager: AuthManager
  ) {}

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * ユーザー情報取得
   * 
   * @description 指定されたユーザー名の詳細プロフィール情報を取得します
   * APIキー認証のみで実行可能な読み取り専用操作です
   * 
   * @param userName - 取得対象のユーザー名（@マークなし、1-15文字の英数字・アンダースコア）
   * @returns ユーザー情報とレート制限情報を含むレスポンス
   * 
   * @throws {Error} userName が無効な形式の場合
   * @throws {Error} API認証エラー（401: 無効なAPIキー、403: 権限不足）
   * @throws {Error} レート制限エラー（429: 制限超過）
   * @throws {Error} ユーザーが存在しない場合（404）
   * 
   * @example
   * ```typescript
   * try {
   *   const result = await userEndpoint.getUserInfo('elonmusk');
   *   if (result.success) {
   *     console.log(`User: ${result.data.displayName} (@${result.data.username})`);
   *     console.log(`Followers: ${result.data.followersCount}`);
   *   }
   * } catch (error) {
   *   console.error('Failed to get user info:', error.message);
   * }
   * ```
   * 
   * @since 2.0.0
   */
  async getUserInfo(userName: string): Promise<UserInfoResponse> {
    // 詳細入力バリデーション
    const validation = this.validateUserName(userName);
    if (!validation.isValid) {
      const errorMessage = `ユーザー名バリデーションエラー: ${validation.errors.join(', ')}`;
      const suggestions = validation.suggestions?.join(', ') || '有効な形式: 1-15文字の英数字・アンダースコアのみ';
      throw createAPIError('validation', 'INVALID_USERNAME', `${errorMessage}. 修正提案: ${suggestions}`);
    }

    try {
      // APIキー認証の確認
      if (!this.authManager.isAuthenticated()) {
        throw createAPIError('authentication', 'NO_API_KEY', 'APIキーが設定されていません。KAITO_API_TOKENを確認してください。');
      }
      
      // 効率的なAPI呼び出し（パラメータ最適化）
      const response = await this.httpClient.get<TwitterAPIUserResponse>(
        this.ENDPOINTS.userInfo,
        { userName: userName.toLowerCase().trim() }
      );

      // 包括的レスポンス正規化
      const normalizedData = await this.normalizeUserInfo(response.data);
      
      // 成功結果の統一形式返却
      return createSuccessResult(normalizedData, {
        timestamp: new Date().toISOString(),
        rateLimit: response.rateLimit
      });

    } catch (error: any) {
      // 統一エラーハンドリング
      return this.handleUserInfoError(error, 'getUserInfo', { userName });
    }
  }

  /**
   * ユーザーフォロワー情報取得
   * 
   * @description 指定されたユーザーのフォロワー一覧を取得します
   * 大量データへの対応と効率的なページング処理を実装
   * 
   * @param userName - 対象ユーザー名（@マークなし）
   * @param options - 取得オプション
   * @param options.cursor - ページネーション用カーソル
   * @param options.count - 取得件数（最大200件）
   * @returns フォロワー情報とページネーション情報
   * 
   * @throws {Error} ユーザー名バリデーションエラー
   * @throws {Error} API認証・権限エラー
   * @throws {Error} レート制限エラー
   * 
   * @example
   * ```typescript
   * // 基本的なフォロワー取得
   * const followers = await userEndpoint.getUserFollowers('elonmusk');
   * 
   * // ページネーション付き取得
   * const moreFollowers = await userEndpoint.getUserFollowers('elonmusk', {
   *   cursor: followers.pagination?.nextCursor,
   *   count: 100
   * });
   * ```
   * 
   * @since 2.0.0
   */
  async getUserFollowers(userName: string, options?: { cursor?: string; count?: number }): Promise<UserFollowerResponse> {
    // 統一バリデーション処理
    const validation = this.validateUserName(userName);
    if (!validation.isValid) {
      const errorMessage = `フォロワー取得用ユーザー名バリデーションエラー: ${validation.errors.join(', ')}`;
      throw createAPIError('validation', 'INVALID_USERNAME', errorMessage);
    }

    // オプションバリデーション
    const count = options?.count ? Math.min(Math.max(options.count, 1), 200) : 50; // デフォルト50件
    
    try {
      // 効率的なAPIパラメータ構築
      const params: Record<string, string | number> = { 
        userName: userName.toLowerCase().trim(),
        count
      };
      if (options?.cursor) {
        params.cursor = options.cursor;
      }

      const response = await this.httpClient.get<FollowerResponse>(
        this.ENDPOINTS.userFollowers,
        params
      );

      // バッチ正規化処理でパフォーマンス向上
      const normalizedData = await this.normalizeFollowerData(response, 'followers');

      return createSuccessResult(normalizedData, {
        pagination: {
          nextCursor: response.nextCursor,
          hasMore: !!response.nextCursor,
          currentCount: normalizedData.followers.length
        },
        rateLimit: response.rateLimit
      });

    } catch (error: any) {
      return this.handleUserInfoError(error, 'getUserFollowers', { userName, options });
    }
  }

  /**
   * ユーザーフォロイー情報取得
   * 
   * @description 指定されたユーザーがフォローしている人の一覧を取得
   * 効率的なページネーションとバッチ処理で大量データに対応
   * 
   * @param userName - 対象ユーザー名（@マークなし）
   * @param options - 取得オプション
   * @param options.cursor - ページネーション用カーソル
   * @param options.count - 取得件数（最大200件）
   * @returns フォロイー情報とページネーション情報
   * 
   * @throws {Error} ユーザー名バリデーションエラー
   * @throws {Error} API認証・権限エラー
   * @throws {Error} レート制限エラー
   * 
   * @example
   * ```typescript
   * const following = await userEndpoint.getUserFollowing('elonmusk', { count: 50 });
   * if (following.success) {
   *   console.log(`Following ${following.data.followingCount} accounts`);
   * }
   * ```
   * 
   * @since 2.0.0
   */
  async getUserFollowing(userName: string, options?: { cursor?: string; count?: number }): Promise<UserFollowerResponse> {
    // 統一バリデーション処理
    const validation = this.validateUserName(userName);
    if (!validation.isValid) {
      const errorMessage = `フォロイー取得用ユーザー名バリデーションエラー: ${validation.errors.join(', ')}`;
      throw createAPIError('validation', 'INVALID_USERNAME', errorMessage);
    }

    // オプションの正規化と最適化
    const count = options?.count ? Math.min(Math.max(options.count, 1), 200) : 50;

    try {
      // 効率的なAPIパラメータ構築
      const params: Record<string, string | number> = {
        userName: userName.toLowerCase().trim(),
        count
      };
      if (options?.cursor) {
        params.cursor = options.cursor;
      }

      const response = await this.httpClient.get<FollowerResponse>(
        this.ENDPOINTS.userFollowing,
        params
      );

      // followingタイプでバッチ正規化処理
      const normalizedData = await this.normalizeFollowerData(response, 'following');

      return createSuccessResult(normalizedData, {
        pagination: {
          nextCursor: response.nextCursor,
          hasMore: !!response.nextCursor,
          currentCount: normalizedData.following.length
        },
        rateLimit: response.rateLimit
      });

    } catch (error: any) {
      return this.handleUserInfoError(error, 'getUserFollowing', { userName, options });
    }
  }

  /**
   * ユーザー検索
   * 
   * @description 指定されたキーワードでユーザーを検索します
   * 高度なフィルタリングとソート機能を提供
   * 
   * @param query - 検索キーワード（1-500文字、最大50単語）
   * @param options - 検索オプション
   * @param options.count - 取得件数（最大20件）
   * @param options.resultType - 結果タイプ（recent/popular/mixed）
   * @param options.nextToken - ページネーション用トークン
   * @returns 検索結果とメタデータ
   * 
   * @throws {Error} 検索クエリバリデーションエラー
   * @throws {Error} API認証・権限エラー
   * @throws {Error} レート制限エラー
   * 
   * @example
   * ```typescript
   * // 基本的なユーザー検索
   * const result = await userEndpoint.searchUsers('investment education');
   * 
   * // 高度な検索オプション
   * const advancedResult = await userEndpoint.searchUsers('trading', {
   *   count: 20,
   *   resultType: 'popular'
   * });
   * ```
   * 
   * @since 2.0.0
   */
  async searchUsers(query: string, options?: UserSearchOptions): Promise<APIResult<UserSearchResult>> {
    // 統一バリデーション処理
    const validation = this.validateSearchQuery(query);
    if (!validation.isValid) {
      const errorMessage = `ユーザー検索クエリバリデーションエラー: ${validation.errors.join(', ')}`;
      const suggestions = validation.suggestions?.join(', ') || '有効な検索キーワードを指定してください';
      throw createAPIError('validation', 'INVALID_SEARCH_QUERY', `${errorMessage}. 修正提案: ${suggestions}`);
    }

    try {
      // 最適化されたAPIパラメータ構築
      const params: Record<string, string | number> = { 
        q: query.trim(),
        count: options?.count ? Math.min(Math.max(options.count, 1), 20) : 10
      };
      
      if (options?.resultType) {
        params.result_type = options.resultType;
      }
      if (options?.nextToken) {
        params.next_token = options.nextToken;
      }

      const response = await this.httpClient.get<TwitterAPIUserSearchResponse>(
        this.ENDPOINTS.userSearch,
        params
      );

      // バッチ処理でパフォーマンス向上
      const users = response.data || response.users || [];
      const normalizedUsers = await this.batchNormalizeUsers(users);

      const result: UserSearchResult = {
        users: normalizedUsers,
        totalCount: response.totalCount || normalizedUsers.length,
        searchQuery: query,
        nextToken: response.meta?.next_token,
        previousToken: response.meta?.previous_token,
        executedAt: new Date().toISOString()
      };

      return createSuccessResult(result, {
        rateLimit: response.rateLimit,
        searchMetrics: {
          originalCount: users.length,
          normalizedCount: normalizedUsers.length,
          processedAt: new Date().toISOString()
        }
      });

    } catch (error: any) {
      return this.handleUserInfoError(error, 'searchUsers', { query, options });
    }
  }

  /**
   * ユーザーデータバッチ正規化
   * 
   * @description 大量ユーザーデータの効率的な正規化処理
   * エラー耐性とパフォーマンスを両立させたバッチ処理
   * 
   * @param users - 正規化对象のユーザーデータ配列
   * @returns 正規化されたユーザー情報配列
   */
  private async batchNormalizeUsers(users: any[]): Promise<UserInfo[]> {
    if (!Array.isArray(users) || users.length === 0) {
      return [];
    }

    const batchSize = 25; // パフォーマンスとメモリ使用量のバランス
    const normalizedUsers: UserInfo[] = [];
    
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      // Promise.allSettledで部分的失敗を許容
      const batchResults = await Promise.allSettled(
        batch.map(user => this.normalizeUserInfo(user))
      );
      
      // 成功した結果のみを集約
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          normalizedUsers.push(result.value);
        } else {
          // ログ出力しつつ継続処理
          console.warn(`ユーザーデータ正規化失敗 (batch ${Math.floor(i/batchSize) + 1}):`, result.reason);
        }
      }
      
      // CPU集約処理を回避するための小さな遅延
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    return normalizedUsers;
  }

  // ============================================================================
  // PRIVATE METHODS - VALIDATION
  // ============================================================================

  /**
   * ユーザー名バリデーション
   * 
   * @description Twitter仕様に準拠した厳密なユーザー名検証
   * セキュリティ検証と修正提案を含む包括的バリデーション
   * 
   * @param userName - 検証対象のユーザー名
   * @returns 詳細なバリデーション結果
   */
  private validateUserName(userName: string): ValidationResult {
    const errors: string[] = [];
    const errorCodes: string[] = [];
    const suggestions: string[] = [];

    // 基本的な型・存在チェック
    if (!userName) {
      errors.push('ユーザー名が指定されていません');
      errorCodes.push('USERNAME_REQUIRED');
      suggestions.push('有効なユーザー名（例: elonmusk, jack）を指定してください');
      return { isValid: false, errors, errorCodes, suggestions };
    }
    
    if (typeof userName !== 'string') {
      errors.push('ユーザー名は文字列である必要があります');
      errorCodes.push('USERNAME_TYPE_ERROR');
      suggestions.push('文字列形式でユーザー名を指定してください');
      return { isValid: false, errors, errorCodes, suggestions };
    }

    const cleanUserName = userName.trim();
    
    // 長さ制限チェック
    if (cleanUserName.length === 0) {
      errors.push('ユーザー名が空文字です');
      errorCodes.push('USERNAME_EMPTY');
      suggestions.push('1文字以上のユーザー名を指定してください');
    } else if (cleanUserName.length > 15) {
      errors.push(`ユーザー名が長すぎます（${cleanUserName.length}文字 > 15文字制限）`);
      errorCodes.push('USERNAME_TOO_LONG');
      suggestions.push('15文字以内のユーザー名を指定してください');
    }
    
    // 文字種チェック（英数字・アンダースコアのみ）
    if (!this.VALIDATION_RULES.userName.test(cleanUserName)) {
      errors.push('ユーザー名に無効な文字が含まれています（英数字・アンダースコアのみ有効）');
      errorCodes.push('USERNAME_INVALID_CHARS');
      suggestions.push('使用可能文字: a-z, A-Z, 0-9, _ （アンダースコア）');
    }
    
    // セキュリティチェック（悪意のある文字列の検出）
    const securityPatterns = [
      { pattern: /[<>"'&]/, message: 'HTMLタグや危険な文字が含まれています' },
      { pattern: /\s/, message: 'スペースは使用できません' },
      { pattern: /^[0-9]+$/, message: '数字のみのユーザー名は無効です' }
    ];
    
    for (const { pattern, message } of securityPatterns) {
      if (pattern.test(cleanUserName)) {
        errors.push(message);
        errorCodes.push('USERNAME_SECURITY_VIOLATION');
        suggestions.push('安全な文字のみを使用してください');
      }
    }

    return { 
      isValid: errors.length === 0, 
      errors, 
      errorCodes, 
      suggestions: suggestions.length > 0 ? suggestions : ['例: elonmusk, jack, tesla']
    };
  }

  /**
   * 検索クエリバリデーション
   * 
   * @description ユーザー検索用クエリの包括的バリデーション
   * セキュリティチェックと不適切コンテンツの検出を含む
   * 
   * @param query - 検証対象の検索クエリ
   * @returns 詳細なバリデーション結果
   */
  private validateSearchQuery(query: string): ValidationResult {
    const errors: string[] = [];
    const errorCodes: string[] = [];
    const suggestions: string[] = [];

    // 基本的な型・存在チェック
    if (!query) {
      errors.push('検索クエリが指定されていません');
      errorCodes.push('QUERY_REQUIRED');
      suggestions.push('有効な検索キーワードを指定してください');
      return { isValid: false, errors, errorCodes, suggestions };
    }
    
    if (typeof query !== 'string') {
      errors.push('検索クエリは文字列である必要があります');
      errorCodes.push('QUERY_TYPE_ERROR');
      suggestions.push('文字列形式で検索クエリを指定してください');
      return { isValid: false, errors, errorCodes, suggestions };
    }

    const cleanQuery = query.trim();
    
    // 長さ制限チェック
    if (cleanQuery.length < this.VALIDATION_RULES.searchQuery.minLength) {
      errors.push(`検索クエリが短すぎます（${cleanQuery.length}文字 < ${this.VALIDATION_RULES.searchQuery.minLength}文字制限）`);
      errorCodes.push('QUERY_TOO_SHORT');
      suggestions.push(`${this.VALIDATION_RULES.searchQuery.minLength}文字以上の検索クエリを指定してください`);
    }
    
    if (cleanQuery.length > this.VALIDATION_RULES.searchQuery.maxLength) {
      errors.push(`検索クエリが長すぎます（${cleanQuery.length}文字 > ${this.VALIDATION_RULES.searchQuery.maxLength}文字制限）`);
      errorCodes.push('QUERY_TOO_LONG');
      suggestions.push(`${this.VALIDATION_RULES.searchQuery.maxLength}文字以内の検索クエリを指定してください`);
    }
    
    // 単語数チェック（TwitterAPI.io制限）
    const words = cleanQuery.split(/\s+/).filter(word => word.length > 0);
    if (words.length > this.VALIDATION_RULES.searchQuery.maxWords) {
      errors.push(`検索クエリの単語数が多すぎます（${words.length}個 > ${this.VALIDATION_RULES.searchQuery.maxWords}個制限）`);
      errorCodes.push('QUERY_TOO_MANY_WORDS');
      suggestions.push(`${this.VALIDATION_RULES.searchQuery.maxWords}個以内のキーワードで検索してください`);
    }
    
    // セキュリティチェック
    const securityCheck = performSecurityCheck(cleanQuery);
    if (!securityCheck.isSafe) {
      errors.push('検索クエリに危険なパターンが含まれています');
      errorCodes.push('QUERY_SECURITY_VIOLATION');
      suggestions.push('安全な文字とキーワードのみを使用してください');
      errors.push(...securityCheck.issues);
    }

    return { 
      isValid: errors.length === 0, 
      errors, 
      errorCodes, 
      suggestions: suggestions.length > 0 ? suggestions : ['例: "investment education", "trading tips", "financial literacy"']
    };
  }

  // ============================================================================
  // PRIVATE METHODS - DATA NORMALIZATION
  // ============================================================================

  /**
   * ユーザー情報正規化
   * 
   * @description TwitterAPI.ioの多様なレスポンス形式を統一されたUserInfo型に正規化
   * データの完整性チェックとデフォルト値設定を実行
   * 
   * @param apiUser - TwitterAPI.ioからの生レスポンスデータ
   * @returns 正規化されたユーザー情報
   */
  private async normalizeUserInfo(apiUser: any): Promise<UserInfo> {
    // データ完整性チェック
    if (!apiUser || typeof apiUser !== 'object') {
      throw createAPIError('validation', 'INVALID_API_RESPONSE', 
        'TwitterAPI.ioから無効なユーザーデータを受信しました');
    }

    // 安全な数値変換関数
    const safeNumber = (value: any, defaultValue: number = 0): number => {
      const num = parseInt(value, 10);
      return isNaN(num) || num < 0 ? defaultValue : num;
    };

    // 安全な日付変換関数
    const safeDate = (value: any): string => {
      if (!value) return new Date().toISOString();
      try {
        const date = new Date(value);
        return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
      } catch {
        return new Date().toISOString();
      }
    };

    // 安全なURL正規化
    const safeUrl = (value: any): string | undefined => {
      if (!value || typeof value !== 'string') return undefined;
      try {
        const url = new URL(value);
        return url.protocol === 'https:' ? url.toString() : undefined;
      } catch {
        return undefined;
      }
    };

    // 統一された正規化処理
    return {
      id: String(apiUser.id_str || apiUser.id || 'unknown'),
      username: (apiUser.screen_name || apiUser.username || 'unknown').toLowerCase(),
      name: apiUser.name || apiUser.display_name || 'Unknown User',
      displayName: apiUser.name || apiUser.display_name || 'Unknown User',
      description: apiUser.description || '',
      bio: apiUser.description || '',
      profileImageUrl: safeUrl(apiUser.profile_image_url_https || apiUser.profile_image_url),
      verified: Boolean(apiUser.verified),
      followersCount: safeNumber(apiUser.followers_count),
      followingCount: safeNumber(apiUser.friends_count || apiUser.following_count),
      tweetCount: safeNumber(apiUser.statuses_count || apiUser.tweet_count),
      likeCount: safeNumber(apiUser.favourites_count || apiUser.like_count),
      location: apiUser.location || undefined,
      protected: Boolean(apiUser.protected)
    };
  }

  /**
   * フォロワーデータ正規化
   * 
   * @description フォロワー/フォロイーデータの効率的なバッチ正規化処理
   * 大量データの高速処理とエラーハンドリングを実装
   * 
   * @param response - TwitterAPI.ioのレスポンスデータ
   * @param type - データタイプ（'followers' | 'following'）
   * @returns 正規化されたフォロワー情報
   */
  private async normalizeFollowerData(
    response: any, 
    type: 'followers' | 'following' = 'followers'
  ): Promise<{
    followers: UserInfo[];
    following: UserInfo[];
    followerCount: number;
    followingCount: number;
  }> {
    // データ完整性チェック
    if (!response || typeof response !== 'object') {
      throw createAPIError('validation', 'INVALID_API_RESPONSE', 
        'フォロワーデータの取得に失敗しました');
    }

    // バッチ処理でパフォーマンス向上
    const batchSize = 50; // 一度に処理する件数
    
    const processUsersBatch = async (users: any[]): Promise<UserInfo[]> => {
      const normalizedUsers: UserInfo[] = [];
      
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(user => this.normalizeUserInfo(user))
        );
        
        // 成功した結果のみを追加
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            normalizedUsers.push(result.value);
          } else {
            console.warn('ユーザーデータ正規化に失敗:', result.reason);
          }
        }
      }
      
      return normalizedUsers;
    };

    // タイプ別データ処理
    const followers = type === 'followers' || !type ? 
      await processUsersBatch(response.data || response.followers || []) : [];
    
    const following = type === 'following' ? 
      await processUsersBatch(response.data || response.following || []) : [];

    return {
      followers,
      following,
      followerCount: response.followerCount || response.totalCount || followers.length,
      followingCount: response.followingCount || response.totalCount || following.length
    };
  }

  // ============================================================================
  // PRIVATE METHODS - ERROR HANDLING
  // ============================================================================

  /**
   * ユーザー情報エラーハンドリング
   * 
   * @description 統一されたエラーハンドリングパターンで包括的なエラー処理を実行
   * より具体的で診断しやすいエラーメッセージを生成し、復旧可能性を判定
   * 
   * @param error - 発生したエラー
   * @param operation - 実行していた操作名
   * @param context - 実行コンテキスト（デバッグ用）
   * @returns 失敗結果または例外をスロー
   */
  private handleUserInfoError(error: any, operation: string, context: Record<string, any>): never {
    const timestamp = new Date().toISOString();
    const requestId = `user-info-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // HTTPステータスコード別の詳細エラー処理
    switch (error.status) {
      case 401:
        throw createAPIError('authentication', 'INVALID_API_KEY', 
          `APIキー認証失敗: KAITO_API_TOKENが無効または期限切れです。操作: ${operation}`, {
          timestamp,
          requestId,
          context,
          suggestion: 'APIキーを再確認し、環境変数KAITO_API_TOKENを正しく設定してください',
          recoverable: true
        });
        
      case 403:
        throw createAPIError('authorization', 'INSUFFICIENT_PERMISSIONS', 
          `権限不足: APIキーに${operation}操作の権限がありません`, {
          timestamp,
          requestId,
          context,
          suggestion: 'より高い権限レベルのAPIキーが必要です',
          recoverable: false
        });
        
      case 429:
        const resetTime = error.headers?.['x-rate-limit-reset'] || 'unknown';
        throw createAPIError('rate_limit', 'RATE_LIMIT_EXCEEDED', 
          `レート制限超過: ${operation}操作の制限に達しました。リセット時刻: ${resetTime}`, {
          timestamp,
          requestId,
          context,
          resetTime,
          suggestion: '数分後に再試行するか、レート制限を考慮した実装に変更してください',
          recoverable: true
        });
        
      case 404:
        throw createAPIError('validation', 'USER_NOT_FOUND', 
          `ユーザーが見つかりません: '${context.userName}' は存在しないか、非公開アカウントです`, {
          timestamp,
          requestId,
          context,
          suggestion: 'ユーザー名のスペルを確認するか、別のユーザーを指定してください',
          recoverable: true
        });
        
      case 500:
      case 502:
      case 503:
        throw createAPIError('server_error', 'TWITTER_API_ERROR', 
          `TwitterAPI.ioサーバーエラー: 一時的な障害が発生しています（${error.status}）`, {
          timestamp,
          requestId,
          context,
          suggestion: '数分後に再試行してください。問題が継続する場合はTwitterAPI.ioのステータスを確認してください',
          recoverable: true
        });
        
      default:
        throw createAPIError('network_error', 'UNKNOWN_ERROR', 
          `予期しないエラーが発生しました: ${error.message || 'Unknown error'}`, {
          timestamp,
          requestId,
          context,
          originalError: error,
          suggestion: 'ネットワーク接続を確認し、再試行してください',
          recoverable: true
        });
    }
  }
}