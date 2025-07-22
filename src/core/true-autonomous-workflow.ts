import { ClaudeAutonomousAgent, type AutonomousStrategy, type ExecutionPlan, type ExecutionResults, type OptimizationPlan } from '../lib/claude-autonomous-agent.js';
import type { IntegratedContext, ActionSuggestion } from '../types/autonomous-system';
import { DecisionEngine } from './decision-engine.js';
import { loadYamlSafe } from '../utils/yaml-utils.js';
import * as yaml from 'js-yaml';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { FXAPICollector } from '../lib/fx-api-collector.js';
import { RssParallelCollectionEngine } from '../lib/rss-parallel-collection-engine.js';
import axios from 'axios';

export interface AutonomousResult {
  sessionId: string;
  timestamp: string;
  strategy: AutonomousStrategy;
  executionPlan: ExecutionPlan;
  executionResults: ExecutionResults;
  optimizationPlan: OptimizationPlan;
  learningPoints: string[];
  nextRecommendations: string[];
  autonomyScore: number;
  performanceMetrics: {
    strategicFlexibility: number;
    adaptationRate: number;
    learningEffectiveness: number;
    overallAutonomy: number;
  };
}

/**
 * 真の自律ワークフロー実装
 * 
 * 指示書で要求された「Claude → Claude戦略決定 → Claude実行計画 → Claude適応的実行 → Claude学習」
 * の完全自律フローを実装し、すべての固定制約を除去します。
 */
export class TrueAutonomousWorkflow {
  private claudeAgent: ClaudeAutonomousAgent;
  private decisionEngine: DecisionEngine;
  private sessionId: string;

  constructor(claudeAgent?: ClaudeAutonomousAgent, decisionEngine?: DecisionEngine) {
    this.claudeAgent = claudeAgent || new ClaudeAutonomousAgent();
    this.decisionEngine = decisionEngine || new DecisionEngine();
    this.sessionId = `autonomous-session-${Date.now()}`;
    
    console.log('🧠 [TrueAutonomousWorkflow] Claude Code SDK中心の完全自律システムを初期化');
    console.log('🎯 [自律システム] 固定制約なし、Claudeの完全判断委託システム準備完了');
  }

  /**
   * 完全自律セッションの実行
   * 指示書で定義された新しい自律フローの実装
   */
  async executeAutonomousSession(context?: IntegratedContext): Promise<AutonomousResult> {
    console.log('📊 [制約状況] 固定制約: なし、Claude判断: 100%');
    
    const sessionStartTime = Date.now();
    
    try {
      // Phase 1: Claude自律的状況分析
      const situationAnalysis = await this.analyzeCurrentSituation(context);
      console.log('✅ [Phase 1完了] Claude自律的状況分析完了');
      
      // Phase 2: Claude自律的戦略決定
      const strategy = await this.claudeAgent.determineStrategy(situationAnalysis);
      console.log('✅ [Phase 2完了] Claude自律的戦略決定完了');
      console.log(`   📋 戦略: ${strategy.actionTypes.join(', ')}, 頻度: ${strategy.frequency}回/日`);
      
      // Phase 3: Claude自律的実行計画
      const executionPlan = await this.claudeAgent.planExecution(strategy);
      console.log('✅ [Phase 3完了] Claude自律的実行計画完了');
      console.log(`   📅 計画: ${executionPlan.actions.length}アクション, ${executionPlan.adaptationPoints.length}適応ポイント`);
      
      // Phase 4: Claude適応的実行
      const executionResults = await this.claudeAgent.executeAdaptively(executionPlan);
      console.log('✅ [Phase 4完了] Claude適応的実行完了');
      console.log(`   🎯 実行: ${executionResults.successfulActions}/${executionResults.executedActions}成功`);
      
      // Phase 5: Claude自律学習・最適化
      const optimizationPlan = await this.claudeAgent.learnAndOptimize(executionResults);
      console.log('✅ [Phase 5完了] Claude自律学習・最適化完了');
      console.log(`   🧠 学習: ${optimizationPlan.areas.length}改善領域, ${optimizationPlan.newOpportunities.length}新機会`);
      
      // 自律性スコアの計算
      const autonomyMetrics = this.calculateAutonomyMetrics(strategy, executionResults, optimizationPlan);
      
      const finalResult: AutonomousResult = {
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        strategy,
        executionPlan,
        executionResults,
        optimizationPlan,
        learningPoints: this.extractLearningPoints(executionResults, optimizationPlan),
        nextRecommendations: this.generateNextRecommendations(optimizationPlan),
        autonomyScore: autonomyMetrics.overallAutonomy,
        performanceMetrics: autonomyMetrics
      };
      
      // 自律セッション結果の保存
      await this.saveAutonomousSession(finalResult);
      
      console.log('🎉 [自律セッション完了] Claude完全自律システム実行完了');
      
      return finalResult;
      
    } catch (error) {
      console.error('❌ [自律セッションエラー]:', error);
      return this.createFallbackResult(error);
    }
  }

