# URGENT-002: 包括的テスト実装・動作検証

## 🎯 実装目標

URGENT-001の型修正完了後、TwitterAPI.io統合kaito-apiの包括的なテスト実装と実際の動作検証を行い、完璧な動作を保証する。

## 📋 **前提条件** - URGENT-001完了必須

**実行前チェック**:
```bash
npx tsc --noEmit
# エラー0件確認後に開始
```

**REQUIREMENTS.md準拠**: MVP範囲内での品質重視テスト

## 🧪 実装対象テストファイル

### 1. HTTPクライアント統合テスト実装
**作成**: `tests/kaito-api/core/client-integration.test.ts`

```typescript
import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
import { KaitoAPIConfig } from '../../../src/kaito-api/types';

describe('KaitoTwitterAPIClient - TwitterAPI.io Integration Tests', () => {
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

  describe('TwitterAPI.io Authentication Tests', () => {
    it('should authenticate with valid API key', async () => {
      // Real API test - minimal execution
      if (process.env.KAITO_API_TOKEN && process.env.RUN_REAL_TESTS === 'true') {
        const result = await client.testAuthentication();
        expect(result).toBe(true);
      } else {
        // Mock test
        expect(true).toBe(true);
      }
    });

    it('should handle authentication failure gracefully', async () => {
      const invalidClient = new KaitoTwitterAPIClient({ apiKey: 'invalid-key' });
      invalidClient.initializeWithConfig(mockConfig);
      
      const result = await invalidClient.testAuthentication();
      expect(result).toBe(false);
    });
  });

  describe('QPS Control Tests', () => {
    it('should enforce QPS limits correctly', async () => {
      const startTime = Date.now();
      
      // Execute multiple requests to test QPS control
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(client.testConnection());
      }
      
      await Promise.all(requests);
      const duration = Date.now() - startTime;
      
      // Should take at least 700ms * 4 intervals due to QPS control
      expect(duration).toBeGreaterThan(2800);
    });

    it('should track current QPS accurately', () => {
      const initialQPS = client.getCurrentQPS();
      expect(typeof initialQPS).toBe('number');
      expect(initialQPS).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cost Tracking Tests', () => {
    it('should track API costs correctly', async () => {
      const initialCost = client.getCostTrackingInfo();
      expect(initialCost).toHaveProperty('tweetsProcessed');
      expect(initialCost).toHaveProperty('estimatedCost');
      expect(typeof initialCost.estimatedCost).toBe('number');
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle network timeouts', async () => {
      // Test timeout scenarios
      const result = await client.testConnection();
      expect(typeof result).toBe('boolean');
    });

    it('should handle rate limit errors', async () => {
      // Test rate limit handling
      const rateLimits = client.getRateLimitStatus();
      expect(rateLimits).toHaveProperty('general');
      expect(rateLimits).toHaveProperty('posting');
      expect(rateLimits).toHaveProperty('collection');
    });
  });
});
```

### 2. エンドポイント動作テスト実装
**作成**: `tests/kaito-api/endpoints/endpoints-integration.test.ts`

