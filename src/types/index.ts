/**
 * MVP Types Export Hub - Data Structure Simplification
 * 
 * Simplified type exports for TradingAssistantX MVP functionality
 * Includes backward compatibility stubs for existing code
 */

// ============================================================================
// MVP CORE EXPORTS
// ============================================================================
export type {
  SystemContext,
  ClaudeActionType,
  ClaudeDecision,
  AccountStatus,
  SystemState,
  ExecutionResult,
  ActionParams,
  ActionMetadata,
  ExecutionMetadata,
  Context,
  Decision
} from './core-types';

export {
  isClaudeDecision,
  isSystemContext
} from './core-types';

// ============================================================================
// MVP POST EXPORTS
// ============================================================================
export type {
  PostData,
  EngagementData,
  TopicData
} from './post-types';

export {
  isPostData,
  isEngagementData
} from './post-types';

// ============================================================================
// DATA TYPES EXPORTS
// ============================================================================
export type {
  CollectionResult,
  BaseCollectionResult,
  BaseMetadata,
  DataItem,
  EngagementMetrics,
  MarketCondition,
  LegacyCollectionResult
} from './data-types';

export {
  createCollectionResult,
  toLegacyResult
} from './data-types';

// ============================================================================
// X API V2 TYPES EXPORTS
// ============================================================================
export type {
  XTweetV2,
  XUserV2,
  XMediaV2,
  XErrorV2,
  XCreateTweetRequestV2,
  XCreateTweetResponseV2,
  XPaginationV2,
  XRateLimitV2,
  XResponseV2,
  XFieldsV2,
  XSearchParamsV2
} from './x-api-types';

// ============================================================================
// BACKWARD COMPATIBILITY TYPES (MINIMAL STUBS)
// ============================================================================

// Core compatibility types
export type ClaudeAction = ClaudeActionType;
export const isClaudeAction = isClaudeDecision;

// Fix missing export
export { ClaudeActionType } from './core-types';

export interface MultiSourceCollectionResult extends CollectionResult {
  title: string;
  url: string;
  status?: string;
  errors?: string[];
}

export interface AutonomousCollectionResult extends CollectionResult {
  title: string;
  url: string;
}
export interface ConvergenceCollectionResult extends CollectionResult {
  title: string;
  url: string;
}

// Configuration types
export interface RSSSourceConfig {
  url: string;
  enabled: boolean;
  timeout: number;
}

export interface RSSItem {
  title: string;
  content: string;
  url: string;
  timestamp: number;
}

export interface RSSFeedResult {
  items: RSSItem[];
  source: string;
  status: string;
}

export interface RssYamlSettings {
  sources: Record<string, any[]>;
  collection_settings: {
    timeout_seconds: number;
    max_items_per_source: number;
  };
}

export interface RSSSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  timeout: number;
  maxItems: number;
  provider?: string;
  priority?: number;
  categories?: string[];
  successRate?: number;
}

// Action and execution types
export interface ActionParams {
  originalContent?: string;
  hashtags?: string[];
  contentType?: string;
}

export interface ActionMetadata {
  urgency?: string;
  estimatedDuration?: number;
}

export interface ExecutionMetadata {
  startTime: number;
  endTime?: number;
  status?: string;
}

// Context and decision types
export interface Context {
  currentTime: number;
  accountStatus: AccountStatus;
  systemState: SystemState;
}

export interface Decision {
  type: string;
  confidence: number;
  reasoning: string;
}

// Account and metrics types
export interface AccountInfo {
  username: string;
  display_name: string;
  followers_count: number;
  following_count: number;
  tweet_count: number;
  verified: boolean;
}

export interface AccountMetrics {
  followers_count: number;
  following_count: number;
  tweet_count: number;
  avg_engagement_rate: number;
}

export interface Tweet {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
  };
}

export interface EngagementMetrics {
  likes?: number;
  retweets?: number;
  replies?: number;
  engagementRate?: number;
}

// Data and content types
export interface DataItem {
  content: string;
  timestamp: string;
  [key: string]: any;
}

export interface ContentMetadata {
  topic?: string;
  category?: string;
  quality_score?: number;
}

// Utility functions (stubs)
export function createCollectionResult(data: any): CollectionResult {
  return {
    id: Date.now().toString(),
    content: data,
    source: 'unknown',
    timestamp: Date.now(),
    metadata: {}
  };
}

export function createAutonomousResult(data: any): AutonomousCollectionResult {
  return createCollectionResult(data);
}

export function calculateBasicQuality(content: string): number {
  return content.length > 100 ? 0.8 : 0.5;
}

export function isBaseCollectionResult(obj: any): obj is BaseCollectionResult {
  return obj && typeof obj.id === 'string' && typeof obj.source === 'string';
}

export function isAutonomousCollectionResult(obj: any): obj is AutonomousCollectionResult {
  return isBaseCollectionResult(obj);
}

export function isConvergenceCollectionResult(obj: any): obj is ConvergenceCollectionResult {
  return isBaseCollectionResult(obj);
}

// ============================================================================
// ESSENTIAL DATA STRUCTURES FOR MVP
// ============================================================================

export interface AccountStatusData {
  username: string;
  followers_count: number;
  last_updated: string;
  is_active: boolean;
}

export interface ActiveStrategyData {
  current_action: string;
  reason: string;
  timestamp: string;
}

export interface PostingData {
  content: string;
  timestamp: string;
  success: boolean;
  follower_count: number;
}