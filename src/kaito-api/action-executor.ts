/**
 * アクション実行統合クラス
 * REQUIREMENTS.md準拠版 - 統合アクション実行システム
 */

import { KaitoTwitterAPIClient, PostResult, RetweetResult, QuoteTweetResult, LikeResult } from './client';
import { ClaudeDecision } from '../claude/decision-engine';

// 7エンドポイントカテゴリ統合対応
export interface UserEndpoints {
  getProfile: (userId: string) => Promise<any>;
  updateProfile: (data: any) => Promise<any>;
  follow: (userId: string) => Promise<any>;
  unfollow: (userId: string) => Promise<any>;
  getFollowers: (userId: string) => Promise<any>;
  getFollowing: (userId: string) => Promise<any>;
}

export interface TweetEndpoints {
  getTweet: (tweetId: string) => Promise<any>;
  getUserTweets: (userId: string) => Promise<any>;
  getTimeline: () => Promise<any>;
  searchTweets: (query: string) => Promise<any>;
}

export interface CommunityEndpoints {
  getCommunities: () => Promise<any>;
  joinCommunity: (communityId: string) => Promise<any>;
  leaveCommunity: (communityId: string) => Promise<any>;
  getCommunityTweets: (communityId: string) => Promise<any>;
}

export interface ListEndpoints {
  getLists: () => Promise<any>;
  createList: (data: any) => Promise<any>;
  updateList: (listId: string, data: any) => Promise<any>;
  deleteList: (listId: string) => Promise<any>;
  addToList: (listId: string, userId: string) => Promise<any>;
  removeFromList: (listId: string, userId: string) => Promise<any>;
}

export interface TrendEndpoints {
  getTrends: (location?: string) => Promise<any>;
  getHashtagTrends: () => Promise<any>;
  getTopicTrends: (category?: string) => Promise<any>;
}

export interface LoginEndpoints {
  authenticate: (credentials: any) => Promise<any>;
  refreshToken: () => Promise<any>;
  logout: () => Promise<any>;
  validateSession: () => Promise<any>;
}

export interface TweetActionEndpoints {
  post: (content: string, options?: any) => Promise<PostResult>;
  retweet: (tweetId: string) => Promise<RetweetResult>;
  quoteTweet: (tweetId: string, comment: string) => Promise<QuoteTweetResult>;
  like: (tweetId: string) => Promise<LikeResult>;
  unlike: (tweetId: string) => Promise<any>;
  reply: (tweetId: string, content: string) => Promise<any>;
  deleteTweet: (tweetId: string) => Promise<any>;
}

export interface ExecutionResult {
  success: boolean;
  action: string;
  result?: {
    id: string;
    url?: string;
    timestamp: string;
  };
  error?: string;
  metadata: {
    executionTime: number;
    retryCount: number;
    rateLimitHit: boolean;
    timestamp: string;
  };
}

export interface ActionExecutorConfig {
  endpoints: {
    user: UserEndpoints;
    tweet: TweetEndpoints;
    communities: CommunityEndpoints;
    list: ListEndpoints;
    trend: TrendEndpoints;
    login: LoginEndpoints;
    tweetAction: TweetActionEndpoints;
  };
  reliability: {
    enableRollback: boolean;
    rollbackTimeoutMs: number;
    healthCheckInterval: number;
  };
}

export interface ActionContext {
  decision: ClaudeDecision;
  environment: {
    isDryRun: boolean;
    rateLimitCheck: boolean;
    validationLevel: 'strict' | 'normal' | 'permissive';
  };
  retry: {
    maxRetries: number;
    baseDelay: number;
    backoffMultiplier: number;
  };
  rollback?: {
    enabled: boolean;
    actions: RollbackAction[];
  };
}

export interface RollbackAction {
  type: 'delete_tweet' | 'unfollow_user' | 'unlike_tweet' | 'leave_community';
  targetId: string;
  timestamp: string;
  originalAction: string;
}

