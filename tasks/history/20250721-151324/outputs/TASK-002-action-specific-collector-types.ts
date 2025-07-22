/**
 * ActionSpecificCollector Complete Type Definitions
 * Claude主導の目的特化型・自律的情報収集システム
 */

import type { ActionDecision, ActionType } from '../src/types/action-types.js';
import type { CollectionResult } from '../src/types/autonomous-system.js';

// ====================================================================
// CORE INTERFACES - メインインターフェース
// ====================================================================

/**
 * ActionSpecificCollector メインインターフェース
 * Claude主導のアクション特化型情報収集システム
 */
export interface ActionSpecificCollector {
  /**
   * アクション決定に基づく特化情報収集
   * @param decision - 実行予定のアクション決定
   * @returns 収集されたアクションコンテキスト
   */
  collectForAction(decision: ActionDecision): Promise<ActionContext>;
  
  /**
   * 収集サイクル実行
   * @param strategy - 収集戦略
   * @returns サイクル実行結果
   */
  executeCollectionCycle(strategy: CollectionStrategy): Promise<CycleResult>;
  
  /**
   * 情報充足度評価
   * @param data - 収集されたデータ
   * @returns 充足度スコア
   */
  evaluateInformationSufficiency(data: CollectedData): Promise<SufficiencyScore>;
}

// ====================================================================
// COLLECTION STRATEGY - 収集戦略関連
// ====================================================================

/**
 * 収集戦略定義
 * アクション型別の最適化された収集アプローチ
 */
export interface CollectionStrategy {
  readonly actionType: ActionType;
  readonly phases: CollectionPhase[];
  readonly sufficiencyThreshold: number; // 0.85 = 85%
  readonly maxCycles: number;
  readonly timeboxLimits: TimeboxLimits;
  readonly dynamicAdjustment: DynamicAdjustmentConfig;
  readonly priority: 'critical' | 'high' | 'medium' | 'low';
  readonly metadata: StrategyMetadata;
}

/**
 * 収集フェーズ定義
 */
export interface CollectionPhase {
  readonly type: 'claude' | 'playwright';
  readonly duration: number; // seconds
  readonly objective: string;
  readonly parameters: PhaseParameters;
  readonly successCriteria: SuccessCriteria;
  readonly fallbackStrategy?: FallbackStrategy;
}

/**
 * タイムボックス制限
 */
export interface TimeboxLimits {
  readonly claudePhase: number;      // 15秒
  readonly playwrightPhase: number;  // 45秒
  readonly evaluationPhase: number;  // 20秒
  readonly additionalPhase: number;  // 10秒
  readonly totalTimeout: number;     // 120秒
}

/**
 * 動的調整設定
 */
export interface DynamicAdjustmentConfig {
  readonly enabled: boolean;
  readonly adaptationRules: AdaptationRule[];
  readonly learningEnabled: boolean;
  readonly performanceThresholds: PerformanceThresholds;
}

/**
 * 適応ルール
 */
export interface AdaptationRule {
  readonly trigger: AdaptationTrigger;
  readonly action: AdaptationAction;
  readonly condition: AdaptationCondition;
  readonly weight: number; // 0.0-1.0
}

// ====================================================================
// ACTION CONTEXT - 戻り値データ構造
// ====================================================================

/**
 * アクションコンテキスト
 * 収集完了後の統合結果
 */
export interface ActionContext {
  readonly actionId: string;
  readonly actionType: ActionType;
  readonly collectedData: CollectedData;
  readonly sufficiencyScore: number;
  readonly insights: ActionInsight[];
  readonly recommendations: ActionRecommendation[];
  readonly executionReadiness: boolean;
  readonly collectionsExecuted: number;
  readonly totalExecutionTime: number;
  readonly quality: QualityMetrics;
  readonly metadata: ActionContextMetadata;
}

/**
 * 収集データ統合構造
 */
export interface CollectedData {
  readonly originalPosts?: OriginalPostData;
  readonly quoteTweets?: QuoteTweetData;
  readonly retweets?: RetweetData;
  readonly replies?: ReplyData;
  readonly marketContext?: MarketContextData;
  readonly trends?: TrendData[];
  readonly competitors?: CompetitorData[];
  readonly rawData?: RawCollectionData[];
}

/**
 * アクション洞察
 */
export interface ActionInsight {
  readonly id: string;
  readonly type: InsightType;
  readonly content: string;
  readonly confidence: number; // 0.0-1.0
  readonly evidence: Evidence[];
  readonly priority: 'critical' | 'high' | 'medium' | 'low';
  readonly actionRelevance: number; // 0.0-1.0
}

/**
 * アクション推奨
 */
export interface ActionRecommendation {
  readonly id: string;
  readonly category: RecommendationCategory;
  readonly title: string;
  readonly description: string;
  readonly impact: Impact;
  readonly urgency: 'immediate' | 'soon' | 'later';
  readonly confidence: number; // 0.0-1.0
  readonly implementation: ImplementationGuidance;
}

// ====================================================================
// ACTION-SPECIFIC DATA STRUCTURES - アクション特化型データ
// ====================================================================

