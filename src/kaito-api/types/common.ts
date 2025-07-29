/**
 * KaitoAPI 共通型定義 - TwitterAPI.io基本構造
 * 全認証レベルで共通使用される型定義
 * 
 * @fileoverview TwitterAPI.io仕様準拠の共通基盤型定義
 * @version 2.0.0
 * @see https://docs.twitterapi.io/introduction
 */

// ============================================================================
// CORE TYPES - TwitterAPI.io基本構造
// ============================================================================

/**
 * TwitterAPI.ioレスポンス基底型
 * すべてのAPI応答に共通する構造
 * 
 * @template T レスポンスデータの型
 * @example
 * ```typescript
 * // ツイート取得の場合
 * const response: TwitterAPIBaseResponse<TweetData> = {
 *   data: { id: "12345", text: "...", ... },
 *   meta: { result_count: 1 }
 * };
 * 
 * // 検索結果の場合
 * const searchResponse: TwitterAPIBaseResponse<TweetData[]> = {
 *   data: [{ id: "12345", text: "..." }, ...],
 *   meta: { result_count: 10, next_token: "abc123" }
 * };
 * ```
 */
export interface TwitterAPIBaseResponse<T> {
  /** 実際のレスポンスデータ */
  data: T;
  
  /** レスポンスメタデータ（ページネーション等） */
  meta?: {
    /** 結果件数 */
    result_count: number;
    /** 次のページ取得用トークン */
    next_token?: string;
    /** 前のページ取得用トークン */
    previous_token?: string;
  };
}

/**
 * API実行結果の共通型
 * 成功/失敗を明確に区別するDiscriminated Union
 * 
 * @template T 成功時のデータ型
 * @example
 * ```typescript
 * const handleResult = (result: APIResult<TweetData>) => {
 *   if (result.success) {
 *     console.log('成功:', result.data.text);
 *   } else {
 *     console.error('エラー:', result.error.message);
 *   }
 * };
 * ```
 */
export type APIResult<T> = 
  | { 
      /** 成功フラグ */
      success: true; 
      /** 成功時のデータ */
      data: T;
      /** 実行時刻 */
      timestamp: string;
    }
  | { 
      /** 失敗フラグ */
      success: false; 
      /** エラー情報 */
      error: TwitterAPIError;
      /** 実行時刻 */
      timestamp: string;
    };

// ============================================================================
// TWEET TYPES - TwitterAPI.io標準準拠
// ============================================================================

/**
 * TwitterAPI.ioツイートデータ標準形式
 * TwitterAPI.ioの実際のレスポンス構造に完全準拠
 * 
 * @example
 * ```typescript
 * const tweetData: TweetData = {
 *   id: "1234567890123456789",
 *   text: "投資教育に関するツイートです",
 *   author_id: "987654321",
 *   created_at: "2025-07-27T12:00:00.000Z",
 *   public_metrics: {
 *     retweet_count: 5,
 *     like_count: 15,
 *     quote_count: 2,
 *     reply_count: 3,
 *     impression_count: 1000
 *   },
 *   lang: "ja"
 * };
 * ```
 */
export interface TweetData {
  /** ツイートID（文字列形式） */
  id: string;
  
  /** ツイート本文 */
  text: string;
  
  /** 投稿者のユーザーID */
  author_id: string;
  
  /** 作成日時（ISO 8601形式） */
  created_at: string;
  
  /** パブリックメトリクス（エンゲージメント数） */
  public_metrics: {
    /** リツイート数 */
    retweet_count: number;
    /** いいね数 */
    like_count: number;
    /** 引用ツイート数 */
    quote_count: number;
    /** 返信数 */
    reply_count: number;
    /** インプレッション数 */
    impression_count: number;
  };
  
  /** コンテキスト注釈（トピック情報等） */
  context_annotations?: Array<{
    domain: { 
      /** ドメイン名 */
      name: string; 
      /** ドメイン説明 */
      description: string; 
    };
    entity: { 
      /** エンティティ名 */
      name: string; 
      /** エンティティ説明 */
      description: string; 
    };
  }>;
  