export interface ExecutionMetrics {
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  actionBreakdown: {
    post: { count: number; successRate: number };
    retweet: { count: number; successRate: number };
    quote_tweet: { count: number; successRate: number };
    like: { count: number; successRate: number };
    wait: { count: number; successRate: number };
    follow: { count: number; successRate: number };
    unfollow: { count: number; successRate: number };
    join_community: { count: number; successRate: number };
    create_list: { count: number; successRate: number };
    get_trends: { count: number; successRate: number };
  };
  errorPatterns: { [error: string]: number };
  lastUpdated: string;
}

/**
 * アクション実行統合クラス
 * Claude決定に基づくTwitterアクションの統合実行システム
 */
export class ActionExecutor {
  private client: KaitoTwitterAPIClient;
  private metrics!: ExecutionMetrics;
  private config: ActionExecutorConfig;
  private rollbackQueue: RollbackAction[] = [];
  private readonly MAX_RETRIES = 3;
  private readonly BASE_RETRY_DELAY = 1000;
  private readonly BACKOFF_MULTIPLIER = 2;

  constructor(client?: KaitoTwitterAPIClient, config?: Partial<ActionExecutorConfig>) {
    this.client = client || new KaitoTwitterAPIClient();
    this.config = this.buildDefaultConfig(config);
    this.initializeMetrics();
    console.log('✅ ActionExecutor initialized - REQUIREMENTS.md準拠版 (7エンドポイント対応)');
  }

  /**
   * Claude決定に基づくアクション実行
   */
  async executeAction(decision: ClaudeDecision, context?: Partial<ActionContext>): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log('🚀 アクション実行開始:', { 
        action: decision.action, 
        confidence: decision.confidence 
      });

      // 実行コンテキスト準備
      const executionContext = this.prepareExecutionContext(decision, context);

      // バリデーション
      const validationResult = this.validateDecision(decision, executionContext);
      if (!validationResult.valid) {
        return this.createFailureResult(decision.action, validationResult.error, startTime);
      }

      // ドライランチェック
      if (executionContext.environment.isDryRun) {
        return this.executeDryRun(decision, startTime);
      }

      // アクション別実行
      let result: ExecutionResult;
      
      switch (decision.action) {
        case 'post':
          result = await this.handlePost(decision.parameters, executionContext, startTime);
          break;
        case 'retweet':
          result = await this.handleRetweet(decision.parameters, executionContext, startTime);
          break;
        case 'quote_tweet':
          result = await this.handleQuoteTweet(decision.parameters, executionContext, startTime);
          break;
        case 'like':
          result = await this.handleLike(decision.parameters, executionContext, startTime);
          break;
        case 'wait':
          result = await this.handleWait(decision.parameters, executionContext, startTime);
          break;
        case 'follow':
          result = await this.handleFollow(decision.parameters, executionContext, startTime);
          break;
        case 'unfollow':
          result = await this.handleUnfollow(decision.parameters, executionContext, startTime);
          break;
        case 'join_community':
          result = await this.handleJoinCommunity(decision.parameters, executionContext, startTime);
          break;
        case 'create_list':
          result = await this.handleCreateList(decision.parameters, executionContext, startTime);
          break;
        case 'get_trends':
          result = await this.handleGetTrends(decision.parameters, executionContext, startTime);
          break;
        default:
          result = this.createFailureResult(
            decision.action, 
            `Unsupported action: ${decision.action}`, 
            startTime
          );
      }

      // メトリクス更新
      this.updateMetrics(decision.action, result);

      console.log('✅ アクション実行完了:', { 
        action: decision.action, 
        success: result.success,
        executionTime: result.metadata.executionTime
      });

