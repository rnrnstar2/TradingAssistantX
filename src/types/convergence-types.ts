// コンテンツ収束エンジン型定義

// Import collection types from common module
import type { ConvergenceCollectionResult } from './collection-common';
// Re-export for backward compatibility
export { ConvergenceCollectionResult as CollectionResult } from './collection-common';

// 時間的関連性
export interface TimeRelevance {
  urgency: 'immediate' | 'daily' | 'weekly' | 'timeless';
  expiresAt?: number;
  peakRelevance: number; // 0-100
  timeDecayRate: number; // 0-1
}

// 核心インサイト
export interface CoreInsight {
  id: string;
  category: 'market_trend' | 'economic_indicator' | 'expert_opinion' | 'breaking_news';
  content: string;
  confidence: number; // 0-100
  impact: 'high' | 'medium' | 'low';
  sources: string[];
  timeRelevance: TimeRelevance;
  educationalValue: number; // 0-100
  uniqueness: number; // 0-100
}

// 情報パターン
export interface InformationPattern {
  id: string;
  pattern: string;
  frequency: number;
  significance: number;
  sources: string[];
  category: string;
}

// 統合されたインサイト
export interface SynthesizedInsight {
  id: string;
  synthesizedContent: string;
  sourceInsights: string[];
  confidence: number;
  consistency: number;
  addedValue: string;
}

// 矛盾データ
export interface ConflictingData {
  id: string;
  conflictingSources: CollectionResult[];
  conflictType: 'factual' | 'opinion' | 'timing' | 'magnitude';
  severity: number; // 0-100
}

// 解決されたインサイト
export interface ResolvedInsight {
  id: string;
  resolution: string;
  resolutionMethod: 'consensus' | 'authority' | 'recency' | 'evidence';
  confidence: number;
  explanation: string;
}

// 隠れた関連性
export interface ConnectionInsight {
  id: string;
  connectedInsights: string[];
  connectionType: 'causal' | 'correlative' | 'temporal' | 'thematic';
  strength: number; // 0-100
  explanation: string;
}

// 投稿構造
export interface MainPoint {
  id: string;
  content: string;
  supportingEvidence: string[];
  importance: number;
}

export interface SupportingDetail {
  id: string;
  content: string;
  sourceId: string;
  relevance: number;
}

export interface PostStructure {
  hook: string; // 読者の関心を引くオープニング
  mainPoints: MainPoint[]; // 主要ポイント
  supporting: SupportingDetail[]; // 裏付け情報
  conclusion: string; // まとめ・展望
  callToAction?: string; // 行動喚起（オプション）
}

// 物語フロー
export interface NarrativeFlow {
  id: string;
  sequence: string[];
  transitions: string[];
  coherenceScore: number;
  readabilityScore: number;
}

// 拡張コンテンツ
export interface EnhancedContent {
  content: string;
  explanations: Record<string, string>; // 専門用語 -> 説明
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readingTime: number;
}

// エンゲージング要素
export interface EngagingContent {
  content: string;
  hooks: string[];
  callToActions: string[];
  interactiveElements: string[];
  engagementScore: number;
}

// 価値最適化コンテンツ
export interface EducationallyEnhanced {
  content: string;
  learningPoints: string[];
  practicalTips: string[];
  educationalValue: number;
}

export interface PracticallyEnhanced {
  content: string;
  actionableAdvice: string[];
  realWorldExamples: string[];
  practicalityScore: number;
}

export interface UniqueContent {
  content: string;
  uniqueAngles: string[];
  differentiators: string[];
  uniquenessScore: number;
}

// 市場コンテキスト
export interface MarketContext {
  currentTrend: 'bullish' | 'bearish' | 'sideways';
  volatility: 'high' | 'medium' | 'low';
  majorEvents: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  timeframe: 'intraday' | 'daily' | 'weekly' | 'monthly';
}

export interface TimelyContent {
  content: string;
  timelinessScore: number;
  expirationTime?: number;
  contextualRelevance: string[];
}

// 重要度スコアリング
export interface ImportanceScoring {
  marketImpactScore: (info: CollectionResult) => number;
  educationalValueScore: (info: CollectionResult) => number;
  noveltyScore: (info: CollectionResult, existing: CollectionResult[]) => number;
  timelinesScore: (info: CollectionResult) => number;
}

