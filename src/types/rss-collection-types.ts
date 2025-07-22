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

export interface CollectionResult {
  sourceId: string;
  items: FeedItem[];
  status: 'success' | 'failure' | 'timeout' | 'retry';
  processingTime: number;
  timestamp: Date;
  errorMessage?: string;
  metadata: CollectionMetadata;
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

export interface PriorityWeight {
  relevanceScore: number;
  timeliness: number;
  sourceReliability: number;
  contentQuality: number;
  marketImpact: number;
}

export interface PrioritizedSource {
  source: RssSource;
  priority: number;
  reasoning: string;
  expectedValue: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  processingOrder: number;
}

export interface PriorityAdjustment {
  sourceId: string;
  oldPriority: number;
  newPriority: number;
  reason: string;
  adjustmentFactor: number;
  validUntil: Date;
}

export interface RSSRSSPerformanceMetrics {
  averageResponseTime: number;
  successRate: number;
  contentQualityScore: number;
  relevanceScore: number;
  lastUpdateTime: Date;
  errorHistory: Error[];
}

export interface MarketCondition {
  volatility: 'low' | 'medium' | 'high' | 'extreme';
  trendDirection: 'up' | 'down' | 'sideways';
  newsIntensity: 'low' | 'medium' | 'high' | 'breaking';
  sessionTime: 'tokyo' | 'london' | 'newyork' | 'overlap' | 'quiet';
  majorEventScheduled: boolean;
}

export interface EmergencyPriorityConfig {
  emergencySources: string[];
  normalSources: string[];
  emergencyRefreshRate: number; // seconds
  emergencyTimeout: number; // seconds
  alertThreshold: number;
}

export interface InformationValue {
  score: number; // 0-100
  factors: {
    timeliness: number;
    relevance: number;
    uniqueness: number;
    actionability: number;
    credibility: number;
  };
  explanation: string;
}

export interface LearningResult {
  adjustedSources: PriorityAdjustment[];
  newPatterns: Pattern[];
  improvementSuggestions: string[];
  confidenceLevel: number;
}

export interface Pattern {
  type: string;
  description: string;
  frequency: number;
  reliability: number;
  applicableConditions: string[];
}

export interface MarketMovement {
  type: 'price_surge' | 'volume_spike' | 'news_impact' | 'sentiment_shift';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  affectedPairs: string[];
  detectedAt: Date;
  responseTime: number;
  recommendedActions: Action[];
}

export interface Action {
  type: string;
  description: string;
  priority: number;
  executionTime: number; // seconds
  parameters: Record<string, any>;
}

export interface EmergencyClassification {
  isEmergency: boolean;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  confidence: number;
  triggers: string[];
  estimatedImpact: number;
}

export interface EmergencyInformation {
  id: string;
  content: string;
  classification: EmergencyClassification;
  sourceId: string;
  detectedAt: Date;
  actionRequired: boolean;
  relatedPairs: string[];
}

export interface ResponseAction {
  id: string;
  type: string;
  description: string;
  executionTime: number;
  parameters: Record<string, any>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
}

export interface Detection {
  type: string;
  confidence: number;
  timestamp: Date;
  sourceId: string;
  content: string;
  metadata: Record<string, any>;
}

export interface Alert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  sourceId?: string;
  actionRequired: boolean;
  acknowledged: boolean;
}

export interface TrendChange {
  type: string;
  direction: 'up' | 'down' | 'reversal';
  confidence: number;
  affectedPairs: string[];
  timeframe: string;
  significance: number;
}

export interface HistoricalData {
  timeframe: string;
  data: DataPoint[];
  metadata: Record<string, any>;
}

export interface DataPoint {
  timestamp: Date;
  value: number;
  volume?: number;
  metadata?: Record<string, any>;
}

export interface ContentAnalysis {
  feedItem: FeedItem;
  fxRelevanceScore: number;
  sentimentScore: number;
  urgencyLevel: number;
  investmentImplication: InvestmentImplication;
  keyInsights: string[];
  confidenceLevel: number;
}

export interface InvestmentImplication {
  direction: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  timeframe: 'short' | 'medium' | 'long';
  affectedInstruments: string[];
  reasoning: string;
}

