/**
 * Consolidated Collection Types
 * 
 * This file consolidates all data collection-related type definitions:
 * - Base collection types (from collection-common.ts)
 * - Multi-source collection (from multi-source.ts)
 * - RSS collection (from rss-collection-types.ts)
 * - Adaptive collection (from adaptive-collection.d.ts)
 */

import type { ExecutionMetadata } from './system-types.js';

// ============================================================================
// BASE COLLECTION TYPES (from collection-common.ts)
// ============================================================================

export interface BaseMetadata extends Record<string, any> {
  source?: string;
  category?: string;
  tags?: string[];
}

export interface AutonomousMetadata extends BaseMetadata {
  confidence?: number;
  priority?: 'high' | 'medium' | 'low';
  reasoning?: string;
}

export interface ConvergenceMetadata extends BaseMetadata {
  importance?: number;
  reliability?: number;
  url?: string;
}

/**
 * Base collection result type - foundation for all collection results
 */
export interface BaseCollectionResult<T = any, M = BaseMetadata> {
  id: string;
  content: T;
  source: string;
  timestamp: number;
  metadata: M;
  status?: 'success' | 'failure' | 'timeout' | 'retry';
  errors?: string[];
}

// Specialized collection result types
export type SimpleCollectionResult = BaseCollectionResult<string, BaseMetadata>;
export type BatchCollectionResult = BaseCollectionResult<any[], ExecutionMetadata>;
// Renamed to avoid collision with system-types ExecutionResult
export type CollectionExecutionResult = BaseCollectionResult<any[], BaseMetadata>;

export interface MultiSourceCollectionResult extends BaseCollectionResult<string, BaseMetadata> {
  title: string;
  url?: string;
  provider: string;
  relevanceScore?: number;
  category?: string;
  tags?: string[];
}

export interface RSSCollectionResult extends BaseCollectionResult<any[], BaseMetadata> {
  sourceId: string;
  items: any[];
  processingTime: number;
  errorMessage?: string;
}

export type CollectionResult = BaseCollectionResult<any, BaseMetadata>;

export interface AutonomousCollectionResult extends BaseCollectionResult<string, AutonomousMetadata> {
  type: string;
  relevanceScore: number;
  metadata: AutonomousMetadata;
}

export interface ConvergenceCollectionResult extends BaseCollectionResult<string, ConvergenceMetadata> {
  category: 'market_trend' | 'economic_indicator' | 'expert_opinion' | 'breaking_news' | 'analysis';
  importance: number;
  reliability: number;
  url: string;
  metadata: ConvergenceMetadata;
}

// ============================================================================
// ADAPTIVE COLLECTION TYPES (from adaptive-collection.d.ts)
// ============================================================================

export interface TopicDecision {
  topic: string;
  theme: string;
  requiredDataTypes: DataSourceType[];
  minimalDataThreshold: number;
  optimalDataThreshold: number;
}

export type DataSourceType = 'market' | 'news' | 'community' | 'economic';

/**
 * Collection context for data collection operations
 */
