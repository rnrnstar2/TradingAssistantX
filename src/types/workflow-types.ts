// Workflow Integration Types - TASK-WF05
// 全ての新しい型定義を統合した最適化ワークフロー専用型定義

import { ActionResult, ActionDecision, ActionType } from './action-types.js';
import { AccountStatus, CollectionResult, ContentOpportunity } from './autonomous-system.js';

// 統合コンテキスト型（最適化ワークフロー用）
export interface IntegratedContext {
  account: {
    currentState: AccountStatus;
    recommendations: string[];
    healthScore: number;
    dailyProgress: DailyProgress;
  };
  market: {
    trends: TrendInfo[];
    opportunities: ContentOpportunity[];
    competitorActivity: CompetitorActivity[];
  };
  actionSuggestions: ActionSuggestion[];
  timestamp: number;
}

// 日次進捗管理型
export interface DailyProgress {
  actionsCompleted: number;
  actionsRemaining: number;
  typeDistribution: {
    original_post: number;
    quote_tweet: number;
    retweet: number;
    reply: number;
  };
  nextOptimalAction: ActionType;
  targetReached: boolean;
  completionRate: number; // 0-100
}

// 最適化ワークフロー結果型
export interface OptimizedWorkflowResult {
  executionTime: number;
  actionsExecuted: ActionResult[];
  contextUsed: IntegratedContext;
  nextExecutionTime: number;
  improvementMetrics: ImprovementMetrics;
  workflowVersion: string;
  success: boolean;
}

// 改善メトリクス型
export interface ImprovementMetrics {
  decisionQuality: number;      // 0-100
  executionEfficiency: number;  // 0-100
  engagementPotential: number;  // 0-100
  timeReduction: number;        // 削減時間（秒）
  parallelizationGain: number;  // 並列化による改善率
}

// トレンド情報型
export interface TrendInfo {
  id: string;
  topic: string;
  relevanceScore: number;
  volume: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  source: string;
  timestamp: number;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

// 競合活動型
export interface CompetitorActivity {
  id: string;
  username: string;
  content: string;
  actionType: ActionType;
  engagement: {
    likes: number;
    retweets: number;
    replies: number;
  };
  relevanceScore: number;
  timestamp: number;
  learningPoints: string[];
}

// アクション提案型
export interface ActionSuggestion {
  type: ActionType;
  content?: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  expectedImpact: number;
  confidence: number;
  metadata?: ActionMetadata;
}

// アクションメタデータ型
export interface ActionMetadata {
  targetTweetId?: string;
  hashtags?: string[];
  mentionTargets?: string[];
  timingSuggestion?: string;
  qualityChecks?: QualityCheck[];
}

// 品質チェック型
export interface QualityCheck {
  type: 'length' | 'relevance' | 'engagement' | 'value_add' | 'compliance';
  status: 'pass' | 'warning' | 'fail';
  score: number;
  message?: string;
}

// ワークフロー実行状態型
export interface WorkflowExecutionState {
  currentStep: WorkflowStep;
  startTime: number;
  elapsedTime: number;
  parallelTasks: ParallelTask[];
  context: IntegratedContext;
  decisions: ActionDecision[];
  errors: WorkflowError[];
}

// ワークフローステップ型
export type WorkflowStep = 
  | 'health_check'
  | 'parallel_analysis'
  | 'context_integration'
  | 'simplified_needs'
  | 'expanded_decisions'
  | 'daily_optimization'
  | 'action_execution'
  | 'result_saving';

// 並列タスク型
export interface ParallelTask {
  id: string;
  type: 'account_analysis' | 'info_collection' | 'context_integration';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  result?: any;
  error?: string;
}

// ワークフローエラー型
export interface WorkflowError {
  step: WorkflowStep;
  timestamp: number;
  error: string;
  stack?: string;
  context?: any;
  recoverable: boolean;
}

// 実行統計型
export interface ExecutionStatistics {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  stepPerformance: StepPerformance[];
  improvementTrends: ImprovementTrend[];
  lastUpdated: string;
}

// ステップパフォーマンス型
export interface StepPerformance {
  step: WorkflowStep;
  averageTime: number;
  successRate: number;
  improvementOpportunities: string[];
}

// 改善トレンド型
export interface ImprovementTrend {
  metric: keyof ImprovementMetrics;
  trend: 'improving' | 'stable' | 'declining';
  changeRate: number;
  period: string;
}

// 並列実行結果型
export interface ParallelExecutionResult {
  accountAnalysis: AccountStatus;
  collectionResults: CollectionResult[];
  executionTime: number;
  success: boolean;
  errors: string[];
}

// コンテキスト統合結果型
export interface ContextIntegrationResult {
  integratedContext: IntegratedContext;
  qualityScore: number;
  dataCompleteness: number;
  processingTime: number;
  warnings: string[];
}

// 配分最適化結果型
export interface DistributionOptimizationResult {
  originalDecisions: ActionDecision[];
  optimizedDecisions: ActionDecision[];
  reductionCount: number;
  priorityAdjustments: PriorityAdjustment[];
  reasoning: string;
}

// 優先度調整型
export interface PriorityAdjustment {
  decisionId: string;
  originalPriority: string;
  newPriority: string;
  reason: string;
  weight: number;
}

// スケジュール決定結果型
export interface ScheduleDecisionResult {
  nextExecutionTime: number;
  intervalMinutes: number;
  adjustmentFactor: number;
  reasoning: string;
  basedOnContext: {
    accountHealth: number;
    marketOpportunities: number;
    executionHistory: any;
  };
}

// ワークフロー設定型
export interface WorkflowConfiguration {
  version: string;
  steps: WorkflowStepConfig[];
  parallelization: ParallelizationConfig;
  optimization: OptimizationConfig;
  errorHandling: ErrorHandlingConfig;
}

// ワークフローステップ設定型
export interface WorkflowStepConfig {
  step: WorkflowStep;
  timeout: number;
  retryCount: number;
  dependencies: WorkflowStep[];
  parallelWith?: WorkflowStep[];
}

// 並列化設定型
export interface ParallelizationConfig {
  maxConcurrentTasks: number;
  batchSize: number;
  waitBetweenBatches: number;
  enableParallelAnalysis: boolean;
}

// 最適化設定型
export interface OptimizationConfig {
  enableSimplifiedNeeds: boolean;
  enableDailyDistribution: boolean;
  maxActionsPerExecution: number;
  qualityThreshold: number;
}

// エラーハンドリング設定型
export interface ErrorHandlingConfig {
  maxRetries: number;
  retryDelay: number;
  continueOnError: boolean;
  escalationThreshold: number;
}