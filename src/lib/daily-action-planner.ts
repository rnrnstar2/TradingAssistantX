import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { 
  ActionDistribution, 
  TimingRecommendation, 
  DailyActionLog, 
  ActionType,
  ActionResult 
} from '../types/action-types';
import { loadYamlSafe } from '../utils/yaml-utils';
import * as yaml from 'js-yaml';
import { RealtimeDetector } from './rss/realtime-detector';
import type { 
  MarketMovement, 
  MarketCondition, 
  DailyPlan, 
  TopicPriority,
  PlannedAction,
  PlanAction,
  ContingencyPlan,
  MonitoringTarget,
  SuccessMetric 
} from '../types/rss-collection-types';
import { ClaudeAutonomousAgent } from './claude-autonomous-agent.js';

export class DailyActionPlanner {
  // 🚨 REMOVED: Fixed DAILY_TARGET constraint - now uses Claude autonomous determination
  private readonly logFile = 'data/daily-action-data.yaml';
  private readonly strategyFile = 'data/content-strategy.yaml';
  private readonly claudeSummaryFile = 'data/claude-summary.yaml';
  private realtimeDetector: RealtimeDetector;
  private claudeAgent: ClaudeAutonomousAgent;
  
  constructor(claudeAgent?: ClaudeAutonomousAgent) {
    this.realtimeDetector = new RealtimeDetector();
    this.claudeAgent = claudeAgent || new ClaudeAutonomousAgent();
    this.ensureDataDirectory();
    console.log('🧠 [DailyActionPlanner] 初期化完了');
  }
  
  private ensureDataDirectory(): void {
    if (!existsSync('data')) {
      mkdirSync('data', { recursive: true });
    }
  }

  // Claude自律的配分計画策定（制約なし）
  async planDailyDistribution(): Promise<ActionDistribution> {
    console.log('🧠 [Claude自律配分] 制約なしの完全自律配分計画を策定中...');
    
    const currentActions = await this.getTodaysActions();
    const successfulActions = currentActions.filter(action => action.success);
    
    // Claude自律的頻度決定
    const autonomousFrequency = await this.determineAutonomousFrequency(successfulActions.length);
    const remaining = Math.max(0, autonomousFrequency - successfulActions.length);
    
    console.log(`📊 [Claude自律判断] Claude決定頻度: ${autonomousFrequency}回/日, 本日成功: ${successfulActions.length}, 残り: ${remaining}`);
    
    if (remaining <= 0) {
      console.log('✅ [Claude判断] 本日の最適頻度に到達済み');
      return this.createCompletedDistribution();
    }
    
    const distribution = {
      remaining,
      optimal_distribution: await this.calculateAutonomousDistribution(remaining),
      timing_recommendations: await this.getTimingRecommendations(remaining)
    };
    
    console.log('✅ [Claude自律配分完了]', {
      autonomousFrequency,
      remaining: distribution.remaining,
      distribution: distribution.optimal_distribution,
      timingSlots: distribution.timing_recommendations.length
    });
    
    return distribution;
  }
  
