/**
 * 実投稿テスト・検証システム
 * 実際のTwitterAPI.ioを使用した投稿テスト
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { AuthManager } from '../../src/kaito-api/core/auth-manager';
import { ActionEndpoints } from '../../src/kaito-api/endpoints/action-endpoints';
import { KaitoTwitterAPIClient } from '../../src/kaito-api/core/client';

// HttpClient型のインポート
interface HttpClient {
  get<T>(endpoint: string, params?: Record<string, any>): Promise<T>;
  post<T>(endpoint: string, data?: any): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}

describe('Real Posting Verification Test', () => {
  let authManager: AuthManager;
  let actionEndpoints: ActionEndpoints;
  let realHttpClient: HttpClient;

  beforeAll(async () => {
    // 実環境設定確認
    const requiredEnvVars = ['X_USERNAME', 'X_PASSWORD', 'X_EMAIL', 'X_PROXY', 'KAITO_API_TOKEN'];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Environment variable ${envVar} is required for real posting test`);
      }
    }

    console.log('🚀 Real posting test initialization...');
    console.log(`📧 X_EMAIL: ${process.env.X_EMAIL}`);
    console.log(`👤 X_USERNAME: ${process.env.X_USERNAME}`);
    console.log(`🔗 X_PROXY: ${(process.env.X_PROXY || '').substring(0, 20)}...`);

    // 実HTTPクライアント使用
    const kaitoClient = new KaitoTwitterAPIClient({ apiKey: process.env.KAITO_API_TOKEN });
    
    // KaitoTwitterAPIClientの設定で初期化
    const apiConfig = {
      api: {
        baseUrl: 'https://api.twitterapi.io',
        timeout: 30000
      },
      authentication: {
        primaryKey: process.env.KAITO_API_TOKEN || ''
      },
      environment: 'production' as const,
      endpointConfig: {
        user: { info: '/twitter/user/info' },
        tweet: { create: '/twitter/create_tweet_v2', retweet: '/twitter/user/retweet', search: '/twitter/tweet/advanced_search', quote: '/twitter/action/quote' },
        engagement: { like: '/twitter/user/like' },
        auth: { verify: '/twitter/user/info' },
        health: '/twitter/tweet/advanced_search'
      }
    };
    
    kaitoClient.initializeWithConfig(apiConfig);
    
    // HttpClientを内部から取得（プライベートプロパティなので型キャストが必要）
    realHttpClient = (kaitoClient as any).httpClient;
    
    authManager = new AuthManager();
    actionEndpoints = new ActionEndpoints(realHttpClient, authManager);
  }, 60000); // 60秒タイムアウト

  test('should successfully login with real credentials', async () => {
    console.log('🔐 Testing real login...');
    
    const loginResult = await authManager.login();
    
    console.log('Login result:', {
      success: loginResult.success,
      hasLoginCookie: !!loginResult.login_cookie,
      error: loginResult.error
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.login_cookie).toBeDefined();
    expect(loginResult.login_cookie).not.toBe('');
    
    // セッション状態確認
    expect(authManager.isUserSessionValid()).toBe(true);
    expect(authManager.getUserSession()).toBe(loginResult.login_cookie);
  }, 30000);

  test('should successfully post to real X account', async () => {
    console.log('📝 Testing real posting...');
    
    // ログイン実行
    const loginResult = await authManager.login();
    expect(loginResult.success).toBe(true);
    
    // テスト投稿内容
    const testContent = `📊 TradingAssistantX テスト投稿 ${new Date().toISOString()}

投資・トレードの自動化システムが正常に動作しています。

#投資教育 #TradingAssistant #自動投稿テスト`;
    
    console.log('投稿内容:', testContent.substring(0, 50) + '...');
    
    // 実投稿実行
    const postResult = await actionEndpoints.createPost({
      content: testContent
    });
    
    console.log('Post result:', {
      success: postResult.success,
      tweetId: postResult.tweetId,
      error: postResult.error
    });
    
    expect(postResult.success).toBe(true);
    expect(postResult.tweetId).toBeDefined();
    expect(postResult.tweetId).toMatch(/^\d+$/); // Twitter ID format
    
    // 投稿確認用にIDをログ出力
    if (postResult.tweetId) {
      console.log(`✅ 投稿成功！ツイートID: ${postResult.tweetId}`);
      console.log(`🔗 確認URL: https://twitter.com/rnrnstar/status/${postResult.tweetId}`);
    }
  }, 45000);

  test('should handle API errors gracefully', async () => {
    console.log('❌ Testing error handling...');
    
    // 不正なコンテンツでエラーテスト
    const invalidContent = ''; // 空文字列
    
    const postResult = await actionEndpoints.createPost({
      content: invalidContent
    });
    
    expect(postResult.success).toBe(false);
    expect(postResult.error).toBeDefined();
    
    console.log('Expected error:', postResult.error);
  }, 30000);

  test('should validate environment variables', async () => {
    console.log('🔍 Testing environment variable validation...');
    
    const requiredVars = ['X_USERNAME', 'X_PASSWORD', 'X_EMAIL', 'X_PROXY', 'KAITO_API_TOKEN'];
    
    for (const envVar of requiredVars) {
      expect(process.env[envVar]).toBeDefined();
      expect(process.env[envVar]).not.toBe('');
      console.log(`✅ ${envVar}: ${envVar === 'KAITO_API_TOKEN' || envVar === 'X_PASSWORD' ? '[MASKED]' : process.env[envVar]?.substring(0, 10) + '...'}`);
    }
  });

  test('should validate session management', async () => {
    console.log('🔄 Testing session management...');
    
    // 最初にログアウトしてセッションをクリア
    await authManager.logout();
    expect(authManager.isUserSessionValid()).toBe(false);
    
    // 再ログイン
    const loginResult = await authManager.login();
    expect(loginResult.success).toBe(true);
    expect(authManager.isUserSessionValid()).toBe(true);
    
    // セッション情報の確認
    const userSession = authManager.getUserSession();
    expect(userSession).toBeDefined();
    expect(userSession).not.toBe('');
    
    console.log('✅ Session management test completed');
  }, 30000);
});