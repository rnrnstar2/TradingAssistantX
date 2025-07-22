import { vi, expect } from 'vitest';
import type { IntegratedContext, CollectionResult, Decision } from '../types/autonomous-system';
import type { AutonomousConfig } from '../types/autonomous-config';

/**
 * テスト用ユーティリティクラス
 * 共通のモック作成、テストデータ生成、検証ヘルパーを提供
 */
export class TestHelper {
  /**
   * モックIntegratedContextを作成
   */
  static createMockContext(overrides: Partial<IntegratedContext> = {}): IntegratedContext {
    const defaultContext: IntegratedContext = {
      account: {
        currentState: {
          timestamp: new Date().toISOString(),
          followers: { current: 1000, change_24h: 10, growth_rate: '1%' },
          engagement: { avg_likes: 50, avg_retweets: 10, engagement_rate: '5%' },
          performance: { posts_today: 5, target_progress: '50%', best_posting_time: '12:00' },
          health: { status: 'healthy', api_limits: 'normal', quality_score: 85 },
          recommendations: ['テストレコメンデーション'],
          healthScore: 85
        },
        recommendations: ['アカウント改善提案'],
        healthScore: 85
      },
      market: {
        trends: [],
        opportunities: [],
        competitorActivity: []
      },
      actionSuggestions: [],
      timestamp: Date.now()
    };

    return { ...defaultContext, ...overrides };
  }

  /**
   * モックCollectionResultを作成
   */
  static createMockCollectionResult(overrides: Partial<CollectionResult> = {}): CollectionResult {
    const defaultResult: CollectionResult = {
      id: `test-${Math.random().toString(36).substr(2, 9)}`,
      type: 'trend',
      content: 'テスト用コンテンツ',
      source: 'test-source',
      relevanceScore: 0.85,
      timestamp: Date.now(),
      metadata: { engagement: 100 }
    };

    return { ...defaultResult, ...overrides };
  }

  /**
   * モックDecisionを作成
   */
  static createMockDecision(overrides: Partial<Decision> = {}): Decision {
    const defaultDecision: Decision = {
      id: `decision-${Math.random().toString(36).substr(2, 9)}`,
      type: 'original_post',
      priority: 'medium',
      reasoning: 'テスト用の判断理由',
      estimatedDuration: 60,
      expectedImpact: 'テスト期待結果',
      metadata: {
        confidence: 0.85,
        testMode: true
      }
    };

    return { ...defaultDecision, ...overrides };
  }

  /**
   * モックAutonomousConfigを作成
   */
  static createMockConfig(overrides: Partial<AutonomousConfig> = {}): AutonomousConfig {
    const defaultConfig: AutonomousConfig = {
      execution: {
        mode: 'scheduled_posting',
        posting_interval_minutes: 60,
        health_check_enabled: true,
        maintenance_enabled: false
      },
      autonomous_system: {
        max_parallel_tasks: 3,
        context_sharing_enabled: true,
        decision_persistence: false
      },
      claude_integration: {
        sdk_enabled: true,
        max_context_size: 50000
      },
      data_management: {
        cleanup_interval: 3600000,
        max_history_entries: 100
      }
    };

    return { ...defaultConfig, ...overrides };
  }

  /**
   * Claudeクライアントのモックを作成
   */
  static mockClaudeClient() {
    return vi.fn(() => ({
      withModel: vi.fn(() => ({
        query: vi.fn(() => ({
          asText: vi.fn().mockResolvedValue(JSON.stringify({
            score: 85,
            shouldContinue: false,
            reasoning: 'テスト評価',
            suggestedActions: []
          }))
        }))
      }))
    }));
  }

