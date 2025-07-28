/**
 * 型定義テスト - types.test.ts
 * REQUIREMENTS.md準拠 - 型ガード・定数・型互換性の完全テスト
 */

import {
  // Type guards
  isClaudeDecision,
  isGeneratedContent,
  isAnalysisResult,
  isSearchQuery,
  
  // Constants
  VALID_ACTIONS,
  CONTENT_TYPES,
  TARGET_AUDIENCES,
  SEARCH_PURPOSES,
  ANALYSIS_TYPES,
  SYSTEM_LIMITS,
  
  // Types for testing
  ClaudeDecision,
  GeneratedContent,
  AnalysisResult,
  SearchQuery
} from '../../src/claude/types';

import {
  createMockClaudeDecision,
  createMockGeneratedContent,
  createMockAnalysisResult,
  createMockSearchQuery,
  createInvalidDecisionResponse,
  createInvalidContentResponse,
  createInvalidAnalysisResponse
} from '../test-utils/mock-data';

import { validateResponseStructure } from '../test-utils/test-helpers';

describe('Claude Types Module', () => {
  describe('型ガード機能テスト', () => {
    describe('isClaudeDecision', () => {
      test('正常なClaudeDecisionでtrueを返す', () => {
        const validDecision = createMockClaudeDecision('post');
        expect(isClaudeDecision(validDecision)).toBe(true);
      });

      test('全てのアクションタイプでtrueを返す', () => {
        VALID_ACTIONS.forEach(action => {
          const decision = createMockClaudeDecision(action);
          expect(isClaudeDecision(decision)).toBe(true);
        });
      });

      test('confidence値の範囲（0-1）を検証', () => {
        // 境界値テスト
        const decision0 = { ...createMockClaudeDecision(), confidence: 0 };
        const decision1 = { ...createMockClaudeDecision(), confidence: 1 };
        const decisionOutOfRange = { ...createMockClaudeDecision(), confidence: 1.5 };
        const decisionNegative = { ...createMockClaudeDecision(), confidence: -0.1 };

        expect(isClaudeDecision(decision0)).toBe(true);
        expect(isClaudeDecision(decision1)).toBe(true);
        expect(isClaudeDecision(decisionOutOfRange)).toBe(false);
        expect(isClaudeDecision(decisionNegative)).toBe(false);
      });

      test('無効なactionで false を返す', () => {
        const invalidDecision = {
          ...createMockClaudeDecision(),
          action: 'invalid_action'
        };
        expect(isClaudeDecision(invalidDecision)).toBe(false);
      });

      test('必須フィールド不足時に false を返す', () => {
        const incompleteDecision = createInvalidDecisionResponse();
        expect(isClaudeDecision(incompleteDecision)).toBe(false);

        // 個別フィールドテスト
        expect(isClaudeDecision(null)).toBe(false);
        expect(isClaudeDecision(undefined)).toBe(false);
        expect(isClaudeDecision({})).toBe(false);
        expect(isClaudeDecision({ action: 'post' })).toBe(false); // reasoning missing
      });

      test('型の不一致で false を返す', () => {
        const wrongTypes = {
          action: 123, // should be string
          reasoning: true, // should be string  
          confidence: 'high', // should be number
          parameters: 'invalid' // should be object
        };
        expect(isClaudeDecision(wrongTypes)).toBe(false);
      });
    });

    describe('isGeneratedContent', () => {
      test('正常なGeneratedContentでtrueを返す', () => {
        const validContent = createMockGeneratedContent();
        expect(isGeneratedContent(validContent)).toBe(true);
      });

      test('qualityScore値の範囲（0-100）を検証', () => {
        const content0 = { ...createMockGeneratedContent(), qualityScore: 0 };
        const content100 = { ...createMockGeneratedContent(), qualityScore: 100 };
        const contentOver = { ...createMockGeneratedContent(), qualityScore: 150 };
        const contentNegative = { ...createMockGeneratedContent(), qualityScore: -10 };

        expect(isGeneratedContent(content0)).toBe(true);
        expect(isGeneratedContent(content100)).toBe(true);
        expect(isGeneratedContent(contentOver)).toBe(false);
        expect(isGeneratedContent(contentNegative)).toBe(false);
      });

      test('hashtags配列を検証', () => {
        const validContent = createMockGeneratedContent();
        expect(isGeneratedContent(validContent)).toBe(true);

        const invalidHashtags = { ...validContent, hashtags: 'not_array' };
        expect(isGeneratedContent(invalidHashtags)).toBe(false);
      });

      test('metadata構造を検証', () => {
        const validContent = createMockGeneratedContent();
        expect(isGeneratedContent(validContent)).toBe(true);

        // metadata内の必須フィールドテスト
        const invalidMetadata = {
          ...validContent,
          metadata: { wordCount: 'invalid' } // missing fields, wrong type
        };
        expect(isGeneratedContent(invalidMetadata)).toBe(false);
      });

      test('必須フィールド不足時に false を返す', () => {
        const incompleteContent = createInvalidContentResponse();
        expect(isGeneratedContent(incompleteContent)).toBe(false);
      });
    });

    describe('isAnalysisResult', () => {
      test('正常なAnalysisResultでtrueを返す', () => {
        const validAnalysis = createMockAnalysisResult('performance');
        expect(isAnalysisResult(validAnalysis)).toBe(true);
      });

      test('全ての分析タイプでtrueを返す', () => {
        ANALYSIS_TYPES.forEach(type => {
          const analysis = createMockAnalysisResult(type);
          expect(isAnalysisResult(analysis)).toBe(true);
        });
      });

      test('insights・recommendations配列を検証', () => {
        const validAnalysis = createMockAnalysisResult();
        expect(isAnalysisResult(validAnalysis)).toBe(true);

        const invalidInsights = { ...validAnalysis, insights: 'not_array' };
        const invalidRecommendations = { ...validAnalysis, recommendations: 123 };

        expect(isAnalysisResult(invalidInsights)).toBe(false);
        expect(isAnalysisResult(invalidRecommendations)).toBe(false);
      });

      test('confidence値の範囲（0-1）を検証', () => {
        const analysis0 = { ...createMockAnalysisResult(), confidence: 0 };
        const analysis1 = { ...createMockAnalysisResult(), confidence: 1 };
        const analysisOver = { ...createMockAnalysisResult(), confidence: 2.0 };
        
        expect(isAnalysisResult(analysis0)).toBe(true);
        expect(isAnalysisResult(analysis1)).toBe(true);
        expect(isAnalysisResult(analysisOver)).toBe(false);
      });

      test('無効な分析タイプで false を返す', () => {
        const invalidAnalysis = {
          ...createMockAnalysisResult(),
          analysisType: 'invalid_type'
        };
        expect(isAnalysisResult(invalidAnalysis)).toBe(false);
      });
    });

    describe('isSearchQuery', () => {
      test('正常なSearchQueryでtrueを返す', () => {
        const validQuery = createMockSearchQuery('retweet');
        expect(isSearchQuery(validQuery)).toBe(true);
      });

      test('全ての検索目的でtrueを返す', () => {
        SEARCH_PURPOSES.forEach(purpose => {
          const query = createMockSearchQuery(purpose);
          expect(isSearchQuery(query)).toBe(true);
        });
      });

      test('metadata.purpose検証', () => {
        const validQuery = createMockSearchQuery();
        expect(isSearchQuery(validQuery)).toBe(true);

        const invalidPurpose = {
          ...validQuery,
          metadata: { ...validQuery.metadata, purpose: 'invalid_purpose' }
        };
        expect(isSearchQuery(invalidPurpose)).toBe(false);
      });

      test('必須フィールドを検証', () => {
        const validQuery = createMockSearchQuery();
        
        // 個別フィールド不足テスト
        expect(isSearchQuery({ ...validQuery, query: undefined })).toBe(false);
        expect(isSearchQuery({ ...validQuery, priority: undefined })).toBe(false);
        expect(isSearchQuery({ ...validQuery, expectedResults: undefined })).toBe(false);
        expect(isSearchQuery({ ...validQuery, filters: undefined })).toBe(false);
        expect(isSearchQuery({ ...validQuery, metadata: undefined })).toBe(false);
      });
    });
  });

  describe('定数テスト', () => {
    test('VALID_ACTIONS定数値確認', () => {
      expect(VALID_ACTIONS).toEqual(['post', 'retweet', 'quote_tweet', 'like', 'wait']);
      expect(VALID_ACTIONS).toHaveLength(5);
      
      // 各アクションが文字列であることを確認
      VALID_ACTIONS.forEach(action => {
        expect(typeof action).toBe('string');
      });
    });

    test('CONTENT_TYPES定数値確認', () => {
      expect(CONTENT_TYPES).toEqual(['educational', 'market_analysis', 'trending', 'general']);
      expect(CONTENT_TYPES).toHaveLength(4);
    });

    test('TARGET_AUDIENCES定数値確認', () => {
      expect(TARGET_AUDIENCES).toEqual(['beginner', 'intermediate', 'advanced']);
      expect(TARGET_AUDIENCES).toHaveLength(3);
    });

    test('SEARCH_PURPOSES定数値確認', () => {
      expect(SEARCH_PURPOSES).toEqual(['retweet', 'like', 'trend_analysis', 'engagement']);
      expect(SEARCH_PURPOSES).toHaveLength(4);
    });

    test('ANALYSIS_TYPES定数値確認', () => {
      expect(ANALYSIS_TYPES).toEqual(['market', 'performance', 'trend']);
      expect(ANALYSIS_TYPES).toHaveLength(3);
    });

    test('SYSTEM_LIMITS定数値の妥当性確認', () => {
      expect(SYSTEM_LIMITS.MAX_POSTS_PER_DAY).toBe(5);
      expect(SYSTEM_LIMITS.MIN_WAIT_BETWEEN_POSTS).toBe(3600000); // 1 hour in ms
      expect(SYSTEM_LIMITS.MAX_CONTENT_LENGTH).toBe(280);
      expect(SYSTEM_LIMITS.CONFIDENCE_THRESHOLD).toBe(0.7);
      expect(SYSTEM_LIMITS.QUALITY_THRESHOLD).toBe(70);
      expect(SYSTEM_LIMITS.DEFAULT_TIMEOUT).toBe(15000);

      // 数値型であることを確認
      Object.values(SYSTEM_LIMITS).forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThan(0);
      });
    });
  });

  describe('型互換性テスト', () => {
    test('エンドポイント間での型の整合性確認', () => {
      // ClaudeDecisionがdecision-endpointと互換性があることを確認
      const decision = createMockClaudeDecision('post');
      expect(validateResponseStructure(decision, ['action', 'reasoning', 'parameters', 'confidence'])).toBe(true);

      // GeneratedContentがcontent-endpointと互換性があることを確認  
      const content = createMockGeneratedContent();
      expect(validateResponseStructure(content, ['content', 'hashtags', 'qualityScore', 'metadata'])).toBe(true);

      // AnalysisResultがanalysis-endpointと互換性があることを確認
      const analysis = createMockAnalysisResult();
      expect(validateResponseStructure(analysis, ['analysisType', 'insights', 'recommendations', 'confidence', 'metadata'])).toBe(true);

      // SearchQueryがsearch-endpointと互換性があることを確認
      const search = createMockSearchQuery();
      expect(validateResponseStructure(search, ['query', 'filters', 'priority', 'expectedResults', 'metadata'])).toBe(true);
    });

    test('型ガードと定数の一貫性確認', () => {
      // ClaudeDecisionのactionフィールドがVALID_ACTIONSと一致
      VALID_ACTIONS.forEach(action => {
        const decision = createMockClaudeDecision(action);
        expect(isClaudeDecision(decision)).toBe(true);
      });

      // AnalysisResultのanalysisTypeがANALYSIS_TYPESと一致
      ANALYSIS_TYPES.forEach(type => {
        const analysis = createMockAnalysisResult(type);
        expect(isAnalysisResult(analysis)).toBe(true);
      });

      // SearchQueryのpurposeがSEARCH_PURPOSESと一致
      SEARCH_PURPOSES.forEach(purpose => {
        const query = createMockSearchQuery(purpose);
        expect(isSearchQuery(query)).toBe(true);
      });
    });

    test('境界値での型ガード動作確認', () => {
      // confidence値の境界値テスト
      const minConfidence = { ...createMockClaudeDecision(), confidence: 0 };
      const maxConfidence = { ...createMockClaudeDecision(), confidence: 1 };
      
      expect(isClaudeDecision(minConfidence)).toBe(true);
      expect(isClaudeDecision(maxConfidence)).toBe(true);

      // qualityScore値の境界値テスト  
      const minQuality = { ...createMockGeneratedContent(), qualityScore: 0 };
      const maxQuality = { ...createMockGeneratedContent(), qualityScore: 100 };
      
      expect(isGeneratedContent(minQuality)).toBe(true);
      expect(isGeneratedContent(maxQuality)).toBe(true);
    });

    test('型定義の完全性確認', () => {
      // 各型の必須フィールドがすべて定義されていることを確認
      const decision: ClaudeDecision = createMockClaudeDecision();
      const content: GeneratedContent = createMockGeneratedContent();
      const analysis: AnalysisResult = createMockAnalysisResult();
      const search: SearchQuery = createMockSearchQuery();

      // TypeScriptコンパイル時の型チェックが通ることで検証される
      expect(decision).toBeDefined();
      expect(content).toBeDefined();
      expect(analysis).toBeDefined();
      expect(search).toBeDefined();
    });
  });

  describe('エラーケース・堅牢性テスト', () => {
    test('null・undefined値での型ガード動作', () => {
      expect(isClaudeDecision(null)).toBe(false);
      expect(isClaudeDecision(undefined)).toBe(false);
      expect(isGeneratedContent(null)).toBe(false);
      expect(isGeneratedContent(undefined)).toBe(false);
      expect(isAnalysisResult(null)).toBe(false);
      expect(isAnalysisResult(undefined)).toBe(false);
      expect(isSearchQuery(null)).toBe(false);
      expect(isSearchQuery(undefined)).toBe(false);
    });

    test('プリミティブ型での型ガード動作', () => {
      expect(isClaudeDecision('string')).toBe(false);
      expect(isClaudeDecision(123)).toBe(false);
      expect(isClaudeDecision(true)).toBe(false);
      expect(isGeneratedContent([])).toBe(false);
      expect(isAnalysisResult(() => {})).toBe(false);
      expect(isSearchQuery(new Date())).toBe(false);
    });

    test('部分的に不正なオブジェクトでの型ガード動作', () => {
      // 一部フィールドは正しいが、重要なフィールドが不正
      const partiallyInvalid = {
        action: 'post', // 正しい
        reasoning: 'test', // 正しい
        confidence: 'high', // 不正（文字列）
        parameters: {} // 正しい
      };
      expect(isClaudeDecision(partiallyInvalid)).toBe(false);
    });
  });
});