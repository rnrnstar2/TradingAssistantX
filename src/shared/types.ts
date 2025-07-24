/**
 * 全システム共通の型定義
 * REQUIREMENTS.md準拠版 - 型定義統合ファイル
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
    decisionPatterns: any[];
    successStrategies: any[];
    errorLessons: any[];
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
  timestamp: string;
  context: {
    followers: number;
    last_post_hours_ago: number;
    market_trend: string;
  };
  decision: {
    action: string;
    reasoning: string;
    confidence: number;
  };
  result: {
    engagement_rate: number;
    new_followers: number;
    success: boolean;
  };
}

export interface SuccessStrategy {
  high_engagement: {
    post_times: string[];
    topics: string[];
    hashtags: string[];
  };
  content_types: {
    [type: string]: {
      success_rate: number;
      avg_engagement: number;
    };
  };
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