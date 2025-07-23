/**
 * ActionSpecificCollector - 疎結合設計の核心コンポーネント
 * 
 * 責務:
 * - 実行時コンテキストに基づく最適なコレクターの動的選択
 * - Strategy Patternによる収集戦略の動的切り替え
 * - 並列実行・リソース管理・フォールバック機構
 * - REQUIREMENTS.mdで定義されたアーキテクチャの完全実装
 */

import { BaseCollector, CollectionContext } from './base-collector.js';
import { XDataCollector, createXDataCollectorFromEnv } from './x-data-collector.js';
// import { PlaywrightAccountCollector, PlaywrightAccountConfig } from './playwright-account.js'; // x-data-collectorに移行
import type { 
  CollectionResult, 
  MarketCondition,
  LegacyCollectionResult
} from '../types/data-types';
import { toLegacyResult, createCollectionResult } from '../types/data-types';
import { Logger } from '../utils/logger.js';

// ============================================================================
// CONFIGURATION INTERFACES - 設定関連型定義
// ============================================================================

export interface CollectionStrategyConfig {
  strategies: {
    rss_focused: { enabled: boolean; priority: number };
    multi_source: { enabled: boolean; priority: number };
    account_analysis: { enabled: boolean; priority: number };
    x_api_focused: { enabled: boolean; priority: number };
    x_search_focused: { enabled: boolean; priority: number };
  };
}

// ============================================================================
// CORE INTERFACES - ActionSpecificCollector専用型定義
// ============================================================================

export enum CollectorType {
  RSS = 'rss',
  X_DATA_COLLECTOR = 'x-data-collector',
  // PLAYWRIGHT_ACCOUNT = 'account', // x-data-collectorに移行
  // 将来拡張用
  // API = 'api',
  // COMMUNITY = 'community'
}

export interface AccountStatus {
  followerCount: number;
  engagement: 'low' | 'medium' | 'high';
  lastAnalysis: number; // timestamp
  significantChange: boolean;
  themeConsistency: number;
  followerGrowth: number;
}

export interface TimeContext {
  currentHour: number;
  marketSession: 'tokyo' | 'london' | 'newyork' | 'overlap' | 'quiet';
  dayOfWeek: number;
  isWeekend: boolean;
}

export interface CollectorSelectionCriteria {
  context: CollectionContext;
  accountStatus: AccountStatus;
  marketCondition: MarketCondition;
  timeContext: TimeContext;
  strategy: string;
  priority: number;
}

export interface SelectedCollectors {
  primary: BaseCollector[];
  fallback: BaseCollector[];
  reasoning: string;
  expectedDuration: number;
}

// ============================================================================
// STRATEGY PATTERN INTERFACES - 戦略パターン実装
// ============================================================================

export interface CollectionStrategyInterface {
  name: string;
  description: string;
  execute(context: CollectionContext): Promise<LegacyCollectionResult>;
  isApplicable(criteria: CollectorSelectionCriteria): boolean;
  getPriority(): number;
}


export interface FallbackChain {
  primary: CollectionStrategyInterface;
  fallbacks: CollectionStrategyInterface[];
  conditions: FallbackCondition[];
}

export interface FallbackCondition {
  errorTypes: string[];
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential';
}

// ============================================================================
// STRATEGY IMPLEMENTATIONS - 具体的戦略実装
// ============================================================================

/**
 * RSS集中戦略 - 削除予定（X API移行のため一時的に無効化）
 */
export class RSSFocusedStrategy implements CollectionStrategyInterface {
  name = 'rss_focused';
  description = 'RSS削除により一時的に無効化 - X API実装待ち';
  
  private logger: Logger;
  // RSS collector removed for MVP simplification
  
  constructor() {
    this.logger = new Logger('RSSFocusedStrategy');
    // RSS collector removed - awaiting X API implementation
  }
  
  async execute(context: CollectionContext): Promise<LegacyCollectionResult> {
    this.logger.info('RSS戦略一時無効化', { context });
    
    return this.createEmptyResult('rss_collector_removed_awaiting_x_api');
  }
  
  isApplicable(criteria: CollectorSelectionCriteria): boolean {
    return (
      criteria.accountStatus.engagement === 'low' ||
      criteria.accountStatus.themeConsistency < 0.8 ||
      criteria.marketCondition.volatility < 0.5 ||
      criteria.strategy === 'rss_focused'
    );
  }
  
