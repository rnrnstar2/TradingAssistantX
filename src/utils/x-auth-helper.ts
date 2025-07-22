/**
 * X.com Authentication Helper
 * 追加認証フロー対応版
 */

import { Page } from 'playwright';

export class XAuthHelper {
  /**
   * 追加認証チャレンジの検出と処理
   */
  static async handleAdditionalAuth(page: Page): Promise<boolean> {
    try {
      // 追加認証フローの種類を検出
      const authType = await this.detectAuthType(page);
      
      switch (authType) {
        case 'email_verification':
          console.log('[X Auth] 📧 メール認証が必要です');
          return await this.handleEmailVerification(page);
          
        case '2fa':
          console.log('[X Auth] 🔐 2要素認証が必要です');
          return await this.handle2FA(page);
          
        case 'phone_verification':
          console.log('[X Auth] 📱 電話番号認証が必要です');
          return await this.handlePhoneVerification(page);
          
        case 'unusual_activity':
          console.log('[X Auth] ⚠️ 異常なアクティビティの確認が必要です');
          return false; // 手動介入が必要
          
        default:
          return false;
      }
    } catch (error) {
      console.error('[X Auth] 追加認証処理エラー:', error);
      return false;
    }
  }

  /**
   * 認証タイプの検出
   */
  private static async detectAuthType(page: Page): Promise<string> {
    const url = page.url();
    const content = await page.content();
    
    // URLベースの検出
    if (url.includes('/account/access')) return 'unusual_activity';
    if (url.includes('/i/flow/login_verification')) return 'email_verification';
    if (url.includes('/i/flow/2fa')) return '2fa';
    
    // コンテンツベースの検出
    if (content.includes('電話番号を確認') || content.includes('phone number')) {
      return 'phone_verification';
    }
    if (content.includes('メールアドレスを確認') || content.includes('email address')) {
      return 'email_verification';
    }
    if (content.includes('認証コード') || content.includes('verification code')) {
      return '2fa';
    }
    
    return 'unknown';
  }

  /**
   * メール認証の処理
   */
  private static async handleEmailVerification(page: Page): Promise<boolean> {
    try {
      // メールアドレス入力フィールドを探す
      const emailInput = await page.locator('input[name="text"], input[type="email"]').first();
      
      if (await emailInput.isVisible()) {
        // 環境変数からメールアドレスを取得
        const email = process.env.X_EMAIL;
        if (!email) {
          console.warn('[X Auth] X_EMAIL環境変数が設定されていません');
          return false;
        }
        
        await emailInput.fill(email);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[X Auth] メール認証エラー:', error);
      return false;
    }
  }

  /**
   * 2要素認証の処理
   */
  private static async handle2FA(page: Page): Promise<boolean> {
    console.warn('[X Auth] 2要素認証は自動化できません。以下の対策を検討してください:');
    console.warn('1. アプリパスワードの使用');
    console.warn('2. 2FAを一時的に無効化');
    console.warn('3. OAuth APIの使用（推奨）');
    return false;
  }

  /**
   * 電話番号認証の処理
   */
  private static async handlePhoneVerification(page: Page): Promise<boolean> {
    console.warn('[X Auth] 電話番号認証が必要です。手動での確認が必要です。');
    return false;
  }

  /**
   * ログイン成功の確認
   */
  static async verifyLoginSuccess(page: Page): Promise<boolean> {
    try {
      // 複数の成功指標をチェック
      const successIndicators = [
        page.waitForURL('**/home', { timeout: 5000 }),
        page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 5000 }),
        page.waitForSelector('[aria-label="Home timeline"]', { timeout: 5000 })
      ];
      
      await Promise.race(successIndicators);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * セッションの保存
   */
  static async saveSession(page: Page): Promise<void> {
    try {
      const cookies = await page.context().cookies();
      // TODO: セッション永続化の実装
      console.log(`[X Auth] ${cookies.length}個のCookieを取得（永続化は未実装）`);
    } catch (error) {
      console.error('[X Auth] セッション保存エラー:', error);
    }
  }
}

/**
 * 認証設定インターフェース
 */
export interface XAuthConfig {
  username: string;
  password: string;
  email?: string;
  headless?: boolean;
  saveSession?: boolean;
  sessionPath?: string;
}