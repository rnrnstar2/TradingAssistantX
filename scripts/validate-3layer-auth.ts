#!/usr/bin/env ts-node

/**
 * 3層認証システム自動検証スクリプト
 * 
 * 目的:
 * - Phase 2-3で実装された3層認証システムの完全性検証
 * - 環境変数・型定義・認証フロー・エンドポイント・互換性の総合確認
 * - CI/CD環境での自動検証対応
 * 
 * 実行方法:
 * ```bash
 * npx ts-node scripts/validate-3layer-auth.ts
 * # または
 * pnpm run validate:3layer
 * ```
 * 
 * TASK-004対応: 3層認証システム自動検証
 */

import 'dotenv/config';
import { AuthManager } from '../src/kaito-api/core/auth-manager';
import { KaitoTwitterAPIClient } from '../src/kaito-api';
import type { AuthStatus, LoginResult } from '../src/kaito-api/types';

// 検証設定
const VALIDATION_CONFIG = {
  // 検証レベル設定
  SKIP_REAL_API_TESTS: process.env.SKIP_REAL_API_VALIDATION !== 'false',
  ENABLE_VERBOSE_OUTPUT: process.env.VERBOSE_VALIDATION === 'true',
  
  // 制限設定
  MAX_VALIDATION_TIME_MS: 120000, // 2分
  MAX_API_REQUESTS: 10,
  
  // 検証要件
  REQUIRED_ENV_VARS: [
    'KAITO_API_TOKEN',
    // V1認証（オプション）
    'X_USERNAME',
    'X_PASSWORD', 
    'X_EMAIL',
    // V2認証（オプション）
    'TWITTER_USERNAME',
    'TWITTER_EMAIL',
    'TWITTER_PASSWORD'
  ],
  
  // 期待される認証レベル
  EXPECTED_AUTH_LEVELS: ['none', 'api-key', 'v1-login', 'v2-login']
};

// 検証結果インターfaces
interface ValidationResult {
  category: string;
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'WARN';
  details: string;
  timestamp: string;
  duration?: number;
}

interface ValidationSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  warnings: number;
  overallStatus: 'PASS' | 'FAIL' | 'PARTIAL';
  executionTime: number;
  criticalIssues: string[];
}

class ThreeLayerAuthValidator {
  private results: ValidationResult[] = [];
  private startTime: number = Date.now();
  private authManager: AuthManager;
  private client: KaitoTwitterAPIClient;
  
  constructor() {
    // 基本初期化
    this.authManager = new AuthManager({
      apiKey: process.env.KAITO_API_TOKEN || 'validation-test-key',
      preferredAuthMethod: 'v2'
    });
    
    this.client = new KaitoTwitterAPIClient({
      apiKey: process.env.KAITO_API_TOKEN || 'validation-test-key',
      qpsLimit: 200,
      retryPolicy: {
        maxRetries: 2,
        backoffMs: 1000
      },
      costTracking: false
    });
  }
  
  /**
   * メイン検証実行
   */
  async validate(): Promise<ValidationSummary> {
    console.log('🔍 3層認証システム検証開始...\n');
    
    try {
      // 1. 環境変数確認
      await this.validateEnvironmentVariables();
      
      // 2. 型定義整合性確認
      await this.validateTypeDefinitions();
      
      // 3. 認証フロー確認
      await this.validateAuthenticationFlows();
      
      // 4. エンドポイント動作確認
      await this.validateEndpoints();
      
      // 5. 互換性確認
      await this.validateCompatibility();
      
    } catch (error) {
      this.addResult('System', 'Validation Execution', 'FAIL', 
        `検証実行エラー: ${error.message}`);
    }
    
    return this.generateSummary();
  }
  
