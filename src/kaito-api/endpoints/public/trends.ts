/**
 * Public Trends Endpoint - APIキー認証専用
 * REQUIREMENTS.md準拠 - 読み取り専用トレンド取得
 * 
 * 機能:
 * - トレンド取得・地域別トレンド
 * - 利用可能な地域一覧取得
 * - トレンドキャッシュ管理
 * 
 * 認証レベル: APIキー認証のみ（読み取り専用）
 */

import { TrendData, TrendLocation, HttpClient } from '../../types';
import { APIKeyAuth } from '../../core/api-key-auth';

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

interface TrendResponse {
  success: boolean;
  data: {
    trends: TrendData[];
    location: TrendLocation;
    asOf: Date;
    createdAt: Date;
  };
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

interface TrendLocationResponse {
  success: boolean;
  data: TrendLocation[];
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

// ============================================================================
// CACHE TYPES
// ============================================================================

interface TrendCacheEntry {
  data: TrendData[];
  location: TrendLocation;
  timestamp: number;
  woeid: number;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// TRENDS ENDPOINT CLASS
// ============================================================================

/**
 * TrendsEndpoint - 公開トレンドAPI操作クラス
 * 
 * APIキー認証のみで実行可能な読み取り専用機能:
 * - 世界・地域別トレンド取得
 * - 利用可能な地域一覧取得
 * - トレンドデータのキャッシュ管理
 */
export class TrendsEndpoint {
  private readonly ENDPOINTS = {
    getTrends: '/twitter/trends/place',
    getLocations: '/twitter/trends/available'
  } as const;

  private readonly RATE_LIMITS = {
    trends: { limit: 75, window: 3600 }, // 75/hour
    locations: { limit: 75, window: 3600 } // 75/hour
  } as const;

  private readonly VALIDATION_RULES = {
    woeid: { min: 1, max: 99999999 }
  } as const;

  private readonly CACHE_CONFIG = {
    expiry: 10 * 60 * 1000, // 10分
    maxSize: 50
  } as const;

  // 主要地域のWOEID定義
  private readonly WELL_KNOWN_WOEIDS = {
    worldwide: 1,
    unitedStates: 23424977,
    japan: 23424856,
    tokyo: 1118370,
    osaka: 15015370,
    newYork: 2459115,
    losAngeles: 2442047,
    london: 44418,
    paris: 615702,
    sydney: 1105779,
    seoul: 1132599,
    beijing: 2151330,
    mumbai: 2295411,
    sãoPaulo: 455827,
    madrid: 766273,
    berlin: 638242,
    toronto: 4118,
    vancouver: 9807
  } as const;

  // トレンドキャッシュ
  private readonly trendCache = new Map<number, TrendCacheEntry>();
  private locationCache: TrendLocation[] | null = null;
  private locationCacheTimestamp: number = 0;

  constructor(
    private httpClient: HttpClient,
    private apiKeyAuth: APIKeyAuth
  ) {}

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * 地域別トレンド取得
   * APIキー認証のみで実行可能
   */
  async getTrends(woeid: number = this.WELL_KNOWN_WOEIDS.worldwide): Promise<TrendResponse> {
    // 入力バリデーション
    const validation = this.validateWOEID(woeid);
    if (!validation.isValid) {
      throw new Error(`Invalid WOEID: ${validation.errors.join(', ')}`);
    }

    // キャッシュチェック
    const cachedTrends = this.getCachedTrends(woeid);
    if (cachedTrends) {
      return {
        success: true,
        data: {
          trends: cachedTrends.data,
          location: cachedTrends.location,
          asOf: new Date(cachedTrends.timestamp),
          createdAt: new Date()
        }
      };
    }

    try {
      const headers = this.apiKeyAuth.getAuthHeaders();
      
      const response = await this.httpClient.get<any>(
        this.ENDPOINTS.getTrends,
        { id: woeid },
        { headers }
      );

      // レスポンス正規化
      const trendsData = Array.isArray(response) ? response[0] : response;
      const normalizedTrends = await this.normalizeTrendsData(trendsData);
      const location = await this.normalizeLocationData(trendsData.locations?.[0] || { woeid });

      // キャッシュに保存
      this.cacheTrends(woeid, normalizedTrends, location);

      return {
        success: true,
        data: {
          trends: normalizedTrends,
          location,
          asOf: new Date(trendsData.as_of || Date.now()),
          createdAt: new Date(trendsData.created_at || Date.now())
        },
        rateLimit: response.rateLimit
      };

    } catch (error: any) {
      throw this.handleAPIKeyError(error, 'getTrends');
    }
  }