// ランク付けされた情報
export interface RankedInformation {
  item: CollectionResult;
  compositeScore: number;
  rankPosition: number;
  scoringBreakdown: {
    marketImpact: number;
    educationalValue: number;
    novelty: number;
    timeliness: number;
  };
}

// 相乗効果分析
export interface SynergyAnalysis {
  combinations: {
    items: string[];
    synergyScore: number;
    combinedValue: number;
  }[];
  optimalCombination: string[];
  totalSynergyGain: number;
}

// 情報クラスター
export interface InformationCluster {
  topic: string;
  items: CollectionResult[];
  centralTheme: string;
  confidence: number;
  importance: number;
}

// 統合された情報
export interface IntegratedInformation {
  cluster: InformationCluster;
  integratedContent: string;
  keyTakeaways: string[];
  qualityScore: number;
}

// 統合品質
export interface IntegrationQuality {
  consistency: number; // 0-100
  completeness: number; // 0-100
  coherence: number; // 0-100
  addedValue: number; // 0-100
  overallScore: number; // 0-100
}

// ストーリーテリングテンプレート
export interface StorytellingTemplate {
  marketTrend: {
    hook: string;
    context: string;
    analysis: string;
    implications: string;
    conclusion: string;
  };
  economicIndicator: {
    indicator: string;
    result: string;
    analysis: string;
    marketReaction: string;
    outlook: string;
  };
  expertSynthesis: {
    consensus: string;
    dissenting: string;
    analysis: string;
    implications: string;
  };
}

// 完成ストーリー
export interface CompletedStory {
  template: keyof StorytellingTemplate;
  filledSections: Record<string, string>;
  coherenceScore: number;
  completeness: number;
}

// 自然言語投稿
export interface NaturalLanguagePost {
  content: string;
  readabilityScore: number;
  naturalness: number;
  engagement: number;
}

// 投稿フォーマット
export interface PostFormat {
  twitter: {
    maxLength: 280;
    hashtags: string[];
    mentions?: string[];
    mediaAttachment?: boolean;
  };
  thread: {
    posts: string[];
    continuityMarkers: string[];
    summaryPost: string;
  };
}

export interface PostRequirements {
  maxLength?: number;
  format: 'single' | 'thread';
  includeHashtags: boolean;
  includeCallToAction: boolean;
  targetAudience: 'beginner' | 'intermediate' | 'advanced';
}

export interface AdaptedContent {
  content: string;
  originalLength: number;
  adaptedLength: number;
  compressionRatio: number;
  qualityRetention: number;
}

export interface EnhancedPost {
  content: string;
  engagementElements: string[];
  projectedEngagement: number;
  viralPotential: number;
}

// 品質評価
export interface QualityMetrics {
  factualAccuracy: number; // 0-100
  readability: number; // 0-100
  educationalValue: number; // 0-100
  uniqueness: number; // 0-100
  engagement: number; // 0-100
  timeliness: number; // 0-100
}

export interface QualityScore {
  overall: number; // 0-100
  breakdown: QualityMetrics;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
}

export interface QualityAssessment {
  score: QualityScore;
  passesMinimumStandards: boolean;
  improvements: string[];
  strengths: string[];
  weaknesses: string[];
}

// 品質基準
export interface QualityStandards {
  required: QualityMetrics;
  preferred: QualityMetrics;
  excellence: QualityMetrics;
}

// ファクトチェック
export interface FactCheckResult {
  verified: boolean;
  confidence: number;
  sources: string[];
  potentialIssues: string[];
}

// 読みやすさ評価
export interface ReadabilityScore {
  score: number; // 0-100
  level: 'very_easy' | 'easy' | 'fairly_easy' | 'standard' | 'fairly_difficult' | 'difficult' | 'very_difficult';
  recommendations: string[];
}

// 価値メトリクス
export interface ValueMetrics {
  educational: number;
  practical: number;
  entertainment: number;
  uniqueness: number;
  timeliness: number;
  overall: number;
}

