/**
 * Claude Index エクスポート統合テスト - index.test.ts
 * REQUIREMENTS.md準拠 - エクスポート確認・統合動作テスト
 * 
 * @note 一部のテストでmakeDecision（非推奨）を使用しており、該当テストはスキップされています。
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as ClaudeModule from '../../src/claude/index';

// Import specific functions and types for testing
import {
  // Endpoint functions
  generateContent,
  generateQuoteComment,
  generateSearchQuery,
  generateRetweetQuery,
  generateLikeQuery,
  generateQuoteQuery,

  // Types
  GeneratedContent,
  AnalysisResult,
  SearchQuery,
  ContentInput,
  AnalysisInput,
  SearchInput,
  SystemContext,
  BasicMarketContext,

  // Constants and utilities
  VALID_ACTIONS,
  CONTENT_TYPES,
  TARGET_AUDIENCES,
  SEARCH_PURPOSES,
  ANALYSIS_TYPES,
  SYSTEM_LIMITS,
  isGeneratedContent,
  isAnalysisResult,
  isSearchQuery
} from '../../src/claude/index';

import {
  createMockContentInput,
  createMockAnalysisInput,
  createMockSearchInput
} from '../test-utils/claude-mock-data';
// モック設定を削除 - 実際のClaude APIを使用

describe('Claude Index Export Integration Tests', () => {
  beforeEach(() => {
    // モック削除 - 実際のAPIを使用
  });

  describe('エクスポート確認テスト', () => {
    test('全エンドポイント関数の正常エクスポート確認', () => {
      // Content endpoint
      expect(typeof generateContent).toBe('function');
      expect(typeof generateQuoteComment).toBe('function');

      // Search endpoint
      expect(typeof generateSearchQuery).toBe('function');
      expect(typeof generateRetweetQuery).toBe('function');
      expect(typeof generateLikeQuery).toBe('function');
      expect(typeof generateQuoteQuery).toBe('function');
    });

    test('全型定義の正常エクスポート確認', () => {
      // Return types should be constructible (tested via type guards)
      expect(typeof isGeneratedContent).toBe('function');
      expect(typeof isAnalysisResult).toBe('function');
      expect(typeof isSearchQuery).toBe('function');

      // Input types are checked via TypeScript compilation
      // Here we verify they're accessible
      const contentInput: ContentInput = createMockContentInput();
      const analysisInput: AnalysisInput = createMockAnalysisInput();
      const searchInput: SearchInput = createMockSearchInput();

      expect(contentInput).toBeDefined();
      expect(analysisInput).toBeDefined();
      expect(searchInput).toBeDefined();
    });

    test('定数エクスポートの確認', () => {
      expect(Array.isArray(VALID_ACTIONS)).toBe(true);
      expect(Array.isArray(CONTENT_TYPES)).toBe(true);
      expect(Array.isArray(TARGET_AUDIENCES)).toBe(true);
      expect(Array.isArray(SEARCH_PURPOSES)).toBe(true);
      expect(Array.isArray(ANALYSIS_TYPES)).toBe(true);
      expect(typeof SYSTEM_LIMITS).toBe('object');

      // Verify specific values
      expect(VALID_ACTIONS).toContain('post');
      expect(CONTENT_TYPES).toContain('educational');
      expect(TARGET_AUDIENCES).toContain('beginner');
      expect(SEARCH_PURPOSES).toContain('retweet');
      expect(ANALYSIS_TYPES).toContain('performance');
      expect(SYSTEM_LIMITS.MAX_POSTS_PER_DAY).toBe(5);
    });

    test('型ガード関数のエクスポート確認', () => {
      expect(typeof isGeneratedContent).toBe('function');
      expect(typeof isAnalysisResult).toBe('function');
      expect(typeof isSearchQuery).toBe('function');

      // Test that they work correctly
      expect(isGeneratedContent({})).toBe(false);
      expect(isAnalysisResult(undefined)).toBe(false);
      expect(isSearchQuery('string')).toBe(false);
    });

    test('ClaudeModuleオブジェクトの完全性確認', () => {
      // Verify all expected exports are present
      const expectedExports = [
        // Functions
        'generateContent', 'generateQuoteComment',
        'generateSearchQuery', 'generateRetweetQuery', 'generateLikeQuery', 'generateQuoteQuery',
        
        // Constants
        'VALID_ACTIONS', 'CONTENT_TYPES', 'TARGET_AUDIENCES', 
        'SEARCH_PURPOSES', 'ANALYSIS_TYPES', 'SYSTEM_LIMITS',
        
        // Type guards
        'isGeneratedContent', 'isAnalysisResult', 'isSearchQuery'
      ];

      expectedExports.forEach(exportName => {
        expect(ClaudeModule).toHaveProperty(exportName);
        expect(ClaudeModule[exportName as keyof typeof ClaudeModule]).toBeDefined();
      });
    });
  });

  describe('統合動作テスト', () => {

    test('型システムの互換性確認', async () => {
      const searchInput = createMockSearchInput('retweet');
      const searchResult = await generateSearchQuery(searchInput);

      // Verify type compatibility
      expect(isSearchQuery(searchResult)).toBe(true);
      expect(SEARCH_PURPOSES.includes(searchResult.metadata.purpose)).toBe(true);

      // Use search result with other endpoints (conceptual integration)
      if (searchResult.metadata.purpose === 'retweet') {
        const retweetInput = {
          topic: 'investment',
          marketContext: undefined,
          targetAudience: 'beginner' as const,
          constraints: {
            maxResults: searchResult.expectedResults,
            minEngagement: searchResult.filters.minEngagement
          }
        };

        const retweetQuery = await generateRetweetQuery(retweetInput);
        expect(isSearchQuery(retweetQuery)).toBe(true);
      }
    }, 30000);




    test('並行処理での統合確認', async () => {
      const searchInputs = [
        createMockSearchInput('retweet'),
        createMockSearchInput('like'),
        createMockSearchInput('engagement')
      ];

      // Execute multiple endpoints in parallel
      const results = await Promise.all([
        generateSearchQuery(searchInputs[0]),
        generateSearchQuery(searchInputs[1]),
        generateSearchQuery(searchInputs[2])
      ]);

      results.forEach((result, index) => {
        expect(isSearchQuery(result)).toBe(true);
        expect(result.metadata.purpose).toBe(searchInputs[index].purpose);
      });
    }, 30000);


    test('型の前方互換性確認', () => {
      // Verify that types can be used interchangeably where expected
      const basicMarketContext: BasicMarketContext = {
        sentiment: 'neutral',
        volatility: 'medium',
        trendingTopics: ['投資', 'NISA'],
        timestamp: new Date().toISOString()
      };

      const systemContext: SystemContext = {
        timestamp: new Date().toISOString(),
        account: {
          followerCount: 1000,
          postsToday: 0,
          engagementRate: 0.02
        },
        system: {
          health: {
            all_systems_operational: true,
            api_status: 'healthy',
            rate_limits_ok: true
          },
          executionCount: { today: 0, total: 0 }
        },
        market: {
          sentiment: basicMarketContext.sentiment,
          volatility: basicMarketContext.volatility,
          trendingTopics: basicMarketContext.trendingTopics
        }
      };

      expect(systemContext.market.sentiment).toBe(basicMarketContext.sentiment);
      expect(systemContext.market.volatility).toBe(basicMarketContext.volatility);
      expect(systemContext.market.trendingTopics).toEqual(basicMarketContext.trendingTopics);
    });

    test('定数とエンドポイントの一貫性最終確認', () => {
      // Verify that all constants are used consistently across endpoints
      VALID_ACTIONS.forEach(action => {
        expect(typeof action).toBe('string');
        expect(action.length).toBeGreaterThan(0);
      });

      ANALYSIS_TYPES.forEach(type => {
        expect(typeof type).toBe('string');
        expect(['market', 'performance', 'trend']).toContain(type);
      });

      // Verify system limits are reasonable
      expect(SYSTEM_LIMITS.MAX_POSTS_PER_DAY).toBeGreaterThan(0);
      expect(SYSTEM_LIMITS.MAX_POSTS_PER_DAY).toBeLessThan(100);
      expect(SYSTEM_LIMITS.MAX_CONTENT_LENGTH).toBe(280); // Twitter limit
    });
  });
});