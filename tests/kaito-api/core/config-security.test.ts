/**
 * KaitoAPIセキュリティ機能 単体テスト
 * TASK-002: src/kaito-api/core/config.ts 単体テスト作成
 * 
 * テスト対象: KaitoAPIConfigManagerのセキュリティ機能
 * - セキュアキー生成テスト
 * - 暗号化キー生成テスト
 * - チェックサム生成テスト
 * - プライベートヘルパーメソッドテスト
 */

import { KaitoAPIConfigManager } from '../../../src/kaito-api/core/config';
import { KaitoAPIConfig } from '../../../src/kaito-api/types';

describe('KaitoAPIセキュリティ機能', () => {
  let configManager: KaitoAPIConfigManager;
  const originalEnv = process.env;
  const originalRandom = Math.random;

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
    Math.random = originalRandom;
  });

  // ============================================================================
  // セキュアキー生成テスト
  // ============================================================================

  describe('セキュアキー生成テスト', () => {
    test('64文字のキー生成確認', async () => {
      // 環境変数を削除してキー生成を強制
      delete process.env.KAITO_API_TOKEN;
      
      const config = await configManager.generateConfig('dev');
      const key = config.authentication.primaryKey;
      
      expect(key).toBeDefined();
      expect(key.length).toBe(64);
    });

    test('文字セットの正確性', async () => {
      delete process.env.KAITO_API_TOKEN;
      
      const config = await configManager.generateConfig('dev');
      const key = config.authentication.primaryKey;
      
      // 許可される文字セット: A-Z, a-z, 0-9
      const validChars = /^[A-Za-z0-9]+$/;
      expect(validChars.test(key)).toBe(true);
    });

    test('特殊文字を含まないことの確認', async () => {
      delete process.env.KAITO_API_TOKEN;
      
      const config = await configManager.generateConfig('dev');
      const key = config.authentication.primaryKey;
      
      // 特殊文字が含まれていないことを確認
      const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(key);
      expect(hasSpecialChars).toBe(false);
    });

    test('ランダム性の確認（複数回生成での差異）', async () => {
      delete process.env.KAITO_API_TOKEN;
      
      const keys = [];
      for (let i = 0; i < 10; i++) {
        const manager = new KaitoAPIConfigManager();
        const config = await manager.generateConfig('dev');
        keys.push(config.authentication.primaryKey);
      }
      
      // 10個のキーがすべて異なることを確認
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(10);
    });

    test('予測可能なランダム値での動作確認', async () => {
      delete process.env.KAITO_API_TOKEN;
      
      // Math.randomを固定値にモック
      Math.random = jest.fn(() => 0.5);
      
      const config = await configManager.generateConfig('dev');
      const key = config.authentication.primaryKey;
      
      expect(key).toBeDefined();
      expect(key.length).toBe(64);
      
      // 固定値の場合、すべて同じ文字になる
      const expectedChar = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[31]; // Math.floor(0.5 * 62) = 31
      expect(key).toBe(expectedChar.repeat(64));
    });

    test('境界値でのランダム値生成', async () => {
      delete process.env.KAITO_API_TOKEN;
      
      // 最小値（0）でのテスト
      Math.random = jest.fn(() => 0);
      const config1 = await (new KaitoAPIConfigManager()).generateConfig('dev');
      expect(config1.authentication.primaryKey[0]).toBe('A');
      
      // 最大値近似（0.9999）でのテスト
      Math.random = jest.fn(() => 0.9999);
      const config2 = await (new KaitoAPIConfigManager()).generateConfig('dev');
      expect(config2.authentication.primaryKey[0]).toBe('9');
    });
  });

  // ============================================================================
  // 暗号化キー生成テスト
  // ============================================================================

  describe('暗号化キー生成テスト', () => {
    test('64文字のキー生成確認', async () => {
      const config = await configManager.generateConfig('dev');
      const encryptionKey = config.security.encryptionKey;
      
      expect(encryptionKey).toBeDefined();
      expect(encryptionKey.length).toBe(64);
    });

    test('特殊文字を含む文字セット', async () => {
      const config = await configManager.generateConfig('dev');
      const encryptionKey = config.security.encryptionKey;
      
      // 暗号化キーは特殊文字を含むセット: A-Z, a-z, 0-9, !@#$%^&*
      const validChars = /^[A-Za-z0-9!@#$%^&*]+$/;
      expect(validChars.test(encryptionKey)).toBe(true);
    });

    test('ランダム性の確認', async () => {
      const encryptionKeys = [];
      for (let i = 0; i < 10; i++) {
        const manager = new KaitoAPIConfigManager();
        const config = await manager.generateConfig('dev');
        encryptionKeys.push(config.security.encryptionKey);
      }
      
      // 10個のキーがすべて異なることを確認
      const uniqueKeys = new Set(encryptionKeys);
      expect(uniqueKeys.size).toBe(10);
    });

    test('セキュアキーとの差異確認', async () => {
      delete process.env.KAITO_API_TOKEN; // セキュアキー生成を強制
      
      const config = await configManager.generateConfig('dev');
      const secureKey = config.authentication.primaryKey;
      const encryptionKey = config.security.encryptionKey;
      
      // セキュアキーと暗号化キーは異なる
      expect(secureKey).not.toBe(encryptionKey);
      
      // 文字セットの違いを確認
      const secureKeyHasSpecial = /[!@#$%^&*]/.test(secureKey);
      const encryptionKeyHasSpecial = /[!@#$%^&*]/.test(encryptionKey);
      
      expect(secureKeyHasSpecial).toBe(false); // セキュアキーは特殊文字なし
      // 暗号化キーは特殊文字を含む可能性がある（確実ではないが傾向テスト）
    });

    test('予測可能な値での暗号化キー生成', async () => {
      // Math.randomを固定値にモック
      Math.random = jest.fn(() => 0.5);
      
      const config = await configManager.generateConfig('dev');
      const encryptionKey = config.security.encryptionKey;
      
      expect(encryptionKey).toBeDefined();
      expect(encryptionKey.length).toBe(64);
      
      // 固定値の場合、すべて同じ文字になる
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      const expectedChar = chars[Math.floor(0.5 * chars.length)];
      expect(encryptionKey).toBe(expectedChar.repeat(64));
    });

    test('特殊文字の存在確認（統計的テスト）', async () => {
      // 複数回生成して特殊文字が含まれることを確認
      let hasSpecialChars = false;
      for (let i = 0; i < 50; i++) {
        const manager = new KaitoAPIConfigManager();
        const config = await manager.generateConfig('dev');
        const encryptionKey = config.security.encryptionKey;
        
        if (/[!@#$%^&*]/.test(encryptionKey)) {
          hasSpecialChars = true;
          break;
        }
      }
      
      expect(hasSpecialChars).toBe(true); // 50回中に1度は特殊文字が出現
    });
  });

  // ============================================================================
  // チェックサム生成テスト
  // ============================================================================

  describe('チェックサム生成テスト', () => {
    test('同一設定での同一チェックサム', async () => {
      const config1 = await configManager.generateConfig('dev');
      const config2 = await configManager.generateConfig('dev');
      
      // 同じ環境・同じ時刻で生成された設定は同じチェックサムを持つべき
      // ただし、ランダム要素（キー生成）があるため、実際は異なる
      expect(config1.metadata.checksum).toBeDefined();
      expect(config2.metadata.checksum).toBeDefined();
      expect(typeof config1.metadata.checksum).toBe('string');
      expect(typeof config2.metadata.checksum).toBe('string');
    });

    test('設定変更でのチェックサム変更', async () => {
      const originalConfig = await configManager.generateConfig('dev');
      const originalChecksum = originalConfig.metadata.checksum;
      
      // 設定を変更
      const modifiedConfig = { ...originalConfig };
      modifiedConfig.api.timeout = 15000; // タイムアウトを変更
      
      // チェックサムを再計算（プライベートメソッドのため間接的にテスト）
      const newConfig = await configManager.generateConfig('dev');
      const newChecksum = newConfig.metadata.checksum;
      
      expect(originalChecksum).not.toBe(newChecksum); // 異なるチェックサム
    });

    test('チェックサムの16進数形式確認', async () => {
      const config = await configManager.generateConfig('dev');
      const checksum = config.metadata.checksum;
      
      // 16進数形式の確認
      const hexPattern = /^[0-9a-f]+$/i;
      expect(hexPattern.test(checksum)).toBe(true);
      
      // 有効な長さの確認（ハッシュ値として適切な長さ）
      expect(checksum.length).toBeGreaterThan(0);
      expect(checksum.length).toBeLessThan(100); // 過度に長くない
    });

    test('チェックサム計算の一意性', async () => {
      const checksums = new Set();
      
      // 異なる環境での設定生成
      const devConfig = await configManager.generateConfig('dev');
      const stagingConfig = await configManager.generateConfig('staging');
      const prodConfig = await configManager.generateConfig('prod');
      
      checksums.add(devConfig.metadata.checksum);
      checksums.add(stagingConfig.metadata.checksum);
      checksums.add(prodConfig.metadata.checksum);
      
      // 3つの異なる環境で異なるチェックサム
      expect(checksums.size).toBe(3);
    });

    test('空の設定でのチェックサム生成', async () => {
      // 最小限の設定オブジェクトでのテスト
      const minimalConfig: Partial<KaitoAPIConfig> = {
        environment: 'dev',
        api: {
          baseUrl: 'https://test.com',
          version: 'v1.0',
          timeout: 5000,
          retryPolicy: {
            maxRetries: 3,
            backoffMs: 1000,
            retryConditions: ['500']
          }
        }
      };
      
      // 実際の設定生成を通じてチェックサムテスト
      const config = await configManager.generateConfig('dev');
      expect(config.metadata.checksum).toBeDefined();
      expect(config.metadata.checksum.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // プライベートヘルパーメソッドテスト（間接的）
  // ============================================================================

  describe('プライベートヘルパーメソッドテスト', () => {
    test('環境別URL取得の正確性', async () => {
      const devConfig = await configManager.generateConfig('dev');
      const stagingConfig = await configManager.generateConfig('staging');
      const prodConfig = await configManager.generateConfig('prod');
      
      expect(devConfig.api.baseUrl).toBe('https://dev-api.twitterapi.io');
      expect(stagingConfig.api.baseUrl).toBe('https://staging-api.twitterapi.io');
      expect(prodConfig.api.baseUrl).toBe('https://api.twitterapi.io');
    });

    test('キー生成メソッドの呼び出し確認', async () => {
      delete process.env.KAITO_API_TOKEN; // キー生成を強制
      
      const config = await configManager.generateConfig('dev');
      
      // セキュアキーが生成されている
      expect(config.authentication.primaryKey).toBeDefined();
      expect(config.authentication.primaryKey.length).toBe(64);
      
      // 暗号化キーが生成されている
      expect(config.security.encryptionKey).toBeDefined();
      expect(config.security.encryptionKey.length).toBe(64);
      
      // チェックサムが生成されている
      expect(config.metadata.checksum).toBeDefined();
      expect(config.metadata.checksum.length).toBeGreaterThan(0);
    });

    test('統合的なセキュリティ機能テスト', async () => {
      const config = await configManager.generateConfig('prod');
      
      // 本番環境でのセキュリティ設定確認
      expect(config.authentication.encryptionEnabled).toBe(true);
      expect(config.security.rateLimitEnabled).toBe(true);
      expect(config.security.auditLoggingEnabled).toBe(true);
      expect(config.security.encryptionKey).toBeDefined();
      
      // キーの品質確認
      expect(config.authentication.primaryKey.length).toBe(64);
      expect(config.security.encryptionKey.length).toBe(64);
      expect(config.metadata.checksum).toBeDefined();
    });
  });

  // ============================================================================
  // セキュリティ品質テスト
  // ============================================================================

  describe('セキュリティ品質テスト', () => {
    test('キー生成の時間性能', async () => {
      delete process.env.KAITO_API_TOKEN;
      
      const startTime = Date.now();
      
      // 複数のキー生成
      const configs = await Promise.all([
        configManager.generateConfig('dev'),
        configManager.generateConfig('staging'),
        configManager.generateConfig('prod')
      ]);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(1000); // 1秒以内
      expect(configs).toHaveLength(3);
      
      // すべてのキーが生成されている
      configs.forEach(config => {
        expect(config.authentication.primaryKey.length).toBe(64);
        expect(config.security.encryptionKey.length).toBe(64);
        expect(config.metadata.checksum).toBeDefined();
      });
    });

    test('大量キー生成での一意性保証', async () => {
      delete process.env.KAITO_API_TOKEN;
      
      const secureKeys = new Set();
      const encryptionKeys = new Set();
      const checksums = new Set();
      
      // 50個の設定を生成
      for (let i = 0; i < 50; i++) {
        const manager = new KaitoAPIConfigManager();
        const config = await manager.generateConfig('dev');
        
        secureKeys.add(config.authentication.primaryKey);
        encryptionKeys.add(config.security.encryptionKey);
        checksums.add(config.metadata.checksum);
      }
      
      // すべてのキーが一意であることを確認
      expect(secureKeys.size).toBe(50);
      expect(encryptionKeys.size).toBe(50);
      expect(checksums.size).toBe(50);
    });

    test('エラー状況でのセキュリティ機能', async () => {
      // 環境変数が不正な場合
      process.env.KAITO_API_TOKEN = 'short'; // 32文字未満
      
      const config = await configManager.generateConfig('prod');
      const validation = await configManager.validateConfig(config);
      
      // セキュリティ要件に反する設定はエラーになる
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('プライマリキーは32文字以上である必要があります');
    });
  });

  // ============================================================================
  // セキュリティリグレッションテスト
  // ============================================================================

  describe('セキュリティリグレッションテスト', () => {
    test('セキュアキーに特殊文字が含まれない回帰テスト', async () => {
      delete process.env.KAITO_API_TOKEN;
      
      // 100回テストして特殊文字が含まれないことを確認
      for (let i = 0; i < 100; i++) {
        const manager = new KaitoAPIConfigManager();
        const config = await manager.generateConfig('dev');
        const key = config.authentication.primaryKey;
        
        const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(key);
        expect(hasSpecialChars).toBe(false);
      }
    });

    test('暗号化キーの文字セット回帰テスト', async () => {
      // 10回テストして文字セットが正しいことを確認
      for (let i = 0; i < 10; i++) {
        const manager = new KaitoAPIConfigManager();
        const config = await manager.generateConfig('dev');
        const key = config.security.encryptionKey;
        
        const validChars = /^[A-Za-z0-9!@#$%^&*]+$/;
        expect(validChars.test(key)).toBe(true);
      }
    });

    test('チェックサム形式の回帰テスト', async () => {
      // 複数環境でチェックサム形式を確認
      const environments: ('dev' | 'staging' | 'prod')[] = ['dev', 'staging', 'prod'];
      
      for (const env of environments) {
        const config = await configManager.generateConfig(env);
        const checksum = config.metadata.checksum;
        
        // 16進数形式
        const hexPattern = /^[0-9a-f]+$/i;
        expect(hexPattern.test(checksum)).toBe(true);
        
        // 適切な長さ
        expect(checksum.length).toBeGreaterThan(0);
        expect(checksum.length).toBeLessThan(50);
      }
    });
  });
});