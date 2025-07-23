import { ExecutionContext, ActionParameters, PerformanceImpact } from './module-interface';

export interface ClaudeDecision {
  action: ActionType;
  reasoning: string;
  parameters: ActionParameters;
  execution_context: ExecutionContext;
  confidence: number;
  expected_outcome: string;
}

export interface ActionType {
  category: 'data-intelligence' | 'content-strategy' | 'action-execution' | 'analysis' | 'optimization';
  specific_action: string;
  priority: 1 | 2 | 3 | 4 | 5;
}

export interface AutonomousResult {
  decision: ClaudeDecision;
  execution_result: ModuleResult;
  system_state: SystemStateUpdate;
  next_actions: ClaudeDecision[];
  performance_summary: PerformanceSummary;
}

export interface ModuleResult {
  success: boolean;
  action_executed: string;
  results: any;
  performance_impact: PerformanceImpact;
  next_suggestions: ClaudeDecision[];
  execution_log: string;
  updated_context: ExecutionContext;
}

export interface SystemStateUpdate {
  timestamp: number;
  modules_activated: string[];
  context_changes: ContextChange[];
  error_states: ErrorState[];
  performance_changes: PerformanceChange[];
}

export interface ContextChange {
  field: string;
  previous_value: any;
  new_value: any;
  change_reason: string;
}

export interface ErrorState {
  module: string;
  error_type: string;
  error_message: string;
  timestamp: number;
  recovery_action: string;
}

export interface PerformanceChange {
  metric: string;
  previous_value: number;
  new_value: number;
  improvement: number;
}

export interface PerformanceSummary {
  total_execution_time: number;
  modules_executed: number;
  success_rate: number;
  api_calls_used: number;
  memory_peak: number;
  efficiency_score: number;
}

export interface ProcessingError {
  error_type: 'JSON_PARSE' | 'VALIDATION' | 'EXECUTION' | 'TIMEOUT' | 'API_LIMIT';
  error_message: string;
  timestamp: number;
  context: ExecutionContext;
  recovery_suggestions: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ClaudePromptRequest {
  context: ExecutionContext;
  available_actions: string[];
  system_state: SystemStateSnapshot;
  execution_history: ActionHistory[];
  performance_constraints: PerformanceConstraints;
}

export interface SystemStateSnapshot {
  timestamp: number;
  active_modules: string[];
  pending_actions: string[];
  resource_usage: ResourceUsage;
  error_count: number;
  success_count: number;
}

export interface ActionHistory {
  action: string;
  timestamp: number;
  result: ModuleResult;
  executionTime: number;
}

export interface PerformanceConstraints {
  max_execution_time: number;
  max_memory_usage: number;
  api_rate_limit: number;
  concurrent_modules: number;
}

export interface ResourceUsage {
  memory_mb: number;
  cpu_percentage: number;
  api_calls_remaining: number;
  disk_usage_mb: number;
}