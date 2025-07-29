/**
 * Authenticated Endpoints 専用型定義
 * V2ログイン認証必須機能の型集約
 * REQUIREMENTS.md準拠
 */

// ============================================================================
// DM (Direct Message) 関連型
// ============================================================================

/**
 * ダイレクトメッセージ送信リクエスト
 * 
 * @interface DirectMessageRequest
 * @description V2ログイン認証でのDM送信に必要なパラメータ
 */
export interface DirectMessageRequest {
  /** 受信者のTwitterユーザーID（数字文字列） */
  recipientId: string;
  
  /** 送信するメッセージテキスト（最大10000文字） */
  text: string;
  
  /** 添付メディアID配列（最大4個、オプション） */
  mediaIds?: string[];
}

/**
 * ダイレクトメッセージ送信レスポンス
 * 
 * @interface DirectMessageResponse
 * @description DM送信APIからの応答データ
 */
export interface DirectMessageResponse {
  /** 送信成功フラグ */
  success: boolean;
  
  /** 送信されたメッセージのID（成功時のみ） */
  messageId?: string;
  
  /** メッセージ作成日時（成功時のみ） */
  createdAt?: string;
  
  /** エラーメッセージ（失敗時のみ） */
  error?: string;
}

// ============================================================================
// V2認証共通型
// ============================================================================

/**
 * V2ログイン認証共通リクエスト基底型
 * 
 * @interface V2AuthenticationRequest
 * @description 全てのV2認証必須APIで共通して必要なパラメータ
 */
export interface V2AuthenticationRequest {
  /** V2ログイン時に取得したクッキー情報（必須） */
  login_cookie: string;
  
  /** その他のリクエストパラメータ */
  [key: string]: any;
}

/**
 * V2認証検証結果
 * 
 * @interface V2AuthValidationResult
 * @description V2ログイン認証の検証結果
 */
export interface V2AuthValidationResult {
  /** 認証が有効かどうか */
  isValid: boolean;
  
  /** 認証エラーメッセージ（無効時のみ） */
  error?: string;
  
  /** セッション有効期限（Unix timestamp） */
  expiresAt?: number;
}

// ============================================================================
// レート制限関連型
// ============================================================================

/**
 * APIレート制限情報
 * 
 * @interface RateLimitInfo
 * @description TwitterAPI各エンドポイントのレート制限状況
 */
export interface RateLimitInfo {
  /** 残りリクエスト数 */
  remaining: number;
  
  /** リセット時刻（Unix timestamp） */
  resetTime: number;
  
  /** 制限値（時間窓での最大リクエスト数） */
  limit: number;
  
  /** 時間窓の長さ（ミリ秒） */
  windowMs?: number;
}

/**
 * レート制限状況レスポンス
 * 
 * @interface RateLimitStatus
 * @description レート制限チェックの結果
 */
export interface RateLimitStatus {
  /** リクエスト実行可能かどうか */
  canProceed: boolean;
  
  /** 次回リクエスト可能時刻（制限時のみ） */
  nextAvailableAt?: Date;
  
  /** レート制限情報 */
  limitInfo: RateLimitInfo;
}

// ============================================================================
// 共通エラー関連型
// ============================================================================

/**
 * V2 API エラーレスポンス
 * 
 * @interface V2APIErrorResponse
 * @description V2認証APIで発生するエラーの統一形式
 */
export interface V2APIErrorResponse {
  /** エラー発生フラグ */
  success: false;
  
  /** エラーメッセージ */
  error: string;
  
  /** HTTPステータスコード */
  statusCode?: number;
  
  /** エラーコード（TwitterAPI固有） */
  code?: string;
  
  /** 詳細エラー情報 */
  details?: {
    /** 操作名 */
    operation: string;
    
    /** タイムスタンプ */
    timestamp: string;
    
    /** 追加情報 */
    metadata?: Record<string, unknown>;
  };
}

/**
 * バリデーションエラー詳細
 * 
 * @interface ValidationError
 * @description 入力値検証で発生するエラーの詳細情報
 */
