/**
 * KaitoAPI 統合型定義
 * 各エンドポイントの型定義を一元管理
 * 
 * REQUIREMENTS.md準拠 - 疎結合ライブラリアーキテクチャ対応
 * 実際のファイルから抽出した型定義のみ含む
 * 
 * 注意: shared/types.tsとの重複型は後続Workerが解決予定
 */

// ============================================================================
// TWEET TYPES - tweet-endpoints.tsより抽出
// ============================================================================

/**
 * ツイートデータ基本インターフェース
 */
export interface TweetData {
  id: string;
  text: string;
  authorId: string;
  createdAt: string;
  publicMetrics: {
    retweetCount: number;
    likeCount: number;
    quoteCount: number;
    replyCount: number;
    impressionCount: number;
  };
  contextAnnotations?: Array<{
    domain: string;
    entity: string;
    description: string;
  }>;
  attachments?: {
    mediaKeys?: string[];
    pollIds?: string[];
  };
  referencedTweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to';
    id: string;
  }>;
  inReplyToUserId?: string;
  conversationId?: string;
  lang?: string;
}

/**
 * ツイート作成結果
 */
export interface TweetResult {
  id: string;
  text: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * リツイート結果
 */
export interface RetweetResult {
  id: string;
  originalTweetId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * 引用ツイート結果
 */
export interface QuoteResult {
  id: string;
  originalTweetId: string;
  comment: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * ツイート検索結果
 */
export interface TweetSearchResult {
  tweets: TweetData[];
  totalCount: number;
  nextToken?: string;
  searchQuery: string;
  timestamp: string;
}

/**
 * ツイート検索オプション
 */
export interface TweetSearchOptions {
  query: string;
  maxResults?: number;
  nextToken?: string;
  startTime?: string;
  endTime?: string;
  sortOrder?: 'recency' | 'relevancy';
  includeRetweets?: boolean;
  lang?: string;
  tweetFields?: string[];
  expansions?: string[];
}

/**
 * ツイート作成オプション
 */
export interface CreateTweetOptions {
  text: string;
  mediaIds?: string[];
  pollOptions?: string[];
  pollDurationMinutes?: number;
  inReplyToTweetId?: string;
  quoteTweetId?: string;
  location?: {
    placeId: string;
  };
  directMessageDeepLink?: string;
  forSuperFollowersOnly?: boolean;
}

/**
 * ツイート削除結果
 */
export interface DeleteTweetResult {
  tweetId: string;
  deleted: boolean;
  timestamp: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// USER TYPES - user-endpoints.tsより抽出
// ============================================================================

/**
 * ユーザー情報インターフェース
 */
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

/**
 * フォロー結果
 */
export interface FollowResult {
  userId: string;
  following: boolean;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * アンフォロー結果
 */
export interface UnfollowResult {
  userId: string;
  unfollowed: boolean;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * ユーザー検索結果
 */
export interface UserSearchResult {
  users: UserInfo[];
  totalCount: number;
  nextToken?: string;
  searchQuery: string;
  timestamp: string;
}

/**
 * ユーザー検索オプション
 */
export interface UserSearchOptions {
  query: string;
  maxResults?: number;
  nextToken?: string;
  includeVerified?: boolean;
  minFollowers?: number;
  maxFollowers?: number;
}

/**
 * プロフィール更新データ
 */
export interface ProfileUpdateData {
  displayName?: string;
  description?: string;
  location?: string;
  website?: string;
  profileImageUrl?: string;
  bannerImageUrl?: string;
}

/**
 * プロフィール更新結果
 */
export interface ProfileUpdateResult {
  userId: string;
  updated: boolean;
  timestamp: string;
  success: boolean;
  updatedFields: string[];
  error?: string;
}

/**
 * 安全なユーザープロフィール（プライバシー保護統合機能）
 */
export interface SafeUserProfile {
  basicInfo: Pick<UserInfo, 'username' | 'displayName' | 'verified' | 'description'>;
  publicMetrics: Pick<UserInfo, 'followersCount' | 'tweetsCount'>;
  educationalValue: {
    isEducationalAccount: boolean;
    educationalTopics: string[];
    credibilityLevel: 'high' | 'medium' | 'low';
  };
  safetyLevel: 'safe' | 'caution' | 'restricted';
}

/**
 * ユーザー分析データ
 */
export interface UserAnalytics {
  userId: string;
  engagementRate: number;
  educationalContentRatio: number;
  activityLevel: 'low' | 'medium' | 'high';
  credibilityScore: number;
  topTopics: string[];
  lastAnalyzed: string;
}

/**
 * アカウント安全性チェック結果
 */
export interface AccountSafetyCheck {
  isSafe: boolean;
  safetyLevel: 'safe' | 'caution' | 'restricted';
  concerns: string[];
  recommendations: string[];
}

/**
 * 教育的検索オプション
 */
export interface EducationalSearchOptions extends UserSearchOptions {
  educationalOnly?: boolean;
  minCredibilityLevel?: 'low' | 'medium' | 'high';
  topics?: string[];
}

// ============================================================================
// ACTION TYPES - action-endpoints.tsより抽出
// ============================================================================

/**
 * 投稿リクエスト
 */
export interface PostRequest {
  content: string;
  mediaIds?: string[];
  replyToId?: string;
  quoteTweetId?: string;
}

/**
 * 投稿レスポンス
 */
export interface PostResponse {
  success: boolean;
  tweetId?: string;
  createdAt?: string;
  error?: string;
}

/**
 * エンゲージメントリクエスト
 */
export interface EngagementRequest {
  tweetId: string;
  action: 'like' | 'unlike' | 'retweet' | 'unretweet';
}

/**
 * エンゲージメントレスポンス
 */
export interface EngagementResponse {
  success: boolean;
  action: string;
  tweetId: string;
  timestamp: string;
}

/**
 * 教育的ツイート結果（統合機能）
 */
export interface EducationalTweetResult {
  id: string;
  content: string;
  timestamp: string;
  success: boolean;
  educationalValue: number;
  qualityScore: number;
  error?: string;
}

/**
 * コンテンツ検証結果
 */
export interface ContentValidation {
  isEducational: boolean;
  hasValue: boolean;
  isAppropriate: boolean;
  qualityScore: number;
  topics: string[];
  reasons: string[];
}

/**
 * 頻度チェック結果
 */
export interface FrequencyCheck {
  canPost: boolean;
  lastPostTime: number;
  nextAllowedTime: number;
  waitTimeMs: number;
}

/**
 * 教育的リツイート結果（統合機能）
 */
export interface EducationalRetweetResult {
  id: string;
  originalTweetId: string;
  timestamp: string;
  success: boolean;
  educationalReason: string;
  error?: string;
}

/**
 * 教育的いいね結果（統合機能）
 */
export interface EducationalLikeResult {
  tweetId: string;
  timestamp: string;
  success: boolean;
  educationalJustification: string;
  error?: string;
}

// ============================================================================
// COMMUNITY TYPES - community-endpoints.tsより抽出
// ============================================================================

/**
 * コミュニティ情報
 */
export interface CommunityInfo {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isPublic: boolean;
  rules: string[];
}

/**
 * コミュニティメンバー
 */
export interface CommunityMember {
  userId: string;
  username: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
}

/**
 * コミュニティ投稿
 */
export interface CommunityPost {
  id: string;
  content: string;
  authorId: string;
  communityId: string;
  createdAt: string;
  engagement: {
    likes: number;
    replies: number;
    shares: number;
  };
}

// ============================================================================
// LIST TYPES - list-endpoints.tsより抽出
// ============================================================================

/**
 * Twitterリスト情報
 */
export interface TwitterList {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  followerCount: number;
  isPrivate: boolean;
  ownerId: string;
}

/**
 * リストメンバー
 */
export interface ListMember {
  userId: string;
  username: string;
  displayName: string;
  addedAt: string;
}

// ============================================================================
// LOGIN TYPES - login-endpoints.tsより抽出
// ============================================================================

/**
 * ログインリクエスト
 */
export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
  twoFactorCode?: string;
}

/**
 * ログインレスポンス
 */
export interface LoginResponse {
  success: boolean;
  authToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  requiresTwoFactor?: boolean;
  error?: string;
}

/**
 * 認証状態
 */
export interface AuthStatus {
  isAuthenticated: boolean;
  userId?: string;
  username?: string;
  expiresAt?: string;
}

// ============================================================================
// TREND TYPES - trend-endpoints.tsより抽出
// ============================================================================

/**
 * トレンドデータ
 */
export interface TrendData {
  name: string;
  query: string;
  tweetVolume: number | null;
  rank: number;
}

/**
 * トレンド地域情報
 */
export interface TrendLocation {
  woeid: number;
  name: string;
  countryCode: string;
}

// ============================================================================
// WEBHOOK TYPES - webhook-endpoints.tsより抽出
// ============================================================================

/**
 * Webhookルール
 */
export interface WebhookRule {
  id: string;
  tag: string;
  value: string;
  description: string;
}

/**
 * Webhookイベント
 */
export interface WebhookEvent {
  eventType: string;
  data: any;
  timestamp: string;
  ruleTag?: string;
}

// ============================================================================
// CORE TYPES - core/client.tsより抽出
// ============================================================================

/**
 * KaitoAPIクライアント設定
 */
export interface KaitoClientConfig {
  apiKey: string;
  qpsLimit: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  costTracking: boolean;
}

/**
 * レート制限状態
 */
export interface RateLimitStatus {
  general: RateLimitInfo;
  posting: RateLimitInfo;
  collection: RateLimitInfo;
  lastUpdated: string;
}

/**
 * レート制限情報
 * 注意: shared/types.tsと重複 - 後続Workerが解決予定
 */
export interface RateLimitInfo {
  remaining: number;
  resetTime: string;
  limit: number;
}

/**
 * コスト追跡情報
 */
export interface CostTrackingInfo {
  tweetsProcessed: number;
  estimatedCost: number;
  resetDate: string;
  lastUpdated: string;
}

/**
 * 引用ツイート結果（Core版）
 */
export interface QuoteTweetResult {
  id: string;
  originalTweetId: string;
  comment: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * 投稿結果（Core版）
 * 注意: shared/types.tsと重複 - 後続Workerが解決予定
 */
export interface PostResult {
  id: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * リツイート結果（Core版）
 * 注意: shared/types.tsと重複 - 後続Workerが解決予定
 */
export interface CoreRetweetResult {
  id: string;
  originalTweetId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * いいね結果（Core版）
 * 注意: shared/types.tsと重複 - 後続Workerが解決予定
 */
export interface LikeResult {
  tweetId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * アカウント情報
 */
export interface AccountInfo {
  id: string;
  username: string;
  displayName: string;
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  verified: boolean;
  createdAt: string;
  description: string;
  location: string;
  website: string;
  profileImageUrl: string;
  bannerImageUrl: string;
  timestamp: string;
}

// ============================================================================
// CONFIG TYPES - core/config.tsより抽出
// ============================================================================

/**
 * KaitoAPI設定インターフェース
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
 * エンドポイント設定インターフェース
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
 * 設定検証結果インターフェース
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedAt: string;
  environment: string;
}

// ============================================================================
// EXPORTS - 型定義エクスポート統合
// ============================================================================

/**
 * 使用例:
 * 
 * ```typescript
 * import { 
 *   TweetData, 
 *   UserInfo, 
 *   PostRequest, 
 *   KaitoAPIConfig 
 * } from './kaito-api/types';
 * 
 * // ツイートデータの作成
 * const tweet: TweetData = {
 *   id: '123',
 *   text: 'Hello World',
 *   authorId: 'user123',
 *   createdAt: new Date().toISOString(),
 *   publicMetrics: {
 *     retweetCount: 0,
 *     likeCount: 0,
 *     quoteCount: 0,
 *     replyCount: 0,
 *     impressionCount: 0
 *   }
 * };
 * 
 * // 投稿リクエストの作成
 * const postRequest: PostRequest = {
 *   content: 'Hello from KaitoAPI!',
 *   mediaIds: []
 * };
 * ```
 */