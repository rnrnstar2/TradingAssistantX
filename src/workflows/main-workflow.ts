/**
 * Main Workflow - Simplified 4-step execution flow
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • 4ステップのメインワークフロー実行
 * • データ収集 → Claude判断 → アクション実行 → 結果保存の制御
 * • 最小限のエラーハンドリング
 */

import { KaitoApiClient } from '../kaito-api';
import { makeDecision, generateContent } from '../claude';
import { DataManager } from '../data/data-manager';
import { WORKFLOW_CONSTANTS, ActionType } from './constants';

// 型定義
interface WorkflowOptions {
  scheduledAction?: string;
  scheduledTopic?: string;
  scheduledQuery?: string;
}

interface WorkflowResult {
  success: boolean;
  executionId: string;
  decision: any;
  actionResult?: any;
  error?: string;
  executionTime: number;
}

interface SystemContext {
  account: {
    followerCount: number;
    lastPostTime?: string;
    postsToday: number;
    engagementRate: number;
    accountHealth?: any;
  };
  system: {
    health: {
      all_systems_operational: boolean;
      api_status: 'healthy' | 'degraded' | 'error';
      rate_limits_ok: boolean;
    };
    executionCount: { today: number; total: number };
  };
  market: {
    trendingTopics: string[];
    volatility: 'low' | 'medium' | 'high';
    sentiment: 'bearish' | 'neutral' | 'bullish';
  };
}

/**
 * MainWorkflow - MVP最小構成ワークフローエンジン
 */
export class MainWorkflow {
  private static dataManager = new DataManager();
  private static kaitoClient = new KaitoApiClient();

  /**
   * 4ステップのメインワークフロー実行
   * 
   * ステップ1: データ収集（Kaito API + 学習データ）
   * ステップ2: アクション決定（Claude）
   * ステップ3: アクション実行（Kaito API）
   * ステップ4: 結果保存（data/）
   */
  static async execute(options?: WorkflowOptions): Promise<WorkflowResult> {
    const startTime = Date.now();
    let executionId: string;

    try {
      console.log('🚀 メインワークフロー実行開始');

      // 新規実行サイクル初期化
      executionId = await this.dataManager.initializeExecutionCycle();
      console.log(`📋 実行サイクル開始: ${executionId}`);

      // ===============================
      // ステップ1: データ収集
      // ===============================
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

      // ===============================
      // ステップ2: アクション決定（Claude）
      // ===============================
      console.log('🧠 ステップ2: Claude判断開始');

      // スケジュール指定がある場合は、それを優先
      let decision;
      if (options?.scheduledAction) {
        console.log(`📅 スケジュール指定アクション: ${options.scheduledAction}`);
        decision = {
          action: options.scheduledAction,
          parameters: {
            topic: options.scheduledTopic,
            query: options.scheduledQuery
          },
          confidence: 1.0,
          reasoning: `スケジュール指定によるアクション: ${options.scheduledAction}`
        };
      } else {
        decision = await makeDecision({
          context: this.buildSystemContext(profile, currentStatus),
          learningData,
          currentTime: new Date()
        });
      }

      if (!decision) {
        throw new Error(WORKFLOW_CONSTANTS.ERROR_MESSAGES.CLAUDE_DECISION_FAILED);
      }

      // Claude出力保存
      await this.dataManager.saveClaudeOutput('decision', decision);
      console.log('✅ Claude判断完了', { action: decision.action, confidence: decision.confidence });

      // ===============================
      // ステップ3: アクション実行
      // ===============================
      console.log('⚡ ステップ3: アクション実行開始');

      const actionResult = await this.executeAction(decision);
      console.log('✅ アクション実行完了', { action: decision.action, success: actionResult.success });

      // ===============================
      // ステップ4: 結果保存
      // ===============================
      console.log('💾 ステップ4: 結果保存開始');

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

      case 'quote_tweet':
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
          contentType: 'commentary',
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
        action: 'quote_tweet',
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
}