export interface ValidationError {
  /** エラーが発生したフィールド名 */
  field: string;
  
  /** エラーメッセージ */
  message: string;
  
  /** 受信した値 */
  receivedValue: unknown;
  
  /** 期待される値の形式 */
  expectedFormat?: string;
}

/**
 * バリデーション結果
 * 
 * @interface ValidationResult
 * @description 入力値検証の統一結果形式
 */
export interface ValidationResult {
  /** バリデーション成功フラグ */
  isValid: boolean;
  
  /** エラー一覧（検証失敗時のみ） */
  errors: ValidationError[];
  
  /** 警告一覧（成功だが注意が必要な項目） */
  warnings?: string[];
}

// ============================================================================
// セキュリティチェック関連型
// ============================================================================

/**
 * セキュリティチェック結果
 * 
 * @interface SecurityCheckResult
 * @description コンテンツのセキュリティ検証結果
 */
export interface SecurityCheckResult {
  /** 安全性確認フラグ */
  isSafe: boolean;
  
  /** 検出された問題一覧 */
  issues: string[];
  
  /** 危険度レベル（1:低, 2:中, 3:高） */
  riskLevel?: 1 | 2 | 3;
  
  /** セキュリティチェック詳細 */
  checkDetails?: {
    /** スパム検出結果 */
    spamDetection: boolean;
    
    /** 不適切コンテンツ検出結果 */
    inappropriateContent: boolean;
    
    /** 疑わしいURL検出結果 */
    suspiciousUrls: boolean;
    
    /** 過度なフォーマット使用検出結果 */
    excessiveFormatting: boolean;
  };
}

// ============================================================================
// 統合操作関連型
// ============================================================================

/**
 * 認証付き操作の統一リクエスト基底型
 * 
 * @interface AuthenticatedOperationRequest
 * @description 全ての認証付き操作で共通する基底構造
 */
export interface AuthenticatedOperationRequest extends V2AuthenticationRequest {
  /** 操作タイプ識別子 */
  operation: 'tweet' | 'dm' | 'engagement' | 'follow';
  
  /** リクエストID（トレーシング用） */
  requestId?: string;
  
  /** タイムスタンプ */
  timestamp?: number;
}

/**
 * 認証付き操作の統一レスポンス基底型
 * 
 * @interface AuthenticatedOperationResponse
 * @description 全ての認証付き操作で共通するレスポンス構造
 * @template T 操作固有のデータ型
 */
export interface AuthenticatedOperationResponse<T = any> {
  /** 操作成功フラグ */
  success: boolean;
  
  /** 操作固有のデータ（成功時のみ） */
  data?: T;
  
  /** エラー情報（失敗時のみ） */
  error?: string;
  
  /** レート制限情報 */
  rateLimitInfo?: RateLimitInfo;
  
  /** レスポンスメタデータ */
  metadata?: {
    /** 処理時間（ミリ秒） */
    processingTime: number;
    
    /** リクエストID */
    requestId?: string;
    
    /** API応答タイムスタンプ */
    timestamp: string;
  };
}

// ============================================================================
// 型エクスポート（テスト・外部利用向け）
// ============================================================================

/**
 * authenticated endpoints で使用される全型の統合エクスポート
 * テストファイルや外部モジュールからの利用を想定
 */
export type AuthenticatedTypes = {
  // DM関連
  DirectMessageRequest: DirectMessageRequest;
  DirectMessageResponse: DirectMessageResponse;
  
  // 認証関連
  V2AuthenticationRequest: V2AuthenticationRequest;
  V2AuthValidationResult: V2AuthValidationResult;
  
  // レート制限関連
  RateLimitInfo: RateLimitInfo;
  RateLimitStatus: RateLimitStatus;
  
  // エラー関連
  V2APIErrorResponse: V2APIErrorResponse;
  ValidationError: ValidationError;
  ValidationResult: ValidationResult;
  SecurityCheckResult: SecurityCheckResult;
  
  // 統合操作関連
  AuthenticatedOperationRequest: AuthenticatedOperationRequest;
  AuthenticatedOperationResponse: AuthenticatedOperationResponse;
};