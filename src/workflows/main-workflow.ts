/**
 * Main Workflow - Simplified 3-step execution flow
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • 3ステップのメインワークフロー実行
 * • データ収集 → アクション実行 → 結果保存の制御
 * • 最小限のエラーハンドリング
 */

import { KaitoTwitterAPIClient } from '../kaito-api';
import { KaitoAPIConfigManager } from '../kaito-api/core/config';
import { DataManager } from '../shared/data-manager';
import { WORKFLOW_CONSTANTS, ActionType, WorkflowOptions, WorkflowResult, SystemContext } from './constants';
import { 
  executePostAction, 
  executeRetweetAction, 
  executeLikeAction, 
  executeQuoteTweetAction, 
  executeFollowAction, 
  executeAnalyzeAction,
  executeDeepNightAnalysis,
  saveAnalysisResults,
  WorkflowActions
} from './workflow-actions';
import { 
  collectKaitoData, 
  buildSystemContext,
  getDataManager,
  WorkflowHelpers
} from './workflow-helpers';


/**
 * MainWorkflow - MVP最小構成ワークフローエンジン
 */
export class MainWorkflow {
  private static dataManager: DataManager | null = null;
  private static kaitoClient: KaitoTwitterAPIClient;
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

      // スケジュール実行モードのみサポート
      if (!options?.scheduledAction) {
        console.error('❌ scheduledActionが必要です');
        console.error('📋 dev.tsから適切なアクションを指定してください');
        throw new Error('scheduledAction is required');
      }

      // 初回実行時にKaitoApiClientを初期化
      if (!this.kaitoClientInitialized) {
        await this.initializeKaitoClient();
        this.kaitoClientInitialized = true;
      }

      // 新規実行サイクル初期化の判定は後で行う（決定後に判定するため、仮のIDを設定）
      executionId = `temp-${Date.now()}`;

      // TODO: 深夜分析機能の実装待ち

      // ===============================
      // スケジュール実行モード（3ステップ）
      // ===============================
      console.log(`📅 スケジュール実行モード: ${options.scheduledAction}`);
      
      // ステップ1: データ収集
      console.log('📊 ステップ1: データ収集開始');
      const [profile, learningData] = await Promise.all([
        collectKaitoData(),
        getDataManager().loadLearningData()
      ]);
      console.log('✅ データ収集完了');

      // analyzeアクションの場合は特別処理（ステップ4で実行するため）
      let actionResult: any = { success: true, action: 'analyze' };
      let decision: any = {
        action: options.scheduledAction,
        parameters: {
          topic: options.scheduledTopic,
          query: options.scheduledQuery,
          reference_users: options.scheduledReferenceUsers
        },
        confidence: 1.0,
        reasoning: `スケジュール指定によるアクション: ${options.scheduledAction}`
      };
      
      if (options.scheduledAction !== 'analyze') {
        // ステップ2: アクション実行（スケジュール指定）
        console.log('⚡ ステップ2: アクション実行開始');
        
        // postまたはquote_tweetアクションの場合ディレクトリ作成
        if (decision.action === 'post' || decision.action === 'quote_tweet') {
          const realExecutionId = await getDataManager().initializeExecutionCycle();
          executionId = realExecutionId;
          console.log(`📋 実行サイクル開始: ${executionId}`);
        } else {
          // その他のアクションはディレクトリを作成しない
          console.log(`📋 ${decision.action}アクションのため、ディレクトリ作成をスキップ`);
        }
        
        // ステップ1で収集したデータを渡す
        actionResult = await this.executeAction(decision, { profile, learningData }, executionId);
        console.log('✅ アクション実行完了', { action: decision.action, success: actionResult.success });

        // ステップ3: 結果保存
        console.log('💾 ステップ3: 結果保存開始');
        await this.saveResults(decision, actionResult, options);
        console.log('✅ 結果保存完了');
      } else {
        // analyzeアクションの場合はステップ2,3をスキップ
        console.log('⏭️ analyzeアクションのため、ステップ2,3をスキップ');
      }

