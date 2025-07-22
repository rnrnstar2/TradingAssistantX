/**
 * Collection Orchestrator
 * ActionSpecificCollectorのメインオーケストレーション機能を分離
 */

import type { Browser, BrowserContext } from 'playwright';
import { PlaywrightBrowserManager } from '../../playwright-browser-manager.js';
import { BrowserFactory } from '../browser/browser-factory.js';
import { CollectionConfigManager } from '../config/collection-config-manager.js';
import { CollectionUtils } from '../utils/collection-utils.js';
import { claude } from '@instantlyeasy/claude-code-sdk-ts';

import type { 
  CollectionResult, 
  IntegratedContext,
  ActionSpecificResult,
  CollectionStrategy,
  CollectionTarget,
  QualityEvaluation
} from '../../../types/autonomous-system';

import type {
  BaseCollector,
  CollectionRequest,
  CollectionStats,
  CollectorRegistry,
  CollectorMetrics
} from '../interfaces/collection-interfaces.js';

export class CollectionOrchestrator {
  private configManager: CollectionConfigManager;
  private registry: Map<string, BaseCollector> = new Map();
  private metrics: Map<string, CollectorMetrics> = new Map();
  private testMode: boolean;
  private browserFactory: BrowserFactory;

  private readonly COLLECTION_TIMEOUT = 30 * 1000; // 30秒
  private timeoutConfig = {
    initial: 60000,    // 初回60秒
    retry: 60000,      // リトライ時60秒
    final: 30000       // 最終試行30秒
  };

  constructor() {
    this.configManager = new CollectionConfigManager();
    this.browserFactory = new BrowserFactory();
    this.testMode = process.env.X_TEST_MODE === 'true';
    
    if (this.testMode) {
      console.log('🧪 [CollectionOrchestrator] テストモード有効');
    }
  }

  /**
   * 設定を初期化
   */
  initialize(configPath?: string): void {
    const { config, extendedConfig, multiSourceConfig } = this.configManager.loadConfig(configPath);
    
    if (!this.configManager.validateConfig()) {
      throw new Error('Invalid configuration loaded');
    }

    console.log('✅ [CollectionOrchestrator] 初期化完了');
  }

  /**
   * コレクターを登録
   */
  registerCollector(type: string, collector: BaseCollector): void {
    this.registry.set(type, collector);
    this.initializeCollectorMetrics(type);
    console.log(`📝 [Registry] ${type}コレクター登録完了`);
  }

  /**
   * メイン収集メソッド - アクション特化型収集
   */
  async collectForAction(
    actionType: 'original_post' | 'quote_tweet' | 'retweet' | 'reply',
    context: IntegratedContext,
    targetSufficiency: number = 90
  ): Promise<ActionSpecificResult> {
    console.log(`🎯 [CollectionOrchestrator] ${actionType}向け情報収集開始...`);
    const startTime = Date.now();

    try {
      // 1. 収集戦略を生成
      const strategy = await this.generateCollectionStrategy(actionType, context);
      
      // 2. 戦略に基づいて収集実行
      const results = await this.executeCollectionStrategy(strategy);
      
      // 3. 結果の品質評価
      const qualityEvaluation = CollectionUtils.evaluateQuality(results);
      
      // 4. 結果の統計情報
      const stats = this.calculateCollectionStats(results, startTime);

      console.log(`✅ [収集完了] ${results.length}件収集、品質スコア: ${qualityEvaluation.overallScore}`);

      return {
        actionType,
        results,
        qualityEvaluation,
        collectionStats: {
          totalResults: stats.totalResults,
          uniqueResults: stats.uniqueResults,
          processingTimeMs: stats.processingTime,
          sourcesUsed: stats.sourcesUsed
        },
        sufficiencyEvaluation: {
          currentSufficiency: Math.min((results.length / 10) * 100, 100),
          targetSufficiency,
          recommendation: results.length >= 8 ? 'sufficient' : 'needs_more'
        }
      };

    } catch (error) {
      console.error(`❌ [収集エラー] ${actionType}:`, error);
      
      // フォールバック結果を返す
      const fallbackResults = await this.getFallbackResults(actionType);
      return {
        actionType,
        results: fallbackResults,
        qualityEvaluation: CollectionUtils.evaluateQuality(fallbackResults),
        collectionStats: {
          totalResults: fallbackResults.length,
          uniqueResults: fallbackResults.length,
          processingTimeMs: Date.now() - startTime,
          sourcesUsed: ['fallback']
        },
        sufficiencyEvaluation: {
          currentSufficiency: 50,
          targetSufficiency,
          recommendation: 'fallback_used'
        }
      };
    }
  }