  getPriority(): number {
    return 1; // 最高優先度（MVP戦略）
  }
  
  private shouldRunAccountAnalysis(context: CollectionContext): boolean {
    // 24時間に1回程度の頻度
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    // timestampがstringの場合も考慮
    const contextTime = typeof context.timestamp === 'number' ? context.timestamp : new Date(context.timestamp).getTime();
    const lastAnalysis = contextTime - dayInMs;
    return Math.random() < 0.1 || now > lastAnalysis;
  }
  
  private createEmptyResult(reason: string): LegacyCollectionResult {
    const baseMetadata = {
      timestamp: new Date().toISOString(),
      source: reason,
      count: 0,
      sourceType: reason,
      processingTime: 0
    };
    
    const result = createCollectionResult(
      true,
      `Empty result: ${reason}`,
      baseMetadata,
      `empty-${Date.now()}`,
      [],
      reason
    );
    
    return toLegacyResult(result);
  }
  
  private combineResults(results: PromiseSettledResult<LegacyCollectionResult>[], strategyName: string): LegacyCollectionResult {
    const combinedData: any[] = [];
    let totalProcessingTime = 0;
    let hasErrors = false;
    let errorMessage = '';
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        combinedData.push(...result.value.data);
        totalProcessingTime += result.value.metadata.processingTime || 0;
        if (!result.value.success) {
          hasErrors = true;
          errorMessage += result.value.error + '; ';
        }
      } else {
        hasErrors = true;
        errorMessage += `Result ${index} failed: ${result.reason}; `;
      }
    });
    
    const baseMetadata = {
      timestamp: new Date().toISOString(),
      source: strategyName,
      count: combinedData.length,
      sourceType: strategyName,
      processingTime: totalProcessingTime,
      config: { strategy: strategyName } as any
    };
    
    const result = createCollectionResult(
      !hasErrors,
      hasErrors ? errorMessage.trim() : `Combined ${combinedData.length} results`,
      baseMetadata,
      `combined-${Date.now()}`,
      combinedData,
      strategyName
    );
    
    const legacyResult = toLegacyResult(result);
    if (hasErrors) {
      legacyResult.error = errorMessage.trim();
    }
    
    return legacyResult;
  }
}

/**
 * 複数ソース戦略 - RSS削除により一時的に無効化
 */
export class MultiSourceStrategy implements CollectionStrategyInterface {
  name = 'multi_source';
  description = 'RSS削除により一時的に無効化 - X API実装待ち';
  
  private logger: Logger;
  // RSS removed for MVP simplification
  
  constructor() {
    this.logger = new Logger('MultiSourceStrategy');
    // RSS collector removed - awaiting X API implementation
  }
  
  async execute(context: CollectionContext): Promise<LegacyCollectionResult> {
    this.logger.info('複数ソース戦略一時無効化', { context });
    
    return this.createEmptyResult('multi_source_strategy_disabled_awaiting_x_api');
  }
  
  isApplicable(criteria: CollectorSelectionCriteria): boolean {
    return (
      criteria.accountStatus.engagement === 'medium' &&
      criteria.accountStatus.followerCount > 1000 &&
      criteria.marketCondition.volatility >= 0.8
    );
  }
  
  getPriority(): number {
    return 2;
  }
  
  private createEmptyResult(reason: string): LegacyCollectionResult {
    const baseMetadata = {
      timestamp: new Date().toISOString(),
      source: reason,
      count: 0,
      sourceType: reason,
      processingTime: 0
    };
    
    const result = createCollectionResult(
      true,
      `Empty result: ${reason}`,
      baseMetadata,
      `empty-${Date.now()}`,
      [],
      reason
    );
    
    return toLegacyResult(result);
  }
  
