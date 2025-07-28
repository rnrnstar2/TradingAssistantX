/**
 * Action Endpoints Integration Test Suite
 * 統合テスト - 全機能連携動作確認
 */

import { ActionEndpoints } from '../../../src/kaito-api/endpoints/action-endpoints';
import type {
  EducationalTweetResult,
  EducationalRetweetResult,
  EducationalLikeResult,
  PostResponse,
  EngagementResponse
} from '../../../src/kaito-api/types';

describe('Action Endpoints Integration Tests', () => {
  let actionEndpoints: ActionEndpoints;
  let mockDateNow: jest.SpyInstance;

  beforeEach(() => {
    actionEndpoints = new ActionEndpoints('https://api.test.com', {
      'Authorization': 'Bearer test-token'
    });
    mockDateNow = jest.spyOn(Date, 'now');
  });

  afterEach(() => {
    mockDateNow.mockRestore();
    jest.clearAllMocks();
  });

  describe('Complete Educational Workflow Integration', () => {
    it('should execute complete educational workflow: post -> retweet -> like', async () => {
      const baseTime = 1640995200000;
      let currentTime = baseTime;
      mockDateNow.mockImplementation(() => currentTime);

      // Phase 1: Educational post creation
      const postResult = await actionEndpoints.createEducationalPost(
        '投資教育について学ぶことは重要です。リスク管理と分散投資の基礎知識を身につけましょう。'
      );

      expect(postResult.success).toBe(true);
      expect(postResult.educationalValue).toBe(60);
      expect(postResult.qualityScore).toBe(60);
      expect(postResult.id).toBe(`tweet_${baseTime}`);

      // Verify posting statistics updated
      const statsAfterPost = actionEndpoints.getPostingStatistics();
      expect(statsAfterPost.lastPostTime).toBe(baseTime);
      expect(statsAfterPost.canPostNow).toBe(false);

      // Phase 2: Educational retweet (10 minutes later)
      currentTime += 10 * 60 * 1000;
      const retweetResult = await actionEndpoints.retweetEducationalContent(
        'original-tweet-123',
        'ポートフォリオ構築の基礎知識について詳しく説明しています。投資教育の一環として必読です。'
      );

      expect(retweetResult.success).toBe(true);
      expect(retweetResult.originalTweetId).toBe('original-tweet-123');
      expect(retweetResult.educationalReason).toContain('教育的価値: 60%');
      expect(retweetResult.educationalReason).toContain('投資教育');

      // Verify retweet statistics updated
      const statsAfterRetweet = actionEndpoints.getPostingStatistics();
      expect(statsAfterRetweet.lastRetweetTime).toBe(baseTime + 10 * 60 * 1000);

      // Phase 3: Educational like (2 minutes later)
      currentTime += 2 * 60 * 1000;
      const likeResult = await actionEndpoints.likeEducationalContent(
        'like-target-456',
        'リスク管理の重要性について分かりやすく解説された素晴らしい投資教育コンテンツです。'
      );

      expect(likeResult.success).toBe(true);
      expect(likeResult.tweetId).toBe('like-target-456');
      expect(likeResult.educationalJustification).toContain('教育的価値: 60%');
      expect(likeResult.educationalJustification).toContain('投資教育');

      // Verify like statistics updated
      const finalStats = actionEndpoints.getPostingStatistics();
      expect(finalStats.lastLikeTime).toBe(baseTime + 12 * 60 * 1000);

      // Verify all actions were logged properly
      expect(postResult.timestamp).toBeDefined();
      expect(retweetResult.timestamp).toBeDefined();
      expect(likeResult.timestamp).toBeDefined();
    });

    it('should maintain independent frequency controls across all actions', async () => {
      const baseTime = 1640995200000;
      let currentTime = baseTime;
      mockDateNow.mockImplementation(() => currentTime);

      // Initial post
      await actionEndpoints.createEducationalPost('投資教育の基礎について');

      // Test different timing scenarios
      const scenarios = [
        {
          timeOffset: 2 * 60 * 1000, // 2 minutes
          canPost: false,
          canRetweet: false, // Less than 10 minutes
          canLike: true,
          description: '2 minutes after post'
        },
        {
          timeOffset: 10 * 60 * 1000, // 10 minutes
          canPost: false, // Less than 30 minutes
          canRetweet: true,
          canLike: true,
          description: '10 minutes after post'
        },
        {
          timeOffset: 30 * 60 * 1000, // 30 minutes
          canPost: true,
          canRetweet: true,
          canLike: true,
          description: '30 minutes after post'
        }
      ];

      for (const scenario of scenarios) {
        currentTime = baseTime + scenario.timeOffset;

        // Test posting
        if (scenario.canPost) {
          const result = await actionEndpoints.createEducationalPost('新しい投資教育について');
          expect(result.success).toBe(true);
        } else {
          try {
            await actionEndpoints.createEducationalPost('新しい投資教育について');
            fail(`Should have failed post at ${scenario.description}`);
          } catch (error) {
            expect((error as Error).message).toContain('投稿頻度制限');
          }
        }

        // Test retweeting
        if (scenario.canRetweet) {
          const result = await actionEndpoints.retweetEducationalContent(
            `tweet-${scenario.timeOffset}`,
            '投資教育について学びましょう'
          );
          expect(result.success).toBe(true);
        } else {
          try {
            await actionEndpoints.retweetEducationalContent(
              `tweet-${scenario.timeOffset}`,
              '投資教育について学びましょう'
            );
            fail(`Should have failed retweet at ${scenario.description}`);
          } catch (error) {
            expect((error as Error).message).toContain('リツイート頻度制限');
          }
        }

        // Test liking (should always succeed after 2 minutes from any like)
        if (scenario.canLike) {
          const result = await actionEndpoints.likeEducationalContent(
            `like-${scenario.timeOffset}`,
            '投資教育について学びましょう'
          );
          expect(result.success).toBe(true);
        }
      }
    });
  });

  describe('Cross-Feature Validation Integration', () => {
    it('should apply all validations in correct order for educational posts', async () => {
      const testCases = [
        {
          content: '', // Empty content
          expectedError: '教育的価値不足',
          description: 'empty content validation'
        },
        {
          content: '短い', // Too short
          expectedError: '教育的価値不足',
          description: 'content length validation'
        },
        {
          content: '絶対儲かる投資方法があります', // Prohibited keywords
          expectedError: '教育的価値不足',
          description: 'prohibited keywords validation'
        },
        {
          content: '投資教育について' + 'a'.repeat(25), // Educational + spam
          expectedError: 'スパムと判定されたため投稿できません',
          description: 'spam detection before educational validation'
        },
        {
          content: '今日は天気がいいですね。お疲れ様でした。', // No educational value
          expectedError: '教育的価値不足',
          description: 'educational value validation'
        }
      ];

      for (const testCase of testCases) {
        try {
          await actionEndpoints.createEducationalPost(testCase.content);
          fail(`Should have failed for ${testCase.description}`);
        } catch (error) {
          expect((error as Error).message).toContain(testCase.expectedError);
        }
      }
    });

    it('should apply validations consistently across all educational methods', async () => {
      const lowQualityContent = '今日は天気がいいですね。'; // No educational keywords
      const spamContent = '投資' + 'a'.repeat(25); // Educational keyword + spam

      // Test createEducationalPost
      try {
        await actionEndpoints.createEducationalPost(lowQualityContent);
        fail('Post should have failed');
      } catch (error) {
        expect((error as Error).message).toContain('教育的価値不足');
      }

      try {
        await actionEndpoints.createEducationalPost(spamContent);
        fail('Post should have failed');
      } catch (error) {
        expect((error as Error).message).toContain('スパムと判定されたため投稿できません');
      }

      // Test retweetEducationalContent
      try {
        await actionEndpoints.retweetEducationalContent('tweet-1', lowQualityContent);
        fail('Retweet should have failed');
      } catch (error) {
        expect((error as Error).message).toContain('元投稿に教育的価値が不足しています');
      }

      // Test likeEducationalContent  
      try {
        await actionEndpoints.likeEducationalContent('tweet-2', lowQualityContent);
        fail('Like should have failed');
      } catch (error) {
        expect((error as Error).message).toContain('教育的価値が不足しているためいいねできません');
      }
    });
  });

  describe('Execution Flow Compatibility Integration', () => {
    it('should maintain compatibility with execution-flow.ts methods', async () => {
      // Test basic compatibility methods
      const postResult = await actionEndpoints.post('Test post content');
      expect(postResult.success).toBe(true);
      expect(postResult.tweetId).toBeDefined();

      const retweetResult = await actionEndpoints.retweet('tweet-123');
      expect(retweetResult.success).toBe(true);
      expect(retweetResult.action).toBe('retweet');

      const likeResult = await actionEndpoints.like('tweet-456');
      expect(likeResult.success).toBe(true);
      expect(likeResult.action).toBe('like');

      // Test metrics method
      const metrics = await actionEndpoints.getExecutionMetrics();
      expect(metrics.totalPosts).toBeDefined();
      expect(metrics.totalRetweets).toBeDefined();
      expect(metrics.totalLikes).toBeDefined();
      expect(metrics.educationalContentRatio).toBe(0.95);
    });

    it('should handle mixed usage of educational and basic methods', async () => {
      const mockTime = 1640995200000;
      mockDateNow.mockReturnValue(mockTime);

      // Use educational method
      const educationalResult = await actionEndpoints.createEducationalPost('投資教育について学びましょう');
      expect(educationalResult.success).toBe(true);

      // Use basic compatibility method
      const basicResult = await actionEndpoints.post('Basic post content');
      expect(basicResult.success).toBe(true);

      // Verify both update the same underlying state
      const stats = actionEndpoints.getPostingStatistics();
      expect(stats.lastPostTime).toBe(mockTime); // Should be from basic post (more recent)
    });
  });

  describe('State Management Integration', () => {
    it('should maintain consistent state across all operations', async () => {
      const baseTime = 1640995200000;
      let currentTime = baseTime;
      mockDateNow.mockImplementation(() => currentTime);

      // Initial state check
      const initialStats = actionEndpoints.getPostingStatistics();
      expect(initialStats.lastPostTime).toBe(0);
      expect(initialStats.lastRetweetTime).toBe(0);
      expect(initialStats.lastLikeTime).toBe(0);

      // Perform educational post
      await actionEndpoints.createEducationalPost('投資教育について');
      currentTime += 100; // Small time increment

      const afterPostStats = actionEndpoints.getPostingStatistics();
      expect(afterPostStats.lastPostTime).toBe(baseTime);
      expect(afterPostStats.lastRetweetTime).toBe(0);
      expect(afterPostStats.lastLikeTime).toBe(0);

      // Perform retweet (10 minutes later)
      currentTime = baseTime + 10 * 60 * 1000;
      await actionEndpoints.retweetEducationalContent('tweet-1', '投資の基礎知識について');
      currentTime += 100;

      const afterRetweetStats = actionEndpoints.getPostingStatistics();
      expect(afterRetweetStats.lastPostTime).toBe(baseTime);
      expect(afterRetweetStats.lastRetweetTime).toBe(baseTime + 10 * 60 * 1000);
      expect(afterRetweetStats.lastLikeTime).toBe(0);

      // Perform like (2 minutes later)
      currentTime = baseTime + 12 * 60 * 1000;
      await actionEndpoints.likeEducationalContent('tweet-2', '資産運用の重要性について');
      currentTime += 100;

      const finalStats = actionEndpoints.getPostingStatistics();
      expect(finalStats.lastPostTime).toBe(baseTime);
      expect(finalStats.lastRetweetTime).toBe(baseTime + 10 * 60 * 1000);
      expect(finalStats.lastLikeTime).toBe(baseTime + 12 * 60 * 1000);
    });

    it('should handle failed operations without state corruption', async () => {
      const mockTime = 1640995200000;
      mockDateNow.mockReturnValue(mockTime);

      // Successful operation
      await actionEndpoints.createEducationalPost('投資教育について学びましょう');
      const successStats = actionEndpoints.getPostingStatistics();
      expect(successStats.lastPostTime).toBe(mockTime);

      // Failed operation (should not change state)
      try {
        await actionEndpoints.createEducationalPost(''); // Empty content
      } catch (error) {
        // Expected error
      }

      const afterFailStats = actionEndpoints.getPostingStatistics();
      expect(afterFailStats.lastPostTime).toBe(mockTime); // Should remain unchanged

      // Another successful operation
      mockDateNow.mockReturnValue(mockTime + 31 * 60 * 1000);
      await actionEndpoints.createEducationalPost('リスク管理について学びましょう');
      
      const finalStats = actionEndpoints.getPostingStatistics();
      expect(finalStats.lastPostTime).toBe(mockTime + 31 * 60 * 1000);
    });
  });

  describe('Error Handling Integration', () => {
    it('should provide consistent error messages across all educational methods', async () => {
      const errorTestCases = [
        {
          method: 'createEducationalPost',
          params: [''],
          expectedErrorPattern: /教育的価値不足/
        },
        {
          method: 'retweetEducationalContent', 
          params: ['tweet-1', '天気がいいですね'],
          expectedErrorPattern: /元投稿に教育的価値が不足しています/
        },
        {
          method: 'likeEducationalContent',
          params: ['tweet-2', '天気がいいですね'],
          expectedErrorPattern: /教育的価値が不足しているためいいねできません/
        }
      ];

      for (const testCase of errorTestCases) {
        try {
          await (actionEndpoints as any)[testCase.method](...testCase.params);
          fail(`${testCase.method} should have thrown an error`);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toMatch(testCase.expectedErrorPattern);
        }
      }
    });

    it('should handle concurrent operations gracefully', async () => {
      const mockTime = 1640995200000;
      mockDateNow.mockReturnValue(mockTime);

      // Simulate concurrent calls
      const promises = [
        actionEndpoints.createEducationalPost('投資教育について学ぶ 1'),
        actionEndpoints.createEducationalPost('投資教育について学ぶ 2'),
        actionEndpoints.createEducationalPost('投資教育について学ぶ 3')
      ];

      const results = await Promise.allSettled(promises);

      // Only one should succeed (first one), others should fail due to frequency limit
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success);
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(2);

      // Failed operations should have frequency limit errors
      for (const failedResult of failed) {
        if (failedResult.status === 'rejected') {
          expect(failedResult.reason.message).toContain('投稿頻度制限');
        }
      }
    });
  });

  describe('Quality Score Integration', () => {
    it('should calculate and use quality scores consistently across all educational methods', async () => {
      const highQualityContent = '投資教育の基礎知識を学び、リスク管理と分散投資について理解しましょう。';
      const mediumQualityContent = '投資について学びましょう。';

      // Test createEducationalPost
      const postResult = await actionEndpoints.createEducationalPost(highQualityContent);
      expect(postResult.success).toBe(true);
      expect(postResult.qualityScore).toBe(60);
      expect(postResult.educationalValue).toBe(60);

      // Test retweetEducationalContent (10 minutes later)
      const mockTime = 1640995200000;
      mockDateNow.mockReturnValue(mockTime + 10 * 60 * 1000);
      
      const retweetResult = await actionEndpoints.retweetEducationalContent('tweet-1', highQualityContent);
      expect(retweetResult.success).toBe(true);
      expect(retweetResult.educationalReason).toContain('教育的価値: 60%');

      // Test likeEducationalContent (2 minutes later)
      mockDateNow.mockReturnValue(mockTime + 12 * 60 * 1000);
      
      const likeResult = await actionEndpoints.likeEducationalContent('tweet-2', highQualityContent);
      expect(likeResult.success).toBe(true);
      expect(likeResult.educationalJustification).toContain('教育的価値: 60%');

      // All should use the same quality calculation
      expect(postResult.qualityScore).toBe(60);
      expect(retweetResult.educationalReason).toContain('60%');
      expect(likeResult.educationalJustification).toContain('60%');
    });

    it('should apply quality thresholds consistently', async () => {
      // Mock quality validation to return specific scores
      const originalValidate = (actionEndpoints as any).validateEducationalContent;
      
      // Test score 39 (below educational threshold of 40)
      (actionEndpoints as any).validateEducationalContent = jest.fn().mockResolvedValue({
        isEducational: false, // 39 < 40
        hasValue: false,
        isAppropriate: true,
        qualityScore: 39,
        topics: ['投資'],
        reasons: []
      });

      try {
        await actionEndpoints.createEducationalPost('test content');
        fail('Should have failed with score 39');
      } catch (error) {
        expect((error as Error).message).toContain('教育的価値不足');
      }

      // Test score 49 (below like threshold of 50)
      (actionEndpoints as any).validateEducationalContent = jest.fn()
        .mockResolvedValueOnce({
          isEducational: true, // 49 >= 40
          hasValue: false,
          isAppropriate: true,
          qualityScore: 49,
          topics: ['投資'],
          reasons: []
        })
        .mockResolvedValueOnce({
          isEducational: true,
          hasValue: false,
          isAppropriate: true,
          qualityScore: 49,
          topics: ['投資'],
          reasons: []
        });

      // Should succeed for retweet (threshold 40)
      const retweetResult = await actionEndpoints.retweetEducationalContent('tweet-1', 'test');
      expect(retweetResult.success).toBe(true);

      // Should fail for like (threshold 50)
      try {
        await actionEndpoints.likeEducationalContent('tweet-2', 'test');
        fail('Should have failed with score 49 for like');
      } catch (error) {
        expect((error as Error).message).toContain('教育的価値が不足しているためいいねできません');
      }

      // Restore original method
      (actionEndpoints as any).validateEducationalContent = originalValidate;
    });
  });

  describe('Full System Integration', () => {
    it('should execute a complete realistic usage scenario', async () => {
      const baseTime = 1640995200000;
      let currentTime = baseTime;
      mockDateNow.mockImplementation(() => currentTime);

      console.log = jest.fn(); // Mock console.log for cleaner test output

      // Day 1: Morning post
      const morningPost = await actionEndpoints.createEducationalPost(
        '投資教育の基本: リスク管理について学びましょう。分散投資の重要性を理解することが成功への第一歩です。'
      );
      expect(morningPost.success).toBe(true);
      expect(morningPost.educationalValue).toBe(60);

      // 15 minutes later: Try to retweet (should fail - need 10 min gap from previous retweet)
      currentTime += 15 * 60 * 1000;
      const retweetAttempt = await actionEndpoints.retweetEducationalContent(
        'expert-tweet-123',
        'ポートフォリオ構築の基礎について詳しく解説。投資初心者にとって非常に有益な教育コンテンツです。'
      );
      expect(retweetAttempt.success).toBe(true); // Should succeed (no previous retweet)

      // 5 minutes later: Try to like
      currentTime += 5 * 60 * 1000;
      const likeAttempt = await actionEndpoints.likeEducationalContent(
        'quality-tweet-456',
        '資産運用の基礎知識について分かりやすく説明された素晴らしい投資教育コンテンツ。'
      );
      expect(likeAttempt.success).toBe(true);

      // 30 minutes after original post: Another post
      currentTime = baseTime + 30 * 60 * 1000;
      const afternoonPost = await actionEndpoints.createEducationalPost(
        '投資初心者のための基礎知識: 長期投資の重要性について学習しましょう。'
      );
      expect(afternoonPost.success).toBe(true);

      // Verify all statistics are correctly maintained
      const finalStats = actionEndpoints.getPostingStatistics();
      expect(finalStats.lastPostTime).toBe(baseTime + 30 * 60 * 1000);
      expect(finalStats.lastRetweetTime).toBe(baseTime + 15 * 60 * 1000);
      expect(finalStats.lastLikeTime).toBe(baseTime + 20 * 60 * 1000);

      // Verify execution metrics
      const metrics = await actionEndpoints.getExecutionMetrics();
      expect(metrics.educationalContentRatio).toBe(0.95);
      expect(metrics.lastExecutionTime).toBeDefined();
    });

    it('should handle a complete error recovery scenario', async () => {
      const mockTime = 1640995200000;
      mockDateNow.mockReturnValue(mockTime);

      // Successful operation
      const successResult = await actionEndpoints.createEducationalPost('投資教育について学びましょう');
      expect(successResult.success).toBe(true);

      // Series of failed operations
      const failedOperations = [
        () => actionEndpoints.createEducationalPost(''), // Empty content
        () => actionEndpoints.createEducationalPost('絶対儲かる'), // Prohibited keywords
        () => actionEndpoints.createEducationalPost('投資' + 'a'.repeat(25)), // Spam
        () => actionEndpoints.createEducationalPost('今日は天気がいい'), // No educational value
        () => actionEndpoints.createEducationalPost('投資教育について') // Frequency limit
      ];

      for (const operation of failedOperations) {
        try {
          await operation();
          fail('Operation should have failed');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      }

      // System should still be functional after errors
      mockDateNow.mockReturnValue(mockTime + 31 * 60 * 1000);
      const recoveryResult = await actionEndpoints.createEducationalPost('リスク管理の重要性について学習しましょう');
      expect(recoveryResult.success).toBe(true);

      // State should be consistent
      const finalStats = actionEndpoints.getPostingStatistics();
      expect(finalStats.lastPostTime).toBe(mockTime + 31 * 60 * 1000);
    });
  });
});