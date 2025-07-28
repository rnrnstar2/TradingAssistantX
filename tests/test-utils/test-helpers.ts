/**
 * TwitterAPI.io統合テストヘルパー関数
 * 指示書 TASK-004 準拠: TwitterAPI.io準拠テストユーティリティ
 * 
 * 提供機能:
 * - MockHttpClientBuilder: 高度なHTTPクライアントモック構築
 * - TestScenarioBuilder: 複雑なテストシナリオ作成
 * - AsyncTestHelper: 非同期操作・タイミング制御
 * - ValidationHelper: TwitterAPI.io特化バリデーション
 * - PerformanceMonitor: パフォーマンス測定・監視
 * - TestEnvironmentHelper: テスト環境管理
 */

import type { HttpClient, TweetData, UserData, TwitterAPIError } from '../../src/kaito-api/types';

// ============================================================================
// TwitterAPI.io統合テスト専用ヘルパークラス
// ============================================================================

/**
 * MockHttpClientBuilder - 高度なHTTPクライアントモック構築
 * TwitterAPI.io特化のモッククライアント作成・設定
 */
export class MockHttpClientBuilder {
  private mockClient: jest.Mocked<HttpClient>;
  private scenarios: Map<string, any> = new Map();

  constructor() {
    this.mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn()
    };
  }

  /**
   * 成功レスポンスシナリオ設定
   */
  withSuccessResponse(endpoint: string, method: 'get' | 'post' | 'delete', response: any): this {
    this.scenarios.set(`${method}:${endpoint}:success`, response);
    return this;
  }

  /**
   * エラーレスポンスシナリオ設定
   */
  withErrorResponse(endpoint: string, method: 'get' | 'post' | 'delete', error: any): this {
    this.scenarios.set(`${method}:${endpoint}:error`, error);
    return this;
  }

  /**
   * レート制限エラーシナリオ設定
   */
  withRateLimitError(endpoint: string): this {
    const rateLimitError = {
      response: {
        status: 429,
        statusText: 'Too Many Requests',
        data: {
          error: 'Rate limit exceeded for this endpoint',
          reset_time: new Date(Date.now() + 900000).toISOString()
        }
      }
    };
    return this.withErrorResponse(endpoint, 'get', rateLimitError);
  }

  /**
   * 認証エラーシナリオ設定
   */
  withAuthError(endpoint: string): this {
    const authError = {
      response: {
        status: 401,
        statusText: 'Unauthorized',
        data: { error: 'Invalid or expired token' }
      }
    };
    return this.withErrorResponse(endpoint, 'get', authError);
  }

  /**
   * 段階的失敗・回復シナリオ設定
   */
  withRetryScenario(endpoint: string, method: 'get' | 'post' | 'delete', failureCount: number, finalResponse: any): this {
    let callCount = 0;
    this.mockClient[method].mockImplementation((url: string) => {
      if (url.includes(endpoint)) {
        callCount++;
        if (callCount <= failureCount) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve(finalResponse);
      }
      return Promise.resolve({ data: {} });
    });
    return this;
  }

  /**
   * QPS制御シナリオ設定
   */
  withQPSControlledResponses(responseDelay: number = 100): this {
    const originalImplementations = {
      get: this.mockClient.get,
      post: this.mockClient.post,
      delete: this.mockClient.delete
    };

    ['get', 'post', 'delete'].forEach(method => {
      this.mockClient[method as keyof HttpClient] = jest.fn().mockImplementation(
        async (...args: any[]) => {
          await new Promise(resolve => setTimeout(resolve, responseDelay));
          return originalImplementations[method as keyof typeof originalImplementations]?.(...args) || { data: {} };
        }
      );
    });

    return this;
  }

  /**
   * 完成したモッククライアントを取得
   */
  build(): jest.Mocked<HttpClient> {
    // デフォルトレスポンス設定
    if (!this.mockClient.get.getMockImplementation()) {
      this.mockClient.get.mockResolvedValue({ data: {} });
    }
    if (!this.mockClient.post.getMockImplementation()) {
      this.mockClient.post.mockResolvedValue({ data: {} });
    }
    if (!this.mockClient.delete.getMockImplementation()) {
      this.mockClient.delete.mockResolvedValue({ data: {} });
    }

    return this.mockClient;
  }
}

