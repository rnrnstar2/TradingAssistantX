/**
 * KaitoAPI 統合型定義エクスポート
 * 認証レベル別型定義システムの統一エントリーポイント
 * 
 * @fileoverview TwitterAPI.io 3層認証アーキテクチャ対応型定義システム
 * @version 2.0.0
 * @see https://docs.twitterapi.io/authentication
 */

// ============================================================================
// CORE EXPORTS - 共通型定義
// ============================================================================

// 共通基盤型定義をエクスポート
export * from './common';

// ============================================================================
// AUTHENTICATION LEVEL EXPORTS - 認証レベル別型定義
// ============================================================================

// APIキー認証（読み取り専用）型定義
export * from './public-types';

// V1ログイン認証（基本投稿・エンゲージメント）型定義
export * from './v1-auth-types';

// V2ログイン認証（高機能投稿・DM・コミュニティ）型定義
export * from './v2-auth-types';

// ============================================================================
// AUTHENTICATION SYSTEM TYPES - 認証システム統合型
// ============================================================================

/**
 * 認証レベル判定型
 * TwitterAPI.ioの3層認証アーキテクチャに対応
 * 
 * @example
 * ```typescript
 * const level: AuthLevel = 'v2-login'; // 最高機能レベル
 * const level2: AuthLevel = 'api-key'; // 読み取り専用レベル
 * ```
 */
export type AuthLevel = 'none' | 'api-key' | 'v1-login' | 'v2-login';

/**
 * 認証レベル設定型
 * 各認証レベルの機能と要件を定義
 * 
 * @example
 * ```typescript
 * const config: AuthLevelConfig = {
 *   level: 'v2-login',
 *   capabilities: ['tweet', 'dm', 'community', 'advanced_engagement'],
 *   requiredEnvVars: ['TWITTER_USERNAME', 'TWITTER_EMAIL', 'TWITTER_PASSWORD', 'TWITTER_TOTP_SECRET'],
 *   description: 'V2ログイン認証 - 全機能利用可能'
 * };
 * ```
 */
export interface AuthLevelConfig {
  /** 認証レベル */
  level: AuthLevel;
  
  /** 利用可能な機能リスト */
  capabilities: string[];
  
  /** 必要な環境変数リスト */
  requiredEnvVars: string[];
  
  /** 認証レベルの説明 */
  description?: string;
  
  /** セッション有効期間（秒） */
  sessionDuration?: number;
  
  /** QPS制限値 */
  qpsLimit?: number;
}

/**
 * 認証レベル別機能マッピング
 * 各認証レベルで利用可能な機能の詳細定義
 * 
 * @example
 * ```typescript
 * const capabilities = AUTH_LEVEL_CAPABILITIES['v2-login'];
 * console.log(capabilities.canCreateTweet); // true
 * console.log(capabilities.canSendDM); // true
 * ```
 */
export const AUTH_LEVEL_CAPABILITIES: Record<AuthLevel, {
  // 読み取り機能
  canReadTweets: boolean;
  canReadUsers: boolean;
  canReadTrends: boolean;
  
  // 基本投稿機能
  canCreateTweet: boolean;
  canEngageTweet: boolean;
  canFollowUser: boolean;
  
  // 高機能投稿機能
  canCreateNoteTweet: boolean;
  canCreatePoll: boolean;
  canQuoteTweet: boolean;
  
  // 高度機能
  canSendDM: boolean;
  canCreateCommunity: boolean;
  canBookmark: boolean;
  
  // システム機能
  requiresSession: boolean;
  supportsProxy: boolean;
}> = {
  'none': {
    // 機能なし
    canReadTweets: false,
    canReadUsers: false,
    canReadTrends: false,
    
    // 投稿・エンゲージメント機能（なし）
    canCreateTweet: false,
    canEngageTweet: false,
    canFollowUser: false,
    
    // 高機能投稿機能（なし）
    canCreateNoteTweet: false,
    canCreatePoll: false,
    canQuoteTweet: false,
    
    // 高度機能（なし）
    canSendDM: false,
    canCreateCommunity: false,
    canBookmark: false,
    
    // システム機能
    requiresSession: false,
    supportsProxy: false
  },
  'api-key': {
    // 読み取り専用機能
    canReadTweets: true,
    canReadUsers: true,
    canReadTrends: true,
    
    // 投稿・エンゲージメント機能（なし）
    canCreateTweet: false,
    canEngageTweet: false,
    canFollowUser: false,
    
    // 高機能投稿機能（なし）
    canCreateNoteTweet: false,
    canCreatePoll: false,
    canQuoteTweet: false,
    
    // 高度機能（なし）
    canSendDM: false,
    canCreateCommunity: false,
    canBookmark: false,
    
    // システム機能
    requiresSession: false,
    supportsProxy: false
  },
  
  'v1-login': {
    // 読み取り機能
    canReadTweets: true,
    canReadUsers: true,
    canReadTrends: true,
    
    // 基本投稿・エンゲージメント機能
    canCreateTweet: true,
    canEngageTweet: true,
    canFollowUser: true,
    
    // 高機能投稿機能（制限あり）
    canCreateNoteTweet: false,
    canCreatePoll: false,
    canQuoteTweet: true,
    
    // 高度機能（なし）
    canSendDM: false,
    canCreateCommunity: false,
    canBookmark: false,
    
    // システム機能
    requiresSession: true,
    supportsProxy: true
  },
  
  'v2-login': {
    // 読み取り機能
    canReadTweets: true,
    canReadUsers: true,
    canReadTrends: true,
    
    // 基本投稿・エンゲージメント機能
    canCreateTweet: true,
    canEngageTweet: true,
    canFollowUser: true,
    
    // 高機能投稿機能
    canCreateNoteTweet: true,
    canCreatePoll: true,
    canQuoteTweet: true,
    
    // 高度機能
    canSendDM: true,
    canCreateCommunity: true,
    canBookmark: true,
    
    // システム機能
    requiresSession: true,
    supportsProxy: true
  }
};