  private combineResults(results: PromiseSettledResult<LegacyCollectionResult>[], strategyName: string): LegacyCollectionResult {
    // RSSFocusedStrategyと同じロジック
    const combinedData: any[] = [];
    let totalProcessingTime = 0;
    let hasErrors = false;
    let errorMessage = '';
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        combinedData.push(...result.value.data);
        totalProcessingTime += result.value.metadata.processingTime || 0;
        if (!result.value.success) {
          hasErrors = true;
          errorMessage += result.value.error + '; ';
        }
      } else {
        hasErrors = true;
        errorMessage += `Result ${index} failed: ${result.reason}; `;
      }
    });
    
    const baseMetadata = {
      timestamp: new Date().toISOString(),
      source: strategyName,
      count: combinedData.length,
      sourceType: strategyName,
      processingTime: totalProcessingTime,
      config: { strategy: strategyName } as any
    };
    
    const result = createCollectionResult(
      !hasErrors,
      hasErrors ? errorMessage.trim() : `Combined ${combinedData.length} results`,
      baseMetadata,
      `combined-${Date.now()}`,
      combinedData,
      strategyName
    );
    
    const legacyResult = toLegacyResult(result);
    if (hasErrors) {
      legacyResult.error = errorMessage.trim();
    }
    
    return legacyResult;
  }
}

/**
 * X API集中戦略 - X APIによるタイムライン・データ収集
 */
export class XAPIFocusedStrategy implements CollectionStrategyInterface {
  name = 'x_api_focused';
  description = 'X API v2を使用したタイムライン・データ収集戦略';
  
  private logger: Logger;
  private xDataCollector: XDataCollector;
  
  constructor() {
    this.logger = new Logger('XAPIFocusedStrategy');
    try {
      this.xDataCollector = createXDataCollectorFromEnv();
    } catch (error) {
      this.logger.error('XDataCollector初期化エラー', error);
      throw error;
    }
  }
  
  async execute(context: CollectionContext): Promise<LegacyCollectionResult> {
    this.logger.info('X API集中戦略開始', { context });
    
    try {
      const config = {
        action: 'timeline',
        userId: context.parameters?.userId,
        ...context.parameters
      };
      
      const result = await this.xDataCollector.collect(config);
      return toLegacyResult(result);
    } catch (error) {
      this.logger.error('X API集中戦略エラー', error);
      throw error;
    }
  }
  
  isApplicable(criteria: CollectorSelectionCriteria): boolean {
    return (
      criteria.accountStatus.engagement === 'high' ||
      criteria.marketCondition.volatility >= 0.8 ||
      criteria.strategy === 'x_api_focused'
    );
  }
  
  getPriority(): number {
    return 1; // 最高優先度
  }
}

/**
 * X API検索戦略 - X APIによる検索・分析機能
 */
export class XSearchFocusedStrategy implements CollectionStrategyInterface {
  name = 'x_search_focused';
  description = 'X API v2を使用した検索・エンゲージメント分析戦略';
  
  private logger: Logger;
  private xDataCollector: XDataCollector;
  
  constructor() {
    this.logger = new Logger('XSearchFocusedStrategy');
    try {
      this.xDataCollector = createXDataCollectorFromEnv();
    } catch (error) {
      this.logger.error('XDataCollector初期化エラー', error);
      throw error;
    }
  }
  
  async execute(context: CollectionContext): Promise<LegacyCollectionResult> {
    this.logger.info('X API検索戦略開始', { context });
    
    try {
      // 複数のアクションを並列実行
      const actions = [
        { action: 'search', query: '投資 初心者 -is:retweet lang:ja' },
        { action: 'search', query: '株式 投資 -is:retweet lang:ja' },
        { action: 'trends', location: 'Japan' }
      ];
      
      const results = await Promise.allSettled(
        actions.map(config => this.xDataCollector.collect(config))
      );
      
      return this.combineResults(results, 'x_search_focused');
    } catch (error) {
      this.logger.error('X API検索戦略エラー', error);
      throw error;
    }
  }
  
  isApplicable(criteria: CollectorSelectionCriteria): boolean {
    return (
      criteria.accountStatus.themeConsistency < 0.7 ||
      (criteria.marketCondition.volatility >= 0.5 && criteria.marketCondition.volatility < 0.8) ||
      criteria.strategy === 'x_search_focused'
    );
  }
  
  getPriority(): number {
    return 2;
  }
  
