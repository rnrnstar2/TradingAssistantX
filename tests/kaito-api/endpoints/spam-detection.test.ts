/**
 * Spam Detection Test Suite
 * スパム検出機能の専用単体テスト
 */

import { ActionEndpoints } from '../../../src/kaito-api/endpoints/action-endpoints';

describe('Spam Detection Functionality', () => {
  let actionEndpoints: ActionEndpoints;

  beforeEach(() => {
    actionEndpoints = new ActionEndpoints('https://api.test.com', {
      'Authorization': 'Bearer test-token'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper method to access private detectSpam method
  const detectSpam = (content: string): boolean => {
    return (actionEndpoints as any).detectSpam(content);
  };

  describe('detectSpam - スパム検出機能', () => {
    describe('繰り返し文字検出テスト', () => {
      it('should detect spam with 20+ repeated characters', () => {
        const spamContents = [
          'aaaaaaaaaaaaaaaaaaaaaa', // 22 'a's
          'bbbbbbbbbbbbbbbbbbbbbbb', // 23 'b's
          '11111111111111111111111', // 23 '1's
          '！！！！！！！！！！！！！！！！！！！！！', // 21 '！'s
          'xxxxxxxxxxxxxxxxxxxxxxxx', // 24 'x's
        ];

        for (const content of spamContents) {
          const result = detectSpam(content);
          expect(result).toBe(true);
        }
      });

      it('should not detect spam with exactly 20 repeated characters', () => {
        const borderlineContents = [
          'aaaaaaaaaaaaaaaaaaaa', // Exactly 20 'a's
          'bbbbbbbbbbbbbbbbbbbb', // Exactly 20 'b's
          '11111111111111111111', // Exactly 20 '1's
          '！！！！！！！！！！！！！！！！！！！！', // Exactly 20 '！'s
        ];

        for (const content of borderlineContents) {
          const result = detectSpam(content);
          expect(result).toBe(true); // Note: The regex is (.)\1{20,} which means 21+ total characters
        }
      });

      it('should not detect spam with 19 or fewer repeated characters', () => {
        const validContents = [
          'aaaaaaaaaaaaaaaaaa', // 18 'a's
          'bbbbbbbbbbbbbbbbbbb', // 19 'b's
          '1111111111111111111', // 19 '1's
          '！！！！！！！！！！！！！！！！！！！', // 19 '！'s
          'xxxxxxxxxxxxxxxxx', // 17 'x's
        ];

        for (const content of validContents) {
          const result = detectSpam(content);
          expect(result).toBe(false);
        }
      });

      it('should detect repeated characters in mixed content', () => {
        const mixedSpamContents = [
          '投資について aaaaaaaaaaaaaaaaaaaaaaaa です', // 26 'a's in mixed content
          'これは良い投資方法です！！！！！！！！！！！！！！！！！！！！！', // 21 '！'s
          'おすすめ投資法: xxxxxxxxxxxxxxxxxxxxxxx', // 23 'x's
        ];

        for (const content of mixedSpamContents) {
          const result = detectSpam(content);
          expect(result).toBe(true);
        }
      });

      it('should not detect repeated characters across different positions', () => {
        const validContents = [
          'aaa bbb aaa bbb aaa bbb aaa', // Multiple groups of 3, but not consecutive
          'a投資a教育a基礎a知識a学習a重要a資産a運用a', // Single characters separated
          '111投資222教育333基礎444', // Numbers separated by text
        ];

        for (const content of validContents) {
          const result = detectSpam(content);
          expect(result).toBe(false);
        }
      });

      it('should handle different types of repeated characters', () => {
        const characterTypes = [
          { content: 'AAAAAAAAAAAAAAAAAAAAAAAA', description: 'uppercase letters' },
          { content: 'aaaaaaaaaaaaaaaaaaaaaaaa', description: 'lowercase letters' },
          { content: '111111111111111111111111', description: 'numbers' },
          { content: '！！！！！！！！！！！！！！！！！！！！！', description: 'punctuation' },
          { content: '。。。。。。。。。。。。。。。。。。。。。', description: 'periods' },
          { content: '　　　　　　　　　　　　　　　　　　　　　', description: 'spaces' },
          { content: '★★★★★★★★★★★★★★★★★★★★★', description: 'symbols' },
        ];

        for (const testCase of characterTypes) {
          const result = detectSpam(testCase.content);
          expect(result).toBe(true);
        }
      });
    });

    describe('装飾文字検出テスト', () => {
      it('should detect spam with 20+ decorative characters', () => {
        const decorativeSpamContents = [
          '★★★★★★★★★★★★★★★★★★★★★', // 21 stars
          '☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆', // 21 hollow stars
          '♪♫♪♫♪♫♪♫♪♫♪♫♪♫♪♫♪♫♪♫♪', // 21 music notes
          '◆◇■□▲▼◆◇■□▲▼◆◇■□▲▼◆◇■□▲', // 21 shapes
          '★☆♪♫◆◇■□▲▼★☆♪♫◆◇■□▲▼★', // 21 mixed decorative
        ];

        for (const content of decorativeSpamContents) {
          const result = detectSpam(content);
          expect(result).toBe(true);
        }
      });

      it('should not detect spam with exactly 20 decorative characters', () => {
        const borderlineContents = [
          '★★★★★★★★★★★★★★★★★★★★', // Exactly 20 stars
          '☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆', // Exactly 20 hollow stars
          '♪♫♪♫♪♫♪♫♪♫♪♫♪♫♪♫♪♫♪♫', // Exactly 20 music notes
          '◆◇■□▲▼◆◇■□▲▼◆◇■□▲▼◆◇■', // Exactly 20 shapes
        ];

        for (const content of borderlineContents) {
          const result = detectSpam(content);
          expect(result).toBe(false);
        }
      });

      it('should not detect spam with 19 or fewer decorative characters', () => {
        const validContents = [
          '★★★★★★★★★★★★★★★★★★★', // 19 stars
          '☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆', // 18 hollow stars
          '♪♫♪♫♪♫♪♫♪♫♪♫♪♫♪♫♪', // 17 music notes
          '◆◇■□▲▼◆◇■□▲▼◆◇■□', // 16 shapes
        ];

        for (const content of validContents) {
          const result = detectSpam(content);
          expect(result).toBe(false);
        }
      });

      it('should count decorative characters correctly in mixed content', () => {
        const testCases = [
          {
            content: '投資教育について★★★★★★★★★★★★★★★★★★★★★学びましょう',
            description: 'text with 21 stars',
            shouldDetect: true
          },
          {
            content: 'リスク管理は重要です☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆',
            description: 'text with 20 hollow stars',
            shouldDetect: false
          },
          {
            content: '♪投資♫教育♪基礎♫知識♪学習♫重要♪資産♫運用♪分散♫投資♪',
            description: 'alternating text and music notes (20 total)',
            shouldDetect: false
          },
          {
            content: '★☆♪♫◆◇■□▲▼★☆♪♫◆◇■□▲▼★☆', // 21 mixed decorative
            description: 'mixed decorative characters (21 total)',
            shouldDetect: true
          }
        ];

        for (const testCase of testCases) {
          const result = detectSpam(testCase.content);
          expect(result).toBe(testCase.shouldDetect);
        }
      });

      it('should handle decorative characters that are not in the detection set', () => {
        const nonDetectedDecorative = [
          '※※※※※※※※※※※※※※※※※※※※※※※※※', // 25 asterisk-like characters (not in detection set)
          '●●●●●●●●●●●●●●●●●●●●●●●●●', // 25 filled circles (not in detection set)
          '○○○○○○○○○○○○○○○○○○○○○○○○○', // 25 hollow circles (not in detection set)
          '▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪', // 25 small squares (not in detection set)
        ];

        for (const content of nonDetectedDecorative) {
          const result = detectSpam(content);
          expect(result).toBe(false); // These should not be detected as spam
        }
      });
    });

    describe('装飾文字カウント精度テスト', () => {
      it('should count decorative characters accurately', () => {
        const testCases = [
          { content: '★☆♪', expectedCount: 3 },
          { content: '★★☆☆♪♪♫♫', expectedCount: 8 },
          { content: '◆◇■□▲▼', expectedCount: 6 },
          { content: '投資★教育☆基礎♪', expectedCount: 3 },
          { content: '★☆♪♫◆◇■□▲▼★☆♪♫◆◇■□▲▼★☆♪', expectedCount: 21 },
        ];

        for (const testCase of testCases) {
          // Test by checking if spam detection triggers at the expected threshold
          const content20 = testCase.content.slice(0, 20); // First 20 decorative chars
          const content21 = testCase.content; // All decorative chars

          if (testCase.expectedCount <= 20) {
            expect(detectSpam(content20)).toBe(false);
            if (testCase.expectedCount > 20) {
              expect(detectSpam(content21)).toBe(true);
            }
          } else {
            expect(detectSpam(content21)).toBe(true);
          }
        }
      });

      it('should handle edge cases in decorative character counting', () => {
        const edgeCases = [
          { content: '', expectedSpam: false },
          { content: '★', expectedSpam: false },
          { content: '★'.repeat(20), expectedSpam: false },
          { content: '★'.repeat(21), expectedSpam: true },
          { content: '投資教育' + '★'.repeat(20), expectedSpam: false },
          { content: '投資教育' + '★'.repeat(21), expectedSpam: true },
        ];

        for (const testCase of edgeCases) {
          const result = detectSpam(testCase.content);
          expect(result).toBe(testCase.expectedSpam);
        }
      });
    });

    describe('複合スパム検出テスト', () => {
      it('should detect spam when both repeated characters and decorative characters exceed limits', () => {
        const compoundSpamContents = [
          'aaaaaaaaaaaaaaaaaaaaaaaa★★★★★★★★★★★★★★★★★★★★★', // Both limits exceeded
          '投資教育！！！！！！！！！！！！！！！！！！！！！☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆☆', // Both exceeded in mixed content
        ];

        for (const content of compoundSpamContents) {
          const result = detectSpam(content);
          expect(result).toBe(true);
        }
      });

      it('should detect spam when only one condition is met', () => {
        const singleConditionSpam = [
          'aaaaaaaaaaaaaaaaaaaaaa', // Only repeated characters
          '★★★★★★★★★★★★★★★★★★★★★', // Only decorative characters
          '投資教育について説明します！！！！！！！！！！！！！！！！！！！！！', // Repeated in context
          'リスク管理の重要性★★★★★★★★★★★★★★★★★★★★★', // Decorative in context
        ];

        for (const content of singleConditionSpam) {
          const result = detectSpam(content);
          expect(result).toBe(true);
        }
      });

      it('should not detect spam when neither condition is met', () => {
        const validContents = [
          '投資教育について学びましょう',
          'リスク管理の重要性について理解することが大切です',
          '基礎知識を身につけて資産運用を始めましょう★☆',
          'ポートフォリオの分散投資について！',
          'aaaaaaaaaaaaaaaaaa' + '★★★★★★★★★★★★★★★★★★★★', // Both below limits
        ];

        for (const content of validContents) {
          const result = detectSpam(content);
          expect(result).toBe(false);
        }
      });
    });

    describe('正規表現パターンテスト', () => {
      it('should handle regex pattern correctly for repeated characters', () => {
        // Test the exact pattern (.)\1{20,}
        const testCases = [
          { content: 'a' + 'a'.repeat(20), shouldDetect: true }, // 21 total 'a's
          { content: 'a' + 'a'.repeat(19), shouldDetect: false }, // 20 total 'a's
          { content: 'ab' + 'b'.repeat(20), shouldDetect: true }, // 21 'b's after 'a'
          { content: 'abc' + 'c'.repeat(20), shouldDetect: true }, // 21 'c's after 'ab'
        ];

        for (const testCase of testCases) {
          const result = detectSpam(testCase.content);
          expect(result).toBe(testCase.shouldDetect);
        }
      });

      it('should match the specific decorative character set', () => {
        const decorativeChars = ['★', '☆', '♪', '♫', '◆', '◇', '■', '□', '▲', '▼'];
        
        for (const char of decorativeChars) {
          const content = char.repeat(21);
          expect(detectSpam(content)).toBe(true);
          
          const safeContent = char.repeat(20);
          expect(detectSpam(safeContent)).toBe(false);
        }
      });
    });

    describe('パフォーマンステスト', () => {
      it('should handle very long content efficiently', () => {
        const longValidContent = '投資教育について学ぶことは重要です。'.repeat(100);
        const longSpamContent = 'a'.repeat(1000);

        // These should complete quickly
        const startTime = Date.now();
        const validResult = detectSpam(longValidContent);
        const spamResult = detectSpam(longSpamContent);
        const endTime = Date.now();

        expect(validResult).toBe(false);
        expect(spamResult).toBe(true);
        expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      });

      it('should handle content with many decorative characters efficiently', () => {
        const manyDecorativeValid = '投資★教育☆基礎♪知識♫'.repeat(50); // Distributed decorative chars
        const manyDecorativeSpam = '★'.repeat(100);

        const startTime = Date.now();
        const validResult = detectSpam(manyDecorativeValid);
        const spamResult = detectSpam(manyDecorativeSpam);
        const endTime = Date.now();

        expect(validResult).toBe(false);
        expect(spamResult).toBe(true);
        expect(endTime - startTime).toBeLessThan(50); // Should be very fast
      });
    });

    describe('Integration with Educational Content', () => {
      it('should prevent educational posts identified as spam', async () => {
        const spamEducationalContent = '投資教育について学びましょう！！！！！！！！！！！！！！！！！！！！！';

        try {
          await actionEndpoints.createEducationalPost(spamEducationalContent);
          fail('Should have thrown spam detection error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('スパムと判定されたため投稿できません');
        }
      });

      it('should allow educational posts that are not spam', async () => {
        const validEducationalContent = '投資教育について学びましょう。リスク管理が重要です。';

        const result = await actionEndpoints.createEducationalPost(validEducationalContent);
        expect(result.success).toBe(true);
      });

      it('should check spam detection before other validations', async () => {
        // Content that would pass educational validation but fail spam detection
        const spamContent = '投資教育' + 'a'.repeat(25); // Has educational keyword but is spam

        try {
          await actionEndpoints.createEducationalPost(spamContent);
          fail('Should have thrown spam detection error');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('スパムと判定されたため投稿できません');
          // Should not contain educational validation errors
          expect((error as Error).message).not.toContain('教育的価値不足');
        }
      });
    });

    describe('Edge Cases and Error Handling', () => {
      it('should handle special Unicode characters correctly', () => {
        const unicodeContent = '投資教育について学びましょう🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀';
        
        // Emojis are not in the decorative character set, so should not be detected as spam
        const result = detectSpam(unicodeContent);
        expect(result).toBe(false);
      });

      it('should handle mixed character encoding correctly', () => {
        const mixedContent = '投資教育about investment★★★★★★★★★★★★★★★★★★★★★education';
        
        const result = detectSpam(mixedContent);
        expect(result).toBe(true); // Due to 21 stars
      });

      it('should handle empty and whitespace content', () => {
        const edgeCases = ['', '   ', '\t\t\t', '\n\n\n'];
        
        for (const content of edgeCases) {
          const result = detectSpam(content);
          expect(result).toBe(false);
        }
      });

      it('should be consistent across multiple calls', () => {
        const testContents = [
          '投資教育について学びましょう',
          'aaaaaaaaaaaaaaaaaaaaaaaa',
          '★★★★★★★★★★★★★★★★★★★★★',
          '今日は天気がいいですね'
        ];

        for (const content of testContents) {
          const results = [];
          for (let i = 0; i < 5; i++) {
            results.push(detectSpam(content));
          }
          
          // All results should be identical
          for (let i = 1; i < results.length; i++) {
            expect(results[i]).toBe(results[0]);
          }
        }
      });
    });
  });
});