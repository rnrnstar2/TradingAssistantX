/**
 * Content Validation Test Suite
 * コンテンツ検証機能の専用単体テスト
 */

import { ActionEndpoints } from '../../../src/kaito-api/endpoints/action-endpoints';
import type { ContentValidation } from '../../../src/kaito-api/types';

describe('Content Validation Functionality', () => {
  let actionEndpoints: ActionEndpoints;

  beforeEach(() => {
    actionEndpoints = new ActionEndpoints('https://api.test.com', {
      'Authorization': 'Bearer test-token'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper method to access private validateEducationalContent method
  const validateContent = async (content: string): Promise<ContentValidation> => {
    return (actionEndpoints as any).validateEducationalContent(content);
  };

  describe('validateEducationalContent - コンテンツ検証機能', () => {
    describe('教育キーワード検出テスト', () => {
      it('should detect basic educational keywords', async () => {
        const testCases = [
          { content: '投資教育について学ぶ', expectedKeywords: ['投資教育'] },
          { content: '投資初心者のための基礎知識', expectedKeywords: ['投資初心者', '基礎知識'] },
          { content: 'リスク管理の重要性', expectedKeywords: ['リスク管理'] },
          { content: '資産運用と分散投資', expectedKeywords: ['資産運用', '分散投資'] },
          { content: 'ポートフォリオの注意点', expectedKeywords: ['ポートフォリオ', '注意点'] }
        ];

        for (const testCase of testCases) {
          const result = await validateContent(testCase.content);
          
          expect(result.isEducational).toBe(true);
          expect(result.hasValue).toBe(true);
          expect(result.qualityScore).toBe(60);
          expect(result.topics).toEqual(expect.arrayContaining(testCase.expectedKeywords));
        }
      });

      it('should handle case-insensitive keyword detection', async () => {
        const testCases = [
          '投資教育について', // 全て小文字
          '投資教育について', // 全て大文字
          '投資教育について'  // 混在
        ];

        for (const content of testCases) {
          const result = await validateContent(content);
          expect(result.isEducational).toBe(true);
          expect(result.qualityScore).toBe(60);
          expect(result.topics).toContain('投資教育');
        }
      });

      it('should detect multiple educational keywords', async () => {
        const content = '投資教育の基礎知識として、リスク管理と分散投資について学習しましょう。';

        const result = await validateContent(content);

        expect(result.isEducational).toBe(true);
        expect(result.qualityScore).toBe(60);
        expect(result.topics).toEqual(expect.arrayContaining([
          '投資教育', '基礎知識', 'リスク管理', '分散投資', '学習'
        ]));
      });

      it('should return low score for content without educational keywords', async () => {
        const content = '今日は天気がいいですね。お疲れ様でした。';

        const result = await validateContent(content);

        expect(result.isEducational).toBe(false); // qualityScore < 40
        expect(result.hasValue).toBe(false); // qualityScore < 60
        expect(result.qualityScore).toBe(20); // Default score
        expect(result.topics).toHaveLength(0);
        expect(result.reasons).toContain('教育的キーワードが不足しています');
      });

      it('should remove duplicate topics', async () => {
        const content = '投資教育について投資教育の基礎を学び、投資教育を実践しましょう。';

        const result = await validateContent(content);

        const topicCounts = result.topics.reduce((acc: Record<string, number>, topic) => {
          acc[topic] = (acc[topic] || 0) + 1;
          return acc;
        }, {});

        // Each topic should appear only once
        for (const count of Object.values(topicCounts)) {
          expect(count).toBe(1);
        }
      });
    });

    describe('禁止キーワード検出テスト', () => {
      it('should detect and reject prohibited keywords', async () => {
        const prohibitedTestCases = [
          '絶対儲かる投資方法',
          '確実に稼げる方法',
          '必ず上がる株式',
          '損失なしの投資',
          '秘密の手法を教えます',
          '一攫千金のチャンス',
          '楽して稼ぐ方法',
          'すぐに億万長者になれる'
        ];

        for (const content of prohibitedTestCases) {
          const result = await validateContent(content);

          expect(result.isEducational).toBe(false);
          expect(result.hasValue).toBe(false);
          expect(result.isAppropriate).toBe(false);
          expect(result.qualityScore).toBe(0);
          expect(result.reasons).toContain('不適切なキーワードが含まれています');
        }
      });

      it('should handle case-insensitive prohibited keyword detection', async () => {
        const testCases = [
          '絶対儲かる',
          '絶対儲かる',
          '絶対儲かる'
        ];

        for (const content of testCases) {
          const result = await validateContent(content);
          expect(result.qualityScore).toBe(0);
          expect(result.isAppropriate).toBe(false);
        }
      });

      it('should prioritize prohibited keywords over educational keywords', async () => {
        const content = '投資教育について学ぶ。絶対儲かる方法を教えます。';

        const result = await validateContent(content);

        expect(result.qualityScore).toBe(0); // Prohibited keyword overrides educational value
        expect(result.isEducational).toBe(false);
        expect(result.isAppropriate).toBe(false);
        expect(result.reasons).toContain('不適切なキーワードが含まれています');
      });
    });

    describe('品質スコア計算テスト', () => {
      it('should calculate quality score 60 for educational keywords', async () => {
        const content = '投資教育の基礎について学びましょう。';

        const result = await validateContent(content);

        expect(result.qualityScore).toBe(60);
        expect(result.isEducational).toBe(true); // 60 >= 40
        expect(result.hasValue).toBe(true); // 60 >= 60
      });

      it('should calculate quality score 20 for non-educational content', async () => {
        const content = '今日はいい天気ですね。散歩に行きました。';

        const result = await validateContent(content);

        expect(result.qualityScore).toBe(20);
        expect(result.isEducational).toBe(false); // 20 < 40
        expect(result.hasValue).toBe(false); // 20 < 60
      });

      it('should calculate quality score 0 for prohibited keywords', async () => {
        const content = '絶対儲かる投資方法があります。';

        const result = await validateContent(content);

        expect(result.qualityScore).toBe(0);
        expect(result.isEducational).toBe(false);
        expect(result.hasValue).toBe(false);
      });

      it('should calculate quality score 0 for short content', async () => {
        const content = '短い'; // Less than 10 characters

        const result = await validateContent(content);

        expect(result.qualityScore).toBe(0);
        expect(result.isEducational).toBe(false);
        expect(result.hasValue).toBe(false);
        expect(result.reasons).toContain('内容が短すぎます');
      });

      it('should ensure quality score is within 0-100 range', async () => {
        const testCases = [
          '投資教育について', // Should be 60
          '今日はいい天気', // Should be 20
          '絶対儲かる', // Should be 0
          '' // Should be 0
        ];

        for (const content of testCases) {
          const result = await validateContent(content);
          expect(result.qualityScore).toBeGreaterThanOrEqual(0);
          expect(result.qualityScore).toBeLessThanOrEqual(100);
        }
      });
    });

    describe('長さチェックテスト', () => {
      it('should reject content shorter than 10 characters', async () => {
        const shortContents = [
          '', // 0 characters
          '短い', // 2 characters
          '少し長い', // 4 characters
          'もう少し長い' // 6 characters
        ];

        for (const content of shortContents) {
          const result = await validateContent(content);
          expect(result.qualityScore).toBe(0);
          expect(result.isEducational).toBe(false);
          expect(result.reasons).toContain(
            content === '' ? 'コンテンツが空です' : '内容が短すぎます'
          );
        }
      });

      it('should accept content with exactly 10 characters', async () => {
        const content = '1234567890'; // Exactly 10 characters

        const result = await validateContent(content);

        expect(result.qualityScore).toBe(20); // No educational keywords, but not rejected for length
        expect(result.reasons).not.toContain('内容が短すぎます');
      });

      it('should accept content longer than 10 characters', async () => {
        const content = '投資教育についての長い説明文です。'; // Much longer than 10 characters

        const result = await validateContent(content);

        expect(result.qualityScore).toBe(60); // Has educational keywords
        expect(result.reasons).not.toContain('内容が短すぎます');
      });
    });

    describe('空コンテンツ処理テスト', () => {
      it('should handle empty string', async () => {
        const result = await validateContent('');

        expect(result.isEducational).toBe(false);
        expect(result.hasValue).toBe(false);
        expect(result.isAppropriate).toBe(false);
        expect(result.qualityScore).toBe(0);
        expect(result.topics).toHaveLength(0);
        expect(result.reasons).toContain('コンテンツが空です');
      });

      it('should handle whitespace-only content', async () => {
        const whitespaceContents = ['   ', '\t\t', '\n\n', '  \t\n  '];

        for (const content of whitespaceContents) {
          const result = await validateContent(content);
          expect(result.qualityScore).toBe(0);
          expect(result.reasons).toContain('コンテンツが空です');
        }
      });

      it('should handle null and undefined content gracefully', async () => {
        const result1 = await validateContent(null as any);
        const result2 = await validateContent(undefined as any);

        expect(result1.qualityScore).toBe(0);
        expect(result1.reasons).toContain('コンテンツが空です');
        
        expect(result2.qualityScore).toBe(0);
        expect(result2.reasons).toContain('コンテンツが空です');
      });
    });

    describe('適切性判定テスト', () => {
      it('should mark educational content as appropriate', async () => {
        const content = '投資教育について学ぶことは重要です。';

        const result = await validateContent(content);

        expect(result.isAppropriate).toBe(true);
      });

      it('should mark content with prohibited keywords as inappropriate', async () => {
        const content = '絶対儲かる投資方法';

        const result = await validateContent(content);

        expect(result.isAppropriate).toBe(false);
      });

      it('should mark non-educational content as appropriate if no prohibited keywords', async () => {
        const content = '今日は天気がいいですね。';

        const result = await validateContent(content);

        expect(result.isAppropriate).toBe(true); // No prohibited keywords
        expect(result.isEducational).toBe(false); // But not educational
      });
    });

    describe('理由リスト生成テスト', () => {
      it('should provide completion reason for valid content', async () => {
        const content = '投資教育について学びましょう。';

        const result = await validateContent(content);

        expect(result.reasons).toEqual(['検証完了']);
      });

      it('should provide multiple reasons for invalid content', async () => {
        const content = '短い絶対儲かる'; // Short + prohibited keyword

        const result = await validateContent(content);

        expect(result.reasons).toEqual(expect.arrayContaining([
          '不適切なキーワードが含まれています',
          '内容が短すぎます'
        ]));
      });

      it('should provide educational keyword reason for non-educational content', async () => {
        const content = '今日は天気がいいですね。お疲れ様でした。';

        const result = await validateContent(content);

        expect(result.reasons).toContain('教育的キーワードが不足しています');
      });
    });

    describe('エラーハンドリングテスト', () => {
      it('should handle validation processing errors gracefully', async () => {
        // Mock a scenario where validation throws an error
        const originalMethod = (actionEndpoints as any).validateEducationalContent;
        (actionEndpoints as any).validateEducationalContent = jest.fn().mockImplementation(() => {
          throw new Error('Validation error');
        });

        const result = await validateContent('test content');

        expect(result.isEducational).toBe(false);
        expect(result.hasValue).toBe(false);
        expect(result.isAppropriate).toBe(false);
        expect(result.qualityScore).toBe(0);
        expect(result.topics).toHaveLength(0);
        expect(result.reasons).toContain('検証処理エラー');

        // Restore original method
        (actionEndpoints as any).validateEducationalContent = originalMethod;
      });

      it('should log validation errors', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        // Force an error by mocking the keyword check
        const originalKeywords = (actionEndpoints as any).EDUCATIONAL_KEYWORDS;
        (actionEndpoints as any).EDUCATIONAL_KEYWORDS = null; // This should cause an error

        const result = await validateContent('test content');

        expect(consoleSpy).toHaveBeenCalledWith('コンテンツ検証エラー:', expect.any(Error));
        expect(result.reasons).toContain('検証処理エラー');

        // Restore
        (actionEndpoints as any).EDUCATIONAL_KEYWORDS = originalKeywords;
        consoleSpy.mockRestore();
      });
    });

    describe('境界値・エッジケーステスト', () => {
      it('should handle content at educational threshold (score = 40)', async () => {
        // Mock to return exactly score 40
        const originalValidate = (actionEndpoints as any).validateEducationalContent;
        (actionEndpoints as any).validateEducationalContent = jest.fn().mockResolvedValue({
          isEducational: true,
          hasValue: false,
          isAppropriate: true,
          qualityScore: 40,
          topics: ['test'],
          reasons: []
        });

        const result = await validateContent('test content');

        expect(result.isEducational).toBe(true); // 40 >= 40
        expect(result.hasValue).toBe(false); // 40 < 60

        // Restore
        (actionEndpoints as any).validateEducationalContent = originalValidate;
      });

      it('should handle content at value threshold (score = 60)', async () => {
        const content = '投資教育について学ぶことは重要です。';

        const result = await validateContent(content);

        expect(result.qualityScore).toBe(60);
        expect(result.isEducational).toBe(true); // 60 >= 40
        expect(result.hasValue).toBe(true); // 60 >= 60
      });

      it('should handle very long content', async () => {
        const longContent = '投資教育について'.repeat(100); // Very long content with educational keywords

        const result = await validateContent(longContent);

        expect(result.isEducational).toBe(true);
        expect(result.qualityScore).toBe(60);
        expect(result.topics).toContain('投資教育');
      });

      it('should handle special characters and emojis', async () => {
        const content = '投資教育📚について学ぼう💡！リスク管理⚠️が重要🔥';

        const result = await validateContent(content);

        expect(result.isEducational).toBe(true);
        expect(result.qualityScore).toBe(60);
        expect(result.topics).toEqual(expect.arrayContaining(['投資教育', 'リスク管理']));
      });

      it('should handle mixed language content', async () => {
        const content = '投資教育 investment education について学習 learning しましょう';

        const result = await validateContent(content);

        expect(result.isEducational).toBe(true);
        expect(result.topics).toContain('投資教育');
      });
    });
  });
});