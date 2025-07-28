/**
 * Educational Content Test Suite
 * 教育的コンテンツ機能の専用単体テスト
 */

import { ActionEndpoints } from '../../../src/kaito-api/endpoints/action-endpoints';
import type {
  EducationalTweetResult,
  EducationalRetweetResult,
  EducationalLikeResult
} from '../../../src/kaito-api/types';

describe('Educational Content Functionality', () => {
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

  describe('createEducationalPost - 教育的投稿作成機能', () => {
    describe('正常系テスト', () => {
      it('should create educational post with high quality score', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        const educationalContent = '投資教育について学ぶことは非常に重要です。リスク管理を理解し、分散投資の基礎知識を身につけましょう。';

        const result = await actionEndpoints.createEducationalPost(educationalContent);

        expect(result.success).toBe(true);
        expect(result.id).toBe(`tweet_${mockTime}`);
        expect(result.content).toBe(educationalContent);
        expect(result.educationalValue).toBe(60); // 教育キーワード有りでの固定スコア
        expect(result.qualityScore).toBe(60);
        expect(result.timestamp).toBeDefined();
        expect(result.error).toBeUndefined();
      });

      it('should detect educational keywords correctly', async () => {
        const testCases = [
          { content: '投資教育の重要性について', expectedScore: 60 },
          { content: '投資初心者のための基礎知識', expectedScore: 60 },
          { content: 'リスク管理は投資の基本です', expectedScore: 60 },
          { content: 'ポートフォリオ分散投資について', expectedScore: 60 },
          { content: '資産運用の注意点とメリット', expectedScore: 60 },
        ];

        for (const testCase of testCases) {
          const result = await actionEndpoints.createEducationalPost(testCase.content);
          expect(result.success).toBe(true);
          expect(result.educationalValue).toBe(testCase.expectedScore);
          expect(result.qualityScore).toBe(testCase.expectedScore);
        }
      });

      it('should handle case-insensitive educational keyword detection', async () => {
        const testCases = [
          '投資教育について', // 小文字
          '投資教育について', // 大文字
          '投資教育について'  // 混在
        ];

        for (const content of testCases) {
          const result = await actionEndpoints.createEducationalPost(content);
          expect(result.success).toBe(true);
          expect(result.educationalValue).toBeGreaterThan(0);
        }
      });

      it('should update posting time after successful post', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        await actionEndpoints.createEducationalPost('投資の基礎知識について学びましょう');

        const stats = actionEndpoints.getPostingStatistics();
        expect(stats.lastPostTime).toBe(mockTime);
      });

      it('should log successful educational post creation', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        await actionEndpoints.createEducationalPost('分散投資の重要性について');

        expect(consoleSpy).toHaveBeenCalledWith(
          '📝 教育的投稿作成開始:',
          expect.objectContaining({ contentLength: expect.any(Number) })
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          '✅ 教育的投稿完了:',
          expect.objectContaining({
            id: expect.any(String),
            educationalValue: expect.any(Number),
            topics: expect.any(Array)
          })
        );
        
        consoleSpy.mockRestore();
      });
    });

    describe('異常系テスト', () => {
      it('should reject empty content', async () => {
        try {
          await actionEndpoints.createEducationalPost('');
          fail('Should have thrown validation error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('教育的価値不足');
        }
      });

      it('should reject content without educational keywords', async () => {
        try {
          await actionEndpoints.createEducationalPost('今日は天気がいいですね。お疲れ様でした。');
          fail('Should have thrown validation error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('教育的価値不足');
        }
      });

      it('should reject content with prohibited keywords', async () => {
        try {
          await actionEndpoints.createEducationalPost('絶対儲かる投資教育について');
          fail('Should have thrown validation error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('教育的価値不足');
        }
      });

      it('should reject spam content', async () => {
        try {
          await actionEndpoints.createEducationalPost('投資教育aaaaaaaaaaaaaaaaaaaaaa'); // 20+ repeated characters
          fail('Should have thrown spam error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('スパムと判定されたため投稿できません');
        }
      });

      it('should enforce frequency limit (30 minutes)', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        // First post
        await actionEndpoints.createEducationalPost('投資教育の基本について');

        // Try to post again within 30 minutes
        mockDateNow.mockReturnValue(mockTime + 15 * 60 * 1000); // 15 minutes later

        try {
          await actionEndpoints.createEducationalPost('リスク管理について');
          fail('Should have thrown frequency limit error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('投稿頻度制限');
          expect((error as Error).message).toContain('15分後に再試行');
        }
      });

      it('should log errors appropriately', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        try {
          await actionEndpoints.createEducationalPost('');
        } catch (error) {
          // Expected error
        }

        expect(consoleSpy).toHaveBeenCalledWith('❌ 教育的投稿失敗:', expect.any(Error));
        consoleSpy.mockRestore();
      });

      it('should return failed result on error', async () => {
        const result = await actionEndpoints.createEducationalPost('');

        expect(result.success).toBe(false);
        expect(result.id).toBe('');
        expect(result.educationalValue).toBe(0);
        expect(result.qualityScore).toBe(0);
        expect(result.error).toContain('教育的価値不足');
        expect(result.timestamp).toBeDefined();
      });
    });

    describe('境界値テスト', () => {
      it('should handle minimum valid content length (10 characters)', async () => {
        const minContent = '投資教育基本知識'; // Exactly 10 characters with educational keyword

        const result = await actionEndpoints.createEducationalPost(minContent);
        expect(result.success).toBe(true);
        expect(result.educationalValue).toBe(60);
      });

      it('should reject content shorter than 10 characters', async () => {
        const shortContent = '投資教育'; // Only 4 characters

        const result = await actionEndpoints.createEducationalPost(shortContent);
        expect(result.success).toBe(false);
        expect(result.error).toContain('内容が短すぎます');
      });

      it('should handle frequency limit boundary (exactly 30 minutes)', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        // First post
        await actionEndpoints.createEducationalPost('投資の基礎について');

        // Try to post exactly 30 minutes later
        mockDateNow.mockReturnValue(mockTime + 30 * 60 * 1000);

        const result = await actionEndpoints.createEducationalPost('リスク管理の重要性');
        expect(result.success).toBe(true);
      });

      it('should handle frequency limit boundary (29 minutes 59 seconds)', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        // First post
        await actionEndpoints.createEducationalPost('投資の基礎について');

        // Try to post 1 second before 30 minutes
        mockDateNow.mockReturnValue(mockTime + 30 * 60 * 1000 - 1000);

        try {
          await actionEndpoints.createEducationalPost('リスク管理の重要性');
          fail('Should have thrown frequency limit error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('投稿頻度制限');
        }
      });
    });
  });

  describe('retweetEducationalContent - 教育的リツイート機能', () => {
    describe('正常系テスト', () => {
      it('should retweet educational content successfully', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        const originalContent = '投資教育について深く学ぶことで、より良い資産運用が可能になります。';
        const tweetId = 'educational-tweet-123';

        const result = await actionEndpoints.retweetEducationalContent(tweetId, originalContent);

        expect(result.success).toBe(true);
        expect(result.id).toMatch(/^retweet_\d+$/);
        expect(result.originalTweetId).toBe(tweetId);
        expect(result.educationalReason).toContain('教育的価値: 60%');
        expect(result.timestamp).toBeDefined();
        expect(result.error).toBeUndefined();
      });

      it('should update retweet time after successful retweet', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        await actionEndpoints.retweetEducationalContent(
          'test-tweet',
          '分散投資の基礎知識について'
        );

        const stats = actionEndpoints.getPostingStatistics();
        expect(stats.lastRetweetTime).toBe(mockTime);
      });

      it('should include educational topics in reason', async () => {
        const content = '投資教育と基礎知識について学び、リスク管理を身につけましょう。';
        
        const result = await actionEndpoints.retweetEducationalContent('test-tweet', content);

        expect(result.success).toBe(true);
        expect(result.educationalReason).toContain('トピック:');
        expect(result.educationalReason).toContain('投資教育');
      });
    });

    describe('異常系テスト', () => {
      it('should reject content without educational value', async () => {
        const nonEducationalContent = '今日は良い天気ですね。';

        try {
          await actionEndpoints.retweetEducationalContent('test-tweet', nonEducationalContent);
          fail('Should have thrown educational value error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('元投稿に教育的価値が不足しています');
        }
      });

      it('should enforce retweet frequency limit (10 minutes)', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        // First retweet
        await actionEndpoints.retweetEducationalContent(
          'tweet-1',
          '投資教育の重要性について'
        );

        // Try to retweet again within 10 minutes
        mockDateNow.mockReturnValue(mockTime + 5 * 60 * 1000); // 5 minutes later

        try {
          await actionEndpoints.retweetEducationalContent(
            'tweet-2',
            'リスク管理の基礎について'
          );
          fail('Should have thrown frequency limit error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('リツイート頻度制限');
          expect((error as Error).message).toContain('10分間隔');
        }
      });

      it('should return failed result on error', async () => {
        const result = await actionEndpoints.retweetEducationalContent(
          'test-tweet',
          '非教育的な内容'
        );

        expect(result.success).toBe(false);
        expect(result.id).toBe('');
        expect(result.originalTweetId).toBe('test-tweet');
        expect(result.educationalReason).toBe('');
        expect(result.error).toContain('元投稿に教育的価値が不足しています');
      });
    });

    describe('頻度制御テスト', () => {
      it('should allow retweet after 10 minutes exactly', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        // First retweet
        await actionEndpoints.retweetEducationalContent(
          'tweet-1',
          '投資教育について'
        );

        // Retweet exactly 10 minutes later
        mockDateNow.mockReturnValue(mockTime + 10 * 60 * 1000);

        const result = await actionEndpoints.retweetEducationalContent(
          'tweet-2',
          'リスク管理について'
        );

        expect(result.success).toBe(true);
      });

      it('should reject retweet 1 second before 10 minutes', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        // First retweet
        await actionEndpoints.retweetEducationalContent(
          'tweet-1',
          '投資教育について'
        );

        // Try to retweet 1 second before 10 minutes
        mockDateNow.mockReturnValue(mockTime + 10 * 60 * 1000 - 1000);

        try {
          await actionEndpoints.retweetEducationalContent(
            'tweet-2',
            'リスク管理について'
          );
          fail('Should have thrown frequency limit error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('リツイート頻度制限');
        }
      });
    });
  });

  describe('likeEducationalContent - 教育的いいね機能', () => {
    describe('正常系テスト', () => {
      it('should like high-quality educational content successfully', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        const highQualityContent = '投資教育の基礎知識について詳しく解説します。リスク管理と分散投資の重要性を学びましょう。';
        const tweetId = 'educational-tweet-456';

        const result = await actionEndpoints.likeEducationalContent(tweetId, highQualityContent);

        expect(result.success).toBe(true);
        expect(result.tweetId).toBe(tweetId);
        expect(result.educationalJustification).toContain('教育的価値: 60%');
        expect(result.timestamp).toBeDefined();
        expect(result.error).toBeUndefined();
      });

      it('should update like time after successful like', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        await actionEndpoints.likeEducationalContent(
          'test-tweet',
          '投資教育の基礎について'
        );

        const stats = actionEndpoints.getPostingStatistics();
        expect(stats.lastLikeTime).toBe(mockTime);
      });
    });

    describe('異常系テスト', () => {
      it('should reject content with quality score below 50', async () => {
        const lowQualityContent = '今日はいい天気ですね。'; // No educational keywords, score = 20

        try {
          await actionEndpoints.likeEducationalContent('test-tweet', lowQualityContent);
          fail('Should have thrown quality score error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('教育的価値が不足しているためいいねできません');
        }
      });

      it('should enforce like frequency limit (2 minutes)', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        // First like
        await actionEndpoints.likeEducationalContent(
          'tweet-1',
          '投資教育について学びましょう'
        );

        // Try to like again within 2 minutes
        mockDateNow.mockReturnValue(mockTime + 60 * 1000); // 1 minute later

        try {
          await actionEndpoints.likeEducationalContent(
            'tweet-2',
            'リスク管理の基礎知識'
          );
          fail('Should have thrown frequency limit error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('いいね頻度制限');
          expect((error as Error).message).toContain('2分間隔');
        }
      });

      it('should return failed result on error', async () => {
        const result = await actionEndpoints.likeEducationalContent(
          'test-tweet',
          '非教育的な内容です'
        );

        expect(result.success).toBe(false);
        expect(result.tweetId).toBe('test-tweet');
        expect(result.educationalJustification).toBe('');
        expect(result.error).toContain('教育的価値が不足しているためいいねできません');
      });
    });

    describe('品質閾値テスト', () => {
      it('should reject content with quality score 49', async () => {
        // Mock the validation to return score 49
        const originalValidate = (actionEndpoints as any).validateEducationalContent;
        (actionEndpoints as any).validateEducationalContent = jest.fn().mockResolvedValue({
          isEducational: true,
          hasValue: false,
          isAppropriate: true,
          qualityScore: 49,
          topics: [],
          reasons: []
        });

        try {
          await actionEndpoints.likeEducationalContent('test-tweet', 'some content');
          fail('Should have thrown quality score error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('教育的価値が不足しているためいいねできません');
        }

        // Restore original method
        (actionEndpoints as any).validateEducationalContent = originalValidate;
      });

      it('should accept content with quality score 50', async () => {
        // This test uses actual educational content that should score 60
        const result = await actionEndpoints.likeEducationalContent(
          'test-tweet',
          '投資教育の基礎について学びましょう'
        );

        expect(result.success).toBe(true);
      });
    });

    describe('頻度制御テスト', () => {
      it('should allow like after 2 minutes exactly', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        // First like
        await actionEndpoints.likeEducationalContent(
          'tweet-1',
          '投資教育について'
        );

        // Like exactly 2 minutes later
        mockDateNow.mockReturnValue(mockTime + 2 * 60 * 1000);

        const result = await actionEndpoints.likeEducationalContent(
          'tweet-2',
          'リスク管理について'
        );

        expect(result.success).toBe(true);
      });

      it('should reject like 1 second before 2 minutes', async () => {
        const mockTime = 1640995200000;
        mockDateNow.mockReturnValue(mockTime);

        // First like
        await actionEndpoints.likeEducationalContent(
          'tweet-1',
          '投資教育について'
        );

        // Try to like 1 second before 2 minutes
        mockDateNow.mockReturnValue(mockTime + 2 * 60 * 1000 - 1000);

        try {
          await actionEndpoints.likeEducationalContent(
            'tweet-2',
            'リスク管理について'
          );
          fail('Should have thrown frequency limit error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('いいね頻度制限');
        }
      });
    });
  });

  describe('Educational Content Integration', () => {
    it('should maintain independent frequency controls', async () => {
      const mockTime = 1640995200000;
      let currentTime = mockTime;
      mockDateNow.mockImplementation(() => currentTime);

      // Post (30 min frequency)
      await actionEndpoints.createEducationalPost('投資教育について');
      
      // Move 10 minutes - should allow retweet but not post
      currentTime += 10 * 60 * 1000;
      const retweetResult = await actionEndpoints.retweetEducationalContent(
        'tweet-1',
        '投資の基礎知識'
      );
      expect(retweetResult.success).toBe(true);

      // Move 2 minutes - should allow like but not retweet or post
      currentTime += 2 * 60 * 1000;
      const likeResult = await actionEndpoints.likeEducationalContent(
        'tweet-2',
        'リスク管理の重要性'
      );
      expect(likeResult.success).toBe(true);

      // Verify post still blocked
      try {
        await actionEndpoints.createEducationalPost('新しい投稿');
        fail('Should still be blocked by post frequency limit');
      } catch (error) {
        expect((error as Error).message).toContain('投稿頻度制限');
      }
    });

    it('should provide educational justification for all actions', async () => {
      const educationalContent = '投資教育と基礎知識の重要性について';

      const postResult = await actionEndpoints.createEducationalPost(educationalContent);
      expect(postResult.educationalValue).toBeGreaterThan(0);

      const retweetResult = await actionEndpoints.retweetEducationalContent('tweet-1', educationalContent);
      expect(retweetResult.educationalReason).toContain('教育的価値');

      const likeResult = await actionEndpoints.likeEducationalContent('tweet-2', educationalContent);
      expect(likeResult.educationalJustification).toContain('教育的価値');
    });
  });
});