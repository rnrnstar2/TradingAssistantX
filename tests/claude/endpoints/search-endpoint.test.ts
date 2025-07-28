/**
 * Search Endpoint テスト - search-endpoint.test.ts
 * REQUIREMENTS.md準拠 - 検索エンドポイント関数の包括的テスト
 */

import { vi } from 'vitest';
import {
  generateSearchQuery,
  generateRetweetQuery,
  generateLikeQuery,
  generateQuoteQuery
} from '../../../src/claude/endpoints/search-endpoint';
import { SEARCH_PURPOSES, isSearchQuery } from '../../../src/claude/types';
import {
  createMockSearchInput,
  createMockRetweetSearchInput,
  createMockLikeSearchInput,
  createMockQuoteSearchInput,
  createMockBasicMarketContext
} from '../../test-utils/mock-data';
import {
  setupClaudeMock,
  setupClaudeMockWithResponse,
  setupClaudeMockError,
  resetClaudeMock,
  mockClaude
} from '../../test-utils/claude-mock';
import { validateResponseStructure, validateRange } from '../../test-utils/test-helpers';

// Claude SDK モック設定
vi.mock('@instantlyeasy/claude-code-sdk-ts', () => ({
  claude: () => mockClaude
}));

describe('Search Endpoint Tests', () => {
  beforeEach(() => {
    resetClaudeMock();
  });

  describe('generateSearchQueryメイン機能テスト', () => {
    test('正常系：各purposeでの適切なクエリ生成', async () => {
      for (const purpose of SEARCH_PURPOSES) {
        const input = createMockSearchInput(purpose);
        setupClaudeMock('search');

        const result = await generateSearchQuery(input);

        expect(isSearchQuery(result)).toBe(true);
        expect(result.metadata.purpose).toBe(purpose);
        expect(typeof result.query).toBe('string');
        expect(result.query.length).toBeGreaterThan(0);
        expect(validateRange(result.priority, 0, 1)).toBe(true);

        resetClaudeMock();
      }
    });

    test('topic別のクエリ最適化確認', async () => {
      const topics = ['投資信託', 'NISA', '株式投資', 'iDeCo'];

      for (const topic of topics) {
        const input = { ...createMockSearchInput(), topic };
        setupClaudeMock('search');

        const result = await generateSearchQuery(input);

        expect(result.query).toContain(topic);
        expect(isSearchQuery(result)).toBe(true);

        resetClaudeMock();
      }
    });

    test('constraints設定の反映確認', async () => {
      const input = {
        ...createMockSearchInput(),
        constraints: {
          maxResults: 50,
          minEngagement: 25,
          timeframe: '12h'
        }
      };

      setupClaudeMock('search');
      const result = await generateSearchQuery(input);

      expect(result.expectedResults).toBeLessThanOrEqual(50);
      expect(result.filters.minEngagement).toBeGreaterThanOrEqual(25);
      expect(result.filters.maxAge).toBe('12h');
    });

    test('フォールバック機能の動作確認', async () => {
      const input = createMockSearchInput('retweet');
      setupClaudeMockError(new Error('Claude API failed'));

      const result = await generateSearchQuery(input);

      expect(isSearchQuery(result)).toBe(true);
      expect(result.query).toContain(input.topic);
      expect(result.query).toContain('-spam');
      expect(result.metadata.purpose).toBe(input.purpose);
    });
  });

  describe('generateRetweetQueryテスト', () => {
    test('正常系：リツイート特化クエリ生成', async () => {
      const input = createMockRetweetSearchInput();
      setupClaudeMock('search');

      const result = await generateRetweetQuery(input);

      expect(isSearchQuery(result)).toBe(true);
      expect(result.metadata.purpose).toBe('retweet');
      expect(result.filters.language).toBe('ja');
      expect(result.filters.minEngagement).toBeGreaterThanOrEqual(10);
      expect(result.filters.verified).toBe(false);
    });

    test('targetAudience別の最適化', async () => {
      const audiences = ['beginner', 'intermediate', 'advanced'] as const;

      for (const audience of audiences) {
        const input = { ...createMockRetweetSearchInput(), targetAudience: audience };
        setupClaudeMock('search');

        const result = await generateRetweetQuery(input);

        expect(isSearchQuery(result)).toBe(true);
        // Query should be optimized for the target audience
        expect(result.query).toBeDefined();

        resetClaudeMock();
      }
    });

    test('marketContext影響の確認', async () => {
      const bullishContext = {
        ...createMockBasicMarketContext(),
        sentiment: 'bullish' as const,
        volatility: 'low' as const
      };

      const input = { ...createMockRetweetSearchInput(), marketContext: bullishContext };
      setupClaudeMock('search');

      const result = await generateRetweetQuery(input);

      expect(isSearchQuery(result)).toBe(true);
      expect(result.priority).toBeGreaterThan(0.5); // Should have decent priority
    });

    test('品質フィルター適用確認', async () => {
      const input = {
        ...createMockRetweetSearchInput(),
        constraints: {
          ...createMockRetweetSearchInput().constraints,
          qualityThreshold: 90
        }
      };

      setupClaudeMock('search');
      const result = await generateRetweetQuery(input);

      expect(result.priority).toBeGreaterThan(0.7); // Higher priority for quality content
      expect(result.filters.exclude_keywords?.includes('spam')).toBe(true);
    });
  });

  describe('generateLikeQueryテスト', () => {
    test('正常系：いいね特化クエリ生成', async () => {
      const input = createMockLikeSearchInput();
      setupClaudeMock('search');

      const result = await generateLikeQuery(input);

      expect(isSearchQuery(result)).toBe(true);
      expect(result.metadata.purpose).toBe('like');
      expect(result.filters.minEngagement).toBeGreaterThanOrEqual(5);
      expect(result.filters.maxAge).toBe('12h');
      expect(result.expectedResults).toBe(30);
    });

    test('sentimentFilter設定の反映', async () => {
      const input = {
        ...createMockLikeSearchInput(),
        constraints: {
          ...createMockLikeSearchInput().constraints,
          sentimentFilter: 'positive' as const
        }
      };

      setupClaudeMock('search');  
      const result = await generateLikeQuery(input);

      expect(result.filters.sentiment).toBe('positive');
      expect(result.priority).toBeGreaterThan(0.4); // Sentiment boost
    });

    test('エンゲージメント最小値の調整', async () => {
      const input = {
        ...createMockLikeSearchInput(),
        constraints: {
          ...createMockLikeSearchInput().constraints,
          minEngagement: 2
        }
      };

      setupClaudeMock('search');
      const result = await generateLikeQuery(input);

      // Should use the higher of Claude's recommendation or constraint
      expect(result.filters.minEngagement).toBeGreaterThanOrEqual(5);
    });

    test('フォールバック時の適切なデフォルト値', async () => {
      const input = createMockLikeSearchInput();
      setupClaudeMockError(new Error('API Error'));

      const result = await generateLikeQuery(input);

      expect(result.query).toContain(input.topic);
      expect(result.query).toContain('初心者');
      expect(result.query).toContain('体験');
      expect(result.filters.minEngagement).toBe(5);
      expect(result.filters.maxAge).toBe('12h');
    });
  });

  describe('generateQuoteQueryテスト', () => {
    test('正常系：引用ツイート特化クエリ生成', async () => {
      const input = createMockQuoteSearchInput();
      setupClaudeMock('search');

      const result = await generateQuoteQuery(input);

      expect(isSearchQuery(result)).toBe(true);
      expect(result.metadata.purpose).toBe('engagement');
      expect(result.filters.minEngagement).toBeGreaterThanOrEqual(15);
      expect(result.filters.maxAge).toBe('24h');
      expect(result.expectedResults).toBe(15);
    });

    test('valueAddPotential設定の反映', async () => {
      const input = {
        ...createMockQuoteSearchInput(),
        constraints: {
          ...createMockQuoteSearchInput().constraints,
          valueAddPotential: 'high' as const
        }
      };

      setupClaudeMock('search');
      const result = await generateQuoteQuery(input);

      expect(result.priority).toBeGreaterThan(0.8); // High value-add boost
      expect(result.filters.has_discussion_potential).toBe(true);
    });

    test('議論促進要素の確認', async () => {
      const input = createMockQuoteSearchInput();
      setupClaudeMock('search');

      const result = await generateQuoteQuery(input);

      expect(result.filters.exclude_keywords?.includes('FUD')).toBe(true);
      expect(result.filters.has_discussion_potential).toBe(true);
    });

    test('フォールバック時の引用特化設定', async () => {
      const input = createMockQuoteSearchInput();
      setupClaudeMockError(new Error('Claude failed'));

      const result = await generateQuoteQuery(input);

      expect(result.query).toContain('議論');
      expect(result.query).toContain('質問');
      expect(result.filters.minEngagement).toBe(15);
      expect(result.priority).toBe(0.7);
    });
  });

  describe('フィルター条件テスト', () => {
    test('minEngagement設定の反映確認', async () => {
      const testCases = [
        { purpose: 'retweet', expectedMin: 10 },
        { purpose: 'like', expectedMin: 5 },
        { purpose: 'engagement', expectedMin: 15 }
      ] as const;

      for (const testCase of testCases) {
        const input = createMockSearchInput(testCase.purpose);
        setupClaudeMock('search');

        const result = await generateSearchQuery(input);

        expect(result.filters.minEngagement).toBeGreaterThanOrEqual(testCase.expectedMin);

        resetClaudeMock();
      }
    });

    test('language設定の適用検証', async () => {
      const input = createMockSearchInput();
      setupClaudeMock('search');

      const result = await generateSearchQuery(input);

      expect(result.filters.language).toBe('ja');
    });

    test('verified設定の動作確認', async () => {
      const retweetInput = createMockRetweetSearchInput();
      setupClaudeMock('search');

      const result = await generateRetweetQuery(retweetInput);

      expect(result.filters.verified).toBe(false); // Allow non-verified for retweets
    });

    test('timeframe制約の適用', async () => {
      const input = {
        ...createMockSearchInput(),
        constraints: { timeframe: '6h' }
      };

      setupClaudeMock('search');
      const result = await generateSearchQuery(input);

      expect(result.filters.maxAge).toBe('6h');
    });
  });

  describe('型安全性テスト', () => {
    test('SearchQuery型の完全な返却値検証', async () => {
      const input = createMockSearchInput();
      setupClaudeMock('search');

      const result = await generateSearchQuery(input);

      expect(validateResponseStructure(result, ['query', 'filters', 'priority', 'expectedResults', 'metadata'])).toBe(true);
      expect(typeof result.query).toBe('string');
      expect(typeof result.filters).toBe('object');
      expect(typeof result.priority).toBe('number');
      expect(typeof result.expectedResults).toBe('number');
      expect(typeof result.metadata).toBe('object');
    });

    test('filtersオブジェクトの構造確認', async () => {
      const input = createMockRetweetSearchInput();
      setupClaudeMock('search');

      const result = await generateRetweetQuery(input);

      expect(result.filters).toHaveProperty('language');
      expect(result.filters).toHaveProperty('minEngagement');
      expect(result.filters).toHaveProperty('maxAge');
      expect(typeof result.filters.language).toBe('string');
      expect(typeof result.filters.minEngagement).toBe('number');
    });

    test('metadata構造の正確性', async () => {
      const input = createMockLikeSearchInput();
      setupClaudeMock('search');

      const result = await generateLikeQuery(input);

      expect(result.metadata).toHaveProperty('purpose');
      expect(result.metadata).toHaveProperty('generatedAt');
      expect(SEARCH_PURPOSES.includes(result.metadata.purpose)).toBe(true);
      expect(new Date(result.metadata.generatedAt).getTime()).toBeGreaterThan(Date.now() - 10000);
    });

    test('priority値の範囲検証', async () => {
      const inputs = [
        createMockSearchInput('retweet'),
        createMockRetweetSearchInput(),
        createMockLikeSearchInput(),
        createMockQuoteSearchInput()
      ];

      for (const input of inputs) {
        setupClaudeMock('search');
        const result = typeof input.purpose !== 'undefined' ? 
          await generateSearchQuery(input as any) :
          input.constraints?.valueAddPotential ?
            await generateQuoteQuery(input as any) :
          input.constraints?.sentimentFilter ?
            await generateLikeQuery(input as any) :
            await generateRetweetQuery(input as any);

        expect(validateRange(result.priority, 0, 1)).toBe(true);

        resetClaudeMock();
      }
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('不適切なpurpose指定時のエラー処理', async () => {
      const invalidInput = {
        purpose: 'invalid_purpose' as any,
        topic: '投資教育',
        constraints: {}
      };

      setupClaudeMock('search');
      const result = await generateSearchQuery(invalidInput);

      // Should still work and use fallback
      expect(isSearchQuery(result)).toBe(true);
      expect(result.query).toContain(invalidInput.topic);
    });

    test('Claude API失敗時のフォールバック処理', async () => {
      const testCases = [
        { fn: generateSearchQuery, input: createMockSearchInput() },
        { fn: generateRetweetQuery, input: createMockRetweetSearchInput() },
        { fn: generateLikeQuery, input: createMockLikeSearchInput() },
        { fn: generateQuoteQuery, input: createMockQuoteSearchInput() }
      ];

      for (const testCase of testCases) {
        setupClaudeMockError(new Error('API failure'));
        const result = await testCase.fn(testCase.input as any);

        expect(isSearchQuery(result)).toBe(true);
        expect(result.query).toContain(testCase.input.topic);
        expect(result.query).toContain('-spam');

        resetClaudeMock();
      }
    });

    test('不正なClaude応答での処理', async () => {
      const input = createMockSearchInput();
      setupClaudeMockWithResponse('Invalid response format');

      const result = await generateSearchQuery(input);

      expect(isSearchQuery(result)).toBe(true);
      expect(result.query).toContain(input.topic);
    });

    test('部分的に不正な応答の処理', async () => {
      const input = createMockRetweetSearchInput();
      const partialResponse = JSON.stringify({
        query: '投資 教育',
        // Missing other fields
      });

      setupClaudeMockWithResponse(partialResponse);
      const result = await generateRetweetQuery(input);

      expect(isSearchQuery(result)).toBe(true);
      expect(result.priority).toBeGreaterThan(0);
      expect(result.expectedResults).toBeGreaterThan(0);
    });
  });

  describe('パフォーマンス・統合テスト', () => {
    test('複数目的での同時クエリ生成', async () => {
      const inputs = SEARCH_PURPOSES.map(purpose => createMockSearchInput(purpose));
      setupClaudeMock('search');

      const results = await Promise.all(inputs.map(input => generateSearchQuery(input)));

      results.forEach((result, index) => {
        expect(isSearchQuery(result)).toBe(true);
        expect(result.metadata.purpose).toBe(SEARCH_PURPOSES[index]);
      });
    });

    test('大量クエリ生成でのパフォーマンス', async () => {
      const inputs = Array.from({ length: 10 }, () => createMockRetweetSearchInput());
      setupClaudeMock('search');

      const startTime = Date.now();
      const results = await Promise.all(inputs.map(input => generateRetweetQuery(input)));
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(30000); // Should complete within reasonable time
      results.forEach(result => {
        expect(isSearchQuery(result)).toBe(true);
      });
    });

    test('異なる条件での一貫性確認', async () => {
      const variations = [
        { ...createMockSearchInput(), topic: '投資信託' },
        { ...createMockSearchInput(), topic: 'NISA' },
        { ...createMockSearchInput(), topic: '株式投資' }
      ];

      setupClaudeMock('search');

      const results = await Promise.all(variations.map(input => generateSearchQuery(input)));

      results.forEach(result => {
        expect(isSearchQuery(result)).toBe(true);
        expect(result.filters.language).toBe('ja');
        expect(result.priority).toBeGreaterThan(0);
      });
    });

    test('メモリ使用とレスポンス時間の確認', async () => {
      const input = createMockQuoteSearchInput();
      setupClaudeMock('search');

      const startTime = Date.now();
      const result = await generateQuoteQuery(input);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(20000);
      expect(isSearchQuery(result)).toBe(true);
    });

    test('フォールバック性能の確認', async () => {
      const input = createMockLikeSearchInput();
      setupClaudeMockError(new Error('Timeout'));

      const startTime = Date.now();
      const result = await generateLikeQuery(input);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(5000); // Fallback should be fast
      expect(isSearchQuery(result)).toBe(true);
    });
  });
});