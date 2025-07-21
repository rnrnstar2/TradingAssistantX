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

export class DailyActionPlanner {
  private readonly DAILY_TARGET = 15;
  private readonly logFile = 'data/daily-action-data.yaml';
  private readonly strategyFile = 'data/content-strategy.yaml';
  private readonly claudeSummaryFile = 'data/claude-summary.yaml';
  
  constructor() {
    this.ensureDataDirectory();
  }
  
  private ensureDataDirectory(): void {
    if (!existsSync('data')) {
      mkdirSync('data', { recursive: true });
    }
  }

  // 1日の配分計画を策定
  async planDailyDistribution(): Promise<ActionDistribution> {
    console.log('📋 [日次配分計画] 1日15回の最適配分を策定中...');
    
    const currentActions = await this.getTodaysActions();
    const successfulActions = currentActions.filter(action => action.success);
    const remaining = this.DAILY_TARGET - successfulActions.length;
    
    console.log(`📊 [配分状況] 本日成功: ${successfulActions.length}/15 (実行済み: ${currentActions.length}), 残り: ${remaining}`);
    
    if (remaining <= 0) {
      console.log('✅ [配分完了] 本日の目標回数に到達済み');
      return this.createCompletedDistribution();
    }
    
    const distribution = {
      remaining,
      optimal_distribution: this.calculateOptimalDistribution(remaining),
      timing_recommendations: await this.getTimingRecommendations(remaining)
    };
    
    console.log('📋 [配分計画完了]', {
      remaining: distribution.remaining,
      distribution: distribution.optimal_distribution,
      timingSlots: distribution.timing_recommendations.length
    });
    
    return distribution;
  }
  
  // 最適配分の計算（original_post専用）
  private calculateOptimalDistribution(remaining: number): ActionDistribution['optimal_distribution'] {
    console.log(`🧮 [配分計算] 残り${remaining}回をoriginal_postに100%配分中...`);
    
    if (remaining <= 0) {
      return { original_post: 0 };
    }
    
    // 簡素化: 100% original_post配分
    const adjusted = {
      original_post: remaining  // 100% original_post
    };
    
    console.log('🧮 [配分計算完了]', {
      target: remaining,
      calculated: adjusted,
      distribution: 'original_post: 100%'
    });
    
    return adjusted;
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
      const actionType: ActionType = 'original_post'; // 常にoriginal_postのみ
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
      todaysLog.targetReached = successCount >= this.DAILY_TARGET;
      
      // 最新30日分のみ保持
      logData = logData.slice(-30);
      
      writeFileSync(this.logFile, yaml.dump(logData, { indent: 2 }));
      
      console.log(`✅ [アクション記録完了] ${actionResult.type} (${actionResult.success ? '成功' : '失敗'}) - 本日成功${successCount}/${this.DAILY_TARGET}回 (実行済み: ${todaysLog.executedActions.length}回)`);
      
      if (todaysLog.targetReached) {
        console.log('🎯 [目標達成] 本日の投稿目標15回に到達しました！');
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
        original_post: 0
      },
      timing_recommendations: []
    };
  }
  
  // 統計情報の取得
  async getActionStats(days: number = 7): Promise<any> {
    console.log(`📊 [統計取得] 過去${days}日間のアクション統計を生成中...`);
    
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
          original_post: 0
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
      
      console.log('📊 [統計取得完了]', {
        period: stats.period,
        avgActions: Math.round(stats.averageActionsPerDay * 10) / 10,
        achievementRate: Math.round(stats.targetAchievementRate * 10) / 10 + '%'
      });
      
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
        original_post: 0
      },
      dailyDetails: []
    };
  }
  
  // 今日の進捗確認
  async getTodayProgress(): Promise<any> {
    const todaysActions = await this.getTodaysActions();
    const distribution = await this.planDailyDistribution();
    
    return {
      completed: todaysActions.length,
      target: this.DAILY_TARGET,
      remaining: distribution.remaining,
      progress: Math.round((todaysActions.length / this.DAILY_TARGET) * 100),
      nextRecommendation: distribution.timing_recommendations[0] || null,
      isComplete: todaysActions.length >= this.DAILY_TARGET
    };
  }
}