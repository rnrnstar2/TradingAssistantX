/**
 * Main Types Export Hub
 * 
 * This file exports all types from the optimized consolidated type files.
 * Maintains backward compatibility while providing access to the new organized structure.
 */

// ============================================================================
// PRIMARY EXPORTS (conflict-free)
// ============================================================================
export * from './collection-types';
export * from './system-types';

// ============================================================================  
// SELECTIVE RE-EXPORTS (conflict resolution)
// ============================================================================

// Decision types - selective exports to avoid conflicts
export type {
  DecisionQualityScore,
  DecisionCollectionStrategy,
  DecisionExecutionPlan,
  DecisionExecutionResult,
  Decision,
  CollectionMethod,
  SiteProfile,
  QuickProfile,
  CollectionMethodDecision,
  DecisionContext,
  DecisionStep,
  DecisionLog,
  ClaudeReasoning,
  ReasoningTrace,
  ReasoningStep,
  DecisionChain,
  DecisionBranch,
  BranchAnalysis,
  DecisionLoggingPerformanceMetrics,
  TrendAnalysis,
  OptimizationSuggestion,
  VisualFlow,
  FlowNode,
  FlowEdge,
  Dashboard,
  DashboardSection,
  VisualizationConfig,
  DashboardAlert,
  QualityReport as DecisionQualityReport,
  QualityTrend,
  ImprovementArea,
  OptimizationViz,
  PriorityMatrix,
  ImplementationStep,
  VisualizationData,
  LoggerSession,
  LoggerConfig
} from './decision-types';

// Integration types - selective exports to avoid conflicts  
export type {
  IntegrationQualityScore,
  BrowserTools,
  AnalysisTools,
  InstructionContext,
  GeneratedPost,
  BrowserSession,
  BrowserResourceUsage,
  BrowserConfig,
  NavigationOptions,
  SelectorOptions,
  ContentAnalysisRequest,
  AnalysisOptions,
  ContentAnalysisResult,
  InsightExtractionResult,
  ExtractedInsight,
  APIIntegrationConfig,
  APIRequest,
  APIResponse,
  RateLimitStatus,
  WebhookConfig,
  WebhookAuth,
  WebhookPayload,
  WebhookResult,
  NotificationChannel,
  NotificationChannelConfig,
  NotificationMessage,
  NotificationResult,
  LoggingConfig,
  LogDestination,
  LogDestinationConfig,
  LogEntry,
  MonitoringConfig,
  MonitoringMetric,
  MetricValue,
  AlertRule,
  Alert,
  IntegrationStatus,
  IntegrationHealth,
  IntegrationTest
} from './integration-types';

// Content types - selective exports to avoid conflicts
export type {
  QualityScore as ContentQualityScore,
  QualityMetrics,
  QualityAssessment,
  QualityStandards,
  ContentExecutionPlan,
  TimeRelevance,
  CoreInsight,
  InformationPattern,
  SynthesizedInsight,
  ConflictingData,
  ResolvedInsight,
  ConnectionInsight,
  MainPoint,
  SupportingDetail,
  PostStructure,
  NarrativeFlow,
  EnhancedContent,
  EngagingContent,
  EducationallyEnhanced,
  PracticallyEnhanced,
  UniqueContent,
  MarketContext,
  TimelyContent,
  ImportanceScoring,
  RankedInformation,
  SynergyAnalysis,
  InformationCluster,
  IntegratedInformation,
  IntegrationQuality,
  StorytellingTemplate,
  CompletedStory,
  NaturalLanguagePost,
  PostFormat,
  PostRequirements,
  AdaptedContent,
  EnhancedPost,
  FactCheckResult,
  ReadabilityScore,
  ValueMetrics,
  WeakArea,
  ImprovementSuggestion,
  ImprovedPost,
  ProcessedData,
  ResourceConstraints,
  ConstrainedExecution,
  PostingInstruction,
  AdaptedPost,
  UserReaction,
  LearningUpdate,
  PostHistory as ContentPostHistory,
  QualityImprovementPlan,
  ConvergedPost,
  PostCategory,
  AlternativePost,
  QualityBreakdown,
  QualityComparison,
  QualityReport as ContentQualityReport,
  ConvergencePerformanceMetrics,
  SystemHealth
} from './content-types';

// ============================================================================
// LEGACY TYPES (maintained for backward compatibility)
// ============================================================================

export interface ScrapedData {
  content: string;
  url: string;
  timestamp: number;
  source: string;
  metadata?: any;
}

export interface PostTemplate {
  id: string;
  content: string;
  hashtags: string[];
  category: string;
  type: string;
  format: string;
  maxLength: number;
}

export interface Config {
  targets: ScrapeTarget[];
  templates: PostTemplate[];
}

export interface ScrapeTarget {
  name: string;
  url: string;
  selector: string;
}

