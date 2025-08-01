/**
 * Claude Code SDK エンドポイント別型定義
 * REQUIREMENTS.md準拠版 - エンドポイント別設計
 * 各エンドポイントの入力・出力型定義
 */

// KaitoAPI型のインポート
import type { TweetData } from '../kaito-api/utils/types';

// SystemContext型のインポート（重複排除）
import type { SystemContext } from '../shared/types';

// 他のファイルとの互換性のため、SystemContextを再エクスポート
export type { SystemContext };

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
 * 深夜分析機能の返却型（実装予定）
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
 * FX特化分析インサイト
 * FX専門的な分析に特化した型定義
 */
export interface FXSpecificInsights {
  mentionedPairs: string[];
  technicalLevels: {
    [pair: string]: {
      support: number[];
      resistance: number[];
    };
  };
  contrarianViews: string[];
  predictions: Array<{
    pair: string;
    direction: 'up' | 'down' | 'range';
    target?: number;
    timeframe: string;
    confidence: number;
  }>;
  riskWarnings: string[];
}

/**
 * Target Query分析結果
 * データ分析エンドポイントで使用する分析結果の型（FX特化機能を含む）
 */
export interface TargetQueryInsights {
  summary: string;
  keyPoints: Array<{
    point: string;
    importance: 'critical' | 'high' | 'medium';
    category: 'warning' | 'news' | 'trend' | 'analysis' | 'technical' | 'fundamental' | 'sentiment' | 'prediction';
    uniquenessScore?: number;
  }>;
  marketSentiment?: 'bullish' | 'bearish' | 'neutral';
  mentionedPairs?: string[];
  confidence: number;
  analyzedAt: string;
  dataPoints: number;
  
  // TASK-005で追加されたFX特化フィールドを統合
  technicalLevels: {
    [pair: string]: {
      support: number[];
      resistance: number[];
    };
  };
  contrarianViews: string[];
  predictions: Array<{
    pair: string;
    direction: 'up' | 'down' | 'range';
    target?: number;
    timeframe: string;
    confidence: number;
  }>;
  riskWarnings: string[];
}

/**
 * Reference User分析結果
 * 参照ユーザーのツイート分析結果
 */
export interface ReferenceUserInsights {
  /** ユーザー名 */
  username: string;
  /** 150文字以内の要約 */
  summary: string;
  /** 専門分野（例：["FX", "金融政策", "テクニカル分析"]） */
  expertise: string[];
  /** 最新の見解リスト */
  latestViews: Array<{
    /** トピック */
    topic: string;
    /** スタンス */
    stance: string;
    /** 信頼度 */
    confidence: 'high' | 'medium' | 'low';
  }>;
  /** 0-1の信頼性スコア */
  reliability: number;
  /** ISO timestamp形式の分析時刻 */
  analyzedAt: string;
  /** 分析したツイート数 */
  tweetCount: number;
}

/**
 * 統合分析結果
 * Target QueryとReference Userの統合分析結果
 */
export interface CombinedAnalysisInsights {
  /** Target Query分析結果（オプション） */
  targetQueryInsights?: TargetQueryInsights;
  /** Reference User分析結果の配列 */
  referenceUserInsights: ReferenceUserInsights[];
  /** 全体的なテーマ */
  overallTheme: string;
  /** 投稿に活用すべきポイント */
  actionableInsights: string[];
}

/**
 * Selection Endpoint 返却型
 * selection-endpoint.ts の専用返却型
 */
