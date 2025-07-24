/**
 * 全システム共通の型定義
 * REQUIREMENTS.md準拠版 - 型定義統合ファイル
 * types/kaito-api-types.ts統合済み（重複排除版）
 */

// ============================================================================
// CLAUDE DECISION TYPES
// ============================================================================

export interface ClaudeDecision {
  action: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'wait';
  reasoning: string;
  parameters: {
    topic?: string;
    searchQuery?: string;
    content?: string;
    targetTweetId?: string;
    duration?: number;
    reason?: string;
    retry_action?: string;
  };
  confidence: number;
}

export type ClaudeActionType = 'post' | 'retweet' | 'quote_tweet' | 'like' | 'wait';

// ============================================================================
// TWITTER/X DATA TYPES
// ============================================================================

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

export interface TweetData {
  id: string;
  text: string;
  author: string;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
  };
  timestamp: string;
  isEngaging: boolean;
}

// ============================================================================
// EXECUTION RESULT TYPES
// ============================================================================

export interface ExecutionResult {
  success: boolean;
  action: string;
  executionTime: number;
  duration: number; // Added for compatibility
  result?: {
    id: string;
    url?: string;
    content?: string;
  };
  error?: string;
  metadata: {
    executionTime: number;
    retryCount: number;
    rateLimitHit: boolean;
    timestamp: string;
  };
}

export interface ActionResult {
  success: boolean;
  action: string;
  result?: any;
  error?: string;
  timestamp: string;
  executionTime: number;
}

// ============================================================================
// SYSTEM CONTEXT TYPES
// ============================================================================

export interface SystemContext {
  timestamp: string;
  account: {
    followerCount: number;
    lastPostTime?: string;
    postsToday: number;
    engagementRate: number;
    accountHealth: 'good' | 'warning' | 'critical';
  };
  system: {
    executionCount: {
      today: number;
      total: number;
    };
    health: {
      all_systems_operational: boolean;
      api_status: 'healthy' | 'degraded' | 'error';
      rate_limits_ok: boolean;
    };
  };
  market: {
    trendingTopics: string[];
    volatility: 'low' | 'medium' | 'high';
    sentiment: 'bearish' | 'neutral' | 'bullish';
  };
  learningData: {
    decisionPatterns: DecisionPattern[];
    successStrategies: SuccessStrategy[];
    errorLessons: ErrorLesson[];
  };
}

export interface AccountStatus {
  followers_count: number;
  following_count: number;
  posts_today: number;
  total_posts: number;
  engagement_rate: number;
  last_post_time: string;
  account_health: 'good' | 'warning' | 'critical';
  timestamp: string;
}

export interface SystemState {
  isRunning: boolean;
  lastExecution: string | null;
  errorCount: number;
  successCount: number;
}

// ============================================================================
// CONTENT TYPES
// ============================================================================

export interface PostContent {
  id: string;
  content: string;
  type: 'original_post' | 'retweet' | 'quote_tweet';
  metadata: {
    source: string;
    theme: string;
    category: string;
    relevanceScore: number;
    urgency: string;
    targetAudience: string[];
    estimatedEngagement: number;
  };
  quality: {
    overall: number;
    readability: number;
    relevance: number;
    engagement_potential: number;
    factual_accuracy: number;
    originality: number;
    timeliness: number;
  };
  timestamp: number;
}

export interface GeneratedContent {
  content: string;
  hashtags: string[];
  estimatedEngagement: number;
  quality: QualityMetrics;
  metadata: {
    wordCount: number;
    language: string;
    contentType: string;
    generatedAt: string;
  };
}

export interface QualityMetrics {
  overall: number;
  readability: number;
  relevance: number;
  engagement_potential: number;
  factual_accuracy: number;
  originality: number;
  timeliness: number;
  risk_assessment: number;
}

// ============================================================================
// API TYPES
// ============================================================================

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

export interface ApiConfig {
  baseUrl: string;
  authToken: string;
  timeout: number;
  rateLimits: {
    postsPerHour: number;
    retweetsPerHour: number;
    likesPerHour: number;
  };
}

// ============================================================================
// COLLECTION TYPES
// ============================================================================

export interface CollectionParams {
  topic?: string;
  maxResults?: number;
  timeRange?: string;
  language?: string;
}

export interface CollectedData {
  tweets: TweetData[];
  metrics: BasicMetrics;
  timestamp: string;
  source: string;
}

export interface BasicMetrics {
  totalTweets: number;
  engagementRate: number;
  sentimentScore: number;
  trendingScore: number;
  timestamp: string;
}

// ============================================================================
// PERFORMANCE TYPES
// ============================================================================

export interface PerformanceData {
  success: boolean;
  metrics: BasicMetrics;
  recommendations: string[];
  timestamp: string;
  analysisTime: number;
}

export interface EngagementPrediction {
  estimated_likes: number;
  estimated_retweets: number;
  estimated_replies: number;
  engagement_rate: number;
  best_posting_time: string;
  confidence: number;
}

// ============================================================================
// SEARCH TYPES
// ============================================================================

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

// ============================================================================
// LEARNING DATA TYPES
// ============================================================================

export interface DecisionPattern {
  id: string;
  context: Partial<SystemContext>;
  decision: ClaudeDecision;
  result: ExecutionResult;
  timestamp: string;
}

export interface SuccessStrategy {
  id: string;
  strategy: string;
  successRate: number;
  conditions: string[];
  examples: DecisionPattern[];
}

