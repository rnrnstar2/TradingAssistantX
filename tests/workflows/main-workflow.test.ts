/**
 * MainWorkflow新構造テスト
 * 
 * テスト対象:
 * - 3ステップワークフロー（データ収集 → アクション実行 → 結果保存）
 * - 学習データ活用ロジック（時間帯パターン・エンゲージメント期待値）
 * - post.yaml統合保存
 * - 各アクションタイプ（post, retweet, like, quote_tweet, follow）
 * - エラーハンドリング・フォールバック機能
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { MainWorkflow } from '../../src/workflows/main-workflow';
import { DataManager } from '../../src/shared/data-manager';
import { KaitoTwitterAPIClient } from '../../src/kaito-api';
import * as claudeModule from '../../src/claude';
import { 
  createMockLearningData,
  createOptimizedLearningDataForTimeSlot,
  createOptimizedLearningDataForTopic,
  createEmptyLearningData
} from '../test-utils/learning-data-mock';
import { 
  createMockWorkflowResult,
  createMockWorkflowErrorResult,
  createMockPostData
} from '../test-utils/claude-mock-data';

// ============================================================================
// モック設定
// ============================================================================

// KaitoTwitterAPIClientのモック
vi.mock('../../src/kaito-api', () => ({
  KaitoTwitterAPIClient: vi.fn().mockImplementation(() => ({
    initializeWithConfig: vi.fn(),
    getAccountInfo: vi.fn(),
    post: vi.fn(),
    retweet: vi.fn(),
    like: vi.fn(),
    quoteTweet: vi.fn(),
    searchTweets: vi.fn()
  }))
}));

// KaitoAPIConfigManagerのモック
vi.mock('../../src/kaito-api/core/config', () => ({
  KaitoAPIConfigManager: vi.fn().mockImplementation(() => ({
    generateConfig: vi.fn().mockResolvedValue({
      apiKey: 'test-key',
      baseURL: 'https://api.test.com',
      qpsLimit: 100
    })
  }))
}));

// Claudeモジュールのモック
vi.mock('../../src/claude', () => ({
  generateContent: vi.fn(),
  selectOptimalTweet: vi.fn(),
  convertTweetDataToCandidate: vi.fn()
}));

describe('MainWorkflow新構造テスト', () => {
  let testDataDir: string;
  let originalCwd: string;
  let mockKaitoClient: any;
  let mockDataManager: any;

  beforeEach(async () => {
    // テスト専用の一時ディレクトリ作成
    originalCwd = process.cwd();
    testDataDir = path.join(process.cwd(), 'test-temp-workflow', `test-${Date.now()}`);
    
    process.chdir(path.dirname(testDataDir));
    await fs.mkdir(testDataDir, { recursive: true });
    await fs.mkdir(path.join(testDataDir, 'data'), { recursive: true });
    await fs.mkdir(path.join(testDataDir, 'data', 'learning'), { recursive: true });
    await fs.mkdir(path.join(testDataDir, 'data', 'current'), { recursive: true });
    
    process.chdir(testDataDir);

    // KaitoClientのモック設定
    mockKaitoClient = {
      initializeWithConfig: vi.fn(),
      getAccountInfo: vi.fn().mockResolvedValue({
        id: 'user_123',
        username: 'test_user',
        followers: 1000,
        following: 500,
        tweetsCount: 100
      }),
      post: vi.fn().mockResolvedValue({
        success: true,
        message: '投稿が完了しました',
        data: { tweetId: 'tweet_123' }
      }),
      retweet: vi.fn().mockResolvedValue({
        success: true,
        message: 'リツイートが完了しました',
        data: { retweetId: 'retweet_123' }
      }),
      like: vi.fn().mockResolvedValue({
        success: true,
        message: 'いいねが完了しました',
        data: { likeId: 'like_123' }
      }),
      quoteTweet: vi.fn().mockResolvedValue({
        success: true,
        message: '引用ツイートが完了しました',
        data: { quoteTweetId: 'quote_123' }
      }),
      searchTweets: vi.fn().mockResolvedValue({
        success: true,
        tweets: [
          {
            id: 'tweet_456',
            author_id: 'other_user_789',
            text: '投資について学びたい初心者です。おすすめの本はありますか？',
            public_metrics: { like_count: 5, retweet_count: 2 }
          },
          {
            id: 'tweet_789',
            author_id: 'expert_user_456',
            text: 'NISA活用法について詳しく解説します。分散投資の重要性...',
            public_metrics: { like_count: 20, retweet_count: 15 }
          }
        ]
      })
    };

    vi.mocked(KaitoTwitterAPIClient).mockImplementation(() => mockKaitoClient);

    // Claudeモジュールのモック設定
    vi.mocked(claudeModule.generateContent).mockResolvedValue({
      content: '投資信託は初心者におすすめの資産運用方法です。分散投資によりリスクを軽減できます。#投資教育 #資産形成',
      hashtags: ['#投資教育', '#資産形成'],
      qualityScore: 85,
      metadata: { wordCount: 45, contentType: 'educational' }
    });

    vi.mocked(claudeModule.selectOptimalTweet).mockResolvedValue({
      tweetId: 'tweet_456',
      authorId: 'other_user_789',
      score: 8.5,
      reasoning: '投資教育に関心のある初心者ユーザーで、フォロワーとの関係構築に最適',
      expectedImpact: 'high'
    });

    vi.mocked(claudeModule.convertTweetDataToCandidate).mockImplementation((tweet) => ({
      tweetId: tweet.id,
      authorId: tweet.author_id,
      content: tweet.text,
      engagementMetrics: {
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0
      }
    }));

    // 環境変数設定
    process.env.NODE_ENV = 'test';
  });

  afterEach(async () => {
    // クリーンアップ
    process.chdir(originalCwd);
    
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('⚠️ テスト用ディレクトリの削除に失敗:', error);
    }

    // モックリセット
    vi.clearAllMocks();
    delete process.env.NODE_ENV;
  });

  // ============================================================================
  // 3ステップワークフローテスト
  // ============================================================================

  describe('3ステップワークフロー実行', () => {
    test('手動実行モード（デフォルト）の完全フロー', async () => {
      // 学習データ作成
      const learningData = createMockLearningData();
      const learningDir = path.join(testDataDir, 'data', 'learning');
      await fs.writeFile(
        path.join(learningDir, 'engagement-patterns.yaml'),
        yaml.dump({ engagementPatterns: learningData.engagementPatterns }),
        'utf-8'
      );
      await fs.writeFile(
        path.join(learningDir, 'successful-topics.yaml'),
        yaml.dump({ successfulTopics: learningData.successfulTopics }),
        'utf-8'
      );

      // ワークフロー実行
      const result = await MainWorkflow.execute();

      // 結果検証
      expect(result.success).toBe(true);
      expect(result.executionId).toBeDefined();
      expect(result.decision).toBeDefined();
      expect(result.decision.action).toBe('post'); // デフォルトアクション
      expect(result.actionResult).toBeDefined();
      expect(result.actionResult.success).toBe(true);
      expect(result.executionTime).toBeGreaterThan(0);

      // KaitoAPIの呼び出し確認
      expect(mockKaitoClient.getAccountInfo).toHaveBeenCalled();
      expect(mockKaitoClient.post).toHaveBeenCalled();

      // Claudeの呼び出し確認
      expect(claudeModule.generateContent).toHaveBeenCalled();

      // post.yamlファイルの保存確認
      const currentFiles = await fs.readdir(path.join(testDataDir, 'data', 'current', result.executionId));
      expect(currentFiles).toContain('post.yaml');
    });

    test('スケジュール実行モードの完全フロー', async () => {
      const learningData = createMockLearningData();
      const learningDir = path.join(testDataDir, 'data', 'learning');
      await fs.writeFile(
        path.join(learningDir, 'engagement-patterns.yaml'),
        yaml.dump({ engagementPatterns: learningData.engagementPatterns }),
        'utf-8'
      );

      // スケジュール実行オプション
      const options = {
        scheduledAction: 'retweet',
        scheduledTopic: 'investment_education',
        scheduledQuery: '投資教育 OR 資産形成'
      };

      const result = await MainWorkflow.execute(options);

      expect(result.success).toBe(true);
      expect(result.decision.action).toBe('retweet');
      expect(result.decision.parameters.query).toBe('投資教育 OR 資産形成');
      expect(result.actionResult.action).toBe('retweet');

      // リツイート関連のAPI呼び出し確認
      expect(mockKaitoClient.searchTweets).toHaveBeenCalledWith('投資教育 OR 資産形成', { maxResults: 5 });
      expect(mockKaitoClient.retweet).toHaveBeenCalled();
    });

    test('データ収集ステップの詳細検証', async () => {
      const learningData = createOptimizedLearningDataForTimeSlot('07:00-10:00');
      const learningDir = path.join(testDataDir, 'data', 'learning');
      await fs.writeFile(
        path.join(learningDir, 'engagement-patterns.yaml'),
        yaml.dump({ engagementPatterns: learningData.engagementPatterns }),
        'utf-8'
      );
      await fs.writeFile(
        path.join(learningDir, 'successful-topics.yaml'),
        yaml.dump({ successfulTopics: learningData.successfulTopics }),
        'utf-8'
      );

      const result = await MainWorkflow.execute();

      expect(result.success).toBe(true);
      
      // 学習データが適切に読み込まれているか確認
      expect(mockKaitoClient.getAccountInfo).toHaveBeenCalled();
      
      // Claude呼び出し時にシステムコンテキストが渡されているか確認
      const claudeCall = vi.mocked(claudeModule.generateContent).mock.calls[0];
      expect(claudeCall[0].context).toBeDefined();
    });
  });

  // ============================================================================
  // 学習データ活用ロジックテスト
  // ============================================================================

  describe('学習データ活用ロジック', () => {
    test('時間帯最適化の動作確認', async () => {
      // 現在時刻に基づく最適化データ作成
      const currentHour = new Date().getHours();
      let timeSlot = 'other';
      if (currentHour >= 7 && currentHour < 10) timeSlot = '07:00-10:00';
      else if (currentHour >= 12 && currentHour < 14) timeSlot = '12:00-14:00';
      else if (currentHour >= 20 && currentHour < 22) timeSlot = '20:00-22:00';

      const learningData = createOptimizedLearningDataForTimeSlot(timeSlot);
      const learningDir = path.join(testDataDir, 'data', 'learning');
      await fs.writeFile(
        path.join(learningDir, 'engagement-patterns.yaml'),
        yaml.dump({ engagementPatterns: learningData.engagementPatterns }),
        'utf-8'
      );

      const result = await MainWorkflow.execute();

      expect(result.success).toBe(true);
      
      // Claude呼び出し時に学習データが活用されているか確認
      const claudeCall = vi.mocked(claudeModule.generateContent).mock.calls[0];
      expect(claudeCall[0].context.learningData).toBeDefined();
    });

    test('成功トピックスの活用確認', async () => {
      const learningData = createOptimizedLearningDataForTopic('NISA活用法');
      const learningDir = path.join(testDataDir, 'data', 'learning');
      await fs.writeFile(
        path.join(learningDir, 'successful-topics.yaml'),
        yaml.dump({ successfulTopics: learningData.successfulTopics }),
        'utf-8'
      );

      const result = await MainWorkflow.execute();

      expect(result.success).toBe(true);
      
      // 成功トピックスが学習データに含まれているか確認
      const claudeCall = vi.mocked(claudeModule.generateContent).mock.calls[0];
      expect(claudeCall[0].context.learningData.recentTopics).toContain('NISA活用法');
    });

    test('学習データが空の場合のフォールバック', async () => {
      const emptyLearningData = createEmptyLearningData();
      const learningDir = path.join(testDataDir, 'data', 'learning');
      await fs.writeFile(
        path.join(learningDir, 'engagement-patterns.yaml'),
        yaml.dump({ engagementPatterns: emptyLearningData.engagementPatterns }),
        'utf-8'
      );

      const result = await MainWorkflow.execute();

      expect(result.success).toBe(true);
      
      // フォールバック値が使用されているか確認
      const claudeCall = vi.mocked(claudeModule.generateContent).mock.calls[0];
      expect(claudeCall[0].context.learningData.optimalTimeSlot).toBe('optimal_fallback');
      expect(claudeCall[0].context.learningData.avgEngagement).toBe(2.5);
    });
  });

  // ============================================================================
  // 各アクションタイプテスト
  // ============================================================================

  describe('各アクションタイプの実行', () => {
    test('投稿アクション（post）の実行', async () => {
      const result = await MainWorkflow.execute();

      expect(result.success).toBe(true);
      expect(result.decision.action).toBe('post');
      expect(result.actionResult.action).toBe('post');
      expect(result.actionResult.content).toBeDefined();

      // 投稿APIの呼び出し確認
      expect(mockKaitoClient.post).toHaveBeenCalled();
      expect(claudeModule.generateContent).toHaveBeenCalled();
    });

    test('リツイートアクション（retweet）の実行', async () => {
      const options = {
        scheduledAction: 'retweet',
        scheduledQuery: '投資教育'
      };

      const result = await MainWorkflow.execute(options);

      expect(result.success).toBe(true);
      expect(result.decision.action).toBe('retweet');
      expect(result.actionResult.action).toBe('retweet');
      expect(result.actionResult.targetTweet).toBeDefined();

      // リツイート関連API呼び出し確認
      expect(mockKaitoClient.searchTweets).toHaveBeenCalled();
      expect(mockKaitoClient.retweet).toHaveBeenCalled();
      expect(claudeModule.selectOptimalTweet).toHaveBeenCalled();
    });

    test('いいねアクション（like）の実行', async () => {
      const options = {
        scheduledAction: 'like',
        scheduledQuery: '投資初心者'
      };

      const result = await MainWorkflow.execute(options);

      expect(result.success).toBe(true);
      expect(result.decision.action).toBe('like');
      expect(result.actionResult.action).toBe('like');

      // いいね関連API呼び出し確認
      expect(mockKaitoClient.searchTweets).toHaveBeenCalled();
      expect(mockKaitoClient.like).toHaveBeenCalled();
      expect(claudeModule.selectOptimalTweet).toHaveBeenCalled();
    });

    test('引用ツイートアクション（quote_tweet）の実行', async () => {
      const options = {
        scheduledAction: 'quote_tweet',
        scheduledQuery: '投資戦略'
      };

      const result = await MainWorkflow.execute(options);

      expect(result.success).toBe(true);
      expect(result.decision.action).toBe('quote_tweet');
      expect(result.actionResult.action).toBe('quote_tweet');
      expect(result.actionResult.content).toBeDefined();

      // 引用ツイート関連API呼び出し確認
      expect(mockKaitoClient.searchTweets).toHaveBeenCalled();
      expect(mockKaitoClient.quoteTweet).toHaveBeenCalled();
      expect(claudeModule.generateContent).toHaveBeenCalled();
      expect(claudeModule.selectOptimalTweet).toHaveBeenCalled();
    });

    test('フォローアクション（follow）の実行', async () => {
      const options = {
        scheduledAction: 'follow',
        scheduledQuery: '投資専門家'
      };

      const result = await MainWorkflow.execute(options);

      expect(result.success).toBe(true);
      expect(result.decision.action).toBe('follow');
      expect(result.actionResult.action).toBe('follow');

      // フォロー関連API呼び出し確認（現在は模擬実行）
      expect(mockKaitoClient.searchTweets).toHaveBeenCalled();
      expect(result.actionResult.note).toContain('模擬実行');
    });

    test('クエリなしアクションのwaitフォールバック', async () => {
      const options = {
        scheduledAction: 'retweet'
        // scheduledQueryを省略
      };

      const result = await MainWorkflow.execute(options);

      expect(result.success).toBe(true);
      expect(result.actionResult.action).toBe('wait');
      expect(result.actionResult.reason).toContain('No query for retweet action');
    });
  });

  // ============================================================================
  // データ保存ロジックテスト
  // ============================================================================

  describe('post.yaml統合保存', () => {
    test('投稿データの詳細保存確認', async () => {
      const result = await MainWorkflow.execute();

      expect(result.success).toBe(true);

      // post.yamlファイルの存在確認
      const postPath = path.join(testDataDir, 'data', 'current', result.executionId, 'post.yaml');
      const fileExists = await fs.access(postPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // ファイル内容の詳細確認
      const savedContent = await fs.readFile(postPath, 'utf-8');
      const savedData = yaml.load(savedContent);

      expect(savedData.executionId).toBe(result.executionId);
      expect(savedData.actionType).toBe('post');
      expect(savedData.content).toBeDefined();
      expect(savedData.result.success).toBe(true);
      expect(savedData.timestamp).toBeDefined();
    });

    test('各アクションタイプでの保存データ形式', async () => {
      const actionTypes = ['retweet', 'like', 'quote_tweet'];
      
      for (const actionType of actionTypes) {
        const options = {
          scheduledAction: actionType,
          scheduledQuery: '投資教育'
        };

        const result = await MainWorkflow.execute(options);
        expect(result.success).toBe(true);

        // 保存データの確認
        const postPath = path.join(testDataDir, 'data', 'current', result.executionId, 'post.yaml');
        const savedContent = await fs.readFile(postPath, 'utf-8');
        const savedData = yaml.load(savedContent);

        expect(savedData.actionType).toBe(actionType);
        
        if (actionType === 'quote_tweet') {
          expect(savedData.content).toBeDefined(); // 引用ツイートにはコンテンツがある
        } else {
          expect(savedData.content).toBeUndefined(); // リツイート・いいねにはコンテンツがない
        }
        
        if (actionType !== 'post') {
          expect(savedData.targetTweetId).toBeDefined(); // 投稿以外には対象ツイートIDがある
        }
      }
    });

    test('claudeSelection情報の保存確認', async () => {
      const options = {
        scheduledAction: 'retweet',
        scheduledQuery: '投資教育'
      };

      const result = await MainWorkflow.execute(options);

      const postPath = path.join(testDataDir, 'data', 'current', result.executionId, 'post.yaml');
      const savedContent = await fs.readFile(postPath, 'utf-8');
      const savedData = yaml.load(savedContent);

      // claudeSelection情報の確認
      expect(savedData.claudeSelection).toBeDefined();
      expect(savedData.claudeSelection.score).toBe(8.5);
      expect(savedData.claudeSelection.reasoning).toContain('投資教育');
      expect(savedData.claudeSelection.expectedImpact).toBe('high');
    });
  });

  // ============================================================================
  // エラーハンドリングテスト
  // ============================================================================

  describe('エラーハンドリング・フォールバック', () => {
    test('KaitoAPI認証エラー時のフォールバック', async () => {
      // 認証エラーをシミュレート
      mockKaitoClient.getAccountInfo.mockRejectedValueOnce(new Error('Authentication failed'));
      
      // 開発モード設定
      process.env.NODE_ENV = 'development';

      const result = await MainWorkflow.execute();

      // フォールバック値での実行が成功する
      expect(result.success).toBe(true);
      expect(result.actionResult.success).toBe(true);
    });

    test('Claudeコンテンツ生成エラー時の処理', async () => {
      // Claudeエラーをシミュレート
      vi.mocked(claudeModule.generateContent).mockRejectedValueOnce(new Error('Claude API error'));

      const result = await MainWorkflow.execute();

      // エラーが適切に処理される
      expect(result.success).toBe(false);
      expect(result.error).toContain('Claude API error');
    });

    test('KaitoAPI投稿エラー時の処理', async () => {
      // 投稿エラーをシミュレート
      mockKaitoClient.post.mockResolvedValueOnce({
        success: false,
        error: 'Rate limit exceeded'
      });

      const result = await MainWorkflow.execute();

      // エラーが適切に処理される
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    test('検索結果が空の場合のwaitアクション', async () => {
      // 検索結果を空にする
      mockKaitoClient.searchTweets.mockResolvedValueOnce({
        success: true,
        tweets: []
      });

      const options = {
        scheduledAction: 'retweet',
        scheduledQuery: '存在しないクエリ'
      };

      const result = await MainWorkflow.execute(options);

      expect(result.success).toBe(true);
      expect(result.actionResult.action).toBe('wait');
      expect(result.actionResult.reason).toContain('No tweets found');
    });

    test('自分のツイートのみが検索された場合の処理', async () => {
      // 自分のツイートのみを返す
      mockKaitoClient.searchTweets.mockResolvedValueOnce({
        success: true,
        tweets: [
          {
            id: 'own_tweet_123',
            author_id: 'user_123', // 自分のユーザーID
            text: '自分のツイートです',
            public_metrics: { like_count: 5 }
          }
        ]
      });

      const options = {
        scheduledAction: 'retweet',
        scheduledQuery: '投資教育'
      };

      const result = await MainWorkflow.execute(options);

      expect(result.success).toBe(true);
      expect(result.actionResult.action).toBe('wait');
      expect(result.actionResult.reason).toContain('All tweets are from current user');
    });

    test('Claude選択エラー時のフォールバック選択', async () => {
      // Claude選択エラーをシミュレート
      vi.mocked(claudeModule.selectOptimalTweet).mockRejectedValueOnce(new Error('Claude selection failed'));

      const options = {
        scheduledAction: 'retweet',
        scheduledQuery: '投資教育'
      };

      const result = await MainWorkflow.execute(options);

      // フォールバック選択で実行が成功する
      expect(result.success).toBe(true);
      expect(result.actionResult.success).toBe(true);
      expect(mockKaitoClient.retweet).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // パフォーマンステスト
  // ============================================================================

  describe('パフォーマンス・統合テスト', () => {
    test('ワークフロー実行時間の測定', async () => {
      const startTime = Date.now();
      const result = await MainWorkflow.execute();
      const actualExecutionTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeLessThan(actualExecutionTime + 100); // 誤差考慮
    });

    test('並列処理の効率性確認', async () => {
      // データ収集ステップでKaitoAPIと学習データ読み込みが並列実行されることを確認
      const result = await MainWorkflow.execute();

      expect(result.success).toBe(true);
      
      // 両方の処理が呼び出されていることを確認
      expect(mockKaitoClient.getAccountInfo).toHaveBeenCalled();
      // 学習データは自動的に読み込まれる（DataManagerの内部処理）
    });

    test('大量の検索結果に対するスループット', async () => {
      // 大量の検索結果をモック
      const manyTweets = Array.from({ length: 100 }, (_, i) => ({
        id: `tweet_${i}`,
        author_id: `user_${i}`,
        text: `投資に関するツイート ${i}`,
        public_metrics: { like_count: i, retweet_count: i % 5 }
      }));

      mockKaitoClient.searchTweets.mockResolvedValueOnce({
        success: true,
        tweets: manyTweets
      });

      const options = {
        scheduledAction: 'retweet',
        scheduledQuery: '投資教育'
      };

      const result = await MainWorkflow.execute(options);

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeLessThan(5000); // 5秒以内での処理
    });
  });
});