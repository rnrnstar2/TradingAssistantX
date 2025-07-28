/**
 * TwitterAPI.io統合テスト実行スクリプト
 * 実際のTwitterAPI.ioとの統合動作を確認するテストランナー
 * 
 * 実行方法:
 * npm run test:integration
 * または
 * npx ts-node tests/kaito-api/run-integration-tests.ts
 * 
 * 環境変数:
 * KAITO_API_TOKEN - TwitterAPI.io APIキー
 */

import { KaitoTwitterAPIClient } from '../../src/kaito-api/core/client';
import { KaitoAPIConfigManager } from '../../src/kaito-api/core/config';
import { ActionEndpoints } from '../../src/kaito-api/endpoints/action-endpoints';
import { TweetEndpoints } from '../../src/kaito-api/endpoints/tweet-endpoints';
import type { KaitoAPIConfig, TweetSearchOptions } from '../../src/kaito-api/types';

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  details?: string;
  error?: string;
}

class IntegrationTestRunner {
  private client: KaitoTwitterAPIClient;
  private actionEndpoints: ActionEndpoints;
  private tweetEndpoints: TweetEndpoints;
  private configManager: KaitoAPIConfigManager;
  private config: KaitoAPIConfig;
  private results: TestResult[] = [];

  constructor() {
    this.configManager = new KaitoAPIConfigManager();
  }

  async initialize(): Promise<void> {
    console.log('🚀 TwitterAPI.io統合テスト初期化中...');
    
    // 環境変数チェック
    const apiKey = process.env.KAITO_API_TOKEN;
    if (!apiKey) {
      throw new Error('KAITO_API_TOKEN環境変数が設定されていません');
    }

    // 設定初期化
    this.config = await this.configManager.generateConfig('test');
    this.config.authentication.primaryKey = apiKey;
    this.config.features.realApiEnabled = true;
    this.config.features.mockFallbackEnabled = false;

    // クライアント初期化
    this.client = new KaitoTwitterAPIClient({
      apiKey: apiKey,
      qpsLimit: 10, // テスト用に控えめに設定
      retryPolicy: {
        maxRetries: 2,
        backoffMs: 2000
      },
      costTracking: true
    });
    this.client.initializeWithConfig(this.config);

    // エンドポイント初期化
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    this.actionEndpoints = new ActionEndpoints(this.config.api.baseUrl, headers);
    this.tweetEndpoints = new TweetEndpoints(this.config);

    console.log('✅ 初期化完了');
  }