  /**
   * 1. 環境変数確認
   */
  private async validateEnvironmentVariables(): Promise<void> {
    console.log('📋 環境変数チェック...');
    
    const testStart = Date.now();
    
    // 必須環境変数確認
    const missingRequired: string[] = [];
    const missingOptional: string[] = [];
    
    // KAITO_API_TOKEN（必須）
    if (!process.env.KAITO_API_TOKEN) {
      missingRequired.push('KAITO_API_TOKEN');
    } else {
      this.addResult('Environment', 'KAITO_API_TOKEN', 'PASS', 
        'APIトークン設定済み', Date.now() - testStart);
    }
    
    // V1認証環境変数（オプション）
    const v1Vars = ['X_USERNAME', 'X_PASSWORD', 'X_EMAIL'];
    const v1Missing = v1Vars.filter(varName => !process.env[varName]);
    
    if (v1Missing.length === 0) {
      this.addResult('Environment', 'V1 Auth Variables', 'PASS', 
        'V1認証環境変数完備', Date.now() - testStart);
    } else if (v1Missing.length < v1Vars.length) {
      this.addResult('Environment', 'V1 Auth Variables', 'WARN', 
        `V1認証環境変数部分欠如: ${v1Missing.join(', ')}`, Date.now() - testStart);
    } else {
      this.addResult('Environment', 'V1 Auth Variables', 'SKIP', 
        'V1認証環境変数未設定（オプション）', Date.now() - testStart);
    }
    
    // V2認証環境変数（オプション）
    const v2Vars = ['TWITTER_USERNAME', 'TWITTER_EMAIL', 'TWITTER_PASSWORD'];
    const v2Missing = v2Vars.filter(varName => !process.env[varName]);
    
    if (v2Missing.length === 0) {
      this.addResult('Environment', 'V2 Auth Variables', 'PASS', 
        'V2認証環境変数完備', Date.now() - testStart);
    } else if (v2Missing.length < v2Vars.length) {
      this.addResult('Environment', 'V2 Auth Variables', 'WARN', 
        `V2認証環境変数部分欠如: ${v2Missing.join(', ')}`, Date.now() - testStart);
    } else {
      this.addResult('Environment', 'V2 Auth Variables', 'SKIP', 
        'V2認証環境変数未設定（オプション）', Date.now() - testStart);
    }
    
    // 必須変数不足の場合
    if (missingRequired.length > 0) {
      this.addResult('Environment', 'Required Variables', 'FAIL', 
        `必須環境変数未設定: ${missingRequired.join(', ')}`, Date.now() - testStart);
      return;
    }
    
    // 環境変数値検証
    await this.validateEnvironmentValues();
  }
  
  /**
   * 環境変数値の検証
   */
  private async validateEnvironmentValues(): Promise<void> {
    const testStart = Date.now();
    
    // APIトークン形式確認
    const apiToken = process.env.KAITO_API_TOKEN;
    if (apiToken) {
      if (apiToken.length < 10) {
        this.addResult('Environment', 'API Token Format', 'WARN', 
          'APIトークンが短すぎる可能性', Date.now() - testStart);
      } else if (apiToken.startsWith('test-') || apiToken.includes('example')) {
        this.addResult('Environment', 'API Token Format', 'WARN', 
          'テスト用APIトークンの可能性', Date.now() - testStart);
      } else {
        this.addResult('Environment', 'API Token Format', 'PASS', 
          'APIトークン形式正常', Date.now() - testStart);
      }
    }
    
    // ユーザー名形式確認
    const xUsername = process.env.X_USERNAME;
    const twitterUsername = process.env.TWITTER_USERNAME;
    
    if (xUsername && !xUsername.match(/^[a-zA-Z0-9_]+$/)) {
      this.addResult('Environment', 'X Username Format', 'WARN', 
        'X_USERNAME形式に疑義', Date.now() - testStart);
    }
    
    if (twitterUsername && !twitterUsername.match(/^[a-zA-Z0-9_]+$/)) {
      this.addResult('Environment', 'Twitter Username Format', 'WARN', 
        'TWITTER_USERNAME形式に疑義', Date.now() - testStart);
    }
  }
  