// PostHistory moved to content-types.ts - using legacy interface for backward compatibility  
export interface LegacyPostHistory {
  id: string;
  content: string;
  timestamp: number;
  success: boolean;
  error?: string;
  // エンゲージメントデータ
  likes?: number;
  retweets?: number;
  replies?: number;
  views?: number;
  impressions?: number;
  // 分析データ
  themes?: string[];
  qualityScore?: number;
  engagementRate?: number;
}

// Re-export as PostHistory for backward compatibility
export type PostHistory = LegacyPostHistory;

export interface PostingResult {
  success: boolean;
  id?: string;
  error?: string;
  timestamp: number;
  postId?: string;
}

export interface XClientConfig {
  apiKey: string;
  testMode: boolean;
  rateLimitDelay: number;
  maxRetries: number;
}

// 並列実行とデータ連携システムの型定義
export interface Task {
  id: string;
  name: string;
  type: 'collect' | 'analyze' | 'post' | 'strategy' | 'custom';
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[];
  config?: Record<string, any>;
  timeout?: number;
  maxRetries?: number;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: number;
  duration: number;
}

export interface ParallelTaskGroup {
  id: string;
  tasks: Task[];
  strategy: 'all' | 'race' | 'settled';
  timeout?: number;
}

export interface IntermediateResult {
  id: string;
  taskId: string;
  data: unknown;
  timestamp: number;
  expiresAt?: number;
}

export interface AsyncTaskStatus {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  startTime: number;
  endTime?: number;
  error?: string;
}

export interface DataCommunicationMessage {
  id: string;
  type: 'status' | 'result' | 'error' | 'progress';
  from: string;
  to?: string;
  data: unknown;
  timestamp: number;
}

export interface LongTask extends Task {
  subtasks?: Task[];
  checkpoints?: string[];
  estimatedDuration?: number;
}

// Xアカウント情報管理関連の型定義
export interface AccountInfo {
  username: string;
  user_id: string;
  display_name: string;
  verified: boolean;
}

export interface AccountMetrics {
  followers_count: number;
  following_count: number;
  tweet_count: number;
  listed_count: number;
  last_updated: number;
}

export interface UserResponse {
  data: {
    id: string;
    username: string;
    name: string;
    verified: boolean;
    public_metrics: {
      followers_count: number;
      following_count: number;
      tweet_count: number;
      listed_count: number;
    };
  };
}

// Performance Analysis Types
export interface PostMetrics {
  postId: string;
  content: string;
  timestamp: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  engagementRate: number;
}

export interface EngagementMetrics {
  tweetId?: string;
  likes?: number;
  retweets?: number;
  replies?: number;
  quotes?: number;
  impressions?: number;
  engagementRate?: number;
  timestamp?: string;
  // 旧形式との互換性
  averageEngagementRate?: number;
  bestPerformingPost?: PostMetrics;
  engagementTrend?: 'increasing' | 'stable' | 'decreasing';
  optimalPostingTimes?: string[];
}

export interface FollowerMetrics {
  currentCount: number;
  growthRate: number;
  growthTrend: 'increasing' | 'stable' | 'decreasing';
  engagementQuality: number;
}

export interface PerformanceAnalysisResult {
  accountMetrics: AccountMetrics;
  recentPosts: PostMetrics[];
  engagement: EngagementMetrics;
  followerMetrics: FollowerMetrics;
  analysisTimestamp: string;
  recommendations: string[];
}

// Tweet and Twitter API response types
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

export interface TweetsResponse {
  data?: Tweet[];
  includes?: {
    users?: any[];
  };
  meta?: {
    result_count?: number;
    next_token?: string;
  };
}

// ============================================================================
// TYPE RE-EXPORTS FOR CONVENIENCE
// ============================================================================

// ============================================================================
// CONVENIENCE RE-EXPORTS (most commonly used types)
// ============================================================================

// Collection types
export type {
  BaseCollectionResult,
  CollectionResult,
  AutonomousCollectionResult,
  MultiSourceResult,
  CollectionExecutionResult
} from './collection-types';

// System types  
export type {
  ActionType,
  ActionDecision,
  ActionResult,
  IntegratedContext,
  SystemDecision,
  SystemExecutionResult,
  ExecutionMetadata,
  DecisionPerformanceMetrics,
  ResourceUsage
} from './system-types';

// ============================================================================
// UTILITY TYPE EXPORTS
// ============================================================================

// Export type guards and utility functions from collection types
export {
  isBaseCollectionResult,
  isAutonomousCollectionResult,
  isConvergenceCollectionResult,
  createCollectionResult,
  createAutonomousResult,
  createConvergenceResult
} from './collection-types';

// Export type guards and utility functions from system types
export {
  isDecision,
  isExecutionData,
  isActionDecision
} from './system-types';

// Export type guards and utility functions from content types
export {
  calculateOverallQuality,
  getQualityGrade
} from './content-types';

// Export type guards and utility functions from integration types
export {
  isQualityScore,
  isAPIResponse
} from './integration-types';

// Export type guards and utility functions from decision types
export {
  isDecision as isDecisionLogging,
  isExecutionData as isExecutionDataLogging
} from './decision-types';