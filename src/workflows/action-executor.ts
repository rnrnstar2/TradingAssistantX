/**
 * Simplified Action Executor - MVP版
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • 基本的なアクション実行機能
 * • MainWorkflowクラスからの使用に最適化
 * • 不要な複雑性を除去
 */

import { KaitoApiClient } from '../kaito-api';
import { generateContent } from '../claude';
import { DataManager } from '../data/data-manager';
import { WORKFLOW_CONSTANTS, ActionType } from './constants';

// 基本型定義
interface ActionResult {
  success: boolean;
  action: ActionType;
  timestamp: string;
  executionTime?: number;
  result?: any;
  error?: string;
}

interface ClaudeDecision {
  action: ActionType;
  parameters: {
    topic?: string;
    searchQuery?: string;
    targetTweetId?: string;
    duration?: number;
  };
  reasoning: string;
  confidence: number;
}

/**
 * 簡素化されたアクション実行クラス
 * スケジューラー関連の依存を削除し、MainWorkflowからの直接使用に最適化
 */
export class ActionExecutor {
  private kaitoClient: KaitoApiClient;
  private dataManager: DataManager;

  constructor(kaitoClient: KaitoApiClient, dataManager: DataManager) {
    this.kaitoClient = kaitoClient;
    this.dataManager = dataManager;
  }

  /**
   * メインアクション実行メソッド
   * MainWorkflowから呼び出される
   */
  async executeAction(decision: ClaudeDecision): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      console.log(`⚡ アクション実行開始: ${decision.action}`);

      let result: ActionResult;

      switch (decision.action) {
        case WORKFLOW_CONSTANTS.ACTIONS.POST:
          result = await this.executePost(decision);
          break;

        case WORKFLOW_CONSTANTS.ACTIONS.RETWEET:
          result = await this.executeRetweet(decision);
          break;

        case WORKFLOW_CONSTANTS.ACTIONS.LIKE:
          result = await this.executeLike(decision);
          break;

        case WORKFLOW_CONSTANTS.ACTIONS.WAIT:
          result = await this.executeWait(decision);
          break;

        default:
          throw new Error(`未対応のアクション: ${decision.action}`);
      }

      result.executionTime = Date.now() - startTime;
      console.log(`✅ アクション実行完了: ${decision.action} (${result.executionTime}ms)`);

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`❌ アクション実行エラー [${decision.action}]:`, errorMessage);

      return {
        success: false,
        action: decision.action,
        timestamp: new Date().toISOString(),
        executionTime,
        error: errorMessage
      };
    }
  }

  /**
   * 投稿アクション実行
   */
  private async executePost(decision: ClaudeDecision): Promise<ActionResult> {
    try {
      // コンテンツ生成
      const content = await generateContent({
        request: {
          topic: decision.parameters.topic || 'investment',
          contentType: 'educational',
          targetAudience: 'beginner'
        }
      });

      if (!content?.content) {
        throw new Error(WORKFLOW_CONSTANTS.ERROR_MESSAGES.CLAUDE_CONTENT_GENERATION_FAILED);
      }

      // 投稿実行
      const postResult = await this.kaitoClient.post(content.content);

      if (!postResult?.success) {
        throw new Error(postResult?.error || '投稿実行失敗');
      }

      // 結果保存
      await this.dataManager.savePost({
        content: content.content,
        result: postResult,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.POST,
        timestamp: new Date().toISOString(),
        result: {
          content: content.content,
          postId: postResult.id
        }
      };

    } catch (error) {
      throw new Error(`投稿実行エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * リツイートアクション実行
   */
  private async executeRetweet(decision: ClaudeDecision): Promise<ActionResult> {
    try {
      const targetTweetId = decision.parameters.targetTweetId;
      
      if (!targetTweetId) {
        throw new Error('リツイート対象のツイートIDが指定されていません');
      }

      // リツイート実行
      const retweetResult = await this.kaitoClient.retweet(targetTweetId);

      if (!retweetResult?.success) {
        throw new Error(retweetResult?.error || 'リツイート実行失敗');
      }

      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.RETWEET,
        timestamp: new Date().toISOString(),
        result: {
          originalTweetId: targetTweetId,
          retweetId: retweetResult.id
        }
      };

    } catch (error) {
      throw new Error(`リツイート実行エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * いいねアクション実行
   */
  private async executeLike(decision: ClaudeDecision): Promise<ActionResult> {
    try {
      const targetTweetId = decision.parameters.targetTweetId;
      
      if (!targetTweetId) {
        throw new Error('いいね対象のツイートIDが指定されていません');
      }

      // いいね実行
      const likeResult = await this.kaitoClient.like(targetTweetId);

      if (!likeResult?.success) {
        throw new Error(likeResult?.error || 'いいね実行失敗');
      }

      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.LIKE,
        timestamp: new Date().toISOString(),
        result: {
          likedTweetId: targetTweetId
        }
      };

    } catch (error) {
      throw new Error(`いいね実行エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 待機アクション実行
   */
  private async executeWait(decision: ClaudeDecision): Promise<ActionResult> {
    const duration = decision.parameters.duration || 30; // デフォルト30分

    console.log(`⏳ 待機アクション: ${duration}分間待機`);

    return {
      success: true,
      action: WORKFLOW_CONSTANTS.ACTIONS.WAIT,
      timestamp: new Date().toISOString(),
      result: {
        waitDuration: duration,
        nextExecution: new Date(Date.now() + duration * 60 * 1000).toISOString()
      }
    };
  }
}