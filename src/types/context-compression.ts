/**
 * コンテキスト圧迫抑制システム型定義
 */

// 基本システム型
export interface MinimalAccountState {
  healthScore: number;          // 単一指標
  todayActions: number;         // 今日の実行回数
  lastSuccess: string;          // 最後の成功時刻
}

export interface EssentialPostingHistory {
  recent: Array<{
    time: string;
    type: string;
    success: boolean;
  }>; // 最新5件のみ
}

// リアルタイム情報型
export interface EssentialContext {
  market: MarketSnapshot;
  account: AccountSnapshot;
  opportunities: ImmediateOpportunity[];
}

export interface MarketSnapshot {
  trending: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  activity: 'low' | 'medium' | 'high';
}

export interface AccountSnapshot {
  healthScore: number;
  todayActions: number;
  lastSuccess: string;
}

export interface ImmediateOpportunity {
  type: 'post' | 'engage' | 'amplify' | 'wait';
  priority: number;
  reason: string;
}

// Claude判断型
export interface DecisionContext {
  current: CurrentState;
  immediate: ImmediateContext;
  context: string;
}

export interface CurrentState {
  time: string;
  accountHealth: number;
  todayProgress: number;
}

export interface ImmediateContext {
  bestOpportunity: string;
  constraints: string[];
}

export interface SimpleDecision {
  action: 'post' | 'engage' | 'amplify' | 'wait';
  reason: string;
  confidence: number;
  executionTime?: number;
}

// メモリ最適化型
export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  size: number;
}

// システム統合型
export interface SystemPerformanceMetrics {
  memoryUsageMB: number;
  contextSize: number;
  decisionTimeMs: number;
  cacheHitRate: number;
}

export interface SystemHealthStatus {
  memory: 'healthy' | 'warning' | 'critical';
  performance: 'optimal' | 'acceptable' | 'slow';
  cache: 'efficient' | 'degraded' | 'overloaded';
  overall: 'green' | 'yellow' | 'red';
}

export interface OptimizationResult {
  beforeMemoryMB: number;
  afterMemoryMB: number;
  timeReductionMs: number;
  contextReductionPercent: number;
  success: boolean;
  errors?: string[];
}

// ログ型
export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

// 設定型
export interface CompressionConfig {
  maxContextSize: number;
  cacheTimeoutMs: number;
  memoryThresholdMB: number;
  cleanupIntervalMs: number;
  enableEmergencyOptimization: boolean;
}

// API応答型
export interface SystemStatusResponse {
  status: SystemHealthStatus;
  metrics: SystemPerformanceMetrics;
  lastOptimization: string;
  recommendations: string[];
}

export interface DecisionResponse {
  decision: SimpleDecision;
  context: DecisionContext;
  executionTime: number;
  systemStatus: 'optimal' | 'degraded' | 'emergency';
}

// バッチ処理型
export interface BatchOperation {
  id: string;
  type: 'post' | 'engage' | 'amplify' | 'analyze';
  priority: number;
  context?: any;
}

export interface BatchResult {
  successful: SimpleDecision[];
  failed: Array<{
    operation: BatchOperation;
    error: string;
  }>;
  totalTime: number;
  averageDecisionTime: number;
}