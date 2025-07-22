/**
 * ActionSpecificCollector - 疎結合設計の核心コンポーネント
 * 
 * 責務:
 * - 実行時コンテキストに基づく最適なコレクターの動的選択
 * - Strategy Patternによる収集戦略の動的切り替え
 * - 並列実行・リソース管理・フォールバック機構
 * - REQUIREMENTS.mdで定義されたアーキテクチャの完全実装
 */

import { BaseCollector, CollectionResult, CollectionContext } from './base-collector.js';
import { RSSCollector } from './rss-collector.js';
import { PlaywrightAccountCollector } from './playwright-account.js';
import { 
  CollectionStrategy,
  MarketCondition,
  TimeWindow
} from '../types/collection-types.js';
import { Logger } from '../logging/logger.js';
import { YamlManager } from '../utils/yaml-manager.js';

// ============================================================================
// CORE INTERFACES - ActionSpecificCollector専用型定義
// ============================================================================

export enum CollectorType {
  RSS = 'rss',
  PLAYWRIGHT_ACCOUNT = 'account',
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
  resourceCost: ResourceCost;
}

export interface ResourceCost {
  timeMs: number;
  memoryMb: number;
  cpuUnits: number;
  networkConnections: number;
}

// ============================================================================
// STRATEGY PATTERN INTERFACES - 戦略パターン実装
// ============================================================================

export interface CollectionStrategyInterface {
  name: string;
  description: string;
  execute(context: CollectionContext): Promise<CollectionResult>;
  isApplicable(criteria: CollectorSelectionCriteria): boolean;
  getPriority(): number;
  getResourceCost(): ResourceCost;
}

export interface ResourceManagement {
  maxConcurrentCollectors: number;
  timeoutPerCollector: number;
  memoryLimit: number;
  priorityQueue: CollectorTask[];
}

export interface CollectorTask {
  id: string;
  collector: BaseCollector;
  priority: number;
  timeout: number;
  retryCount: number;
  startTime?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
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
 * RSS集中戦略 - MVP版メイン戦略
 */
export class RSSFocusedStrategy implements CollectionStrategyInterface {
  name = 'rss_focused';
  description = 'RSS収集に特化した高速・安定戦略';
  
  private logger: Logger;
  private rssCollector: RSSCollector;
  private accountCollector: PlaywrightAccountCollector;
  
  constructor() {
    this.logger = new Logger('RSSFocusedStrategy');
    this.rssCollector = new RSSCollector();
    this.accountCollector = new PlaywrightAccountCollector();
  }
  
  async execute(context: CollectionContext): Promise<CollectionResult> {
    this.logger.info('RSS集中戦略開始', { context });
    
    try {
      // 主にRSS収集、軽微なアカウント分析
      const results = await Promise.allSettled([
        this.rssCollector.collect(context),
        // アカウント分析は低頻度で実行
        this.shouldRunAccountAnalysis(context) 
          ? this.accountCollector.collect(context)
          : Promise.resolve(this.createEmptyResult('account_skipped'))
      ]);
      
      return this.combineResults(results, 'rss_focused');
    } catch (error) {
      this.logger.error('RSS集中戦略エラー', error);
      throw error;
    }
  }
  
  isApplicable(criteria: CollectorSelectionCriteria): boolean {
    return (
      criteria.accountStatus.engagement === 'low' ||
      criteria.accountStatus.themeConsistency < 0.8 ||
      criteria.marketCondition.volatility === 'low' ||
      criteria.strategy === 'rss_focused'
    );
  }
  
  getPriority(): number {
    return 1; // 最高優先度（MVP戦略）
  }
  
  getResourceCost(): ResourceCost {
    return {
      timeMs: 30000,
      memoryMb: 100,
      cpuUnits: 2,
      networkConnections: 5
    };
  }
  
  private shouldRunAccountAnalysis(context: CollectionContext): boolean {
    // 24時間に1回程度の頻度
    const lastAnalysis = context.timestamp - (24 * 60 * 60 * 1000);
    return Math.random() < 0.1 || context.timestamp > lastAnalysis;
  }
  
  private createEmptyResult(reason: string): CollectionResult {
    return {
      source: reason,
      data: [],
      metadata: {
        timestamp: new Date().toISOString(),
        count: 0,
        sourceType: reason,
        processingTime: 0
      },
      success: true
    };
  }
  
