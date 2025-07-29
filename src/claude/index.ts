/**
 * TradingAssistantX Claude Code SDK - エンドポイント別設計統合
 * REQUIREMENTS.md準拠版 - Claude強み活用MVP設計
 * 
 * 提供機能:
 * - コンテンツ生成エンドポイント: generateContent(), generateQuoteComment()
 * - 分析エンドポイント: analyzePerformance(), analyzeMarketContext(), recordExecution()
 * - 検索クエリエンドポイント: generateSearchQuery(), generateRetweetQuery(), generateLikeQuery(), generateQuoteQuery()
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

// Analysis endpoint
export { 
  analyzePerformance,
  analyzeMarketContext,
  recordExecution,
  generateLearningInsights,
  getPerformanceMetrics,
  generateImprovementSuggestions
} from './endpoints/analysis-endpoint';

// Search endpoint
export { 
  generateSearchQuery,
  generateRetweetQuery,
  generateLikeQuery,
  generateQuoteQuery
} from './endpoints/search-endpoint';

// ============================================================================
// TYPE DEFINITIONS EXPORT - 型定義統合エクスポート
// ============================================================================

// Return types - 返却型
export type {
  GeneratedContent,
  AnalysisResult,
  SearchQuery
} from './types';

// Input types - 入力型
export type {
  ContentInput,
  AnalysisInput,
  SearchInput,
  RetweetSearchInput,
  LikeSearchInput,
  QuoteSearchInput
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
  SearchRequest,
  ClaudeSDKConfig,
  ClaudeSDKError,
  APIResponse
} from './types';

// Additional analysis types - 追加分析型
export type {
  MarketContext,
  MarketOpportunity,
  MarketAnalysisInput
} from './endpoints/analysis-endpoint';

// ============================================================================
// CONSTANTS & UTILITIES EXPORT - 定数・ユーティリティエクスポート
// ============================================================================

// Constants
export {
  VALID_ACTIONS,
  CONTENT_TYPES,
  TARGET_AUDIENCES,
  SEARCH_PURPOSES,
  ANALYSIS_TYPES,
  SYSTEM_LIMITS
} from './types';

// Type guards
export {
  isGeneratedContent,
  isAnalysisResult,
  isSearchQuery
} from './types';