/**
 * KaitoAPI V2ログイン認証専用型定義
 * V2認証プロセスと高機能投稿・DM・コミュニティ操作の型定義
 * 
 * @fileoverview TwitterAPI.io V2ログイン認証で実行可能な高機能操作の型定義
 * @version 2.0.0
 * @see https://docs.twitterapi.io/authentication#v2-login-authentication
 */

import type { 
  TwitterAPIBaseResponse, 
  TweetData
} from './common';

// ============================================================================
// V2 AUTHENTICATION TYPES - V2認証プロセス型
// ============================================================================

/**
 * V2ログインリクエスト
 * 統合認証による1ステップログイン（V1より簡潔）
 * 
 * @example
 * ```typescript
 * const loginRequest: V2LoginRequest = {
 *   username: "investment_edu",
 *   email: "user@example.com",
 *   password: "secure_password",
 *   totp_secret: "JBSWY3DPEHPK3PXP",
 *   proxy: "http://proxy:8080"
 * };
 * ```
 */
export interface V2LoginRequest {
  /** ユーザー名 */
  username: string;
  
  /** メールアドレス */
  email: string;
  
  /** パスワード */
  password: string;
  
  /** TOTP秘密鍵（2FA用） */
  totp_secret: string;
  
  /** プロキシ設定（オプション） */
  proxy: string;
}

/**
 * V2ログインレスポンス
 * 統合認証の結果とセッション情報を返す
 * 
 * @example
 * ```typescript
 * const response: V2LoginResponse = {
 *   success: true,
 *   login_cookie: "v2_session_cookie_here",
 *   expires_at: 1672531200,
 *   user_info: {
 *     id: "123456789",
 *     username: "investment_edu"
 *   }
 * };
 * ```
 */
export interface V2LoginResponse {
  /** ログイン成功フラグ */
  success: boolean;
  
  /** V2認証クッキー */
  login_cookie?: string;
  
  /** セッション期限（Unix timestamp） */
  expires_at?: number;
  
  /** エラーメッセージ（失敗時） */
  error?: string;
  
  /** ユーザー情報（成功時） */
  user_info?: {
    /** ユーザーID */
    id: string;
    /** ユーザー名 */
    username: string;
  };
}

// ============================================================================
// V2 TWEET TYPES - V2高機能投稿型
// ============================================================================

/**
 * V2ツイート作成リクエスト
 * V2認証での高機能ツイート投稿（ノートツイート、返信設定等）
 * 
 * @example
 * ```typescript
 * // 基本投稿
 * const basicTweet: V2TweetCreateRequest = {
 *   tweet_text: "投資教育に関する詳細な解説記事です",
 *   login_cookies: "v2_session_cookie",
 *   proxy: "http://proxy:8080"
 * };
 * 
 * // ノートツイート（長文投稿）
 * const noteTweet: V2TweetCreateRequest = {
 *   tweet_text: "投資の基礎から応用まで詳しく解説します...",
 *   login_cookies: "v2_session_cookie",
 *   proxy: "http://proxy:8080",
 *   is_note_tweet: true,
 *   reply_settings: "followers"
 * };
 * ```
 */
export interface V2TweetCreateRequest {
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
 * V2ツイート作成レスポンス
 * V2高機能ツイート投稿結果
 */
export type V2TweetCreateResponse = TwitterAPIBaseResponse<TweetData & {
  /** ノートツイートフラグ */
  note_tweet?: boolean;
  /** 返信設定 */
  reply_settings?: 'everyone' | 'mentioned_users' | 'followers';
}>;

// ============================================================================
// V2 DIRECT MESSAGE TYPES - V2 DM機能型
// ============================================================================

/**
 * V2ダイレクトメッセージ送信リクエスト
 * V2認証での高機能DM送信
 * 
 * @example
 * ```typescript
 * const dmRequest: V2DMRequest = {
 *   recipient_id: "987654321",
 *   message: "投資に関するご質問ありがとうございます",
 *   login_cookies: "v2_session_cookie",
 *   proxy: "http://proxy:8080"
 * };
 * ```
 */
export interface V2DMRequest {
  /** 送信先ユーザーID */
  recipient_id: string;
  
