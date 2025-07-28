import { systemLogger } from '../../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../../shared/component-container';
import { DataManager } from '../../data/data-manager';
import { KaitoApiClient } from '../../kaito-api';
import { ClaudeDecision, ActionResult } from '../../shared/types';

// 最適化されたユーティリティクラス
import { CommonErrorHandler } from './common-error-handler';
import { TypeGuards } from './type-guards';
import { WorkflowLogger } from './workflow-logger';
import { WORKFLOW_CONSTANTS } from './workflow-constants';

// エンドポイント別Claude SDK
import { generateContent, generateSearchQuery } from '../../claude';
import type { GeneratedContent, SearchQuery } from '../../claude/types';

/**
 * ActionExecutor - アクション実行機能
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 クラスの責任範囲:
 * • Claude決定に基づくアクション実行
 * • 各種アクション（投稿・リツイート・引用ツイート・いいね）の処理
 * • コンテンツ生成エンドポイントとの連携
 * • データ保存フックによる実行結果記録
 * 
 * 🔄 主要機能:
 * • executeAction: メインアクション実行制御
 * • executePostAction: 投稿アクション（コンテンツ生成使用）
 * • executeRetweetAction: リツイートアクション（検索クエリ生成使用）
 * • executeQuoteTweetAction: 引用ツイートアクション
 * • executeLikeAction: いいねアクション
 * • normalizeActionResult: アクション結果の正規化
 */
export class ActionExecutor {
  private container: ComponentContainer;

  constructor(container: ComponentContainer) {
    this.container = container;
  }

  /**
   * アクション実行 - エンドポイント別設計版
   * Claude決定に基づいてアクションを実行し、結果を返す
   */
  async executeAction(decision: ClaudeDecision, dataManager: DataManager): Promise<ActionResult> {
    if (!TypeGuards.isValidClaudeDecision(decision)) {
      throw new Error('無効なClaude決定が提供されました');
    }

    try {
      WorkflowLogger.logInfo(`アクション実行開始: ${decision.action}`);
      
      switch (decision.action) {
        case WORKFLOW_CONSTANTS.ACTIONS.POST:
          return await this.executePostAction(decision, dataManager);
          
        case WORKFLOW_CONSTANTS.ACTIONS.RETWEET:
          return await this.executeRetweetAction(decision, dataManager);
          
        case WORKFLOW_CONSTANTS.ACTIONS.QUOTE_TWEET:
          return await this.executeQuoteTweetAction(decision, dataManager);
          
        case WORKFLOW_CONSTANTS.ACTIONS.LIKE:
          return await this.executeLikeAction(decision, dataManager);
          
        case WORKFLOW_CONSTANTS.ACTIONS.WAIT:
          return { 
            success: true, 
            action: WORKFLOW_CONSTANTS.ACTIONS.WAIT, 
            timestamp: new Date().toISOString(),
            executionTime: 0
          };
          
        default:
          throw new Error(`未知のアクション: ${decision.action}`);
      }
      
    } catch (error) {
      WorkflowLogger.logError(`アクション実行エラー [${decision.action}]`, error);
      
      // エラー時も部分的な結果を保存
      await CommonErrorHandler.handleAsyncOperation(
        () => dataManager.saveKaitoResponse('action-error', {
          action: decision.action,
          error: CommonErrorHandler.extractErrorMessage(error),
          timestamp: new Date().toISOString()
        }),
        'エラー情報保存'
      );
      
      throw error;
    }
  }

  /**
   * 投稿アクション実行 - コンテンツ生成エンドポイント使用
   */
  private async executePostAction(decision: ClaudeDecision, dataManager: DataManager): Promise<ActionResult> {
    const result = await WorkflowLogger.logTimedOperation(async () => {
      // コンテンツ生成エンドポイント使用
      const content: GeneratedContent = await CommonErrorHandler.handleAsyncOperation(
        () => generateContent({
          request: {
            topic: decision.parameters.topic || WORKFLOW_CONSTANTS.DEFAULTS.TARGET_AUDIENCE,
            contentType: WORKFLOW_CONSTANTS.DEFAULTS.CONTENT_TYPE,
            targetAudience: WORKFLOW_CONSTANTS.DEFAULTS.TARGET_AUDIENCE
          }
        }),
        'コンテンツ生成'
      ) as GeneratedContent;
      
      if (!TypeGuards.isNonNullObject(content) || !TypeGuards.isNonEmptyString(content.content)) {
        throw new Error(WORKFLOW_CONSTANTS.ERROR_MESSAGES.CLAUDE_CONTENT_GENERATION_FAILED);
      }
      
      // データ保存フック: コンテンツ生成後
      await dataManager.saveClaudeOutput('content', content);
      WorkflowLogger.logDataSave('生成コンテンツ', 'current/content');
      
      WorkflowLogger.logInfo(`生成コンテンツ: "${content.content.substring(0, 50)}..."`);
      
      // KaitoAPI呼び出し
      const kaitoClient = this.container.get<KaitoApiClient>(COMPONENT_KEYS.KAITO_CLIENT);
      let postResult;
      
      try {
        postResult = await kaitoClient.post(content.content);
      } catch (error) {
        // 開発環境用フォールバック
        if (!process.env.KAITO_API_TOKEN) {
          systemLogger.warn('⚠️ 開発環境: 投稿APIモック使用');
          postResult = {
            id: `dev_${Date.now()}`,
            text: content.content,
            createdAt: new Date().toISOString(),
            success: true
          };
        } else {
          throw error;
        }
      }
      
      if (!postResult) {
        throw new Error('投稿実行に失敗しました');
      }
      
      // データ保存フック: KaitoAPI応答後
      await dataManager.saveKaitoResponse('post-result', postResult);
      WorkflowLogger.logDataSave('投稿結果', 'current/post-result');
      
      // データ保存フック: 投稿作成後
      const postData = {
        content: content.content,
        result: postResult,
        timestamp: new Date().toISOString()
      };
      await dataManager.savePost(postData);
      WorkflowLogger.logDataSave('投稿データ', 'current/post-data');
      
      return this.normalizeActionResult(postResult, decision.action);
    }, '投稿アクション実行');

    return result;
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
      const kaitoClient = this.container.get<KaitoApiClient>(COMPONENT_KEYS.KAITO_CLIENT);
      const searchResult = await kaitoClient.searchTweets(searchQuery.query);
      
      if (searchResult && searchResult.data && searchResult.data.length > 0) {
        const retweetResult = await kaitoClient.retweet(searchResult.data[0].id);
        
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
}