/**
 * Original Post専用データ
 */
export interface OriginalPostData {
  readonly marketTrends: TrendAnalysis[];
  readonly competitorInsights: CompetitorAnalysis[];
  readonly uniqueAngles: UniqueAngle[];
  readonly contentOpportunities: ContentOpportunity[];
  readonly riskFactors: RiskFactor[];
  readonly inspirationSources: InspirationSource[];
  readonly targetAudience: AudienceInsight[];
}

/**
 * Quote Tweet専用データ
 */
export interface QuoteTweetData {
  readonly candidateTweets: CandidateTweet[];
  readonly valueAdditions: ValueAddition[];
  readonly engagementPotential: EngagementAnalysis[];
  readonly audienceAlignment: AudienceAlignment[];
  readonly commentStrategies: CommentStrategy[];
  readonly riskAssessments: QuoteRiskAssessment[];
}

/**
 * Retweet専用データ
 */
export interface RetweetData {
  readonly verifiedCandidates: VerifiedCandidate[];
  readonly credibilityScores: CredibilityScore[];
  readonly valueAssessments: ValueAssessment[];
  readonly riskEvaluations: RiskEvaluation[];
  readonly brandAlignment: BrandAlignment[];
  readonly audienceRelevance: AudienceRelevance[];
}

/**
 * Reply専用データ
 */
export interface ReplyData {
  readonly targetConversations: TargetConversation[];
  readonly engagementOpportunities: EngagementOpportunity[];
  readonly valueContributions: ValueContribution[];
  readonly relationshipPotential: RelationshipPotential[];
  readonly responseStrategies: ResponseStrategy[];
  readonly conversationContext: ConversationContext[];
}

// ====================================================================
// CYCLE MANAGEMENT - サイクル管理
// ====================================================================

/**
 * サイクル実行結果
 */
export interface CycleResult {
  readonly cycleId: string;
  readonly phaseResults: PhaseResult[];
  readonly sufficiencyAchieved: boolean;
  readonly improvementMade: boolean;
  readonly nextCycleRecommended: boolean;
  readonly executionTime: number;
  readonly dataQuality: QualityScore;
  readonly errors: ExecutionError[];
}

/**
 * フェーズ実行結果
 */
export interface PhaseResult {
  readonly phaseId: string;
  readonly phaseType: 'claude' | 'playwright';
  readonly duration: number;
  readonly success: boolean;
  readonly dataCollected: unknown;
  readonly insights: string[];
  readonly nextPhaseInstructions?: string;
  readonly performance: PhasePerformance;
  readonly errors?: PhaseError[];
}

/**
 * 充足度スコア
 */
export interface SufficiencyScore {
  readonly overall: number; // 0.0-1.0
  readonly breakdown: SufficiencyBreakdown;
  readonly gaps: InformationGap[];
  readonly recommendations: ImprovementRecommendation[];
  readonly confidence: number; // 0.0-1.0
  readonly timestamp: number;
}

/**
 * 充足度詳細
 */
export interface SufficiencyBreakdown {
  readonly dataCompleteness: number;    // データ完全性
  readonly dataQuality: number;         // データ品質
  readonly actionRelevance: number;     // アクション関連性
  readonly uniqueInsights: number;      // 独自洞察
  readonly timeliness: number;          // 時宜性
  readonly credibility: number;         // 信頼性
}

// ====================================================================
// SUPPORTING TYPES - サポート型定義
// ====================================================================

/**
 * フェーズパラメータ
 */
export interface PhaseParameters {
  readonly claude?: ClaudePhaseParameters;
  readonly playwright?: PlaywrightPhaseParameters;
  readonly common?: CommonPhaseParameters;
}

/**
 * Claude フェーズパラメータ
 */
export interface ClaudePhaseParameters {
  readonly model: 'sonnet' | 'haiku' | 'opus';
  readonly temperature: number;
  readonly maxTokens: number;
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly outputFormat: 'json' | 'text' | 'structured';
  readonly fallbackPrompts: string[];
}

/**
 * Playwright フェーズパラメータ
 */
export interface PlaywrightPhaseParameters {
  readonly targets: PlaywrightTarget[];
  readonly actions: PlaywrightAction[];
  readonly selectors: PlaywrightSelector[];
  readonly waitConditions: WaitCondition[];
  readonly extractionRules: ExtractionRule[];
  readonly rateLimiting: RateLimitConfig;
}

/**
 * 成功基準
 */
export interface SuccessCriteria {
  readonly dataQuantity: QuantityCriteria;
  readonly dataQuality: QualityCriteria;
  readonly executionTime: TimeCriteria;
  readonly errorRate: ErrorRateCriteria;
  readonly customCriteria?: CustomCriteria[];
}

/**
 * 品質メトリクス
 */
export interface QualityMetrics {
  readonly dataAccuracy: number;        // データ精度
  readonly relevanceScore: number;      // 関連性スコア
  readonly uniquenessScore: number;     // 独自性スコア
  readonly freshnessScore: number;      // 新鮮さスコア
  readonly credibilityScore: number;    // 信頼性スコア
  readonly actionabilityScore: number;  // 実行可能性スコア
}

