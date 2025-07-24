import { systemLogger } from '../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../shared/component-container';
import { DataManager } from '../data/data-manager';
import { DecisionEngine } from '../claude/decision-engine';
import { ActionExecutor } from '../kaito-api/action-executor';
import { SearchEngine } from '../kaito-api/search-engine';
import { KaitoApiClient } from '../kaito-api/core/client';
import { ExecutionResult, SystemContext, ClaudeDecision, ActionResult } from '../shared/types';

/**
 * メインループ実行フロー・30分毎4ステップワークフロー管理
 * main.tsから分離された実行フロー専用クラス
 */
export class ExecutionFlow {
  private container: ComponentContainer;

  constructor(container: ComponentContainer) {
    this.container = container;
  }

  /**
   * 30分毎メインループ実行ワークフロー（詳細実装版）
   * REQUIREMENTS.md準拠の4ステップワークフロー実行
   */
  async executeMainLoop(): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      systemLogger.info('🔄 メインループ実行開始');
      
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
      systemLogger.success('✅ 【ステップ2】Claude判断完了');
      
      // 3. 【アクション実行】
      systemLogger.info('⚡【ステップ3】アクション実行開始');
      const actionResult = await this.executeAction(decision);
      systemLogger.success('✅ 【ステップ3】アクション実行完了');
      
      // 4. 【結果記録】
      systemLogger.info('💾 【ステップ4】結果記録開始');
      await this.recordResults(actionResult, context);
      systemLogger.success('✅ 【ステップ4】結果記録完了');

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

  private async loadSystemContext(): Promise<SystemContext> {
    const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
    const kaitoClient = this.container.get<KaitoApiClient>(COMPONENT_KEYS.KAITO_CLIENT);
    const searchEngine = this.container.get<SearchEngine>(COMPONENT_KEYS.SEARCH_ENGINE);

    // 基本実装（MVP準拠）
    const learningData = await dataManager.loadLearningData();
    const accountInfo = await kaitoClient.getAccountInfo();
    const trendData = await searchEngine.searchTrends();

    return {
      timestamp: new Date().toISOString(),
      account: {
        followerCount: accountInfo.followersCount || 0,
        lastPostTime: accountInfo.lastPostTime,
        postsToday: accountInfo.postsToday || 0,
        engagementRate: accountInfo.engagementRate || 0,
        accountHealth: 'good' as const // Added missing property
      },
      system: {
        executionCount: {
          today: learningData.executionCount?.today || 0,
          total: learningData.executionCount?.total || 0
        },
        health: { 
          all_systems_operational: true,
          api_status: 'healthy' as const,
          rate_limits_ok: true
        }
      },
      market: {
        trendingTopics: (Array.isArray(trendData) && trendData.length > 0) 
          ? trendData.map((trend: any) => trend.topic || trend) 
          : ['Bitcoin', 'NISA', '投資'],
        volatility: 'medium',
        sentiment: 'neutral'
      },
      learningData: {
        decisionPatterns: learningData.decisionPatterns || [],
        successStrategies: learningData.successStrategies || [],
        errorLessons: learningData.errorLessons || []
      }
    };
  }

  private async makeClaudeDecision(context: SystemContext): Promise<ClaudeDecision> {
    const decisionEngine = this.container.get<DecisionEngine>(COMPONENT_KEYS.DECISION_ENGINE);
    return await decisionEngine.makeDecision(context);
  }

  private async executeAction(decision: ClaudeDecision): Promise<ActionResult> {
    const actionExecutor = this.container.get<ActionExecutor>(COMPONENT_KEYS.ACTION_EXECUTOR);
    
    switch (decision.action) {
      case 'post':
        return await actionExecutor.post(decision.parameters.content || '');
      case 'retweet':
        return await actionExecutor.retweet(decision.parameters.targetTweetId || '');
      case 'like':
        return await actionExecutor.like(decision.parameters.targetTweetId || '');
      case 'wait':
        return { 
          success: true, 
          action: 'wait', 
          timestamp: new Date().toISOString(),
          executionTime: 0
        };
      default:
        throw new Error(`Unknown action: ${decision.action}`);
    }
  }

  private async recordResults(result: ActionResult, context: SystemContext): Promise<void> {
    const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
    
    const learningEntry = {
      timestamp: new Date().toISOString(),
      context: { followers: context.account.followerCount },
      decision: { action: result.action, success: result.success },
      result: { success: result.success }
    };

    await dataManager.addLearningEntry(learningEntry);
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
}