import { claude } from '@instantlyeasy/claude-code-sdk-ts';
import type { Context, IntegratedContext, AccountStatus } from '../types/system-types.js';
import type { Decision } from '../types/decision-types.js';
import { loadYamlSafe, loadYamlArraySafe } from '../utils/yaml-utils';
import * as yaml from 'js-yaml';
import * as path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

// REQUIREMENTS.md準拠の意思決定フロー型定義
interface SituationAnalysis {
  accountStatus: AccountStatus;
  marketCondition: MarketCondition;
  timeContext: TimeContext;
  healthScore: number;
  urgencyLevel: 'low' | 'medium' | 'high';
}

interface MarketCondition {
  volatility: 'low' | 'medium' | 'high';
  newsUrgency: NewsUrgency;
  economicEvents: EconomicEvent[];
}

interface TimeContext {
  currentTime: string;
  dayOfWeek: string;
  optimalPostingTime: boolean;
}

interface SelectedStrategy {
  collectionStrategy: CollectionStrategy;
  contentStrategy: ContentStrategy;
  postingStrategy: PostingTiming;
  reasoning: string;
}

interface CollectionStrategy {
  method: 'rss_focused' | 'multi_source' | 'account_analysis';
  sources: string[];
  priority: 'high' | 'medium' | 'low';
  timeAllocation: number;
}

interface ContentStrategy {
  type: 'educational' | 'trend_responsive' | 'analysis_focused';
  themes: string[];
  tone: string;
  targetAudience: string;
}

interface PostingTiming {
  strategy: 'scheduled' | 'opportunity' | 'optimized';
  recommendedTime: string;
  urgency: 'immediate' | 'scheduled' | 'flexible';
}

interface NewsUrgency {
  level: 'immediate' | 'daily' | 'weekly';
  events: string[];
}

interface EconomicEvent {
  name: string;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
}

interface FollowerProfile {
  stage: 'growth_initial' | 'growth_trajectory' | 'established';
  demographics: string;
  preferences: string[];
}

interface EngagementMetrics {
  averageRate: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  variance: number;
}

interface PostingHistory {
  recentPosts: number;
  successfulTimes: string[];
  engagementPattern: Record<string, number>;
}

interface BrandStrategy {
  brand_identity: {
    core_theme: string;
    target_audience: string;
    tone_style: string;
    expertise_areas: string[];
  };
  growth_stage_rules: {
    stage_1: {
      theme_consistency: number;
      allowed_themes: string[];
    };
    stage_2: {
      theme_consistency: number;
      allowed_themes: string[];
    };
    stage_3: {
      theme_consistency: number;
      allowed_themes: string[];
    };
  };
}

interface ActionDecision {
  id: string;
  type: 'original_post' | 'quote_tweet' | 'retweet' | 'reply';
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  description?: string;
  params?: any;
  content?: string;
  estimatedDuration?: number;
}

enum CollectionMethod {
  SIMPLE_HTTP = 'simple_http',
  API_PREFERRED = 'api_preferred',
  PLAYWRIGHT_STEALTH = 'playwright_stealth',
  HYBRID = 'hybrid'
}

interface DecisionLoggingPerformanceMetrics {
  sessionId: string;
  timestamp: string;
  decisionTime: number;
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  claudeApiCalls: number;
  cacheHitRate: number;
  resourceUsage: ResourceUsage;
}

interface ResourceUsage {
  timeMs: number;
  memoryMb: number;
  cpuPercent: number;
  networkRequests: number;
}

interface CollectionTask {
  id: string;
  priority: number;
  method: CollectionMethod;
  qualityTarget?: number;
  estimatedCost?: ResourceCost;
}

interface ResourceCost {
  timeMs: number;
  memoryMb: number;
  cpuUnits: number;
}

interface SiteProfile {
  requiresJavaScript: boolean;
  hasAntiBot: boolean;
  loadSpeed: string;
  contentStructure: string;
  updateFrequency: string;
  contentQuality: number;
  relevanceScore: number;
  bestCollectionTime: { start: number; end: number };
  optimalMethod: CollectionMethod;
  averageResponseTime: number;
}

function isDecision(obj: unknown): obj is Decision {
  return typeof obj === 'object'
    && obj !== null
    && 'id' in obj
    && 'type' in obj
    && 'priority' in obj
    && 'reasoning' in obj;
}

export class SystemDecisionEngine {
  private brandStrategy: BrandStrategy | null = null;

  constructor() {
    console.log('🎯 [DecisionEngine] 意思決定エンジン初期化完了');
  }

  /**
   * REQUIREMENTS.md準拠の意思決定フローメソッド
   */
  
  // 現在状況分析
  async analyzeCurrentSituation(): Promise<SituationAnalysis> {
    console.log('🔍 [状況分析] 現在の状況を総合的に分析中...');
    
    try {
      const accountStatus = await this.getAccountStatus();
      const marketCondition = await this.analyzeMarketCondition();
      const timeContext = this.analyzeTimeContext();
      
      // ヘルススコア計算
      const healthScore = this.calculateHealthScore(accountStatus, marketCondition);
      
      // 緊急度判定
      const urgencyLevel = this.determineUrgencyLevel(accountStatus, marketCondition);
      
      const analysis: SituationAnalysis = {
        accountStatus,
        marketCondition,
        timeContext,
        healthScore,
        urgencyLevel
      };
      
      console.log(`✅ [状況分析完了] ヘルス:${healthScore}, 緊急度:${urgencyLevel}`);
      return analysis;
      
    } catch (error) {
      console.error('❌ [状況分析エラー]:', error);
      return this.getFallbackSituationAnalysis();
    }
  }
  
  // 戦略選択判断
  async selectStrategy(analysis: SituationAnalysis): Promise<SelectedStrategy> {
    console.log('🎯 [戦略選択] 状況に基づく最適戦略を選択中...');
    
    try {
      // 1. ホットデータから即座に判断 (階層型データ活用)
      const weeklyData = await this.loadHierarchicalData('data/current/weekly-summary.yaml');
      if (weeklyData?.summary?.avg_engagement !== undefined && weeklyData.summary.avg_engagement < 2) {
        console.log('📊 [階層データ] 週次データから低エンゲージメント検出 → 戦略調整');
        return await this.adjustStrategyBasedOnWeekly(weeklyData, analysis);
      }
      
      // 2. 必要に応じてウォームデータを参照
      const patterns = await this.loadHierarchicalData('data/learning/engagement-patterns.yaml');
      const insights = await this.loadHierarchicalData('data/learning/post-insights.yaml');
      
      if (patterns?.patterns || insights?.insights) {
        console.log('🔍 [階層データ] 学習データからパターン分析中...');
        const optimizedStrategy = await this.optimizeStrategyWithPatterns(patterns, insights, analysis);
        if (optimizedStrategy) {
          console.log('✅ [階層データ] パターンベース最適化戦略を採用');
          return optimizedStrategy;
        }
      }
      
      // 3. 従来の分析手法 (フォールバック)
      console.log('📋 [階層データ] 標準分析手法を適用');
      
      // アカウント状態による分岐 (REQUIREMENTS.md準拠)
      const followerCount = analysis.accountStatus.followers.current;
      const engagementRate = parseFloat(analysis.accountStatus.engagement.engagement_rate);
      
      const collectionStrategy = await this.determineCollectionStrategy(
        analysis.accountStatus, 
        analysis.marketCondition
      );
      
      const contentStrategy = await this.determineContentStrategy(
        this.getFollowerProfile(followerCount),
        this.getEngagementMetrics(analysis.accountStatus)
      );
      
      const postingStrategy = await this.determinePostingTiming(
        analysis.marketCondition.newsUrgency,
        this.getPostingHistory(analysis.accountStatus)
      );
      
      const strategy: SelectedStrategy = {
        collectionStrategy,
        contentStrategy,
        postingStrategy,
        reasoning: `フォロワー数:${followerCount}、エンゲージメント:${engagementRate}%、ヘルス:${analysis.healthScore}に基づく戦略選択`
      };
      
      console.log(`✅ [戦略選択完了] ${contentStrategy.type} + ${collectionStrategy.method}`);
      return strategy;
      
    } catch (error) {
      console.error('❌ [戦略選択エラー]:', error);
      return this.getFallbackStrategy();
    }
  }
  
  // データ収集戦略決定
  async determineCollectionStrategy(
    accountStatus: AccountStatus,
    marketCondition: MarketCondition
  ): Promise<CollectionStrategy> {
    const followerCount = accountStatus.followers.current;
    
    // REQUIREMENTS.md準拠の判断基準
    if (followerCount < 1000) {
      // 成長初期段階: RSS集中 + 教育重視 + 定時投稿
      return {
        method: 'rss_focused',
        sources: ['rss_feeds'],
        priority: 'high',
        timeAllocation: 80
      };
    } else if (followerCount < 10000) {
      // 成長軌道段階: 複合収集 + バランス型 + 最適化投稿
      return {
        method: 'multi_source', 
        sources: ['rss_feeds', 'market_data'],
        priority: 'medium',
        timeAllocation: 60
      };
    } else {
      // 確立段階: 戦略的収集 + 分析特化 + 機会的投稿
      return {
        method: 'multi_source',
        sources: ['rss_feeds', 'market_data', 'community'],
        priority: 'high',
        timeAllocation: 100
      };
    }
  }
  
  // コンテンツ生成戦略決定
  async determineContentStrategy(
    followerProfile: FollowerProfile,
    engagement: EngagementMetrics
  ): Promise<ContentStrategy> {
    // エンゲージメントによる分岐 (REQUIREMENTS.md準拠)
    if (engagement.averageRate < 3) {
      // 低エンゲージメント: トレンド対応強化、投稿時間再調整
      return {
        type: 'trend_responsive',
        themes: ['市場トレンド', 'タイムリーな分析', '注目銘柄'],
        tone: '親しみやすく、わかりやすい',
        targetAudience: '投資初心者・兼業トレーダー'
      };
    } else if (engagement.averageRate > 5) {
      // 高エンゲージメント: 現在戦略維持、質的向上集中
      return {
        type: 'educational',
        themes: ['投資基礎', 'リスク管理', '長期戦略'],
        tone: '教育的で信頼できる',
        targetAudience: followerProfile.demographics
      };
    } else {
      // 変動大: A/Bテスト的戦略切り替え
      return {
        type: 'analysis_focused',
        themes: ['市場分析', '経済指標解説', 'テクニカル分析'],
        tone: '専門的だが理解しやすい',
        targetAudience: '中級者向け'
      };
    }
  }
  
  // 投稿タイミング決定
  async determinePostingTiming(
    urgency: NewsUrgency,
    historicalData: PostingHistory
  ): Promise<PostingTiming> {
    // 外部環境による分岐 (REQUIREMENTS.md準拠)
    if (urgency.level === 'immediate') {
      // 重要経済指標発表: 即座に分析特化型へ切り替え
      return {
        strategy: 'opportunity',
        recommendedTime: 'immediate',
        urgency: 'immediate'
      };
    }
    
    // 成功パターンに基づく最適時間選択
    const optimalTimes = historicalData.successfulTimes;
    const currentHour = new Date().getHours();
    const isOptimalTime = optimalTimes.some(time => {
      const timeHour = parseInt(time.split(':')[0]);
      return Math.abs(timeHour - currentHour) <= 1;
    });
    
    if (isOptimalTime) {
      return {
        strategy: 'optimized',
        recommendedTime: `${currentHour}:00`,
        urgency: 'scheduled'
      };
    }
    
    return {
      strategy: 'scheduled',
      recommendedTime: optimalTimes[0] || '21:00',
      urgency: 'flexible'
    };
  }
  
