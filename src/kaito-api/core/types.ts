/**
 * KaitoAPI Core型定義 - 認証・設定型のみ
 * 認証システム、設定管理に関連する型定義
 */

// ============================================================================
// 認証関連型
// ============================================================================

/**
 * ログイン認証情報
 * 統合認証用の基本情報
 */
export interface LoginCredentials {
  /** ユーザー名 */
  username: string;
  /** メールアドレス */
  email: string;
  /** パスワード */
  password: string;
  /** プロキシ設定 */
  proxy: string;
}

/**
 * V2ログインレスポンス
 * V2認証システムのレスポンス型
 */
export interface UserLoginV2Response {
  /** ログイン成功フラグ */
  success: boolean;
  /** 認証クッキー */
  cookies: string;
  /** セッション期限（Unix timestamp） */
  expires_at?: number;
  /** ユーザー情報 */
  user?: {
    id: string;
    username: string;
    name: string;
  };
  /** エラー情報（失敗時） */
  error?: string;
}

/**
 * ログイン結果
 * 認証プロセスの結果
 */
export interface LoginResult {
  /** ログイン成功フラグ */
  success: boolean;
  /** ログインクッキー */
  login_cookie?: string;
  /** セッション期限（Unix timestamp） */
  session_expires?: number;
  /** エラーメッセージ（失敗時） */
  error?: string;
  /** ユーザー情報 */
  user_info?: {
    id: string;
    username: string;
  };
}

/**
 * 認証状態
 * システム全体の認証状態管理
 */
export interface AuthStatus {
  /** APIキー有効性 */
  apiKeyValid: boolean;
  /** ユーザーセッション有効性 */
  userSessionValid: boolean;
  /** V2セッション有効性 */
  v2SessionValid?: boolean;
  /** セッション期限 */
  sessionExpiry: number | null;
  /** ユーザーアクション実行可能性 */
  canPerformUserActions: boolean;
  /** 環境変数有効性 */
  environmentVariablesValid: boolean;
  /** 不足している環境変数リスト */
  missingEnvironmentVariables?: string[];
  /** 認証レベル */
  authLevel?: "none" | "apikey" | "api-key" | "v2" | "v2-login" | "oauth";
  /** 有効な認証レベル一覧 */
  validAuthLevels?: string[];
}

/**
 * セッションデータ
 * ユーザーセッション情報
 */
export interface SessionData {
  /** セッションID */
  sessionId: string;
  /** ユーザーID */
  userId: string;
  /** 認証クッキー */
  cookies: string;
  /** セッション作成時刻（Unix timestamp） */
  createdAt: number;
  /** セッション期限（Unix timestamp） */
  expiresAt: number;
  /** 最終更新時刻（Unix timestamp） */
  lastUpdated: number;
  /** セッション状態 */
  status: "active" | "expired" | "invalid";
}

// ============================================================================
// 設定関連型
// ============================================================================

/**
 * KaitoAPI設定
 * API全体の設定情報
 */
export interface KaitoAPIConfig {
  /** APIキー */
  apiKey: string;
  /** ベースURL */
  baseUrl: string;
  /** タイムアウト設定（ミリ秒） */
  timeout?: number;
  /** 環境設定 */
  environment?: "production" | "development" | "testing";
  /** API設定（ネストした構造） */
  api?: {
    baseUrl?: string;
    timeout?: number;
  };
  /** 認証設定 */
  authentication?: {
    type: "apikey" | "oauth" | "v2";
    credentials?: Record<string, unknown>;
    primaryKey?: string;
  };
  /** エンドポイント設定 */
  endpointConfig?: Record<string, EndpointConfig>;
  /** リトライ設定 */
  retry?: {
    /** 最大リトライ回数 */
    maxRetries: number;
    /** リトライ間隔（ミリ秒） */
    retryDelay: number;
  };
  /** レート制限設定 */
  rateLimit?: {
    /** 最大QPS */
    maxQPS: number;
    /** ウィンドウサイズ（秒） */
    windowSize: number;
  };
}

/**
 * Kaitoクライアント設定
 * クライアント固有の設定
 */
export interface KaitoClientConfig {
  /** API設定 */
  api?: KaitoAPIConfig;
  /** APIキー（トップレベルアクセス用） */
  apiKey?: string;
  /** QPS制限 */
  qpsLimit?: number;
  /** リトライポリシー */
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMs?: number;
  };
  /** コスト追跡設定 */
  costTracking?:
    | {
        enabled: boolean;
        threshold?: number;
      }
    | boolean;
  /** デバッグモード */
  debug?: boolean;
  /** ログレベル */
  logLevel?: "debug" | "info" | "warn" | "error";
  /** プロキシ設定 */
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
}

/**
 * エンドポイント設定
 * 各エンドポイントのURL構成
 */
export interface EndpointConfig {
  /** ユーザー関連エンドポイント */
  user?: Record<string, string>;
  /** ツイート関連エンドポイント */
  tweet?: Record<string, string>;
  /** エンゲージメント関連エンドポイント */
  engagement?: Record<string, string>;
  /** 認証関連エンドポイント */
  auth?: Record<string, string>;
  /** ヘルスチェック */
  health?: string;
  /** その他のカテゴリ（動的追加用） */
  [key: string]: Record<string, string> | string | undefined;
}

/**
 * 設定検証結果
 * 設定の検証結果
 */
export interface ConfigValidationResult {
  /** 検証成功フラグ */
  valid: boolean;
  /** エラーメッセージ配列 */
  errors: string[];
  /** 警告メッセージ配列 */
  warnings?: string[];
}
