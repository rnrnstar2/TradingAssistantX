/**
 * MVP Core Types - Data Structure Simplification
 * 
 * Essential system types for TradingAssistantX MVP functionality
 * Simplified from complex architecture to basic requirements
 */

// ============================================================================
// MVP CORE TYPES
// ============================================================================

/**
 * System context provided to Claude for decision making
 */
export interface SystemContext {
  timestamp: string;
  account: {
    followerCount: number;
    lastPostTime: string | null;
  };
  system: {
    health: {
      all_systems_operational: boolean;
    };
    executionCount: {
      today: number;
    };
  };
  market: {
    trendingTopics: string[];
  };
}

/**
 * Available actions Claude can choose from
 */
export type ClaudeActionType = 'collect_data' | 'create_post' | 'analyze' | 'wait';

/**
 * Claude's decision with parameters
 */
export interface ClaudeDecision {
  action: ClaudeActionType;
  reasoning: string;
  parameters: any;
  confidence: number;
}

// ============================================================================
// ESSENTIAL SUPPORT TYPES
// ============================================================================

/**
 * Basic account status for MVP
 */
export interface AccountStatus {
  username: string;
  followers_count: number;
  last_updated: string;
  isActive: boolean;
}

/**
 * Simple system state tracking
 */
export interface SystemState {
  isRunning: boolean;
  lastExecution: string | null;
  errorCount: number;
  successCount: number;
}

/**
 * Basic execution result
 */
export interface ExecutionResult {
  success: boolean;
  action: string;
  timestamp: string;
  data?: any;
  error?: string;
}

/**
 * Action parameters interface
 */
export interface ActionParams {
  [key: string]: any;
}

/**
 * Action metadata interface
 */
export interface ActionMetadata {
  executionId: string;
  timestamp: string;
  source: string;
}

/**
 * Execution metadata interface
 */
export interface ExecutionMetadata {
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'running' | 'completed' | 'failed';
}

/**
 * Context interface
 */
export interface Context {
  current: SystemContext;
  history: ExecutionResult[];
}

/**
 * Decision interface
 */
export interface Decision extends ClaudeDecision {
  executionId: string;
  timestamp: string;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isClaudeDecision(obj: any): obj is ClaudeDecision {
  return obj && 
         typeof obj.action === 'string' && 
         ['collect_data', 'create_post', 'analyze', 'wait'].includes(obj.action) &&
         typeof obj.reasoning === 'string' &&
         typeof obj.confidence === 'number';
}

export function isSystemContext(obj: any): obj is SystemContext {
  return obj && 
         typeof obj.timestamp === 'string' &&
         obj.account && 
         typeof obj.account.followerCount === 'number' &&
         obj.system &&
         typeof obj.system.health?.all_systems_operational === 'boolean' &&
         typeof obj.system.executionCount?.today === 'number';
}