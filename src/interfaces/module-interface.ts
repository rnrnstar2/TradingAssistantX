export interface ExecutionContext {
  sessionId: string;
  timestamp: number;
  previousActions: ActionHistory[];
  currentState: SystemState;
  availableActions: string[];
  performanceMetrics: PerformanceMetrics;
  contextData: Record<string, any>;
}

export interface ActionHistory {
  action: string;
  timestamp: number;
  result: ModuleResult;
  executionTime: number;
}

export interface SystemState {
  phase: string;
  activeModules: string[];
  lastExecution: number;
  errorCount: number;
  successCount: number;
}

export interface PerformanceMetrics {
  averageExecutionTime: number;
  successRate: number;
  memoryUsage: number;
  apiCallsRemaining: number;
}

export interface ActionDescription {
  actionType: string;
  description: string;
  parameters: ParameterSpec[];
  expectedOutput: string;
}

export interface ParameterSpec {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ModuleMetadata {
  name: string;
  version: string;
  description: string;
  supportedActions: string[];
  dependencies: string[];
  author: string;
}

export interface PerformanceImpact {
  executionTime: number;
  memoryUsage: number;
  apiCallsUsed: number;
  resourceEfficiency: number;
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

export interface ClaudeDecision {
  action: ActionType;
  reasoning: string;
  parameters: ActionParameters;
  execution_context: ExecutionContext;
  confidence: number;
  expected_outcome: string;
}

export interface ActionType {
  category: string;
  specific_action: string;
  priority: number;
}

export interface ActionParameters {
  [key: string]: any;
}

export interface ModuleExecutor {
  execute(prompt: string, context: ExecutionContext): Promise<ModuleResult>;
  canExecute(action: string): boolean;
  getActionDescription(): ActionDescription;
  getModuleMetadata(): ModuleMetadata;
}