import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResponseHandler, createEducationalResponseHandler, validateResponseSafety, getErrorSeverity } from '@/kaito-api/utils/response-handler';
import { RateLimitError, NetworkError } from '@/kaito-api/utils/errors';

describe('ResponseHandler', () => {
  let handler: ResponseHandler;

  beforeEach(() => {
    handler = new ResponseHandler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleResponse', () => {
    it('成功レスポンスを正しく処理する', async () => {
      const mockResponse = {
        data: { id: '123', text: 'test tweet' },
        headers: {}
      };
      const mockPromise = Promise.resolve(mockResponse);

      const result = await handler.handleResponse(mockPromise, {
        endpoint: '/test',
        method: 'GET'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.requestId).toBeDefined();
      expect(result.metadata.processingTime).toBeTypeOf('number');
    });

    it('レート制限エラーを適切に処理する', async () => {
      const mockError = {
        status: 429,
        headers: { 'retry-after': '60' }
      };
      const mockPromise = Promise.reject(mockError);

      const result = await handler.handleResponse(mockPromise, {
        endpoint: '/test',
        method: 'POST'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('rate_limit');
      expect(result.error?.retryable).toBe(true);
      expect(result.error?.retryAfter).toBe(60000); // 秒からミリ秒に変換
    });

    it('ネットワークエラーをリトライ可能として処理する', async () => {
      const mockError = {
        code: 'ECONNRESET',
        message: 'Connection reset'
      };
      const mockPromise = Promise.reject(mockError);

      const result = await handler.handleResponse(mockPromise, {
        endpoint: '/test',
        method: 'GET'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('network_error');
      expect(result.error?.retryable).toBe(true);
      expect(result.error?.code).toBe('ECONNRESET');
    });

    it('教育システム向け安全チェックが機能する', async () => {
      const mockResponse = {
        data: 'スパムコンテンツが含まれています',
        headers: {}
      };
      const mockPromise = Promise.resolve(mockResponse);

      const result = await handler.handleResponse(mockPromise, {
        endpoint: '/test',
        method: 'GET',
        educational: true
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('validation_error');
      expect(result.error?.message).toContain('教育システム安全基準');
    });

    it('レート制限情報を正しく抽出する', async () => {
      const mockResponse = {
        data: { test: 'data' },
        headers: {
          'x-rate-limit-limit': '100',
          'x-rate-limit-remaining': '95',
          'x-rate-limit-reset': '2023-01-01T00:00:00Z'
        }
      };
      const mockPromise = Promise.resolve(mockResponse);

      const result = await handler.handleResponse(mockPromise, {
        endpoint: '/test',
        method: 'GET'
      });

      expect(result.success).toBe(true);
      expect(result.metadata.rateLimitStatus).toBeDefined();
      expect(result.metadata.rateLimitStatus?.limit).toBe(100);
      expect(result.metadata.rateLimitStatus?.remaining).toBe(95);
    });

    it('HTTP 401エラーを認証エラーとして処理する', async () => {
      const mockError = {
        status: 401,
        message: 'Unauthorized'
      };
      const mockPromise = Promise.reject(mockError);

      const result = await handler.handleResponse(mockPromise, {
        endpoint: '/test',
        method: 'POST'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('auth_error');
      expect(result.error?.retryable).toBe(false);
    });
  });

  describe('executeWithRetry', () => {
    it('指定回数リトライする', async () => {
      let attempts = 0;
      const mockApiCall = vi.fn(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ data: 'success' });
      });

      const result = await handler.executeWithRetry(mockApiCall, {
        endpoint: '/test',
        method: 'GET'
      });

      expect(mockApiCall).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });

    it('バックオフが正しく動作する', async () => {
      const startTime = Date.now();
      let callTimes: number[] = [];
      
      const mockApiCall = vi.fn(() => {
        callTimes.push(Date.now());
        return Promise.reject({
          status: 500,
          message: 'Server error'
        });
      });

      await handler.executeWithRetry(mockApiCall, {
        endpoint: '/test',
        method: 'GET'
      });

      // 2回目以降の呼び出し間隔を確認
      for (let i = 1; i < callTimes.length; i++) {
        const delay = callTimes[i] - callTimes[i - 1];
        expect(delay).toBeGreaterThan(800); // 1000ms * 2^(i-1) の約80%以上
      }
    });

    it('最大リトライ回数に達した場合エラーを返す', async () => {
      const mockApiCall = vi.fn(() => 
        Promise.reject(new Error('Persistent error'))
      );

      const result = await handler.executeWithRetry(mockApiCall, {
        endpoint: '/test',
        method: 'GET'
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('最大リトライ回数');
      expect(mockApiCall).toHaveBeenCalledTimes(4); // 初回 + 3回リトライ
    });

    it('リトライ不可能なエラーの場合は即座に返す', async () => {
      const mockApiCall = vi.fn(() => 
        Promise.reject({
          status: 401,
          message: 'Unauthorized'
        })
      );

      const result = await handler.executeWithRetry(mockApiCall, {
        endpoint: '/test',
        method: 'GET'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('auth_error');
      expect(mockApiCall).toHaveBeenCalledTimes(1); // リトライしない
    });
  });

  describe('respectRateLimit', () => {
    it('レート制限に従って待機する', async () => {
      const startTime = Date.now();
      const rateLimitInfo = {
        remaining: 0,
        limit: 100,
        resetTime: Date.now() + 5000,
        retryAfter: 2000 // 2秒待機
      };

      await handler.respectRateLimit(rateLimitInfo);

      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeGreaterThanOrEqual(1900); // 約2秒待機
    });

    it('残り回数が少ない場合は予防的に待機する', async () => {
      const startTime = Date.now();
      const rateLimitInfo = {
        remaining: 5,
        limit: 100,
        resetTime: Date.now() + 60000,
        retryAfter: undefined
      };

      await handler.respectRateLimit(rateLimitInfo);

      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeGreaterThan(0); // 何らかの待機が発生
    });

    it('十分な残り回数がある場合は待機しない', async () => {
      const startTime = Date.now();
      const rateLimitInfo = {
        remaining: 50,
        limit: 100,
        resetTime: Date.now() + 60000,
        retryAfter: undefined
      };

      await handler.respectRateLimit(rateLimitInfo);

      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeLessThan(100); // ほぼ即座に完了
    });

    it('15分を超える待機時間は制限される', async () => {
      const startTime = Date.now();
      const rateLimitInfo = {
        remaining: 0,
        limit: 100,
        resetTime: Date.now() + 20 * 60 * 1000, // 20分後
        retryAfter: 20 * 60 * 1000 // 20分待機
      };

      await handler.respectRateLimit(rateLimitInfo);

      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeLessThan(16 * 60 * 1000); // 16分未満
      expect(elapsedTime).toBeGreaterThan(14 * 60 * 1000); // 14分以上
    });
  });

  describe('performHealthCheck', () => {
    it('初期状態では健全性チェックが成功する', async () => {
      const health = await handler.performHealthCheck();

      expect(health.healthy).toBe(true);
      expect(health.errorRate).toBe(0);
      expect(health.avgResponseTime).toBe(0);
      expect(health.rateLimitStatus).toBe('ok');
    });

    it('エラー率が高い場合は健全でないと判定する', async () => {
      // エラーを発生させるためのテストリクエストを実行
      for (let i = 0; i < 5; i++) {
        await handler.handleResponse(
          Promise.reject(new Error('Test error')),
          { endpoint: '/test', method: 'GET' }
        );
      }

      const health = await handler.performHealthCheck();
      expect(health.healthy).toBe(false);
      expect(health.errorRate).toBeGreaterThan(0.1);
    });
  });

  describe('getErrorStatistics', () => {
    it('エラー統計を正しく追跡する', async () => {
      // 異なるタイプのエラーを発生させる
      await handler.handleResponse(
        Promise.reject({ status: 429 }),
        { endpoint: '/test', method: 'GET' }
      );
      await handler.handleResponse(
        Promise.reject({ code: 'ECONNRESET' }),
        { endpoint: '/test', method: 'GET' }
      );

      const stats = handler.getErrorStatistics();
      expect(stats['rate_limit']).toBe(1);
      expect(stats['network_error']).toBe(1);
    });
  });

  describe('getRequestLog', () => {
    it('リクエストログを正しく記録する', async () => {
      await handler.handleResponse(
        Promise.resolve({ data: 'test' }),
        { endpoint: '/test1', method: 'GET' }
      );
      await handler.handleResponse(
        Promise.resolve({ data: 'test' }),
        { endpoint: '/test2', method: 'POST' }
      );

      const allLogs = handler.getRequestLog();
      expect(allLogs).toHaveLength(2);

      const test1Logs = handler.getRequestLog('/test1');
      expect(test1Logs).toHaveLength(1);
    });

    it('ログは時刻順にソートされる', async () => {
      await handler.handleResponse(
        Promise.resolve({ data: 'test1' }),
        { endpoint: '/test', method: 'GET' }
      );

      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 10));

      await handler.handleResponse(
        Promise.resolve({ data: 'test2' }),
        { endpoint: '/test', method: 'GET' }
      );

      const logs = handler.getRequestLog('/test');
      expect(logs).toHaveLength(2);
      
      const time1 = new Date(logs[0].timestamp).getTime();
      const time2 = new Date(logs[1].timestamp).getTime();
      expect(time2).toBeGreaterThanOrEqual(time1); // 新しい順
    });
  });
});

describe('validateResponseSafety', () => {
  it('有効なレスポンスを安全と判定する', () => {
    const validResponse = { data: 'test', status: 'ok' };
    expect(validateResponseSafety(validResponse)).toBe(true);
  });

  it('null/undefinedを安全でないと判定する', () => {
    expect(validateResponseSafety(null)).toBe(false);
    expect(validateResponseSafety(undefined)).toBe(false);
  });

  it('非オブジェクトを安全でないと判定する', () => {
    expect(validateResponseSafety('string')).toBe(false);
    expect(validateResponseSafety(123)).toBe(false);
  });

  it('サイズが大きすぎるレスポンスを安全でないと判定する', () => {
    const largeResponse = {
      data: 'x'.repeat(10000001) // 10MB超過
    };
    expect(validateResponseSafety(largeResponse)).toBe(false);
  });
});

describe('getErrorSeverity', () => {
  it('レート制限エラーをmediumと判定する', () => {
    const error = {
      code: 'RATE_LIMIT',
      message: 'Rate limit exceeded',
      type: 'rate_limit' as const,
      retryable: true
    };
    expect(getErrorSeverity(error)).toBe('medium');
  });

  it('認証エラーをhighと判定する', () => {
    const error = {
      code: 'AUTH_ERROR',
      message: 'Authentication failed',
      type: 'auth_error' as const,
      retryable: false
    };
    expect(getErrorSeverity(error)).toBe('high');
  });

  it('リトライ可能なネットワークエラーをmediumと判定する', () => {
    const error = {
      code: 'NETWORK_ERROR',
      message: 'Network error',
      type: 'network_error' as const,
      retryable: true
    };
    expect(getErrorSeverity(error)).toBe('medium');
  });

  it('リトライ不可能なネットワークエラーをhighと判定する', () => {
    const error = {
      code: 'NETWORK_ERROR',
      message: 'Network error',
      type: 'network_error' as const,
      retryable: false
    };
    expect(getErrorSeverity(error)).toBe('high');
  });

  it('バリデーションエラーをhighと判定する', () => {
    const error = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      type: 'validation_error' as const,
      retryable: false
    };
    expect(getErrorSeverity(error)).toBe('high');
  });

  it('不明なエラーをmediumと判定する', () => {
    const error = {
      code: 'UNKNOWN',
      message: 'Unknown error',
      type: 'unknown' as const,
      retryable: false
    };
    expect(getErrorSeverity(error)).toBe('medium');
  });
});

describe('createEducationalResponseHandler', () => {
  it('教育システム向けの設定でハンドラーを作成する', () => {
    const handler = createEducationalResponseHandler();
    expect(handler).toBeInstanceOf(ResponseHandler);
  });

  it('教育システム向けハンドラーは慎重な設定を使用する', async () => {
    const handler = createEducationalResponseHandler();
    
    let attempts = 0;
    const mockApiCall = vi.fn(() => {
      attempts++;
      return Promise.reject({ status: 500 });
    });

    const startTime = Date.now();
    await handler.executeWithRetry(mockApiCall, {
      endpoint: '/test',
      method: 'GET'
    });
    const elapsedTime = Date.now() - startTime;

    // 教育システムは慎重な待機時間（2秒基準）を使用
    expect(elapsedTime).toBeGreaterThan(4000); // 最低4秒以上（2秒 + 4秒）
    expect(attempts).toBe(4); // 初回 + 3回リトライ
  });
});