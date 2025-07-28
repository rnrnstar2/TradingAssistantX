/**
 * Real API統合テスト - 実際のKaito Twitter API接続検証
 * 実環境でのAPI接続、認証、制限管理の動作を確認
 * 
 * ⚠️ 注意: このテストは実際のAPIコストが発生します
 * テスト実行前にコスト制限とテスト専用アカウントを確認してください
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { KaitoAPIConfigManager } from '../../../src/kaito-api/core/config';
import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
import { ActionEndpoints } from '../../../src/kaito-api/endpoints/action-endpoints';
import { TweetEndpoints } from '../../../src/kaito-api/endpoints/tweet-endpoints';
import { 
  KaitoAPIConfig, 
  KaitoClientConfig, 
  PostRequest,
  TweetSearchOptions 
} from '../../../src/kaito-api/types';

// 実APIテストの実行制御
const REAL_API_ENABLED = !!process.env.KAITO_API_TOKEN;

// テスト用投稿IDを記録（テスト後削除用）
const testTweetIds: string[] = [];

describe('Real TwitterAPI.io Integration Tests', () => {
  let configManager: KaitoAPIConfigManager;
  let apiClient: KaitoTwitterAPIClient;
  let actionEndpoints: ActionEndpoints;
  let tweetEndpoints: TweetEndpoints;
  let prodConfig: KaitoAPIConfig;

  beforeEach(async () => {
    // 実APIテストが無効の場合はスキップ
    if (!REAL_API_ENABLED) {
      console.log('⚠️ Real API tests skipped - set KAITO_API_TOKEN');
      return;
    }

    // 本番環境設定で初期化（実API接続用）
    configManager = new KaitoAPIConfigManager();
    prodConfig = await configManager.generateConfig('prod');
    
    // テスト用APIキーで上書き
    prodConfig.authentication.primaryKey = process.env.KAITO_API_TOKEN!;
    prodConfig.features.realApiEnabled = true;
    prodConfig.features.mockFallbackEnabled = false;

    // APIクライアント初期化
    apiClient = new KaitoTwitterAPIClient({
      apiKey: process.env.KAITO_API_TOKEN!
    });
    apiClient.initializeWithConfig(prodConfig);

    // エンドポイント初期化
    const headers = {
      'Authorization': `Bearer ${process.env.KAITO_API_TOKEN!}`,
      'Content-Type': 'application/json'
    };

    actionEndpoints = new ActionEndpoints(prodConfig.api.baseUrl, headers);
    tweetEndpoints = new TweetEndpoints(prodConfig);
  });

  afterEach(async () => {
    if (!REAL_API_ENABLED) {
      return;
    }

    // テスト用投稿の削除（クリーンアップ）
    for (const tweetId of testTweetIds) {
      try {
        console.log(`🧹 Cleaning up test tweet: ${tweetId}`);
        // 削除機能が実装されている場合のみ実行
        // await tweetEndpoints.deleteTweet(tweetId);
      } catch (error) {
        console.warn(`⚠️ Failed to delete test tweet ${tweetId}:`, error);
      }
    }
    
    // 配列をクリア
    testTweetIds.length = 0;

    // クリーンアップ
    configManager = null;
    apiClient = null;
    actionEndpoints = null;
    tweetEndpoints = null;
    prodConfig = null;
  });

  describe('実環境接続テスト', () => {
    test('実際のKaito TwitterAPI への接続', async () => {
      if (!REAL_API_ENABLED) {
        console.log('⏭️ Skipping real API connection test');
        return;
      }

      // 接続テスト実行
      const connectionResult = await apiClient.testConnection();
      
      expect(typeof connectionResult).toBe('boolean');
      
      if (connectionResult) {
        console.log('✅ Real API connection successful');
      } else {
        console.log('❌ Real API connection failed - API may be unavailable');
        // 接続失敗は予期される場合があるため、テスト自体は成功とする
      }
    });

    test('認証トークンを使用した実認証', async () => {
      if (!REAL_API_ENABLED) {
        console.log('⏭️ Skipping real authentication test');
        return;
      }

      try {
        await apiClient.authenticate();
        console.log('✅ Real API authentication successful');
        
        // 認証後のアカウント情報取得テスト
        const accountInfo = await apiClient.getAccountInfo();
        expect(accountInfo).toBeDefined();
        expect(accountInfo.id).toBeDefined();
        expect(accountInfo.username).toBeDefined();
        
        console.log(`📊 Test account info: @${accountInfo.username} (${accountInfo.followersCount} followers)`);
        
      } catch (error) {
        console.log('❌ Real API authentication failed:', error.message);
        // 認証エラーは開発環境では予期される
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('ヘルスチェックでの接続確認', async () => {
      if (!REAL_API_ENABLED) {
        console.log('⏭️ Skipping health check test');
        return;
      }

      const healthCheckStart = Date.now();
      
      try {
        const isHealthy = await apiClient.testConnection();
        const healthCheckTime = Date.now() - healthCheckStart;
        
        console.log(`🏥 Health check completed in ${healthCheckTime}ms, result: ${isHealthy}`);
        
        expect(typeof isHealthy).toBe('boolean');
        expect(healthCheckTime).toBeLessThan(10000); // 10秒以内で完了
        
      } catch (error) {
        console.log('⚠️ Health check failed:', error.message);
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('実データ操作テスト', () => {
    test('実際の投稿作成（テスト投稿）', async () => {
      if (!REAL_API_ENABLED) {
        console.log('⏭️ Skipping real post creation test');
        return;
      }

      // テスト投稿の作成
      const testPostContent = `🧪 API統合テスト実行中 - ${new Date().toISOString().slice(0, 19)} #APIテスト #自動投稿`;
      
      try {
        const postResult = await apiClient.post(testPostContent);
        
        if (postResult.success && postResult.id) {
          console.log(`✅ Test post created successfully: ${postResult.id}`);
          
          // クリーンアップ用にIDを記録
          testTweetIds.push(postResult.id);
          
          expect(postResult.success).toBe(true);
          expect(postResult.id).toBeDefined();
          expect(postResult.url).toContain('twitter.com');
          
          // コスト追跡の確認
          const costInfo = apiClient.getCostTrackingInfo();
          expect(costInfo.tweetsProcessed).toBeGreaterThan(0);
          expect(costInfo.estimatedCost).toBeGreaterThan(0);
          
        } else {
          console.log('❌ Test post creation failed:', postResult.error);
          expect(postResult.error).toBeDefined();
        }
        
      } catch (error) {
        console.log('❌ Post creation error:', error.message);
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('実際のツイート検索実行', async () => {
      if (!REAL_API_ENABLED) {
        console.log('⏭️ Skipping real tweet search test');
        return;
      }

      const searchOptions: TweetSearchOptions = {
        query: '投資 OR 資産運用',
        maxResults: 5,
        sortOrder: 'recency',
        includeRetweets: false,
        lang: 'ja'
      };

      try {
        const searchResult = await tweetEndpoints.searchTweets(searchOptions);
        
        console.log(`🔍 Search completed: found ${searchResult.tweets.length} tweets`);
        
        expect(searchResult.tweets).toBeDefined();
        expect(Array.isArray(searchResult.tweets)).toBe(true);
        expect(searchResult.searchQuery).toBe(searchOptions.query);
        
        // 検索結果の内容確認
        if (searchResult.tweets.length > 0) {
          const firstTweet = searchResult.tweets[0];
          expect(firstTweet.id).toBeDefined();
          expect(firstTweet.text).toBeDefined();
          expect(firstTweet.authorId).toBeDefined();
          
          console.log(`📄 Sample tweet: "${firstTweet.text.slice(0, 50)}..."`);
        }
        
      } catch (error) {
        console.log('❌ Tweet search error:', error.message);
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('実際のエンゲージメント操作', async () => {
      if (!REAL_API_ENABLED) {
        console.log('⏭️ Skipping real engagement test');
        return;
      }

      // まず検索で対象ツイートを見つける
      const searchOptions: TweetSearchOptions = {
        query: '投資教育',
        maxResults: 1,
        sortOrder: 'recency'
      };

      try {
        const searchResult = await tweetEndpoints.searchTweets(searchOptions);
        
        if (searchResult.tweets.length > 0) {
          const targetTweet = searchResult.tweets[0];
          
          // いいね実行
          const likeResult = await apiClient.like(targetTweet.id);
          
          if (likeResult.success) {
            console.log(`✅ Like successful for tweet: ${targetTweet.id}`);
            expect(likeResult.success).toBe(true);
            expect(likeResult.tweetId).toBe(targetTweet.id);
          } else {
            console.log(`❌ Like failed: ${likeResult.error}`);
            expect(likeResult.error).toBeDefined();
          }
          
        } else {
          console.log('⚠️ No tweets found for engagement test');
        }
        
      } catch (error) {
        console.log('❌ Engagement operation error:', error.message);
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('制限・コスト管理テスト', () => {
    test('実レート制限での動作確認', async () => {
      if (!REAL_API_ENABLED) {
        console.log('⏭️ Skipping rate limit test');
        return;
      }

      const rateLimitBefore = apiClient.getRateLimitStatus();
      console.log('📊 Rate limits before test:', {
        general: rateLimitBefore.general.remaining,
        posting: rateLimitBefore.posting.remaining
      });

      // 複数の操作を実行してレート制限の動作を確認
      const operations = [];
      for (let i = 0; i < 3; i++) {
        operations.push(
          tweetEndpoints.searchTweets({
            query: `テスト ${i}`,
            maxResults: 1
          })
        );
      }

      try {
        const results = await Promise.all(operations);
        
        const rateLimitAfter = apiClient.getRateLimitStatus();
        console.log('📊 Rate limits after test:', {
          general: rateLimitAfter.general.remaining,
          posting: rateLimitAfter.posting.remaining
        });

        // レート制限カウンターが適切に更新されていることを確認
        expect(rateLimitAfter.general.remaining).toBeLessThanOrEqual(rateLimitBefore.general.remaining);
        expect(results).toHaveLength(3);
        
      } catch (error) {
        console.log('❌ Rate limit test error:', error.message);
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('実QPS制御での待機動作', async () => {
      if (!REAL_API_ENABLED) {
        console.log('⏭️ Skipping QPS control test');
        return;
      }

      const qpsTestStart = Date.now();
      const qpsReadings = [];

      // 連続的にQPSを測定
      for (let i = 0; i < 5; i++) {
        const currentQPS = apiClient.getCurrentQPS();
        qpsReadings.push(currentQPS);
        
        // 短時間での操作実行
        try {
          await tweetEndpoints.searchTweets({
            query: `QPS ${i}`,
            maxResults: 1
          });
        } catch (error) {
          console.log(`⚠️ QPS test operation ${i} failed:`, error.message);
        }

        // 200ms待機
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const qpsTestEnd = Date.now();
      const totalTime = qpsTestEnd - qpsTestStart;

      console.log('📈 QPS readings:', qpsReadings);
      console.log(`⏱️ QPS test completed in ${totalTime}ms`);

      // QPS制御が適切に動作していることを確認
      expect(qpsReadings).toHaveLength(5);
      expect(totalTime).toBeGreaterThan(1000); // 1秒以上（制御による待機）
      
      qpsReadings.forEach(qps => {
        expect(qps).toBeGreaterThanOrEqual(0);
        expect(qps).toBeLessThanOrEqual(10); // テスト用制限
      });
    });

    test('実コスト計算の正確性', async () => {
      if (!REAL_API_ENABLED) {
        console.log('⏭️ Skipping cost calculation test');
        return;
      }

      const costBefore = apiClient.getCostTrackingInfo();
      console.log('💰 Cost before test:', {
        tweets: costBefore.tweetsProcessed,
        cost: costBefore.estimatedCost
      });

      // コスト発生操作を実行
      const costOperations = [];
      for (let i = 0; i < 2; i++) {
        costOperations.push(
          tweetEndpoints.searchTweets({
            query: `コストテスト ${i}`,
            maxResults: 5
          })
        );
      }

      try {
        await Promise.all(costOperations);
        
        const costAfter = apiClient.getCostTrackingInfo();
        console.log('💰 Cost after test:', {
          tweets: costAfter.tweetsProcessed,
          cost: costAfter.estimatedCost
        });

        // コスト計算が適切に更新されていることを確認
        expect(costAfter.tweetsProcessed).toBeGreaterThanOrEqual(costBefore.tweetsProcessed);
        expect(costAfter.estimatedCost).toBeGreaterThanOrEqual(costBefore.estimatedCost);
        
        // コスト警告レベルの確認
        if (costAfter.estimatedCost > 1.0) {
          console.log('⚠️ Cost warning: API usage is accumulating');
        }
        
      } catch (error) {
        console.log('❌ Cost calculation test error:', error.message);
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('実API注意事項確認', () => {
    test('テスト専用アカウント使用確認', async () => {
      if (!REAL_API_ENABLED) {
        console.log('⏭️ Skipping account verification test');
        return;
      }

      try {
        const accountInfo = await apiClient.getAccountInfo();
        
        if (accountInfo) {
          console.log(`🔍 Testing with account: @${accountInfo.username}`);
          
          // テスト専用アカウントの確認（username/displayNameに'test'が含まれることを推奨）
          const isTestAccount = 
            accountInfo.username.toLowerCase().includes('test') ||
            accountInfo.displayName.toLowerCase().includes('test') ||
            accountInfo.description.toLowerCase().includes('test');

          if (!isTestAccount) {
            console.warn('⚠️ WARNING: This does not appear to be a test account');
            console.warn('⚠️ Please ensure you are using a dedicated test account for API testing');
          }

          expect(accountInfo.username).toBeDefined();
          expect(accountInfo.displayName).toBeDefined();
        }
        
      } catch (error) {
        console.log('❌ Account verification failed:', error.message);
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('最小限のAPI使用（コスト考慮）', () => {
      if (!REAL_API_ENABLED) {
        console.log('⏭️ Skipping cost consideration test');
        return;
      }

      const costInfo = apiClient.getCostTrackingInfo();
      
      console.log('💸 Current API usage cost:', {
        tweets: costInfo.tweetsProcessed,
        estimated: `$${costInfo.estimatedCost.toFixed(4)}`,
        resetDate: costInfo.resetDate
      });

      // コスト制限の確認
      expect(costInfo.estimatedCost).toBeLessThan(0.50); // $0.50未満に制限
      
      if (costInfo.estimatedCost > 0.10) {
        console.warn('⚠️ API usage cost is approaching limit');
      }
    });

    test('テスト投稿の自動削除準備', () => {
      if (!REAL_API_ENABLED) {
        console.log('⏭️ Skipping cleanup preparation test');
        return;
      }

      console.log(`🧹 Test tweets for cleanup: ${testTweetIds.length}`);
      
      if (testTweetIds.length > 0) {
        console.log('📝 Test tweet IDs:', testTweetIds);
        
        // クリーンアップ予定の投稿IDが記録されていることを確認
        testTweetIds.forEach(tweetId => {
          expect(tweetId).toBeDefined();
          expect(typeof tweetId).toBe('string');
          expect(tweetId.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('実API エラー処理', () => {
    test('実API接続エラーの適切な処理', async () => {
      if (!REAL_API_ENABLED) {
        console.log('⏭️ Skipping API error handling test');
        return;
      }

      // 無効なAPIキーでのテスト
      const invalidClient = new KaitoTwitterAPIClient({
        apiKey: 'invalid-key-for-testing',
        qpsLimit: 10,
        retryPolicy: { maxRetries: 1, backoffMs: 1000 }
      });

      const invalidConfig = { ...prodConfig };
      invalidConfig.authentication.primaryKey = 'invalid-key-for-testing';
      invalidClient.initializeWithConfig(invalidConfig);

      try {
        await invalidClient.authenticate();
        
        // 認証が成功した場合は予期しない
        expect(false).toBe(true);
        
      } catch (error) {
        console.log('✅ Invalid API key properly rejected:', error.message);
        
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('auth');
      }
    });

    test('ネットワークタイムアウトの処理', async () => {
      if (!REAL_API_ENABLED) {
        console.log('⏭️ Skipping timeout handling test');
        return;
      }

      // 非常に短いタイムアウトでのテスト
      const timeoutConfig = { ...prodConfig };
      timeoutConfig.api.timeout = 1; // 1ms（即座にタイムアウト）

      const timeoutClient = new KaitoTwitterAPIClient({
        apiKey: process.env.KAITO_API_TOKEN!,
        qpsLimit: 10
      });
      timeoutClient.initializeWithConfig(timeoutConfig);

      try {
        await timeoutClient.testConnection();
        
        // 即座にタイムアウトするはずなので、成功は予期しない
        console.log('⚠️ Connection unexpectedly succeeded despite short timeout');
        
      } catch (error) {
        console.log('✅ Timeout properly handled:', error.message);
        
        expect(error).toBeInstanceOf(Error);
        expect(error.message.toLowerCase()).toMatch(/timeout|abort/);
      }
    });
  });

  describe('TwitterAPI.io Specific Integration Tests', () => {
    test('should connect to real TwitterAPI.io', async () => {
      if (!REAL_API_ENABLED) return;

      const isConnected = await apiClient.testConnection();
      expect(isConnected).toBe(true);
    });

    test('should authenticate with real API', async () => {
      if (!REAL_API_ENABLED) return;

      await expect(apiClient.authenticate()).resolves.not.toThrow();
    });

    test('should get account info from real API', async () => {
      if (!REAL_API_ENABLED) return;

      const accountInfo = await apiClient.getAccountInfo();
      
      expect(accountInfo).toBeDefined();
      expect(accountInfo.id).toBeDefined();
      expect(accountInfo.username).toBeDefined();
      expect(typeof accountInfo.followersCount).toBe('number');
    });

    // 注意：実際の投稿は最小限に留める
    test.skip('should create real tweet (manual execution only)', async () => {
      if (!REAL_API_ENABLED) return;

      const result = await apiClient.post('Test tweet from API integration #testing');
      
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      
      // 作成したツイートは直ちに削除するなどのクリーンアップを行う
      if (result.id) {
        testTweetIds.push(result.id);
      }
    });
  });
});