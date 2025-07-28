/**
 * KaitoAPI 統合型定義 - TwitterAPI.io完全対応版
 * 重複型解決済み、shared/types.tsとの整合性確保
 * 
 * @fileoverview TwitterAPI.io仕様に完全準拠した型定義システム
 * @version 2.0.0
 * @see https://docs.twitterapi.io/introduction
 */

// ============================================================================
// CORE TYPES - TwitterAPI.io基本構造
// ============================================================================

/**
 * KaitoTwitterAPIクライアント設定
 * TwitterAPI.io仕様完全準拠
 * 
 * @example
 * ```typescript
 * // 新しい形式（推奨）
 * const config: KaitoClientConfig = {
 *   apiKey: process.env.KAITO_API_TOKEN,
 *   qpsLimit: 200, // TwitterAPI.io固定値
 *   retryPolicy: { maxRetries: 3, backoffMs: 1000 },
 *   costTracking: { enabled: true, ratePerThousand: 0.15 }
 * };
 * 
 * // 旧形式（互換性）
 * const legacyConfig: KaitoClientConfig = {
 *   apiKey: process.env.KAITO_API_TOKEN,
 *   qpsLimit: 200,
 *   retryPolicy: { maxRetries: 3, backoffMs: 1000 },
 *   costTracking: true // boolean形式も許可
 * };
 * ```
 */
export interface KaitoClientConfig {
  /** TwitterAPI.io API Key - x-api-key ヘッダーで使用 */
  apiKey: string;
  
  /** QPS制限 - TwitterAPI.io固定値: 200 */
  qpsLimit: 200;
  
  /** リトライポリシー設定 */
  retryPolicy: {
    /** 最大リトライ回数 */
    maxRetries: number;
    /** バックオフ間隔（ミリ秒） */
    backoffMs: number;
  };
  
  /** コスト追跡設定 - boolean（互換性）またはオブジェクト（新仕様） */
  costTracking: boolean | {
    /** コスト追跡の有効/無効 */
    enabled: boolean;
    /** 1000ツイートあたりの料金（USD） */
    ratePerThousand: 0.15;
    /** アラート閾値（USD） */
    alertThreshold?: number;
  };
}

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

/**
 * ツイート作成オプション - TwitterAPI.io準拠
 * 
 * @example
 * ```typescript
 * // 基本的なテキスト投稿
 * const basicTweet: CreateTweetOptions = {
 *   text: "投資に関する教育的なコンテンツです"
 * };
 * 
 * // メディア付き投稿
 * const mediaTweet: CreateTweetOptions = {
 *   text: "チャート分析について",
 *   media_ids: ["media_123", "media_456"]
 * };
 * 
 * // 返信投稿
 * const replyTweet: CreateTweetOptions = {
 *   text: "参考になります！",
 *   reply: { in_reply_to_tweet_id: "1234567890" }
 * };
 * ```
 */
export interface CreateTweetOptions {
  /** ツイート本文（最大280文字） */
  text: string;
  
  /** 添付メディアID配列（最大4つ） */
  media_ids?: string[];
  
  /** 投票オプション */
  poll?: {
    /** 投票選択肢（2-4個） */
    options: string[];
    /** 投票期間（分単位、5-10080分） */
    duration_minutes: number;
  };
  
  /** 返信設定 */
  reply?: {
    /** 返信先ツイートID */
    in_reply_to_tweet_id: string;
  };
  
  /** 引用ツイートID */
  quote_tweet_id?: string;
  
  /** 位置情報 */
  location?: {
    /** 場所ID */
    place_id: string;
  };
  
  /** ツイート公開範囲設定 */
  reply_settings?: 'everyone' | 'mentioned_users' | 'followers';
}

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
// RESPONSE TYPES - TwitterAPI.io統一レスポンス構造
// ============================================================================

/**
 * ツイート作成レスポンス
 * TwitterAPIBaseResponseを使用した統一構造
 * 
 * @example
 * ```typescript
 * const createResponse: TweetCreateResponse = {
 *   data: {
 *     id: "1234567890123456789",
 *     text: "投稿されたツイート内容",
 *     created_at: "2025-07-27T12:00:00.000Z",
 *     // ... その他のTweetDataプロパティ
 *   }
 * };
 * ```
 */
export interface TweetCreateResponse extends TwitterAPIBaseResponse<TweetData> {}

/**
 * ツイート検索レスポンス
 * 複数ツイートの検索結果を返す
 * 
 * @example
 * ```typescript
 * const searchResponse: TweetSearchResponse = {
 *   data: [
 *     { id: "123", text: "投資関連ツイート1", ... },
 *     { id: "456", text: "投資関連ツイート2", ... }
 *   ],
 *   meta: {
 *     result_count: 2,
 *     next_token: "abc123def456"
 *   }
 * };
 * ```
 */
