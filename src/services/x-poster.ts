import { createHmac, randomBytes } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { TwitterApiAuth, loginFromEnv } from '../utils/twitter-api-auth.js';

/**
 * 基本OAuth1処理クラス（MVP簡素化版）
 */
class OAuth1Handler {
  private consumerSecret: string;
  private accessTokenSecret: string;

  constructor(consumerSecret: string, accessTokenSecret: string) {
    this.consumerSecret = consumerSecret;
    this.accessTokenSecret = accessTokenSecret;
  }

  generateAuthHeader(method: string, url: string, params: Record<string, string>, oauthParams: Record<string, string>): string {
    // v1.1 APIではすべてのパラメータを署名に含める
    const signatureParams = { ...params, ...oauthParams };
    const normalizedParams = this.normalizeParameters(signatureParams);
    const signatureBaseString = this.createSignatureBaseString(method, url, normalizedParams);
    const signingKey = `${this.percentEncode(this.consumerSecret)}&${this.percentEncode(this.accessTokenSecret)}`;
    
    // デバッグ情報
    console.log('🔐 [OAuth Debug]', {
      method,
      url,
      normalizedParams,
      signatureBaseString,
      signingKey: signingKey.substring(0, 20) + '...'
    });
    
    const hmac = createHmac('sha1', signingKey);
    hmac.update(signatureBaseString);
    const signature = hmac.digest('base64');
    
    const authParams: Record<string, string> = {
      ...oauthParams,
      oauth_signature: signature
    };
    
    const headerParts = Object.keys(authParams)
      .sort()
      .map(key => `${this.percentEncode(key)}="${this.percentEncode(authParams[key])}"`)
      .join(', ');
    
    console.log('🔐 [OAuth Header]:', `OAuth ${headerParts.substring(0, 100)}...`);
    
    return `OAuth ${headerParts}`;
  }

  private percentEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
  }

  private normalizeParameters(params: Record<string, string>): string {
    const sortedKeys = Object.keys(params).sort();
    const encodedParams = sortedKeys.map(key => {
      return `${this.percentEncode(key)}=${this.percentEncode(params[key])}`;
    });
    return encodedParams.join('&');
  }

  private createSignatureBaseString(method: string, url: string, normalizedParams: string): string {
    return [
      method.toUpperCase(),
      this.percentEncode(url),
      this.percentEncode(normalizedParams)
    ].join('&');
  }
}

/**
 * 生成されたコンテンツの型定義（MVP簡素化版）
 */
export interface GeneratedContent {
  content: string;
  hashtags?: string[];
}

/**
 * 投稿結果の型定義（MVP簡素化版）
 */
export interface PostResult {
  success: boolean;
  postId?: string;
  error?: string;
  timestamp: Date;
  finalContent: string;
}

/**
 * OAuth1.0a認証情報
 */
interface OAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}


/**
 * X API投稿システム（MVP簡素化版）
 * 基本的な投稿機能のみ実装
 */
export class XPoster {
  private credentials: OAuth1Credentials;
  private readonly API_BASE_URL = 'https://api.twitter.com';
  private readonly TWEET_ENDPOINT = '/1.1/statuses/update.json';  // v1.1エンドポイントに変更
  private readonly USER_ENDPOINT = '/2/users/me';
  private readonly MAX_TWEET_LENGTH = 280;
  private oauthHandler: OAuth1Handler;

  constructor(
    apiKey: string,
    apiSecret: string,
    accessToken: string,
    accessTokenSecret: string
  ) {
    this.credentials = {
      consumerKey: apiKey,
      consumerSecret: apiSecret,
      accessToken,
      accessTokenSecret
    };
    this.oauthHandler = new OAuth1Handler(apiSecret, accessTokenSecret);
    console.log('✅ XPoster初期化完了（MVP版）');
  }

