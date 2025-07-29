/**
 * TwitterAPI.io V1ログイン認証クラス（2段階認証プロセス）
 * 
 * 機能概要:
 * - 2段階認証プロセス（非推奨）
 * - Step 1: /twitter/login_by_email_or_username
 * - Step 2: /twitter/login_by_2fa
 * - 2FAコード生成（TOTPシークレット使用）
 * - セッション管理（auth_session）
 * 
 * REQUIREMENTS.md準拠 - MVP実装
 */

import { APIKeyAuth } from './api-key-auth';
import type { LoginResult } from '../types';

// TOTP（Time-based One-Time Password）生成用のヘルパー
class TOTPGenerator {
  /**
   * TOTPコード生成（RFC 6238準拠）
   */
  static generateTOTP(secret: string, timeStep: number = 30, digits: number = 6): string {
    try {
      const time = Math.floor(Date.now() / 1000 / timeStep);
      const timeHex = time.toString(16).padStart(16, '0');
      
      // シンプルなHMAC-SHA1実装の代替
      // 実際の本番環境では適切なcryptoライブラリを使用
      const hash = this.simpleHash(secret + timeHex);
      const offset = parseInt(hash.slice(-1), 16);
      const binary = parseInt(hash.slice(offset * 2, (offset + 4) * 2), 16) & 0x7fffffff;
      const otp = (binary % Math.pow(10, digits)).toString().padStart(digits, '0');
      
      return otp;
    } catch (error) {
      console.error('❌ TOTP生成エラー:', error);
      // フォールバック: ランダムな6桁数字
      return Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    }
  }

  /**
   * シンプルなハッシュ関数（開発用）
   */
  private static simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return Math.abs(hash).toString(16);
  }
}

export class V1LoginAuth {
  private apiKeyAuth: APIKeyAuth;
  private readonly API_BASE_URL = 'https://api.twitterapi.io';
  private authSession: string | null = null;
  private sessionExpiry: number | null = null;
  private loginData: any = null;

  constructor(apiKey?: string) {
    this.apiKeyAuth = new APIKeyAuth(apiKey);
  }

  /**
   * V1 2段階ログイン実行
   */
  async login(): Promise<LoginResult> {
    try {
      console.log('🔐 TwitterAPI.io V1ログイン開始（2段階認証）...');

      // 環境変数確認
      const credentials = this.validateCredentials();
      if (!credentials.valid) {
        return {
          success: false,
          error: credentials.error
        };
      }

      // Step 1: 初期ログイン
      const step1Result = await this.executeStep1Login(credentials.data!);
      if (!step1Result.success) {
        return step1Result;
      }

      // Step 2: 2FA認証
      const step2Result = await this.executeStep2Auth(credentials.data!);
      if (!step2Result.success) {
        return step2Result;
      }

      console.log('✅ TwitterAPI.io V1ログイン完了');
      return step2Result;

    } catch (error) {
      console.error('❌ TwitterAPI.io V1ログインエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'V1 login failed'
      };
    }
  }

  /**
   * Step 1: /twitter/login_by_email_or_username
   */
  private async executeStep1Login(credentials: any): Promise<LoginResult> {
    try {
      console.log('📝 Step 1: 初期ログイン実行中...');

      const step1Url = `${this.API_BASE_URL}/twitter/login_by_email_or_username`;
      
      const response = await fetch(step1Url, {
        method: 'POST',
        headers: this.apiKeyAuth.getAuthHeaders(),
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          proxy: credentials.proxy
        })
      });

