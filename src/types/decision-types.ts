export enum CollectionMethod {
  SIMPLE_HTTP = 'http',
  PLAYWRIGHT_STEALTH = 'stealth',
  API_PREFERRED = 'api',
  HYBRID = 'hybrid'
}

export interface SiteProfile {
  requiresJavaScript: boolean;
  hasAntiBot: boolean;
  loadSpeed: 'fast' | 'medium' | 'slow';
  contentStructure: 'simple' | 'complex' | 'dynamic';
  updateFrequency: 'high' | 'medium' | 'low';
  contentQuality: number;
  relevanceScore: number;
  bestCollectionTime: TimeWindow;
  optimalMethod: CollectionMethod;
  averageResponseTime: number;
}

export interface TimeWindow {
  start: number;
  end: number;
}

export interface QuickProfile {
  isAccessible: boolean;
  responseTime: number;
  hasJavaScript: boolean;
  probableMethod: CollectionMethod;
}

export interface CollectionMethodDecision {
  primaryMethod: CollectionMethod;
  fallbackMethods: CollectionMethod[];
  estimatedCost: ResourceCost;
  expectedQuality: QualityScore;
  confidenceLevel: number;
}

export interface ResourceCost {
  timeMs: number;
  memoryMb: number;
  cpuUnits: number;
}

export interface QualityScore {
  accuracy: number;
  completeness: number;
  timeliness: number;
  overall: number;
}

export interface CollectionContext {
  availableTime: number;
  memoryLimit: number;
  qualityRequirement: number;
  urgencyLevel: 'low' | 'medium' | 'high';
  targetSites: string[];
}

export interface CollectionStrategy {
  sites: SiteMethodPair[];
  executionPlan: ExecutionPlan;
  expectedOutcome: PredictedOutcome;
  resourceBudget: ResourceBudget;
}

export interface SiteMethodPair {
  siteUrl: string;
  method: CollectionMethod;
  priority: number;
  timeAllocation: number;
}

export interface ExecutionPlan {
  parallelTasks: CollectionTask[];
  sequentialTasks: CollectionTask[];
  criticalPath: string[];
  totalEstimatedTime: number;
}

export interface CollectionTask {
  id: string;
  siteUrl: string;
  method: CollectionMethod;
  priority: number;
  estimatedTime: number;
  dependencies: string[];
}

export interface PredictedOutcome {
  expectedQuality: number;
  confidenceLevel: number;
  estimatedDataPoints: number;
  riskFactors: string[];
}

export interface ResourceBudget {
  timeMs: number;
  memoryMb: number;
  concurrentRequests: number;
}

export interface TimeBudget {
  totalTime: number;
  taskAllocations: Map<string, number>;
  bufferTime: number;
  criticalPath: string[];
}

export interface ExecutionConstraints {
  maxTotalTime: number;
  maxMemoryUsage: number;
  maxConcurrentRequests: number;
  qualityThreshold: number;
}

export interface OptimizationPlan {
  taskPriorities: Map<string, number>;
  resourceAllocation: ResourceAllocation;
  qualityTargets: QualityTargets;
  fallbackStrategies: FallbackStrategy[];
}

export interface ResourceAllocation {
  timeDistribution: Map<string, number>;
  memoryDistribution: Map<string, number>;
  concurrencyLimits: Map<string, number>;
}

export interface QualityTargets {
  minimum: number;
  target: number;
  maximum: number;
}

export interface FallbackStrategy {
  trigger: string;
  action: string;
  alternativeMethod: CollectionMethod;
  resourceAdjustment: ResourceCost;
}

export interface CollectionExecution {
  id: string;
  strategy: CollectionStrategy;
  status: 'running' | 'paused' | 'completed' | 'failed';
  progress: ExecutionProgress;
  currentTasks: CollectionTask[];
  startTime: number;
}

export interface ExecutionProgress {
  completedTasks: number;
  totalTasks: number;
  dataCollected: number;
  timeElapsed: number;
  resourcesUsed: ResourceUsage;
}

export interface ResourceUsage {
  timeMs: number;
  memoryMb: number;
  cpuPercent: number;
  networkRequests: number;
}

export interface AdjustmentDecision {
  action: 'continue' | 'adjust' | 'abort';
  adjustments: ExecutionAdjustment[];
  reasoning: string[];
}

export interface ExecutionAdjustment {
  type: 'priority' | 'method' | 'resource' | 'timeout';
  targetTask: string;
  newValue: any;
  impact: string;
}

export interface CollectionCandidate {
  siteUrl: string;
  method: CollectionMethod;
  estimatedValue: number;
  estimatedCost: ResourceCost;
  confidenceLevel: number;
}

export interface OptimalPlan {
  selectedCandidates: CollectionCandidate[];
  totalValue: number;
  totalCost: ResourceCost;
  riskLevel: number;
  alternativePlans: OptimalPlan[];
}