      const executionTime = Date.now() - startTime;
      
      // アクション詳細の表示
      let actionDetails = '';
      if (actionResult.success && actionResult.action === 'quote_tweet') {
        const contentPreview = actionResult.content?.substring(0, 100) || '';
        const targetPreview = actionResult.targetTweetText?.substring(0, 50) || '';
        actionDetails = ` - 引用投稿: "${contentPreview}${contentPreview.length >= 100 ? '...' : ''}" (引用元: "${targetPreview}${targetPreview.length >= 50 ? '...' : ''}")`;
      } else if (actionResult.success && actionResult.action === 'post') {
        const contentPreview = actionResult.content?.substring(0, 100) || '';
        actionDetails = ` - 投稿: "${contentPreview}${contentPreview.length >= 100 ? '...' : ''}"`;
      } else if (actionResult.success && actionResult.action === 'retweet') {
        const targetPreview = actionResult.targetTweetText?.substring(0, 50) || '';
        actionDetails = ` - リツイート: "${targetPreview}${targetPreview.length >= 50 ? '...' : ''}"`;
      } else if (actionResult.success && actionResult.action === 'like') {
        const targetPreview = actionResult.targetTweetText?.substring(0, 50) || '';
        actionDetails = ` - いいね: "${targetPreview}${targetPreview.length >= 50 ? '...' : ''}"`;
      }
      
      // Step 4: 深夜大規模分析（23:55のみ）
      if (options?.scheduledAction === 'analyze') {
        console.log('🌙 ステップ4: 深夜大規模分析開始');
        const deepAnalysisResult = await executeDeepNightAnalysis(executionId, { profile, learningData });
        console.log('✅ 深夜大規模分析完了');
        
        // 結果にdeepAnalysisを追加
        return {
          success: true,
          executionId,
          decision,
          actionResult,
          deepAnalysisResult,
          executionTime: Date.now() - startTime
        };
      }
      
      console.log(`🎉 スケジュール実行完了 (${executionTime}ms)${actionDetails}`);

      return {
        success: true,
        executionId,
        decision,
        actionResult,
        executionTime
      };

      // ===============================
      // 手動実行モード - 廃止済み
      // ===============================

      console.error('❌ 手動実行モードは廃止されました');
      console.error('📋 dev.tsから適切なアクションを指定してください:');
      console.error('  pnpm dev:post, pnpm dev:retweet, pnpm dev:like, pnpm dev:quote, pnpm dev:follow');
      console.error('📖 詳細: docs/workflow.md を参照');

      throw new Error('Manual execution mode is deprecated. Use scheduled action mode only.');

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error('❌ メインワークフロー実行エラー:', errorMessage);