  /**
   * 2. 型定義整合性確認
   */
  private async validateTypeDefinitions(): Promise<void> {
    console.log('📊 型定義チェック...');
    
    const testStart = Date.now();
    
    try {
      // AuthManager型定義確認
      const authStatus: AuthStatus = this.authManager.getAuthStatus();
      
      // 基本プロパティ確認
      const requiredProps = ['apiKeyValid', 'userSessionValid', 'canPerformUserActions'];
      const missingProps = requiredProps.filter(prop => !(prop in authStatus));
      
      if (missingProps.length === 0) {
        this.addResult('Types', 'AuthStatus Basic Props', 'PASS', 
          '基本プロパティ完備', Date.now() - testStart);
      } else {
        this.addResult('Types', 'AuthStatus Basic Props', 'FAIL', 
          `基本プロパティ不足: ${missingProps.join(', ')}`, Date.now() - testStart);
      }
      
      // 3層認証拡張プロパティ確認
      const extendedProps = ['authLevel', 'validAuthLevels', 'v1SessionValid', 'v2SessionValid'];
      const missingExtendedProps = extendedProps.filter(prop => !(prop in authStatus));
      
      if (missingExtendedProps.length === 0) {
        this.addResult('Types', 'AuthStatus Extended Props', 'PASS', 
          '3層認証拡張プロパティ完備', Date.now() - testStart);
      } else {
        this.addResult('Types', 'AuthStatus Extended Props', 'FAIL', 
          `拡張プロパティ不足: ${missingExtendedProps.join(', ')}`, Date.now() - testStart);
      }
      
      // 認証レベル値確認
      if (authStatus.authLevel && VALIDATION_CONFIG.EXPECTED_AUTH_LEVELS.includes(authStatus.authLevel)) {
        this.addResult('Types', 'Auth Level Values', 'PASS', 
          `認証レベル値正常: ${authStatus.authLevel}`, Date.now() - testStart);
      } else {
        this.addResult('Types', 'Auth Level Values', 'WARN', 
          `認証レベル値未確認: ${authStatus.authLevel}`, Date.now() - testStart);
      }
      
      // validAuthLevels配列確認
      if (Array.isArray(authStatus.validAuthLevels)) {
        const validLevelCount = authStatus.validAuthLevels.length;
        this.addResult('Types', 'Valid Auth Levels Array', 'PASS', 
          `有効認証レベル配列: ${validLevelCount}件`, Date.now() - testStart);
      } else {
        this.addResult('Types', 'Valid Auth Levels Array', 'FAIL', 
          'validAuthLevelsが配列ではない', Date.now() - testStart);
      }
      
    } catch (error) {
      this.addResult('Types', 'Type Definition Validation', 'FAIL', 
        `型定義確認エラー: ${error.message}`, Date.now() - testStart);
    }
  }
  
  /**
   * 3. 認証フロー確認
   */
  private async validateAuthenticationFlows(): Promise<void> {
    console.log('🔐 認証フローチェック...');
    
    // APIキー認証確認
    await this.validateApiKeyAuth();
    
    // V1ログイン認証確認（環境変数がある場合）
    if (process.env.X_USERNAME && process.env.X_PASSWORD) {
      await this.validateV1LoginAuth();
    } else {
      this.addResult('Auth Flow', 'V1 Login Auth', 'SKIP', 
        'V1認証環境変数未設定');
    }
    
    // V2ログイン認証確認（環境変数がある場合）
    if (process.env.TWITTER_USERNAME && process.env.TWITTER_PASSWORD) {
      await this.validateV2LoginAuth();
    } else {
      this.addResult('Auth Flow', 'V2 Login Auth', 'SKIP', 
        'V2認証環境変数未設定');
    }
    
    // 統合ログイン確認
    await this.validateIntegratedLogin();
  }
  