/**
 * TestScenarioBuilder - 複雑なテストシナリオ作成
 * マルチステップテストフローの構築・管理
 */
export class TestScenarioBuilder {
  private steps: Array<{
    name: string;
    action: () => Promise<any>;
    validation: (result: any) => boolean;
    onError?: (error: any) => void;
  }> = [];

  /**
   * テストステップ追加
   */
  addStep(name: string, action: () => Promise<any>, validation: (result: any) => boolean): this {
    this.steps.push({ name, action, validation });
    return this;
  }

  /**
   * エラーハンドリング付きステップ追加
   */
  addStepWithErrorHandling(
    name: string,
    action: () => Promise<any>,
    validation: (result: any) => boolean,
    onError: (error: any) => void
  ): this {
    this.steps.push({ name, action, validation, onError });
    return this;
  }

  /**
   * 投稿→いいね→リツイートフロー
   */
  addEngagementFlow(
    postAction: () => Promise<any>,
    likeAction: (tweetId: string) => Promise<any>,
    retweetAction: (tweetId: string) => Promise<any>
  ): this {
    return this
      .addStep('投稿作成', postAction, (result) => result.success && result.tweetId)
      .addStep('いいね実行', async () => {
        const postResult = await postAction();
        return likeAction(postResult.tweetId);
      }, (result) => result.success && result.action === 'like')
      .addStep('リツイート実行', async () => {
        const postResult = await postAction();
        return retweetAction(postResult.tweetId);
      }, (result) => result.success && result.action === 'retweet');
  }

  /**
   * ユーザー検索→詳細取得→フォローフロー
   */
  addUserDiscoveryFlow(
    searchAction: () => Promise<any>,
    getUserAction: (username: string) => Promise<any>,
    followAction: (userId: string) => Promise<any>
  ): this {
    return this
      .addStep('ユーザー検索', searchAction, (result) => result.success && result.users.length > 0)
      .addStep('ユーザー詳細取得', async () => {
        const searchResult = await searchAction();
        return getUserAction(searchResult.users[0].username);
      }, (result) => result.success && result.user)
      .addStep('ユーザーフォロー', async () => {
        const searchResult = await searchAction();
        return followAction(searchResult.users[0].id);
      }, (result) => result.success && result.following);
  }

  /**
   * シナリオ実行
   */
  async execute(): Promise<{
    success: boolean;
    results: any[];
    failedStep?: string;
    error?: any;
  }> {
    const results: any[] = [];

    for (const step of this.steps) {
      try {
        const result = await step.action();
        results.push(result);

        if (!step.validation(result)) {
          return {
            success: false,
            results,
            failedStep: step.name,
            error: `Validation failed for step: ${step.name}`
          };
        }
      } catch (error) {
        if (step.onError) {
          step.onError(error);
        }
        return {
          success: false,
          results,
          failedStep: step.name,
          error
        };
      }
    }

    return { success: true, results };
  }
}

/**
 * AsyncTestHelper - 非同期操作・タイミング制御
 * Promise制御・並行処理・タイムアウト管理
 */
export class AsyncTestHelper {
  /**
   * 指定時間待機
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * タイムアウト付きPromise実行
   */
  static async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * 並行実行制御（同時実行数制限）
   */
  static async executeConcurrently<T>(
    tasks: (() => Promise<T>)[],
    concurrencyLimit: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const promise = task().then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= concurrencyLimit) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * 順次実行（各実行間に遅延）
   */
  static async executeSequentially<T>(
    tasks: (() => Promise<T>)[],
    delayMs: number = 100
  ): Promise<T[]> {
    const results: T[] = [];

    for (const task of tasks) {
      const result = await task();
      results.push(result);
      if (delayMs > 0) {
        await this.wait(delayMs);
      }
    }

    return results;
  }

  /**
   * 条件待ち（ポーリング）
   */
  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    options: {
      timeoutMs?: number;
      intervalMs?: number;
      timeoutMessage?: string;
    } = {}
  ): Promise<void> {
    const { timeoutMs = 5000, intervalMs = 100, timeoutMessage = 'Condition not met within timeout' } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const result = await condition();
      if (result) {
        return;
      }
      await this.wait(intervalMs);
    }

    throw new Error(timeoutMessage);
  }

  /**
   * リトライ機能付き実行
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      backoffMs?: number;
      retryCondition?: (error: any) => boolean;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, backoffMs = 1000, retryCondition = () => true } = options;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries || !retryCondition(error)) {
          throw error;
        }

        await this.wait(backoffMs * Math.pow(2, attempt)); // Exponential backoff
      }
    }

    throw lastError;
  }
}

/**
 * ValidationHelper - TwitterAPI.io特化バリデーション
 * API固有のデータ構造・形式検証
 */
