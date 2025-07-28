# TASK-004: テストスイート包括的改善

## 🎯 タスク概要

tests/kaito-api/配下の全テストファイルを最新の実装に合わせて更新し、TwitterAPI.io仕様に基づく包括的なテスト環境を構築する。

## 📋 実装要件

### 1. 対象テストファイル

**主要テストファイル**:
- `tests/kaito-api/core/client.test.ts`
- `tests/kaito-api/endpoints/action-endpoints.test.ts`
- `tests/kaito-api/endpoints/tweet-endpoints.test.ts`
- `tests/kaito-api/endpoints/user-endpoints.test.ts`
- `tests/kaito-api/types.test.ts`
- `tests/kaito-api/integration/full-stack-integration.test.ts`

### 2. TwitterAPI.io準拠テスト設計

**重要テスト観点**:
- **API仕様準拠**: 公式仕様書に基づく正確な動作検証
- **レート制限**: 200 QPS制限の正確な制御テスト
- **エラーハンドリング**: 各種エラー状況での適切な処理
- **認証フロー**: Bearer Token + User Session の2層認証
- **コスト追跡**: $0.15/1k tweets の正確な計算

## 🔧 具体的な実装内容

### Phase 1: コアクライアントテスト改善

**ファイル**: `tests/kaito-api/core/client.test.ts`

```typescript
describe('KaitoTwitterAPIClient', () => {
  let client: KaitoTwitterAPIClient;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn()
    };

    client = new KaitoTwitterAPIClient({
      apiKey: 'test-api-key',
      qpsLimit: 200,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000
      },
      costTracking: true
    });

    // HttpClientのモック注入
    (client as any).httpClient = mockHttpClient;
  });

  describe('QPS制御', () => {
    it('200 QPS制限を正確に遵守する', async () => {
      const startTime = Date.now();
      const requestPromises: Promise<any>[] = [];

      // 200リクエストを同時実行
      for (let i = 0; i < 200; i++) {
        requestPromises.push(client.testConnection());
      }

      await Promise.all(requestPromises);
      const elapsed = Date.now() - startTime;

      // 1秒以上かかることを確認（QPS制御が動作）
      expect(elapsed).toBeGreaterThanOrEqual(950);
      expect(elapsed).toBeLessThan(2000); // 過度に遅くない
    });

    it('QPS制限違反時に適切に待機する', async () => {
      // モック設定
      mockHttpClient.get.mockResolvedValue({ status: 'ok' });

      const qpsController = (client as any).qpsController;
      const spy = jest.spyOn(qpsController, 'enforceQPS');

      await client.testConnection();
      await client.testConnection();

      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('エラーハンドリング', () => {
    it('レート制限エラー(429)を適切に処理する', async () => {
      mockHttpClient.post.mockRejectedValue({
        response: { status: 429 },
        message: 'Rate limit exceeded'
      });

      const result = await client.post('Test tweet');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('認証エラー(401)を適切に処理する', async () => {
      mockHttpClient.post.mockRejectedValue({
        response: { status: 401 },
        message: 'Authentication failed'
      });

      const result = await client.post('Test tweet');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication failed');
    });

    it('指数バックオフリトライが正常動作する', async () => {
      let callCount = 0;
      mockHttpClient.post.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary error');
        }
        return Promise.resolve({
          data: { id: '123', text: 'Test', created_at: new Date().toISOString() }
        });
      });

      const result = await client.post('Test tweet');

      expect(result.success).toBe(true);
      expect(callCount).toBe(3);
    });
  });

  describe('コスト追跡', () => {
    it('ツイート処理数を正確に追跡する', async () => {
      mockHttpClient.post.mockResolvedValue({
        data: { id: '123', text: 'Test', created_at: new Date().toISOString() }
      });

      await client.post('Tweet 1');
      await client.post('Tweet 2');
      await client.post('Tweet 3');

      const costInfo = client.getCostTrackingInfo();
      expect(costInfo.tweetsProcessed).toBe(3);
      expect(costInfo.estimatedCost).toBeCloseTo(0.00045, 5); // 3/1000 * 0.15
    });

    it('予算上限に達した場合に警告を発する', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // コスト追跡を強制的に高額に設定
      const costTracker = (client as any).costTracking;
      costTracker.tweetsProcessed = 60000; // $9相当

      await client.post('Test tweet');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('予算警告')
      );

      consoleSpy.mockRestore();
    });
  });
});
```

### Phase 2: エンドポイントテスト改善

**ファイル**: `tests/kaito-api/endpoints/action-endpoints.test.ts`