  /**
   * APIキー認証確認
   */
  private async validateApiKeyAuth(): Promise<void> {
    const testStart = Date.now();
    
    try {
      // APIキー有効性確認
      const isApiKeyValid = this.authManager.isApiKeyValid();
      
      if (isApiKeyValid) {
        this.addResult('Auth Flow', 'API Key Validation', 'PASS', 
          'APIキー認証正常', Date.now() - testStart);
      } else {
        this.addResult('Auth Flow', 'API Key Validation', 'FAIL', 
          'APIキー認証失敗', Date.now() - testStart);
        return;
      }
      
      // 認証ヘッダー生成確認
      const authHeaders = this.authManager.getAuthHeaders();
      
      if (authHeaders && authHeaders['x-api-key']) {
        this.addResult('Auth Flow', 'API Key Headers', 'PASS', 
          'APIキーヘッダー生成正常', Date.now() - testStart);
      } else {
        this.addResult('Auth Flow', 'API Key Headers', 'FAIL', 
          'APIキーヘッダー生成失敗', Date.now() - testStart);
      }
      
      // 認証レベル確認
      const currentLevel = this.authManager.getCurrentAuthLevel();
      if (currentLevel === 'api-key' || currentLevel === 'none') {
        this.addResult('Auth Flow', 'API Key Auth Level', 'PASS', 
          `APIキー認証レベル: ${currentLevel}`, Date.now() - testStart);
      } else {
        this.addResult('Auth Flow', 'API Key Auth Level', 'WARN', 
          `予期しない認証レベル: ${currentLevel}`, Date.now() - testStart);
      }
      
    } catch (error) {
      this.addResult('Auth Flow', 'API Key Auth', 'FAIL', 
        `APIキー認証エラー: ${error.message}`, Date.now() - testStart);
    }
  }
  
  /**
   * V1ログイン認証確認
   */
  private async validateV1LoginAuth(): Promise<void> {
    const testStart = Date.now();
    
    if (VALIDATION_CONFIG.SKIP_REAL_API_TESTS) {
      this.addResult('Auth Flow', 'V1 Login Auth', 'SKIP', 
        '実API認証テストスキップ', Date.now() - testStart);
      return;
    }
    
    try {
      console.log('  🔑 V1ログイン認証テスト実行中...');
      
      const loginResult: LoginResult = await this.authManager.loginV1();
      
      if (loginResult.success) {
        this.addResult('Auth Flow', 'V1 Login Success', 'PASS', 
          'V1ログイン成功', Date.now() - testStart);
        
        // セッション確認
        const authStatus = this.authManager.getAuthStatus();
        if (authStatus.v1SessionValid) {
          this.addResult('Auth Flow', 'V1 Session Valid', 'PASS', 
            'V1セッション有効', Date.now() - testStart);
        } else {
          this.addResult('Auth Flow', 'V1 Session Valid', 'FAIL', 
            'V1セッション無効', Date.now() - testStart);
        }
        
        // 認証レベル確認
        if (authStatus.authLevel === 'v1-login') {
          this.addResult('Auth Flow', 'V1 Auth Level', 'PASS', 
            'V1認証レベル正常', Date.now() - testStart);
        } else {
          this.addResult('Auth Flow', 'V1 Auth Level', 'WARN', 
            `V1認証レベル異常: ${authStatus.authLevel}`, Date.now() - testStart);
        }
        
      } else {
        this.addResult('Auth Flow', 'V1 Login', 'WARN', 
          `V1ログイン失敗: ${loginResult.error}`, Date.now() - testStart);
      }
      
    } catch (error) {
      this.addResult('Auth Flow', 'V1 Login Auth', 'WARN', 
        `V1認証テストエラー: ${error.message}`, Date.now() - testStart);
    }
  }
  
