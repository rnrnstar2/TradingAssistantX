/**
 * 新API仕様統合テスト
 * TASK-002の実装内容を検証
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AuthManager } from '../../src/kaito-api/core/auth-manager';
import { ActionEndpoints } from '../../src/kaito-api/endpoints/action-endpoints';
import type { HttpClient, UserLoginV2Response } from '../../src/kaito-api/types';

describe('API Specification Integration Test', () => {
  let authManager: AuthManager;
  let actionEndpoints: ActionEndpoints;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    // テスト環境設定
    process.env.X_USERNAME = 'test_user';
    process.env.X_PASSWORD = 'test_pass';
    process.env.X_EMAIL = 'test@example.com';
    process.env.X_PROXY = 'http://proxy:port';
    process.env.KAITO_API_TOKEN = 'test_token';

    // モックHTTPクライアントセットアップ
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
    };

    authManager = new AuthManager();
    actionEndpoints = new ActionEndpoints(mockHttpClient, authManager);
  });

  test('should use user_login_v2 endpoint', async () => {
    // モックHTTPクライアント設定
    const mockResponse: UserLoginV2Response = {
      success: true,
      login_cookie: 'test_cookie_12345',
      user_info: { 
        id: '123', 
        username: 'test_user',
        screen_name: 'test_user',
        followers_count: 100
      }
    };

    mockHttpClient.post.mockResolvedValue(mockResponse);

    // ログイン実行
    const result = await authManager.login();

    // 新API仕様のエンドポイントが使用されることを確認
    expect(mockHttpClient.post).toHaveBeenCalledWith(
      'https://api.twitterapi.io/twitter/user_login_v2',
      expect.objectContaining({
        username: 'test_user',
        email: 'test@example.com',
        password: 'test_pass',
        proxy: 'http://proxy:port'
      })
    );

    expect(result.success).toBe(true);
    expect(result.login_cookie).toBe('test_cookie_12345');
  });

  test('should use create_tweet_v2 endpoint for posting', async () => {
    // ログイン状態を設定
    const mockLoginResponse: UserLoginV2Response = {
      success: true,
      login_cookie: 'test_cookie_12345',
      user_info: { 
        id: '123', 
        username: 'test_user',
        screen_name: 'test_user',
        followers_count: 100
      }
    };

    mockHttpClient.post.mockResolvedValueOnce(mockLoginResponse);
    await authManager.login();

    const mockPostResponse = {
      success: true,
      data: {
        id: '1234567890',
        text: 'Test tweet',
        created_at: '2025-07-28T18:40:00.000Z'
      }
    };

    mockHttpClient.post.mockResolvedValueOnce(mockPostResponse);

    // 投稿実行
    const result = await actionEndpoints.createPost({
      content: 'Test tweet content'
    });

    // 新API仕様のエンドポイントが使用されることを確認
    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/twitter/create_tweet_v2',
      expect.objectContaining({
        text: 'Test tweet content',
        login_cookie: 'test_cookie_12345'
      })
    );

    expect(result.success).toBe(true);
    expect(result.tweetId).toBe('1234567890');
  });

  test('should handle authentication headers correctly', () => {
    // 認証ヘッダーの確認
    const authHeaders = authManager.getAuthHeaders();

    expect(authHeaders['x-api-key']).toBe('test_token');
    expect(authHeaders['Content-Type']).toBe('application/json');
  });

  test('should handle login failure properly', async () => {
    // ログイン失敗レスポンス
    const mockErrorResponse = {
      success: false,
      error: 'Invalid credentials',
      error_code: 401
    };

    mockHttpClient.post.mockResolvedValue(mockErrorResponse);

    // ログイン実行
    const result = await authManager.login();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
  });

  test('should handle posting without valid session', async () => {
    // セッション未ログイン状態
    // AuthManagerのセッションをクリア

    const result = await actionEndpoints.createPost({
      content: 'Test tweet content'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('login');
  });

  test('should validate API key authentication', () => {
    // API Key検証
    expect(() => {
      new AuthManager({ apiKey: '' });
    }).toThrow('KAITO_API_TOKEN is required');

    expect(() => {
      new AuthManager({ apiKey: 'valid_key' });
    }).not.toThrow();
  });

  test('should use correct endpoint URLs', () => {
    // エンドポイントURLの確認
    const endpoints = actionEndpoints as any;
    
    expect(endpoints.ENDPOINTS?.createTweet).toBe('/twitter/create_tweet_v2');
    expect(endpoints.ENDPOINTS?.likeTweet).toBe('/twitter/user/like');
    expect(endpoints.ENDPOINTS?.retweetTweet).toBe('/twitter/user/retweet');
  });

  test('should handle rate limiting appropriately', async () => {
    // レート制限エラーレスポンス
    const mockRateLimitResponse = {
      success: false,
      error: 'Rate limit exceeded',
      error_code: 429,
      retry_after: 3600
    };

    mockHttpClient.post.mockResolvedValue(mockRateLimitResponse);

    const result = await actionEndpoints.createPost({
      content: 'Test tweet content'
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Rate limit');
  });
});