/**
 * TwitterAPI.io login_cookie管理システム
 * REQUIREMENTS.md準拠 - セッション管理機能
 */

import type { LoginResult, SessionData } from '../types';

export class SessionManager {
  private sessionData: SessionData | null = null;
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24時間

  /**
   * login_cookieを保存
   */
  saveSession(loginResult: LoginResult): void {
    if (!loginResult.success || !loginResult.login_cookie) {
      throw new Error('Invalid login result for session save');
    }

    this.sessionData = {
      login_cookie: loginResult.login_cookie,
      expires_at: Date.now() + this.SESSION_DURATION,
      created_at: Date.now(),
      user_info: {
        username: process.env.X_USERNAME || 'unknown',
        user_id: 'extracted_from_login_response'
      }
    };

    console.log('✅ Session saved successfully');
    console.log(`🕐 Session expires at: ${new Date(this.sessionData.expires_at).toISOString()}`);
  }

  /**
   * 有効な login_cookie を取得
   */
  getValidCookie(): string | null {
    if (!this.sessionData) {
      console.log('❌ No session data available');
      return null;
    }

    if (Date.now() > this.sessionData.expires_at) {
      console.log('⏰ Session expired, clearing data');
      this.sessionData = null;
      return null;
    }

    return this.sessionData.login_cookie;
  }

  /**
   * セッション有効性確認
   */
  isSessionValid(): boolean {
    return this.getValidCookie() !== null;
  }

  /**
   * セッション情報取得
   */
  getSessionInfo(): SessionData | null {
    if (!this.isSessionValid()) {
      return null;
    }
    return { ...this.sessionData! };
  }

  /**
   * セッションクリア
   */
  clearSession(): void {
    this.sessionData = null;
    console.log('🧹 Session cleared');
  }

  /**
   * セッション統計取得
   */
  getSessionStats(): {
    hasSession: boolean;
    timeRemaining: number;
    expiresAt: string | null;
  } {
    if (!this.sessionData) {
      return {
        hasSession: false,
        timeRemaining: 0,
        expiresAt: null
      };
    }

    const timeRemaining = Math.max(0, this.sessionData.expires_at - Date.now());
    
    return {
      hasSession: true,
      timeRemaining,
      expiresAt: new Date(this.sessionData.expires_at).toISOString()
    };
  }
}