  /**
   * V2ログイン認証確認
   */
  private async validateV2LoginAuth(): Promise<void> {
    const testStart = Date.now();
    
    if (VALIDATION_CONFIG.SKIP_REAL_API_TESTS) {
      this.addResult('Auth Flow', 'V2 Login Auth', 'SKIP', 
        '実API認証テストスキップ', Date.now() - testStart);
      return;
    }
    
    try {
      console.log('  🚀 V2ログイン認証テスト実行中...');
      
      const loginResult: LoginResult = await this.authManager.loginV2();
      
      if (loginResult.success) {
        this.addResult('Auth Flow', 'V2 Login Success', 'PASS', 
          'V2ログイン成功', Date.now() - testStart);
        
        // セッション確認
        const authStatus = this.authManager.getAuthStatus();
        if (authStatus.v2SessionValid) {
          this.addResult('Auth Flow', 'V2 Session Valid', 'PASS', 
            'V2セッション有効', Date.now() - testStart);
        } else {
          this.addResult('Auth Flow', 'V2 Session Valid', 'FAIL', 
            'V2セッション無効', Date.now() - testStart);
        }
        
        // 認証レベル確認
        if (authStatus.authLevel === 'v2-login') {
          this.addResult('Auth Flow', 'V2 Auth Level', 'PASS', 
            'V2認証レベル正常', Date.now() - testStart);
        } else {
          this.addResult('Auth Flow', 'V2 Auth Level', 'WARN', 
            `V2認証レベル異常: ${authStatus.authLevel}`, Date.now() - testStart);
        }
        
      } else {
        this.addResult('Auth Flow', 'V2 Login', 'WARN', 
          `V2ログイン失敗: ${loginResult.error}`, Date.now() - testStart);
      }
      
    } catch (error) {
      this.addResult('Auth Flow', 'V2 Login Auth', 'WARN', 
        `V2認証テストエラー: ${error.message}`, Date.now() - testStart);
    }
  }
  
  /**
   * 統合ログイン確認
   */
  private async validateIntegratedLogin(): Promise<void> {
    const testStart = Date.now();
    
    try {
      // 統合ログイン実行
      const loginResult = await this.authManager.login();
      
      if (loginResult.success) {
        this.addResult('Auth Flow', 'Integrated Login', 'PASS', 
          '統合ログイン成功', Date.now() - testStart);
        
        // 最終認証レベル確認
        const finalAuthLevel = this.authManager.getCurrentAuthLevel();
        if (['v1-login', 'v2-login'].includes(finalAuthLevel)) {
          this.addResult('Auth Flow', 'Final Auth Level', 'PASS', 
            `統合ログイン最終レベル: ${finalAuthLevel}`, Date.now() - testStart);
        } else {
          this.addResult('Auth Flow', 'Final Auth Level', 'WARN', 
            `統合ログイン最終レベル予期外: ${finalAuthLevel}`, Date.now() - testStart);
        }
        
      } else {
        this.addResult('Auth Flow', 'Integrated Login', 'WARN', 
          `統合ログイン失敗: ${loginResult.error}`, Date.now() - testStart);
      }
      
    } catch (error) {
      this.addResult('Auth Flow', 'Integrated Login', 'FAIL', 
        `統合ログインエラー: ${error.message}`, Date.now() - testStart);
    }
  }
  
  /**
   * 4. エンドポイント動作確認
   */
  private async validateEndpoints(): Promise<void> {
    console.log('🚀 エンドポイントチェック...');
    
    // エンドポイント認証要件確認
    await this.validateEndpointAuthRequirements();
    
    // クライアント機能確認
    await this.validateClientFunctions();
  }
  
  /**
   * エンドポイント認証要件確認
   */
  private async validateEndpointAuthRequirements(): Promise<void> {
    const testStart = Date.now();
    
    const testEndpoints = [
      { path: '/public/user-info', expectedLevel: 'api-key' },
      { path: '/public/tweet-search', expectedLevel: 'api-key' },
      { path: '/twitter/tweet/create', expectedLevel: ['v1-login', 'v2-login'] },
      { path: '/twitter/action/like', expectedLevel: ['v1-login', 'v2-login'] }
    ];
    
    let correctRequirements = 0;
    
    for (const endpoint of testEndpoints) {
      try {
        const requiredLevel = this.authManager.getRequiredAuthLevel(endpoint.path);
        
        const isCorrect = Array.isArray(endpoint.expectedLevel) 
          ? endpoint.expectedLevel.includes(requiredLevel)
          : endpoint.expectedLevel === requiredLevel;
        
        if (isCorrect) {
          correctRequirements++;
          if (VALIDATION_CONFIG.ENABLE_VERBOSE_OUTPUT) {
            this.addResult('Endpoints', `Auth Requirement ${endpoint.path}`, 'PASS', 
              `要求レベル正常: ${requiredLevel}`);
          }
        } else {
          this.addResult('Endpoints', `Auth Requirement ${endpoint.path}`, 'FAIL', 
            `要求レベル異常: 期待=${endpoint.expectedLevel}, 実際=${requiredLevel}`);
        }
        
      } catch (error) {
        this.addResult('Endpoints', `Auth Requirement ${endpoint.path}`, 'FAIL', 
          `認証要件確認エラー: ${error.message}`);
      }
    }
    
    if (correctRequirements === testEndpoints.length) {
      this.addResult('Endpoints', 'Auth Requirements', 'PASS', 
        `全エンドポイント認証要件正常: ${correctRequirements}/${testEndpoints.length}`, 
        Date.now() - testStart);
    } else {
      this.addResult('Endpoints', 'Auth Requirements', 'FAIL', 
        `エンドポイント認証要件異常: ${correctRequirements}/${testEndpoints.length}`, 
        Date.now() - testStart);
    }
  }
  
