/**
 * KaitoAPI データ正規化ユーティリティ
 * TwitterAPI.ioレスポンスの統一的な正規化処理
 * 
 * 機能概要:
 * - TwitterAPI.ioレスポンスの標準形式への変換
 * - データ型の安全な変換・検証
 * - 不正な値のフォールバック処理
 * - タイムスタンプ・URL・メトリクスの正規化
 * - レスポンス構造の統一化
 */

import { TweetData, UserData, TrendData, TrendLocation } from '../types';

// ============================================================================
// NORMALIZATION INTERFACES
// ============================================================================

export interface NormalizationOptions {
  strictMode?: boolean;
  fallbackValues?: boolean;
  validateUrls?: boolean;
  sanitizeText?: boolean;
}

export interface NormalizationResult<T> {
  data: T;
  warnings: string[];
  hasErrors: boolean;
}

// ============================================================================
// TWEET DATA NORMALIZATION
// ============================================================================

/**
 * ツイートデータの正規化
 * @param apiTweet - TwitterAPI.io APIレスポンスのツイートデータ
 * @param options - 正規化オプション
 * @returns 正規化されたTweetData
 */
export function normalizeTweetData(
  apiTweet: any, 
  options: NormalizationOptions = {}
): TweetData {
  const opts = {
    strictMode: false,
    fallbackValues: true,
    validateUrls: true,
    sanitizeText: true,
    ...options
  };

  return {
    id: normalizeTwitterId(apiTweet.id || apiTweet.tweetId),
    text: opts.sanitizeText ? 
      sanitizeText(apiTweet.text || apiTweet.content || '') : 
      String(apiTweet.text || apiTweet.content || ''),
    author_id: normalizeTwitterId(apiTweet.author_id || apiTweet.userId || apiTweet.authorId),
    created_at: normalizeTimestamp(apiTweet.created_at || apiTweet.createdAt || apiTweet.timestamp),
    public_metrics: normalizePublicMetrics(apiTweet.public_metrics || apiTweet.metrics || apiTweet),
    context_annotations: normalizeContextAnnotations(apiTweet.context_annotations || apiTweet.annotations),
    lang: normalizeLanguageCode(apiTweet.lang || apiTweet.language),
    in_reply_to_user_id: apiTweet.in_reply_to_user_id ? 
      normalizeTwitterId(apiTweet.in_reply_to_user_id) : undefined,
    conversation_id: apiTweet.conversation_id ? 
      normalizeTwitterId(apiTweet.conversation_id) : undefined,
    attachments: normalizeAttachments(apiTweet.attachments),
    geo: normalizeGeoData(apiTweet.geo)
  };
}

/**
 * 複数ツイートデータの正規化
 * @param apiTweets - TwitterAPI.io APIレスポンスのツイート配列
 * @param options - 正規化オプション
 * @returns 正規化されたTweetData配列
 */
export function normalizeTweetArray(
  apiTweets: any[], 
  options: NormalizationOptions = {}
): TweetData[] {
  if (!Array.isArray(apiTweets)) {
    console.warn('⚠️ Expected array for tweet normalization, received:', typeof apiTweets);
    return [];
  }

  return apiTweets
    .filter(tweet => tweet && (tweet.id || tweet.tweetId))
    .map(tweet => normalizeTweetData(tweet, options));
}

// ============================================================================
// USER DATA NORMALIZATION
// ============================================================================

/**
 * ユーザーデータの正規化
 * @param apiUser - TwitterAPI.io APIレスポンスのユーザーデータ
 * @param options - 正規化オプション
 * @returns 正規化されたUserData
 */