  private combineResults(results: PromiseSettledResult<CollectionResult>[], strategyName: string): LegacyCollectionResult {
    const combinedData: any[] = [];
    let totalProcessingTime = 0;
    let hasErrors = false;
    let errorMessage = '';
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (Array.isArray(result.value.content)) {
          combinedData.push(...result.value.content);
        } else {
          combinedData.push(result.value.content);
        }
        totalProcessingTime += result.value.metadata.processingTime || 0;
        if (!result.value.success) {
          hasErrors = true;
          errorMessage += result.value.message + '; ';
        }
      } else {
        hasErrors = true;
        errorMessage += `Result ${index} failed: ${result.reason}; `;
      }
    });
    
    const baseMetadata = {
      timestamp: new Date().toISOString(),
      source: strategyName,
      count: combinedData.length,
      sourceType: strategyName,
      processingTime: totalProcessingTime,
      config: { strategy: strategyName } as any
    };
    
    const result = createCollectionResult(
      !hasErrors,
      hasErrors ? errorMessage.trim() : `Combined ${combinedData.length} results`,
      baseMetadata,
      `combined-${Date.now()}`,
      combinedData,
      strategyName
    );
    
    const legacyResult = toLegacyResult(result);
    if (hasErrors) {
      legacyResult.error = errorMessage.trim();
    }
    
    return legacyResult;
  }
}

/**
 * アカウント分析戦略 - 自己分析優先
 */
export class AccountAnalysisStrategy implements CollectionStrategyInterface {
  name = 'account_analysis';
  description = '自アカウント分析を優先する戦略';
  
  private logger: Logger;
  // private accountCollector: PlaywrightAccountCollector; // x-data-collectorに移行
  
  constructor() {
    this.logger = new Logger('AccountAnalysisStrategy');
    // PlaywrightAccountCollectorはx-data-collectorに移行
    // this.accountCollector = new PlaywrightAccountCollector({
    //   enabled: true,
    //   priority: 5,
    //   timeout: 30000,
    //   retries: 3,
    //   analysisDepth: 10,
    //   metrics: ['posts', 'engagement'],
    //   maxHistoryDays: 7,
    //   includeMetrics: true
    // } as PlaywrightAccountConfig);
  }
  
  async execute(context: CollectionContext): Promise<LegacyCollectionResult> {
    this.logger.info('アカウント分析戦略開始', { context });
    
    try {
      // アカウント分析はx-data-collectorで実行
      // const result = await this.accountCollector.collect(context as any);
      // return toLegacyResult(result);
      return this.createEmptyResult('account_analysis_moved_to_x-data-collector');
    } catch (error) {
      this.logger.error('アカウント分析戦略エラー', error);
      throw error;
    }
  }
  
  isApplicable(criteria: CollectorSelectionCriteria): boolean {
    const lastAnalysis = Date.now() - criteria.accountStatus.lastAnalysis;
    const dayInMs = 24 * 60 * 60 * 1000;
    
    return (
      lastAnalysis > dayInMs ||
      criteria.accountStatus.significantChange ||
      criteria.strategy === 'account_analysis'
    );
  }
  
  getPriority(): number {
    return 3;
  }
  
  private createEmptyResult(reason: string): LegacyCollectionResult {
    const baseMetadata = {
      timestamp: new Date().toISOString(),
      source: reason,
      count: 0,
      sourceType: reason,
      processingTime: 0
    };
    
    const result = createCollectionResult(
      true,
      `Empty result: ${reason}`,
      baseMetadata,
      `empty-${Date.now()}`,
      [],
      reason
    );
    
    return toLegacyResult(result);
  }
}

// ============================================================================
// MAIN ACTIONSPECIFICCOLLECTOR CLASS - メインクラス
// ============================================================================

export class ActionSpecificCollector {
  private static instance: ActionSpecificCollector;
  private collectors: Map<CollectorType, any> = new Map();
  private strategies: Map<string, any> = new Map();
  private logger: Logger;
  private config!: CollectionStrategyConfig;
  
  private constructor() {
    this.logger = new Logger('ActionSpecificCollector');
    
    this.loadConfiguration();
    this.initializeCollectors();
    this.initializeStrategies();
  }
  
  public static getInstance(): ActionSpecificCollector {
    if (!ActionSpecificCollector.instance) {
      ActionSpecificCollector.instance = new ActionSpecificCollector();
    }
    return ActionSpecificCollector.instance;
  }
  
  // ============================================================================
  // INITIALIZATION METHODS - 初期化メソッド
  // ============================================================================
  
