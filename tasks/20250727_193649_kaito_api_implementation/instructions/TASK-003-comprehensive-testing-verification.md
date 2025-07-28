# TASK-003: TwitterAPI.io統合テスト・動作検証実装

## 🎯 実装目標

TwitterAPI.io統合後のkaito-apiの包括的なテスト実装と実際の動作検証を行い、完璧な動作を保証する。

## 📋 必須事前読み込み

**REQUIREMENTS.md読み込み必須**：
```bash
cat REQUIREMENTS.md | head -50
```

**前提条件確認**：
- TASK-001: HTTPクライアント実装完了
- TASK-002: エンドポイント実装完了
- TwitterAPI.ioとの統合が動作状態

## 🔧 実装対象ファイル

### 1. コアクライアントテスト実装
**対象**: `tests/kaito-api/core/client.test.ts`

**TwitterAPI.io統合テスト実装**：
```typescript
import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
import { KaitoAPIConfig } from '../../../src/kaito-api/types';

describe('KaitoTwitterAPIClient - TwitterAPI.io Integration', () => {
  let client: KaitoTwitterAPIClient;
  let mockConfig: KaitoAPIConfig;

  beforeEach(() => {
    mockConfig = {
      environment: 'dev',
      api: {
        baseUrl: 'https://api.twitterapi.io',
        version: 'v1',
        timeout: 30000,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          retryConditions: ['NETWORK_ERROR', 'TIMEOUT']
        }
      },
      authentication: {
        primaryKey: process.env.KAITO_API_TOKEN || 'test-key',
        keyRotationInterval: 86400000,
        encryptionEnabled: false
      },
      performance: {
        qpsLimit: 200,
        responseTimeTarget: 700,
        cacheEnabled: false,
        cacheTTL: 0
      },
      monitoring: {
        metricsEnabled: true,
        logLevel: 'info',
        alertingEnabled: false,
        healthCheckInterval: 30000
      },
      security: {
        rateLimitEnabled: true,
        ipWhitelist: [],
        auditLoggingEnabled: true,
        encryptionKey: 'test-key'
      },
      features: {
        realApiEnabled: true,
        mockFallbackEnabled: false,
        batchProcessingEnabled: false,
        advancedCachingEnabled: false
      },
      metadata: {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        updatedBy: 'test',
        checksum: 'test-checksum'
      }
    };

    client = new KaitoTwitterAPIClient();
    client.initializeWithConfig(mockConfig);
  });

  describe('Authentication Tests', () => {
    it('should authenticate with valid API key', async () => {
      // TwitterAPI.io認証テスト
      const result = await client.authenticate();
      expect(result).toBeDefined();
    });

    it('should handle authentication failure', async () => {
      // 無効なAPI Keyでの認証失敗テスト
      const invalidClient = new KaitoTwitterAPIClient({ apiKey: 'invalid-key' });
      invalidClient.initializeWithConfig(mockConfig);
      
      await expect(invalidClient.authenticate()).rejects.toThrow();
    });
  });

  describe('HTTP Client Tests', () => {
    it('should make GET requests to TwitterAPI.io', async () => {
      // GET リクエストテスト
      const response = await client.testConnection();
      expect(typeof response).toBe('boolean');
    });

    it('should handle HTTP errors properly', async () => {
      // HTTPエラーハンドリングテスト
      // 存在しないエンドポイントへのリクエスト
    });

    it('should respect QPS limits', async () => {
      // QPS制限テスト
      const startTime = Date.now();
      const requests = [];
      
      for (let i = 0; i < 5; i++) {
        requests.push(client.testConnection());
      }
      
      await Promise.all(requests);
      const duration = Date.now() - startTime;
      
      // QPS制限により適切な間隔が空いていることを確認
      expect(duration).toBeGreaterThan(700 * 4); // 700ms * 4間隔
    });
  });

  describe('Cost Tracking Tests', () => {
    it('should track API costs correctly', async () => {
      const initialCost = client.getCostTrackingInfo();
      
      // API呼び出し実行
      await client.getAccountInfo();
      
      const updatedCost = client.getCostTrackingInfo();
      expect(updatedCost.tweetsProcessed).toBeGreaterThan(initialCost.tweetsProcessed);
      expect(updatedCost.estimatedCost).toBeGreaterThan(initialCost.estimatedCost);
    });
  });
});
```

### 2. エンドポイント統合テスト実装
**対象**: `tests/kaito-api/endpoints/action-endpoints.test.ts`