  /**
   * Claude自律的状況分析
   * 現在の状況を制約なしで完全に分析
   */
  private async analyzeCurrentSituation(context?: IntegratedContext): Promise<IntegratedContext> {
    console.log('🧠 [Claude状況分析] 制約なしの完全状況分析を実行中...');
    
    // .env.local サポート
    try {
      require('dotenv').config({ path: '.env.local' });
    } catch (error) {
      // dotenv がない場合は無視
    }
    
    // 🔧 NEW: 実際のデータ収集実行
    const realDataMode = process.env.REAL_DATA_MODE === 'true';
    
    if (realDataMode) {
      console.log('📊 [リアルデータモード] 外部データ収集を開始...');
      
      try {
        // 並列データ収集実行
        const collectionTasks = [
          this.collectMarketData(),
          this.collectNewsData(), 
          this.collectCommunityData(),
          this.collectEconomicData()
        ];
        
        const [marketData, newsData, communityData, economicData] = await Promise.allSettled(collectionTasks);
        
        console.log('✅ [データ収集完了]:', {
          market: marketData.status === 'fulfilled' ? marketData.value?.length || 0 : 0,
          news: newsData.status === 'fulfilled' ? newsData.value?.length || 0 : 0,
          community: communityData.status === 'fulfilled' ? communityData.value?.length || 0 : 0,
          economic: economicData.status === 'fulfilled' ? economicData.value?.length || 0 : 0
        });
        
        return await this.buildIntegratedContext({
          marketData: marketData.status === 'fulfilled' ? marketData.value : [],
          newsData: newsData.status === 'fulfilled' ? newsData.value : [],
          communityData: communityData.status === 'fulfilled' ? communityData.value : [],
          economicData: economicData.status === 'fulfilled' ? economicData.value : []
        });
      } catch (error) {
        console.error('❌ [データ収集エラー]:', error);
        console.log('🔄 [フォールバック] モックデータを使用します');
        return await this.getFallbackContext();
      }
    } else {
      console.log('🧪 [テストモード] モックデータを使用');
      return await this.getFallbackContext();
    }
  }

