/**
 * Main Workflow - Simplified 3-step execution flow
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • 3ステップのメインワークフロー実行
 * • データ収集 → アクション実行 → 結果保存の制御
 * • 最小限のエラーハンドリング
 */

import { KaitoApiClient } from '../kaito-api';
import { KaitoAPIConfigManager } from '../kaito-api/core/config';
import { generateContent } from '../claude';
import { DataManager } from '../shared/data-manager';
import { WORKFLOW_CONSTANTS, ActionType, WorkflowOptions, WorkflowResult, SystemContext } from './constants';


/**
 * MainWorkflow - MVP最小構成ワークフローエンジン
 */
export class MainWorkflow {
  private static dataManager = new DataManager();
  private static kaitoClient: KaitoApiClient;
  private static kaitoClientInitialized = false;

  /**
   * 3ステップのメインワークフロー実行
   * 
   * ステップ1: データ収集（Kaito API + 学習データ）
   * ステップ2: アクション実行（固定アクション使用）
   * ステップ3: 結果保存（data/）
   */
  static async execute(options?: WorkflowOptions): Promise<WorkflowResult> {
    const startTime = Date.now();
    let executionId: string;

    try {
      console.log('🚀 メインワークフロー実行開始');

      // 初回実行時にKaitoApiClientを初期化
      if (!this.kaitoClientInitialized) {
        await this.initializeKaitoClient();
        this.kaitoClientInitialized = true;
      }

      // 新規実行サイクル初期化
      executionId = await this.dataManager.initializeExecutionCycle();
      console.log(`📋 実行サイクル開始: ${executionId}`);

      // ===============================
      // スケジュール実行モード（3ステップ）
      // ===============================
      if (options?.scheduledAction) {
        console.log(`📅 スケジュール実行モード: ${options.scheduledAction}`);
        
        // ステップ1: データ収集
        console.log('📊 ステップ1: データ収集開始');
        const [profile, learningData, currentStatus] = await Promise.all([
          this.collectKaitoData(),
          this.dataManager.loadLearningData(),
          this.dataManager.loadCurrentStatus()
        ]);
        console.log('✅ データ収集完了');

        // ステップ2: アクション実行（スケジュール指定）
        console.log('⚡ ステップ2: アクション実行開始');
        const decision = {
          action: options.scheduledAction,
          parameters: {
            topic: options.scheduledTopic,
            query: options.scheduledQuery
          },
          confidence: 1.0,
          reasoning: `スケジュール指定によるアクション: ${options.scheduledAction}`
        };
        
        const actionResult = await this.executeAction(decision);
        console.log('✅ アクション実行完了', { action: decision.action, success: actionResult.success });

        // ステップ3: 結果保存
        console.log('💾 ステップ3: 結果保存開始');
        await this.saveResults(decision, actionResult);
        console.log('✅ 結果保存完了');

        const executionTime = Date.now() - startTime;
        console.log(`🎉 スケジュール実行完了 (${executionTime}ms)`);

        return {
          success: true,
          executionId,
          decision,
          actionResult,
          executionTime
        };
      }

      // ===============================
      // 手動実行モード（3ステップ）
      // ===============================
      
      // ステップ1: データ収集
      console.log('📊 ステップ1: データ収集開始');
      
      const [profile, learningData, currentStatus] = await Promise.all([
        this.collectKaitoData(),
        this.dataManager.loadLearningData(),
        this.dataManager.loadCurrentStatus()
      ]);

      console.log('✅ データ収集完了', {
        profile: !!profile,
        learningPatterns: learningData.decisionPatterns.length,
        currentStatus: !!currentStatus
      });

      // ステップ2: アクション実行（固定アクション使用）
      console.log('⚡ ステップ2: アクション実行開始');

      // 固定アクション設定（dev実行時のデフォルト）
      const decision = {
        action: 'post',
        parameters: {
          topic: 'investment',
          query: null
        },
        confidence: 1.0,
        reasoning: '固定アクション実行: 手動実行モード'
      };

      // 決定内容保存
      await this.dataManager.saveClaudeOutput('decision', decision);
      console.log('✅ 固定アクション設定完了', { action: decision.action, confidence: decision.confidence });

      const actionResult = await this.executeAction(decision);
      console.log('✅ アクション実行完了', { action: decision.action, success: actionResult.success });

      // ステップ3: 結果保存
      console.log('💾 ステップ3: 結果保存開始');

      await this.saveResults(decision, actionResult);
      console.log('✅ 結果保存完了');

      // 実行完了
      const executionTime = Date.now() - startTime;
      console.log(`🎉 メインワークフロー実行完了 (${executionTime}ms)`);

      return {
        success: true,
        executionId,
        decision,
        actionResult,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error('❌ メインワークフロー実行エラー:', errorMessage);

      // エラー情報保存
      if (executionId!) {
        try {
          await this.dataManager.saveKaitoResponse('workflow-error', {
            error: errorMessage,
            executionTime,
            timestamp: new Date().toISOString()
          });
        } catch (saveError) {
          console.error('❌ エラー情報保存失敗:', saveError);
        }
      }

      return {
        success: false,
        executionId: executionId! || 'unknown',
        decision: null,
        error: errorMessage,
        executionTime
      };
    }
  }

  /**
   * Kaitoデータ収集
   */
  private static async collectKaitoData(): Promise<any> {
    try {
      const profile = await this.kaitoClient.getAccountInfo();
      return profile;
    } catch (error) {
      console.warn('⚠️ Kaitoデータ収集でエラー、デフォルト値使用:', error);
      return {
        followers: 100,
        following: 50,
        tweets_today: 0
      };
    }
  }

  /**
   * システムコンテキスト構築
   */
  private static buildSystemContext(profile: any, currentStatus: any): SystemContext {
    return {
      account: {
        followerCount: profile?.followersCount || profile?.followers || 100,
        lastPostTime: currentStatus?.system_status?.last_execution,
        postsToday: profile?.tweetsCount || currentStatus?.account_status?.tweets_today || 0,
        engagementRate: currentStatus?.account_status?.engagement_rate_24h || 2.5
      },
      system: {
        health: {
          all_systems_operational: true,
          api_status: 'healthy',
          rate_limits_ok: true
        },
        executionCount: {
          today: currentStatus?.system_status?.errors_today || 0,
          total: 1
        }
      },
      market: {
        trendingTopics: ['投資', '資産形成', '仮想通貨'],
        volatility: 'medium',
        sentiment: 'neutral'
      }
    };
  }

  /**
   * アクション実行（switch文での分岐）
   */
  private static async executeAction(decision: any): Promise<any> {
    const action = decision.action as ActionType;

    switch (action) {
      case WORKFLOW_CONSTANTS.ACTIONS.POST:
        return await this.executePostAction(decision);

      case WORKFLOW_CONSTANTS.ACTIONS.RETWEET:
        return await this.executeRetweetAction(decision);

      case WORKFLOW_CONSTANTS.ACTIONS.LIKE:
        return await this.executeLikeAction(decision);

      case WORKFLOW_CONSTANTS.ACTIONS.QUOTE_TWEET:
        return await this.executeQuoteTweetAction(decision);

      case WORKFLOW_CONSTANTS.ACTIONS.WAIT:
        return {
          success: true,
          action: WORKFLOW_CONSTANTS.ACTIONS.WAIT,
          duration: decision.parameters?.duration || 30,
          timestamp: new Date().toISOString()
        };

      default:
        throw new Error(`未知のアクション: ${action}`);
    }
  }

  /**
   * 投稿アクション実行
   */
  private static async executePostAction(decision: any): Promise<any> {
    try {
      // コンテンツ生成
      const content = await generateContent({
        request: {
          topic: decision.parameters?.topic || 'investment',
          contentType: 'educational',
          targetAudience: 'beginner'
        }
      });

      if (!content?.content) {
        throw new Error(WORKFLOW_CONSTANTS.ERROR_MESSAGES.CLAUDE_CONTENT_GENERATION_FAILED);
      }

      // コンテンツ保存
      await this.dataManager.saveClaudeOutput('content', content);

      // 投稿実行
      const postResult = await this.kaitoClient.post(content.content);

      if (!postResult?.success) {
        throw new Error(postResult?.error || '投稿実行失敗');
      }

      // 投稿データ保存
      await this.dataManager.savePost({
        content: content.content,
        result: postResult,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.POST,
        content: content.content,
        result: postResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 投稿アクション失敗:', error);
      throw error;
    }
  }

  /**
   * リツイートアクション実行
   */
  private static async executeRetweetAction(decision: any): Promise<any> {
    try {
      // MVP版: 検索機能は省略し、固定のツイートIDまたはスキップ
      const targetTweetId = decision.parameters?.targetTweetId;
      
      if (!targetTweetId) {
        console.warn('⚠️ リツイート対象ツイートIDがないため、waitアクションに変更');
        return {
          success: true,
          action: WORKFLOW_CONSTANTS.ACTIONS.WAIT,
          reason: 'No target tweet ID for retweet',
          timestamp: new Date().toISOString()
        };
      }

      // リツイート実行
      const retweetResult = await this.kaitoClient.retweet(targetTweetId);

      if (!retweetResult?.success) {
        throw new Error(retweetResult?.error || 'リツイート実行失敗');
      }

      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.RETWEET,
        targetTweet: targetTweetId,
        result: retweetResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ リツイートアクション失敗:', error);
      throw error;
    }
  }

  /**
   * いいねアクション実行
   */
  private static async executeLikeAction(decision: any): Promise<any> {
    try {
      const targetTweetId = decision.parameters?.targetTweetId;
      
      if (!targetTweetId) {
        throw new Error('いいね対象のツイートIDがありません');
      }

      // いいね実行
      const likeResult = await this.kaitoClient.like(targetTweetId);

      if (!likeResult?.success) {
        throw new Error(likeResult?.error || 'いいね実行失敗');
      }

      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.LIKE,
        targetTweet: targetTweetId,
        result: likeResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ いいねアクション失敗:', error);
      throw error;
    }
  }

  /**
   * 引用ツイートアクション実行
   */
  private static async executeQuoteTweetAction(decision: any): Promise<any> {
    try {
      // MVP版: 検索機能は省略し、固定のツイートIDまたはスキップ
      const targetTweetId = decision.parameters?.targetTweetId;
      
      if (!targetTweetId) {
        console.warn('⚠️ 引用ツイート対象ツイートIDがないため、waitアクションに変更');
        return {
          success: true,
          action: WORKFLOW_CONSTANTS.ACTIONS.WAIT,
          reason: 'No target tweet ID for quote tweet',
          timestamp: new Date().toISOString()
        };
      }

      // コンテンツ生成（引用ツイート用）
      const content = await generateContent({
        request: {
          topic: decision.parameters?.topic || 'investment commentary',
          contentType: 'general',
          targetAudience: 'intermediate'
        }
      });

      if (!content?.content) {
        throw new Error('引用ツイートコンテンツ生成失敗');
      }

      // 引用ツイート実行
      const quoteTweetResult = await this.kaitoClient.quoteTweet(targetTweetId, content.content);

      if (!quoteTweetResult?.success) {
        throw new Error(quoteTweetResult?.error || '引用ツイート実行失敗');
      }

      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.QUOTE_TWEET,
        targetTweet: targetTweetId,
        content: content.content,
        result: quoteTweetResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 引用ツイートアクション失敗:', error);
      throw error;
    }
  }

  /**
   * 結果保存
   */
  private static async saveResults(decision: any, actionResult: any): Promise<void> {
    try {
      // Kaito応答保存
      await this.dataManager.saveKaitoResponse('action-result', actionResult);

      // 決定結果記録
      await this.dataManager.saveDecisionResult(decision, {
        success: actionResult.success,
        engagement_rate: 0, // 実際のメトリクスは後で更新
        timestamp: new Date().toISOString()
      });

      // 実行サマリー更新
      const summary = await this.dataManager.getCurrentExecutionData();
      summary.summary.metrics.totalActions += 1;
      
      if (actionResult.success) {
        summary.summary.metrics.successCount += 1;
      } else {
        summary.summary.metrics.errorCount += 1;
      }

      await this.dataManager.updateExecutionSummary(summary.summary);

    } catch (error) {
      console.error('❌ 結果保存エラー:', error);
      // 結果保存のエラーは致命的でないためスロー
    }
  }

  /**
   * KaitoApiClient初期化
   */
  private static async initializeKaitoClient(): Promise<void> {
    try {
      // KaitoAPIConfigManagerを使用して設定を生成
      const configManager = new KaitoAPIConfigManager();
      const apiConfig = await configManager.generateConfig('dev');
      
      // クライアントを作成
      this.kaitoClient = new KaitoApiClient();
      
      // 重要: initializeWithConfigを呼んでhttpClientを初期化
      this.kaitoClient.initializeWithConfig(apiConfig);
      
      console.log('✅ KaitoApiClient初期化完了');
    } catch (error) {
      console.error('❌ KaitoApiClient初期化エラー:', error);
      // デフォルトクライアントを作成（エラー時でも動作継続）
      this.kaitoClient = new KaitoApiClient();
    }
  }
}