/**
 * 認証レベル判定ヘルパー関数
 * 現在の認証状態から利用可能な機能を判定
 * 
 * @param level 認証レベル
 * @param capability 確認したい機能
 * @returns 機能が利用可能な場合true
 * 
 * @example
 * ```typescript
 * const canPost = hasCapability('v1-login', 'canCreateTweet'); // true
 * const canDM = hasCapability('api-key', 'canSendDM'); // false
 * ```
 */
export function hasCapability(
  level: AuthLevel, 
  capability: keyof typeof AUTH_LEVEL_CAPABILITIES[AuthLevel]
): boolean {
  return AUTH_LEVEL_CAPABILITIES[level][capability];
}

/**
 * 認証レベル比較ヘルパー関数
 * 認証レベルの権限レベルを比較
 * 
 * @param level1 比較対象1
 * @param level2 比較対象2
 * @returns level1の方が高い場合1、同じ場合0、低い場合-1
 * 
 * @example
 * ```typescript
 * const result = compareAuthLevel('v2-login', 'api-key'); // 1
 * const result2 = compareAuthLevel('api-key', 'v1-login'); // -1
 * ```
 */
export function compareAuthLevel(level1: AuthLevel, level2: AuthLevel): number {
  const levels: AuthLevel[] = ['none', 'api-key', 'v1-login', 'v2-login'];
  const index1 = levels.indexOf(level1);
  const index2 = levels.indexOf(level2);
  return index1 - index2;
}

// ============================================================================
// BACKWARD COMPATIBILITY - 後方互換性維持
// ============================================================================

// 既存コードとの互換性のための型エイリアス
// 段階的移行をサポートするため、既存の型名を新しい型にマッピング

// 投稿関連の互換性エイリアス
export type { V1TweetCreateResponse as TweetCreateResponse } from './v1-auth-types';
export type { TweetSearchResponse } from './public-types';
export type { UserInfoResponse } from './public-types';

// エンゲージメント関連の互換性エイリアス
export type { V1EngagementResponse as EngagementResponse } from './v1-auth-types';

// V2機能の型エイリアス（新機能向け）
export type { 
  V2TweetCreateRequest as CreateTweetV2Request,
  V2TweetCreateResponse as CreateTweetV2Response,
  V2DMRequest as DirectMessageRequest,
  V2DMResponse as DirectMessageResponse,
  V2CommunityRequest as CommunityCreateRequest,
  V2CommunityResponse as CommunityCreateResponse
} from './v2-auth-types';

// 検索関連の互換性エイリアス
export type { TweetSearchOptions } from './public-types';
export type { UserSearchOptions } from './public-types';

// セッション管理の互換性エイリアス
export type { 
  V1SessionData as SessionDataV1
} from './v1-auth-types';

export type { 
  V2SessionData as SessionDataV2
} from './v2-auth-types';

// 設定関連の互換性エイリアス（既存のtypes.tsから移行）
export interface KaitoClientConfig {
  /** TwitterAPI.io API Key - x-api-key ヘッダーで使用 */
  apiKey: string;
  
  /** QPS制限 - TwitterAPI.io固定値: 200 */
  qpsLimit: 200;
  
  /** リトライポリシー設定 */
  retryPolicy: {
    /** 最大リトライ回数 */
    maxRetries: number;
    /** バックオフ間隔（ミリ秒） */
    backoffMs: number;
  };
  
