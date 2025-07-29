/**
 * Read-Only Endpoints Index テスト - index.test.ts
 * REQUIREMENTS.md準拠 - 読み取り専用エンドポイントの統合エクスポートテスト
 */

import { describe, it, expect } from 'vitest';

describe('Read-Only Endpoints Index', () => {
  it('正常系: すべてのread-onlyエンドポイントクラスがエクスポートされている', async () => {
    const readOnlyModule = await import('../../../../src/kaito-api/endpoints/read-only/index');

    // UserInfoEndpointのエクスポート確認
    expect(readOnlyModule.UserInfoEndpoint).toBeDefined();
    expect(typeof readOnlyModule.UserInfoEndpoint).toBe('function');

    // TweetSearchEndpointのエクスポート確認
    expect(readOnlyModule.TweetSearchEndpoint).toBeDefined();
    expect(typeof readOnlyModule.TweetSearchEndpoint).toBe('function');

    // TrendsEndpointのエクスポート確認
    expect(readOnlyModule.TrendsEndpoint).toBeDefined();
    expect(typeof readOnlyModule.TrendsEndpoint).toBe('function');

    // FollowerInfoEndpointのエクスポート確認
    expect(readOnlyModule.FollowerInfoEndpoint).toBeDefined();
    expect(typeof readOnlyModule.FollowerInfoEndpoint).toBe('function');
  });

  it('正常系: エクスポートされたクラスがインスタンス化可能である', async () => {
    const readOnlyModule = await import('../../../../src/kaito-api/endpoints/read-only/index');
    
    // モックオブジェクト
    const mockHttpClient = {
      get: () => Promise.resolve({}),
      post: () => Promise.resolve({})
    };
    
    const mockAuthManager = {
      getAuthHeaders: () => ({ 'x-api-key': 'test' }),
      getUserSession: () => 'test-session'
    };

    // 各クラスがインスタンス化可能であることを確認
    expect(() => new readOnlyModule.UserInfoEndpoint(mockHttpClient as any, mockAuthManager as any)).not.toThrow();
    expect(() => new readOnlyModule.TweetSearchEndpoint(mockHttpClient as any, mockAuthManager as any)).not.toThrow();
    expect(() => new readOnlyModule.TrendsEndpoint(mockHttpClient as any, mockAuthManager as any)).not.toThrow();
    expect(() => new readOnlyModule.FollowerInfoEndpoint(mockHttpClient as any, mockAuthManager as any)).not.toThrow();
  });

  it('正常系: インスタンス化されたクラスが期待されるメソッドを持っている', async () => {
    const readOnlyModule = await import('../../../../src/kaito-api/endpoints/read-only/index');
    
    const mockHttpClient = {
      get: () => Promise.resolve({}),
      post: () => Promise.resolve({})
    };
    
    const mockAuthManager = {
      getAuthHeaders: () => ({ 'x-api-key': 'test' }),
      getUserSession: () => 'test-session'
    };

    // UserInfoEndpointのメソッド確認
    const userInfoEndpoint = new readOnlyModule.UserInfoEndpoint(mockHttpClient as any, mockAuthManager as any);
    expect(typeof userInfoEndpoint.getUserInfo).toBe('function');
    expect(typeof userInfoEndpoint.getUserFollowers).toBe('function');
    expect(typeof userInfoEndpoint.getUserFollowing).toBe('function');
    expect(typeof userInfoEndpoint.searchUsers).toBe('function');

    // TweetSearchEndpointのメソッド確認
    const tweetSearchEndpoint = new readOnlyModule.TweetSearchEndpoint(mockHttpClient as any, mockAuthManager as any);
    expect(typeof tweetSearchEndpoint.searchTweets).toBe('function');
    expect(typeof tweetSearchEndpoint.getTweetById).toBe('function');
    expect(typeof tweetSearchEndpoint.searchRecentTweets).toBe('function');
    expect(typeof tweetSearchEndpoint.searchPopularTweets).toBe('function');

    // TrendsEndpointのメソッド確認
    const trendsEndpoint = new readOnlyModule.TrendsEndpoint(mockHttpClient as any, mockAuthManager as any);
    expect(typeof trendsEndpoint.getTrends).toBe('function');
    expect(typeof trendsEndpoint.getWorldwideTrends).toBe('function');
    expect(typeof trendsEndpoint.getJapanTrends).toBe('function');
    expect(typeof trendsEndpoint.getTokyoTrends).toBe('function');
    expect(typeof trendsEndpoint.getUSTrends).toBe('function');
    expect(typeof trendsEndpoint.getAvailableLocations).toBe('function');
    expect(typeof trendsEndpoint.getWellKnownWOEIDs).toBe('function');
    expect(typeof trendsEndpoint.clearCache).toBe('function');

    // FollowerInfoEndpointのメソッド確認
    const followerInfoEndpoint = new readOnlyModule.FollowerInfoEndpoint(mockHttpClient as any, mockAuthManager as any);
    expect(typeof followerInfoEndpoint.getFollowers).toBe('function');
    expect(typeof followerInfoEndpoint.getFollowing).toBe('function');
    expect(typeof followerInfoEndpoint.getFriendship).toBe('function');
    expect(typeof followerInfoEndpoint.getFollowerIds).toBe('function');
  });

  it('正常系: モジュール構造の整合性が保たれている', async () => {
    const readOnlyModule = await import('../../../../src/kaito-api/endpoints/read-only/index');
    
    // エクスポートされているプロパティの数を確認
    const exportedKeys = Object.keys(readOnlyModule);
    const expectedClasses = ['UserInfoEndpoint', 'TweetSearchEndpoint', 'TrendsEndpoint', 'FollowerInfoEndpoint'];
    
    // 最低限必要なクラスがすべてエクスポートされていることを確認
    for (const expectedClass of expectedClasses) {
      expect(exportedKeys).toContain(expectedClass);
    }
    
    // 追加の予期しないエクスポートがないことを確認（types等を除く）
    const classExports = exportedKeys.filter(key => key.endsWith('Endpoint'));
    expect(classExports).toHaveLength(4);
  });

  it('正常系: TypeScript型情報が正しくエクスポートされている', async () => {
    // 動的インポートでの型チェック
    const readOnlyModule = await import('../../../../src/kaito-api/endpoints/read-only/index');
    
    // コンストラクタの型チェック（実行時）
    const UserInfoEndpoint = readOnlyModule.UserInfoEndpoint;
    const TweetSearchEndpoint = readOnlyModule.TweetSearchEndpoint;
    const TrendsEndpoint = readOnlyModule.TrendsEndpoint;
    const FollowerInfoEndpoint = readOnlyModule.FollowerInfoEndpoint;
    
    // プロトタイプチェーンの確認
    expect(UserInfoEndpoint.prototype).toBeDefined();
    expect(TweetSearchEndpoint.prototype).toBeDefined();
    expect(TrendsEndpoint.prototype).toBeDefined();
    expect(FollowerInfoEndpoint.prototype).toBeDefined();
    
    // コンストラクタ関数の確認
    expect(UserInfoEndpoint.prototype.constructor).toBe(UserInfoEndpoint);
    expect(TweetSearchEndpoint.prototype.constructor).toBe(TweetSearchEndpoint);
    expect(TrendsEndpoint.prototype.constructor).toBe(TrendsEndpoint);
    expect(FollowerInfoEndpoint.prototype.constructor).toBe(FollowerInfoEndpoint);
  });

  it('正常系: 投資教育コンテンツ特化機能の統合動作確認', async () => {
    const readOnlyModule = await import('../../../../src/kaito-api/endpoints/read-only/index');
    
    const mockHttpClient = {
      get: () => Promise.resolve({
        users: [],
        trends: [],
        statuses: [],
        data: { users: [], tweets: [] }
      }),
      post: () => Promise.resolve({})
    };
    
    const mockAuthManager = {
      getAuthHeaders: () => ({ 'x-api-key': 'test-investment-education-key' }),
      getUserSession: () => 'investment-educator-session'
    };

    // 投資教育関連のワークフロー模擬
    const userEndpoint = new readOnlyModule.UserInfoEndpoint(mockHttpClient as any, mockAuthManager as any);
    const tweetSearchEndpoint = new readOnlyModule.TweetSearchEndpoint(mockHttpClient as any, mockAuthManager as any);
    const trendsEndpoint = new readOnlyModule.TrendsEndpoint(mockHttpClient as any, mockAuthManager as any);
    const followerEndpoint = new readOnlyModule.FollowerInfoEndpoint(mockHttpClient as any, mockAuthManager as any);

    // すべてのエンドポイントが利用可能であることを確認
    expect(typeof userEndpoint.searchUsers).toBe('function');
    expect(typeof tweetSearchEndpoint.searchTweets).toBe('function');
    expect(typeof trendsEndpoint.getTrends).toBe('function');
    expect(typeof followerEndpoint.getFollowers).toBe('function');

    // インスタンスが正しく作成されていることを確認
    expect(userEndpoint).toBeInstanceOf(readOnlyModule.UserInfoEndpoint);
    expect(tweetSearchEndpoint).toBeInstanceOf(readOnlyModule.TweetSearchEndpoint);
    expect(trendsEndpoint).toBeInstanceOf(readOnlyModule.TrendsEndpoint);
    expect(followerEndpoint).toBeInstanceOf(readOnlyModule.FollowerInfoEndpoint);
  });

  it('正常系: パフォーマンス: モジュールロード時間が適切である', async () => {
    const startTime = Date.now();
    
    // モジュールの動的ロード
    const readOnlyModule = await import('../../../../src/kaito-api/endpoints/read-only/index');
    
    const loadTime = Date.now() - startTime;
    
    // モジュールロードが迅速であることを確認（100ms以内）
    expect(loadTime).toBeLessThan(100);
    
    // 必要なエクスポートが存在することを確認
    expect(readOnlyModule.UserInfoEndpoint).toBeDefined();
    expect(readOnlyModule.TweetSearchEndpoint).toBeDefined();
    expect(readOnlyModule.TrendsEndpoint).toBeDefined();
    expect(readOnlyModule.FollowerInfoEndpoint).toBeDefined();
  });

  it('正常系: メモリ使用量: インスタンス作成時のメモリリークがない', async () => {
    const readOnlyModule = await import('../../../../src/kaito-api/endpoints/read-only/index');
    
    const mockHttpClient = {
      get: () => Promise.resolve({}),
      post: () => Promise.resolve({})
    };
    
    const mockAuthManager = {
      getAuthHeaders: () => ({ 'x-api-key': 'test' }),
      getUserSession: () => 'test-session'
    };

    const initialMemory = process.memoryUsage().heapUsed;
    
    // 複数インスタンスの作成とガベージコレクション
    for (let i = 0; i < 10; i++) {
      const userEndpoint = new readOnlyModule.UserInfoEndpoint(mockHttpClient as any, mockAuthManager as any);
      const tweetEndpoint = new readOnlyModule.TweetSearchEndpoint(mockHttpClient as any, mockAuthManager as any);
      const trendsEndpoint = new readOnlyModule.TrendsEndpoint(mockHttpClient as any, mockAuthManager as any);
      const followerEndpoint = new readOnlyModule.FollowerInfoEndpoint(mockHttpClient as any, mockAuthManager as any);
      
      // 参照をクリア
      userEndpoint.clearCache?.();
      trendsEndpoint.clearCache?.();
    }
    
    // 強制的なガベージコレクション（利用可能な場合）
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // メモリ増加が許容範囲内であることを確認（1MB未満）
    expect(memoryIncrease).toBeLessThan(1024 * 1024);
  });
});