/**
 * KaitoAPI Read-Only型定義 - 読み取り専用エンドポイント型
 * APIキー認証のみで利用可能な読み取り専用操作の型定義
 */

// 共通型のインポート
import type { TwitterAPIBaseResponse, TweetData, UserData } from '../../utils/types';

// ============================================================================
// リクエスト型
// ============================================================================

/**
 * ユーザー情報取得リクエスト
 * APIキー認証で実行可能な読み取り専用操作
 */
export interface UserInfoRequest {
  /** ユーザー名（@マークなし） */
  userName: string;
}

/**
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

// ============================================================================
// 検索関連型
// ============================================================================

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
// ユーザー最新ツイート取得型
// ============================================================================

/**
 * ユーザー最新ツイート取得パラメータ
 * APIキー認証で実行可能な読み取り専用操作
 */
export interface UserLastTweetsParams {
  /** ユーザー名（@マークなし、必須） */
  userName: string;
  /** 取得する最大ツイート数（デフォルト: 20） */
  limit?: number;
  /** リプライを含めるか（デフォルト: false） */
  includeReplies?: boolean;
  /** ページネーション用カーソル */
  cursor?: string;
}

/**
 * ユーザー最新ツイート取得レスポンス
 * 特定ユーザーの最新ツイート情報を返す
 */
export interface UserLastTweetsResponse {
  /** 成功フラグ */
  success: boolean;
  /** ツイートデータ配列 */
  tweets: Tweet[];
  /** 次のページ取得用カーソル */
  cursor?: string;
  /** さらに取得可能なデータがあるか */
  has_more?: boolean;
  /** エラー情報（失敗時） */
  error?: string;
}

/**
 * Tweet型定義（TwitterAPI.io互換）
 */
export interface Tweet {
  /** ツイートID */
  id: string;
  /** ツイート本文 */
  text: string;
  /** 投稿者ID */
  author_id: string;
  /** 投稿者ユーザー名 */
  author_username?: string;
  /** 作成日時 */
  created_at: string;
  /** パブリックメトリクス */
  public_metrics: {
    /** いいね数 */
    like_count: number;
    /** リツイート数 */
    retweet_count: number;
    /** 返信数 */
    reply_count: number;
    /** 引用ツイート数 */
    quote_count: number;
  };
  /** エンティティ情報 */
  entities?: any;
  /** 参照ツイート情報 */
  referenced_tweets?: any;
  /** 言語コード */
  lang?: string;
  /** センシティブコンテンツフラグ */
  possibly_sensitive?: boolean;
}