  /** コスト追跡設定 - boolean（互換性）またはオブジェクト（新仕様） */
  costTracking: boolean | {
    /** コスト追跡の有効/無効 */
    enabled: boolean;
    /** 1000ツイートあたりの料金（USD） */
    ratePerThousand: 0.15;
    /** アラート閾値（USD） */
    alertThreshold?: number;
  };
}

/**
 * @deprecated Use KaitoClientConfig instead
 * 既存のconfigシステムとの互換性維持
 */
export interface KaitoAPIConfig {
  environment: 'dev' | 'staging' | 'prod';
  api: {
    baseUrl: string;
    version: string;
    timeout: number;
    retryPolicy: {
      maxRetries: number;
      backoffMs: number;
      retryConditions: string[];
    };
  };
  authentication: {
    primaryKey: string;
    secondaryKey?: string;
    keyRotationInterval: number;
    encryptionEnabled: boolean;
  };
  performance: {
    qpsLimit: number;
    responseTimeTarget: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
  monitoring: {
    metricsEnabled: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    alertingEnabled: boolean;
    healthCheckInterval: number;
  };
  security: {
    rateLimitEnabled: boolean;
    ipWhitelist: string[];
    auditLoggingEnabled: boolean;
    encryptionKey: string;
  };
  features: {
    realApiEnabled: boolean;
    mockFallbackEnabled: boolean;
    batchProcessingEnabled: boolean;
    advancedCachingEnabled: boolean;
  };
  metadata: {
    version: string;
    lastUpdated: string;
    updatedBy: string;
    checksum: string;
  };
}

/**
 * エンドポイント設定
 * kaito-api/core/client.tsとの互換性維持
 */
export interface EndpointConfig {
  user: {
    info: string;
    follow: string;
    unfollow: string;
    search: string;
  };
  tweet: {
    create: string;
    retweet: string;
    quote: string;
    search: string;
    delete: string;
  };
  engagement: {
    like: string;
    unlike: string;
    bookmark: string;
    unbookmark: string;
  };
  auth: {
    verify: string;
    refresh: string;
  };
  health: string;
}

/**
 * 設定検証結果
 * config.tsとの互換性維持
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedAt: string;
  environment: string;
}

/**
 * セッションデータ構造
 * SessionManagerで使用する内部データ形式（後方互換性）
 */
export interface SessionData {
  /** ログインクッキー */
  login_cookie: string;
  /** セッション期限（Unix timestamp） */
  expires_at: number;
  /** セッション作成時刻（Unix timestamp） */
  created_at: number;
  /** ユーザー情報（オプション） */
  user_info?: {
    /** ユーザー名 */
    username: string;
    /** ユーザーID */
    user_id: string;
  };
}

// 認証状態の互換性エイリアス
export interface AuthStatus {
  apiKeyValid: boolean;
  userSessionValid: boolean;
  sessionExpiry: number | null;
  canPerformUserActions: boolean;
  /** 認証レベル（後方互換性） */
  authLevel?: AuthLevel;
  /** V1セッション有効性（後方互換性） */
  v1SessionValid?: boolean;
  /** V2セッション有効性（後方互換性） */
  v2SessionValid?: boolean;
  /** 有効な認証レベル一覧（後方互換性） */
  validAuthLevels?: AuthLevel[];
  /** 環境変数検証ステータス */
  environmentVariablesValid?: boolean;
  /** 未設定の環境変数リスト */
  missingEnvironmentVariables?: string[];
}

// レート制限情報の互換性エイリアス
export interface RateLimitInfo {
  /** 残り利用可能数 */
  remaining: number;
  
  /** 制限リセット時刻（ISO 8601形式） - 新仕様 */
  reset_time?: string;
  
  /** @deprecated Use reset_time instead - 既存コード互換性 */
  resetTime?: string;
  
  /** 制限値 */
  limit: number;
  
  /** 使用済み数 */
  used?: number;
}

// ============================================================================
// TYPE UTILITY EXPORTS - 型ユーティリティ再エクスポート
// ============================================================================

// 共通型定義からの型ユーティリティを再エクスポート
export type {
  TwitterId,
  ISO8601DateString,
  EngagementAction,
  TweetSearchSortOrder,
  ErrorType,
  ServiceStatus,
  VerifiedType
} from './common';

// ============================================================================
// VERSION INFORMATION - バージョン情報
// ============================================================================

/**
 * 型定義システムのバージョン情報
 */
export const TYPE_SYSTEM_VERSION = {
  /** メジャーバージョン */
  major: 2,
  /** マイナーバージョン */
  minor: 0,
  /** パッチバージョン */
  patch: 0,
  /** バージョン文字列 */
  version: '2.0.0',
  /** ビルド日時 */
  buildDate: '2025-07-28',
  /** 対応TwitterAPI.ioバージョン */
  apiVersion: 'v2.1.0'
} as const;