export class ValidationHelper {
  /**
   * TwitterAPI.io Tweet形式検証
   */
  static validateTweetData(tweet: any): tweet is TweetData {
    return (
      typeof tweet === 'object' &&
      typeof tweet.id === 'string' &&
      typeof tweet.text === 'string' &&
      typeof tweet.author_id === 'string' &&
      typeof tweet.created_at === 'string' &&
      this.validateISODateString(tweet.created_at)
    );
  }

  /**
   * TwitterAPI.io User形式検証
   */
  static validateUserData(user: any): user is UserData {
    return (
      typeof user === 'object' &&
      typeof user.id === 'string' &&
      typeof user.username === 'string' &&
      typeof user.name === 'string' &&
      typeof user.verified === 'boolean' &&
      (user.public_metrics ? this.validateUserMetrics(user.public_metrics) : true)
    );
  }

  /**
   * TwitterAPI.io Error形式検証  
   */
  static validateTwitterAPIError(error: any): error is TwitterAPIError {
    return (
      typeof error === 'object' &&
      typeof error.code === 'string' &&
      typeof error.message === 'string' &&
      typeof error.type === 'string' &&
      typeof error.status === 'number'
    );
  }

  /**
   * ユーザーメトリクス検証
   */
  static validateUserMetrics(metrics: any): boolean {
    return (
      typeof metrics === 'object' &&
      typeof metrics.followers_count === 'number' &&
      typeof metrics.following_count === 'number' &&
      typeof metrics.tweet_count === 'number' &&
      metrics.followers_count >= 0 &&
      metrics.following_count >= 0 &&
      metrics.tweet_count >= 0
    );
  }

  /**
   * ツイートメトリクス検証
   */
  static validateTweetMetrics(metrics: any): boolean {
    return (
      typeof metrics === 'object' &&
      typeof metrics.retweet_count === 'number' &&
      typeof metrics.like_count === 'number' &&
      typeof metrics.quote_count === 'number' &&
      typeof metrics.reply_count === 'number' &&
      metrics.retweet_count >= 0 &&
      metrics.like_count >= 0 &&
      metrics.quote_count >= 0 &&
      metrics.reply_count >= 0
    );
  }

  /**
   * 検索レスポンス形式検証
   */
  static validateSearchResponse(response: any): boolean {
    return (
      typeof response === 'object' &&
      typeof response.success === 'boolean' &&
      Array.isArray(response.tweets || response.users) &&
      (response.nextToken === undefined || typeof response.nextToken === 'string')
    );
  }

  /**
   * API制限値検証
   */
  static validateAPILimits(params: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // ツイート文字数制限
    if (params.text && params.text.length > 280) {
      errors.push('Tweet content exceeds 280 characters');
    }

    // 検索結果数制限
    if (params.maxResults && params.maxResults > 100) {
      errors.push('maxResults cannot exceed 100');
    }

    // ユーザー名長制限
    if (params.username && params.username.length > 15) {
      errors.push('Username cannot exceed 15 characters');
    }

    // メディア添付数制限
    if (params.mediaIds && params.mediaIds.length > 4) {
      errors.push('Cannot attach more than 4 media items');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * レート制限ヘッダー検証
   */
  static validateRateLimitHeaders(headers: any): boolean {
    return (
      typeof headers === 'object' &&
      typeof headers['x-rate-limit-limit'] === 'string' &&
      typeof headers['x-rate-limit-remaining'] === 'string' &&
      typeof headers['x-rate-limit-reset'] === 'string'
    );
  }

  private static validateISODateString(dateStr: string): boolean {
    if (typeof dateStr !== 'string') {
      return false;
    }
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && dateStr === date.toISOString();
  }
}

/**
 * PerformanceMonitor - パフォーマンス測定・監視
 * 実行時間・メモリ使用量・スループット測定
 */
export class PerformanceMonitor {
  private metrics: Map<string, {
    executionTimes: number[];
    memoryUsage: number[];
    startTime?: number;
    operationCount: number;
  }> = new Map();

  /**
   * パフォーマンス測定開始
   */
  startMeasurement(operationName: string): void {
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, {
        executionTimes: [],
        memoryUsage: [],
        operationCount: 0
      });
    }

    const metric = this.metrics.get(operationName)!;
    metric.startTime = Date.now();
    metric.memoryUsage.push(process.memoryUsage().heapUsed);
  }