  /** 言語コード（ISO 639-1） */
  lang?: string;
  
  /** 返信先ユーザーID */
  in_reply_to_user_id?: string;
  
  /** 会話ID */
  conversation_id?: string;
  
  /** 添付メディア情報 */
  attachments?: {
    /** メディアキー配列 */
    media_keys?: string[];
    /** 投票ID配列 */
    poll_ids?: string[];
  };
  
  /** ジオ位置情報 */
  geo?: {
    /** 座標情報 */
    coordinates?: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
    /** 場所ID */
    place_id?: string;
  };
}

// ============================================================================
// USER TYPES - TwitterAPI.io標準準拠
// ============================================================================

/**
 * TwitterAPI.ioユーザーデータ標準形式
 * TwitterAPI.ioの実際のレスポンス構造に完全準拠
 * 
 * @example
 * ```typescript
 * const userData: UserData = {
 *   id: "123456789",
 *   username: "investment_edu",
 *   name: "投資教育アカウント",
 *   description: "投資の基礎を分かりやすく解説します",
 *   created_at: "2020-01-01T00:00:00.000Z",
 *   verified: true,
 *   public_metrics: {
 *     followers_count: 10000,
 *     following_count: 500,
 *     tweet_count: 2500,
 *     listed_count: 150
 *   },
 *   profile_image_url: "https://...",
 *   location: "Tokyo, Japan"
 * };
 * ```
 */
export interface UserData {
  /** ユーザーID（文字列形式） */
  id: string;
  
  /** ユーザー名（@マークなし） */
  username: string;
  
  /** 表示名 */
  name: string;
  
  /** プロフィール説明文 */
  description?: string;
  
  /** アカウント作成日時（ISO 8601形式） */
  created_at: string;
  
  /** 所在地 */
  location?: string;
  
  /** ウェブサイトURL */
  url?: string;
  
  /** 認証済みアカウントフラグ */
  verified?: boolean;
  
  /** 認証済みアカウントタイプ */
  verified_type?: 'blue' | 'business' | 'government' | 'none';
  
  /** プロフィール画像URL */
  profile_image_url?: string;
  
  /** プロフィールバナー画像URL */
  profile_banner_url?: string;
  
  /** パブリックメトリクス */
  public_metrics?: {
    /** フォロワー数 */
    followers_count: number;
    /** フォロー数 */
    following_count: number;
    /** ツイート数 */
    tweet_count: number;
    /** リスト登録数 */
    listed_count: number;
    /** いいね数 */
    like_count?: number;
  };
  
  /** アカウント保護設定 */
  protected?: boolean;
  
  /** アカウントのピン留めツイートID */
  pinned_tweet_id?: string;
  
  /** ウィッチボーン（内部フィールド） */
  withheld?: {
    country_codes: string[];
    scope: 'tweet' | 'user';
  };
}

// ============================================================================
// ERROR TYPES - TwitterAPI.io準拠
// ============================================================================

/**
 * TwitterAPI.ioエラーレスポンス
 * 全エラー応答の標準構造
 * 
 * @example
 * ```typescript
 * // 認証エラーの例
 * const authError: TwitterAPIError = {
 *   error: {
 *     code: "UNAUTHORIZED",
 *     message: "Invalid API key provided",
 *     type: "authentication",
 *     details: {
 *       timestamp: "2025-07-27T12:00:00Z",
 *       request_id: "req_123456789"
 *     }
 *   }
 * };
 * 
 * // レート制限エラーの例
 * const rateLimitError: TwitterAPIError = {
 *   error: {
 *     code: "RATE_LIMIT_EXCEEDED",
 *     message: "Rate limit exceeded. Try again in 15 minutes",
 *     type: "rate_limit",
 *     details: {
 *       reset_time: "2025-07-27T12:15:00Z",
 *       limit: 900,
 *       remaining: 0
 *     }
 *   }
 * };
 * ```
 */