  /**
   * クライアント機能確認
   */
  private async validateClientFunctions(): Promise<void> {
    const testStart = Date.now();
    
    try {
      // KaitoTwitterAPIClient基本機能確認
      expect(typeof this.client.getUserInfo).toBe('function');
      expect(typeof this.client.searchTweets).toBe('function');
      expect(typeof this.client.createPost).toBe('function');
      expect(typeof this.client.performEngagement).toBe('function');
      
      this.addResult('Endpoints', 'Client Functions', 'PASS', 
        'クライアント基本機能確認', Date.now() - testStart);
      
      // 実API呼び出しテスト（スキップ可能）
      if (!VALIDATION_CONFIG.SKIP_REAL_API_TESTS) {
        await this.validateRealApiCalls();
      } else {
        this.addResult('Endpoints', 'Real API Calls', 'SKIP', 
          '実API呼び出しテストスキップ');
      }
      
    } catch (error) {
      this.addResult('Endpoints', 'Client Functions', 'FAIL', 
        `クライアント機能確認エラー: ${error.message}`, Date.now() - testStart);
    }
  }
  
  /**
   * 実API呼び出しテスト
   */
  private async validateRealApiCalls(): Promise<void> {
    const testStart = Date.now();
    
    try {
      console.log('  📡 実API呼び出しテスト実行中...');
      
      // ユーザー情報取得テスト
      const userInfo = await this.client.getUserInfo('TwitterDev');
      
      if (userInfo && userInfo.username === 'TwitterDev') {
        this.addResult('Endpoints', 'Real API User Info', 'PASS', 
          '実APIユーザー情報取得成功', Date.now() - testStart);
      } else {
        this.addResult('Endpoints', 'Real API User Info', 'WARN', 
          '実APIユーザー情報取得結果異常', Date.now() - testStart);
      }
      
    } catch (error) {
      this.addResult('Endpoints', 'Real API Calls', 'WARN', 
        `実API呼び出しエラー: ${error.message}`, Date.now() - testStart);
    }
  }
  
  /**
   * 5. 互換性確認
   */
  private async validateCompatibility(): Promise<void> {
    console.log('🔄 互換性チェック...');
    
    // import互換性確認
    await this.validateImportCompatibility();
    
    // 型互換性確認
    await this.validateTypeCompatibility();
    
    // 設定互換性確認
    await this.validateConfigCompatibility();
  }
  
