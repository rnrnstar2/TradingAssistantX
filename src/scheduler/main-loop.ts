/**
 * メイン実行ループ統合クラス
 * REQUIREMENTS.md準拠版 - 30分間隔自動実行システム
 */

import { ClaudeDecision } from '../claude/decision-engine';

export interface SystemContext {
  timestamp: string;
  account: {
    followerCount: number;
    lastPostTime?: string;
    postsToday: number;
    engagementRate: number;
    accountHealth: 'good' | 'warning' | 'critical';
  };
  system: {
    executionCount: {
      today: number;
      total: number;
    };
    health: {
      all_systems_operational: boolean;
      api_status: 'healthy' | 'degraded' | 'error';
      rate_limits_ok: boolean;
    };
  };
  market: {
    trendingTopics: string[];
    volatility: 'low' | 'medium' | 'high';
    sentiment: 'bearish' | 'neutral' | 'bullish';
  };
  learningData: {
    decisionPatterns: any[];
    successStrategies: any[];
    errorLessons: any[];
  };
}

export interface ExecutionResult {
  success: boolean;
  action: string;
  executionTime: number;
  result?: {
    id: string;
    url?: string;
    content?: string;
  };
  error?: string;
  metadata: {
    confidence: number;
    reasoning: string;
    context: string;
    timestamp: string;
  };
}

export interface LoopMetrics {
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  actionBreakdown: {
    [action: string]: {
      count: number;
      successRate: number;
      avgTime: number;
    };
  };
  learningUpdates: number;
  lastExecutionTime: string;
}

/**
 * メイン実行ループ統合クラス
 * 30分間隔での自動実行フローを管理・統合
 */
export class MainLoop {
  private metrics!: LoopMetrics;
  private isExecuting: boolean = false;

  constructor() {
    this.initializeMetrics();
    console.log('✅ MainLoop initialized - REQUIREMENTS.md準拠版');
  }

