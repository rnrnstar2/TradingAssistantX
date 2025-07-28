/**
 * Content Endpoint テスト - content-endpoint.test.ts  
 * REQUIREMENTS.md準拠 - generateContent, generateQuoteComment関数の包括的テスト
 */

import { vi } from 'vitest';
import { generateContent, generateQuoteComment } from '../../../src/claude/endpoints/content-endpoint';
import { CONTENT_TYPES, TARGET_AUDIENCES, isGeneratedContent } from '../../../src/claude/types';
import {
  createMockContentInput,
  createMockContentRequest,
  createMockContentInputLowQuality,
  createMockGeneratedContent
} from '../../test-utils/mock-data';
import {
  setupClaudeMock,
  setupClaudeMockWithResponse,
  setupClaudeMockError,
  resetClaudeMock,
  mockClaude
} from '../../test-utils/claude-mock';
import { validateResponseStructure, validateStringLength, validateRange } from '../../test-utils/test-helpers';

// Claude SDK モック設定
vi.mock('@instantlyeasy/claude-code-sdk-ts', () => ({
  claude: () => mockClaude
}));

describe('Content Endpoint Tests', () => {
  beforeEach(() => {
    resetClaudeMock();
  });

  describe('generateContentメイン機能テスト', () => {
    test('正常系：有効な入力で適切なコンテンツを生成', async () => {
      const input = createMockContentInput();
      setupClaudeMock('content');

      const result = await generateContent(input);

      expect(isGeneratedContent(result)).toBe(true);
      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(0);
      expect(Array.isArray(result.hashtags)).toBe(true);
      expect(validateRange(result.qualityScore, 0, 100)).toBe(true);
    });

    test('各contentTypeでの適切なコンテンツ生成', async () => {
      for (const contentType of CONTENT_TYPES) {
        const input = {
          ...createMockContentInput(),
          request: {
            ...createMockContentRequest(),
            contentType: contentType as any
          }
        };

        const mockContent = `${contentType}に関する高品質な投資教育コンテンツをClaude SDKが生成しました。`;
        setupClaudeMockWithResponse(mockContent);

        const result = await generateContent(input);

        expect(result.content).toContain(contentType);
        expect(result.metadata.contentType).toBe(contentType);
        expect(isGeneratedContent(result)).toBe(true);

        resetClaudeMock();
      }
    });

    test('targetAudience別の文体・レベル調整の検証', async () => {
      for (const audience of TARGET_AUDIENCES) {
        const input = {
          ...createMockContentInput(),
          request: {
            ...createMockContentRequest(),
            targetAudience: audience as any
          }
        };

        const mockContent = `${audience}向けの投資教育コンテンツ。${audience === 'beginner' ? '基本的な' : audience === 'advanced' ? '高度な' : '中級レベルの'}内容を含みます。`;
        setupClaudeMockWithResponse(mockContent);

        const result = await generateContent(input);

        expect(result.content).toContain(audience === 'beginner' ? '基本' : audience === 'advanced' ? '高度' : '中級');
        expect(isGeneratedContent(result)).toBe(true);

        resetClaudeMock();
      }
    });

    test('contextデータに基づくコンテンツ調整', async () => {
      const contextualInput = {
        ...createMockContentInput(),
        context: {
          market: { sentiment: 'bullish', trending: ['NISA', '投資信託'] },
          account: { followerCount: 5000, engagementRate: 0.08 }
        }
      };

      const mockContent = '市場がポジティブな今、NISA活用による投資信託の始め方を解説します。';
      setupClaudeMockWithResponse(mockContent);

      const result = await generateContent(contextualInput);

      expect(result.content).toBeDefined();
      expect(isGeneratedContent(result)).toBe(true);
    });
  });

  describe('品質保証テスト', () => {
    test('Twitter文字数制限（280文字）の遵守確認', async () => {
      const input = createMockContentInput();
      
      // 長いコンテンツをモック
      const longContent = 'これは非常に長いコンテンツです。'.repeat(20); // 280文字を超える
      setupClaudeMockWithResponse(longContent);

      const result = await generateContent(input);

      expect(result.content.length).toBeLessThanOrEqual(280);
      expect(isGeneratedContent(result)).toBe(true);
    });

    test('qualityScore計算の精度検証', async () => {
      const input = createMockContentInput();
      const testContents = [
        {
          content: '投資',
          expectedScoreRange: [60, 80] // Short content, basic quality
        },
        {
          content: '投資信託は投資初心者にとって基本的な資産運用手法です。分散投資によりリスクを軽減できる注意点があります。',
          expectedScoreRange: [80, 100] // Good length, educational content
        }
      ];

      for (const testCase of testContents) {
        setupClaudeMockWithResponse(testCase.content);
        const result = await generateContent(input);

        expect(result.qualityScore).toBeGreaterThanOrEqual(testCase.expectedScoreRange[0]);
        expect(result.qualityScore).toBeLessThanOrEqual(testCase.expectedScoreRange[1]);

        resetClaudeMock();
      }
    });

    test('ハッシュタグ生成の妥当性確認', async () => {
      const input = {
        ...createMockContentInput(),
        request: {
          ...createMockContentRequest(),
          topic: '投資信託',
          contentType: 'educational' as const
        }
      };

      setupClaudeMock('content');
      const result = await generateContent(input);

      expect(Array.isArray(result.hashtags)).toBe(true);
      expect(result.hashtags.length).toBeGreaterThan(0);
      expect(result.hashtags).toContain('#投資教育');
      expect(result.hashtags).toContain('#資産運用');
      
      // educational content should have specific hashtag
      expect(result.hashtags).toContain('#投資初心者');
    });

    test('品質閾値以下でのコンテンツ再生成', async () => {
      const lowQualityInput = createMockContentInputLowQuality(); // qualityThreshold: 95
      
      let callCount = 0;
      mockClaude.asText.mockImplementation(() => {
        callCount++;
        // First call returns low quality, second call returns high quality
        return Promise.resolve(callCount === 1 ? 
          '投資' : // Low quality content
          '投資信託は分散投資による資産運用の基本的手法です。初心者にもおすすめの投資方法として多くの専門家が推奨しています。'
        );
      });

      const result = await generateContent(lowQualityInput);

      expect(callCount).toBeGreaterThan(1); // Should have been called multiple times
      expect(result.qualityScore).toBeGreaterThanOrEqual(lowQualityInput.qualityThreshold!);
    });
  });

  describe('型安全性テスト', () => {
    test('GeneratedContent型の完全な返却値検証', async () => {
      const input = createMockContentInput();
      setupClaudeMock('content');

      const result = await generateContent(input);

      expect(validateResponseStructure(result, ['content', 'hashtags', 'qualityScore', 'metadata'])).toBe(true);
      expect(typeof result.content).toBe('string');
      expect(Array.isArray(result.hashtags)).toBe(true);
      expect(typeof result.qualityScore).toBe('number');
      expect(typeof result.metadata).toBe('object');
    });

    test('metadata情報の正確性確認', async () => {
      const input = createMockContentInput();
      const testContent = '投資信託について説明するテスト用コンテンツです。';
      setupClaudeMockWithResponse(testContent);

      const result = await generateContent(input);

      expect(result.metadata.wordCount).toBe(testContent.length);
      expect(result.metadata.contentType).toBe(input.request.contentType || 'educational');
      expect(new Date(result.metadata.generatedAt).getTime()).toBeGreaterThan(Date.now() - 10000); // Generated within last 10 seconds
    });

    test('qualityScore範囲の厳密な検証', async () => {
      const input = createMockContentInput();
      setupClaudeMock('content');

      const result = await generateContent(input);

      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.qualityScore)).toBe(true);
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('不適切な入力での適切なエラー処理', async () => {
      const invalidInput = {
        request: {
          topic: '', // Empty topic
          contentType: 'invalid_type' as any,
          targetAudience: 'invalid_audience' as any
        }
      } as any;

      setupClaudeMock('content');

      await expect(generateContent(invalidInput)).rejects.toThrow();
    });

    test('Claude API失敗時のフォールバック処理', async () => {
      const input = createMockContentInput();
      setupClaudeMockError(new Error('Claude API failed'));

      await expect(generateContent(input)).rejects.toThrow('Claude API failed');
    });

    test('品質基準を満たさないコンテンツでの処理', async () => {
      const input = createMockContentInput();
      
      // Always return low quality content
      mockClaude.asText.mockResolvedValue('低品質');

      const result = await generateContent(input);

      // Should still return result with lower quality score
      expect(isGeneratedContent(result)).toBe(true);
      expect(result.qualityScore).toBeLessThan(70); // Below quality threshold
    });

    test('ネットワークタイムアウト時の処理', async () => {
      const input = createMockContentInput();
      setupClaudeMockError(new Error('Request timeout'));

      await expect(generateContent(input)).rejects.toThrow('Request timeout');
    });
  });

  describe('generateQuoteCommentテスト', () => {
    test('正常系：元ツイートに対する適切なコメント生成', async () => {
      const originalTweet = {
        content: 'NISA制度を活用した投資信託の始め方について',
        author: 'test_user',
        engagement: 50
      };

      const mockComment = '投資初心者の方には、まずNISAの仕組みを理解することが重要ですね。';
      setupClaudeMockWithResponse(mockComment);

      const result = await generateQuoteComment(originalTweet);

      expect(typeof result).toBe('string');
      expect(result.length).toBeLessThanOrEqual(150);
      expect(result.length).toBeGreaterThan(0);
    });

    test('様々なタイプの元ツイートでのコメント生成', async () => {
      const testTweets = [
        { content: '株式投資のリスク管理について', topic: 'risk' },
        { content: '仮想通貨市場の最新動向', topic: 'crypto' },
        { content: '不動産投資の基本知識', topic: 'realestate' }
      ];

      for (const tweet of testTweets) {
        const mockComment = `${tweet.topic}に関する教育的な観点からのコメントです。`;
        setupClaudeMockWithResponse(mockComment);

        const result = await generateQuoteComment(tweet);

        expect(typeof result).toBe('string');
        expect(validateStringLength(result, 150)).toBe(true);

        resetClaudeMock();
      }
    });

    test('文字数制限（150文字）の厳密な遵守', async () => {
      const originalTweet = { content: 'テスト用ツイート' };
      
      // 長いコメントをモック
      const longComment = '非常に長いコメントです。'.repeat(20); // 150文字を超える
      setupClaudeMockWithResponse(longComment);

      const result = await generateQuoteComment(originalTweet);

      expect(result.length).toBeLessThanOrEqual(150);
    });

    test('空・無効な元ツイートでの処理', async () => {
      const invalidTweets = [
        null,
        {},
        { content: '' },
        { text: '' }
      ];

      for (const tweet of invalidTweets) {
        setupClaudeMock('content');
        const result = await generateQuoteComment(tweet);

        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);

        resetClaudeMock();
      }
    });

    test('Claude API失敗時のフォールバック応答', async () => {
      const originalTweet = { content: 'テスト用ツイート' };
      setupClaudeMockError(new Error('API Error'));

      const result = await generateQuoteComment(originalTweet);

      expect(result).toBe('参考になる情報ですね。投資は自己責任で行うことが大切です。');
    });
  });

  describe('パフォーマンス・統合テスト', () => {
    test('複数contentTypeでの同時生成テスト', async () => {
      const inputs = CONTENT_TYPES.map(contentType => ({
        ...createMockContentInput(),
        request: {
          ...createMockContentRequest(),
          contentType: contentType as any
        }
      }));

      // Set up different mock responses for each content type
      let callCount = 0;
      mockClaude.asText.mockImplementation(() => {
        const contentType = CONTENT_TYPES[callCount % CONTENT_TYPES.length];
        callCount++;
        return Promise.resolve(`${contentType}に関する高品質なコンテンツです。`);
      });

      const results = await Promise.all(inputs.map(input => generateContent(input)));

      results.forEach((result, index) => {
        expect(isGeneratedContent(result)).toBe(true);
        expect(result.metadata.contentType).toBe(CONTENT_TYPES[index]);
      });
    });

    test('品質評価ロジックの一貫性確認', async () => {
      const input = createMockContentInput();
      
      const testContents = [
        '短い', // Low quality
        '投資信託は分散投資による資産運用手法です。', // Medium quality  
        '投資信託は投資初心者にとって基本的な資産運用手法です。分散投資によりリスクを軽減できる重要な注意点があります。' // High quality
      ];

      const results = [];
      for (const content of testContents) {
        setupClaudeMockWithResponse(content);
        const result = await generateContent(input);
        results.push(result.qualityScore);
        resetClaudeMock();
      }

      // Quality scores should generally increase with content quality
      expect(results[0]).toBeLessThan(results[1]);
      expect(results[1]).toBeLessThan(results[2]);
    });

    test('メモリ使用量とレスポンス時間の確認', async () => {
      const input = createMockContentInput();
      setupClaudeMock('content');

      const startTime = Date.now();
      const result = await generateContent(input);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(20000); // Should complete within reasonable time
      expect(isGeneratedContent(result)).toBe(true);
    });

    test('連続実行での品質の一貫性', async () => {
      const input = createMockContentInput();
      setupClaudeMock('content');

      const results = await Promise.all([
        generateContent(input),
        generateContent(input),
        generateContent(input)
      ]);

      results.forEach(result => {
        expect(isGeneratedContent(result)).toBe(true);
        expect(result.qualityScore).toBeGreaterThan(60); // Consistent quality
      });
    });
  });
});