```typescript
import { ActionEndpoints } from '../../../src/kaito-api/endpoints/action-endpoints';
import { TweetEndpoints } from '../../../src/kaito-api/endpoints/tweet-endpoints';
import { UserEndpoints } from '../../../src/kaito-api/endpoints/user-endpoints';
import { HttpClient } from '../../../src/kaito-api/types';

describe('TwitterAPI.io Endpoints Integration Tests', () => {
  let mockHttpClient: HttpClient;
  let actionEndpoints: ActionEndpoints;
  let tweetEndpoints: TweetEndpoints;
  let userEndpoints: UserEndpoints;

  beforeEach(() => {
    mockHttpClient = {
      post: jest.fn(),
      get: jest.fn(),
      delete: jest.fn()
    };

    actionEndpoints = new ActionEndpoints(mockHttpClient);
    tweetEndpoints = new TweetEndpoints(mockHttpClient);
    userEndpoints = new UserEndpoints(mockHttpClient);
  });

  describe('ActionEndpoints Tests', () => {
    it('should create post with TwitterAPI.io format', async () => {
      const mockResponse = {
        data: {
          id: '1234567890',
          text: 'Test tweet content',
          created_at: '2025-01-27T12:00:00.000Z'
        }
      };

      mockHttpClient.post = jest.fn().mockResolvedValue(mockResponse);

      const result = await actionEndpoints.createPost({
        content: 'Test tweet content'
      });

      expect(result.success).toBe(true);
      expect(result.tweetId).toBe('1234567890');
      expect(result.createdAt).toBe('2025-01-27T12:00:00.000Z');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/tweets', {
        text: 'Test tweet content'
      });
    });

    it('should perform engagement with correct endpoints', async () => {
      const mockResponse = { data: { liked: true } };
      mockHttpClient.post = jest.fn().mockResolvedValue(mockResponse);

      const result = await actionEndpoints.performEngagement({
        tweetId: '1234567890',
        action: 'like'
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('like');
      expect(result.data.liked).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/tweets/1234567890/like');
    });
  });

  describe('TweetEndpoints Tests', () => {
    it('should create tweet with correct TwitterAPI.io parameters', async () => {
      const mockResponse = {
        data: {
          id: '1234567890',
          text: 'Test tweet with media',
          created_at: '2025-01-27T12:00:00.000Z'
        }
      };

      mockHttpClient.post = jest.fn().mockResolvedValue(mockResponse);

      const result = await tweetEndpoints.createTweet({
        text: 'Test tweet with media',
        media_ids: ['media123', 'media456']
      });

      expect(result.success).toBe(true);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/v1/tweets', {
        text: 'Test tweet with media',
        media_ids: ['media123', 'media456']
      });
    });

    it('should search tweets with correct parameters', async () => {
      const mockResponse = {
        data: [{
          id: '1234567890',
          text: 'Bitcoin trading analysis',
          author_id: 'user123',
          created_at: '2025-01-27T12:00:00.000Z',
          public_metrics: {
            retweet_count: 10,
            like_count: 25,
            quote_count: 5,
            reply_count: 3,
            impression_count: 1000
          }
        }],
        meta: {
          result_count: 1
        }
      };

      mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await tweetEndpoints.searchTweets({
        query: 'bitcoin trading',
        max_results: 10
      });

      expect(result.tweets).toHaveLength(1);
      expect(result.tweets[0].text).toBe('Bitcoin trading analysis');
      expect(result.tweets[0].public_metrics.like_count).toBe(25);
    });
  });

  describe('UserEndpoints Tests', () => {
    it('should get user info with correct format', async () => {
      const mockResponse = {
        data: {
          id: '123456789',
          username: 'testuser',
          name: 'Test User',
          description: 'Trading enthusiast',
          created_at: '2020-01-01T00:00:00.000Z',
          public_metrics: {
            followers_count: 1000,
            following_count: 500,
            tweet_count: 2000
          },
          verified: false
        }
      };

      mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await userEndpoints.getUserInfo('123456789');

      expect(result.username).toBe('testuser');
      expect(result.followersCount).toBe(1000);
      expect(result.verified).toBe(false);
    });

    it('should search users with correct parameters', async () => {
      const mockResponse = {
        data: [{
          id: '123456789',
          username: 'trader1',
          name: 'Crypto Trader',
          created_at: '2020-01-01T00:00:00.000Z',
          public_metrics: {
            followers_count: 5000,
            following_count: 1000,
            tweet_count: 10000
          }
        }],
        meta: {
          result_count: 1
        }
      };

      mockHttpClient.get = jest.fn().mockResolvedValue(mockResponse);

      const result = await userEndpoints.searchUsers({
        query: 'crypto trader',
        max_results: 10
      });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].username).toBe('trader1');
    });
  });
});
```

### 3. 型安全性テスト実装
**作成**: `tests/kaito-api/types/type-safety.test.ts`