export interface TwitterAPIError {
  error: {
    /** エラーコード */
    code: string;
    
    /** エラーメッセージ */
    message: string;
    
    /** エラータイプ */
    type: 'authentication' | 'authorization' | 'validation' | 'rate_limit' | 'server_error' | 'network_error' | 'timeout';
    
    /** エラー詳細情報 */
    details?: {
      /** エラー発生時刻 */
      timestamp?: string;
      /** リクエストID */
      request_id?: string;
      /** レート制限情報（rate_limitエラー時） */
      reset_time?: string;
      limit?: number;
      remaining?: number;
      /** 検証エラー詳細（validationエラー時） */
      field_errors?: Array<{
        field: string;
        message: string;
        code: string;
      }>;
    };
  };
}

/**
 * TwitterAPI.io QPS制御情報
 * リクエスト頻度制御の状態管理
 * 
 * @example
 * ```typescript
 * const qpsInfo: QPSInfo = {
 *   currentQPS: 150,
 *   maxQPS: 200,
 *   requestsInWindow: 150,
 *   windowStart: Date.now() - 1000,
 *   nextRequestAllowedAt: Date.now() + 5,
 *   averageResponseTime: 750
 * };
 * ```
 */
export interface QPSInfo {
  /** 現在のQPS値 */
  currentQPS: number;
  
  /** 最大QPS値（TwitterAPI.io: 200固定） */
  maxQPS: 200;
  
  /** 現在のウィンドウ内リクエスト数 */
  requestsInWindow: number;
  
  /** ウィンドウ開始時刻（Unix timestamp） */
  windowStart: number;
  
  /** 次回リクエスト許可時刻（Unix timestamp） */
  nextRequestAllowedAt?: number;
  
  /** 平均応答時間（ミリ秒） */
  averageResponseTime?: number;
}

/**
 * HTTPクライアントインターフェース
 * kaito-api/core/client.tsとの互換性維持
 */
export interface HttpClient {
  post<T>(endpoint: string, data?: any): Promise<T>;
  get<T>(endpoint: string, params?: any): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}

// ============================================================================
// UTILITY TYPES - ヘルパー型定義
// ============================================================================

/**
 * Twitter IDの型（文字列）
 * TwitterのIDは数値だが、JavaScriptのnumber精度制限により文字列として扱う
 */
export type TwitterId = string;

/**
 * ISO 8601形式の日時文字列
 */
export type ISO8601DateString = string;

/**
 * エンゲージメントアクションの型
 */
export type EngagementAction = 'like' | 'unlike' | 'retweet' | 'unretweet' | 'follow' | 'unfollow';

/**
 * ツイート検索ソート順序の型
 */
export type TweetSearchSortOrder = 'recency' | 'relevancy';

/**
 * エラータイプの型
 */
export type ErrorType = 'authentication' | 'authorization' | 'validation' | 'rate_limit' | 'server_error' | 'network_error' | 'timeout';

/**
 * サービス状態の型
 */
export type ServiceStatus = 'ok' | 'degraded' | 'error' | 'maintenance';

/**
 * 認証されたアカウントタイプの型
 */
export type VerifiedType = 'blue' | 'business' | 'government' | 'none';

// ============================================================================
// TYPE GUARDS - 実行時型安全性確保
// ============================================================================

/**
 * TwitterAPIErrorオブジェクトの型ガード
 * 実行時にオブジェクトがTwitterAPIError型かどうかを判定
 * 
 * @param obj 判定対象のオブジェクト
 * @returns TwitterAPIError型の場合true
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await apiCall();
 * } catch (error: unknown) {
 *   if (isTwitterAPIError(error)) {
 *     // TypeScriptがerror.error.typeを認識
 *     console.error(`Error ${error.error.code}: ${error.error.message}`);
 *     if (error.error.type === 'rate_limit') {
 *       console.log('Rate limit exceeded, retrying later...');
 *     }
 *   }
 * }
 * ```
 */
export function isTwitterAPIError(obj: unknown): obj is TwitterAPIError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    typeof (obj as any).error === 'object' &&
    typeof (obj as any).error.code === 'string' &&
    typeof (obj as any).error.message === 'string' &&
    typeof (obj as any).error.type === 'string'
  );
}

