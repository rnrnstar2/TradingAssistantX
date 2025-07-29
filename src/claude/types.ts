/**
 * Claude Code SDK エンドポイント別型定義
 * REQUIREMENTS.md準拠版 - エンドポイント別設計
 * 各エンドポイントの入力・出力型定義
 */

// ============================================================================
// ENDPOINT RETURN TYPES - エンドポイント別返却型
// ============================================================================

/**
 * Content Endpoint 返却型
 * content-endpoint.ts の専用返却型
 */
export interface GeneratedContent {
  content: string;
  hashtags: string[];
  qualityScore: number;
  metadata: {
    wordCount: number;
    contentType: string;
    generatedAt: string;
  };
}

/**
 * Analysis Endpoint 返却型
 * analysis-endpoint.ts の専用返却型
 */
export interface AnalysisResult {
  analysisType: 'market' | 'performance' | 'trend';
  insights: string[];
  recommendations: string[];
  confidence: number;
  metadata: {
    dataPoints: number;
    timeframe: string;
    generatedAt: string;
  };
}

/**
 * Search Endpoint 返却型
 * search-endpoint.ts の専用返却型
 */
export interface SearchQuery {
  query: string;
  filters: {
    language?: string;
    minEngagement?: number;
    maxAge?: string;
    verified?: boolean;
  };
  priority: number;
  expectedResults: number;
  metadata: {
    purpose: 'retweet' | 'like' | 'trend_analysis' | 'engagement';
    generatedAt: string;
  };
}

// ============================================================================
// ENDPOINT INPUT TYPES - エンドポイント別入力型
// ============================================================================


/**
 * Content Endpoint 入力型
 * content-endpoint.ts への入力型
 */
export interface ContentInput {
  request: ContentRequest;
  context?: any;
  qualityThreshold?: number;
}

/**
 * Analysis Endpoint 入力型
 * analysis-endpoint.ts への入力型
 */
export interface AnalysisInput {
  analysisType: 'market' | 'performance' | 'trend';
  data: any;
  timeframe?: string;
  context?: BasicMarketContext;
}

/**
 * Search Endpoint 入力型
 * search-endpoint.ts への入力型
 */
export interface SearchInput {
  purpose: 'retweet' | 'like' | 'trend_analysis' | 'engagement';
  topic: string;
  constraints?: {
    maxResults?: number;
    minEngagement?: number;
    timeframe?: string;
  };
}

/**
 * Retweet Search Endpoint 入力型
 * リツイート用検索クエリ生成専用入力型
 */
export interface RetweetSearchInput {
  topic: string;
  marketContext?: BasicMarketContext;
  targetAudience?: 'beginner' | 'intermediate' | 'advanced';
  constraints?: {
    maxResults?: number;
    minEngagement?: number;
    timeframe?: string;
    qualityThreshold?: number;
  };
}

/**
 * Like Search Endpoint 入力型
 * いいね用検索クエリ生成専用入力型
 */
export interface LikeSearchInput {
  topic: string;
  marketContext?: BasicMarketContext;
  targetAudience?: 'beginner' | 'intermediate' | 'advanced';
  constraints?: {
    maxResults?: number;
    minEngagement?: number;
    timeframe?: string;
    sentimentFilter?: 'positive' | 'neutral' | 'negative';
  };
}

/**
 * Quote Tweet Search Endpoint 入力型
 * 引用ツイート用検索クエリ生成専用入力型
 */
export interface QuoteSearchInput {
  topic: string;
  marketContext?: BasicMarketContext;
  targetAudience?: 'beginner' | 'intermediate' | 'advanced';
  constraints?: {
    maxResults?: number;
    minEngagement?: number;
    timeframe?: string;
    valueAddPotential?: 'high' | 'medium' | 'low';
  };
}

// ============================================================================
// AUXILIARY TYPES - 補助型定義（既存コードから抽出）
// ============================================================================

/**
 * コンテンツリクエスト
 * content-generator.ts から抽出
 */
export interface ContentRequest {
  topic: string;
  context?: any;
  contentType?: 'educational' | 'market_analysis' | 'trending' | 'announcement' | 'reply';
  targetAudience?: 'beginner' | 'intermediate' | 'advanced';
  maxLength?: number;
}

/**
 * システムコンテキスト
 * decision-engine.ts から抽出
 */
export interface SystemContext {
  timestamp?: string;
  account: {
    followerCount: number;
    lastPostTime?: string;
    postsToday: number;
    engagementRate: number;
    accountHealth?: any;
  };
  system: {
    health: {
      all_systems_operational: boolean;
      api_status: 'healthy' | 'degraded' | 'error';
      rate_limits_ok: boolean;
    };
    executionCount: { today: number; total: number };
  };
  market: {
    trendingTopics: string[];
    volatility: 'low' | 'medium' | 'high';
    sentiment: 'bearish' | 'neutral' | 'bullish';
  };
  learningData?: any;
}

/**
 * 基本市場コンテキスト
 * market-analyzer.ts から抽出
 */
