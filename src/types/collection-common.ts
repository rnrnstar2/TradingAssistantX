/**
 * 統合コレクション結果型定義
 * CollectionResult型の重複を解決するための基本型定義
 */

// 基本メタデータ型
export interface BaseMetadata extends Record<string, any> {
  source?: string;
  category?: string;
  tags?: string[];
}

// 実行関連メタデータ
export interface ExecutionMetadata extends BaseMetadata {
  executionTime?: number;
  retryCount?: number;
  lastError?: string;
}

// 自律システム関連メタデータ
export interface AutonomousMetadata extends BaseMetadata {
  confidence?: number;
  priority?: 'high' | 'medium' | 'low';
  reasoning?: string;
}

// 収束システム関連メタデータ
export interface ConvergenceMetadata extends BaseMetadata {
  importance?: number;
  reliability?: number;
  url?: string;
}

/**
 * 基本的なCollectionResult型
 * 全てのコレクション結果の基底型として機能
 */
export interface BaseCollectionResult<T = any, M = BaseMetadata> {
  id: string;
  content: T;
  source: string;
  timestamp: number;
  metadata: M;
  status?: 'success' | 'failure' | 'timeout' | 'retry';
  errors?: string[];
}

/**
 * 汎用特化型定義
 */
export type SimpleCollectionResult = BaseCollectionResult<string, BaseMetadata>;

export type BatchCollectionResult = BaseCollectionResult<any[], ExecutionMetadata>;

export type ExecutionResult = BaseCollectionResult<any[], ExecutionMetadata>;

/**
 * 汎用CollectionResult型（後方互換性のため）
 */
export type CollectionResult = BaseCollectionResult<any, BaseMetadata>;

/**
 * 自律システム用CollectionResult
 * autonomous-system.tsで使用される特化型
 */
export interface AutonomousCollectionResult extends BaseCollectionResult<string, AutonomousMetadata> {
  type: string;
  relevanceScore: number;
  metadata: AutonomousMetadata;
}

/**
 * 収束システム用CollectionResult  
 * convergence-types.tsで使用される特化型
 */
export interface ConvergenceCollectionResult extends BaseCollectionResult<string, ConvergenceMetadata> {
  category: 'market_trend' | 'economic_indicator' | 'expert_opinion' | 'breaking_news' | 'analysis';
  importance: number;
  reliability: number;
  url: string;
  metadata: ConvergenceMetadata;
}

/**
 * 型ガード関数群
 */
export function isBaseCollectionResult(obj: any): obj is BaseCollectionResult {
  return obj && 
    typeof obj.id === 'string' &&
    obj.content !== undefined &&
    typeof obj.source === 'string' &&
    typeof obj.timestamp === 'number' &&
    obj.metadata !== undefined;
}

export function isAutonomousCollectionResult(obj: any): obj is AutonomousCollectionResult {
  return isBaseCollectionResult(obj) &&
    typeof (obj as AutonomousCollectionResult).type === 'string' &&
    typeof (obj as AutonomousCollectionResult).relevanceScore === 'number';
}

export function isConvergenceCollectionResult(obj: any): obj is ConvergenceCollectionResult {
  return isBaseCollectionResult(obj) &&
    typeof (obj as ConvergenceCollectionResult).category === 'string' &&
    typeof (obj as ConvergenceCollectionResult).importance === 'number' &&
    typeof (obj as ConvergenceCollectionResult).reliability === 'number' &&
    typeof (obj as ConvergenceCollectionResult).url === 'string';
}

/**
 * ユーティリティ関数
 */
export function createCollectionResult<T, M extends BaseMetadata>(
  id: string,
  content: T,
  source: string,
  metadata: M
): BaseCollectionResult<T, M> {
  return {
    id,
    content,
    source,
    timestamp: Date.now(),
    metadata,
    status: 'success'
  };
}

export function createAutonomousResult(
  id: string,
  content: string,
  source: string,
  type: string,
  relevanceScore: number,
  metadata: Partial<AutonomousMetadata> = {}
): AutonomousCollectionResult {
  return {
    id,
    content,
    source,
    type,
    relevanceScore,
    timestamp: Date.now(),
    metadata: {
      ...metadata,
      source,
      category: type
    },
    status: 'success'
  };
}

export function createConvergenceResult(
  id: string,
  content: string,
  source: string,
  category: ConvergenceCollectionResult['category'],
  importance: number,
  reliability: number,
  url: string,
  metadata: Partial<ConvergenceMetadata> = {}
): ConvergenceCollectionResult {
  return {
    id,
    content,
    source,
    category,
    importance,
    reliability,
    url,
    timestamp: Date.now(),
    metadata: {
      ...metadata,
      source,
      category,
      url
    },
    status: 'success'
  };
}