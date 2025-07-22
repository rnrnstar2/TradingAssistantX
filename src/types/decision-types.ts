/**
 * Consolidated Decision Types
 * 
 * This file consolidates decision and decision logging types:
 * - Core decision types (from original decision-types.ts)
 * - Decision logging types (from decision-logging-types.ts)
 * - Performance monitoring and visualization types
 */

import type { ActionType, DecisionPerformanceMetrics, ResourceUsage } from './system-types';
import type { BaseCollectionResult } from './collection-types';

// ============================================================================
// CORE DECISION TYPES
// ============================================================================

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
  expectedQuality: DecisionQualityScore;
  confidenceLevel: number;
}

export interface ResourceCost {
  timeMs: number;
  memoryMb: number;
  cpuUnits: number;
}

// Renamed to avoid collision with content-types and integration-types QualityScore
export interface DecisionQualityScore {
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

// Renamed to avoid collision with collection-types and system-types CollectionStrategy
export interface DecisionCollectionStrategy {
  sites: SiteMethodPair[];
  executionPlan: DecisionExecutionPlan;
  expectedOutcome: PredictedOutcome;
  resourceBudget: ResourceBudget;
}

export interface SiteMethodPair {
  siteUrl: string;
  method: CollectionMethod;
  priority: number;
  timeAllocation: number;
}

// Renamed to avoid collision with content-types ExecutionPlan
export interface DecisionExecutionPlan {
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

// DecisionPerformanceMetrics and ResourceUsage moved to system-types.ts to avoid duplication
// They will be re-imported from system-types.ts

// Main Decision interface
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
  context: DecisionContextCore;
  factors: DecisionFactor[];
  alternatives: Alternative[];
}

export interface DecisionContextCore {
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

// ============================================================================
// DECISION LOGGING TYPES (from decision-logging-types.ts)
// ============================================================================

export interface DecisionContext {
  sessionId: string;
  timestamp: string;
  accountHealth: number;
  systemStatus: string;
  inputData: any;
  marketContext?: any;
  actionSuggestions?: any[];
}

export interface DecisionStep {
  id: string;
  sessionId: string;
  stepType: 'context_analysis' | 'reasoning' | 'decision_generation' | 'validation' | 'execution';
  timestamp: string;
  reasoning: string;
  data: any;
  confidenceLevel: number;
  executionTime: number;
}

// Renamed to avoid collision with system-types ExecutionResult
export interface DecisionExecutionResult {
  success: boolean;
  executionTime: number;
  output: any;
  errors?: string[];
  warnings?: string[];
  metadata?: any;
}

export interface DecisionLog {
  sessionId: string;
  startTime: string;
  endTime: string;
  totalExecutionTime: number;
  context: DecisionContext;
  steps: DecisionStep[];
  finalDecision: Decision;
  executionResult?: DecisionExecutionResult;
  qualityScore?: DecisionQualityScore;
}

// Decision Tracer Types
export interface ClaudeReasoning {
  prompt: string;
  context: any;
  modelUsed: string;
  reasoning: string;
  confidence: number;
}

export interface ReasoningTrace {
  reasoningSteps: ReasoningStep[];
  confidenceLevel: number;
  alternativesConsidered: Alternative[];
  finalJustification: string;
  executionTime: number;
}

export interface ReasoningStep {
  id: string;
  stepNumber: number;
  description: string;
  reasoning: string;
  confidence: number;
  data: any;
  timestamp: string;
}

export interface DecisionChain {
  sessionId: string;
  steps: DecisionStep[];
  branches: DecisionBranch[];
  totalExecutionTime: number;
  qualityScore: number;
}

export interface DecisionBranch {
  id: string;
  parentStepId: string;
  branchType: 'alternative' | 'fallback' | 'conditional';
  condition: string;
  reasoning: string;
  chosen: boolean;
}

export interface BranchAnalysis {
  totalBranches: number;
  branchesExplored: number;
  optimalPathTaken: boolean;
  improvementSuggestions: string[];
}

// Performance Monitor Types
export interface DecisionLoggingPerformanceMetrics {
  sessionId: string;
  timestamp: string;
  decisionTime: number;
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  claudeApiCalls: number;
  cacheHitRate: number;
  resourceUsage: ResourceUsage;
}

export interface TrendAnalysis {
  timeWindow: TimeWindow;
  performanceTrend: 'improving' | 'stable' | 'degrading';
  averageDecisionTime: number;
  resourceUtilizationTrend: number;
  recommendations: string[];
}

export interface OptimizationSuggestion {
  id: string;
  category: 'performance' | 'resource' | 'decision_quality' | 'system';
  priority: 'high' | 'medium' | 'low';
  description: string;
  implementationComplexity: 'low' | 'medium' | 'high';
  expectedImpact: number; // 0.0-1.0
  implementationSteps: string[];
}

// Visualization Types
export interface VisualFlow {
  sessionId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    executionPath: string[];
    criticalPath: string[];
  };
}

export interface FlowNode {
  id: string;
  type: 'start' | 'decision' | 'action' | 'branch' | 'end';
  label: string;
  data: any;
  position: { x: number; y: number };
  metadata: {
    executionTime: number;
    confidence: number;
    status: 'completed' | 'in_progress' | 'failed';
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: 'flow' | 'fallback' | 'conditional';
  label?: string;
  metadata: {
    weight: number;
    traversed: boolean;
  };
}

export interface Dashboard {
  id: string;
  timestamp: string;
  timeRange: TimeWindow;
  sections: DashboardSection[];
  overallHealth: number;
  alerts: DashboardAlert[];
}

export interface DashboardSection {
  id: string;
  title: string;
  type: 'metrics' | 'chart' | 'table' | 'summary';
  data: any;
  visualization: VisualizationConfig;
}

export interface VisualizationConfig {
  chartType: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
  xAxis: string;
  yAxis: string;
  colors: string[];
  options: any;
}

export interface DashboardAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface QualityReport {
  id: string;
  timestamp: string;
  timeRange: TimeWindow;
  overallQuality: number;
  qualityTrends: QualityTrend[];
  improvementAreas: ImprovementArea[];
  recommendations: string[];
}

export interface QualityTrend {
  metric: string;
  trend: 'improving' | 'stable' | 'declining';
  currentValue: number;
  previousValue: number;
  changePercent: number;
}

export interface ImprovementArea {
  area: string;
  currentScore: number;
  targetScore: number;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
}

export interface OptimizationViz {
  id: string;
  timestamp: string;
  suggestions: OptimizationSuggestion[];
  priorityMatrix: PriorityMatrix;
  implementationRoadmap: ImplementationStep[];
}

export interface PriorityMatrix {
  highImpactLowComplexity: OptimizationSuggestion[];
  highImpactHighComplexity: OptimizationSuggestion[];
  lowImpactLowComplexity: OptimizationSuggestion[];
  lowImpactHighComplexity: OptimizationSuggestion[];
}

export interface ImplementationStep {
  id: string;
  phase: number;
  description: string;
  suggestions: string[];
  estimatedDuration: number;
  dependencies: string[];
}

// Output Types for Task Requirements
export interface VisualizationData {
  sessionId: string;
  decisionFlow: VisualFlow;
  performanceDashboard: Dashboard;
  qualityReport: QualityReport;
  optimizationViz: OptimizationViz;
  timestamp: string;
}

// Logger Session Management
export interface LoggerSession {
  sessionId: string;
  startTime: string;
  endTime?: string;
  active: boolean;
  context: DecisionContext;
  steps: DecisionStep[];
  performanceMetrics: DecisionLoggingPerformanceMetrics[];
  status: 'active' | 'completed' | 'failed' | 'timeout';
}

export interface LoggerConfig {
  maxSessions: number;
  sessionTimeout: number;
  outputDirectory: string;
  enableVisualization: boolean;
}

// ============================================================================
// TYPE GUARDS AND UTILITIES
// ============================================================================

export function isDecision(obj: unknown): obj is Decision {
  return typeof obj === 'object' 
    && obj !== null
    && 'id' in obj 
    && 'type' in obj
    && 'reasoning' in obj
    && 'confidence' in obj;
}

export function isExecutionData(obj: unknown): obj is any {
  return typeof obj === 'object'
    && obj !== null
    && 'actionType' in obj;
}