  // 🚨 REMOVED: Fixed 100% original_post constraint
  // Claude自律的配分計算（全アクションタイプ利用可能）
  private async calculateAutonomousDistribution(remaining: number): Promise<ActionDistribution['optimal_distribution']> {
    console.log(`🧠 [Claude自律配分] 残り${remaining}回を全アクションタイプで最適配分中...`);
    
    if (remaining <= 0) {
      return { original_post: 0, quote_tweet: 0, retweet: 0, reply: 0 };
    }
    
    // Claude自律的アクション配分決定
    const accountHealth = await this.getAccountHealth();
    const marketConditions = this.getCurrentMarketConditions();
    
    const autonomousDistribution = await this.claudeAgent.determineOptimalActionMix({
      remaining,
      accountHealth,
      marketConditions,
      availableActionTypes: ['original_post', 'quote_tweet', 'retweet', 'reply']
    });
    
    // original_postが必須プロパティであることを保証
    const safeDistribution = {
      original_post: autonomousDistribution.original_post || 0,
      quote_tweet: autonomousDistribution.quote_tweet || 0,
      retweet: autonomousDistribution.retweet || 0,
      reply: autonomousDistribution.reply || 0
    };
    
    console.log('✅ [Claude自律配分完了]', {
      total: remaining,
      distribution: safeDistribution,
      strategy: 'Claude完全自律判断'
    });
    
    return safeDistribution;
  }
  
  
  // タイミング推奨の取得
  async getTimingRecommendations(remaining: number): Promise<TimingRecommendation[]> {
    console.log(`⏰ [タイミング推奨] 残り${remaining}回のタイミングを推奨中...`);
    
    const strategy = await this.loadContentStrategy();
    const optimalTimes = strategy?.optimal_times || this.getDefaultOptimalTimes();
    
    // 既に使用された時間帯を除外
    const usedTimes = await this.getUsedTimesToday();
    const availableSlots = optimalTimes.filter((time: string) => 
      !this.isTimeSlotUsed(time, usedTimes)
    );
    
    console.log(`⏰ [利用可能スロット] ${availableSlots.length}/${optimalTimes.length}スロット利用可能`);
    
    return this.distributeActionsAcrossSlots(availableSlots, remaining);
  }
  
  // コンテンツ戦略の読み込み（claude-summary.yaml優先）
  private async loadContentStrategy(): Promise<any> {
    try {
      // 最初にclaude-summary.yamlから軽量データを読み込み
      if (existsSync(this.claudeSummaryFile)) {
        const claudeSummary = loadYamlSafe<any>(this.claudeSummaryFile);
        if (claudeSummary?.content_strategy) {
          console.log('✅ [戦略読み込み] claude-summary.yamlから戦略データを読み込み');
          return this.mergeWithDefaultStrategy(claudeSummary.content_strategy);
        }
      }
      
      // フォールバック: content-strategy.yaml
      const strategy = loadYamlSafe<any>(this.strategyFile);
      return strategy || this.getDefaultStrategy();
    } catch (error) {
      console.warn('⚠️ [戦略読み込み] 戦略ファイルの読み込みに失敗、デフォルト戦略を使用');
      return this.getDefaultStrategy();
    }
  }
  
  // claude-summary戦略データとデフォルト戦略のマージ
  private mergeWithDefaultStrategy(summaryStrategy: any): any {
    const defaultStrategy = this.getDefaultStrategy();
    return {
      optimal_times: summaryStrategy.optimal_times || defaultStrategy.optimal_times,
      posting_frequency: summaryStrategy.posting_frequency || defaultStrategy.posting_frequency,
      content_themes: summaryStrategy.content_themes || defaultStrategy.content_themes,
      priority_actions: summaryStrategy.priority_actions || ['original_post']
    };
  }
  
  // デフォルト戦略の取得
  private getDefaultStrategy(): any {
    return {
      optimal_times: this.getDefaultOptimalTimes(),
      posting_frequency: 15,
      content_themes: ['investment', 'market_analysis', 'education']
    };
  }
  
  // デフォルト最適時間の取得
  private getDefaultOptimalTimes(): string[] {
    return [
      '07:00', '08:30', '10:00', '11:30', '13:00',
      '14:30', '16:00', '17:30', '19:00', '20:30',
      '22:00', '09:00', '15:00', '18:00', '21:00'
    ];
  }
  
  // 今日使用された時間帯の取得
  private async getUsedTimesToday(): Promise<string[]> {
    const todaysActions = await this.getTodaysActions();
    return todaysActions.map(action => {
      const date = new Date(action.timestamp);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    });
  }
  
  // 時間帯使用チェック
  private isTimeSlotUsed(targetTime: string, usedTimes: string[]): boolean {
    const [targetHour, targetMinute] = targetTime.split(':').map(Number);
    
    return usedTimes.some(usedTime => {
      const [usedHour, usedMinute] = usedTime.split(':').map(Number);
      // 30分以内は同じスロットとみなす
      const timeDifference = Math.abs((targetHour * 60 + targetMinute) - (usedHour * 60 + usedMinute));
      return timeDifference < 30;
    });
  }
  