      // エラー情報保存
      if (executionId!) {
        try {
          // エラー情報は基本的なログ出力のみ
          console.error('❌ ワークフローエラー詳細:', {
            error: errorMessage,
            executionTime,
            timestamp: new Date().toISOString()
          });
        } catch (logError) {
          console.error('❌ ログ出力失敗:', logError);
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
   * アクション実行の振り分け（オーケストレーション）
   * 各アクションタイプを適切な実行関数に振り分けて実行
   */
  private static async executeAction(decision: any, collectedData?: { profile: any, learningData: any }, executionId?: string): Promise<any> {
    try {
      console.log(`⚡ アクション実行: ${decision.action}`);
      
      switch (decision.action) {
        case 'post':
          return await executePostAction(decision, collectedData, executionId);
          
        case 'retweet':
          return await executeRetweetAction(decision, executionId);
          
        case 'like':
          return await executeLikeAction(decision, collectedData, executionId);
          
        case 'quote_tweet':
          return await executeQuoteTweetAction(decision, executionId);
          
        case 'follow':
          return await executeFollowAction(decision);
          
        case 'analyze':
          return await executeAnalyzeAction(decision, collectedData);
          
        default:
          console.error(`❌ 未対応のアクション: ${decision.action}`);
          throw new Error(`Unknown action type: ${decision.action}`);
      }
      
    } catch (error) {
      console.error(`❌ アクション実行エラー (${decision.action}):`, error);
      throw error;
    }
  }

  /**
   * 結果保存（post/quote_tweetアクションのみ）
   */
  private static async saveResults(decision: any, actionResult: any, options?: any): Promise<void> {
    try {
      // postまたはquote_tweetアクションのみファイル保存
      if (decision.action === 'post' || decision.action === 'quote_tweet') {
        await getDataManager().savePost({
          actionType: decision.action,
          content: actionResult.content,
          targetTweetId: actionResult.targetTweetId || actionResult.targetTweet || actionResult.tweetId,
          result: actionResult.result || {
            success: actionResult.success || false,
            message: actionResult.message || '',
            data: actionResult.data || {}
          },
          engagement: actionResult.engagement || {
            likes: 0,
            retweets: 0,
            replies: 0,
            quotes: 0,
            impressions: 0,
            bookmarks: 0
          },
          claudeSelection: actionResult.claudeSelection
        });

        console.log('✅ 結果保存完了（post.yaml統合形式）');
      } else {
        console.log(`⏭️ ${decision.action}アクションのため、ファイル保存をスキップ`);
      }
    } catch (error) {
      console.error('❌ 結果保存失敗:', error);
      throw error;
    }
  }


  /**
   * スケジュールデータの読み込みとreference_usersパラメータの検証
   */
  private static async loadScheduleData(): Promise<any> {
    try {
      const scheduleData = await getDataManager().loadSchedule();
      
      // reference_usersパラメータの検証を追加
      if (scheduleData.daily_schedule) {
        scheduleData.daily_schedule.forEach((task: any, index: number) => {
          if (task.reference_users && !Array.isArray(task.reference_users)) {
            console.warn(`⚠️ スケジュール[${index}]: reference_usersは配列である必要があります`);
            task.reference_users = [];
          }
        });
      }
      
      return scheduleData;
    } catch (error) {
      console.error('❌ スケジュールデータ読み込みエラー:', error);
      throw error;
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
      this.kaitoClient = new KaitoTwitterAPIClient();
      
      // 重要: initializeWithConfigを呼んでhttpClientを初期化
      this.kaitoClient.initializeWithConfig(apiConfig);
      
      // 新しいファイルのクラスにもKaitoClientを設定
      WorkflowActions.setKaitoClient(this.kaitoClient);
      WorkflowHelpers.setKaitoClient(this.kaitoClient);
      
      console.log('✅ KaitoApiClient初期化完了');
    } catch (error) {
      console.error('❌ KaitoApiClient初期化エラー:', error);
      console.log('🔧 フォールバック設定でクライアントを初期化中...');
      
      try {
        // デフォルトクライアントを作成
        this.kaitoClient = new KaitoTwitterAPIClient();
        
        // ⭐ 修正点: エラー時でもデフォルト設定で初期化
        const fallbackConfig = {
          apiKey: process.env.KAITO_API_TOKEN || '',
          baseUrl: 'https://api.twitterapi.io',
          timeout: 10000,
          environment: 'development' as const,
          api: {
            baseUrl: 'https://api.twitterapi.io',
            timeout: 10000
          },
          authentication: {
            type: 'apikey' as const,
            primaryKey: process.env.KAITO_API_TOKEN || ''
          },
          proxy: {
            enabled: false,
            urls: []
          }
        };
        
        this.kaitoClient.initializeWithConfig(fallbackConfig);
        
        // 新しいファイルのクラスにも設定
        WorkflowActions.setKaitoClient(this.kaitoClient);
        WorkflowHelpers.setKaitoClient(this.kaitoClient);
        
        console.log('✅ フォールバック設定での初期化完了');
      } catch (fallbackError) {
        console.error('❌ フォールバック初期化も失敗:', fallbackError);
        throw new Error(`KaitoAPI初期化が完全に失敗しました: ${fallbackError}`);
      }
    }
  }


}