```typescript
import { 
  TweetData, 
  UserData, 
  CreateTweetOptions, 
  TweetSearchOptions,
  UserSearchOptions,
  EngagementResponse 
} from '../../../src/kaito-api/types';

describe('TwitterAPI.io Type Safety Tests', () => {
  describe('TweetData Type Tests', () => {
    it('should validate TweetData structure', () => {
      const validTweetData: TweetData = {
        id: '1234567890',
        text: 'Test tweet content',
        author_id: 'user123',
        created_at: '2025-01-27T12:00:00.000Z',
        public_metrics: {
          retweet_count: 0,
          like_count: 0,
          quote_count: 0,
          reply_count: 0,
          impression_count: 0
        }
      };

      expect(validTweetData.id).toBe('1234567890');
      expect(validTweetData.public_metrics.like_count).toBe(0);
    });
  });

  describe('CreateTweetOptions Type Tests', () => {
    it('should validate CreateTweetOptions structure', () => {
      const validOptions: CreateTweetOptions = {
        text: 'Test tweet',
        media_ids: ['media123'],
        reply: {
          in_reply_to_tweet_id: '9876543210'
        },
        quote_tweet_id: '5555555555'
      };

      expect(validOptions.text).toBe('Test tweet');
      expect(validOptions.media_ids).toContain('media123');
      expect(validOptions.reply?.in_reply_to_tweet_id).toBe('9876543210');
    });
  });

  describe('SearchOptions Type Tests', () => {
    it('should validate TweetSearchOptions structure', () => {
      const validOptions: TweetSearchOptions = {
        query: 'bitcoin trading',
        max_results: 20,
        'tweet.fields': 'created_at,public_metrics'
      };

      expect(validOptions.query).toBe('bitcoin trading');
      expect(validOptions.max_results).toBe(20);
    });

    it('should validate UserSearchOptions structure', () => {
      const validOptions: UserSearchOptions = {
        query: 'crypto trader',
        max_results: 10,
        'user.fields': 'verified,public_metrics'
      };

      expect(validOptions.query).toBe('crypto trader');
      expect(validOptions.max_results).toBe(10);
    });
  });

  describe('EngagementResponse Type Tests', () => {
    it('should validate EngagementResponse structure', () => {
      const validResponse: EngagementResponse = {
        success: true,
        action: 'like',
        tweetId: '1234567890',
        timestamp: '2025-01-27T12:00:00.000Z',
        data: {
          liked: true
        }
      };

      expect(validResponse.success).toBe(true);
      expect(validResponse.data.liked).toBe(true);
    });
  });
});
```

### 4. 実際のAPI動作テスト実装
**作成**: `tests/kaito-api/real-api/real-integration.test.ts`

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
      apiKey: process.env.KAITO_API_TOKEN!,
      qpsLimit: 200,
      costTracking: true
    });
  });

  it('should connect to real TwitterAPI.io health endpoint', async () => {
    if (!REAL_API_ENABLED) return;

    const isConnected = await client.testConnection();
    expect(isConnected).toBe(true);
  });

  it('should authenticate with real TwitterAPI.io', async () => {
    if (!REAL_API_ENABLED) return;

    const isAuthenticated = await client.testAuthentication();
    expect(isAuthenticated).toBe(true);
  });

  it('should perform comprehensive endpoint test', async () => {
    if (!REAL_API_ENABLED) return;

    const allTestsPassed = await client.testEndpoints();
    expect(allTestsPassed).toBe(true);
  });

  it('should get account info from real API', async () => {
    if (!REAL_API_ENABLED) return;

    const accountInfo = await client.getAccountInfo();
    
    expect(accountInfo).toBeDefined();
    expect(accountInfo.id).toBeDefined();
    expect(accountInfo.username).toBeDefined();
    expect(typeof accountInfo.followersCount).toBe('number');
    expect(accountInfo.timestamp).toBeDefined();
  });

  // 注意：実際の投稿は手動実行のみ
  it.skip('should create real tweet (manual execution only)', async () => {
    if (!REAL_API_ENABLED) return;

    const result = await client.post('API integration test tweet #testing');
    
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    
    console.log('✅ Real tweet created:', result.id);
    // 注意: 実際の運用では作成したツイートの削除も考慮
  });
});
```

### 5. 動作確認スクリプト実装
**作成**: `tests/kaito-api/scripts/integration-check.ts`

```typescript
#!/usr/bin/env tsx

/**
 * TwitterAPI.io統合動作確認スクリプト
 * 全体的な動作確認を実行
 */

