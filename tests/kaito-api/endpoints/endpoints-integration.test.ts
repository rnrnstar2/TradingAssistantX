/**
 * KaitoAPI Endpoints Integration テスト - endpoints-integration.test.ts
 * REQUIREMENTS.md準拠 - 全エンドポイントクラス間の連携動作テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Read-only endpoints
import { UserInfoEndpoint } from '../../../src/kaito-api/endpoints/read-only/user-info';
import { TweetSearchEndpoint } from '../../../src/kaito-api/endpoints/read-only/tweet-search';
import { TrendsEndpoint } from '../../../src/kaito-api/endpoints/read-only/trends';
import { FollowerInfoEndpoint } from '../../../src/kaito-api/endpoints/read-only/follower-info';

// Authenticated endpoints
import { TweetManagement } from '../../../src/kaito-api/endpoints/authenticated/tweet';
import { EngagementManagement } from '../../../src/kaito-api/endpoints/authenticated/engagement';
import { FollowManagement } from '../../../src/kaito-api/endpoints/authenticated/follow';

import type { HttpClient } from '../../../src/kaito-api/utils/types';
import { AuthManager } from '../../../src/kaito-api/core/auth-manager';

describe('KaitoAPI Endpoints Integration', () => {
  let mockHttpClient: Partial<HttpClient>;
  let mockAuthManager: Partial<AuthManager>;

  // Read-only endpoints
  let userInfoEndpoint: UserInfoEndpoint;
  let tweetSearchEndpoint: TweetSearchEndpoint;
  let trendsEndpoint: TrendsEndpoint;
  let followerInfoEndpoint: FollowerInfoEndpoint;

  // Authenticated endpoints
  let tweetManagement: TweetManagement;
  let engagementManagement: EngagementManagement;
  let followManagement: FollowManagement;

  // 投資教育テストデータ
  const investmentEducatorData = {
    userId: '123456789',
    username: 'investment_guru',
    displayName: 'Investment Education Expert',
    bio: 'Teaching investment fundamentals and portfolio management',
    followers: 50000,
    following: 500,
    isVerified: true,
    category: 'investment_educator'
  };

  const investmentTweetData = {
    id: '1234567890123456789',
    text: 'Understanding diversification: The key to successful long-term investing is spreading risk across different asset classes.',
    userId: investmentEducatorData.userId,
    createdAt: '2024-01-15T10:30:00Z',
    likes: 1500,
    retweets: 800,
    replies: 200,
    tags: ['investing', 'diversification', 'portfoliomanagement'],
    educationalValue: 'high'
  };

  const trendsData = [
    { name: '#InvestmentEducation', volume: 25000, category: 'finance' },
    { name: '#PortfolioManagement', volume: 18000, category: 'finance' },
    { name: '#RiskManagement', volume: 12000, category: 'finance' },
    { name: '#MarketAnalysis', volume: 15000, category: 'finance' }
  ];

  beforeEach(() => {
    // HttpClientモック設定
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
    };
    
    // AuthManagerモック設定
    mockAuthManager = {
      getAuthHeaders: vi.fn().mockReturnValue({ 'x-api-key': 'investment-education-api-key' }),
      getUserSession: vi.fn().mockReturnValue('investment-education-session'),
      isAuthenticated: vi.fn().mockReturnValue(true)
    };

    // Read-only endpoints初期化
    userInfoEndpoint = new UserInfoEndpoint(
      mockHttpClient as HttpClient,
      mockAuthManager as AuthManager
    );
    tweetSearchEndpoint = new TweetSearchEndpoint(
      mockHttpClient as HttpClient,
      mockAuthManager as AuthManager
    );
    trendsEndpoint = new TrendsEndpoint(
      mockHttpClient as HttpClient,
      mockAuthManager as AuthManager
    );
    followerInfoEndpoint = new FollowerInfoEndpoint(
      mockHttpClient as HttpClient,
      mockAuthManager as AuthManager
    );

    // Authenticated endpoints初期化
    tweetManagement = new TweetManagement(
      mockHttpClient as HttpClient,
      mockAuthManager as AuthManager
    );
    engagementManagement = new EngagementManagement(
      mockHttpClient as HttpClient,
      mockAuthManager as AuthManager
    );
    followManagement = new FollowManagement(
      mockHttpClient as HttpClient,
      mockAuthManager as AuthManager
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('投資教育コンテンツ発見・分析・行動統合ワークフロー', () => {
    it('正常系: 完全な投資教育ワークフロー統合テスト', async () => {
      // Phase 1: 市場トレンド分析
      (mockHttpClient.get as any).mockImplementation((url: string) => {
        if (url.includes('/trends')) {
          return Promise.resolve({
            success: true,
            trends: trendsData,
            location: 'Japan',
            timestamp: '2024-01-15T10:30:00Z'
          });
        }
        return Promise.resolve({});
      });

      const trends = await trendsEndpoint.getTrends();
      expect(trends.success).toBe(true);
      expect(trends.trends).toHaveLength(4);
      expect(trends.trends.some(t => t.name === '#InvestmentEducation')).toBe(true);

      // Phase 2: 投資教育コンテンツ検索
      (mockHttpClient.get as any).mockResolvedValueOnce({
        success: true,
        tweets: [investmentTweetData],
        totalCount: 1,
        nextToken: null
      });

      const searchResults = await tweetSearchEndpoint.searchTweets(
        'investment education diversification',
        { count: 10 }
      );
      expect(searchResults.success).toBe(true);
      expect(searchResults.tweets).toHaveLength(1);
      expect(searchResults.tweets[0].educationalValue).toBe('high');

      // Phase 3: 教育者アカウント情報取得
      (mockHttpClient.get as any).mockResolvedValueOnce({
        success: true,
        user: investmentEducatorData
      });

      const userInfo = await userInfoEndpoint.getUserInfo(investmentEducatorData.userId);
      expect(userInfo.success).toBe(true);
      expect(userInfo.user.category).toBe('investment_educator');
      expect(userInfo.user.followers).toBeGreaterThan(10000);

      // Phase 4: フォロワー関係分析
      (mockHttpClient.get as any).mockResolvedValueOnce({
        success: true,
        isFollowing: false,
        userId: investmentEducatorData.userId
      });

      const followingStatus = await followManagement.checkFollowingStatus(investmentEducatorData.userId);
      expect(followingStatus).toBe(false);

      // Phase 5: 教育者をフォロー
      (mockHttpClient.post as any).mockResolvedValueOnce({
        success: true,
        userId: investmentEducatorData.userId,
        followed: true,
        timestamp: '2024-01-15T10:35:00Z'
      });

      const followResult = await followManagement.followUser(investmentEducatorData.userId);
      expect(followResult.success).toBe(true);
      expect(followResult.followed).toBe(true);

      // Phase 6: 価値ある投資教育コンテンツにエンゲージメント
      (mockHttpClient.post as any).mockResolvedValueOnce({
        success: true,
        tweetId: investmentTweetData.id,
        liked: true,
        timestamp: '2024-01-15T10:36:00Z'
      });

      const likeResult = await engagementManagement.likeTweet(investmentTweetData.id);
      expect(likeResult.success).toBe(true);
      expect(likeResult.liked).toBe(true);

      // Phase 7: 教育的引用ツイート作成
      (mockHttpClient.post as any).mockResolvedValueOnce({
        success: true,
        tweetId: 'new_quote_tweet_id',
        text: 'Excellent explanation of diversification! This is exactly what new investors need to understand.',
        quotedTweetId: investmentTweetData.id,
        timestamp: '2024-01-15T10:37:00Z'
      });

      const quoteTweetResult = await engagementManagement.quoteTweet(
        investmentTweetData.id,
        'Excellent explanation of diversification! This is exactly what new investors need to understand.'
      );
      expect(quoteTweetResult.success).toBe(true);
      expect(quoteTweetResult.tweetId).toBeDefined();

      // 全フェーズが成功したことを確認
      expect(mockHttpClient.get).toHaveBeenCalledTimes(4); // trends, search, userInfo, followingStatus
      expect(mockHttpClient.post).toHaveBeenCalledTimes(3); // follow, like, quoteTweet
    });
  });

  describe('投資教育者ネットワーク構築統合ワークフロー', () => {
    it('正常系: 専門分野別教育者発見・フォロー・エンゲージメント', async () => {
      const specializedEducators = [
        { id: '111111111', specialty: 'stock_analysis', username: 'stock_pro' },
        { id: '222222222', specialty: 'crypto_education', username: 'crypto_expert' },
        { id: '333333333', specialty: 'real_estate_investment', username: 'realestate_guru' }
      ];

      // Phase 1: 各専門分野の教育者を検索
      (mockHttpClient.get as any).mockImplementation((url: string) => {
        if (url.includes('/users/search')) {
          return Promise.resolve({
            success: true,
            users: specializedEducators.map(educator => ({
              userId: educator.id,
              username: educator.username,
              specialty: educator.specialty,
              followers: 25000,
              isVerified: true
            }))
          });
        }
        return Promise.resolve({});
      });

      const searchResults = await userInfoEndpoint.searchUsers('investment education');
      expect(searchResults.success).toBe(true);
      expect(searchResults.users).toHaveLength(3);

      // Phase 2: 各教育者のフォロワー情報取得
      (mockHttpClient.get as any).mockImplementation((url: string) => {
        if (url.includes('/followers')) {
          return Promise.resolve({
            success: true,
            followers: Array.from({ length: 100 }, (_, i) => ({
              userId: `follower_${i}`,
              engagementLevel: 'high'
            })),
            totalCount: 25000
          });
        }
        return Promise.resolve({});
      });

      for (const educator of specializedEducators) {
        const followersInfo = await followerInfoEndpoint.getFollowers(educator.id, { count: 100 });
        expect(followersInfo.success).toBe(true);
        expect(followersInfo.followers).toHaveLength(100);
      }

      // Phase 3: 価値ある教育者を一括フォロー
      (mockHttpClient.post as any).mockResolvedValue({
        success: true,
        followed: true,
        timestamp: '2024-01-15T11:00:00Z'
      });

      const followResults = [];
      for (const educator of specializedEducators) {
        const result = await followManagement.followUser(educator.id);
        followResults.push(result);
      }

      expect(followResults.every(r => r.success)).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(3);

      // Phase 4: 各教育者の最新コンテンツに対するエンゲージメント
      (mockHttpClient.get as any).mockResolvedValue({
        success: true,
        tweets: [{
          id: 'latest_educational_tweet',
          text: 'Advanced portfolio rebalancing strategies',
          educationalValue: 'high'
        }]
      });

      (mockHttpClient.post as any).mockResolvedValue({
        success: true,
        liked: true,
        retweeted: true
      });

      for (const educator of specializedEducators) {
        // 最新ツイート取得
        const latestTweets = await tweetSearchEndpoint.searchTweets(`from:${educator.username}`, { count: 1 });
        expect(latestTweets.success).toBe(true);

        // エンゲージメント実行
        const likeResult = await engagementManagement.likeTweet('latest_educational_tweet');
        const retweetResult = await engagementManagement.retweetTweet('latest_educational_tweet');
        
        expect(likeResult.success).toBe(true);
        expect(retweetResult.success).toBe(true);
      }
    });
  });

  describe('市場トレンド分析・コンテンツ作成統合ワークフロー', () => {
    it('正常系: トレンド分析→コンテンツ作成→配信統合フロー', async () => {
      // Phase 1: 日本の投資関連トレンド取得
      (mockHttpClient.get as any).mockResolvedValueOnce({
        success: true,
        trends: [
          { name: '#NISA', volume: 45000, category: 'investment' },
          { name: '#iDeCo', volume: 32000, category: 'retirement' },
          { name: '#株価', volume: 28000, category: 'stock_market' }
        ],
        location: 'Japan'
      });

      const japanTrends = await trendsEndpoint.getJapanTrends();
      expect(japanTrends.success).toBe(true);
      expect(japanTrends.trends.some(t => t.name === '#NISA')).toBe(true);

      // Phase 2: トレンドに関連する既存コンテンツ分析
      (mockHttpClient.get as any).mockResolvedValueOnce({
        success: true,
        tweets: [
          {
            id: 'nisa_explanation_tweet',
            text: 'NISA制度の基本的な仕組みについて解説します。',
            likes: 2500,
            retweets: 1200,
            educationalQuality: 'excellent'
          }
        ]
      });

      const nisaContent = await tweetSearchEndpoint.searchTweets('#NISA 制度 解説', { count: 10 });
      expect(nisaContent.success).toBe(true);
      expect(nisaContent.tweets).toHaveLength(1);

      // Phase 3: 高品質な教育コンテンツ作成
      (mockHttpClient.post as any).mockResolvedValueOnce({
        success: true,
        tweetId: 'new_educational_tweet_id',
        text: '【NISA活用法】2024年新NISA制度を最大限活用するための3つのポイント：1)つみたて投資枠の活用 2)成長投資枠との使い分け 3)非課税期間の有効活用。長期的な資産形成にお役立てください。#NISA #投資教育',
        timestamp: '2024-01-15T12:00:00Z'
      });

      const educationalTweet = await tweetManagement.createTweet(
        '【NISA活用法】2024年新NISA制度を最大限活用するための3つのポイント：1)つみたて投資枠の活用 2)成長投資枠との使い分け 3)非課税期間の有効活用。長期的な資産形成にお役立てください。#NISA #投資教育'
      );
      expect(educationalTweet.success).toBe(true);
      expect(educationalTweet.tweetId).toBeDefined();

      // Phase 4: 関連する専門家の既存コンテンツにエンゲージメント
      (mockHttpClient.post as any).mockResolvedValue({
        success: true,
        liked: true,
        retweeted: true
      });

      const likeResult = await engagementManagement.likeTweet('nisa_explanation_tweet');
      const retweetResult = await engagementManagement.retweetTweet('nisa_explanation_tweet');

      expect(likeResult.success).toBe(true);
      expect(retweetResult.success).toBe(true);

      // Phase 5: 追加の教育コンテンツ検索と品質評価
      (mockHttpClient.get as any).mockResolvedValueOnce({
        success: true,
        tweets: Array.from({ length: 20 }, (_, i) => ({
          id: `educational_tweet_${i}`,
          text: `投資教育コンテンツ ${i + 1}`,
          educationalValue: i % 3 === 0 ? 'high' : 'medium',
          likes: Math.floor(Math.random() * 1000) + 100
        }))
      });

      const additionalContent = await tweetSearchEndpoint.searchRecentTweets('投資 教育 初心者', { count: 20 });
      expect(additionalContent.success).toBe(true);
      expect(additionalContent.tweets).toHaveLength(20);

      // 高品質コンテンツのみを抽出してエンゲージメント
      const highQualityTweets = additionalContent.tweets.filter(
        tweet => tweet.educationalValue === 'high'
      );
      
      expect(highQualityTweets.length).toBeGreaterThan(0);

      // 全工程が正常に完了したことを確認
      expect(mockHttpClient.get).toHaveBeenCalledTimes(4);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(4);
    });
  });

  describe('エンドポイント間データ連携テスト', () => {
    it('正常系: 複数エンドポイントでの一貫したユーザーデータ処理', async () => {
      const testUserId = 'consistent_user_123';
      const consistentUserData = {
        userId: testUserId,
        username: 'investment_educator_test',
        displayName: 'Test Investment Educator',
        followers: 15000,
        following: 800
      };

      // UserInfoEndpointでのユーザー情報取得
      (mockHttpClient.get as any).mockImplementation((url: string) => {
        if (url.includes('/users/')) {
          return Promise.resolve({
            success: true,
            user: consistentUserData
          });
        }
        return Promise.resolve({});
      });

      const userInfo = await userInfoEndpoint.getUserInfo(testUserId);
      expect(userInfo.success).toBe(true);
      expect(userInfo.user.userId).toBe(testUserId);

      // FollowerInfoEndpointでの同一ユーザー情報確認
      (mockHttpClient.get as any).mockImplementation((url: string) => {
        if (url.includes('/followers')) {
          return Promise.resolve({
            success: true,
            userId: testUserId,
            followers: Array.from({ length: 100 }, (_, i) => ({
              userId: `follower_${i}`,
              username: `follower_${i}_name`
            })),
            totalCount: consistentUserData.followers
          });
        }
        return Promise.resolve({});
      });

      const followersInfo = await followerInfoEndpoint.getFollowers(testUserId, { count: 100 });
      expect(followersInfo.success).toBe(true);
      expect(followersInfo.userId).toBe(testUserId);
      expect(followersInfo.totalCount).toBe(consistentUserData.followers);

      // FollowManagementでの同一ユーザーに対する操作
      (mockHttpClient.get as any).mockImplementation((url: string) => {
        if (url.includes('/friendship')) {
          return Promise.resolve({
            success: true,
            isFollowing: false,
            userId: testUserId
          });
        }
        return Promise.resolve({});
      });

      const followingStatus = await followManagement.checkFollowingStatus(testUserId);
      expect(followingStatus).toBe(false);

      // データの一貫性確認
      expect(userInfo.user.userId).toBe(followersInfo.userId);
      expect(userInfo.user.followers).toBe(followersInfo.totalCount);
    });

    it('正常系: 投資教育コンテンツの一貫した品質評価システム', async () => {
      const educationalTweets = [
        {
          id: 'high_quality_tweet_1',
          text: 'ポートフォリオ理論の基本：リスクとリターンの関係を理解することが投資成功の鍵',
          educationalValue: 'high',
          likes: 2500,
          retweets: 1200
        },
        {
          id: 'medium_quality_tweet_2', 
          text: '今日の株価動向について',
          educationalValue: 'medium',
          likes: 150,
          retweets: 80
        },
        {
          id: 'high_quality_tweet_3',
          text: 'リスク管理の重要性：分散投資によるリスク軽減効果の実証分析',
          educationalValue: 'high',
          likes: 3200,
          retweets: 1800
        }
      ];

      // TweetSearchEndpointでの教育コンテンツ検索
      (mockHttpClient.get as any).mockResolvedValueOnce({
        success: true,
        tweets: educationalTweets,
        totalCount: 3
      });

      const searchResults = await tweetSearchEndpoint.searchTweets('投資 教育', { count: 10 });
      expect(searchResults.success).toBe(true);
      expect(searchResults.tweets).toHaveLength(3);

      // 高品質コンテンツの特定
      const highQualityTweets = searchResults.tweets.filter(
        tweet => tweet.educationalValue === 'high'
      );
      expect(highQualityTweets).toHaveLength(2);

      // EngagementManagementでの品質重視エンゲージメント
      (mockHttpClient.post as any).mockResolvedValue({
        success: true,
        liked: true,
        timestamp: '2024-01-15T13:00:00Z'
      });

      const engagementResults = [];
      for (const tweet of highQualityTweets) {
        const result = await engagementManagement.likeTweet(tweet.id);
        engagementResults.push(result);
      }

      expect(engagementResults.every(r => r.success)).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2); // 高品質ツイート2件のみ

      // 品質評価の一貫性確認
      const avgLikes = highQualityTweets.reduce((sum, tweet) => sum + tweet.likes, 0) / highQualityTweets.length;
      expect(avgLikes).toBeGreaterThan(1000); // 高品質コンテンツは高エンゲージメント
    });
  });

  describe('エラー処理統合テスト', () => {
    it('正常系: 複数エンドポイント連携時の部分失敗に対する適切な処理', async () => {
      const userIds = ['user1', 'user2', 'user3'];
      let successCount = 0;
      let failureCount = 0;

      // UserInfoEndpoint: 一部成功・一部失敗
      (mockHttpClient.get as any).mockImplementation((url: string) => {
        if (url.includes('user1')) {
          return Promise.resolve({ success: true, user: { userId: 'user1' } });
        } else if (url.includes('user2')) {
          return Promise.reject(new Error('User not found'));
        } else {
          return Promise.resolve({ success: true, user: { userId: 'user3' } });
        }
      });

      // 各ユーザー情報取得試行
      for (const userId of userIds) {
        try {
          const result = await userInfoEndpoint.getUserInfo(userId);
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          failureCount++;
        }
      }

      expect(successCount).toBe(2);
      expect(failureCount).toBe(1);

      // FollowManagement: 成功したユーザーのみフォロー
      (mockHttpClient.post as any).mockResolvedValue({
        success: true,
        followed: true
      });

      const followResults = [];
      for (const userId of ['user1', 'user3']) { // 成功したユーザーのみ
        const result = await followManagement.followUser(userId);
        followResults.push(result);
      }

      expect(followResults.every(r => r.success)).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
    });

    it('正常系: 認証エラー時の統一的なエラーハンドリング', async () => {
      // 認証エラーをシミュレート
      mockAuthManager.isAuthenticated = vi.fn().mockReturnValue(false);
      mockAuthManager.getAuthHeaders = vi.fn().mockReturnValue({});

      // Authenticated endpointsでの認証エラー確認
      const authErrors = [];

      try {
        await tweetManagement.createTweet('Test tweet');
      } catch (error) {
        authErrors.push('tweet');
      }

      try {
        await engagementManagement.likeTweet('test_tweet_id');
      } catch (error) {
        authErrors.push('engagement');
      }

      try {
        await followManagement.followUser('test_user_id');
      } catch (error) {
        authErrors.push('follow');
      }

      // すべてのauthenticatedエンドポイントで一貫した認証エラー処理
      expect(authErrors.length).toBeGreaterThan(0);
    });
  });

  describe('パフォーマンス統合テスト', () => {
    it('正常系: 大規模データ処理時の統合パフォーマンス', async () => {
      const startTime = Date.now();

      // 大量のトレンドデータ
      (mockHttpClient.get as any).mockImplementation((url: string) => {
        if (url.includes('/trends')) {
          return Promise.resolve({
            success: true,
            trends: Array.from({ length: 50 }, (_, i) => ({
              name: `#Trend${i}`,
              volume: Math.floor(Math.random() * 10000) + 1000
            }))
          });
        }
        return Promise.resolve({});
      });

      // 複数の並行処理
      const tasks = [
        trendsEndpoint.getTrends(),
        trendsEndpoint.getJapanTrends(),
        tweetSearchEndpoint.searchTweets('investment', { count: 100 }),
        userInfoEndpoint.searchUsers('educator'),
        followerInfoEndpoint.getFollowers('test_user', { count: 200 })
      ];

      (mockHttpClient.get as any).mockResolvedValue({
        success: true,
        data: Array.from({ length: 100 }, (_, i) => ({ id: i }))
      });

      const results = await Promise.all(tasks);
      const endTime = Date.now();

      expect(results.every(r => r.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 5秒以内
    });

    it('正常系: メモリ効率的な統合処理', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // 全エンドポイントのインスタンス作成と使用
      const allEndpoints = [
        userInfoEndpoint, tweetSearchEndpoint, trendsEndpoint, followerInfoEndpoint,
        tweetManagement, engagementManagement, followManagement
      ];

      // モックレスポンス設定
      (mockHttpClient.get as any).mockResolvedValue({ success: true, data: {} });
      (mockHttpClient.post as any).mockResolvedValue({ success: true, data: {} });

      // 各エンドポイントで複数回操作
      for (let i = 0; i < 10; i++) {
        await Promise.all([
          trendsEndpoint.getTrends(),
          userInfoEndpoint.getUserInfo('test_user'),
          tweetSearchEndpoint.searchTweets('test'),
          followManagement.checkFollowingStatus('test_user')
        ]);
      }

      // ガベージコレクション実行（可能な場合）
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB未満
    });
  });
});