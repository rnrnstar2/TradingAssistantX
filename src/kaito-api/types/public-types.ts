/**
 * KaitoAPI APIキー認証専用型定義
 * 読み取り専用操作の型定義（API Key認証レベル）
 * 
 * @fileoverview TwitterAPI.io APIキー認証で実行可能な操作の型定義
 * @version 2.0.0
 * @see https://docs.twitterapi.io/authentication#api-key-authentication
 */

import type { 
  TwitterAPIBaseResponse, 
  TweetData, 
  UserData, 
  TrendData 
} from './common';

// ============================================================================
// REQUEST TYPES - APIキー認証専用リクエスト
// ============================================================================

/**
 * ユーザー情報取得リクエスト
 * APIキー認証で実行可能な読み取り専用操作
 * 
 * @example
 * ```typescript
 * const request: UserInfoRequest = {
 *   userName: "investment_edu"
 * };
 * ```
 */
export interface UserInfoRequest {
  /** ユーザー名（@マークなし） */
  userName: string;
}

/**
 * ツイート検索リクエスト
 * APIキー認証で実行可能な検索操作
 * 
 * @example
 * ```typescript
 * const request: TweetSearchRequest = {
 *   query: "bitcoin OR ethereum lang:ja",
 *   queryType: "recent",
 *   count: 20
 * };
 * ```
 */
export interface TweetSearchRequest {
  /** 検索クエリ（TwitterAPI.io検索構文） */
  query: string;
  
  /** 検索タイプ */
  queryType: 'recent' | 'popular' | 'mixed';
  
  /** 取得件数（最大100件） */
  count?: number;
  
  /** ページネーション用トークン */
  next_token?: string;
}

/**
 * トレンド取得リクエスト
 * 指定地域のトレンド情報取得
 * 
 * @example
 * ```typescript
 * const request: TrendRequest = {
 *   location: "Japan"
 * };
 * ```
 */
export interface TrendRequest {
  /** 取得対象地域（省略時は全世界） */
  location?: string;
  
  /** WOEID（Where On Earth IDentifier） */
  woeid?: number;
}

/**
 * フォロワー情報取得リクエスト
 * ユーザーのフォロワー/フォロー情報取得
 * 
 * @example
 * ```typescript
 * const request: FollowerInfoRequest = {
 *   userName: "investment_edu",
 *   type: "followers",
 *   count: 50
 * };
 * ```
 */
export interface FollowerInfoRequest {
  /** ユーザー名（@マークなし） */
  userName: string;
  
  /** 取得タイプ */
  type: 'followers' | 'following';
  
  /** 取得件数（最大200件） */
  count?: number;
  
  /** ページネーション用トークン */
  next_token?: string;
}

// ============================================================================
// SEARCH OPTIONS - 検索オプション詳細設定
// ============================================================================

/**
 * ツイート検索オプション - TwitterAPI.io準拠
 * 
 * @example
 * ```typescript
 * // 基本的な検索
 * const basicSearch: TweetSearchOptions = {
 *   query: "bitcoin OR ethereum",
 *   max_results: 10
 * };
 * 
 * // 高度な検索（時間範囲指定）
 * const advancedSearch: TweetSearchOptions = {
 *   query: "投資 lang:ja",
 *   max_results: 50,
 *   start_time: "2025-07-01T00:00:00Z",
 *   end_time: "2025-07-27T23:59:59Z",
 *   sort_order: "relevancy",
 *   "tweet.fields": "public_metrics,author_id,created_at",
 *   "user.fields": "username,verified"
 * };
 * ```
 */
export interface TweetSearchOptions {
  /** 検索クエリ（TwitterAPI.io検索構文） */
  query: string;
  
  /** 最大結果数（10-100、デフォルト: 10） */
  max_results?: number;
  
  /** ページネーション用トークン */
  next_token?: string;
  
  /** 検索開始時刻（ISO 8601形式） */
  start_time?: string;
  
  /** 検索終了時刻（ISO 8601形式） */
  end_time?: string;
  
  /** ソート順序 */
  sort_order?: 'recency' | 'relevancy';
  
  /** 取得するツイートフィールド */
  'tweet.fields'?: string;
  
  /** 取得するユーザーフィールド */
  'user.fields'?: string;
  