  private initializeCollectors(): void {
    try {
      this.collectors = new Map<CollectorType, any>([
        [CollectorType.X_DATA_COLLECTOR, createXDataCollectorFromEnv()],
        // RSS collector removed for MVP simplification
        // PlaywrightAccountCollectorはx-data-collectorに移行
        // 将来の拡張用プレースホルダー
        // [CollectorType.API, new APICollector()],
        // [CollectorType.COMMUNITY, new CommunityCollector()],
      ]);
      
      this.logger.info('コレクター初期化完了 (X API追加)', { 
        count: this.collectors.size,
        types: Array.from(this.collectors.keys())
      });
    } catch (error) {
      this.logger.error('XDataCollector初期化エラー - 環境変数を確認してください', error);
      // フォールバック: 空のマップで継続
      this.collectors = new Map<CollectorType, any>();
    }
  }
  
  private initializeStrategies(): void {
    try {
      this.strategies = new Map<string, any>([
        ['x_api_focused', new XAPIFocusedStrategy()],
        ['x_search_focused', new XSearchFocusedStrategy()],
        ['rss_focused', new RSSFocusedStrategy()],
        ['multi_source', new MultiSourceStrategy()],
        ['account_analysis', new AccountAnalysisStrategy()],
      ]);
      
      this.logger.info('戦略初期化完了 (X API戦略追加)', { 
        count: this.strategies.size,
        strategies: Array.from(this.strategies.keys())
      });
    } catch (error) {
      this.logger.error('戦略初期化エラー', error);
      // フォールバック: 既存戦略のみ
      this.strategies = new Map<string, any>([
        ['rss_focused', new RSSFocusedStrategy()],
        ['multi_source', new MultiSourceStrategy()],
        ['account_analysis', new AccountAnalysisStrategy()],
      ]);
    }
  }
  
  private loadConfiguration(): void {
    // Static configuration - no external dependencies
    this.config = {
      strategies: {
        x_api_focused: { enabled: true, priority: 1 },
        x_search_focused: { enabled: true, priority: 2 },
        rss_focused: { enabled: false, priority: 4 }, // RSS削除により無効化
        multi_source: { enabled: false, priority: 5 }, // RSS削除により無効化
        account_analysis: { enabled: true, priority: 3 }
      }
    };
    
    this.logger.info('Using X API priority collection strategy configuration');
  }
  
  // ============================================================================
  // PUBLIC API METHODS - 公開APIメソッド
  // ============================================================================
  
  /**
   * 動的コレクター選択
   */
  public async selectCollectors(criteria: CollectorSelectionCriteria): Promise<SelectedCollectors> {
    this.logger.info('コレクター選択開始', { criteria });
    
    const startTime = Date.now();
    
    try {
      // 利用可能な戦略を評価
      const applicableStrategies = await this.evaluateStrategies(criteria);
      
      if (applicableStrategies.length === 0) {
        throw new Error('適用可能な戦略が見つかりません');
      }
      
      // 最適戦略を選択
      const selectedStrategy = this.selectOptimalStrategy(applicableStrategies, criteria);
      
      // コレクター組み合わせを決定
      const collectors = this.determineCollectorCombination(selectedStrategy, criteria);
      
      const result: SelectedCollectors = {
        primary: collectors.primary,
        fallback: collectors.fallback,
        reasoning: this.generateSelectionReasoning(selectedStrategy, criteria),
        expectedDuration: 60000 // デフォルト60秒
      };
      
      const selectionTime = Date.now() - startTime;
      this.logger.info('コレクター選択完了', { 
        strategy: selectedStrategy.name,
        selectionTime,
        primaryCount: result.primary.length,
        fallbackCount: result.fallback.length
      });
      
      return result;
    } catch (error) {
      this.logger.error('コレクター選択エラー', error as Error);
      throw error;
    }
  }
  
