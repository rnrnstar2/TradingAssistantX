/**
 * KaitoAPI トレンドエンドポイント - 最適化版
 * REQUIREMENTS.md準拠 - 疎結合アーキテクチャ
 * 
 * 最適化内容:
 * - TwitterAPI.ioトレンドエンドポイント対応
 * - WOEIDパラメータバリデーション強化
 * - トレンドデータ正規化
 * - エラーハンドリング統一
 * - キャッシュ最適化
 * - レート制限対応
 */

import { TrendData, TrendLocation, HttpClient } from '../types';

// ============================================================================
// VALIDATION TYPES
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface TrendCacheEntry {
  data: TrendData[];
  timestamp: number;
  woeid: number;
}

export class TrendEndpoints {
  private readonly TREND_ENDPOINTS = {
    getTrends: '/twitter/trends/place',
    getLocations: '/twitter/trends/available'
  } as const;

  private readonly TREND_LIMITS = {
    woeid: { min: 1, max: 99999999 },
    cacheExpiry: 10 * 60 * 1000, // 10分
    maxCacheSize: 50
  } as const;

  private readonly WELL_KNOWN_WOEIDS = {
    worldwide: 1,
    unitedStates: 23424977,
    japan: 23424856,
    tokyo: 1118370,
    newYork: 2459115,
    london: 44418
  } as const;

  private trendCache = new Map<number, TrendCacheEntry>();

  constructor(private httpClient: HttpClient) {
    console.log('✅ TrendEndpoints initialized - TwitterAPI.io最適化版');
    this.initializeCache();
  }

  async getTrends(woeid: number = this.WELL_KNOWN_WOEIDS.worldwide): Promise<TrendData[]> {
    // WOEIDバリデーション強化
    const validation = this.validateWoeid(woeid);
    if (!validation.isValid) {
      throw new Error(`WOEID validation failed: ${validation.errors.join(', ')}`);
    }

    // キャッシュチェック
    const cachedData = this.getCachedTrends(woeid);
    if (cachedData) {
      console.log(`💾 Using cached trends for WOEID: ${woeid}`);
      return cachedData;
    }

    try {
      console.log(`🔥 Enhanced trends fetch via TwitterAPI.io for WOEID: ${woeid}`);
      
      const params = this.buildTrendParams(woeid);
      
      const response = await this.httpClient.get(
        this.TREND_ENDPOINTS.getTrends,
        params
      );

      // レスポンス正規化
      const normalizedTrends = this.normalizeTrendData(response, woeid);
      
      // キャッシュに保存
      this.cacheTrends(woeid, normalizedTrends);
      
      return normalizedTrends;

    } catch (error) {
      throw this.handleTrendError(error, 'getTrends');
    }
  }

  async getTrendLocations(): Promise<TrendLocation[]> {
    try {
      console.log('🌍 Enhanced trend locations fetch via TwitterAPI.io');
      
      const response = await this.httpClient.get(
        this.TREND_ENDPOINTS.getLocations
      );

      // レスポンス正規化
      return this.normalizeTrendLocations(response);

    } catch (error) {
      throw this.handleTrendError(error, 'getTrendLocations');
    }
  }

  // ============================================================================
  // VALIDATION METHODS - WOEIDとパラメータ検証
  // ============================================================================