export interface CollectionResult {
  executionId: string;
  success: boolean;
  dataCollected: any[];
  qualityAchieved: number;
  resourcesUsed: ResourceUsage;
  timeElapsed: number;
  errors: string[];
}

export interface LearningInsight {
  siteSpecificOptimizations: SiteOptimization[];
  methodEffectivenessUpdate: MethodEffectiveness;
  resourceAllocationImprovement: AllocationImprovement;
}

export interface SiteOptimization {
  siteUrl: string;
  recommendedMethod: CollectionMethod;
  optimalTiming: TimeWindow;
  qualityFactors: string[];
}

export interface MethodEffectiveness {
  method: CollectionMethod;
  successRate: number;
  averageQuality: number;
  averageTime: number;
  recommendedUsage: string[];
}

export interface AllocationImprovement {
  optimalTimeDistribution: Map<string, number>;
  efficientConcurrency: number;
  qualityThresholds: Map<string, number>;
}

export interface ExecutionState {
  currentTasks: CollectionTask[];
  completedTasks: CollectionTask[];
  failedTasks: CollectionTask[];
  resourcesUsed: ResourceUsage;
  timeRemaining: number;
  qualityAchieved: number;
}

export interface PriorityPlan {
  highPriority: CollectionTask[];
  mediumPriority: CollectionTask[];
  lowPriority: CollectionTask[];
  executionOrder: string[];
}

export interface StrategyAdjustment {
  adjustmentType: 'method' | 'priority' | 'resource' | 'timing';
  affectedTasks: string[];
  newStrategy: Partial<CollectionStrategy>;
  expectedImprovement: number;
}

export interface ReallocationPlan {
  taskReassignments: Map<string, number>;
  methodChanges: Map<string, CollectionMethod>;
  priorityAdjustments: Map<string, number>;
}

export interface FilteredSources {
  approved: string[];
  rejected: string[];
  conditional: ConditionalSource[];
}

export interface ConditionalSource {
  siteUrl: string;
  conditions: string[];
  fallbackMethod: CollectionMethod;
}

export interface ImprovementPlan {
  qualityEnhancements: QualityEnhancement[];
  resourceOptimizations: ResourceOptimization[];
  methodUpgrades: MethodUpgrade[];
}

export interface QualityEnhancement {
  target: string;
  improvement: string;
  estimatedGain: number;
  cost: ResourceCost;
}

export interface ResourceOptimization {
  resourceType: 'time' | 'memory' | 'cpu';
  optimization: string;
  estimatedSaving: number;
}

export interface MethodUpgrade {
  currentMethod: CollectionMethod;
  upgradedMethod: CollectionMethod;
  benefits: string[];
  migrationCost: ResourceCost;
}

export interface MethodDecision {
  selectedMethod: CollectionMethod;
  reasoning: string[];
  confidence: number;
  fallbacks: CollectionMethod[];
}

export interface FallbackPlan {
  primaryFallback: CollectionMethod;
  secondaryFallbacks: CollectionMethod[];
  escalationThreshold: number;
}

export interface MethodComparison {
  method1: CollectionMethod;
  method2: CollectionMethod;
  winner: CollectionMethod;
  metrics: ComparisonMetrics;
}

export interface ComparisonMetrics {
  qualityDifference: number;
  speedDifference: number;
  reliabilityDifference: number;
  overall: number;
}

export interface ParetoSolution {
  candidate: CollectionCandidate;
  qualityScore: number;
  efficiencyScore: number;
  dominatedBy: CollectionCandidate[];
}

export interface UtilityScore {
  marginalValue: number;
  marginalCost: number;
  ratio: number;
  recommendation: string;
}

export interface ResourceUnit {
  type: 'time' | 'memory' | 'cpu';
  amount: number;
  allocatedTo: string;
}

export interface PriorityAdjustment {
  taskId: string;
  oldPriority: number;
  newPriority: number;
  reasoning: string;
}

export interface QualityMetrics {
  accuracy: number;
  completeness: number;
  timeliness: number;
  consistency: number;
  reliability: number;
}

export interface SiteReliability {
  uptime: number;
  contentConsistency: number;
  responseStability: number;
  botFriendliness: number;
}

export interface AccessHistory {
  attempts: number;
  successes: number;
  failures: string[];
  averageResponseTime: number;
  lastAccessed: number;
}

export interface AvailabilityPrediction {
  probability: number;
  timeWindow: TimeWindow;
  confidence: number;
  factors: string[];
}

export interface ExecutionContext {
  timeConstraints: ExecutionConstraints;
  qualityRequirements: QualityMetrics;
  availableResources: ResourceBudget;
  priorityLevel: 'low' | 'medium' | 'high';
}

export interface MonitoringSession {
  id: string;
  execution: CollectionExecution;
  metrics: DecisionPerformanceMetrics;
  alerts: Alert[];
  status: 'active' | 'paused' | 'completed';
}

export interface DecisionPerformanceMetrics {
  responseTime: number;
  successRate: number;
  dataQuality: number;
  resourceUsage: ResourceUsage;
  throughput: number;
}

