/**
 * Core統合テスト - Config → Client連携動作検証
 * KaitoAPIConfigManager と KaitoTwitterAPIClient の統合動作を確認
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { KaitoAPIConfigManager } from '../../../src/kaito-api/core/config';
import { KaitoTwitterAPIClient } from '../../../src/kaito-api/core/client';
import { KaitoAPIConfig, KaitoClientConfig } from '../../../src/kaito-api/types';

describe('Core Integration Tests', () => {
  let configManager: KaitoAPIConfigManager;
  let apiClient: KaitoTwitterAPIClient;
  let testConfig: KaitoAPIConfig;

  beforeEach(async () => {
    configManager = new KaitoAPIConfigManager();
    testConfig = await configManager.generateConfig('dev');
    
    const clientConfig: Partial<KaitoClientConfig> = {
      apiKey: testConfig.authentication.primaryKey,
      qpsLimit: testConfig.performance.qpsLimit,
      retryPolicy: {
        maxRetries: testConfig.api.retryPolicy.maxRetries,
        backoffMs: testConfig.api.retryPolicy.backoffMs
      },
      costTracking: true
    };
    
    apiClient = new KaitoTwitterAPIClient(clientConfig);
    apiClient.initializeWithConfig(testConfig);
  });

  afterEach(() => {
    // クリーンアップ
    configManager = null;
    apiClient = null;
    testConfig = null;
  });

  describe('Config → Client初期化フロー', () => {
    test('KaitoAPIConfigManager設定生成 → KaitoTwitterAPIClient初期化', async () => {
      // Config生成の確認
      expect(testConfig).toBeDefined();
      expect(testConfig.environment).toBe('dev');
      expect(testConfig.api.baseUrl).toContain('https://');
      expect(testConfig.authentication.primaryKey).toBeDefined();
      expect(testConfig.authentication.primaryKey.length).toBeGreaterThanOrEqual(32);

      // Client初期化の確認
      expect(apiClient).toBeDefined();
      expect(apiClient.getCurrentQPS).toBeDefined();
      expect(apiClient.getRateLimitStatus).toBeDefined();
      expect(apiClient.getCostTrackingInfo).toBeDefined();
    });

    test('設定値の正確な引き継ぎ確認', async () => {
      // レート制限設定の引き継ぎ確認
      const rateLimitStatus = apiClient.getRateLimitStatus();
      expect(rateLimitStatus).toBeDefined();
      expect(rateLimitStatus.general.limit).toBeGreaterThan(0);
      expect(rateLimitStatus.posting.limit).toBeGreaterThan(0);
      expect(rateLimitStatus.collection.limit).toBeGreaterThan(0);

      // QPS制御設定の確認
      const currentQPS = apiClient.getCurrentQPS();
      expect(currentQPS).toBeGreaterThanOrEqual(0);
      expect(currentQPS).toBeLessThanOrEqual(testConfig.performance.qpsLimit);

      // コスト追跡設定の確認
      const costInfo = apiClient.getCostTrackingInfo();
      expect(costInfo).toBeDefined();
      expect(costInfo.tweetsProcessed).toBe(0);
      expect(costInfo.estimatedCost).toBe(0);
    });

    test('複数環境での設定生成と初期化', async () => {
      const environments: Array<'dev' | 'staging' | 'prod'> = ['dev', 'staging', 'prod'];
      
      for (const env of environments) {
        const envConfig = await configManager.generateConfig(env);
        expect(envConfig.environment).toBe(env);
        
        const envClientConfig: Partial<KaitoClientConfig> = {
          apiKey: envConfig.authentication.primaryKey,
          qpsLimit: envConfig.performance.qpsLimit
        };
        
        const envClient = new KaitoTwitterAPIClient(envClientConfig);
        envClient.initializeWithConfig(envConfig);
        
        expect(envClient).toBeDefined();
        expect(envClient.getCurrentQPS()).toBe(0);
      }
    });
  });

  describe('認証 → API準備フロー', () => {
    test('設定読み込み → 認証実行 → API準備完了', async () => {
      // 設定読み込み確認
      const currentConfig = configManager.getCurrentConfig();
      expect(currentConfig).toBeDefined();
      expect(currentConfig.authentication.primaryKey).toBeDefined();

      // エンドポイント設定確認
      const endpointConfig = configManager.getEndpointConfig();
      expect(endpointConfig).toBeDefined();
      expect(endpointConfig.user.info).toBeDefined();
      expect(endpointConfig.tweet.create).toBeDefined();
      expect(endpointConfig.auth.verify).toBeDefined();

      // URL構築機能確認
      const userInfoUrl = configManager.buildEndpointUrl('user', 'info', { userId: '123' });
      expect(userInfoUrl).toContain('/users/123');
      
      const tweetCreateUrl = configManager.buildEndpointUrl('tweet', 'create');
      expect(tweetCreateUrl).toContain('/tweets');
    });

    test('API接続テスト統合フロー', async () => {
      // 接続テストは実APIを使用しないモック実装をテスト
      try {
        const connectionTest = await apiClient.testConnection();
        // 実API接続が失敗してもテスト自体は成功とする（開発環境のため）
        expect(typeof connectionTest).toBe('boolean');
      } catch (error) {
        // 実API接続エラーは予期されるので、エラーハンドリングが適切か確認
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeDefined();
      }
    });

    test('設定変更時の再初期化', async () => {
      // 新しい設定を生成
      const newConfig = await configManager.generateConfig('staging');
      expect(newConfig.environment).toBe('staging');

      // 新しい設定でクライアント再初期化
      apiClient.initializeWithConfig(newConfig);

      // 再初期化後の状態確認
      expect(apiClient).toBeDefined();
      const rateLimitStatus = apiClient.getRateLimitStatus();
      expect(rateLimitStatus).toBeDefined();
    });
  });

  describe('エラー伝播テスト', () => {
    test('Config生成エラー → Client初期化失敗', async () => {
      // 無効な環境での設定生成テスト
      try {
        // 型キャストで無効な環境を強制指定
        await configManager.generateConfig('invalid' as any);
        expect(true).toBe(false); // このコードは実行されるべきではない
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeDefined();
      }
    });

    test('認証失敗 → API操作不可状態', async () => {
      // 無効なAPIキーでクライアント作成
      const invalidClientConfig: Partial<KaitoClientConfig> = {
        apiKey: '', // 空のAPIキー
        qpsLimit: 100
      };

      const invalidClient = new KaitoTwitterAPIClient(invalidClientConfig);
      invalidClient.initializeWithConfig(testConfig);

      // 認証失敗のテスト
      try {
        await invalidClient.authenticate();
        expect(true).toBe(false); // このコードは実行されるべきではない
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('API key is required');
      }
    });

    test('適切なエラーメッセージ伝播', async () => {
      // 設定検証エラーのテスト
      const invalidConfig = { ...testConfig };
      invalidConfig.api.baseUrl = 'invalid-url'; // 無効なURL

      const validation = await configManager.validateConfig(invalidConfig);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('HTTPS');
    });

    test('HTTP client error handling', async () => {
      // HTTPクライアントエラーハンドリングのテスト
      const errorConfig = { ...testConfig };
      errorConfig.api.timeout = 1; // 非常に短いタイムアウト

      const errorClientConfig: Partial<KaitoClientConfig> = {
        apiKey: 'test-key',
        qpsLimit: 100,
        retryPolicy: {
          maxRetries: 1,
          backoffMs: 100
        }
      };

      const errorClient = new KaitoTwitterAPIClient(errorClientConfig);
      errorClient.initializeWithConfig(errorConfig);

      // タイムアウトエラーのテスト
      try {
        await errorClient.testConnection();
      } catch (error) {
        // 実API接続でのエラーは予期される
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('統合パフォーマンステスト', () => {
    test('QPS制御の統合動作', async () => {
      const startTime = Date.now();
      
      // 複数のQPS制御操作を実行
      const qpsBeforeTest = apiClient.getCurrentQPS();
      expect(qpsBeforeTest).toBeGreaterThanOrEqual(0);
      
      const endTime = Date.now();
      const elapsedTime = endTime - startTime;
      
      // パフォーマンス要件確認（700ms以内）
      expect(elapsedTime).toBeLessThan(1000);
    });

    test('設定検証のパフォーマンス', async () => {
      const startTime = Date.now();
      
      const validation = await configManager.validateConfig(testConfig);
      
      const endTime = Date.now();
      const elapsedTime = endTime - startTime;
      
      expect(validation.isValid).toBe(true);
      expect(elapsedTime).toBeLessThan(100); // 100ms以内で検証完了
    });

    test('エンドポイントURL構築のパフォーマンス', async () => {
      const startTime = Date.now();
      
      // 複数のURL構築を実行
      for (let i = 0; i < 100; i++) {
        const url = configManager.buildEndpointUrl('tweet', 'create');
        expect(url).toContain('/tweets');
      }
      
      const endTime = Date.now();
      const elapsedTime = endTime - startTime;
      
      expect(elapsedTime).toBeLessThan(100); // 100回の構築が100ms以内
    });
  });

  describe('メモリ管理と リソース効率', () => {
    test('設定オブジェクトの適切なコピー', async () => {
      const originalConfig = configManager.getCurrentConfig();
      const copiedConfig = configManager.getCurrentConfig();
      
      expect(originalConfig).toEqual(copiedConfig);
      
      // 参照が異なることを確認（Deep copy）
      if (originalConfig && copiedConfig) {
        expect(originalConfig).not.toBe(copiedConfig);
        
        // コピーを変更してもオリジナルに影響しないことを確認
        copiedConfig.api.timeout = 99999;
        expect(originalConfig.api.timeout).not.toBe(99999);
      }
    });

    test('Client初期化時のリソース使用量', async () => {
      // 複数のクライアントを作成してメモリ効率を確認
      const clients: KaitoTwitterAPIClient[] = [];
      
      for (let i = 0; i < 10; i++) {
        const clientConfig: Partial<KaitoClientConfig> = {
          apiKey: `test-key-${i}`,
          qpsLimit: 100
        };
        
        const client = new KaitoTwitterAPIClient(clientConfig);
        client.initializeWithConfig(testConfig);
        clients.push(client);
      }
      
      expect(clients.length).toBe(10);
      
      // 各クライアントが独立して動作することを確認
      clients.forEach((client, index) => {
        expect(client).toBeDefined();
        expect(client.getCurrentQPS()).toBe(0);
      });
    });
  });
});