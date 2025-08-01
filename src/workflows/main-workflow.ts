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
import { type SelectedTweet, type TweetSelectionParams, type TweetCandidate, type AccountInfo, type EnhancedContentRequest } from '../claude/types';
import { DataManager } from '../shared/data-manager';
import { WORKFLOW_CONSTANTS, ActionType, WorkflowOptions, WorkflowResult, SystemContext } from './constants';
import { collectPostMetrics } from '../shared/post-metrics-collector';
import { analyzePostEngagement } from '../claude/endpoints/analysis-endpoint';
import { ReferenceTweetAnalyzer } from '../claude/utils';


/**
 * MainWorkflow - MVP最小構成ワークフローエンジン
 */
export class MainWorkflow {
  private static dataManager: DataManager | null = null;
  private static kaitoClient: KaitoTwitterAPIClient;
  private static kaitoClientInitialized = false;

  /**
   * DataManagerのインスタンスを取得（シングルトン）
   */
  private static getDataManager(): DataManager {
    return DataManager.getInstance();
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
          query: options.scheduledQuery,
          reference_users: options.scheduledReferenceUsers
        },
        confidence: 1.0,
        reasoning: `スケジュール指定によるアクション: ${options.scheduledAction}`
      };
      
      // postまたはquote_tweetアクションの場合ディレクトリ作成
      if (decision.action === 'post' || decision.action === 'quote_tweet') {
        const realExecutionId = await this.getDataManager().initializeExecutionCycle();
        executionId = realExecutionId;
        console.log(`📋 実行サイクル開始: ${executionId}`);
      } else {
        // その他のアクションはディレクトリを作成しない
        console.log(`📋 ${decision.action}アクションのため、ディレクトリ作成をスキップ`);
      }
      
      // ステップ1で収集したデータを渡す
      const actionResult = await this.executeAction(decision, { profile, learningData }, executionId);
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
      
      // Step 4: 深夜大規模分析（23:55のみ）
      if (options?.scheduledAction === 'analyze') {
        console.log('🌙 ステップ4: 深夜大規模分析開始');
        const deepAnalysisResult = await this.executeDeepNightAnalysis(executionId, { profile, learningData });
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
  private static async executeAction(decision: any, collectedData?: { profile: any, learningData: any }, executionId?: string): Promise<any> {
    const action = decision.action as ActionType;

    switch (action) {
      case WORKFLOW_CONSTANTS.ACTIONS.POST:
        return await this.executePostAction(decision, collectedData, executionId);

      case WORKFLOW_CONSTANTS.ACTIONS.RETWEET:
        return await this.executeRetweetAction(decision, executionId);

      case WORKFLOW_CONSTANTS.ACTIONS.LIKE:
        return await this.executeLikeAction(decision, collectedData, executionId);

      case WORKFLOW_CONSTANTS.ACTIONS.QUOTE_TWEET:
        return await this.executeQuoteTweetAction(decision, executionId);

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
  private static async executePostAction(decision: any, collectedData?: { profile: any, learningData: any }, executionId?: string): Promise<any> {
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
      
      // 参考ユーザーのツイート取得（新規追加）
      let referenceAccountTweets: any[] | null = null;
      if (decision.parameters?.reference_users && decision.parameters.reference_users.length > 0) {
        console.log(`👥 参考ユーザーの最新ツイート取得中: ${decision.parameters.reference_users.join(', ')}`);
        
        try {
          // reference-accounts.yamlから設定を読み込み
          const referenceConfig = await this.getDataManager().loadReferenceAccounts();
          
          // 指定されたユーザーの最新ツイートをバッチ取得
          const userTweetsMap = await this.kaitoClient.getBatchUserLastTweets(
            decision.parameters.reference_users,
            referenceConfig.search_settings.max_tweets_per_account || 20
          );
          
          // 取得結果を整形
          referenceAccountTweets = [];
          for (const [username, response] of userTweetsMap.entries()) {
            if (response.success && response.tweets.length > 0) {
              referenceAccountTweets.push({
                username,
                tweets: response.tweets.map(tweet => ({
                  id: tweet.id,
                  text: tweet.text,
                  created_at: tweet.created_at,
                  public_metrics: tweet.public_metrics
                }))
              });
              console.log(`✅ @${username}: ${response.tweets.length}件のツイート取得`);
            } else {
              console.warn(`⚠️ @${username}: ツイート取得失敗`);
            }
          }
          
          if (referenceAccountTweets.length > 0) {
            console.log(`📊 参考ユーザーツイート取得完了: ${referenceAccountTweets.length}アカウント`);
          }
        } catch (error) {
          console.error('❌ 参考ユーザーツイート取得エラー:', error);
          // エラー時はnullのまま続行（参考ツイートなしで生成）
        }
      }

      // target_queryがある場合、参考ツイートを検索（複数戦略実装）
      let referenceTweets = null;
      if (decision.parameters?.target_query || decision.parameters?.query) {
        const targetQuery = decision.parameters?.target_query || decision.parameters?.query;
        console.log(`🔍 参考ツイート検索中: "${targetQuery}"`);
        
        try {
          // 複数の検索戦略を定義（修正版）
          const searchStrategies = [
            // 最新の話題を広く取得（シンプルなキーワードのみ）
            `投資 OR 株 OR 為替`,
            
            // 市場関連の最新情報
            `日経平均 OR ドル円 OR 米国株`,
            
            // ニュース系キーワード
            `投資 速報 OR 市場 ニュース`,
            
            // 既存のtarget_queryも使用
            targetQuery
          ];

          // 各戦略で検索し、多様な最新ツイートを収集
          const allTweets: any[] = [];
          const searchPromises = searchStrategies.map(async (query) => {
            try {
              const result = await this.kaitoClient.searchTweets(query, {
                maxResults: 25,  // 10→25件に増加
                lang: 'ja'
                // sortOrder: 'recency' を削除
              });
              
              if (result.success && result.tweets.length > 0) {
                console.log(`✅ 検索成功: "${query}" - ${result.tweets.length}件取得`);
                return result.tweets;
              }
              return [];
            } catch (error) {
              console.warn(`⚠️ 検索失敗: "${query}"`, error);
              return [];
            }
          });

          // 並列実行して結果を収集
          const searchResults = await Promise.all(searchPromises);
          searchResults.forEach(tweets => allTweets.push(...tweets));

          // 重複を除去（tweet IDベース）
          const uniqueTweets = Array.from(
            new Map(allTweets.map(tweet => [tweet.id, tweet])).values()
          );

          console.log(`📊 検索結果統計: 合計${allTweets.length}件 → 重複除去後${uniqueTweets.length}件`);

          if (uniqueTweets.length > 0) {
            // 自分のツイートを除外
            const otherstweets = uniqueTweets.filter(tweet => {
              const currentUser = profile;
              return tweet.author_id !== currentUser.id;
            });
            
            // Claude Codeで分析して投資教育に適した参考ツイートを選択
            const topicContext = decision.parameters?.topic || 'investment';
            
            // 最大10件選択（増加）
            const selectedTweets = await ReferenceTweetAnalyzer.selectReferenceTweets(
              otherstweets.map(tweet => ({
                text: tweet.text,
                id: tweet.id,
                author_id: tweet.author_id,
                public_metrics: tweet.public_metrics,
                created_at: tweet.created_at  // 時刻情報も含める
              })),
              topicContext,
              10 // 3→10件に増加
            );
            
            if (selectedTweets.length > 0) {
              referenceTweets = selectedTweets;
              console.log(`✅ 高品質な参考ツイート ${referenceTweets.length}件を選択（リアルタイム性・関連度・品質順）`);
              
              // 選択されたツイートの詳細をログ
              referenceTweets.forEach((tweet, index) => {
                console.log(`  ${index + 1}. 関連度: ${tweet.relevanceScore?.toFixed(1)}/10, 品質: ${tweet.qualityScore?.toFixed(1)}/10, リアルタイム性: ${tweet.realtimeScore?.toFixed(1)}/10`);
                console.log(`     内容: ${tweet.text.substring(0, 50)}...`);
              });
            } else {
              console.log('⚠️ 品質基準を満たす参考ツイートが見つかりませんでした');
            }
          }
        } catch (searchError) {
          console.warn('⚠️ 参考ツイート検索失敗、通常のコンテンツ生成を実行:', searchError);
          // エラーでも続行
        }
      }
      
      // 新構造：直接的で明確な学習データ使用（エラーハンドリング付き）
      try {
        const { engagementPatterns, successfulTopics } = learningData || {};

        // 時間帯情報と実行IDを追加
        systemContext.timestamp = new Date().toISOString();
        systemContext.executionId = executionId; // 実行IDを追加
        systemContext.learningData = {
          recentTopics: successfulTopics?.topics?.slice(0, 3).map((t: any) => t.topic) || [],
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
        systemContext.executionId = executionId; // 実行IDを追加
        systemContext.learningData = {
          recentTopics: ['investment', 'finance', 'crypto'],
          optimalTimeSlot: 'optimal_fallback',
          avgEngagement: 2.5
        };
      }

      // SystemContextに参考ユーザーツイートを追加
      if (referenceAccountTweets) {
        systemContext.referenceAccountTweets = referenceAccountTweets;
      }
      
      // 参考ツイートをコンテキストに追加
      if (referenceTweets) {
        systemContext.referenceTweets = referenceTweets;
      }
      
      // 参考ユーザーツイートの使用状況をログ出力
      if (systemContext.referenceAccountTweets && systemContext.referenceAccountTweets.length > 0) {
        console.log('📱 参考ユーザーツイートを含めてコンテンツ生成:');
        systemContext.referenceAccountTweets.forEach(account => {
          console.log(`  - @${account.username}: ${account.tweets.length}件`);
        });
      }

      // コンテンツ生成
      const content = await generateContent({
        request: {
          topic: decision.parameters?.topic || 'investment',
          contentType: 'educational',  // 'beginner_tips'などは使わない
          targetAudience: 'beginner',
          realtimeContext: true
        } as EnhancedContentRequest,
        context: {
          ...systemContext,
          referenceTweets: referenceTweets ? referenceTweets.map(tweet => ({
            text: tweet.text,
            qualityScore: tweet.qualityScore,
            relevanceScore: tweet.relevanceScore,
            realtimeScore: tweet.realtimeScore,
            reason: tweet.reason
          })) : undefined,
          referenceAccountTweets: referenceAccountTweets || undefined,
          instruction: (referenceTweets && referenceTweets.length > 0) || (referenceAccountTweets && referenceAccountTweets.length > 0)
            ? '参考ツイートや特定アカウントの最新ツイートで言及されている動向を踏まえて、初心者にも分かりやすく価値ある情報を提供してください。'
            : undefined
        }
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
  private static async executeRetweetAction(decision: any, executionId?: string): Promise<any> {
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
        { maxResults: 5, lang: 'ja' } // 日本語ツイートを優先
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
            learningData: undefined,
            executionId: executionId
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
  private static async executeLikeAction(decision: any, collectedData?: { profile: any, learningData: any }, executionId?: string): Promise<any> {
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
        { maxResults: 10, lang: 'ja' } // 日本語ツイートを優先
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

      // Claude最適選択機能を使用（フォロー専用評価）
      let selectedTweet: SelectedTweet;
      try {
        // 型変換: TweetData[] → TweetCandidate[]
        const candidates: TweetCandidate[] = otherstweets.map(convertTweetDataToCandidate);
        
        // Claude選択実行（フォロー戦略的評価）
        selectedTweet = await selectOptimalTweet({
          candidates: candidates,
          selectionType: 'follow',
          criteria: {
            topic: 'investment_education_expert',
            qualityThreshold: 7,
            engagementWeight: 0.2, // 影響力評価
            relevanceWeight: 0.8   // 専門性・相互フォロー可能性重視
          },
          context: {
            userProfile: this.convertAccountInfoToProfile(currentUser),
            learningData: undefined // フォローには学習データ不要
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

      // 選択されたツイートでフォロー実行
      const targetUserId = selectedTweet.authorId;

      // 数値IDの抽出（ツイート作者のuser_idを使用）
      const numericUserId = String(targetUserId);
      
      console.log(`📋 フォローアクション実行中: ユーザーID ${numericUserId}`);
      
      // 実際のフォローAPI呼び出し
      const followResult = await this.kaitoClient.follow(numericUserId);

      return {
        success: followResult.success,
        action: WORKFLOW_CONSTANTS.ACTIONS.FOLLOW,
        targetUserId: targetUserId,
        targetTweetText: otherstweets.find(t => t.id === selectedTweet.tweetId)?.text.substring(0, 100) || 'Unknown',
        searchQuery: targetQuery,
        result: followResult,
        claudeSelection: {                    // ← 追加
          score: selectedTweet.score,
          reasoning: selectedTweet.reasoning,
          expectedImpact: selectedTweet.expectedImpact
        },
        error: followResult.error,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ フォローアクション失敗:', error);
      throw error;
    }
  }

  /**
   * 分析アクション実行
   * 深夜分析機能の実装
   */
  private static async executeAnalyzeAction(decision: any, collectedData?: { profile: any, learningData: any }): Promise<any> {
    try {
      console.log('🌙 深夜分析アクション実行開始');
      
      // 1. 投稿メトリクス収集
      console.log('📊 投稿メトリクス収集中...');
      const postMetrics = await collectPostMetrics(this.kaitoClient);
      console.log(`📊 投稿メトリクス収集完了: ${postMetrics.summary.totalPosts}件`);
      
      // 2. システムコンテキスト構築
      const systemContext = this.buildSystemContext(collectedData?.profile);
      
      // 3. 深夜分析実行 
      console.log('🧠 Claude分析実行中...');
      // PostMetricsDataをPostEngagementData形式に変換
      const engagementData = {
        posts: postMetrics.posts,
        timeframe: postMetrics.summary.timeframe,
        totalPosts: postMetrics.summary.totalPosts
      };
      // SystemContext型の互換性を確保（marketをデフォルト値で補完）
      const analysisContext = {
        ...systemContext,
        market: systemContext.market || {
          trendingTopics: [],
          volatility: 'medium' as const,
          sentiment: 'neutral' as const
        }
      };
      const analysisResult = await analyzePostEngagement(engagementData, analysisContext);
      console.log('🧠 Claude分析実行完了');
      
      // 4. 結果保存（TASK-004に依存）
      try {
        await this.saveAnalysisResults(analysisResult, postMetrics);
        console.log('💾 分析結果保存完了');
      } catch (saveError) {
        console.warn('⚠️ 分析結果保存失敗、継続します:', saveError);
        // 保存失敗でも分析結果は返す
      }
      
      console.log('✅ 深夜分析アクション完了');
      
      return {
        success: true,
        action: 'analyze',
        analysisResult,
        postMetrics: {
          totalPosts: postMetrics.summary.totalPosts,
          avgEngagementRate: postMetrics.summary.avgEngagementRate,
          timeframe: postMetrics.summary.timeframe
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ 深夜分析アクション失敗:', error);
      throw error;
    }
  }

  /**
   * 引用ツイートアクション実行
   */
  private static async executeQuoteTweetAction(decision: any, executionId?: string): Promise<any> {
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
        { maxResults: 5, lang: 'ja' } // 日本語ツイートを優先
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
            learningData: undefined,
            executionId: executionId
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

      // システムコンテキストの構築
      const systemContext = this.buildSystemContext(currentUser);

      // コンテンツ生成（引用ツイート用）
      // TODO: 仕様ではgenerateQuoteComment()を使用すべきだが、現在未実装のためgenerateContent()を使用
      const content = await generateContent({
        request: {
          topic: decision.parameters?.topic || 'investment commentary',
          contentType: 'educational',
          targetAudience: 'general',
          realtimeContext: true
        } as EnhancedContentRequest,
        context: systemContext
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
   * 結果保存（post/quote_tweetアクションのみ）
   */
  private static async saveResults(decision: any, actionResult: any, options?: any): Promise<void> {
    try {
      // postまたはquote_tweetアクションのみファイル保存
      if (decision.action === 'post' || decision.action === 'quote_tweet') {
        await this.getDataManager().savePost({
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
            views: 0
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
   * スケジュールデータの読み込みとreference_usersパラメータの検証
   */
  private static async loadScheduleData(): Promise<any> {
    try {
      const scheduleData = await this.getDataManager().loadSchedule();
      
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
      
      console.log('✅ KaitoApiClient初期化完了');
    } catch (error) {
      console.error('❌ KaitoApiClient初期化エラー:', error);
      // デフォルトクライアントを作成（エラー時でも動作継続）
      this.kaitoClient = new KaitoTwitterAPIClient();
    }
  }

  /**
   * 分析結果保存（TASK-004依存）
   * 基本的な分析結果保存機能
   */
  private static async saveAnalysisResults(analysisResult: any, postMetrics: any): Promise<void> {
    try {
      // TASK-004が未完了の場合は基本的なログ出力のみ実行
      console.log('💾 分析結果保存中...');
      console.log(`📊 分析タイプ: ${analysisResult.analysisType}`);
      console.log(`📝 インサイト数: ${analysisResult.insights?.length || 0}件`);
      console.log(`💡 推奨事項数: ${analysisResult.recommendations?.length || 0}件`);
      console.log(`🎯 信頼度: ${(analysisResult.confidence * 100).toFixed(1)}%`);
      console.log(`📋 データポイント: ${postMetrics.summary.totalPosts}件`);
      
      // 今後のTASK-004実装で、実際のファイル保存機能を追加予定
      // await this.getDataManager().saveAnalysisResults(analysisResult, postMetrics);
      
    } catch (error) {
      console.error('❌ 分析結果保存エラー:', error);
      throw error;
    }
  }

  /**
   * 深夜大規模分析の実行（Step 4）
   * 深夜分析機能の実装
   */
  private static async executeDeepNightAnalysis(executionId: string, collectedData?: { profile: any, learningData: any }): Promise<any> {
    try {
      console.log('🌙 深夜大規模分析実行開始');
      
      // systemContext構築
      const systemContext = this.buildSystemContext(collectedData?.profile);
      
      // 分析実行決定構築
      const analyzeDecision = {
        action: 'analyze',
        parameters: {},
        confidence: 1.0,
        reasoning: '23:55定時深夜分析'
      };
      
      // 分析実行
      const analyzeResult = await this.executeAnalyzeAction(analyzeDecision, collectedData);
      
      console.log('✅ 深夜大規模分析完了');
      return analyzeResult;
      
    } catch (error) {
      console.error('❌ 深夜大規模分析失敗:', error);
      throw error;
    }
  }
}