  /** メッセージ本文 */
  message: string;
  
  /** V2認証クッキー */
  login_cookies: string;
  
  /** プロキシ設定（オプション） */
  proxy: string;
  
  /** 添付メディアID */
  media_id?: string;
  
  /** クイック返信オプション */
  quick_reply_options?: string[];
}

/**
 * V2ダイレクトメッセージレスポンス
 * DM送信結果
 */
export type V2DMResponse = TwitterAPIBaseResponse<{
  /** DMメッセージID */
  id: string;
  /** メッセージ本文 */
  text: string;
  /** 送信日時（ISO 8601形式） */
  created_at: string;
  /** 送信者ID */
  sender_id: string;
  /** 受信者ID */
  recipient_id: string;
  /** 添付メディア情報 */
  attachments?: {
    media_keys?: string[];
  };
}>;

// ============================================================================
// V2 COMMUNITY TYPES - V2コミュニティ機能型
// ============================================================================

/**
 * V2コミュニティ作成リクエスト
 * V2認証でのコミュニティ作成（高機能）
 * 
 * @example
 * ```typescript
 * const communityRequest: V2CommunityRequest = {
 *   name: "投資教育コミュニティ",
 *   description: "投資の基礎から応用まで学べるコミュニティ",
 *   login_cookies: "v2_session_cookie",
 *   proxy: "http://proxy:8080",
 *   is_private: false,
 *   rules: ["投資に関する建設的な議論を心がけてください"]
 * };
 * ```
 */
export interface V2CommunityRequest {
  /** コミュニティ名 */
  name: string;
  
  /** コミュニティ説明 */
  description: string;
  
  /** V2認証クッキー */
  login_cookies: string;
  
  /** プロキシ設定（オプション） */
  proxy: string;
  
  /** プライベートコミュニティフラグ */
  is_private?: boolean;
  
  /** コミュニティルール */
  rules?: string[];
  
  /** 招待制フラグ */
  invite_only?: boolean;
}

/**
 * V2コミュニティレスポンス
 * コミュニティ作成結果
 */
export type V2CommunityResponse = TwitterAPIBaseResponse<{
  /** コミュニティID */
  id: string;
  /** コミュニティ名 */
  name: string;
  /** コミュニティ説明 */
  description: string;
  /** 作成日時（ISO 8601形式） */
  created_at: string;
  /** 管理者ID */
  admin_id: string;
  /** メンバー数 */
  member_count: number;
  /** プライベートフラグ */
  is_private: boolean;
  /** 招待制フラグ */
  invite_only?: boolean;
}>;

// ============================================================================
// V2 ADVANCED ENGAGEMENT TYPES - V2高度エンゲージメント型
// ============================================================================

/**
 * V2高度エンゲージメントリクエスト
 * 高機能いいね、リツイート、ブックマーク等
 * 
 * @example
 * ```typescript
 * const engagementRequest: V2AdvancedEngagementRequest = {
 *   tweet_id: "1234567890123456789",
 *   action: "bookmark",
 *   login_cookies: "v2_session_cookie",
 *   proxy: "http://proxy:8080",
 *   collection_id: "bookmark_collection_123"
 * };
 * ```
 */
export interface V2AdvancedEngagementRequest {
  /** 対象ツイートID */
  tweet_id: string;
  
  /** エンゲージメント操作 */
  action: 'like' | 'unlike' | 'retweet' | 'unretweet' | 'bookmark' | 'unbookmark';
  
  /** V2認証クッキー */
  login_cookies: string;
  
  /** プロキシ設定（オプション） */
  proxy: string;
  