// 品質改善
export interface WeakArea {
  area: keyof QualityMetrics;
  currentScore: number;
  targetScore: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface ImprovementSuggestion {
  area: keyof QualityMetrics;
  suggestion: string;
  expectedImprovement: number;
  implementation: 'automatic' | 'manual' | 'hybrid';
}

export interface ImprovedPost {
  original: ConvergedPost;
  improved: ConvergedPost;
  improvements: ImprovementSuggestion[];
  qualityGain: number;
}

// システム統合
export interface ProcessedData {
  data: CollectionResult[];
  processingTime: number;
  dataQuality: number;
  readyForConvergence: boolean;
}

export interface ResourceConstraints {
  maxProcessingTime: number;
  maxMemoryUsage: number;
  maxApiCalls: number;
  priorityLevel: 'high' | 'medium' | 'low';
}

export interface ConstrainedExecution {
  originalPlan: ExecutionPlan;
  adjustedPlan: ExecutionPlan;
  tradeOffs: string[];
  expectedQuality: number;
}

export interface ExecutionPlan {
  steps: string[];
  estimatedTime: number;
  resourceUsage: Record<string, number>;
  qualityTarget: number;
}

// 投稿指示
export interface PostingInstruction {
  content: string;
  timing: 'immediate' | 'scheduled';
  scheduledTime?: number;
  hashtags: string[];
  mentions: string[];
  mediaUrls?: string[];
}

// 適応機能
export interface AdaptedPost {
  original: ConvergedPost;
  adapted: ConvergedPost;
  adaptationReason: string;
  contextualChanges: string[];
}

export interface UserReaction {
  type: 'like' | 'retweet' | 'reply' | 'quote' | 'view';
  timestamp: number;
  userId?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface LearningUpdate {
  insights: string[];
  patternChanges: string[];
  qualityAdjustments: Record<string, number>;
  confidenceUpdate: number;
}

export interface PostHistory {
  posts: ConvergedPost[];
  performance: Record<string, UserReaction[]>;
  learnings: LearningUpdate[];
}

export interface QualityImprovementPlan {
  currentAverage: number;
  targetAverage: number;
  improvements: ImprovementSuggestion[];
  timeline: string;
}

// メイン収束結果
export interface ConvergedPost {
  id: string;
  content: string;
  metadata: {
    sourceCount: number;
    processingTime: number;
    qualityScore: QualityScore;
    confidence: number;
    category: PostCategory;
  };
  insights: CoreInsight[];
  structure: PostStructure;
  alternatives?: AlternativePost[];
}

export type PostCategory = 
  | 'market_analysis' 
  | 'economic_update' 
  | 'expert_synthesis' 
  | 'breaking_news' 
  | 'educational_content'
  | 'trading_strategy'
  | 'risk_management'
  | 'market_psychology';

export interface AlternativePost {
  id: string;
  content: string;
  variant: 'shorter' | 'longer' | 'different_angle' | 'simpler' | 'advanced';
  qualityScore: QualityScore;
}

// 品質レポート
export interface QualityBreakdown {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  comparisonMetrics: Record<string, number>;
}

export interface QualityComparison {
  current: QualityScore;
  previous: QualityScore;
  trend: 'improving' | 'stable' | 'declining';
  significantChanges: string[];
}

export interface QualityReport {
  overall: QualityScore;
  breakdown: QualityBreakdown;
  improvements: ImprovementSuggestion[];
  comparisonWithPrevious?: QualityComparison;
}

// パフォーマンス指標
export interface ConvergencePerformanceMetrics {
  processingTime: number;
  memoryUsage: number;
  apiCalls: number;
  cacheHitRate: number;
  errorRate: number;
}

// システムヘルス
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  performance: ConvergencePerformanceMetrics;
  issues: string[];
  recommendations: string[];
}

// 設定定数
export const QUALITY_STANDARDS: QualityStandards = {
  required: {
    factualAccuracy: 90,
    readability: 80,
    educationalValue: 75,
    uniqueness: 70,
    engagement: 60,
    timeliness: 70
  },
  preferred: {
    factualAccuracy: 95,
    readability: 90,
    educationalValue: 85,
    uniqueness: 80,
    engagement: 75,
    timeliness: 85
  },
  excellence: {
    factualAccuracy: 98,
    readability: 95,
    educationalValue: 90,
    uniqueness: 85,
    engagement: 80,
    timeliness: 90
  }
};