export function normalizeUserData(
  apiUser: any, 
  options: NormalizationOptions = {}
): UserData {
  const opts = {
    strictMode: false,
    fallbackValues: true,
    validateUrls: true,
    sanitizeText: true,
    ...options
  };

  return {
    id: normalizeTwitterId(apiUser.id || apiUser.userId),
    username: normalizeUsername(apiUser.username || apiUser.screenName),
    name: opts.sanitizeText ? 
      sanitizeText(apiUser.name || apiUser.displayName || '') : 
      String(apiUser.name || apiUser.displayName || ''),
    description: opts.sanitizeText ? 
      sanitizeText(apiUser.description || apiUser.bio || '') : 
      String(apiUser.description || apiUser.bio || ''),
    created_at: normalizeTimestamp(apiUser.created_at || apiUser.createdAt),
    location: opts.sanitizeText ? 
      sanitizeText(apiUser.location || '') : 
      String(apiUser.location || ''),
    url: opts.validateUrls ? 
      normalizeUrl(apiUser.url || apiUser.website || '') : 
      String(apiUser.url || apiUser.website || ''),
    verified: normalizeBoolean(apiUser.verified || apiUser.verified_type === 'blue'),
    verified_type: normalizeVerifiedType(apiUser.verified_type),
    profile_image_url: opts.validateUrls ? 
      normalizeUrl(apiUser.profile_image_url || apiUser.profileImageUrl || '') : 
      String(apiUser.profile_image_url || apiUser.profileImageUrl || ''),
    profile_banner_url: opts.validateUrls ? 
      normalizeUrl(apiUser.profile_banner_url || apiUser.bannerImageUrl || '') : 
      String(apiUser.profile_banner_url || apiUser.bannerImageUrl || ''),
    public_metrics: normalizeUserPublicMetrics(apiUser.public_metrics || apiUser.metrics || apiUser),
    protected: normalizeBoolean(apiUser.protected),
    pinned_tweet_id: apiUser.pinned_tweet_id ? 
      normalizeTwitterId(apiUser.pinned_tweet_id) : undefined,
    withheld: normalizeWithheldInfo(apiUser.withheld)
  };
}

/**
 * 複数ユーザーデータの正規化
 * @param apiUsers - TwitterAPI.io APIレスポンスのユーザー配列
 * @param options - 正規化オプション
 * @returns 正規化されたUserData配列
 */
export function normalizeUserArray(
  apiUsers: any[], 
  options: NormalizationOptions = {}
): UserData[] {
  if (!Array.isArray(apiUsers)) {
    console.warn('⚠️ Expected array for user normalization, received:', typeof apiUsers);
    return [];
  }

  return apiUsers
    .filter(user => user && (user.id || user.userId))
    .map(user => normalizeUserData(user, options));
}

// ============================================================================
// TREND DATA NORMALIZATION
// ============================================================================

/**
 * トレンドデータの正規化
 * @param apiTrend - TwitterAPI.io APIレスポンスのトレンドデータ
 * @param index - トレンドの順位（0から開始）
 * @returns 正規化されたTrendData
 */
export function normalizeTrendData(apiTrend: any, index: number): TrendData {
  return {
    name: sanitizeText(apiTrend.name || apiTrend.topic || ''),
    query: sanitizeText(apiTrend.query || apiTrend.name || apiTrend.topic || ''),
    tweetVolume: normalizeTweetVolume(apiTrend.tweet_volume || apiTrend.volume || apiTrend.count),
    rank: Math.max(1, index + 1)
  };
}

/**
 * 複数トレンドデータの正規化
 * @param apiTrends - TwitterAPI.io APIレスポンスのトレンド配列
 * @returns 正規化されたTrendData配列
 */
export function normalizeTrendArray(apiTrends: any[]): TrendData[] {
  if (!Array.isArray(apiTrends)) {
    console.warn('⚠️ Expected array for trend normalization, received:', typeof apiTrends);
    return [];
  }

  return apiTrends
    .map((trend, index) => normalizeTrendData(trend, index))
    .filter(trend => trend.name.trim() !== ''); // 空のトレンドを除外
}

/**
 * トレンド場所データの正規化
 * @param apiLocation - TwitterAPI.io APIレスポンスの場所データ
 * @returns 正規化されたTrendLocation
 */
export function normalizeTrendLocation(apiLocation: any): TrendLocation {
  return {
    woeid: normalizeNumber(apiLocation.woeid, 0),
    name: sanitizeText(apiLocation.name || ''),
    countryCode: normalizeCountryCode(apiLocation.countryCode || apiLocation.country || '')
  };
}

/**
 * 複数トレンド場所データの正規化
 * @param apiLocations - TwitterAPI.io APIレスポンスの場所配列
 * @returns 正規化されたTrendLocation配列
 */
