// Core context and state types
export interface Context {
  timestamp: string;
  systemStatus: 'initializing' | 'running' | 'paused' | 'error';
  recentActions: ActionSummary[];
  pendingTasks: string[];
  metrics?: SystemMetrics;
}

export interface ActionSummary {
  id: string;
  type: string;
  status: 'success' | 'failed' | 'partial';
  timestamp: string;
  summary?: string;
}

export interface SystemMetrics {
  totalActions: number;
  successRate: number;
  averageExecutionTime: number;
  lastHealthCheck: string;
}

// Need and Decision types
export interface Need {
  id: string;
  type: 'content' | 'immediate' | 'maintenance' | 'optimization';
  priority: 'high' | 'medium' | 'low';
  description: string;
  context?: any;
  createdAt: string;
}

export interface Decision {
  id: string;
  type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning?: string;
  params?: Record<string, any>;
  dependencies?: string[];
  estimatedDuration?: number;
}

// Action and Task types
export interface Action {
  id: string;
  type: string;
  priority: string;
  params: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Task {
  id: string;
  actionId: string;
  type: string;
  priority: string;
  executor: () => Promise<any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// Result types
export interface Result {
  id: string;
  taskId: string;
  actionId: string;
  status: 'success' | 'failed' | 'partial';
  data?: any;
  error?: string;
  completedAt: string;
  metadata?: ResultMetadata;
}

export interface ResultMetadata {
  executionTime?: number;
  retryCount?: number;
  warnings?: string[];
}

// Communication types
export interface ClaudeCommunication {
  sessionId: string;
  startedAt: string;
  plannedTasks: TaskSummary[];
  messages?: Message[];
}

export interface TaskSummary {
  id: string;
  type: string;
  priority: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  type: 'info' | 'request' | 'response' | 'error';
  content: any;
  timestamp: string;
}

// Data sharing types
export interface SharedInsights {
  lastUpdated: string;
  insights: Insight[];
  patterns: Record<string, Pattern>;
  recommendations: Recommendation[];
}

export interface Insight {
  id: string;
  type: string;
  description: string;
  confidence: number;
  evidence?: any[];
  createdAt: string;
}

export interface Pattern {
  type: string;
  frequency: number;
  lastSeen: string;
  examples: any[];
}

export interface Recommendation {
  id: string;
  action: string;
  reasoning: string;
  priority: string;
  expectedImpact?: string;
}

// Configuration types
export interface AutonomousConfig {
  autonomous_system: {
    max_parallel_tasks: number;
    context_sharing_enabled: boolean;
    decision_persistence: boolean;
  };
  claude_integration: {
    sdk_enabled: boolean;
    max_context_size: number;
  };
  data_management: {
    cleanup_interval: number;
    max_history_entries: number;
  };
}

// Error handling types
export interface SystemError {
  timestamp: string;
  error: string;
  stack?: string;
  context?: any;
  recoveryAttempted?: boolean;
}