  private combineResults(results: PromiseSettledResult<CollectionResult>[], strategyName: string): CollectionResult {
    const combinedData: any[] = [];
    let totalProcessingTime = 0;
    let hasErrors = false;
    let errorMessage = '';
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        combinedData.push(...result.value.data);
        totalProcessingTime += result.value.metadata.processingTime;
        if (!result.value.success) {
          hasErrors = true;
          errorMessage += result.value.error + '; ';
        }
      } else {
        hasErrors = true;
        errorMessage += `Result ${index} failed: ${result.reason}; `;
      }
    });
    
    return {
      source: strategyName,
      data: combinedData,
      metadata: {
        timestamp: new Date().toISOString(),
        count: combinedData.length,
        sourceType: strategyName,
        processingTime: totalProcessingTime,
        config: { strategy: strategyName }
      },
      success: !hasErrors,
      error: hasErrors ? errorMessage.trim() : undefined
    };
  }
}

/**
 * 複数ソース戦略 - 将来の拡張用
 */
export class MultiSourceStrategy implements CollectionStrategyInterface {
  name = 'multi_source';
  description = '複数ソースからの包括的情報収集戦略';
  
  private logger: Logger;
  private rssCollector: RSSCollector;
  private accountCollector: PlaywrightAccountCollector;
  
  constructor() {
    this.logger = new Logger('MultiSourceStrategy');
    this.rssCollector = new RSSCollector();
    this.accountCollector = new PlaywrightAccountCollector();
  }
  
  async execute(context: CollectionContext): Promise<CollectionResult> {
    this.logger.info('複数ソース戦略開始', { context });
    
    try {
      // RSS (60%) + アカウント分析 (40%)
      const results = await Promise.allSettled([
        this.rssCollector.collect(context),
        this.accountCollector.collect(context)
        // 将来: API・コミュニティコレクターも追加
      ]);
      
      return this.combineResults(results, 'multi_source');
    } catch (error) {
      this.logger.error('複数ソース戦略エラー', error);
      throw error;
    }
  }
  
  isApplicable(criteria: CollectorSelectionCriteria): boolean {
    return (
      criteria.accountStatus.engagement === 'medium' &&
      criteria.accountStatus.followerCount > 1000 &&
      criteria.marketCondition.volatility === 'high'
    );
  }
  
  getPriority(): number {
    return 2;
  }
  
  getResourceCost(): ResourceCost {
    return {
      timeMs: 60000,
      memoryMb: 200,
      cpuUnits: 4,
      networkConnections: 8
    };
  }
  
  private combineResults(results: PromiseSettledResult<CollectionResult>[], strategyName: string): CollectionResult {
    // RSSFocusedStrategyと同じロジック
    const combinedData: any[] = [];
    let totalProcessingTime = 0;
    let hasErrors = false;
    let errorMessage = '';
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        combinedData.push(...result.value.data);
        totalProcessingTime += result.value.metadata.processingTime;
        if (!result.value.success) {
          hasErrors = true;
          errorMessage += result.value.error + '; ';
        }
      } else {
        hasErrors = true;
        errorMessage += `Result ${index} failed: ${result.reason}; `;
      }
    });
    
    return {
      source: strategyName,
      data: combinedData,
      metadata: {
        timestamp: new Date().toISOString(),
        count: combinedData.length,
        sourceType: strategyName,
        processingTime: totalProcessingTime,
        config: { strategy: strategyName }
      },
      success: !hasErrors,
      error: hasErrors ? errorMessage.trim() : undefined
    };
  }
}

/**
 * アカウント分析戦略 - 自己分析優先
 */
export class AccountAnalysisStrategy implements CollectionStrategyInterface {
  name = 'account_analysis';
  description = '自アカウント分析を優先する戦略';
  
  private logger: Logger;
  private accountCollector: PlaywrightAccountCollector;
  
  constructor() {
    this.logger = new Logger('AccountAnalysisStrategy');
    this.accountCollector = new PlaywrightAccountCollector();
  }
  
