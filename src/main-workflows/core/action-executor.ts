import { systemLogger } from '../../shared/logger';
import { ComponentContainer, COMPONENT_KEYS } from '../../shared/component-container';
import { DataManager } from '../../data/data-manager';
import { KaitoApiClient } from '../../kaito-api';
import { TweetEndpoints } from '../../kaito-api/endpoints/tweet-endpoints';
import { ActionEndpoints } from '../../kaito-api/endpoints/action-endpoints';
import { AuthManager } from '../../kaito-api/core/auth-manager';
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
      
      // AuthManager取得・ログイン状態確認
      const authManager = this.container.has('AUTH_MANAGER') 
        ? this.container.get<AuthManager>('AUTH_MANAGER') 
        : undefined;
      
      if (authManager) {
        WorkflowLogger.logInfo('🔐 投稿前ログイン状態確認中...');
        
        if (!authManager.isUserSessionValid()) {
          WorkflowLogger.logInfo('⚠️ セッション期限切れ - 再ログイン実行中...');
          
          // リトライ機構付きログイン実行
          let loginAttempts = 0;
          const maxLoginAttempts = 2;
          let loginResult;
          
          while (loginAttempts < maxLoginAttempts) {
            loginAttempts++;
            WorkflowLogger.logInfo(`🔄 投稿前ログイン試行 ${loginAttempts}/${maxLoginAttempts}`);
            
            loginResult = await authManager.login();
            if (loginResult.success) {
              WorkflowLogger.logInfo(`✅ 投稿前再ログイン成功 (試行${loginAttempts})`);
              break;
            }
            
            WorkflowLogger.logError(`❌ 投稿前ログイン試行 ${loginAttempts} 失敗:`, loginResult.error);
            
            if (loginAttempts < maxLoginAttempts) {
              const retryDelay = 3000; // 3秒の遅延
              WorkflowLogger.logInfo(`⏱️ ${retryDelay/1000}秒後に再試行...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
          
          if (!loginResult?.success) {
            const errorMsg = `投稿前全ログイン試行失敗 (${maxLoginAttempts}回): ${loginResult?.error}`;
            WorkflowLogger.logError('❌ 投稿実行不可 - ログイン認証エラー', {
              attempts: maxLoginAttempts,
              lastError: loginResult?.error,
              impact: '投稿スキップ、次回実行時に再試行'
            });
            throw new Error(errorMsg);
          }
        } else {
          WorkflowLogger.logInfo('✅ セッション有効 - 投稿実行継続');
        }
      }

      // KaitoAPI実投稿実行
      WorkflowLogger.logInfo('📝 実際の投稿を実行中...');
      const kaitoClient = this.container.get<KaitoApiClient>(COMPONENT_KEYS.KAITO_CLIENT);
      
      let postResult;
      try {
        postResult = await kaitoClient.post(content.content);
        
        if (!postResult) {
          throw new Error('投稿APIから無効なレスポンス');
        }
        
        if (!postResult.success) {
          throw new Error(postResult.error || '投稿実行が失敗しました');
        }
        
        WorkflowLogger.logInfo('✅ 投稿実行成功', {
          tweetId: postResult.id,
          content: content.content.substring(0, 50) + '...'
        });
        
      } catch (postError) {
        WorkflowLogger.logError('❌ 投稿実行エラー', {
          error: postError instanceof Error ? postError.message : 'Unknown error',
          content: content.content.substring(0, 50) + '...',
          authStatus: authManager ? authManager.isUserSessionValid() : 'no_auth_manager'
        });
        
        // 投稿エラー情報をデータマネージャーに保存
        await dataManager.saveKaitoResponse('post-error', {
          error: postError instanceof Error ? postError.message : 'Unknown error',
          content: content.content,
          timestamp: new Date().toISOString(),
          authValid: authManager?.isUserSessionValid() || false
        });
        
        throw postError;
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
      
      // AuthManager取得・ログイン状態確認
      const authManager = this.container.has('AUTH_MANAGER') 
        ? this.container.get<AuthManager>('AUTH_MANAGER') 
        : undefined;
      
      if (authManager && !authManager.isUserSessionValid()) {
        systemLogger.info('⚠️ リツイート前再ログイン実行中...');
        const loginResult = await authManager.login();
        
        if (!loginResult.success) {
          throw new Error(`リツイート前再ログイン失敗: ${loginResult.error}`);
        }
        
        systemLogger.info('✅ リツイート前再ログイン成功');
      }
      
      // 検索実行とリツイート
      const tweetEndpoints = this.container.get<TweetEndpoints>(COMPONENT_KEYS.SEARCH_ENGINE);
      const searchResult = await tweetEndpoints.searchTweets({ query: searchQuery.query });
      
      if (searchResult && searchResult.tweets && searchResult.tweets.length > 0) {
        const actionEndpoints = this.container.get<ActionEndpoints>(COMPONENT_KEYS.ACTION_EXECUTOR);
        const retweetResult = await actionEndpoints.retweet(searchResult.tweets[0].id);
        
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
        
        // AuthManager取得・ログイン状態確認
        const authManager = this.container.has('AUTH_MANAGER') 
          ? this.container.get<AuthManager>('AUTH_MANAGER') 
          : undefined;
        
        if (authManager && !authManager.isUserSessionValid()) {
          systemLogger.info('⚠️ 引用ツイート前再ログイン実行中...');
          const loginResult = await authManager.login();
          
          if (!loginResult.success) {
            throw new Error(`引用ツイート前再ログイン失敗: ${loginResult.error}`);
          }
          
          systemLogger.info('✅ 引用ツイート前再ログイン成功');
        }
        
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
      
      // AuthManager取得・ログイン状態確認
      const authManager = this.container.has('AUTH_MANAGER') 
        ? this.container.get<AuthManager>('AUTH_MANAGER') 
        : undefined;
      
      if (authManager && !authManager.isUserSessionValid()) {
        systemLogger.info('⚠️ いいね前再ログイン実行中...');
        const loginResult = await authManager.login();
        
        if (!loginResult.success) {
          throw new Error(`いいね前再ログイン失敗: ${loginResult.error}`);
        }
        
        systemLogger.info('✅ いいね前再ログイン成功');
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