**実際のAPI動作テスト**：
```typescript
import { ActionEndpoints } from '../../../src/kaito-api/endpoints/action-endpoints';
import { PostRequest, EngagementRequest } from '../../../src/kaito-api/types';

describe('ActionEndpoints - TwitterAPI.io Integration', () => {
  let actionEndpoints: ActionEndpoints;
  let mockHttpClient: any;

  beforeEach(() => {
    // TwitterAPI.io対応のモックHTTPクライアント
    mockHttpClient = {
      post: jest.fn(),
      get: jest.fn()
    };
    
    actionEndpoints = new ActionEndpoints('https://api.twitterapi.io', {
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json'
    });
  });

  describe('Tweet Creation Tests', () => {
    it('should create tweet with TwitterAPI.io format', async () => {
      const mockResponse = {
        data: {
          id: '1234567890',
          text: 'Test tweet content',
          created_at: '2025-01-27T10:00:00.000Z'
        }
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const request: PostRequest = {
        content: 'Test tweet content'
      };

      const result = await actionEndpoints.createPost(request);

      expect(result.success).toBe(true);
      expect(result.tweetId).toBe('1234567890');
      expect(result.createdAt).toBe('2025-01-27T10:00:00.000Z');
      
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/tweets', {
        text: 'Test tweet content'
      });
    });

    it('should handle tweet creation errors', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Rate limit exceeded'));

      const request: PostRequest = {
        content: 'Test tweet content'
      };

      const result = await actionEndpoints.createPost(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should validate tweet content length', async () => {
      const longContent = 'a'.repeat(281); // 280文字超過
      
      const request: PostRequest = {
        content: longContent
      };

      const result = await actionEndpoints.createPost(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('280 character limit');
    });
  });

  describe('Engagement Tests', () => {
    it('should perform like action', async () => {
      const mockResponse = {
        data: { liked: true }
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const request: EngagementRequest = {
        tweetId: '1234567890',
        action: 'like'
      };

      const result = await actionEndpoints.performEngagement(request);

      expect(result.success).toBe(true);
      expect(result.action).toBe('like');
      expect(result.tweetId).toBe('1234567890');
      
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/tweets/1234567890/like');
    });

    it('should perform retweet action', async () => {
      const mockResponse = {
        data: { retweeted: true }
      };

      mockHttpClient.post.mockResolvedValue(mockResponse);

      const request: EngagementRequest = {
        tweetId: '1234567890',
        action: 'retweet'
      };

      const result = await actionEndpoints.performEngagement(request);

      expect(result.success).toBe(true);
      expect(result.action).toBe('retweet');
      
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/tweets/1234567890/retweet');
    });
  });

  describe('Media Upload Tests', () => {
    it('should upload media successfully', async () => {
      const mockBuffer = Buffer.from('fake image data');
      const result = await actionEndpoints.uploadMedia(mockBuffer, 'image/jpeg');

      expect(result.mediaId).toMatch(/^media_\d+$/);
    });
  });
});
```

### 3. 実際のAPI統合テスト実装
**対象**: `tests/kaito-api/integration/real-api-integration.test.ts`

**実環境でのAPI動作テスト**：
```typescript
import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';

// 環境変数でのみ実行されるテスト
const REAL_API_ENABLED = process.env.KAITO_API_TOKEN && process.env.RUN_REAL_API_TESTS === 'true';

describe('Real TwitterAPI.io Integration Tests', () => {
  let client: KaitoTwitterAPIClient;

  beforeAll(() => {
    if (!REAL_API_ENABLED) {
      console.log('⚠️ Real API tests skipped - set RUN_REAL_API_TESTS=true and KAITO_API_TOKEN');
      return;
    }

    client = new KaitoTwitterAPIClient({
      apiKey: process.env.KAITO_API_TOKEN!
    });
  });

  it('should connect to real TwitterAPI.io', async () => {
    if (!REAL_API_ENABLED) return;

    const isConnected = await client.testConnection();
    expect(isConnected).toBe(true);
  });

  it('should authenticate with real API', async () => {
    if (!REAL_API_ENABLED) return;

    await expect(client.authenticate()).resolves.not.toThrow();
  });

  it('should get account info from real API', async () => {
    if (!REAL_API_ENABLED) return;

    const accountInfo = await client.getAccountInfo();
    
    expect(accountInfo).toBeDefined();
    expect(accountInfo.id).toBeDefined();
    expect(accountInfo.username).toBeDefined();
    expect(typeof accountInfo.followersCount).toBe('number');
  });

  // 注意：実際の投稿は最小限に留める
  it.skip('should create real tweet (manual execution only)', async () => {
    if (!REAL_API_ENABLED) return;

    const result = await client.post('Test tweet from API integration #testing');
    
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    
    // 作成したツイートは直ちに削除するなどのクリーンアップを行う
  });
});
```

### 4. パフォーマンステスト実装
**対象**: `tests/kaito-api/performance/performance.test.ts`