  private validateWoeid(woeid: number): ValidationResult {
    const errors: string[] = [];

    if (!Number.isInteger(woeid)) {
      errors.push('WOEID must be an integer');
    }

    if (woeid < this.TREND_LIMITS.woeid.min || woeid > this.TREND_LIMITS.woeid.max) {
      errors.push(`WOEID must be between ${this.TREND_LIMITS.woeid.min} and ${this.TREND_LIMITS.woeid.max}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============================================================================
  // CACHE MANAGEMENT - パフォーマンス最適化
  // ============================================================================

  private initializeCache(): void {
    // キャッシュクリーンアップの定期実行
    setInterval(() => {
      this.cleanExpiredCache();
    }, 5 * 60 * 1000); // 5分おき
  }

  private getCachedTrends(woeid: number): TrendData[] | null {
    const entry = this.trendCache.get(woeid);
    
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > this.TREND_LIMITS.cacheExpiry) {
      this.trendCache.delete(woeid);
      return null;
    }
    
    return entry.data;
  }

  private cacheTrends(woeid: number, trends: TrendData[]): void {
    // キャッシュサイズ制限
    if (this.trendCache.size >= this.TREND_LIMITS.maxCacheSize) {
      this.cleanOldestCache();
    }

    this.trendCache.set(woeid, {
      data: trends,
      timestamp: Date.now(),
      woeid
    });
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [woeid, entry] of this.trendCache.entries()) {
      if (now - entry.timestamp > this.TREND_LIMITS.cacheExpiry) {
        this.trendCache.delete(woeid);
      }
    }
  }

  private cleanOldestCache(): void {
    let oldestWoeid: number | null = null;
    let oldestTime = Date.now();
    
    for (const [woeid, entry] of this.trendCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestWoeid = woeid;
      }
    }
    
    if (oldestWoeid !== null) {
      this.trendCache.delete(oldestWoeid);
    }
  }

  // ============================================================================
  // PARAMETER BUILDING - TwitterAPI.io最適化
  // ============================================================================

  private buildTrendParams(woeid: number): Record<string, any> {
    return {
      id: woeid,
      // TwitterAPI.ioの追加パラメータがある場合はここに追加
    };
  }

  // ============================================================================
  // RESPONSE NORMALIZATION - データ正規化強化
  // ============================================================================

  private normalizeTrendData(response: any, woeid: number): TrendData[] {
    if (!response || !Array.isArray(response.trends) && !Array.isArray(response.data)) {
      console.warn(`⚠️ Invalid trend response structure for WOEID ${woeid}`);
      return [];
    }

    const trendsArray = response.trends || response.data || [];
    
    return trendsArray.map((trend: any, index: number) => ({
      name: String(trend.name || trend.topic || ''),
      query: String(trend.query || trend.name || trend.topic || ''),
      tweetVolume: this.normalizeTweetVolume(trend.tweet_volume || trend.volume || trend.count),
      rank: index + 1
    })).filter(trend => trend.name.trim() !== ''); // 空のトレンドを除外
  }

  private normalizeTrendLocations(response: any): TrendLocation[] {
    if (!response || !Array.isArray(response.data) && !Array.isArray(response)) {
      console.warn('⚠️ Invalid trend locations response structure');
      return this.getWellKnownLocations();
    }

    const locationsArray = response.data || response || [];
    
    return locationsArray.map((location: any) => ({
      woeid: Number(location.woeid || 0),
      name: String(location.name || ''),
      countryCode: String(location.countryCode || location.country || '')
    })).filter(location => location.woeid > 0 && location.name.trim() !== '');
  }

  private normalizeTweetVolume(volume: any): number | null {
    if (volume === null || volume === undefined || volume === '') {
      return null;
    }
    
    const numVolume = Number(volume);
    return isNaN(numVolume) ? null : Math.max(0, numVolume);
  }

  // ============================================================================
  // ERROR HANDLING - 統一されたエラーハンドリング
  // ============================================================================

  private handleTrendError(error: any, context: string): Error {
    console.error(`❌ ${context} error:`, error);

    // TwitterAPI.io特有エラーハンドリング
    if (error.response?.status === 429) {
      return new Error('Rate limit exceeded. Trend data updates frequently, please try again later.');
    }

    if (error.response?.status === 401) {
      return new Error('Authentication failed. Please check your API key.');
    }

    if (error.response?.status === 404) {
      return new Error('Trend endpoint not found. This feature may not be available.');
    }

    if (error.response?.status === 403) {
      return new Error('Access forbidden. Trend data may not be available for your account.');
    }

    // ネットワークエラー
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new Error('Network error. Please check your internet connection.');
    }

    return new Error(`${context} failed: ${error.message || 'Unknown error'}`);
  }

  // ============================================================================
  // UTILITY METHODS - ヘルパーメソッド
  // ============================================================================

  private getWellKnownLocations(): TrendLocation[] {
    return [
      { woeid: this.WELL_KNOWN_WOEIDS.worldwide, name: 'Worldwide', countryCode: '' },
      { woeid: this.WELL_KNOWN_WOEIDS.unitedStates, name: 'United States', countryCode: 'US' },
      { woeid: this.WELL_KNOWN_WOEIDS.japan, name: 'Japan', countryCode: 'JP' },
      { woeid: this.WELL_KNOWN_WOEIDS.tokyo, name: 'Tokyo', countryCode: 'JP' },
      { woeid: this.WELL_KNOWN_WOEIDS.newYork, name: 'New York', countryCode: 'US' },
      { woeid: this.WELL_KNOWN_WOEIDS.london, name: 'London', countryCode: 'GB' }
    ];
  }

  /**
   * キャッシュクリア（テスト用）
   */
  clearCache(): void {
    this.trendCache.clear();
    console.log('📧 Trend cache cleared');
  }

  /**
   * キャッシュ統計情報取得
   */
  getCacheStats(): { size: number; entries: Array<{ woeid: number; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.trendCache.entries()).map(([woeid, entry]) => ({
      woeid,
      age: now - entry.timestamp
    }));

    return {
      size: this.trendCache.size,
      entries
    };
  }
}