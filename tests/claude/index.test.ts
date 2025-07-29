/**
 * Claude Index エクスポート統合テスト - index.test.ts
 * REQUIREMENTS.md準拠 - エクスポート確認・統合動作テスト
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as ClaudeModule from '../../src/claude/index';

// Import specific functions and types for testing
import {
  // Endpoint functions
  makeDecision,
  generateContent,
  generateQuoteComment,
  analyzePerformance,
  analyzeMarketContext,
  recordExecution,
  generateLearningInsights,
  getPerformanceMetrics,
  generateImprovementSuggestions,
  generateSearchQuery,
  generateRetweetQuery,
  generateLikeQuery,
  generateQuoteQuery,

  // Types
  ClaudeDecision,
  GeneratedContent,
  AnalysisResult,
  SearchQuery,
  DecisionInput,
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
  isClaudeDecision,
  isGeneratedContent,
  isAnalysisResult,
  isSearchQuery
} from '../../src/claude/index';

import {
  createMockDecisionInput,
  createMockContentInput,
  createMockAnalysisInput,
  createMockSearchInput,
  createMockExecutionRecord
} from '../test-utils/claude-mock-data';
// モック設定を削除 - 実際のClaude APIを使用

describe('Claude Index Export Integration Tests', () => {
  beforeEach(() => {
    // モック削除 - 実際のAPIを使用
  });

  describe('エクスポート確認テスト', () => {
    test('全エンドポイント関数の正常エクスポート確認', () => {
      // Decision endpoint
      expect(typeof makeDecision).toBe('function');

      // Content endpoint
      expect(typeof generateContent).toBe('function');
      expect(typeof generateQuoteComment).toBe('function');

      // Analysis endpoint
      expect(typeof analyzePerformance).toBe('function');
      expect(typeof analyzeMarketContext).toBe('function');
      expect(typeof recordExecution).toBe('function');
      expect(typeof generateLearningInsights).toBe('function');
      expect(typeof getPerformanceMetrics).toBe('function');
      expect(typeof generateImprovementSuggestions).toBe('function');

      // Search endpoint
      expect(typeof generateSearchQuery).toBe('function');
      expect(typeof generateRetweetQuery).toBe('function');
      expect(typeof generateLikeQuery).toBe('function');
      expect(typeof generateQuoteQuery).toBe('function');
    });

    test('全型定義の正常エクスポート確認', () => {
      // Return types should be constructible (tested via type guards)
      expect(typeof isClaudeDecision).toBe('function');
      expect(typeof isGeneratedContent).toBe('function');
      expect(typeof isAnalysisResult).toBe('function');
      expect(typeof isSearchQuery).toBe('function');

      // Input types are checked via TypeScript compilation
      // Here we verify they're accessible
      const decisionInput: DecisionInput = createMockDecisionInput();
      const contentInput: ContentInput = createMockContentInput();
      const analysisInput: AnalysisInput = createMockAnalysisInput();
      const searchInput: SearchInput = createMockSearchInput();

      expect(decisionInput).toBeDefined();
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
      expect(typeof isClaudeDecision).toBe('function');
      expect(typeof isGeneratedContent).toBe('function');
      expect(typeof isAnalysisResult).toBe('function');
      expect(typeof isSearchQuery).toBe('function');

      // Test that they work correctly
      expect(isClaudeDecision(null)).toBe(false);
      expect(isGeneratedContent({})).toBe(false);
      expect(isAnalysisResult(undefined)).toBe(false);
      expect(isSearchQuery('string')).toBe(false);
    });

    test('ClaudeModuleオブジェクトの完全性確認', () => {
      // Verify all expected exports are present
      const expectedExports = [
        // Functions
        'makeDecision', 'generateContent', 'generateQuoteComment',
        'analyzePerformance', 'analyzeMarketContext', 'recordExecution',
        'generateLearningInsights', 'getPerformanceMetrics', 'generateImprovementSuggestions',
        'generateSearchQuery', 'generateRetweetQuery', 'generateLikeQuery', 'generateQuoteQuery',
        
        // Constants
        'VALID_ACTIONS', 'CONTENT_TYPES', 'TARGET_AUDIENCES', 
        'SEARCH_PURPOSES', 'ANALYSIS_TYPES', 'SYSTEM_LIMITS',
        
        // Type guards
        'isClaudeDecision', 'isGeneratedContent', 'isAnalysisResult', 'isSearchQuery'
      ];

      expectedExports.forEach(exportName => {
        expect(ClaudeModule).toHaveProperty(exportName);
        expect(ClaudeModule[exportName as keyof typeof ClaudeModule]).toBeDefined();
      });
    });
  });

  describe('統合動作テスト', () => {
    test('エンドポイント間の基本的な連携動作確認', async () => {
      // 実際のAPIを使用
      const decisionInput = createMockDecisionInput();
      const decision = await makeDecision(decisionInput);

      expect(isClaudeDecision(decision)).toBe(true);

      if (decision.action === 'post') {
        const contentInput = createMockContentInput();
        const content = await generateContent(contentInput);

        expect(isGeneratedContent(content)).toBe(true);

        // Record execution for analysis
        const executionRecord = createMockExecutionRecord(true);
        recordExecution(executionRecord);

        const metrics = getPerformanceMetrics();
        expect(metrics.total_executions).toBeGreaterThan(0);
      }
    });

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

    test('異なるエンドポイント間でのデータフロー確認', async () => {
      // Simulate a complete workflow
      const decisionInput = createMockDecisionInput();
      const decision = await makeDecision(decisionInput);

      expect(isClaudeDecision(decision)).toBe(true);

      // Record the decision
      const record = {
        id: 'test_workflow_1',
        timestamp: new Date().toISOString(),
        action: decision.action,
        success: true,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        result: { engagement: 10, reach: 100, errors: [] }
      };

      recordExecution(record);

      // Analyze performance
      const insights = generateLearningInsights();
      expect(Array.isArray(insights)).toBe(true);

      const suggestions = generateImprovementSuggestions();
      expect(Array.isArray(suggestions)).toBe(true);

      // Market context analysis
      const marketContext = await analyzeMarketContext({ timeframe: '24h' });
      expect(marketContext.sentiment).toMatch(/^(bearish|neutral|bullish)$/);
    }, 30000);

    test('型ガードとエンドポイント間の整合性', async () => {
      const analysisInput = createMockAnalysisInput('market');
      const analysisResult = await analyzePerformance(analysisInput);

      // Verify type guard works with actual endpoint result
      expect(isAnalysisResult(analysisResult)).toBe(true);
      expect(ANALYSIS_TYPES.includes(analysisResult.analysisType)).toBe(true);

      // Cross-validate with constants
      expect(analysisResult.analysisType).toBe(analysisInput.analysisType);
      expect(analysisResult.confidence).toBeGreaterThanOrEqual(0);
      expect(analysisResult.confidence).toBeLessThanOrEqual(1);
    }, 30000);

    test('エラー時の統合動作確認', async () => {
      // Test error propagation and handling across modules
      const decisionInput = createMockDecisionInput();
      
      const decision = await makeDecision(decisionInput);

      // Even with errors, should return valid decision
      expect(isClaudeDecision(decision)).toBe(true);
      expect(VALID_ACTIONS.includes(decision.action)).toBe(true);

      // Record the failed execution
      const failedRecord = createMockExecutionRecord(false);
      recordExecution(failedRecord);

      const metrics = getPerformanceMetrics();
      expect(metrics.total_executions).toBeGreaterThan(0);
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

    test('メモリリークと状態管理の確認', async () => {
      // Add multiple execution records
      for (let i = 0; i < 10; i++) {
        recordExecution(createMockExecutionRecord(i % 2 === 0));
      }

      const metrics1 = getPerformanceMetrics();
      expect(metrics1.total_executions).toBe(10);

      // Add more records to test memory management
      for (let i = 0; i < 10; i++) {
        recordExecution(createMockExecutionRecord(true));
      }

      const metrics2 = getPerformanceMetrics();
      expect(metrics2.total_executions).toBe(20);

      // Verify insights generation still works
      const insights = generateLearningInsights();
      expect(Array.isArray(insights)).toBe(true);
    });

    test('型の前方互換性確認', () => {
      // Verify that types can be used interchangeably where expected
      const systemContext: SystemContext = createMockDecisionInput().context;
      const basicMarketContext: BasicMarketContext = {
        sentiment: systemContext.market.sentiment,
        volatility: systemContext.market.volatility,
        trendingTopics: systemContext.market.trendingTopics,
        timestamp: new Date().toISOString()
      };

      expect(basicMarketContext.sentiment).toBe(systemContext.market.sentiment);
      expect(basicMarketContext.volatility).toBe(systemContext.market.volatility);
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