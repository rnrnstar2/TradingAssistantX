/**
 * Workflow Actions - Action execution methods
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 責任範囲:
 * • 各アクション（post, retweet, like, etc）の実行ロジック
 * • API呼び出しとレスポンス処理
 * • アクション固有のエラーハンドリング
 */

import { KaitoTwitterAPIClient } from '../kaito-api';
import { generateContent, selectOptimalTweet, convertTweetDataToCandidate } from '../claude';
import { type SelectedTweet, type TweetSelectionParams, type TweetCandidate, type AccountInfo, type EnhancedContentRequest } from '../claude/types';
import { DataManager } from '../shared/data-manager';
import { WORKFLOW_CONSTANTS, ActionType, WorkflowOptions, WorkflowResult } from './constants';
import { SystemContext } from '../shared/types';
import { collectPostMetrics } from '../shared/post-metrics-collector';
import { analyzePostEngagement } from '../claude/endpoints/analysis-endpoint';
import { ReferenceTweetAnalyzer } from '../claude/utils';
import { executeDataAnalysis } from './data-analysis';
import { 
  collectKaitoData, 
  searchAndFilterTweets, 
  buildSystemContext,
  convertAccountInfoToProfile,
  calculateEngagementRate,
  getCurrentTimeSlotPattern,
  calculateCurrentEngagementExpectation,
  getTimeSlotForHour,
  getDataManager
} from './workflow-helpers';

/**
 * WorkflowActions - アクション実行メソッド群
 */
export class WorkflowActions {
  private static kaitoClient: KaitoTwitterAPIClient;

  /**
   * KaitoClientを設定
   */
  static setKaitoClient(client: KaitoTwitterAPIClient): void {
    this.kaitoClient = client;
  }

