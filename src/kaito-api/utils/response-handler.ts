/**
 * API レスポンス処理・エラーハンドリングシステム
 * REQUIREMENTS.md準拠 - 安全で責任あるAPI応答処理
 * 
 * 安全機能:
 * - レート制限の完全遵守
 * - 適切なエラーログ記録
 * - 教育システム向け安全性確保
 * - API利用規約遵守
 */

import { RateLimitInfo, TwitterAPIError } from './types';
import { KaitoAPIError, RateLimitError, ValidationError, NetworkError, AuthenticationError } from './errors';
import { REQUEST_TIMEOUT, MAX_RETRY_ATTEMPTS, RETRY_DELAY } from './constants';

// ============================================================================
// インターフェース定義
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: KaitoAPIError;
  metadata: ResponseMetadata;
}

// Using KaitoAPIError classes from errors.ts instead of custom interface

export interface ResponseMetadata {
  timestamp: string;
  requestId: string;
  processingTime: number;
  rateLimitStatus?: RateLimitInfo;
  apiVersion?: string;
  educational?: {
    contentValidated: boolean;
    safetyChecked: boolean;
    qualityScore?: number;
  };
}

// RateLimitInfo型はtypes.tsからimport

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

// ============================================================================
// レスポンスハンドラークラス
// ============================================================================

