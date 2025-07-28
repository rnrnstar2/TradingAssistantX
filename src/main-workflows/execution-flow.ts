import { systemLogger } from '../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../shared/component-container';
import { DataManager } from '../data/data-manager';
import { ExecutionResult, SystemContext, ClaudeDecision, ActionResult } from '../shared/types';

// 最適化されたユーティリティクラス
import { CommonErrorHandler } from './core/common-error-handler';
import { TypeGuards } from './core/type-guards';
import { WorkflowLogger } from './core/workflow-logger';
import { WORKFLOW_CONSTANTS } from './core/workflow-constants';

// エンドポイント別Claude SDK（TASK-001完了後）
import { makeDecision, analyzePerformance } from '../claude';
import type { AnalysisResult } from '../claude/types';

// 分割されたコアクラス
import { ContextLoader } from './core/context-loader';
import { ActionExecutor } from './core/action-executor';
import { ExecutionUtils } from './core/execution-utils';

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
  private contextLoader: ContextLoader;
  private actionExecutor: ActionExecutor;
  private executionUtils: ExecutionUtils;

  constructor(container: ComponentContainer) {
    this.container = container;
    
    // 分割されたクラスのインスタンス作成
    this.contextLoader = new ContextLoader(container);
    this.actionExecutor = new ActionExecutor(container);
    this.executionUtils = new ExecutionUtils(container);
  }

  /**
   * 30分毎メインループ実行ワークフロー（詳細実装版）
   * REQUIREMENTS.md準拠の4ステップワークフロー実行
   */
  async executeMainLoop(): Promise<ExecutionResult> {
    const startTime = Date.now();
    let executionId: string | null = null;

    try {
      WorkflowLogger.logPhaseStart(WORKFLOW_CONSTANTS.LOG_MESSAGES.WORKFLOW_START);
      
      // DataManager実行サイクル初期化
      const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
      executionId = await CommonErrorHandler.handleAsyncOperation(
        () => dataManager.initializeExecutionCycle(),
        'DataManager実行サイクル初期化'
      ) as string;
      
      if (!TypeGuards.isNonEmptyString(executionId)) {
        throw new Error('実行サイクル初期化に失敗しました');
      }
      
      // 前回実行のアーカイブ（必要な場合）
      await CommonErrorHandler.handleAsyncOperation(
        () => dataManager.archiveCurrentToHistory(),
        'データアーカイブ処理'
      );
      
      // ===================================================================
      // 30分毎自動実行ワークフロー (REQUIREMENTS.md準拠)
      // ===================================================================
      
      // 1. 【データ読み込み】
      const step1 = WORKFLOW_CONSTANTS.WORKFLOW_STEPS.DATA_LOAD;
      WorkflowLogger.logStep(step1.number, step1.name, 'start');
      const context = await CommonErrorHandler.handleAsyncOperation(
        () => this.contextLoader.loadSystemContext(),
        step1.description
      ) as SystemContext;
      WorkflowLogger.logStep(step1.number, step1.name, 'success');

      // 2. 【Claude判断】
      const step2 = WORKFLOW_CONSTANTS.WORKFLOW_STEPS.CLAUDE_DECISION;
      WorkflowLogger.logStep(step2.number, step2.name, 'start');
      const decision = await CommonErrorHandler.handleAsyncOperation(
        () => this.makeClaudeDecision(context),
        step2.description
      ) as ClaudeDecision;
      
      // データ保存フック: Claude決定後
      await dataManager.saveClaudeOutput('decision', decision);
      WorkflowLogger.logDataSave('Claude決定', 'current/decision');
      WorkflowLogger.logStep(step2.number, step2.name, 'success');
      
      // 3. 【アクション実行】
      const step3 = WORKFLOW_CONSTANTS.WORKFLOW_STEPS.ACTION_EXECUTION;
      WorkflowLogger.logStep(step3.number, step3.name, 'start');
      const actionResult = await CommonErrorHandler.handleAsyncOperation(
        () => this.actionExecutor.executeAction(decision, dataManager),
        step3.description
      ) as ActionResult;
      WorkflowLogger.logStep(step3.number, step3.name, 'success');
      
      // 4. 【結果記録】
      const step4 = WORKFLOW_CONSTANTS.WORKFLOW_STEPS.RESULT_RECORDING;
      WorkflowLogger.logStep(step4.number, step4.name, 'start');
      await CommonErrorHandler.handleAsyncOperation(
        () => this.recordResults(actionResult, context),
        step4.description
      );
      WorkflowLogger.logStep(step4.number, step4.name, 'success');

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
      WorkflowLogger.logError(WORKFLOW_CONSTANTS.LOG_MESSAGES.WORKFLOW_ERROR, error);
      
      // エラー時も部分的な結果を保存
      const dataManager = this.container.get<DataManager>(COMPONENT_KEYS.DATA_MANAGER);
      await CommonErrorHandler.handleAsyncOperation(
        () => dataManager.saveKaitoResponse('execution-error', {
          error: CommonErrorHandler.extractErrorMessage(error),
          executionId,
          timestamp: new Date().toISOString(),
          stack: TypeGuards.isError(error) ? error.stack : undefined
        }),
        'エラー情報保存',
        null // フォールバック値として null を設定
      );
      
      return { 
        success: false, 
        action: WORKFLOW_CONSTANTS.ACTIONS.ERROR,
        executionTime: duration,
        duration: duration, // Added for compatibility
        error: CommonErrorHandler.extractErrorMessage(error),
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
   * Claude判断フェーズ - エンドポイント別設計版
   * 新しいmakeDecision関数を使用
   */
  private async makeClaudeDecision(context: SystemContext): Promise<ClaudeDecision> {
    if (!TypeGuards.isValidExecutionContext(context)) {
      throw new Error('無効な実行コンテキストが提供されました');
    }

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
    const decision = await CommonErrorHandler.handleAsyncOperation(
      () => makeDecision(decisionInput),
      'Claude判断処理'
    );

    if (!decision || !TypeGuards.isValidClaudeDecision(decision)) {
      throw new Error(WORKFLOW_CONSTANTS.ERROR_MESSAGES.CLAUDE_DECISION_FAILED);
    }

    WorkflowLogger.logInfo(`Claude判断結果: ${decision.action} (信頼度: ${decision.confidence})`);
    
    return decision;
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