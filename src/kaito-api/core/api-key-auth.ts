/**
 * TwitterAPI.io APIキー認証専用クラス
 * 
 * 機能概要:
 * - APIキー認証のみ（読み取り専用操作）
 * - x-api-keyヘッダー生成
 * - 基本バリデーション
 * - 接続テスト機能
 * 
 * REQUIREMENTS.md準拠 - MVP実装
 */

export class APIKeyAuth {
  private readonly apiKey: string;
  private readonly API_BASE_URL = 'https://api.twitterapi.io';
  private lastValidation: number = 0;
  private readonly VALIDATION_CACHE_DURATION = 3600000; // 1時間

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.KAITO_API_TOKEN || '';
    if (!this.apiKey) {
      throw new Error('API key is required for authentication');
    }
  }

  /**
   * x-api-keyヘッダー生成
   */
  getAuthHeaders(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'TradingAssistantX/1.0'
    };
  }

  /**
   * APIキー基本バリデーション
   */
  validateApiKey(): boolean {
    if (!this.apiKey || this.apiKey.trim() === '') {
      return false;
    }

    // APIキーの長さチェック（最小10文字）
    if (this.apiKey.length < 10) {
      return false;
    }

    // 基本的なフォーマットチェック（英数字と一部記号）
    const tokenPattern = /^[A-Za-z0-9_-]+$/;
    return tokenPattern.test(this.apiKey);
  }

  /**
   * APIキー形式検証
   */
  isValidFormat(): boolean {
    return this.validateApiKey();
  }

  /**
   * TwitterAPI.io接続テスト
   * 読み取り専用操作でAPIキーの有効性を確認
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔗 APIキー認証接続テスト実行中...');

      if (!this.validateApiKey()) {
        return {
          success: false,
          error: 'Invalid API key format'
        };
      }

      // キャッシュされた結果をチェック
      const now = Date.now();
      if (this.lastValidation && (now - this.lastValidation) < this.VALIDATION_CACHE_DURATION) {
        console.log('✅ キャッシュされた認証結果を使用');
        return { success: true };
      }

      // TwitterAPI.io健康チェック用エンドポイント
      const testUrl = `${this.API_BASE_URL}/twitter/tweet/advanced_search?query=test&queryType=Latest&count=1`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.lastValidation = now;
        console.log('✅ APIキー認証接続テスト成功');
        return { success: true };
      } else if (response.status === 401) {
        return {
          success: false,
          error: 'Invalid API key - authentication failed'
        };
      } else if (response.status === 403) {
        return {
          success: false,
          error: 'API key lacks required permissions'
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Connection timeout'
        };
      }

      console.error('❌ APIキー認証接続テストエラー:', error);
      return {
        success: false,
        error: error.message || 'Connection test failed'
      };
    }
  }

  /**
   * APIキー認証状態取得
   */
  getAuthStatus(): {
    hasApiKey: boolean;
    keyLength: number;
    validFormat: boolean;
    lastValidation: string | null;
    cacheValid: boolean;
  } {
    const now = Date.now();
    const cacheValid = this.lastValidation && (now - this.lastValidation) < this.VALIDATION_CACHE_DURATION;

    return {
      hasApiKey: !!this.apiKey,
      keyLength: this.apiKey?.length || 0,
      validFormat: this.validateApiKey(),
      lastValidation: this.lastValidation ? new Date(this.lastValidation).toISOString() : null,
      cacheValid: !!cacheValid
    };
  }

  /**
   * 認証済みHTTPリクエスト実行
   * 読み取り専用操作のみ
   */
  async authenticatedRequest<T>(
    endpoint: string, 
    params?: Record<string, any>
  ): Promise<T> {
    if (!this.validateApiKey()) {
      throw new Error('Invalid API key');
    }

    const url = new URL(endpoint, this.API_BASE_URL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getAuthHeaders(),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('API key authentication failed');
        } else if (response.status === 403) {
          throw new Error('API key lacks required permissions');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * APIキーの安全な取得（デバッグ用）
   */
  getObfuscatedApiKey(): string {
    if (!this.apiKey) return '';
    
    const keyLength = this.apiKey.length;
    if (keyLength <= 8) {
      return '*'.repeat(keyLength);
    }
    
    return this.apiKey.slice(0, 4) + '*'.repeat(keyLength - 8) + this.apiKey.slice(-4);
  }

  /**
   * 認証リセット（キャッシュクリア）
   */
  resetAuth(): void {
    this.lastValidation = 0;
    console.log('🔄 APIキー認証状態リセット');
  }
}