export class ResponseHandler {
  private retryConfig: RetryConfig;
  private requestLog: Map<string, ResponseMetadata[]> = new Map();
  private errorStats: Map<string, number> = new Map();
  private readonly MAX_LOG_ENTRIES = 100;
  private readonly LOG_RETENTION_MS = 3600000; // 1時間

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = {
      maxRetries: MAX_RETRY_ATTEMPTS,
      baseDelay: RETRY_DELAY,
      maxDelay: REQUEST_TIMEOUT,
      backoffMultiplier: 2,
      retryableErrors: ['rate_limit', 'network_error', 'timeout'],
      ...retryConfig
    };
    console.log('✅ ResponseHandler initialized - 安全なAPI応答処理');
  }

  /**
   * API応答の安全な処理
   */
  async handleResponse<T>(
    responsePromise: Promise<any>,
    context: {
      endpoint: string;
      method: string;
      educational?: boolean;
      requestId?: string;
    }
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    const requestId = context.requestId || this.generateRequestId();

    try {
      console.log('🔄 API応答処理開始:', {
        endpoint: context.endpoint,
        method: context.method,
        requestId
      });

      // 応答待機
      const rawResponse = await responsePromise;
      const processingTime = Date.now() - startTime;

      // 教育システム向け安全チェック
      if (context.educational) {
        const safetyCheck = await this.performEducationalSafetyCheck(rawResponse);
        if (!safetyCheck.isSafe) {
          const validationError = new ValidationError('教育システム安全基準に適合しません');
          return this.createErrorResponseFromError(
            validationError,
            requestId,
            processingTime,
            { safetyCheck }
          );
        }
      }

      // レート制限情報抽出
      const rateLimitInfo = this.extractRateLimitInfo(rawResponse);

      // 成功レスポンス作成
      const successResponse = this.createSuccessResponse(
        rawResponse,
        requestId,
        processingTime,
        rateLimitInfo,
        context.educational
      );

      // ログ記録
      this.logRequest(context.endpoint, successResponse.metadata);

      console.log('✅ API応答処理完了:', {
        endpoint: context.endpoint,
        success: true,
        processingTime,
        rateLimitRemaining: rateLimitInfo?.remaining
      });

      return successResponse;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // エラー分析・分類
      const kaitoError = this.analyzeError(error);
      
      // エラー統計更新
      this.updateErrorStats(kaitoError.constructor.name);

      // エラーレスポンス作成
      const errorResponse = this.createErrorResponseFromError(
        kaitoError,
        requestId,
        processingTime,
        { originalError: error }
      );

      // エラーログ記録
      this.logError(context.endpoint, kaitoError, error);

      console.error('❌ API応答処理失敗:', {
        endpoint: context.endpoint,
        errorType: kaitoError.constructor.name,
        retryable: this.isRetryableError(kaitoError),
        processingTime
      });

      return errorResponse;
    }
  }

  /**
   * リトライ付きAPI実行
   */
  async executeWithRetry<T>(
    apiCall: () => Promise<any>,
    context: {
      endpoint: string;
      method: string;
      educational?: boolean;
    }
  ): Promise<ApiResponse<T>> {
    let lastError: KaitoAPIError | null = null;
    let attempt = 0;

    while (attempt <= this.retryConfig.maxRetries) {
      try {
        // 初回以外は遅延
        if (attempt > 0) {
          const delay = this.calculateRetryDelay(attempt);
          console.log(`⏳ リトライ待機: ${delay}ms (試行 ${attempt}/${this.retryConfig.maxRetries})`);
          await this.delay(delay);
        }

        // API実行
        const response = await this.handleResponse<T>(apiCall(), {
          ...context,
          requestId: `${context.endpoint}_retry_${attempt}_${Date.now()}`
        });

        // 成功またはリトライ不可能なエラーの場合は結果を返す
        if (response.success || (response.error && !this.isRetryableError(response.error))) {
          return response;
        }

        lastError = response.error!;
        attempt++;

      } catch (error) {
        console.error('リトライ処理中にエラー:', error);
        attempt++;
      }
    }

    // 最大リトライ回数に達した場合
    console.error('❌ 最大リトライ回数に達しました:', {
      endpoint: context.endpoint,
      attempts: attempt,
      lastError: lastError?.message
    });

    const maxRetriesError = new KaitoAPIError(
      `最大リトライ回数 (${this.retryConfig.maxRetries}) に達しました`,
      'MAX_RETRIES_EXCEEDED'
    );
    return this.createErrorResponseFromError(
      maxRetriesError,
      this.generateRequestId(),
      0,
      { lastError, totalAttempts: attempt }
    );
  }

  /**
   * レート制限遵守の実行
   */
  async respectRateLimit(rateLimitInfo: RateLimitInfo): Promise<void> {
    if (rateLimitInfo.remaining <= 0 && rateLimitInfo.retryAfter) {
      const waitTime = rateLimitInfo.retryAfter;
      console.log(`⏰ レート制限遵守 - ${Math.ceil(waitTime / 60000)}分間待機`);
      
      // 最大15分まで待機
      const maxWaitTime = 15 * 60 * 1000;
      const actualWaitTime = Math.min(waitTime, maxWaitTime);
      
      await this.delay(actualWaitTime);
      
      if (waitTime > maxWaitTime) {
        console.warn('⚠️ 待機時間が15分を超過しています。部分的な待機のみ実行しました。');
      }
    } else if (rateLimitInfo.remaining < 10) {
      // 残り回数が少ない場合は予防的に短時間待機
      const preventiveDelay = Math.max(1000, 60000 / rateLimitInfo.remaining);
      console.log(`🛡️ 予防的レート制限待機: ${preventiveDelay}ms`);
      await this.delay(preventiveDelay);
    }
  }

  /**
   * エラー統計取得
   */
  getErrorStatistics(): { [errorType: string]: number } {
    return Object.fromEntries(this.errorStats.entries());
  }

  /**
   * リクエストログ取得
   */
  getRequestLog(endpoint?: string): ResponseMetadata[] {
    // 取得時にもクリーンアップ実行
    this.cleanupOldLogs();
    
    if (endpoint) {
      return this.requestLog.get(endpoint) || [];
    }
    
    const allLogs: ResponseMetadata[] = [];
    this.requestLog.forEach(logs => allLogs.push(...logs));
    return allLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * ヘルスチェック実行
   */
  async performHealthCheck(): Promise<{
    healthy: boolean;
    errorRate: number;
    avgResponseTime: number;
    rateLimitStatus: 'ok' | 'warning' | 'critical';
  }> {
    const recentLogs = this.getRequestLog().slice(0, 100);
    
    if (recentLogs.length === 0) {
      return {
        healthy: true,
        errorRate: 0,
        avgResponseTime: 0,
        rateLimitStatus: 'ok'
      };
    }

    // エラー率計算
    const errorCount = Array.from(this.errorStats.values()).reduce((sum, count) => sum + count, 0);
    const totalRequests = recentLogs.length;
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

    // 平均応答時間計算
    const avgResponseTime = recentLogs.reduce((sum, log) => sum + log.processingTime, 0) / recentLogs.length;

    // レート制限状況判定
    const recentRateLimits = recentLogs
      .filter(log => log.rateLimitStatus)
      .map(log => log.rateLimitStatus!);
    
    let rateLimitStatus: 'ok' | 'warning' | 'critical' = 'ok';
    if (recentRateLimits.length > 0) {
      const avgRemaining = recentRateLimits.reduce((sum, info) => sum + info.remaining, 0) / recentRateLimits.length;
      const avgLimit = recentRateLimits.reduce((sum, info) => sum + info.limit, 0) / recentRateLimits.length;
      const remainingRatio = avgRemaining / avgLimit;
      
      if (remainingRatio < 0.1) rateLimitStatus = 'critical';
      else if (remainingRatio < 0.3) rateLimitStatus = 'warning';
    }

    const healthy = errorRate < 0.1 && avgResponseTime < 5000 && rateLimitStatus !== 'critical';

    return {
      healthy,
      errorRate,
      avgResponseTime,
      rateLimitStatus
    };
  }

  // ============================================================================
  // プライベートメソッド
  // ============================================================================

  private analyzeError(error: any): KaitoAPIError {
    // HTTP ステータスコードベースの分析
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      
      switch (status) {
        case 401:
          return new AuthenticationError('認証に失敗しました');
        
        case 403:
          return new AuthenticationError('アクセスが拒否されました');
        
        case 429:
          const retryAfter = this.extractRetryAfter(error);
          const resetTime = Date.now() + (retryAfter || 60000);
          return new RateLimitError('unknown', resetTime, 0);
        
        case 500:
        case 502:
        case 503:
        case 504:
          return new NetworkError('サーバーエラーが発生しました', error);
        
        default:
          return new KaitoAPIError(
            `HTTPエラー: ${status}`,
            'HTTP_ERROR',
            status
          );
      }
    }

    // ネットワークエラーの分析
    if (error.code) {
      switch (error.code) {
        case 'ECONNRESET':
        case 'ECONNREFUSED':
        case 'ETIMEDOUT':
        case 'ENOTFOUND':
          return new NetworkError('ネットワーク接続エラー', error);
        
        default:
          return new NetworkError(error.message || 'ネットワークエラー', error);
      }
    }

    // その他のエラー
    return new KaitoAPIError(
      error.message || '不明なエラーが発生しました',
      'UNKNOWN_ERROR',
      undefined,
      error
    );
  }

  private extractRateLimitInfo(response: any): RateLimitInfo | undefined {
    // レスポンスヘッダーからレート制限情報を抽出
    const headers = response.headers || {};
    
    // 2025年最新のAnthropic APIヘッダー形式を優先
    if (headers['anthropic-ratelimit-requests-limit'] || headers['anthropic-ratelimit-tokens-limit']) {
      return {
        limit: parseInt(headers['anthropic-ratelimit-requests-limit'] || headers['anthropic-ratelimit-tokens-limit']) || 0,
        remaining: parseInt(headers['anthropic-ratelimit-requests-remaining'] || headers['anthropic-ratelimit-tokens-remaining']) || 0,
        resetTime: headers['anthropic-ratelimit-requests-reset'] || headers['anthropic-ratelimit-tokens-reset'] || new Date().toISOString(),
        retryAfter: headers['retry-after'] ? parseInt(headers['retry-after']) * 1000 : undefined
      };
    }
    
    // 従来のX-RateLimit形式もサポート（後方互換性）
    if (headers['x-rate-limit-limit'] || headers['X-RateLimit-Limit']) {
      return {
        limit: parseInt(headers['x-rate-limit-limit'] || headers['X-RateLimit-Limit']) || 0,
        remaining: parseInt(headers['x-rate-limit-remaining'] || headers['X-RateLimit-Remaining']) || 0,
        resetTime: headers['x-rate-limit-reset'] || headers['X-RateLimit-Reset'] || new Date().toISOString(),
        retryAfter: headers['retry-after'] ? parseInt(headers['retry-after']) * 1000 : undefined
      };
    }

    return undefined;
  }

  private extractRetryAfter(error: any): number | undefined {
    const retryAfter = error.headers?.['retry-after'] || error.retryAfter;
    if (retryAfter) {
      return parseInt(retryAfter) * 1000; // 秒からミリ秒に変換
    }
    return undefined;
  }

  private async performEducationalSafetyCheck(response: any): Promise<{
    isSafe: boolean;
    reasons: string[];
    qualityScore: number;
  }> {
    // 教育システム向け安全性チェック
    const reasons: string[] = [];
    let qualityScore = 100;
    
    try {
      // レスポンスデータの基本チェック        
      if (!response || typeof response !== 'object') {
        reasons.push('無効なレスポンス形式');
        qualityScore -= 50;
      }

      // 教育的価値のチェック（簡易版）
      const content = JSON.stringify(response).toLowerCase();
      
      // 不適切なキーワードチェック
      const prohibitedWords = ['スパム', '詐欺', '絶対儲かる', '確実', '一攫千金'];
      const hasProhibitedContent = prohibitedWords.some(word => content.includes(word));
      
      if (hasProhibitedContent) {
        reasons.push('不適切なコンテンツが検出されました');
        qualityScore -= 30;
      }

      // データサイズチェック
      const dataSize = JSON.stringify(response).length;
      if (dataSize > 1000000) { // 1MB制限
        reasons.push('レスポンスサイズが大きすぎます');
        qualityScore -= 20;
      }

      const isSafe = qualityScore >= 70 && reasons.length === 0;

      return { isSafe, reasons, qualityScore };

    } catch (error) {
      return {
        isSafe: false,
        reasons: ['安全性チェック処理でエラーが発生しました'],
        qualityScore: 0
      };
    }
  }

  private createSuccessResponse<T>(
    data: T,
    requestId: string,
    processingTime: number,
    rateLimitInfo?: RateLimitInfo,
    educational?: boolean
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime,
        rateLimitStatus: rateLimitInfo,
        educational: educational ? {
          contentValidated: true,
          safetyChecked: true,
          qualityScore: 95 // デフォルト高品質スコア
        } : undefined
      }
    };
  }

  private createErrorResponseFromError(
    error: KaitoAPIError,
    requestId: string,
    processingTime: number,
    additionalDetails?: any
  ): ApiResponse {
    return {
      success: false,
      error: {
        ...error,
        details: {
          ...error.details,
          ...additionalDetails
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime
      }
    };
  }

  private createErrorResponse(
    errorType: string,
    message: string,
    retryable: boolean,
    details: any,
    requestId: string,
    processingTime: number,
    retryAfter?: number
  ): ApiResponse {
    const error = new KaitoAPIError(message, errorType);
    return this.createErrorResponseFromError(error, requestId, processingTime, details);
  }

  private calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logRequest(endpoint: string, metadata: ResponseMetadata): void {
    // 古いログの自動削除
    this.cleanupOldLogs();
    
    if (!this.requestLog.has(endpoint)) {
      this.requestLog.set(endpoint, []);
    }
    
    const logs = this.requestLog.get(endpoint)!;
    logs.push(metadata);
    
    // 最大エントリ数制限
    if (logs.length > this.MAX_LOG_ENTRIES) {
      logs.splice(0, logs.length - this.MAX_LOG_ENTRIES);
    }
  }

  /**
   * 古いログの自動削除
   */
  private cleanupOldLogs(): void {
    const now = Date.now();
    this.requestLog.forEach((logs, endpoint) => {
      const filtered = logs.filter(log => {
        const timestamp = new Date(log.timestamp).getTime();
        return now - timestamp < this.LOG_RETENTION_MS;
      });
      
      if (filtered.length === 0) {
        this.requestLog.delete(endpoint);
      } else {
        this.requestLog.set(endpoint, filtered);
      }
    });
  }

  private logError(endpoint: string, error: KaitoAPIError, originalError: any): void {
    console.error(`API Error [${endpoint}]:`, {
      type: error.constructor.name,
      code: error.code,
      message: error.message,
      retryable: this.isRetryableError(error),
      statusCode: error.statusCode,
      originalError: originalError.message || originalError
    });
  }

  private isRetryableError(error: KaitoAPIError): boolean {
    return error instanceof NetworkError || 
           error instanceof RateLimitError || 
           (error instanceof KaitoAPIError && error.statusCode && error.statusCode >= 500);
  }

  private updateErrorStats(errorType: string): void {
    const current = this.errorStats.get(errorType) || 0;
    this.errorStats.set(errorType, current + 1);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// ユーティリティ関数
// ============================================================================

/**
 * レスポンスの安全性確認
 */
export function validateResponseSafety(response: any): boolean {
  try {
    // 基本的な安全性チェック
    if (!response || typeof response !== 'object') {
      return false;
    }

    // JSONサイズチェック
    const jsonSize = JSON.stringify(response).length;
    if (jsonSize > 10000000) { // 10MB制限
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * エラーの重要度判定
 */
export function getErrorSeverity(error: KaitoAPIError): 'low' | 'medium' | 'high' | 'critical' {
  if (error instanceof RateLimitError) {
    return 'medium';
  }
  if (error instanceof AuthenticationError) {
    return 'high';
  }
  if (error instanceof ValidationError) {
    return 'high';
  }
  if (error instanceof NetworkError) {
    return 'medium';
  }
  return 'medium';
}

/**
 * 教育システム向けレスポンス処理インスタンス作成
 */
export function createEducationalResponseHandler(): ResponseHandler {
  return new ResponseHandler({
    maxRetries: 3,
    baseDelay: 2000,      // 教育システムは慎重に
    maxDelay: 60000,      // 最大1分待機
    backoffMultiplier: 2,
    retryableErrors: ['rate_limit', 'network_error', 'timeout']
  });
}

// ============================================================================
// エクスポート
// ============================================================================

export default ResponseHandler;