import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { SimpleXClient } from '../../src/lib/x-client';
import { OAuth1Credentials, generateOAuth1Header, generateNonce, generateTimestamp } from '../../src/lib/oauth1-client';
import * as fs from 'fs';
import fetch from 'node-fetch';

// モック設定
vi.mock('node-fetch');
vi.mock('fs');

const mockFetch = vi.mocked(fetch);
const mockFs = vi.mocked(fs);

describe('SimpleXClient (OAuth 1.0a)', () => {
  let client: SimpleXClient;
  const mockCredentials: OAuth1Credentials = {
    consumerKey: 'test_consumer_key',
    consumerSecret: 'test_consumer_secret',
    accessToken: 'test_access_token',
    accessTokenSecret: 'test_access_token_secret'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 環境変数のモック
    process.env.X_CONSUMER_KEY = mockCredentials.consumerKey;
    process.env.X_CONSUMER_SECRET = mockCredentials.consumerSecret;
    process.env.X_ACCESS_TOKEN = mockCredentials.accessToken;
    process.env.X_ACCESS_TOKEN_SECRET = mockCredentials.accessTokenSecret;
    process.env.X_TEST_MODE = 'false';
    
    // ファイルシステムのモック
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFileSync.mockReturnValue('[]');
    mockFs.writeFileSync.mockImplementation(() => {});
    
    client = new SimpleXClient();
  });

  afterEach(() => {
    // 環境変数のクリーンアップ
    delete process.env.X_CONSUMER_KEY;
    delete process.env.X_CONSUMER_SECRET;
    delete process.env.X_ACCESS_TOKEN;
    delete process.env.X_ACCESS_TOKEN_SECRET;
    delete process.env.X_TEST_MODE;
  });

  describe('OAuth 1.0a認証', () => {
    test('環境変数から認証情報を正しく読み込む', () => {
      expect(process.env.X_CONSUMER_KEY).toBe(mockCredentials.consumerKey);
      expect(process.env.X_CONSUMER_SECRET).toBe(mockCredentials.consumerSecret);
      expect(process.env.X_ACCESS_TOKEN).toBe(mockCredentials.accessToken);
      expect(process.env.X_ACCESS_TOKEN_SECRET).toBe(mockCredentials.accessTokenSecret);
    });

    test('OAuth 1.a認証情報が不足している場合の警告', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // 認証情報を削除
      delete process.env.X_CONSUMER_KEY;
      process.env.X_TEST_MODE = 'false';
      
      new SimpleXClient();
      
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ OAuth 1.0a credentials not fully configured');
      
      consoleSpy.mockRestore();
    });

    test('OAuth 1.0aヘッダー生成テスト', () => {
      const params = {
        method: 'POST',
        url: 'https://api.twitter.com/2/tweets',
        params: { text: 'Test tweet' }
      };
      
      const header = generateOAuth1Header(mockCredentials, params);
      
      expect(header).toMatch(/^OAuth /);
      expect(header).toContain('oauth_consumer_key');
      expect(header).toContain('oauth_token');
      expect(header).toContain('oauth_signature_method');
      expect(header).toContain('oauth_timestamp');
      expect(header).toContain('oauth_nonce');
      expect(header).toContain('oauth_version');
      expect(header).toContain('oauth_signature');
    });

    test('nonce生成の一意性', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toHaveLength(32);
      expect(nonce2).toHaveLength(32);
      expect(nonce1).toMatch(/^[a-f0-9]+$/);
      expect(nonce2).toMatch(/^[a-f0-9]+$/);
    });

    test('タイムスタンプ生成', () => {
      const timestamp1 = generateTimestamp();
      const timestamp2 = generateTimestamp();
      
      expect(typeof timestamp1).toBe('number');
      expect(typeof timestamp2).toBe('number');
      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
      expect(timestamp1.toString()).toMatch(/^\d{10}$/);
    });
  });

  describe('投稿機能', () => {
    test('テストモードでの投稿シミュレーション', async () => {
      process.env.X_TEST_MODE = 'true';
      const testClient = new SimpleXClient();
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await testClient.post('テスト投稿');
      
      expect(result.success).toBe(true);
      expect(result.id).toMatch(/^test-/);
      expect(consoleSpy).toHaveBeenCalledWith('\n📱 [TEST MODE] X投稿シミュレーション:');
      
      consoleSpy.mockRestore();
    });

    test('本番モードでの成功投稿', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: { id: '1234567890' }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);
      
      const result = await client.post('テスト投稿');
      
      expect(result.success).toBe(true);
      expect(result.id).toBe('1234567890');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twitter.com/2/tweets',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^OAuth /),
            'Content-Type': 'application/json'
          })
        })
      );
    });

    test('本番モードでのAPI エラー処理', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: vi.fn().mockResolvedValue({
          detail: 'Read-only application cannot POST'
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);
      
      const result = await client.post('テスト投稿');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('403');
      expect(result.error).toContain('Read-only application cannot POST');
    });

    test('認証情報未設定時のエラー', async () => {
      // 認証情報を削除
      delete process.env.X_CONSUMER_KEY;
      delete process.env.X_CONSUMER_SECRET;
      delete process.env.X_ACCESS_TOKEN;
      delete process.env.X_ACCESS_TOKEN_SECRET;
      
      const clientWithoutAuth = new SimpleXClient();
      
      const result = await clientWithoutAuth.post('テスト投稿');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('OAuth 1.0a credentials not configured');
    });

    test('重複投稿の検出', async () => {
      process.env.X_TEST_MODE = 'true';
      const testClient = new SimpleXClient();
      
      // 最初の投稿
      const result1 = await testClient.post('同じ内容の投稿');
      expect(result1.success).toBe(true);
      
      // 重複投稿の試行
      const result2 = await testClient.post('同じ内容の投稿');
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Duplicate post detected');
    });

    test('文字数制限の適用', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: { id: '1234567890' }
        })
      };
      mockFetch.mockResolvedValue(mockResponse as any);
      
      const longText = 'a'.repeat(300); // 280文字制限を超える
      const result = await client.post(longText);
      
      expect(result.success).toBe(true);
      
      // APIリクエストのbodyを確認
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]!.body as string);
      expect(requestBody.text).toHaveLength(280);
    });
  });

  describe('アカウント情報取得', () => {
    test('自分のアカウント情報取得成功', async () => {
      const mockUserResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            id: '123456789',
            username: 'testuser',
            name: 'Test User',
            verified: false,
            public_metrics: {
              followers_count: 100,
              following_count: 50,
              tweet_count: 1000,
              listed_count: 5
            }
          }
        })
      };
      mockFetch.mockResolvedValue(mockUserResponse as any);
      
      const result = await client.getMyAccountInfo();
      
      expect(result.username).toBe('testuser');
      expect(result.display_name).toBe('Test User');
      expect(result.followers_count).toBe(100);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.twitter.com/2/users/me?user.fields=public_metrics',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^OAuth /)
          })
        })
      );
    });

    test('ユーザー名からアカウント情報取得成功', async () => {
      const mockUserResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: {
            id: '987654321',
            username: 'targetuser',
            name: 'Target User',
            verified: true,
            public_metrics: {
              followers_count: 5000,
              following_count: 200,
              tweet_count: 10000,
              listed_count: 50
            }
          }
        })
      };
      mockFetch.mockResolvedValue(mockUserResponse as any);
      
      const result = await client.getUserByUsername('targetuser');
      
      expect(result.username).toBe('targetuser');
      expect(result.verified).toBe(true);
      expect(result.followers_count).toBe(5000);
    });
  });

  describe('引用・リツイート・リプライ機能', () => {
    test('引用ツイート - テストモード', async () => {
      process.env.X_TEST_MODE = 'true';
      const testClient = new SimpleXClient();
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await testClient.quoteTweet('1234567890', '引用コメント');
      
      expect(result.success).toBe(true);
      expect(result.originalTweetId).toBe('1234567890');
      expect(result.comment).toBe('引用コメント');
      expect(consoleSpy).toHaveBeenCalledWith('\n📱 [TEST MODE] 引用ツイートシミュレーション:');
      
      consoleSpy.mockRestore();
    });

    test('リツイート - テストモード', async () => {
      process.env.X_TEST_MODE = 'true';
      const testClient = new SimpleXClient();
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await testClient.retweet('1234567890');
      
      expect(result.success).toBe(true);
      expect(result.originalTweetId).toBe('1234567890');
      expect(consoleSpy).toHaveBeenCalledWith('\n📱 [TEST MODE] リツイートシミュレーション:');
      
      consoleSpy.mockRestore();
    });

    test('リプライ - テストモード', async () => {
      process.env.X_TEST_MODE = 'true';
      const testClient = new SimpleXClient();
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await testClient.reply('1234567890', 'リプライ内容');
      
      expect(result.success).toBe(true);
      expect(result.originalTweetId).toBe('1234567890');
      expect(result.content).toBe('リプライ内容');
      expect(consoleSpy).toHaveBeenCalledWith('\n📱 [TEST MODE] リプライシミュレーション:');
      
      consoleSpy.mockRestore();
    });
  });

  describe('投稿履歴管理', () => {
    test('投稿履歴の取得', () => {
      const history = client.getPostHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    test('成功率の計算', () => {
      const rate = client.getSuccessRate(24);
      expect(typeof rate).toBe('number');
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });

    test('投稿履歴のクリア', () => {
      client.clearHistory();
      const history = client.getPostHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('レート制限', () => {
    test('レート制限待機の実行', async () => {
      const rateLimitedClient = new SimpleXClient({ rateLimitDelay: 10 });
      
      process.env.X_TEST_MODE = 'true';
      
      const startTime = Date.now();
      await rateLimitedClient.post('テスト投稿');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(10);
    });
  });

  describe('エラーハンドリング', () => {
    test('ネットワークエラーの処理', async () => {
      mockFetch.mockRejectedValue(new Error('Network Error'));
      
      const result = await client.post('テスト投稿');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
    });

    test('JSONパースエラーの処理', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: vi.fn().mockRejectedValue(new Error('JSON Parse Error'))
      };
      mockFetch.mockResolvedValue(mockResponse as any);
      
      const result = await client.post('テスト投稿');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
      expect(result.error).toContain('Internal Server Error');
    });
  });
});