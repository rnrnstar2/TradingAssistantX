/**
 * KaitoAPI ログインエンドポイント
 * REQUIREMENTS.md準拠 - 疎結合アーキテクチャ
 * 認証・ログイン・2FA対応
 */

export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
  twoFactorCode?: string;
}

export interface LoginResponse {
  success: boolean;
  authToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  requiresTwoFactor?: boolean;
  error?: string;
}

export interface AuthStatus {
  isAuthenticated: boolean;
  userId?: string;
  username?: string;
  expiresAt?: string;
}

export class LoginEndpoints {
  constructor(private baseUrl: string, private headers: Record<string, string>) {}

  // 基本ログイン
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('Login attempt for:', credentials.username || credentials.email);
      
      // MVP版：環境変数認証を使用
      const apiToken = process.env.KAITO_API_TOKEN;
      if (!apiToken) {
        return {
          success: false,
          error: 'API token not configured'
        };
      }

      return {
        success: true,
        authToken: apiToken,
        expiresIn: 3600000 // 1 hour
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  // 認証状態確認
  async getAuthStatus(): Promise<AuthStatus> {
    const apiToken = process.env.KAITO_API_TOKEN;
    return {
      isAuthenticated: !!apiToken,
      userId: 'system',
      username: 'trading_assistant'
    };
  }

  // ログアウト
  async logout(): Promise<{ success: boolean }> {
    // MVP版：基本的なログアウト処理
    return { success: true };
  }
}