export interface BasicMarketContext {
  sentiment: 'bearish' | 'neutral' | 'bullish';
  volatility: 'low' | 'medium' | 'high';
  trendingTopics: string[];
  timestamp: string;
}

// ============================================================================
// ENDPOINT-SPECIFIC CONSTANTS - エンドポイント専用定数
// ============================================================================

/**
 * 有効なアクション
 */
export const VALID_ACTIONS = ['post', 'retweet', 'quote_tweet', 'like', 'wait'] as const;

/**
 * コンテンツタイプ
 */
export const CONTENT_TYPES = ['educational', 'market_analysis', 'trending', 'announcement', 'reply'] as const;

/**
 * 対象読者
 */
export const TARGET_AUDIENCES = ['beginner', 'intermediate', 'advanced'] as const;

/**
 * 検索目的
 */
export const SEARCH_PURPOSES = ['retweet', 'like', 'trend_analysis', 'engagement'] as const;

/**
 * 分析タイプ
 */
export const ANALYSIS_TYPES = ['market', 'performance', 'trend'] as const;

/**
 * システム制限
 */
export const SYSTEM_LIMITS = {
  MAX_POSTS_PER_DAY: 5,
  MIN_WAIT_BETWEEN_POSTS: 3600000, // 1 hour
  MAX_CONTENT_LENGTH: 280,
  CONFIDENCE_THRESHOLD: 0.7,
  QUALITY_THRESHOLD: 70,
  DEFAULT_TIMEOUT: 15000
} as const;

// ============================================================================
// TYPE GUARDS - 型ガード（品質確保）
// ============================================================================


/**
 * GeneratedContent 型ガード
 */
export function isGeneratedContent(obj: any): obj is GeneratedContent {
  return !!(obj &&
         typeof obj.content === 'string' &&
         Array.isArray(obj.hashtags) &&
         typeof obj.qualityScore === 'number' &&
         obj.qualityScore >= 0 && obj.qualityScore <= 100 &&
         obj.metadata !== undefined &&
         typeof obj.metadata.wordCount === 'number' &&
         typeof obj.metadata.contentType === 'string' &&
         typeof obj.metadata.generatedAt === 'string');
}

/**
 * AnalysisResult 型ガード
 */
export function isAnalysisResult(obj: any): obj is AnalysisResult {
  return !!(obj &&
         typeof obj.analysisType === 'string' &&
         ANALYSIS_TYPES.includes(obj.analysisType) &&
         Array.isArray(obj.insights) &&
         Array.isArray(obj.recommendations) &&
         typeof obj.confidence === 'number' &&
         obj.confidence >= 0 && obj.confidence <= 1 &&
         obj.metadata !== undefined);
}

/**
 * SearchQuery 型ガード
 */
export function isSearchQuery(obj: any): obj is SearchQuery {
  return !!(obj &&
         typeof obj.query === 'string' &&
         typeof obj.priority === 'number' &&
         typeof obj.expectedResults === 'number' &&
         obj.filters !== undefined &&
         obj.metadata !== undefined &&
         typeof obj.metadata.purpose === 'string' &&
         SEARCH_PURPOSES.includes(obj.metadata.purpose));
}

// ============================================================================
// MISSING TYPES - 不足していた型定義
// ============================================================================

/**
 * Claude SDK設定
 */
export interface ClaudeSDKConfig {
  model?: 'sonnet' | 'haiku' | 'opus';
  timeout?: number;
  retryCount?: number;
  qualityThreshold?: number;
}

/**
 * Twitterコンテキスト
 */
export interface TwitterContext {
  account: {
    followerCount: number;
    lastPostTime?: string;
    postsToday: number;
    engagementRate: number;
    apiStatus: 'healthy' | 'degraded' | 'error';
  };
  trends?: any[];
  timestamp: string;
}


/**
 * 検索リクエスト
 */
export interface SearchRequest {
  purpose: 'retweet' | 'like' | 'trend_analysis' | 'engagement';
  topic: string;
  filters?: any;
}

/**
 * 実行記録
 */
export interface ExecutionRecord {
  id: string;
  timestamp: string;
  action: string;
  success: boolean;
  confidence: number;
  reasoning: string;
  result?: {
    engagement?: number;
    reach?: number;
    errors?: string[];
  };
}

/**
 * 学習インサイト
 */
export interface LearningInsight {
  pattern: string;
  success_rate: number;
  recommendation: string;
  confidence: number;
}

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
  total_executions: number;
  success_rate: number;
  action_breakdown: {
    [action: string]: {
      count: number;
      success_rate: number;
    };
  };
  recent_insights: LearningInsight[];
  last_updated: string;
}

/**
 * Claude SDK エラー
 */
export interface ClaudeSDKError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

/**
 * API レスポンス
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: ClaudeSDKError;
  metadata?: {
    executionTime: number;
    apiCalls: number;
    timestamp: string;
  };
}

// ============================================================================
// TYPE ALIASES - 既存コード互換性のための型エイリアス
// ============================================================================

/**
 * 分析リクエスト（既存コード互換性のためのエイリアス）
 */
export type AnalysisRequest = AnalysisInput;