  /**
   * パフォーマンス測定終了
   */
  endMeasurement(operationName: string): void {
    const metric = this.metrics.get(operationName);
    if (!metric || !metric.startTime) {
      throw new Error(`No active measurement for operation: ${operationName}`);
    }

    const executionTime = Date.now() - metric.startTime;
    metric.executionTimes.push(executionTime);
    metric.operationCount++;
    delete metric.startTime;
  }

  /**
   * 関数の実行時間測定
   */
  async measureFunction<T>(
    operationName: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; executionTime: number; memoryUsed: number }> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await fn();
      const executionTime = Date.now() - startTime;
      const memoryUsed = process.memoryUsage().heapUsed - startMemory;

      // メトリクス記録
      if (!this.metrics.has(operationName)) {
        this.metrics.set(operationName, { executionTimes: [], memoryUsage: [], operationCount: 0 });
      }
      
      const metric = this.metrics.get(operationName)!;
      metric.executionTimes.push(executionTime);
      metric.memoryUsage.push(memoryUsed);
      metric.operationCount++;

      return { result, executionTime, memoryUsed };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * スループット測定
   */
  async measureThroughput<T>(
    operationName: string,
    operations: (() => Promise<T>)[],
    concurrency: number = 1
  ): Promise<{
    results: T[];
    totalTime: number;
    throughput: number; // operations per second
    averageResponseTime: number;
  }> {
    const startTime = Date.now();
    const results: T[] = [];

    if (concurrency === 1) {
      // 順次実行
      for (const operation of operations) {
        const result = await operation();
        results.push(result);
      }
    } else {
      // 並行実行
      const chunks = this.chunkArray(operations, concurrency);
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(chunk.map(op => op()));
        results.push(...chunkResults);
      }
    }

    const totalTime = Date.now() - startTime;
    const throughput = (operations.length / totalTime) * 1000; // ops/sec
    const averageResponseTime = totalTime / operations.length;

