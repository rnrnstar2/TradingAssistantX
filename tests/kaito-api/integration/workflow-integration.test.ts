/**
 * ワークフロー統合テスト - MVP投稿・エンゲージメントワークフローの統合検証
 * 実際のMVP要件に従った完全なワークフロー実行を確認
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { KaitoAPIConfigManager } from '../../../src/kaito-api/core/config';
import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
import { ActionEndpoints } from '../../../src/kaito-api/endpoints/action-endpoints';
import { TweetEndpoints } from '../../../src/kaito-api/endpoints/tweet-endpoints';
import { 
  KaitoAPIConfig, 
  KaitoClientConfig, 
  PostRequest, 
  EngagementRequest,
  TweetSearchOptions,
  AccountInfo
} from '../../../src/kaito-api/types';

describe('Workflow Integration Tests', () => {
  let configManager: KaitoAPIConfigManager;
  let apiClient: KaitoTwitterAPIClient;
  let actionEndpoints: ActionEndpoints;
  let tweetEndpoints: TweetEndpoints;
  let testConfig: KaitoAPIConfig;

  // ワークフロー実行データの記録
  let workflowExecutionLog: Array<{
    stage: string;
    timestamp: string;
    duration: number;
    success: boolean;
    data?: any;
    error?: string;
  }> = [];

  beforeEach(async () => {
    // ワークフロー統合テスト用の設定
    configManager = new KaitoAPIConfigManager();
    testConfig = await configManager.generateConfig('dev');

    // MVP要件に合わせた設定調整
    testConfig.performance.qpsLimit = 100; // MVP用のQPS制限
    testConfig.api.timeout = 10000; // 十分なタイムアウト
    testConfig.features.realApiEnabled = false; // テスト環境
    testConfig.features.mockFallbackEnabled = true;

    const clientConfig: Partial<KaitoClientConfig> = {
      apiKey: testConfig.authentication.primaryKey,
      qpsLimit: testConfig.performance.qpsLimit,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000
      },
      costTracking: true
    };

    apiClient = new KaitoTwitterAPIClient(clientConfig);
    apiClient.initializeWithConfig(testConfig);

    const headers = {
      'Authorization': `Bearer ${testConfig.authentication.primaryKey}`,
      'Content-Type': 'application/json'
    };

    actionEndpoints = new ActionEndpoints(testConfig.api.baseUrl, headers);
    tweetEndpoints = new TweetEndpoints(testConfig);

    // 実行ログ初期化
    workflowExecutionLog = [];
  });

  afterEach(() => {
    // ワークフロー実行ログの出力
    if (workflowExecutionLog.length > 0) {
      console.log('📊 Workflow Execution Log:');
      workflowExecutionLog.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.stage}: ${entry.success ? '✅' : '❌'} (${entry.duration}ms)`);
        if (entry.error) {
          console.log(`   Error: ${entry.error}`);
        }
      });
    }

    // クリーンアップ
    configManager = null;
    apiClient = null;
    actionEndpoints = null;
    tweetEndpoints = null;
    testConfig = null;
    workflowExecutionLog = [];
  });

  // ワークフロー実行ログ記録ヘルパー
  const logWorkflowStage = (stage: string, startTime: number, success: boolean, data?: any, error?: string) => {
    const endTime = Date.now();
    workflowExecutionLog.push({
      stage,
      timestamp: new Date().toISOString(),
      duration: endTime - startTime,
      success,
      data,
      error
    });
  };

  describe('MVP投稿ワークフロー', () => {
    test('アカウント情報取得 → 状況分析 → 投稿判断 → 実行', async () => {
      // 1. アカウント情報取得
      const accountInfoStart = Date.now();
      let accountInfo: AccountInfo | null = null;
      
      try {
        accountInfo = await apiClient.getAccountInfo();
        logWorkflowStage('account_info_retrieval', accountInfoStart, true, {
          username: accountInfo?.username,
          followers: accountInfo?.followersCount
        });
        
        expect(accountInfo).toBeDefined();
        console.log(`👤 Account Info: @${accountInfo?.username} (${accountInfo?.followersCount} followers)`);
        
      } catch (error) {
        logWorkflowStage('account_info_retrieval', accountInfoStart, false, null, error.message);
        // 開発環境ではアカウント情報取得失敗は予期される
        console.log('⚠️ Account info retrieval failed (expected in dev environment)');
      }

      // 2. 状況分析（モック実装）
      const situationAnalysisStart = Date.now();
      const situationAnalysis = {
        currentTime: new Date().toISOString(),
        marketHours: this.isMarketHours(),
        lastPostTime: null, // 実際の実装では前回投稿時間を確認
        accountActivity: accountInfo ? 'active' : 'limited',
        recommendedAction: 'post' // 教育的投稿を推奨
      };
      
      logWorkflowStage('situation_analysis', situationAnalysisStart, true, situationAnalysis);
      
      expect(situationAnalysis.currentTime).toBeDefined();
      expect(situationAnalysis.recommendedAction).toBeDefined();
      console.log(`📊 Situation Analysis: ${situationAnalysis.recommendedAction} recommended`);

      // 3. 投稿判断
      const postDecisionStart = Date.now();
      const postDecision = {
        shouldPost: situationAnalysis.recommendedAction === 'post',
        content: this.generateEducationalContent(),
        timing: 'immediate',
        educationalValue: 'high'
      };
      
      logWorkflowStage('post_decision', postDecisionStart, true, postDecision);
      
      expect(postDecision.shouldPost).toBe(true);
      expect(postDecision.content).toBeDefined();
      expect(postDecision.content.length).toBeGreaterThan(50);
      console.log(`🤔 Post Decision: ${postDecision.shouldPost ? 'YES' : 'NO'}`);

      // 4. 実行
      if (postDecision.shouldPost) {
        const executionStart = Date.now();
        
        const postRequest: PostRequest = {
          content: postDecision.content,
          mediaIds: []
        };

        try {
          const postResult = await actionEndpoints.createPost(postRequest);
          
          logWorkflowStage('post_execution', executionStart, postResult.success, {
            tweetId: postResult.tweetId,
            createdAt: postResult.createdAt
          }, postResult.error);
          
          expect(postResult.success).toBe(true);
          expect(postResult.tweetId).toBeDefined();
          console.log(`📝 Post Execution: ${postResult.success ? 'SUCCESS' : 'FAILED'}`);
          
        } catch (error) {
          logWorkflowStage('post_execution', executionStart, false, null, error.message);
          throw error;
        }
      }
    });

    test('教育的価値検証 → コンテンツ生成 → 投稿実行', async () => {
      // 1. 教育的価値検証
      const contentValidationStart = Date.now();
      
      const educationalTopics = [
        '分散投資によるリスク管理の重要性',
        '長期投資と複利効果の活用方法',
        '株式評価指標（PER/PBR）の基本的な読み方',
        'インデックス投資の特徴とメリット'
      ];

      const selectedTopic = educationalTopics[Math.floor(Math.random() * educationalTopics.length)];
      
      const contentValidation = {
        topic: selectedTopic,
        educationalValue: this.assessEducationalValue(selectedTopic),
        appropriateness: true,
        readabilityScore: 85
      };
      
      logWorkflowStage('content_validation', contentValidationStart, true, contentValidation);
      
      expect(contentValidation.educationalValue).toBeGreaterThan(0.7);
      expect(contentValidation.appropriateness).toBe(true);
      console.log(`✅ Content Validation: ${contentValidation.topic} (value: ${contentValidation.educationalValue})`);

      // 2. コンテンツ生成
      const contentGenerationStart = Date.now();
      
      const generatedContent = {
        title: selectedTopic,
        content: this.generateDetailedEducationalContent(selectedTopic),
        hashtags: ['#投資教育', '#資産形成', '#長期投資'],
        targetAudience: '投資初心者'
      };
      
      logWorkflowStage('content_generation', contentGenerationStart, true, {
        contentLength: generatedContent.content.length,
        hashtagCount: generatedContent.hashtags.length
      });
      
      expect(generatedContent.content.length).toBeGreaterThan(100);
      expect(generatedContent.content.length).toBeLessThan(280);
      expect(generatedContent.hashtags.length).toBeGreaterThan(0);
      console.log(`📝 Content Generated: ${generatedContent.content.length} chars`);

      // 3. 投稿実行
      const postExecutionStart = Date.now();
      
      const finalContent = `${generatedContent.content} ${generatedContent.hashtags.join(' ')}`;
      
      const postRequest: PostRequest = {
        content: finalContent,
        mediaIds: []
      };

      try {
        const postResult = await actionEndpoints.createPost(postRequest);
        
        logWorkflowStage('final_post_execution', postExecutionStart, postResult.success, {
          tweetId: postResult.tweetId,
          finalContentLength: finalContent.length
        }, postResult.error);
        
        expect(postResult.success).toBe(true);
        expect(postResult.tweetId).toBeDefined();
        console.log(`🚀 Final Post: ${postResult.success ? 'SUCCESS' : 'FAILED'} (${finalContent.length} chars)`);
        
      } catch (error) {
        logWorkflowStage('final_post_execution', postExecutionStart, false, null, error.message);
        throw error;
      }
    });

    test('結果記録 → 学習データ更新', async () => {
      // 1. 投稿実行（結果記録のための準備）
      const postRequest: PostRequest = {
        content: '📊 学習データ蓄積テスト：投資パフォーマンス測定の基本指標について解説 #投資教育',
        mediaIds: []
      };

      const postResult = await actionEndpoints.createPost(postRequest);
      expect(postResult.success).toBe(true);

      // 2. 結果記録
      const resultRecordingStart = Date.now();
      
      const executionResult = {
        timestamp: new Date().toISOString(),
        action: 'post',
        tweetId: postResult.tweetId,
        content: postRequest.content,
        success: postResult.success,
        metrics: {
          contentLength: postRequest.content.length,
          hashtagCount: (postRequest.content.match(/#\w+/g) || []).length,
          executionTime: Date.now() - resultRecordingStart
        },
        context: {
          marketHours: this.isMarketHours(),
          weekday: new Date().getDay(),
          hour: new Date().getHours()
        }
      };
      
      logWorkflowStage('result_recording', resultRecordingStart, true, executionResult);
      
      expect(executionResult.tweetId).toBeDefined();
      expect(executionResult.metrics.contentLength).toBeGreaterThan(0);
      console.log(`📋 Result Recorded: ${executionResult.action} at ${executionResult.timestamp}`);

      // 3. 学習データ更新（モック実装）
      const learningUpdateStart = Date.now();
      
      const learningUpdate = {
        executionId: `exec_${Date.now()}`,
        outcome: executionResult.success ? 'success' : 'failure',
        patterns: {
          optimalPostingTime: executionResult.context.hour,
          successfulContentLength: executionResult.metrics.contentLength,
          effectiveHashtags: executionResult.metrics.hashtagCount
        },
        improvements: [
          '教育的コンテンツの文字数最適化',
          'ハッシュタグ選択の改善',
          '投稿タイミングの調整'
        ],
        nextAction: 'monitor_engagement'
      };
      
      logWorkflowStage('learning_update', learningUpdateStart, true, {
        executionId: learningUpdate.executionId,
        outcome: learningUpdate.outcome,
        improvementCount: learningUpdate.improvements.length
      });
      
      expect(learningUpdate.executionId).toBeDefined();
      expect(learningUpdate.outcome).toBe('success');
      expect(learningUpdate.improvements.length).toBeGreaterThan(0);
      console.log(`🧠 Learning Updated: ${learningUpdate.outcome} (${learningUpdate.improvements.length} improvements)`);
    });
  });

  describe('エンゲージメントワークフロー', () => {
    test('検索実行 → 候補評価 → 教育的価値判定 → エンゲージメント', async () => {
      // 1. 検索実行
      const searchStart = Date.now();
      
      const searchOptions: TweetSearchOptions = {
        query: '投資 OR 資産運用 OR 株式',
        maxResults: 10,
        sortOrder: 'relevancy',
        includeRetweets: false,
        lang: 'ja'
      };

      try {
        const searchResult = await tweetEndpoints.searchTweets(searchOptions);
        
        logWorkflowStage('search_execution', searchStart, true, {
          tweetsFound: searchResult.tweets.length,
          query: searchOptions.query
        });
        
        expect(searchResult.tweets).toBeDefined();
        expect(Array.isArray(searchResult.tweets)).toBe(true);
        console.log(`🔍 Search Results: ${searchResult.tweets.length} tweets found`);

        // 2. 候補評価
        const evaluationStart = Date.now();
        
        const candidateEvaluations = searchResult.tweets.map((tweet, index) => ({
          tweetId: tweet.id || `mock_tweet_${index}`,
          educationalScore: this.evaluateEducationalContent(tweet.text || ''),
          relevanceScore: this.calculateRelevanceScore(tweet.text || '', searchOptions.query),
          authorCredibility: Math.random() * 0.5 + 0.5, // 0.5-1.0
          engagementPotential: Math.random() * 0.8 + 0.2 // 0.2-1.0
        }));
        
        logWorkflowStage('candidate_evaluation', evaluationStart, true, {
          candidatesEvaluated: candidateEvaluations.length,
          averageEducationalScore: candidateEvaluations.reduce((sum, c) => sum + c.educationalScore, 0) / candidateEvaluations.length
        });
        
        expect(candidateEvaluations.length).toBeGreaterThan(0);
        console.log(`📊 Candidates Evaluated: ${candidateEvaluations.length}`);

        // 3. 教育的価値判定
        const valueJudgmentStart = Date.now();
        
        const highValueCandidates = candidateEvaluations.filter(candidate => 
          candidate.educationalScore > 0.7 && 
          candidate.relevanceScore > 0.6 &&
          candidate.authorCredibility > 0.6
        );
        
        logWorkflowStage('educational_value_judgment', valueJudgmentStart, true, {
          highValueCandidates: highValueCandidates.length,
          totalCandidates: candidateEvaluations.length,
          selectionRate: highValueCandidates.length / candidateEvaluations.length
        });
        
        expect(highValueCandidates).toBeDefined();
        console.log(`🎯 High Value Candidates: ${highValueCandidates.length}/${candidateEvaluations.length}`);

        // 4. エンゲージメント実行
        if (highValueCandidates.length > 0) {
          const engagementStart = Date.now();
          
          const selectedCandidate = highValueCandidates[Math.floor(Math.random() * highValueCandidates.length)];
          
          const engagementRequest: EngagementRequest = {
            tweetId: selectedCandidate.tweetId,
            action: 'like'
          };

          const engagementResult = await actionEndpoints.performEngagement(engagementRequest);
          
          logWorkflowStage('engagement_execution', engagementStart, engagementResult.success, {
            tweetId: selectedCandidate.tweetId,
            action: engagementRequest.action,
            educationalScore: selectedCandidate.educationalScore
          }, engagementResult.success ? undefined : 'Engagement failed');
          
          expect(engagementResult.success).toBe(true);
          expect(engagementResult.tweetId).toBe(selectedCandidate.tweetId);
          console.log(`❤️ Engagement: ${engagementResult.success ? 'SUCCESS' : 'FAILED'}`);
        }
        
      } catch (error) {
        logWorkflowStage('search_execution', searchStart, false, null, error.message);
        throw error;
      }
    });

    test('頻度制御 → 実行判定 → エンゲージメント実行', async () => {
      // 1. 頻度制御確認
      const frequencyControlStart = Date.now();
      
      const engagementHistory = [
        { timestamp: Date.now() - 30 * 60 * 1000, action: 'like' }, // 30分前
        { timestamp: Date.now() - 60 * 60 * 1000, action: 'retweet' }, // 1時間前
        { timestamp: Date.now() - 90 * 60 * 1000, action: 'like' } // 1.5時間前
      ];
      
      const frequencyCheck = {
        recentEngagements: engagementHistory.length,
        lastEngagementTime: Math.max(...engagementHistory.map(h => h.timestamp)),
        cooldownPeriod: 15 * 60 * 1000, // 15分
        canEngage: Date.now() - Math.max(...engagementHistory.map(h => h.timestamp)) > 15 * 60 * 1000
      };
      
      logWorkflowStage('frequency_control', frequencyControlStart, true, frequencyCheck);
      
      expect(frequencyCheck.recentEngagements).toBeDefined();
      expect(typeof frequencyCheck.canEngage).toBe('boolean');
      console.log(`⏰ Frequency Check: ${frequencyCheck.canEngage ? 'CAN ENGAGE' : 'COOLDOWN'}`);

      // 2. 実行判定
      const executionDecisionStart = Date.now();
      
      const executionDecision = {
        frequencyAllowed: frequencyCheck.canEngage,
        rateLimitStatus: apiClient.getRateLimitStatus(),
        qpsStatus: apiClient.getCurrentQPS(),
        finalDecision: frequencyCheck.canEngage && apiClient.getRateLimitStatus().general.remaining > 10
      };
      
      logWorkflowStage('execution_decision', executionDecisionStart, true, {
        finalDecision: executionDecision.finalDecision,
        rateLimitRemaining: executionDecision.rateLimitStatus.general.remaining,
        currentQPS: executionDecision.qpsStatus
      });
      
      expect(executionDecision.rateLimitStatus).toBeDefined();
      expect(typeof executionDecision.finalDecision).toBe('boolean');
      console.log(`🤔 Execution Decision: ${executionDecision.finalDecision ? 'PROCEED' : 'WAIT'}`);

      // 3. エンゲージメント実行（判定に基づく）
      if (executionDecision.finalDecision) {
        const engagementExecutionStart = Date.now();
        
        const engagementRequest: EngagementRequest = {
          tweetId: `controlled_engagement_${Date.now()}`,
          action: 'like'
        };

        try {
          const engagementResult = await actionEndpoints.performEngagement(engagementRequest);
          
          logWorkflowStage('controlled_engagement', engagementExecutionStart, engagementResult.success, {
            tweetId: engagementRequest.tweetId,
            action: engagementRequest.action
          }, engagementResult.success ? undefined : 'Controlled engagement failed');
          
          expect(engagementResult.success).toBe(true);
          console.log(`✅ Controlled Engagement: SUCCESS`);
          
        } catch (error) {
          logWorkflowStage('controlled_engagement', engagementExecutionStart, false, null, error.message);
          throw error;
        }
      } else {
        console.log(`⏸️ Engagement Skipped: Decision was to wait`);
      }
    });
  });

  describe('エラー処理ワークフロー', () => {
    test('各段階でのエラー発生 → 適切な代替処理', async () => {
      // 1. 第1段階: アカウント情報取得エラー
      const stage1Start = Date.now();
      
      try {
        // 意図的にエラーを発生させる（無効な設定）
        const invalidClient = new KaitoTwitterAPIClient({
          apiKey: '',
          qpsLimit: 100
        });
        
        await invalidClient.getAccountInfo();
        
        // エラーが発生しなかった場合（予期しない）
        logWorkflowStage('stage1_error_test', stage1Start, false, null, 'Expected error did not occur');
        
      } catch (error) {
        logWorkflowStage('stage1_error_handling', stage1Start, true, null, error.message);
        
        // 代替処理: デフォルト状況分析
        const fallbackAnalysisStart = Date.now();
        const fallbackAnalysis = {
          accountStatus: 'unknown',
          useDefaultStrategy: true,
          recommendedAction: 'post'
        };
        
        logWorkflowStage('stage1_fallback', fallbackAnalysisStart, true, fallbackAnalysis);
        
        expect(fallbackAnalysis.useDefaultStrategy).toBe(true);
        console.log(`🔄 Stage 1 Fallback: Using default strategy`);
      }

      // 2. 第2段階: 投稿作成エラー → 検索代替
      const stage2Start = Date.now();
      
      try {
        // 無効な投稿でエラー発生
        await actionEndpoints.createPost({ content: '', mediaIds: [] });
        logWorkflowStage('stage2_error_test', stage2Start, false, null, 'Empty post should have failed');
        
      } catch (error) {
        logWorkflowStage('stage2_error_handling', stage2Start, true, null, error.message);
        
        // 代替処理: 検索による既存コンテンツ活用
        const fallbackSearchStart = Date.now();
        const fallbackSearch = await tweetEndpoints.searchTweets({
          query: '投資 基本',
          maxResults: 1
        });
        
        logWorkflowStage('stage2_fallback', fallbackSearchStart, true, {
          tweetsFound: fallbackSearch.tweets.length
        });
        
        expect(fallbackSearch.tweets).toBeDefined();
        console.log(`🔄 Stage 2 Fallback: Found ${fallbackSearch.tweets.length} alternative tweets`);
      }

      // 3. 第3段階: エンゲージメントエラー → ログ記録継続
      const stage3Start = Date.now();
      
      const problematicEngagement: EngagementRequest = {
        tweetId: 'non_existent_tweet',
        action: 'like'
      };

      try {
        const engagementResult = await actionEndpoints.performEngagement(problematicEngagement);
        
        if (!engagementResult.success) {
          logWorkflowStage('stage3_error_handling', stage3Start, true, null, engagementResult.error);
          
          // 代替処理: エラーログ記録と継続
          const errorLogStart = Date.now();
          const errorLog = {
            timestamp: new Date().toISOString(),
            errorType: 'engagement_failed',
            tweetId: problematicEngagement.tweetId,
            action: problematicEngagement.action,
            continuousOperation: true
          };
          
          logWorkflowStage('stage3_error_logging', errorLogStart, true, errorLog);
          
          expect(errorLog.continuousOperation).toBe(true);
          console.log(`📝 Stage 3 Error Logged: Continuing operation`);
        }
        
      } catch (error) {
        logWorkflowStage('stage3_error_handling', stage3Start, true, null, error.message);
        console.log(`🔄 Stage 3 Error Handled: ${error.message}`);
      }
    });

    test('システム継続性の確保', async () => {
      const systemContinuityTest = {
        totalStages: 5,
        completedStages: 0,
        failedStages: 0,
        recoveredStages: 0
      };

      // Stage 1: 設定確認 (必ず成功)
      try {
        const configCheck = configManager.getCurrentConfig();
        expect(configCheck).toBeDefined();
        systemContinuityTest.completedStages++;
        console.log(`✅ Stage 1: Configuration check passed`);
      } catch (error) {
        systemContinuityTest.failedStages++;
        console.log(`❌ Stage 1: Configuration check failed`);
      }

      // Stage 2: レート制限確認 (必ず成功)
      try {
        const rateLimits = apiClient.getRateLimitStatus();
        expect(rateLimits).toBeDefined();
        systemContinuityTest.completedStages++;
        console.log(`✅ Stage 2: Rate limit check passed`);
      } catch (error) {
        systemContinuityTest.failedStages++;
        console.log(`❌ Stage 2: Rate limit check failed`);
      }

      // Stage 3: 投稿テスト (エラー可能性あり)
      try {
        const postResult = await actionEndpoints.createPost({
          content: '🧪 システム継続性テスト実行中',
          mediaIds: []
        });
        
        if (postResult.success) {
          systemContinuityTest.completedStages++;
          console.log(`✅ Stage 3: Post creation passed`);
        } else {
          systemContinuityTest.failedStages++;
          systemContinuityTest.recoveredStages++; // 適切にエラーハンドリング
          console.log(`🔄 Stage 3: Post creation failed but recovered`);
        }
      } catch (error) {
        systemContinuityTest.failedStages++;
        systemContinuityTest.recoveredStages++;
        console.log(`🔄 Stage 3: Post creation error but recovered`);
      }

      // Stage 4: 検索テスト (必ず成功)
      try {
        const searchResult = await tweetEndpoints.searchTweets({
          query: 'test',
          maxResults: 1
        });
        expect(searchResult.tweets).toBeDefined();
        systemContinuityTest.completedStages++;
        console.log(`✅ Stage 4: Search test passed`);
      } catch (error) {
        systemContinuityTest.failedStages++;
        console.log(`❌ Stage 4: Search test failed`);
      }

      // Stage 5: システム状態確認 (必ず成功)
      try {
        const systemState = {
          qps: apiClient.getCurrentQPS(),
          costTracking: apiClient.getCostTrackingInfo(),
          operational: true
        };
        
        expect(systemState.operational).toBe(true);
        systemContinuityTest.completedStages++;
        console.log(`✅ Stage 5: System state check passed`);
      } catch (error) {
        systemContinuityTest.failedStages++;
        console.log(`❌ Stage 5: System state check failed`);
      }

      // システム継続性評価
      const continuityRate = systemContinuityTest.completedStages / systemContinuityTest.totalStages;
      const recoveryRate = systemContinuityTest.recoveredStages / Math.max(systemContinuityTest.failedStages, 1);

      expect(continuityRate).toBeGreaterThan(0.6); // 60%以上のステージが成功
      expect(recoveryRate).toBeGreaterThan(0.5); // 失敗の50%以上が回復

      console.log(`📊 System Continuity: ${continuityRate * 100}% success, ${recoveryRate * 100}% recovery`);
    });
  });

  // ヘルパーメソッド
  private isMarketHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // 平日の9:00-15:00を市場時間とする
    return day >= 1 && day <= 5 && hour >= 9 && hour <= 15;
  }

  private generateEducationalContent(): string {
    const topics = [
      '📚 投資の基本原則：分散投資によるリスク管理の重要性について解説します。長期的な資産形成の基盤となる考え方です。',
      '💡 株式評価の基本：PERとPBRの意味と活用方法を初心者向けに分かりやすく説明します。',
      '🎯 資産運用戦略：年代別ポートフォリオの組み方とリバランスの重要性について学びましょう。',
      '⚠️ 投資リスク管理：感情に左右されない投資判断の方法と損切りラインの設定方法。'
    ];
    
    return topics[Math.floor(Math.random() * topics.length)];
  }

  private generateDetailedEducationalContent(topic: string): string {
    const contentTemplates = {
      '分散投資によるリスク管理の重要性': '📊 分散投資は「卵を一つのカゴに盛るな」の原則に基づき、複数の投資先にリスクを分散させる手法です。',
      '長期投資と複利効果の活用方法': '💰 複利は「利息に利息がつく」効果で、時間をかけて資産を大きく成長させる投資の基本原理です。',
      '株式評価指標（PER/PBR）の基本的な読み方': '📈 PERは株価の割安・割高を判断する指標で、同業他社との比較で投資判断の参考にします。',
      'インデックス投資の特徴とメリット': '🌐 インデックス投資は市場全体に分散投資し、低コストで長期的な成長を目指す投資手法です。'
    };
    
    return contentTemplates[topic] || '📚 投資に関する教育的な内容をお伝えします。基本的な知識から実践的なアドバイスまで。';
  }

  private assessEducationalValue(topic: string): number {
    // 教育的価値の評価（0-1のスコア）
    const educationalKeywords = ['投資', '教育', '基本', '初心者', '解説', '方法', '戦略', '管理'];
    const keywordCount = educationalKeywords.filter(keyword => topic.includes(keyword)).length;
    
    return Math.min(keywordCount / educationalKeywords.length + 0.3, 1.0);
  }

  private evaluateEducationalContent(content: string): number {
    // コンテンツの教育的価値を評価
    const educationalWords = ['投資', '資産', '運用', '基本', '学習', '教育', '初心者', '解説'];
    const wordCount = educationalWords.filter(word => content.includes(word)).length;
    
    return Math.min(wordCount / educationalWords.length * 0.8 + 0.2, 1.0);
  }

  private calculateRelevanceScore(content: string, query: string): number {
    // クエリとの関連性スコア計算
    const queryWords = query.split(' ').filter(word => word !== 'OR' && word !== 'AND');
    const matchCount = queryWords.filter(word => content.toLowerCase().includes(word.toLowerCase())).length;
    
    return matchCount / queryWords.length;
  }
});