  // アクションを時間帯に配分（original_post専用）
  private distributeActionsAcrossSlots(
    availableSlots: string[], 
    remaining: number
  ): TimingRecommendation[] {
    const recommendations: TimingRecommendation[] = [];
    
    // 使用可能スロットが少ない場合は調整
    const slotsToUse = Math.min(availableSlots.length, remaining);
    const selectedSlots = availableSlots.slice(0, slotsToUse);
    
    for (let i = 0; i < slotsToUse; i++) {
      const slot = selectedSlots[i];
      const actionType: ActionType = 'original_post' as ActionType; // TypeScript型アサーション
      const priority = this.calculateSlotPriority(slot, actionType);
      
      recommendations.push({
        time: slot,
        actionType,
        priority,
        reasoning: this.generateTimingReasoning(slot, actionType)
      });
    }
    
    // 優先度順にソート
    recommendations.sort((a, b) => b.priority - a.priority);
    
    console.log(`⏰ [タイミング推奨完了] ${recommendations.length}件のoriginal_post推奨タイミングを生成`);
    
    return recommendations;
  }
  
  // スロット優先度の計算
  private calculateSlotPriority(time: string, actionType: ActionType): number {
    const [hour] = time.split(':').map(Number);
    
    // 時間帯による基本優先度
    let basePriority = 5;
    if (hour >= 7 && hour <= 9) basePriority = 8;    // 朝の活動時間
    if (hour >= 19 && hour <= 21) basePriority = 9;  // 夕方のゴールデンタイム
    if (hour >= 12 && hour <= 14) basePriority = 7;  // 昼休み時間
    
    // アクション型による調整
    const actionModifier: Record<string, number> = {
      'original_post': 1.2
    };
    
    return Math.round(basePriority * (actionModifier[actionType] || 1.0));
  }
  
  // タイミング推奨理由の生成
  private generateTimingReasoning(time: string, actionType: ActionType): string {
    const [hour] = time.split(':').map(Number);
    
    const timeReasons: Record<string, string> = {
      morning: 'フォロワーの活動開始時間に合わせた効果的な投稿タイミング',
      lunch: '昼休み時間でエンゲージメントが期待できる時間帯',
      evening: 'ゴールデンタイムでの最大リーチを狙う戦略的タイミング',
      night: '一日の振り返りや情報収集時間に適した投稿タイミング'
    };
    
    let timeCategory = 'night';
    if (hour >= 7 && hour <= 10) timeCategory = 'morning';
    if (hour >= 12 && hour <= 14) timeCategory = 'lunch';
    if (hour >= 17 && hour <= 21) timeCategory = 'evening';
    
    const actionTypeReasons: Record<string, string> = {
      'original_post': '独自コンテンツでの価値提供'
    };
    
    const timeReason = timeReasons[timeCategory] || timeReasons.night;
    const actionReason = actionTypeReasons[actionType] || '価値創造アクション';
    
    return `${timeReason} - ${actionReason}`;
  }
  
  // 今日のアクション取得
  async getTodaysActions(): Promise<ActionResult[]> {
    try {
      if (!existsSync(this.logFile)) {
        return [];
      }
      
      const logData = yaml.load(readFileSync(this.logFile, 'utf8')) as any;
      const today = new Date().toISOString().split('T')[0];
      
      // 配列形式かどうかを確認
      if (!Array.isArray(logData)) {
        console.warn('⚠️ [ログ形式] 配列形式でないため空配列を返します');
        return [];
      }
      
      const todaysLog = logData.find((log: DailyActionLog) => 
        log.date === today
      );
      
      return todaysLog?.executedActions || [];
    } catch (error) {
      console.error('❌ [ログ読み込みエラー]:', error);
      return [];
    }
  }
  