  /**
   * トピック特化型収集
   */
  async collectForTopicSpecificAction(
    actionType: 'original_post' | 'quote_tweet' | 'retweet' | 'reply',
    topic: string,
    context: IntegratedContext,
    targetSufficiency: number = 90
  ): Promise<ActionSpecificResult> {
    console.log(`🎯 [トピック特化収集] ${topic}に関する${actionType}向け情報収集開始...`);
    
    // トピック特化の戦略を生成
    const strategy = await this.generateTopicSpecificStrategy(actionType, topic, context);
    
    // 基本収集ロジックを使用
    return this.executeTopicStrategy(strategy, actionType, targetSufficiency);
  }

  /**
   * 収集戦略生成
   */
  private async generateCollectionStrategy(
    actionType: string,
    context: IntegratedContext
  ): Promise<CollectionStrategy> {
    console.log(`🎯 [戦略生成] ${actionType}向け収集戦略を生成中...`);

    const actionConfig = this.configManager.getActionConfig(actionType);
    if (!actionConfig) {
      throw new Error(`Action type ${actionType} not found in config`);
    }

    // 基本戦略を構築
    const targets: CollectionTarget[] = actionConfig.sources?.map((source: any) => ({
      type: CollectionUtils.mapSourceToTargetType(source.name),
      url: CollectionUtils.resolveApiSourceUrl(source),
      weight: CollectionUtils.mapPriorityToWeight(source.priority)
    })) || [];

    return {
      type: 'multi_source',
      priority: actionConfig.priority || 50,
      sources: actionConfig.sources?.map((s: any) => s.name) || [],
      parameters: {
        actionType,
        focusAreas: actionConfig.focusAreas || [],
        maxResults: 20
      },
      timeout: this.configManager.getMaxExecutionTime() * 1000,
      retryAttempts: 2,
      qualityThreshold: 70,
      // Legacy properties for compatibility
      actionType,
      targets,
      expectedDuration: this.configManager.getMaxExecutionTime(),
      searchTerms: actionConfig.focusAreas || [],
      topic: actionType,
      keywords: actionConfig.focusAreas || [],
      description: `${actionType}向け収集戦略`
    };
  }

  /**
   * トピック特化戦略生成
   */
  private async generateTopicSpecificStrategy(
    actionType: string,
    topic: string,
    context: IntegratedContext
  ): Promise<CollectionStrategy> {
    const baseStrategy = await this.generateCollectionStrategy(actionType, context);
    
    // トピック特化のキーワード追加
    const topicKeywords = topic.split(' ').filter(word => word.length > 2);
    
    return {
      ...baseStrategy,
      type: 'topic_specific',
      parameters: {
        ...baseStrategy.parameters,
        topic,
        topicKeywords,
        focusAreas: [...(baseStrategy.parameters.focusAreas || []), topic]
      },
      keywords: [...(baseStrategy.keywords || []), ...topicKeywords],
      description: `${actionType}向け「${topic}」特化収集戦略`
    };
  }

