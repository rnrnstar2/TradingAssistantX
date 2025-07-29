/**
 * TweetSearchEndpoint テスト - tweet-search.test.ts
 * REQUIREMENTS.md準拠 - ツイート検索エンドポイントの包括的テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TweetSearchEndpoint } from '../../../../src/kaito-api/endpoints/read-only/tweet-search';
import type { HttpClient, TweetData, TweetSearchOptions } from '../../../../src/kaito-api/utils/types';
import { AuthManager } from '../../../../src/kaito-api/core/auth-manager';

describe('TweetSearchEndpoint', () => {
  let tweetSearchEndpoint: TweetSearchEndpoint;
  let mockHttpClient: Partial<HttpClient>;
  let mockAuthManager: Partial<AuthManager>;

  // テストデータ
  const mockTweetData: TweetData = {
    id: '1234567890123456789',
    text: 'Investment education: Understanding cryptocurrency market trends #crypto #education',
    createdAt: new Date('2024-01-15T10:30:00Z'),
    authorId: '987654321',
    authorUsername: 'invest_educator',
    authorDisplayName: 'Investment Educator',
    metrics: {
      retweetCount: 25,
      likeCount: 150,
      replyCount: 12,
      quoteCount: 8
    },
    publicMetrics: {
      retweetCount: 25,
      likeCount: 150,
      replyCount: 12,
      quoteCount: 8
    },
    isRetweet: false,
    isReply: false,
    isQuoteTweet: false,
    lang: 'en',
    source: 'Twitter Web App',
    entities: {
      hashtags: [
        { text: 'crypto', indices: [65, 72] },
        { text: 'education', indices: [73, 83] }
      ],
      mentions: [],
      urls: [],
      media: []
    }
  };

  const mockAPITweetResponse = {
    id_str: '1234567890123456789',
    full_text: 'Investment education: Understanding cryptocurrency market trends #crypto #education',
    created_at: 'Mon Jan 15 10:30:00 +0000 2024',
    user: {
      id_str: '987654321',
      screen_name: 'invest_educator',
      name: 'Investment Educator'
    },
    retweet_count: 25,
    favorite_count: 150,
    reply_count: 12,
    quote_count: 8,
    lang: 'en',
    source: 'Twitter Web App',
    entities: {
      hashtags: [
        { text: 'crypto', indices: [65, 72] },
        { text: 'education', indices: [73, 83] }
      ],
      user_mentions: [],
      urls: [],
      media: []
    }
  };

  const mockSearchResponse = {
    statuses: [mockAPITweetResponse],
    search_metadata: {
      completed_in: 0.05,
      count: 1,
      query: 'investment education',
      next_results: 'next_cursor_token'
    }
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

    tweetSearchEndpoint = new TweetSearchEndpoint(
      mockHttpClient as HttpClient,
      mockAuthManager as AuthManager
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('searchTweets', () => {
    it('正常系: 投資教育関連ツイートを正確に検索できる', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockSearchResponse);

      const result = await tweetSearchEndpoint.searchTweets('investment education');

      expect(result.success).toBe(true);
      expect(result.data.tweets).toHaveLength(1);
      expect(result.data.tweets[0]).toEqual(mockTweetData);
      expect(result.data.searchMetadata.query).toBe('investment education');
      expect(result.data.searchMetadata.executedAt).toBeInstanceOf(Date);
      expect(result.pagination?.hasMore).toBe(true);
      expect(result.pagination?.nextCursor).toBe('next_cursor_token');
    });

    it('正常系: 高度検索オプションを正しく処理する', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockSearchResponse);

      const options = {
        maxResults: 50,
        lang: 'en',
        locale: 'en_US',
        geocode: '35.6762,139.6503,100km',
        since: '2024-01-01',
        until: '2024-01-31',
        includeEntities: true,
        tweetMode: 'extended' as const
      };

      await tweetSearchEndpoint.searchTweets('crypto market', options);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweet/advanced_search',
        expect.objectContaining({
          q: 'crypto market',
          count: 50,
          lang: 'en',
          locale: 'en_US',
          geocode: '35.6762,139.6503,100km',
          since: '2024-01-01',
          until: '2024-01-31',
          include_entities: true,
          tweet_mode: 'extended',
          headers: { 'x-api-key': 'test-api-key' }
        })
      );
    });

    it('境界値: maxResults上限値(100)を超えても制限される', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockSearchResponse);

      await tweetSearchEndpoint.searchTweets('test', { maxResults: 200 });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweet/advanced_search',
        expect.objectContaining({ count: 100 })
      );
    });

    it('異常系: 空の検索クエリでエラーが発生する', async () => {
      await expect(tweetSearchEndpoint.searchTweets('')).rejects.toThrow('Invalid search query');
    });

    it('異常系: 長すぎる検索クエリでエラーが発生する', async () => {
      const longQuery = 'a'.repeat(501);
      await expect(tweetSearchEndpoint.searchTweets(longQuery)).rejects.toThrow('Invalid search query');
    });

    it('異常系: 無効な検索オプションでエラーが発生する', async () => {
      const invalidOptions = {
        count: 0, // 最小値未満
        lang: 'invalid', // 無効な言語コード
        geocode: 'invalid_format' // 無効なgeocode形式
      };

      await expect(tweetSearchEndpoint.searchTweets('test', invalidOptions)).rejects.toThrow('Invalid search options');
    });

    it('異常系: APIキー認証エラー(401)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 401, message: 'Unauthorized' });

      await expect(tweetSearchEndpoint.searchTweets('test')).rejects.toThrow('Invalid API key');
    });

    it('異常系: レート制限エラー(429)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 429, message: 'Rate limit exceeded' });

      await expect(tweetSearchEndpoint.searchTweets('test')).rejects.toThrow('Rate limit exceeded');
    });

    it('エッジケース: 空の検索結果でも適切に処理する', async () => {
      const emptyResponse = {
        statuses: [],
        search_metadata: { completed_in: 0.01, count: 0, query: 'nonexistentquery' }
      };
      (mockHttpClient.get as any).mockResolvedValue(emptyResponse);

      const result = await tweetSearchEndpoint.searchTweets('nonexistentquery');

      expect(result.success).toBe(true);
      expect(result.data.tweets).toHaveLength(0);
      expect(result.data.totalCount).toBe(0);
    });

    it('エッジケース: 部分的なAPIレスポンスデータでも正常に処理する', async () => {
      const partialResponse = {
        statuses: [{
          id_str: '123',
          text: 'partial tweet',
          created_at: 'Mon Jan 15 10:30:00 +0000 2024'
        }],
        search_metadata: { query: 'test' }
      };
      (mockHttpClient.get as any).mockResolvedValue(partialResponse);

      const result = await tweetSearchEndpoint.searchTweets('test');

      expect(result.success).toBe(true);
      expect(result.data.tweets[0].id).toBe('123');
      expect(result.data.tweets[0].authorId).toBeUndefined();
      expect(result.data.tweets[0].metrics.retweetCount).toBe(0);
    });
  });

  describe('getTweetById', () => {
    it('正常系: 特定のツイートIDでツイート情報を取得できる', async () => {
      (mockHttpClient.get as any).mockResolvedValue({
        ...mockAPITweetResponse,
        rateLimit: { remaining: 899, resetTime: Date.now() + 3600000 }
      });

      const result = await tweetSearchEndpoint.getTweetById('1234567890123456789');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTweetData);
      expect(result.rateLimit).toBeDefined();
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweet/info',
        { id: '1234567890123456789', tweet_mode: 'extended', headers: { 'x-api-key': 'test-api-key' } }
      );
    });

    it('異常系: 無効なツイートID形式でエラーが発生する', async () => {
      await expect(tweetSearchEndpoint.getTweetById('')).rejects.toThrow('Invalid tweetId');
      await expect(tweetSearchEndpoint.getTweetById('invalid_id')).rejects.toThrow('Invalid tweetId');
      await expect(tweetSearchEndpoint.getTweetById('12345abc')).rejects.toThrow('Invalid tweetId');
    });

    it('異常系: ツイート見つからないエラー(404)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 404, message: 'Not found' });

      await expect(tweetSearchEndpoint.getTweetById('9999999999999999999')).rejects.toThrow('Tweet not found');
    });

    it('異常系: 無効なパラメータエラー(422)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 422, message: 'Invalid parameters' });

      await expect(tweetSearchEndpoint.getTweetById('1234567890123456789')).rejects.toThrow('Invalid search parameters');
    });
  });

  describe('searchRecentTweets', () => {
    it('正常系: 最新ツイートを検索できる', async () => {
      const recentResponse = {
        statuses: [mockAPITweetResponse],
        search_metadata: { query: 'bitcoin news' }
      };
      (mockHttpClient.get as any).mockResolvedValue(recentResponse);

      const result = await tweetSearchEndpoint.searchRecentTweets('bitcoin news');

      expect(result.success).toBe(true);
      expect(result.data.tweets).toHaveLength(1);
      expect(result.data.searchMetadata.resultType).toBe('recent');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweet/search',
        expect.objectContaining({
          q: 'bitcoin news',
          result_type: 'recent',
          count: 15,
          headers: { 'x-api-key': 'test-api-key' }
        })
      );
    });

    it('正常系: カウントと言語オプションを正しく処理する', async () => {
      (mockHttpClient.get as any).mockResolvedValue({ statuses: [], search_metadata: {} });

      await tweetSearchEndpoint.searchRecentTweets('test', { count: 50, lang: 'ja' });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweet/search',
        expect.objectContaining({
          count: 50,
          lang: 'ja'
        })
      );
    });

    it('境界値: count上限値(100)を超えても制限される', async () => {
      (mockHttpClient.get as any).mockResolvedValue({ statuses: [], search_metadata: {} });

      await tweetSearchEndpoint.searchRecentTweets('test', { count: 150 });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweet/search',
        expect.objectContaining({ count: 100 })
      );
    });

    it('異常系: 無効な検索クエリでエラーが発生する', async () => {
      await expect(tweetSearchEndpoint.searchRecentTweets('')).rejects.toThrow('Invalid search query');
    });
  });

  describe('searchPopularTweets', () => {
    it('正常系: 人気ツイートを検索できる', async () => {
      const popularResponse = {
        statuses: [mockAPITweetResponse],
        search_metadata: { query: 'trading strategy' }
      };
      (mockHttpClient.get as any).mockResolvedValue(popularResponse);

      const result = await tweetSearchEndpoint.searchPopularTweets('trading strategy');

      expect(result.success).toBe(true);
      expect(result.data.tweets).toHaveLength(1);
      expect(result.data.searchMetadata.resultType).toBe('popular');
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweet/search/popular',
        expect.objectContaining({
          q: 'trading strategy',
          result_type: 'popular',
          count: 15
        }),
        { headers: { 'x-api-key': 'test-api-key' } }
      );
    });

    it('正常系: 検索オプションを正しく処理する', async () => {
      (mockHttpClient.get as any).mockResolvedValue({ statuses: [], search_metadata: {} });

      await tweetSearchEndpoint.searchPopularTweets('finance', { count: 25, lang: 'en' });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweet/search/popular',
        expect.objectContaining({
          count: 25,
          lang: 'en'
        }),
        expect.any(Object)
      );
    });

    it('異常系: 無効な検索クエリでエラーが発生する', async () => {
      await expect(tweetSearchEndpoint.searchPopularTweets('')).rejects.toThrow('Invalid search query');
    });
  });

  describe('投資教育コンテンツ特化テスト', () => {
    it('正常系: 投資関連ハッシュタグを含むツイートを適切に検索する', async () => {
      const investmentResponse = {
        statuses: [
          {
            ...mockAPITweetResponse,
            full_text: 'Learn about portfolio diversification #investing #finance #education',
            entities: {
              hashtags: [
                { text: 'investing', indices: [35, 45] },
                { text: 'finance', indices: [46, 54] },
                { text: 'education', indices: [55, 65] }
              ]
            }
          }
        ],
        search_metadata: { query: '#investing #education', count: 1 }
      };
      (mockHttpClient.get as any).mockResolvedValue(investmentResponse);

      const result = await tweetSearchEndpoint.searchTweets('#investing #education');

      expect(result.success).toBe(true);
      expect(result.data.tweets[0].entities.hashtags).toHaveLength(3);
      expect(result.data.tweets[0].entities.hashtags.map(h => h.text)).toContain('investing');
      expect(result.data.tweets[0].entities.hashtags.map(h => h.text)).toContain('education');
    });

    it('正常系: 高品質な教育コンテンツをフィルタリングする', async () => {
      const highQualityResponse = {
        statuses: [
          {
            ...mockAPITweetResponse,
            favorite_count: 500, // 高いエンゲージメント
            retweet_count: 200,
            user: {
              ...mockAPITweetResponse.user,
              verified: true, // 認証済みアカウント
              followers_count: 50000
            }
          }
        ],
        search_metadata: { query: 'financial literacy', count: 1 }
      };
      (mockHttpClient.get as any).mockResolvedValue(highQualityResponse);

      const result = await tweetSearchEndpoint.searchTweets('financial literacy');

      expect(result.success).toBe(true);
      expect(result.data.tweets[0].metrics.likeCount).toBe(500);
      expect(result.data.tweets[0].metrics.retweetCount).toBe(200);
    });

    it('正常系: 地域別投資情報検索が機能する', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockSearchResponse);

      const options = {
        geocode: '35.6762,139.6503,50km', // 東京周辺
        lang: 'ja'
      };

      await tweetSearchEndpoint.searchTweets('株式投資', options);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/tweet/advanced_search',
        expect.objectContaining({
          geocode: '35.6762,139.6503,50km',
          lang: 'ja'
        })
      );
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量検索結果の正規化処理時間が適切である', async () => {
      const largeTweetResponse = {
        statuses: Array(100).fill(mockAPITweetResponse),
        search_metadata: { query: 'test', count: 100 }
      };
      (mockHttpClient.get as any).mockResolvedValue(largeTweetResponse);

      const startTime = Date.now();
      const result = await tweetSearchEndpoint.searchTweets('test');
      const endTime = Date.now();

      expect(result.data.tweets).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(2000); // 2秒以内
    });

    it('連続API呼び出し時のメモリリークがない', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockSearchResponse);

      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 20; i++) {
        await tweetSearchEndpoint.searchTweets(`test query ${i}`);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // 20MB未満
    });
  });

  describe('エラーハンドリング強化テスト', () => {
    it('異常系: ネットワークエラーを適切に处理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue(new Error('Network error'));

      await expect(tweetSearchEndpoint.searchTweets('test')).rejects.toThrow('API error in searchTweets: Network error');
    });

    it('異常系: タイムアウトエラーを適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 408, message: 'Request timeout' });

      await expect(tweetSearchEndpoint.searchTweets('test')).rejects.toThrow('API error in searchTweets: Request timeout');
    });

    it('異常系: サーバーエラー(500)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 500, message: 'Internal server error' });

      await expect(tweetSearchEndpoint.searchTweets('test')).rejects.toThrow('API error in searchTweets: Internal server error');
    });
  });
});