  /**
   * 戦略実行
   */
  public async executeStrategy(strategyName: string, context: CollectionContext): Promise<LegacyCollectionResult> {
    this.logger.info('戦略実行開始', { strategyName, context });
    
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`戦略が見つかりません: ${strategyName}`);
    }
    
    const startTime = Date.now();
    
    try {
      // 戦略実行（60秒タイムアウト）
      const result = await this.executeWithTimeout(
        () => strategy.execute(context),
        60000
      );
      
      const executionTime = Date.now() - startTime;
      
      const typedResult = result as LegacyCollectionResult;
      this.logger.success('戦略実行完了', { 
        strategyName, 
        executionTime,
        dataCount: typedResult.data.length,
        success: typedResult.success
      });
      
      return typedResult;
    } catch (error) {
      this.logger.error('戦略実行エラー', { strategyName, error });
      
      // フォールバック処理
      return await this.handleFallback(error as Error, strategyName, context);
    }
  }
  
  // ============================================================================
  // PRIVATE IMPLEMENTATION METHODS - プライベート実装メソッド
  // ============================================================================
  
  private async evaluateStrategies(criteria: CollectorSelectionCriteria): Promise<CollectionStrategyInterface[]> {
    const applicableStrategies: CollectionStrategyInterface[] = [];
    
    for (const [name, strategy] of Array.from(this.strategies)) {
      try {
        if (await this.isStrategyEnabled(name) && strategy.isApplicable(criteria)) {
          applicableStrategies.push(strategy);
        }
      } catch (error) {
        this.logger.warn(`戦略評価エラー: ${name}`, error);
      }
    }
    
    return applicableStrategies.sort((a, b) => a.getPriority() - b.getPriority());
  }
  
  private async isStrategyEnabled(strategyName: string): Promise<boolean> {
    const strategyConfig = this.config.strategies[strategyName as keyof typeof this.config.strategies];
    if (!strategyConfig) {
      return true; // デフォルトで有効
    }
    return strategyConfig.enabled !== false;
  }
  
  private selectOptimalStrategy(strategies: CollectionStrategyInterface[], criteria: CollectorSelectionCriteria): CollectionStrategyInterface {
    // 優先度とリソースコストを考慮して最適戦略を選択
    let bestStrategy = strategies[0];
    let bestScore = this.calculateStrategyScore(bestStrategy, criteria);
    
    for (let i = 1; i < strategies.length; i++) {
      const score = this.calculateStrategyScore(strategies[i], criteria);
      if (score > bestScore) {
        bestScore = score;
        bestStrategy = strategies[i];
      }
    }
    
    return bestStrategy;
  }
  
  private calculateStrategyScore(strategy: CollectionStrategyInterface, criteria: CollectorSelectionCriteria): number {
    const priorityScore = (10 - strategy.getPriority()) * 0.6; // 優先度が高いほど高スコア
    const contextScore = this.calculateContextScore(strategy, criteria) * 0.4;
    
    return priorityScore + contextScore;
  }
  
  private calculateContextScore(strategy: CollectionStrategyInterface, criteria: CollectorSelectionCriteria): number {
    // コンテキストとの適合度を評価
    let score = 5; // 基本スコア
    
    // X API戦略の評価
    if (strategy.name === 'x_api_focused') {
      if (criteria.accountStatus.engagement === 'high') score += 4;
      if (criteria.marketCondition.volatility >= 0.8) score += 3;
    }
    if (strategy.name === 'x_search_focused') {
      if (criteria.accountStatus.themeConsistency < 0.7) score += 3;
      if (criteria.marketCondition.volatility >= 0.5 && criteria.marketCondition.volatility < 0.8) score += 2;
    }
    
    // 既存戦略の評価（無効化されているが保持）
    if (strategy.name === 'rss_focused' && criteria.accountStatus.engagement === 'low') {
      score += 1; // RSS削除により低下
    }
    if (strategy.name === 'multi_source' && criteria.marketCondition.volatility >= 0.8) {
      score += 1; // RSS削除により低下
    }
    if (strategy.name === 'account_analysis') {
      const lastAnalysis = Date.now() - criteria.accountStatus.lastAnalysis;
      const dayInMs = 24 * 60 * 60 * 1000;
      if (lastAnalysis > dayInMs) {
        score += 4;
      }
    }
    
    return Math.min(10, score);
  }
  
  private determineCollectorCombination(strategy: CollectionStrategyInterface, criteria: CollectorSelectionCriteria): { primary: BaseCollector[], fallback: BaseCollector[] } {
    const primary: BaseCollector[] = [];
    const fallback: BaseCollector[] = [];
    
    const xDataCollector = this.collectors.get(CollectorType.X_DATA_COLLECTOR);
    
    if (strategy.name === 'x_api_focused' || strategy.name === 'x_search_focused') {
      if (xDataCollector) {
        primary.push(xDataCollector);
      }
    } else if (strategy.name === 'account_analysis') {
      if (xDataCollector) {
        fallback.push(xDataCollector); // X APIをフォールバックとして使用
      }
    } else {
      // RSS戦略は現在利用不可
      this.logger.info('RSS戦略は現在利用不可 - X API戦略を推奨', { 
        strategy: strategy.name 
      });
    }
    
    this.logger.info('コレクター組み合わせ決定 (X API対応)', { 
      strategy: strategy.name,
      primaryCount: primary.length,
      fallbackCount: fallback.length,
      hasXAPI: !!xDataCollector
    });
    
    return { primary, fallback };
  }
  
  private generateSelectionReasoning(strategy: CollectionStrategyInterface, criteria: CollectorSelectionCriteria): string {
    const reasons = [
      `戦略: ${strategy.description}`,
      `優先度: ${strategy.getPriority()}`,
      `エンゲージメント: ${criteria.accountStatus.engagement}`,
      `市場状況: ${criteria.marketCondition.volatility}`
    ];
    
    if (criteria.accountStatus.significantChange) {
      reasons.push('アカウント変化検出');
    }
    
    return reasons.join(', ');
  }
  
  private async executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`タイムアウト: ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }
  
  private async handleFallback(error: Error, failedStrategy: string, context: CollectionContext): Promise<LegacyCollectionResult> {
    this.logger.warn('フォールバック処理開始 (X API優先)', { failedStrategy, error: error.message });
    
    // X API戦略にフォールバック
    try {
      const xApiStrategy = this.strategies.get('x_api_focused');
      if (xApiStrategy && failedStrategy !== 'x_api_focused') {
        this.logger.info('X API戦略にフォールバック実行中');
        return await xApiStrategy.execute(context);
      }
      
      // X検索戦略にフォールバック
      const xSearchStrategy = this.strategies.get('x_search_focused');
      if (xSearchStrategy && failedStrategy !== 'x_search_focused') {
        this.logger.info('X検索戦略にフォールバック実行中');
        return await xSearchStrategy.execute(context);
      }
    } catch (fallbackError) {
      this.logger.error('フォールバック処理も失敗', fallbackError);
    }
    
    // 最終フォールバック: 空の結果を返す
    const baseMetadata = {
      timestamp: new Date().toISOString(),
      source: 'fallback_empty_x_api_exhausted',
      count: 0,
      sourceType: 'fallback',
      processingTime: 0,
      config: { originalStrategy: failedStrategy, error: error.message, note: 'X API fallback exhausted' } as any
    };
    
    const result = createCollectionResult(
      false,
      `全戦略実行失敗: ${error.message}`,
      baseMetadata,
      `fallback-${Date.now()}`,
      [],
      'fallback_empty_x_api_exhausted'
    );
    
    const legacyResult = toLegacyResult(result);
    legacyResult.error = `全戦略実行失敗: ${error.message}`;
    
    return legacyResult;
  }
  
  // ============================================================================
  // UTILITY METHODS - ユーティリティメソッド
  // ============================================================================
  
  /**
   * システムヘルスチェック
   */
  public async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    collectors: Record<string, boolean>;
    strategies: Record<string, boolean>;
  }> {
    const collectors: Record<string, boolean> = {};
    const strategies: Record<string, boolean> = {};
    
    // コレクター可用性チェック
    for (const [type, collector] of Array.from(this.collectors)) {
      try {
        collectors[type] = await collector.isAvailable();
      } catch {
        collectors[type] = false;
      }
    }
    
    // 戦略有効性チェック
    for (const [name, strategy] of Array.from(this.strategies)) {
      try {
        strategies[name] = await this.isStrategyEnabled(name);
      } catch {
        strategies[name] = false;
      }
    }
    
    const healthyCollectors = Object.values(collectors).filter(Boolean).length;
    const healthyStrategies = Object.values(strategies).filter(Boolean).length;
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (healthyCollectors === 0 || healthyStrategies === 0) {
      status = 'critical';
    } else if (healthyCollectors < this.collectors.size / 2 || healthyStrategies < this.strategies.size / 2) {
      status = 'warning';
    }
    
    return {
      status,
      collectors,
      strategies
    };
  }
  
  /**
   * 設定リロード
   */
  public reloadConfiguration(): void {
    this.logger.info('設定リロード開始');
    this.loadConfiguration();
    this.logger.info('設定リロード完了');
  }
}