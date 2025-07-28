/**
 * KaitoAPI設定管理 統合テスト
 * TASK-002: src/kaito-api/core/config.ts 単体テスト作成
 * 
 * メインテストスイート: 全機能の統合テスト
 * - KaitoAPIConfigManagerクラス統合テスト
 * - ユーティリティ関数統合テスト
 * - エラーハンドリング統合テスト
 * - パフォーマンス・品質統合テスト
 */

import { 
  KaitoAPIConfigManager,
  createDefaultConfig,
  validateKaitoConfig,
  buildApiEndpoint
} from '../../../src/kaito-api/core/config';
import { KaitoAPIConfig, ConfigValidationResult, EndpointConfig } from '../../../src/kaito-api/types';

describe('KaitoAPI設定管理 統合テスト', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 環境変数をモック化
    process.env = { 
      ...originalEnv,
      KAITO_API_TOKEN: 'test-token-for-integration-testing-32-char-length-required'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ============================================================================
  // KaitoAPIConfigManager統合テスト
  // ============================================================================

  describe('KaitoAPIConfigManager統合テスト', () => {
    let configManager: KaitoAPIConfigManager;

    beforeEach(() => {
      configManager = new KaitoAPIConfigManager();
    });

    test('完全なワークフロー実行（dev環境）', async () => {
      // 1. 設定生成
      const config = await configManager.generateConfig('dev');
      expect(config.environment).toBe('dev');
      
      // 2. 設定検証
      const validation = await configManager.validateConfig();
      expect(validation.isValid).toBe(true);
      expect(validation.environment).toBe('dev');
      
      // 3. エンドポイントURL構築
      const tweetUrl = configManager.buildEndpointUrl('tweet', 'create');
      expect(tweetUrl).toBe('https://dev-api.twitterapi.io/v1.0/tweets');
      
      // 4. 設定取得
      const retrievedConfig = configManager.getCurrentConfig();
      expect(retrievedConfig).toEqual(config);
    });

    test('完全なワークフロー実行（prod環境）', async () => {
      // 1. 設定生成
      const config = await configManager.generateConfig('prod');
      expect(config.environment).toBe('prod');
      expect(config.authentication.encryptionEnabled).toBe(true);
      expect(config.features.realApiEnabled).toBe(true);
      
      // 2. 設定検証
      const validation = await configManager.validateConfig();
      expect(validation.isValid).toBe(true);
      expect(validation.environment).toBe('prod');
      
      // 3. 複数エンドポイントURL構築
      const urls = {
        tweet: configManager.buildEndpointUrl('tweet', 'create'),
        user: configManager.buildEndpointUrl('user', 'info', { userId: '123' }),
        like: configManager.buildEndpointUrl('engagement', 'like', { tweetId: '456' }),
        auth: configManager.buildEndpointUrl('auth', 'verify')
      };
      
      expect(urls.tweet).toBe('https://api.twitterapi.io/v1.0/tweets');
      expect(urls.user).toBe('https://api.twitterapi.io/v1.0/users/123');
      expect(urls.like).toBe('https://api.twitterapi.io/v1.0/tweets/456/like');
      expect(urls.auth).toBe('https://api.twitterapi.io/v1.0/auth/verify');
    });

    test('環境切り替えワークフロー', async () => {
      // dev → staging → prod の順で環境切り替え
      const configs = [];
      const validations = [];
      
      for (const env of ['dev', 'staging', 'prod'] as const) {
        const config = await configManager.generateConfig(env);
        const validation = await configManager.validateConfig();
        
        configs.push(config);
        validations.push(validation);
        
        expect(config.environment).toBe(env);
        expect(validation.isValid).toBe(true);
        expect(validation.environment).toBe(env);
      }
      
      // 最終的にprod設定が保持されている
      const currentConfig = configManager.getCurrentConfig();
      expect(currentConfig?.environment).toBe('prod');
    });

    test('エラー回復ワークフロー', async () => {
      // 1. 正常な設定生成
      const validConfig = await configManager.generateConfig('dev');
      expect(configManager.getCurrentConfig()).not.toBeNull();
      
      // 2. 不正な設定での検証
      const invalidConfig = { ...validConfig };
      invalidConfig.api.baseUrl = 'http://insecure'; // HTTPS違反
      
      const validation = await configManager.validateConfig(invalidConfig);
      expect(validation.isValid).toBe(false);
      
      // 3. 現在の設定は正常なまま保持
      const currentConfig = configManager.getCurrentConfig();
      expect(currentConfig?.api.baseUrl).toBe('https://dev-api.twitterapi.io');
      
      // 4. URL構築も正常に動作
      const url = configManager.buildEndpointUrl('tweet', 'create');
      expect(url).toBe('https://dev-api.twitterapi.io/v1.0/tweets');
    });

    test('並列操作の安全性', async () => {
      // 複数の操作を並列実行
      const operations = await Promise.all([
        configManager.generateConfig('dev'),
        configManager.generateConfig('staging'),
        configManager.generateConfig('prod')
      ]);
      
      // 最後の設定（prod）が保持される
      const currentConfig = configManager.getCurrentConfig();
      expect(currentConfig?.environment).toBe('prod');
      
      // すべての操作が成功
      expect(operations).toHaveLength(3);
      operations.forEach((config, index) => {
        const environments = ['dev', 'staging', 'prod'];
        expect(config.environment).toBe(environments[index]);
      });
    });
  });

  // ============================================================================
  // ユーティリティ関数統合テスト
  // ============================================================================

  describe('ユーティリティ関数統合テスト', () => {
    test('createDefaultConfig + validateKaitoConfig 統合', async () => {
      // 全環境での設定生成と検証
      const environments: ('dev' | 'staging' | 'prod')[] = ['dev', 'staging', 'prod'];
      
      for (const env of environments) {
        const config = await createDefaultConfig(env);
        const validation = await validateKaitoConfig(config);
        
        expect(config.environment).toBe(env);
        expect(validation.isValid).toBe(true);
        expect(validation.environment).toBe(env);
        expect(validation.errors).toHaveLength(0);
      }
    });

    test('createDefaultConfig + buildApiEndpoint 統合', async () => {
      const config = await createDefaultConfig('staging');
      
      // 全カテゴリのエンドポイント構築
      const endpoints = {
        userInfo: buildApiEndpoint(config, 'user', 'info', { userId: '123' }),
        userSearch: buildApiEndpoint(config, 'user', 'search'),
        tweetCreate: buildApiEndpoint(config, 'tweet', 'create'),
        tweetRetweet: buildApiEndpoint(config, 'tweet', 'retweet', { tweetId: '456' }),
        engagementLike: buildApiEndpoint(config, 'engagement', 'like', { tweetId: '789' }),
        engagementBookmark: buildApiEndpoint(config, 'engagement', 'bookmark', { tweetId: '101' }),
        authVerify: buildApiEndpoint(config, 'auth', 'verify'),
        authRefresh: buildApiEndpoint(config, 'auth', 'refresh')
      };
      
      const baseUrl = 'https://staging-api.twitterapi.io/v1.0';
      expect(endpoints.userInfo).toBe(`${baseUrl}/users/123`);
      expect(endpoints.userSearch).toBe(`${baseUrl}/users/search`);
      expect(endpoints.tweetCreate).toBe(`${baseUrl}/tweets`);
      expect(endpoints.tweetRetweet).toBe(`${baseUrl}/tweets/456/retweet`);
      expect(endpoints.engagementLike).toBe(`${baseUrl}/tweets/789/like`);
      expect(endpoints.engagementBookmark).toBe(`${baseUrl}/tweets/101/bookmark`);
      expect(endpoints.authVerify).toBe(`${baseUrl}/auth/verify`);
      expect(endpoints.authRefresh).toBe(`${baseUrl}/auth/refresh`);
    });

    test('全ユーティリティ関数の組み合わせテスト', async () => {
      // 1. 設定生成
      const configs = await Promise.all([
        createDefaultConfig('dev'),
        createDefaultConfig('staging'),
        createDefaultConfig('prod')
      ]);
      
      // 2. 設定検証
      const validations = await Promise.all(
        configs.map(config => validateKaitoConfig(config))
      );
      
      // 3. エンドポイント構築
      const urls = configs.map(config => ({
        environment: config.environment,
        tweetCreate: buildApiEndpoint(config, 'tweet', 'create'),
        userInfo: buildApiEndpoint(config, 'user', 'info', { userId: 'testuser' })
      }));
      
      // 検証結果
      expect(validations.every(v => v.isValid)).toBe(true);
      
      // URL確認
      expect(urls[0].tweetCreate).toContain('dev-api.twitterapi.io');
      expect(urls[1].tweetCreate).toContain('staging-api.twitterapi.io');
      expect(urls[2].tweetCreate).toContain('api.twitterapi.io');
      
      urls.forEach(urlSet => {
        expect(urlSet.userInfo).toContain('/users/testuser');
      });
    });

    test('エラーケースでの統合動作', async () => {
      // 不正な設定を生成
      const config = await createDefaultConfig('prod');
      config.api.baseUrl = ''; // 空のURL
      config.authentication.primaryKey = 'short'; // 短いキー
      
      // 検証でエラーが検出される
      const validation = await validateKaitoConfig(config);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      
      // buildApiEndpointは設定に関係なく動作する
      expect(() => {
        buildApiEndpoint(config, 'tweet', 'create');
      }).not.toThrow();
    });
  });

  // ============================================================================
  // エラーハンドリング統合テスト
  // ============================================================================

  describe('エラーハンドリング統合テスト', () => {
    test('設定生成エラーの伝播', async () => {
      const configManager = new KaitoAPIConfigManager();
      
      // Math.randomをモックしてエラーを発生させる
      const originalRandom = Math.random;
      Math.random = jest.fn(() => {
        throw new Error('Random generation failed');
      });
      
      try {
        await expect(configManager.generateConfig('dev')).rejects.toThrow();
        
        // エラー後の状態確認
        expect(configManager.getCurrentConfig()).toBeNull();
        
        // URL構築でエラー
        expect(() => {
          configManager.buildEndpointUrl('tweet', 'create');
        }).toThrow('設定が初期化されていません');
        
      } finally {
        Math.random = originalRandom;
      }
    });

    test('検証エラーでの状態保持', async () => {
      const configManager = new KaitoAPIConfigManager();
      
      // 正常な設定生成
      const validConfig = await configManager.generateConfig('dev');
      expect(configManager.getCurrentConfig()).not.toBeNull();
      
      // 不正な設定での検証エラー
      const invalidConfig = { ...validConfig };
      invalidConfig.api.baseUrl = 'invalid';
      
      const validation = await configManager.validateConfig(invalidConfig);
      expect(validation.isValid).toBe(false);
      
      // 現在の設定は影響を受けない
      const currentConfig = configManager.getCurrentConfig();
      expect(currentConfig?.api.baseUrl).toBe('https://dev-api.twitterapi.io');
      
      // 正常な操作は継続可能
      const url = configManager.buildEndpointUrl('tweet', 'create');
      expect(url).toBe('https://dev-api.twitterapi.io/v1.0/tweets');
    });

    test('ユーティリティ関数エラーの独立性', async () => {
      // 有効な設定で開始
      const validConfig = await createDefaultConfig('dev');
      expect(await validateKaitoConfig(validConfig)).toMatchObject({ isValid: true });
      
      // 不正な設定でのエラー
      const invalidConfig = { ...validConfig };
      invalidConfig.api.baseUrl = '';
      
      const invalidValidation = await validateKaitoConfig(invalidConfig);
      expect(invalidValidation.isValid).toBe(false);
      
      // buildApiEndpointは独立して動作
      const url = buildApiEndpoint(invalidConfig, 'tweet', 'create');
      expect(url).toBe('/v1.0/tweets'); // 空のbaseURLでも構築は成功
      
      // 元の有効な設定は影響を受けない
      expect(await validateKaitoConfig(validConfig)).toMatchObject({ isValid: true });
    });

    test('並列エラーでの影響分離', async () => {
      const configManager = new KaitoAPIConfigManager();
      
      // 並列で正常・異常混在の操作
      const results = await Promise.allSettled([
        configManager.generateConfig('dev'),
        configManager.generateConfig('staging'),  
        Promise.reject(new Error('Simulated error')), // 人工的なエラー
        configManager.generateConfig('prod')
      ]);
      
      // 成功した操作の確認
      const successes = results.filter(r => r.status === 'fulfilled');
      const failures = results.filter(r => r.status === 'rejected');
      
      expect(successes).toHaveLength(3);
      expect(failures).toHaveLength(1);
      
      // 最後の成功した設定が保持される
      const currentConfig = configManager.getCurrentConfig();
      expect(currentConfig?.environment).toBe('prod');
    });

    test('リソースクリーンアップテスト', async () => {
      const managers = [];
      
      // 複数のConfigManagerインスタンス生成
      for (let i = 0; i < 10; i++) {
        const manager = new KaitoAPIConfigManager();
        await manager.generateConfig('dev');
        managers.push(manager);
      }
      
      // すべてのインスタンスが独立して動作
      managers.forEach((manager, index) => {
        const config = manager.getCurrentConfig();
        expect(config).not.toBeNull();
        expect(config?.environment).toBe('dev');
        
        const url = manager.buildEndpointUrl('tweet', 'create');
        expect(url).toContain('dev-api.twitterapi.io');
      });
    });
  });

  // ============================================================================
  // パフォーマンス・品質統合テスト
  // ============================================================================

  describe('パフォーマンス・品質統合テスト', () => {
    test('大量設定生成のパフォーマンス', async () => {
      const startTime = Date.now();
      const operations = [];
      
      // 100個の設定を並列生成
      for (let i = 0; i < 100; i++) {
        const env = ['dev', 'staging', 'prod'][i % 3] as 'dev' | 'staging' | 'prod';
        operations.push(createDefaultConfig(env));
      }
      
      const configs = await Promise.all(operations);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // 5秒以内
      expect(configs).toHaveLength(100);
      
      // すべて有効な設定
      const validations = await Promise.all(
        configs.map(config => validateKaitoConfig(config))
      );
      expect(validations.every(v => v.isValid)).toBe(true);
    });

    test('メモリ使用量テスト', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const configs = [];
      
      // 大量の設定オブジェクト生成
      for (let i = 0; i < 1000; i++) {
        const config = await createDefaultConfig('dev');
        configs.push(config);
      }
      
      const afterGeneration = process.memoryUsage().heapUsed;
      const memoryIncrease = afterGeneration - initialMemory;
      
      // メモリ使用量が合理的な範囲内
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB未満
      
      // 設定の品質確認
      expect(configs).toHaveLength(1000);
      expect(configs.every(c => c.environment === 'dev')).toBe(true);
    });

    test('同時実行数制限テスト', async () => {
      const managers = Array.from({ length: 50 }, () => new KaitoAPIConfigManager());
      
      const startTime = Date.now();
      
      // 50個のConfigManagerで同時に設定生成・検証・URL構築
      const results = await Promise.all(
        managers.map(async (manager) => {
          const config = await manager.generateConfig('prod');
          const validation = await manager.validateConfig();
          const url = manager.buildEndpointUrl('tweet', 'create');
          
          return { config, validation, url };
        })
      );
      
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(10000); // 10秒以内
      expect(results).toHaveLength(50);
      
      // すべての操作が成功
      results.forEach(result => {
        expect(result.config.environment).toBe('prod');
        expect(result.validation.isValid).toBe(true);
        expect(result.url).toBe('https://api.twitterapi.io/v1.0/tweets');
      });
    });

    test('データ一貫性保証テスト', async () => {
      delete process.env.KAITO_API_TOKEN; // ランダムキー生成を強制
      
      const configManager = new KaitoAPIConfigManager();
      const configs = [];
      
      // 順次設定生成
      for (let i = 0; i < 10; i++) {
        const config = await configManager.generateConfig('dev');
        configs.push(config);
      }
      
      // 各設定の一意性確認
      const primaryKeys = new Set(configs.map(c => c.authentication.primaryKey));
      const encryptionKeys = new Set(configs.map(c => c.security.encryptionKey));
      const checksums = new Set(configs.map(c => c.metadata.checksum));
      
      expect(primaryKeys.size).toBe(10); // すべて異なるキー
      expect(encryptionKeys.size).toBe(10); // すべて異なる暗号化キー
      expect(checksums.size).toBe(10); // すべて異なるチェックサム
      
      // 最後の設定が保持されている
      const currentConfig = configManager.getCurrentConfig();
      expect(currentConfig).toEqual(configs[configs.length - 1]);
    });

    test('エラー耐性テスト', async () => {
      const configManager = new KaitoAPIConfigManager();
      let successCount = 0;
      let errorCount = 0;
      
      // 意図的にエラーを混在させた操作
      for (let i = 0; i < 20; i++) {
        try {
          if (i % 5 === 0) {
            // 5回に1回エラーを発生
            throw new Error(`Simulated error ${i}`);
          } else {
            await configManager.generateConfig('dev');
            successCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }
      
      expect(successCount).toBe(16); // 20 - 4 (5回に1回 × 4回)
      expect(errorCount).toBe(4);
      
      // 最後の成功した設定が保持される
      const currentConfig = configManager.getCurrentConfig();
      expect(currentConfig?.environment).toBe('dev');
      
      // 正常な操作は継続可能
      const validation = await configManager.validateConfig();
      expect(validation.isValid).toBe(true);
    });
  });

  // ============================================================================
  // 回帰テスト
  // ============================================================================

  describe('回帰テスト', () => {
    test('環境別設定値の回帰確認', async () => {
      const configs = {
        dev: await createDefaultConfig('dev'),
        staging: await createDefaultConfig('staging'),
        prod: await createDefaultConfig('prod')
      };
      
      // dev環境の期待値
      expect(configs.dev.api.timeout).toBe(10000);
      expect(configs.dev.api.retryPolicy.maxRetries).toBe(5);
      expect(configs.dev.performance.qpsLimit).toBe(100);
      expect(configs.dev.monitoring.logLevel).toBe('debug');
      expect(configs.dev.features.realApiEnabled).toBe(false);
      
      // staging環境の期待値
      expect(configs.staging.api.timeout).toBe(10000);
      expect(configs.staging.monitoring.logLevel).toBe('info');
      
      // prod環境の期待値
      expect(configs.prod.api.timeout).toBe(5000);
      expect(configs.prod.api.retryPolicy.maxRetries).toBe(3);
      expect(configs.prod.performance.qpsLimit).toBe(200);
      expect(configs.prod.monitoring.logLevel).toBe('warn');
      expect(configs.prod.authentication.encryptionEnabled).toBe(true);
      expect(configs.prod.security.auditLoggingEnabled).toBe(true);
      expect(configs.prod.features.realApiEnabled).toBe(true);
    });

    test('エンドポイント構造の回帰確認', () => {
      const configManager = new KaitoAPIConfigManager();
      const endpointConfig = configManager.getEndpointConfig();
      
      // 既知のエンドポイント構造
      const expectedStructure = {
        user: ['info', 'follow', 'unfollow', 'search'],
        tweet: ['create', 'retweet', 'quote', 'search', 'delete'],
        engagement: ['like', 'unlike', 'bookmark', 'unbookmark'],
        auth: ['verify', 'refresh']
      };
      
      Object.entries(expectedStructure).forEach(([category, endpoints]) => {
        endpoints.forEach(endpoint => {
          expect(endpointConfig[category as keyof EndpointConfig]).toHaveProperty(endpoint);
        });
      });
      
      expect(endpointConfig).toHaveProperty('health');
    });

    test('検証ルールの回帰確認', async () => {
      const config = await createDefaultConfig('prod');
      
      // 既知の検証ルール
      const testCases = [
        { field: 'api.baseUrl', value: '', expectedError: 'API Base URLは必須でHTTPS形式である必要があります' },
        { field: 'api.baseUrl', value: 'http://test.com', expectedError: 'API Base URLは必須でHTTPS形式である必要があります' },
        { field: 'authentication.primaryKey', value: 'short', expectedError: 'プライマリキーは32文字以上である必要があります' },
        { field: 'authentication.encryptionEnabled', value: false, expectedError: '本番環境では暗号化が必須です' }
      ];
      
      for (const testCase of testCases) {
        const testConfig = { ...config };
        const fieldPath = testCase.field.split('.');
        let current = testConfig as any;
        
        for (let i = 0; i < fieldPath.length - 1; i++) {
          current = current[fieldPath[i]];
        }
        current[fieldPath[fieldPath.length - 1]] = testCase.value;
        
        const validation = await validateKaitoConfig(testConfig);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain(testCase.expectedError);
      }
    });
  });
});