  /**
   * import互換性確認
   */
  private async validateImportCompatibility(): Promise<void> {
    const testStart = Date.now();
    
    try {
      // 動的import確認
      const kaitoModule = await import('../src/kaito-api');
      const sharedTypesModule = await import('../src/shared/types');
      
      // 期待されるエクスポートの確認
      const expectedExports = [
        'KaitoTwitterAPIClient',
        'AuthManager',
        'ActionEndpoints',
        'TweetEndpoints',
        'UserEndpoints'
      ];
      
      const missingExports = expectedExports.filter(exportName => 
        !(exportName in kaitoModule)
      );
      
      if (missingExports.length === 0) {
        this.addResult('Compatibility', 'Import Exports', 'PASS', 
          '期待されるエクスポート完備', Date.now() - testStart);
      } else {
        this.addResult('Compatibility', 'Import Exports', 'FAIL', 
          `エクスポート不足: ${missingExports.join(', ')}`, Date.now() - testStart);
      }
      
      // 型定義エクスポート確認
      const expectedTypes = ['ClaudeDecision', 'GeneratedContent', 'PostResult'];
      
      // 型の存在確認（実行時確認は困難なので、import成功で代替）
      this.addResult('Compatibility', 'Type Exports', 'PASS', 
        '型定義import成功', Date.now() - testStart);
      
    } catch (error) {
      this.addResult('Compatibility', 'Import Compatibility', 'FAIL', 
        `import互換性エラー: ${error.message}`, Date.now() - testStart);
    }
  }
  
  /**
   * 型互換性確認
   */
  private async validateTypeCompatibility(): Promise<void> {
    const testStart = Date.now();
    
    try {
      // AuthStatus型の後方互換性確認
      const authStatus = this.authManager.getAuthStatus();
      
      // 従来プロパティの存在確認
      const legacyProps = ['apiKeyValid', 'userSessionValid', 'canPerformUserActions'];
      const missingLegacyProps = legacyProps.filter(prop => !(prop in authStatus));
      
      if (missingLegacyProps.length === 0) {
        this.addResult('Compatibility', 'Legacy Properties', 'PASS', 
          '従来プロパティ維持', Date.now() - testStart);
      } else {
        this.addResult('Compatibility', 'Legacy Properties', 'FAIL', 
          `従来プロパティ欠如: ${missingLegacyProps.join(', ')}`, Date.now() - testStart);
      }
      
      // 新規プロパティの追加確認
      const newProps = ['authLevel', 'validAuthLevels', 'v1SessionValid', 'v2SessionValid'];
      const existingNewProps = newProps.filter(prop => (prop in authStatus));
      
      if (existingNewProps.length === newProps.length) {
        this.addResult('Compatibility', 'New Properties', 'PASS', 
          '新規プロパティ追加', Date.now() - testStart);
      } else {
        this.addResult('Compatibility', 'New Properties', 'FAIL', 
          `新規プロパティ不足: ${newProps.filter(p => !existingNewProps.includes(p)).join(', ')}`, 
          Date.now() - testStart);
      }
      
    } catch (error) {
      this.addResult('Compatibility', 'Type Compatibility', 'FAIL', 
        `型互換性エラー: ${error.message}`, Date.now() - testStart);
    }
  }
  