    return { results, totalTime, throughput, averageResponseTime };
  }

  /**
   * メトリクス統計取得
   */
  getStatistics(operationName: string): {
    averageExecutionTime: number;
    minExecutionTime: number;
    maxExecutionTime: number;
    totalOperations: number;
    averageMemoryUsage: number;
    throughput?: number;
  } | null {
    const metric = this.metrics.get(operationName);
    if (!metric || metric.executionTimes.length === 0) {
      return null;
    }

    const executionTimes = metric.executionTimes;
    const memoryUsage = metric.memoryUsage;

    return {
      averageExecutionTime: executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
      minExecutionTime: Math.min(...executionTimes),
      maxExecutionTime: Math.max(...executionTimes),
      totalOperations: metric.operationCount,
      averageMemoryUsage: memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length,
      throughput: metric.operationCount > 0 ? (metric.operationCount / (Date.now() / 1000)) : undefined
    };
  }

  /**
   * 全メトリクスリセット
   */
  reset(): void {
    this.metrics.clear();
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

/**
 * TestEnvironmentHelper - テスト環境管理
 * 環境変数・設定・クリーンアップ管理
 */
export class TestEnvironmentHelper {
  private originalEnv: Record<string, string | undefined> = {};
  private cleanupTasks: (() => void | Promise<void>)[] = [];

  /**
   * テスト用環境変数設定
   */
  setEnvironmentVariable(key: string, value: string): void {
    if (!(key in this.originalEnv)) {
      this.originalEnv[key] = process.env[key];
    }
    process.env[key] = value;
  }

  /**
   * TwitterAPI.io テスト環境設定
   */
  setupTwitterAPITestEnvironment(): void {
    this.setEnvironmentVariable('NODE_ENV', 'test');
    this.setEnvironmentVariable('KAITO_API_KEY', 'test-api-key');
    this.setEnvironmentVariable('KAITO_QPS_LIMIT', '10');
    this.setEnvironmentVariable('KAITO_COST_TRACKING', 'true');
    this.setEnvironmentVariable('KAITO_RETRY_MAX', '2');
    this.setEnvironmentVariable('KAITO_TIMEOUT', '5000');
  }

  /**
   * モック専用環境設定
   */
  setupMockEnvironment(): void {
    this.setEnvironmentVariable('KAITO_USE_MOCK', 'true');
    this.setEnvironmentVariable('KAITO_REAL_API_DISABLED', 'true');
    this.setEnvironmentVariable('KAITO_MOCK_DELAY', '100');
  }

  /**
   * パフォーマンステスト環境設定
   */
  setupPerformanceTestEnvironment(): void {
    this.setEnvironmentVariable('NODE_ENV', 'test');
    this.setEnvironmentVariable('KAITO_QPS_LIMIT', '100');
    this.setEnvironmentVariable('KAITO_ENABLE_METRICS', 'true');
    this.setEnvironmentVariable('KAITO_LOG_LEVEL', 'error'); // ログ最小化
  }

  /**
   * クリーンアップタスク登録
   */
  addCleanupTask(task: () => void | Promise<void>): void {
    this.cleanupTasks.push(task);
  }

  /**
   * 環境復元・クリーンアップ実行
   */
  async cleanup(): Promise<void> {
    // 環境変数復元
    for (const [key, originalValue] of Object.entries(this.originalEnv)) {
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    }
    this.originalEnv = {};

    // クリーンアップタスク実行
    for (const task of this.cleanupTasks) {
      await task();
    }
    this.cleanupTasks = [];
  }

  /**
   * テストタイムアウト設定
   */
  setupTestTimeouts(): void {
    if (typeof jest !== 'undefined') {
      jest.setTimeout(30000); // 30秒
    }
  }

  /**
   * メモリリーク検出設定
   */
  enableMemoryLeakDetection(): void {
    if (global.gc) {
      this.addCleanupTask(() => {
        global.gc();
      });
    }
  }

  /**
   * ファイルシステムクリーンアップ
   */
  setupFileSystemCleanup(tempDirs: string[]): void {
    const fs = require('fs');
    const path = require('path');

    this.addCleanupTask(async () => {
      for (const dir of tempDirs) {
        try {
          if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
          }
        } catch (error) {
          console.warn(`Failed to cleanup directory ${dir}:`, error);
        }
      }
    });
  }
}

// ============================================================================
// 既存のヘルパー関数（保持・改良）
// ============================================================================

/**
 * オブジェクトの構造検証ヘルパー
 * 期待されるキーが全て存在するかチェック
 */
export const validateResponseStructure = (obj: any, expectedKeys: string[]): boolean => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  return expectedKeys.every(key => obj.hasOwnProperty(key));
};

/**
 * 深い構造検証ヘルパー
 * ネストしたオブジェクトの構造チェック
 */
export const validateNestedStructure = (obj: any, structure: any): boolean => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  for (const key in structure) {
    if (!obj.hasOwnProperty(key)) {
      return false;
    }

    if (typeof structure[key] === 'object' && structure[key] !== null) {
      if (!validateNestedStructure(obj[key], structure[key])) {
        return false;
      }
    }
  }

  return true;
};

/**
 * 型チェックヘルパー
 * 値の型が期待される型と一致するかチェック
 */
export const validateTypes = (obj: any, typeMap: { [key: string]: string }): boolean => {
  for (const key in typeMap) {
    if (!obj.hasOwnProperty(key)) {
      return false;
    }

    const expectedType = typeMap[key];
    const actualType = typeof obj[key];

    if (expectedType === 'array') {
      if (!Array.isArray(obj[key])) {
        return false;
      }
    } else if (actualType !== expectedType) {
      return false;
    }
  }

  return true;
};

/**
 * 範囲チェックヘルパー
 * 数値が指定された範囲内にあるかチェック
 */
export const validateRange = (value: number, min: number, max: number): boolean => {
  return typeof value === 'number' && value >= min && value <= max;
};

/**
 * 配列内容検証ヘルパー
 * 配列の全要素が条件を満たすかチェック
 */
export const validateArrayContents = <T>(
  array: T[], 
  validator: (item: T) => boolean
): boolean => {
  return Array.isArray(array) && array.every(validator);
};

/**
 * 文字列長検証ヘルパー
 * 文字列が指定された長さ制限内にあるかチェック
 */