  // ヘルパーメソッド群
  private async getAccountStatus(): Promise<AccountStatus> {
    try {
      const accountStatusPath = path.join(process.cwd(), 'data', 'current', 'account-status.yaml');
      const status = loadYamlSafe<AccountStatus>(accountStatusPath);
      return status || this.getDefaultAccountStatus();
    } catch (error) {
      console.warn('⚠️ アカウント情報取得失敗:', error);
      return this.getDefaultAccountStatus();
    }
  }
  
  private async analyzeMarketCondition(): Promise<MarketCondition> {
    // 簡略化された市場状況分析
    const currentHour = new Date().getHours();
    const isMarketHours = currentHour >= 9 && currentHour <= 15;
    
    return {
      volatility: isMarketHours ? 'medium' : 'low',
      newsUrgency: {
        level: 'daily',
        events: []
      },
      economicEvents: []
    };
  }
  
  private analyzeTimeContext(): TimeContext {
    const now = new Date();
    const optimalHours = [7, 8, 12, 18, 19, 21, 22];
    
    return {
      currentTime: now.toISOString(),
      dayOfWeek: ['日', '月', '火', '水', '木', '金', '土'][now.getDay()],
      optimalPostingTime: optimalHours.includes(now.getHours())
    };
  }
  
  private calculateHealthScore(accountStatus: AccountStatus, marketCondition: MarketCondition): number {
    let score = 70; // ベーススコア
    
    // フォロワー数ボーナス
    if (accountStatus.followers.current > 100) score += 10;
    if (accountStatus.followers.change_24h > 0) score += 5;
    
    // エンゲージメントボーナス
    const engagementRate = parseFloat(accountStatus.engagement.engagement_rate);
    if (engagementRate > 5) score += 10;
    
    // 投稿頻度チェック
    if (accountStatus.performance.posts_today >= 5) score += 5;
    
    return Math.min(100, Math.max(0, score));
  }
  
  private determineUrgencyLevel(accountStatus: AccountStatus, marketCondition: MarketCondition): 'low' | 'medium' | 'high' {
    if (marketCondition.newsUrgency.level === 'immediate') return 'high';
    if (accountStatus.performance.posts_today < 5) return 'medium';
    return 'low';
  }
  
  private getFollowerProfile(followerCount: number): FollowerProfile {
    if (followerCount < 1000) {
      return {
        stage: 'growth_initial',
        demographics: '投資初心者中心',
        preferences: ['基礎教育', '分かりやすい解説']
      };
    } else if (followerCount < 10000) {
      return {
        stage: 'growth_trajectory',
        demographics: '初心者～中級者',
        preferences: ['実践的な内容', '市場分析']
      };
    } else {
      return {
        stage: 'established',
        demographics: '中級者以上',
        preferences: ['専門的分析', '独自見解']
      };
    }
  }
  
  private getEngagementMetrics(accountStatus: AccountStatus): EngagementMetrics {
    const rate = parseFloat(accountStatus.engagement.engagement_rate);
    return {
      averageRate: rate,
      trend: rate > 3 ? 'increasing' : 'stable',
      variance: 1.2
    };
  }
  
  private getPostingHistory(accountStatus: AccountStatus): PostingHistory {
    return {
      recentPosts: accountStatus.performance.posts_today,
      successfulTimes: ['21:00', '20:00', '19:00'],
      engagementPattern: {
        '21:00': 1.4,
        '20:00': 1.3,
        '19:00': 0.9
      }
    };
  }
  
  // フォールバック戦略群
  private getFallbackSituationAnalysis(): SituationAnalysis {
    return {
      accountStatus: this.getDefaultAccountStatus(),
      marketCondition: {
        volatility: 'medium',
        newsUrgency: { level: 'daily', events: [] },
        economicEvents: []
      },
      timeContext: this.analyzeTimeContext(),
      healthScore: 70,
      urgencyLevel: 'medium'
    };
  }
  
  private getFallbackStrategy(): SelectedStrategy {
    return {
      collectionStrategy: {
        method: 'rss_focused',
        sources: ['rss_feeds'],
        priority: 'medium',
        timeAllocation: 60
      },
      contentStrategy: {
        type: 'educational',
        themes: ['投資基礎'],
        tone: '教育的で親しみやすい',
        targetAudience: '投資初心者'
      },
      postingStrategy: {
        strategy: 'scheduled',
        recommendedTime: '21:00',
        urgency: 'scheduled'
      },
      reasoning: 'フォールバック戦略: 基本的な教育コンテンツ戦略'
    };
  }
  
  private getDefaultAccountStatus(): AccountStatus {
    return {
      timestamp: new Date().toISOString(),
      followers: { current: 5, change_24h: 0, growth_rate: '0%' },
      engagement: { avg_likes: 0, avg_retweets: 0, engagement_rate: '0%' },
      performance: { posts_today: 0, target_progress: '0%', best_posting_time: '21:00' },
      health: { status: 'healthy', api_limits: 'normal', quality_score: 70 },
      recommendations: [],
      healthScore: 70
    };
  }

  /**
   * 統合意思決定メソッド - REQUIREMENTS.md準拠の完全フロー
   */
  async executeComprehensiveDecision(): Promise<Decision[]> {
    console.log('🎯 [統合決定] REQUIREMENTS.md準拠の完全意思決定フローを実行中...');
    
    try {
      // 1. 現在状況分析
      const situationAnalysis = await this.analyzeCurrentSituation();
      
      // 2. 戦略選択
      const selectedStrategy = await this.selectStrategy(situationAnalysis);
      
      // 3. 意思決定生成
      const decisions = await this.generateDecisionsFromStrategy(selectedStrategy, situationAnalysis);
      
      // 4. ブランド一貫性チェック
      const brandCheckedDecisions = await Promise.all(
        decisions.map(decision => this.checkBrandConsistency(decision))
      );
      
      // 5. 決定保存
      await this.saveDecisions(brandCheckedDecisions);
      
      console.log(`✅ [統合決定完了] ${brandCheckedDecisions.length}件の高品質決定を生成`);
      return brandCheckedDecisions;
      
    } catch (error) {
      console.error('❌ [統合決定エラー]:', error);
      return this.createBasicFallbackDecisions();
    }
  }
  
  private async generateDecisionsFromStrategy(
    strategy: SelectedStrategy, 
    analysis: SituationAnalysis
  ): Promise<Decision[]> {
    const decisions: Decision[] = [];
    
    // 戦略に基づく決定生成
    const decision: Decision = {
      id: `strategy-decision-${Date.now()}`,
      type: 'content_creation',
      priority: analysis.urgencyLevel === 'high' ? 'high' : 'medium',
      reasoning: `${strategy.reasoning} - ${strategy.contentStrategy.type}戦略を適用`,
      confidence: 0.8,
      data: {
        context: {
          environment: 'strategic_decision',
          constraints: [],
          objectives: ['brand_consistency', 'educational_value'],
          timeframe: strategy.postingStrategy.urgency
        },
        factors: [
          {
            name: 'account_health',
            weight: 0.7,
            value: analysis.healthScore,
            reasoning: 'アカウント健康度による戦略調整'
          },
          {
            name: 'market_condition',
            weight: 0.5,
            value: analysis.marketCondition.volatility === 'high' ? 80 : 60,
            reasoning: '市場状況に基づく内容選択'
          }
        ],
        alternatives: []
      },
      timestamp: new Date().toISOString(),
      status: 'pending',
      params: {
        actionType: 'original_post',
        originalContent: this.generateContentFromStrategy(strategy),
        contentType: strategy.contentStrategy.type,
        timing: strategy.postingStrategy.recommendedTime,
        themes: strategy.contentStrategy.themes
      },
      dependencies: [],
      estimatedDuration: 30
    };
    
    decisions.push(decision);
    return decisions;
  }
  
  private generateContentFromStrategy(strategy: SelectedStrategy): string {
    const themes = strategy.contentStrategy.themes;
    const primaryTheme = themes[0] || '投資基礎';
    
    const contentTemplates = {
      educational: `【${primaryTheme}】投資初心者が知っておくべき基本原則について。リスク管理の重要性と、長期的な視点での資産形成のポイントを解説します。`,
      trend_responsive: `【市場動向】現在の${primaryTheme}について注目すべきポイント。最新の市場トレンドから読み取れる投資機会と注意点を分析します。`,
      analysis_focused: `【${primaryTheme}】専門的な視点から今日の市場を分析。データに基づいた客観的な市場評価と投資戦略を提示します。`
    };
    
    return contentTemplates[strategy.contentStrategy.type] || contentTemplates.educational;
  }
  
  private createBasicFallbackDecisions(): Decision[] {
    const fallbackDecision: Decision = {
      id: `fallback-${Date.now()}`,
      type: 'content_creation',
      priority: 'medium',
      reasoning: 'システムエラー時のフォールバック決定',
      confidence: 0.5,
      data: {
        context: { environment: 'fallback', constraints: [], objectives: ['basic_education'], timeframe: 'scheduled' },
        factors: [],
        alternatives: []
      },
      timestamp: new Date().toISOString(),
      status: 'pending',
      params: {
        actionType: 'original_post',
        originalContent: '投資の基本原則：リスク管理と長期視点の重要性について',
        contentType: 'educational'
      },
      dependencies: [],
      estimatedDuration: 30
    };
    
    return [fallbackDecision];
  }

  private async loadBrandStrategy(): Promise<BrandStrategy | null> {
    if (this.brandStrategy) {
      return this.brandStrategy;
    }

    try {
      const brandStrategyPath = path.join(process.cwd(), 'data', 'config', 'brand-strategy.yaml');
      this.brandStrategy = loadYamlSafe<BrandStrategy>(brandStrategyPath);
      console.log('📋 [ブランド戦略] brand-strategy.yaml読み込み完了');
      return this.brandStrategy;
    } catch (error) {
      console.warn('⚠️ [ブランド戦略] brand-strategy.yaml読み込みに失敗:', error);
      return null;
    }
  }

  private async getCurrentFollowerCount(): Promise<number> {
    try {
      const accountStatusPath = path.join(process.cwd(), 'data', 'current', 'account-status.yaml');
      const accountData = loadYamlSafe<any>(accountStatusPath);
      return accountData?.followers || 500; // デフォルト値
    } catch (error) {
      console.warn('⚠️ [フォロワー数] アカウント情報の取得に失敗:', error);
      return 500; // デフォルト値
    }
  }

  private determineGrowthStage(followerCount: number): 'stage_1' | 'stage_2' | 'stage_3' {
    if (followerCount < 1000) return 'stage_1';
    if (followerCount < 5000) return 'stage_2';
    return 'stage_3';
  }

