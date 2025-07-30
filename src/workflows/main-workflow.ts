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
import { generateContent, selectOptimalTweet, convertTweetDataToCandidate } from '../claude';
import { type SelectedTweet, type TweetSelectionParams, type TweetCandidate, type AccountInfo } from '../claude/types';
import { DataManager } from '../shared/data-manager';
import { WORKFLOW_CONSTANTS, ActionType, WorkflowOptions, WorkflowResult, SystemContext } from './constants';


/**
 * MainWorkflow - MVP最小構成ワークフローエンジン
 */
export class MainWorkflow {
  private static dataManager: DataManager | null = null;
  private static kaitoClient: KaitoTwitterAPIClient;
  private static kaitoClientInitialized = false;

  /**
   * DataManagerのインスタンスを取得（遅延初期化）
   */
  private static getDataManager(): DataManager {
    if (!this.dataManager) {
      this.dataManager = new DataManager();
    }
    return this.dataManager;
  }

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
      executionId = await this.getDataManager().initializeExecutionCycle();
      console.log(`📋 実行サイクル開始: ${executionId}`);

      // 現在時刻の取得と深夜分析判定
      const currentTime = new Date();
      const timeString = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
      const isDeepNightAnalysisTime = timeString === '23:55';
      
      if (isDeepNightAnalysisTime) {
        console.log('🌙 深夜大規模分析時刻を検出: Step 4実行モード');
      }