  /**
   * 世界トレンド取得（ショートカット）
   * APIキー認証のみで実行可能
   */
  async getWorldwideTrends(): Promise<TrendResponse> {
    return this.getTrends(this.WELL_KNOWN_WOEIDS.worldwide);
  }

  /**
   * 日本のトレンド取得（ショートカット）
   * APIキー認証のみで実行可能
   */
  async getJapanTrends(): Promise<TrendResponse> {
    return this.getTrends(this.WELL_KNOWN_WOEIDS.japan);
  }

  /**
   * 東京のトレンド取得（ショートカット）
   * APIキー認証のみで実行可能
   */
  async getTokyoTrends(): Promise<TrendResponse> {
    return this.getTrends(this.WELL_KNOWN_WOEIDS.tokyo);
  }

  /**
   * アメリカのトレンド取得（ショートカット）
   * APIキー認証のみで実行可能
   */
  async getUSTrends(): Promise<TrendResponse> {
    return this.getTrends(this.WELL_KNOWN_WOEIDS.unitedStates);
  }

  /**
   * 利用可能な地域一覧取得
   * APIキー認証のみで実行可能
   */
  async getAvailableLocations(): Promise<TrendLocationResponse> {
    // キャッシュチェック
    if (this.locationCache && this.isLocationCacheValid()) {
      return {
        success: true,
        data: this.locationCache
      };
    }

    try {
      const headers = this.apiKeyAuth.getAuthHeaders();
      
      const response = await this.httpClient.get<any[]>(
        this.ENDPOINTS.getLocations,
        {},
        { headers }
      );

      // レスポンス正規化
      const normalizedLocations = await Promise.all(
        response.map(location => this.normalizeLocationData(location))
      );

      // キャッシュに保存
      this.locationCache = normalizedLocations;
      this.locationCacheTimestamp = Date.now();

      return {
        success: true,
        data: normalizedLocations,
        rateLimit: (response as any).rateLimit
      };

    } catch (error: any) {
      throw this.handleAPIKeyError(error, 'getAvailableLocations');
    }
  }

  /**
   * 主要地域のWOEID一覧取得
   */
  getWellKnownWOEIDs(): Record<string, number> {
    return { ...this.WELL_KNOWN_WOEIDS };
  }

  /**
   * キャッシュクリア
   */
  clearCache(): void {
    this.trendCache.clear();
    this.locationCache = null;
    this.locationCacheTimestamp = 0;
  }

  // ============================================================================
  // PRIVATE METHODS - VALIDATION
  // ============================================================================

