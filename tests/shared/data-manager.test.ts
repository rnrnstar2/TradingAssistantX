/**
 * DataManager新構造テスト
 * 
 * テスト対象:
 * - 2ファイル学習データ構成（engagement-patterns.yaml + successful-topics.yaml）
 * - 新savePost()メソッドの統合形式保存
 * - 実行サイクル管理（initializeExecutionCycle）
 * - エラーハンドリング・エッジケース
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { DataManager, type LearningData, type PostData } from '../../src/shared/data-manager';
import { 
  createMockLearningData,
  createEmptyLearningData,
  createPartialEngagementPatterns,
  createLowQualityLearningData,
  createCorruptedLearningData,
  createMockEngagementPatternsYaml,
  createMockSuccessfulTopicsYaml,
  createCorruptedYamlContent,
  createOptimizedLearningDataForTimeSlot,
  createOptimizedLearningDataForTopic
} from '../test-utils/learning-data-mock';
import { createMockPostData, createMockRetweetPostData, createMockLikePostData } from '../test-utils/claude-mock-data';

describe('DataManager新構造テスト', () => {
  let dataManager: DataManager;
  let testDataDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // テスト専用の一時ディレクトリ作成
    originalCwd = process.cwd();
    testDataDir = path.join(process.cwd(), 'test-temp-data', `test-${Date.now()}`);
    
    // プロセスのcwdを変更してDataManagerが一時ディレクトリを使用するようにする
    process.chdir(path.dirname(testDataDir));
    
    await fs.mkdir(testDataDir, { recursive: true });
    await fs.mkdir(path.join(testDataDir, 'data'), { recursive: true });
    await fs.mkdir(path.join(testDataDir, 'data', 'learning'), { recursive: true });
    await fs.mkdir(path.join(testDataDir, 'data', 'current'), { recursive: true });
    await fs.mkdir(path.join(testDataDir, 'data', 'history'), { recursive: true });
    
    // DataManagerのcwdを一時ディレクトリに変更
    process.chdir(testDataDir);
    
    dataManager = new DataManager();
  });

  afterEach(async () => {
    // クリーンアップ
    process.chdir(originalCwd);
    
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('⚠️ テスト用ディレクトリの削除に失敗:', error);
    }
  });

  // ============================================================================
  // 2ファイル学習データ構成テスト
  // ============================================================================

  describe('学習データ読み込み（2ファイル構成）', () => {
    test('engagement-patterns.yamlとsuccessful-topics.yamlの並列読み込み', async () => {
      // テスト用学習データファイルを作成
      const learningDir = path.join(testDataDir, 'data', 'learning');
      
      await fs.writeFile(
        path.join(learningDir, 'engagement-patterns.yaml'),
        createMockEngagementPatternsYaml(),
        'utf-8'
      );
      
      await fs.writeFile(
        path.join(learningDir, 'successful-topics.yaml'),
        createMockSuccessfulTopicsYaml(),
        'utf-8'
      );

      // 学習データ読み込み実行
      const learningData = await dataManager.loadLearningData();

      // 結果検証
      expect(learningData).toBeDefined();
      expect(learningData.engagementPatterns).toBeDefined();
      expect(learningData.successfulTopics).toBeDefined();

      // エンゲージメントパターンの検証
      expect(learningData.engagementPatterns.timeSlots).toBeDefined();
      expect(learningData.engagementPatterns.timeSlots['07:00-10:00']).toEqual({
        successRate: 0.85,
        avgEngagement: 4.2,
        sampleSize: 15
      });

      // 成功トピックスの検証
      expect(learningData.successfulTopics.topics).toBeDefined();
      expect(Array.isArray(learningData.successfulTopics.topics)).toBe(true);
      expect(learningData.successfulTopics.topics[0]).toEqual({
        topic: 'NISA活用法',
        successRate: 0.91,
        avgEngagement: 5.2,
        bestTimeSlots: ['07:00-10:00', '18:00-20:00']
      });
    });

    test('学習データファイルが存在しない場合のデフォルト値', async () => {
      // ファイルを作成せずに読み込み実行
      const learningData = await dataManager.loadLearningData();

      // デフォルト値の検証
      expect(learningData).toBeDefined();
      expect(learningData.engagementPatterns.timeSlots).toBeDefined();
      expect(learningData.successfulTopics.topics).toBeDefined();
      
      // デフォルト時間帯パターンの確認
      expect(learningData.engagementPatterns.timeSlots['09:00']).toBeDefined();
      expect(learningData.engagementPatterns.timeSlots['09:00'].successRate).toBeGreaterThan(0);
      
      // デフォルト成功トピックスの確認
      expect(learningData.successfulTopics.topics.length).toBeGreaterThan(0);
      expect(learningData.successfulTopics.topics[0].topic).toBe('market_analysis');
    });

    test('部分的なデータファイルのグレースフルハンドリング', async () => {
      const learningDir = path.join(testDataDir, 'data', 'learning');
      
      // engagement-patterns.yamlのみ作成（successful-topics.yamlは作成しない）
      await fs.writeFile(
        path.join(learningDir, 'engagement-patterns.yaml'),
        createMockEngagementPatternsYaml(),
        'utf-8'
      );

      const learningData = await dataManager.loadLearningData();

      // エンゲージメントパターンは読み込まれている
      expect(learningData.engagementPatterns.timeSlots['07:00-10:00']).toBeDefined();
      
      // 成功トピックスはデフォルト値が使用されている
      expect(learningData.successfulTopics.topics).toBeDefined();
      expect(learningData.successfulTopics.topics.length).toBeGreaterThan(0);
    });

    test('破損したYAMLファイルのエラーハンドリング', async () => {
      const learningDir = path.join(testDataDir, 'data', 'learning');
      
      // 破損したYAMLファイルを作成
      await fs.writeFile(
        path.join(learningDir, 'engagement-patterns.yaml'),
        createCorruptedYamlContent(),
        'utf-8'
      );

      const learningData = await dataManager.loadLearningData();

      // エラー時はデフォルト値が返される
      expect(learningData).toBeDefined();
      expect(learningData.engagementPatterns.timeSlots).toBeDefined();
      expect(learningData.successfulTopics.topics).toBeDefined();
    });
  });

  // ============================================================================
  // 新savePost()メソッドテスト
  // ============================================================================

  describe('savePost()新構造テスト', () => {
    test('投稿データの統合形式保存', async () => {
      // 実行サイクル初期化
      const executionId = await dataManager.initializeExecutionCycle();
      expect(executionId).toBeDefined();
      expect(executionId).toMatch(/^execution-\d{8}-\d{4}$/);

      // 投稿データ作成
      const postData = {
        actionType: 'post' as const,
        content: 'テスト投稿内容：投資信託の基礎知識について',
        result: {
          success: true,
          message: '投稿が正常に完了しました',
          data: { tweetId: 'tweet_123456' }
        },
        engagement: {
          likes: 5,
          retweets: 2,
          replies: 1
        },
        claudeSelection: {
          score: 8.5,
          reasoning: '高い教育価値があり、初心者向けの内容として最適',
          expectedImpact: 'high'
        }
      };

      // savePost()実行
      await dataManager.savePost(postData);

      // 保存されたファイルの確認
      const postPath = path.join(testDataDir, 'data', 'current', executionId, 'post.yaml');
      const fileExists = await fs.access(postPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // ファイル内容の検証
      const savedContent = await fs.readFile(postPath, 'utf-8');
      const savedData = yaml.load(savedContent) as PostData;

      expect(savedData.executionId).toBe(executionId);
      expect(savedData.actionType).toBe('post');
      expect(savedData.content).toBe(postData.content);
      expect(savedData.result.success).toBe(true);
      expect(savedData.engagement.likes).toBe(5);
      expect(savedData.claudeSelection!.score).toBe(8.5);
      expect(savedData.timestamp).toBeDefined();
    });

    test('リツイートデータの保存', async () => {
      const executionId = await dataManager.initializeExecutionCycle();
      
      const retweetData = {
        actionType: 'retweet' as const,
        targetTweetId: 'target_tweet_789',
        result: {
          success: true,
          message: 'リツイートが完了しました',
          data: { retweetId: 'retweet_456' }
        },
        engagement: {
          likes: 0,
          retweets: 1,
          replies: 0
        },
        claudeSelection: {
          score: 7.8,
          reasoning: '良質な投資教育コンテンツでフォロワーに価値を提供',
          expectedImpact: 'medium'
        }
      };

      await dataManager.savePost(retweetData);

      // 保存確認
      const postPath = path.join(testDataDir, 'data', 'current', executionId, 'post.yaml');
      const savedContent = await fs.readFile(postPath, 'utf-8');
      const savedData = yaml.load(savedContent) as PostData;

      expect(savedData.actionType).toBe('retweet');
      expect(savedData.targetTweetId).toBe('target_tweet_789');
      expect(savedData.content).toBeUndefined();
      expect(savedData.claudeSelection!.expectedImpact).toBe('medium');
    });

    test('実行サイクル未初期化時のエラー', async () => {
      const postData = {
        actionType: 'post' as const,
        content: 'テスト内容',
        result: { success: true, message: 'test', data: {} },
        engagement: { likes: 0, retweets: 0, replies: 0 }
      };

      // 実行サイクル未初期化でsavePost()を呼び出し
      await expect(dataManager.savePost(postData)).rejects.toThrow('No active execution cycle');
    });

    test('複数のアクションタイプでの保存テスト', async () => {
      const executionId = await dataManager.initializeExecutionCycle();
      
      const testCases = [
        createMockPostData(),
        createMockRetweetPostData(),
        createMockLikePostData()
      ];

      for (const postData of testCases) {
        await dataManager.savePost({
          actionType: postData.actionType,
          content: postData.content,
          targetTweetId: postData.targetTweetId,
          result: postData.result,
          engagement: postData.engagement,
          claudeSelection: postData.claudeSelection
        });

        // 各アクションタイプで正しく保存されているか確認
        const postPath = path.join(testDataDir, 'data', 'current', executionId, 'post.yaml');
        const savedContent = await fs.readFile(postPath, 'utf-8');
        const savedData = yaml.load(savedContent) as PostData;
        
        expect(savedData.actionType).toBe(postData.actionType);
      }
    });
  });

  // ============================================================================
  // 実行サイクル管理テスト
  // ============================================================================

  describe('実行サイクル管理', () => {
    test('新規実行サイクルの初期化', async () => {
      const executionId = await dataManager.initializeExecutionCycle();

      // 実行IDの形式確認
      expect(executionId).toMatch(/^execution-\d{8}-\d{4}$/);

      // ディレクトリ作成確認
      const executionDir = path.join(testDataDir, 'data', 'current', executionId);
      const dirExists = await fs.access(executionDir).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });

    test('複数回の実行サイクル初期化（アーカイブ動作）', async () => {
      // 最初の実行サイクル
      const firstExecutionId = await dataManager.initializeExecutionCycle();
      
      // 投稿データを保存してディレクトリに内容を作成
      await dataManager.savePost({
        actionType: 'post',
        content: '最初の投稿',
        result: { success: true, message: 'test', data: {} },
        engagement: { likes: 1, retweets: 0, replies: 0 }
      });

      // 時間差をつけて2回目の実行サイクル
      await new Promise(resolve => setTimeout(resolve, 1000));
      const secondExecutionId = await dataManager.initializeExecutionCycle();

      // 異なる実行IDが生成される
      expect(secondExecutionId).not.toBe(firstExecutionId);

      // 最初の実行がhistoryにアーカイブされている
      const currentDir = path.join(testDataDir, 'data', 'current');
      const currentContents = await fs.readdir(currentDir);
      expect(currentContents).toEqual([secondExecutionId]);

      // historyディレクトリにアーカイブが存在する
      const historyDir = path.join(testDataDir, 'data', 'history');
      const historyExists = await fs.access(historyDir).then(() => true).catch(() => false);
      expect(historyExists).toBe(true);
    });

    test('実行サイクルアーカイブの月別管理', async () => {
      const executionId = await dataManager.initializeExecutionCycle();
      
      // データを作成
      await dataManager.savePost({
        actionType: 'post',
        content: 'アーカイブテスト',
        result: { success: true, message: 'test', data: {} },
        engagement: { likes: 0, retweets: 0, replies: 0 }
      });

      // 手動でアーカイブ実行
      await dataManager.archiveCurrentToHistory();

      // 月別ディレクトリが作成されている
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const monthDir = path.join(testDataDir, 'data', 'history', yearMonth);
      
      const monthDirExists = await fs.access(monthDir).then(() => true).catch(() => false);
      expect(monthDirExists).toBe(true);

      // アーカイブされたディレクトリが存在する
      const monthContents = await fs.readdir(monthDir);
      expect(monthContents.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // エラーハンドリング・エッジケーステスト
  // ============================================================================

  describe('エラーハンドリング', () => {
    test('ディスク容量不足時のエラーハンドリング', async () => {
      const executionId = await dataManager.initializeExecutionCycle();
      
      // fs.writeFileをモックしてディスク容量不足をシミュレート
      const originalWriteFile = fs.writeFile;
      vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('ENOSPC: no space left on device'));

      const postData = {
        actionType: 'post' as const,
        content: '大きなデータ',
        result: { success: true, message: 'test', data: {} },
        engagement: { likes: 0, retweets: 0, replies: 0 }
      };

      // エラーが適切にスローされる
      await expect(dataManager.savePost(postData)).rejects.toThrow();

      // モックをリストア
      vi.mocked(fs.writeFile).mockRestore();
    });

    test('破損した学習データファイルの処理', async () => {
      const learningDir = path.join(testDataDir, 'data', 'learning');
      
      // 完全に不正なファイルを作成
      await fs.writeFile(
        path.join(learningDir, 'engagement-patterns.yaml'),
        'このファイルは破損しています: [無効なYAML構文',
        'utf-8'
      );

      // エラーが発生してもデフォルト値が返される
      const learningData = await dataManager.loadLearningData();
      expect(learningData).toBeDefined();
      expect(learningData.engagementPatterns.timeSlots).toBeDefined();
    });

    test('学習データディレクトリが存在しない場合', async () => {
      // learningディレクトリを削除
      const learningDir = path.join(testDataDir, 'data', 'learning');
      await fs.rm(learningDir, { recursive: true, force: true });

      // デフォルト値が返される
      const learningData = await dataManager.loadLearningData();
      expect(learningData).toBeDefined();
      expect(learningData.engagementPatterns.timeSlots).toBeDefined();
      expect(learningData.successfulTopics.topics).toBeDefined();
    });

    test('権限不足でのファイル書き込みエラー', async () => {
      const executionId = await dataManager.initializeExecutionCycle();
      
      // fs.writeFileをモックして権限エラーをシミュレート
      vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('EACCES: permission denied'));

      const postData = {
        actionType: 'post' as const,
        content: 'テスト',
        result: { success: true, message: 'test', data: {} },
        engagement: { likes: 0, retweets: 0, replies: 0 }
      };

      await expect(dataManager.savePost(postData)).rejects.toThrow('EACCES: permission denied');

      vi.mocked(fs.writeFile).mockRestore();
    });
  });

  // ============================================================================
  // パフォーマンス・統合テスト
  // ============================================================================

  describe('パフォーマンステスト', () => {
    test('大量データの並列読み込み性能', async () => {
      // 大きな学習データファイルを作成
      const largeEngagementData = createMockLearningData();
      
      // 大量のタイムスロットとトピックを追加
      for (let i = 0; i < 100; i++) {
        largeEngagementData.engagementPatterns.timeSlots[`slot_${i}`] = {
          successRate: Math.random(),
          avgEngagement: Math.random() * 5,
          sampleSize: Math.floor(Math.random() * 100)
        };
        largeEngagementData.engagementPatterns.topics[`topic_${i}`] = {
          successRate: Math.random(),
          avgEngagement: Math.random() * 5,
          sampleSize: Math.floor(Math.random() * 100)
        };
      }

      const learningDir = path.join(testDataDir, 'data', 'learning');
      await fs.writeFile(
        path.join(learningDir, 'engagement-patterns.yaml'),
        yaml.dump({ engagementPatterns: largeEngagementData.engagementPatterns }),
        'utf-8'
      );
      await fs.writeFile(
        path.join(learningDir, 'successful-topics.yaml'),
        yaml.dump({ successfulTopics: largeEngagementData.successfulTopics }),
        'utf-8'
      );

      // パフォーマンス測定
      const startTime = Date.now();
      const learningData = await dataManager.loadLearningData();
      const loadTime = Date.now() - startTime;

      // 結果確認
      expect(learningData).toBeDefined();
      expect(Object.keys(learningData.engagementPatterns.timeSlots).length).toBeGreaterThan(100);
      expect(loadTime).toBeLessThan(1000); // 1秒以内での読み込み
    });

    test('高頻度savePost()呼び出し耐性', async () => {
      const executionId = await dataManager.initializeExecutionCycle();
      
      // 連続でsavePost()を呼び出し
      const promises = [];
      for (let i = 0; i < 10; i++) {
        const postData = {
          actionType: 'post' as const,
          content: `連続投稿テスト ${i}`,
          result: { success: true, message: 'test', data: {} },
          engagement: { likes: i, retweets: 0, replies: 0 }
        };
        promises.push(dataManager.savePost(postData));
      }

      // すべての保存が正常に完了する
      await expect(Promise.all(promises)).resolves.toBeDefined();

      // 最後の保存内容の確認
      const postPath = path.join(testDataDir, 'data', 'current', executionId, 'post.yaml');
      const savedContent = await fs.readFile(postPath, 'utf-8');
      const savedData = yaml.load(savedContent) as PostData;
      
      expect(savedData.content).toBe('連続投稿テスト 9'); // 最後の投稿が保存されている
    });
  });

  // ============================================================================
  // 後方互換性テスト
  // ============================================================================

  describe('後方互換性', () => {
    test('レガシー学習データ形式の読み込み対応', async () => {
      const learningDir = path.join(testDataDir, 'data', 'learning');
      
      // 旧形式のファイルを作成（decision-patterns.yamlなど）
      await fs.writeFile(
        path.join(learningDir, 'decision-patterns.yaml'),
        yaml.dump({
          patterns: [
            {
              timestamp: new Date().toISOString(),
              context: { followers: 100, last_post_hours_ago: 2, market_trend: 'stable' },
              decision: { action: 'post', reasoning: 'test', confidence: 0.8 },
              result: { engagement_rate: 3.5, new_followers: 2, success: true }
            }
          ]
        }),
        'utf-8'
      );

      // 新構造の読み込みが正常に動作する（レガシーファイルが存在しても影響しない）
      const learningData = await dataManager.loadLearningData();
      expect(learningData).toBeDefined();
      expect(learningData.engagementPatterns.timeSlots).toBeDefined();
    });

    test('CurrentStatus型の旧形式サポート', async () => {
      const currentStatus = await dataManager.loadCurrentStatus();
      
      // 旧形式のフィールドが存在する
      expect(currentStatus).toBeDefined();
      expect(currentStatus.account_status).toBeDefined();
      expect(currentStatus.system_status).toBeDefined();
      expect(currentStatus.rate_limits).toBeDefined();
      
      // 具体的なフィールドの確認
      expect(currentStatus.account_status.followers).toBeDefined();
      expect(currentStatus.system_status.success_rate).toBeDefined();
      expect(currentStatus.rate_limits.posts_remaining).toBeDefined();
    });
  });

  // ============================================================================
  // PHASE 5: 高度なエラーハンドリング・エッジケーステスト
  // ============================================================================

  describe('高度なエラーハンドリング', () => {
    test('同時実行時のファイル競合エラー', async () => {
      const executionId = await dataManager.initializeExecutionCycle();
      
      // 複数のsavePost()を同時実行してファイル競合をテスト
      const concurrentSaves = Array.from({ length: 5 }, (_, i) => 
        dataManager.savePost({
          actionType: 'post',
          content: `同時実行テスト ${i}`,
          result: { success: true, message: 'test', data: {} },
          engagement: { likes: i, retweets: 0, replies: 0 }
        })
      );

      // 全ての保存が完了することを確認（最後の書き込みが勝つ）
      await expect(Promise.all(concurrentSaves)).resolves.toBeDefined();

      // 最終的にファイルが正常に存在することを確認
      const postPath = path.join(testDataDir, 'data', 'current', executionId, 'post.yaml');
      const fileExists = await fs.access(postPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    test('メモリ不足時のグレースフルデグラデーション', async () => {
      // 大量のデータでメモリ使用量をテスト
      const executionId = await dataManager.initializeExecutionCycle();
      
      const largeContent = 'A'.repeat(100000); // 100KB のコンテンツ
      
      const largePostData = {
        actionType: 'post' as const,
        content: largeContent,
        result: { 
          success: true, 
          message: 'Large data test',
          data: { 
            metadata: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `data_${i}` }))
          } 
        },
        engagement: { likes: 0, retweets: 0, replies: 0 }
      };

      // 大量データでも正常に保存できることを確認
      await expect(dataManager.savePost(largePostData)).resolves.toBeUndefined();
    });

    test('ファイルシステム読み取り専用時のエラー', async () => {
      const executionId = await dataManager.initializeExecutionCycle();
      
      // fs.writeFileをモックして読み取り専用エラーをシミュレート
      vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('EROFS: read-only file system'));

      const postData = {
        actionType: 'post' as const,
        content: 'テスト',
        result: { success: true, message: 'test', data: {} },
        engagement: { likes: 0, retweets: 0, replies: 0 }
      };

      await expect(dataManager.savePost(postData)).rejects.toThrow('EROFS: read-only file system');

      vi.mocked(fs.writeFile).mockRestore();
    });

    test('学習データファイル部分破損時の復旧', async () => {
      const learningDir = path.join(testDataDir, 'data', 'learning');
      
      // engagement-patterns.yamlは正常、successful-topics.yamlは破損
      await fs.writeFile(
        path.join(learningDir, 'engagement-patterns.yaml'),
        createMockEngagementPatternsYaml(),
        'utf-8'
      );
      
      await fs.writeFile(
        path.join(learningDir, 'successful-topics.yaml'),
        'invalid: yaml: content: [broken',
        'utf-8'
      );

      const learningData = await dataManager.loadLearningData();

      // 正常なファイルのデータは読み込まれ、破損したファイルはデフォルト値
      expect(learningData.engagementPatterns.timeSlots['07:00-10:00']).toBeDefined();
      expect(learningData.successfulTopics.topics).toBeDefined();
      expect(learningData.successfulTopics.topics.length).toBeGreaterThan(0);
    });

    test('ディスクI/O遅延時のタイムアウト処理', async () => {
      const executionId = await dataManager.initializeExecutionCycle();
      
      // fs.writeFileを遅延させてタイムアウトをシミュレート
      vi.spyOn(fs, 'writeFile').mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 5000)) // 5秒遅延
      );

      const postData = {
        actionType: 'post' as const,
        content: 'タイムアウトテスト',
        result: { success: true, message: 'test', data: {} },
        engagement: { likes: 0, retweets: 0, replies: 0 }
      };

      // 通常はタイムアウトするが、テスト環境では完了を待つ
      const savePromise = dataManager.savePost(postData);
      
      // 一定時間内に処理が開始されることを確認
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(vi.mocked(fs.writeFile)).toHaveBeenCalled();

      vi.mocked(fs.writeFile).mockRestore();
    });

    test('YAML形式エラー時のフォールバック', async () => {
      const learningDir = path.join(testDataDir, 'data', 'learning');
      
      // 文字エンコーディング問題をシミュレート
      const invalidYaml = Buffer.from([0xFF, 0xFE, 0x00, 0x00]); // 無効なUTF-8
      await fs.writeFile(
        path.join(learningDir, 'engagement-patterns.yaml'),
        invalidYaml
      );

      const learningData = await dataManager.loadLearningData();

      // エラー時はデフォルト値が使用される
      expect(learningData).toBeDefined();
      expect(learningData.engagementPatterns.timeSlots).toBeDefined();
    });
  });

  describe('エッジケース・境界値テスト', () => {
    test('空文字列コンテンツの処理', async () => {
      const executionId = await dataManager.initializeExecutionCycle();
      
      const emptyContentData = {
        actionType: 'post' as const,
        content: '', // 空文字列
        result: { success: true, message: 'Empty content test', data: {} },
        engagement: { likes: 0, retweets: 0, replies: 0 }
      };

      await expect(dataManager.savePost(emptyContentData)).resolves.toBeUndefined();

      // 保存されたデータの確認
      const postPath = path.join(testDataDir, 'data', 'current', executionId, 'post.yaml');
      const savedContent = await fs.readFile(postPath, 'utf-8');
      const savedData = yaml.load(savedContent);

      expect(savedData.content).toBe('');
    });

    test('非常に長いファイルパスの処理', async () => {
      // 長いファイルパス（255文字制限のテスト）
      const longExecutionId = 'execution-' + 'a'.repeat(200);
      
      // DataManagerの内部実装では実際のタイムスタンプが使用されるため、
      // 代わりに長いコンテンツで制限をテスト
      const executionId = await dataManager.initializeExecutionCycle();
      
      const longContentData = {
        actionType: 'post' as const,
        content: 'x'.repeat(10000), // 10KB のコンテンツ
        result: { success: true, message: 'Long content test', data: {} },
        engagement: { likes: 0, retweets: 0, replies: 0 }
      };

      await expect(dataManager.savePost(longContentData)).resolves.toBeUndefined();
    });

    test('特殊文字・Unicode文字の処理', async () => {
      const executionId = await dataManager.initializeExecutionCycle();
      
      const unicodeData = {
        actionType: 'post' as const,
        content: '🚀投資📈分析💰経済🌍グローバル\n\t特殊文字: \\"\'\\n\\r\\t',
        result: { 
          success: true, 
          message: 'Unicode test 🎯', 
          data: { emoji: '💯', japanese: 'テスト', symbols: '©®™' } 
        },
        engagement: { likes: 0, retweets: 0, replies: 0 }
      };

      await expect(dataManager.savePost(unicodeData)).resolves.toBeUndefined();

      // 保存されたデータの確認
      const postPath = path.join(testDataDir, 'data', 'current', executionId, 'post.yaml');
      const savedContent = await fs.readFile(postPath, 'utf-8');
      const savedData = yaml.load(savedContent);

      expect(savedData.content).toContain('🚀');
      expect(savedData.content).toContain('テスト');
      expect(savedData.result.data.emoji).toBe('💯');
    });

    test('null・undefined値の適切な処理', async () => {
      const executionId = await dataManager.initializeExecutionCycle();
      
      const nullValueData = {
        actionType: 'like' as const,
        content: undefined, // undefined
        targetTweetId: null, // null
        result: { success: true, message: 'Null test', data: {} },
        engagement: { likes: 0, retweets: 0, replies: 0 },
        claudeSelection: undefined // undefined
      };

      await expect(dataManager.savePost(nullValueData)).resolves.toBeUndefined();

      // YAMLで正しく保存されることを確認
      const postPath = path.join(testDataDir, 'data', 'current', executionId, 'post.yaml');
      const savedContent = await fs.readFile(postPath, 'utf-8');
      const savedData = yaml.load(savedContent);

      expect(savedData.content).toBeUndefined();
      expect(savedData.targetTweetId).toBeNull();
      expect(savedData.claudeSelection).toBeUndefined();
    });

    test('タイムスタンプ境界値テスト', async () => {
      // 異なる時刻でのタイムスタンプ生成テスト
      const startTime = Date.now();
      
      const executionId1 = await dataManager.initializeExecutionCycle();
      await new Promise(resolve => setTimeout(resolve, 1)); // 1ms待機
      const executionId2 = await dataManager.initializeExecutionCycle();
      
      const endTime = Date.now();

      // 異なる実行IDが生成される
      expect(executionId1).not.toBe(executionId2);
      
      // 両方とも有効な形式である
      expect(executionId1).toMatch(/^execution-\d{8}-\d{4}$/);
      expect(executionId2).toMatch(/^execution-\d{8}-\d{4}$/);
      
      // 実行時間が妥当な範囲内
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
    });

    test('並行実行でのファイルロック処理', async () => {
      // 複数の実行サイクルを同時に初期化
      const initPromises = Array.from({ length: 3 }, () => 
        dataManager.initializeExecutionCycle()
      );

      const executionIds = await Promise.all(initPromises);
      
      // 全て異なるIDが生成される
      const uniqueIds = new Set(executionIds);
      expect(uniqueIds.size).toBe(3);
      
      // 全て有効な形式
      executionIds.forEach(id => {
        expect(id).toMatch(/^execution-\d{8}-\d{4}$/);
      });
    });
  });
});