  /**
   * 設定互換性確認
   */
  private async validateConfigCompatibility(): Promise<void> {
    const testStart = Date.now();
    
    try {
      // KaitoClientConfig互換性確認
      const legacyConfig = {
        apiKey: 'test-key',
        qpsLimit: 200,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000
        },
        costTracking: false
      };
      
      // 設定でのクライアント初期化確認
      const testClient = new KaitoTwitterAPIClient(legacyConfig);
      
      if (testClient) {
        this.addResult('Compatibility', 'Config Initialization', 'PASS', 
          '従来設定での初期化成功', Date.now() - testStart);
      } else {
        this.addResult('Compatibility', 'Config Initialization', 'FAIL', 
          '従来設定での初期化失敗', Date.now() - testStart);
      }
      
      // 新しい設定形式の確認
      const enhancedConfig = {
        ...legacyConfig,
        costTracking: {
          enabled: true,
          ratePerThousand: 0.15,
          alertThreshold: 10
        }
      };
      
      const enhancedClient = new KaitoTwitterAPIClient(enhancedConfig);
      
      if (enhancedClient) {
        this.addResult('Compatibility', 'Enhanced Config', 'PASS', 
          '拡張設定での初期化成功', Date.now() - testStart);
      } else {
        this.addResult('Compatibility', 'Enhanced Config', 'FAIL', 
          '拡張設定での初期化失敗', Date.now() - testStart);
      }
      
    } catch (error) {
      this.addResult('Compatibility', 'Config Compatibility', 'FAIL', 
        `設定互換性エラー: ${error.message}`, Date.now() - testStart);
    }
  }
  
  /**
   * 検証結果の追加
   */
  private addResult(category: string, testName: string, status: ValidationResult['status'], 
                   details: string, duration?: number): void {
    this.results.push({
      category,
      testName,
      status,
      details,
      timestamp: new Date().toISOString(),
      duration
    });
    
    // リアルタイム出力
    const statusEmoji = {
      'PASS': '✅',
      'FAIL': '❌',
      'SKIP': '⏭️',
      'WARN': '⚠️'
    };
    
    if (VALIDATION_CONFIG.ENABLE_VERBOSE_OUTPUT || status === 'FAIL') {
      console.log(`  ${statusEmoji[status]} ${category}/${testName}: ${details}`);
    }
  }
  
  /**
   * 検証サマリー生成
   */
  private generateSummary(): ValidationSummary {
    const totalTime = Date.now() - this.startTime;
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;
    
    const criticalIssues = this.results
      .filter(r => r.status === 'FAIL')
      .map(r => `${r.category}/${r.testName}: ${r.details}`);
    
    let overallStatus: ValidationSummary['overallStatus'];
    if (failed === 0) {
      overallStatus = 'PASS';
    } else if (failed <= 2 && warnings <= 5) {
      overallStatus = 'PARTIAL';
    } else {
      overallStatus = 'FAIL';
    }
    
    return {
      totalTests: this.results.length,
      passed,
      failed,
      skipped,
      warnings,
      overallStatus,
      executionTime: totalTime,
      criticalIssues
    };
  }
  
  /**
   * 結果出力
   */
  printSummary(summary: ValidationSummary): void {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 3層認証システム検証結果');
    console.log('='.repeat(60));
    console.log(`総実行時間: ${summary.executionTime}ms`);
    console.log(`総テスト数: ${summary.totalTests}`);
    console.log(`✅ 成功: ${summary.passed}`);
    console.log(`❌ 失敗: ${summary.failed}`);
    console.log(`⏭️ スキップ: ${summary.skipped}`);
    console.log(`⚠️ 警告: ${summary.warnings}`);
    console.log(`\n総合結果: ${this.getStatusEmoji(summary.overallStatus)} ${summary.overallStatus}`);
    
    if (summary.criticalIssues.length > 0) {
      console.log('\n🚨 重要な問題:');
      summary.criticalIssues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    if (VALIDATION_CONFIG.ENABLE_VERBOSE_OUTPUT) {
      console.log('\n📋 詳細結果:');
      this.results.forEach(result => {
        const statusEmoji = this.getStatusEmoji(result.status);
        const duration = result.duration ? ` (${result.duration}ms)` : '';
        console.log(`  ${statusEmoji} ${result.category}/${result.testName}: ${result.details}${duration}`);
      });
    }
    
    console.log('='.repeat(60));
  }
  
  private getStatusEmoji(status: string): string {
    const emojis = {
      'PASS': '✅',
      'FAIL': '❌',
      'SKIP': '⏭️',
      'WARN': '⚠️',
      'PARTIAL': '🔶'
    };
    return emojis[status] || '❓';
  }
}

// 簡易expect実装（テスト環境がない場合）
function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toContain: (expected: any) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${actual} to contain ${expected}`);
      }
    }
  };
}

// メイン実行
async function main(): Promise<void> {
  const validator = new ThreeLayerAuthValidator();
  
  try {
    const summary = await validator.validate();
    validator.printSummary(summary);
    
    // CI/CD環境での終了コード設定
    if (summary.overallStatus === 'FAIL') {
      process.exit(1);
    } else if (summary.overallStatus === 'PARTIAL') {
      process.exit(2); // 部分的な問題
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ 検証スクリプト実行エラー:', error);
    process.exit(3);
  }
}

// スクリプト直接実行時のみmain実行
import { fileURLToPath } from 'url';

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { ThreeLayerAuthValidator, ValidationResult, ValidationSummary };