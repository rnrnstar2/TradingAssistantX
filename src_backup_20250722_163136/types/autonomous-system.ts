import { ActionType } from './action-types';
import { DecisionPerformanceMetrics } from './decision-types';

// ExecutionData型定義
export interface ExecutionData {
  actionType: ActionType;
  content?: string;
  targetAudience?: string[];
  timing?: ExecutionTiming;
  metadata?: ExecutionMetadata;
  result?: ExecutionResult;
}

export interface ExecutionTiming {
  scheduledTime?: string;
  executedTime?: string;
  timeZone?: string;
}

export interface ExecutionMetadata {
  priority: number;
  tags: string[];
  category: string;
  estimatedDuration: number;
}

export interface ExecutionResult {
  success: boolean;
  message?: string;
  metrics?: DecisionPerformanceMetrics;
  errors?: ExecutionError[];
}

export interface ExecutionError {
  code: string;
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Core context and state types
export interface Context {
  timestamp: string;
  systemStatus: 'initializing' | 'running' | 'paused' | 'error';
  recentActions: ActionSummary[];
  pendingTasks: string[];
  metrics?: SystemMetrics;
}

export interface ActionSummary {
  id: string;
  type: string;
  status: 'success' | 'failed' | 'partial';
  timestamp: string;
  summary?: string;
}

export interface SystemMetrics {
  totalActions: number;
  successRate: number;
  averageExecutionTime: number;
  lastHealthCheck: string;
}

// Need and Decision types
export interface Need {
  id: string;
  type: 'content' | 'immediate' | 'maintenance' | 'optimization';
  priority: 'high' | 'medium' | 'low';
  description: string;
  context?: unknown;
  createdAt: string;
}


// Action and Task types
export interface Action {
  id: string;
  type: string;
  priority: string;
  params: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Task {
  id: string;
  actionId: string;
  type: string;
  priority: string;
  executor: () => Promise<any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// Result types
export interface Result {
  id: string;
  taskId: string;
  actionId: string;
  status: 'success' | 'failed' | 'partial';
  data?: unknown;
  error?: string;
  completedAt: string;
  metadata?: ResultMetadata;
}

export interface ResultMetadata {
  executionTime?: number;
  retryCount?: number;
  warnings?: string[];
}

// Communication types
export interface ClaudeCommunication {
  sessionId: string;
  startedAt: string;
  plannedTasks: TaskSummary[];
  messages?: Message[];
}

export interface TaskSummary {
  id: string;
  type: string;
  priority: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  type: 'info' | 'request' | 'response' | 'error';
  content: unknown;
  timestamp: string;
}

// Data sharing types
export interface SharedInsights {
  lastUpdated: string;
  insights: Insight[];
  patterns: Record<string, Pattern>;
  recommendations: Recommendation[];
}

export interface Insight {
  id: string;
  type: string;
  description: string;
  confidence: number;
  evidence?: unknown[];
  createdAt: string;
}

export interface Pattern {
  type: string;
  frequency: number;
  lastSeen: string;
  examples: unknown[];
}

export interface Recommendation {
  id: string;
  action: string;
  reasoning: string;
  priority: string;
  expectedImpact?: string;
}

// Information Collection types
export interface CollectionTarget {
  type: 'rss' | 'api' | 'scraping';
  url: string;
  weight: number;
}

// Import collection types from common module
import type { AutonomousCollectionResult } from './collection-common';
// Re-export for backward compatibility
export { AutonomousCollectionResult as CollectionResult } from './collection-common';
// Create type alias for internal use
type CollectionResult = AutonomousCollectionResult;

export interface EvaluatedInfo {
  id: string;
  originalResult: CollectionResult;
  relevanceScore: number;
  contentValue: number;
  actionableInsights: string[];
  recommendedUsage: 'original_post' | 'quote_tweet' | 'retweet' | 'ignore';
  confidence: number;
}

export interface ContentOpportunity {
  type: 'original_post' | 'quote_tweet' | 'retweet' | 'reply';
  content?: string;
  targetTweetId?: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  estimatedEngagement: number;
}

// Account Analysis types
export interface AccountStatus {
  timestamp: string;
  followers: {
    current: number;
    change_24h: number;
    growth_rate: string;
  };
  engagement: {
    avg_likes: number;
    avg_retweets: number;
    engagement_rate: string;
  };
  performance: {
    posts_today: number;
    target_progress: string;
    best_posting_time: string;
  };
  health: {
    status: 'healthy' | 'warning' | 'critical';
    api_limits: 'normal' | 'approaching' | 'limited';
    quality_score: number;
  };
  recommendations: string[];
  healthScore: number;
  recent_trends?: TrendData[];  // オプショナルプロパティ追加
}

interface TrendData {
  keyword: string;
  count: number;
  timestamp: string;
}

// Integrated Context types
export interface IntegratedContext {
  account: {
    currentState: AccountStatus;
    recommendations: string[];
    healthScore: number;
  };
  market: {
    trends: CollectionResult[];
    opportunities: ContentOpportunity[];
    competitorActivity: CollectionResult[];
  };
  actionSuggestions: ActionSuggestion[];
  timestamp: number;
}

export interface ActionSuggestion {
  type: 'original_post' | 'quote_tweet' | 'retweet' | 'reply';
  content?: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  expectedImpact: number;
  metadata?: Record<string, any>;
}

// Configuration types
export interface AutonomousConfig {
  autonomous_system: {
    max_parallel_tasks: number;
    context_sharing_enabled: boolean;
    decision_persistence: boolean;
  };
  claude_integration: {
    sdk_enabled: boolean;
    max_context_size: number;
  };
  data_management: {
    cleanup_interval: number;
    max_history_entries: number;
  };
}

// Action-specific collection types
export interface ActionCollectionConfig {
  strategies: {
    original_post: ActionCollectionStrategy;
    quote_tweet: ActionCollectionStrategy;
    retweet: ActionCollectionStrategy;
    reply: ActionCollectionStrategy;
  };
  sufficiencyThresholds: Record<string, number>;
  maxExecutionTime: number;
  qualityStandards: QualityStandards;
}

export interface ActionCollectionStrategy {
  priority: number;
  focusAreas: string[];
  sources: LegacySourceConfig[];
  collectMethods: CollectMethod[];
  sufficiencyTarget: number;
}

export interface LegacySourceConfig {
  name: string;
  url: string;
  priority: 'high' | 'medium' | 'low';
  searchPatterns?: string[];
  filters?: string[];
}

export interface CollectMethod {
  type: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface QualityStandards {
  relevanceScore: number;
  credibilityScore: number;
  uniquenessScore: number;
  timelinessScore: number;
}

export interface ActionSpecificResult {
  actionType: string;
  results: CollectionResult[];
  sufficiencyScore: number;
  executionTime: number;
  strategyUsed: CollectionStrategy;
  qualityMetrics: QualityEvaluation;
}

export interface SufficiencyEvaluation {
  score: number;
  shouldContinue: boolean;
  reasoning: string;
  suggestedActions: string[];
}

export interface CollectionStrategy {
  actionType: string;
  targets: CollectionTarget[];
  priority: number;              // 必須プロパティ追加
  expectedDuration: number;      // 必須プロパティ追加  
  searchTerms: string[];         // 必須プロパティ追加
  sources: DataSource[];         // 必須プロパティ追加
  
  // 🚨 緊急追加必須プロパティ
  topic: string;                 // 必須追加
  keywords: string[];            // 必須追加
  
  // オプションプロパティ
  description?: string;
  category?: string;
  weight?: number;
  
  // 設定オブジェクト用プロパティ
  apis?: ApiConfiguration[];     // 設定用
  community?: CommunityConfiguration[]; // 設定用
}

export interface DataSource {
  type: 'rss' | 'api' | 'scraping';
  url: string;
  weight: number;
}

// 新規支援型定義
export interface ApiConfiguration {
  name: string;
  endpoint: string;
  apiKey?: string;
  rateLimit: number;
  timeout: number;
}

export interface CommunityConfiguration {
  platform: string;
  channels: string[];
  priority: number;
  collectTypes: string[];
}

export interface QualityEvaluation {
  relevanceScore: number;
  credibilityScore: number;
  uniquenessScore: number;
  timelinessScore: number;
  overallScore: number;
  feedback: QualityFeedback;     // 必須プロパティ追加
}

export interface QualityFeedback {
  strengths: string[];
  improvements: string[];
  confidence: number;
}

// ActionSpecific統合関連の型定義
export interface ActionSpecificPreloadResult {
  original_post?: ActionSpecificResult;
  quote_tweet?: ActionSpecificResult;
  retweet?: ActionSpecificResult;
  reply?: ActionSpecificResult;
  executionTime: number;
  status: 'success' | 'partial' | 'fallback';
  error?: string;
}

export interface ParallelAnalysisResult {
  account: AccountStatus;
  information: ActionSpecificPreloadResult;
  timestamp: number;
}

// Decision型の拡張（メタデータフィールド追加）
export interface DecisionMetadata {
  enhancedWithSpecificCollection?: boolean;
  collectionSufficiency?: number;
  collectionQuality?: number;
  enhancementTimestamp?: number;
  [key: string]: any;
}

// 拡張されたDecision型（既存のDecision型を上書き）
export interface Decision {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning?: string;
  params?: Record<string, any>;
  dependencies?: string[];
  estimatedDuration?: number;
  action?: ActionSuggestion;
  expectedImpact?: string;
  metadata?: DecisionMetadata;
}

// Multi-Source Integration types
export interface MultiSourceResult {
  source: 'rss' | 'api' | 'community' | 'twitter';
  provider: string;
  data: CollectionResult[];
  timestamp: number;
  metadata: {
    requestCount: number;
    rateLimitRemaining?: number;
    cacheUsed: boolean;
    quality?: SourceQualityMetrics;
  };
}

export interface SourceQualityMetrics {
  reliability: number; // 0-1
  freshness: number;   // 0-1
  relevance: number;   // 0-1
  confidence: number;  // 0-1
}

export interface SourceConfig {
  name: string;
  url: string;
  type: 'rss' | 'api' | 'community';
  priority: 'high' | 'medium' | 'low';
  searchPatterns?: string[];
  filters?: string[];
  config?: Record<string, any>;
}

export interface RSSSources {
  type: 'rss';
  sources: {
    name: string;
    url: string;
    priority: 'high' | 'medium' | 'low';
    refreshInterval?: number;
    filters?: string[];
  }[];
}

export interface APISources {
  type: 'api';
  sources: {
    name: string;
    provider: 'alpha_vantage' | 'iex_cloud' | 'coingecko' | 'fred';
    apiKey?: string;
    endpoint: string;
    rateLimit?: {
      requests: number;
      period: number; // seconds
    };
    priority: 'high' | 'medium' | 'low';
  }[];
}

export interface CommunitySources {
  type: 'community';
  sources: {
    name: string;
    platform: 'reddit' | 'hackernews' | 'discord';
    endpoint: string;
    subreddits?: string[]; // For Reddit
    keywords?: string[];
    priority: 'high' | 'medium' | 'low';
  }[];
}

// Extended ActionCollectionConfig for multi-source support
export interface ExtendedActionCollectionConfig extends ActionCollectionConfig {
  multiSources: {
    rss: RSSSources;
    apis: APISources;
    community: CommunitySources;
  };
  sourceSelection: {
    [actionType: string]: {
      preferred: ('rss' | 'api' | 'community' | 'twitter')[];
      fallback: ('rss' | 'api' | 'community' | 'twitter')[];
      priority: 'quality' | 'speed' | 'diversity';
    };
  };
  qualityWeights: {
    [sourceType: string]: {
      weight: number;
      baseline: number;
    };
  };
}

// MultiSourceCollector interface
export interface MultiSourceCollector {
  collectFromRSS(config: RSSSources): Promise<MultiSourceResult>;
  collectFromAPIs(config: APISources): Promise<MultiSourceResult>;
  collectFromCommunity(config: CommunitySources): Promise<MultiSourceResult>;
  executeMultiSourceCollection(): Promise<MultiSourceResult[]>;
}

// Cross-source quality evaluation
export interface CrossSourceQualityEvaluation extends QualityEvaluation {
  sourceDistribution: Record<string, number>;
  crossSourceConsistency: number;
  diversityScore: number;
  sourceReliabilityAverage: number;
  qualityBySource: Record<string, SourceQualityMetrics>;
}

// Error handling types
export interface SystemError {
  timestamp: string;
  error: string;
  stack?: string;
  context?: unknown;
  recoveryAttempted?: boolean;
}