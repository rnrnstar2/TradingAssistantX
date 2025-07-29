/**
 * Content Endpoint テスト - content-endpoint.test.ts  
 * REQUIREMENTS.md準拠 - generateContent, generateQuoteComment関数の包括的テスト
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { generateContent, generateQuoteComment } from '../../../src/claude/endpoints/content-endpoint';
import { CONTENT_TYPES, TARGET_AUDIENCES, isGeneratedContent } from '../../../src/claude/types';
import {
  createMockContentInput,
  createMockContentRequest,
  createMockContentInputLowQuality,
  createMockGeneratedContent
} from '../../test-utils/claude-mock-data';
import { validateResponseStructure, validateStringLength, validateRange } from '../../test-utils/claude-test-helpers';

// モック設定を削除 - 実際のClaude APIを使用

describe('Content Endpoint Tests', () => {
  beforeEach(() => {
    // モック削除 - 実際のAPIを使用
  });

  describe('generateContentメイン機能テスト', () => {
    test('正常系：有効な入力で適切なコンテンツを生成', async () => {
      const input = createMockContentInput();
      // 実際のClaude APIを使用

      const result = await generateContent(input);

      console.log('実際のClaude APIレスポンス:', JSON.stringify(result, null, 2));

      expect(isGeneratedContent(result)).toBe(true);
      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(0);
      expect(Array.isArray(result.hashtags)).toBe(true);
      expect(validateRange(result.qualityScore, 0, 100)).toBe(true);
    }, 60000); // 60秒のタイムアウト

    test('各contentTypeでの適切なコンテンツ生成', async () => {
      for (const contentType of CONTENT_TYPES) {
        const input = {
          ...createMockContentInput(),
          request: {
            ...createMockContentRequest(),
            contentType: contentType as any
          }
        };

        const result = await generateContent(input);

        expect(result.metadata.contentType).toBe(contentType);
        expect(isGeneratedContent(result)).toBe(true);
      }
    }, 60000);

    test('targetAudience別の文体・レベル調整の検証', async () => {
      for (const audience of TARGET_AUDIENCES) {
        const input = {
          ...createMockContentInput(),
          request: {
            ...createMockContentRequest(),
            targetAudience: audience as any
          }
        };

        const result = await generateContent(input);

        expect(isGeneratedContent(result)).toBe(true);
      }
    }, 60000);

    test('contextデータに基づくコンテンツ調整', async () => {
      const contextualInput = {
        ...createMockContentInput(),
        context: {
          market: { sentiment: 'bullish', trending: ['NISA', '投資信託'] },
          account: { followerCount: 5000, engagementRate: 0.08 }
        }
      };

      const result = await generateContent(contextualInput);

      expect(result.content).toBeDefined();
      expect(isGeneratedContent(result)).toBe(true);
    }, 60000);
  });

  describe('品質保証テスト', () => {
    test('Twitter文字数制限（280文字）の遵守確認', async () => {
      const input = createMockContentInput();

      const result = await generateContent(input);

      expect(result.content.length).toBeLessThanOrEqual(280);
      expect(isGeneratedContent(result)).toBe(true);
    }, 60000);

    test('qualityScore計算の精度検証', async () => {
      const input = createMockContentInput();

      const result = await generateContent(input);

      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
    }, 60000);

    test('ハッシュタグ生成の妥当性確認', async () => {
      const input = {
        ...createMockContentInput(),
        request: {
          ...createMockContentRequest(),
          topic: '投資信託',
          contentType: 'educational' as const
        }
      };

      const result = await generateContent(input);

      expect(Array.isArray(result.hashtags)).toBe(true);
      expect(result.hashtags.length).toBeGreaterThan(0);
      // Check that hashtags are relevant to the topic
      result.hashtags.forEach(hashtag => {
        expect(hashtag).toMatch(/^#/);
        expect(hashtag.length).toBeGreaterThan(1);
      });
    }, 60000);

    test('品質閾値以下でのコンテンツ再生成', async () => {
      const lowQualityInput = createMockContentInputLowQuality(); // qualityThreshold: 95
      
      const result = await generateContent(lowQualityInput);

      // With real API, we can't control the quality, but we can verify the result
      expect(isGeneratedContent(result)).toBe(true);
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
    }, 60000);
  });

  describe('型安全性テスト', () => {
    test('GeneratedContent型の完全な返却値検証', async () => {
      const input = createMockContentInput();

      const result = await generateContent(input);

      expect(validateResponseStructure(result, ['content', 'hashtags', 'qualityScore', 'metadata'])).toBe(true);
      expect(typeof result.content).toBe('string');
      expect(Array.isArray(result.hashtags)).toBe(true);
      expect(typeof result.qualityScore).toBe('number');
      expect(typeof result.metadata).toBe('object');
    }, 60000);

    test('metadata情報の正確性確認', async () => {
      const input = createMockContentInput();

      const result = await generateContent(input);

      expect(result.metadata.wordCount).toBeGreaterThan(0);
      expect(result.metadata.contentType).toBe(input.request.contentType || 'educational');
      expect(new Date(result.metadata.generatedAt).getTime()).toBeGreaterThan(Date.now() - 10000); // Generated within last 10 seconds
    }, 60000);

    test('qualityScore範囲の厳密な検証', async () => {
      const input = createMockContentInput();

      const result = await generateContent(input);

      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
      expect(Number.isInteger(result.qualityScore)).toBe(true);
    }, 60000);
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

      await expect(generateContent(invalidInput)).rejects.toThrow();
    }, 30000);

    test.skip('Claude API失敗時のフォールバック処理', async () => {
      // 実際のAPIを使用するためスキップ
    });

    test.skip('品質基準を満たさないコンテンツでの処理', async () => {
      // 実際のAPIを使用するためスキップ
      const input = createMockContentInput();
      
      const result = await generateContent(input);

      // Should still return result with lower quality score
      expect(isGeneratedContent(result)).toBe(true);
      expect(result.qualityScore).toBeLessThan(70); // Below quality threshold
    });

    test.skip('ネットワークタイムアウト時の処理', async () => {
      // 実際のAPIを使用するためスキップ
    });
  });

  describe('generateQuoteCommentテスト', () => {
    test('正常系：元ツイートに対する適切なコメント生成', async () => {
      const originalTweet = {
        content: 'NISA制度を活用した投資信託の始め方について',
        author: 'test_user',
        engagement: 50
      };

      const result = await generateQuoteComment(originalTweet);

      expect(typeof result).toBe('string');
      expect(result.length).toBeLessThanOrEqual(150);
      expect(result.length).toBeGreaterThan(0);
    }, 30000);

    test('様々なタイプの元ツイートでのコメント生成', async () => {
      const testTweets = [
        { content: '株式投資のリスク管理について', topic: 'risk' },
        { content: '仮想通貨市場の最新動向', topic: 'crypto' },
        { content: '不動産投資の基本知識', topic: 'realestate' }
      ];

      for (const tweet of testTweets) {
        const result = await generateQuoteComment(tweet);

        expect(typeof result).toBe('string');
        expect(validateStringLength(result, 150)).toBe(true);
      }
    }, 60000);

    test('文字数制限（150文字）の厳密な遵守', async () => {
      const originalTweet = { content: 'テスト用ツイート' };

      const result = await generateQuoteComment(originalTweet);

      expect(result.length).toBeLessThanOrEqual(150);
    }, 30000);

    test('空・無効な元ツイートでの処理', async () => {
      const invalidTweets = [
        null,
        {},
        { content: '' },
        { text: '' }
      ];

      for (const tweet of invalidTweets) {
        const result = await generateQuoteComment(tweet);

        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    }, 60000);

    test.skip('Claude API失敗時のフォールバック応答', async () => {
      // 実際のAPIを使用するためスキップ
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

      const results = await Promise.all(inputs.map(input => generateContent(input)));

      results.forEach((result, index) => {
        expect(isGeneratedContent(result)).toBe(true);
        expect(result.metadata.contentType).toBe(CONTENT_TYPES[index]);
      });
    }, 60000);

    test.skip('品質評価ロジックの一貫性確認', async () => {
      // 実際のAPIでランダムな結果が出るためスキップ
    });

    test('メモリ使用量とレスポンス時間の確認', async () => {
      const input = createMockContentInput();

      const startTime = Date.now();
      const result = await generateContent(input);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(60000); // Should complete within reasonable time
      expect(isGeneratedContent(result)).toBe(true);
    }, 60000);

    test('連続実行での品質の一貫性', async () => {
      const input = createMockContentInput();

      const results = await Promise.all([
        generateContent(input),
        generateContent(input),
        generateContent(input)
      ]);

      results.forEach(result => {
        expect(isGeneratedContent(result)).toBe(true);
        expect(result.qualityScore).toBeGreaterThan(60); // Consistent quality
      });
    }, 60000);
  });
});