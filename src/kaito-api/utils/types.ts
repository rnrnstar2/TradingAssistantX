// ============================================================================
// KaitoTwitterAPI 統合型定義
// ============================================================================

/**
 * KaitoAPI 統合型定義システム
 * TwitterAPI.io 3層認証アーキテクチャ対応の型定義統合
 * 
 * @fileoverview API応答・エンドポイント型定義を管理するファイル
 * @version 2.0.0
 * @see https://docs.twitterapi.io/authentication
 */

// 認証・設定関連型はcore/types.tsから直接インポート
import type { 
  LoginCredentials, 
  UserLoginV2Response, 
  LoginResult, 
  AuthStatus,
  KaitoAPIConfig, 
  KaitoClientConfig, 
  EndpointConfig, 
  ConfigValidationResult, 
  SessionData 
} from '../core/types';

// 再エクスポート（後方互換性のため）
export { 
  LoginCredentials, 
  UserLoginV2Response, 
  LoginResult, 
  AuthStatus,
  KaitoAPIConfig, 
  KaitoClientConfig, 
  EndpointConfig, 
  ConfigValidationResult, 
  SessionData 
};

// ============================================================================
// 共通型定義 - TwitterAPI.io基本構造
// ============================================================================

/**
 * TwitterAPI.ioレスポンス基底型
 * すべてのAPI応答に共通する構造
 * 
 * @template T レスポンスデータの型
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

/**
 * TwitterAPI.ioツイートデータ標準形式
 * TwitterAPI.ioの実際のレスポンス構造に完全準拠
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
 * TwitterAPI.ioユーザーデータ標準形式
 * TwitterAPI.ioの実際のレスポンス構造に完全準拠
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
 * TwitterAPI.ioエラーレスポンス
 * 全エラー応答の標準構造
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
  post<T>(endpoint: string, data?: Record<string, unknown>): Promise<T>;
  get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}



// ============================================================================
// レート制限関連型  
// ============================================================================

/**
 * レート制限状態
 * レート制限の現在状態
 */
export interface RateLimitStatus {
  /** 残り利用可能数 */
  remaining: number;
  /** 制限値 */
  limit: number;
  /** リセット時刻（Unix timestamp） */
  reset: number;
  /** 使用済み数 */
  used: number;
  /** ウィンドウサイズ（秒） */
  window: number;
  /** 一般的なレート制限情報 */
  general?: {
    remaining: number;
    limit: number;
    reset: number;
    used: number;
    resetTime?: number;
  };
  /** 投稿関連のレート制限情報 */
  posting?: {
    remaining: number;
    limit: number;
    reset: number;
    used: number;
    resetTime?: number;
  };
  /** コレクション関連のレート制限情報 */
  collection?: {
    remaining: number;
    limit: number;
    reset: number;
    used: number;
    resetTime?: number;
  };
}

// ============================================================================
// 読み取り専用API型（APIキー認証レベル）
// ============================================================================

// ============================================================================
// 読み取り専用API型（APIキー認証レベル）
// 注意: これらの型はendpoints/read-only/types.tsから統合インポートに移行
// 新しい実装では endpoints/read-only/types.ts の型定義を使用してください
// ============================================================================

/**
 * @deprecated 代わりに endpoints/read-only/types.ts の UserInfoRequest を使用してください
 * ユーザー情報取得リクエスト
 * APIキー認証で実行可能な読み取り専用操作
 */
export interface UserInfoRequest {
  /** ユーザー名（@マークなし） */
  userName: string;
}

/**
 * @deprecated 代わりに endpoints/read-only/types.ts の TweetSearchRequest を使用してください
 * ツイート検索リクエスト
 * APIキー認証で実行可能な検索操作
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
 * @deprecated 代わりに endpoints/read-only/types.ts の TweetSearchOptions を使用してください
 * ツイート検索オプション - TwitterAPI.io準拠
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
 * @deprecated 代わりに endpoints/read-only/types.ts の FollowerInfoRequest を使用してください
 * フォロワー情報取得リクエスト
 * ユーザーのフォロワー/フォロー情報取得
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
// 認証必須API型（V2認証レベル）
// ============================================================================

/**
 * V2ツイート作成リクエスト
 * V2認証での高機能ツイート投稿（ノートツイート、返信設定等）
 */
export interface PostRequest {
  /** ツイート本文（ノートツイートの場合は長文可能） */
  tweet_text: string;
  