  async execute(context: CollectionContext): Promise<CollectionResult> {
    this.logger.info('アカウント分析戦略開始', { context });
    
    try {
      // アカウント分析のみに集中
      return await this.accountCollector.collect(context);
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
  
  getResourceCost(): ResourceCost {
    return {
      timeMs: 120000,
      memoryMb: 300,
      cpuUnits: 3,
      networkConnections: 2
    };
  }
}

// ============================================================================
// MAIN ACTIONSPECIFICCOLLECTOR CLASS - メインクラス
// ============================================================================

export class ActionSpecificCollector {
  private static instance: ActionSpecificCollector;
  private collectors: Map<CollectorType, BaseCollector>;
  private strategies: Map<string, CollectionStrategyInterface>;
  private logger: Logger;
  private yamlManager: YamlManager;
  private resourceManager: ResourceManagement;
  private config: any;
  
  private constructor() {
    this.logger = new Logger('ActionSpecificCollector');
    this.yamlManager = new YamlManager({
      rootPath: 'data/config',
      enableCache: true,
      cacheMaxAge: 5 * 60 * 1000 // 5分キャッシュ
    });
    
    this.initializeCollectors();
    this.initializeStrategies();
    this.initializeResourceManager();
    this.loadConfiguration();
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
    this.collectors = new Map([
      [CollectorType.RSS, new RSSCollector()],
      [CollectorType.PLAYWRIGHT_ACCOUNT, new PlaywrightAccountCollector()],
      // 将来の拡張用プレースホルダー
      // [CollectorType.API, new APICollector()],
      // [CollectorType.COMMUNITY, new CommunityCollector()],
    ]);
    
    this.logger.info('コレクター初期化完了', { 
      count: this.collectors.size,
      types: Array.from(this.collectors.keys())
    });
  }
  
  private initializeStrategies(): void {
    this.strategies = new Map([
      ['rss_focused', new RSSFocusedStrategy()],
      ['multi_source', new MultiSourceStrategy()],
      ['account_analysis', new AccountAnalysisStrategy()],
    ]);
    
    this.logger.info('戦略初期化完了', { 
      count: this.strategies.size,
      strategies: Array.from(this.strategies.keys())
    });
  }
  
  private initializeResourceManager(): void {
    this.resourceManager = {
      maxConcurrentCollectors: 3,
      timeoutPerCollector: 60000,
      memoryLimit: 512,
      priorityQueue: []
    };
  }
  
  private async loadConfiguration(): Promise<void> {
    try {
      this.config = await this.yamlManager.readYaml('collection-strategies.yaml');
      
      // 設定からリソース制限を更新
      if (this.config?.resource_limits) {
        this.resourceManager.maxConcurrentCollectors = this.config.resource_limits.max_concurrent_collectors || 3;
        this.resourceManager.timeoutPerCollector = (this.config.resource_limits.collector_timeout_seconds || 60) * 1000;
        this.resourceManager.memoryLimit = this.config.resource_limits.memory_limit_mb || 512;
      }
      
      this.logger.info('設定ファイル読み込み完了', { config: !!this.config });
    } catch (error) {
      this.logger.warn('設定ファイル読み込み失敗、デフォルト設定を使用', error);
      this.config = null;
    }
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
        expectedDuration: selectedStrategy.getResourceCost().timeMs,
        resourceCost: selectedStrategy.getResourceCost()
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
      this.logger.error('コレクター選択エラー', error);
      throw error;
    }
  }
  
  /**
   * 戦略実行
   */
  public async executeStrategy(strategyName: string, context: CollectionContext): Promise<CollectionResult> {
    this.logger.info('戦略実行開始', { strategyName, context });
    
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`戦略が見つかりません: ${strategyName}`);
    }
    
    const startTime = Date.now();
    