export interface CollectionContext {
  action?: string;
  theme?: string;
  timestamp: number;
  requestId?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface CollectionProgress {
  topic: string;
  collectedSources: Map<DataSourceType, any[]>;
  sufficiencyScore: number;
  isMinimalThresholdMet: boolean;
  isOptimalThresholdMet: boolean;
}

export interface AdaptiveCollectionResult {
  topic: TopicDecision;
  collectedData: Map<DataSourceType, any[]>;
  totalItemsCollected: number;
  collectionDuration: number;
  sufficiencyScore: number;
  stoppedEarly: boolean;
  reason: 'optimal_threshold_met' | 'minimal_threshold_met' | 'timeout' | 'error';
}

// ============================================================================
// MULTI-SOURCE COLLECTION TYPES (from multi-source.ts)
// ============================================================================

export type SourceType = 'rss' | 'api' | 'community';
export type DataProvider = 
  | 'yahoo_finance'
  | 'reuters' 
  | 'bloomberg'
  | 'nikkei'
  | 'alpha_vantage'
  | 'iex_cloud'
  | 'coingecko'
  | 'fred'
  | 'reddit'
  | 'hackernews'
  | 'ft'
  | 'cnbc'
  | 'wsj'
  | 'investing';

export interface MultiSourceResult {
  source: SourceType;
  provider: string;
  data: BaseCollectionResult[];
  timestamp: number;
  metadata: {
    requestCount: number;
    rateLimitRemaining?: number;
    cacheUsed: boolean;
    responseTime?: number;
    errorCount?: number;
  };
  errors?: Error[];
}

export interface MultiSourceCollector {
  collectFromRSS(sources: string[]): Promise<MultiSourceResult>;
  collectFromAPIs(config: APIConfig): Promise<MultiSourceResult>;
  collectFromCommunity(platforms: string[]): Promise<MultiSourceResult>;
  executeMultiSourceCollection(): Promise<MultiSourceResult[]>;
}

// RSS Configuration
export interface RSSSource {
  id: string;
  name: string;
  url: string;
  provider: DataProvider;
  enabled: boolean;
  timeout?: number;
  maxItems?: number;
  categories?: string[];
  priority: number;
  successRate: number;
  errorCount: number;
}

export interface RSSConfig {
  sources: RSSSource[];
  timeout: number;
  maxConcurrency: number;
  cacheTimeout: number;
}

// API Configuration
export interface APISource {
  name: string;
  provider: DataProvider;
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  rateLimitPerMinute?: number;
  timeout?: number;
  endpoints: APIEndpoint[];
}

export interface APIEndpoint {
  name: string;
  path: string;
  method: 'GET' | 'POST';
  params?: Record<string, any>;
  headers?: Record<string, string>;
  rateLimit?: number;
}

export interface APIConfig {
  sources: APISource[];
  timeout: number;
  maxConcurrency: number;
  cacheTimeout: number;
  retryAttempts: number;
}

// Community Configuration
export interface CommunitySource {
  name: string;
  provider: DataProvider;
  enabled: boolean;
  subreddit?: string;
  category?: string;
  sortBy?: string;
  timeWindow?: string;
  maxPosts?: number;
  minScore?: number;
}

export interface CommunityConfig {
  sources: CommunitySource[];
  timeout: number;
  maxConcurrency: number;
  cacheTimeout: number;
  qualityFilters: QualityFilters;
}

export interface QualityFilters {
  minScore: number;
  minComments: number;
  maxAge: number; // hours
  bannedKeywords: string[];
  requiredKeywords?: string[];
}

// Cache Configuration
export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  source: SourceType;
  provider: string;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  maxEntries: number;
  cleanupInterval: number;
}

// Error Handling
export interface CollectionError {
  source: SourceType;
  provider: string;
  message: string;
  timestamp: number;
  url?: string;
  statusCode?: number;
  retryable: boolean;
}

// Performance Monitoring
export interface MultiSourcePerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  rateLimitHits: number;
  timestamp: number;
}

// Main Configuration
export interface MultiSourceConfig {
  rss: RSSConfig;
  api: APIConfig;
  community: CommunityConfig;
  cache: CacheConfig;
  performance: {
    enableMetrics: boolean;
    metricsInterval: number;
  };
}

// Renamed to avoid collision with decision-types and system-types CollectionStrategy
export interface BaseCollectionStrategy {
  name: string;
  sources: SourceType[];
  maxConcurrency: number;
  timeout: number;
  failureThreshold: number;
  fallbackSources?: SourceType[];
}

// ============================================================================
// RSS COLLECTION TYPES (from rss-collection-types.ts)
// ============================================================================

export interface RssSource {
  id: string;
  url: string;
  name: string;
  category: 'forex' | 'crypto' | 'finance' | 'news' | 'analysis';
  encoding?: string;
  format: 'rss' | 'atom' | 'json';
  refreshRate: number; // minutes
  priority: number; // 1-10
  active: boolean;
  lastUpdated?: Date;
  errorCount: number;
  successRate: number;
}

export interface FeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  publishedAt: Date;
  author?: string;
  category?: string[];
  sourceId: string;
  content?: string;
  rawData: any;
}

export interface CollectionMetadata {
  totalItems: number;
  newItems: number;
  duplicates: number;
  resourceUsage: ResourceSnapshot;
  qualityScore: number;
}

export interface ResourceSnapshot {
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  networkLatency: number; // ms
  concurrentConnections: number;
}

export interface ProcessingResult {
  sourceId: string;
  status: 'success' | 'failure' | 'timeout' | 'retry';
  items: FeedItem[];
  processingTime: number;
  resourceUsage: ResourceSnapshot;
  nextProcessingTime?: Date;
}

