/**
 * Decision Endpoint テスト - decision-endpoint.test.ts
 * REQUIREMENTS.md準拠 - makeDecision関数の包括的テスト
 */

import { vi } from 'vitest';
import { makeDecision } from '../../../src/claude/endpoints/decision-endpoint';
import { SYSTEM_LIMITS, VALID_ACTIONS, isClaudeDecision } from '../../../src/claude/types';
import {
  createMockDecisionInput,
  createMockSystemContext,
  createMockSystemContextUnhealthy,
  createMockSystemContextLimitReached,
  createMockClaudeDecision
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

describe('Decision Endpoint Tests', () => {
  beforeEach(() => {
    resetClaudeMock();
  });

  describe('makeDecisionメイン機能テスト', () => {
    test('正常系：有効な入力で適切な決定を返す', async () => {
      const input = createMockDecisionInput();
      setupClaudeMock('decision');

      const result = await makeDecision(input);

      expect(isClaudeDecision(result)).toBe(true);
      expect(VALID_ACTIONS.includes(result.action)).toBe(true);
      expect(typeof result.reasoning).toBe('string');
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(validateRange(result.confidence, 0, 1)).toBe(true);
      expect(result.parameters).toBeDefined();
    });

    test('全アクションタイプの適切な決定結果検証', async () => {
      const input = createMockDecisionInput();

      for (const action of VALID_ACTIONS) {
        const mockResponse = JSON.stringify({
          action,
          reasoning: `${action}を選択した理由`,
          confidence: 0.8,
          parameters: {
            topic: action !== 'wait' ? '投資教育' : undefined,
            duration: action === 'wait' ? 1800000 : undefined
          }
        });

        setupClaudeMockWithResponse(mockResponse);
        const result = await makeDecision(input);

        expect(result.action).toBe(action);
        expect(isClaudeDecision(result)).toBe(true);
        expect(validateRange(result.confidence, 0, 1)).toBe(true);

        resetClaudeMock();
      }
    });

    test('SystemContextに基づく適切なアクション選択の確認', async () => {
      const input = createMockDecisionInput();
      
      // 健全なシステム状態でpost決定をモック
      const postMockResponse = JSON.stringify({
        action: 'post',
        reasoning: 'システムが健全で投稿が可能',
        confidence: 0.9,
        parameters: { topic: '投資教育', content: 'テスト投稿' }
      });

      setupClaudeMockWithResponse(postMockResponse);
      const result = await makeDecision(input);

      expect(result.action).toBe('post');
      expect(result.confidence).toBe(0.9);
      expect(result.parameters.topic).toBe('投資教育');
    });
  });

  describe('入力検証テスト', () => {
    test('DecisionInput型の各フィールド組み合わせでの動作確認', async () => {
      setupClaudeMock('decision');

      // 基本入力
      const basicInput = createMockDecisionInput();
      const result1 = await makeDecision(basicInput);
      expect(isClaudeDecision(result1)).toBe(true);

      // 制約付き入力
      const constrainedInput = {
        ...basicInput,
        constraints: {
          maxPostsPerDay: 3,
          minWaitBetweenPosts: 7200000 // 2 hours
        }
      };
      const result2 = await makeDecision(constrainedInput);
      expect(isClaudeDecision(result2)).toBe(true);

      // 学習データ付き入力
      const learningInput = {
        ...basicInput,
        learningData: {
          recent_success_patterns: ['morning_post'],
          engagement_trends: { average: 0.8 }
        }
      };
      const result3 = await makeDecision(learningInput);
      expect(isClaudeDecision(result3)).toBe(true);
    });

    test('SystemContextの必須フィールド不足時のエラーハンドリング', async () => {
      const incompleteContext = {
        ...createMockSystemContext(),
        account: undefined // Required field missing
      };

      const input = {
        ...createMockDecisionInput(),
        context: incompleteContext as any
      };

      const result = await makeDecision(input);

      expect(result.action).toBe('wait');
      expect(result.reasoning).toContain('Account context missing');
      expect(validateRange(result.confidence, 0, 1)).toBe(true);
    });

    test('無効なSystemContext構造での処理', async () => {
      const invalidInput = {
        context: null as any,
        currentTime: new Date(),
        learningData: null
      };

      const result = await makeDecision(invalidInput);

      expect(result.action).toBe('wait');
      expect(typeof result.reasoning).toBe('string');
      expect(validateRange(result.confidence, 0, 1)).toBe(true);
    });
  });

  describe('制約チェックテスト', () => {
    test('日次投稿制限（MAX_POSTS_PER_DAY）到達時のwait判断', async () => {
      const limitReachedContext = createMockSystemContextLimitReached();
      const input = {
        ...createMockDecisionInput(),
        context: limitReachedContext
      };

      const result = await makeDecision(input);

      expect(result.action).toBe('wait');
      expect(result.reasoning).toContain('Daily post limit reached');
      expect(result.confidence).toBeGreaterThan(0.8); // High confidence for clear limit
      expect(result.parameters.duration).toBeDefined();
    });

    test('システムヘルスチェック失敗時のwait判断', async () => {
      const unhealthyContext = createMockSystemContextUnhealthy();
      const input = {
        ...createMockDecisionInput(),
        context: unhealthyContext
      };

      const result = await makeDecision(input);

      expect(result.action).toBe('wait');
      expect(result.reasoning).toMatch(/System health|API error|Rate limits/);
      expect(validateRange(result.confidence, 0.6, 1.0)).toBe(true);
    });

    test('レート制限超過時のwait判断', async () => {
      const rateLimitContext = {
        ...createMockSystemContext(),
        system: {
          ...createMockSystemContext().system,
          health: {
            all_systems_operational: true,
            api_status: 'healthy' as const,
            rate_limits_ok: false // Rate limit exceeded
          }
        }
      };

      const input = {
        ...createMockDecisionInput(),
        context: rateLimitContext
      };

      const result = await makeDecision(input);

      expect(result.action).toBe('wait');
      expect(result.reasoning).toContain('Rate limits exceeded');
      expect(result.confidence).toBe(0.7);
    });

    test('複数制約違反時の優先順位確認', async () => {
      const multipleIssuesContext = {
        ...createMockSystemContextLimitReached(),
        system: {
          ...createMockSystemContextLimitReached().system,
          health: {
            all_systems_operational: false,
            api_status: 'error' as const,
            rate_limits_ok: false
          }
        }
      };

      const input = {
        ...createMockDecisionInput(),
        context: multipleIssuesContext
      };

      const result = await makeDecision(input);

      expect(result.action).toBe('wait');
      // Should return the first constraint violation encountered
      expect(result.reasoning).toContain('Daily post limit reached');
    });
  });

  describe('型安全性テスト', () => {
    test('ClaudeDecision型の返却値構造検証', async () => {
      const input = createMockDecisionInput();
      setupClaudeMock('decision');

      const result = await makeDecision(input);

      expect(validateResponseStructure(result, ['action', 'reasoning', 'parameters', 'confidence'])).toBe(true);
      expect(typeof result.action).toBe('string');
      expect(typeof result.reasoning).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.parameters).toBe('object');
    });

    test('confidence値の範囲（0-1）検証', async () => {
      const input = createMockDecisionInput();

      // 境界値テスト用の異なる応答
      const testCases = [
        { confidence: 0, expected: 0 },
        { confidence: 0.5, expected: 0.5 },
        { confidence: 1, expected: 1 },
        { confidence: 1.5, expected: 1 }, // Should be clamped to 1
        { confidence: -0.1, expected: 0 } // Should be clamped to 0
      ];

      for (const testCase of testCases) {
        const mockResponse = JSON.stringify({
          action: 'wait',
          reasoning: 'テスト用決定',
          confidence: testCase.confidence,
          parameters: { duration: 1800000 }
        });

        setupClaudeMockWithResponse(mockResponse);
        const result = await makeDecision(input);

        expect(result.confidence).toBe(testCase.expected);
        expect(validateRange(result.confidence, 0, 1)).toBe(true);

        resetClaudeMock();
      }
    });

    test('parameters構造の適切性確認', async () => {
      const input = createMockDecisionInput();

      // Different action types and their expected parameters
      const actionParameterTests = [
        {
          action: 'post',
          expectedKeys: ['topic', 'content'],
          mockParams: { topic: '投資教育', content: 'テスト投稿' }
        },
        {
          action: 'retweet',
          expectedKeys: ['searchQuery'],
          mockParams: { searchQuery: '投資 教育 -spam' }
        },
        {
          action: 'wait',
          expectedKeys: ['duration', 'reason'],
          mockParams: { duration: 1800000, reason: 'test_wait' }
        }
      ];

      for (const test of actionParameterTests) {
        const mockResponse = JSON.stringify({
          action: test.action,
          reasoning: `${test.action}の決定理由`,
          confidence: 0.8,
          parameters: test.mockParams
        });

        setupClaudeMockWithResponse(mockResponse);
        const result = await makeDecision(input);

        expect(result.action).toBe(test.action);
        test.expectedKeys.forEach(key => {
          expect(result.parameters).toHaveProperty(key);
        });

        resetClaudeMock();
      }
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('Claude API失敗時の適切なwait決定返却', async () => {
      const input = createMockDecisionInput();
      setupClaudeMockError(new Error('Claude API connection failed'));

      const result = await makeDecision(input);

      expect(result.action).toBe('wait');
      expect(result.reasoning).toContain('Claude判断失敗のため待機');
      expect(result.confidence).toBe(0.5);
      expect(result.parameters.duration).toBe(1800000);
      expect(result.parameters.reason).toBe('scheduled_wait');
    });

    test('無効な応答形式時のフォールバック処理', async () => {
      const input = createMockDecisionInput();
      
      // Invalid JSON response
      setupClaudeMockWithResponse('Invalid JSON response');

      const result = await makeDecision(input);

      expect(result.action).toBe('wait');
      expect(result.reasoning).toContain('Response parsing failed');
      expect(result.confidence).toBe(0.5);
    });

    test('不完全なClaude応答での処理', async () => {
      const input = createMockDecisionInput();

      // Missing required fields in response
      const incompleteResponse = JSON.stringify({
        action: 'post'
        // Missing reasoning, confidence, parameters
      });

      setupClaudeMockWithResponse(incompleteResponse);
      const result = await makeDecision(input);

      expect(result.action).toBe('wait');
      expect(result.reasoning).toContain('Invalid decision format');
      expect(result.confidence).toBe(0.6);
    });

    test('無効なアクションタイプでの処理', async () => {
      const input = createMockDecisionInput();

      const invalidActionResponse = JSON.stringify({
        action: 'invalid_action',
        reasoning: 'テスト用無効アクション',
        confidence: 0.8,
        parameters: {}
      });

      setupClaudeMockWithResponse(invalidActionResponse);
      const result = await makeDecision(input);

      expect(result.action).toBe('wait');
      expect(result.reasoning).toContain('Invalid decision format');
    });

    test('タイムアウト処理', async () => {
      const input = createMockDecisionInput();
      setupClaudeMockError(new Error('Timeout'));

      const result = await makeDecision(input);

      expect(result.action).toBe('wait');
      expect(typeof result.reasoning).toBe('string');
      expect(validateRange(result.confidence, 0, 1)).toBe(true);
    });
  });

  describe('パフォーマンス・統合テスト', () => {
    test('複数回の連続実行での一貫性確認', async () => {
      const input = createMockDecisionInput();
      setupClaudeMock('decision');

      const results = await Promise.all([
        makeDecision(input),
        makeDecision(input),
        makeDecision(input)
      ]);

      results.forEach(result => {
        expect(isClaudeDecision(result)).toBe(true);
        expect(VALID_ACTIONS.includes(result.action)).toBe(true);
      });
    });

    test('制約条件下での決定ロジック確認', async () => {
      // Test decision logic with different constraint combinations
      const baseInput = createMockDecisionInput();
      
      const scenarios = [
        {
          name: 'Normal conditions',
          context: createMockSystemContext(),
          expectedWait: false
        },
        {
          name: 'Post limit reached',
          context: createMockSystemContextLimitReached(),
          expectedWait: true
        },
        {
          name: 'System unhealthy',
          context: createMockSystemContextUnhealthy(),
          expectedWait: true
        }
      ];

      for (const scenario of scenarios) {
        const input = { ...baseInput, context: scenario.context };
        const result = await makeDecision(input);

        if (scenario.expectedWait) {
          expect(result.action).toBe('wait');
        } else {
          // For normal conditions, let Claude decide (could be any action)
          expect(VALID_ACTIONS.includes(result.action)).toBe(true);
        }
      }
    });

    test('メモリ使用量・実行時間の妥当性確認', async () => {
      const input = createMockDecisionInput();
      setupClaudeMock('decision');

      const startTime = Date.now();
      const result = await makeDecision(input);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(15000); // Should complete within timeout
      expect(isClaudeDecision(result)).toBe(true);
    });
  });
});