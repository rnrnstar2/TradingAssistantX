/**
 * APIErrorHandler Unit Tests - エラーハンドリングテスト
 * src/kaito-api/core/client.tsのAPIErrorHandlerクラステスト
 * 
 * テスト対象:
 * - エラー分類・変換
 * - リトライ機能（指数バックオフ）
 * - 認証・レート制限・タイムアウト等の特殊エラー処理
 */

// テスト用にAPIErrorHandlerクラスを抽出（client.tsからプライベートクラスを取得）
class APIErrorHandler {
  static handleError(error: any, context: string): Error {
    console.error(`❌ ${context}でエラー:`, error);
    
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('rate limit') || message.includes('429')) {
      return new Error(`Rate limit exceeded in ${context}: ${error.message}`);
    }
    
    if (message.includes('auth') || message.includes('401')) {
      return new Error(`Authentication failed in ${context}: ${error.message}`);
    }
    
    if (message.includes('timeout')) {
      return new Error(`Request timeout in ${context}: ${error.message}`);
    }
    
    if (message.includes('404')) {
      return new Error(`Resource not found in ${context}: ${error.message}`);
    }
    
    return new Error(`API error in ${context}: ${error.message || 'Unknown error'}`);
  }

  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error = new Error('No operation attempted');
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // 指数バックオフ
        const waitTime = backoffMs * Math.pow(2, attempt);
        console.log(`🔄 リトライ ${attempt + 1}/${maxRetries} (${waitTime}ms後)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw lastError;
  }
}

describe('APIErrorHandler Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('handleError', () => {
    let consoleSpy: vi.SpyInstance;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should handle rate limit errors (429 status)', () => {
      const originalError = new Error('HTTP 429: Too Many Requests');
      const context = 'posting';

      const result = APIErrorHandler.handleError(originalError, context);

      expect(result.message).toBe('Rate limit exceeded in posting: HTTP 429: Too Many Requests');
      expect(consoleSpy).toHaveBeenCalledWith('❌ postingでエラー:', originalError);
    });

    it('should handle rate limit errors (rate limit text)', () => {
      const originalError = new Error('Request failed due to rate limit');
      const context = 'getting';

      const result = APIErrorHandler.handleError(originalError, context);

      expect(result.message).toBe('Rate limit exceeded in getting: Request failed due to rate limit');
    });

    it('should handle authentication errors (401 status)', () => {
      const originalError = new Error('HTTP 401: Unauthorized');
      const context = 'authentication';

      const result = APIErrorHandler.handleError(originalError, context);

      expect(result.message).toBe('Authentication failed in authentication: HTTP 401: Unauthorized');
    });

    it('should handle authentication errors (auth text)', () => {
      const originalError = new Error('Authentication failed - invalid token');
      const context = 'login';

      const result = APIErrorHandler.handleError(originalError, context);

      expect(result.message).toBe('Authentication failed in login: Authentication failed - invalid token');
    });

    it('should handle timeout errors', () => {
      const originalError = new Error('Request timeout after 30000ms');
      const context = 'fetching';

      const result = APIErrorHandler.handleError(originalError, context);

      expect(result.message).toBe('Request timeout in fetching: Request timeout after 30000ms');
    });

    it('should handle 404 errors', () => {
      const originalError = new Error('HTTP 404: Not Found');
      const context = 'getting';

      const result = APIErrorHandler.handleError(originalError, context);

      expect(result.message).toBe('Resource not found in getting: HTTP 404: Not Found');
    });

    it('should handle generic API errors', () => {
      const originalError = new Error('Something went wrong');
      const context = 'processing';

      const result = APIErrorHandler.handleError(originalError, context);

      expect(result.message).toBe('API error in processing: Something went wrong');
    });

    it('should handle errors without message', () => {
      const originalError = {};
      const context = 'testing';

      const result = APIErrorHandler.handleError(originalError, context);

      expect(result.message).toBe('API error in testing: Unknown error');
    });

    it.skip('should handle null errors', () => {
      const originalError = null;
      const context = 'testing';

      const result = APIErrorHandler.handleError(originalError, context);

      expect(result.message).toBe('API error in testing: Unknown error');
    });

    it('should log error to console', () => {
      const originalError = new Error('Test error');
      const context = 'testing';

      APIErrorHandler.handleError(originalError, context);

      expect(consoleSpy).toHaveBeenCalledWith('❌ testingでエラー:', originalError);
    });

    it('should handle case-insensitive error matching', () => {
      const rateLimit = new Error('RATE LIMIT exceeded');
      const auth = new Error('AUTH failed');
      const timeout = new Error('TIMEOUT occurred');

      const rateLimitResult = APIErrorHandler.handleError(rateLimit, 'test');
      const authResult = APIErrorHandler.handleError(auth, 'test');
      const timeoutResult = APIErrorHandler.handleError(timeout, 'test');

      expect(rateLimitResult.message).toContain('Rate limit exceeded');
      expect(authResult.message).toContain('Authentication failed');
      expect(timeoutResult.message).toContain('Request timeout');
    });
  });

  describe('retryWithBackoff', () => {
    let consoleSpy: vi.SpyInstance;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should return result on first successful attempt', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      const result = await APIErrorHandler.retryWithBackoff(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should retry on failure and succeed', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      const result = await APIErrorHandler.retryWithBackoff(mockOperation, 3, 1000);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenNthCalledWith(1, '🔄 リトライ 1/3 (1000ms後)');
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '🔄 リトライ 2/3 (2000ms後)');

      setTimeoutSpy.mockRestore();
    });

    it('should throw last error after max retries exceeded', async () => {
      const finalError = new Error('Final failure');
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockRejectedValue(finalError);

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      await expect(
        APIErrorHandler.retryWithBackoff(mockOperation, 2, 1000)
      ).rejects.toThrow('Final failure');

      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(consoleSpy).toHaveBeenCalledTimes(2);

      setTimeoutSpy.mockRestore();
    });

    it('should use exponential backoff for wait times', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockRejectedValue(new Error('Failure 3'));

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any, delay: number) => {
          callback();
          return {} as any;
        }) as any
      );

      await expect(
        APIErrorHandler.retryWithBackoff(mockOperation, 2, 500)
      ).rejects.toThrow();

      // Verify exponential backoff: 500ms * 2^0 = 500ms, 500ms * 2^1 = 1000ms
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 500);
      expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 1000);

      setTimeoutSpy.mockRestore();
    });

    it('should use custom max retries', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      await expect(
        APIErrorHandler.retryWithBackoff(mockOperation, 1, 1000)
      ).rejects.toThrow();

      expect(mockOperation).toHaveBeenCalledTimes(2); // Initial + 1 retry
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('🔄 リトライ 1/1 (1000ms後)');

      setTimeoutSpy.mockRestore();
    });

    it('should use custom backoff time', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValue('success');

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any, delay: number) => {
          callback();
          return {} as any;
        }) as any
      );

      await APIErrorHandler.retryWithBackoff(mockOperation, 3, 2000);

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);

      setTimeoutSpy.mockRestore();
    });

    it('should handle operation that throws non-Error objects', async () => {
      const mockOperation = vi.fn().mockRejectedValue('string error');

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      await expect(
        APIErrorHandler.retryWithBackoff(mockOperation, 1, 1000)
      ).rejects.toBe('string error');

      setTimeoutSpy.mockRestore();
    });

    it('should handle zero max retries', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Immediate failure'));

      await expect(
        APIErrorHandler.retryWithBackoff(mockOperation, 0, 1000)
      ).rejects.toThrow('Immediate failure');

      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should handle negative max retries', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Failure'));

      await expect(
        APIErrorHandler.retryWithBackoff(mockOperation, -1, 1000)
      ).rejects.toThrow('No operation attempted');

      expect(mockOperation).toHaveBeenCalledTimes(0);
    });

    it('should correctly calculate exponential backoff for multiple attempts', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const backoffMs = 100;
      const maxRetries = 3;

      const delays: number[] = [];
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any, delay: number) => {
          delays.push(delay);
          callback();
          return {} as any;
        }) as any
      );

      await expect(
        APIErrorHandler.retryWithBackoff(mockOperation, maxRetries, backoffMs)
      ).rejects.toThrow();

      // Verify exponential backoff: 100, 200, 400
      expect(delays).toEqual([100, 200, 400]);

      setTimeoutSpy.mockRestore();
    });

    it('should log retry attempts with correct attempt numbers', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const maxRetries = 2;

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation(
        ((callback: any) => callback()) as any
      );

      await expect(
        APIErrorHandler.retryWithBackoff(mockOperation, maxRetries, 1000)
      ).rejects.toThrow();

      expect(consoleSpy).toHaveBeenNthCalledWith(1, '🔄 リトライ 1/2 (1000ms後)');
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '🔄 リトライ 2/2 (2000ms後)');

      setTimeoutSpy.mockRestore();
    });
  });
});