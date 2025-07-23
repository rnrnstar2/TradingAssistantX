import fetch from 'node-fetch';

/**
 * X API v2 認証設定
 */
export interface XAuthConfig {
  bearerToken?: string;
  clientId?: string;
  clientSecret?: string;
  apiTier: 'free' | 'basic' | 'pro' | 'enterprise';
}

/**
 * OAuth 2.0 アクセストークンレスポンス
 */
interface OAuth2TokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  scope: string;
}

/**
 * X API v2 OAuth 2.0認証管理クラス
 */
export class XAuthManager {
  private config: XAuthConfig;
  private accessToken?: string;
  private tokenExpiresAt?: Date;
  
  constructor(config: XAuthConfig) {
    this.config = config;
    console.log('✅ XAuthManager初期化完了（API v2対応）');
    console.log(`📊 APIティア: ${config.apiTier}`);
  }
  
  /**
   * Bearer Token認証の取得
   */
  getBearerToken(): string {
    if (!this.config.bearerToken) {
      throw new Error('Bearer Tokenが設定されていません');
    }
    return this.config.bearerToken;
  }
  
  /**
   * OAuth 2.0フロー実装
   * Client Credentials Grant Flow (App-only認証)
   */
  async getAccessToken(): Promise<string> {
    // キャッシュされたトークンがあり、有効期限内なら返す
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      console.log('🔑 キャッシュされたアクセストークンを使用');
      return this.accessToken;
    }
    
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Client ID と Client Secret が必要です');
    }
    
    try {
      console.log('🔄 OAuth 2.0 アクセストークン取得中...');
      
      const credentials = Buffer.from(
        `${this.config.clientId}:${this.config.clientSecret}`
      ).toString('base64');
      
      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OAuth2トークン取得失敗: ${response.status} - ${errorText}`);
      }
      
      const tokenData = await response.json() as OAuth2TokenResponse;
      
      // トークンと有効期限を保存
      this.accessToken = tokenData.access_token;
      // 有効期限から5分を引いて早めに更新するようにする
      const expiresInMs = (tokenData.expires_in - 300) * 1000;
      this.tokenExpiresAt = new Date(Date.now() + expiresInMs);
      
      console.log('✅ アクセストークン取得成功');
      console.log(`📅 有効期限: ${this.tokenExpiresAt.toISOString()}`);
      
      return this.accessToken;
      
    } catch (error) {
      console.error('❌ OAuth2認証エラー:', error);
      throw error;
    }
  }
  
  /**
   * 認証ヘッダー生成
   * Bearer Token優先、なければOAuth 2.0を使用
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.config.bearerToken) {
      console.log('🔐 Bearer Token認証を使用');
      return {
        'Authorization': `Bearer ${this.config.bearerToken}`
      };
    }
    
    // OAuth 2.0フローを使用
    const accessToken = await this.getAccessToken();
    console.log('🔐 OAuth 2.0認証を使用');
    return {
      'Authorization': `Bearer ${accessToken}`
    };
  }
  
  /**
   * APIティアに基づくレート制限情報
   */
  getRateLimits(): { postsPerMonth: number; readsPerMonth: number } {
    const limits = {
      free: { postsPerMonth: 500, readsPerMonth: 100 },
      basic: { postsPerMonth: 3000, readsPerMonth: 10000 },
      pro: { postsPerMonth: 300000, readsPerMonth: 1000000 },
      enterprise: { postsPerMonth: 3000000, readsPerMonth: 10000000 }
    };
    
    return limits[this.config.apiTier];
  }
  
  /**
   * 現在のAPIティアを取得
   */
  getApiTier(): string {
    return this.config.apiTier;
  }
}

/**
 * 環境変数からXAuthManagerインスタンスを作成するヘルパー関数
 */
export function createXAuthManagerFromEnv(): XAuthManager {
  const apiTier = (process.env.X_API_TIER || 'basic') as 'free' | 'basic' | 'pro' | 'enterprise';
  
  const config: XAuthConfig = {
    bearerToken: process.env.X_BEARER_TOKEN,
    clientId: process.env.X_CLIENT_ID,
    clientSecret: process.env.X_CLIENT_SECRET,
    apiTier
  };
  
  // Bearer TokenまたはOAuth2の認証情報が設定されているか確認
  if (!config.bearerToken && (!config.clientId || !config.clientSecret)) {
    throw new Error(
      'X API v2認証情報が設定されていません。' +
      'X_BEARER_TOKEN、またはX_CLIENT_IDとX_CLIENT_SECRETを設定してください。'
    );
  }
  
  return new XAuthManager(config);
}

export default XAuthManager;