```typescript
describe('ActionEndpoints', () => {
  let actionEndpoints: ActionEndpoints;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn()
    };

    actionEndpoints = new ActionEndpoints(mockHttpClient);
  });

  describe('createPost', () => {
    it('正常なツイート作成ができる', async () => {
      const mockResponse = {
        data: {
          id: '1234567890',
          text: 'Test tweet content',
          created_at: '2023-01-01T00:00:00.000Z',
          author_id: '123456789'
        }
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const result = await actionEndpoints.createPost({
        content: 'Test tweet content'
      });

      expect(result.success).toBe(true);
      expect(result.tweetId).toBe('1234567890');
      expect(result.createdAt).toBe('2023-01-01T00:00:00.000Z');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/tweets', {
        text: 'Test tweet content'
      });
    });

    it('空のコンテンツでバリデーションエラーが発生する', async () => {
      const result = await actionEndpoints.createPost({
        content: ''
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Content cannot be empty');
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('280文字制限を超える場合にバリデーションエラーが発生する', async () => {
      const longContent = 'a'.repeat(281);

      const result = await actionEndpoints.createPost({
        content: longContent
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds 280 character limit');
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('韓国語が含まれる場合にバリデーションエラーが発生する', async () => {
      const result = await actionEndpoints.createPost({
        content: 'Test tweet with 한국어'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('prohibited characters');
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('メディアIDsが4つを超える場合にバリデーションエラーが発生する', async () => {
      const result = await actionEndpoints.createPost({
        content: 'Test tweet',
        mediaIds: ['1', '2', '3', '4', '5']
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum 4 media items allowed');
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });
  });

  describe('performEngagement', () => {
    it('いいね操作が正常に実行される', async () => {
      mockHttpClient.post.mockResolvedValue({ data: { liked: true } });

      const result = await actionEndpoints.performEngagement({
        tweetId: '1234567890',
        action: 'like'
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('like');
      expect(result.tweetId).toBe('1234567890');
      expect(result.data.liked).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/tweets/1234567890/like');
    });

    it('リツイート操作が正常に実行される', async () => {
      mockHttpClient.post.mockResolvedValue({ data: { retweeted: true } });

      const result = await actionEndpoints.performEngagement({
        tweetId: '1234567890',
        action: 'retweet'
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('retweet');
      expect(result.data.retweeted).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/tweets/1234567890/retweet');
    });

    it('サポートされていないアクションでエラーが発生する', async () => {
      await expect(
        actionEndpoints.performEngagement({
          tweetId: '1234567890',
          action: 'bookmark' as any
        })
      ).rejects.toThrow('Unsupported action: bookmark');
    });
  });
});
```

### Phase 3: 統合テスト改善

**ファイル**: `tests/kaito-api/integration/full-stack-integration.test.ts`

```typescript
describe('Kaito API 統合テスト', () => {
  let client: KaitoTwitterAPIClient;

  beforeAll(() => {
    // テスト環境設定
    process.env.NODE_ENV = 'test';
    process.env.KAITO_API_TOKEN = 'test-token';
  });

  beforeEach(() => {
    client = new KaitoTwitterAPIClient({
      apiKey: 'test-api-key',
      qpsLimit: 10, // テスト用に低く設定
      retryPolicy: {
        maxRetries: 2,
        backoffMs: 100
      }
    });
  });

  describe('エンドツーエンドフロー', () => {
    it('投稿→いいね→リツイートの一連のフローが正常動作する', async () => {
      // 投稿作成
      const postResult = await client.post('Integration test tweet');
      expect(postResult.success).toBe(true);
      expect(postResult.id).toBeDefined();

      // いいね
      const likeResult = await client.like(postResult.id);
      expect(likeResult.success).toBe(true);

      // リツイート
      const retweetResult = await client.retweet(postResult.id);
      expect(retweetResult.success).toBe(true);
    }, 30000);

    it('大量リクエスト時のQPS制御が正常動作する', async () => {
      const startTime = Date.now();
      const promises: Promise<any>[] = [];

      // 50リクエストを同時実行（QPS=10なので5秒程度かかる想定）
      for (let i = 0; i < 50; i++) {
        promises.push(client.testConnection());
      }

      await Promise.all(promises);
      const elapsed = Date.now() - startTime;

      // QPS制御により適切な時間がかかることを確認
      expect(elapsed).toBeGreaterThan(4000); // 最低4秒
      expect(elapsed).toBeLessThan(10000);   // 最大10秒以内
    }, 15000);
  });

  describe('エラー回復テスト', () => {
    it('ネットワークエラーからの自動回復', async () => {
      // ネットワークエラーをシミュレート
      const originalFetch = global.fetch;
      let failCount = 0;
      
      global.fetch = jest.fn().mockImplementation(() => {
        failCount++;
        if (failCount <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return originalFetch.apply(global, arguments as any);
      });

      const result = await client.testConnection();
      expect(result).toBe(true);
      expect(failCount).toBe(3);

      global.fetch = originalFetch;
    });
  });

  describe('メモリリークテスト', () => {
    it('長時間実行でメモリリークが発生しない', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // 1000回のリクエストを実行
      for (let i = 0; i < 1000; i++) {
        await client.testConnection();
        
        // 100回ごとにガベージコレクション実行
        if (i % 100 === 0) {
          global.gc && global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // メモリ増加が50MB以下であることを確認
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }, 60000);
  });
});
```

### Phase 4: モックデータ改善