/**
 * 情報ギャップ
 */
export interface InformationGap {
  readonly type: GapType;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly description: string;
  readonly impact: GapImpact;
  readonly suggestions: GapSuggestion[];
}

/**
 * 改善推奨
 */
export interface ImprovementRecommendation {
  readonly priority: 'immediate' | 'high' | 'medium' | 'low';
  readonly category: ImprovementCategory;
  readonly description: string;
  readonly expectedImprovement: number; // 0.0-1.0
  readonly effort: 'low' | 'medium' | 'high';
  readonly implementation: RecommendationImplementation;
}

// ====================================================================
// ENUM TYPES - 列挙型
// ====================================================================

export type InsightType = 
  | 'market_trend'
  | 'opportunity'
  | 'risk_factor'
  | 'audience_insight'
  | 'competitive_advantage'
  | 'content_strategy'
  | 'timing_optimization';

export type RecommendationCategory = 
  | 'content_strategy'
  | 'timing_optimization'
  | 'audience_targeting'
  | 'risk_mitigation'
  | 'engagement_enhancement'
  | 'quality_improvement';

export type GapType = 
  | 'data_insufficient'
  | 'quality_poor'
  | 'relevance_low'
  | 'timeliness_poor'
  | 'credibility_questionable'
  | 'insight_lacking';

export type ImprovementCategory = 
  | 'data_collection'
  | 'strategy_adjustment'
  | 'execution_optimization'
  | 'quality_enhancement'
  | 'efficiency_improvement';

export type AdaptationTrigger = 
  | 'low_sufficiency'
  | 'time_constraint'
  | 'quality_threshold'
  | 'data_scarcity'
  | 'performance_decline';

export type AdaptationAction = 
  | 'extend_collection'
  | 'change_strategy'
  | 'adjust_parameters'
  | 'fallback_mode'
  | 'emergency_stop';

// ====================================================================
// UTILITY TYPES - ユーティリティ型
// ====================================================================

/**
 * タイムスタンプ付きデータ
 */
export type Timestamped<T> = T & {
  readonly timestamp: number;
  readonly createdAt: string;
};

/**
 * 信頼度付きデータ
 */
export type WithConfidence<T> = T & {
  readonly confidence: number; // 0.0-1.0
  readonly confidenceFactors: ConfidenceFactor[];
};

/**
 * 優先度付きデータ
 */
export type Prioritized<T> = T & {
  readonly priority: 'critical' | 'high' | 'medium' | 'low';
  readonly priorityReason: string;
};

/**
 * 収集結果のブランド化型
 */
export type CollectionResultBranded = CollectionResult & {
  readonly __brand: 'ActionSpecificCollection';
  readonly actionSpecific: true;
};

// ====================================================================
// COMPLEX SUPPORTING INTERFACES - 複雑なサポートインターフェース
// ====================================================================

export interface StrategyMetadata {
  readonly version: string;
  readonly createdAt: string;
  readonly lastUpdated: string;
  readonly creator: string;
  readonly description: string;
  readonly tags: string[];
  readonly performanceHistory: PerformanceRecord[];
}

export interface ActionContextMetadata {
  readonly chainsExecuted: number;
  readonly claudeInvocations: number;
  readonly playwrightSessions: number;
  readonly dataPoints: number;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly performanceMetrics: PerformanceMetrics;
}

export interface PerformanceThresholds {
  readonly minSufficiencyScore: number;
  readonly maxExecutionTime: number;
  readonly maxErrorRate: number;
  readonly minDataQuality: number;
  readonly minRelevanceScore: number;
}

export interface AdaptationCondition {
  readonly metric: string;
  readonly operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  readonly value: number;
  readonly context?: Record<string, unknown>;
}

export interface FallbackStrategy {
  readonly trigger: FallbackTrigger;
  readonly action: FallbackAction;
  readonly parameters: Record<string, unknown>;
}

export interface Impact {
  readonly category: ImpactCategory;
  readonly magnitude: number; // 0.0-1.0
  readonly probability: number; // 0.0-1.0
  readonly timeframe: Timeframe;
  readonly dependencies: string[];
}

export interface ImplementationGuidance {
  readonly steps: ImplementationStep[];
  readonly resources: RequiredResource[];
  readonly timeline: Timeline;
  readonly risks: ImplementationRisk[];
}

// ====================================================================
// FINAL EXPORT - 最終エクスポート
// ====================================================================

/**
 * ActionSpecificCollector完全型パッケージ
 */
export interface ActionSpecificCollectorTypes {
  readonly ActionSpecificCollector: ActionSpecificCollector;
  readonly CollectionStrategy: CollectionStrategy;
  readonly ActionContext: ActionContext;
  readonly CollectedData: CollectedData;
  readonly CycleResult: CycleResult;
  readonly SufficiencyScore: SufficiencyScore;
}

// Default export for the complete type system
export default ActionSpecificCollectorTypes;