export interface ErrorLesson {
  id: string;
  error: string;
  context: string;
  lesson: string;
  prevention: string;
  timestamp: string;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export interface TwitterAction {
  type: 'post' | 'retweet' | 'quote_tweet' | 'like';
  content?: string;
  targetTweetId?: string;
  parameters?: any;
}

export interface TwitterActionResult {
  success: boolean;
  action: TwitterAction;
  result?: {
    id: string;
    url: string;
  };
  error?: string;
  timestamp: string;
}

// ============================================================================
// SCHEDULER TYPES
// ============================================================================

export interface SchedulerConfig {
  intervalMinutes: number;
  maxDailyExecutions: number;
  enableGracefulShutdown: boolean;
  timezone: string;
  executionWindow: {
    start: string;
    end: string;
  };
}

export interface ScheduleStatus {
  isRunning: boolean;
  currentInterval: number;
  nextExecution: string;
  lastExecution?: string;
  executionsToday: number;
  remainingToday: number;
  totalExecutions: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface BaseMetadata {
  source: string;
  timestamp: string;
  [key: string]: any;
}

export interface DataItem {
  content: string;
  timestamp: string;
  metadata?: BaseMetadata;
}

export interface ContentAnalysis {
  topic: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  engagement_potential: number;
  trending_score: number;
  recommendations: string[];
  timestamp: string;
}

export interface MarketIntelligence {
  trending_topics: string[];
  sentiment_overview: {
    positive: number;
    negative: number;
    neutral: number;
  };
  volume_metrics: {
    total_mentions: number;
    growth_rate: number;
  };
  timestamp: string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isClaudeDecision(obj: any): obj is ClaudeDecision {
  return obj && 
    typeof obj.action === 'string' && 
    typeof obj.reasoning === 'string' && 
    typeof obj.confidence === 'number' &&
    obj.parameters !== undefined;
}

export function isSystemContext(obj: any): obj is SystemContext {
  return obj && 
    obj.account && 
    obj.system && 
    obj.market &&
    typeof obj.timestamp === 'string';
}

export function isExecutionResult(obj: any): obj is ExecutionResult {
  return obj && 
    typeof obj.success === 'boolean' && 
    typeof obj.action === 'string' &&
    obj.metadata !== undefined;
}

export function isTweetData(obj: any): obj is TweetData {
  return obj && 
    typeof obj.id === 'string' && 
    typeof obj.text === 'string' &&
    obj.metrics !== undefined;
}

export function isCollectedData(obj: any): obj is CollectedData {
  return obj && 
    Array.isArray(obj.tweets) && 
    obj.metrics !== undefined &&
    typeof obj.timestamp === 'string';
}

// ============================================================================
// LEGACY COMPATIBILITY TYPES
// ============================================================================

export interface Post {
  id: string;
  text: string;
  created_at: string;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
    total: number;
  };
  performance_score: number;
}

export interface EngagementAnalysis {
  time_range: string;
  average_rate: number;
  peak_hours: string[];
  best_performing_posts: Post[];
  engagement_trends: {
    likes: number;
    retweets: number;
    replies: number;
  };
  recommendations: string[];
  timestamp: string;
}

export interface FollowerInfo {
  count: number;
  growth_rate_24h: number;
  growth_rate_7d: number;
  top_followers: Array<{
    username: string;
    follower_count: number;
    engagement_rate: number;
  }>;
  demographics: {
    active_hours: string[];
    interests: string[];
  };
  timestamp: string;
}

export interface CompetitorAnalysis {
  accounts: string[];
  comparison: { [account: string]: any };
  insights: string[];
  opportunities: string[];
  timestamp: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createCollectionResult(data: any): CollectedData {
  return {
    tweets: Array.isArray(data) ? data : [data],
    metrics: {
      totalTweets: Array.isArray(data) ? data.length : 1,
      engagementRate: 0,
      sentimentScore: 0,
      trendingScore: 0,
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString(),
    source: 'unknown'
  };
}

export function createExecutionResult(
  success: boolean, 
  action: string, 
  error?: string
): ExecutionResult {
  return {
    success,
    action,
    executionTime: 0,
    error,
    metadata: {
      executionTime: 0,
      retryCount: 0,
      rateLimitHit: false,
      timestamp: new Date().toISOString()
    }
  };
}

// ============================================================================
// KAITO API INTEGRATION TYPES - types/kaito-api-types.ts統合部分
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

export interface CostTrackingInfo {
  tweetsProcessed: number;
  estimatedCost: number; // USD
  resetDate: string;
  lastUpdated: string;
}

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

export interface QPSStatus {
  currentQPS: number;
  limit: number;
  resetTime: string;
  requestsInLastSecond: number;
}

export interface KaitoAPIIntegration {
  client: any; // KaitoTwitterAPIClient circular避け
  searchEngine: any; // SearchEngine circular避け  
  actionExecutor: any; // ActionExecutor circular避け
  isInitialized: boolean;
  lastHealthCheck: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  context: string;
}

// 型ガード統合
export function isPostResult(result: any): result is PostResult {
  return (
    typeof result === 'object' &&
    typeof result.id === 'string' &&
    typeof result.url === 'string' &&
    typeof result.timestamp === 'string' &&
    typeof result.success === 'boolean'
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

// ユーティリティ型
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

// 定数
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