export interface TweetSearchResponse extends TwitterAPIBaseResponse<TweetData[]> {}

/**
 * ユーザー情報レスポンス
 * 単一ユーザーの詳細情報を返す
 * 
 * @example
 * ```typescript
 * const userResponse: UserInfoResponse = {
 *   data: {
 *     id: "123456789",
 *     username: "investment_edu",
 *     name: "投資教育アカウント",
 *     // ... その他のUserDataプロパティ
 *   }
 * };
 * ```
 */
export interface UserInfoResponse extends TwitterAPIBaseResponse<UserData> {}

/**
 * ユーザー検索レスポンス
 * 複数ユーザーの検索結果を返す
 * 
 * @example
 * ```typescript
 * const userSearchResponse: UserSearchResponse = {
 *   data: [
 *     { id: "123", username: "user1", name: "ユーザー1", ... },
 *     { id: "456", username: "user2", name: "ユーザー2", ... }
 *   ],
 *   meta: {
 *     result_count: 2,
 *     next_token: "xyz789"
 *   }
 * };
 * ```
 */
export interface UserSearchResponse extends TwitterAPIBaseResponse<UserData[]> {}

/**
 * エンゲージメントレスポンス
 * いいね、リツイート等のアクション実行結果
 * 
 * @example
 * ```typescript
 * // いいね実行結果
 * const likeResponse: EngagementResponse = {
 *   success: true,
 *   action: "like",
 *   tweetId: "1234567890123456789",
 *   timestamp: "2025-07-27T12:00:00.000Z",
 *   data: { liked: true }
 * };
 * 
 * // リツイート実行結果
 * const retweetResponse: EngagementResponse = {
 *   success: true,
 *   action: "retweet",
 *   tweetId: "1234567890123456789",
 *   timestamp: "2025-07-27T12:00:00.000Z",
 *   data: { retweeted: true }
 * };
 * ```
 */
export interface EngagementResponse {
  /** 実行成功フラグ */
  success: boolean;
  
  /** 実行されたアクション */
  action: 'like' | 'unlike' | 'retweet' | 'unretweet' | 'follow' | 'unfollow';
  
  /** 対象ツイートID（フォロー系の場合はユーザーID） */
  tweetId: string;
  
  /** 実行時刻（ISO 8601形式） */
  timestamp: string;
  
  /** アクション固有の結果データ */
  data: {
    /** いいね状態 */
    liked?: boolean;
    /** リツイート状態 */
    retweeted?: boolean;
    /** フォロー状態 */
    following?: boolean;
  };
  
