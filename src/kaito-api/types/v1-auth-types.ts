/**
 * KaitoAPI V1ログイン認証専用型定義
 * V1認証プロセスと基本投稿・エンゲージメント操作の型定義
 * 
 * @fileoverview TwitterAPI.io V1ログイン認証で実行可能な操作の型定義
 * @version 2.0.0
 * @see https://docs.twitterapi.io/authentication#v1-login-authentication
 */

import type { 
  TwitterAPIBaseResponse, 
  TweetData, 
  EngagementAction 
} from './common';

// ============================================================================
// V1 AUTHENTICATION TYPES - V1認証プロセス型
// ============================================================================

/**
 * V1ログインステップ1リクエスト
 * ユーザー名/メールアドレス + パスワードでの初期認証
 * 
 * @example
 * ```typescript
 * const loginStep1: V1LoginStep1Request = {
 *   username_or_email: "user@example.com",
 *   password: "secure_password",
 *   proxy: "http://proxy:8080"
 * };
 * ```
 */
export interface V1LoginStep1Request {
  /** ユーザー名またはメールアドレス */
  username_or_email: string;
  
  /** パスワード */
  password: string;
  
  /** プロキシ設定（オプション） */
  proxy: string;
}

/**
 * V1ログインステップ1レスポンス
 * 初期認証の結果と2FA用のlogin_dataを返す
 * 
 * @example
 * ```typescript
 * const response: V1LoginStep1Response = {
 *   success: true,
 *   login_data: "encrypted_auth_data_here",
 *   message: "2FA code required"
 * };
 * ```
 */
export interface V1LoginStep1Response {
  /** ログイン成功フラグ */
  success: boolean;
  
  /** 2FA認証用データ（暗号化済み） */
  login_data?: string;
  
  /** エラーメッセージ（失敗時） */
  error?: string;
  
  /** 追加メッセージ */
  message?: string;
}

/**
 * V1ログインステップ2リクエスト
 * 2FA認証による最終ログイン完了
 * 
 * @example
 * ```typescript
 * const loginStep2: V1LoginStep2Request = {
 *   login_data: "encrypted_auth_data_from_step1",
 *   '2fa_code': "123456",
 *   proxy: "http://proxy:8080"
 * };
 * ```
 */
export interface V1LoginStep2Request {
  /** ステップ1で取得したlogin_data */
  login_data: string;
  
  /** 2FA認証コード（6桁数字） */
  '2fa_code': string;
  
  /** プロキシ設定（オプション） */
  proxy: string;
}

/**
 * V1ログインステップ2レスポンス
 * 最終ログイン結果とセッション情報を返す
 * 
 * @example
 * ```typescript
 * const response: V1LoginStep2Response = {
 *   success: true,
 *   session: "auth_session_token_here",
 *   expires_at: 1672531200
 * };
 * ```
 */
export interface V1LoginStep2Response {
  /** ログイン成功フラグ */
  success: boolean;
  
  /** 認証セッショントークン */
  session?: string;
  
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
// V1 ACTION TYPES - V1投稿・アクション型
// ============================================================================

/**
 * V1ツイート作成リクエスト
 * V1認証での基本的なツイート投稿
 * 
 * @example
 * ```typescript
 * const tweetRequest: V1TweetCreateRequest = {
 *   text: "投資に関する教育的なコンテンツです",
 *   auth_session: "session_token_from_login",
 *   proxy: "http://proxy:8080"
 * };
 * ```
 */
export interface V1TweetCreateRequest {
  /** ツイート本文（最大280文字） */
  text: string;
  
  /** V1認証セッショントークン */
  auth_session: string;
  
  /** プロキシ設定（オプション） */
  proxy: string;
  
  /** 返信先ツイートID（返信時） */
  in_reply_to_status_id?: string;
  
  /** メディアID配列（画像等の添付時） */
  media_ids?: string[];
}

/**
 * V1ツイート作成レスポンス
 * ツイート投稿結果を返す
 */
export type V1TweetCreateResponse = TwitterAPIBaseResponse<TweetData>;

/**
 * V1エンゲージメントリクエスト
 * いいね、リツイート等のエンゲージメント操作
 * 
 * @example
 * ```typescript
 * // いいね操作
 * const likeRequest: V1EngagementRequest = {
 *   tweet_id: "1234567890123456789",
 *   action: "like",
 *   auth_session: "session_token",
 *   proxy: "http://proxy:8080"
 * };
 * 
 * // リツイート操作
 * const retweetRequest: V1EngagementRequest = {
 *   tweet_id: "1234567890123456789",
 *   action: "retweet",
 *   auth_session: "session_token",
 *   proxy: "http://proxy:8080"
 * };
 * ```
 */
export interface V1EngagementRequest {
  /** 対象ツイートID */
  tweet_id: string;
  
  /** エンゲージメント操作 */
  action: 'like' | 'unlike' | 'retweet' | 'unretweet';
  
