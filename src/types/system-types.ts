/**
 * Consolidated System Types
 * 
 * This file consolidates core system and action types:
 * - Action types (from action-types.ts)
 * - Autonomous system types (from autonomous-system.ts)
 * - Shared system interfaces
 */

import type { BaseCollectionResult, AutonomousCollectionResult } from './collection-types';

// ============================================================================
// CORE ACTION TYPES (from action-types.ts)
// ============================================================================

export type ActionType = 
  | 'original_post'
  | 'content_creation'
  | 'post_creation'
  | 'immediate_post'
  | 'urgent_post'
  | 'analysis'
  | 'performance_analysis'
  | 'reply'
  | 'retweet'
  | 'quote_tweet';

// Action classification types
export type ContentActionType = 'original_post' | 'content_creation' | 'post_creation';
export type UrgentActionType = 'immediate_post' | 'urgent_post';  
export type AnalysisActionType = 'analysis' | 'performance_analysis';

export interface ActionParams {
  originalContent: string;  // Required to fix undefined errors
  hashtags?: string[];
  contentType?: string;  // Investment content type
  
  // Quote tweet params
  quoteContent?: string;
  
  // Reply params
  replyContent?: string;
  
  // Common fields
  riskLevel?: string;
  timeOfDay?: number;
  dateGenerated?: string;
}

export interface ActionMetadata {
  category: string;
  tags: string[];
  enhancedWithSpecificCollection?: boolean;
  collectionSufficiency?: number;
  collectionQuality?: number;
  enhancementTimestamp?: number;
  [key: string]: any;
}

export interface ActionDecision {
  id: string;
  type: ActionType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  description: string;
  params: ActionParams;
  targetTweet?: Tweet;
  content?: string;
  estimatedDuration: number;
  timestamp?: string;
  metadata?: ActionMetadata;
}

export interface ActionResult {
  success: boolean;
  actionId: string;
  type: ActionType;
  timestamp: number;
  content?: string;
  error?: string;
}

export interface PostResult extends ActionResult {
  type: 'original_post';
  tweetId?: string;
  content?: string;
}

export interface ActionDistribution {
  remaining: number;
  optimal_distribution: {
    original_post: number;
    quote_tweet?: number;
    retweet?: number;
    reply?: number;
  };
  timing_recommendations: TimingRecommendation[];
}

export interface TimingRecommendation {
  time: string;
  actionType: ActionType;
  priority: number;
  reasoning: string;
}

export interface DailyActionLog {
  date: string;
  totalActions: number;
  actionBreakdown: {
    original_post: number;
  };
  executedActions: ActionResult[];
  targetReached: boolean;
}

// ============================================================================
// CORE SYSTEM TYPES (from autonomous-system.ts)
// ============================================================================

export interface ExecutionData {
  actionType: ActionType;
  content?: string;
  targetAudience?: string[];
  timing?: ExecutionTiming;
  metadata?: ExecutionMetadata;
  result?: SystemExecutionResult;
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

// Renamed to avoid collision with decision-types ExecutionResult
export interface SystemExecutionResult {
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

// Context and state types
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

// Re-export collection result types for convenience
export type CollectionResult = AutonomousCollectionResult;

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
  recent_trends?: TrendData[];
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
  qualityStandards: Record<string, number>; // Simplified to avoid import complexity
}

export interface ActionCollectionStrategy {
  priority: number;
  focusAreas: string[];
  collectMethods: CollectMethod[];
  sufficiencyTarget: number;
  topic: string;
  keywords: string[];
  expectedDuration: number;
  searchTerms: string[];
  sources: DataSource[];
  
  // Optional properties
  description?: string;
  category?: string;
  weight?: number;
  
  // Configuration properties
  apis?: ApiConfiguration[];
  community?: CommunityConfiguration[];
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

// QualityStandards moved to content-types.ts to avoid duplication
// More comprehensive version exists in content-types.ts

export interface DataSource {
  type: 'rss' | 'api' | 'scraping';
  url: string;
  weight: number;
}

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
  feedback: QualityFeedback;
}

export interface QualityFeedback {
  strengths: string[];
  improvements: string[];
  confidence: number;
}

export interface ActionSpecificResult {
  actionType: string;
  results: CollectionResult[];
  sufficiencyScore: number;
  executionTime: number;
  strategyUsed: ActionCollectionStrategy;
  qualityMetrics: QualityEvaluation;
}

export interface SufficiencyEvaluation {
  score: number;
  shouldContinue: boolean;
  reasoning: string;
  suggestedActions: string[];
}

// ActionSpecific integration types
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

// Decision types (moved from decision-types.ts to avoid circular dependency)
export interface DecisionMetadata {
  enhancedWithSpecificCollection?: boolean;
  collectionSufficiency?: number;
  collectionQuality?: number;
  enhancementTimestamp?: number;
  [key: string]: any;
}

// Renamed to avoid collision with decision-types Decision
export interface SystemDecision {
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

// Performance metrics (shared type)
export interface DecisionPerformanceMetrics {
  responseTime: number;
  successRate: number;
  dataQuality: number;
  resourceUsage: ResourceUsage;
  throughput: number;
}

export interface ResourceUsage {
  timeMs: number;
  memoryMb: number;
  cpuPercent: number;
  networkRequests: number;
}

// Error handling types
export interface SystemError {
  timestamp: string;
  error: string;
  stack?: string;
  context?: unknown;
  recoveryAttempted?: boolean;
}

// Twitter API types (from index.ts)
export interface Tweet {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
    impression_count?: number;
  };
  context_annotations?: any[];
}

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

export function isDecision(obj: unknown): obj is SystemDecision {
  return typeof obj === 'object' 
    && obj !== null
    && 'id' in obj 
    && 'type' in obj
    && 'priority' in obj;
}

export function isExecutionData(obj: unknown): obj is ExecutionData {
  return typeof obj === 'object'
    && obj !== null
    && 'actionType' in obj;
}

export function isActionDecision(obj: unknown): obj is ActionDecision {
  return typeof obj === 'object'
    && obj !== null
    && 'id' in obj
    && 'type' in obj
    && 'reasoning' in obj
    && 'params' in obj;
}