  /**
   * X(Twitter)への基本投稿（MVP版）
   */
  async post(content: string): Promise<PostResult> {
    try {
      console.log('🔄 投稿実行開始（MVP版）');
      
      // 基本バリデーション
      if (!content || content.trim().length === 0) {
        return {
          success: false,
          error: 'コンテンツが空です',
          timestamp: new Date(),
          finalContent: content
        };
      }
      
      // 文字数制限チェック
      const trimmedContent = content.trim();
      if (trimmedContent.length > this.MAX_TWEET_LENGTH) {
        return {
          success: false,
          error: `文字数制限超過: ${trimmedContent.length}文字（最大${this.MAX_TWEET_LENGTH}文字）`,
          timestamp: new Date(),
          finalContent: trimmedContent
        };
      }
      
      // 投稿実行
      const result = await this.executePost(trimmedContent);
      
      if (result.success) {
        console.log('✅ 投稿成功:', result.postId);
        return {
          success: true,
          postId: result.postId,
          timestamp: new Date(),
          finalContent: trimmedContent
        };
      } else {
        console.error('❌ 投稿失敗:', result.error);
        return {
          success: false,
          error: result.error,
          timestamp: new Date(),
          finalContent: trimmedContent
        };
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ 投稿処理エラー:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        finalContent: content
      };
    }
  }

  /**
   * フォロワー数取得（MVP版）
   */
  async getFollowerCount(): Promise<number> {
    try {
      console.log('🔄 フォロワー数取得中...');
      
      const url = `${this.API_BASE_URL}${this.USER_ENDPOINT}?user.fields=public_metrics`;
      const authHeader = this.generateOAuth1Header('GET', url, {});
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'User-Agent': 'TradingAssistantX/1.0'
        }
      });
      
      if (!response.ok) {
        console.error('❌ フォロワー数取得失敗:', response.status);
        return 500; // デフォルト値
      }
      
      const result = await response.json() as any;
      const followerCount = result.data?.public_metrics?.followers_count || 500;
      
      console.log('✅ フォロワー数:', followerCount);
      return followerCount;
      
    } catch (error) {
      console.error('❌ フォロワー数取得エラー:', error);
      return 500; // エラー時のデフォルト値
    }
  }

  /**
   * 既存のpostToXメソッドとの互換性維持（MVP版）
   */
  async postToX(content: GeneratedContent): Promise<PostResult> {
    try {
      // GeneratedContentを文字列に変換
      let postContent = content.content.trim();
      
      // ハッシュタグを追加（簡素化版）
      if (content.hashtags && content.hashtags.length > 0) {
        const hashtags = content.hashtags.slice(0, 2); // 最大2個まで
        const hashtagsStr = hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
        
        if (postContent.length + hashtagsStr.length + 1 <= this.MAX_TWEET_LENGTH) {
          postContent += ' ' + hashtagsStr;
        }
      }
      
      // 基本投稿メソッドを呼び出し
      return await this.post(postContent);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        finalContent: content.content
      };
    }
  }

  /**
   * 実際のX API投稿実行（MVP版）
   */
  private async executePost(content: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      // MODEチェック（統一環境変数）
      const isDevelopmentMode = process.env.MODE !== 'production';

      if (isDevelopmentMode) {
        console.log('\n🛠️  [DEV MODE] 実際の投稿は実行されません - 開発モードで動作中');
        console.log('📝 [投稿内容プレビュー]:');
        console.log('━'.repeat(50));
        console.log(content);
        console.log('━'.repeat(50));
        console.log(`📊 [文字数]: ${content.length}/280文字`);
        console.log('✅ [DEV MODE] 投稿は成功扱いでシミュレートされました');
        
        // 開発モード用の偽の投稿IDを生成
        const devPostId = `dev_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        return {
          success: true,
          postId: devPostId
        };
      }

      // 本番モード: X API投稿
      const url = `${this.API_BASE_URL}${this.TWEET_ENDPOINT}`;
      // v1.1 APIはstatusパラメータをURLエンコードして送る
      const params = { status: content };
      const postData = new URLSearchParams(params).toString();
      const authHeader = this.generateOAuth1Header('POST', url, params);
      
      console.log('🔍 [DEBUG] API Request:', {
        url,
        method: 'POST',
        body: postData,
        authHeader: authHeader.substring(0, 200) + '...'
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'TradingAssistantX/1.0'
        },
        body: postData
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ [DEBUG] API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorData
        });
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorData}`
        };
      }

      const result = await response.json() as { id_str?: string };
      
      return {
        success: true,
        postId: result.id_str || 'unknown'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown network error'
      };
    }
  }

  /**
   * OAuth1.0a Authorizationヘッダー生成（MVP版）
   */
  private generateOAuth1Header(method: string, url: string, params: Record<string, string>): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = randomBytes(16).toString('hex');
    
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.credentials.consumerKey,
      oauth_token: this.credentials.accessToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp.toString(),
      oauth_nonce: nonce,
      oauth_version: '1.0'
    };
    
    return this.oauthHandler.generateAuthHeader(method, url, params, oauthParams);
  }
}

