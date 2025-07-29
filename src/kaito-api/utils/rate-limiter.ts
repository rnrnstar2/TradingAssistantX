/**
 * TwitterAPI.io レート制限管理ユーティリティ
 * 
 * 機能概要:
 * - エンドポイント別レート制限の追跡
 * - レート制限チェックとリクエスト記録
 * - 残り利用可能数の取得
 * - 自動的な古いタイムスタンプの削除
 */

import { RATE_LIMITS } from './constants';
import { RateLimitError } from './errors';

// ============================================================================
// INTERFACES
// ============================================================================

export interface RateLimitConfig {
  limit: number;
  window: number; // seconds
}

export interface RateLimitStatus {
  endpoint: string;
  limit: number;
  remaining: number;
  resetTime: number;
  windowStart: number;
}

// ============================================================================
// RATE LIMITER CLASS
// ============================================================================

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  /**
   * レート制限チェックと記録
   * @param endpoint - チェック対象のエンドポイント
   * @throws RateLimitError - レート制限に達した場合
   */
  async checkAndRecord(endpoint: string): Promise<void> {
    const now = Date.now();
    const limit = this.getEndpointLimit(endpoint);
    
    if (!this.requests.has(endpoint)) {
      this.requests.set(endpoint, []);
    }
    
    const timestamps = this.requests.get(endpoint)!;
    const windowStart = now - (limit.window * 1000);
    
    // 古いタイムスタンプを削除
    const activeRequests = timestamps.filter(ts => ts > windowStart);
    
    if (activeRequests.length >= limit.limit) {
      const oldestRequest = Math.min(...activeRequests);
      const resetTime = oldestRequest + (limit.window * 1000);
      throw new RateLimitError(endpoint, resetTime, limit.limit);
    }
    
    activeRequests.push(now);
    this.requests.set(endpoint, activeRequests);
  }
  
  /**
   * エンドポイント別のレート制限取得
   * @param endpoint - エンドポイント名
   * @returns レート制限設定
   */
  private getEndpointLimit(endpoint: string): RateLimitConfig {
    if (endpoint.includes('create_tweet') || endpoint.includes('delete_tweet')) {
      return RATE_LIMITS.posting;
    }
    if (endpoint.includes('search')) {
      return RATE_LIMITS.search;
    }
    if (endpoint.includes('like') || endpoint.includes('retweet')) {
      return RATE_LIMITS.engagement;
    }
    return RATE_LIMITS.general;
  }
  
  /**
   * 残り利用可能数の取得
   * @param endpoint - エンドポイント名
   * @returns 残り利用可能数
   */
  getRemaining(endpoint: string): number {
    const limit = this.getEndpointLimit(endpoint);
    const timestamps = this.requests.get(endpoint) || [];
    const now = Date.now();
    const windowStart = now - (limit.window * 1000);
    const activeRequests = timestamps.filter(ts => ts > windowStart);
    
    return Math.max(0, limit.limit - activeRequests.length);
  }
  
  /**
   * エンドポイントのレート制限状態取得
   * @param endpoint - エンドポイント名
   * @returns レート制限状態
   */
  getStatus(endpoint: string): RateLimitStatus {
    const limit = this.getEndpointLimit(endpoint);
    const timestamps = this.requests.get(endpoint) || [];
    const now = Date.now();
    const windowStart = now - (limit.window * 1000);
    const activeRequests = timestamps.filter(ts => ts > windowStart);
    
    return {
      endpoint,
      limit: limit.limit,
      remaining: Math.max(0, limit.limit - activeRequests.length),
      resetTime: activeRequests.length > 0 ? 
        Math.min(...activeRequests) + (limit.window * 1000) : 
        now,
      windowStart
    };
  }
  
  /**
   * 全エンドポイントのレート制限状態取得
   * @returns 全エンドポイントのレート制限状態
   */
  getAllStatus(): RateLimitStatus[] {
    const endpointTypes = ['posting', 'search', 'engagement', 'general'];
    const statuses: RateLimitStatus[] = [];
    
    // 既存のリクエスト履歴があるエンドポイント
    this.requests.forEach((_, endpoint) => {
      statuses.push(this.getStatus(endpoint));
    });
    
    // まだリクエストがないエンドポイントタイプの初期状態
    endpointTypes.forEach(type => {
      if (!statuses.some(s => this.getEndpointType(s.endpoint) === type)) {
        const config = this.getEndpointLimitByType(type);
        statuses.push({
          endpoint: type,
          limit: config.limit,
          remaining: config.limit,
          resetTime: Date.now(),
          windowStart: Date.now() - (config.window * 1000)
        });
      }
    });
    
    return statuses;
  }
  
  /**
   * レート制限までの待機時間取得
   * @param endpoint - エンドポイント名
   * @returns 待機時間（ミリ秒）、制限に達していなければ0
   */
  getWaitTime(endpoint: string): number {
    const status = this.getStatus(endpoint);
    
    if (status.remaining > 0) {
      return 0;
    }
    
    return Math.max(0, status.resetTime - Date.now());
  }
  
  /**
   * レート制限リセット（テスト用）
   * @param endpoint - リセット対象のエンドポイント（省略時は全て）
   */
  reset(endpoint?: string): void {
    if (endpoint) {
      this.requests.delete(endpoint);
    } else {
      this.requests.clear();
    }
  }
  
  /**
   * 古いタイムスタンプの手動クリーンアップ
   */
  cleanup(): void {
    const now = Date.now();
    
    this.requests.forEach((timestamps, endpoint) => {
      const limit = this.getEndpointLimit(endpoint);
      const windowStart = now - (limit.window * 1000);
      const activeRequests = timestamps.filter(ts => ts > windowStart);
      
      if (activeRequests.length === 0) {
        this.requests.delete(endpoint);
      } else {
        this.requests.set(endpoint, activeRequests);
      }
    });
  }
  
  /**
   * エンドポイントタイプの判定
   * @param endpoint - エンドポイント名
   * @returns エンドポイントタイプ
   */
  private getEndpointType(endpoint: string): string {
    if (endpoint.includes('create_tweet') || endpoint.includes('delete_tweet')) {
      return 'posting';
    }
    if (endpoint.includes('search')) {
      return 'search';
    }
    if (endpoint.includes('like') || endpoint.includes('retweet')) {
      return 'engagement';
    }
    return 'general';
  }
  
  /**
   * エンドポイントタイプ別のレート制限設定取得
   * @param type - エンドポイントタイプ
   * @returns レート制限設定
   */
  private getEndpointLimitByType(type: string): RateLimitConfig {
    switch (type) {
      case 'posting':
        return RATE_LIMITS.posting;
      case 'search':
        return RATE_LIMITS.search;
      case 'engagement':
        return RATE_LIMITS.engagement;
      default:
        return RATE_LIMITS.general;
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * グローバルレート制限インスタンス
 */
const globalRateLimiter = new RateLimiter();

/**
 * グローバルレート制限インスタンスの取得
 * @returns グローバルレート制限インスタンス
 */
export function getGlobalRateLimiter(): RateLimiter {
  return globalRateLimiter;
}

/**
 * レート制限チェック（グローバルインスタンス使用）
 * @param endpoint - エンドポイント名
 */
export async function checkRateLimit(endpoint: string): Promise<void> {
  return globalRateLimiter.checkAndRecord(endpoint);
}

/**
 * 残り利用可能数取得（グローバルインスタンス使用）
 * @param endpoint - エンドポイント名
 * @returns 残り利用可能数
 */
export function getRemainingRequests(endpoint: string): number {
  return globalRateLimiter.getRemaining(endpoint);
}

/**
 * 待機時間取得（グローバルインスタンス使用）
 * @param endpoint - エンドポイント名
 * @returns 待機時間（ミリ秒）
 */
export function getWaitTime(endpoint: string): number {
  return globalRateLimiter.getWaitTime(endpoint);
}

/**
 * レート制限情報の表示用文字列生成
 * @param status - レート制限状態
 * @returns 表示用文字列
 */
export function formatRateLimitStatus(status: RateLimitStatus): string {
  const resetDate = new Date(status.resetTime);
  const waitTime = Math.max(0, status.resetTime - Date.now());
  
  return `${status.endpoint}: ${status.remaining}/${status.limit} remaining` +
         (waitTime > 0 ? ` (reset in ${Math.ceil(waitTime / 1000)}s)` : '');
}

/**
 * 複数エンドポイントのレート制限状態表示
 * @param statuses - レート制限状態配列
 * @returns 表示用文字列配列
 */
export function formatAllRateLimitStatus(statuses: RateLimitStatus[]): string[] {
  return statuses.map(formatRateLimitStatus);
}

// ============================================================================
// EXPORT
// ============================================================================

export default RateLimiter;