  private async runTest(testName: string, testFn: () => Promise<void>): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`\n🧪 ${testName}...`);

    try {
      await testFn();
      const duration = Date.now() - startTime;
      console.log(`✅ ${testName} 成功 (${duration}ms)`);
      
      return {
        testName,
        success: true,
        duration,
        details: `完了時間: ${duration}ms`
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${testName} 失敗: ${errorMessage}`);
      
      return {
        testName,
        success: false,
        duration,
        error: errorMessage
      };
    }
  }

  async runConnectionTest(): Promise<void> {
    const result = await this.runTest('接続テスト', async () => {
      const connected = await this.client.testConnection();
      if (!connected) {
        throw new Error('TwitterAPI.ioへの接続に失敗しました');
      }
    });
    this.results.push(result);
  }

  async runAuthenticationTest(): Promise<void> {
    const result = await this.runTest('認証テスト', async () => {
      await this.client.authenticate();
    });
    this.results.push(result);
  }

  async runAccountInfoTest(): Promise<void> {
    const result = await this.runTest('アカウント情報取得テスト', async () => {
      const accountInfo = await this.client.getAccountInfo();
      if (!accountInfo.id || !accountInfo.username) {
        throw new Error('アカウント情報の取得に失敗しました');
      }
      console.log(`📊 アカウント: @${accountInfo.username}, フォロワー: ${accountInfo.followersCount}`);
    });
    this.results.push(result);
  }

  async runQPSControlTest(): Promise<void> {
    const result = await this.runTest('QPS制御テスト', async () => {
      const startTime = Date.now();
      const requests = [];
      
      // 連続リクエストでQPS制御を確認
      for (let i = 0; i < 3; i++) {
        requests.push(this.client.testConnection());
      }
      
      await Promise.all(requests);
      const duration = Date.now() - startTime;
      
      // QPS制御により適切な間隔が設けられていることを確認
      if (duration < 2100) { // 700ms * 3リクエスト = 2100ms最小
        throw new Error(`QPS制御が不十分です。実行時間: ${duration}ms (期待値: >=2100ms)`);
      }
      
      console.log(`⏱️ QPS制御確認: ${duration}ms (期待値: >=2100ms)`);
    });
    this.results.push(result);
  }

  async runCostTrackingTest(): Promise<void> {
    const result = await this.runTest('コスト追跡テスト', async () => {
      const initialCost = this.client.getCostTrackingInfo();
      
      // APIリクエスト実行
      await this.client.testConnection();
      await this.client.testConnection();
      
      const finalCost = this.client.getCostTrackingInfo();
      
      if (finalCost.tweetsProcessed <= initialCost.tweetsProcessed) {
        throw new Error('コスト追跡が正常に動作していません');
      }
      
      if (finalCost.estimatedCost <= initialCost.estimatedCost) {
        throw new Error('コスト計算が正常に動作していません');
      }
      
      console.log(`💰 コスト追跡: ${initialCost.estimatedCost.toFixed(4)} -> ${finalCost.estimatedCost.toFixed(4)} USD`);
    });
    this.results.push(result);
  }

  async runSearchTest(): Promise<void> {
    const result = await this.runTest('ツイート検索テスト', async () => {
      const searchOptions: TweetSearchOptions = {
        query: '投資 OR 資産運用',
        maxResults: 5,
        sortOrder: 'recency',
        includeRetweets: false,
        lang: 'ja'
      };

      const searchResult = await this.tweetEndpoints.searchTweets(searchOptions);
      
      if (!Array.isArray(searchResult.tweets)) {
        throw new Error('検索結果が正しい形式ではありません');
      }
      
      console.log(`🔍 検索結果: ${searchResult.tweets.length}件のツイートを取得`);
      
      if (searchResult.tweets.length > 0) {
        const firstTweet = searchResult.tweets[0];
        console.log(`📄 サンプル: "${firstTweet.text.slice(0, 50)}..."`);
      }
    });
    this.results.push(result);
  }

  async runPerformanceTest(): Promise<void> {
    const result = await this.runTest('パフォーマンステスト', async () => {
      const responseTimes: number[] = [];
      
      // 複数回のリクエストでレスポンス時間を測定
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await this.client.testConnection();
        const responseTime = Date.now() - start;
        responseTimes.push(responseTime);
      }
      
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      
      if (maxResponseTime > 5000) { // 5秒以上は異常
        throw new Error(`レスポンス時間が遅すぎます: 最大${maxResponseTime}ms`);
      }
      
      console.log(`📈 レスポンス時間: 平均${avgResponseTime.toFixed(0)}ms, 最大${maxResponseTime}ms`);
    });
    this.results.push(result);
  }

  async runErrorHandlingTest(): Promise<void> {
    const result = await this.runTest('エラーハンドリングテスト', async () => {
      // 無効なAPIキーでのテスト
      const invalidClient = new KaitoTwitterAPIClient({
        apiKey: 'invalid-key-for-testing',
        qpsLimit: 10
      });
      
      const invalidConfig = { ...this.config };
      invalidConfig.authentication.primaryKey = 'invalid-key-for-testing';
      invalidClient.initializeWithConfig(invalidConfig);

      try {
        await invalidClient.authenticate();
        throw new Error('無効なAPIキーで認証が成功してしまいました');
      } catch (error) {
        if (error instanceof Error && error.message.includes('無効なAPIキー')) {
          throw error; // 予期しないエラー
        }
        // 認証エラーは期待される動作
        console.log('🛡️ 無効なAPIキーが適切に拒否されました');
      }
    });
    this.results.push(result);
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TwitterAPI.io統合テスト結果');
    console.log('='.repeat(60));

    const successCount = this.results.filter(r => r.success).length;
    const totalCount = this.results.length;
    const successRate = (successCount / totalCount * 100).toFixed(1);

    console.log(`\n✅ 成功: ${successCount}/${totalCount} (${successRate}%)`);
    console.log(`❌ 失敗: ${totalCount - successCount}/${totalCount}`);

    // 詳細結果
    console.log('\n詳細結果:');
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${index + 1}. ${status} ${result.testName} (${duration})`);
      
      if (result.error) {
        console.log(`   エラー: ${result.error}`);
      }
      if (result.details) {
        console.log(`   詳細: ${result.details}`);
      }
    });

    // パフォーマンス統計
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = totalDuration / this.results.length;
    
    console.log('\nパフォーマンス統計:');
    console.log(`⏱️ 総実行時間: ${totalDuration}ms`);
    console.log(`📊 平均実行時間: ${avgDuration.toFixed(0)}ms`);

    // コスト情報
    const finalCost = this.client.getCostTrackingInfo();
    console.log('\nコスト情報:');
    console.log(`💰 推定コスト: $${finalCost.estimatedCost.toFixed(4)}`);
    console.log(`📊 処理ツイート数: ${finalCost.tweetsProcessed}`);

    console.log('\n' + '='.repeat(60));
    
    if (successCount === totalCount) {
      console.log('🎉 すべてのテストが成功しました！');
    } else {
      console.log('⚠️ 一部のテストが失敗しました。詳細を確認してください。');
    }
  }

  async run(): Promise<void> {
    try {
      await this.initialize();

      console.log('\n🧪 TwitterAPI.io統合テスト開始');
      console.log('テスト対象: TwitterAPI.io統合動作確認');
      console.log('実行時刻:', new Date().toISOString());

      // テスト実行
      await this.runConnectionTest();
      await this.runAuthenticationTest();
      await this.runAccountInfoTest();
      await this.runQPSControlTest();
      await this.runCostTrackingTest();
      await this.runSearchTest();
      await this.runPerformanceTest();
      await this.runErrorHandlingTest();

      this.printSummary();

      // 終了コード設定
      const allPassed = this.results.every(r => r.success);
      process.exit(allPassed ? 0 : 1);

    } catch (error) {
      console.error('❌ 統合テスト実行エラー:', error);
      process.exit(1);
    }
  }
}

// スクリプト実行
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  runner.run().catch(error => {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
  });
}

export { IntegrationTestRunner };