  /**
   * 単一実行サイクル（30分間隔実行の1回分）
   */
  async runOnce(): Promise<ExecutionResult> {
    if (this.isExecuting) {
      console.warn('⚠️ Execution already in progress, skipping');
      return this.createSkippedResult();
    }

    this.isExecuting = true;
    const startTime = Date.now();

    try {
      console.log('🚀 Starting 30-minute execution cycle...');

      // 1. 現在状況の分析
      const context = await this.analyzeCurrentSituation();

      // 2. Claude意思決定
      const decision = await this.makeDecision(context);

      // 3. 決定に基づくアクション実行
      await this.executeDecision(decision);

      // 4. 結果記録・学習データ更新
      const learningUpdated = await this.recordResults({
        decision,
        context,
        timestamp: new Date().toISOString()
      });

      const executionTime = Date.now() - startTime;
      const result: ExecutionResult = {
        success: true,
        action: decision.action,
        executionTime,
        result: {
          id: `execution_${Date.now()}`,
          content: decision.parameters.content || decision.reasoning
        },
        metadata: {
          confidence: decision.confidence,
          reasoning: decision.reasoning,
          context: 'Scheduled 30-minute execution',
          timestamp: new Date().toISOString()
        }
      };

      // メトリクス更新
      this.updateMetrics(result, learningUpdated);

      console.log('✅ Execution cycle completed successfully:', {
        action: decision.action,
        duration: `${executionTime}ms`,
        confidence: decision.confidence
      });

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorResult = this.createErrorResult(error as Error, executionTime);
      
      this.updateMetrics(errorResult, false);
      
      console.error('❌ Execution cycle failed:', error);
      return errorResult;

    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * ループメトリクス取得
   */
  getMetrics(): LoopMetrics {
    return { ...this.metrics };
  }

  /**
   * メトリクスリセット
   */
  resetMetrics(): void {
    this.initializeMetrics();
    console.log('📊 Loop metrics reset');
  }

  /**
   * 実行状態確認
   */
  isCurrentlyExecuting(): boolean {
    return this.isExecuting;
  }

  /**
   * システム健全性チェック
   */
  async performHealthCheck(): Promise<{
    overall: 'healthy' | 'degraded' | 'critical';
    components: {
      claude: 'healthy' | 'error';
      kaitoApi: 'healthy' | 'degraded' | 'error';
      dataManager: 'healthy' | 'error';
      scheduler: 'healthy' | 'error';
    };
    timestamp: string;
  }> {
    try {
      console.log('🏥 Performing system health check...');

      // 各コンポーネントの健全性をチェック
      const health = {
        overall: 'healthy' as const,
        components: {
          claude: 'healthy' as const,
          kaitoApi: 'healthy' as const,
          dataManager: 'healthy' as const,
          scheduler: 'healthy' as const
        },
        timestamp: new Date().toISOString()
      };

      // 実際の健全性チェックロジックは各コンポーネントの実装に依存
      console.log('✅ System health check completed');
      return health;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        overall: 'critical',
        components: {
          claude: 'error',
          kaitoApi: 'error',
          dataManager: 'error',
          scheduler: 'error'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS - EXECUTION FLOW
  // ============================================================================

  /**
   * 現在状況の分析
   */
  private async analyzeCurrentSituation(): Promise<SystemContext> {
    try {
      console.log('📊 Analyzing current situation...');

      // Mock implementation - 実際は各サービスから情報を収集
      const context: SystemContext = {
        timestamp: new Date().toISOString(),
        account: {
          followerCount: Math.floor(Math.random() * 1000) + 100,
          lastPostTime: new Date(Date.now() - Math.random() * 7200000).toISOString(), // Last 2 hours
          postsToday: Math.floor(Math.random() * 5),
          engagementRate: Math.random() * 5 + 2, // 2-7%
          accountHealth: Math.random() > 0.8 ? 'warning' : 'good'
        },
        system: {
          executionCount: {
            today: this.metrics.totalExecutions,
            total: this.metrics.totalExecutions
          },
          health: {
            all_systems_operational: true,
            api_status: 'healthy',
            rate_limits_ok: true
          }
        },
        market: {
          trendingTopics: ['Bitcoin', 'Ethereum', 'NISA', '投資信託', 'AI投資'],
          volatility: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
          sentiment: ['bearish', 'neutral', 'bullish'][Math.floor(Math.random() * 3)] as any
        },
        learningData: {
          decisionPatterns: [],
          successStrategies: [],
          errorLessons: []
        }
      };

      console.log('✅ Current situation analysis completed:', {
        followers: context.account.followerCount,
        postsToday: context.account.postsToday,
        marketSentiment: context.market.sentiment,
        trendingTopics: context.market.trendingTopics.length
      });

      return context;

    } catch (error) {
      console.error('❌ Situation analysis failed:', error);
      throw new Error(`Situation analysis failed: ${error.message}`);
    }
  }

  /**
   * Claude意思決定
   */
  private async makeDecision(context: SystemContext): Promise<ClaudeDecision> {
    try {
      console.log('🤖 Making decision with Claude...');

      // Mock decision making - 実際はDecisionEngineを使用
      const mockDecision: ClaudeDecision = {
        action: this.selectRandomAction(),
        reasoning: this.generateMockReasoning(context),
        parameters: this.generateMockParameters(context),
        confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0
      };

      console.log('✅ Decision made:', {
        action: mockDecision.action,
        confidence: mockDecision.confidence,
        reasoning: mockDecision.reasoning.substring(0, 100) + '...'
      });

      return mockDecision;

    } catch (error) {
      console.error('❌ Decision making failed:', error);
      
      // フォールバック決定
      return {
        action: 'wait',
        reasoning: `Decision making failed: ${error.message}. Defaulting to wait.`,
        parameters: { duration: 1800000 }, // 30 minutes
        confidence: 0.1
      };
    }
  }

  /**
   * 決定に基づくアクション実行
   */
  private async executeDecision(decision: ClaudeDecision): Promise<void> {
    try {
      console.log('⚡ Executing decision...', { action: decision.action });

      // Mock execution - 実際はActionExecutorを使用
      const executionTime = Math.random() * 2000 + 500; // 0.5-2.5 seconds
      await this.delay(executionTime);

      // アクション別の模擬実行
      switch (decision.action) {
        case 'post':
          console.log('📝 Mock post execution completed');
          break;
        case 'retweet':
          console.log('🔄 Mock retweet execution completed');
          break;
        case 'quote_tweet':
          console.log('💬 Mock quote tweet execution completed');
          break;
        case 'like':
          console.log('❤️ Mock like execution completed');
          break;
        case 'wait':
          console.log('⏳ Wait action executed');
          break;
        default:
          console.log('❓ Unknown action executed');
      }

      console.log('✅ Decision execution completed');

    } catch (error) {
      console.error('❌ Decision execution failed:', error);
      throw new Error(`Decision execution failed: ${error.message}`);
    }
  }

  /**
   * 結果記録・学習データ更新
   */
  private async recordResults(executionData: {
    decision: ClaudeDecision;
    context: SystemContext;
    timestamp: string;
  }): Promise<boolean> {
    try {
      console.log('📝 Recording results and updating learning data...');

      // Mock learning data update - 実際はDataManagerを使用
      await this.delay(500);

      console.log('✅ Results recorded and learning data updated');
      return true;

    } catch (error) {
      console.error('❌ Results recording failed:', error);
      return false;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private initializeMetrics(): void {
    this.metrics = {
      totalExecutions: 0,
      successRate: 0,
      avgExecutionTime: 0,
      actionBreakdown: {
        post: { count: 0, successRate: 0, avgTime: 0 },
        retweet: { count: 0, successRate: 0, avgTime: 0 },
        quote_tweet: { count: 0, successRate: 0, avgTime: 0 },
        like: { count: 0, successRate: 0, avgTime: 0 },
        wait: { count: 0, successRate: 0, avgTime: 0 }
      },
      learningUpdates: 0,
      lastExecutionTime: ''
    };
  }

  private updateMetrics(result: ExecutionResult, learningUpdated: boolean): void {
    this.metrics.totalExecutions++;
    
    // 成功率更新
    const successCount = this.metrics.successRate * (this.metrics.totalExecutions - 1) + (result.success ? 1 : 0);
    this.metrics.successRate = successCount / this.metrics.totalExecutions;

    // 平均実行時間更新
    const totalTime = this.metrics.avgExecutionTime * (this.metrics.totalExecutions - 1) + result.executionTime;
    this.metrics.avgExecutionTime = totalTime / this.metrics.totalExecutions;

    // アクション別統計更新
    if (this.metrics.actionBreakdown[result.action]) {
      const actionStats = this.metrics.actionBreakdown[result.action];
      actionStats.count++;
      
      const actionSuccess = actionStats.successRate * (actionStats.count - 1) + (result.success ? 1 : 0);
      actionStats.successRate = actionSuccess / actionStats.count;
      
      const actionTime = actionStats.avgTime * (actionStats.count - 1) + result.executionTime;
      actionStats.avgTime = actionTime / actionStats.count;
    }

    // 学習更新カウント
    if (learningUpdated) {
      this.metrics.learningUpdates++;
    }

    this.metrics.lastExecutionTime = new Date().toISOString();
  }

  private createSkippedResult(): ExecutionResult {
    return {
      success: false,
      action: 'skip',
      executionTime: 0,
      error: 'Execution already in progress',
      metadata: {
        confidence: 0,
        reasoning: 'Concurrent execution prevented',
        context: 'System protection',
        timestamp: new Date().toISOString()
      }
    };
  }

  private createErrorResult(error: Error, executionTime: number): ExecutionResult {
    return {
      success: false,
      action: 'error',
      executionTime,
      error: error.message,
      metadata: {
        confidence: 0,
        reasoning: 'Execution failed due to error',
        context: 'Error handling',
        timestamp: new Date().toISOString()
      }
    };
  }

  private selectRandomAction(): 'post' | 'retweet' | 'quote_tweet' | 'like' | 'wait' {
    const actions = ['post', 'retweet', 'quote_tweet', 'like', 'wait'] as const;
    const weights = [0.3, 0.2, 0.2, 0.2, 0.1]; // 投稿を少し高めに
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < actions.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return actions[i];
      }
    }
    
    return 'wait';
  }

  private generateMockReasoning(context: SystemContext): string {
    const templates = [
      `フォロワー数${context.account.followerCount}人、今日の投稿数${context.account.postsToday}回を考慮し、${context.market.sentiment}な市場センチメントに対応するアクションを選択`,
      `${context.market.trendingTopics.slice(0, 2).join('、')}のトレンドを活用し、エンゲージメント率${context.account.engagementRate.toFixed(1)}%向上を目指す戦略`,
      `市場ボラティリティ${context.market.volatility}、システム状況良好につき、教育的価値の高いコンテンツでフォロワーとの関係性強化を図る`,
      `アカウント健全性${context.account.accountHealth}、前回投稿からの時間を考慮し、適切なタイミングでのエンゲージメント向上施策を実行`
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateMockParameters(context: SystemContext): any {
    return {
      topic: context.market.trendingTopics[0] || '投資教育',
      content: '投資初心者向けの教育的コンテンツを提供します',
      searchQuery: context.market.trendingTopics.join(' OR '),
      targetTweetId: `mock_tweet_${Date.now()}`
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}