/**
 * KaitoAPIConfigManager 単体テスト
 * TASK-002: src/kaito-api/core/config.ts 単体テスト作成
 * 
 * テスト対象: KaitoAPIConfigManagerクラスの基本機能
 * - 初期化テスト
 * - 環境別設定生成テスト（dev/staging/prod）
 * - エンドポイントURL構築テスト
 * - 現在設定取得テスト
 */

import { KaitoAPIConfigManager } from '../../../src/kaito-api/core/config';
import { KaitoAPIConfig, EndpointConfig } from '../../../src/kaito-api/types';

describe('KaitoAPIConfigManager', () => {
  let configManager: KaitoAPIConfigManager;
  const originalEnv = process.env;

  beforeEach(() => {
    configManager = new KaitoAPIConfigManager();
    // 環境変数をモック化
    process.env = { 
      ...originalEnv,
      KAITO_API_TOKEN: 'test-token-for-unit-testing-32-char-length-required'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ============================================================================
  // 初期化テスト
  // ============================================================================

  describe('初期化テスト', () => {
    test('正常な初期化', () => {
      expect(configManager).toBeInstanceOf(KaitoAPIConfigManager);
      expect(configManager.getCurrentConfig()).toBeNull();
    });

    test('エンドポイント設定の初期化確認', () => {
      const endpointConfig = configManager.getEndpointConfig();
      
      expect(endpointConfig).toBeDefined();
      expect(endpointConfig.user).toBeDefined();
      expect(endpointConfig.tweet).toBeDefined();
      expect(endpointConfig.engagement).toBeDefined();
      expect(endpointConfig.auth).toBeDefined();
      expect(typeof endpointConfig.health).toBe('string');
    });

    test('デフォルト状態の確認', () => {
      expect(configManager.getCurrentConfig()).toBeNull();
      
      const endpointConfig = configManager.getEndpointConfig();
      expect(endpointConfig.user.info).toBe('/users/{userId}');
      expect(endpointConfig.tweet.create).toBe('/tweets');
      expect(endpointConfig.engagement.like).toBe('/tweets/{tweetId}/like');
      expect(endpointConfig.auth.verify).toBe('/auth/verify');
      expect(endpointConfig.health).toBe('/health');
    });
  });

  // ============================================================================
  // 設定生成テスト（dev環境）
  // ============================================================================

  describe('設定生成テスト（dev環境）', () => {
    let devConfig: KaitoAPIConfig;

    beforeEach(async () => {
      devConfig = await configManager.generateConfig('dev');
    });

    test('dev環境設定の正確性', () => {
      expect(devConfig.environment).toBe('dev');
      expect(devConfig.metadata.version).toBe('1.0.0');
      expect(devConfig.metadata.updatedBy).toBe('KaitoAPIConfigManager');
    });

    test('APIベースURL確認', () => {
      expect(devConfig.api.baseUrl).toBe('https://dev-api.twitterapi.io');
      expect(devConfig.api.version).toBe('v1.0');
    });

    test('タイムアウト設定（10000ms）', () => {
      expect(devConfig.api.timeout).toBe(10000);
    });

    test('リトライ設定（最大5回）', () => {
      expect(devConfig.api.retryPolicy.maxRetries).toBe(5);
      expect(devConfig.api.retryPolicy.backoffMs).toBe(1000);
      expect(devConfig.api.retryPolicy.retryConditions).toEqual([
        '429', '500', '502', '503', '504', 'ECONNRESET', 'ETIMEDOUT'
      ]);
    });

    test('QPS制限（100）', () => {
      expect(devConfig.performance.qpsLimit).toBe(100);
      expect(devConfig.performance.responseTimeTarget).toBe(700);
    });

    test('ログレベル（debug）', () => {
      expect(devConfig.monitoring.logLevel).toBe('debug');
      expect(devConfig.monitoring.metricsEnabled).toBe(true);
    });

    test('モック有効化確認', () => {
      expect(devConfig.features.realApiEnabled).toBe(false);
      expect(devConfig.features.mockFallbackEnabled).toBe(true);
    });
  });

  // ============================================================================
  // 設定生成テスト（staging環境）
  // ============================================================================

  describe('設定生成テスト（staging環境）', () => {
    let stagingConfig: KaitoAPIConfig;

    beforeEach(async () => {
      stagingConfig = await configManager.generateConfig('staging');
    });

    test('staging環境設定の正確性', () => {
      expect(stagingConfig.environment).toBe('staging');
    });

    test('適切なAPI URL', () => {
      expect(stagingConfig.api.baseUrl).toBe('https://staging-api.twitterapi.io');
    });

    test('中間的な設定値確認', () => {
      expect(stagingConfig.api.timeout).toBe(10000);
      expect(stagingConfig.api.retryPolicy.maxRetries).toBe(5);
      expect(stagingConfig.performance.qpsLimit).toBe(100);
    });

    test('ログレベル（info）', () => {
      expect(stagingConfig.monitoring.logLevel).toBe('info');
      expect(stagingConfig.monitoring.alertingEnabled).toBe(false);
    });
  });

  // ============================================================================
  // 設定生成テスト（prod環境）
  // ============================================================================

  describe('設定生成テスト（prod環境）', () => {
    let prodConfig: KaitoAPIConfig;

    beforeEach(async () => {
      prodConfig = await configManager.generateConfig('prod');
    });

    test('prod環境設定の正確性', () => {
      expect(prodConfig.environment).toBe('prod');
    });

    test('本番API URL使用', () => {
      expect(prodConfig.api.baseUrl).toBe('https://api.twitterapi.io');
    });

    test('厳格なタイムアウト（5000ms）', () => {
      expect(prodConfig.api.timeout).toBe(5000);
    });

    test('制限されたリトライ回数（3回）', () => {
      expect(prodConfig.api.retryPolicy.maxRetries).toBe(3);
    });

    test('最大QPS（200）', () => {
      expect(prodConfig.performance.qpsLimit).toBe(200);
    });

    test('セキュリティ設定有効化', () => {
      expect(prodConfig.security.rateLimitEnabled).toBe(true);
      expect(prodConfig.security.ipWhitelist).toEqual([]);
    });

    test('暗号化有効化', () => {
      expect(prodConfig.authentication.encryptionEnabled).toBe(true);
      expect(prodConfig.security.encryptionKey).toBeDefined();
      expect(prodConfig.security.encryptionKey.length).toBe(64);
    });

    test('監査ログ有効化', () => {
      expect(prodConfig.security.auditLoggingEnabled).toBe(true);
      expect(prodConfig.monitoring.alertingEnabled).toBe(true);
    });

    test('実API有効化', () => {
      expect(prodConfig.features.realApiEnabled).toBe(true);
      expect(prodConfig.features.mockFallbackEnabled).toBe(false);
    });
  });

  // ============================================================================
  // エンドポイントURL構築テスト
  // ============================================================================

  describe('エンドポイントURL構築テスト', () => {
    beforeEach(async () => {
      await configManager.generateConfig('dev');
    });

    // 正常なURL構築
    describe('正常なURL構築', () => {
      test('userカテゴリのエンドポイント', () => {
        const url = configManager.buildEndpointUrl('user', 'info', { userId: '123' });
        expect(url).toBe('https://dev-api.twitterapi.io/v1.0/users/123');
      });

      test('tweetカテゴリのエンドポイント', () => {
        const url = configManager.buildEndpointUrl('tweet', 'create');
        expect(url).toBe('https://dev-api.twitterapi.io/v1.0/tweets');
      });

      test('engagementカテゴリのエンドポイント', () => {
        const url = configManager.buildEndpointUrl('engagement', 'like', { tweetId: '456' });
        expect(url).toBe('https://dev-api.twitterapi.io/v1.0/tweets/456/like');
      });

      test('authカテゴリのエンドポイント', () => {
        const url = configManager.buildEndpointUrl('auth', 'verify');
        expect(url).toBe('https://dev-api.twitterapi.io/v1.0/auth/verify');
      });

      test('healthエンドポイント', () => {
        const url = configManager.buildEndpointUrl('health' as keyof EndpointConfig, '' as string);
        expect(url).toBe('https://dev-api.twitterapi.io/v1.0/health');
      });
    });

    // パラメータ置換テスト
    describe('パラメータ置換テスト', () => {
      test('userIdパラメータ置換', () => {
        const url = configManager.buildEndpointUrl('user', 'info', { userId: 'testuser123' });
        expect(url).toBe('https://dev-api.twitterapi.io/v1.0/users/testuser123');
      });

      test('tweetIdパラメータ置換', () => {
        const url = configManager.buildEndpointUrl('tweet', 'retweet', { tweetId: 'tweet789' });
        expect(url).toBe('https://dev-api.twitterapi.io/v1.0/tweets/tweet789/retweet');
      });

      test('複数パラメータの同時置換', () => {
        // Note: 実際のエンドポイントでは複数パラメータはないが、機能テストとして実装
        const url = configManager.buildEndpointUrl('user', 'info', { 
          userId: 'user123', 
          additionalParam: 'value456' 
        });
        expect(url).toBe('https://dev-api.twitterapi.io/v1.0/users/user123');
      });

      test('パラメータなしURL構築', () => {
        const url = configManager.buildEndpointUrl('tweet', 'create');
        expect(url).toBe('https://dev-api.twitterapi.io/v1.0/tweets');
      });
    });

    // エラーケーステスト
    describe('エラーケーステスト', () => {
      test('不正なカテゴリ指定', () => {
        expect(() => {
          configManager.buildEndpointUrl('invalid' as keyof EndpointConfig, 'test');
        }).toThrow('無効なカテゴリーです: invalid');
      });

      test('存在しないエンドポイント', () => {
        expect(() => {
          configManager.buildEndpointUrl('user', 'nonexistent');
        }).toThrow('エンドポイントが見つかりません: user.nonexistent');
      });

      test('未初期化状態でのURL構築', () => {
        const newConfigManager = new KaitoAPIConfigManager();
        expect(() => {
          newConfigManager.buildEndpointUrl('user', 'info');
        }).toThrow('設定が初期化されていません');
      });
    });
  });

  // ============================================================================
  // 現在設定取得テスト
  // ============================================================================

  describe('現在設定取得テスト', () => {
    test('未初期化状態での設定取得', () => {
      const config = configManager.getCurrentConfig();
      expect(config).toBeNull();
    });

    test('設定生成後の設定取得', async () => {
      const originalConfig = await configManager.generateConfig('dev');
      const retrievedConfig = configManager.getCurrentConfig();
      
      expect(retrievedConfig).not.toBeNull();
      expect(retrievedConfig).toEqual(originalConfig);
      expect(retrievedConfig).not.toBe(originalConfig); // ディープコピー確認
    });

    test('複数環境の設定生成での最新設定取得', async () => {
      await configManager.generateConfig('dev');
      const prodConfig = await configManager.generateConfig('prod');
      const currentConfig = configManager.getCurrentConfig();
      
      expect(currentConfig?.environment).toBe('prod');
      expect(currentConfig).toEqual(prodConfig);
    });
  });

  // ============================================================================
  // エンドポイント設定取得テスト
  // ============================================================================

  describe('エンドポイント設定取得テスト', () => {
    test('エンドポイント設定の正確性', () => {
      const endpointConfig = configManager.getEndpointConfig();
      
      expect(endpointConfig.user.info).toBe('/users/{userId}');
      expect(endpointConfig.user.follow).toBe('/users/{userId}/follow');
      expect(endpointConfig.user.unfollow).toBe('/users/{userId}/unfollow');
      expect(endpointConfig.user.search).toBe('/users/search');
      
      expect(endpointConfig.tweet.create).toBe('/tweets');
      expect(endpointConfig.tweet.retweet).toBe('/tweets/{tweetId}/retweet');
      expect(endpointConfig.tweet.quote).toBe('/tweets/{tweetId}/quote');
      expect(endpointConfig.tweet.search).toBe('/tweets/search');
      expect(endpointConfig.tweet.delete).toBe('/tweets/{tweetId}');
      
      expect(endpointConfig.engagement.like).toBe('/tweets/{tweetId}/like');
      expect(endpointConfig.engagement.unlike).toBe('/tweets/{tweetId}/unlike');
      expect(endpointConfig.engagement.bookmark).toBe('/tweets/{tweetId}/bookmark');
      expect(endpointConfig.engagement.unbookmark).toBe('/tweets/{tweetId}/unbookmark');
      
      expect(endpointConfig.auth.verify).toBe('/auth/verify');
      expect(endpointConfig.auth.refresh).toBe('/auth/refresh');
      
      expect(endpointConfig.health).toBe('/health');
    });

    test('エンドポイント設定のディープコピー確認', () => {
      const endpointConfig1 = configManager.getEndpointConfig();
      const endpointConfig2 = configManager.getEndpointConfig();
      
      expect(endpointConfig1).toEqual(endpointConfig2);
      expect(endpointConfig1).not.toBe(endpointConfig2); // 異なるオブジェクト参照
    });
  });

  // ============================================================================
  // エラーハンドリングテスト
  // ============================================================================

  describe('エラーハンドリングテスト', () => {
    test('設定生成でのエラーハンドリング', async () => {
      // Math.randomをモックしてエラーを発生させる
      const originalRandom = Math.random;
      Math.random = jest.fn(() => {
        throw new Error('Random generation failed');
      });

      try {
        await expect(configManager.generateConfig('dev')).rejects.toThrow();
      } finally {
        Math.random = originalRandom;
      }
    });

    test('無効な環境での設定生成', async () => {
      // TypeScriptでは型チェックで防がれるが、実行時エラーテスト
      await expect(
        configManager.generateConfig('invalid' as 'dev' | 'staging' | 'prod')
      ).resolves.toBeDefined(); // 実際は正常に動作する（デフォルト値使用）
    });
  });
});