import { SystemContext } from '../../../shared/types';

// 時間帯コンテキストの型定義
export interface TimeContext {
  dayOfWeek: string;
  timeContext: string;
  hour: number;
}

// アカウント状況の型定義
export interface AccountStatus {
  followerCount: number;
  postsToday: number;
  engagementRate: number;
  lastPostHours: number;
}

export abstract class BaseBuilder {
  // 時間帯取得
  protected getTimeContext(): TimeContext {
    const now = new Date();
    return {
      dayOfWeek: this.getDayOfWeek(now),
      timeContext: this.getTimeOfDay(now),
      hour: now.getHours()
    };
  }

  // 曜日取得（日〜土）
  private getDayOfWeek(date: Date): string {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  }

  // 時間帯取得
  private getTimeOfDay(date: Date): string {
    const hour = date.getHours();
    if (hour >= 5 && hour < 7) return '早朝';
    if (hour >= 7 && hour < 10) return '朝';
    if (hour >= 10 && hour < 12) return '午前中';
    if (hour >= 12 && hour < 14) return '昼';
    if (hour >= 14 && hour < 17) return '午後';
    if (hour >= 17 && hour < 19) return '夕方';
    return '夜';
  }

  // アカウント状況フォーマット
  protected formatAccountStatus(account: SystemContext['account']): AccountStatus {
    return {
      followerCount: account.followerCount,
      postsToday: account.postsToday,
      engagementRate: account.engagementRate,
      lastPostHours: this.getHoursSinceLastPost(account)
    };
  }

  // エンゲージメント率計算
  private calculateEngagementRate(account: SystemContext['account']): number {
    // 最近の投稿のエンゲージメント率を計算
    // TODO: 実際の計算ロジックは学習データから取得
    return account.engagementRate || 2.5; // デフォルト値
  }

  // 前回投稿からの経過時間計算
  private getHoursSinceLastPost(account: SystemContext['account']): number {
    if (account.lastPostTime) {
      const lastPost = new Date(account.lastPostTime);
      const now = new Date();
      return Math.floor((now.getTime() - lastPost.getTime()) / (1000 * 60 * 60));
    }
    return 4; // デフォルト値
  }

  // 共通変数の注入
  protected injectCommonVariables(template: string, context: SystemContext): string {
    const timeContext = this.getTimeContext();
    const accountStatus = this.formatAccountStatus(context.account);
    
    return template
      .replace(/\${dayOfWeek}/g, timeContext.dayOfWeek)
      .replace(/\${timeContext}/g, timeContext.timeContext)
      .replace(/\${hour}/g, timeContext.hour.toString())
      .replace(/\${context\.account\.followerCount}/g, accountStatus.followerCount.toString())
      .replace(/\${context\.account\.postsToday}/g, accountStatus.postsToday.toString())
      .replace(/\${context\.account\.engagementRate}/g, accountStatus.engagementRate.toString())
      .replace(/\${lastPostHours}/g, accountStatus.lastPostHours.toString());
  }

  // 学習データ変数の注入
  protected injectLearningVariables(template: string, learningData: SystemContext['learningData']): string {
    if (!learningData) return template;

    const recentTopics = learningData.recentTopics?.join(', ') || '';
    const avgEngagement = learningData.avgEngagement || 0;
    const totalPatterns = learningData.totalPatterns || 0;

    return template
      .replace(/\${context\.learningData\.recentTopics}/g, recentTopics)
      .replace(/\${context\.learningData\.avgEngagement}/g, avgEngagement.toString())
      .replace(/\${context\.learningData\.totalPatterns}/g, totalPatterns.toString());
  }

  // 市場状況変数の注入
  protected injectMarketVariables(template: string, market: SystemContext['market']): string {
    if (!market) return template;

    const sentiment = market.sentiment || 'neutral';
    const volatility = market.volatility || 'medium';
    const trendingTopics = market.trendingTopics?.join(', ') || '';

    return template
      .replace(/\${context\.market\.sentiment}/g, sentiment)
      .replace(/\${context\.market\.volatility}/g, volatility)
      .replace(/\${context\.market\.trendingTopics}/g, trendingTopics);
  }

  // 抽象メソッド：各ビルダーで実装必須
  abstract buildPrompt(params: unknown): string;
}