export const validateStringLength = (str: string, maxLength: number, minLength: number = 0): boolean => {
  return typeof str === 'string' && str.length >= minLength && str.length <= maxLength;
};

/**
 * テストタイムアウト作成ヘルパー
 * 指定時間後にresolveするPromise
 */
export const createTestTimeout = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * ランダム値生成ヘルパー
 * テスト用のランダムな値を生成
 */
export const generateRandomValue = {
  string: (length: number = 10): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  number: (min: number = 0, max: number = 100): number => {
    return Math.random() * (max - min) + min;
  },

  boolean: (): boolean => {
    return Math.random() < 0.5;
  },

  array: <T>(generator: () => T, length: number = 5): T[] => {
    return Array.from({ length }, generator);
  }
};

/**
 * エラーテストヘルパー
 * 非同期関数がエラーを投げることを検証
 */
export const expectAsyncError = async (
  asyncFn: () => Promise<any>, 
  expectedErrorMessage?: string
): Promise<Error> => {
  try {
    await asyncFn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (expectedErrorMessage && (error as Error).message !== expectedErrorMessage) {
      throw new Error(`Expected error message "${expectedErrorMessage}", got "${(error as Error).message}"`);
    }
    return error as Error;
  }
};

/**
 * パフォーマンステストヘルパー
 * 関数の実行時間を測定
 */
export const measureExecutionTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; executionTime: number }> => {
  const startTime = Date.now();
  const result = await fn();
  const executionTime = Date.now() - startTime;
  
  return { result, executionTime };
};

/**
 * モック呼び出し検証ヘルパー
 * Vitestモックが期待通りに呼び出されたかチェック
 */
export const validateMockCalls = (
  mockFn: any, // Vitest MockedFunction
  expectedCalls: any[][]
): boolean => {
  if (mockFn.mock.calls.length !== expectedCalls.length) {
    return false;
  }

  return mockFn.mock.calls.every((call, index) => {
    const expectedCall = expectedCalls[index];
    return call.length === expectedCall.length && 
           call.every((arg, argIndex) => 
             JSON.stringify(arg) === JSON.stringify(expectedCall[argIndex])
           );
  });
};

/**
 * 日付文字列検証ヘルパー
 * ISO形式の日付文字列が有効かチェック
 */
export const validateISODateString = (dateStr: string): boolean => {
  if (typeof dateStr !== 'string') {
    return false;
  }

  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr === date.toISOString();
};

/**
 * オブジェクト比較ヘルパー
 * 2つのオブジェクトが深い等価性を持つかチェック
 */
export const deepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) {
    return true;
  }

  if (obj1 == null || obj2 == null) {
    return false;
  }

  if (typeof obj1 !== typeof obj2) {
    return false;
  }

  if (typeof obj1 !== 'object') {
    return obj1 === obj2;
  }

  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  return keys1.every(key => 
    keys2.includes(key) && deepEqual(obj1[key], obj2[key])
  );
};

/**
 * 部分マッチング検証ヘルパー
 * オブジェクトが部分的に一致するかチェック
 */
export const partialMatch = (actual: any, expected: any): boolean => {
  if (expected == null) {
    return true;
  }

  if (actual == null) {
    return false;
  }

  if (typeof expected !== 'object') {
    return actual === expected;
  }

  return Object.keys(expected).every(key => {
    if (!actual.hasOwnProperty(key)) {
      return false;
    }

    if (typeof expected[key] === 'object' && expected[key] !== null) {
      return partialMatch(actual[key], expected[key]);
    }

    return actual[key] === expected[key];
  });
};

/**
 * 正規表現テストヘルパー
 * 文字列が期待されるパターンに一致するかチェック
 */
export const matchesPattern = (str: string, pattern: RegExp): boolean => {
  return typeof str === 'string' && pattern.test(str);
};

/**
 * 配列順序検証ヘルパー
 * 配列が期待される順序でソートされているかチェック
 */
export const validateArrayOrder = <T>(
  array: T[], 
  compareFn: (a: T, b: T) => number
): boolean => {
  if (!Array.isArray(array) || array.length <= 1) {
    return true;
  }

  for (let i = 1; i < array.length; i++) {
    if (compareFn(array[i - 1], array[i]) > 0) {
      return false;
    }
  }

  return true;
};