  /** V1認証セッショントークン */
  auth_session: string;
  
  /** プロキシ設定（オプション） */
  proxy: string;
}

/**
 * V1エンゲージメントレスポンス
 * エンゲージメント操作の実行結果
 * 
 * @example
 * ```typescript
 * const response: V1EngagementResponse = {
 *   success: true,
 *   action: "like",
 *   tweet_id: "1234567890123456789",
 *   timestamp: "2025-07-27T12:00:00.000Z",
 *   data: { liked: true }
 * };
 * ```
 */
export interface V1EngagementResponse {
  /** 実行成功フラグ */
  success: boolean;
  
  /** 実行されたアクション */
  action: EngagementAction;
  
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
  };
  
  /** エラー情報（失敗時） */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * V1フォロー操作リクエスト
 * ユーザーのフォロー/アンフォロー操作
 * 
 * @example
 * ```typescript
 * const followRequest: V1FollowRequest = {
 *   user_id: "987654321",
 *   action: "follow",
 *   auth_session: "session_token",
 *   proxy: "http://proxy:8080"
 * };
 * ```
 */
export interface V1FollowRequest {
  /** 対象ユーザーID */
  user_id: string;
  
  /** フォロー操作 */
  action: 'follow' | 'unfollow';
  
  /** V1認証セッショントークン */
  auth_session: string;
  
  /** プロキシ設定（オプション） */
  proxy: string;
}

/**
 * V1フォロー操作レスポンス
 * フォロー操作の実行結果
 * 
 * @example
 * ```typescript
 * const response: V1FollowResponse = {
 *   success: true,
 *   action: "follow",
 *   user_id: "987654321",
 *   timestamp: "2025-07-27T12:00:00.000Z",
 *   data: { following: true }
 * };
 * ```
 */
export interface V1FollowResponse {
  /** 実行成功フラグ */
  success: boolean;
  
  /** 実行されたアクション */
  action: 'follow' | 'unfollow';
  
  /** 対象ユーザーID */
  user_id: string;
  
  /** 実行時刻（ISO 8601形式） */
  timestamp: string;
  
  /** フォロー状態データ */
  data: {
    /** フォロー状態 */
    following: boolean;
  };
  
  /** エラー情報（失敗時） */
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// SESSION MANAGEMENT TYPES - V1セッション管理型
// ============================================================================

/**
 * V1セッションデータ構造
 * V1認証のセッション情報管理
 * 
 * @example
 * ```typescript
 * const sessionData: V1SessionData = {
 *   auth_session: "session_token_here",
 *   expires_at: 1672531200,
 *   created_at: 1672444800,
 *   user_info: {
 *     username: "investment_edu",
 *     user_id: "123456789"
 *   }
 * };
 * ```
 */
export interface V1SessionData {
  /** V1認証セッショントークン */
  auth_session: string;
  
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
}

/**
 * V1セッション検証レスポンス
 * セッションの有効性確認結果
 * 
 * @example
 * ```typescript
 * const validation: V1SessionValidationResponse = {
 *   valid: true,
 *   expires_at: 1672531200,
 *   time_remaining: 86400
 * };
 * ```
 */
export interface V1SessionValidationResponse {
  /** セッション有効フラグ */
  valid: boolean;
  
  /** セッション期限（Unix timestamp） */
  expires_at?: number;
  
  /** 残り時間（秒） */
  time_remaining?: number;
  
  /** エラーメッセージ（無効時） */
  error?: string;
}

// ============================================================================
// LEGACY COMPATIBILITY - 後方互換性維持
// ============================================================================

/**
 * @deprecated Use V1LoginStep1Response and V1LoginStep2Response instead
 * 既存auth-manager.tsとの互換性維持
 */
export interface LoginCredentials {
  user_name: string;
  email: string;
  password: string;
  totp_secret: string;
  proxy: string;
}

/**
 * @deprecated Use V1LoginStep2Response instead
 * 既存auth-manager.tsとの互換性維持
 */
export interface LoginResult {
  success: boolean;
  login_cookie?: string;
  session_expires?: number;
  error?: string;
  /** V1認証セッション（後方互換性） */
  auth_session?: string;
}

/**
 * @deprecated Use V1TweetCreateResponse instead
 * 既存endpoints互換性維持
 */
export interface PostResult {
  id: string;
  url: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * @deprecated Use V1EngagementResponse instead
 * 既存endpoints互換性維持
 */
export interface LikeResult {
  tweetId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

/**
 * @deprecated Use V1EngagementResponse instead
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
 * @deprecated Use V1FollowResponse instead
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
 * @deprecated Use V1FollowResponse instead
 * 既存endpoints互換性維持
 */
export interface UnfollowResult {
  userId: string;
  unfollowed: boolean;
  timestamp: string;
  success: boolean;
  error?: string;
}