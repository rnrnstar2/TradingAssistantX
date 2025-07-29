/**
 * FollowManagement テスト - follow.test.ts
 * REQUIREMENTS.md準拠 - 認証必須フォロー管理エンドポイントの包括的テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FollowManagement } from '../../../../src/kaito-api/endpoints/authenticated/follow';
import type { HttpClient } from '../../../../src/kaito-api/utils/types';
import { AuthManager } from '../../../../src/kaito-api/core/auth-manager';

describe('FollowManagement', () => {
  let followManagement: FollowManagement;
  let mockHttpClient: Partial<HttpClient>;
  let mockAuthManager: Partial<AuthManager>;

  // テストデータ
  const validUserId = '123456789';
  const validUserIds = ['123456789', '987654321', '555666777'];
  const invalidUserIds = ['', 'abc123', '12345678901234567890', 'invalid-id'];

  const mockFollowSuccessResponse = {
    success: true,
    userId: validUserId,
    followed: true,
    timestamp: '2024-01-15T10:30:00Z',
    message: 'Successfully followed user'
  };

  const mockUnfollowSuccessResponse = {
    success: true,
    userId: validUserId,
    unfollowed: true,
    timestamp: '2024-01-15T10:30:00Z',
    message: 'Successfully unfollowed user'
  };

  const mockFollowingStatusResponse = {
    success: true,
    isFollowing: true,
    userId: validUserId
  };

  beforeEach(() => {
    // HttpClientモック設定
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
    };
    
    // AuthManagerモック設定
    mockAuthManager = {
      getAuthHeaders: vi.fn().mockReturnValue({ 'x-api-key': 'test-api-key' }),
      getUserSession: vi.fn().mockReturnValue('test-login-cookie'),
      isAuthenticated: vi.fn().mockReturnValue(true)
    };

    followManagement = new FollowManagement(
      mockHttpClient as HttpClient,
      mockAuthManager as AuthManager
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('followUser', () => {
    it('正常系: ユーザーをフォローできる', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockFollowSuccessResponse);

      const result = await followManagement.followUser(validUserId);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(validUserId);
      expect(result.followed).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/follow'),
        expect.objectContaining({
          user_id: validUserId
        })
      );
    });

    it('正常系: 投資教育者アカウントを適切にフォローする', async () => {
      const educatorUserId = '111111111';
      const educatorFollowResponse = {
        ...mockFollowSuccessResponse,
        userId: educatorUserId,
        userCategory: 'investment_educator',
        followReason: 'educational_content'
      };
      (mockHttpClient.post as any).mockResolvedValue(educatorFollowResponse);

      const result = await followManagement.followUser(educatorUserId);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(educatorUserId);
      expect(result.followed).toBe(true);
    });

    it('異常系: 無効なユーザーIDでバリデーションエラーが発生する', async () => {
      for (const invalidId of invalidUserIds) {
        const result = await followManagement.followUser(invalidId);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(mockHttpClient.post).not.toHaveBeenCalled();
      }
    });

    it('異常系: V2認証エラー(401)を適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 401 },
        message: 'Unauthorized'
      });

      const result = await followManagement.followUser(validUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('authentication');
    });

    it('異常系: レート制限エラー(429)を適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 429 },
        message: 'Rate limit exceeded'
      });

      const result = await followManagement.followUser(validUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
    });

    it('異常系: 既にフォロー済みのユーザーをフォローしようとした場合', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 403 },
        message: 'Already following this user'
      });

      const result = await followManagement.followUser(validUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Already following');
    });

    it('異常系: 存在しないユーザーをフォローしようとした場合', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 404 },
        message: 'User not found'
      });

      const result = await followManagement.followUser('999999999');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });

    it('異常系: プライベートアカウントをフォローしようとした場合', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 403 },
        message: 'Cannot follow private account without approval'
      });

      const result = await followManagement.followUser(validUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('private account');
    });
  });

  describe('unfollowUser', () => {
    it('正常系: ユーザーのフォローを解除できる', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockUnfollowSuccessResponse);

      const result = await followManagement.unfollowUser(validUserId);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(validUserId);
      expect(result.unfollowed).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/unfollow'),
        expect.objectContaining({
          user_id: validUserId
        })
      );
    });

    it('正常系: 投資教育者アカウントのフォロー解除を適切に実行する', async () => {
      const educatorUserId = '222222222';
      const educatorUnfollowResponse = {
        ...mockUnfollowSuccessResponse,
        userId: educatorUserId,
        unfollowReason: 'content_quality_changed'
      };
      (mockHttpClient.post as any).mockResolvedValue(educatorUnfollowResponse);

      const result = await followManagement.unfollowUser(educatorUserId);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(educatorUserId);
      expect(result.unfollowed).toBe(true);
    });

    it('異常系: 無効なユーザーIDでバリデーションエラーが発生する', async () => {
      const result = await followManagement.unfollowUser('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('異常系: フォローしていないユーザーのアンフォロー試行', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 404 },
        message: 'Not following this user'
      });

      const result = await followManagement.unfollowUser(validUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not following');
    });
  });

  describe('checkFollowingStatus', () => {
    it('正常系: ユーザーをフォローしている場合trueを返す', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFollowingStatusResponse);

      const result = await followManagement.checkFollowingStatus(validUserId);

      expect(result).toBe(true);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/friendship'),
        expect.objectContaining({
          user_id: validUserId
        })
      );
    });

    it('正常系: ユーザーをフォローしていない場合falseを返す', async () => {
      const notFollowingResponse = {
        success: true,
        isFollowing: false,
        userId: validUserId
      };
      (mockHttpClient.get as any).mockResolvedValue(notFollowingResponse);

      const result = await followManagement.checkFollowingStatus(validUserId);

      expect(result).toBe(false);
    });

    it('正常系: 複数ユーザーのフォロー状況を効率的に確認する', async () => {
      (mockHttpClient.get as any)
        .mockResolvedValueOnce({ success: true, isFollowing: true, userId: validUserIds[0] })
        .mockResolvedValueOnce({ success: true, isFollowing: false, userId: validUserIds[1] })
        .mockResolvedValueOnce({ success: true, isFollowing: true, userId: validUserIds[2] });

      const results = await Promise.all(
        validUserIds.map(userId => followManagement.checkFollowingStatus(userId))
      );

      expect(results).toEqual([true, false, true]);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(3);
    });

    it('異常系: 無効なユーザーIDでfalseを返す', async () => {
      const result = await followManagement.checkFollowingStatus('');

      expect(result).toBe(false);
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it('異常系: APIエラー時にfalseを返す', async () => {
      (mockHttpClient.get as any).mockRejectedValue(new Error('API error'));

      const result = await followManagement.checkFollowingStatus(validUserId);

      expect(result).toBe(false);
    });
  });

  describe('投資教育コンテンツ特化テスト', () => {
    it('正常系: 投資教育者グループを一括フォローする', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockFollowSuccessResponse);

      const investmentEducators = [
        '111111111', // Portfolio management expert
        '222222222', // Cryptocurrency educator
        '333333333', // Risk management specialist
        '444444444'  // Market analysis expert
      ];

      const results = [];
      for (const educatorId of investmentEducators) {
        const result = await followManagement.followUser(educatorId);
        results.push(result);
      }

      expect(results.every(r => r.success)).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(4);
    });

    it('正常系: 投資教育コンテンツ品質に基づくフォロー管理', async () => {
      (mockHttpClient.get as any).mockResolvedValue({ 
        success: true, 
        isFollowing: true, 
        userId: validUserId,
        contentQuality: 'high',
        educationalValue: 'excellent'
      });

      const result = await followManagement.checkFollowingStatus(validUserId);

      expect(result).toBe(true);
    });

    it('正常系: 異なる専門分野の投資教育者をフォローする', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockFollowSuccessResponse);

      const specializedEducators = [
        { id: '555555555', specialty: 'real_estate_investment' },
        { id: '666666666', specialty: 'stock_market_analysis' },
        { id: '777777777', specialty: 'retirement_planning' }
      ];

      for (const educator of specializedEducators) {
        const result = await followManagement.followUser(educator.id);
        expect(result.success).toBe(true);
      }

      expect(mockHttpClient.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量フォロー操作時のメモリリークがない', async () => {
      (mockHttpClient.post as any).mockResolvedValue(mockFollowSuccessResponse);

      const initialMemory = process.memoryUsage().heapUsed;
      
      // 30回の連続フォロー操作
      for (let i = 0; i < 30; i++) {
        await followManagement.followUser(`12345678${i.toString().padStart(2, '0')}`);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // 5MB未満
    });

    it('フォロー状況確認の並行処理パフォーマンス', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockFollowingStatusResponse);

      const startTime = Date.now();
      
      // 20ユーザーの並行フォロー状況確認
      const checkPromises = [];
      for (let i = 0; i < 20; i++) {
        checkPromises.push(
          followManagement.checkFollowingStatus(`12345678${i.toString().padStart(2, '0')}`)
        );
      }

      await Promise.all(checkPromises);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(2000); // 2秒以内
    });
  });

  describe('エラーハンドリング強化テスト', () => {
    it('異常系: ネットワークエラーを適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue(new Error('Network connection failed'));

      const result = await followManagement.followUser(validUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network connection failed');
    });

    it('異常系: サーバーエラー(500)を適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 500 },
        message: 'Internal server error'
      });

      const result = await followManagement.followUser(validUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('異常系: 無効なAPIレスポンス形式を処理する', async () => {
      (mockHttpClient.post as any).mockResolvedValue('invalid response');

      const result = await followManagement.followUser(validUserId);

      // 適切なデフォルト値が設定されることを確認
      expect(result.success).toBe(false);
      expect(result.userId).toBe(validUserId);
    });

    it('異常系: 複数同時フォロー失敗を適切に処理する', async () => {
      (mockHttpClient.post as any).mockRejectedValue(new Error('Multiple follow errors'));

      const userIds = ['111111111', '222222222', '333333333'];
      const promises = userIds.map(id => followManagement.followUser(id));

      const results = await Promise.allSettled(promises);
      
      // すべてのエラーが適切に処理されることを確認
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          expect(result.value.success).toBe(false);
        }
      });
    });

    it('異常系: アカウント凍結中のフォロー試行エラー', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 403 },
        message: 'Account suspended'
      });

      const result = await followManagement.followUser(validUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Account suspended');
    });

    it('異常系: フォロー制限達成時のエラー処理', async () => {
      (mockHttpClient.post as any).mockRejectedValue({
        response: { status: 403 },
        message: 'Follow limit reached'
      });

      const result = await followManagement.followUser(validUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Follow limit reached');
    });
  });
});