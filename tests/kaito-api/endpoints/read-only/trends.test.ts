/**
 * TrendsEndpoint テスト - trends.test.ts
 * REQUIREMENTS.md準拠 - トレンド取得エンドポイントの包括的テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrendsEndpoint } from '../../../../src/kaito-api/endpoints/read-only/trends';
import type { HttpClient, TrendData, TrendLocation } from '../../../../src/kaito-api/utils/types';
import { AuthManager } from '../../../../src/kaito-api/core/auth-manager';

describe('TrendsEndpoint', () => {
  let trendsEndpoint: TrendsEndpoint;
  let mockHttpClient: Partial<HttpClient>;
  let mockAuthManager: Partial<AuthManager>;

  // テストデータ
  const mockTrendData: TrendData = {
    name: '#投資教育',
    url: 'https://twitter.com/search?q=%23%E6%8A%95%E8%B3%87%E6%95%99%E8%82%B2',
    promotedContent: null,
    query: '#投資教育',
    tweet_volume: 15000,
    rank: 1,
    category: 'hashtag',
    woeid: 23424856
  };

  const mockLocationData: TrendLocation = {
    name: 'Japan',
    woeid: 23424856,
    country: 'Japan',
    countryCode: 'JP',
    parentid: 1
  };

  const mockTrendsAPIResponse = {
    trends: [
      {
        name: '#投資教育',
        url: 'https://twitter.com/search?q=%23%E6%8A%95%E8%B3%87%E6%95%99%E8%82%B2',
        promoted_content: null,
        query: '#投資教育',
        tweet_volume: 15000
      },
      {
        name: '仮想通貨',
        url: 'https://twitter.com/search?q=%E4%BB%AE%E6%83%B3%E9%80%9A%E8%B2%A8',
        promoted_content: null,
        query: '仮想通貨',
        tweet_volume: 8500
      }
    ],
    locations: [
      {
        name: 'Japan',
        woeid: 23424856,
        country: 'Japan',
        countryCode: 'JP',
        parentid: 1
      }
    ],
    as_of: '2024-01-15T10:00:00Z',
    created_at: '2024-01-15T10:00:00Z'
  };

  const mockLocationsAPIResponse = [
    {
      name: 'Worldwide',
      woeid: 1,
      country: '',
      countryCode: '',
      parentid: 0
    },
    {
      name: 'Japan',
      woeid: 23424856,
      country: 'Japan',
      countryCode: 'JP',
      parentid: 1
    },
    {
      name: 'Tokyo',
      woeid: 1118370,
      country: 'Japan',
      countryCode: 'JP',
      parentid: 23424856
    }
  ];

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

    trendsEndpoint = new TrendsEndpoint(
      mockHttpClient as HttpClient,
      mockAuthManager as AuthManager
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    // キャッシュクリア
    trendsEndpoint.clearCache();
  });

  describe('getTrends', () => {
    it('正常系: 地域別トレンドを取得できる', async () => {
      (mockHttpClient.get as any).mockResolvedValue({
        ...mockTrendsAPIResponse,
        rateLimit: { remaining: 74, resetTime: Date.now() + 3600000 }
      });

      const result = await trendsEndpoint.getTrends(23424856); // Japan

      expect(result.success).toBe(true);
      expect(result.data.trends).toHaveLength(2);
      expect(result.data.trends[0].name).toBe('#投資教育');
      expect(result.data.trends[0].category).toBe('hashtag');
      expect(result.data.location.name).toBe('Japan');
      expect(result.data.asOf).toBeInstanceOf(Date);
      expect(result.data.createdAt).toBeInstanceOf(Date);
      expect(result.rateLimit).toBeDefined();
    });

    it('正常系: デフォルトで世界のトレンドを取得する', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockTrendsAPIResponse);

      await trendsEndpoint.getTrends();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/trends/place',
        { id: 1, headers: { 'x-api-key': 'test-api-key' } }
      );
    });

    it('正常系: キャッシュ機能が正常に動作する', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockTrendsAPIResponse);

      // 1回目の呼び出し
      const result1 = await trendsEndpoint.getTrends(23424856);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);

      // 2回目の呼び出し（キャッシュから取得）
      const result2 = await trendsEndpoint.getTrends(23424856);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1); // API呼び出しは1回のまま

      expect(result1.data.trends).toEqual(result2.data.trends);
    });

    it('異常系: 無効なWOEIDでエラーが発生する', async () => {
      await expect(trendsEndpoint.getTrends(-1)).rejects.toThrow('Invalid WOEID');
      await expect(trendsEndpoint.getTrends(0)).rejects.toThrow('Invalid WOEID');
      await expect(trendsEndpoint.getTrends(100000000)).rejects.toThrow('Invalid WOEID');
    });

    it('異常系: WOEID型が不正でエラーが発生する', async () => {
      await expect(trendsEndpoint.getTrends('invalid' as any)).rejects.toThrow('Invalid WOEID');
      await expect(trendsEndpoint.getTrends(1.5)).rejects.toThrow('Invalid WOEID');
      await expect(trendsEndpoint.getTrends(NaN)).rejects.toThrow('Invalid WOEID');
    });

    it('異常系: APIキー認証エラー(401)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 401, message: 'Unauthorized' });

      await expect(trendsEndpoint.getTrends(1)).rejects.toThrow('Invalid API key');
    });

    it('異常系: レート制限エラー(429)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 429, message: 'Rate limit exceeded' });

      await expect(trendsEndpoint.getTrends(1)).rejects.toThrow('Rate limit exceeded');
    });

    it('異常系: 地域見つからないエラー(404)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 404, message: 'Not found' });

      await expect(trendsEndpoint.getTrends(99999999)).rejects.toThrow('Location not found');
    });

    it('異常系: 無効なパラメータエラー(400)を適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 400, message: 'Bad request' });

      await expect(trendsEndpoint.getTrends(1)).rejects.toThrow('Invalid WOEID or location parameter');
    });

    it('エッジケース: 空のトレンドレスポンスでも適切に処理する', async () => {
      const emptyResponse = {
        trends: [],
        locations: [mockLocationData],
        as_of: '2024-01-15T10:00:00Z',
        created_at: '2024-01-15T10:00:00Z'
      };
      (mockHttpClient.get as any).mockResolvedValue(emptyResponse);

      const result = await trendsEndpoint.getTrends(1);

      expect(result.success).toBe(true);
      expect(result.data.trends).toHaveLength(0);
    });

    it('エッジケース: 配列でないレスポンス形式でも適切に処理する', async () => {
      const singleResponse = mockTrendsAPIResponse;
      (mockHttpClient.get as any).mockResolvedValue(singleResponse);

      const result = await trendsEndpoint.getTrends(1);

      expect(result.success).toBe(true);
      expect(result.data.trends).toHaveLength(2);
    });
  });

  describe('地域別ショートカットメソッド', () => {
    beforeEach(() => {
      (mockHttpClient.get as any).mockResolvedValue(mockTrendsAPIResponse);
    });

    it('正常系: getWorldwideTrends()でWOEID 1を使用する', async () => {
      await trendsEndpoint.getWorldwideTrends();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/trends/place',
        { id: 1, headers: { 'x-api-key': 'test-api-key' } }
      );
    });

    it('正常系: getJapanTrends()でWOEID 23424856を使用する', async () => {
      await trendsEndpoint.getJapanTrends();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/trends/place',
        { id: 23424856, headers: { 'x-api-key': 'test-api-key' } }
      );
    });

    it('正常系: getTokyoTrends()でWOEID 1118370を使用する', async () => {
      await trendsEndpoint.getTokyoTrends();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/trends/place',
        { id: 1118370, headers: { 'x-api-key': 'test-api-key' } }
      );
    });

    it('正常系: getUSTrends()でWOEID 23424977を使用する', async () => {
      await trendsEndpoint.getUSTrends();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/trends/place',
        { id: 23424977, headers: { 'x-api-key': 'test-api-key' } }
      );
    });
  });

  describe('getAvailableLocations', () => {
    it('正常系: 利用可能な地域一覧を取得できる', async () => {
      (mockHttpClient.get as any).mockResolvedValue({
        ...mockLocationsAPIResponse,
        rateLimit: { remaining: 74, resetTime: Date.now() + 3600000 }
      });

      const result = await trendsEndpoint.getAvailableLocations();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data[0].name).toBe('Worldwide');
      expect(result.data[0].woeid).toBe(1);
      expect(result.data[1].name).toBe('Japan');
      expect(result.data[1].woeid).toBe(23424856);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/twitter/trends/available',
        { headers: { 'x-api-key': 'test-api-key' } }
      );
    });

    it('正常系: 地域一覧キャッシュが正常に動作する', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockLocationsAPIResponse);

      // 1回目の呼び出し
      const result1 = await trendsEndpoint.getAvailableLocations();
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);

      // 2回目の呼び出し（キャッシュから取得）
      const result2 = await trendsEndpoint.getAvailableLocations();
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1); // API呼び出しは1回のまま

      expect(result1.data).toEqual(result2.data);
    });

    it('異常系: APIエラーを適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 500, message: 'Internal server error' });

      await expect(trendsEndpoint.getAvailableLocations()).rejects.toThrow('API error in getAvailableLocations');
    });

    it('エッジケース: 空の地域配列でも適切に処理する', async () => {
      (mockHttpClient.get as any).mockResolvedValue([]);

      const result = await trendsEndpoint.getAvailableLocations();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getWellKnownWOEIDs', () => {
    it('正常系: 主要地域のWOEID一覧を取得できる', () => {
      const woeids = trendsEndpoint.getWellKnownWOEIDs();

      expect(woeids).toHaveProperty('worldwide', 1);
      expect(woeids).toHaveProperty('japan', 23424856);
      expect(woeids).toHaveProperty('tokyo', 1118370);
      expect(woeids).toHaveProperty('unitedStates', 23424977);
      expect(woeids).toHaveProperty('newYork', 2459115);
      expect(woeids).toHaveProperty('london', 44418);
    });

    it('正常系: オブジェクトの独立性が保たれる', () => {
      const woeids1 = trendsEndpoint.getWellKnownWOEIDs();
      const woeids2 = trendsEndpoint.getWellKnownWOEIDs();

      woeids1.custom = 999999;
      expect(woeids2).not.toHaveProperty('custom');
    });
  });

  describe('clearCache', () => {
    it('正常系: キャッシュが正常にクリアされる', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockTrendsAPIResponse);

      // キャッシュにデータを保存
      await trendsEndpoint.getTrends(1);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);

      // 2回目はキャッシュから取得
      await trendsEndpoint.getTrends(1);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);

      // キャッシュクリア
      trendsEndpoint.clearCache();

      // 3回目はAPIから再取得
      await trendsEndpoint.getTrends(1);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('正常系: 地域一覧キャッシュもクリアされる', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockLocationsAPIResponse);

      // キャッシュにデータを保存
      await trendsEndpoint.getAvailableLocations();
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);

      // キャッシュクリア
      trendsEndpoint.clearCache();

      // 再取得でAPIが呼ばれる
      await trendsEndpoint.getAvailableLocations();
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('投資教育コンテンツ特化テスト', () => {
    it('正常系: 投資関連トレンドを適切に分類する', async () => {
      const investmentTrendsResponse = {
        trends: [
          { name: '#投資教育', query: '#投資教育', tweet_volume: 15000 },
          { name: '株式投資', query: '株式投資', tweet_volume: 8000 },
          { name: 'Bitcoin', query: 'Bitcoin', tweet_volume: 25000 },
          { name: '#資産運用', query: '#資産運用', tweet_volume: 5000 },
          { name: 'FX取引', query: 'FX取引', tweet_volume: 3000 }
        ],
        locations: [mockLocationData],
        as_of: '2024-01-15T10:00:00Z',
        created_at: '2024-01-15T10:00:00Z'
      };
      (mockHttpClient.get as any).mockResolvedValue(investmentTrendsResponse);

      const result = await trendsEndpoint.getTrends(23424856);

      expect(result.success).toBe(true);
      expect(result.data.trends).toHaveLength(5);
      
      // ハッシュタグ分類の確認
      const hashtagTrends = result.data.trends.filter(t => t.category === 'hashtag');
      expect(hashtagTrends).toHaveLength(2);
      expect(hashtagTrends.map(t => t.name)).toContain('#投資教育');
      expect(hashtagTrends.map(t => t.name)).toContain('#資産運用');
    });

    it('正常系: 日本の投資教育トレンドを正確に取得する', async () => {
      const japanInvestmentResponse = {
        trends: [
          { name: '投資信託', query: '投資信託', tweet_volume: 12000 },
          { name: 'NISA', query: 'NISA', tweet_volume: 18000 },
          { name: 'つみたてNISA', query: 'つみたてNISA', tweet_volume: 15000 }
        ],
        locations: [{ name: 'Japan', woeid: 23424856, country: 'Japan', countryCode: 'JP' }],
        as_of: '2024-01-15T10:00:00Z',
        created_at: '2024-01-15T10:00:00Z'
      };
      (mockHttpClient.get as any).mockResolvedValue(japanInvestmentResponse);

      const result = await trendsEndpoint.getJapanTrends();

      expect(result.success).toBe(true);
      expect(result.data.location.name).toBe('Japan');
      expect(result.data.trends.map(t => t.name)).toContain('NISA');
      expect(result.data.trends.map(t => t.name)).toContain('つみたてNISA');
    });

    it('正常系: トレンドランキングが正しく付与される', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockTrendsAPIResponse);

      const result = await trendsEndpoint.getTrends(1);

      expect(result.data.trends[0].rank).toBe(1);
      expect(result.data.trends[1].rank).toBe(2);
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量トレンドデータの正規化処理時間が適切である', async () => {
      const largeTrendsResponse = {
        trends: Array(50).fill({
          name: 'Test Trend',
          query: 'Test Trend',
          tweet_volume: 1000
        }),
        locations: [mockLocationData],
        as_of: '2024-01-15T10:00:00Z',
        created_at: '2024-01-15T10:00:00Z'
      };
      (mockHttpClient.get as any).mockResolvedValue(largeTrendsResponse);

      const startTime = Date.now();
      const result = await trendsEndpoint.getTrends(1);
      const endTime = Date.now();

      expect(result.data.trends).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
    });

    it('キャッシュのメモリ使用量が適切である', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockTrendsAPIResponse);

      const initialMemory = process.memoryUsage().heapUsed;
      
      // 複数の地域のトレンドを取得してキャッシュに保存
      for (let i = 1; i <= 20; i++) {
        await trendsEndpoint.getTrends(i);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // 5MB未満
    });

    it('キャッシュサイズ制限が正常に動作する', async () => {
      (mockHttpClient.get as any).mockResolvedValue(mockTrendsAPIResponse);

      // キャッシュ制限（50）を超える数のトレンドを取得
      for (let i = 1; i <= 60; i++) {
        await trendsEndpoint.getTrends(i);
      }

      // 最初の方のWOEIDはキャッシュから削除されているはず
      await trendsEndpoint.getTrends(1);
      
      // API呼び出しが再度発生することを確認
      expect(mockHttpClient.get).toHaveBeenCalledTimes(61);
    });
  });

  describe('エラーハンドリング強化テスト', () => {
    it('異常系: ネットワークエラーを適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue(new Error('Network error'));

      await expect(trendsEndpoint.getTrends(1)).rejects.toThrow('API error in getTrends: Network error');
    });

    it('異常系: タイムアウトエラーを適切に処理する', async () => {
      (mockHttpClient.get as any).mockRejectedValue({ status: 408, message: 'Request timeout' });

      await expect(trendsEndpoint.getTrends(1)).rejects.toThrow('API error in getTrends: Request timeout');
    });

    it('異常系: 不正なJSONレスポンスを適切に処理する', async () => {
      (mockHttpClient.get as any).mockResolvedValue('invalid json');

      // normalizeTrendsDataで適切にエラーハンドリングされることを確認
      const result = await trendsEndpoint.getTrends(1);
      expect(result.data.trends).toHaveLength(0);
    });
  });
});