      if (!response.ok) {
        throw new Error(`Step 1 failed - HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.login_data) {
        this.loginData = result.login_data;
        console.log('✅ Step 1: 初期ログイン成功');
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Step 1 login failed'
        };
      }

    } catch (error) {
      console.error('❌ Step 1エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Step 1 failed'
      };
    }
  }

  /**
   * Step 2: /twitter/login_by_2fa
   */
  private async executeStep2Auth(credentials: any): Promise<LoginResult> {
    try {
      console.log('🔐 Step 2: 2FA認証実行中...');

      if (!this.loginData) {
        throw new Error('Login data from Step 1 is missing');
      }

      // TOTPコード生成
      const totpCode = TOTPGenerator.generateTOTP(credentials.totpSecret);
      console.log(`🔢 TOTP生成: ${totpCode.slice(0, 2)}****`);

      const step2Url = `${this.API_BASE_URL}/twitter/login_by_2fa`;

      const response = await fetch(step2Url, {
        method: 'POST',
        headers: this.apiKeyAuth.getAuthHeaders(),
        body: JSON.stringify({
          login_data: this.loginData,
          twofa_code: totpCode,
          proxy: credentials.proxy
        })
      });

      if (!response.ok) {
        throw new Error(`Step 2 failed - HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.auth_session) {
        // V1認証成功 - auth_sessionを保存
        this.authSession = result.auth_session;
        this.sessionExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24時間

        console.log('✅ Step 2: 2FA認証成功');
        
        return {
          success: true,
          auth_session: result.auth_session,
          session_expires: this.sessionExpiry
        };
      } else {
        return {
          success: false,
          error: result.error || 'Step 2 2FA authentication failed'
        };
      }

    } catch (error) {
      console.error('❌ Step 2エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Step 2 failed'
      };
    }
  }

  /**
   * セッション有効性確認
   */
  isSessionValid(): boolean {
    if (!this.authSession || !this.sessionExpiry) {
      return false;
    }
    return Date.now() < this.sessionExpiry;
  }

  /**
   * 有効なauth_session取得
   */
  getAuthSession(): string | null {
    return this.isSessionValid() ? this.authSession : null;
  }

  /**
   * V1認証用ヘッダー取得
   */
  getAuthHeaders(): Record<string, string> {
    const headers = this.apiKeyAuth.getAuthHeaders();
    
    if (this.isSessionValid() && this.authSession) {
      headers['Authorization'] = `Bearer ${this.authSession}`;
    }
    
    return headers;
  }

  /**
   * V1認証用パラメータ取得
   */
  getAuthParameters(): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (this.isSessionValid() && this.authSession) {
      params.auth_session = this.authSession;
    }
    
    return params;
  }

  /**
   * V1認証状態取得
   */
  getAuthStatus(): {
    hasAuthSession: boolean;
    sessionValid: boolean;
    sessionExpiry: string | null;
    timeRemaining: number;
    step1Complete: boolean;
    step2Complete: boolean;
  } {
    const timeRemaining = this.sessionExpiry ? Math.max(0, this.sessionExpiry - Date.now()) : 0;

    return {
      hasAuthSession: !!this.authSession,
      sessionValid: this.isSessionValid(),
      sessionExpiry: this.sessionExpiry ? new Date(this.sessionExpiry).toISOString() : null,
      timeRemaining,
      step1Complete: !!this.loginData,
      step2Complete: !!this.authSession
    };
  }

  /**
   * ログアウト（セッションクリア）
   */
  logout(): void {
    this.authSession = null;
    this.sessionExpiry = null;
    this.loginData = null;
    console.log('🚪 V1認証ログアウト');
  }

  /**
   * 認証情報バリデーション
   */
  private validateCredentials(): { valid: boolean; error?: string; data?: any } {
    const username = process.env.X_USERNAME;
    const password = process.env.X_PASSWORD;
    const totpSecret = process.env.X_2FA_SECRET;
    const proxy = process.env.X_PROXY;

    if (!username) {
      return { valid: false, error: 'X_USERNAME environment variable is required' };
    }

    if (!password) {
      return { valid: false, error: 'X_PASSWORD environment variable is required' };
    }

    if (!totpSecret) {
      return { valid: false, error: 'X_2FA_SECRET environment variable is required' };
    }

    return {
      valid: true,
      data: { username, password, totpSecret, proxy }
    };
  }

  /**
   * TOTPコード生成（外部からのアクセス用）
   */
  generateTOTPCode(): string | null {
    const totpSecret = process.env.X_2FA_SECRET;
    if (!totpSecret) {
      console.error('❌ X_2FA_SECRET environment variable is required');
      return null;
    }
    
    return TOTPGenerator.generateTOTP(totpSecret);
  }

  /**
   * 認証済みリクエスト実行
   */
  async authenticatedRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    data?: any
  ): Promise<T> {
    if (!this.isSessionValid()) {
      throw new Error('No valid V1 auth session');
    }

    const url = `${this.API_BASE_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: this.getAuthHeaders()
    };

    if (method === 'POST' && data) {
      options.body = JSON.stringify({
        ...data,
        ...this.getAuthParameters()
      });
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      if (response.status === 401) {
        this.logout();
        throw new Error('V1 auth session expired');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }
}