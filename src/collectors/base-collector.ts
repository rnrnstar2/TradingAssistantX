/**
 * 疎結合設計基底クラス
 * データソース独立性と意思決定分岐容易性を確保
 */

// Import unified collection types from new type structure
import type { 
  CollectionResult, 
  BaseCollectionResult,
  BaseMetadata
} from '../types/data-types';
import type { SystemConfig } from '../types/config-types';
import { createCollectionResult } from '../types/data-types';

// Legacy metadata type for backward compatibility
export interface CollectionMetadata extends BaseMetadata {
  timestamp: string;
  source: string;
  count: number;
  sourceType: string;
  processingTime: number;
  config?: any;
}

// 設定駆動制御インターフェース
export interface CollectorConfig {
  enabled: boolean;
  priority: number;
  timeout: number;
  retries: number;
  [key: string]: any; // 各コレクター固有の設定
}

// 意思決定分岐容易性インターフェース
export interface DecisionBranching {
  // 条件に応じた簡単分岐
  shouldCollect(context: any): boolean;
  getPriority(): number;
}

/**
 * 疎結合設計基底クラス
 * 各データソースは完全独立動作を実現
 */
export abstract class BaseCollector implements DecisionBranching {
  protected config: CollectorConfig;
  
  constructor(config: CollectorConfig) {
    this.config = config;
  }

  // 統一インターフェース - 必須実装メソッド
  abstract collect(config: any): Promise<CollectionResult>;
  
  // データソース独立性 - 必須実装メソッド
  abstract getSourceType(): string;
  abstract isAvailable(): Promise<boolean>;
  
  // 意思決定分岐容易性 - 必須実装メソッド
  abstract shouldCollect(context: any): boolean;
  abstract getPriority(): number;
  
  // 共通メソッド - 基底クラス実装
  protected validateConfig(config: any): boolean {
    return config && typeof config === 'object';
  }
  
  protected handleError(error: Error, source: string): CollectionResult {
    console.error(`[${source}] Collection error:`, error);
    return createCollectionResult(
      false,
      error.message,
      {
        ...this.createMetadata(source, 0),
        error: error.message
      },
      `${source}-${Date.now()}`,
      [],
      source
    ) as CollectionResult;
  }
  
  protected createMetadata(sourceType: string, count: number, processingTime?: number): CollectionMetadata {
    return {
      timestamp: new Date().toISOString(),
      source: sourceType,
      count,
      sourceType,
      processingTime: processingTime || 0,
      config: this.config
    };
  }
  
  // 設定駆動制御サポート
  protected isEnabled(): boolean {
    return this.config.enabled;
  }
  
  protected getTimeout(): number {
    return this.config.timeout || 10000; // デフォルト10秒
  }
  
  protected getMaxRetries(): number {
    return this.config.retries || 3; // デフォルト3回
  }
  
  // タイムアウト付きexecute
  protected async executeWithTimeout<T>(
    operation: () => Promise<T>, 
    timeoutMs?: number
  ): Promise<T> {
    const timeout = timeoutMs || this.getTimeout();
    
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }
  
  // リトライ機能付きexecute
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries?: number
  ): Promise<T> {
    const retries = maxRetries || this.getMaxRetries();
    let lastError: Error;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          console.warn(`[${this.getSourceType()}] Attempt ${attempt} failed, retrying in ${delay}ms...`);
        }
      }
    }
    
    throw lastError!;
  }
}

/**
 * アーキテクチャ実装サポート型定義
 * 
 * データソース層: BaseCollector継承クラス
 *      ↓ (統一インターフェース)
 * 収集制御層: ActionSpecificCollector
 *      ↓ (構造化データ)
 * 意思決定層: DecisionEngine
 *      ↓ (実行指示)
 * 実行層: CoreRunner
 */
export interface CollectorRegistration {
  name: string;
  collector: BaseCollector;
  config: CollectorConfig;
}

export interface CollectionContext {
  action: string;
  theme?: string;
  parameters?: any;
  timestamp: string;
}