export interface MarketCondition {
  volatility: 'low' | 'medium' | 'high' | 'extreme';
  trendDirection: 'up' | 'down' | 'sideways';
  newsIntensity: 'low' | 'medium' | 'high' | 'breaking';
  sessionTime: 'tokyo' | 'london' | 'newyork' | 'overlap' | 'quiet';
  majorEventScheduled: boolean;
}

export interface DailyPlan {
  timestamp: string;
  actions: PlannedAction[];
  priorities: string[];
  highPriorityTopics: TopicPriority[];
  topics?: string[];
  marketFocus?: string[];
  executionStatus?: ExecutionStatus;
  date: Date;
  marketConditions: MarketCondition;
  priorityActions: PlanAction[];
  contingencyPlans: ContingencyPlan[];
  monitoringTargets: MonitoringTarget[];
  successMetrics: SuccessMetric[];
}

export interface TopicPriority {
  topic: string;
  priority: number;
  reason: string;
  targetAudience?: string;
}

export interface ExecutionStatus {
  completed: number;
  pending: number;
  failed: number;
  totalPlanned: number;
}

export interface PlannedAction {
  id: string;
  type: string;
  description: string;
  priority: number;
  estimatedDuration: number;
  dependencies?: string[];
}

export interface PlanAction {
  id: string;
  type: string;
  description: string;
  scheduledTime: Date;
  duration: number;
  priority: number;
  dependencies: string[];
}

export interface ContingencyPlan {
  trigger: string;
  actions: PlanAction[];
  priority: number;
  activationThreshold: any;
}

export interface MonitoringTarget {
  type: string;
  target: string;
  metrics: string[];
  alertThresholds: Record<string, number>;
  frequency: number;
}