export interface SelectedTweet {
  tweetId: string;                     // 選択されたツイートID
  authorId: string;                    // 作者ID
  score: number;                       // 選択スコア（0-10）
  reasoning: string;                   // 選択理由
  risks?: string[];                    // 潜在的リスク
  expectedImpact: 'high' | 'medium' | 'low';  // 期待されるインパクト
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
 * 深夜分析機能への入力型（実装予定）
 */
export interface AnalysisInput {
  analysisType: 'market' | 'performance' | 'trend';
  data: any;
  timeframe?: string;
  context?: BasicMarketContext;
}

/**
 * Selection Endpoint 入力型
 * selection-endpoint.ts への入力型
 */
export interface TweetSelectionParams {
  candidates: TweetCandidate[];        // ツイート候補リスト（最大20件）
  selectionType: 'like' | 'retweet' | 'quote_tweet' | 'follow';  // 選択目的
  criteria: {
    topic: string;                     // 関連トピック
    qualityThreshold?: number;         // 品質閾値（0-10）
    engagementWeight?: number;         // エンゲージメント重視度
    relevanceWeight?: number;          // 関連性重視度
  };
  context: {
    userProfile: AccountInfo;          // ユーザープロフィール
    learningData?: LearningData;       // 学習データ
    executionId?: string;              // 実行ID（プロンプトログ用）
  };
}

/**
 * データ分析パラメータ
 * 分析エンドポイント共通の入力パラメータ型
 */
export interface DataAnalysisParams {
  /** Target Query分析用データ（オプション） */
  targetQuery?: {
    /** 検索クエリ */
    query: string;
    /** 分析対象のツイートデータ配列 */
    tweets: TweetData[];
    /** トピック */
    topic: string;
  };
  /** Reference User分析用データ（オプション） */
  referenceUsers?: Array<{
    /** ユーザー名 */
    username: string;
    /** ユーザーのツイートデータ配列 */
    tweets: TweetData[];
  }>;
  /** システムコンテキスト（オプション） */
  context?: SystemContext;
}

/**
 * Target Query分析パラメータ
 * analyzeTargetQuery エンドポイント用の入力パラメータ
 */
export interface AnalyzeTargetQueryParams {
  /** 分析対象のツイートデータ配列 */
  tweets: TweetData[];
  /** 検索クエリ */
  query: string;
  /** トピック */
  topic: string;
  /** システムコンテキスト（オプション） */
  context?: SystemContext;
}

/**
 * Reference User分析パラメータ
 * analyzeReferenceUser エンドポイント用の入力パラメータ
 */
export interface AnalyzeReferenceUserParams {
  /** 分析対象のツイートデータ配列 */
  tweets: TweetData[];
  /** ユーザー名 */
  username: string;
  /** システムコンテキスト（オプション） */
  context?: SystemContext;
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
  realtimeContext?: boolean;  // 新規追加：リアルタイムコンテキストを重視するか
}

/**
 * ContentGenerationRequest (ContentRequestのエイリアス)
 * TASK-003: コンテンツ生成改善用
 */
export interface ContentGenerationRequest extends ContentRequest {
  contentType?: 'educational' | 'market_analysis' | 'trending' | 'announcement' | 'reply';
  targetAudience?: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * EnhancedContentRequest
 * TASK-006: 既存の型と整合性を保つための独立した型定義
 */
export interface EnhancedContentRequest {
  topic: string;
  contentType: 'educational' | 'market_analysis' | 'beginner_tips' | 'news_commentary';
  targetAudience: 'beginner' | 'intermediate' | 'general';
  maxLength?: number;
  realtimeContext?: boolean;
}

/**
 * GenerateContentParams
 * TASK-006: generateContent関数のパラメータ型
 */
export interface GenerateContentParams {
  request: EnhancedContentRequest;
  context?: SystemContext;
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

// ============================================================================
// SELECTION ENDPOINT HELPER TYPES - 選択エンドポイント用補助型
// ============================================================================

/**
 * ツイート候補データ（最小限の情報）
 */
export interface TweetCandidate {
  id: string;
  text: string;
  author_id: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
    impression_count: number;    // KaitoAPI TweetDataと一致
  };
  created_at: string;
  lang?: string;
  in_reply_to_user_id?: string;  // KaitoAPIに合わせて追加
  conversation_id?: string;      // KaitoAPIに合わせて追加
}

/**
 * アカウント情報（選択コンテキスト用）
 */
export interface AccountInfo {
  followerCount: number;
  postsToday: number;
  engagementRate: number;
  lastPostTime?: string;
}

/**
 * 学習データ（選択コンテキスト用）
 */
export interface LearningData {
  recentTopics?: string[];
  totalPatterns?: number;
  avgEngagement?: number;
}

/**
 * コンパクトなツイート候補（プロンプト最適化用）
 */
export interface CompactTweetCandidate {
  id: string;                    // ツイートID
  text: string;                  // ツイート本文（200文字まで）
  author: string;                // 作者名のみ
  metrics: {                     // エンゲージメント指標
    likes: number;
    retweets: number;
    replies: number;
  };
  relevanceScore?: number;       // 事前計算した関連性スコア
}

/**
 * コンテンツタイプ
 */
export const CONTENT_TYPES = ['educational', 'market_analysis', 'trending', 'announcement', 'reply'] as const;

/**
 * 対象読者
 */
export const TARGET_AUDIENCES = ['beginner', 'intermediate', 'advanced'] as const;

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

// ============================================================================
// PROMPT LOGGING TYPES - プロンプトログ用型定義
// ============================================================================

/**
 * プロンプトログメタデータ
 */
export interface PromptLogMetadata {
  endpoint: string;
  timestamp: string;
  execution_id: string;
  model: string;
  timeout: number;
}

/**
 * プロンプトログデータ
 */
export interface PromptLogData {
  prompt_metadata: PromptLogMetadata;
  input_context: Record<string, any>;
  system_context: SystemContext;
  full_prompt: string;
  response_metadata?: {
    content_length?: number;
    twitter_length?: number;
    quality_score?: number;
    generation_time_ms?: number;
  };
}

/**
 * プロンプトロガーインターフェース
 */
export interface PromptLogger {
  logPrompt(data: PromptLogData): Promise<void>;
}