  private validateWOEID(woeid: number): ValidationResult {
    const errors: string[] = [];

    if (typeof woeid !== 'number' || !Number.isInteger(woeid)) {
      errors.push('WOEID must be an integer');
    } else if (woeid < this.VALIDATION_RULES.woeid.min || woeid > this.VALIDATION_RULES.woeid.max) {
      errors.push(`WOEID must be between ${this.VALIDATION_RULES.woeid.min} and ${this.VALIDATION_RULES.woeid.max}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  // ============================================================================
  // PRIVATE METHODS - CACHE MANAGEMENT
  // ============================================================================

  private getCachedTrends(woeid: number): TrendCacheEntry | null {
    const cached = this.trendCache.get(woeid);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_CONFIG.expiry;
    if (isExpired) {
      this.trendCache.delete(woeid);
      return null;
    }

    return cached;
  }

  private cacheTrends(woeid: number, trends: TrendData[], location: TrendLocation): void {
    // キャッシュサイズ制限
    if (this.trendCache.size >= this.CACHE_CONFIG.maxSize) {
      // 最も古いエントリを削除
      const oldestKey = Array.from(this.trendCache.keys())[0];
      this.trendCache.delete(oldestKey);
    }

    this.trendCache.set(woeid, {
      data: trends,
      location,
      timestamp: Date.now(),
      woeid
    });
  }

  private isLocationCacheValid(): boolean {
    return Date.now() - this.locationCacheTimestamp < this.CACHE_CONFIG.expiry;
  }

  // ============================================================================
  // PRIVATE METHODS - DATA NORMALIZATION
  // ============================================================================

  private async normalizeTrendsData(apiResponse: any): Promise<TrendData[]> {
    const trends = apiResponse.trends || [];
    
    return trends.map((trend: any): TrendData => ({
      name: trend.name || '',
      url: trend.url || '',
      promoted_content: trend.promoted_content || null,
      query: trend.query || trend.name,
      tweet_volume: trend.tweet_volume || null,
      rank: trends.indexOf(trend) + 1,
      category: this.categorizeTrend(trend.name),
      woeid: apiResponse.locations?.[0]?.woeid || 1
    }));
  }

  private async normalizeLocationData(apiLocation: any): Promise<TrendLocation> {
    return {
      name: apiLocation.name || 'Unknown',
      woeid: apiLocation.woeid || 1,
      country: apiLocation.country || '',
      countryCode: apiLocation.countryCode || apiLocation.country_code || '',
      parentid: apiLocation.parentid || apiLocation.parent_id || null,
      placeType: {
        code: apiLocation.placeType?.code || apiLocation.place_type?.code || 0,
        name: apiLocation.placeType?.name || apiLocation.place_type?.name || 'Unknown'
      },
      url: `http://where.yahooapis.com/v1/place/${apiLocation.woeid}`
    };
  }

  private categorizeTrend(trendName: string): string {
    if (!trendName) return 'other';
    
    const name = trendName.toLowerCase();
    
    // ハッシュタグ
    if (name.startsWith('#')) return 'hashtag';
    
    // スポーツ関連キーワード
    const sportsKeywords = ['試合', 'game', 'match', 'vs', '勝利', 'win', 'goal', 'score'];
    if (sportsKeywords.some(keyword => name.includes(keyword))) return 'sports';
    
    // エンターテイメント関連
    const entertainmentKeywords = ['映画', 'movie', 'ドラマ', 'anime', 'music', 'song', 'album'];
    if (entertainmentKeywords.some(keyword => name.includes(keyword))) return 'entertainment';
    
    // 政治・ニュース関連
    const newsKeywords = ['選挙', 'election', 'politics', 'news', 'breaking', '速報'];
    if (newsKeywords.some(keyword => name.includes(keyword))) return 'news';
    
    // テクノロジー関連
    const techKeywords = ['ai', 'tech', 'app', 'update', 'launch', 'release'];
    if (techKeywords.some(keyword => name.includes(keyword))) return 'technology';
    
    return 'other';
  }

  // ============================================================================
  // PRIVATE METHODS - ERROR HANDLING
  // ============================================================================

  private handleAPIKeyError(error: any, operation: string): never {
    // APIキー認証特有のエラー処理
    if (error.status === 401) {
      throw new Error(`Invalid API key - check KAITO_API_TOKEN for operation: ${operation}`);
    }
    
    if (error.status === 403) {
      throw new Error(`API key lacks permission for operation: ${operation}`);
    }
    
    if (error.status === 429) {
      throw new Error(`Rate limit exceeded for operation: ${operation}. Please wait before retrying.`);
    }
    
    if (error.status === 404) {
      throw new Error(`Location not found or endpoint unavailable: ${operation}`);
    }

    if (error.status === 400) {
      throw new Error(`Invalid WOEID or location parameter for operation: ${operation}`);
    }

    // その他のエラー
    throw new Error(`API error in ${operation}: ${error.message || 'Unknown error'}`);
  }
}