  /**
   * 収集戦略実行
   */
  private async executeCollectionStrategy(strategy: CollectionStrategy): Promise<CollectionResult[]> {
    if (this.testMode) {
      return this.getMockCollectionResults(strategy.parameters.actionType);
    }

    const allResults: CollectionResult[] = [];
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let sessionId: string | null = null;

    try {
      // BrowserFactoryを優先使用（循環依存回避）
      try {
        const environment = await this.browserFactory.createPlaywrightEnvironment();
        browser = environment.browser;
        context = environment.context;
        sessionId = `orchestrator-${strategy.parameters.actionType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      } catch (factoryError) {
        // フォールバック: PlaywrightBrowserManagerを使用
        console.warn('⚠️ [OrchestoratorFallback] BrowserFactory失敗、BrowserManagerにフォールバック');
        const browserManager = PlaywrightBrowserManager.getInstance({
          maxBrowsers: 1,
          maxContextsPerBrowser: 1
        });

        sessionId = `orchestrator-${strategy.parameters.actionType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        context = await browserManager.acquireContext(sessionId);
        browser = context.browser();
      }

      // 各ターゲットから並列収集
      const targetPromises = (strategy as any).targets?.map(async (target: CollectionTarget, index: number) => {
        try {
          // レート制限対策
          await new Promise(resolve => setTimeout(resolve, index * 500));
          
          const timeout = CollectionUtils.getTimeoutForAttempt(1, 1, this.timeoutConfig);
          
          if (!context) {
            throw new Error('Browser context is null');
          }
          
          const results = await this.collectFromTarget(context, target, strategy, timeout);
          return { success: true, results, target };
        } catch (error) {
          console.error(`❌ [ターゲット収集エラー] ${target.url}:`, error);
          return { success: false, results: [], target, error };
        }
      }) || [];

      // 並列実行の結果を収集
      const targetResults = await Promise.allSettled(targetPromises);
      
      for (const result of targetResults) {
        if (result.status === 'fulfilled' && result.value.success) {
          allResults.push(...result.value.results);
        }
      }

      // フォールバック結果が必要な場合
      if (allResults.length === 0) {
        console.log(`🔄 [フォールバック] デフォルト情報源を試行中...`);
        allResults.push(...await this.getFallbackResults(strategy.parameters.actionType));
      }

    } finally {
      // セッション解放
      if (sessionId && context && browser) {
        try {
          // BrowserFactoryでの独立管理
          await this.browserFactory.cleanup(browser, context, sessionId);
        } catch (cleanupError) {
          // フォールバック: BrowserManagerでのクリーンアップ
          try {
            const browserManager = PlaywrightBrowserManager.getInstance();
            await browserManager.releaseContext(sessionId);
            console.log(`🧹 [フォールバッククリーンアップ] ${sessionId}`);
          } catch (fallbackError) {
            console.warn('⚠️ [クリーンアップエラー]:', fallbackError);
          }
        }
      }
    }

    // 重複除去とソート
    const uniqueResults = CollectionUtils.removeDuplicates(allResults);
    const sortedResults = uniqueResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    console.log(`✅ [戦略実行完了] ${uniqueResults.length}件の一意な結果`);
    return sortedResults.slice(0, 20);
  }

  /**
   * トピック戦略実行
   */
  private async executeTopicStrategy(
    strategy: CollectionStrategy,
    actionType: string,
    targetSufficiency: number
  ): Promise<ActionSpecificResult> {
    const results = await this.executeCollectionStrategy(strategy);
    
    // トピック特化の関連度計算
    const topicKeywords = strategy.parameters.topicKeywords || [];
    const enhancedResults = results.map(result => ({
      ...result,
      relevanceScore: CollectionUtils.calculateRelevanceScore(result, topicKeywords, actionType)
    }));

    const qualityEvaluation = CollectionUtils.evaluateQuality(enhancedResults);
    
    return {
      actionType,
      results: enhancedResults,
      qualityEvaluation,
      collectionStats: {
        totalResults: enhancedResults.length,
        uniqueResults: enhancedResults.length,
        processingTimeMs: 0,
        sourcesUsed: strategy.sources
      },
      sufficiencyEvaluation: {
        currentSufficiency: Math.min((enhancedResults.length / 10) * 100, 100),
        targetSufficiency,
        recommendation: enhancedResults.length >= 8 ? 'sufficient' : 'needs_more'
      }
    };
  }

  /**
   * 個別ターゲットからの収集
   */
  private async collectFromTarget(
    context: BrowserContext,
    target: CollectionTarget,
    strategy: CollectionStrategy,
    timeout: number
  ): Promise<CollectionResult[]> {
    const page = await context.newPage();

    try {
      // URL妥当性チェック
      if (!target.url || typeof target.url !== 'string' || target.url.trim() === '') {
        throw new Error(`Invalid URL for target ${target.type}: ${target.url}`);
      }

      try {
        new URL(target.url);
      } catch (urlError) {
        throw new Error(`Malformed URL for target ${target.type}: ${target.url}`);
      }

      console.log(`🌐 [ページアクセス] ${target.type}: ${target.url}`);

      await page.goto(target.url, { 
        waitUntil: 'networkidle',
        timeout 
      });

      // Claude指示による動的収集
      const claudeInstructions = await this.getClaudeCollectionInstructions(target, strategy);
      const results = await this.executeClaudeAnalysis(page, claudeInstructions, strategy.parameters.actionType);

      return results;

    } catch (error) {
      console.error(`❌ [収集エラー] ${target.type} (${target.url}):`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Claude収集指示取得
   */
  private async getClaudeCollectionInstructions(
    target: CollectionTarget,
    strategy: CollectionStrategy
  ): Promise<string> {
    const keywords = strategy.keywords || [];
    const focusAreas = strategy.parameters.focusAreas || [];
    
    return `
    このページから${strategy.parameters.actionType}向けの情報を収集してください：
    
    【収集対象】
    - サイト: ${target.url}
    - タイプ: ${target.type}
    - 重点領域: ${focusAreas.join(', ')}
    - キーワード: ${keywords.join(', ')}
    
    【収集内容】
    1. 最新の投資・金融関連ニュース
    2. 市場分析や専門家の見解
    3. 教育価値の高い情報
    
    【出力形式】
    各情報について、タイトル、要約、元URL、関連度（1-10）を含めてください。
    `;
  }

  /**
   * Claude分析実行
   */
  private async executeClaudeAnalysis(
    page: any,
    instructions: string,
    actionType: string
  ): Promise<CollectionResult[]> {
    try {
      const response = await claude.analyze(instructions, page);
      
      // レスポンスをCollectionResult形式に変換
      return this.parseClaudeResponse(response, actionType);
    } catch (error) {
      console.error('Claude分析エラー:', error);
      return [];
    }
  }

  /**
   * Claudeレスポンス解析
   */
  private parseClaudeResponse(response: any, actionType: string): CollectionResult[] {
    // 簡単な実装 - 実際の実装ではより詳細な解析が必要
    const results: CollectionResult[] = [];
    
    if (typeof response === 'string' && response.length > 100) {
      results.push({
        id: `claude-analysis-${Date.now()}`,
        type: 'insight',
        content: response.substring(0, 1000),
        relevanceScore: 0.8,
        timestamp: Date.now(),
        title: `${actionType}向けClaude分析結果`,
        url: 'claude-generated'
      });
    }

    return results;
  }

  /**
   * フォールバック結果生成
   */
  private async getFallbackResults(actionType: string): Promise<CollectionResult[]> {
    console.log(`🛡️ [フォールバック] ${actionType}用の基本情報を生成中...`);
    
    const fallbackContent = {
      original_post: '市場の基本的な動向分析と投資教育的な視点を提供',
      quote_tweet: '既存の有益なツイートに対する付加価値のある解説を検討',
      retweet: '信頼性の高い投資情報源からの価値あるコンテンツを選定',
      reply: 'コミュニティとの建設的な対話機会を創出'
    };

    const content = fallbackContent[actionType as keyof typeof fallbackContent] || 
                   '投資分野での価値創造に向けた基本的な情報収集';

    return [{
      id: `fallback-${actionType}-${Date.now()}`,
      type: 'insight',
      content,
      relevanceScore: 0.6,
      timestamp: Date.now(),
      title: `${actionType}向けフォールバック情報`,
      url: 'fallback'
    }];
  }

  /**
   * モック結果生成（テストモード用）
   */
  private getMockCollectionResults(actionType: string): CollectionResult[] {
    console.log(`🧪 [モックデータ] ${actionType}用テストデータを生成`);
    
    return [
      {
        id: `mock-${actionType}-1`,
        type: 'news',
        content: `${actionType}向けのモックニュースコンテンツ。テストモードで生成されました。`,
        relevanceScore: 0.85,
        timestamp: Date.now() - 30 * 60 * 1000, // 30分前
        title: `Mock ${actionType} News`,
        url: 'https://example.com/mock-news'
      },
      {
        id: `mock-${actionType}-2`,
        type: 'analysis',
        content: `${actionType}向けのモック分析コンテンツ。市場分析のテストデータです。`,
        relevanceScore: 0.78,
        timestamp: Date.now() - 60 * 60 * 1000, // 1時間前
        title: `Mock ${actionType} Analysis`,
        url: 'https://example.com/mock-analysis'
      }
    ];
  }

  /**
   * 収集統計計算
   */
  private calculateCollectionStats(results: CollectionResult[], startTime: number): CollectionStats {
    const uniqueResults = CollectionUtils.removeDuplicates(results);
    const sources = [...new Set(results.map(r => CollectionUtils.extractDomain(r.url || '')))];
    
    return {
      totalResults: results.length,
      uniqueResults: uniqueResults.length,
      duplicatesRemoved: results.length - uniqueResults.length,
      qualityScore: CollectionUtils.evaluateQuality(results).overallScore,
      processingTime: Date.now() - startTime,
      sourcesUsed: sources.filter(s => s !== 'unknown'),
      errors: []
    };
  }

  /**
   * コレクターメトリクス初期化
   */
  private initializeCollectorMetrics(type: string): void {
    this.metrics.set(type, {
      collectorType: type,
      executionTime: 0,
      resultsCount: 0,
      successRate: 1.0,
      errorCount: 0,
      lastExecuted: new Date()
    });
  }

  /**
   * メトリクス取得
   */
  getMetrics(): Record<string, CollectorMetrics> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * 利用可能なコレクター一覧
   */
  getAvailableCollectors(): string[] {
    return Array.from(this.registry.keys());
  }
}