export function normalizeTrendLocationArray(apiLocations: any[]): TrendLocation[] {
  if (!Array.isArray(apiLocations)) {
    console.warn('⚠️ Expected array for trend location normalization, received:', typeof apiLocations);
    return [];
  }

  return apiLocations
    .map(location => normalizeTrendLocation(location))
    .filter(location => location.woeid > 0 && location.name.trim() !== '');
}

// ============================================================================
// CORE NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * TwitterIDの正規化
 * @param id - 正規化対象のID
 * @returns 正規化されたID文字列
 */
export function normalizeTwitterId(id: any): string {
  if (id === null || id === undefined) return '';
  
  const idStr = String(id).trim();
  
  // 数値IDのみ許可（1-20桁）
  if (!/^\d{1,20}$/.test(idStr)) {
    console.warn(`⚠️ Invalid Twitter ID format: ${idStr}`);
    return '';
  }
  
  return idStr;
}

/**
 * Twitterユーザー名の正規化
 * @param username - 正規化対象のユーザー名
 * @returns 正規化されたユーザー名
 */
export function normalizeUsername(username: any): string {
  if (!username) return '';
  
  let normalized = String(username).trim().toLowerCase();
  
  // @マークを除去
  normalized = normalized.replace(/^@/, '');
  
  // 英数字とアンダースコアのみ許可（1-15文字）
  if (!/^[a-zA-Z0-9_]{1,15}$/.test(normalized)) {
    console.warn(`⚠️ Invalid username format: ${username}`);
    return '';
  }
  
  return normalized;
}

/**
 * タイムスタンプの正規化
 * @param timestamp - 正規化対象のタイムスタンプ
 * @returns ISO 8601形式のタイムスタンプ
 */
export function normalizeTimestamp(timestamp: any): string {
  if (!timestamp) return new Date().toISOString();
  
  try {
    // 数値の場合（Unix timestamp）
    if (typeof timestamp === 'number') {
      // ミリ秒か秒かを判定（2000年以降の場合）
      const date = timestamp > 946684800000 ? 
        new Date(timestamp) : 
        new Date(timestamp * 1000);
      return date.toISOString();
    }
    
    // 文字列の場合
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.warn(`⚠️ Invalid timestamp format: ${timestamp}`);
      return new Date().toISOString();
    }
    
    return date.toISOString();
  } catch (error) {
    console.warn(`⚠️ Error normalizing timestamp: ${timestamp}`, error);
    return new Date().toISOString();
  }
}

/**
 * URLの正規化
 * @param url - 正規化対象のURL
 * @returns 正規化されたURL
 */
export function normalizeUrl(url: any): string {
  if (!url) return '';
  
  const urlStr = String(url).trim();
  if (urlStr === '') return '';
  
  try {
    // 相対URLや不完全なURLの補完
    let fullUrl = urlStr;
    if (!/^https?:\/\//.test(urlStr)) {
      if (urlStr.startsWith('//')) {
        fullUrl = 'https:' + urlStr;
      } else if (urlStr.startsWith('/')) {
        // 相対パスは無効とする
        console.warn(`⚠️ Relative URL not supported: ${urlStr}`);
        return '';
      } else {
        fullUrl = 'https://' + urlStr;
      }
    }
    
    const urlObj = new URL(fullUrl);
    
    // HTTPS/HTTPのみ許可
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      console.warn(`⚠️ Unsupported URL protocol: ${urlObj.protocol}`);
      return '';
    }
    
    return urlObj.toString();
  } catch (error) {
    console.warn(`⚠️ Invalid URL format: ${urlStr}`, error);
    return '';
  }
}

/**
 * 数値の正規化
 * @param value - 正規化対象の値
 * @param fallback - フォールバック値
 * @returns 正規化された数値
 */
export function normalizeNumber(value: any, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  
  const num = Number(value);
  if (isNaN(num)) {
    console.warn(`⚠️ Invalid number format: ${value}`);
    return fallback;
  }
  
  return Math.max(0, num); // 負の値は0にする
}

/**
 * ブール値の正規化
 * @param value - 正規化対象の値
 * @returns 正規化されたブール値
 */
export function normalizeBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return Boolean(value);
}

/**
 * テキストのサニタイゼーション
 * @param text - サニタイズ対象のテキスト
 * @returns サニタイズされたテキスト
 */