  private async checkBrandConsistency(decision: Decision): Promise<Decision> {
    const brandStrategy = await this.loadBrandStrategy();
    if (!brandStrategy) {
      console.log('📋 [ブランドチェック] ブランド戦略なし - 決定をそのまま承認');
      return decision;
    }

    const followerCount = await this.getCurrentFollowerCount();
    const currentStage = this.determineGrowthStage(followerCount);
    const stageRules = brandStrategy.growth_stage_rules[currentStage];

    console.log(`🎯 [ブランドチェック] 成長段階: ${currentStage}, フォロワー数: ${followerCount}`);

    // テーマ一貫性チェック
    const isThemeConsistent = this.checkThemeConsistency(decision, stageRules, brandStrategy);
    
    if (isThemeConsistent) {
      console.log('✅ [ブランドチェック] テーマ一貫性確認');
      return this.enhanceDecisionWithBrandGuidelines(decision, brandStrategy);
    } else {
      console.log('⚠️ [ブランドチェック] テーマ一貫性修正が必要');
      return this.adjustDecisionForBrandConsistency(decision, stageRules, brandStrategy);
    }
  }

  private checkThemeConsistency(decision: Decision, stageRules: any, brandStrategy: BrandStrategy): boolean {
    const content = decision.params?.originalContent || '';
    const coreThemeKeywords = ['投資', '基礎', '初心者', 'リスク管理', '長期投資'];
    
    // 現在のステージで許可されたテーマのチェック
    if (stageRules.allowed_themes.includes('all')) {
      return true; // stage_3では全テーマ許可
    }

    // investment_basicsテーマのキーワードチェック
    const hasEducationalKeywords = coreThemeKeywords.some(keyword => content.includes(keyword));
    
    if (stageRules.allowed_themes.includes('investment_basics') && hasEducationalKeywords) {
      return true;
    }

    // market_analysisテーマのチェック（stage_2以降）
    if (stageRules.allowed_themes.includes('market_analysis')) {
      const marketKeywords = ['市場', '分析', '動向', '経済', '指標'];
      const hasMarketKeywords = marketKeywords.some(keyword => content.includes(keyword));
      if (hasMarketKeywords) return true;
    }

    return false;
  }

  private enhanceDecisionWithBrandGuidelines(decision: Decision, brandStrategy: BrandStrategy): Decision {
    const enhancedParams = {
      ...decision.params,
      brandTone: brandStrategy.brand_identity.tone_style,
      targetAudience: brandStrategy.brand_identity.target_audience,
      coreTheme: brandStrategy.brand_identity.core_theme,
      brandEnhanced: true
    };

    return {
      ...decision,
      params: enhancedParams,
      reasoning: decision.reasoning + ` (ブランドガイドライン適用: ${brandStrategy.brand_identity.core_theme})`
    };
  }

  private adjustDecisionForBrandConsistency(
    decision: Decision, 
    stageRules: any, 
    brandStrategy: BrandStrategy
  ): Decision {
    // ブランドに適合するようにコンテンツを調整
    const adjustedContent = `【投資初心者向け基礎教育】${brandStrategy.brand_identity.core_theme}について。${brandStrategy.brand_identity.tone_style}で解説いたします。`;
    
    return {
      ...decision,
      params: {
        ...decision.params,
        originalContent: adjustedContent,
        brandTone: brandStrategy.brand_identity.tone_style,
        targetAudience: brandStrategy.brand_identity.target_audience,
        coreTheme: brandStrategy.brand_identity.core_theme,
        brandAdjusted: true
      },
      reasoning: `ブランド一貫性のため調整: ${brandStrategy.brand_identity.core_theme}に特化`,
      priority: decision.priority === 'high' ? 'high' : 'medium'
    };
  }

  async planActionsWithIntegratedContext(integratedContext: IntegratedContext): Promise<Decision[]> {
    console.log('🧠 [統合コンテキスト決定] IntegratedContextを活用した意思決定を開始...');
    console.log('📊 統合情報:', {
      accountHealth: integratedContext.account.healthScore,
      trendCount: integratedContext.market.trends.length,
      opportunityCount: integratedContext.market.opportunities.length,
      suggestionCount: integratedContext.actionSuggestions.length
    });

    try {
      const decisions = await this.makeIntegratedDecisions(integratedContext);
      await this.saveIntegratedDecisions(decisions, integratedContext);
      
      console.log(`✅ [統合決定完了] ${decisions.length}件の統合的決定を策定`);
      return decisions;
    } catch (error) {
      console.error('❌ [統合決定エラー]:', error);
      return this.createFallbackDecisions(integratedContext);
    }
  }

  async analyzeAndDecide(context: Context): Promise<Decision[]> {
    console.log('🧠 [Claude分析開始] コンテキスト分析中...');
    console.log('📊 現在の状況:', {
      timestamp: context.timestamp,
      systemStatus: context.systemStatus,
      hasMetrics: !!context.metrics,
      recentActionsCount: context.recentActions?.length || 0
    });
    
    try {
      const decisions = await this.makeBasicDecisions(context);
      await this.saveDecisions(decisions);
      return decisions;
    } catch (error) {
      console.error('❌ [基本決定エラー]:', error);
      return [];
    }
  }