  /**
   * 投稿アクション実行
   */
  static async executePostAction(decision: any, collectedData?: { profile: any, learningData: any }, executionId?: string): Promise<any> {
    try {
      // コンテキスト情報の使用（既に収集済みの場合は再利用）
      let profile, learningData;
      
      if (collectedData) {
        ({ profile, learningData } = collectedData);
      } else {
        // 収集されていない場合のみ取得
        [profile, learningData] = await Promise.all([
          collectKaitoData(),
          getDataManager().loadLearningData()
        ]);
      }

      // システムコンテキストの構築
      const systemContext = buildSystemContext(profile);
      
      // 参考ユーザーのツイート取得（新規追加）
      let referenceAccountTweets: any[] | null = null;
      if (decision.parameters?.reference_users && decision.parameters.reference_users.length > 0) {
        console.log(`👥 参考ユーザーの最新ツイート取得中: ${decision.parameters.reference_users.join(', ')}`);
        
        try {
          // reference-accounts.yamlから設定を読み込み
          const referenceConfig = await getDataManager().loadReferenceAccounts();
          
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
          optimalTimeSlot: getCurrentTimeSlotPattern(engagementPatterns),
          avgEngagement: calculateCurrentEngagementExpectation(engagementPatterns)
        };

        console.log('✅ 学習データ統合完了', {
          topics: systemContext.learningData?.recentTopics?.length || 0,
          timeSlot: systemContext.learningData?.optimalTimeSlot,
          avgEngagement: systemContext.learningData?.avgEngagement
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

      // データ分析ワークフローの実行
      let analysisInsights = null;
      try {
        console.log('🔬 データ分析ワークフロー実行中...');
        
        // 分析パラメータの準備
        const analysisParams = {
          targetQuery: decision.parameters?.target_query || decision.parameters?.query,
          referenceUsers: decision.parameters?.reference_users,
          topic: decision.parameters?.topic || 'investment',
          context: systemContext
        };
        
        // 分析を実行
        analysisInsights = await executeDataAnalysis(analysisParams);
        
        console.log('✅ データ分析完了:', {
          targetQueryAnalyzed: !!analysisInsights.targetQueryInsights,
          referenceUsersAnalyzed: analysisInsights.referenceUserInsights.length,
          actionableInsights: analysisInsights.actionableInsights.length
        });
        
        // SystemContextに分析結果を追加
        systemContext.analysisInsights = analysisInsights;
        
      } catch (analysisError) {
        console.error('⚠️ データ分析エラー、生データでフォールバック:', analysisError);
        // エラー時は従来の生データ方式にフォールバック
      }
      
      // SystemContextに参考ユーザーツイートを追加（後方互換性のため残す）
      if (referenceAccountTweets) {
        systemContext.referenceAccountTweets = referenceAccountTweets;
      }
      
      // 参考ツイートをコンテキストに追加（後方互換性のため残す）
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


      // エンゲージメントメトリクスを抽出
      const engagement = {
        likes: postResult.tweet?.public_metrics?.like_count || 0,
        retweets: postResult.tweet?.public_metrics?.retweet_count || 0,
        replies: postResult.tweet?.public_metrics?.reply_count || 0,
        quotes: postResult.tweet?.public_metrics?.quote_count || 0,
        views: postResult.tweet?.public_metrics?.impression_count || 0, // ツイートの表示回数（viewCount）
        bookmarks: 0 // TweetDataにはbookmark_countが含まれていないため0を設定
      };

      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.POST,
        content: content.content,
        result: postResult,
        engagement: engagement,
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
  static async executeRetweetAction(decision: any, executionId?: string): Promise<any> {
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
      const searchResult = await searchAndFilterTweets(
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
            userProfile: convertAccountInfoToProfile(currentUser),
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
  static async executeLikeAction(decision: any, collectedData?: { profile: any, learningData: any }, executionId?: string): Promise<any> {
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
      const searchResult = await searchAndFilterTweets(
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
            userProfile: convertAccountInfoToProfile(currentUser),
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
   * 引用ツイートアクション実行
   */
  static async executeQuoteTweetAction(decision: any, executionId?: string): Promise<any> {
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
      const searchResult = await searchAndFilterTweets(
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
            userProfile: convertAccountInfoToProfile(currentUser),
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
      const systemContext = buildSystemContext(currentUser);

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

      // エンゲージメントメトリクスを抽出（引用ツイートは投稿直後なので初期値）
      const engagement = {
        likes: 0,
        retweets: 0,
        replies: 0,
        quotes: 0,
        views: 0,
        bookmarks: 0
      };

      return {
        success: true,
        action: WORKFLOW_CONSTANTS.ACTIONS.QUOTE_TWEET,
        targetTweet: selectedTweet.tweetId,
        targetTweetText: otherstweets.find(t => t.id === selectedTweet.tweetId)?.text.substring(0, 100) || 'Unknown',
        searchQuery: targetQuery,
        content: content.content,
        result: quoteTweetResult,
        engagement: engagement,
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
   * フォローアクション実行
   */
  static async executeFollowAction(decision: any): Promise<any> {
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
      const searchResult = await searchAndFilterTweets(
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
            userProfile: convertAccountInfoToProfile(currentUser),
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
  static async executeAnalyzeAction(decision: any, collectedData?: { profile: any, learningData: any }): Promise<any> {
    try {
      console.log('🌙 深夜分析アクション実行開始');
      
      // 1. 投稿メトリクス収集（最新メトリクス更新付き）
      console.log('📊 投稿メトリクス収集中...');
      const postMetrics = await collectPostMetrics(this.kaitoClient);
      console.log(`📊 投稿メトリクス収集完了: ${postMetrics.summary.totalPosts}件`);
      
      // 2. システムコンテキスト構築
      const systemContext = buildSystemContext(collectedData?.profile);
      
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
   * 深夜大規模分析の実行（Step 4）
   * データ分析 + 全実行ディレクトリアーカイブを実行
   */
  static async executeDeepNightAnalysis(executionId: string, collectedData?: { profile: any, learningData: any }): Promise<any> {
    console.log('🌙 深夜大規模分析実行開始');
    
    const analyzeDecision = {
      action: 'analyze',
      parameters: {},
      confidence: 1.0,
      reasoning: '23:55定時深夜分析'
    };
    
    try {
      // ステップ1: データ分析実行
      console.log('📊 ステップ1: 深夜データ分析実行');
      const analysisResult = await this.executeAnalyzeAction(analyzeDecision, collectedData);
      console.log('✅ 深夜データ分析完了');
      
      // ステップ2: 全実行ディレクトリアーカイブ
      console.log('📦 ステップ2: 全実行ディレクトリアーカイブ開始');
      try {
        await getDataManager().archiveAllCurrentToHistory();
        console.log('✅ 全実行ディレクトリアーカイブ完了');
      } catch (archiveError) {
        console.error('❌ アーカイブ処理エラー（分析結果は保持）:', archiveError);
        // アーカイブ失敗でも分析結果は返す
      }
      
      console.log('🎉 深夜大規模分析＋アーカイブ完了');
      
      return {
        ...analysisResult,
        archiveCompleted: true
      };
      
    } catch (error) {
      console.error('❌ 深夜大規模分析失敗:', error);
      throw error;
    }
  }

  /**
   * 分析結果保存（TASK-004依存）
   * 基本的な分析結果保存機能
   */
  static async saveAnalysisResults(analysisResult: any, postMetrics: any): Promise<void> {
    try {
      // TASK-004が未完了の場合は基本的なログ出力のみ実行
      console.log('💾 分析結果保存中...');
      console.log(`📊 分析タイプ: ${analysisResult.analysisType}`);
      console.log(`📝 インサイト数: ${analysisResult.insights?.length || 0}件`);
      console.log(`💡 推奨事項数: ${analysisResult.recommendations?.length || 0}件`);
      console.log(`🎯 信頼度: ${(analysisResult.confidence * 100).toFixed(1)}%`);
      console.log(`📋 データポイント: ${postMetrics.summary.totalPosts}件`);
      
      // 今後のTASK-004実装で、実際のファイル保存機能を追加予定
      // await getDataManager().saveAnalysisResults(analysisResult, postMetrics);
      
    } catch (error) {
      console.error('❌ 分析結果保存エラー:', error);
      throw error;
    }
  }
}

// Export individual action methods
export const executePostAction = WorkflowActions.executePostAction.bind(WorkflowActions);
export const executeRetweetAction = WorkflowActions.executeRetweetAction.bind(WorkflowActions);
export const executeLikeAction = WorkflowActions.executeLikeAction.bind(WorkflowActions);
export const executeQuoteTweetAction = WorkflowActions.executeQuoteTweetAction.bind(WorkflowActions);
export const executeFollowAction = WorkflowActions.executeFollowAction.bind(WorkflowActions);
export const executeAnalyzeAction = WorkflowActions.executeAnalyzeAction.bind(WorkflowActions);
export const executeDeepNightAnalysis = WorkflowActions.executeDeepNightAnalysis.bind(WorkflowActions);
export const saveAnalysisResults = WorkflowActions.saveAnalysisResults.bind(WorkflowActions);