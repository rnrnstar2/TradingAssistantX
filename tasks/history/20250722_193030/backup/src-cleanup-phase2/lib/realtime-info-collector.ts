/**
 * リアルタイム情報収集システム
 * コンテキスト圧迫抑制・最小情報システム用
 */

export interface EssentialContext {
  market: MarketSnapshot;
  account: AccountSnapshot;
  opportunities: ImmediateOpportunity[];
}

export interface MarketSnapshot {
  trending: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  activity: 'low' | 'medium' | 'high';
}

export interface AccountSnapshot {
  healthScore: number;
  todayActions: number;
  lastSuccess: string;
}

export interface ImmediateOpportunity {
  type: 'post' | 'engage' | 'amplify' | 'wait';
  priority: number;
  reason: string;
}

export class RealtimeInfoCollector {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分キャッシュ

  /**
   * 情報をメモリ内でのみ処理、永続化しない
   */
  async getEssentialContext(): Promise<EssentialContext> {
    return {
      market: await this.getCurrentMarketSnapshot(),
      account: await this.getCurrentAccountSnapshot(),
      opportunities: await this.getImmediateOpportunities()
    };
  }

  /**
   * 最小限の市場情報（5分以内の情報のみ）
   */
  private async getCurrentMarketSnapshot(): Promise<MarketSnapshot> {
    const cached = this.getFromCache('market');
    if (cached) return cached;

    const snapshot: MarketSnapshot = {
      trending: await this.getTopTrends(3),
      sentiment: await this.getCurrentSentiment(),
      activity: await this.getActivityLevel()
    };

    this.setCache('market', snapshot);
    return snapshot;
  }

  /**
   * 現在のアカウント状態のみ
   */
  private async getCurrentAccountSnapshot(): Promise<AccountSnapshot> {
    const cached = this.getFromCache('account');
    if (cached) return cached;

    const snapshot: AccountSnapshot = {
      healthScore: await this.calculateHealthScore(),
      todayActions: await this.getTodayActionCount(),
      lastSuccess: await this.getLastSuccessTime()
    };

    this.setCache('account', snapshot);
    return snapshot;
  }

  /**
   * 現在の機会のみ
   */
  private async getImmediateOpportunities(): Promise<ImmediateOpportunity[]> {
    const cached = this.getFromCache('opportunities');
    if (cached) return cached;

    const opportunities = await this.analyzeCurrentOpportunities();
    this.setCache('opportunities', opportunities);
    return opportunities;
  }

  // 上位3つのトレンドのみ取得
  private async getTopTrends(limit: number): Promise<string[]> {
    // 実装: リアルタイムトレンド取得
    return ['投資教育', 'トレーディング技術', '市場分析'];
  }

  // 現在感情のみ
  private async getCurrentSentiment(): Promise<'positive' | 'negative' | 'neutral'> {
    // 実装: 市場感情分析
    return 'neutral';
  }

  // 活動レベルのみ
  private async getActivityLevel(): Promise<'low' | 'medium' | 'high'> {
    // 実装: 活動レベル分析
    return 'medium';
  }

  private async calculateHealthScore(): Promise<number> {
    // 簡単な健康度スコア計算
    const recentSuccess = await this.getRecentSuccessRate();
    const errorRate = await this.getRecentErrorRate();
    return Math.max(0, Math.min(100, (recentSuccess * 100) - (errorRate * 50)));
  }

  private async getTodayActionCount(): Promise<number> {
    // 今日の実行回数を取得
    const today = new Date().toISOString().slice(0, 10);
    // 実装: 今日のアクション数取得
    return 5; // プレースホルダー
  }

  private async getLastSuccessTime(): Promise<string> {
    // 最後の成功時刻を取得
    return new Date().toISOString();
  }

  private async analyzeCurrentOpportunities(): Promise<ImmediateOpportunity[]> {
    const market = await this.getCurrentMarketSnapshot();
    const account = await this.getCurrentAccountSnapshot();

    const opportunities: ImmediateOpportunity[] = [];

    // 投稿機会の分析
    if (account.todayActions < 15 && account.healthScore > 50) {
      opportunities.push({
        type: 'post',
        priority: 8,
        reason: '投資教育コンテンツでの価値提供'
      });
    }

    // エンゲージメント機会
    if (market.activity === 'high') {
      opportunities.push({
        type: 'engage',
        priority: 7,
        reason: '高活動期でのエンゲージメント効果'
      });
    }

    // 待機判断
    if (account.todayActions >= 15) {
      opportunities.push({
        type: 'wait',
        priority: 9,
        reason: '日次制限到達'
      });
    }

    return opportunities.sort((a, b) => b.priority - a.priority);
  }

  private async getRecentSuccessRate(): Promise<number> {
    // 最近の成功率を計算（簡略化）
    return 0.8;
  }

  private async getRecentErrorRate(): Promise<number> {
    // 最近のエラー率を計算（簡略化）
    return 0.1;
  }

  // シンプルなキャッシュシステム
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // 5分ごとのクリーンアップ
  startPeriodicCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.CACHE_TTL) {
          this.cache.delete(key);
        }
      }
    }, this.CACHE_TTL);
  }
}