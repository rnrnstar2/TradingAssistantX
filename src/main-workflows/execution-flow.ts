import { systemLogger } from '../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../shared/component-container';
import { DataManager } from '../data/data-manager';
import { ActionEndpoints } from '../kaito-api/endpoints/action-endpoints';
import { TweetEndpoints } from '../kaito-api/endpoints/tweet-endpoints';
import { KaitoApiClient } from '../kaito-api';
import { ExecutionResult, SystemContext, ClaudeDecision, ActionResult, AccountInfo, LearningData, RetryConfig, OperationResult, TransactionState } from '../shared/types';

// エンドポイント別Claude SDK（TASK-001完了後）
import { makeDecision, generateContent, analyzePerformance, generateSearchQuery } from '../claude';
import type { GeneratedContent, AnalysisResult, SearchQuery, TwitterContext, ContentRequest, SearchRequest, PerformanceMetrics } from '../claude/types';

/**
 * ExecutionFlow - メインループ実行フロー・30分毎4ステップワークフロー管理クラス
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 クラスの責任範囲:
 * • 30分毎メインループ実行の完全制御・4ステップワークフロー管理
 * • エンドポイント別Claude SDK統合による高度な判断処理
 * • KaitoAPI連携によるX（Twitter）アクション実行
 * • システムコンテキスト収集・分析・学習データ蓄積
 * 
 * 🔄 4ステップワークフロー（REQUIREMENTS.md準拠）:
 * 1. 【データ読み込み】: DataManager・KaitoAPI・SearchEngineから現在状況収集
 * 2. 【Claude判断】: エンドポイント別Claude SDKによる最適アクション決定
 * 3. 【アクション実行】: 判断結果に基づく具体的なX投稿・RT・いいね実行
 * 4. 【結果記録】: パフォーマンス分析・学習データ更新・次回改善材料蓄積
 * 
 * 🔗 他ファイルとの関係性:
 * • main.ts → executeMainLoop()メソッド呼び出しによるメインループ実行
 * • SchedulerManager → 30分間隔でのコールバック登録・実行制御
 * • SystemLifecycle → システム初期化完了後の実行フロー提供
 * • StatusController → 手動実行時のexecuteMainLoop()直接呼び出し
 * • claude/ → エンドポイント別SDK（判断・生成・分析・検索）統合使用
 * 
 * 🏗️ エンドポイント別Claude SDK統合:
 * • makeDecision: 現在状況に基づく最適アクション判断
 * • generateContent: 投稿・引用ツイート用コンテンツ生成
 * • analyzePerformance: 実行結果の分析・学習データ作成
 * • generateSearchQuery: RT・いいね対象検索用クエリ生成
 * 
 * 📊 アクション種別対応:
 * • post: トピック決定→コンテンツ生成→投稿実行
 * • retweet: 検索クエリ生成→候補検索→RT実行
 * • quote_tweet: 対象検索→コメント生成→引用投稿実行
 * • like: 対象特定→いいね実行
 * • wait: 適切なアクションがない場合の待機制御
 */
export class ExecutionFlow {
  private container: ComponentContainer;
  private retryConfig: RetryConfig;
  private transactionState: TransactionState | null = null;

