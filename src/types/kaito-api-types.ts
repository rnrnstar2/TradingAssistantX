/**
 * KaitoTwitterAPI 型定義統合
 * REQUIREMENTS.md準拠版 - TypeScript strict対応
 */

// ============================================================================
// CLIENT TYPES - QPS制御・認証・コスト追跡
// ============================================================================

export interface KaitoClientConfig {
  apiKey: string;
  qpsLimit: number; // 200QPS上限
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  costTracking: boolean; // $0.15/1k tweets追跡
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: string;
  limit: number;
}

export interface RateLimitStatus {
  general: RateLimitInfo;
  posting: RateLimitInfo;
  collection: RateLimitInfo;
  lastUpdated: string;
}

export interface CostTrackingInfo {
  tweetsProcessed: number;
  estimatedCost: number; // USD
  resetDate: string;
  lastUpdated: string;
}

// ============================================================================
// API RESULT TYPES
// ============================================================================

export interface PostResult {
  id: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface RetweetResult {
  id: string;
  originalTweetId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface QuoteTweetResult {
  id: string;
  originalTweetId: string;
  comment: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface LikeResult {
  tweetId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

// ============================================================================
// SEARCH ENGINE TYPES - マルチエンドポイント対応
// ============================================================================

export interface TweetSearchOptions {
  query: string;
  filters?: SearchFilters;
  maxResults?: number;
  timeRange?: '1h' | '6h' | '24h' | '7d';
}

export interface UserSearchOptions {
  query: string;
  maxResults?: number;
  verified?: boolean;
  minFollowers?: number;
}

export interface TrendSearchOptions {
  location?: string;
  category?: string;
  limit?: number;
}

export interface BatchSearchOptions {
  queries: string[];
  maxResultsPerQuery?: number;
  delay?: number;
  parallelRequests?: number;
}

export interface SearchEngineCapabilities {
  tweetSearch: TweetSearchOptions;
  userSearch: UserSearchOptions;
  trendSearch: TrendSearchOptions;
  batchSearch: BatchSearchOptions;
}

export interface SearchFilters {
  minLikes?: number;
  minRetweets?: number;
  minReplies?: number;
  fromDate?: string;
  toDate?: string;
  language?: string;
  hasMedia?: boolean;
  hasHashtags?: boolean;
  engagement_threshold?: number;
  account_type?: 'verified' | 'unverified' | 'any';
  content_type?: 'original' | 'retweet' | 'reply' | 'any';
}

export interface Tweet {
  id: string;
  text: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    verified: boolean;
    followersCount: number;
  };
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    views?: number;
  };
  engagement: {
    rate: number;
    quality_score: number;
    virality_potential: number;
  };
  content: {
    hashtags: string[];
    mentions: string[];
    urls: string[];
    hasMedia: boolean;
    language: string;
  };
  timestamp: string;
  url: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  verified: boolean;
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  description: string;
  location?: string;
  website?: string;
  profileImageUrl?: string;
  createdAt: string;
  isInvestmentRelated?: boolean;
}

export interface TrendingTopic {
  topic: string;
  volume: number;
  trend: 'rising' | 'stable' | 'declining';
  related_hashtags: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  opportunity_score: number;
}

export interface SearchResult {
  tweets: Tweet[];
  metadata: {
    totalFound: number;
    searchTime: number;
    query: string;
    filters: SearchFilters;
    timestamp: string;
  };
  insights: {
    avgEngagement: number;
    topHashtags: string[];
    sentimentDistribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    peakTimes: string[];
  };
}

export interface BatchSearchResult {
  query: string;
  results: Tweet[];
  executionTime: number;
  success: boolean;
  error?: string;
}

// ============================================================================
// ACTION EXECUTOR TYPES - 7エンドポイント統合
// ============================================================================

export interface UserEndpoints {
  getProfile: (userId: string) => Promise<any>;
  updateProfile: (data: any) => Promise<any>;
  follow: (userId: string) => Promise<any>;
  unfollow: (userId: string) => Promise<any>;
  getFollowers: (userId: string) => Promise<any>;
  getFollowing: (userId: string) => Promise<any>;
}

export interface TweetEndpoints {
  getTweet: (tweetId: string) => Promise<any>;
  getUserTweets: (userId: string) => Promise<any>;
  getTimeline: () => Promise<any>;
  searchTweets: (query: string) => Promise<any>;
}

export interface CommunityEndpoints {
  getCommunities: () => Promise<any>;
  joinCommunity: (communityId: string) => Promise<any>;
  leaveCommunity: (communityId: string) => Promise<any>;
  getCommunityTweets: (communityId: string) => Promise<any>;
}

export interface ListEndpoints {
  getLists: () => Promise<any>;
  createList: (data: any) => Promise<any>;
  updateList: (listId: string, data: any) => Promise<any>;
  deleteList: (listId: string) => Promise<any>;
  addToList: (listId: string, userId: string) => Promise<any>;
  removeFromList: (listId: string, userId: string) => Promise<any>;
}

export interface TrendEndpoints {
  getTrends: (location?: string) => Promise<any>;
  getHashtagTrends: () => Promise<any>;
  getTopicTrends: (category?: string) => Promise<any>;
}

export interface LoginEndpoints {
  authenticate: (credentials: any) => Promise<any>;
  refreshToken: () => Promise<any>;
  logout: () => Promise<any>;
  validateSession: () => Promise<any>;
}

export interface TweetActionEndpoints {
  post: (content: string, options?: any) => Promise<PostResult>;
  retweet: (tweetId: string) => Promise<RetweetResult>;
  quoteTweet: (tweetId: string, comment: string) => Promise<QuoteTweetResult>;
  like: (tweetId: string) => Promise<LikeResult>;
  unlike: (tweetId: string) => Promise<any>;
  reply: (tweetId: string, content: string) => Promise<any>;
  deleteTweet: (tweetId: string) => Promise<any>;
}

export interface ActionExecutorConfig {
  endpoints: {
    user: UserEndpoints;
    tweet: TweetEndpoints;
    communities: CommunityEndpoints;
    list: ListEndpoints;
    trend: TrendEndpoints;
    login: LoginEndpoints;
    tweetAction: TweetActionEndpoints;
  };
  reliability: {
    enableRollback: boolean;
    rollbackTimeoutMs: number;
    healthCheckInterval: number;
  };
}

export interface ActionContext {
  decision: any; // ClaudeDecision import circular避け
  environment: {
    isDryRun: boolean;
    rateLimitCheck: boolean;
    validationLevel: 'strict' | 'normal' | 'permissive';
  };
  retry: {
    maxRetries: number;
    baseDelay: number;
    backoffMultiplier: number;
  };
  rollback?: {
    enabled: boolean;
    actions: RollbackAction[];
  };
}

export interface RollbackAction {
  type: 'delete_tweet' | 'unfollow_user' | 'unlike_tweet' | 'leave_community';
  targetId: string;
  timestamp: string;
  originalAction: string;
}

export interface ExecutionResult {
  success: boolean;
  action: string;
  result?: {
    id: string;
    url?: string;
    timestamp: string;
  };
  error?: string;
  metadata: {
    executionTime: number;
    retryCount: number;
    rateLimitHit: boolean;
    timestamp: string;
  };
}

export interface ExecutionMetrics {
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  actionBreakdown: {
    post: { count: number; successRate: number };
    retweet: { count: number; successRate: number };
    quote_tweet: { count: number; successRate: number };
    like: { count: number; successRate: number };
    wait: { count: number; successRate: number };
    follow: { count: number; successRate: number };
    unfollow: { count: number; successRate: number };
    join_community: { count: number; successRate: number };
    create_list: { count: number; successRate: number };
    get_trends: { count: number; successRate: number };
  };
  errorPatterns: { [error: string]: number };
  lastUpdated: string;
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  context: string;
}

export interface QPSStatus {
  currentQPS: number;
  limit: number;
  resetTime: string;
  requestsInLastSecond: number;
}

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

export interface KaitoAPIIntegration {
  client: any; // KaitoTwitterAPIClient circular避け
  searchEngine: any; // SearchEngine circular避け  
  actionExecutor: any; // ActionExecutor circular避け
  isInitialized: boolean;
  lastHealthCheck: string;
}

// ============================================================================
// TYPE GUARDS - TypeScript strict対応
// ============================================================================

export function isPostResult(result: any): result is PostResult {
  return (
    typeof result === 'object' &&
    typeof result.id === 'string' &&
    typeof result.url === 'string' &&
    typeof result.timestamp === 'string' &&
    typeof result.success === 'boolean'
  );
}

export function isTweet(tweet: any): tweet is Tweet {
  return (
    typeof tweet === 'object' &&
    typeof tweet.id === 'string' &&
    typeof tweet.text === 'string' &&
    typeof tweet.author === 'object' &&
    typeof tweet.metrics === 'object' &&
    typeof tweet.engagement === 'object' &&
    typeof tweet.content === 'object'
  );
}

export function isExecutionResult(result: any): result is ExecutionResult {
  return (
    typeof result === 'object' &&
    typeof result.success === 'boolean' &&
    typeof result.action === 'string' &&
    typeof result.metadata === 'object'
  );
}

export function isKaitoClientConfig(config: any): config is KaitoClientConfig {
  return (
    typeof config === 'object' &&
    typeof config.apiKey === 'string' &&
    typeof config.qpsLimit === 'number' &&
    typeof config.retryPolicy === 'object' &&
    typeof config.costTracking === 'boolean'
  );
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ActionType = 
  | 'post' 
  | 'retweet' 
  | 'quote_tweet' 
  | 'like' 
  | 'wait' 
  | 'follow' 
  | 'unfollow'
  | 'join_community'
  | 'create_list'
  | 'get_trends';

export type SearchType = 
  | 'tweet' 
  | 'user' 
  | 'trend' 
  | 'batch';

export type EndpointCategory = 
  | 'user'
  | 'tweet'
  | 'communities'
  | 'list'
  | 'trend'
  | 'login'
  | 'tweetAction';

// ============================================================================
// CONSTANTS
// ============================================================================

export const KAITO_API_CONSTANTS = {
  QPS_LIMIT: 200,
  COST_PER_1K_TWEETS: 0.15,
  MAX_TWEET_LENGTH: 280,
  CACHE_TTL_MS: 300000, // 5 minutes
  DEFAULT_TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  MIN_REQUEST_INTERVAL_MS: 700, // Performance requirement
  SUPPORTED_LANGUAGES: ['ja', 'en'],
  MAX_SEARCH_RESULTS: 100,
  MAX_BATCH_SIZE: 10,
  ROLLBACK_TIMEOUT_MS: 300000 // 5 minutes
} as const;

// Export type utilities for convenience
export const KaitoAPITypeUtils = {
  isPostResult,
  isTweet,
  isExecutionResult,
  isKaitoClientConfig
} as const;