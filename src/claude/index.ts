/**
 * TradingAssistantX Claude Code SDK - エンドポイント別設計統合
 * REQUIREMENTS.md準拠版 - Claude強み活用MVP設計
 * 
 * 提供機能:
 * - コンテンツ生成エンドポイント: generateContent(), generateQuoteComment()
 * - 分析エンドポイント: （深夜分析機能実装時に追加予定）
 * - 選択エンドポイント: selectOptimalTweet() - Claude AI を使用した最適ツイート選択
 * 
 * 設計原則:
 * - 1エンドポイント = 1つの役割
 * - 専用入力/出力型での型安全
 * - kaito-apiと同様のendpoints/構造
 */

// ============================================================================
// ENDPOINT FUNCTIONS EXPORT - エンドポイント関数エクスポート
// ============================================================================

// Content endpoint  
export { 
  generateContent,
  generateQuoteComment
} from './endpoints/content-endpoint';


// Selection endpoint
export { 
  selectOptimalTweet,
  convertTweetDataToCandidate
} from './endpoints/selection-endpoint';

// ============================================================================
// TYPE DEFINITIONS EXPORT - 型定義統合エクスポート
// ============================================================================

// Return types - 返却型
export type {
  GeneratedContent,
  AnalysisResult,
  SelectedTweet,
  TargetQueryInsights,
  ReferenceUserInsights,
  CombinedAnalysisInsights
} from './types';

// Input types - 入力型
export type {
  ContentInput,
  AnalysisInput,
  TweetSelectionParams,
  DataAnalysisParams,
  AnalyzeTargetQueryParams,
  AnalyzeReferenceUserParams
} from './types';

// Supporting types - 補助型
export type {
  SystemContext,
  BasicMarketContext,
  ExecutionRecord,
  LearningInsight,
  PerformanceMetrics,
  ContentRequest,
  TwitterContext,
  ClaudeSDKConfig,
  ClaudeSDKError,
  APIResponse,
  TweetCandidate,
  AccountInfo,
  LearningData,
  CompactTweetCandidate
} from './types';


// ============================================================================
// CONSTANTS & UTILITIES EXPORT - 定数・ユーティリティエクスポート
// ============================================================================

// Constants
export {
  VALID_ACTIONS,
  CONTENT_TYPES,
  TARGET_AUDIENCES,
  ANALYSIS_TYPES,
  SYSTEM_LIMITS
} from './types';

// Type guards
export {
  isGeneratedContent,
  isAnalysisResult,
} from './types';