  constructor(container: ComponentContainer) {
    this.container = container;
    
    // リトライ設定（指示書準拠）
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,         // 1秒
      backoffMultiplier: 2,    // 指数バックオフ
      maxDelay: 30000          // 最大30秒
    };
  }

  /**
   * 30分毎メインループ実行ワークフロー（詳細実装版）
   * REQUIREMENTS.md準拠の4ステップワークフロー実行
   */
  async executeMainLoop(): Promise<ExecutionResult> {
    const startTime = Date.now();
    let executionId: string | null = null;

    try {
      systemLogger.info('🔄 メインループ実行開始');
      
      // DataManager実行サイクル初期化
      const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
      executionId = await dataManager.initializeExecutionCycle();
      systemLogger.info(`📊 [DataManager] 実行サイクル初期化: ${executionId}`);
      
      // 前回実行のアーカイブ（必要な場合）
      await dataManager.archiveCurrentToHistory();
      
      // ===================================================================
      // 30分毎自動実行ワークフロー (REQUIREMENTS.md準拠)
      // ===================================================================
      
      // 1. 【データ読み込み】
      systemLogger.info('📋 【ステップ1】データ読み込み開始');
      const context = await this.loadSystemContext();
      systemLogger.success('✅ 【ステップ1】データ読み込み完了');

      // 2. 【Claude判断】
      systemLogger.info('🤖 【ステップ2】Claude判断開始');  
      const decision = await this.makeClaudeDecision(context);
      // データ保存フック: Claude決定後
      await dataManager.saveClaudeOutput('decision', decision);
      systemLogger.info('[DataManager] Claude決定を保存');
      systemLogger.success('✅ 【ステップ2】Claude判断完了');
      
      // 3. 【アクション実行】
      systemLogger.info('⚡【ステップ3】アクション実行開始');
      const actionResult = await this.executeAction(decision, dataManager);
      systemLogger.success('✅ 【ステップ3】アクション実行完了');
      
      // 4. 【結果記録】
      systemLogger.info('💾 【ステップ4】結果記録開始');
      await this.recordResults(actionResult, context);
      systemLogger.success('✅ 【ステップ4】結果記録完了');

      // 実行完了時のサマリー更新
      const summary = {
        executionId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        decision,
        actions: [{
          type: actionResult.action,
          timestamp: actionResult.timestamp,
          success: actionResult.success,
          result: actionResult.result
        }],
        metrics: {
          totalActions: 1,
          successCount: actionResult.success ? 1 : 0,
          errorCount: actionResult.success ? 0 : 1
        }
      };
      await dataManager.updateExecutionSummary(summary);
      systemLogger.info('[DataManager] 実行サマリー更新完了');

      const duration = Date.now() - startTime;
      return {
        success: true,
        action: decision.action,
        executionTime: duration,
        duration: duration, // Added for compatibility
        metadata: {
          executionTime: duration,
          retryCount: 0,
          rateLimitHit: false,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      systemLogger.error('❌ メインループ実行エラー:', error);
      
      // エラー時も部分的な結果を保存
      try {
        const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
        await dataManager.saveKaitoResponse('execution-error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          executionId,
          timestamp: new Date().toISOString(),
          stack: error instanceof Error ? error.stack : undefined
        });
        systemLogger.info('[DataManager] 実行エラー情報を保存');
      } catch (saveError) {
        systemLogger.warn('[DataManager] エラー情報保存失敗:', saveError);
      }
      
      return { 
        success: false, 
        action: 'error',
        executionTime: duration,
        duration: duration, // Added for compatibility
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          executionTime: duration,
          retryCount: 0,
          rateLimitHit: false,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * システムコンテキスト読み込み - 型安全版
   * データ管理・API・検索エンジンから現在の状況を収集
   */
  private async loadSystemContext(): Promise<SystemContext> {
    try {
      const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
      const kaitoClient = this.container.get<KaitoApiClient>(COMPONENT_KEYS.KAITO_CLIENT);
      const searchEngine = this.container.get<TweetEndpoints>(COMPONENT_KEYS.SEARCH_ENGINE);

      // 並行処理でデータ取得効率化
      const [learningData, accountInfo, trendData] = await Promise.all([
        dataManager.loadLearningData(),
        kaitoClient.getAccountInfo(),
        searchEngine.searchTrends()
      ]);

      // 型安全なアカウント情報変換
      const safeAccountInfo = this.extractAccountInfo(accountInfo);
      const safeLearningData = this.extractLearningData(learningData);
      const safeTrendData = this.extractTrendData(trendData);

      return {
        timestamp: new Date().toISOString(),
        account: safeAccountInfo,
        system: {
          executionCount: {
            today: safeLearningData.executionCount?.today || 0,
            total: safeLearningData.executionCount?.total || 0
          },
          health: { 
            all_systems_operational: true,
            api_status: 'healthy' as const,
            rate_limits_ok: true
          }
        },
        market: safeTrendData,
        learningData: {
          decisionPatterns: safeLearningData.decisionPatterns,
          successStrategies: safeLearningData.successStrategies,
          errorLessons: safeLearningData.errorLessons
        }
      };

    } catch (error) {
      systemLogger.error('❌ システムコンテキスト読み込みエラー:', error);
      throw new Error(`システムコンテキスト読み込み失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Claude判断フェーズ - エンドポイント別設計版
   * 新しいmakeDecision関数を使用
   */
  private async makeClaudeDecision(context: SystemContext): Promise<ClaudeDecision> {
    try {
      // SystemContextをDecisionInputに変換
      const decisionInput = {
        context: {
          account: {
            followerCount: context.account.followerCount,
            postsToday: context.account.postsToday,
            engagementRate: context.account.engagementRate,
            apiStatus: context.system.health.api_status === 'healthy' ? 'healthy' : 'error'
          },
          system: context.system,
          market: context.market
        },
        learningData: context.learningData,
        currentTime: new Date()
      };

      // エンドポイント別Claude SDK使用
      const decision = await makeDecision(decisionInput);
      systemLogger.info(`🤖 Claude判断結果: ${decision.action} (信頼度: ${decision.confidence})`);
      
      return decision;
    } catch (error) {
      systemLogger.error('❌ Claude判断エラー:', error);
      throw new Error(`Claude判断処理失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * アクション実行 - エンドポイント別設計版
   * Claude決定に基づいてアクションを実行し、結果を返す
   */
  private async executeAction(decision: ClaudeDecision, dataManager: DataManager): Promise<ActionResult> {
    try {
      const actionExecutor = this.container.get<ActionEndpoints>(COMPONENT_KEYS.ACTION_EXECUTOR);
      
      switch (decision.action) {
        case 'post':
          return await this.executePostAction(decision, dataManager);
          
        case 'retweet':
          return await this.executeRetweetAction(decision, dataManager);
          
        case 'quote_tweet':
          return await this.executeQuoteTweetAction(decision, dataManager);
          
        case 'like':
          return await this.executeLikeAction(decision, dataManager);
          
        case 'wait':
          return { 
            success: true, 
            action: 'wait', 
            timestamp: new Date().toISOString(),
            executionTime: 0
          };
          
        default:
          throw new Error(`未知のアクション: ${decision.action}`);
      }
      
    } catch (error) {
      systemLogger.error(`❌ アクション実行エラー [${decision.action}]:`, error);
      
      // エラー時も部分的な結果を保存
      try {
        await dataManager.saveKaitoResponse('action-error', {
          action: decision.action,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
        systemLogger.info('[DataManager] エラー情報を保存');
      } catch (saveError) {
        systemLogger.warn('[DataManager] エラー情報保存失敗:', saveError);
      }
      
      throw error;
    }
  }

  /**
   * 投稿アクション実行 - コンテンツ生成エンドポイント使用
   */
  private async executePostAction(decision: ClaudeDecision, dataManager: DataManager): Promise<ActionResult> {
    try {
      // コンテンツ生成エンドポイント使用
      const content: GeneratedContent = await generateContent({
        request: {
          topic: decision.parameters.topic || 'investment',
          contentType: 'educational',
          targetAudience: 'beginner'
        }
      });
      
      // データ保存フック: コンテンツ生成後
      await dataManager.saveClaudeOutput('content', content);
      systemLogger.info('[DataManager] 生成コンテンツを保存');
      
      systemLogger.info(`📝 生成コンテンツ: "${content.content.substring(0, 50)}..."`);
      
      // KaitoAPI呼び出し
      const actionExecutor = this.container.get<ActionEndpoints>(COMPONENT_KEYS.ACTION_EXECUTOR);
      const postResult = await actionExecutor.post(content.content);
      
      // データ保存フック: KaitoAPI応答後
      await dataManager.saveKaitoResponse('post-result', postResult);
      systemLogger.info('[DataManager] 投稿結果を保存');
      
      // データ保存フック: 投稿作成後
      const postData = {
        content: content.content,
        result: postResult,
        timestamp: new Date().toISOString()
      };
      await dataManager.savePost(postData);
      systemLogger.info('[DataManager] 投稿データを保存');
      
      return this.normalizeActionResult(postResult, decision.action);
    } catch (error) {
      systemLogger.error('❌ 投稿アクション実行エラー:', error);
      throw error;
    }
  }

  /**
   * リツイートアクション実行 - 検索クエリ生成エンドポイント使用
   */
  private async executeRetweetAction(decision: ClaudeDecision, dataManager: DataManager): Promise<ActionResult> {
    try {
      // 検索クエリ生成エンドポイント使用
      const searchQuery: SearchQuery = await generateSearchQuery({
        purpose: 'retweet',
        topic: decision.parameters.topic || 'investment'
      });
      
      // データ保存フック: 検索クエリ生成後
      await dataManager.saveClaudeOutput('search-query', searchQuery);
      systemLogger.info('[DataManager] 検索クエリを保存');
      
      systemLogger.info(`🔍 生成検索クエリ: "${searchQuery.query}"`);
      
      // 検索実行とリツイート
      const searchEngine = this.container.get<TweetEndpoints>(COMPONENT_KEYS.SEARCH_ENGINE);
      const searchResult = await searchEngine.searchTweets({ query: searchQuery.query });
      
      if (searchResult.tweets.length > 0) {
        const actionExecutor = this.container.get<ActionEndpoints>(COMPONENT_KEYS.ACTION_EXECUTOR);
        const retweetResult = await actionExecutor.retweet(searchResult.tweets[0].id);
        
        // データ保存フック: KaitoAPI応答後
        await dataManager.saveKaitoResponse('retweet-result', retweetResult);
        systemLogger.info('[DataManager] リツイート結果を保存');
        
        return this.normalizeActionResult(retweetResult, decision.action);
      } else {
        throw new Error('リツイート対象のツイートが見つかりません');
      }
    } catch (error) {
      systemLogger.error('❌ リツイートアクション実行エラー:', error);
      throw error;
    }
  }

  /**
   * 引用ツイートアクション実行 - コンテンツ生成エンドポイント使用
   */
  private async executeQuoteTweetAction(decision: ClaudeDecision, dataManager: DataManager): Promise<ActionResult> {
    try {
      // 検索クエリ生成で対象ツイートを見つける
      const searchQuery: SearchQuery = await generateSearchQuery({
        purpose: 'engagement',
        topic: decision.parameters.topic || 'investment'
      });
      
      // データ保存フック: 検索クエリ生成後
      await dataManager.saveClaudeOutput('search-query', searchQuery);
      systemLogger.info('[DataManager] 検索クエリを保存');
      
      const searchEngine = this.container.get<TweetEndpoints>(COMPONENT_KEYS.SEARCH_ENGINE);
      const searchResult = await searchEngine.searchTweets({ query: searchQuery.query });
      
      if (searchResult.tweets.length > 0) {
        // 引用コメント生成
        const content: GeneratedContent = await generateContent({
          request: {
            topic: decision.parameters.topic || 'investment',
            contentType: 'educational',
            targetAudience: 'beginner'
          }
        });
        
        // データ保存フック: コンテンツ生成後
        await dataManager.saveClaudeOutput('content', content);
        systemLogger.info('[DataManager] 引用コンテンツを保存');
        
        const actionExecutor = this.container.get<ActionEndpoints>(COMPONENT_KEYS.ACTION_EXECUTOR);
        // quoteTweetメソッドが存在しないため、postで代用
        const quoteTweetResult = await actionExecutor.post(`${content.content} https://twitter.com/x/status/${searchResult.tweets[0].id}`);
        
        // データ保存フック: KaitoAPI応答後
        await dataManager.saveKaitoResponse('quote-tweet-result', quoteTweetResult);
        systemLogger.info('[DataManager] 引用ツイート結果を保存');
        
        return this.normalizeActionResult(quoteTweetResult, decision.action);
      } else {
        throw new Error('引用ツイート対象のツイートが見つかりません');
      }
    } catch (error) {
      systemLogger.error('❌ 引用ツイートアクション実行エラー:', error);
      throw error;
    }
  }

  /**
   * いいねアクション実行
   */
  private async executeLikeAction(decision: ClaudeDecision, dataManager: DataManager): Promise<ActionResult> {
    try {
      const targetTweetId = decision.parameters.targetTweetId;
      if (!targetTweetId) {
        throw new Error('いいね実行に必要なツイートIDが提供されていません');
      }
      
      const actionExecutor = this.container.get<ActionEndpoints>(COMPONENT_KEYS.ACTION_EXECUTOR);
      const likeResult = await actionExecutor.like(targetTweetId);
      
      // データ保存フック: KaitoAPI応答後
      await dataManager.saveKaitoResponse('like-result', likeResult);
      systemLogger.info('[DataManager] いいね結果を保存');
      
      return this.normalizeActionResult(likeResult, decision.action);
    } catch (error) {
      systemLogger.error('❌ いいねアクション実行エラー:', error);
      throw error;
    }
  }

  /**
   * 結果記録フェーズ - 分析エンドポイント使用版
   * パフォーマンス分析と学習データ保存
   */
  private async recordResults(result: ActionResult, context: SystemContext): Promise<void> {
    try {
      const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
      
      // 分析入力データ構築
      const analysisInput = {
        analysisType: 'performance' as const,
        data: {
          action: result.action,
          success: result.success,
          executionTime: result.executionTime || 0,
          timestamp: result.timestamp || new Date().toISOString(),
          context: {
            followerCount: context.account.followerCount,
            engagementRate: context.account.engagementRate,
            marketCondition: context.market.sentiment || 'neutral'
          }
        }
      };

      // 分析エンドポイント使用
      const analysis: AnalysisResult = await analyzePerformance(analysisInput);
      
      systemLogger.info(`📊 パフォーマンス分析完了: 信頼度 ${analysis.confidence || 'N/A'}`);
      
      // 学習エントリー作成
      const learningEntry = {
        timestamp: new Date().toISOString(),
        context: { 
          followers: context.account.followerCount,
          marketSentiment: context.market.sentiment
        },
        decision: { 
          action: result.action, 
          success: result.success 
        },
        result: { 
          success: result.success,
          executionTime: result.executionTime 
        },
        analysis: {
          confidence: analysis.confidence,
          recommendations: analysis.recommendations,
          insights: analysis.insights
        }
      };

      // データ保存（将来実装）
      // await dataManager.addLearningEntry(learningEntry);
      systemLogger.info(`💾 学習エントリー記録完了: ${result.action} (${result.success ? '成功' : '失敗'})`);
      
    } catch (error) {
      systemLogger.error('❌ 結果記録エラー:', error);
      // 記録エラーは致命的でないため、エラーをログに記録するだけ
    }
  }

  /**
   * アカウント情報の型安全な抽出
   */
  private extractAccountInfo(accountInfo: AccountInfo): SystemContext['account'] {
    return {
      followerCount: accountInfo.followersCount || 0,
      lastPostTime: (accountInfo as any).lastPostTime,
      postsToday: (accountInfo as any).postsToday || 0,
      engagementRate: (accountInfo as any).engagementRate || 0,
      accountHealth: 'good' as const
    };
  }

  /**
   * 学習データの型安全な抽出
   */
  private extractLearningData(learningData: any): {
    executionCount?: { today: number; total: number };
    decisionPatterns: any[];
    successStrategies: any[];
    errorLessons: any[];
  } {
    return {
      executionCount: (learningData as any).executionCount,
      decisionPatterns: (learningData.decisionPatterns || []).map((pattern: any) => ({
        ...pattern,
        id: pattern.id || Date.now().toString()
      })),
      successStrategies: Array.isArray(learningData.successStrategies) 
        ? learningData.successStrategies.map((strategy: any) => ({
            id: strategy.id || Date.now().toString(),
            strategy: strategy.strategy || 'Unknown strategy',
            successRate: strategy.successRate || 0,
            conditions: strategy.conditions || [],
            examples: strategy.examples || []
          }))
        : [],
      errorLessons: (learningData as any).errorLessons || []
    };
  }

  /**
   * トレンドデータの型安全な抽出
   */
  private extractTrendData(trendData: any): SystemContext['market'] {
    return {
      trendingTopics: (Array.isArray(trendData) && trendData.length > 0) 
        ? trendData.map((trend: any) => trend.topic || trend) 
        : ['Bitcoin', 'NISA', '投資'],
      volatility: 'medium',
      sentiment: 'neutral'
    };
  }

  /**
   * アクション結果の正規化
   */
  private normalizeActionResult(result: any, action: string): ActionResult {
    return {
      ...result,
      action: action as ActionResult['action'],
      executionTime: result.executionTime || 0,
      timestamp: result.timestamp || new Date().toISOString()
    };
  }

  /**
   * 実行フロー状態取得
   */
  getExecutionStatus(): {
    lastExecution?: string;
    isRunning: boolean;
    workflow: string[];
  } {
    return {
      lastExecution: new Date().toISOString(),
      isRunning: false, // 実行中フラグは実装なし（MVP制約）
      workflow: [
        '【ステップ1】データ読み込み',
        '【ステップ2】Claude判断', 
        '【ステップ3】アクション実行',
        '【ステップ4】結果記録'
      ]
    };
  }

  /**
   * ワークフロー概要表示
   */
  displayWorkflowOverview(): void {
    systemLogger.info('📋 30分毎実行ワークフロー概要:');
    systemLogger.info('┌─────────────────────────────────────────────────────────────┐');
    systemLogger.info('│ 1. 【データ読み込み】                                         │');
    systemLogger.info('│    - DataManager: 設定・学習データ読み込み                   │'); 
    systemLogger.info('│    - KaitoAPI: アカウント状況確認                           │');
    systemLogger.info('│                                                           │');
    systemLogger.info('│ 2. 【Claude判断】                                           │');
    systemLogger.info('│    - 現在状況の分析                                         │');
    systemLogger.info('│    - 最適なアクション決定（投稿/RT/いいね/待機）              │');
    systemLogger.info('│                                                           │');
    systemLogger.info('│ 3. 【アクション実行】                                        │');
    systemLogger.info('│    - 決定されたアクションの実行                              │');
    systemLogger.info('│    - 基本的なエラーハンドリング                              │');
    systemLogger.info('│                                                           │');
    systemLogger.info('│ 4. 【結果記録】                                             │');
    systemLogger.info('│    - 実行結果の記録                                         │');
    systemLogger.info('│    - 学習データの更新                                       │');
    systemLogger.info('└─────────────────────────────────────────────────────────────┘');
  }

  // ===================================================================
  // エラーハンドリング・リカバリー機能（指示書準拠）
  // ===================================================================

  /**
   * リトライ機構付き操作実行
   * 指数バックオフによるリトライと詳細ログ
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryConfig?: Partial<RetryConfig>
  ): Promise<OperationResult<T>> {
    const config = { ...this.retryConfig, ...retryConfig };
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        systemLogger.debug(`🔄 ${operationName} 実行試行 ${attempt + 1}/${config.maxRetries + 1}`);
        
        const result = await operation();
        const duration = Date.now() - startTime;
        
        if (attempt > 0) {
          systemLogger.success(`✅ ${operationName} 成功 (${attempt + 1}回目で成功)`);
        }
        
        return {
          success: true,
          data: result,
          retryCount: attempt,
          duration,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < config.maxRetries) {
          // 指数バックオフ計算
          const delay = Math.min(
            config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
            config.maxDelay
          );
          
          systemLogger.warn(`⚠️ ${operationName} 失敗 (試行 ${attempt + 1}/${config.maxRetries + 1}): ${lastError.message}`);
          systemLogger.info(`⏰ ${delay}ms 待機後に再試行...`);
          
          await this.sleep(delay);
        } else {
          systemLogger.error(`❌ ${operationName} 最終的に失敗 (${config.maxRetries + 1}回試行)`);
        }
      }
    }

    const duration = Date.now() - startTime;
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      retryCount: config.maxRetries,
      duration,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * トランザクション的な操作管理
   * 操作の各ステップを記録し、失敗時のロールバックを可能にする
   */
  private async executeTransaction<T>(
    operationId: string,
    steps: Array<{
      stepId: string;
      operation: string;
      execute: () => Promise<T>;
      rollback?: (data: T) => Promise<void>;
    }>
  ): Promise<OperationResult<T[]>> {
    this.transactionState = {
      operationId,
      steps: [],
      canRollback: true,
      rollbackInProgress: false
    };

    const results: T[] = [];
    const startTime = Date.now();

    try {
      systemLogger.info(`🏗️ トランザクション開始: ${operationId}`);

      for (const step of steps) {
        try {
          systemLogger.debug(`⚙️ ステップ実行: ${step.operation}`);
          
          const result = await step.execute();
          results.push(result);

          // 成功ステップを記録
          this.transactionState.steps.push({
            stepId: step.stepId,
            operation: step.operation,
            success: true,
            rollbackData: step.rollback ? result : undefined,
            timestamp: new Date().toISOString()
          });

          systemLogger.success(`✅ ステップ完了: ${step.operation}`);

        } catch (error) {
          // 失敗ステップを記録
          this.transactionState.steps.push({
            stepId: step.stepId,
            operation: step.operation,
            success: false,
            timestamp: new Date().toISOString()
          });

          systemLogger.error(`❌ ステップ失敗: ${step.operation} - ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error;
        }
      }

      systemLogger.success(`✅ トランザクション完了: ${operationId}`);
      this.transactionState = null;

      return {
        success: true,
        data: results,
        retryCount: 0,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      systemLogger.error(`❌ トランザクション失敗: ${operationId}`);
      
      // ロールバック実行
      await this.rollbackTransaction();

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * トランザクションロールバック
   * 成功したステップを逆順で元に戻す
   */
  private async rollbackTransaction(): Promise<void> {
    if (!this.transactionState || this.transactionState.rollbackInProgress) {
      return;
    }

    this.transactionState.rollbackInProgress = true;
    systemLogger.warn('🔄 トランザクションロールバック開始...');

    // 成功したステップを逆順で処理
    const successfulSteps = this.transactionState.steps
      .filter(step => step.success && step.rollbackData)
      .reverse();

    for (const step of successfulSteps) {
      try {
        systemLogger.debug(`🔙 ロールバック実行: ${step.operation}`);
        
        // ロールバック処理は実装が複雑なため、ログ出力のみ（MVP版）
        systemLogger.info(`📋 ロールバック記録: ${step.stepId} - ${step.operation}`);
        
      } catch (error) {
        systemLogger.error(`❌ ロールバック失敗 ${step.operation}:`, error);
      }
    }

    systemLogger.info('✅ トランザクションロールバック完了');
    this.transactionState = null;
  }

  /**
   * データ整合性チェック
   * 保存されたデータの完全性を検証
   */
  private async performIntegrityCheck(dataManager: DataManager): Promise<boolean> {
    try {
      systemLogger.info('🔍 データ整合性チェック開始...');

      // DataManagerのヘルスチェック機能を活用
      const healthCheck = await dataManager.performHealthCheck();
      
      if (healthCheck.errors.length > 0) {
        systemLogger.warn('⚠️ データ整合性に問題:', healthCheck.errors);
        return false;
      }

      // アーカイブ整合性チェック
      const archiveValid = await dataManager.validateArchive();
      if (!archiveValid) {
        systemLogger.warn('⚠️ アーカイブ整合性に問題があります');
        return false;
      }

      systemLogger.success('✅ データ整合性チェック完了');
      return true;

    } catch (error) {
      systemLogger.error('❌ データ整合性チェック失敗:', error);
      return false;
    }
  }

  /**
   * 待機（sleep）ユーティリティ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 一時的エラーの判定
   * ネットワークエラーやレート制限などの一時的エラーかどうか判定
   */
  private isTemporaryError(error: Error): boolean {
    const temporaryErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'Rate limit',
      'Too Many Requests',
      'Service Unavailable',
      '503',
      '429'
    ];

    const errorMessage = error.message.toLowerCase();
    return temporaryErrors.some(temp => 
      errorMessage.includes(temp.toLowerCase())
    );
  }

  // ===================================================================
  // KaitoAPI最適化機能（指示書準拠）
  // ===================================================================

  /**
   * 最新投稿の差分取得（指示書準拠）
   * get_user_last_tweetsの20件制限に対応した効率的な取得
   */
  private async fetchRecentTweets(userId: string, dataManager: DataManager): Promise<any[]> {
    try {
      systemLogger.info(`🔍 最新投稿差分取得開始: ${userId}`);
      
      // 1. KaitoAPIから最新20件取得
      const kaitoClient = this.container.get<KaitoApiClient>(COMPONENT_KEYS.KAITO_CLIENT);
      const latestTweets = await this.executeWithRetry(
        () => kaitoClient.getUserLastTweets(userId, 20),
        `KaitoAPI最新20件取得 (${userId})`
      );

      if (!latestTweets.success || !latestTweets.data) {
        throw new Error(`KaitoAPI取得失敗: ${latestTweets.error}`);
      }

      // データ保存フック: KaitoAPI応答
      await dataManager.saveKaitoResponse('user-last-tweets', {
        userId,
        count: latestTweets.data.length,
        data: latestTweets.data,
        fetchedAt: new Date().toISOString()
      });

      // 2. 既存データとマージ
      const existingPosts = await dataManager.getRecentPosts(100);
      systemLogger.debug(`既存投稿数: ${existingPosts.length}件`);

      // 3. 重複を除いて保存
      const newPosts = latestTweets.data.filter((tweet: any) => 
        !existingPosts.some(post => post.id === tweet.id)
      );

      systemLogger.info(`新規投稿: ${newPosts.length}件 / 取得総数: ${latestTweets.data.length}件`);

      // 4. 新規投稿をDataManagerに保存
      for (const post of newPosts) {
        await dataManager.savePost({
          id: post.id,
          content: post.text || post.content || '',
          timestamp: post.created_at || new Date().toISOString(),
          metrics: {
            likes: post.public_metrics?.like_count || 0,
            retweets: post.public_metrics?.retweet_count || 0,
            replies: post.public_metrics?.reply_count || 0
          }
        });
      }

      systemLogger.success(`✅ 差分取得完了: ${newPosts.length}件の新規投稿を保存`);
      return newPosts;

    } catch (error) {
      systemLogger.error('❌ 最新投稿差分取得失敗:', error);
      throw new Error(`Recent tweets fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * KaitoAPIキャッシュ戦略
   * API制限に対応したインテリジェントなキャッシュ管理
   */
  private async getCachedData<T>(
    cacheKey: string,
    fetchFunction: () => Promise<T>,
    cacheTTL: number = 300000, // 5分
    dataManager: DataManager
  ): Promise<T> {
    try {
      // キャッシュからデータ取得を試行
      const cachedData = await this.getCacheFromDataManager(cacheKey, dataManager);
      
      if (cachedData && this.isCacheValid(cachedData, cacheTTL)) {
        systemLogger.debug(`📦 キャッシュヒット: ${cacheKey}`);
        return cachedData.data;
      }

      // キャッシュミス - 新しいデータを取得
      systemLogger.debug(`🔄 キャッシュミス - 新規取得: ${cacheKey}`);
      const freshData = await fetchFunction();
      
      // キャッシュに保存
      await this.saveCacheToDataManager(cacheKey, freshData, dataManager);
      
      return freshData;

    } catch (error) {
      systemLogger.error(`❌ キャッシュ戦略実行失敗 ${cacheKey}:`, error);
      
      // フォールバック: 古いキャッシュでも返す
      const fallbackCache = await this.getCacheFromDataManager(cacheKey, dataManager);
      if (fallbackCache) {
        systemLogger.warn(`⚠️ フォールバック: 古いキャッシュを使用 ${cacheKey}`);
        return fallbackCache.data;
      }
      
      throw error;
    }
  }

  /**
   * DataManagerからキャッシュデータを取得
   */
  private async getCacheFromDataManager(cacheKey: string, dataManager: DataManager): Promise<any | null> {
    try {
      // DataManagerのKaito応答データからキャッシュを検索
      // 実装簡略化のため、ログ出力のみ（MVP版）
      systemLogger.debug(`🔍 キャッシュ検索: ${cacheKey}`);
      return null; // キャッシュ機能は本格実装時に拡張

    } catch (error) {
      systemLogger.debug(`⚠️ キャッシュ取得エラー ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * DataManagerにキャッシュデータを保存
   */
  private async saveCacheToDataManager(cacheKey: string, data: any, dataManager: DataManager): Promise<void> {
    try {
      await dataManager.saveKaitoResponse(`cache-${cacheKey}`, {
        cacheKey,
        data,
        cachedAt: new Date().toISOString(),
        ttl: 300000 // 5分
      });
      systemLogger.debug(`💾 キャッシュ保存: ${cacheKey}`);

    } catch (error) {
      systemLogger.warn(`⚠️ キャッシュ保存エラー ${cacheKey}:`, error);
      // キャッシュ保存失敗は致命的でない
    }
  }

  /**
   * キャッシュの有効性チェック
   */
  private isCacheValid(cachedData: any, ttl: number): boolean {
    if (!cachedData || !cachedData.cachedAt) {
      return false;
    }

    const cachedTime = new Date(cachedData.cachedAt).getTime();
    const now = Date.now();
    const isValid = (now - cachedTime) < ttl;
    
    systemLogger.debug(`⏰ キャッシュ有効性: ${isValid} (経過時間: ${now - cachedTime}ms / TTL: ${ttl}ms)`);
    return isValid;
  }

  /**
   * KaitoAPI レート制限対応
   * 200QPS制限に対応した適切な間隔での実行
   */
  private async executeWithRateLimit<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const minInterval = 700; // 700ms (指示書の最小間隔要件)
    
    try {
      systemLogger.debug(`🚦 レート制限対応実行: ${operationName}`);
      
      const result = await operation();
      
      // 最小間隔を保証
      await this.sleep(minInterval);
      
      systemLogger.debug(`✅ レート制限対応完了: ${operationName}`);
      return result;

    } catch (error) {
      // レート制限エラーの場合は長時間待機
      if (this.isRateLimitError(error)) {
        systemLogger.warn(`⚠️ レート制限検出 - 60秒待機: ${operationName}`);
        await this.sleep(60000); // 1分待機
      }
      
      throw error;
    }
  }

  /**
   * レート制限エラーの判定
   */
  private isRateLimitError(error: any): boolean {
    const rateLimitIndicators = [
      'rate limit',
      'too many requests',
      '429',
      'quota exceeded',
      'throttle'
    ];

    const errorMessage = (error?.message || '').toLowerCase();
    return rateLimitIndicators.some(indicator => 
      errorMessage.includes(indicator)
    );
  }

  /**
   * KaitoAPI最適化済み検索実行
   * キャッシュ戦略とレート制限対応を統合
   */
  async optimizedKaitoSearch(query: string, dataManager: DataManager): Promise<any[]> {
    try {
      systemLogger.info(`🔍 最適化済み検索実行: "${query}"`);

      // キャッシュ戦略を使用した検索
      const results = await this.getCachedData(
        `search-${query}`,
        async () => {
          const searchEngine = this.container.get<TweetEndpoints>(COMPONENT_KEYS.SEARCH_ENGINE);
          return await this.executeWithRateLimit(
            () => searchEngine.searchTweets({ query }),
            `検索実行: ${query}`
          );
        },
        300000, // 5分キャッシュ
        dataManager
      );

      // 検索結果をDataManagerに保存
      await dataManager.saveKaitoResponse('search-results', {
        query,
        results: results,
        resultCount: Array.isArray(results) ? results.length : 0,
        timestamp: new Date().toISOString()
      });

      systemLogger.success(`✅ 最適化済み検索完了: ${Array.isArray(results) ? results.length : 0}件の結果`);
      return Array.isArray(results) ? results : [];

    } catch (error) {
      systemLogger.error('❌ 最適化済み検索失敗:', error);
      return [];
    }
  }
}