export function sanitizeText(text: any): string {
  if (!text) return '';
  
  return String(text)
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // 制御文字除去
    .replace(/<[^>]*>/g, '') // HTMLタグ除去
    .replace(/\s+/g, ' ') // 連続空白の正規化
    .trim();
}

// ============================================================================
// SPECIFIC NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * パブリックメトリクス（ツイート用）の正規化
 * @param metrics - 正規化対象のメトリクス
 * @returns 正規化されたパブリックメトリクス
 */
export function normalizePublicMetrics(metrics: any): TweetData['public_metrics'] {
  const defaultMetrics = {
    retweet_count: 0,
    like_count: 0,
    quote_count: 0,
    reply_count: 0,
    impression_count: 0
  };

  if (!metrics) return defaultMetrics;

  return {
    retweet_count: normalizeNumber(metrics.retweet_count || metrics.retweetCount || 0),
    like_count: normalizeNumber(metrics.like_count || metrics.likeCount || metrics.favoriteCount || 0),
    quote_count: normalizeNumber(metrics.quote_count || metrics.quoteCount || 0),
    reply_count: normalizeNumber(metrics.reply_count || metrics.replyCount || 0),
    impression_count: normalizeNumber(metrics.impression_count || metrics.viewCount || metrics.impressionCount || 0)
  };
}

/**
 * パブリックメトリクス（ユーザー用）の正規化
 * @param metrics - 正規化対象のメトリクス
 * @returns 正規化されたユーザーパブリックメトリクス
 */
export function normalizeUserPublicMetrics(metrics: any): UserData['public_metrics'] {
  const defaultMetrics = {
    followers_count: 0,
    following_count: 0,
    tweet_count: 0,
    listed_count: 0
  };

  if (!metrics) return defaultMetrics;

  return {
    followers_count: normalizeNumber(metrics.followers_count || metrics.followersCount || 0),
    following_count: normalizeNumber(metrics.following_count || metrics.followingCount || 0),
    tweet_count: normalizeNumber(metrics.tweet_count || metrics.tweetsCount || metrics.statusesCount || 0),
    listed_count: normalizeNumber(metrics.listed_count || metrics.listedCount || 0),
    like_count: metrics.like_count !== undefined ? normalizeNumber(metrics.like_count) : undefined
  };
}

/**
 * コンテキスト注釈の正規化
 * @param annotations - 正規化対象の注釈配列
 * @returns 正規化されたコンテキスト注釈
 */
export function normalizeContextAnnotations(annotations: any): TweetData['context_annotations'] {
  if (!Array.isArray(annotations)) return undefined;
  
  return annotations.map(annotation => ({
    domain: {
      name: sanitizeText(annotation.domain?.name || ''),
      description: sanitizeText(annotation.domain?.description || '')
    },
    entity: {
      name: sanitizeText(annotation.entity?.name || ''),
      description: sanitizeText(annotation.entity?.description || '')
    }
  })).filter(annotation => 
    annotation.domain.name !== '' || annotation.entity.name !== ''
  );
}

/**
 * 言語コードの正規化
 * @param lang - 正規化対象の言語コード
 * @returns 正規化された言語コード
 */
export function normalizeLanguageCode(lang: any): string {
  if (!lang) return 'und'; // undetermined
  
  const langStr = String(lang).toLowerCase().trim();
  
  // ISO 639-1 コード（2文字）の検証
  if (!/^[a-z]{2}$/.test(langStr)) {
    return 'und';
  }
  
  return langStr;
}

/**
 * 国コードの正規化
 * @param country - 正規化対象の国コード
 * @returns 正規化された国コード
 */
export function normalizeCountryCode(country: any): string {
  if (!country) return '';
  
  const countryStr = String(country).toUpperCase().trim();
  
  // ISO 3166-1 alpha-2 コード（2文字）の検証
  if (!/^[A-Z]{2}$/.test(countryStr)) {
    return '';
  }
  
  return countryStr;
}

/**
 * 認証タイプの正規化
 * @param verifiedType - 正規化対象の認証タイプ
 * @returns 正規化された認証タイプ
 */
export function normalizeVerifiedType(verifiedType: any): UserData['verified_type'] {
  if (!verifiedType) return 'none';
  
  const typeStr = String(verifiedType).toLowerCase();
  const validTypes = ['blue', 'business', 'government', 'none'];
  
  return validTypes.includes(typeStr) ? 
    typeStr as UserData['verified_type'] : 
    'none';
}

