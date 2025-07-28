/**
 * KaitoAPI設定検証機能 単体テスト
 * TASK-002: src/kaito-api/core/config.ts 単体テスト作成
 * 
 * テスト対象: KaitoAPIConfigManagerの設定検証機能
 * - 正常な設定の検証テスト
 * - API設定エラー検証テスト
 * - 認証設定エラー検証テスト
 * - 警告レベル検証テスト
 */

import { KaitoAPIConfigManager } from '../../../src/kaito-api/core/config';
import { KaitoAPIConfig, ConfigValidationResult } from '../../../src/kaito-api/types';

describe('KaitoAPI設定検証機能', () => {
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
  // 正常な設定の検証テスト
  // ============================================================================

  describe('正常な設定の検証', () => {
    test('有効な設定での検証成功（dev環境）', async () => {
      const config = await configManager.generateConfig('dev');
      const validation = await configManager.validateConfig(config);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.environment).toBe('dev');
      expect(validation.validatedAt).toBeDefined();
      expect(new Date(validation.validatedAt)).toBeInstanceOf(Date);
    });

    test('有効な設定での検証成功（staging環境）', async () => {
      const config = await configManager.generateConfig('staging');
      const validation = await configManager.validateConfig(config);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.environment).toBe('staging');
    });

    test('有効な設定での検証成功（prod環境）', async () => {
      const config = await configManager.generateConfig('prod');
      const validation = await configManager.validateConfig(config);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.environment).toBe('prod');
    });

    test('エラー・警告なしの確認', async () => {
      const config = await configManager.generateConfig('prod');
      const validation = await configManager.validateConfig(config);

      expect(validation.errors).toEqual([]);
      expect(validation.warnings).toEqual([]);
    });

    test('バリデーション結果の正確性', async () => {
      const config = await configManager.generateConfig('dev');
      const validation = await configManager.validateConfig(config);

      // 結果の構造確認
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');
      expect(validation).toHaveProperty('validatedAt');
      expect(validation).toHaveProperty('environment');

      // 型の確認
      expect(typeof validation.isValid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
      expect(typeof validation.validatedAt).toBe('string');
      expect(typeof validation.environment).toBe('string');
    });

    test('現在の設定での検証実行', async () => {
      await configManager.generateConfig('prod');
      const validation = await configManager.validateConfig(); // 引数なしで現在設定を検証

      expect(validation.isValid).toBe(true);
      expect(validation.environment).toBe('prod');
    });
  });

  // ============================================================================
  // API設定エラー検証テスト
  // ============================================================================

  describe('API設定エラー検証', () => {
    test('baseURLが空の場合', async () => {
      const config = await configManager.generateConfig('dev');
      config.api.baseUrl = '';

      const validation = await configManager.validateConfig(config);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('API Base URLは必須でHTTPS形式である必要があります');
    });

    test('HTTPS以外のURLの場合', async () => {
      const config = await configManager.generateConfig('dev');
      config.api.baseUrl = 'http://api.twitterapi.io'; // HTTP使用

      const validation = await configManager.validateConfig(config);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('API Base URLは必須でHTTPS形式である必要があります');
    });

    test('不正なタイムアウト値（範囲下限）', async () => {
      const config = await configManager.generateConfig('dev');
      config.api.timeout = 500; // 1000ms未満

      const validation = await configManager.validateConfig(config);

      expect(validation.warnings).toContain('APIタイムアウトが推奨範囲外です (1000-30000ms)');
    });

    test('不正なタイムアウト値（範囲上限）', async () => {
      const config = await configManager.generateConfig('dev');
      config.api.timeout = 35000; // 30000ms超過

      const validation = await configManager.validateConfig(config);

      expect(validation.warnings).toContain('APIタイムアウトが推奨範囲外です (1000-30000ms)');
    });

    test('範囲外のQPS設定（下限）', async () => {
      const config = await configManager.generateConfig('dev');
      config.performance.qpsLimit = 0; // 1未満

      const validation = await configManager.validateConfig(config);

      expect(validation.warnings).toContain('QPS制限が推奨範囲外です (1-1000)');
    });

    test('範囲外のQPS設定（上限）', async () => {
      const config = await configManager.generateConfig('dev');
      config.performance.qpsLimit = 1500; // 1000超過

      const validation = await configManager.validateConfig(config);

      expect(validation.warnings).toContain('QPS制限が推奨範囲外です (1-1000)');
    });
  });

  // ============================================================================
  // 認証設定エラー検証テスト
  // ============================================================================

  describe('認証設定エラー検証', () => {
    test('空のプライマリキー', async () => {
      const config = await configManager.generateConfig('dev');
      config.authentication.primaryKey = '';

      const validation = await configManager.validateConfig(config);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('プライマリキーは32文字以上である必要があります');
    });

    test('短すぎるキー（32文字未満）', async () => {
      const config = await configManager.generateConfig('dev');
      config.authentication.primaryKey = 'short-key-less-than-32-chars'; // 31文字

      const validation = await configManager.validateConfig(config);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('プライマリキーは32文字以上である必要があります');
    });

    test('32文字ちょうどのキー（境界値テスト）', async () => {
      const config = await configManager.generateConfig('dev');
      config.authentication.primaryKey = '12345678901234567890123456789012'; // 32文字

      const validation = await configManager.validateConfig(config);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).not.toContain('プライマリキーは32文字以上である必要があります');
    });

    test('本番環境での暗号化無効化', async () => {
      const config = await configManager.generateConfig('prod');
      config.authentication.encryptionEnabled = false;

      const validation = await configManager.validateConfig(config);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('本番環境では暗号化が必須です');
    });

    test('開発環境での暗号化無効化（許可される）', async () => {
      const config = await configManager.generateConfig('dev');
      config.authentication.encryptionEnabled = false;

      const validation = await configManager.validateConfig(config);

      expect(validation.errors).not.toContain('本番環境では暗号化が必須です');
    });

    test('staging環境での暗号化無効化（許可される）', async () => {
      const config = await configManager.generateConfig('staging');
      config.authentication.encryptionEnabled = false;

      const validation = await configManager.validateConfig(config);

      expect(validation.errors).not.toContain('本番環境では暗号化が必須です');
    });
  });

  // ============================================================================
  // 警告レベル検証テスト
  // ============================================================================

  describe('警告レベル検証', () => {
    test('推奨範囲外のタイムアウト（警告レベル）', async () => {
      const config = await configManager.generateConfig('dev');
      config.api.timeout = 500; // 推奨範囲外

      const validation = await configManager.validateConfig(config);

      expect(validation.isValid).toBe(true); // エラーではない
      expect(validation.warnings).toContain('APIタイムアウトが推奨範囲外です (1000-30000ms)');
    });

    test('異常なQPS設定（警告レベル）', async () => {
      const config = await configManager.generateConfig('dev');
      config.performance.qpsLimit = 2000; // 推奨範囲外

      const validation = await configManager.validateConfig(config);

      expect(validation.isValid).toBe(true); // エラーではない
      expect(validation.warnings).toContain('QPS制限が推奨範囲外です (1-1000)');
    });

    test('本番環境での監査ログ無効', async () => {
      const config = await configManager.generateConfig('prod');
      config.security.auditLoggingEnabled = false;

      const validation = await configManager.validateConfig(config);

      expect(validation.isValid).toBe(true); // エラーではない
      expect(validation.warnings).toContain('本番環境では監査ログが推奨されます');
    });

    test('開発環境での監査ログ無効（警告なし）', async () => {
      const config = await configManager.generateConfig('dev');
      config.security.auditLoggingEnabled = false;

      const validation = await configManager.validateConfig(config);

      expect(validation.warnings).not.toContain('本番環境では監査ログが推奨されます');
    });

    test('応答時間目標が長すぎる場合', async () => {
      const config = await configManager.generateConfig('dev');
      config.performance.responseTimeTarget = 3000; // 2000ms超過

      const validation = await configManager.validateConfig(config);

      expect(validation.isValid).toBe(true); // エラーではない
      expect(validation.warnings).toContain('応答時間目標が長すぎます (2000ms以下推奨)');
    });

    test('応答時間目標が適切な場合（境界値テスト）', async () => {
      const config = await configManager.generateConfig('dev');
      config.performance.responseTimeTarget = 2000; // 境界値

      const validation = await configManager.validateConfig(config);

      expect(validation.warnings).not.toContain('応答時間目標が長すぎます (2000ms以下推奨)');
    });
  });

  // ============================================================================
  // 複合エラーテスト
  // ============================================================================

  describe('複合エラーテスト', () => {
    test('複数のエラーが同時に発生', async () => {
      const config = await configManager.generateConfig('prod');
      config.api.baseUrl = 'http://invalid-url'; // HTTPS違反
      config.authentication.primaryKey = 'short'; // 32文字未満
      config.authentication.encryptionEnabled = false; // 本番環境で暗号化無効

      const validation = await configManager.validateConfig(config);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(3);
      expect(validation.errors).toContain('API Base URLは必須でHTTPS形式である必要があります');
      expect(validation.errors).toContain('プライマリキーは32文字以上である必要があります');
      expect(validation.errors).toContain('本番環境では暗号化が必須です');
    });

    test('エラーと警告が同時に発生', async () => {
      const config = await configManager.generateConfig('prod');
      config.api.baseUrl = ''; // エラー: 空のURL
      config.api.timeout = 500; // 警告: 推奨範囲外
      config.security.auditLoggingEnabled = false; // 警告: 本番環境で監査ログ無効

      const validation = await configManager.validateConfig(config);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.warnings).toHaveLength(2);
      expect(validation.errors).toContain('API Base URLは必須でHTTPS形式である必要があります');
      expect(validation.warnings).toContain('APIタイムアウトが推奨範囲外です (1000-30000ms)');
      expect(validation.warnings).toContain('本番環境では監査ログが推奨されます');
    });
  });

  // ============================================================================
  // エラーハンドリングテスト
  // ============================================================================

  describe('エラーハンドリングテスト', () => {
    test('設定が読み込まれていない場合のエラー', async () => {
      await expect(configManager.validateConfig()).rejects.toThrow(
        '設定が読み込まれていません。generateConfig()を先に実行してください。'
      );
    });

    test('null設定での検証エラー', async () => {
      await expect(configManager.validateConfig(null as any)).rejects.toThrow(
        '設定が読み込まれていません。generateConfig()を先に実行してください。'
      );
    });

    test('undefined設定での検証エラー', async () => {
      await expect(configManager.validateConfig(undefined as any)).rejects.toThrow(
        '設定が読み込まれていません。generateConfig()を先に実行してください。'
      );
    });
  });

  // ============================================================================
  // パフォーマンステスト
  // ============================================================================

  describe('パフォーマンステスト', () => {
    test('大量検証の実行時間確認', async () => {
      const config = await configManager.generateConfig('dev');
      const startTime = Date.now();
      
      // 100回の検証実行
      const validations = await Promise.all(
        Array(100).fill(null).map(() => configManager.validateConfig(config))
      );
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(1000); // 1秒以内
      expect(validations).toHaveLength(100);
      expect(validations.every(v => v.isValid)).toBe(true);
    });

    test('異なる環境設定の順次検証', async () => {
      const devConfig = await configManager.generateConfig('dev');
      const stagingConfig = await configManager.generateConfig('staging');
      const prodConfig = await configManager.generateConfig('prod');

      const validations = await Promise.all([
        configManager.validateConfig(devConfig),
        configManager.validateConfig(stagingConfig),
        configManager.validateConfig(prodConfig)
      ]);

      expect(validations).toHaveLength(3);
      expect(validations.every(v => v.isValid)).toBe(true);
      expect(validations[0].environment).toBe('dev');
      expect(validations[1].environment).toBe('staging');
      expect(validations[2].environment).toBe('prod');
    });
  });
});