export interface RelevanceScore {
  score: number; // 0-100
  factors: {
    keywordMatch: number;
    contextualRelevance: number;
    sourceCredibility: number;
    timeliness: number;
  };
  explanation: string;
}

export interface InvestmentValue {
  score: number; // 0-100
  actionability: number;
  impactPotential: number;
  confidenceLevel: number;
  recommendedAction: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface DeduplicationResult {
  originalCount: number;
  duplicatesRemoved: number;
  uniqueItems: FeedItem[];
  duplicateGroups: DuplicateGroup[];
}

export interface DuplicateGroup {
  representative: FeedItem;
  duplicates: FeedItem[];
  similarity: number;
}

export interface QualityFilterResult {
  originalCount: number;
  filteredCount: number;
  highQualityItems: FeedItem[];
  rejectedItems: RejectedItem[];
}

export interface RejectedItem {
  item: FeedItem;
  reason: string;
  qualityScore: number;
}

export interface SystemLoad {
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  activeConnections: number;
  queueSize: number;
}

export interface ConcurrencyConfig {
  maxConcurrency: number;
  adaptiveMode: boolean;
  loadThresholds: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface RetryResult {
  sourceId: string;
  attempts: number;
  success: boolean;
  finalError?: string;
  recoveryTime: number;
}

export interface LoadDistribution {
  batches: SourceBatch[];
  estimatedTotalTime: number;
  resourceAllocation: ResourceAllocation;
}

export interface SourceBatch {
  sources: RssSource[];
  priority: number;
  estimatedTime: number;
  resourceRequirement: number;
}

export interface ResourceAllocation {
  cpuAllocation: number;
  memoryAllocation: number;
  networkConnections: number;
  timeoutSettings: TimeoutSettings;
}

export interface TimeoutSettings {
  connection: number;
  response: number;
  total: number;
}

export interface ResourceOptimization {
  recommendations: OptimizationRecommendation[];
  expectedImprovement: number;
  implementationPriority: number;
}

export interface OptimizationRecommendation {
  type: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  parameters: Record<string, any>;
}

export interface BatchConfig {
  sources: RssSource[];
  maxConcurrency: number;
  timeout: number;
  retryAttempts: number;
  priority: 'low' | 'medium' | 'high';
}

export interface BatchResult {
  totalSources: number;
  successful: number;
  failed: number;
  results: CollectionResult[];
  totalTime: number;
  averageTime: number;
  resourceUsage: ResourceSnapshot;
}

export interface MonitoringSession {
  id: string;
  startTime: Date;
  isActive: boolean;
  sources: RssSource[];
  collectionsCount: number;
  emergencyDetections: number;
  averageResponseTime: number;
  status: 'running' | 'paused' | 'stopped';
}

export interface OptimizationResult {
  before: PerformanceSnapshot;
  after: PerformanceSnapshot;
  improvements: Record<string, number>;
  implementedOptimizations: string[];
  recommendations: string[];
}

export interface PerformanceSnapshot {
  timestamp: Date;
  averageResponseTime: number;
  successRate: number;
  throughput: number;
  resourceEfficiency: number;
  qualityScore: number;
}

export interface EmergencyResponse {
  id: string;
  emergencyId: string;
  actions: ResponseAction[];
  responseTime: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result: any;
  timestamp: Date;
}

export interface MarketCrisis {
  id: string;
  type: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  affectedMarkets: string[];
  detectedAt: Date;
  description: string;
  indicators: CrisisIndicator[];
}

export interface CrisisIndicator {
  type: string;
  value: number;
  threshold: number;
  significance: number;
  timestamp: Date;
}

export interface CrisisResponse {
  crisisId: string;
  actions: ResponseAction[];
  coordinatedResponse: boolean;
  escalationLevel: number;
  timestamp: Date;
}

export interface EmergencyTrigger {
  id: string;
  type: string;
  condition: string;
  threshold: any;
  action: string;
  priority: number;
  active: boolean;
}

export interface ActionResult {
  triggerId: string;
  success: boolean;
  executionTime: number;
  result: any;
  error?: string;
  timestamp: Date;
}

export interface NotificationResult {
  channels: string[];
  successful: string[];
  failed: string[];
  timestamp: Date;
  message: string;
}

export interface ResponseAnalysis {
  responseId: string;
  effectiveness: number;
  timeliness: number;
  accuracy: number;
  improvements: string[];
  lessonsLearned: string[];
  nextActionRecommendations: string[];
}

export interface IndicatorConfig {
  type: string;
  source: string;
  threshold: number;
  weight: number;
  active: boolean;
}

export interface AlertThresholds {
  emergency: number;
  high: number;
  medium: number;
  low: number;
}

export interface AlertSystem {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'webhook' | 'slack' | 'teams';
  config: Record<string, any>;
  active: boolean;
  priority: number;
}

export interface ResponseProtocol {
  id: string;
  emergencyType: string;
  steps: ProtocolStep[];
  timeout: number;
  escalationRules: EscalationRule[];
}

export interface ProtocolStep {
  order: number;
  action: string;
  description: string;
  timeout: number;
  required: boolean;
  parameters: Record<string, any>;
}

export interface EscalationRule {
  condition: string;
  action: string;
  delay: number;
  parameters: Record<string, any>;
}

export interface EmergencyType {
  id: string;
  name: string;
  description: string;
  severityLevels: string[];
  defaultProtocol: string;
  autoTriggers: string[];
}

export interface ContentClassifier {
  classify(content: string): Promise<ContentClassification>;
}

export interface ContentClassification {
  category: string;
  subcategory?: string;
  confidence: number;
  tags: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[];
}

export interface SentimentAnalyzer {
  analyze(content: string): Promise<SentimentAnalysis>;
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  magnitude: number; // 0 to 1
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: EmotionScore[];
}

export interface EmotionScore {
  emotion: string;
  intensity: number;
}

export interface RelevanceScorer {
  score(content: string, context: ScoringContext): Promise<RelevanceScore>;
}

export interface ScoringContext {
  keywords: string[];
  categories: string[];
  timeframe: string;
  marketConditions: MarketCondition;
}

export interface FeedConnection {
  sourceId: string;
  url: string;
  status: 'connecting' | 'connected' | 'failed' | 'timeout';
  startTime: Date;
  responseTime?: number;
  bytesReceived?: number;
  lastActivity?: Date;
}

export interface FeedTask {
  id: string;
  sourceId: string;
  priority: number;
  estimatedTime: number;
  retryCount: number;
  maxRetries: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
}

export interface ClaudeSourceAnalyzer {
  analyzeSources(sources: RssSource[]): Promise<SourceAnalysis[]>;
}

export interface SourceAnalysis {
  sourceId: string;
  qualityScore: number;
  relevanceScore: number;
  reliabilityScore: number;
  recommendedPriority: number;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
}

export interface PrioritizedResult {
  source: RssSource;
  result: CollectionResult;
  priorityScore: number;
  processingOrder: number;
  valueRealized: number;
}

export interface EmergencyResult {
  emergency: EmergencyInformation;
  response: EmergencyResponse;
  impact: ImpactAssessment;
  followUpRequired: boolean;
}

export interface ImpactAssessment {
  marketImpact: number;
  tradingOpportunities: TradingOpportunity[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timeframe: string;
  affectedSectors: string[];
}

export interface TradingOpportunity {
  instrument: string;
  direction: 'buy' | 'sell';
  confidence: number;
  timeframe: string;
  expectedMove: number;
  riskReward: number;
}

export interface CollectionContext {
  maxSources?: number;
  timeout?: number;
  priority?: 'low' | 'medium' | 'high' | 'emergency';
  filters?: ContentFilter[];
  emergencyMode?: boolean;
}

export interface ContentFilter {
  type: 'keyword' | 'category' | 'sentiment' | 'quality';
  criteria: any;
  inclusive: boolean;
}

export interface InformationResult {
  sources: CollectionResult[];
  summary: CollectionSummary;
  emergencies: EmergencyResult[];
  recommendations: ActionRecommendation[];
  nextCollectionTime: Date;
}

export interface CollectionSummary {
  totalItems: number;
  highValueItems: number;
  emergencyItems: number;
  averageQuality: number;
  processingTime: number;
  successRate: number;
}

export interface ActionRecommendation {
  type: string;
  description: string;
  priority: number;
  timeframe: string;
  confidence: number;
  basis: string[];
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