**レスポンス時間・QPS制限テスト**：
```typescript
describe('TwitterAPI.io Performance Tests', () => {
  let client: KaitoTwitterAPIClient;

  beforeEach(() => {
    client = new KaitoTwitterAPIClient();
  });

  it('should meet 700ms response time requirement', async () => {
    const startTime = Date.now();
    
    await client.testConnection();
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000); // 1秒以内
    console.log(`Response time: ${duration}ms`);
  });

  it('should enforce QPS limits correctly', async () => {
    const qpsController = client.getCurrentQPS();
    
    // 連続リクエストでQPS制限が働くことを確認
    const requests = Array(10).fill(null).map(() => client.testConnection());
    
    const startTime = Date.now();
    await Promise.all(requests);
    const duration = Date.now() - startTime;
    
    // QPS制限により適切な時間がかかることを確認
    expect(duration).toBeGreaterThan(700 * 9); // 最低間隔の確保
  });

  it('should track cost accurately', async () => {
    const initialCost = client.getCostTrackingInfo();
    
    await client.testConnection();
    await client.testConnection();
    
    const finalCost = client.getCostTrackingInfo();
    
    expect(finalCost.tweetsProcessed).toBe(initialCost.tweetsProcessed + 2);
    
    const expectedCostIncrease = (2 / 1000) * 0.15; // $0.15/1k tweets
    expect(finalCost.estimatedCost).toBeCloseTo(initialCost.estimatedCost + expectedCostIncrease, 4);
  });
});
```

## 🔍 エラーシナリオテスト

### TwitterAPI.io固有エラーテスト
```typescript
describe('Error Handling Tests', () => {
  it('should handle rate limit errors', async () => {
    // レート制限エラーのモック
    // 適切なリトライ・待機動作の確認
  });

  it('should handle authentication errors', async () => {
    // 認証エラーのモック
    // エラーメッセージの適切性確認
  });

  it('should handle network timeouts', async () => {
    // ネットワークタイムアウトのモック
    // タイムアウト処理の確認
  });

  it('should handle invalid tweet content', async () => {
    // 無効なツイート内容のテスト
    // バリデーションエラーの確認
  });
});
```

## 🧪 動作確認スクリプト

### 統合テスト実行スクリプト
**作成**: `tests/kaito-api/run-integration-tests.ts`

```typescript
import { KaitoTwitterAPIClient } from '../../src/kaito-api/core/client';

async function runIntegrationTests() {
  console.log('🧪 TwitterAPI.io統合テスト開始');

  const client = new KaitoTwitterAPIClient({
    apiKey: process.env.KAITO_API_TOKEN || ''
  });

  try {
    // 1. 接続テスト
    console.log('📡 接続テスト...');
    const connected = await client.testConnection();
    console.log(`接続テスト結果: ${connected ? '✅成功' : '❌失敗'}`);

    // 2. 認証テスト
    console.log('🔐 認証テスト...');
    await client.authenticate();
    console.log('認証テスト結果: ✅成功');

    // 3. アカウント情報取得テスト
    console.log('👤 アカウント情報取得テスト...');
    const accountInfo = await client.getAccountInfo();
    console.log(`アカウント情報: @${accountInfo.username}, フォロワー: ${accountInfo.followersCount}`);

    // 4. QPS制御テスト
    console.log('⏱️ QPS制御テスト...');
    const startTime = Date.now();
    await Promise.all([
      client.testConnection(),
      client.testConnection(),
      client.testConnection()
    ]);
    const duration = Date.now() - startTime;
    console.log(`QPS制御テスト結果: ${duration}ms (期待値: >=2100ms)`);

    console.log('✅ 全ての統合テストが完了しました');

  } catch (error) {
    console.error('❌ 統合テストエラー:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runIntegrationTests();
}
```

## 📊 実装品質要件

### テストカバレッジ
- 単体テスト: 90%以上
- 統合テスト: 全主要フロー
- エラーシナリオ: 全エラーケース

### TypeScript strict対応
- 全テストファイルでstrict mode
- 型安全なモック実装
- any型の使用禁止

### テスト実行環境
- Jest + TypeScript設定
- モック環境での高速実行
- 実API環境での選択実行

## 🚫 MVP制約事項

### テスト実装禁止事項
- 過度に複雑なテストシナリオ
- 負荷テスト（基本的なパフォーマンステストのみ）
- 自動化されたE2Eテスト
- 統計・分析テスト

### テスト実装必須事項
- 基本的な機能テスト
- エラーハンドリングテスト
- 型安全性テスト
- 実API統合テスト（最小限）

## 📝 完了基準

### テスト実装完了チェックリスト
- [ ] 全エンドポイントの単体テスト実装
- [ ] TwitterAPI.io統合テスト実装
- [ ] エラーハンドリングテスト実装
- [ ] パフォーマンステスト実装
- [ ] 実API動作確認の実行
- [ ] テストカバレッジ90%以上達成

### 動作確認完了チェックリスト
- [ ] TwitterAPI.ioとの接続確認
- [ ] 認証機能の動作確認
- [ ] 主要エンドポイントの動作確認
- [ ] QPS制御の動作確認
- [ ] エラーハンドリングの動作確認

### 依存関係
- **前提条件**: TASK-001, TASK-002の完了
- **直列処理**: 実装完了後のテスト実行

## 📋 出力先

**報告書**: `tasks/20250727_193649_kaito_api_implementation/reports/REPORT-003-comprehensive-testing-verification.md`

**テスト実行結果**: `tasks/20250727_193649_kaito_api_implementation/outputs/test-results-summary.md`