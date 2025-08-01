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
  protected formatAccountStatus(account: NonNullable<SystemContext['account']>): AccountStatus {
    return {
      followerCount: account.followerCount,
      postsToday: account.postsToday,
      engagementRate: account.engagementRate,
      lastPostHours: this.getHoursSinceLastPost(account)
    };
  }

  // エンゲージメント率計算
  private calculateEngagementRate(account: NonNullable<SystemContext['account']>): number {
    // 最近の投稿のエンゲージメント率を計算
    // TODO: 実際の計算ロジックは学習データから取得
    return account.engagementRate || 2.5; // デフォルト値
  }

  // 前回投稿からの経過時間計算
  private getHoursSinceLastPost(account: NonNullable<SystemContext['account']>): number {
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
    
    // null安全性の確保
    if (context?.account) {
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
    
    // アカウント情報がない場合は時間情報のみ置換
    return template
      .replace(/\${dayOfWeek}/g, timeContext.dayOfWeek)
      .replace(/\${timeContext}/g, timeContext.timeContext)
      .replace(/\${hour}/g, timeContext.hour.toString())
      .replace(/\${context\.account\.followerCount}/g, '0')
      .replace(/\${context\.account\.postsToday}/g, '0')
      .replace(/\${context\.account\.engagementRate}/g, '0')
      .replace(/\${lastPostHours}/g, '0');
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

  /**
   * 参考アカウント情報の要約を生成
   */
  protected summarizeReferenceAccounts(referenceAccountTweets?: any[]): string {
    if (!referenceAccountTweets || referenceAccountTweets.length === 0) {
      return '';
    }

    const accountSummaries = referenceAccountTweets.map(account => {
      const tweetCount = account.tweets.length;
      const latestTweet = account.tweets[0];
      const avgEngagement = this.calculateAverageEngagement(account.tweets);
      
      return `@${account.username}: ${tweetCount}件の最新情報（平均エンゲージメント: ${avgEngagement.toFixed(1)}）`;
    });

    return `参考情報源: ${accountSummaries.join(', ')}`;
  }

  /**
   * ツイートの平均エンゲージメントを計算
   */
  private calculateAverageEngagement(tweets: any[]): number {
    if (!tweets || tweets.length === 0) return 0;
    
    const totalEngagement = tweets.reduce((sum, tweet) => {
      const metrics = tweet.public_metrics || {};
      return sum + (metrics.like_count || 0) + (metrics.retweet_count || 0);
    }, 0);
    
    return totalEngagement / tweets.length;
  }

  /**
   * 情報の新鮮度を評価
   */
  protected evaluateFreshness(tweets: any[]): string {
    if (!tweets || tweets.length === 0) return 'データなし';
    
    const now = new Date();
    const latestTweetTime = new Date(tweets[0].created_at);
    const hoursDiff = (now.getTime() - latestTweetTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff < 1) return '1時間以内の最新情報';
    if (hoursDiff < 6) return '6時間以内の情報';
    if (hoursDiff < 24) return '24時間以内の情報';
    return '1日以上前の情報';
  }

  // 抽象メソッド：各ビルダーで実装必須
  abstract buildPrompt(params: unknown): string;
}