/**
 * Claude Code SDK による意思決定エンジン
 * REQUIREMENTS.md準拠版 - 30分間隔実行システム対応
 */

export interface ClaudeDecision {
  action: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'wait';
  reasoning: string;
  parameters: {
    topic?: string;
    searchQuery?: string;
    content?: string;
    targetTweetId?: string;
    duration?: number;
    reason?: string;
    retry_action?: string;
  };
  confidence: number;
}

interface SystemHealth {
  all_systems_operational: boolean;
  api_status: 'healthy' | 'degraded' | 'error';
  rate_limits_ok: boolean;
}

interface AccountStatus {
  followerCount: number;
  lastPostTime?: string;
  postsToday: number;
}

interface MarketData {
  trendingTopics: string[];
  volatility: 'low' | 'medium' | 'high';
  sentiment: 'bearish' | 'neutral' | 'bullish';
}

interface SystemContext {
  account: AccountStatus;
  system: {
    health: SystemHealth;
    executionCount: {
      today: number;
      total: number;
    };
  };
  market: MarketData;
}

/**
 * Claude Code SDKによるアクション決定エンジン
 * 30分間隔での自律判断実装
 */
export class DecisionEngine {
  private readonly MAX_POSTS_PER_DAY = 5;
  private readonly MIN_WAIT_BETWEEN_POSTS = 3600000; // 1 hour
  private readonly CONFIDENCE_THRESHOLD = 0.7;

  constructor() {
    console.log('✅ DecisionEngine initialized - REQUIREMENTS.md準拠版');
  }

  /**
   * システムコンテキストを分析してアクションを決定
   */
  async makeDecision(context: SystemContext): Promise<ClaudeDecision> {
    try {
      const { account, system, market } = context;
      const currentTime = new Date();

      // 1. 日次投稿制限チェック
      if (account.postsToday >= this.MAX_POSTS_PER_DAY) {
        return this.createWaitDecision(
          'Daily post limit reached',
          0.9,
          this.getTimeUntilNextDay()
        );
      }

      // 2. 投稿間隔チェック
      if (account.lastPostTime) {
        const lastPostTime = new Date(account.lastPostTime);
        const timeSinceLastPost = currentTime.getTime() - lastPostTime.getTime();
        
        if (timeSinceLastPost < this.MIN_WAIT_BETWEEN_POSTS) {
          const waitTime = this.MIN_WAIT_BETWEEN_POSTS - timeSinceLastPost;
          return this.createWaitDecision(
            'Minimum wait time between posts not met',
            0.8,
            waitTime
          );
        }
      }

      // 3. システムヘルスチェック
      if (!system.health.all_systems_operational) {
        return this.createWaitDecision(
          'System health issues detected',
          0.7,
          1800000 // 30 minutes
        );
      }

      // 4. アカウント状況に基づく判断
      if (account.followerCount < 100) {
        return this.createPostDecision(
          'Low follower count - creating educational content to attract followers',
          0.8,
          'educational'
        );
      }

      // 5. トレンドトピックの活用
      if (market.trendingTopics.length > 0) {
        const shouldPost = this.evaluateMarketConditions(market);
        if (shouldPost.action === 'post') {
          return this.createPostDecision(
            `Trending topics available: ${market.trendingTopics.slice(0, 2).join(', ')}`,
            shouldPost.confidence,
            'trending'
          );
        }
      }

      // 6. 市場センチメントベースの判断
      if (market.sentiment === 'bullish' && market.volatility === 'low') {
        return this.createPostDecision(
          'Favorable market conditions for educational content',
          0.75,
          'market_analysis'
        );
      }

      // 7. デフォルト: 待機
      return this.createWaitDecision(
        'No high-confidence opportunities detected - waiting for next cycle',
        0.6,
        1800000 // 30 minutes
      );

    } catch (error) {
      return this.handleDecisionError(error as Error);
    }
  }

  /**
   * 市場状況を評価してアクション提案
   */
  private evaluateMarketConditions(market: MarketData): { action: string; confidence: number } {
    let confidence = 0.5;

    // トレンドトピック数による調整
    if (market.trendingTopics.length >= 3) {
      confidence += 0.2;
    }

    // ボラティリティによる調整
    switch (market.volatility) {
      case 'low':
        confidence += 0.1;
        break;
      case 'high':
        confidence -= 0.1;
        break;
    }

    // センチメントによる調整
    switch (market.sentiment) {
      case 'bullish':
        confidence += 0.15;
        break;
      case 'bearish':
        confidence -= 0.1;
        break;
    }

    return {
      action: confidence > this.CONFIDENCE_THRESHOLD ? 'post' : 'wait',
      confidence: Math.min(confidence, 0.95)
    };
  }

  /**
   * 決定の妥当性を検証
   */
  validateDecision(decision: ClaudeDecision): boolean {
    try {
      // 必須フィールドチェック
      if (!decision.action || !decision.reasoning) {
        return false;
      }

      // 信頼度範囲チェック
      if (decision.confidence < 0 || decision.confidence > 1) {
        return false;
      }

      // アクション妥当性チェック
      const validActions = ['post', 'retweet', 'quote_tweet', 'like', 'wait'];
      if (!validActions.includes(decision.action)) {
        return false;
      }

      // 高リスクアクションの信頼度チェック
      if (decision.action === 'post' && decision.confidence < this.CONFIDENCE_THRESHOLD) {
        console.warn('Post action rejected due to low confidence', {
          confidence: decision.confidence,
          threshold: this.CONFIDENCE_THRESHOLD
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Decision validation failed', { error, decision });
      return false;
    }
  }

  /**
   * エラーハンドリング用フォールバック決定
   */
  private handleDecisionError(error: Error): ClaudeDecision {
    console.error('Decision error handled', { error });
    
    return {
      action: 'wait',
      reasoning: `Decision error occurred: ${error.message}. System will wait and retry.`,
      parameters: {
        duration: 600000, // 10 minutes
        reason: 'decision_error',
        retry_action: 'analyze'
      },
      confidence: 0.2
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private createPostDecision(reasoning: string, confidence: number, contentType?: string): ClaudeDecision {
    return {
      action: 'post',
      reasoning,
      parameters: {
        topic: contentType || 'general',
        content: contentType
      },
      confidence
    };
  }

  private createWaitDecision(reasoning: string, confidence: number, duration?: number): ClaudeDecision {
    return {
      action: 'wait',
      reasoning,
      parameters: {
        duration: duration || 1800000, // Default 30 minutes
        reason: 'scheduled_wait'
      },
      confidence
    };
  }

  private getTimeUntilNextDay(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  }
}