  /** V2認証クッキー */
  login_cookies: string;
  
  /** プロキシ設定（オプション） */
  proxy: string;
  
  /** ノートツイートフラグ（長文投稿） */
  is_note_tweet?: boolean;
  
  /** 返信可能ユーザー設定 */
  reply_settings?: 'everyone' | 'mentioned_users' | 'followers';
  
  /** 返信先ツイートID（返信時） */
  in_reply_to_tweet_id?: string;
  
  /** 引用ツイートID（引用時） */
  quote_tweet_id?: string;
  
  /** メディアID配列（画像等の添付時） */
  media_ids?: string[];
  
  /** 投票オプション */
  poll?: {
    /** 投票選択肢（2-4個） */
    options: string[];
    /** 投票期間（分単位、5-10080分） */
    duration_minutes: number;
  };
  
  /** 位置情報 */
  location?: {
    /** 場所ID */
    place_id: string;
  };
}

/**
 * エンゲージメントリクエスト
 * 高機能いいね、リツイート、ブックマーク等
 */
export interface EngagementRequest {
  /** 対象ツイートID */
  tweet_id: string;
  
  /** エンゲージメント操作 */
  action: 'like' | 'unlike' | 'retweet' | 'unretweet' | 'bookmark' | 'unbookmark';
  
  /** プロキシ設定（オプション） */
  proxy: string;
  
  /** ブックマークコレクションID（ブックマーク時） */
  collection_id?: string;
  
  /** コメント付きリツイート本文（引用RT時） */
  quote_comment?: string;
}

// ============================================================================
// レスポンス型
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
export type SearchResponse = TwitterAPIBaseResponse<TweetData[]>;

/**
 * フォロワー情報レスポンス
 * ユーザーのフォロワー/フォロー情報を返す
 */
export type FollowerInfoResponse = TwitterAPIBaseResponse<UserData[]>;

/**
 * ツイート作成レスポンス
 * V2高機能ツイート投稿結果
 */
export type PostResponse = TwitterAPIBaseResponse<TweetData & {
  /** ノートツイートフラグ */
  note_tweet?: boolean;
  /** 返信設定 */
  reply_settings?: 'everyone' | 'mentioned_users' | 'followers';
}>;

/**
 * エンゲージメントレスポンス
 * 高機能エンゲージメント操作の実行結果
 */
export interface EngagementResponse {
  /** 実行成功フラグ */
  success: boolean;
  
  /** 実行されたアクション */
  action: 'like' | 'unlike' | 'retweet' | 'unretweet' | 'bookmark' | 'unbookmark';
  
  /** 対象ツイートID */
  tweet_id: string;
  
  /** 実行時刻（ISO 8601形式） */
  timestamp: string;
  
  /** アクション固有の結果データ */
  data: {
    /** いいね状態 */
    liked?: boolean;
    /** リツイート状態 */
    retweeted?: boolean;
    /** ブックマーク状態 */
    bookmarked?: boolean;
    /** ブックマークコレクションID */
    collection_id?: string;
    /** 引用RTのID（引用RT時） */
    quote_tweet_id?: string;
  };
  
  /** エラー情報（失敗時） */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * TwitterAPIレスポンス統合型
 * 全API応答を包括する型
 */
export type TwitterAPIResponse<T> = TwitterAPIBaseResponse<T>;

/**
 * エラーレスポンス
 * API実行時のエラー情報
 */
export type ErrorResponse = TwitterAPIError;

// ============================================================================
// ユーティリティ型定義
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

/**
 * レート制限情報
 * QPS制御との互換性維持
 */
export interface RateLimitInfo {
  /** 残り利用可能数 */
  remaining: number;
  
  /** 制限リセット時刻（ISO 8601形式） */
  reset_time?: string;
  
  /** 制限リセット時刻（数値形式） */
  resetTime?: number;
  
  /** 制限値 */
  limit: number;
  
  /** 使用済み数 */
  used?: number;
  
