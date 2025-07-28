/**
 * KaitoAPIユーティリティ関数 単体テスト
 * TASK-002: src/kaito-api/core/config.ts 単体テスト作成
 * 
 * テスト対象: ユーティリティ関数
 * - createDefaultConfig() - デフォルト設定生成
 * - validateKaitoConfig() - 設定検証
 * - buildApiEndpoint() - エンドポイントURL構築
 */

import { 
  createDefaultConfig, 
  validateKaitoConfig, 
  buildApiEndpoint 
} from '../../../src/kaito-api/core/config';
import { KaitoAPIConfig, EndpointConfig } from '../../../src/kaito-api/types';

describe('KaitoAPIユーティリティ関数', () => {
  const originalEnv = process.env;

  beforeEach(() => {
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
  // createDefaultConfig() テスト
  // ============================================================================

  describe('createDefaultConfig()', () => {
    test('デフォルト環境（dev）での設定生成', async () => {
      const config = await createDefaultConfig();
      
      expect(config).toBeDefined();
      expect(config.environment).toBe('dev'); // デフォルトはdev
      expect(config.api.baseUrl).toBe('https://dev-api.twitterapi.io');
      expect(config.api.version).toBe('v1.0');
    });

    test('明示的なdev環境設定', async () => {
      const config = await createDefaultConfig('dev');
      
      expect(config.environment).toBe('dev');
      expect(config.api.timeout).toBe(10000);
      expect(config.api.retryPolicy.maxRetries).toBe(5);
      expect(config.performance.qpsLimit).toBe(100);
      expect(config.monitoring.logLevel).toBe('debug');
    });

    test('staging環境設定', async () => {
      const config = await createDefaultConfig('staging');
      
      expect(config.environment).toBe('staging');
      expect(config.api.baseUrl).toBe('https://staging-api.twitterapi.io');
      expect(config.api.timeout).toBe(10000);
      expect(config.monitoring.logLevel).toBe('info');
    });

    test('prod環境設定', async () => {
      const config = await createDefaultConfig('prod');
      
      expect(config.environment).toBe('prod');
      expect(config.api.baseUrl).toBe('https://api.twitterapi.io');
      expect(config.api.timeout).toBe(5000);
      expect(config.api.retryPolicy.maxRetries).toBe(3);
      expect(config.performance.qpsLimit).toBe(200);
      expect(config.monitoring.logLevel).toBe('warn');
      expect(config.authentication.encryptionEnabled).toBe(true);
      expect(config.security.auditLoggingEnabled).toBe(true);
      expect(config.features.realApiEnabled).toBe(true);
    });

    test('設定の完全性確認', async () => {
      const config = await createDefaultConfig('dev');
      
      // 必須プロパティの存在確認
      expect(config.environment).toBeDefined();
      expect(config.api).toBeDefined();
      expect(config.authentication).toBeDefined();
      expect(config.performance).toBeDefined();
      expect(config.monitoring).toBeDefined();
      expect(config.security).toBeDefined();
      expect(config.features).toBeDefined();
      expect(config.metadata).toBeDefined();
      
      // API設定の詳細確認
      expect(config.api.baseUrl).toBeDefined();
      expect(config.api.version).toBeDefined();
      expect(config.api.timeout).toBeDefined();
      expect(config.api.retryPolicy).toBeDefined();
      
      // メタデータの確認
      expect(config.metadata.version).toBe('1.0.0');
      expect(config.metadata.updatedBy).toBe('KaitoAPIConfigManager');
      expect(config.metadata.checksum).toBeDefined();
      expect(config.metadata.lastUpdated).toBeDefined();
    });

    test('環境変数の影響確認', async () => {
      const testToken = 'custom-test-token-for-createdefaultconfig-32char-min';
      process.env.KAITO_API_TOKEN = testToken;
      
      const config = await createDefaultConfig('dev');
      
      expect(config.authentication.primaryKey).toBe(testToken);
    });

    test('環境変数なしでのキー生成', async () => {
      delete process.env.KAITO_API_TOKEN;
      
      const config = await createDefaultConfig('dev');
      
      expect(config.authentication.primaryKey).toBeDefined();
      expect(config.authentication.primaryKey.length).toBe(64);
      
      // 英数字のみ含む
      const validChars = /^[A-Za-z0-9]+$/;
      expect(validChars.test(config.authentication.primaryKey)).toBe(true);
    });

    test('複数回呼び出しでの独立性', async () => {
      delete process.env.KAITO_API_TOKEN; // ランダムキー生成を強制
      
      const config1 = await createDefaultConfig('dev');
      const config2 = await createDefaultConfig('dev');
      
      // 異なるインスタンスが生成される
      expect(config1).not.toBe(config2);
      
      // ランダム要素（キー）は異なる
      expect(config1.authentication.primaryKey).not.toBe(config2.authentication.primaryKey);
      expect(config1.security.encryptionKey).not.toBe(config2.security.encryptionKey);
      expect(config1.metadata.checksum).not.toBe(config2.metadata.checksum);
      
      // 基本設定は同じ
      expect(config1.environment).toBe(config2.environment);
      expect(config1.api.baseUrl).toBe(config2.api.baseUrl);
      expect(config1.api.timeout).toBe(config2.api.timeout);
    });

    test('並列呼び出しでの安全性', async () => {
      const configs = await Promise.all([
        createDefaultConfig('dev'),
        createDefaultConfig('staging'),
        createDefaultConfig('prod')
      ]);
      
      expect(configs).toHaveLength(3);
      expect(configs[0].environment).toBe('dev');
      expect(configs[1].environment).toBe('staging');
      expect(configs[2].environment).toBe('prod');
      
      // すべて有効な設定
      configs.forEach(config => {
        expect(config.api.baseUrl).toMatch(/^https:\/\//);
        expect(config.authentication.primaryKey.length).toBeGreaterThanOrEqual(32);
        expect(config.metadata.checksum).toBeDefined();
      });
    });
  });

  // ============================================================================
  // validateKaitoConfig() テスト
  // ============================================================================

  describe('validateKaitoConfig()', () => {
    test('有効な設定の検証成功', async () => {
      const config = await createDefaultConfig('dev');
      const validation = await validateKaitoConfig(config);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toEqual([]);
      expect(validation.environment).toBe('dev');
      expect(validation.validatedAt).toBeDefined();
    });

    test('prod環境設定の検証成功', async () => {
      const config = await createDefaultConfig('prod');
      const validation = await validateKaitoConfig(config);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.environment).toBe('prod');
    });

    test('API設定エラーの検証', async () => {
      const config = await createDefaultConfig('dev');
      config.api.baseUrl = 'http://insecure-url.com'; // HTTPS違反
      
      const validation = await validateKaitoConfig(config);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('API Base URLは必須でHTTPS形式である必要があります');
    });

    test('認証設定エラーの検証', async () => {
      const config = await createDefaultConfig('dev');
      config.authentication.primaryKey = 'short-key'; // 32文字未満
      
      const validation = await validateKaitoConfig(config);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('プライマリキーは32文字以上である必要があります');
    });

    test('本番環境特有のエラー検証', async () => {
      const config = await createDefaultConfig('prod');
      config.authentication.encryptionEnabled = false; // 本番環境で暗号化無効
      
      const validation = await validateKaitoConfig(config);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('本番環境では暗号化が必須です');
    });

    test('警告レベルの検証', async () => {
      const config = await createDefaultConfig('dev');
      config.api.timeout = 500; // 推奨範囲外
      config.performance.qpsLimit = 2000; // 推奨範囲外
      
      const validation = await validateKaitoConfig(config);
      
      expect(validation.isValid).toBe(true); // 警告はエラーではない
      expect(validation.warnings).toContain('APIタイムアウトが推奨範囲外です (1000-30000ms)');
      expect(validation.warnings).toContain('QPS制限が推奨範囲外です (1-1000)');
    });

    test('複合エラーの検証', async () => {
      const config = await createDefaultConfig('prod');
      config.api.baseUrl = ''; // 空のURL
      config.authentication.primaryKey = 'short'; // 短いキー
      config.authentication.encryptionEnabled = false; // 暗号化無効
      
      const validation = await validateKaitoConfig(config);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(3);
      expect(validation.errors).toContain('API Base URLは必須でHTTPS形式である必要があります');
      expect(validation.errors).toContain('プライマリキーは32文字以上である必要があります');
      expect(validation.errors).toContain('本番環境では暗号化が必須です');
    });

    test('検証結果の型確認', async () => {
      const config = await createDefaultConfig('dev');
      const validation = await validateKaitoConfig(config);
      
      expect(typeof validation.isValid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
      expect(typeof validation.validatedAt).toBe('string');
      expect(typeof validation.environment).toBe('string');
      
      // 日付形式の確認
      expect(new Date(validation.validatedAt)).toBeInstanceOf(Date);
      expect(isNaN(new Date(validation.validatedAt).getTime())).toBe(false);
    });

    test('独立した検証インスタンス', async () => {
      const config = await createDefaultConfig('dev');
      
      const validation1 = await validateKaitoConfig(config);
      const validation2 = await validateKaitoConfig(config);
      
      // 異なるタイムスタンプ
      expect(validation1.validatedAt).not.toBe(validation2.validatedAt);
      
      // 結果は同じ
      expect(validation1.isValid).toBe(validation2.isValid);
      expect(validation1.errors).toEqual(validation2.errors);
      expect(validation1.warnings).toEqual(validation2.warnings);
      expect(validation1.environment).toBe(validation2.environment);
    });
  });

  // ============================================================================
  // buildApiEndpoint() テスト
  // ============================================================================

  describe('buildApiEndpoint()', () => {
    let testConfig: KaitoAPIConfig;

    beforeEach(async () => {
      testConfig = await createDefaultConfig('dev');
    });

    test('基本的なエンドポイント構築', () => {
      const url = buildApiEndpoint(testConfig, 'tweet', 'create');
      
      expect(url).toBe('https://dev-api.twitterapi.io/v1.0/tweets');
    });

    test('パラメータありエンドポイント構築', () => {
      const url = buildApiEndpoint(testConfig, 'user', 'info', { userId: '12345' });
      
      expect(url).toBe('https://dev-api.twitterapi.io/v1.0/users/12345');
    });

    test('複数パラメータの置換', () => {
      const url = buildApiEndpoint(testConfig, 'tweet', 'retweet', { 
        tweetId: 'tweet123'
      });
      
      expect(url).toBe('https://dev-api.twitterapi.io/v1.0/tweets/tweet123/retweet');
    });

    test('engagementエンドポイント', () => {
      const url = buildApiEndpoint(testConfig, 'engagement', 'like', { 
        tweetId: 'tweet456' 
      });
      
      expect(url).toBe('https://dev-api.twitterapi.io/v1.0/tweets/tweet456/like');
    });

    test('authエンドポイント', () => {
      const url = buildApiEndpoint(testConfig, 'auth', 'verify');
      
      expect(url).toBe('https://dev-api.twitterapi.io/v1.0/auth/verify');
    });

    test('異なる環境でのURL構築', async () => {
      const prodConfig = await createDefaultConfig('prod');
      const url = buildApiEndpoint(prodConfig, 'tweet', 'create');
      
      expect(url).toBe('https://api.twitterapi.io/v1.0/tweets');
    });

    test('staging環境でのURL構築', async () => {
      const stagingConfig = await createDefaultConfig('staging');
      const url = buildApiEndpoint(stagingConfig, 'user', 'search');
      
      expect(url).toBe('https://staging-api.twitterapi.io/v1.0/users/search');
    });

    test('不正なカテゴリでのエラー', () => {
      expect(() => {
        buildApiEndpoint(testConfig, 'invalid' as keyof EndpointConfig, 'test');
      }).toThrow('無効なカテゴリーです: invalid');
    });

    test('存在しないエンドポイントでのエラー', () => {
      expect(() => {
        buildApiEndpoint(testConfig, 'user', 'nonexistent');
      }).toThrow('エンドポイントが見つかりません: user.nonexistent');
    });

    test('パラメータなしでの構築', () => {
      const url = buildApiEndpoint(testConfig, 'tweet', 'search');
      
      expect(url).toBe('https://dev-api.twitterapi.io/v1.0/tweets/search');
    });

    test('空のパラメータオブジェクトでの構築', () => {
      const url = buildApiEndpoint(testConfig, 'tweet', 'create', {});
      
      expect(url).toBe('https://dev-api.twitterapi.io/v1.0/tweets');
    });

    test('存在しないパラメータの無視', () => {
      const url = buildApiEndpoint(testConfig, 'tweet', 'create', { 
        nonexistentParam: 'value' 
      });
      
      expect(url).toBe('https://dev-api.twitterapi.io/v1.0/tweets');
    });

    test('特殊文字を含むパラメータ', () => {
      const url = buildApiEndpoint(testConfig, 'user', 'info', { 
        userId: 'user@123.com' 
      });
      
      expect(url).toBe('https://dev-api.twitterapi.io/v1.0/users/user@123.com');
    });

    test('空文字列パラメータ', () => {
      const url = buildApiEndpoint(testConfig, 'user', 'info', { 
        userId: '' 
      });
      
      expect(url).toBe('https://dev-api.twitterapi.io/v1.0/users/');
    });

    test('数値パラメータの処理', () => {
      const url = buildApiEndpoint(testConfig, 'user', 'info', { 
        userId: '123456' 
      });
      
      expect(url).toBe('https://dev-api.twitterapi.io/v1.0/users/123456');
    });
  });

  // ============================================================================
  // 統合ユーティリティテスト
  // ============================================================================

  describe('統合ユーティリティテスト', () => {
    test('createDefaultConfig → validateKaitoConfig フロー', async () => {
      const config = await createDefaultConfig('prod');
      const validation = await validateKaitoConfig(config);
      
      expect(validation.isValid).toBe(true);
      expect(validation.environment).toBe('prod');
    });

    test('createDefaultConfig → buildApiEndpoint フロー', async () => {
      const config = await createDefaultConfig('staging');
      const url = buildApiEndpoint(config, 'engagement', 'bookmark', { 
        tweetId: 'tweet789' 
      });
      
      expect(url).toBe('https://staging-api.twitterapi.io/v1.0/tweets/tweet789/bookmark');
    });

    test('全ユーティリティの統合テスト', async () => {
      // 設定生成
      const config = await createDefaultConfig('dev');
      
      // 設定検証
      const validation = await validateKaitoConfig(config);
      expect(validation.isValid).toBe(true);
      
      // エンドポイント構築
      const tweetUrl = buildApiEndpoint(config, 'tweet', 'create');
      const userUrl = buildApiEndpoint(config, 'user', 'info', { userId: 'testuser' });
      const likeUrl = buildApiEndpoint(config, 'engagement', 'like', { tweetId: 'testtweet' });
      
      expect(tweetUrl).toBe('https://dev-api.twitterapi.io/v1.0/tweets');
      expect(userUrl).toBe('https://dev-api.twitterapi.io/v1.0/users/testuser');
      expect(likeUrl).toBe('https://dev-api.twitterapi.io/v1.0/tweets/testtweet/like');
    });

    test('エラー設定での統合テスト', async () => {
      const config = await createDefaultConfig('dev');
      config.api.baseUrl = 'invalid-url'; // 不正なURL
      
      // 検証でエラーが検出される
      const validation = await validateKaitoConfig(config);
      expect(validation.isValid).toBe(false);
      
      // エンドポイント構築は動作する（検証とは独立）
      const url = buildApiEndpoint(config, 'tweet', 'create');
      expect(url).toBe('invalid-url/v1.0/tweets');
    });

    test('パフォーマンステスト', async () => {
      const startTime = Date.now();
      
      // 並列で複数のユーティリティ操作
      const results = await Promise.all([
        createDefaultConfig('dev'),
        createDefaultConfig('staging'),
        createDefaultConfig('prod'),
      ]);
      
      const configs = results;
      const validations = await Promise.all(
        configs.map(config => validateKaitoConfig(config))
      );
      
      const urls = configs.map(config => 
        buildApiEndpoint(config, 'tweet', 'create')
      );
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(2000); // 2秒以内
      expect(configs).toHaveLength(3);
      expect(validations).toHaveLength(3);
      expect(urls).toHaveLength(3);
      
      // すべての検証が成功
      expect(validations.every(v => v.isValid)).toBe(true);
      
      // URLが正しく構築される
      expect(urls[0]).toContain('dev-api');
      expect(urls[1]).toContain('staging-api');
      expect(urls[2]).toContain('api.twitterapi.io');
    });
  });
});