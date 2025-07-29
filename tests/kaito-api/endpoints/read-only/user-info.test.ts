/**
 * UserInfoEndpoint テスト - user-info.test.ts
 * REQUIREMENTS.md準拠 - ユーザー情報取得エンドポイントの包括的テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserInfoEndpoint } from '../../../../src/kaito-api/endpoints/read-only/user-info';
import type { HttpClient, UserInfo, UserSearchResult, UserSearchOptions } from '../../../../src/kaito-api/utils/types';
import { AuthManager } from '../../../../src/kaito-api/core/auth-manager';

describe('UserInfoEndpoint', () => {
  let userInfoEndpoint: UserInfoEndpoint;
  let mockHttpClient: Partial<HttpClient>;
  let mockAuthManager: Partial<AuthManager>;

  // テストデータ
  const mockUserData: UserInfo = {
    id: '123456789',
    username: 'testuser',
    displayName: 'Test User',
    bio: 'Investment education content creator',
    profileImageUrl: 'https://example.com/avatar.jpg',
    verified: false,
    followersCount: 1000,
    followingCount: 500,
    tweetCount: 2000,
    likeCount: 5000,
    location: 'Tokyo, Japan',
    url: 'https://example.com',
    createdAt: new Date('2020-01-01'),
    isProtected: false
  };

  const mockAPIResponse = {
    id_str: '123456789',
    screen_name: 'testuser',
    name: 'Test User',
    description: 'Investment education content creator',
    profile_image_url_https: 'https://example.com/avatar.jpg',
    verified: false,
    followers_count: 1000,
    friends_count: 500,
    statuses_count: 2000,
    favourites_count: 5000,
    location: 'Tokyo, Japan',
    url: 'https://example.com',
    created_at: 'Wed Jan 01 00:00:00 +0000 2020',
    protected: false
  };

  const mockFollowerResponse = {
    followers: [mockAPIResponse],
    following: [mockAPIResponse],
    followerCount: 1000,
    followingCount: 500,
    nextCursor: 'next_cursor_token'
  };

  beforeEach(() => {
    // HttpClientモック設定
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn()
    };
    
    // AuthManagerモック設定
    mockAuthManager = {
      getAuthHeaders: vi.fn().mockReturnValue({ 'x-api-key': 'test-api-key' }),
      getUserSession: vi.fn().mockReturnValue('test-session')
    };

    userInfoEndpoint = new UserInfoEndpoint(
      mockHttpClient as HttpClient,
      mockAuthManager as AuthManager
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserInfo', () => {
    it('正常系: 有効なユーザー名でユーザー情報を取得できる', async () => {
      // モック設定
      (mockHttpClient.get as any).mockResolvedValue({
        ...mockAPIResponse,
        rateLimit: { remaining: 299, resetTime: Date.now() + 3600000 }
      });

      // テスト実行
      const result = await userInfoEndpoint.getUserInfo('testuser');

      // 検証
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUserData);
      expect(result.rateLimit).toBeDefined();
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/info',
        { userName: 'testuser' },
        { headers: { 'x-api-key': 'test-api-key' } }
      );
    });

    it('異常系: 無効なユーザー名形式でエラーが発生する', async () => {
      await expect(userInfoEndpoint.getUserInfo('')).rejects.toThrow('Invalid userName');
      await expect(userInfoEndpoint.getUserInfo('invalid-user-name!')).rejects.toThrow('Invalid userName');
      await expect(userInfoEndpoint.getUserInfo('verylongusernamethatexceedslimit')).rejects.toThrow('Invalid userName');
    });

    it('異常系: APIキー認証エラー(401)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 401, message: 'Unauthorized' });

      await expect(userInfoEndpoint.getUserInfo('testuser')).rejects.toThrow('Invalid API key');
    });

    it('異常系: 権限不足エラー(403)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 403, message: 'Forbidden' });

      await expect(userInfoEndpoint.getUserInfo('testuser')).rejects.toThrow('API key lacks permission');
    });

    it('異常系: レート制限エラー(429)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 429, message: 'Rate limit exceeded' });

      await expect(userInfoEndpoint.getUserInfo('testuser')).rejects.toThrow('Rate limit exceeded');
    });

    it('異常系: ユーザー見つからないエラー(404)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 404, message: 'Not found' });

      await expect(userInfoEndpoint.getUserInfo('nonexistentuser')).rejects.toThrow('User not found');
    });

    it('エッジケース: 部分的なAPIレスポンスデータでも正常に処理する', async () => {
      const partialResponse = {
        id_str: '123456789',
        screen_name: 'testuser',
        name: 'Test User'
        // 他のフィールドなし
      };

      (mockHttpClient.get as any).mockResolvedValue(partialResponse);

      const result = await userInfoEndpoint.getUserInfo('testuser');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('123456789');
      expect(result.data.username).toBe('testuser');
      expect(result.data.displayName).toBe('Test User');
      expect(result.data.bio).toBe('');
      expect(result.data.followersCount).toBe(0);
    });
  });

  describe('getUserFollowers', () => {
    it('正常系: ユーザーのフォロワー情報を取得できる', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFollowerResponse);

      const result = await userInfoEndpoint.getUserFollowers('testuser');

      expect(result.success).toBe(true);
      expect(result.data.followers).toHaveLength(1);
      expect(result.data.followers[0]).toEqual(mockUserData);
      expect(result.pagination?.hasMore).toBe(true);
      expect(result.pagination?.nextCursor).toBe('next_cursor_token');
    });

    it('正常系: カーソルとカウントオプションを正しく処理する', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFollowerResponse);

      await userInfoEndpoint.getUserFollowers('testuser', { 
        cursor: 'test_cursor', 
        count: 50 
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/followers',
        { userName: 'testuser', cursor: 'test_cursor', count: 50 },
        { headers: { 'x-api-key': 'test-api-key' } }
      );
    });

    it('境界値: count上限値(200)を超えても制限される', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFollowerResponse);

      await userInfoEndpoint.getUserFollowers('testuser', { count: 300 });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/followers',
        expect.objectContaining({ count: 200 }),
        expect.any(Object)
      );
    });

    it('異常系: 無効なユーザー名でエラーが発生する', async () => {
      await expect(userInfoEndpoint.getUserFollowers('')).rejects.toThrow('Invalid userName');
    });
  });

  describe('getUserFollowing', () => {
    it('正常系: ユーザーのフォロー情報を取得できる', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFollowerResponse);

      const result = await userInfoEndpoint.getUserFollowing('testuser');

      expect(result.success).toBe(true);
      expect(result.data.following).toHaveLength(1);
      expect(result.data.following[0]).toEqual(mockUserData);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/following',
        { userName: 'testuser' },
        { headers: { 'x-api-key': 'test-api-key' } }
      );
    });

    it('正常系: オプションパラメータを正しく処理する', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFollowerResponse);

      await userInfoEndpoint.getUserFollowing('testuser', { 
        cursor: 'test_cursor', 
        count: 100 
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/following',
        { userName: 'testuser', cursor: 'test_cursor', count: 100 },
        { headers: { 'x-api-key': 'test-api-key' } }
      );
    });
  });

  describe('searchUsers', () => {
    const mockSearchResponse = {
      users: [mockAPIResponse],
      totalCount: 1
    };

    it('正常系: ユーザー検索クエリで検索結果を取得できる', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockSearchResponse);

      const result = await userInfoEndpoint.searchUsers('investment education');

      expect(result.users).toHaveLength(1);
      expect(result.users[0]).toEqual(mockUserData);
      expect(result.totalCount).toBe(1);
      expect(result.searchQuery).toBe('investment education');
      expect(result.executedAt).toBeInstanceOf(Date);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/search',
        { q: 'investment education' },
        { headers: { 'x-api-key': 'test-api-key' } }
      );
    });

    it('正常系: 検索オプションを正しく処理する', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockSearchResponse);

      const options: UserSearchOptions = {
        count: 10,
        resultType: 'popular'
      };

      await userInfoEndpoint.searchUsers('crypto', options);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/search',
        { q: 'crypto', count: 10, result_type: 'popular' },
        { headers: { 'x-api-key': 'test-api-key' } }
      );
    });

    it('境界値: count上限値(20)を超えても制限される', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockSearchResponse);

      await userInfoEndpoint.searchUsers('test', { count: 50 });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/search',
        expect.objectContaining({ count: 20 }),
        expect.any(Object)
      );
    });

    it('異常系: 空の検索クエリでエラーが発生する', async () => {
      await expect(userInfoEndpoint.searchUsers('')).rejects.toThrow('Invalid search query');
    });

    it('異常系: 長すぎる検索クエリでエラーが発生する', async () => {
      const longQuery = 'a'.repeat(101);
      await expect(userInfoEndpoint.searchUsers(longQuery)).rejects.toThrow('Invalid search query');
    });

    it('エッジケース: 空の検索結果でも適切に処理する', async () => {
      (mockHttpClient.get as any).mockResolvedValue({ users: [], totalCount: 0 });

      const result = await userInfoEndpoint.searchUsers('nonexistentquery');

      expect(result.users).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('エッジケース: totalCountがない場合は配列長を使用する', async () => {
      (mockHttpClient.get as any).mockResolvedValue({ users: [mockAPIResponse] });

      const result = await userInfoEndpoint.searchUsers('test');

      expect(result.totalCount).toBe(1);
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量データの正規化処理時間が適切である', async () => {
      const largeFollowerResponse = {
        followers: Array(100).fill(mockAPIResponse),
        following: Array(100).fill(mockAPIResponse),
        followerCount: 100,
        followingCount: 100
      };

      (mockHttpClient.get as any).mockResolvedValue(largeFollowerResponse);

      const startTime = Date.now();
      await userInfoEndpoint.getUserFollowers('testuser');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
    });

    it('連続API呼び出し時のメモリリークがない', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockAPIResponse);

      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 10; i++) {
        await userInfoEndpoint.getUserInfo('testuser');
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB未満
    });
  });
});