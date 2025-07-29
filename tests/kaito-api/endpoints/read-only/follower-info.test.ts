/**
 * FollowerInfoEndpoint テスト - follower-info.test.ts
 * REQUIREMENTS.md準拠 - フォロワー情報エンドポイントの包括的テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FollowerInfoEndpoint } from '../../../../src/kaito-api/endpoints/read-only/follower-info';
import type { HttpClient, UserInfo } from '../../../../src/kaito-api/utils/types';
import { AuthManager } from '../../../../src/kaito-api/core/auth-manager';

describe('FollowerInfoEndpoint', () => {
  let followerInfoEndpoint: FollowerInfoEndpoint;
  let mockHttpClient: Partial<HttpClient>;
  let mockAuthManager: Partial<AuthManager>;

  // テストデータ
  const mockUserInfo: UserInfo = {
    id: '123456789',
    username: 'testuser',
    displayName: 'Test User',
    bio: 'Investment educator and financial literacy advocate',
    profileImageUrl: 'https://example.com/avatar.jpg',
    verified: false,
    followersCount: 5000,
    followingCount: 1000,
    tweetCount: 2500,
    likeCount: 15000,
    createdAt: new Date('2020-01-01'),
    isProtected: false
  };

  const mockAPIUserResponse = {
    id_str: '123456789',
    screen_name: 'testuser',
    name: 'Test User',
    description: 'Investment educator and financial literacy advocate',
    profile_image_url_https: 'https://example.com/avatar.jpg',
    verified: false,
    followers_count: 5000,
    friends_count: 1000,
    statuses_count: 2500,
    favourites_count: 15000,
    created_at: 'Wed Jan 01 00:00:00 +0000 2020',
    protected: false
  };

  const mockFollowersResponse = {
    users: [mockAPIUserResponse],
    total_count: 1,
    next_cursor: 1234567890,
    next_cursor_str: '1234567890',
    previous_cursor: 0,
    previous_cursor_str: '0',
    rateLimit: { remaining: 14, resetTime: Date.now() + 900000 }
  };

  const mockFollowingResponse = {
    users: [mockAPIUserResponse],
    total_count: 1,
    next_cursor: 1234567890,
    next_cursor_str: '1234567890',
    previous_cursor: 0,
    previous_cursor_str: '0',
    rateLimit: { remaining: 14, resetTime: Date.now() + 900000 }
  };

  const mockFriendshipResponse = {
    relationship: {
      source: {
        id_str: '123456789',
        screen_name: 'sourceuser',
        following: true,
        followed_by: false,
        can_dm: true,
        blocking: false,
        blocked_by: false,
        muting: false,
        want_retweets: true,
        all_replies: false,
        marked_spam: false
      },
      target: {
        id_str: '987654321',
        screen_name: 'targetuser',
        following: false,
        followed_by: true
      }
    }
  };

  const mockFollowerIdsResponse = {
    ids: [123456789, 987654321, 555666777],
    next_cursor: 1234567890,
    next_cursor_str: '1234567890',
    previous_cursor: 0
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

    followerInfoEndpoint = new FollowerInfoEndpoint(
      mockHttpClient as HttpClient,
      mockAuthManager as AuthManager
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getFollowers', () => {
    it('正常系: ユーザーのフォロワー一覧を取得できる', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFollowersResponse);

      const result = await followerInfoEndpoint.getFollowers('testuser');

      expect(result.success).toBe(true);
      expect(result.data.followers).toHaveLength(1);
      expect(result.data.followers[0]).toEqual(mockUserInfo);
      expect(result.data.totalCount).toBe(1);
      expect(result.data.fetchedCount).toBe(1);
      expect(result.pagination?.hasMore).toBe(true);
      expect(result.pagination?.nextCursor).toBe('1234567890');
      expect(result.rateLimit).toBeDefined();
      
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/followers',
        expect.objectContaining({
          screen_name: 'testuser',
          count: 20,
          include_user_entities: true,
          skip_status: true,
          headers: { 'x-api-key': 'test-api-key' }
        })
      );
    });

    it('正常系: オプションパラメータを正しく処理する', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFollowersResponse);

      const options = {
        cursor: '1111111111',
        count: 50,
        includeUserEntities: false,
        skipStatus: false
      };

      await followerInfoEndpoint.getFollowers('testuser', options);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/followers',
        expect.objectContaining({
          screen_name: 'testuser',
          count: 50,
          include_user_entities: false,
          skip_status: false,
          cursor: '1111111111',
          headers: { 'x-api-key': 'test-api-key' }
        })
      );
    });

    it('正常系: フィルタオプションを正しく適用する', async () => {
      const verifiedUserResponse = {
        ...mockFollowersResponse,
        users: [
          { ...mockAPIUserResponse, verified: true, followers_count: 10000 },
          { ...mockAPIUserResponse, id_str: '999999999', verified: false, followers_count: 100 }
        ]
      };
      (mockHttpClient.get as any).mockResolvedValue(verifiedUserResponse);

      const result = await followerInfoEndpoint.getFollowers('testuser', {
        filter: {
          verified: true,
          minFollowers: 1000,
          hasProfileImage: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.data.followers).toHaveLength(1);
      expect(result.data.followers[0].verified).toBe(true);
      expect(result.data.followers[0].followersCount).toBeGreaterThanOrEqual(1000);
    });

    it('境界値: count上限値(200)を超えても制限される', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFollowersResponse);

      await followerInfoEndpoint.getFollowers('testuser', { count: 500 });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/followers',
        expect.objectContaining({ count: 200 })
      );
    });

    it('異常系: 無効なユーザー名でエラーが発生する', async () => {
      await expect(followerInfoEndpoint.getFollowers('')).rejects.toThrow('Invalid userName');
      await expect(followerInfoEndpoint.getFollowers('invalid-user!')).rejects.toThrow('Invalid userName');
      await expect(followerInfoEndpoint.getFollowers('verylongusernamethatexceeds15chars')).rejects.toThrow('Invalid userName');
    });

    it('異常系: 無効なカウント値でエラーが発生する', async () => {
      await expect(followerInfoEndpoint.getFollowers('testuser', { count: 0 })).rejects.toThrow('Invalid count');
      await expect(followerInfoEndpoint.getFollowers('testuser', { count: 300 })).rejects.toThrow('Invalid count');
      await expect(followerInfoEndpoint.getFollowers('testuser', { count: -1 })).rejects.toThrow('Invalid count');
    });

    it('異常系: APIキー認証エラー(401)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 401, message: 'Unauthorized' });

      await expect(followerInfoEndpoint.getFollowers('testuser')).rejects.toThrow('Invalid API key');
    });

    it('異常系: レート制限エラー(429)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 429, message: 'Rate limit exceeded' });

      await expect(followerInfoEndpoint.getFollowers('testuser')).rejects.toThrow('Rate limit exceeded');
    });

    it('異常系: ユーザー見つからないエラー(404)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 404, message: 'Not found' });

      await expect(followerInfoEndpoint.getFollowers('nonexistentuser')).rejects.toThrow('User not found');
    });

    it('異常系: プライベートアカウントエラーを適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ 
        status: 403, 
        message: 'User has protected tweets' 
      });

      await expect(followerInfoEndpoint.getFollowers('privateuser')).rejects.toThrow('Cannot access followers/following of protected account');
    });

    it('エッジケース: フォロワーが0人の場合でも適切に処理する', async () => {
      const emptyResponse = {
        users: [],
        total_count: 0,
        next_cursor: 0,
        next_cursor_str: '0',
        previous_cursor: 0,
        previous_cursor_str: '0'
      };
      (mockHttpClient.get as any).mockResolvedValue(emptyResponse);

      const result = await followerInfoEndpoint.getFollowers('testuser');

      expect(result.success).toBe(true);
      expect(result.data.followers).toHaveLength(0);
      expect(result.data.totalCount).toBe(0);
      expect(result.pagination?.hasMore).toBe(false);
    });
  });

  describe('getFollowing', () => {
    it('正常系: ユーザーのフォロー一覧を取得できる', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFollowingResponse);

      const result = await followerInfoEndpoint.getFollowing('testuser');

      expect(result.success).toBe(true);
      expect(result.data.following).toHaveLength(1);
      expect(result.data.following[0]).toEqual(mockUserInfo);
      expect(result.data.totalCount).toBe(1);
      expect(result.data.fetchedCount).toBe(1);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/following',
        expect.objectContaining({
          screen_name: 'testuser',
          count: 20,
          include_user_entities: true,
          skip_status: true,
          headers: { 'x-api-key': 'test-api-key' }
        })
      );
    });

    it('正常系: フィルタオプションを正しく適用する', async () => {
      const mixedFollowingResponse = {
        ...mockFollowingResponse,
        users: [
          { ...mockAPIUserResponse, followers_count: 15000, verified: true },
          { ...mockAPIUserResponse, id_str: '888888888', followers_count: 100, verified: false }
        ]
      };
      (mockHttpClient.get as any).mockResolvedValue(mixedFollowingResponse);

      const result = await followerInfoEndpoint.getFollowing('testuser', {
        filter: {
          minFollowers: 1000,
          verified: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.data.following).toHaveLength(1);
      expect(result.data.following[0].followersCount).toBeGreaterThanOrEqual(1000);
      expect(result.data.following[0].verified).toBe(true);
    });

    it('異常系: 無効なユーザー名でエラーが発生する', async () => {
      await expect(followerInfoEndpoint.getFollowing('')).rejects.toThrow('Invalid userName');
    });
  });

  describe('getFriendship', () => {
    it('正常系: ユーザー間の関係性を取得できる', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFriendshipResponse);

      const result = await followerInfoEndpoint.getFriendship('sourceuser', 'targetuser');

      expect(result.success).toBe(true);
      expect(result.data.source.username).toBe('sourceuser');
      expect(result.data.source.following).toBe(true);
      expect(result.data.source.followedBy).toBe(false);
      expect(result.data.source.canDm).toBe(true);
      expect(result.data.target.username).toBe('targetuser');
      expect(result.data.target.following).toBe(false);
      expect(result.data.target.followedBy).toBe(true);
      
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/friendship',
        {
          source_screen_name: 'sourceuser',
          target_screen_name: 'targetuser',
          headers: { 'x-api-key': 'test-api-key' }
        }
      );
    });

    it('正常系: 関係性の詳細情報を正確に取得する', async () => {
      const detailedFriendshipResponse = {
        relationship: {
          source: {
            id_str: '123456789',
            screen_name: 'investor_edu',
            following: true,
            followed_by: true,
            can_dm: true,
            blocking: false,
            blocked_by: false,
            muting: false,
            want_retweets: true,
            all_replies: true,
            marked_spam: false
          },
          target: {
            id_str: '987654321',
            screen_name: 'finance_guru',
            following: true,
            followed_by: true
          }
        }
      };
      (mockHttpClient.get as any).mockResolvedValue(detailedFriendshipResponse);

      const result = await followerInfoEndpoint.getFriendship('investor_edu', 'finance_guru');

      expect(result.success).toBe(true);
      expect(result.data.source.following).toBe(true);
      expect(result.data.source.followedBy).toBe(true);
      expect(result.data.source.wantRetweets).toBe(true);
      expect(result.data.source.allReplies).toBe(true);
      expect(result.data.target.following).toBe(true);
      expect(result.data.target.followedBy).toBe(true);
    });

    it('異常系: 無効なソースユーザー名でエラーが発生する', async () => {
      await expect(followerInfoEndpoint.getFriendship('', 'targetuser')).rejects.toThrow('Invalid sourceUser');
      await expect(followerInfoEndpoint.getFriendship('invalid!', 'targetuser')).rejects.toThrow('Invalid sourceUser');
    });

    it('異常系: 無効なターゲットユーザー名でエラーが発生する', async () => {
      await expect(followerInfoEndpoint.getFriendship('sourceuser', '')).rejects.toThrow('Invalid targetUser');
      await expect(followerInfoEndpoint.getFriendship('sourceuser', 'invalid!')).rejects.toThrow('Invalid targetUser');
    });

    it('エッジケース: relationshipプロパティがない場合でも適切に処理する', async () => {
      const emptyFriendshipResponse = {};
      (mockHttpClient.get as any).mockResolvedValue(emptyFriendshipResponse);

      const result = await followerInfoEndpoint.getFriendship('sourceuser', 'targetuser');

      expect(result.success).toBe(true);
      expect(result.data.source.following).toBe(false);
      expect(result.data.source.followedBy).toBe(false);
      expect(result.data.target.following).toBe(false);
      expect(result.data.target.followedBy).toBe(false);
    });
  });

  describe('getFollowerIds', () => {
    it('正常系: フォロワーIDリストを取得できる', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFollowerIdsResponse);

      const result = await followerInfoEndpoint.getFollowerIds('testuser');

      expect(result.success).toBe(true);
      expect(result.data.ids).toEqual(['123456789', '987654321', '555666777']);
      expect(result.data.totalCount).toBe(3);
      expect(result.pagination?.hasMore).toBe(true);
      expect(result.pagination?.nextCursor).toBe('1234567890');
      
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/followers/ids',
        expect.objectContaining({
          screen_name: 'testuser',
          count: 5000,
          headers: { 'x-api-key': 'test-api-key' }
        })
      );
    });

    it('正常系: カーソルとカウントオプションを正しく処理する', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFollowerIdsResponse);

      await followerInfoEndpoint.getFollowerIds('testuser', {
        cursor: '1111111111',
        count: 1000
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/followers/ids',
        expect.objectContaining({
          screen_name: 'testuser',
          count: 1000,
          cursor: '1111111111',
          headers: { 'x-api-key': 'test-api-key' }
        })
      );
    });

    it('境界値: count上限値(5000)を超えても制限される', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFollowerIdsResponse);

      await followerInfoEndpoint.getFollowerIds('testuser', { count: 10000 });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/user/followers/ids',
        expect.objectContaining({ count: 5000 })
      );
    });

    it('異常系: 無効なユーザー名でエラーが発生する', async () => {
      await expect(followerInfoEndpoint.getFollowerIds('')).rejects.toThrow('Invalid userName');
    });

    it('エッジケース: 空のIDリストでも適切に処理する', async () => {
      const emptyIdsResponse = {
        ids: [],
        next_cursor: 0,
        next_cursor_str: '0',
        previous_cursor: 0
      };
      (mockHttpClient.get as any).mockResolvedValue(emptyIdsResponse);

      const result = await followerInfoEndpoint.getFollowerIds('testuser');

      expect(result.success).toBe(true);
      expect(result.data.ids).toHaveLength(0);
      expect(result.data.totalCount).toBe(0);
      expect(result.pagination?.hasMore).toBe(false);
    });

    it('エッジケース: 数値IDを文字列に正しく変換する', async () => {
      const numericIdsResponse = {
        ids: [123456789, 987654321],
        next_cursor: 0,
        next_cursor_str: '0'
      };
      (mockHttpClient.get as any).mockResolvedValue(numericIdsResponse);

      const result = await followerInfoEndpoint.getFollowerIds('testuser');

      expect(result.data.ids).toEqual(['123456789', '987654321']);
      expect(result.data.ids.every(id => typeof id === 'string')).toBe(true);
    });
  });

  describe('投資教育コンテンツ特化テスト', () => {
    it('正常系: 投資教育者のフォロワーを適切にフィルタリングする', async () => {
      const investmentFollowersResponse = {
        users: [
          {
            ...mockAPIUserResponse,
            screen_name: 'crypto_investor',
            description: 'Cryptocurrency investment specialist',
            verified: true,
            followers_count: 50000
          },
          {
            ...mockAPIUserResponse,
            id_str: '777777777',
            screen_name: 'day_trader',
            description: 'Day trading strategies and tips',
            verified: false,
            followers_count: 15000
          },
          {
            ...mockAPIUserResponse,
            id_str: '888888888',
            screen_name: 'spam_account',
            description: '',
            verified: false,
            followers_count: 50,
            profile_image_url_https: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'
          }
        ],
        total_count: 3,
        next_cursor_str: '0'
      };
      (mockHttpClient.get as any).mockResolvedValue(investmentFollowersResponse);

      const result = await followerInfoEndpoint.getFollowers('investment_educator', {
        filter: {
          minFollowers: 1000,
          hasProfileImage: true,
          verified: undefined // 認証済み・未認証両方を含む
        }
      });

      expect(result.success).toBe(true);
      expect(result.data.followers).toHaveLength(2); // spam_accountは除外される
      expect(result.data.followers.every(f => f.followersCount >= 1000)).toBe(true);
      expect(result.data.followers.every(f => 
        f.profileImageUrl && !f.profileImageUrl.includes('default_profile')
      )).toBe(true);
    });

    it('正常系: 金融教育関係者間の関係性を分析する', async () => {
      const educatorRelationshipResponse = {
        relationship: {
          source: {
            id_str: '123456789',
            screen_name: 'financial_educator',
            following: true,
            followed_by: true,
            can_dm: true,
            blocking: false,
            want_retweets: true
          },
          target: {
            id_str: '987654321',
            screen_name: 'investment_analyst',
            following: true,
            followed_by: true
          }
        }
      };
      (mockHttpClient.get as any).mockResolvedValue(educatorRelationshipResponse);

      const result = await followerInfoEndpoint.getFriendship('financial_educator', 'investment_analyst');

      expect(result.success).toBe(true);
      expect(result.data.source.following).toBe(true);
      expect(result.data.source.followedBy).toBe(true);
      expect(result.data.source.canDm).toBe(true);
      expect(result.data.source.wantRetweets).toBe(true);
      // 相互フォロー関係を確認
      expect(result.data.target.following).toBe(true);
      expect(result.data.target.followedBy).toBe(true);
    });

    it('正常系: 大量のフォロワーIDを効率的に取得する', async () => {
      const largeIdsResponse = {
        ids: Array.from({ length: 5000 }, (_, i) => i + 1000000),
        next_cursor: 1234567890,
        next_cursor_str: '1234567890'
      };
      (mockHttpClient.get as any).mockResolvedValue(largeIdsResponse);

      const result = await followerInfoEndpoint.getFollowerIds('popular_educator');

      expect(result.success).toBe(true);
      expect(result.data.ids).toHaveLength(5000);
      expect(result.data.totalCount).toBe(5000);
      expect(result.pagination?.hasMore).toBe(true);
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量フォロワーデータの正規化処理時間が適切である', async () => {
      const largeFollowersResponse = {
        users: Array(200).fill(mockAPIUserResponse),
        total_count: 200,
        next_cursor_str: '0'
      };
      (mockHttpClient.get as any).mockResolvedValue(largeFollowersResponse);

      const startTime = Date.now();
      const result = await followerInfoEndpoint.getFollowers('popular_user');
      const endTime = Date.now();

      expect(result.data.followers).toHaveLength(200);
      expect(endTime - startTime).toBeLessThan(2000); // 2秒以内
    });

    it('フィルタリング処理のパフォーマンスが適切である', async () => {
      const mixedFollowersResponse = {
        users: Array(100).fill(mockAPIUserResponse).map((user, index) => ({
          ...user,
          id_str: String(index),
          verified: index % 2 === 0,
          followers_count: index * 100
        })),
        total_count: 100,
        next_cursor_str: '0'
      };
      (mockHttpClient.get as any).mockResolvedValue(mixedFollowersResponse);

      const startTime = Date.now();
      const result = await followerInfoEndpoint.getFollowers('testuser', {
        filter: {
          verified: true,
          minFollowers: 2000
        }
      });
      const endTime = Date.now();

      expect(result.data.followers.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
    });

    it('連続API呼び出し時のメモリリークがない', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFollowersResponse);

      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 20; i++) {
        await followerInfoEndpoint.getFollowers(`user${i}`);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB未満
    });
  });

  describe('エラーハンドリング強化テスト', () => {
    it('異常系: ネットワークエラーを適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue(new Error('Network error'));

      await expect(followerInfoEndpoint.getFollowers('testuser')).rejects.toThrow('API error in getFollowers: Network error');
    });

    it('異常系: 権限不足エラー(403)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 403, message: 'Forbidden' });

      await expect(followerInfoEndpoint.getFollowers('testuser')).rejects.toThrow('API key lacks permission');
    });

    it('異常系: サーバーエラー(500)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 500, message: 'Internal server error' });

      await expect(followerInfoEndpoint.getFollowers('testuser')).rejects.toThrow('API error in getFollowers: Internal server error');
    });

    it('異常系: 不正なJSONレスポンスでも適切にエラーハンドリングする', async () => {
      (mockHttpClient.get as any).mockResolvedValue('invalid json');

      // normalizeUserInfoでエラーが発生した場合でも適切に処理されることを確認
      const result = await followerInfoEndpoint.getFollowers('testuser');
      expect(result.data.followers).toHaveLength(0);
    });
  });
});