      return result;

    } catch (error) {
      console.error('❌ アクション実行エラー:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const result = this.createFailureResult(decision.action, errorMessage, startTime);
      this.updateMetrics(decision.action, result);
      return result;
    }
  }

  /**
   * バッチアクション実行
   */
  async executeBatch(decisions: ClaudeDecision[], options?: {
    maxConcurrency?: number;
    stopOnFirstError?: boolean;
    delayBetweenActions?: number;
  }): Promise<ExecutionResult[]> {
    const { 
      maxConcurrency = 3, 
      stopOnFirstError = false, 
      delayBetweenActions = 1000 
    } = options || {};

    console.log('📦 バッチアクション実行開始:', { 
      batchSize: decisions.length, 
      maxConcurrency 
    });

    const results: ExecutionResult[] = [];
    const batches = this.createBatches(decisions, maxConcurrency);

    for (const batch of batches) {
      // 並行実行
      const batchPromises = batch.map(decision => this.executeAction(decision));
      const batchResults = await Promise.allSettled(batchPromises);

      // 結果処理
      for (const [index, settledResult] of batchResults.entries()) {
        if (settledResult.status === 'fulfilled') {
          results.push(settledResult.value);
        } else {
          const failedDecision = batch[index];
          const errorMessage = settledResult.reason instanceof Error 
            ? settledResult.reason.message 
            : String(settledResult.reason);
          results.push(this.createFailureResult(
            failedDecision.action,
            errorMessage,
            Date.now()
          ));
        }

        // エラー時の早期終了
        if (stopOnFirstError && !results[results.length - 1].success) {
          console.warn('⚠️ エラーによりバッチ実行を中断');
          return results;
        }
      }

      // バッチ間の遅延
      if (delayBetweenActions > 0 && batches.length > 1) {
        await this.delay(delayBetweenActions);
      }
    }

    console.log('✅ バッチアクション実行完了:', { 
      total: results.length,
      successful: results.filter(r => r.success).length
    });

    return results;
  }

  /**
   * 実行メトリクス取得
   */
  getExecutionMetrics(): ExecutionMetrics {
    return { ...this.metrics };
  }

  /**
   * メトリクスリセット
   */
  resetMetrics(): void {
    this.initializeMetrics();
    console.log('📊 実行メトリクスをリセットしました');
  }

  /**
   * ロールバック機能
   */
  async rollbackLastActions(count: number = 1): Promise<boolean> {
    try {
      if (!this.config.reliability.enableRollback) {
        console.warn('⚠️ ロールバック機能が無効です');
        return false;
      }

      console.log(`🔄 最新${count}個のアクションをロールバック中...`);
      
      const actionsToRollback = this.rollbackQueue.slice(-count).reverse();
      let rollbackSuccess = true;

      for (const rollbackAction of actionsToRollback) {
        try {
          await this.executeRollbackAction(rollbackAction);
          console.log(`✅ ロールバック完了: ${rollbackAction.type} (${rollbackAction.targetId})`);
        } catch (error) {
          console.error(`❌ ロールバック失敗: ${rollbackAction.type}`, error);
          rollbackSuccess = false;
        }
      }

      // ロールバック完了後、キューから削除
      this.rollbackQueue = this.rollbackQueue.slice(0, -count);
      
      console.log(`${rollbackSuccess ? '✅' : '⚠️'} ロールバック処理完了`);
      return rollbackSuccess;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ ロールバック処理でエラー:', errorMessage);
      return false;
    }
  }

  /**
   * エンドポイント統合機能
   */
  getEndpointCapabilities(): ActionExecutorConfig['endpoints'] {
    return { ...this.config.endpoints };
  }

  // ============================================================================
  // PRIVATE ACTION HANDLERS - 7エンドポイント統合対応
  // ============================================================================

  private async handlePost(params: any, context: ActionContext, startTime: number): Promise<ExecutionResult> {
    try {
      if (!params.content && !params.topic) {
        throw new Error('Post requires either content or topic parameter');
      }

      const content = params.content || `${params.topic}について投稿します`;
      
      const postResult = await this.executeWithRetry(
        () => this.client.post(content),
        context.retry
      );

      return this.createSuccessResult('post', postResult, startTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.createFailureResult('post', errorMessage, startTime);
    }
  }

  private async handleRetweet(params: any, context: ActionContext, startTime: number): Promise<ExecutionResult> {
    try {
      if (!params.targetTweetId) {
        throw new Error('Retweet requires targetTweetId parameter');
      }

      const retweetResult = await this.executeWithRetry(
        () => this.client.retweet(params.targetTweetId),
        context.retry
      );

      return this.createSuccessResult('retweet', retweetResult, startTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.createFailureResult('retweet', errorMessage, startTime);
    }
  }

  private async handleQuoteTweet(params: any, context: ActionContext, startTime: number): Promise<ExecutionResult> {
    try {
      if (!params.targetTweetId || !params.content) {
        throw new Error('Quote tweet requires targetTweetId and content parameters');
      }

      const quoteResult = await this.executeWithRetry(
        () => this.client.quoteTweet(params.targetTweetId, params.content),
        context.retry
      );

      return this.createSuccessResult('quote_tweet', quoteResult, startTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.createFailureResult('quote_tweet', errorMessage, startTime);
    }
  }

  private async handleLike(params: any, context: ActionContext, startTime: number): Promise<ExecutionResult> {
    try {
      if (!params.targetTweetId) {
        throw new Error('Like requires targetTweetId parameter');
      }

      const likeResult = await this.executeWithRetry(
        () => this.client.like(params.targetTweetId),
        context.retry
      );

      return this.createSuccessResult('like', likeResult, startTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.createFailureResult('like', errorMessage, startTime);
    }
  }

  private async handleWait(params: any, context: ActionContext, startTime: number): Promise<ExecutionResult> {
    try {
      const duration = params.duration || 30000; // Default 30 seconds
      
      console.log(`⏱️ 待機中: ${duration}ms`);
      await this.delay(duration);

      return {
        success: true,
        action: 'wait',
        result: {
          id: `wait_${Date.now()}`,
          timestamp: new Date().toISOString()
        },
        metadata: {
          executionTime: Date.now() - startTime,
          retryCount: 0,
          rateLimitHit: false,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.createFailureResult('wait', errorMessage, startTime);
    }
  }

  private async handleFollow(params: any, context: ActionContext, startTime: number): Promise<ExecutionResult> {
    try {
      if (!params.userId) {
        throw new Error('Follow requires userId parameter');
      }

      console.log(`👥 フォロー実行中: ${params.userId}`);
      
      // Mock follow implementation
      await this.delay(800);
      const followResult = {
        id: `follow_${Date.now()}`,
        userId: params.userId,
        timestamp: new Date().toISOString(),
        success: true
      };

      // ロールバック情報を記録
      this.addToRollbackQueue({
        type: 'unfollow_user',
        targetId: params.userId,
        timestamp: new Date().toISOString(),
        originalAction: 'follow'
      });

      return this.createSuccessResult('follow', followResult, startTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.createFailureResult('follow', errorMessage, startTime);
    }
  }

  private async handleUnfollow(params: any, context: ActionContext, startTime: number): Promise<ExecutionResult> {
    try {
      if (!params.userId) {
        throw new Error('Unfollow requires userId parameter');
      }

      console.log(`👥 アンフォロー実行中: ${params.userId}`);
      
      // Mock unfollow implementation
      await this.delay(600);
      const unfollowResult = {
        id: `unfollow_${Date.now()}`,
        userId: params.userId,
        timestamp: new Date().toISOString(),
        success: true
      };

      return this.createSuccessResult('unfollow', unfollowResult, startTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.createFailureResult('unfollow', errorMessage, startTime);
    }
  }

  private async handleJoinCommunity(params: any, context: ActionContext, startTime: number): Promise<ExecutionResult> {
    try {
      if (!params.communityId) {
        throw new Error('Join community requires communityId parameter');
      }

      console.log(`🏘️ コミュニティ参加中: ${params.communityId}`);
      
      // Mock join community implementation
      await this.delay(1000);
      const joinResult = {
        id: `join_${Date.now()}`,
        communityId: params.communityId,
        timestamp: new Date().toISOString(),
        success: true
      };

      // ロールバック情報を記録
      this.addToRollbackQueue({
        type: 'leave_community',
        targetId: params.communityId,
        timestamp: new Date().toISOString(),
        originalAction: 'join_community'
      });

      return this.createSuccessResult('join_community', joinResult, startTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.createFailureResult('join_community', errorMessage, startTime);
    }
  }

  private async handleCreateList(params: any, context: ActionContext, startTime: number): Promise<ExecutionResult> {
    try {
      if (!params.name) {
        throw new Error('Create list requires name parameter');
      }

      console.log(`📝 リスト作成中: ${params.name}`);
      
      // Mock create list implementation
      await this.delay(900);
      const listResult = {
        id: `list_${Date.now()}`,
        name: params.name,
        description: params.description || '',
        timestamp: new Date().toISOString(),
        success: true
      };

      return this.createSuccessResult('create_list', listResult, startTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.createFailureResult('create_list', errorMessage, startTime);
    }
  }

  private async handleGetTrends(params: any, context: ActionContext, startTime: number): Promise<ExecutionResult> {
    try {
      console.log(`📈 トレンド取得中...`);
      
      // Mock get trends implementation
      await this.delay(500);
      const trendsResult = {
        id: `trends_${Date.now()}`,
        location: params.location || 'JP',
        trends: [
          { topic: 'Bitcoin', volume: 15000, trend: 'rising' },
          { topic: '投資', volume: 8500, trend: 'stable' },
          { topic: 'NISA', volume: 12000, trend: 'rising' }
        ],
        timestamp: new Date().toISOString(),
        success: true
      };

      return this.createSuccessResult('get_trends', trendsResult, startTime);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.createFailureResult('get_trends', errorMessage, startTime);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private prepareExecutionContext(decision: ClaudeDecision, context?: Partial<ActionContext>): ActionContext {
    return {
      decision,
      environment: {
        isDryRun: context?.environment?.isDryRun || false,
        rateLimitCheck: context?.environment?.rateLimitCheck !== false,
        validationLevel: context?.environment?.validationLevel || 'normal'
      },
      retry: {
        maxRetries: context?.retry?.maxRetries || this.MAX_RETRIES,
        baseDelay: context?.retry?.baseDelay || this.BASE_RETRY_DELAY,
        backoffMultiplier: context?.retry?.backoffMultiplier || this.BACKOFF_MULTIPLIER
      }
    };
  }

  private validateDecision(decision: ClaudeDecision, context: ActionContext): { valid: boolean; error?: string } {
    // 基本バリデーション
    if (!decision.action || !decision.reasoning) {
      return { valid: false, error: 'Invalid decision: missing action or reasoning' };
    }

    // 信頼度チェック
    if (decision.confidence < 0.1) {
      return { valid: false, error: 'Decision confidence too low' };
    }

    // 厳格モードでの追加チェック
    if (context.environment.validationLevel === 'strict') {
      if (decision.action === 'post' && decision.confidence < 0.7) {
        return { valid: false, error: 'Post action requires high confidence in strict mode' };
      }
    }

    // アクション固有のバリデーション
    switch (decision.action) {
      case 'post':
        if (!decision.parameters?.content && !decision.parameters?.topic) {
          return { valid: false, error: 'Post action requires content or topic' };
        }
        break;
      case 'retweet':
      case 'like':
        if (!decision.parameters?.targetTweetId) {
          return { valid: false, error: `${decision.action} action requires targetTweetId` };
        }
        break;
      case 'quote_tweet':
        if (!decision.parameters?.targetTweetId || !decision.parameters?.content) {
          return { valid: false, error: 'Quote tweet requires targetTweetId and content' };
        }
        break;
    }

    return { valid: true };
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryConfig: { maxRetries: number; baseDelay: number; backoffMultiplier: number }
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === retryConfig.maxRetries) {
          break; // Final attempt failed
        }

        // レート制限エラーの場合は長めに待機
        const errorMessage = lastError.message.toLowerCase();
        const isRateLimit = errorMessage.includes('rate limit');
        const delay = isRateLimit 
          ? 60000 // 1 minute for rate limit
          : retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt);

        console.log(`⚠️ リトライ ${attempt + 1}/${retryConfig.maxRetries}: ${delay}ms後に再実行`);
        await this.delay(delay);
      }
    }

    throw lastError ?? new Error('Unknown error occurred during retry');
  }

  private executeDryRun(decision: ClaudeDecision, startTime: number): ExecutionResult {
    console.log('🧪 ドライラン実行:', { action: decision.action });
    
    return {
      success: true,
      action: decision.action,
      result: {
        id: `dryrun_${decision.action}_${Date.now()}`,
        url: `https://dryrun.example.com/${decision.action}`,
        timestamp: new Date().toISOString()
      },
      metadata: {
        executionTime: Date.now() - startTime,
        retryCount: 0,
        rateLimitHit: false,
        timestamp: new Date().toISOString()
      }
    };
  }

  private createSuccessResult(action: string, apiResult: any, startTime: number): ExecutionResult {
    return {
      success: true,
      action,
      result: {
        id: apiResult.id,
        url: apiResult.url,
        timestamp: apiResult.timestamp
      },
      metadata: {
        executionTime: Date.now() - startTime,
        retryCount: 0,
        rateLimitHit: false,
        timestamp: new Date().toISOString()
      }
    };
  }

  private createFailureResult(action: string, error: string, startTime: number): ExecutionResult {
    return {
      success: false,
      action,
      error,
      metadata: {
        executionTime: Date.now() - startTime,
        retryCount: 0,
        rateLimitHit: error.toLowerCase().includes('rate limit'),
        timestamp: new Date().toISOString()
      }
    };
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalExecutions: 0,
      successRate: 0,
      avgExecutionTime: 0,
      actionBreakdown: {
        post: { count: 0, successRate: 0 },
        retweet: { count: 0, successRate: 0 },
        quote_tweet: { count: 0, successRate: 0 },
        like: { count: 0, successRate: 0 },
        wait: { count: 0, successRate: 0 },
        follow: { count: 0, successRate: 0 },
        unfollow: { count: 0, successRate: 0 },
        join_community: { count: 0, successRate: 0 },
        create_list: { count: 0, successRate: 0 },
        get_trends: { count: 0, successRate: 0 }
      },
      errorPatterns: {},
      lastUpdated: new Date().toISOString()
    };
  }

  private updateMetrics(action: string, result: ExecutionResult): void {
    this.metrics.totalExecutions++;
    
    // アクション別統計更新
    if (this.metrics.actionBreakdown[action as keyof typeof this.metrics.actionBreakdown]) {
      const actionStats = this.metrics.actionBreakdown[action as keyof typeof this.metrics.actionBreakdown];
      actionStats.count++;
      const successCount = result.success ? 1 : 0;
      actionStats.successRate = (actionStats.successRate * (actionStats.count - 1) + successCount) / actionStats.count;
    }

    // エラーパターン記録
    if (!result.success && result.error) {
      const errorKey = result.error.substring(0, 50); // First 50 chars
      this.metrics.errorPatterns[errorKey] = (this.metrics.errorPatterns[errorKey] || 0) + 1;
    }

    // 全体統計更新
    const totalSuccess = Object.values(this.metrics.actionBreakdown)
      .reduce((sum, stats) => sum + stats.count * stats.successRate, 0);
    this.metrics.successRate = totalSuccess / this.metrics.totalExecutions;

    // 実行時間更新
    const totalTime = this.metrics.avgExecutionTime * (this.metrics.totalExecutions - 1) + result.metadata.executionTime;
    this.metrics.avgExecutionTime = totalTime / this.metrics.totalExecutions;

    this.metrics.lastUpdated = new Date().toISOString();
  }

  private buildDefaultConfig(config?: Partial<ActionExecutorConfig>): ActionExecutorConfig {
    return {
      endpoints: {
        user: {
          getProfile: async (userId: string) => this.mockEndpoint('getProfile', userId),
          updateProfile: async (data: any) => this.mockEndpoint('updateProfile', data),
          follow: async (userId: string) => this.mockEndpoint('follow', userId),
          unfollow: async (userId: string) => this.mockEndpoint('unfollow', userId),
          getFollowers: async (userId: string) => this.mockEndpoint('getFollowers', userId),
          getFollowing: async (userId: string) => this.mockEndpoint('getFollowing', userId)
        },
        tweet: {
          getTweet: async (tweetId: string) => this.mockEndpoint('getTweet', tweetId),
          getUserTweets: async (userId: string) => this.mockEndpoint('getUserTweets', userId),
          getTimeline: async () => this.mockEndpoint('getTimeline'),
          searchTweets: async (query: string) => this.mockEndpoint('searchTweets', query)
        },
        communities: {
          getCommunities: async () => this.mockEndpoint('getCommunities'),
          joinCommunity: async (communityId: string) => this.mockEndpoint('joinCommunity', communityId),
          leaveCommunity: async (communityId: string) => this.mockEndpoint('leaveCommunity', communityId),
          getCommunityTweets: async (communityId: string) => this.mockEndpoint('getCommunityTweets', communityId)
        },
        list: {
          getLists: async () => this.mockEndpoint('getLists'),
          createList: async (data: any) => this.mockEndpoint('createList', data),
          updateList: async (listId: string, data: any) => this.mockEndpoint('updateList', { listId, data }),
          deleteList: async (listId: string) => this.mockEndpoint('deleteList', listId),
          addToList: async (listId: string, userId: string) => this.mockEndpoint('addToList', { listId, userId }),
          removeFromList: async (listId: string, userId: string) => this.mockEndpoint('removeFromList', { listId, userId })
        },
        trend: {
          getTrends: async (location?: string) => this.mockEndpoint('getTrends', location),
          getHashtagTrends: async () => this.mockEndpoint('getHashtagTrends'),
          getTopicTrends: async (category?: string) => this.mockEndpoint('getTopicTrends', category)
        },
        login: {
          authenticate: async (credentials: any) => this.mockEndpoint('authenticate', credentials),
          refreshToken: async () => this.mockEndpoint('refreshToken'),
          logout: async () => this.mockEndpoint('logout'),
          validateSession: async () => this.mockEndpoint('validateSession')
        },
        tweetAction: {
          post: async (content: string, options?: any) => this.client.post(content, options),
          retweet: async (tweetId: string) => this.client.retweet(tweetId),
          quoteTweet: async (tweetId: string, comment: string) => this.client.quoteTweet(tweetId, comment),
          like: async (tweetId: string) => this.client.like(tweetId),
          unlike: async (tweetId: string) => this.mockEndpoint('unlike', tweetId),
          reply: async (tweetId: string, content: string) => this.mockEndpoint('reply', { tweetId, content }),
          deleteTweet: async (tweetId: string) => this.mockEndpoint('deleteTweet', tweetId)
        }
      },
      reliability: {
        enableRollback: config?.reliability?.enableRollback !== false,
        rollbackTimeoutMs: config?.reliability?.rollbackTimeoutMs || 300000, // 5 minutes
        healthCheckInterval: config?.reliability?.healthCheckInterval || 60000 // 1 minute
      },
      ...config
    };
  }

  private async mockEndpoint(operation: string, params?: any): Promise<any> {
    await this.delay(Math.random() * 500 + 200); // 0.2-0.7s
    console.log(`🔧 Mock ${operation} executed:`, params);
    return {
      id: `${operation}_${Date.now()}`,
      operation,
      params,
      timestamp: new Date().toISOString(),
      success: true
    };
  }

  private addToRollbackQueue(action: RollbackAction): void {
    if (this.config.reliability.enableRollback) {
      this.rollbackQueue.push(action);
      
      // キューサイズ制限 (最新100件まで保持)
      if (this.rollbackQueue.length > 100) {
        this.rollbackQueue = this.rollbackQueue.slice(-100);
      }
      
      console.log(`📋 ロールバックキューに追加: ${action.type} (キューサイズ: ${this.rollbackQueue.length})`);
    }
  }

  private async executeRollbackAction(action: RollbackAction): Promise<void> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Rollback timeout')), this.config.reliability.rollbackTimeoutMs);
    });

    const rollbackPromise = (async () => {
      switch (action.type) {
        case 'delete_tweet':
          await this.config.endpoints.tweetAction.deleteTweet(action.targetId);
          break;
        case 'unfollow_user':
          await this.config.endpoints.user.unfollow(action.targetId);
          break;
        case 'unlike_tweet':
          await this.config.endpoints.tweetAction.unlike(action.targetId);
          break;
        case 'leave_community':
          await this.config.endpoints.communities.leaveCommunity(action.targetId);
          break;
        default:
          throw new Error(`Unsupported rollback action: ${action.type}`);
      }
    })();

    await Promise.race([rollbackPromise, timeoutPromise]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}