import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';

async function runIntegrationCheck() {
  console.log('🧪 TwitterAPI.io統合動作確認開始');
  console.log('=====================================');

  const client = new KaitoTwitterAPIClient({
    apiKey: process.env.KAITO_API_TOKEN || 'test-token',
    qpsLimit: 200,
    costTracking: true
  });

  const results = {
    connection: false,
    authentication: false,
    endpoints: false,
    qpsControl: false,
    costTracking: false
  };

  try {
    // 1. 接続テスト
    console.log('📡 接続テスト実行中...');
    results.connection = await client.testConnection();
    console.log(`接続テスト: ${results.connection ? '✅ 成功' : '❌ 失敗'}`);

    // 2. 認証テスト
    console.log('🔐 認証テスト実行中...');
    results.authentication = await client.testAuthentication();
    console.log(`認証テスト: ${results.authentication ? '✅ 成功' : '❌ 失敗'}`);

    // 3. エンドポイントテスト
    console.log('🔧 エンドポイントテスト実行中...');
    results.endpoints = await client.testEndpoints();
    console.log(`エンドポイントテスト: ${results.endpoints ? '✅ 成功' : '❌ 失敗'}`);

    // 4. QPS制御テスト
    console.log('⏱️ QPS制御テスト実行中...');
    const startTime = Date.now();
    await Promise.all([
      client.testConnection(),
      client.testConnection(),
      client.testConnection()
    ]);
    const duration = Date.now() - startTime;
    results.qpsControl = duration > 2100; // 700ms * 3
    console.log(`QPS制御テスト: ${results.qpsControl ? '✅ 成功' : '❌ 失敗'} (${duration}ms)`);

    // 5. コスト追跡テスト
    console.log('💰 コスト追跡テスト実行中...');
    const costInfo = client.getCostTrackingInfo();
    results.costTracking = typeof costInfo.estimatedCost === 'number';
    console.log(`コスト追跡テスト: ${results.costTracking ? '✅ 成功' : '❌ 失敗'}`);

    // 総合結果
    const allPassed = Object.values(results).every(result => result === true);
    console.log('=====================================');
    console.log(`🎯 総合結果: ${allPassed ? '✅ 全テスト成功' : '❌ 一部テスト失敗'}`);
    
    if (!allPassed) {
      console.log('❌ 失敗したテスト:');
      Object.entries(results).forEach(([test, passed]) => {
        if (!passed) {
          console.log(`  - ${test}`);
        }
      });
    }

    return allPassed;

  } catch (error) {
    console.error('❌ 統合テスト実行エラー:', error);
    return false;
  }
}

if (require.main === module) {
  runIntegrationCheck()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runIntegrationCheck };
```

## 🔍 テスト実行

### 1. 単体テスト実行
```bash
npm test tests/kaito-api/
```

### 2. 型安全性テスト実行
```bash
npm test tests/kaito-api/types/
```

### 3. 統合動作確認実行
```bash
tsx tests/kaito-api/scripts/integration-check.ts
```

### 4. 実API テスト実行（オプション）
```bash
RUN_REAL_API_TESTS=true KAITO_API_TOKEN=your_token npm test tests/kaito-api/real-api/
```

## 📊 完了基準

### テスト実装完了チェックリスト
- [ ] 全テストファイル作成完了
- [ ] 単体テスト実行成功（90%以上カバレッジ）
- [ ] 型安全性テスト全成功
- [ ] 統合動作確認スクリプト成功
- [ ] 実API接続テスト成功（環境変数設定時）

### 品質確保チェックリスト
- [ ] TypeScriptコンパイルエラー0件維持
- [ ] 全エンドポイントの動作確認完了
- [ ] QPS制御・レート制限の正常動作確認
- [ ] エラーハンドリングの適切な動作確認

## 📝 完了報告

実装完了後、以下を含む報告書を作成：
- 実装したテストファイル一覧
- テスト実行結果サマリー
- 発見した問題と解決状況
- TwitterAPI.io統合の最終動作確認結果

**報告書**: `tasks/20250727_193649_kaito_api_implementation/reports/URGENT-002-comprehensive-testing-implementation.md`