    try {
      // リソース管理
      await this.checkResourceAvailability(strategy.getResourceCost());
      
      // 戦略実行
      const result = await this.executeWithTimeout(
        () => strategy.execute(context),
        this.resourceManager.timeoutPerCollector
      );
      
      const executionTime = Date.now() - startTime;
      
      this.logger.success('戦略実行完了', { 
        strategyName, 
        executionTime,
        dataCount: result.data.length,
        success: result.success
      });
      
      return result;
    } catch (error) {
      this.logger.error('戦略実行エラー', { strategyName, error });
      
      // フォールバック処理
      return await this.handleFallback(error, strategyName, context);
    }
  }
  
  // ============================================================================
  // PRIVATE IMPLEMENTATION METHODS - プライベート実装メソッド
  // ============================================================================
  
  private async evaluateStrategies(criteria: CollectorSelectionCriteria): Promise<CollectionStrategyInterface[]> {
    const applicableStrategies: CollectionStrategyInterface[] = [];
    
    for (const [name, strategy] of this.strategies) {
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
    if (!this.config?.strategies?.[strategyName]) {
      return true; // デフォルトで有効
    }
    return this.config.strategies[strategyName].enabled !== false;
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
    const priorityScore = (10 - strategy.getPriority()) * 0.4; // 優先度が高いほど高スコア
    const resourceScore = this.calculateResourceScore(strategy.getResourceCost()) * 0.3;
    const contextScore = this.calculateContextScore(strategy, criteria) * 0.3;
    
    return priorityScore + resourceScore + contextScore;
  }
  
  private calculateResourceScore(cost: ResourceCost): number {
    // リソースコストが低いほど高スコア
    const timeScore = Math.max(0, 10 - (cost.timeMs / 10000));
    const memoryScore = Math.max(0, 10 - (cost.memoryMb / 50));
    return (timeScore + memoryScore) / 2;
  }
  
  private calculateContextScore(strategy: CollectionStrategyInterface, criteria: CollectorSelectionCriteria): number {
    // コンテキストとの適合度を評価
    let score = 5; // 基本スコア
    
    if (strategy.name === 'rss_focused' && criteria.accountStatus.engagement === 'low') {
      score += 3;
    }
    if (strategy.name === 'multi_source' && criteria.marketCondition.volatility === 'high') {
      score += 2;
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
    
    if (strategy.name === 'rss_focused') {
      primary.push(this.collectors.get(CollectorType.RSS)!);
      fallback.push(this.collectors.get(CollectorType.PLAYWRIGHT_ACCOUNT)!);
    } else if (strategy.name === 'multi_source') {
      primary.push(this.collectors.get(CollectorType.RSS)!);
      primary.push(this.collectors.get(CollectorType.PLAYWRIGHT_ACCOUNT)!);
    } else if (strategy.name === 'account_analysis') {
      primary.push(this.collectors.get(CollectorType.PLAYWRIGHT_ACCOUNT)!);
      fallback.push(this.collectors.get(CollectorType.RSS)!);
    }
    
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
  
  private async checkResourceAvailability(requiredCost: ResourceCost): Promise<void> {
    // メモリチェック
    if (requiredCost.memoryMb > this.resourceManager.memoryLimit) {
      throw new Error(`メモリ不足: 必要 ${requiredCost.memoryMb}MB, 制限 ${this.resourceManager.memoryLimit}MB`);
    }
    
    // 同時実行数チェック
    const runningTasks = this.resourceManager.priorityQueue.filter(task => task.status === 'running').length;
    if (runningTasks >= this.resourceManager.maxConcurrentCollectors) {
      throw new Error(`同時実行数制限: 実行中 ${runningTasks}, 制限 ${this.resourceManager.maxConcurrentCollectors}`);
    }
  }
  
  private async executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`タイムアウト: ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }
  
  private async handleFallback(error: Error, failedStrategy: string, context: CollectionContext): Promise<CollectionResult> {
    this.logger.warn('フォールバック処理開始', { failedStrategy, error: error.message });
    
    // 簡単なフォールバック: RSS戦略にフォールバック
    try {
      const fallbackStrategy = this.strategies.get('rss_focused');
      if (fallbackStrategy && failedStrategy !== 'rss_focused') {
        return await fallbackStrategy.execute(context);
      }
    } catch (fallbackError) {
      this.logger.error('フォールバック処理も失敗', fallbackError);
    }
    
    // 最終フォールバック: 空の結果を返す
    return {
      source: 'fallback_empty',
      data: [],
      metadata: {
        timestamp: new Date().toISOString(),
        count: 0,
        sourceType: 'fallback',
        processingTime: 0,
        config: { originalStrategy: failedStrategy, error: error.message }
      },
      success: false,
      error: `戦略実行失敗とフォールバック失敗: ${error.message}`
    };
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
    resourceUsage: {
      memoryUsage: number;
      activeConnections: number;
      queueLength: number;
    };
  }> {
    const collectors: Record<string, boolean> = {};
    const strategies: Record<string, boolean> = {};
    
    // コレクター可用性チェック
    for (const [type, collector] of this.collectors) {
      try {
        collectors[type] = await collector.isAvailable();
      } catch {
        collectors[type] = false;
      }
    }
    
    // 戦略有効性チェック
    for (const [name, strategy] of this.strategies) {
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
      strategies,
      resourceUsage: {
        memoryUsage: 0, // 実装簡素化のため0
        activeConnections: 0,
        queueLength: this.resourceManager.priorityQueue.length
      }
    };
  }
  
  /**
   * 設定リロード
   */
  public async reloadConfiguration(): Promise<void> {
    this.logger.info('設定リロード開始');
    await this.loadConfiguration();
    this.logger.info('設定リロード完了');
  }
}