/**
 * TwitterAPI.io サービスを使用したX投稿システム
 * ユーザー名/パスワード認証を使用
 */
export class TwitterApiPoster {
  private readonly API_BASE_URL = 'https://api.twitterapi.io';
  private readonly CREATE_TWEET_ENDPOINT = '/twitter/create_tweet';
  private readonly MAX_TWEET_LENGTH = 280;
  private auth: TwitterApiAuth;

  constructor(auth: TwitterApiAuth) {
    this.auth = auth;
    console.log('✅ TwitterApiPoster初期化完了');
  }

  /**
   * TwitterAPI.io経由でのX投稿
   */
  async post(content: string): Promise<PostResult> {
    try {
      console.log('🔄 TwitterAPI.io 投稿実行開始');
      
      // 基本バリデーション
      if (!content || content.trim().length === 0) {
        return {
          success: false,
          error: 'コンテンツが空です',
          timestamp: new Date(),
          finalContent: content
        };
      }
      
      // 文字数制限チェック
      const trimmedContent = content.trim();
      if (trimmedContent.length > this.MAX_TWEET_LENGTH) {
        return {
          success: false,
          error: `文字数制限超過: ${trimmedContent.length}文字（最大${this.MAX_TWEET_LENGTH}文字）`,
          timestamp: new Date(),
          finalContent: trimmedContent
        };
      }

      // ログイン状態確認
      if (!this.auth.isLoggedIn()) {
        return {
          success: false,
          error: 'ログインが必要です。先にloginメソッドを呼び出してください。',
          timestamp: new Date(),
          finalContent: trimmedContent
        };
      }
      
      // 投稿実行
      const result = await this.executeApiPost(trimmedContent);
      
      if (result.success) {
        console.log('✅ TwitterAPI.io 投稿成功:', result.postId);
        return {
          success: true,
          postId: result.postId,
          timestamp: new Date(),
          finalContent: trimmedContent
        };
      } else {
        console.error('❌ TwitterAPI.io 投稿失敗:', result.error);
        return {
          success: false,
          error: result.error,
          timestamp: new Date(),
          finalContent: trimmedContent
        };
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ TwitterAPI.io 投稿処理エラー:', errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        finalContent: content
      };
    }
  }