  /** 取得するメディアフィールド */
  'media.fields'?: string;
  
  /** 取得する場所フィールド */
  'place.fields'?: string;
  
  /** 取得する投票フィールド */
  'poll.fields'?: string;
  
  /** 拡張情報の取得設定 */
  expansions?: string;
}

/**
 * ユーザー検索オプション - TwitterAPI.io準拠
 * 
 * @example
 * ```typescript
 * // 基本的なユーザー検索
 * const basicUserSearch: UserSearchOptions = {
 *   query: "investment educator",
 *   max_results: 10
 * };
 * 
 * // 詳細情報付きユーザー検索
 * const detailedUserSearch: UserSearchOptions = {
 *   query: "crypto influencer verified:true",
 *   max_results: 50,
 *   "user.fields": "public_metrics,verified,created_at,description",
 *   "tweet.fields": "public_metrics",
 *   expansions: "pinned_tweet_id"
 * };
 * ```
 */
export interface UserSearchOptions {
  /** 検索クエリ（ユーザー名、表示名、説明文を対象） */
  query: string;
  
  /** 最大結果数（1-100、デフォルト: 10） */
  max_results?: number;
  
  /** ページネーション用トークン */
  next_token?: string;
  
  /** 取得するユーザーフィールド */
  'user.fields'?: string;
  
  /** 取得するツイートフィールド */
  'tweet.fields'?: string;
  
  /** 拡張情報の取得設定 */
  expansions?: string;
}

// ============================================================================
// RESPONSE TYPES - APIキー認証専用レスポンス
// ============================================================================

/**
 * ユーザー情報レスポンス
 * 単一ユーザーの詳細情報を返す
 */
export type UserInfoResponse = TwitterAPIBaseResponse<UserData>;

/**
 * ツイート検索レスポンス
 * 複数ツイートの検索結果を返す
 */
export type TweetSearchResponse = TwitterAPIBaseResponse<TweetData[]>;

/**
 * ユーザー検索レスポンス
 * 複数ユーザーの検索結果を返す
 */
export type UserSearchResponse = TwitterAPIBaseResponse<UserData[]>;

/**
 * トレンドレスポンス
 * 指定地域のトレンド情報を返す
 */
export type TrendResponse = TwitterAPIBaseResponse<TrendData[]>;

/**
 * フォロワー情報レスポンス
 * ユーザーのフォロワー/フォロー情報を返す
 */
export type FollowerInfoResponse = TwitterAPIBaseResponse<UserData[]>;

// ============================================================================
// CONFIGURATION TYPES - APIキー認証設定
// ============================================================================

/**
 * APIキー認証設定
 * APIキー認証で使用する設定情報
 * 
 * @example
 * ```typescript
 * const config: ApiKeyAuthConfig = {
 *   apiKey: process.env.TWITTER_API_KEY!,
 *   baseUrl: "https://api.twitterapi.io",
 *   timeout: 30000,
 *   rateLimitHandling: "auto"
 * };
 * ```
 */
export interface ApiKeyAuthConfig {
  /** TwitterAPI.io APIキー */
  apiKey: string;
  
  /** APIベースURL */
  baseUrl: string;
  
  /** リクエストタイムアウト（ミリ秒） */
  timeout: number;
  
  /** レート制限対応方法 */
  rateLimitHandling: 'auto' | 'manual' | 'ignore';
  
  /** リトライ設定 */
  retryConfig?: {
    /** 最大リトライ回数 */
    maxRetries: number;
    /** リトライ間隔（ミリ秒） */
    retryDelay: number;
    /** 指数バックオフの使用 */
    exponentialBackoff: boolean;
  };
}

// ============================================================================
// LEGACY COMPATIBILITY - 後方互換性維持
// ============================================================================

/**
 * @deprecated Use TweetSearchResult instead
 * 既存endpoints互換性維持
 */
export interface TweetSearchResult {
  tweets: TweetData[];
  totalCount: number;
  nextToken?: string;
  searchQuery: string;
  timestamp: string;
}

/**
 * @deprecated Use UserSearchResponse instead
 * 既存endpoints互換性維持
 */
export interface UserSearchResult {
  users: UserData[];
  totalCount: number;
  nextToken?: string;
  searchQuery: string;
  timestamp: string;
}