  /**
   * Playwrightモック環境を作成
   */
  static mockPlaywrightEnvironment() {
    const mockPage = {
      goto: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      $$eval: vi.fn().mockResolvedValue([
        { text: 'テスト投稿内容', time: '2024-01-01' }
      ]),
      textContent: vi.fn().mockResolvedValue('ページテキスト内容'),
      isClosed: vi.fn().mockReturnValue(false),
      evaluate: vi.fn().mockResolvedValue('評価結果'),
      waitForSelector: vi.fn().mockResolvedValue({}),
      click: vi.fn().mockResolvedValue(undefined),
      type: vi.fn().mockResolvedValue(undefined)
    };

    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined)
    };

    const mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn().mockResolvedValue(undefined),
      isConnected: vi.fn().mockReturnValue(true)
    };

    return {
      browser: mockBrowser,
      context: mockContext,
      page: mockPage
    };
  }

  /**
   * ファイルシステムモックを作成
   */
  static mockFileSystem() {
    return {
      existsSync: vi.fn().mockReturnValue(true),
      readFileSync: vi.fn().mockReturnValue(JSON.stringify({
        test: 'data'
      })),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn()
    };
  }

  /**
   * ネットワークエラーを発生させるモック
   */
  static mockNetworkError() {
    return vi.fn().mockRejectedValue(new Error('Network error'));
  }

  /**
   * タイムアウトエラーを発生させるモック
   */
  static mockTimeoutError() {
    return vi.fn().mockRejectedValue(new Error('Request timeout'));
  }

  /**
   * アサーションヘルパー: 基本的なオブジェクト構造を検証
   */
  static assertValidCollectionResult(result: any) {
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.type).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.source).toBeDefined();
    expect(typeof result.relevanceScore).toBe('number');
    expect(result.timestamp).toBeDefined();
  }

  /**
   * アサーションヘルパー: 決定オブジェクトの構造を検証
   */
  static assertValidDecision(decision: any) {
    expect(decision).toBeDefined();
    expect(decision.id).toBeDefined();
    expect(decision.type).toBeDefined();
    expect(decision.priority).toBeDefined();
    expect(decision.reasoning).toBeDefined();
    if (decision.metadata?.confidence !== undefined) {
      expect(typeof decision.metadata.confidence).toBe('number');
      expect(decision.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.metadata.confidence).toBeLessThanOrEqual(1);
    }
  }

  /**
   * アサーションヘルパー: 実行時間の妥当性を検証
   */
  static assertValidExecutionTime(executionTime: number, maxTime: number = 90000) {
    expect(executionTime).toBeGreaterThan(0);
    expect(executionTime).toBeLessThan(maxTime);
  }

  /**
   * アサーションヘルパー: エラーレスポンスの構造を検証
   */
  static assertValidErrorResponse(errorResponse: any) {
    expect(errorResponse).toBeDefined();
    expect(errorResponse.error).toBeDefined();
    expect(typeof errorResponse.error).toBe('string');
    expect(errorResponse.timestamp).toBeDefined();
  }

  /**
   * テストデータ生成: 大量のCollectionResultを生成
   */
  static generateMockCollectionResults(count: number): CollectionResult[] {
    return Array.from({ length: count }, (_, i) => 
      this.createMockCollectionResult({
        id: `test-result-${i}`,
        content: `テストコンテンツ ${i + 1}`,
        relevanceScore: Math.random() * 0.3 + 0.7 // 0.7-1.0の範囲
      })
    );
  }

  /**
   * テスト環境セットアップ: 共通の環境変数とモックを設定
   */
  static setupTestEnvironment() {
    process.env.X_TEST_MODE = 'true';
    process.env.NODE_ENV = 'test';
    
    // グローバルタイムアウトを設定
    if (typeof globalThis.setTimeout !== 'undefined') {
      (globalThis as any).defaultTestTimeout = 90000;
    }
  }

  /**
   * テスト環境クリーンアップ: モックとタイマーをリセット
   */
  static cleanupTestEnvironment() {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.clearAllTimers();
    
    // テスト用環境変数をクリア
    delete process.env.X_TEST_MODE;
  }

  /**
   * パフォーマンステスト用: 実行時間を測定
   */
  static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; executionTime: number }> {
    const startTime = Date.now();
    const result = await fn();
    const executionTime = Date.now() - startTime;
    
    return { result, executionTime };
  }

  /**
   * リトライテスト用: 関数を指定回数リトライ実行
   */
  static async retryTest<T>(
    fn: () => Promise<T>, 
    maxRetries: number = 3, 
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * ストレステスト用: 並列実行テスト
   */
  static async parallelTest<T>(
    fn: () => Promise<T>, 
    concurrency: number = 5
  ): Promise<T[]> {
    const promises = Array.from({ length: concurrency }, () => fn());
    return Promise.all(promises);
  }
}

/**
 * モッククラスファクトリー
 */
export class MockFactory {
  /**
   * PlaywrightCommonSetupのモックを作成
   */
  static createPlaywrightCommonSetupMock() {
    const mockEnvironment = TestHelper.mockPlaywrightEnvironment();
    
    return {
      createPlaywrightEnvironment: vi.fn().mockResolvedValue(mockEnvironment),
      cleanup: vi.fn().mockResolvedValue(undefined)
    };
  }

  /**
   * Claude SDKのモックを作成
   */
  static createClaudeSDKMock() {
    return {
      claude: TestHelper.mockClaudeClient()
    };
  }

  /**
   * YAML設定ローダーのモックを作成
   */
  static createYamlUtilsMock() {
    return {
      loadYamlSafe: vi.fn().mockReturnValue(TestHelper.createMockConfig()),
      saveYamlSafe: vi.fn().mockResolvedValue(undefined)
    };
  }
}

/**
 * テスト定数
 */
export const TEST_CONSTANTS = {
  DEFAULT_TIMEOUT: 90000,
  HOOK_TIMEOUT: 60000,
  MAX_EXECUTION_TIME: 120000,
  MIN_CONFIDENCE_SCORE: 0.7,
  MAX_RETRIES: 3,
  DEFAULT_SUFFICIENCY_TARGET: 85
} as const;