  /** リトライ待機時間（秒） */
  retryAfter?: number;
}

/**
 * コスト追跡情報
 * API使用料金の追跡
 */
export interface CostTrackingInfo {
  /** 実行コスト（USD） */
  cost: number;
  /** API実行数 */
  apiCalls: number;
  /** 時刻（ISO 8601形式） */
  timestamp: string;
  /** エンドポイント */
  endpoint: string;
  /** 処理されたツイート数 */
  tweetsProcessed: number;
  /** 推定コスト（USD） */
  estimatedCost: number;
  /** 最終更新時刻（ISO 8601形式） */
  lastUpdated: string;
  /** リセット日時（ISO 8601形式） */
  resetDate: string;
}

// ============================================================================
// アクション結果型
// ============================================================================

/**
 * ツイート投稿結果
 * ツイート作成の実行結果
 */
export interface PostResult {
  /** 実行成功フラグ */
  success: boolean;
  /** 作成されたツイートID（プライマリ） */
  id?: string;
  /** 作成されたツイートID（エイリアス） */
  tweetId?: string;
  /** ツイートURL */
  url?: string;
  /** 作成されたツイートデータ */
  tweet?: TweetData;
  /** 実行時刻（ISO 8601形式） */
  timestamp: string;
  /** エラー情報（失敗時） */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * ツイート結果（汎用）
 * 各種ツイート操作の結果
 */
export interface TweetResult {
  /** 実行成功フラグ */
  success: boolean;
  /** 対象ツイートID */
  tweetId: string;
  /** アクション */
  action: string;
  /** 実行時刻（ISO 8601形式） */
  timestamp: string;
  /** 結果データ */
  data?: Record<string, unknown>;
  /** エラー情報（失敗時） */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 引用ツイート結果
 * 引用ツイートの実行結果
 */
export interface QuoteTweetResult {
  /** 実行成功フラグ */
  success: boolean;
  /** 引用ツイートID */
  quoteTweetId?: string;
  /** 元ツイートID */
  originalTweetId: string;
  /** 引用コメント */
  comment?: string;
  /** 実行時刻（ISO 8601形式） */
  timestamp: string;
  /** エラー情報（失敗時） */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * いいね結果
 * いいねアクションの実行結果
 */
export interface LikeResult {
  /** 実行成功フラグ */
  success: boolean;
  /** 対象ツイートID */
  tweetId: string;
  /** いいね状態（true: いいね済み、false: いいね解除） */
  liked: boolean;
  /** 実行時刻（ISO 8601形式） */
  timestamp: string;
  /** エラー情報（失敗時） */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * アカウント情報
 * 認証されたアカウントの詳細情報
 */
export interface AccountInfo {
  /** ユーザーID */
  id: string;
  /** ユーザー名（@マークなし） */
  username: string;
  /** 表示名 */
  name: string;
  /** メールアドレス */
  email?: string;
  /** 認証済みフラグ */
  verified: boolean;
  /** 認証タイプ */
  verifiedType?: VerifiedType;
  /** プロフィール画像URL */
  profileImageUrl?: string;
  /** アカウント作成日時（ISO 8601形式） */
  createdAt: string;
  /** フォロワー数 */
  followersCount: number;
  /** フォロー数 */
  followingCount: number;
  /** ツイート数 */
  tweetCount: number;
}

// ============================================================================
// 検索・ユーザー情報関連型
// ============================================================================

/**
 * ユーザー情報（汎用）
 * ユーザー検索等で使用される簡易情報
 */
export interface UserInfo {
  /** ユーザーID */
  id: string;
  /** ユーザー名（@マークなし） */
  username: string;
  /** 表示名 */
  name: string;
  /** 表示名（エイリアス） */
  displayName?: string;
  /** プロフィール説明文 */
  description?: string;
  /** プロフィール説明文（エイリアス） */
  bio?: string;
  /** 認証済みフラグ */
  verified?: boolean;
  /** プロフィール画像URL */
  profileImageUrl?: string;
  /** フォロワー数 */
  followersCount?: number;
  /** フォロー数 */
  followingCount?: number;
  /** ツイート数 */
  tweetCount?: number;
  /** いいね数 */
  likeCount?: number;
  /** 所在地（オプション） */
  location?: string;
  /** 保護されたアカウント */
  protected?: boolean;
}

/**
 * ユーザー検索結果
 * ユーザー検索の結果リスト
 */
export interface UserSearchResult {
  /** 検索結果のユーザー配列 */
  users: UserInfo[];
  /** 総件数 */
  totalCount: number;
  /** 次のページトークン */
  nextToken?: string;
  /** 前のページトークン */
  previousToken?: string;
  /** 検索クエリ */
  searchQuery?: string;
  /** 実行時刻 */
  executedAt?: string;
}

/**
 * ユーザー検索オプション
 * ユーザー検索時の設定
 */
export interface UserSearchOptions {
  /** 検索クエリ */
  query: string;
  /** 最大結果数 */
  maxResults?: number;
  /** 取得件数 */
  count?: number;
  /** 結果タイプ */
  resultType?: 'recent' | 'popular' | 'mixed';
  /** ページネーション用トークン */
  nextToken?: string;
  /** ソート順序 */
  sortOrder?: 'relevancy' | 'recent';
}

/**
 * ツイート検索結果（汎用）
 * ツイート検索の結果
 */
export interface TweetSearchResult {
  /** 検索結果のツイート配列 */
  tweets: TweetData[];
  /** 総件数 */
  totalCount: number;
  /** 次のページトークン */
  nextToken?: string;
  /** 前のページトークン */
  previousToken?: string;
  /** 検索実行時刻 */
  searchedAt: string;
}

// ============================================================================
// TwitterAPIレスポンス型エイリアス
// ============================================================================

/**
 * TwitterAPIツイートレスポンス
 * TwitterAPI.ioのツイート取得レスポンス
 */
export interface TwitterAPITweetResponse extends TwitterAPIBaseResponse<TweetData> {
  /** レート制限情報 */
  rateLimit?: RateLimitInfo;
}

/**
 * TwitterAPI検索レスポンス
 * TwitterAPI.ioの検索レスポンス
 */
export interface TwitterAPISearchResponse extends TwitterAPIBaseResponse<TweetData[]> {
  /** ツイート配列（エイリアス） */
  statuses?: TweetData[];
  /** ツイート配列（プライマリ） */
  tweets?: TweetData[];
  /** 検索メタデータ */
  search_metadata?: {
    next_results?: string;
    refresh_url?: string;
    count?: number;
    since_id?: string;
    max_id?: string;
    query?: string;
  };
  /** レート制限情報 */
  rateLimit?: RateLimitInfo;
}

/**
 * TwitterAPIユーザーレスポンス
 * TwitterAPI.ioのユーザー取得レスポンス
 */
export interface TwitterAPIUserResponse extends TwitterAPIBaseResponse<UserData> {
  /** レート制限情報 */
  rateLimit?: RateLimitInfo;
}

/**
 * TwitterAPIユーザー検索レスポンス
 * TwitterAPI.ioのユーザー検索レスポンス
 */
export interface TwitterAPIUserSearchResponse extends TwitterAPIBaseResponse<UserData[]> {
  /** 検索されたユーザー配列 */
  users?: UserData[];
  /** 総件数 */
  totalCount?: number;
  /** レート制限情報 */
  rateLimit?: RateLimitInfo;
}

/**
 * フォロワーレスポンス
 * フォロワー/フォロー情報のレスポンス
 */
export interface FollowerResponse extends TwitterAPIBaseResponse<UserData[]> {
  /** 次のカーソル */
  nextCursor?: string;
  /** レート制限情報 */
  rateLimit?: RateLimitInfo;
}

// ============================================================================
// トレンド・フォロー関連型
// ============================================================================

/**
 * トレンドデータ
 * トレンド情報
 */
export interface TrendData {
  /** トレンド名 */
  name: string;
  /** 検索クエリ */
  query?: string;
  /** ツイート数 */
  tweetVolume?: number | null;
  /** トレンドランク */
  rank?: number;
  /** トレンドURL */
  url?: string;
  /** 昇進レート */
  promotedContent?: boolean;
  /** トレンドタイプ */
  trendType?: 'hashtag' | 'keyword' | 'topic';
}

/**
 * トレンド位置情報
 * トレンドの地理的情報
 */
export interface TrendLocation {
  /** 場所ID */
  woeid: number;
  /** 場所名 */
  name: string;
  /** 国名（オプション） */
  country?: string;
  /** 国コード */
  countryCode: string;
  /** 親位置ID */
  parentid?: number;
}

/**
 * 検索リクエスト（汎用）
 * 検索機能の汎用リクエスト
 */
export interface SearchRequest {
  /** 検索クエリ */
  query: string;
  /** 検索タイプ */
  type: 'tweets' | 'users' | 'trends';
  /** 最大結果数 */
  maxResults?: number;
  /** フィルタオプション */
  filters?: {
    /** 言語フィルタ */
    lang?: string;
    /** 日時フィルタ */
    since?: string;
    until?: string;
    /** 位置フィルタ */
    location?: string;
  };
}

/**
 * トレンドレスポンス
 * トレンド取得の結果
 */
export interface TrendsResponse {
  /** トレンドデータ配列 */
  trends: TrendData[];
  /** 位置情報 */
  location: TrendLocation;
  /** 取得時刻 */
  asOf: string;
  /** 作成時刻 */
  createdAt: string;
}

/**
 * フォローリクエスト
 * フォロー操作のリクエスト
 */
export interface FollowRequest {
  /** 対象ユーザーID */
  userId: string;
  /** アクション（フォロー/アンフォロー） */
  action: 'follow' | 'unfollow';
  /** 認証クッキー */
  cookies: string;
  /** プロキシ設定 */
  proxy?: string;
}

/**
 * フォローレスポンス
 * フォロー操作の結果
 */
export interface FollowResponse {
  /** 実行成功フラグ */
  success: boolean;
  /** 対象ユーザーID */
  userId: string;
  /** 実行されたアクション */
  action: 'follow' | 'unfollow';
  /** フォロー状態 */
  following: boolean;
  /** 実行時刻（ISO 8601形式） */
  timestamp: string;
  /** エラー情報（失敗時） */
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// 高度な検索オプション
// ============================================================================

/**
 * 高度な検索オプション
 * 詳細な検索設定
 */
export interface AdvancedSearchOptions {
  /** 検索クエリ */
  query: string;
  /** 検索タイプ */
  queryType?: 'recent' | 'popular' | 'mixed';
  /** 最大結果数 */
  maxResults?: number;
  /** 取得件数 */
  count?: number;
  /** 結果タイプ */
  resultType?: 'recent' | 'popular' | 'mixed';
  /** ページネーション用トークン */
  nextToken?: string;
  /** 検索開始時刻 */
  startTime?: string;
  /** 検索終了時刻 */
  endTime?: string;
  /** ソート順序 */
  sortOrder?: 'recency' | 'relevancy';
  /** 言語フィルタ */
  lang?: string;
  /** 位置フィルタ */
  geocode?: string;
  /** ツイートフィールド */
  tweetFields?: string[];
  /** ユーザーフィールド */
  userFields?: string[];
  /** 拡張情報 */
  expansions?: string[];
}

// ============================================================================
// 型ガード - 実行時型安全性確保
// ============================================================================

/**
 * TwitterAPIErrorオブジェクトの型ガード
 * 実行時にオブジェクトがTwitterAPIError型かどうかを判定
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
 */
export function isAPISuccess<T>(result: APIResult<T>): result is Extract<APIResult<T>, { success: true }> {
  return result.success === true;
}

/**
 * APIResult失敗結果の型ガード
 */
export function isAPIFailure<T>(result: APIResult<T>): result is Extract<APIResult<T>, { success: false }> {
  return result.success === false;
}

/**
 * TwitterAPIBaseResponseの型ガード
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
// 後方互換性エイリアス
// ============================================================================

/** @deprecated Use PostRequest instead */
export type TweetCreateRequest = PostRequest;

/** @deprecated Use PostResponse instead */
export type TweetCreateResponse = PostResponse;

/** @deprecated Use SearchResponse instead */
export type TweetSearchResponse = SearchResponse;

/** @deprecated Use UserInfoResponse instead */
export type UserResponse = UserInfoResponse;

/** @deprecated Use EngagementResponse instead */
export type LikeResponse = EngagementResponse;

/** @deprecated Use EngagementResponse instead */
export type RetweetResponse = EngagementResponse;

// ============================================================================
// 緊急修正用型定義（最小限のみ）
// ============================================================================

export interface FollowResult {
  success: boolean;
  userId: string;
  following?: boolean;
  timestamp: string;
  error?: string;
}

export interface UnfollowResult {
  success: boolean;
  userId: string;
  unfollowed?: boolean;
  timestamp: string;
  error?: string;
}

export interface DeleteTweetResult {
  success: boolean;
  tweetId: string;
  timestamp: string;
  error?: string;
}

// ============================================================================
// 型エラー修正用の追加型定義
// ============================================================================

/**
 * 簡略化されたTwitterAPIError型（handleTweetSearchError用）
 */
export interface SimpleTwitterAPIError {
  code: string;
  message: string;
  operation?: string;
  context?: any;
}

/**
 * RateLimitInfo型の定義
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * CreateTweetV2Response型の修正
 */
export interface CreateTweetV2Response extends TwitterAPIBaseResponse<{
  id: string;
  text: string;
  created_at: string;
}> {}