/**
 * APIResult成功結果の型ガード
 * 
 * @param result APIResultオブジェクト
 * @returns 成功結果の場合true
 * 
 * @example
 * ```typescript
 * const result = await executeAPICall();
 * if (isAPISuccess(result)) {
 *   console.log('Success:', result.data);
 *   // result.dataへの型安全なアクセス
 * } else {
 *   console.error('Error:', result.error.message);
 *   // result.errorへの型安全なアクセス
 * }
 * ```
 */
export function isAPISuccess<T>(result: APIResult<T>): result is Extract<APIResult<T>, { success: true }> {
  return result.success === true;
}

/**
 * APIResult失敗結果の型ガード
 * 
 * @param result APIResultオブジェクト
 * @returns 失敗結果の場合true
 * 
 * @example
 * ```typescript
 * const result = await executeAPICall();
 * if (isAPIFailure(result)) {
 *   console.error('API failed:', result.error.message);
 *   if (result.error.type === 'rate_limit') {
 *     // レート制限固有の処理
 *   }
 * }
 * ```
 */
export function isAPIFailure<T>(result: APIResult<T>): result is Extract<APIResult<T>, { success: false }> {
  return result.success === false;
}

/**
 * TwitterAPIBaseResponseの型ガード
 * 
 * @param obj 判定対象のオブジェクト
 * @returns TwitterAPIBaseResponse型の場合true
 * 
 * @example
 * ```typescript
 * function handleResponse(response: unknown) {
 *   if (isTwitterAPIBaseResponse(response)) {
 *     console.log('Data received:', response.data);
 *     if (response.meta?.next_token) {
 *       console.log('More data available');
 *     }
 *   }
 * }
 * ```
 */
export function isTwitterAPIBaseResponse<T>(obj: unknown): obj is TwitterAPIBaseResponse<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'data' in obj
  );
}

/**
 * TweetDataオブジェクトの型ガード
 * 
 * @param obj 判定対象のオブジェクト
 * @returns TweetData型の場合true
 * 
 * @example
 * ```typescript
 * function processTweetData(data: unknown) {
 *   if (isTweetData(data)) {
 *     console.log(`Tweet by ${data.author_id}: ${data.text}`);
 *     console.log(`Likes: ${data.public_metrics.like_count}`);
 *   }
 * }
 * ```
 */
export function isTweetData(obj: unknown): obj is TweetData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'text' in obj &&
    'author_id' in obj &&
    'created_at' in obj &&
    'public_metrics' in obj &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).text === 'string' &&
    typeof (obj as any).author_id === 'string' &&
    typeof (obj as any).created_at === 'string' &&
    typeof (obj as any).public_metrics === 'object'
  );
}

/**
 * UserDataオブジェクトの型ガード
 * 
 * @param obj 判定対象のオブジェクト
 * @returns UserData型の場合true
 * 
 * @example
 * ```typescript
 * function processUserData(data: unknown) {
 *   if (isUserData(data)) {
 *     console.log(`User: @${data.username} (${data.name})`);
 *     if (data.public_metrics) {
 *       console.log(`Followers: ${data.public_metrics.followers_count}`);
 *     }
 *   }
 * }
 * ```
 */
export function isUserData(obj: unknown): obj is UserData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'username' in obj &&
    'name' in obj &&
    'created_at' in obj &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).username === 'string' &&
    typeof (obj as any).name === 'string' &&
    typeof (obj as any).created_at === 'string'
  );
}

// ============================================================================
// TREND TYPES - 追加機能用（MVP範囲外だが型定義のみ）
// ============================================================================

/**
 * トレンドデータ
 * trend-endpoints.ts用（将来実装）
 */
export interface TrendData {
  name: string;
  query: string;
  tweetVolume: number | null;
  rank: number;
}

/**
 * トレンド地域情報
 * trend-endpoints.ts用（将来実装）
 */
export interface TrendLocation {
  woeid: number;
  name: string;
  countryCode: string;
}