  /**
   * GeneratedContentとの互換性維持
   */
  async postToX(content: GeneratedContent): Promise<PostResult> {
    try {
      // GeneratedContentを文字列に変換
      let postContent = content.content.trim();
      
      // ハッシュタグを追加
      if (content.hashtags && content.hashtags.length > 0) {
        const hashtags = content.hashtags.slice(0, 2); // 最大2個まで
        const hashtagsStr = hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
        
        if (postContent.length + hashtagsStr.length + 1 <= this.MAX_TWEET_LENGTH) {
          postContent += ' ' + hashtagsStr;
        }
      }
      
      // 基本投稿メソッドを呼び出し
      return await this.post(postContent);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        finalContent: content.content
      };
    }
  }

  /**
   * TwitterAPI.io経由での実際の投稿実行
   */
  private async executeApiPost(content: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      // MODEチェック（統一環境変数）
      const isDevelopmentMode = process.env.MODE !== 'production';

      if (isDevelopmentMode) {
        console.log('\n🛠️  [DEV MODE] 実際の投稿は実行されません - 開発モードで動作中');
        console.log('📝 [投稿内容プレビュー]:');
        console.log('━'.repeat(50));
        console.log(content);
        console.log('━'.repeat(50));
        console.log(`📊 [文字数]: ${content.length}/280文字`);
        console.log('✅ [DEV MODE] TwitterAPI.io 投稿は成功扱いでシミュレートされました');
        
        // 開発モード用の偽の投稿IDを生成
        const devPostId = `twitterapi_dev_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        return {
          success: true,
          postId: devPostId
        };
      }

      // 本番モード: TwitterAPI.io投稿
      const url = `${this.API_BASE_URL}${this.CREATE_TWEET_ENDPOINT}`;
      const requestBody = {
        text: content,
        login_data: this.auth.getLoginData()
      };
      
      console.log('🔍 [DEBUG] TwitterAPI.io Request:', {
        url,
        text: content,
        hasLoginData: !!this.auth.getLoginData()
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.X_API_KEY || ''
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ [DEBUG] TwitterAPI.io Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorData
        });
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorData}`
        };
      }

      const result = await response.json() as {
        status?: string;
        msg?: string;
        tweet_id?: string;
        data?: { id?: string };
      };
      
      console.log('🔍 [DEBUG] TwitterAPI.io Response:', result);

      if (result.status === 'success' || result.tweet_id || result.data?.id) {
        const postId = result.tweet_id || result.data?.id || 'unknown';
        return {
          success: true,
          postId
        };
      } else {
        return {
          success: false,
          error: result.msg || '投稿に失敗しました'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown network error'
      };
    }
  }

  /**
   * ログイン実行
   */
  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.auth.login(username, password);
    return result;
  }

  /**
   * ログイン状態確認
   */
  isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  /**
   * ログアウト
   */
  logout(): void {
    this.auth.logout();
  }
}

/**
 * 環境変数からX Poster インスタンスを作成するヘルパー関数（MVP版）
 */
export function createXPosterFromEnv(): XPoster {
  const requiredEnvVars = [
    'X_CONSUMER_KEY',
    'X_CONSUMER_SECRET', 
    'X_ACCESS_TOKEN',
    'X_ACCESS_TOKEN_SECRET'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return new XPoster(
    process.env.X_CONSUMER_KEY!,
    process.env.X_CONSUMER_SECRET!,
    process.env.X_ACCESS_TOKEN!,
    process.env.X_ACCESS_TOKEN_SECRET!
  );
}

/**
 * 環境変数からTwitterApiPosterインスタンスを作成するヘルパー関数
 */
export async function createTwitterApiPosterFromEnv(): Promise<TwitterApiPoster> {
  const loginResult = await loginFromEnv();
  
  if (!loginResult.success || !loginResult.auth) {
    throw new Error(`TwitterAPI.io login failed: ${loginResult.error}`);
  }

  return new TwitterApiPoster(loginResult.auth);
}

/**
 * 簡単な使用例ヘルパー関数
 */
export async function createAndLoginTwitterApiPoster(): Promise<{
  success: boolean;
  poster?: TwitterApiPoster;
  error?: string;
}> {
  try {
    const poster = await createTwitterApiPosterFromEnv();
    
    if (poster.isLoggedIn()) {
      return {
        success: true,
        poster
      };
    } else {
      return {
        success: false,
        error: 'ログインに失敗しました'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export default XPoster;