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
 * システムコンテキスト
 * decision-engine.ts から抽出
 */
export interface SystemContext {
  timestamp?: string;
  executionId?: string;
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
  // TypeScript互換性修正（TASK-005）: workflows/constants.tsと統一
  market?: {
    trendingTopics: string[];
    volatility: 'low' | 'medium' | 'high';
    sentiment: 'bearish' | 'neutral' | 'bullish';
  };
  learningData?: {
    recentTopics?: string[];
    totalPatterns?: number;
    avgEngagement?: number;
  };
  referenceTweets?: Array<{  // 新規追加：参考ツイート情報
    text: string;
    qualityScore?: number;
    relevanceScore?: number;
    realtimeScore?: number;
    reason?: string;
  }>;
  instruction?: string;  // 新規追加：追加指示
  // 参考アカウントの最新ツイート（オプション）
  referenceAccountTweets?: Array<{
    username: string;
    tweets: Array<{
      id: string;
      text: string;
      created_at: string;
      public_metrics?: any;
    }>;
  }>;
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