/**
 * ツイート量の正規化
 * @param volume - 正規化対象のツイート量
 * @returns 正規化されたツイート量
 */
export function normalizeTweetVolume(volume: any): number | null {
  if (volume === null || volume === undefined || volume === '') {
    return null;
  }
  
  const numVolume = Number(volume);
  return isNaN(numVolume) ? null : Math.max(0, numVolume);
}

/**
 * アタッチメント情報の正規化
 * @param attachments - 正規化対象のアタッチメント
 * @returns 正規化されたアタッチメント
 */
export function normalizeAttachments(attachments: any): TweetData['attachments'] {
  if (!attachments) return undefined;
  
  const result: NonNullable<TweetData['attachments']> = {};
  
  if (attachments.media_keys && Array.isArray(attachments.media_keys)) {
    result.media_keys = attachments.media_keys
      .map((key: any) => String(key))
      .filter((key: string) => key.trim() !== '');
  }
  
  if (attachments.poll_ids && Array.isArray(attachments.poll_ids)) {
    result.poll_ids = attachments.poll_ids
      .map((id: any) => String(id))
      .filter((id: string) => id.trim() !== '');
  }
  
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * 地理情報の正規化
 * @param geo - 正規化対象の地理情報
 * @returns 正規化された地理情報
 */
export function normalizeGeoData(geo: any): TweetData['geo'] {
  if (!geo) return undefined;
  
  const result: NonNullable<TweetData['geo']> = {};
  
  if (geo.coordinates && Array.isArray(geo.coordinates.coordinates)) {
    const [lng, lat] = geo.coordinates.coordinates;
    if (typeof lng === 'number' && typeof lat === 'number') {
      result.coordinates = {
        type: 'Point',
        coordinates: [lng, lat]
      };
    }
  }
  
  if (geo.place_id) {
    result.place_id = String(geo.place_id);
  }
  
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Withheld情報の正規化
 * @param withheld - 正規化対象のWithheld情報
 * @returns 正規化されたWithheld情報
 */
export function normalizeWithheldInfo(withheld: any): UserData['withheld'] {
  if (!withheld) return undefined;
  
  return {
    country_codes: Array.isArray(withheld.country_codes) ? 
      withheld.country_codes.map((code: any) => normalizeCountryCode(code)).filter(Boolean) : 
      [],
    scope: ['tweet', 'user'].includes(withheld.scope) ? withheld.scope : 'user'
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * 敏感なデータのマスキング
 * @param data - マスキング対象のデータ
 * @returns マスキングされたデータ
 */
export function maskSensitiveData(data: string): string {
  if (!data || data.length <= 4) return '***';
  
  return data.substring(0, 2) + '*'.repeat(data.length - 4) + data.substring(data.length - 2);
}

/**
 * APIレスポンスの構造検証
 * @param response - 検証対象のレスポンス
 * @param expectedStructure - 期待される構造
 * @returns 検証結果
 */
export function validateResponseStructure(response: any, expectedStructure: string[]): boolean {
  if (!response || typeof response !== 'object') return false;
  
  return expectedStructure.every(field => {
    const keys = field.split('.');
    let current = response;
    
    for (const key of keys) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        return false;
      }
      current = current[key];
    }
    
    return true;
  });
}

/**
 * 正規化結果の統計情報生成
 * @param originalData - 元データ
 * @param normalizedData - 正規化後データ
 * @returns 統計情報
 */
export function generateNormalizationStats(originalData: any, normalizedData: any): {
  originalFields: number;
  normalizedFields: number;
  emptyFields: number;
  modifiedFields: number;
} {
  const originalFields = Object.keys(originalData || {}).length;
  const normalizedFields = Object.keys(normalizedData || {}).length;
  
  let emptyFields = 0;
  let modifiedFields = 0;
  
  for (const [key, value] of Object.entries(normalizedData || {})) {
    if (value === '' || value === null || value === undefined) {
      emptyFields++;
    }
    
    if (originalData && originalData[key] !== value) {
      modifiedFields++;
    }
  }
  
  return {
    originalFields,
    normalizedFields,
    emptyFields,
    modifiedFields
  };
}