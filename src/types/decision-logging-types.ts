// Decision Logging System Types - Enhanced for Visualization & Performance Monitoring

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

export interface Decision {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning?: string; // Make optional to match autonomous-system.ts
  params?: any; // Make optional to match autonomous-system.ts  
  dependencies: string[];
  estimatedDuration?: number; // Make optional to match autonomous-system.ts
  metadata?: {
    confidence?: number;
    alternativesConsidered?: Alternative[];
    enhancedWithSpecificCollection?: boolean;
    collectionSufficiency?: number;
    collectionQuality?: number;
    enhancementTimestamp?: number;
  };
}

export interface Alternative {
  id: string;
  description: string;
  reasoning: string;
  score: number;
  rejected: boolean;
}

export interface ExecutionResult {
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
  executionResult?: ExecutionResult;
  qualityScore?: QualityScore;
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

export interface QualityScore {
  overallScore: number;
  reasoningQuality: number;
  executionEfficiency: number;
  outcomeAccuracy: number;
  improvementAreas: string[];
  timestamp: string;
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

export interface ResourceUsage {
  memoryMB: number;
  cpuPercent: number;
  diskIOBytes: number;
  networkIOBytes: number;
  activeConnections: number;
}

export interface TimeWindow {
  start: string;
  end: string;
  duration: number;
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
  enablePerformanceMonitoring: boolean;
  performanceMonitoringInterval: number;
}