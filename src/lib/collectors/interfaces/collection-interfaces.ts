/**
 * 共通インターフェース定義
 * ActionSpecificCollector分割用の基本インターフェース
 */

import type { 
  CollectionResult, 
  IntegratedContext,
  ActionCollectionConfig,
  QualityEvaluation
} from '../../../types/autonomous-system';

/**
 * 基本コレクター インターフェース
 */
export interface BaseCollector {
  collect(context: IntegratedContext): Promise<CollectionResult[]>;
  validateConfig(): boolean;
  getCollectorType(): string;
}

/**
 * 収集戦略プロバイダー
 */
export interface CollectionStrategyProvider {
  generateStrategy(actionType: string, context: IntegratedContext): Promise<CollectionStrategy>;
  optimizeStrategy(strategy: CollectionStrategy, feedback: QualityFeedback): CollectionStrategy;
}

/**
 * 収集戦略定義
 */
export interface CollectionStrategy {
  type: 'topic_specific' | 'multi_source' | 'api_focused' | 'web_search';
  priority: number;
  sources: string[];
  parameters: Record<string, any>;
  timeout: number;
  retryAttempts: number;
  qualityThreshold: number;
}

/**
 * 品質フィードバック
 */
export interface QualityFeedback {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  dataPoints: Record<string, number>;
}

/**
 * 結果プロセッサー
 */
export interface ResultProcessor {
  processResults(results: CollectionResult[]): Promise<CollectionResult[]>;
  assessQuality(results: CollectionResult[]): QualityEvaluation;
  removeDuplicates(results: CollectionResult[]): CollectionResult[];
  enhanceContent(results: CollectionResult[]): Promise<CollectionResult[]>;
}

/**
 * コレクターレジストリ
 */
export interface CollectorRegistry {
  registerCollector(type: string, collector: BaseCollector): void;
  getCollector(type: string): BaseCollector | null;
  getAllCollectors(): BaseCollector[];
  getAvailableCollectorTypes(): string[];
}

/**
 * コレクター設定
 */
export interface CollectorConfig {
  type: string;
  enabled: boolean;
  priority: number;
  timeout: number;
  retryAttempts: number;
  parameters: Record<string, any>;
}

/**
 * 収集リクエスト
 */
export interface CollectionRequest {
  actionType: 'original_post' | 'quote_tweet' | 'retweet' | 'reply';
  topic?: string;
  context: IntegratedContext;
  targetSufficiency: number;
  strategy?: CollectionStrategy;
  collectors?: string[];
}

/**
 * 収集結果統計
 */
export interface CollectionStats {
  totalResults: number;
  uniqueResults: number;
  duplicatesRemoved: number;
  qualityScore: number;
  processingTime: number;
  sourcesUsed: string[];
  errors: Error[];
}

/**
 * コレクター実行メトリクス
 */
export interface CollectorMetrics {
  collectorType: string;
  executionTime: number;
  resultsCount: number;
  successRate: number;
  errorCount: number;
  lastExecuted: Date;
}