  // アクション実行の記録
  async recordAction(actionResult: ActionResult): Promise<void> {
    console.log(`📝 [アクション記録] ${actionResult.type}アクションを記録中...`);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      let logData: DailyActionLog[] = [];
      
      if (existsSync(this.logFile)) {
        const rawLogData = yaml.load(readFileSync(this.logFile, 'utf8')) as any;
        // 配列形式でない場合は空配列で初期化
        logData = Array.isArray(rawLogData) ? rawLogData : [];
      }
      
      // 今日のログを取得または作成
      let todaysLog = logData.find(log => log.date === today);
      if (!todaysLog) {
        todaysLog = {
          date: today,
          totalActions: 0,
          actionBreakdown: {
            original_post: 0
          },
          executedActions: [],
          targetReached: false
        };
        logData.push(todaysLog);
      }
      
      // アクションを記録
      todaysLog.executedActions.push(actionResult);
      const successfulActions = todaysLog.executedActions.filter(action => action.success);
      todaysLog.totalActions = successfulActions.length;
      
      // 配分カウンターを更新（original_postのみ）
      if (actionResult.type === 'original_post' && actionResult.success) {
        todaysLog.actionBreakdown.original_post++;
      }
      
      // 目標達成チェック（成功したアクション数で判定）
      const successCount = todaysLog.executedActions.filter(action => action.success).length;
      const autonomousTarget = await this.getAutonomousTarget();
      todaysLog.targetReached = successCount >= autonomousTarget;
      
      // 最新30日分のみ保持
      logData = logData.slice(-30);
      
      writeFileSync(this.logFile, yaml.dump(logData, { indent: 2 }));
      
      console.log(`✅ [アクション記録完了] ${actionResult.type} (${actionResult.success ? '成功' : '失敗'}) - 本日成功${successCount}/${autonomousTarget}回 (実行済み: ${todaysLog.executedActions.length}回)`);
      
      if (todaysLog.targetReached) {
        console.log(`🎯 [目標達成] 本日の投稿目標${autonomousTarget}回に到達しました！`);
      }
    } catch (error) {
      console.error('❌ [アクション記録エラー]:', error);
    }
  }
  
  // 完了配分の作成
  private createCompletedDistribution(): ActionDistribution {
    return {
      remaining: 0,
      optimal_distribution: {
        original_post: 0,
        quote_tweet: 0,
        retweet: 0,
        reply: 0
      },
      timing_recommendations: []
    };
  }
  
  // 統計情報の取得
  async getActionStats(days: number = 7): Promise<any> {
    try {
      if (!existsSync(this.logFile)) {
        return this.getEmptyStats();
      }
      
      const rawLogData = yaml.load(readFileSync(this.logFile, 'utf8')) as any;
      const logData: DailyActionLog[] = Array.isArray(rawLogData) ? rawLogData : [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const recentLogs = logData.filter(log => 
        new Date(log.date) >= cutoffDate
      );
      
      const stats = {
        period: `${days}日間`,
        totalDays: recentLogs.length,
        totalActions: recentLogs.reduce((sum, log) => sum + log.totalActions, 0),
        averageActionsPerDay: 0,
        targetAchievementRate: 0,
        actionBreakdown: {
          original_post: 0,
          quote_tweet: 0,
          retweet: 0,
          reply: 0
        },
        dailyDetails: recentLogs
      };
      
      if (stats.totalDays > 0) {
        stats.averageActionsPerDay = stats.totalActions / stats.totalDays;
        const achievedDays = recentLogs.filter(log => log.targetReached).length;
        stats.targetAchievementRate = (achievedDays / stats.totalDays) * 100;
        
        // 配分統計の計算
        recentLogs.forEach(log => {
          Object.keys(stats.actionBreakdown).forEach(key => {
            (stats.actionBreakdown as any)[key] += (log.actionBreakdown as any)[key] || 0;
          });
        });
      }
      
      return stats;
    } catch (error) {
      console.error('❌ [統計取得エラー]:', error);
      return this.getEmptyStats();
    }
  }
  
  // 空の統計情報
  private getEmptyStats(): any {
    return {
      period: '0日間',
      totalDays: 0,
      totalActions: 0,
      averageActionsPerDay: 0,
      targetAchievementRate: 0,
      actionBreakdown: {
        original_post: 0,
        quote_tweet: 0,
        retweet: 0,
        reply: 0
      },
      dailyDetails: []
    };
  }
  
  // 今日の進捗確認
  async getTodayProgress(): Promise<any> {
    const todaysActions = await this.getTodaysActions();
    const distribution = await this.planDailyDistribution();
    
    const autonomousTarget = await this.getAutonomousTarget();
    return {
      completed: todaysActions.length,
      target: autonomousTarget,
      remaining: distribution.remaining,
      progress: Math.round((todaysActions.length / autonomousTarget) * 100),
      nextRecommendation: distribution.timing_recommendations[0] || null,
      isComplete: todaysActions.length >= autonomousTarget,
      autonomousMode: true
    };
  }

  // リアルタイム市場状況に応じた戦略的計画生成
  async generateMarketAwarePlan(): Promise<ActionDistribution & { marketAnalysis: any }> {
    console.log('📊 [市場対応計画] リアルタイム市場状況を分析して戦略調整中...');
    
    try {
      // 現在の市場状況を分析
      const currentMarketCondition = this.getCurrentMarketConditions();
      
      // 市場状況に応じた配分を調整
      const baseDistribution = await this.planDailyDistribution();
      const marketAdjustedDistribution = this.adjustDistributionForMarket(baseDistribution, currentMarketCondition);
      
      const marketAnalysis = {
        marketCondition: currentMarketCondition,
        recommendedAdjustments: this.getMarketBasedAdjustments(currentMarketCondition),
        urgencyLevel: this.assessMarketUrgency(currentMarketCondition),
        suggestedFocus: this.getSuggestedFocus(currentMarketCondition)
      };
      
      console.log('📊 [市場対応計画完了]', {
        marketStatus: currentMarketCondition.newsIntensity,
        volatility: currentMarketCondition.volatility,
        urgency: marketAnalysis.urgencyLevel,
        focus: marketAnalysis.suggestedFocus
      });
      
      return {
        ...marketAdjustedDistribution,
        marketAnalysis
      };
      
    } catch (error) {
      console.error('❌ [市場対応計画エラー]:', error);
      // フォールバック: 通常の計画を返す
      const fallbackDistribution = await this.planDailyDistribution();
      return {
        ...fallbackDistribution,
        marketAnalysis: {
          marketCondition: this.getDefaultMarketCondition(),
          error: 'Market analysis failed, using default plan'
        }
      };
    }
  }

  private getCurrentMarketConditions(): MarketCondition {
    const hour = new Date().getHours();
    
    // 市場セッション時間の判定
    let sessionTime: MarketCondition['sessionTime'];
    if (hour >= 0 && hour < 9) sessionTime = 'tokyo';
    else if (hour >= 8 && hour < 17) sessionTime = 'london';
    else if (hour >= 13 && hour < 22) sessionTime = 'newyork';
    else if ((hour >= 8 && hour < 10) || (hour >= 13 && hour < 17)) sessionTime = 'overlap';
    else sessionTime = 'quiet';

    // 簡易的な市場状況判定（実際の実装では外部データソースを使用）
    return {
      volatility: this.assessVolatility(),
      trendDirection: 'sideways', // デフォルト
      newsIntensity: this.assessNewsIntensity(),
      sessionTime,
      majorEventScheduled: this.checkMajorEvents()
    };
  }

  private assessVolatility(): MarketCondition['volatility'] {
    // 簡易的なボラティリティ判定（時間帯ベース）
    const hour = new Date().getHours();
    
    // 市場オープン時間や重要発表時間帯は高ボラティリティ
    if ((hour >= 8 && hour <= 10) || (hour >= 13 && hour <= 15) || (hour >= 21 && hour <= 23)) {
      return 'high';
    } else if (hour >= 15 && hour <= 17) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private assessNewsIntensity(): MarketCondition['newsIntensity'] {
    // 週の始めや月末は重要ニュースが多い傾向
    const dayOfWeek = new Date().getDay();
    const dateOfMonth = new Date().getDate();
    
    if (dayOfWeek === 1 || dateOfMonth <= 3 || dateOfMonth >= 28) {
      return 'high';
    } else if (dayOfWeek >= 2 && dayOfWeek <= 4) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private checkMajorEvents(): boolean {
    // 簡易的なイベントチェック（実際の実装では経済カレンダーAPIを使用）
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    // 金曜日の夕方（雇用統計など）や水曜日（FOMC等）
    return (dayOfWeek === 5 && hour >= 21) || (dayOfWeek === 3 && hour >= 20);
  }

  private adjustDistributionForMarket(
    distribution: ActionDistribution, 
    marketCondition: MarketCondition
  ): ActionDistribution {
    // 市場状況に応じて配分を調整
    if (marketCondition.volatility === 'high' || marketCondition.newsIntensity === 'high') {
      // 高ボラティリティ時はより頻繁な情報発信を推奨
      return {
        ...distribution,
        optimal_distribution: {
          ...distribution.optimal_distribution,
          original_post: Math.min((distribution.optimal_distribution.original_post || 0) + 2, 15) // 最大2回追加（デフォルト15回）
        },
        timing_recommendations: this.getHighVolatilityTiming(distribution.timing_recommendations)
      };
    }
    
    return distribution;
  }

  private getHighVolatilityTiming(originalTiming: TimingRecommendation[]): TimingRecommendation[] {
    // 高ボラティリティ時はより短い間隔での投稿を推奨
    return originalTiming.map(timing => ({
      ...timing,
      priority: Math.min(timing.priority + 1, 10), // 優先度を上げる
      reasoning: `${timing.reasoning} (高ボラティリティ対応)`
    }));
  }

  private getMarketBasedAdjustments(marketCondition: MarketCondition): string[] {
    const adjustments = [];
    
    if (marketCondition.volatility === 'high') {
      adjustments.push('高ボラティリティにつき、リアルタイム情報の頻度を上げることを推奨');
    }
    
    if (marketCondition.newsIntensity === 'high') {
      adjustments.push('重要ニュースが多いため、速報性を重視した投稿を推奨');
    }
    
    if (marketCondition.sessionTime === 'overlap') {
      adjustments.push('市場重複時間につき、取引量増加に対応した情報発信を推奨');
    }
    
    if (marketCondition.majorEventScheduled) {
      adjustments.push('重要経済指標発表予定につき、事前準備投稿を推奨');
    }
    
    return adjustments.length > 0 ? adjustments : ['標準的な投稿計画で問題ありません'];
  }

  private assessMarketUrgency(marketCondition: MarketCondition): 'low' | 'medium' | 'high' | 'critical' {
    if (marketCondition.volatility === 'extreme') return 'critical';
    if (marketCondition.volatility === 'high' && marketCondition.newsIntensity === 'breaking') return 'critical';
    if (marketCondition.volatility === 'high' || marketCondition.newsIntensity === 'high') return 'high';
    if (marketCondition.sessionTime === 'overlap') return 'medium';
    return 'low';
  }

  private getSuggestedFocus(marketCondition: MarketCondition): string {
    if (marketCondition.volatility === 'high') {
      return 'リスク管理と市場動向解説';
    } else if (marketCondition.newsIntensity === 'high') {
      return '経済ニュース解説と市場への影響分析';
    } else if (marketCondition.sessionTime === 'overlap') {
      return '取引機会の紹介と注意点';
    } else {
      return '教育コンテンツと長期投資戦略';
    }
  }

  private getDefaultMarketCondition(): MarketCondition {
    return {
      volatility: 'medium',
      trendDirection: 'sideways',
      newsIntensity: 'medium',
      sessionTime: 'quiet',
      majorEventScheduled: false
    };
  }

  // DailyPlan生成メソッド（action-executor.tsで使用）
  async generateDailyPlan(): Promise<DailyPlan> {
    console.log('📋 [DailyPlan生成] 完全なDailyPlanオブジェクトを生成中...');
    
    try {
      const distribution = await this.planDailyDistribution();
      const marketCondition = this.getCurrentMarketConditions();
      
      // 基本的なPlannedActionの生成
      const plannedActions: PlannedAction[] = distribution.timing_recommendations.map((timing, index) => ({
        id: `daily-action-${Date.now()}-${index}`,
        type: timing.actionType,
        description: timing.reasoning,
        priority: timing.priority,
        estimatedDuration: 300, // 5分
        dependencies: index > 0 ? [`daily-action-${Date.now()}-${index-1}`] : undefined
      }));

      // 高優先度トピックの生成
      const highPriorityTopics: TopicPriority[] = [
        { topic: 'market_analysis', priority: 1, reason: 'Daily market assessment', targetAudience: 'investors' },
        { topic: 'content_creation', priority: 2, reason: 'Audience engagement', targetAudience: 'general' },
        { topic: 'performance_review', priority: 3, reason: 'Growth tracking', targetAudience: 'analysts' }
      ];

      // レガシーPlanActionの生成（既存システム互換）
      const priorityActions: PlanAction[] = plannedActions.map(action => ({
        id: action.id,
        type: action.type,
        description: action.description,
        scheduledTime: new Date(),
        duration: action.estimatedDuration,
        priority: action.priority,
        dependencies: action.dependencies || []
      }));

      // 完全なDailyPlanオブジェクト生成
      const dailyPlan: DailyPlan = {
        // 新しい必須プロパティ
        timestamp: new Date().toISOString(),
        actions: plannedActions,
        priorities: ['market_analysis', 'content_creation', 'performance_review'],
        highPriorityTopics,
        topics: ['investment', 'market_trends', 'financial_education'],
        marketFocus: ['forex', 'crypto', 'stocks'],
        executionStatus: {
          completed: 0,
          pending: plannedActions.length,
          failed: 0,
          totalPlanned: plannedActions.length
        },
        // 既存のレガシープロパティ（既存システム互換）
        date: new Date(),
        marketConditions: marketCondition,
        priorityActions,
        contingencyPlans: [],
        monitoringTargets: [],
        successMetrics: []
      };

      console.log('✅ [DailyPlan生成完了]', {
        plannedActions: plannedActions.length,
        highPriorityTopics: highPriorityTopics.length,
        totalElements: Object.keys(dailyPlan).length
      });

      return dailyPlan;
    } catch (error) {
      console.error('❌ [DailyPlan生成エラー]:', error);
      
      // エラー時のフォールバック
      return this.createFallbackDailyPlan();
    }
  }

  private createFallbackDailyPlan(): DailyPlan {
    return {
      timestamp: new Date().toISOString(),
      actions: [],
      priorities: ['content_creation'],
      highPriorityTopics: [
        { topic: 'market_analysis', priority: 1, reason: 'Daily market assessment' }
      ],
      topics: ['investment'],
      marketFocus: ['general'],
      executionStatus: {
        completed: 0,
        pending: 0,
        failed: 0,
        totalPlanned: 0
      },
      date: new Date(),
      marketConditions: this.getDefaultMarketCondition(),
      priorityActions: [],
      contingencyPlans: [],
      monitoringTargets: [],
      successMetrics: []
    };
  }

  // 🧠 NEW: Claude自律的頻度決定メソッド
  private async determineAutonomousFrequency(currentSuccessful: number): Promise<number> {
    try {
      const accountHealth = await this.getAccountHealth();
      const marketConditions = this.getCurrentMarketConditions();
      const engagementData = await this.getEngagementData();
      
      const autonomousFrequency = await this.claudeAgent.determineOptimalPostingFrequency({
        accountHealth,
        engagement: engagementData,
        marketConditions,
        competitorActivity: await this.getCompetitorActivity()
      });
      
      console.log(`🧠 [Claude頻度決定] 自律決定頻度: ${autonomousFrequency}回/日`);
      return autonomousFrequency;
    } catch (error) {
      console.warn('⚠️ [頻度決定フォールバック]:', error);
      return Math.max(5, Math.min(25, currentSuccessful + 8)); // フォールバック
    }
  }

  // 🧠 NEW: アカウントヘルス取得
  private async getAccountHealth(): Promise<number> {
    try {
      const accountData = loadYamlSafe<any>('data/account-analysis-data.yaml');
      return accountData?.healthScore || 75;
    } catch {
      return 75; // デフォルト値
    }
  }

  // 🧠 NEW: エンゲージメントデータ取得
  private async getEngagementData(): Promise<any> {
    try {
      const metricsData = loadYamlSafe<any>('data/metrics-history.yaml');
      return {
        averageEngagement: metricsData?.averageEngagement || 0.05,
        recentTrend: metricsData?.trend || 'stable',
        peakHours: metricsData?.peakHours || ['09:00', '14:00', '19:00']
      };
    } catch {
      return {
        averageEngagement: 0.05,
        recentTrend: 'stable',
        peakHours: ['09:00', '14:00', '19:00']
      };
    }
  }

  // 🧠 NEW: 競合活動データ取得
  private async getCompetitorActivity(): Promise<any> {
    return {
      averagePostsPerDay: 12,
      peakActivityHours: ['08:00', '13:00', '18:00'],
      contentTypes: ['analysis', 'education', 'news']
    };
  }

  // 🧠 NEW: 自律的優先度計算
  private async calculateAutonomousPriority(time: string, actionType: ActionType): Promise<number> {
    const [hour] = time.split(':').map(Number);
    
    // 時間帯による基本優先度
    let basePriority = 5;
    if (hour >= 7 && hour <= 9) basePriority = 8;    // 朝の活動時間
    if (hour >= 19 && hour <= 21) basePriority = 9;  // 夕方のゴールデンタイム
    if (hour >= 12 && hour <= 14) basePriority = 7;  // 昼休み時間
    
    // アクション型による調整（全タイプ対応）
    const actionMultiplier: Record<string, number> = {
      'original_post': 1.2,
      'quote_tweet': 1.1,
      'retweet': 1.0,
      'reply': 0.9
    };
    
    return Math.round(basePriority * (actionMultiplier[actionType] || 1.0));
  }

  // 🧠 NEW: 自律的理由生成
  private async generateAutonomousReasoning(time: string, actionType: ActionType): Promise<string> {
    const [hour] = time.split(':').map(Number);
    
    const timeReasons: Record<string, string> = {
      morning: 'フォロワーの活動開始時間に合わせた効果的な投稿タイミング',
      lunch: '昼休み時間でエンゲージメントが期待できる時間帯',
      evening: 'ゴールデンタイムでの最大リーチを狙う戦略的タイミング',
      night: '一日の振り返りや情報収集時間に適した投稿タイミング'
    };
    
    let timeCategory = 'night';
    if (hour >= 7 && hour <= 10) timeCategory = 'morning';
    if (hour >= 12 && hour <= 14) timeCategory = 'lunch';
    if (hour >= 17 && hour <= 21) timeCategory = 'evening';
    
    const actionTypeReasons: Record<string, string> = {
      'original_post': '独自コンテンツでの価値提供',
      'quote_tweet': '既存情報への価値追加コメント',
      'retweet': '有益情報の拡散による価値提供',
      'reply': 'コミュニティとの積極的な交流'
    };
    
    const timeReason = timeReasons[timeCategory] || timeReasons.night;
    const actionReason = actionTypeReasons[actionType] || '価値創造アクション';
    
    return `${timeReason} - ${actionReason}`;
  }

  // 🧠 NEW: 自律的目標取得
  private async getAutonomousTarget(): Promise<number> {
    try {
      const autonomousFrequency = await this.determineAutonomousFrequency(0);
      return autonomousFrequency;
    } catch {
      return 8; // フォールバック目標
    }
  }

  // 🧠 NEW: 利用可能時間取得
  private getAvailableHours(): string[] {
    const hours = [];
    for (let h = 7; h <= 22; h++) {
      hours.push(`${h.toString().padStart(2, '0')}:00`);
      hours.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return hours;
  }
}