      // ===============================
      // スケジュール実行モード（3ステップ）
      // ===============================
      if (options?.scheduledAction) {
        console.log(`📅 スケジュール実行モード: ${options.scheduledAction}`);
        
        // ステップ1: データ収集
        console.log('📊 ステップ1: データ収集開始');
        const [profile, learningData, currentStatus] = await Promise.all([
          this.collectKaitoData(),
          this.getDataManager().loadLearningData(),
          this.getDataManager().loadCurrentStatus()
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
        
        // ステップ1で収集したデータを渡す
        const actionResult = await this.executeAction(decision, { profile, learningData, currentStatus });
        console.log('✅ アクション実行完了', { action: decision.action, success: actionResult.success });

        // ステップ3: 結果保存
        console.log('💾 ステップ3: 結果保存開始');
        await this.saveResults(decision, actionResult);
        console.log('✅ 結果保存完了');

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
        if (isDeepNightAnalysisTime) {
          console.log('🌙 Step 4: 深夜大規模分析開始');
          try {
            const analysisResult = await this.executeDeepNightAnalysis(executionId);
            console.log('✅ Step 4: 深夜大規模分析完了');
            
            console.log(`🎉 スケジュール実行完了 (${executionTime}ms)${actionDetails}`);
            
            // 結果にanalysisResultを追加
            return {
              success: true,
              executionId,
              decision,
              actionResult,
              deepNightAnalysis: analysisResult, // 新規追加
              executionTime
            };
          } catch (analysisError) {
            // 深夜分析エラーは警告として扱い、ワークフローは継続
            console.warn('⚠️ 深夜大規模分析でエラーが発生しましたが、ワークフローは継続します:', analysisError);
            
            console.log(`🎉 スケジュール実行完了 (${executionTime}ms)${actionDetails}`);
            
            return {
              success: true, // ワークフロー全体は成功扱い
              executionId,
              decision,
              actionResult,
              deepNightAnalysis: {
                success: false,
                error: analysisError instanceof Error ? analysisError.message : String(analysisError),
                analysisTime: 0,
                insights: 0,
                opportunities: 0,
                strategies: 0,
                confidence: 0,
                filesGenerated: []
              },
              executionTime
            };
          }
        }
        
        console.log(`🎉 スケジュール実行完了 (${executionTime}ms)${actionDetails}`);

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
        this.getDataManager().loadLearningData(),
        this.getDataManager().loadCurrentStatus()
      ]);

      console.log('✅ データ収集完了', {
        profile: !!profile,
        followers: profile?.followersCount || profile?.followers || 0,
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
      await this.getDataManager().saveClaudeOutput('decision', decision);
      console.log('✅ 固定アクション設定完了', { action: decision.action, confidence: decision.confidence });

      // ステップ1で収集したデータを渡す
      const actionResult = await this.executeAction(decision, { profile, learningData, currentStatus });
      console.log('✅ アクション実行完了', { action: decision.action, success: actionResult.success });

      // ステップ3: 結果保存
      console.log('💾 ステップ3: 結果保存開始');

      await this.saveResults(decision, actionResult);
      console.log('✅ 結果保存完了');

      // 実行完了
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
      if (isDeepNightAnalysisTime) {
        console.log('🌙 Step 4: 深夜大規模分析開始');
        try {
          const analysisResult = await this.executeDeepNightAnalysis(executionId);
          console.log('✅ Step 4: 深夜大規模分析完了');
          
          console.log(`🎉 メインワークフロー実行完了 (${executionTime}ms)${actionDetails}`);

          // 結果にanalysisResultを追加
          return {
            success: true,
            executionId,
            decision,
            actionResult,
            deepNightAnalysis: analysisResult, // 新規追加
            executionTime
          };
        } catch (analysisError) {
          // 深夜分析エラーは警告として扱い、ワークフローは継続
          console.warn('⚠️ 深夜大規模分析でエラーが発生しましたが、ワークフローは継続します:', analysisError);
          
          console.log(`🎉 メインワークフロー実行完了 (${executionTime}ms)${actionDetails}`);
          
          return {
            success: true, // ワークフロー全体は成功扱い
            executionId,
            decision,
            actionResult,
            deepNightAnalysis: {
              success: false,
              error: analysisError instanceof Error ? analysisError.message : String(analysisError),
              analysisTime: 0,
              insights: 0,
              opportunities: 0,
              strategies: 0,
              confidence: 0,
              filesGenerated: []
            },
            executionTime
          };
        }
      }
      
      console.log(`🎉 メインワークフロー実行完了 (${executionTime}ms)${actionDetails}`);

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
          await this.getDataManager().saveKaitoResponse('workflow-error', {
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
   * アカウント情報取得後、current-status.yamlを自動更新
   */
  private static async collectKaitoData(): Promise<any> {
    try {
      const profile = await this.kaitoClient.getAccountInfo();
      
      // 取得したアカウント情報でcurrent-status.yamlを自動更新
      try {
        await this.getDataManager().updateAccountStatus(profile);
        console.log('✅ アカウント情報でcurrent-status.yaml更新完了');
      } catch (updateError) {
        console.warn('⚠️ current-status.yaml更新失敗:', updateError);
        // 更新エラーがあっても処理継続
      }
      
      return profile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev') {
        if (errorMessage.includes('Authentication failed') || errorMessage.includes('Login failed')) {
          console.log('🔧 開発モード: 認証エラーのため模擬アカウント情報を使用');
        } else {
          console.warn('⚠️ Kaitoデータ収集でエラー、デフォルト値使用:', error);
        }
      } else {
        console.warn('⚠️ Kaitoデータ収集でエラー、デフォルト値使用:', error);
      }
      
      // エラー時のデフォルト値（デフォルト値でもcurrent-status.yamlを更新）
      const fallbackProfile = {
        followers: 100,
        following: 50,
        tweets_today: 0
      };
      
      try {
        await this.getDataManager().updateAccountStatus(fallbackProfile);
        console.log('✅ デフォルト値でcurrent-status.yaml更新完了');
      } catch (updateError) {
        console.warn('⚠️ デフォルト値でのcurrent-status.yaml更新失敗:', updateError);
      }
      
      return fallbackProfile;
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
   * AccountInfo → TweetSelection用のProfile変換
   */
  private static convertAccountInfoToProfile(accountInfo: any): AccountInfo {
    return {
      followerCount: accountInfo.followers_count || accountInfo.followersCount || accountInfo.followers || 0,
      postsToday: accountInfo.statuses_count || accountInfo.tweetsCount || 0,
      engagementRate: this.calculateEngagementRate(accountInfo),
      lastPostTime: accountInfo.status?.created_at
    };
  }

  /**
   * エンゲージメント率の簡易計算
   */
  private static calculateEngagementRate(accountInfo: any): number {
    // 実装: フォロワー数とツイート数から概算
    const followers = accountInfo.followers_count || accountInfo.followersCount || accountInfo.followers || 1;
    const tweets = accountInfo.statuses_count || accountInfo.tweetsCount || 1;
    return Math.min((followers / tweets) * 0.1, 10); // 0-10%の範囲
  }

  /**
   * アクション実行（switch文での分岐）
   */
  private static async executeAction(decision: any, collectedData?: { profile: any, learningData: any, currentStatus: any }): Promise<any> {
    const action = decision.action as ActionType;

    switch (action) {
      case WORKFLOW_CONSTANTS.ACTIONS.POST:
        return await this.executePostAction(decision, collectedData);

      case WORKFLOW_CONSTANTS.ACTIONS.RETWEET:
        return await this.executeRetweetAction(decision);

      case WORKFLOW_CONSTANTS.ACTIONS.LIKE:
        return await this.executeLikeAction(decision, collectedData);

      case WORKFLOW_CONSTANTS.ACTIONS.QUOTE_TWEET:
        return await this.executeQuoteTweetAction(decision);

      case WORKFLOW_CONSTANTS.ACTIONS.FOLLOW:
        return await this.executeFollowAction(decision);

      case WORKFLOW_CONSTANTS.ACTIONS.ANALYZE:
        return await this.executeAnalyzeAction(decision, collectedData);

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
  private static async executePostAction(decision: any, collectedData?: { profile: any, learningData: any, currentStatus: any }): Promise<any> {
    try {
      // コンテキスト情報の使用（既に収集済みの場合は再利用）
      let profile, learningData, currentStatus;
      
      if (collectedData) {
        ({ profile, learningData, currentStatus } = collectedData);
      } else {
        // 収集されていない場合のみ取得
        [profile, learningData, currentStatus] = await Promise.all([
          this.collectKaitoData(),
          this.getDataManager().loadLearningData(),
          this.getDataManager().loadCurrentStatus()
        ]);
      }

      // システムコンテキストの構築
      const systemContext = this.buildSystemContext(profile, currentStatus);
      
      // 学習データから追加情報を抽出
      const recentPatterns = learningData.decisionPatterns?.slice(-5) || [];
      const successfulTopics = recentPatterns
        .filter((p: any) => p.result?.success && p.result?.engagement_rate > 3)
        .map((p: any) => p.context?.topic || p.decision?.topic)
        .filter(Boolean) as string[];
      
      // 時間帯情報を追加
      systemContext.timestamp = new Date().toISOString();
      systemContext.learningData = {
        recentTopics: [...new Set(successfulTopics)].slice(0, 3),
        totalPatterns: learningData.decisionPatterns?.length || 0,
        avgEngagement: recentPatterns.reduce((sum: number, p: any) => 
          sum + (p.result?.engagement_rate || 0), 0) / (recentPatterns.length || 1)
      };

      // コンテンツ生成
      const content = await generateContent({
        request: {
          topic: decision.parameters?.topic || 'investment',
          contentType: 'educational',
          targetAudience: 'beginner'
        },
        context: systemContext  // コンテキストを渡す
      });

      if (!content?.content) {
        throw new Error(WORKFLOW_CONSTANTS.ERROR_MESSAGES.CLAUDE_CONTENT_GENERATION_FAILED);
      }

      // コンテンツ保存
      await this.getDataManager().saveClaudeOutput('content', content);

      // 投稿実行
      const postResult = await this.kaitoClient.post(content.content);

      if (!postResult?.success) {
        const errorMessage = typeof postResult?.error === 'string' 
          ? postResult.error 
          : postResult?.error?.message || '投稿実行失敗';
        throw new Error(errorMessage);
      }

      // 投稿データ保存
      await this.getDataManager().savePost({
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
      // 検索クエリの取得
      const targetQuery = decision.parameters?.query;
      
      if (!targetQuery) {
        console.warn('⚠️ リツイート対象の検索クエリがないため、waitアクションに変更');
        return {
          success: true,
          action: WORKFLOW_CONSTANTS.ACTIONS.WAIT,
          reason: 'No query for retweet action',
          timestamp: new Date().toISOString()
        };
      }

      // 共通処理: ツイート検索と自分のツイート除外
      const searchResult = await this.searchAndFilterTweets(
        targetQuery, 
        'リツイート', 
        { maxResults: 5 }
      );

      if (!searchResult.success) {
        return searchResult.waitAction;
      }

      const otherstweets = searchResult.tweets;
      const currentUser = searchResult.currentUser;

      // Claude最適選択機能を使用（リツイート用）
      let selectedTweet: SelectedTweet;
      try {
        // 型変換: TweetData[] → TweetCandidate[]
        const candidates: TweetCandidate[] = otherstweets.map(convertTweetDataToCandidate);
        
        // Claude選択実行
        selectedTweet = await selectOptimalTweet({
          candidates: candidates,
          selectionType: 'retweet',
          criteria: {
            topic: decision.parameters?.topic || 'investment',
            qualityThreshold: 7,
            engagementWeight: 0.6,
            relevanceWeight: 0.4
          },
          context: {
            userProfile: this.convertAccountInfoToProfile(currentUser),
            learningData: undefined
          }
        });
        
        console.log(`✅ Claude最適選択完了: ${selectedTweet.tweetId} (スコア: ${selectedTweet.score}/10)`);
        console.log(`💡 選択理由: ${selectedTweet.reasoning}`);
        
      } catch (claudeError) {
        console.warn('⚠️ Claude選択に失敗、フォールバック選択を使用:', claudeError);
        // フォールバック: 最初のツイートを選択
        const fallbackTweet = otherstweets[0];
        selectedTweet = {
          tweetId: fallbackTweet.id,
          authorId: fallbackTweet.author_id,
          score: 5,
          reasoning: 'Claude選択エラーによるフォールバック選択',
          expectedImpact: 'medium'
        };
      }

      // 選択されたツイートでリツイート実行
      const retweetResult = await this.kaitoClient.retweet(selectedTweet.tweetId);

      if (!retweetResult?.success) {
        throw new Error(retweetResult?.error || 'リツイート実行失敗');
      }

      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.RETWEET,
        targetTweet: selectedTweet.tweetId,
        targetTweetText: otherstweets.find(t => t.id === selectedTweet.tweetId)?.text.substring(0, 100) || 'Unknown',
        searchQuery: targetQuery,
        result: retweetResult,
        claudeSelection: {
          score: selectedTweet.score,
          reasoning: selectedTweet.reasoning,
          expectedImpact: selectedTweet.expectedImpact
        },
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
  private static async executeLikeAction(decision: any, collectedData?: { profile: any, learningData: any, currentStatus: any }): Promise<any> {
    try {
      // 検索クエリの取得
      const targetQuery = decision.parameters?.query;
      
      if (!targetQuery) {
        console.warn('⚠️ いいね対象の検索クエリがないため、waitアクションに変更');
        return {
          success: true,
          action: WORKFLOW_CONSTANTS.ACTIONS.WAIT,
          reason: 'No query for like action',
          timestamp: new Date().toISOString()
        };
      }

      // 共通処理: ツイート検索と自分のツイート除外（キャッシュされたプロファイルを使用）
      const searchResult = await this.searchAndFilterTweets(
        targetQuery, 
        'いいね', 
        { lang: 'ja' }, // 日本語ツイートを優先
        collectedData?.profile
      );

      if (!searchResult.success) {
        return searchResult.waitAction;
      }

      const otherstweets = searchResult.tweets;
      const currentUser = searchResult.currentUser;

      // Claude最適選択機能を使用（いいね＝関係構築重視）
      let selectedTweet: SelectedTweet;
      try {
        // 型変換: TweetData[] → TweetCandidate[]
        const candidates: TweetCandidate[] = otherstweets.map(convertTweetDataToCandidate);
        
        // Claude選択実行（いいねは他人に見られないため、関係構築視点で選択）
        selectedTweet = await selectOptimalTweet({
          candidates: candidates,
          selectionType: 'like',
          criteria: {
            topic: decision.parameters?.topic || 'investment_education_interest', // ユーザーが投資教育に興味を持ちそうか
            qualityThreshold: 6, // 関係構築重視のため品質閾値を下げる
            engagementWeight: 0.1, // エンゲージメントより関係性を重視
            relevanceWeight: 0.9  // そのユーザーが私のアカウントに興味を持ちそうかを最重視
          },
          context: {
            userProfile: this.convertAccountInfoToProfile(currentUser),
            learningData: collectedData?.learningData
          }
        });
        
        console.log(`✅ Claude最適選択完了: ${selectedTweet.tweetId} (スコア: ${selectedTweet.score}/10)`);
        console.log(`💡 選択理由: ${selectedTweet.reasoning}`);
        
      } catch (claudeError) {
        console.warn('⚠️ Claude選択に失敗、フォールバック選択を使用:', claudeError);
        // フォールバック: 最初のツイートを選択
        const fallbackTweet = otherstweets[0];
        selectedTweet = {
          tweetId: fallbackTweet.id,
          authorId: fallbackTweet.author_id,
          score: 5,
          reasoning: 'Claude選択エラーによるフォールバック選択',
          expectedImpact: 'medium'
        };
      }
      
      // 選択されたツイートでいいね実行
      const likeResult = await this.kaitoClient.like(selectedTweet.tweetId);

      if (!likeResult?.success) {
        throw new Error(likeResult?.error || 'いいね実行失敗');
      }

      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.LIKE,
        targetTweet: selectedTweet.tweetId,
        targetTweetText: otherstweets.find(t => t.id === selectedTweet.tweetId)?.text.substring(0, 100) || 'Unknown',
        searchQuery: targetQuery,
        result: likeResult,
        claudeSelection: {
          score: selectedTweet.score,
          reasoning: selectedTweet.reasoning,
          expectedImpact: selectedTweet.expectedImpact
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ いいねアクション失敗:', error);
      throw error;
    }
  }

  /**
   * フォローアクション実行
   */
  private static async executeFollowAction(decision: any): Promise<any> {
    try {
      // 検索クエリの取得
      const targetQuery = decision.parameters?.target_query || decision.parameters?.query;
      
      if (!targetQuery) {
        console.warn('⚠️ フォロー対象の検索クエリがないため、waitアクションに変更');
        return {
          success: true,
          action: WORKFLOW_CONSTANTS.ACTIONS.WAIT,
          reason: 'No query for follow action',
          timestamp: new Date().toISOString()
        };
      }

      // 共通処理: ツイート検索と自分のツイート除外
      const searchResult = await this.searchAndFilterTweets(
        targetQuery, 
        'フォロー', 
        { maxResults: 10 }
      );

      if (!searchResult.success) {
        return searchResult.waitAction;
      }

      const otherstweets = searchResult.tweets;
      const currentUser = searchResult.currentUser;

      if (otherstweets.length === 0) {
        console.warn('⚠️ フォロー対象のツイートが見つからないため、waitアクションに変更');
        return {
          success: true,
          action: WORKFLOW_CONSTANTS.ACTIONS.WAIT,
          reason: 'No tweets found for follow action',
          timestamp: new Date().toISOString()
        };
      }

      // 最初のツイートの作者をフォロー対象として選択
      const targetTweet = otherstweets[0];
      const targetUserId = targetTweet.author_id;

      // TODO: KaitoApiClientのfollowメソッドが実装されたら有効化
      // const followResult = await this.kaitoClient.follow(targetUserId);
      
      // 現在は未実装のため、模擬成功レスポンスを返す
      console.log(`📋 フォローアクション実行中 (模擬): ユーザーID ${targetUserId}`);
      console.warn('⚠️ KaitoAPIのfollowメソッドが未実装のため、模擬実行モードです');
      
      const followResult = {
        success: true,
        message: '模擬フォロー実行完了',
        targetUserId: targetUserId
      };

      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.FOLLOW,
        targetUserId: targetUserId,
        targetTweetText: targetTweet.text.substring(0, 100) || 'Unknown',
        searchQuery: targetQuery,
        result: followResult,
        note: 'KaitoAPI followメソッド未実装による模擬実行',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ フォローアクション失敗:', error);
      throw error;
    }
  }

  /**
   * 分析アクション実行
   */
  private static async executeAnalyzeAction(decision: any, collectedData?: { profile: any, learningData: any, currentStatus: any }): Promise<any> {
    try {
      console.log('📊 分析アクション実行開始');
      
      // Claude SDKの深夜大規模分析を実行
      const { executeDeepNightAnalysis } = await import('../claude/endpoints/analysis-endpoint');
      const analysisResult = await executeDeepNightAnalysis();
      
      console.log(`✅ 分析完了: ${analysisResult.performanceInsights.length}個の洞察, ${analysisResult.marketOpportunities.length}個の機会`);
      
      // データ管理システムに結果保存
      const dataManager = this.getDataManager();
      
      // 今日の日付でinsights保存
      const dailyInsights = {
        date: analysisResult.analysisDate,
        performancePatterns: this.convertToPerformancePatterns(analysisResult.performanceInsights),
        marketOpportunities: analysisResult.marketOpportunities,
        optimizationInsights: this.convertToOptimizationInsights(analysisResult.optimizationStrategies),
        generatedAt: new Date().toISOString(),
        analysisVersion: 'v1.0'
      };
      
      await dataManager.saveDailyInsights(dailyInsights);
      
      // 翌日戦略保存
      const tomorrowStrategy = {
        ...analysisResult.tomorrowStrategy,
        targetDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        validUntil: new Date(new Date().getTime() + 48 * 60 * 60 * 1000).toISOString()
      };
      await dataManager.saveTomorrowStrategy(tomorrowStrategy);
      
      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.ANALYZE,
        analysisDate: analysisResult.analysisDate,
        insights: analysisResult.performanceInsights.length,
        opportunities: analysisResult.marketOpportunities.length,
        strategies: analysisResult.optimizationStrategies.length,
        confidence: analysisResult.confidence,
        result: analysisResult,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ 分析アクション失敗:', error);
      throw error;
    }
  }

  /**
   * 引用ツイートアクション実行
   */
  private static async executeQuoteTweetAction(decision: any): Promise<any> {
    try {
      // 検索クエリの取得
      const targetQuery = decision.parameters?.query;
      
      if (!targetQuery) {
        console.warn('⚠️ 引用ツイート対象の検索クエリがないため、waitアクションに変更');
        return {
          success: true,
          action: WORKFLOW_CONSTANTS.ACTIONS.WAIT,
          reason: 'No query for quote tweet action',
          timestamp: new Date().toISOString()
        };
      }

      // 共通処理: ツイート検索と自分のツイート除外
      const searchResult = await this.searchAndFilterTweets(
        targetQuery, 
        '引用ツイート', 
        { maxResults: 5 }
      );

      if (!searchResult.success) {
        return searchResult.waitAction;
      }

      const otherstweets = searchResult.tweets;
      const currentUser = searchResult.currentUser;

      // Claude最適選択機能を使用（引用ツイート用）
      let selectedTweet: SelectedTweet;
      try {
        // 型変換: TweetData[] → TweetCandidate[]
        const candidates: TweetCandidate[] = otherstweets.map(convertTweetDataToCandidate);
        
        // Claude選択実行
        selectedTweet = await selectOptimalTweet({
          candidates: candidates,
          selectionType: 'quote_tweet',
          criteria: {
            topic: decision.parameters?.topic || 'investment',
            qualityThreshold: 7,
            engagementWeight: 0.4,
            relevanceWeight: 0.6
          },
          context: {
            userProfile: this.convertAccountInfoToProfile(currentUser),
            learningData: undefined
          }
        });
        
        console.log(`✅ Claude最適選択完了: ${selectedTweet.tweetId} (スコア: ${selectedTweet.score}/10)`);
        console.log(`💡 選択理由: ${selectedTweet.reasoning}`);
        
      } catch (claudeError) {
        console.warn('⚠️ Claude選択に失敗、フォールバック選択を使用:', claudeError);
        // フォールバック: 最初のツイートを選択
        const fallbackTweet = otherstweets[0];
        selectedTweet = {
          tweetId: fallbackTweet.id,
          authorId: fallbackTweet.author_id,
          score: 5,
          reasoning: 'Claude選択エラーによるフォールバック選択',
          expectedImpact: 'medium'
        };
      }

      // コンテンツ生成（引用ツイート用）
      // TODO: 仕様ではgenerateQuoteComment()を使用すべきだが、現在未実装のためgenerateContent()を使用
      const content = await generateContent({
        request: {
          topic: decision.parameters?.topic || 'investment commentary',
          contentType: 'educational',
          targetAudience: 'intermediate'
        }
      });

      if (!content?.content) {
        throw new Error('引用ツイートコンテンツ生成失敗');
      }

      // 引用ツイート実行
      const quoteTweetResult = await this.kaitoClient.quoteTweet(selectedTweet.tweetId, content.content);

      if (!quoteTweetResult?.success) {
        throw new Error(quoteTweetResult?.error || '引用ツイート実行失敗');
      }

      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.QUOTE_TWEET,
        targetTweet: selectedTweet.tweetId,
        targetTweetText: otherstweets.find(t => t.id === selectedTweet.tweetId)?.text.substring(0, 100) || 'Unknown',
        searchQuery: targetQuery,
        content: content.content,
        result: quoteTweetResult,
        claudeSelection: {
          score: selectedTweet.score,
          reasoning: selectedTweet.reasoning,
          expectedImpact: selectedTweet.expectedImpact
        },
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
      await this.getDataManager().saveKaitoResponse('action-result', actionResult);

      // 決定結果記録
      await this.getDataManager().saveDecisionResult(decision, {
        success: actionResult.success,
        engagement_rate: 0, // 実際のメトリクスは後で更新
        timestamp: new Date().toISOString()
      });

      // 実行サマリー更新
      const summary = await this.getDataManager().getCurrentExecutionData();
      summary.summary.metrics.totalActions += 1;
      
      if (actionResult.success) {
        summary.summary.metrics.successCount += 1;
      } else {
        summary.summary.metrics.errorCount += 1;
      }

      await this.getDataManager().updateExecutionSummary(summary.summary);

    } catch (error) {
      console.error('❌ 結果保存エラー:', error);
      // 結果保存のエラーは致命的でないためスロー
    }
  }

  /**
   * 共通処理: ツイート検索と自分のツイート除外
   */
  private static async searchAndFilterTweets(
    query: string, 
    actionType: string, 
    searchOptions?: any, 
    cachedProfile?: any
  ): Promise<{ success: true, tweets: any[], currentUser: any } | { success: false, waitAction: any }> {
    // 現在のユーザー情報を取得（キャッシュがあれば使用）
    const currentUser = cachedProfile || await this.kaitoClient.getAccountInfo();
    const currentUserId = currentUser.id;
    console.log(`📋 現在のユーザーID: ${currentUserId} (@${currentUser.username}) ${cachedProfile ? '(キャッシュ使用)' : '(新規取得)'}`);

    // ツイート検索実行
    console.log(`🔍 ${actionType}対象を検索中: "${query}"`);
    const searchResult = await this.kaitoClient.searchTweets(query, searchOptions);

    if (!searchResult.success || searchResult.tweets.length === 0) {
      console.warn(`⚠️ 検索結果がないため、waitアクションに変更: "${query}"`);
      return {
        success: false,
        waitAction: {
          success: true,
          action: WORKFLOW_CONSTANTS.ACTIONS.WAIT,
          reason: `No tweets found for query: ${query}`,
          query: query,
          timestamp: new Date().toISOString()
        }
      };
    }

    // 自分のツイートを除外
    const otherstweets = searchResult.tweets.filter(tweet => {
      const isOwn = tweet.author_id === currentUserId;
      if (isOwn) {
        console.log(`🚫 自分のツイートを除外: ${tweet.id} - "${tweet.text.substring(0, 30)}..."`);
      }
      return !isOwn;
    });

    if (otherstweets.length === 0) {
      console.warn(`⚠️ 他人のツイートが見つからないため、waitアクションに変更: "${query}"`);
      return {
        success: false,
        waitAction: {
          success: true,
          action: WORKFLOW_CONSTANTS.ACTIONS.WAIT,
          reason: 'All tweets are from current user',
          query: query,
          timestamp: new Date().toISOString()
        }
      };
    }

    return {
      success: true,
      tweets: otherstweets,
      currentUser: currentUser
    };
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
      
      console.log('✅ KaitoApiClient初期化完了');
    } catch (error) {
      console.error('❌ KaitoApiClient初期化エラー:', error);
      // デフォルトクライアントを作成（エラー時でも動作継続）
      this.kaitoClient = new KaitoTwitterAPIClient();
    }
  }

  /**
   * 深夜大規模分析の実行（Step 4）
   * 23:55時のみ実行される特別処理
   */
  private static async executeDeepNightAnalysis(executionId: string): Promise<any> {
    const analysisStartTime = Date.now();
    
    try {
      console.log(`🌙 深夜大規模分析開始 - ExecutionID: ${executionId}`);
      
      // 1. 深夜大規模分析の実行（TASK-001で実装されるメソッドを使用）
      const { executeDeepNightAnalysis } = await import('../claude/endpoints/analysis-endpoint');
      const analysisResult = await executeDeepNightAnalysis();
      
      console.log(`📊 大規模分析完了: ${analysisResult.performanceInsights.length}個の洞察, ${analysisResult.marketOpportunities.length}個の機会`);
      
      // 2. 分析結果の保存（TASK-002で実装されるメソッドを使用）
      const dataManager = this.getDataManager();
      
      // 日次分析結果の保存
      const dailyInsights = {
        date: analysisResult.analysisDate,
        performancePatterns: this.convertToPerformancePatterns(analysisResult.performanceInsights),
        marketOpportunities: analysisResult.marketOpportunities.map((opportunity: any) => ({
          ...opportunity,
          recommendedAction: opportunity.recommendedAction || 'post',
          expectedEngagement: opportunity.expectedEngagement || 0,
          timeframeWindow: opportunity.timeframeWindow || '24h'
        })),
        optimizationInsights: this.convertToOptimizationInsights(analysisResult.optimizationStrategies),
        generatedAt: new Date().toISOString(),
        analysisVersion: 'v1.0'
      };
      
      await dataManager.saveDailyInsights(dailyInsights);
      console.log('✅ 日次分析結果保存完了');
      
      // 3. 翌日戦略の保存
      const tomorrowStrategyWithDefaults = {
        ...analysisResult.tomorrowStrategy,
        targetDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        validUntil: new Date(new Date().getTime() + 48 * 60 * 60 * 1000).toISOString(),
        priorityActions: (analysisResult.tomorrowStrategy.priorityActions || []).map((action: any) => ({
          ...action,
          priority: action.priority || 'medium' as 'high' | 'medium' | 'low'
        }))
      };
      await dataManager.saveTomorrowStrategy(tomorrowStrategyWithDefaults);
      console.log('✅ 翌日戦略保存完了');
      
      // 4. パフォーマンス集計の生成・保存
      const performanceSummary = await this.generatePerformanceSummary(analysisResult);
      await dataManager.savePerformanceSummary(performanceSummary);
      console.log('✅ パフォーマンス集計保存完了');
      
      // 5. 実行ログ保存
      await dataManager.saveKaitoResponse('deep-night-analysis-result', {
        executionId,
        analysisTime: Date.now() - analysisStartTime,
        insights: analysisResult.performanceInsights.length,
        opportunities: analysisResult.marketOpportunities.length,
        strategiesGenerated: analysisResult.optimizationStrategies.length,
        confidence: analysisResult.confidence,
        timestamp: new Date().toISOString()
      });
      
      const totalTime = Date.now() - analysisStartTime;
      console.log(`🎉 深夜大規模分析完全完了 (${totalTime}ms) - 翌日戦略準備完了`);
      
      return {
        success: true,
        analysisTime: totalTime,
        insights: analysisResult.performanceInsights.length,
        opportunities: analysisResult.marketOpportunities.length,
        strategies: analysisResult.optimizationStrategies.length,
        confidence: analysisResult.confidence,
        filesGenerated: [
          `daily-insights-${analysisResult.analysisDate.replace(/-/g, '')}.yaml`,
          'tomorrow-strategy.yaml',
          `performance-summary-${analysisResult.analysisDate.replace(/-/g, '')}.yaml`
        ]
      };
      
    } catch (error) {
      const totalTime = Date.now() - analysisStartTime;
      console.error(`❌ 深夜大規模分析エラー (${totalTime}ms):`, error);
      
      // エラー情報保存
      await this.getDataManager().saveKaitoResponse('deep-night-analysis-error', {
        executionId,
        error: error instanceof Error ? error.message : String(error),
        analysisTime: totalTime,
        timestamp: new Date().toISOString()
      });
      
      // エラーでもワークフローは継続（重要）
      console.warn('⚠️ 深夜大規模分析は失敗しましたが、ワークフローは継続します');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        analysisTime: totalTime
      };
    }
  }

  /**
   * パフォーマンス洞察をパフォーマンスパターンに変換
   */
  private static convertToPerformancePatterns(insights: any[]): any[] {
    return insights.map(insight => ({
      timeSlot: insight.timeSlot,
      successRate: insight.successRate,
      optimalTopics: insight.optimalTopics || [],
      avgEngagementRate: insight.avgEngagementRate || 0,
      sampleSize: insight.sampleSize || 1
    }));
  }

  /**
   * 最適化戦略を最適化洞察に変換
   */
  private static convertToOptimizationInsights(strategies: any[]): any[] {
    return strategies.map(strategy => ({
      pattern: strategy.pattern,
      implementation: strategy.implementation,
      expectedImpact: strategy.expectedImpact,
      confidence: strategy.confidence || 0.5,
      priority: this.calculatePriority(strategy.confidence)
    }));
  }

  /**
   * 信頼度から優先度を計算
   */
  private static calculatePriority(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  /**
   * パフォーマンス集計の生成
   */
  private static async generatePerformanceSummary(analysisResult: any): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    
    // 今日の実行データから集計情報を生成
    const currentData = await this.getDataManager().getCurrentExecutionData();
    
    return {
      date: today,
      totalActions: currentData.summary?.metrics?.totalActions || 0,
      successfulActions: currentData.summary?.metrics?.successCount || 0,
      successRate: this.calculateSuccessRate(
        currentData.summary?.metrics?.successCount || 0,
        currentData.summary?.metrics?.totalActions || 1
      ),
      engagementMetrics: {
        totalLikes: 0, // 実際のメトリクスは今後実装
        totalRetweets: 0,
        totalReplies: 0,
        avgEngagementRate: analysisResult.tomorrowStrategy?.expectedMetrics?.targetEngagementRate || 0
      },
      followerGrowth: analysisResult.tomorrowStrategy?.expectedMetrics?.targetFollowerGrowth || 0,
      topPerformingActions: this.extractTopActions(analysisResult.performanceInsights),
      insights: this.generateSummaryInsights(analysisResult),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 成功率の計算
   */
  private static calculateSuccessRate(successCount: number, totalCount: number): number {
    if (totalCount === 0) return 0;
    return Math.round((successCount / totalCount) * 100) / 100;
  }

  /**
   * トップパフォーマンスアクションの抽出
   */
  private static extractTopActions(insights: any[]): any[] {
    return insights
      .filter(insight => insight.successRate > 0.7)
      .map(insight => ({
        action: 'mixed', // 実際の分析結果に基づいて決定
        topic: insight.optimalTopics?.[0] || 'general',
        engagementRate: insight.avgEngagementRate || 0
      }))
      .slice(0, 3);
  }

  /**
   * サマリー洞察の生成
   */
  private static generateSummaryInsights(analysisResult: any): string[] {
    const insights: string[] = [];
    
    // パフォーマンス洞察から主要な発見をテキスト化
    if (analysisResult.performanceInsights?.length > 0) {
      const bestTimeSlot = analysisResult.performanceInsights
        .sort((a: any, b: any) => b.successRate - a.successRate)[0];
      insights.push(`最高成功率時間帯: ${bestTimeSlot.timeSlot} (${Math.round(bestTimeSlot.successRate * 100)}%)`);
    }
    
    // 市場機会から主要な発見をテキスト化
    if (analysisResult.marketOpportunities?.length > 0) {
      const topOpportunity = analysisResult.marketOpportunities
        .sort((a: any, b: any) => b.relevance - a.relevance)[0];
      insights.push(`注目トピック: ${topOpportunity.topic} (関連度${Math.round(topOpportunity.relevance * 100)}%)`);
    }
    
    // 最適化戦略から主要な推奨事項をテキスト化
    if (analysisResult.optimizationStrategies?.length > 0) {
      const topStrategy = analysisResult.optimizationStrategies
        .sort((a: any, b: any) => b.confidence - a.confidence)[0];
      insights.push(`推奨改善: ${topStrategy.implementation}`);
    }
    
    return insights;
  }
}