  private async makeIntegratedDecisions(integratedContext: IntegratedContext): Promise<Decision[]> {
    console.log('🧠 [統合意思決定] 統合コンテキストに基づく決定を実行中...');
    console.log('📊 [統合解析] アカウント健康度:', integratedContext.account.healthScore, '市場機会:', integratedContext.market.opportunities.length, '件');
    
    const claudePrompt = `
Based on the context, make strategic decisions for X (Twitter) content focused on original posts:

ACCOUNT STATUS:
- Health Score: ${integratedContext.account.healthScore}/100
- Followers: ${(integratedContext.account as any).followers || 'N/A'}
- Engagement: ${(integratedContext.account as any).engagement || 'N/A'}

MARKET CONTEXT:
- Opportunities: ${integratedContext.market.opportunities.length}
- Trends: ${integratedContext.market.trends.length}

Return decisions as JSON array with this exact structure:
[{
  "id": "decision-${Date.now()}-001",
  "type": "content_generation",
  "priority": "high|medium|low",
  "reasoning": "explanation of reasoning",
  "params": {
    "actionType": "original_post",
    "originalContent": "specific educational content",
    "expectedImpact": 0.7
  },
  "dependencies": [],
  "estimatedDuration": 30
}]

Limit to 2-3 decisions maximum for original posts only.
`;

    const startTime = Date.now();

    try {
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(8000)
        .query(claudePrompt)
        .asText();

      const processingTime = Date.now() - startTime;
      console.log(`📝 [決定解析] Claude APIレスポンス受信完了 (${processingTime}ms)`);

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const decisions = JSON.parse(jsonMatch[0]);
        console.log(`✅ [Claude応答] ${decisions.length}件の決定を受信`);
        
        const validatedDecisions = this.validateDecisions(decisions);
        console.log(`✅ [決定完了] ${validatedDecisions.length}件の決定を検証通過`);
        
        // ブランド一貫性チェックを追加
        const brandCheckedDecisions = await Promise.all(
          validatedDecisions.map(decision => this.checkBrandConsistency(decision))
        );
        console.log(`✅ [ブランドチェック完了] ${brandCheckedDecisions.length}件の決定をブランド適合確認`);
        
        return brandCheckedDecisions;
      }
      
      console.log('⚠️ [統合決定] JSON解析に失敗、フォールバック決定を生成');
      return this.createFallbackDecisions(integratedContext);
      
    } catch (error) {
      console.error('❌ [統合決定エラー]:', error);
      return this.createFallbackDecisions(integratedContext);
    }
  }

  private async makeBasicDecisions(context: Context): Promise<Decision[]> {
    const prompt = `
Based on the current context, make basic strategic decisions:

CONTEXT:
- Timestamp: ${context.timestamp}
- System Status: ${context.systemStatus}
- Recent Actions: ${context.recentActions?.length || 0}

Return as JSON array:
[{
  "id": "decision-${Date.now()}-basic",
  "type": "content_generation",
  "priority": "medium",
  "reasoning": "Basic content generation",
  "params": {
    "actionType": "original_post",
    "originalContent": "Educational investment content"
  },
  "dependencies": [],
  "estimatedDuration": 30
}]
`;

    try {
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(6000)
        .query(prompt)
        .asText();

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return [];
    } catch (error) {
      console.error('❌ [基本決定エラー]:', error);
      return [];
    }
  }

  private validateDecisions(decisions: unknown[]): Decision[] {
    const validatedDecisions: Decision[] = [];
    
    for (const decision of decisions) {
      if (this.isValidDecision(decision)) {
        validatedDecisions.push(decision as Decision);
      }
    }
    
    return validatedDecisions;
  }

  private isValidDecision(obj: unknown): boolean {
    return typeof obj === 'object'
      && obj !== null
      && 'id' in obj
      && 'type' in obj
      && 'priority' in obj
      && 'reasoning' in obj;
  }





  private async saveDecisions(decisions: Decision[]): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const pathModule = await import('path');
      
      const decisionsPath = pathModule.join(process.cwd(), 'data', 'strategic-decisions.yaml');
      
      let history = loadYamlArraySafe<any>(decisionsPath);
      
      history.push({
        timestamp: new Date().toISOString(),
        decisions: decisions
      });
      
      if (history.length > 50) {
        history = history.slice(-50);
      }
      
      await fs.mkdir(pathModule.dirname(decisionsPath), { recursive: true });
      await fs.writeFile(decisionsPath, yaml.dump(history, { indent: 2 }));
    } catch (error) {
      console.warn('⚠️ [決定保存] ファイル保存に失敗:', error);
    }
  }

  // 決定の検証と強化
  private validateAndEnhanceDecisions(decisions: unknown[], context: IntegratedContext): Decision[] {
    console.log('✅ [決定検証] 決定の妥当性と戦略的整合性を検証中...');
    
    const validatedDecisions: Decision[] = [];
    
    for (const decision of decisions) {
      if (isDecision(decision)) {
        // 基本的な検証
        if (!decision.id || !decision.type || !decision.priority) {
          console.log(`⚠️ [検証失敗] 不完全な決定をスキップ: ${JSON.stringify(decision)}`);
          continue;
        }
        
        // アカウントヘルスに基づく調整
        const adjustedDecision = this.adjustDecisionForAccountHealth(decision, context.account.healthScore);
        
        // 市場機会との整合性チェック
        const contextualDecision = this.alignDecisionWithMarketContext(adjustedDecision, context.market);
        
        validatedDecisions.push(contextualDecision);
      } else {
        console.log(`⚠️ [検証失敗] 無効な決定をスキップ: ${JSON.stringify(decision)}`);
      }
    }
    
    console.log(`✅ [決定検証完了] ${validatedDecisions.length}/${decisions.length}件の決定を検証通過`);
    return validatedDecisions;
  }
  
  // アカウントヘルスに基づく決定調整
  private adjustDecisionForAccountHealth(decision: Decision, healthScore: number): Decision {
    let adjustedPriority = decision.priority;
    let adjustedParams = { ...decision.params };
    
    if (healthScore < 50) {
      // ヘルス低下時：保守的なアプローチ
      if (decision.priority === 'high') adjustedPriority = 'medium';
      adjustedParams.riskLevel = 'low';
      adjustedParams.contentType = 'educational';
    } else if (healthScore > 80) {
      // ヘルス良好時：積極的なアプローチ
      if (decision.priority === 'medium') adjustedPriority = 'high';
      adjustedParams.riskLevel = 'medium';
      adjustedParams.contentType = 'engaging';
    }
    
    return {
      ...decision,
      priority: adjustedPriority,
      params: adjustedParams,
      reasoning: decision.reasoning + ` (健康度${healthScore}に基づく調整)`
    };
  }
  
  // 市場コンテキストとの整合性確保
  private alignDecisionWithMarketContext(decision: Decision, marketContext: any): Decision {
    const enhancedParams = { ...decision.params };
    
    // 高優先度機会がある場合の調整
    const highPriorityOpportunities = marketContext.opportunities?.filter(
      (op: any) => op.priority === 'high'
    ).length || 0;
    
    if (highPriorityOpportunities > 2) {
      enhancedParams.urgency = 'high';
      enhancedParams.opportunityAlignment = 'strong';
    }
    
    // トレンド情報の豊富さに基づく調整
    const trendCount = marketContext.trends?.length || 0;
    if (trendCount > 5) {
      enhancedParams.trendAwareness = 'high';
      enhancedParams.contentRelevance = 'trending';
    }
    
    return {
      ...decision,
      params: enhancedParams
    };
  }
  
  // フォールバック決定の生成
  private createFallbackDecisions(context: IntegratedContext): Decision[] {
    console.log('🔄 [フォールバック決定] 基本的な決定を生成中...');
    
    const fallbackDecisions: Decision[] = [];
    
    // アカウントヘルスに基づく基本決定
    if (context.account.healthScore < 70) {
      fallbackDecisions.push({
        id: `fallback-${Date.now()}-health`,
        type: 'content_creation',
        priority: 'high',
        reasoning: 'アカウントヘルス改善のための教育的コンテンツ生成',
        confidence: 0.7,
        data: {
          context: { environment: 'fallback', constraints: ['health_score_low'], objectives: ['improve_engagement'], timeframe: 'immediate' },
          factors: [{ name: 'account_health', weight: 0.8, value: context.account.healthScore, reasoning: 'ヘルス低下のため教育的コンテンツが必要' }],
          alternatives: []
        },
        timestamp: new Date().toISOString(),
        status: 'pending',
        params: {
          actionType: 'original_post',
          originalContent: '投資の基本原則：リスク管理とポートフォリオ分散の重要性について',
          contentType: 'educational',
          expectedImpact: 0.6
        },
        dependencies: [],
        estimatedDuration: 30
      });
    }
    
    // 市場機会に基づく決定
    if (context.market.opportunities.length > 0) {
      fallbackDecisions.push({
        id: `fallback-${Date.now()}-opportunity`,
        type: 'content_creation',
        priority: 'medium',
        reasoning: '利用可能な市場機会を活用したオリジナル投稿',
        confidence: 0.6,
        data: {
          context: { environment: 'fallback', constraints: [], objectives: ['market_opportunity'], timeframe: 'immediate' },
          factors: [{ name: 'market_opportunities', weight: 0.6, value: context.market.opportunities.length, reasoning: '市場機会を活用' }],
          alternatives: []
        },
        timestamp: new Date().toISOString(),
        status: 'pending',
        params: {
          actionType: 'original_post',
          originalContent: '現在の市場動向から学ぶ投資戦略のポイント',
          timing: 'immediate',
          expectedImpact: 0.5
        },
        dependencies: [],
        estimatedDuration: 25
      });
    }
    
    // 基本的なコンテンツ生成決定
    fallbackDecisions.push({
      id: `fallback-${Date.now()}-basic`,
      type: 'content_creation',
      priority: 'low',
      reasoning: '基本的な投資教育コンテンツの提供',
      confidence: 0.5,
      data: {
        context: { environment: 'fallback', constraints: [], objectives: ['basic_education'], timeframe: 'scheduled' },
        factors: [{ name: 'basic_content', weight: 0.4, value: 1, reasoning: '基本的な教育コンテンツ' }],
        alternatives: []
      },
      timestamp: new Date().toISOString(),
      status: 'pending',
      params: {
        actionType: 'original_post',
        originalContent: '長期投資の視点：短期的な変動に惑わされない投資マインドの重要性',
        timing: 'scheduled',
        expectedImpact: 0.4
      },
      dependencies: [],
      estimatedDuration: 20
    });
    
    return fallbackDecisions;
  }
  
  // 拡張アクション戦略計画メソッド（投稿専用モード対応）
  async planExpandedActions(integratedContext: IntegratedContext): Promise<ActionDecision[]> {
    // 投稿専用モード判定
    const isPostingOnlyMode = process.env.X_TEST_MODE === 'true';
    
    if (isPostingOnlyMode) {
      console.log('📝 [投稿専用アクション計画] original_postのみに集中したアクション戦略を策定中...');
      console.log('📊 投稿専用情報:', {
        accountHealth: integratedContext.account.healthScore,
        mode: 'posting_only'
      });
      
      try {
        const postingOnlyDecisions = await this.createPostingOnlyActionDecisions(integratedContext);
        await this.saveExpandedActionDecisions(postingOnlyDecisions, integratedContext);
        
        console.log(`✅ [投稿専用アクション計画完了] ${postingOnlyDecisions.length}件の投稿専用戦略を策定`);
        return postingOnlyDecisions;
      } catch (error) {
        console.error('❌ [投稿専用アクション計画エラー]:', error);
        return this.createPostingOnlyFallback(integratedContext);
      }
    }
    
    // 通常モード（複数アクションタイプ）
    console.log('🚀 [拡張アクション計画] 統合コンテキストに基づく多様なアクション戦略を策定中...');
    console.log('📊 統合情報:', {
      accountHealth: integratedContext.account.healthScore,
      trendCount: integratedContext.market.trends.length,
      opportunityCount: integratedContext.market.opportunities.length,
      suggestionCount: integratedContext.actionSuggestions.length
    });

    try {
      const decisions = await this.makeExpandedActionDecisions(integratedContext);
      const actionDecisions = this.convertDecisionsToActionDecisions(decisions);
      await this.saveExpandedActionDecisions(actionDecisions, integratedContext);
      
      console.log(`✅ [拡張アクション計画完了] ${actionDecisions.length}件の多様なアクション戦略を策定`);
      return actionDecisions;
    } catch (error) {
      console.error('❌ [拡張アクション計画エラー]:', error);
      return this.createFallbackActionDecisions(integratedContext);
    }
  }

  // 拡張アクション決定の生成（独立版）
  async makeExpandedActionDecisions(
    context: IntegratedContext,
    needsEvaluation?: unknown
  ): Promise<Decision[]> {
    console.log('🧠 [拡張アクション決定] 独立した意思決定を開始...');
    
    try {
      // 1. 基本アクション決定（既存ロジック維持）
      const baseDecisions = await this.generateBaseActionDecisions(context, needsEvaluation);
      
      // 2. 新機能: アクション特化型情報収集
      const enhancedDecisions = await this.enhanceDecisionsWithSpecificCollection(
        baseDecisions,
        context
      );
      
      // 3. 最終決定生成（既存ロジック拡張）
      return await this.finalizeExpandedDecisions(enhancedDecisions, context);
      
    } catch (error) {
      console.error('拡張アクション決定エラー:', error);
      // フォールバック: 既存ロジックで継続
      return await this.generateBaseActionDecisions(context, needsEvaluation);
    }
  }

  // 新規メソッド: 基本アクション決定生成
  private async generateBaseActionDecisions(
    context: IntegratedContext,
    needsEvaluation?: unknown
  ): Promise<Decision[]> {
    console.log('🧠 [基本アクション決定] 基本的なアクション戦略を策定中...');
    
    const claudePrompt = `
Based on the integrated analysis context, create a strategic action plan for X (Twitter) focused on original posts:

ACCOUNT STATUS:
${JSON.stringify(context.account, null, 2)}

MARKET CONTEXT:
${JSON.stringify(context.market, null, 2)}

ACTION SUGGESTIONS:
${JSON.stringify(context.actionSuggestions, null, 2)}

Create strategic action decisions considering:
1. Focus on original_post content only
2. Account health and growth needs (current score: ${context.account.healthScore}/100)
3. Market trends and opportunities (${context.market.opportunities.length} opportunities available)
4. Quality over quantity approach

Available action type:
- original_post: Create original educational/insight content

Return decisions as JSON array with this exact structure:
[{
  "id": "decision-{timestamp}-{random}",
  "type": "content_generation",
  "priority": "critical|high|medium|low",
  "reasoning": "detailed explanation of strategic reasoning",
  "action": {
    "type": "original_post",
    "content": "specific educational content",
    "reasoning": "action-specific reasoning",
    "priority": "high|medium|low",
    "expectedImpact": 0.0-1.0
  },
  "expectedImpact": "expected outcome description",
  "dependencies": [],
  "estimatedDuration": number_in_minutes
}]

Prioritize based on account health:
- Health < 70: Focus on basic educational content
- Health 70-80: Intermediate educational content
- Health > 80: Advanced educational content

Limit to 3-5 strategic decisions for original posts only.
`;

    try {
      const response = await claude()
        .withModel('sonnet')
        .withTimeout(6000) // 6秒タイムアウト
        .query(claudePrompt)
        .asText();

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const decisions = JSON.parse(jsonMatch[0]);
        console.log(`✅ [基本アクション決定完了] ${decisions.length}件の基本決定を策定`);
        
        // ブランド一貫性チェックを追加
        const brandCheckedDecisions = await Promise.all(
          decisions.map((decision: Decision) => this.checkBrandConsistency(decision))
        );
        console.log(`✅ [基本アクションブランドチェック完了] ${brandCheckedDecisions.length}件の決定をブランド適合確認`);
        
        return brandCheckedDecisions;
      }
      
      return this.createFallbackDecisions(context);
    } catch (error) {
      console.error('❌ [基本アクション決定エラー]:', error);
      return this.createFallbackDecisions(context);
    }
  }

  // アクション特化型情報収集による決定強化（簡略化版）
  private async enhanceDecisionsWithSpecificCollection(
    baseDecisions: Decision[],
    context: IntegratedContext
  ): Promise<Decision[]> {
    console.log('🎯 [決定強化] 基本決定を返却（疎結合設計のため外部収集は使用しない）');
    return baseDecisions;
  }

  // 決定強化（簡略化版）
  private enhanceDecisionWithCollectionResults(decision: Decision): Decision {
    // 疎結合設計のため、外部収集結果には依存せず基本強化のみ実装
    // Decision型にはmetadataプロパティがないため、paramsに格納
    return {
      ...decision,
      params: {
        ...decision.params,
        enhanced: true,
        enhancementTimestamp: Date.now()
      }
    };
  }

  // 新規メソッド: 最終決定生成
  private async finalizeExpandedDecisions(
    enhancedDecisions: Decision[],
    context: IntegratedContext
  ): Promise<Decision[]> {
    console.log('🏁 [最終決定] 強化された決定を最終調整中...');
    
    // 既存の検証ロジックを活用
    const finalDecisions = this.validateAndEnhanceDecisions(enhancedDecisions, context);
    
    console.log(`✅ [拡張アクション決定完了] ${finalDecisions.length}件の統合的決定を策定`);
    return finalDecisions;
  }

  // アクション決定の検証
  private validateActionDecisions(decisions: unknown[]): ActionDecision[] {
    console.log('✅ [アクション決定検証] 決定の妥当性とパラメータを検証中...');
    
    const validatedDecisions: ActionDecision[] = [];
    
    for (const decision of decisions) {
      if (this.isActionDecisionLike(decision)) {
        // 基本的な検証
        if (!decision.id || !decision.type || !decision.priority) {
          console.log(`⚠️ [検証失敗] 不完全なアクション決定をスキップ: ${JSON.stringify(decision)}`);
          continue;
        }
        
        // 🚨 REMOVED: original_post only constraint - now supports all action types
        // 🧠 NEW: Claude自律的全アクションタイプ検証
        if (['original_post', 'quote_tweet', 'retweet', 'reply'].includes(decision.type)) {
          // アクションタイプ別パラメータ検証・補完
          if (decision.type === 'original_post') {
            if (!decision.params?.originalContent && !decision.content) {
              console.log(`⚠️ [パラメータ修正] originalContentを自動補完: ${decision.id}`);
              decision.params = decision.params || {};
              decision.params.originalContent = decision.content || '投資教育コンテンツ';
              decision.content = decision.params.originalContent;
            }
          } else if (decision.type === 'quote_tweet') {
            if (!decision.params?.quoteContent) {
              decision.params = decision.params || {};
              decision.params.quoteContent = decision.content || 'コメント';
            }
          } else if (decision.type === 'reply') {
            if (!decision.params?.replyContent) {
              decision.params = decision.params || {};
              decision.params.replyContent = decision.content || '返信';
            }
          }
          
          validatedDecisions.push(decision as ActionDecision);
          console.log(`✅ [Claude自律検証] ${decision.type}アクション検証通過: ${decision.id}`);
        } else {
          console.log(`⚠️ [検証失敗] 未対応アクションタイプをスキップ: ${decision.type}`);
          continue;
        }
      } else {
        console.log(`⚠️ [検証失敗] 無効なアクション決定をスキップ: ${JSON.stringify(decision)}`);
      }
    }
    
    console.log(`✅ [アクション決定検証完了] ${validatedDecisions.length}/${decisions.length}件の決定を検証通過`);
    return validatedDecisions;
  }

  // 新規メソッド: 投稿専用アクション決定の生成
  private async createPostingOnlyActionDecisions(context: IntegratedContext): Promise<ActionDecision[]> {
    console.log('📝 [投稿専用決定] original_postのみの高品質アクション決定を生成中...');
    
    const currentDate = new Date().toISOString().split('T')[0];
    const timeOfDay = new Date().getHours();
    let contentFocus = '';
    
    if (timeOfDay >= 7 && timeOfDay < 12) {
      contentFocus = '朝の市場開始前の戦略';
    } else if (timeOfDay >= 12 && timeOfDay < 17) {
      contentFocus = '日中の市場動向分析';
    } else {
      contentFocus = '市場終了後の振り返り';
    }
    
    // 高品質なoriginal_post決定を1～2件生成
    const postingDecisions: ActionDecision[] = [
      {
        id: `posting-only-${Date.now()}-main`,
        type: 'original_post',
        priority: 'high',
        reasoning: `投稿専用モード: ${contentFocus}に関する価値ある投資情報を提供`,
        description: `投稿専用モード: ${contentFocus}に関する価値ある投資情報を提供`,
        params: {
          originalContent: `【${currentDate} ${contentFocus}】テクニカル分析とファンダメンタル分析の組み合わせによる投資判断の重要性について。市場の短期的な変動に惑わされることなく、長期的な視点で投資戦略を組み立てることが成功への鍵となります。`,
          hashtags: ['#投資', '#資産形成', '#長期投資'],
          contentType: 'educational',
          timeOfDay,
          dateGenerated: currentDate
        },
        content: `【${currentDate} ${contentFocus}】テクニカル分析とファンダメンタル分析の組み合わせによる投資判断の重要性について。市場の短期的な変動に惑わされることなく、長期的な視点で投資戦略を組み立てることが成功への鍵となります。`,
        estimatedDuration: 25
      }
    ];

    // アカウントヘルスが高い場合は追加の投稿も提案
    if (context.account.healthScore > 80) {
      postingDecisions.push({
        id: `posting-only-${Date.now()}-secondary`,
        type: 'original_post',
        priority: 'medium',
        reasoning: 'アカウントヘルス良好のため、追加の教育的コンテンツを提供',
        description: 'アカウントヘルス良好のため、追加の教育的コンテンツを提供',
        params: {
          originalContent: '投資初心者の方からよくある質問：「どの銘柄に投資すれば良いですか？」に対する答えは「まず自分の投資目標とリスク許容度を明確にすること」です。個別株選択よりも、投資の基本を理解することから始めましょう。',
          hashtags: ['#投資初心者', '#投資の基本'],
          contentType: 'beginner_friendly',
          timeOfDay,
          dateGenerated: currentDate
        },
        content: '投資初心者の方からよくある質問：「どの銘柄に投資すれば良いですか？」に対する答えは「まず自分の投資目標とリスク許容度を明確にすること」です。個別株選択よりも、投資の基本を理解することから始めましょう。',
        estimatedDuration: 20
      });
    }

    console.log(`📝 [投稿専用決定完了] ${postingDecisions.length}件のoriginal_post決定を生成`);
    
    // 投稿専用決定にもブランドチェックを適用
    const brandCheckedPostingDecisions = await Promise.all(
      postingDecisions.map(async (decision) => {
        // ActionDecisionをDecisionに変換してブランドチェック実行
        const tempDecision: Decision = {
          id: decision.id,
          type: 'content_creation',
          priority: decision.priority,
          reasoning: decision.reasoning,
          confidence: 0.8,
          data: {
            context: { environment: 'brand_check', constraints: [], objectives: ['brand_consistency'], timeframe: 'immediate' },
            factors: [],
            alternatives: []
          },
          timestamp: new Date().toISOString(),
          status: 'pending',
          params: {
            originalContent: decision.content,
            actionType: 'original_post'
          },
          dependencies: [],
          estimatedDuration: decision.estimatedDuration || 30
        };
        
        const brandChecked = await this.checkBrandConsistency(tempDecision);
        
        // 結果をActionDecisionに戻す
        return {
          ...decision,
          content: brandChecked.params?.originalContent || decision.content,
          params: {
            ...decision.params,
            ...brandChecked.params
          },
          reasoning: brandChecked.reasoning
        };
      })
    );
    
    console.log(`✅ [投稿専用ブランドチェック完了] ${brandCheckedPostingDecisions.length}件の決定をブランド適合確認`);
    return brandCheckedPostingDecisions;
  }

  // 新規メソッド: 投稿専用フォールバック
  private createPostingOnlyFallback(context: IntegratedContext): ActionDecision[] {
    console.log('🔄 [投稿専用フォールバック] 基本的なoriginal_post決定を生成中...');
    
    return [{
      id: `posting-fallback-${Date.now()}`,
      type: 'original_post',
      priority: 'high',
      reasoning: '投稿専用モードのフォールバック: 基本的な投資教育コンテンツ',
      description: '投稿専用モードのフォールバック: 基本的な投資教育コンテンツ',
      params: {
        originalContent: '投資の基本原則：分散投資によるリスク軽減の重要性について',
        hashtags: ['#投資基本', '#リスク管理'],
        contentType: 'educational'
      },
      content: '投資の基本原則：分散投資によるリスク軽減の重要性について',
      estimatedDuration: 30
    }];
  }
  
  // フォールバックアクション決定の生成
  private createFallbackActionDecisions(context: IntegratedContext): ActionDecision[] {
    console.log('🔄 [フォールバックアクション決定] 基本的なアクション戦略を生成中...');
    
    const fallbackDecisions: ActionDecision[] = [];
    
    // アカウントヘルスに基づく基本戦略
    if (context.account.healthScore < 70) {
      // 教育的オリジナル投稿重視
      fallbackDecisions.push({
        id: `fallback-${Date.now()}-original`,
        type: 'original_post',
        priority: 'high',
        reasoning: 'アカウントヘルス改善のための教育的コンテンツ投稿',
        description: 'アカウントヘルス改善のための教育的コンテンツ投稿',
        params: {
          originalContent: '投資の基本：リスク管理の重要性について',
        },
        content: '投資の基本：リスク管理の重要性について',
        estimatedDuration: 30
      });
    } else {
      // バランス型戦略
      fallbackDecisions.push({
        id: `fallback-${Date.now()}-mixed`,
        type: 'original_post',
        priority: 'medium',
        reasoning: 'バランス型アプローチでの価値創造投稿',
        description: 'バランス型アプローチでの価値創造投稿',
        params: {
          originalContent: '市場分析：今日の注目ポイント',
        },
        content: '市場分析：今日の注目ポイント',
        estimatedDuration: 25
      });
    }
    
    return fallbackDecisions;
  }
  
  // 拡張アクション決定の保存
  private async saveExpandedActionDecisions(decisions: ActionDecision[], context: IntegratedContext): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const pathModule3 = await import('path');
      
      const decisionsPath = pathModule3.join(process.cwd(), 'data', 'current', 'current-decisions.yaml');
      
      let history = loadYamlArraySafe<any>(decisionsPath);
      
      const decisionRecord = {
        timestamp: new Date().toISOString(),
        actionDecisions: decisions,
        context: {
          accountHealth: context.account.healthScore,
          marketOpportunities: context.market.opportunities.length,
          actionSuggestions: context.actionSuggestions.length
        },
        strategy: 'expanded_action_strategies',
        dailyTarget: 15,
        actionBreakdown: this.calculateActionBreakdown(decisions)
      };
      
      // 軽量版保存: 最新1エントリのみ保持（30行制限）
      const lightweightRecord = {
        timestamp: decisionRecord.timestamp,
        actionDecisions: decisions.slice(0, 1), // 最新の1つのアクションのみ
        context: decisionRecord.context,
        strategy: decisionRecord.strategy,
        dailyTarget: decisionRecord.dailyTarget,
        actionBreakdown: decisionRecord.actionBreakdown
      };
      
      await fs.mkdir(pathModule3.dirname(decisionsPath), { recursive: true });
      await fs.writeFile(decisionsPath, yaml.dump(lightweightRecord, { indent: 2 }));
      
      // claude-summary.yamlの自動更新
      await this.updateClaudeSummaryFromDecisions(decisions[0], context);
      
      console.log('💾 [軽量決定保存] 最新アクション決定を軽量形式で保存しました');
    } catch (error) {
      console.error('❌ [拡張アクション決定保存エラー]:', error);
    }
  }

  private async updateClaudeSummaryFromDecisions(latestDecision: ActionDecision, context: IntegratedContext): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const pathModule4 = await import('path');
      
      const claudeSummaryPath = pathModule4.join(process.cwd(), 'data', 'claude-summary.yaml');
      
      let claudeSummary: any = {};
      if (await fs.access(claudeSummaryPath).then(() => true).catch(() => false)) {
        const existingData = await fs.readFile(claudeSummaryPath, 'utf8');
        claudeSummary = yaml.load(existingData) as any || {};
      }

      // 最新のアクション実行時にサマリー更新
      claudeSummary.lastUpdated = new Date().toISOString();
      claudeSummary.system = claudeSummary.system || {};
      claudeSummary.system.last_action = new Date().toISOString();
      
      // 優先事項を更新（最新の決定に基づく）
      if (latestDecision) {
        claudeSummary.priorities = claudeSummary.priorities || { urgent: [] };
        claudeSummary.priorities.urgent = [{
          type: latestDecision.type || 'content_posting',
          reason: latestDecision.reasoning || '最新の戦略決定に基づくアクション'
        }];
      }

      await fs.writeFile(claudeSummaryPath, yaml.dump(claudeSummary, { indent: 2 }));
      
      console.log('✅ [Claude Summary更新] 決定実行時の自動更新完了');
    } catch (error) {
      console.error('Error updating claude-summary from decisions:', error);
    }
  }
  
  // アクション配分の計算
  private calculateActionBreakdown(decisions: ActionDecision[]): any {
    const breakdown = {
      original_post: 0,
      quote_tweet: 0,
      retweet: 0,
      reply: 0,
      total: decisions.length
    };
    
    decisions.forEach(decision => {
      if (breakdown.hasOwnProperty(decision.type)) {
        (breakdown as any)[decision.type]++;
      }
    });
    
    return breakdown;
  }

  // 統合決定の保存
  private async saveIntegratedDecisions(decisions: Decision[], context: IntegratedContext): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const pathModule5 = await import('path');
      
      const decisionsPath = pathModule5.join(process.cwd(), 'data', 'strategic-decisions.yaml');
      
      let history = loadYamlArraySafe<any>(decisionsPath);
      
      const decisionRecord = {
        timestamp: new Date().toISOString(),
        decisions: decisions,
        context: {
          accountHealth: context.account.healthScore,
          marketOpportunities: context.market.opportunities.length,
          actionSuggestions: context.actionSuggestions.length
        },
        integration: 'enhanced_workflow_v2'
      };
      
      history.push(decisionRecord);
      
      // Keep only last 30 decision sets
      if (history.length > 30) {
        history = history.slice(-30);
      }
      
      await fs.mkdir(pathModule5.dirname(decisionsPath), { recursive: true });
      await fs.writeFile(decisionsPath, yaml.dump(history, { indent: 2 }));
      
      console.log('💾 [統合決定保存] 決定履歴を保存しました');
    } catch (error) {
      console.error('❌ [統合決定保存エラー]:', error);
    }
  }

  // SystemDecision[] から ActionDecision[] への変換
  private convertDecisionsToActionDecisions(decisions: Decision[]): ActionDecision[] {
    console.log('🔄 [型変換] SystemDecision[] を ActionDecision[] に変換中...');
    
    const actionDecisions: ActionDecision[] = [];
    
    for (const decision of decisions) {
      try {
        // Decision型にはactionプロパティがないため、paramsから情報を取得
        const actionType = decision.params?.actionType || 'original_post';
        const content = decision.params?.originalContent || decision.params?.targetContent || '投資教育コンテンツ';
        
        if (actionType === 'original_post') {
          const actionDecision: ActionDecision = {
            id: decision.id,
            type: 'original_post',
            priority: decision.priority,
            reasoning: decision.reasoning || '',
            description: decision.reasoning || '',
            params: this.convertDecisionParamsToActionParams(decision),
            content: content,
            estimatedDuration: decision.estimatedDuration || 30
          };
          
          actionDecisions.push(actionDecision);
        } else {
          // 他のタイプの場合は、original_postとして処理
          const fallbackActionDecision: ActionDecision = {
            id: decision.id,
            type: 'original_post',
            priority: decision.priority,
            reasoning: decision.reasoning || '',
            description: decision.reasoning || '',
            params: { originalContent: content },
            content: content,
            estimatedDuration: decision.estimatedDuration || 30
          };
          
          actionDecisions.push(fallbackActionDecision);
        }
      } catch (error) {
        console.error('❌ [型変換エラー]:', error);
        // エラー時はoriginal_postフォールバックを追加
        const errorFallbackDecision: ActionDecision = {
          id: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: 'original_post',
          priority: 'medium',
          reasoning: '変換エラーのためのフォールバック決定',
          description: '変換エラーのためのフォールバック決定',
          params: { originalContent: '投資の基本原則について' },
          content: '投資の基本原則について',
          estimatedDuration: 30
        };
        actionDecisions.push(errorFallbackDecision);
      }
    }
    
    console.log(`✅ [型変換完了] ${actionDecisions.length}/${decisions.length}件のActionDecisionに変換`);
    return actionDecisions;
  }

  // Decision.params から ActionParams への変換
  private convertDecisionParamsToActionParams(decision: Decision): any {
    const params = decision.params || {};
    
    // original_post専用の変換
    return {
      originalContent: params.originalContent || params.targetContent || '投資教育コンテンツ',
      hashtags: params.hashtags || ['#投資', '#資産形成'],
      contentType: params.contentType || 'educational',
      riskLevel: params.riskLevel || 'low',
      timeOfDay: new Date().getHours(),
      dateGenerated: new Date().toISOString().split('T')[0]
    };
  }

  // デバッグ用ヘルパー関数追加
  private getTypeMappingForDebug(): Record<string, string> {
    return {
      'collect_content': 'content_collection',
      'immediate_post': 'post_immediate',
      'analyze_performance': 'performance_analysis',
      'check_engagement': 'engagement_analysis',
      'review_growth': 'growth_analysis',
      'optimize_timing': 'timing_optimization',
      'clean_data': 'data_cleanup',
      'strategy_shift': 'strategy_optimization',
      'content_generation': 'content_creation',
      'posting_schedule': 'schedule_optimization'
    };
  }

  // ActionDecision型ガード関数
  private isActionDecisionLike(obj: unknown): obj is ActionDecision {
    return typeof obj === 'object'
      && obj !== null
      && 'id' in obj
      && 'type' in obj
      && 'priority' in obj;
  }

  /**
   * Decision Integration Methods (統合済み)
   * Collection Strategy Selector, Execution Monitor, Quality Maximizer, 
   * Resource Allocator, Site Profiler の統合メソッド
   */

  // Collection Strategy Selector Methods
  async selectCollectionStrategy(context: Context): Promise<CollectionMethod> {
    const strategies = this.getAvailableStrategies();
    const scores = new Map<CollectionMethod, number>();
    
    for (const strategy of strategies) {
      const score = this.calculateStrategyScore(strategy, context);
      scores.set(strategy, score);
    }
    
    const bestStrategy = Array.from(scores.entries())
      .sort(([,a], [,b]) => b - a)[0][0];
    
    console.log(`✅ [戦略選択] 選択された戦略: ${bestStrategy}`);
    return bestStrategy;
  }

  private getAvailableStrategies(): CollectionMethod[] {
    return [CollectionMethod.SIMPLE_HTTP, CollectionMethod.API_PREFERRED, CollectionMethod.PLAYWRIGHT_STEALTH, CollectionMethod.HYBRID];
  }

  private calculateStrategyScore(strategy: CollectionMethod, context: Context): number {
    let score = 0.5; // Base score
    
    switch (strategy) {
      case CollectionMethod.SIMPLE_HTTP:
        score += 0.3; // HTTP is MVP priority
        break;
      case CollectionMethod.API_PREFERRED:
        score += 0.2; // API is reliable
        break;
      case CollectionMethod.PLAYWRIGHT_STEALTH:
        score += 0.1; // More resource intensive
        break;
      case CollectionMethod.HYBRID:
        score += 0.15;
        break;
    }
    
    return Math.min(score, 1.0);
  }

  // Execution Monitor Methods
  async monitorExecution(executionId: string): Promise<DecisionLoggingPerformanceMetrics> {
    const startTime = Date.now();
    
    const metrics: DecisionLoggingPerformanceMetrics = {
      sessionId: executionId,
      timestamp: new Date().toISOString(),
      decisionTime: Date.now() - startTime,
      cpuUsage: 50,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      networkLatency: 100,
      claudeApiCalls: 1,
      cacheHitRate: 0.8,
      resourceUsage: this.getCurrentResourceUsage()
    };
    
    console.log(`📊 [実行監視] セッションID: ${metrics.sessionId}, 決定時間: ${metrics.decisionTime}ms`);
    return metrics;
  }

  private getCurrentResourceUsage(): ResourceUsage {
    return {
      timeMs: 100,
      memoryMb: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuPercent: 50,
      networkRequests: 5
    };
  }

  // Quality Maximizer Methods
  async optimizeForQuality(tasks: CollectionTask[]): Promise<CollectionTask[]> {
    const optimizedTasks = tasks.map(task => ({
      ...task,
      qualityTarget: this.calculateQualityTarget(task),
      estimatedCost: this.estimateTaskCost(task)
    }));
    
    optimizedTasks.sort((a, b) => {
      const ratioA = a.qualityTarget / (a.estimatedCost?.timeMs || 1);
      const ratioB = b.qualityTarget / (b.estimatedCost?.timeMs || 1);
      return ratioB - ratioA;
    });
    
    console.log(`🎯 [品質最適化] ${optimizedTasks.length}個のタスクを最適化`);
    return optimizedTasks;
  }

  private calculateQualityTarget(task: CollectionTask): number {
    let target = 0.7;
    
    if (task.priority >= 7) target += 0.2; // High priority (7-10)
    if (task.method === CollectionMethod.SIMPLE_HTTP) target += 0.1;
    
    return Math.min(target, 1.0);
  }

  private estimateTaskCost(task: CollectionTask): ResourceCost {
    const baseCost = {
      timeMs: 5000,
      memoryMb: 10,
      cpuUnits: 1
    };
    
    switch (task.method) {
      case CollectionMethod.SIMPLE_HTTP:
        return { ...baseCost, timeMs: 3000 };
      case CollectionMethod.API_PREFERRED:
        return { ...baseCost, timeMs: 2000 };
      case CollectionMethod.PLAYWRIGHT_STEALTH:
        return { ...baseCost, timeMs: 8000, memoryMb: 20 };
      default:
        return baseCost;
    }
  }

  // Resource Allocator Methods
  async allocateResources(tasks: CollectionTask[]): Promise<Map<string, ResourceCost>> {
    const allocation = new Map<string, ResourceCost>();
    let totalTime = 0;
    let totalMemory = 0;
    
    for (const task of tasks) {
      const cost = this.estimateTaskCost(task);
      allocation.set(task.id, cost);
      totalTime += cost.timeMs;
      totalMemory += cost.memoryMb;
    }
    
    console.log(`💰 [リソース配分] 総時間: ${totalTime}ms, 総メモリ: ${totalMemory}MB`);
    return allocation;
  }

  async reallocateResources(currentAllocation: Map<string, ResourceCost>, constraints: any): Promise<Map<string, ResourceCost>> {
    const newAllocation = new Map(currentAllocation);
    
    for (const [taskId, cost] of Array.from(newAllocation.entries())) {
      if (cost.timeMs > constraints.maxTime) {
        newAllocation.set(taskId, {
          ...cost,
          timeMs: Math.min(cost.timeMs, constraints.maxTime)
        });
      }
    }
    
    console.log(`🔄 [リソース再配分] ${newAllocation.size}個のタスクを再配分`);
    return newAllocation;
  }

  // Site Profiler Methods
  async profileSite(url: string): Promise<SiteProfile> {
    const profile: SiteProfile = {
      requiresJavaScript: false,
      hasAntiBot: false,
      loadSpeed: 'medium',
      contentStructure: 'simple',
      updateFrequency: 'medium',
      contentQuality: this.estimateContentQuality(url),
      relevanceScore: 0.8,
      bestCollectionTime: { start: 9, end: 17 },
      optimalMethod: CollectionMethod.SIMPLE_HTTP,
      averageResponseTime: await this.measureResponseTime(url)
    };
    
    console.log(`🔍 [サイト分析] ${url}: 品質${profile.contentQuality}, 応答時間${profile.averageResponseTime}ms`);
    return profile;
  }

  private assessSiteReliability(url: string): number {
    const trustedDomains = ['reuters.com', 'bloomberg.com', 'cnbc.com'];
    const domain = new URL(url).hostname.replace('www.', '');
    
    if (trustedDomains.includes(domain)) return 0.9;
    if (domain.includes('gov') || domain.includes('org')) return 0.8;
    return 0.6;
  }

  private async measureResponseTime(url: string): Promise<number> {
    return Math.random() * 2000 + 500; // 500-2500ms simulation
  }

  private estimateContentQuality(url: string): number {
    const domain = new URL(url).hostname;
    
    if (domain.includes('reuters') || domain.includes('bloomberg')) return 0.9;
    if (domain.includes('finance') || domain.includes('market')) return 0.8;
    return 0.7;
  }

  private estimateUpdateFrequency(url: string): string {
    if (url.includes('news') || url.includes('live')) return 'hourly';
    if (url.includes('market') || url.includes('trading')) return 'daily';
    return 'weekly';
  }

  private detectRateLimit(url: string): number {
    const domain = new URL(url).hostname;
    
    if (domain.includes('api')) return 100;
    if (domain.includes('rss') || domain.includes('feed')) return 60;
    return 30;
  }

  /**
   * Content Convergence Engine Methods (統合済み)
   * 大量のFX情報を価値ある1つの投稿に収束させる機能
   */
  async convergeToSinglePost(collectedData: any[]): Promise<any> {
    const startTime = Date.now();
    
    try {
      // 1. 核心インサイトの抽出
      const coreInsights = await this.extractCoreInsights(collectedData);
      
      // 2. 読者価値の最大化
      const valueOptimized = await this.maximizeReaderValue(coreInsights);
      
      // 3. 投稿構造の構築
      const structure = this.buildLogicalStructure(coreInsights);
      const narrativeFlow = this.createReadableFlow(structure);
      
      // 4. 最終コンテンツの生成
      const finalContent = await this.generateFinalContent(
        valueOptimized, 
        structure, 
        narrativeFlow
      );
      
      // 5. 品質評価
      const qualityScore = await this.calculateQualityScore(finalContent, coreInsights);
      
      const processingTime = Date.now() - startTime;
      
      const convergedPost = {
        id: `convergence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: finalContent,
        metadata: {
          sourceCount: collectedData.length,
          processingTime,
          qualityScore,
          confidence: this.calculateOverallConfidence(coreInsights)
        },
        insights: coreInsights,
        structure
      };
      
      console.log(`🧠 [コンテンツ収束] ${collectedData.length}件のデータから高品質投稿を生成`);
      return convergedPost;
      
    } catch (error) {
      console.error(`❌ [収束エラー]:`, error);
      throw new Error(`収束処理に失敗しました: ${error}`);
    }
  }

  private async extractCoreInsights(data: any[]): Promise<any[]> {
    if (data.length === 0) return [];
    
    const insights = [];
    
    // データから重要なインサイトを抽出
    for (const item of data) {
      if (item.importance > 70 || item.relevanceScore > 0.7) {
        insights.push({
          id: `insight_${item.id || Date.now()}`,
          category: item.category || 'market_trend',
          content: item.content || item.text || '',
          confidence: item.reliability || item.confidence || 70,
          impact: item.importance > 80 ? 'high' : 'medium',
          sources: [item.source || 'unknown'],
          timeRelevance: {
            urgency: 'daily',
            peakRelevance: item.importance || 70,
            timeDecayRate: 0.1
          },
          educationalValue: 75,
          uniqueness: 65
        });
      }
    }
    
    return insights.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  private async maximizeReaderValue(insights: any[]): Promise<any> {
    const baseContent = this.generateBaseContent(insights);
    
    // 教育価値の最大化
    const educationalValue = this.calculateEducationalValue(baseContent);
    
    // 実用性の強化
    const practicalityScore = this.calculatePracticalityScore(baseContent);
    
    // 独自性の確保
    const uniquenessScore = 75;
    
    // タイムリー性の最適化
    const timelinessScore = 80;
    
    return {
      content: baseContent,
      educationalValue,
      practicalityScore,
      uniquenessScore,
      timelinessScore
    };
  }

  private generateBaseContent(insights: any[]): string {
    if (insights.length === 0) return '市場動向の分析';
    
    const primaryInsight = insights[0];
    let content = primaryInsight.content || '重要な市場情報';
    
    // 補完的なインサイトを統合
    if (insights.length > 1) {
      content += `\n\n`;
      for (let i = 1; i < Math.min(3, insights.length); i++) {
        content += `${insights[i].content}\n`;
      }
    }
    
    return content;
  }

  private calculateEducationalValue(content: string): number {
    let score = 50;
    
    // 教育的キーワードの存在
    const educationalKeywords = ['なぜ', 'どのように', '理由', '仕組み', '背景'];
    const keywordCount = educationalKeywords.filter(k => content.includes(k)).length;
    score += keywordCount * 10;
    
    // 専門用語の適切な使用
    const technicalTerms = ['GDP', 'CPI', 'PMI', 'FOMC', 'レバレッジ'];
    const termCount = technicalTerms.filter(t => content.includes(t)).length;
    score += termCount * 5;
    
    return Math.min(100, score);
  }

  private calculatePracticalityScore(content: string): number {
    let score = 60;
    
    // 具体的な数値の存在
    const numberPattern = /\d+(\.\d+)?[%円ドルpips]/g;
    const numberMatches = content.match(numberPattern);
    score += (numberMatches?.length || 0) * 5;
    
    // アクション動詞の存在
    const actionVerbs = ['設定', '確認', '注意', '検討', '実施', '準備'];
    const actionCount = actionVerbs.filter(verb => content.includes(verb)).length;
    score += actionCount * 4;
    
    return Math.min(100, Math.max(0, score));
  }

  private buildLogicalStructure(insights: any[]): any {
    if (insights.length === 0) {
      return {
        hook: '市場の最新動向について',
        mainPoints: [],
        supporting: [],
        conclusion: '今後の動向に注目が必要です'
      };
    }
    
    const primaryInsight = insights[0];
    const hook = this.generateHook(primaryInsight);
    const mainPoints = this.buildMainPoints(insights);
    const conclusion = this.generateConclusion(insights);
    
    return {
      hook,
      mainPoints,
      supporting: [],
      conclusion
    };
  }

  private generateHook(insight: any): string {
    const impactLevel = insight.impact || 'medium';
    
    const hookPatterns = {
      'high': ['市場に大きな変化の兆しが見えています', '重要な動向が明らかになりました'],
      'medium': ['興味深い市場パターンが観察されています', '注目すべき動きがあります'],
      'low': ['最近の市場動向について', '市場で話題になっている動きがあります']
    };
    
    const patterns = hookPatterns[impactLevel as keyof typeof hookPatterns] || hookPatterns.medium;
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  private buildMainPoints(insights: any[]): any[] {
    return insights.slice(0, 3).map((insight, i) => ({
      id: `main_point_${i + 1}`,
      content: insight.content || '重要なポイント',
      supportingEvidence: insight.sources || [],
      importance: insight.confidence || 70
    }));
  }

  private generateConclusion(insights: any[]): string {
    const urgentInsights = insights.filter(i => i.timeRelevance?.urgency === 'immediate');
    
    if (urgentInsights.length > 0) {
      return '短期的な動きに注意が必要な状況です。';
    }
    
    return '今後の推移を注視していく必要があります。';
  }

  private createReadableFlow(structure: any): any {
    const sequence = [];
    const transitions = [];
    
    sequence.push(structure.hook);
    
    for (let i = 0; i < structure.mainPoints.length; i++) {
      if (i === 0) {
        transitions.push('具体的には、');
      } else {
        transitions.push('また、');
      }
      sequence.push(structure.mainPoints[i].content);
    }
    
    transitions.push('これらの状況を踏まえると、');
    sequence.push(structure.conclusion);
    
    return {
      id: `narrative_${Date.now()}`,
      sequence,
      transitions,
      coherenceScore: 80,
      readabilityScore: 85
    };
  }

  private async generateFinalContent(
    valueOptimized: any,
    structure: any,
    narrativeFlow: any
  ): Promise<string> {
    let content = valueOptimized.content;
    
    // ナラティブフローを適用
    if (narrativeFlow.coherenceScore > 75) {
      const flowContent = narrativeFlow.sequence.join(' ');
      content = flowContent.length > content.length ? flowContent : content;
    }
    
    // 専門用語の説明を追加
    content = this.explainTechnicalTerms(content);
    
    // エンゲージメント要素の追加
    content = this.addEngagementElements(content);
    
    return content.substring(0, 280); // Twitter制限考慮
  }

  private explainTechnicalTerms(content: string): string {
    const terms: Record<string, string> = {
      'GDP': 'GDP（国内総生産、国の経済規模を示す指標）',
      'CPI': 'CPI（消費者物価指数、インフレの指標）',
      'FOMC': 'FOMC（米連邦公開市場委員会、米国の金融政策を決定）',
      'PMI': 'PMI（購買担当者景気指数、製造業の景況感を示す）'
    };
    
    let enhancedContent = content;
    
    for (const [term, explanation] of Object.entries(terms)) {
      const pattern = new RegExp(`(${term})`, 'g');
      let replaced = false;
      
      enhancedContent = enhancedContent.replace(pattern, (match, p1) => {
        if (!replaced && enhancedContent.length < 200) {
          replaced = true;
          return explanation;
        }
        return p1;
      });
    }
    
    return enhancedContent;
  }

  private addEngagementElements(content: string): string {
    // 簡潔なエンゲージメント要素を追加
    if (content.includes('分析') && content.length < 220) {
      content += '\n\n💡 どう思われますか？';
    }
    
    return content;
  }

  private async calculateQualityScore(content: string, insights: any[]): Promise<any> {
    const metrics = {
      factualAccuracy: insights.reduce((avg, insight) => avg + insight.confidence, 0) / insights.length,
      readability: this.calculateReadabilityScore(content),
      educationalValue: this.calculateEducationalValue(content),
      uniqueness: 75,
      engagement: this.calculateEngagementScore(content),
      timeliness: 80
    };
    
    const overall = Object.values(metrics).reduce((sum, val) => sum + val, 0) / Object.keys(metrics).length;
    
    return {
      overall: Math.round(overall),
      breakdown: metrics,
      grade: this.calculateGrade(overall)
    };
  }

  private calculateReadabilityScore(content: string): number {
    const sentences = content.split(/[。．.!?！？]/).filter(s => s.length > 0);
    const avgSentenceLength = content.length / sentences.length;
    
    let score = 100;
    if (avgSentenceLength > 100) score -= 20;
    if (avgSentenceLength > 150) score -= 20;
    
    return Math.max(0, score);
  }

  private calculateEngagementScore(content: string): number {
    let score = 60;
    
    const engagementElements = ['？', '！', '💡', '📊', '🎯'];
    const elementCount = engagementElements.filter(e => content.includes(e)).length;
    score += elementCount * 8;
    
    return Math.min(100, score);
  }

  private calculateGrade(overall: number): string {
    if (overall >= 95) return 'A+';
    if (overall >= 90) return 'A';
    if (overall >= 85) return 'B+';
    if (overall >= 80) return 'B';
    if (overall >= 75) return 'C+';
    if (overall >= 70) return 'C';
    if (overall >= 60) return 'D';
    return 'F';
  }

  private calculateOverallConfidence(insights: any[]): number {
    if (insights.length === 0) return 0;
    
    const totalConfidence = insights.reduce((sum, insight) => sum + insight.confidence, 0);
    const averageConfidence = totalConfidence / insights.length;
    
    // ソース数による信頼性ボーナス
    const sourceBonus = Math.min(10, insights.length * 2);
    
    return Math.min(100, averageConfidence + sourceBonus);
  }

  /**
   * Autonomous Exploration Engine Methods (統合済み)
   * Webからの自律的情報探索機能
   */
  async exploreFromSeed(seedUrl: string, maxDepth: number = 2): Promise<any> {
    console.log(`🕸️ [自律探索] ${seedUrl}から深度${maxDepth}で探索開始`);
    
    try {
      const contentResults: any[] = [];
      let totalLinksDiscovered = 0;
      const visitedUrls = new Set<string>();
      const startTime = Date.now();
      
      await this.exploreRecursively(
        { url: seedUrl, text: 'Seed URL', priority: 100 },
        0,
        maxDepth,
        contentResults,
        visitedUrls
      );
      
      console.log(`✅ [探索完了] ${contentResults.length}件のコンテンツを発見`);
      
      return {
        seedUrl,
        totalLinksDiscovered,
        exploredLinks: visitedUrls.size,
        contentResults,
        executionTime: Date.now() - startTime,
        errors: []
      };
    } catch (error) {
      console.error('❌ [探索エラー]:', error);
      throw error;
    }
  }

  private async exploreRecursively(
    link: any,
    currentDepth: number,
    maxDepth: number,
    contentResults: any[],
    visitedUrls: Set<string>
  ): Promise<void> {
    if (currentDepth >= maxDepth) return;
    if (visitedUrls.has(link.url)) return;
    
    visitedUrls.add(link.url);
    
    try {
      const pageContent = await this.fetchPageContent(link.url);
      const fxContent = this.extractFXContent(pageContent, link.url);
      
      if (fxContent.confidence >= 0.6) {
        const contentResult = {
          url: link.url,
          depth: currentDepth,
          content: fxContent,
          collectionMethod: 'web_exploration',
          qualityMetrics: this.evaluateContentQuality(pageContent)
        };
        
        contentResults.push(contentResult);
        console.log(`✅ コンテンツ収集: ${link.url} (信頼度: ${fxContent.confidence})`);
      }
      
      // 次の階層の探索は省略（簡略化）
      
    } catch (error) {
      console.warn(`⚠️ 探索エラー ${link.url}:`, error);
    }
  }

  private async fetchPageContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'TradingAssistantX/1.0.0'
        },
        maxRedirects: 3
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch ${url}: ${error}`);
    }
  }

  private extractFXContent(pageContent: string, url: string): any {
    const $ = cheerio.load(pageContent);
    const text = $('body').text();
    
    // FX関連キーワードでコンテンツを評価
    const fxKeywords = [
      'forex', 'fx', 'currency', 'trading', 'usd', 'eur', 'jpy',
      '通貨', 'トレード', '為替', '金利', '経済指標'
    ];
    
    let relevanceScore = 0;
    const lowerText = text.toLowerCase();
    
    fxKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        relevanceScore += 0.1;
      }
    });
    
    const confidence = Math.min(1.0, relevanceScore);
    
    return {
      text: text.substring(0, 500),
      confidence,
      keywords: fxKeywords.filter(k => lowerText.includes(k)),
      url
    };
  }

  private evaluateContentQuality(pageContent: string): any {
    const $ = cheerio.load(pageContent);
    const text = $('body').text();
    
    return {
      wordCount: text.split(/\s+/).length,
      hasStructure: $('h1, h2, h3').length > 0,
      hasLinks: $('a').length,
      qualityScore: Math.min(1.0, text.length / 1000)
    };
  }

  /**
   * Context Compression System Methods (統合済み)
   * システムパフォーマンス最適化機能
   */
  async executeOptimizedDecision(actionType?: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      // メモリ健全性チェック
      const memoryStats = process.memoryUsage();
      const memoryHealthy = (memoryStats.heapUsed / 1024 / 1024) < 500; // 500MB未満
      
      if (!memoryHealthy) {
        console.log('⚠️ [メモリ最適化] メモリ使用量が高いため最適化実行');
        if (global.gc) global.gc();
      }

      // 最小限コンテキスト取得
      const context = await this.getMinimalDecisionContext(actionType);
      
      // 高速判断実行
      const decision = await this.makeQuickDecision(context);
      
      const executionTime = Date.now() - startTime;
      console.log(`⚡ [最適化決定] ${decision.action} (${executionTime}ms)`);
      
      return decision;
      
    } catch (error) {
      console.error('❌ [最適化決定エラー]:', error);
      
      return {
        action: 'wait',
        reason: 'システムエラー - 待機',
        confidence: 0.3
      };
    }
  }

  private async getMinimalDecisionContext(actionType?: string): Promise<any> {
    return {
      timestamp: new Date().toISOString(),
      actionType: actionType || 'general',
      systemLoad: {
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        uptime: Math.round(process.uptime())
      },
      current: {
        todayProgress: 5,
        accountHealth: 80
      }
    };
  }

  private async makeQuickDecision(context: any): Promise<any> {
    // 簡潔な決定ロジック
    if (context.current.todayProgress >= 15) {
      return { action: 'wait', reason: '日次制限到達', confidence: 0.9 };
    }
    
    if (context.current.accountHealth < 50) {
      return { action: 'wait', reason: 'アカウント健康度低下', confidence: 0.8 };
    }
    
    if (context.current.todayProgress < 5) {
      return { action: 'post', reason: '活動不足補填', confidence: 0.7 };
    }
    
    return { action: 'post', reason: '通常投稿', confidence: 0.6 };
  }

  async getSystemStatus(): Promise<string> {
    const memoryStats = process.memoryUsage();
    const memoryMB = Math.round(memoryStats.heapUsed / 1024 / 1024);
    const isHealthy = memoryMB < 500;
    
    return `システム状態: ${isHealthy ? '正常' : '要注意'} | メモリ:${memoryMB}MB | 稼働時間:${Math.round(process.uptime())}秒`;
  }

  // === 階層型データ活用メソッド ===

  /**
   * 階層型データを読み込む
   * @param filePath データファイルのパス
   */
  private async loadHierarchicalData(filePath: string): Promise<any> {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      return await loadYamlSafe(fullPath);
    } catch (error) {
      console.warn(`⚠️ [階層データ] ${filePath} 読み込み警告:`, error);
      return null;
    }
  }

  /**
   * 週次データに基づく戦略調整
   * @param weeklyData 週次サマリーデータ
   * @param analysis 状況分析データ
   */
  private async adjustStrategyBasedOnWeekly(weeklyData: any, analysis: SituationAnalysis): Promise<SelectedStrategy> {
    const summary = weeklyData.summary;
    const followerCount = analysis.accountStatus.followers.current;
    
    // 低エンゲージメント対策戦略
    const strategy: SelectedStrategy = {
      collectionStrategy: {
        method: 'multi_source',
        sources: ['rss_feeds', 'market_data'],
        priority: 'high',
        timeAllocation: 70
      },
      contentStrategy: {
        type: 'trend_responsive',
        themes: summary.top_topics?.length ? summary.top_topics : ['市場トレンド', 'タイムリーな分析'],
        tone: '親しみやすく、興味を引く',
        targetAudience: '投資初心者・関心層拡大'
      },
      postingStrategy: {
        strategy: 'optimized',
        recommendedTime: '09:00',
        urgency: 'immediate'
      },
      reasoning: `週次エンゲージメント${summary.avg_engagement}に基づく緊急改善戦略`
    };
    
    return strategy;
  }

  /**
   * パターンに基づく戦略最適化
   * @param patterns エンゲージメントパターンデータ
   * @param insights 投稿インサイトデータ
   * @param analysis 状況分析データ
   */
  private async optimizeStrategyWithPatterns(
    patterns: any, 
    insights: any, 
    analysis: SituationAnalysis
  ): Promise<SelectedStrategy | null> {
    try {
      const followerCount = analysis.accountStatus.followers.current;
      
      // 高パフォーマンスパターンの分析
      const highPerforming = patterns?.patterns?.high_performing;
      const recentInsights = insights?.insights?.slice(-5) || []; // 最新5件
      
      if (!highPerforming && recentInsights.length === 0) {
        return null;
      }
      
      // 最適投稿時間の決定
      const optimalTimes = highPerforming?.times || ['09:00', '20:00'];
      
      // 最適フォーマットの決定
      const optimalFormats = highPerforming?.formats || [];
      const contentStyle = optimalFormats.includes('question') ? '質問形式重視' : '情報提供型';
      
      // 最近のベストトピック分析
      const bestTopics = recentInsights
        .map((i: any) => i.best_performing_topic)
        .filter(Boolean)
        .slice(0, 3) || ['投資基礎', '市場分析'];
      
      const strategy: SelectedStrategy = {
        collectionStrategy: {
          method: followerCount > 5000 ? 'multi_source' : 'rss_focused',
          sources: followerCount > 5000 ? ['rss_feeds', 'market_data', 'community'] : ['rss_feeds'],
          priority: 'high',
          timeAllocation: 80
        },
        contentStrategy: {
          type: 'educational',
          themes: bestTopics,
          tone: contentStyle,
          targetAudience: 'パターン分析によるターゲット最適化'
        },
        postingStrategy: {
          strategy: 'optimized',
          recommendedTime: optimalTimes[0] || '09:00',
          urgency: 'scheduled'
        },
        reasoning: `学習データパターン分析: 最適時間${optimalTimes.join(',')}、ベストトピック${bestTopics.join(',')}`
      };
      
      return strategy;
      
    } catch (error) {
      console.warn('⚠️ [パターン最適化] エラー:', error);
      return null;
    }
  }

  async optimizeSystem(): Promise<void> {
    const startTime = Date.now();
    
    // メモリクリーンアップ
    if (global.gc) {
      global.gc();
      console.log('🧹 [システム最適化] ガベージコレクション実行');
    }
    
    // パフォーマンス測定
    const memoryAfter = process.memoryUsage();
    const optimizationTime = Date.now() - startTime;
    
    console.log(`✅ [システム最適化完了] ${optimizationTime}ms, メモリ:${Math.round(memoryAfter.heapUsed/1024/1024)}MB`);
  }
}