**ファイル**: `tests/test-utils/mock-data.ts`

```typescript
export const mockTwitterAPIResponses = {
  tweet: {
    create: {
      data: {
        id: '1234567890',
        text: 'Test tweet content',
        created_at: '2023-01-01T00:00:00.000Z',
        author_id: '123456789',
        public_metrics: {
          retweet_count: 0,
          like_count: 0,
          quote_count: 0,
          reply_count: 0,
          impression_count: 0
        }
      }
    },
    search: {
      data: [
        {
          id: '1234567890',
          text: 'Investment education content',
          author_id: '123456789',
          created_at: '2023-01-01T00:00:00.000Z',
          public_metrics: {
            retweet_count: 10,
            like_count: 25,
            quote_count: 3,
            reply_count: 5,
            impression_count: 1000
          },
          context_annotations: [
            {
              domain: { name: 'Finance', description: 'Financial content' },
              entity: { name: 'Investment', description: 'Investment related' }
            }
          ],
          lang: 'en'
        }
      ],
      meta: {
        result_count: 1,
        next_token: 'next_page_token'
      }
    }
  },
  user: {
    info: {
      data: {
        id: '123456789',
        username: 'testuser',
        name: 'Test User',
        description: 'Test account for integration testing',
        created_at: '2020-01-01T00:00:00.000Z',
        verified: false,
        public_metrics: {
          followers_count: 1000,
          following_count: 500,
          tweet_count: 2000
        },
        profile_image_url: 'https://example.com/avatar.jpg'
      }
    }
  },
  errors: {
    rateLimitExceeded: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        type: 'rate_limit'
      }
    },
    authenticationFailed: {
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: 'Authentication credentials were invalid',
        type: 'authentication'
      }
    }
  }
};
```

## 📝 必須実装項目

### 1. 単体テスト改善
- [ ] 全エンドポイントの正常系・異常系テスト
- [ ] バリデーション機能の境界値テスト
- [ ] エラーハンドリングの網羅的テスト

### 2. 統合テスト拡充
- [ ] エンドツーエンドフローテスト
- [ ] QPS制御の精度テスト
- [ ] 長時間動作安定性テスト

### 3. パフォーマンステスト
- [ ] レスポンス時間測定
- [ ] メモリ使用量テスト
- [ ] CPU使用率テスト

### 4. モックシステム改善
- [ ] TwitterAPI.io準拠のモックレスポンス
- [ ] エラーシナリオの網羅
- [ ] リアルなテストデータ

### 5. テスト実行環境
- [ ] CI/CD対応テスト設定
- [ ] カバレッジレポート生成
- [ ] パフォーマンス回帰テスト

## 🚫 制約事項

### テスト実行制約
- **実API使用禁止**: モックのみでテスト実施
- **外部依存最小限**: テスト環境の独立性確保
- **実行時間制限**: 各テストスイート30分以内

### リソース制約
- **メモリ使用量制限**: テスト実行時500MB以下
- **並列実行対応**: テスト間の独立性確保
- **CI環境対応**: クラウドCI環境での安定動作

## 📊 品質基準

### カバレッジ要件
- 単体テスト: 90%以上
- 統合テスト: 主要フロー100%
- エッジケース: 境界値・エラー処理100%

### パフォーマンス要件
- テスト実行時間: スイート全体30分以内
- メモリ使用量: 500MB以下
- 並列実行: 問題なし

### 品質要件
- フレーキーテストなし
- テスト間依存なし
- 明確なアサーション

## 📋 テスト実行コマンド

```bash
# 全テスト実行
npm test

# 単体テスト実行
npm run test:unit

# 統合テスト実行
npm run test:integration

# カバレッジレポート生成
npm run test:coverage

# パフォーマンステスト実行
npm run test:performance
```

## 📄 成果物

### 更新テストファイル
- 全`tests/kaito-api/`配下のテストファイル
- `tests/test-utils/mock-data.ts` (改善版)
- `tests/test-utils/test-helpers.ts` (改善版)

### 新規テストファイル
- `tests/kaito-api/performance/load-test.ts`
- `tests/kaito-api/integration/error-recovery.test.ts`

### 設定ファイル
- `jest.config.js` (更新)
- `tests/setup/test-env.ts` (更新)

### ドキュメント
- `tasks/20250727_223237_kaito_api_quality_improvement/outputs/test-improvement-report.md`
- `tasks/20250727_223237_kaito_api_quality_improvement/outputs/coverage-report.md`

## 🎯 重要な注意事項

1. **実API使用禁止**: テスト時は必ずモックを使用
2. **テスト独立性**: テスト間の依存関係を完全に排除
3. **CI環境対応**: クラウドCI環境での安定動作を保証
4. **カバレッジ重視**: 重要な機能の100%カバレッジ
5. **パフォーマンス監視**: テスト実行時間とリソース使用量の最適化

---

**実装完了後、報告書を作成してください**:
📋 報告書: `tasks/20250727_223237_kaito_api_quality_improvement/reports/REPORT-004-test-enhancement.md`