  /** エラー情報（失敗時） */
  error?: {
    code: string;
    message: string;
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
 * TwitterAPI.io認証確認レスポンス
 * API Key有効性確認の結果
 * 
 * @example
 * ```typescript
 * const authResponse: AuthVerificationResponse = {
 *   data: {
 *     authenticated: true,
 *     user: {
 *       id: "123456789",
 *       username: "investment_edu",
 *       name: "投資教育アカウント"
 *     },
 *     permissions: ["read", "write", "direct_messages"],
 *     rate_limits: {
 *       general: { remaining: 900, reset_time: "2025-07-27T13:00:00Z" },
 *       posting: { remaining: 300, reset_time: "2025-07-27T13:00:00Z" }
 *     }
 *   }
 * };
 * ```
 */
export interface AuthVerificationResponse extends TwitterAPIBaseResponse<{
  /** 認証状態 */
  authenticated: boolean;
  
  /** 認証されたユーザー情報 */
  user?: {
    id: string;
    username: string;
    name: string;
  };
  
  /** 権限リスト */
  permissions?: string[];
  
  /** レート制限情報 */
  rate_limits?: {
    general: RateLimitInfo;
    posting: RateLimitInfo;
    collection?: RateLimitInfo;
  };
}> {}

/**
 * TwitterAPI.ioヘルスチェックレスポンス
 * APIサービス状態確認
 * 
 * @example
 * ```typescript
 * const healthResponse: HealthCheckResponse = {
 *   status: "ok",
 *   timestamp: "2025-07-27T12:00:00.000Z",
 *   version: "v2.1.0",
 *   uptime: 99.99,
 *   response_time_ms: 245,
 *   active_connections: 1250,
 *   system_load: 0.65
 * };
 * ```
 */
export interface HealthCheckResponse {
  /** サービス状態 */
  status: 'ok' | 'degraded' | 'error' | 'maintenance';
  
  /** チェック実行時刻 */
  timestamp: string;
  
  /** APIバージョン */
  version?: string;
  
  /** 稼働率（パーセンテージ） */
  uptime?: number;
  
  /** 応答時間（ミリ秒） */
  response_time_ms?: number;
  
  /** アクティブ接続数 */
  active_connections?: number;
  
  /** システム負荷 */
  system_load?: number;
  
  /** エラー詳細（statusがerror時） */
  error_details?: {
    message: string;
    affected_services: string[];
    estimated_recovery: string;
  };
}

/**
 * レート制限情報
 * TwitterAPI.io各エンドポイントの制限状況
 */
export interface RateLimitInfo {
  /** 残り利用可能数 */
  remaining: number;
  
  /** 制限リセット時刻（ISO 8601形式） - 新仕様 */
  reset_time?: string;
  
  /** @deprecated Use reset_time instead - 既存コード互換性 */
  resetTime?: string;
  
  /** 制限値 */
  limit: number;
  
  /** 使用済み数 */
  used?: number;
}

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
// LEGACY TYPE COMPATIBILITY - 最小限の互換性維持
// ============================================================================

/**
 * @deprecated Use TweetData instead
 * shared/types.tsとの互換性のため残存
 * 
 * @example
 * ```typescript
 * // 新しいコード（推奨）
 * const tweetData: TweetData = { ... };
 * 
 * // 旧コード（互換性のみ）
 * const tweetResult: TweetResult = { ... };
 * ```
 */
export interface TweetResult {
  id: string;
  text: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * @deprecated Use EngagementResponse instead
 * shared/types.tsとの互換性のため残存
 */
export interface PostResult {
  id: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * @deprecated Use UserData instead
 * camelCase命名のレガシー型（既存endpoints使用のため残存）
 */
export interface AccountInfo {
  id: string;
  username: string;
  displayName: string;
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  verified: boolean;
  createdAt: string;
  description: string;
  location: string;
  website: string;
  profileImageUrl: string;
  bannerImageUrl: string;
  timestamp: string;
}

/**
 * コスト追跡情報
 * data/current/cost-tracking.yamlとの互換性維持
 */
export interface CostTrackingInfo {
  tweetsProcessed: number;
  estimatedCost: number;
  resetDate: string;
  lastUpdated: string;
}

/**
 * レート制限状態
 * 既存のシステム監視との互換性維持
 */
export interface RateLimitStatus {
  general: RateLimitInfo;
  posting: RateLimitInfo;
  collection: RateLimitInfo;
  lastUpdated: string;
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

/**
 * 投稿リクエスト
 * action-endpoints.tsとの互換性維持
 */
export interface PostRequest {
  content: string;
  mediaIds?: string[];
}

/**
 * 投稿レスポンス
 * action-endpoints.tsとの互換性維持
 */
export interface PostResponse {
  success: boolean;
  tweetId?: string;
  createdAt?: string;
  error?: string;
}

/**
 * エンドポイント設定
 * kaito-api/core/client.tsとの互換性維持
 */
export interface EndpointConfig {
  user: {
    info: string;
    follow: string;
    unfollow: string;
    search: string;
  };
  tweet: {
    create: string;
    retweet: string;
    quote: string;
    search: string;
    delete: string;
  };
  engagement: {
    like: string;
    unlike: string;
    bookmark: string;
    unbookmark: string;
  };
  auth: {
    verify: string;
    refresh: string;
  };
  health: string;
}

/**
 * @deprecated Use KaitoClientConfig instead
 * 既存のconfigシステムとの互換性維持
 */
export interface KaitoAPIConfig {
  environment: 'dev' | 'staging' | 'prod';
  api: {
    baseUrl: string;
    version: string;
    timeout: number;
    retryPolicy: {
      maxRetries: number;
      backoffMs: number;
      retryConditions: string[];
    };
  };
  authentication: {
    primaryKey: string;
    secondaryKey?: string;
    keyRotationInterval: number;
    encryptionEnabled: boolean;
  };
  performance: {
    qpsLimit: number;
    responseTimeTarget: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
  monitoring: {
    metricsEnabled: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    alertingEnabled: boolean;
    healthCheckInterval: number;
  };
  security: {
    rateLimitEnabled: boolean;
    ipWhitelist: string[];
    auditLoggingEnabled: boolean;
    encryptionKey: string;
  };
  features: {
    realApiEnabled: boolean;
    mockFallbackEnabled: boolean;
    batchProcessingEnabled: boolean;
    advancedCachingEnabled: boolean;
  };
  metadata: {
    version: string;
    lastUpdated: string;
    updatedBy: string;
    checksum: string;
  };
}

/**
 * @deprecated OAuth1 not used in TwitterAPI.io
 * auth-manager.tsとの互換性維持のみ
 */
export interface LoginCredentials {
  user_name: string;
  email: string;
  password: string;
  totp_secret: string;
  proxy: string;
}

/**
 * @deprecated OAuth1 not used in TwitterAPI.io
 * auth-manager.tsとの互換性維持のみ
 */
export interface LoginResult {
  success: boolean;
  login_cookie?: string;
  session_expires?: number;
  error?: string;
}

/**
 * @deprecated Use AuthVerificationResponse instead
 * auth-manager.tsとの互換性維持
 */
export interface AuthStatus {
  apiKeyValid: boolean;
  userSessionValid: boolean;
  sessionExpiry: number | null;
  canPerformUserActions: boolean;
}

/**
 * 設定検証結果
 * config.tsとの互換性維持
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedAt: string;
  environment: string;
}

/**
 * @deprecated Use EngagementResponse instead
 * endpoints互換性維持
 */
export interface EngagementRequest {
  tweetId: string;
  action: 'like' | 'retweet';
}

/**
 * @deprecated Use UserData instead
 * user-endpoints.tsとの互換性維持
 */
export interface UserInfo {
  id: string;
  username: string;
  displayName: string;
  description: string;
  followersCount: number;
  followingCount: number;
  tweetsCount: number;
  verified: boolean;
  createdAt: string;
  location: string;
  website: string;
  profileImageUrl: string;
  bannerImageUrl: string;
}

/**
 * @deprecated Use EngagementResponse instead
 * 既存endpoints互換性維持
 */
export interface QuoteTweetResult {
  id: string;
  originalTweetId: string;
  comment: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * @deprecated Use EngagementResponse instead
 * 既存endpoints互換性維持
 */
export interface CoreRetweetResult {
  id: string;
  originalTweetId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * @deprecated Use EngagementResponse instead
 * 既存endpoints互換性維持
 */
export interface LikeResult {
  tweetId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * @deprecated Use EngagementResponse instead
 * 既存endpoints互換性維持
 */
export interface RetweetResult {
  id: string;
  originalTweetId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * @deprecated Use TweetCreateResponse instead
 * 既存endpoints互換性維持
 */
export interface QuoteResult {
  id: string;
  originalTweetId: string;
  comment: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * @deprecated Use EngagementResponse instead
 * 既存endpoints互換性維持
 */
export interface FollowResult {
  userId: string;
  following: boolean;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * @deprecated Use EngagementResponse instead
 * 既存endpoints互換性維持
 */
export interface UnfollowResult {
  userId: string;
  unfollowed: boolean;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * プロフィール更新データ
 * user-endpoints.tsとの互換性維持
 */
export interface ProfileUpdateData {
  displayName?: string;
  description?: string;
  location?: string;
  website?: string;
}

/**
 * プロフィール更新結果
 * user-endpoints.tsとの互換性維持
 */
export interface ProfileUpdateResult {
  userId: string;
  updated: boolean;
  timestamp: string;
  success: boolean;
  updatedFields: string[];
  error?: string;
}

/**
 * ツイート検索結果
 * tweet-endpoints.tsとの互換性維持
 */
export interface TweetSearchResult {
  tweets: TweetData[];
  totalCount: number;
  nextToken?: string;
  searchQuery: string;
  timestamp: string;
}

/**
 * ユーザー検索結果
 * user-endpoints.tsとの互換性維持
 */
export interface UserSearchResult {
  users: UserInfo[];
  totalCount: number;
  nextToken?: string;
  searchQuery: string;
  timestamp: string;
}

/**
 * ツイート削除結果
 * tweet-endpoints.tsとの互換性維持
 */
export interface DeleteTweetResult {
  tweetId: string;
  deleted: boolean;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * @deprecated Use TweetCreateResponse instead
 * 既存endpoints互換性維持
 */
export interface TwitterAPITweetResponse {
  data: {
    id: string;
    text: string;
    created_at: string;
    author_id: string;
    public_metrics?: {
      retweet_count: number;
      like_count: number;
      quote_count: number;
      reply_count: number;
      impression_count: number;
    };
    context_annotations?: Array<{
      domain: { name: string; description: string };
      entity: { name: string; description: string };
    }>;
    lang?: string;
  };
}

/**
 * @deprecated Use TweetSearchResponse instead
 * 既存endpoints互換性維持
 */
export interface TwitterAPISearchResponse {
  data: Array<TwitterAPITweetResponse['data']>;
  meta?: {
    result_count: number;
    next_token?: string;
  };
}

/**
 * @deprecated Use UserInfoResponse instead
 * 既存endpoints互換性維持
 */
export interface TwitterAPIUserResponse {
  data: {
    id: string;
    username: string;
    name: string;
    description?: string;
    created_at: string;
    location?: string;
    url?: string;
    verified?: boolean;
    profile_image_url?: string;
    profile_banner_url?: string;
    public_metrics?: {
      followers_count: number;
      following_count: number;
      tweet_count: number;
    };
  };
}

/**
 * @deprecated Use UserSearchResponse instead
 * 既存endpoints互換性維持
 */
export interface TwitterAPIUserSearchResponse {
  data: Array<TwitterAPIUserResponse['data']>;
  meta?: {
    result_count: number;
    next_token?: string;
  };
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