  /**
   * アカウント状況の自律分析
   */
  private async analyzeAccountStatus(): Promise<any> {
    try {
      // 既存のアカウント分析データを読み込み
      const accountAnalysisPath = 'data/account-analysis-data.yaml';
      if (existsSync(accountAnalysisPath)) {
        const accountData = loadYamlSafe<any>(accountAnalysisPath);
        if (accountData) {
          return {
            healthScore: accountData.healthScore || 75,
            growthTrend: accountData.growthTrend || 'stable',
            engagementRate: accountData.engagementRate || 0.05,
            lastUpdated: new Date().toISOString()
          };
        }
      }
      
      // フォールバック: 基本アカウント状況
      return {
        healthScore: 75,
        growthTrend: 'stable',
        engagementRate: 0.05,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.warn('⚠️ [アカウント分析] デフォルト値を使用:', error);
      return {
        healthScore: 70,
        growthTrend: 'unknown',
        engagementRate: 0.03,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * 市場状況の自律分析
   */
  private async analyzeMarketConditions(): Promise<any> {
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    // 簡易的な市場状況分析（実際の実装では外部データソースを活用）
    return {
      volatility: this.assessCurrentVolatility(currentHour),
      trendDirection: 'sideways',
      newsIntensity: this.assessNewsIntensity(currentDay),
      sessionTime: this.determineSessionTime(currentHour),
      opportunities: this.identifyOpportunities(currentHour, currentDay),
      trends: this.identifyTrends()
    };
  }

  /**
   * アクション提案の自律生成
   */
  private async generateActionSuggestions(): Promise<ActionSuggestion[]> {
    const suggestions: ActionSuggestion[] = [
      {
        type: 'original_post',
        content: '投資教育コンテンツの提供',
        reasoning: '投資教育に関する価値あるコンテンツを定期的に提供することで、フォロワーの投資リテラシー向上に貢献',
        priority: 'high',
        expectedImpact: 0.8
      },
      {
        type: 'original_post',
        content: '現在の市場動向分析',
        reasoning: '最新の市場動向を分析・共有することで、フォロワーに有益な投資判断材料を提供',
        priority: 'medium',
        expectedImpact: 0.7
      },
      {
        type: 'reply',
        content: 'フォロワーとの積極的交流',
        reasoning: 'コミュニティとの対話を通じて、信頼関係を構築し、フォロワーのニーズを把握',
        priority: 'medium',
        expectedImpact: 0.6
      }
    ];
    
    return suggestions;
  }

  /**
   * 自律性メトリクスの計算
   */
  private calculateAutonomyMetrics(
    strategy: AutonomousStrategy, 
    results: ExecutionResults, 
    optimization: OptimizationPlan
  ): AutonomousResult['performanceMetrics'] {
    
    // 戦略柔軟性: アクションタイプの多様性と適応レベル
    const strategicFlexibility = Math.min(100, 
      (strategy.actionTypes.length * 20) + 
      (strategy.adaptationLevel === 'aggressive' ? 30 : strategy.adaptationLevel === 'balanced' ? 20 : 10)
    );
    
    // 適応率: 実行中の適応回数と成功率
    const adaptationRate = Math.min(100,
      (results.adaptationsMade.length * 25) + 
      ((results.successfulActions / Math.max(1, results.executedActions)) * 50)
    );
    
    // 学習効果: 学習ポイントと最適化提案の質
    const learningEffectiveness = Math.min(100,
      (results.learningPoints.length * 15) + 
      (optimization.areas.length * 10) + 
      (optimization.newOpportunities.length * 20)
    );
    
    // 総合自律性: 全指標の平均
    const overallAutonomy = Math.round(
      (strategicFlexibility + adaptationRate + learningEffectiveness) / 3
    );
    
    return {
      strategicFlexibility: Math.round(strategicFlexibility),
      adaptationRate: Math.round(adaptationRate),
      learningEffectiveness: Math.round(learningEffectiveness),
      overallAutonomy
    };
  }

  /**
   * 学習ポイントの抽出
   */
  private extractLearningPoints(results: ExecutionResults, optimization: OptimizationPlan): string[] {
    const learningPoints = [...results.learningPoints];
    
    // 最適化計画から追加の学習ポイントを抽出
    optimization.strategyAdjustments.forEach(adjustment => {
      learningPoints.push(`戦略学習: ${adjustment}`);
    });
    
    return learningPoints;
  }

  /**
   * 次回推奨事項の生成
   */
  private generateNextRecommendations(optimization: OptimizationPlan): string[] {
    const recommendations = [
      ...optimization.newOpportunities.map(opp => `機会活用: ${opp}`),
      ...optimization.areas.map(area => `改善重点: ${area}`)
    ];
    
    return recommendations.slice(0, 5); // 上位5件に制限
  }

  /**
   * 自律セッション結果の保存
   */
  private async saveAutonomousSession(result: AutonomousResult): Promise<void> {
    try {
      const sessionDir = 'data/autonomous-sessions';
      if (!existsSync(sessionDir)) {
        mkdirSync(sessionDir, { recursive: true });
      }
      
      const sessionFile = `${sessionDir}/${result.sessionId}.yaml`;
      const sessionData = {
        sessionId: result.sessionId,
        timestamp: new Date().toISOString(),
        autonomyScore: result.autonomyScore,
        performanceMetrics: result.performanceMetrics,
        strategy: {
          actionTypes: result.strategy.actionTypes,
          frequency: result.strategy.frequency,
          contentThemes: result.strategy.contentThemes,
          riskLevel: result.strategy.riskLevel
        },
        execution: {
          totalActions: result.executionResults.executedActions,
          successfulActions: result.executionResults.successfulActions,
          adaptationsMade: result.executionResults.adaptationsMade.length
        },
        learning: {
          learningPoints: result.learningPoints.length,
          optimizationAreas: result.optimizationPlan.areas.length,
          newOpportunities: result.optimizationPlan.newOpportunities.length
        },
        nextRecommendations: result.nextRecommendations
      };
      
      writeFileSync(sessionFile, yaml.dump(sessionData, { indent: 2 }));
      console.log(`💾 [セッション保存] 自律セッション結果を保存: ${sessionFile}`);
    } catch (error) {
      console.error('❌ [セッション保存エラー]:', error);
    }
  }

  /**
   * フォールバック結果の生成
   */
  private createFallbackResult(error: any): AutonomousResult {
    const fallbackStrategy: AutonomousStrategy = {
      actionTypes: ['original_post'],
      frequency: 5,
      contentThemes: ['investment_education'],
      timing: ['09:00'],
      riskLevel: 'low',
      adaptationLevel: 'conservative'
    };
    
    const fallbackPlan: ExecutionPlan = {
      id: `fallback-plan-${Date.now()}`,
      strategy: fallbackStrategy,
      actions: [{
        id: `fallback-action-${Date.now()}`,
        type: 'original_post',
        priority: 'medium',
        timing: 'immediate',
        content: '投資教育基本コンテンツ',
        reasoning: 'エラー時フォールバック',
        dependencies: [],
        adaptationTriggers: []
      }],
      adaptationPoints: [],
      fallbackOptions: []
    };
    
    const fallbackResults: ExecutionResults = {
      planId: fallbackPlan.id,
      executedActions: 0,
      successfulActions: 0,
      adaptationsMade: [],
      learningPoints: [`エラー学習: ${error}`],
      nextOptimizations: ['エラー対策強化']
    };
    
    const fallbackOptimization: OptimizationPlan = {
      areas: ['error_handling'],
      priorityChanges: { 'stability': 'high' },
      strategyAdjustments: ['安定性重視'],
      newOpportunities: []
    };
    
    return {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      strategy: fallbackStrategy,
      executionPlan: fallbackPlan,
      executionResults: fallbackResults,
      optimizationPlan: fallbackOptimization,
      learningPoints: [`フォールバック実行: ${error}`],
      nextRecommendations: ['システム安定性の向上'],
      autonomyScore: 25, // 低い自律性スコア
      performanceMetrics: {
        strategicFlexibility: 20,
        adaptationRate: 10,
        learningEffectiveness: 30,
        overallAutonomy: 25
      }
    };
  }

  // ヘルパーメソッド
  private assessCurrentVolatility(hour: number): 'low' | 'medium' | 'high' {
    if ((hour >= 8 && hour <= 10) || (hour >= 13 && hour <= 15) || (hour >= 21 && hour <= 23)) {
      return 'high';
    } else if (hour >= 15 && hour <= 17) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private assessNewsIntensity(dayOfWeek: number): 'low' | 'medium' | 'high' {
    if (dayOfWeek === 1 || dayOfWeek === 5) {
      return 'high'; // 月曜日と金曜日
    } else if (dayOfWeek >= 2 && dayOfWeek <= 4) {
      return 'medium'; // 火〜木曜日
    } else {
      return 'low'; // 土日
    }
  }

  private determineSessionTime(hour: number): string {
    if (hour >= 0 && hour < 9) return 'tokyo';
    else if (hour >= 8 && hour < 17) return 'london';
    else if (hour >= 13 && hour < 22) return 'newyork';
    else if ((hour >= 8 && hour < 10) || (hour >= 13 && hour < 17)) return 'overlap';
    else return 'quiet';
  }

  private identifyOpportunities(hour: number, dayOfWeek: number): any[] {
    const opportunities = [];
    
    if (hour >= 9 && hour <= 16) {
      opportunities.push({
        type: 'market_hours',
        priority: 'high',
        description: '市場時間中の投資情報提供機会'
      });
    }
    
    if (dayOfWeek === 1) {
      opportunities.push({
        type: 'week_start',
        priority: 'medium',
        description: '週始めの戦略情報提供機会'
      });
    }
    
    return opportunities;
  }

  private identifyTrends(): string[] {
    return [
      '長期投資への関心増加',
      'ESG投資の普及',
      'デジタル資産の成長',
      '分散投資の重要性認識'
    ];
  }

  // 🔧 NEW: 実際のデータ収集メソッド追加
  private async collectMarketData(): Promise<any[]> {
    console.log('📈 [市場データ収集] FX・株式データ収集中...');
    try {
      const fxCollector = new FXAPICollector();
      const forexRates = await fxCollector.collectForexRates(['USDJPY', 'EURUSD', 'GBPUSD']);
      return forexRates || [];
    } catch (error) {
      console.error('❌ [市場データ収集エラー]:', (error as Error).message);
      return [];
    }
  }

  private async collectNewsData(): Promise<any[]> {
    console.log('📰 [ニュースデータ収集] RSS収集中...');
    try {
      // RSS収集エンジンがある場合は使用、ない場合は簡易実装
      if (typeof RssParallelCollectionEngine !== 'undefined') {
        const rssCollector = new RssParallelCollectionEngine();
        const newsData = await rssCollector.collectFromAllSources();
        return newsData || [];
      } else {
        // 簡易ニュース収集（Yahoo Finance RSS）
        const response = await axios.get('https://finance.yahoo.com/rss/topstories', { timeout: 10000 });
        return [{ title: 'RSS収集テスト', content: response.data.slice(0, 200) }];
      }
    } catch (error) {
      console.error('❌ [ニュースデータ収集エラー]:', (error as Error).message);
      return [];
    }
  }

  private async collectCommunityData(): Promise<any[]> {
    console.log('💬 [コミュニティデータ収集] Reddit/HN収集中...');
    try {
      // Reddit APIの簡易実装（認証不要の公開データ）
      const response = await axios.get('https://www.reddit.com/r/investing/hot.json?limit=5', { 
        timeout: 10000,
        headers: { 'User-Agent': 'TradingAssistant/1.0' }
      });
      
      if (response.data?.data?.children) {
        return response.data.data.children.map((post: any) => ({
          title: post.data.title,
          score: post.data.score,
          url: post.data.url,
          created: post.data.created_utc
        }));
      }
      return [];
    } catch (error) {
      console.error('❌ [コミュニティデータ収集エラー]:', (error as Error).message);
      return [];
    }
  }

  private async collectEconomicData(): Promise<any[]> {
    console.log('📊 [経済データ収集] FRED API使用...');
    try {
      const apiKey = process.env.FRED_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ FRED_API_KEY が設定されていません');
        return [];
      }
      
      // GDP、失業率、インフレ率の最新データ取得
      const indicators = ['GDP', 'UNRATE', 'CPIAUCSL'];
      const economicData = [];
      
      for (const indicator of indicators) {
        try {
          const response = await axios.get(
            `https://api.stlouisfed.org/fred/series/observations?series_id=${indicator}&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`,
            { timeout: 15000 }
          );
          
          if (response.data?.observations?.length > 0) {
            economicData.push({
              indicator,
              value: response.data.observations[0].value,
              date: response.data.observations[0].date
            });
          }
        } catch (error) {
          console.error(`❌ [${indicator}データ取得エラー]:`, (error as Error).message);
        }
      }
      
      return economicData;
    } catch (error) {
      console.error('❌ [経済データ収集エラー]:', (error as Error).message);
      return [];
    }
  }

  private async buildIntegratedContext(data: {
    marketData: any[];
    newsData: any[];
    communityData: any[];
    economicData: any[];
  }): Promise<IntegratedContext> {
    // 収集データから統合コンテキスト生成
    return {
      timestamp: new Date().toISOString(),
      account: {
        currentState: await this.analyzeAccountStatus(),
        recommendations: ['実データに基づく推奨事項', '市場動向活用', 'エンゲージメント最適化'],
        healthScore: 75
      },
      market: {
        condition: this.analyzeMarketCondition(data.marketData),
        volatility: this.calculateVolatility(data.marketData),
        trends: data.newsData.slice(0, 5).map(news => news.title || ''),
        sentiment: this.analyzeSentiment(data.communityData)
      },
      content: {
        recentTopics: data.newsData.slice(0, 10).map(news => news.title || ''),
        engagement: data.communityData.slice(0, 5).map(post => ({ 
          topic: post.title || '', 
          score: post.score || 0 
        })),
        gaps: ['実データ活用コンテンツ', '時事性重視', '専門性強化']
      },
      realDataQuality: {
        marketDataCount: data.marketData.length,
        newsDataCount: data.newsData.length,
        communityDataCount: data.communityData.length,
        economicDataCount: data.economicData.length,
        totalQualityScore: Math.min(100, (data.marketData.length + data.newsData.length + data.communityData.length + data.economicData.length) * 5)
      },
      actionSuggestions: await this.generateActionSuggestions()
    } as IntegratedContext;
  }

  private analyzeMarketCondition(marketData: any[]): string {
    if (!marketData || marketData.length === 0) return 'unknown';
    
    // 簡易的な市場状況判定
    const currentHour = new Date().getHours();
    if (currentHour >= 9 && currentHour <= 11) return 'opening_high_volatility';
    if (currentHour >= 14 && currentHour <= 16) return 'mid_day_stable';
    if (currentHour >= 21 || currentHour <= 6) return 'overnight_low_volume';
    return 'normal_trading';
  }

  private calculateVolatility(marketData: any[]): number {
    // 簡易ボラティリティ計算（実装を簡素化）
    return marketData.length > 0 ? Math.random() * 20 + 10 : 15;
  }

  private analyzeSentiment(communityData: any[]): string {
    if (!communityData || communityData.length === 0) return 'neutral';
    
    // Reddit投稿のスコア平均で感情分析
    const avgScore = communityData.reduce((sum, post) => sum + (post.score || 0), 0) / communityData.length;
    if (avgScore > 50) return 'positive';
    if (avgScore < 10) return 'negative';
    return 'neutral';
  }

  private async getFallbackContext(): Promise<IntegratedContext> {
    // モックデータを使用したフォールバックコンテキスト
    return {
      timestamp: new Date().toISOString(),
      account: {
        currentState: await this.analyzeAccountStatus(),
        recommendations: ['基本的な投資教育コンテンツ', '定期的な市場分析', 'フォロワーとの交流'],
        healthScore: 75
      },
      market: {
        condition: 'normal_trading',
        volatility: 15,
        trends: ['投資教育需要増加', '長期投資トレンド', 'ESG投資拡大'],
        sentiment: 'neutral'
      },
      content: {
        recentTopics: ['投資基礎', '資産運用', '市場分析', 'リスク管理'],
        engagement: [
          { topic: '投資教育コンテンツ', score: 85 },
          { topic: '市場分析', score: 78 }
        ],
        gaps: ['実データ活用コンテンツ', '時事性重視', '専門性強化']
      },
      realDataQuality: {
        marketDataCount: 0,
        newsDataCount: 0,
        communityDataCount: 0,
        economicDataCount: 0,
        totalQualityScore: 0
      },
      actionSuggestions: await this.generateActionSuggestions()
    } as IntegratedContext;
  }
}