export interface SuccessMetric {
  name: string;
  target: number;
  current?: number;
  unit: string;
  timeframe: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Type guard functions
 */
export function isBaseCollectionResult(obj: any): obj is BaseCollectionResult {
  return obj && 
    typeof obj.id === 'string' &&
    obj.content !== undefined &&
    typeof obj.source === 'string' &&
    typeof obj.timestamp === 'number' &&
    obj.metadata !== undefined;
}

export function isAutonomousCollectionResult(obj: any): obj is AutonomousCollectionResult {
  return isBaseCollectionResult(obj) &&
    typeof (obj as AutonomousCollectionResult).type === 'string' &&
    typeof (obj as AutonomousCollectionResult).relevanceScore === 'number';
}

export function isConvergenceCollectionResult(obj: any): obj is ConvergenceCollectionResult {
  return isBaseCollectionResult(obj) &&
    typeof (obj as ConvergenceCollectionResult).category === 'string' &&
    typeof (obj as ConvergenceCollectionResult).importance === 'number' &&
    typeof (obj as ConvergenceCollectionResult).reliability === 'number' &&
    typeof (obj as ConvergenceCollectionResult).url === 'string';
}

/**
 * Utility functions for creating collection results
 */
export function createCollectionResult<T, M extends BaseMetadata>(
  id: string,
  content: T,
  source: string,
  metadata: M
): BaseCollectionResult<T, M> {
  return {
    id,
    content,
    source,
    timestamp: Date.now(),
    metadata,
    status: 'success'
  };
}

export function createAutonomousResult(
  id: string,
  content: string,
  source: string,
  type: string,
  relevanceScore: number,
  metadata: Partial<AutonomousMetadata> = {}
): AutonomousCollectionResult {
  return {
    id,
    content,
    source,
    type,
    relevanceScore,
    timestamp: Date.now(),
    metadata: {
      ...metadata,
      source,
      category: type
    },
    status: 'success'
  };
}

export function createConvergenceResult(
  id: string,
  content: string,
  source: string,
  category: ConvergenceCollectionResult['category'],
  importance: number,
  reliability: number,
  url: string,
  metadata: Partial<ConvergenceMetadata> = {}
): ConvergenceCollectionResult {
  return {
    id,
    content,
    source,
    category,
    importance,
    reliability,
    url,
    timestamp: Date.now(),
    metadata: {
      ...metadata,
      source,
      category,
      url
    },
    status: 'success'
  };
}

// ============================================================================
// YAML CONFIGURATION TYPES FOR RSS COLLECTOR
// ============================================================================

export interface RssYamlSource {
  name: string;
  url?: string;        // 固定URLの場合
  query?: string;      // 動的検索クエリの場合
  priority: number;
  category: string;
  enabled: boolean;
}

export interface RssYamlSettings {
  sources: {
    financial_major: RssYamlSource[];
    educational: RssYamlSource[];
    [key: string]: RssYamlSource[];
  };
  collection_settings: {
    max_items_per_source: number;
    update_interval_minutes: number;
    timeout_seconds: number;
  };
}

// ============================================================================
// ADDITIONAL TYPES REQUIRED BY RSS COLLECTOR
// ============================================================================

// Emergency Information Types
export interface EmergencyInformation {
  id: string;
  type: 'market_crash' | 'system_failure' | 'data_anomaly' | 'security_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  message: string;
  timestamp: Date;
  marketImpact: 'minimal' | 'moderate' | 'significant' | 'severe';
  requiredActions: string[];
  classification: 'urgent' | 'standard' | 'monitoring';
  metadata?: Record<string, any>;
}

export interface EmergencyResponse {
  id: string;
  emergencyId: string;
  actions: any[];
  responseTime: number;
  status: 'completed' | 'executing' | 'failed';
  result: {
    error?: boolean;
    errorMessage?: string;
    totalResponseTime?: number;
    actionsExecuted?: number;
    success?: boolean;
    withinTimeLimit?: boolean;
  };
  timestamp: Date;
}

export interface MarketCrisis {
  id: string;
  type: 'currency_crash' | 'economic_shock' | 'political_instability' | 'natural_disaster';
  affectedMarkets: string[];
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  startTime: Date;
  estimatedDuration?: number;
  impactAssessment: {
    volatilityIncrease: number;
    liquidityReduction: number;
    tradingVolumeChange: number;
  };
  response: {
    immediateActions: string[];
    continuousMonitoring: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  };
}

export interface EmergencyTrigger {
  id: string;
  condition: string;
  threshold: number;
  currentValue: number;
  triggered: boolean;
  triggerTime?: Date;
  responseProtocol: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Content Analysis Types
export interface ContentAnalysis {
  id: string;
  feedItemId: string;
  fxRelevanceScore: number;
  sentimentScore: number;
  impactLevel: 'low' | 'medium' | 'high';
  keyTopics: string[];
  marketImplications: string[];
  tradingRecommendation?: 'buy' | 'sell' | 'hold' | 'watch';
  confidence: number;
  timestamp: Date;
  processingTime: number;
}

export interface MarketMovement {
  id: string;
  type: 'price_surge' | 'volume_spike' | 'volatility_increase' | 'news_impact' | 'sentiment_shift';
  severity: 'minor' | 'moderate' | 'significant' | 'major' | 'critical';
  affectedInstruments: string[];
  affectedPairs?: string[];
  magnitude: number;
  direction: 'up' | 'down' | 'neutral';
  confidence: number;
  detectedAt: Date;
  sourceItemId: string;
  triggerFactors: string[];
  predictedDuration?: number;
  responseTime?: number;
  recommendedActions?: string[];
}

// Source Analysis Types
export interface PrioritizedSource extends RSSSource {
  priorityScore: number;
  qualityScore: number;
  relevanceScore: number;
  reliabilityScore: number;
  lastAnalyzed: Date;
  reasoning: string;
  expectedItems: number;
  expectedValue: number;
  urgencyLevel: 'low' | 'medium' | 'high';
  source: RSSSource;
  processingOrder: number;
}

export interface InformationValue {
  sourceId: string;
  contentQuality: number;
  timeliness: number;
  uniqueness: number;
  marketRelevance: number;
  actionability: number;
  overallValue: number;
  lastEvaluated: Date;
  trendingTopics: string[];
}

// System Performance Types
export interface SystemLoad {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  activeConnections: number;
  queueLength: number;
  throughputPerSecond: number;
  errorRate: number;
  status: 'optimal' | 'moderate' | 'high' | 'critical';
}

export interface ConcurrencyConfig {
  maxParallelSources: number;
  maxItemsPerSource: number;
  timeoutMs: number;
  retryAttempts: number;
  backoffStrategy: 'linear' | 'exponential';
  rateLimitPerSecond: number;
  batchSize: number;
  queueMaxSize: number;
}