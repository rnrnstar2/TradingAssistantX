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

      // TODO: 深夜分析機能の実装待ち

      // ===============================
      // スケジュール実行モード（3ステップ）
      // ===============================
      if (options?.scheduledAction) {
        console.log(`📅 スケジュール実行モード: ${options.scheduledAction}`);
        
        // ステップ1: データ収集
        console.log('📊 ステップ1: データ収集開始');
        const [profile, learningData] = await Promise.all([
          this.collectKaitoData(),
          this.getDataManager().loadLearningData()
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
        const actionResult = await this.executeAction(decision, { profile, learningData });
        console.log('✅ アクション実行完了', { action: decision.action, success: actionResult.success });

        // ステップ3: 結果保存
        console.log('💾 ステップ3: 結果保存開始');
        await this.saveResults(decision, actionResult, options);
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
        
        // TODO: Step 4: 深夜大規模分析（23:55のみ） - 実装待ち
        
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
      
      const [profile, learningData] = await Promise.all([
        this.collectKaitoData(),
        this.getDataManager().loadLearningData()
      ]);

      console.log('✅ データ収集完了', {
        profile: !!profile,
        followers: profile?.followersCount || profile?.followers || 0,
        learningPatterns: Object.keys(learningData.engagementPatterns?.topics || {}).length
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

      console.log('✅ 固定アクション設定完了', { action: decision.action, confidence: decision.confidence });

      // ステップ1で収集したデータを渡す
      const actionResult = await this.executeAction(decision, { profile, learningData });
      console.log('✅ アクション実行完了', { action: decision.action, success: actionResult.success });

      // ステップ3: 結果保存
      console.log('💾 ステップ3: 結果保存開始');

      await this.saveResults(decision, actionResult, options);
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
      
      // TODO: Step 4: 深夜大規模分析（23:55のみ） - 実装待ち
      
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
   * Kaitoデータ収集
   * アカウント情報取得後、current-status.yamlを自動更新
   */
  private static async collectKaitoData(): Promise<any> {
    try {
      const profile = await this.kaitoClient.getAccountInfo();
      
      
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
      
      
      return fallbackProfile;
    }
  }

  /**
   * システムコンテキスト構築（MVP最適化版）
   */
  private static buildSystemContext(profile: any): SystemContext {
    return {
      account: {
        followerCount: profile?.followersCount || profile?.followers || 100,
        lastPostTime: undefined,
        postsToday: profile?.tweetsCount || 0,
        engagementRate: this.calculateEngagementRate(profile)
      },
      system: {
        health: {
          all_systems_operational: true,
          api_status: 'healthy',
          rate_limits_ok: true
        },
        executionCount: {
          today: 0,
          total: 1
        }
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
   * 現在時刻に最適な時間帯パターンを取得
   */
  private static getCurrentTimeSlotPattern(engagementPatterns: any): string {
    try {
      if (!engagementPatterns?.timeSlots) {
        console.warn('⚠️ エンゲージメントパターンが不備、フォールバック使用');
        return 'optimal_fallback';
      }

      const currentHour = new Date().getHours();
      const timeSlot = this.getTimeSlotForHour(currentHour);
      const successRate = engagementPatterns.timeSlots[timeSlot]?.successRate || 0;
      
      console.log(`📊 時間帯分析: ${timeSlot} (成功率: ${successRate})`);
      return successRate > 0.8 ? timeSlot : 'optimal_fallback';
    } catch (error) {
      console.warn('⚠️ 時間帯パターン取得エラー、フォールバック使用:', error);
      return 'optimal_fallback';
    }
  }

  /**
   * 現在の時間帯でのエンゲージメント期待値計算
   */
  private static calculateCurrentEngagementExpectation(engagementPatterns: any): number {
    try {
      if (!engagementPatterns?.timeSlots) {
        console.warn('⚠️ エンゲージメントパターンが不備、デフォルト値使用');
        return 2.5;
      }

      const currentHour = new Date().getHours();
      const timeSlot = this.getTimeSlotForHour(currentHour);
      const avgEngagement = engagementPatterns.timeSlots[timeSlot]?.avgEngagement || 2.5;
      
      console.log(`📈 エンゲージメント期待値: ${avgEngagement} (${timeSlot})`);
      return avgEngagement;
    } catch (error) {
      console.warn('⚠️ エンゲージメント期待値計算エラー、デフォルト値使用:', error);
      return 2.5;
    }
  }

  /**
   * 時刻から時間帯スロットを決定
   */
  private static getTimeSlotForHour(hour: number): string {
    if (hour >= 7 && hour < 10) return '07:00-10:00';
    if (hour >= 12 && hour < 14) return '12:00-14:00';
    if (hour >= 20 && hour < 22) return '20:00-22:00';
    return 'other';
  }

  /**
   * アクション実行（switch文での分岐）
   */
  private static async executeAction(decision: any, collectedData?: { profile: any, learningData: any }): Promise<any> {
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
  private static async executePostAction(decision: any, collectedData?: { profile: any, learningData: any }): Promise<any> {
    try {
      // コンテキスト情報の使用（既に収集済みの場合は再利用）
      let profile, learningData;
      
      if (collectedData) {
        ({ profile, learningData } = collectedData);
      } else {
        // 収集されていない場合のみ取得
        [profile, learningData] = await Promise.all([
          this.collectKaitoData(),
          this.getDataManager().loadLearningData()
        ]);
      }

      // システムコンテキストの構築
      const systemContext = this.buildSystemContext(profile);
      
      // 新構造：直接的で明確な学習データ使用（エラーハンドリング付き）
      try {
        const { engagementPatterns, successfulTopics } = learningData || {};

        // 時間帯情報を追加
        systemContext.timestamp = new Date().toISOString();
        systemContext.learningData = {
          recentTopics: successfulTopics?.topics?.slice(0, 3).map(t => t.topic) || [],
          optimalTimeSlot: this.getCurrentTimeSlotPattern(engagementPatterns),
          avgEngagement: this.calculateCurrentEngagementExpectation(engagementPatterns)
        };

        console.log('✅ 学習データ統合完了', {
          topics: systemContext.learningData.recentTopics.length,
          timeSlot: systemContext.learningData.optimalTimeSlot,
          avgEngagement: systemContext.learningData.avgEngagement
        });
      } catch (learningDataError) {
        console.warn('⚠️ 学習データ処理エラー、フォールバック使用:', learningDataError);
        // グレースフルデグラデーション: フォールバック値
        systemContext.timestamp = new Date().toISOString();
        systemContext.learningData = {
          recentTopics: ['investment', 'finance', 'crypto'],
          optimalTimeSlot: 'optimal_fallback',
          avgEngagement: 2.5
        };
      }

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


      // 投稿実行
      const postResult = await this.kaitoClient.post(content.content);

      if (!postResult?.success) {
        const errorMessage = typeof postResult?.error === 'string' 
          ? postResult.error 
          : postResult?.error?.message || '投稿実行失敗';
        throw new Error(errorMessage);
      }


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
        return 'waitAction' in searchResult ? searchResult.waitAction : { success: false, action: 'wait' };
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
  private static async executeLikeAction(decision: any, collectedData?: { profile: any, learningData: any }): Promise<any> {
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
        return 'waitAction' in searchResult ? searchResult.waitAction : { success: false, action: 'wait' };
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
        return 'waitAction' in searchResult ? searchResult.waitAction : { success: false, action: 'wait' };
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
   * TODO: 深夜分析機能の実装待ち
   */
  private static async executeAnalyzeAction(decision: any, collectedData?: { profile: any, learningData: any }): Promise<any> {
    try {
      console.log('📊 分析アクション実行開始');
      
      // TODO: 深夜分析機能の実装待ち
      throw new Error('分析アクションは未実装です');

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
        return 'waitAction' in searchResult ? searchResult.waitAction : { success: false, action: 'wait' };
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
  private static async saveResults(decision: any, actionResult: any, options?: any): Promise<void> {
    try {
      // post.yaml統合形式での保存（既存のPostData型に準拠）
      await this.getDataManager().savePost({
        actionType: decision.action,
        content: actionResult.content,
        targetTweetId: actionResult.targetTweetId || actionResult.tweetId,
        result: actionResult.result || {
          success: actionResult.success || false,
          message: actionResult.message || '',
          data: actionResult.data || {}
        },
        engagement: actionResult.engagement || {
          likes: 0,
          retweets: 0,
          replies: 0
        },
        claudeSelection: actionResult.claudeSelection
      });

      console.log('✅ 結果保存完了（post.yaml統合形式）');
    } catch (error) {
      console.error('❌ 結果保存失敗:', error);
      throw error;
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
   * TODO: 深夜分析機能の実装待ち
   */
  private static async executeDeepNightAnalysis(executionId: string): Promise<any> {
    throw new Error('Deep night analysis is not implemented yet');
  }
}