export interface Alert {
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  severity: number;
}

export interface BottleneckAnalysis {
  bottlenecks: Bottleneck[];
  criticalPath: string[];
  recommendations: string[];
}

export interface Bottleneck {
  taskId: string;
  type: 'cpu' | 'memory' | 'network' | 'time';
  severity: number;
  impact: string;
}

export interface ErrorState {
  errorType: string;
  affectedTasks: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

export interface RecoveryPlan {
  actions: RecoveryAction[];
  estimatedRecoveryTime: number;
  fallbackExecution: CollectionStrategy;
}

export interface RecoveryAction {
  type: 'retry' | 'skip' | 'fallback' | 'restart';
  target: string;
  parameters: any;
}

export interface SuccessfulExecution extends CollectionResult {
  successFactors: string[];
  optimalSettings: any;
}

export interface FailedExecution extends CollectionResult {
  failureReasons: string[];
  lessonsLearned: string[];
}

export interface ExecutionHistory {
  executions: CollectionResult[];
  patterns: ExecutionPattern[];
  improvements: string[];
}

export interface ExecutionPattern {
  pattern: string;
  frequency: number;
  outcomes: string[];
  recommendations: string[];
}

export interface LearningUpdate {
  newInsights: string[];
  updatedStrategies: CollectionStrategy[];
  confidenceChanges: Map<string, number>;
}

export interface FailureInsight {
  commonFailures: string[];
  preventionStrategies: string[];
  recoveryMethods: string[];
}

export interface BestPracticeUpdate {
  practices: BestPractice[];
  deprecatedPractices: string[];
  newRecommendations: string[];
}

export interface BestPractice {
  practice: string;
  applicableScenarios: string[];
  expectedBenefit: string;
  implementation: string;
}

export interface StrategyReport {
  selectedStrategy: CollectionStrategy;
  reasoning: string[];
  expectedOutcomes: PredictedOutcome[];
  resourceAllocation: ResourcePlan;
  riskAssessment: RiskAnalysis;
  fallbackPlans: FallbackStrategy[];
}

export interface ResourcePlan {
  timeAllocation: Map<string, number>;
  memoryAllocation: Map<string, number>;
  concurrencyPlan: Map<string, number>;
}

export interface RiskAnalysis {
  risks: Risk[];
  overallRisk: number;
  mitigationStrategies: string[];
}

export interface Risk {
  type: string;
  probability: number;
  impact: number;
  severity: number;
  mitigation: string;
}

export interface PerformanceReport {
  executionMetrics: ExecutionMetrics;
  efficiencyScore: number;
  qualityAchieved: number;
  resourceUtilization: ResourceUtilization;
  improvementRecommendations: Recommendation[];
}

export interface ExecutionMetrics {
  totalTime: number;
  tasksCompleted: number;
  successRate: number;
  averageQuality: number;
  resourceEfficiency: number;
}

export interface ResourceUtilization {
  timeUtilization: number;
  memoryUtilization: number;
  cpuUtilization: number;
  concurrencyUtilization: number;
}

export interface Recommendation {
  type: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
  expectedBenefit: string;
  implementationCost: ResourceCost;
}

export interface ValueScore {
  informationValue: number;
  timeliness: number;
  uniqueness: number;
  relevance: number;
  overall: number;
}

export interface ExplorationResult {
  discoveredSources: string[];
  qualityAssessment: QualityScore;
  collectibilityScore: number;
  valueScore: ValueScore;
}

export interface ExplorationDecision {
  shouldExplore: boolean;
  explorationTargets: string[];
  allocatedResources: ResourceBudget;
  expectedValue: number;
}

// 主要なDecision型定義とtype guard functions
import { ActionType } from './action-types';
import { ExecutionData } from './autonomous-system';

export interface Decision {
  id: string;
  type: ActionType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  confidence: number;
  data: DecisionData;
  timestamp: string;
  status: DecisionStatus;
  params?: Record<string, any>;
  dependencies?: string[];
  estimatedDuration?: number;
}

export interface DecisionData {
  context: DecisionContext;
  factors: DecisionFactor[];
  alternatives: Alternative[];
}

export interface DecisionContext {
  environment: string;
  constraints: string[];
  objectives: string[];
  timeframe: string;
}

export interface DecisionFactor {
  name: string;
  weight: number;
  value: number;
  reasoning: string;
}

export interface Alternative {
  id: string;
  description: string;
  score: number;
  pros: string[];
  cons: string[];
}

export type DecisionStatus = 'pending' | 'approved' | 'executing' | 'completed' | 'failed';

// 型ガード関数
export function isDecision(obj: unknown): obj is Decision {
  return typeof obj === 'object' 
    && obj !== null
    && 'id' in obj 
    && 'type' in obj
    && 'reasoning' in obj
    && 'confidence' in obj;
}

export function isExecutionData(obj: unknown): obj is ExecutionData {
  return typeof obj === 'object'
    && obj !== null
    && 'actionType' in obj;
}