  /** ブックマークコレクションID（ブックマーク時） */
  collection_id?: string;
  
  /** コメント付きリツイート本文（引用RT時） */
  quote_comment?: string;
}

/**
 * V2高度エンゲージメントレスポンス
 * 高機能エンゲージメント操作の実行結果
 * 
 * @example
 * ```typescript
 * const response: V2AdvancedEngagementResponse = {
 *   success: true,
 *   action: "bookmark",
 *   tweet_id: "1234567890123456789",
 *   timestamp: "2025-07-27T12:00:00.000Z",
 *   data: { 
 *     bookmarked: true,
 *     collection_id: "bookmark_collection_123"
 *   }
 * };
 * ```
 */
export interface V2AdvancedEngagementResponse {
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

// ============================================================================
// SESSION MANAGEMENT TYPES - V2セッション管理型
// ============================================================================

/**
 * V2セッションデータ構造
 * V2認証のセッション情報管理
 * 
 * @example
 * ```typescript
 * const sessionData: V2SessionData = {
 *   login_cookie: "v2_session_cookie_here",
 *   expires_at: 1672531200,
 *   created_at: 1672444800,
 *   user_info: {
 *     username: "investment_edu",
 *     user_id: "123456789"
 *   },
 *   capabilities: ["tweet", "dm", "community", "advanced_engagement"]
 * };
 * ```
 */
export interface V2SessionData {
  /** V2認証クッキー */
  login_cookie: string;
  
  /** セッション期限（Unix timestamp） */
  expires_at: number;
  
  /** セッション作成時刻（Unix timestamp） */
  created_at: number;
  
  /** ユーザー情報（オプション） */
  user_info?: {
    /** ユーザー名 */
    username: string;
    /** ユーザーID */
    user_id: string;
  };
  
  /** V2認証で利用可能な機能リスト */
  capabilities?: string[];
}

/**
 * V2セッション検証レスポンス
 * V2セッションの有効性確認結果
 * 
 * @example
 * ```typescript
 * const validation: V2SessionValidationResponse = {
 *   valid: true,
 *   expires_at: 1672531200,
 *   time_remaining: 86400,
 *   capabilities: ["tweet", "dm", "community"]
 * };
 * ```
 */
export interface V2SessionValidationResponse {
  /** セッション有効フラグ */
  valid: boolean;
  
  /** セッション期限（Unix timestamp） */
  expires_at?: number;
  
  /** 残り時間（秒） */
  time_remaining?: number;
  
  /** 利用可能な機能リスト */
  capabilities?: string[];
  
  /** エラーメッセージ（無効時） */
  error?: string;
}

// ============================================================================
// LEGACY COMPATIBILITY - 後方互換性維持
// ============================================================================

/**
 * @deprecated Use V2LoginResponse instead
 * user_login_v2 APIレスポンス（既存コード互換性）
 */
export interface UserLoginV2Response {
  /** ログイン成功フラグ */
  success: boolean;
  
  /** ログインクッキー（セッショントークン） */
  login_cookie?: string;
  
  /** エラーメッセージ（失敗時） */
  error?: string;
  
  /** ユーザー情報（成功時） */
  user_info?: {
    /** ユーザーID */
    id: string;
    /** ユーザー名 */
    username: string;
  };
}

/**
 * @deprecated Use V2TweetCreateResponse instead
 * create_tweet_v2 APIレスポンス（既存コード互換性）
 */
export interface CreateTweetV2Response {
  /** 投稿成功フラグ */
  success: boolean;
  
  /** 投稿データ（成功時） */
  data?: {
    /** ツイートID */
    id: string;
    /** ツイート本文 */
    text: string;
    /** 作成日時 */
    created_at: string;
  };
  
  /** エラーメッセージ（失敗時） */
  error?: string;
}

/**
 * @deprecated Use V2TweetCreateRequest instead
 * 既存endpoints互換性維持
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