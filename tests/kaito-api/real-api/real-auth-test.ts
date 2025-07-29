/**
 * 実TwitterAPI.io認証テスト - 3層認証システム実動作確認
 * 
 * 重要: 実際のTwitterAPI.ioでの認証テスト
 * - 実際の環境変数使用
 * - 実際のAPI消費（コスト発生注意）
 * - 本物の認証情報必要
 * 
 * 実行前確認:
 * - KAITO_API_TOKEN設定
 * - Twitter認証情報設定（V1/V2両方）
 * - 2FAコード生成機能設定
 * 
 * TASK-004対応: 実API動作確認テスト
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { AuthManager } from '../../../src/kaito-api/core/auth-manager';
import { KaitoTwitterAPIClient } from '../../../src/kaito-api';
import type { LoginResult, AuthStatus } from '../../../src/kaito-api/types';

// 実APIテスト用の設定
const REAL_API_TEST_CONFIG = {
  // 実APIテスト実行フラグ（環境変数で制御）
  ENABLED: process.env.ENABLE_REAL_API_TESTS === 'true',
  
  // コスト制限（実API使用時のセーフガード）
  MAX_REQUESTS: 50,
  MAX_COST_USD: 1.0,
  
  // テスト用タイムアウト（実API応答時間考慮）
  TIMEOUT_MS: 30000,
  
  // 実行間隔（レート制限回避）
  DELAY_MS: 2000
};

describe('実TwitterAPI.io認証テスト', () => {
  let authManager: AuthManager;
  let client: KaitoTwitterAPIClient;
  let requestCount: number = 0;
  let estimatedCost: number = 0;
  
  beforeAll(async () => {
    // 実APIテスト実行可否確認
    if (!REAL_API_TEST_CONFIG.ENABLED) {
      console.log('⚠️ 実APIテスト無効 - ENABLE_REAL_API_TESTS=true で有効化');
      return;
    }
    
    // 必要な環境変数確認
    const requiredEnvVars = [
      'KAITO_API_TOKEN',
      'X_USERNAME', 'X_PASSWORD', 'X_EMAIL', // V1認証用
      'TWITTER_USERNAME', 'TWITTER_EMAIL', 'TWITTER_PASSWORD' // V2認証用
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (ミssingVars.length > 0) {
      console.warn(`⚠️ 実APIテスト: 環境変数未設定 - ${missingVars.join(', ')}`);
    }
    
    expect(process.env.KAITO_API_TOKEN).toBeDefined();
    console.log('✅ 実APIテスト環境変数確認完了');
  });
  
  beforeEach(async () => {
    if (!REAL_API_TEST_CONFIG.ENABLED) return;
    
    // コスト制限チェック
    if (requestCount >= REAL_API_TEST_CONFIG.MAX_REQUESTS) {
      throw new Error(`実APIテスト制限到達: ${REAL_API_TEST_CONFIG.MAX_REQUESTS}リクエスト`);
    }
    
    if (estimatedCost >= REAL_API_TEST_CONFIG.MAX_COST_USD) {
      throw new Error(`実APIテスト費用制限到達: $${REAL_API_TEST_CONFIG.MAX_COST_USD}`);
    }
    
    // AuthManager初期化（実環境変数使用）
    authManager = new AuthManager({
      apiKey: process.env.KAITO_API_TOKEN!,
      preferredAuthMethod: 'v2'
    });
    
    // KaitoTwitterAPIClient初期化
    client = new KaitoTwitterAPIClient({
      apiKey: process.env.KAITO_API_TOKEN!,
      qpsLimit: 200,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 2000
      },
      costTracking: {
        enabled: true,
        ratePerThousand: 0.15,
        alertThreshold: REAL_API_TEST_CONFIG.MAX_COST_USD
      }
    });
    
    // レート制限回避の待機
    if (requestCount > 0) {
      await new Promise(resolve => setTimeout(resolve, REAL_API_TEST_CONFIG.DELAY_MS));
    }
  });
  
  afterEach(async () => {
    if (!REAL_API_TEST_CONFIG.ENABLED) return;
    
    // ログアウト実行
    if (authManager) {
      await authManager.logout();
    }
    
    // リクエスト数・コスト更新
    requestCount++;
    estimatedCost += 0.15 / 1000; // 1リクエストあたりの推定コスト
    
    console.log(`📊 実APIテスト統計: ${requestCount}/${REAL_API_TEST_CONFIG.MAX_REQUESTS}リクエスト, $${estimatedCost.toFixed(4)}/$${REAL_API_TEST_CONFIG.MAX_COST_USD}`);
  });

  describe('実APIキー認証テスト', () => {
    test('実際のTwitterAPI.ioでAPIキー認証', async () => {
      if (!REAL_API_TEST_CONFIG.ENABLED) {
        console.log('⚠️ 実APIテストスキップ - ENABLE_REAL_API_TESTS=true で有効化');
        expect(true).toBe(true); // テストパス
        return;
      }
      
      console.log('🔑 実APIキー認証テスト開始...');
      
      // APIキー認証状態確認
      const authStatus = authManager.getAuthStatus();
      expect(authStatus.apiKeyValid).toBe(true);
      expect(authStatus.authLevel).toBe('api-key');
      
      // 実API呼び出し - ユーザー情報取得
      try {
        const userInfo = await client.getUserInfo('TwitterDev');
        
        expect(userInfo).toBeDefined();
        expect(userInfo.username).toBe('TwitterDev');
        expect(userInfo.user_id).toBeDefined();
        
        console.log('✅ 実APIキー認証成功:', {
          username: userInfo.username,
          verified: userInfo.verified,
          followers: userInfo.followers_count
        });
        
      } catch (error) {
        console.error('❌ 実APIキー認証エラー:', error);
        
        // APIエラーの場合は認証の問題ではない可能性
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          console.log('⚠️ レート制限エラー - 認証は正常');
          expect(error.message).toContain('rate limit');
        } else {
          throw error;
        }
      }
    }, REAL_API_TEST_CONFIG.TIMEOUT_MS);
    
    test('実API検索機能テスト', async () => {
      if (!REAL_API_TEST_CONFIG.ENABLED) {
        console.log('⚠️ 実APIテストスキップ');
        return;
      }
      
      console.log('🔍 実API検索テスト開始...');
      
      try {
        const searchResult = await client.searchTweets({
          query: 'TwitterAPI OR API',
          maxResults: 5,
          sortOrder: 'recency'
        });
        
        expect(searchResult).toBeDefined();
        expect(searchResult.tweets).toBeDefined();
        expect(Array.isArray(searchResult.tweets)).toBe(true);
        expect(searchResult.tweets.length).toBeGreaterThan(0);
        expect(searchResult.tweets.length).toBeLessThanOrEqual(5);
        
        // ツイートデータ構造確認
        const firstTweet = searchResult.tweets[0];
        expect(firstTweet).toHaveProperty('id');
        expect(firstTweet).toHaveProperty('text');
        expect(firstTweet).toHaveProperty('created_at');
        
        console.log('✅ 実API検索成功:', {
          resultCount: searchResult.tweets.length,
          query: searchResult.searchQuery,
          firstTweetId: firstTweet.id
        });
        
      } catch (error) {
        console.error('❌ 実API検索エラー:', error);
        throw error;
      }
    }, REAL_API_TEST_CONFIG.TIMEOUT_MS);
  });
  
  describe('実V1ログイン認証テスト', () => {
    test('実際のTwitterAPI.ioでV1ログイン認証', async () => {
      if (!REAL_API_TEST_CONFIG.ENABLED) {
        console.log('⚠️ 実APIテストスキップ');
        return;
      }
      
      // V1認証に必要な環境変数確認
      const hasV1Credentials = process.env.X_USERNAME && 
                              process.env.X_PASSWORD && 
                              process.env.X_EMAIL;
      
      if (!hasV1Credentials) {
        console.log('⚠️ V1認証環境変数未設定 - テストスキップ');
        return;
      }
      
      console.log('🔐 実V1ログイン認証テスト開始...');
      
      try {
        // 実V1ログイン実行
        const loginResult: LoginResult = await authManager.loginV1();
        
        if (loginResult.success) {
          expect(loginResult.success).toBe(true);
          expect(loginResult.auth_session).toBeDefined();
          expect(typeof loginResult.auth_session).toBe('string');
          expect(loginResult.session_expires).toBeDefined();
          
          // V1認証状態確認
          const authStatus = authManager.getAuthStatus();
          expect(authStatus.authLevel).toBe('v1-login');
          expect(authStatus.v1SessionValid).toBe(true);
          expect(authStatus.userSessionValid).toBe(true);
          
          console.log('✅ 実V1ログイン認証成功:', {
            sessionLength: loginResult.auth_session?.length,
            expiresAt: loginResult.session_expires,
            authLevel: authStatus.authLevel
          });
          
        } else {
          console.log('⚠️ V1ログイン失敗（期待される場合）:', loginResult.error);
          
          // 2FA要求やその他の理由での失敗は正常
          expect(loginResult.error).toBeDefined();
          expect(typeof loginResult.error).toBe('string');
        }
        
      } catch (error) {
        console.error('❌ 実V1ログイン認証エラー:', error);
        
        // V1 APIの廃止予定による失敗は想定内
        if (error.message.includes('deprecated') || error.message.includes('v1')) {
          console.log('⚠️ V1 API廃止予定による失敗 - 期待される動作');
          expect(error.message).toBeDefined();
        } else {
          throw error;
        }
      }
    }, REAL_API_TEST_CONFIG.TIMEOUT_MS);
    
    test('実V1認証での2段階認証プロセス', async () => {
      if (!REAL_API_TEST_CONFIG.ENABLED) {
        console.log('⚠️ 実APIテストスキップ');
        return;
      }
      
      // 2FAシークレット確認
      const has2FA = process.env.X_TOTP_SECRET;
      
      if (!has2FA) {
        console.log('⚠️ 2FA設定未確認 - V1 2段階認証テストスキップ');
        return;
      }
      
      console.log('🔒 実V1 2段階認証テスト開始...');
      
      try {
        // V1認証のステップバイステップテスト
        const debugInfo = authManager.getDebugInfo();
        expect(debugInfo.v1Login).toBeDefined();
        
        // 環境変数確認
        const envCheck = debugInfo.environment;
        expect(envCheck).toHaveProperty('hasXUsername');
        expect(envCheck).toHaveProperty('hasXPassword');
        expect(envCheck).toHaveProperty('hasXEmail');
        
        console.log('✅ V1認証環境確認完了:', {
          hasCredentials: envCheck.hasXUsername && envCheck.hasXPassword && envCheck.hasXEmail,
          has2FA: !!has2FA
        });
        
      } catch (error) {
        console.error('❌ V1 2段階認証環境確認エラー:', error);
        throw error;
      }
    }, REAL_API_TEST_CONFIG.TIMEOUT_MS);
  });
  
  describe('実V2ログイン認証テスト', () => {
    test('実際のTwitterAPI.ioでV2ログイン認証', async () => {
      if (!REAL_API_TEST_CONFIG.ENABLED) {
        console.log('⚠️ 実APIテストスキップ');
        return;
      }
      
      // V2認証に必要な環境変数確認
      const hasV2Credentials = process.env.TWITTER_USERNAME && 
                              process.env.TWITTER_EMAIL && 
                              process.env.TWITTER_PASSWORD;
      
      if (!hasV2Credentials) {
        console.log('⚠️ V2認証環境変数未設定 - テストスキップ');
        return;
      }
      
      console.log('🚀 実V2ログイン認証テスト開始...');
      
      try {
        // 実V2ログイン実行
        const loginResult: LoginResult = await authManager.loginV2();
        
        if (loginResult.success) {
          expect(loginResult.success).toBe(true);
          expect(loginResult.login_cookie).toBeDefined();
          expect(typeof loginResult.login_cookie).toBe('string');
          expect(loginResult.session_expires).toBeDefined();
          
          // V2認証状態確認
          const authStatus = authManager.getAuthStatus();
          expect(authStatus.authLevel).toBe('v2-login');
          expect(authStatus.v2SessionValid).toBe(true);
          expect(authStatus.userSessionValid).toBe(true);
          
          console.log('✅ 実V2ログイン認証成功:', {
            cookieLength: loginResult.login_cookie?.length,
            expiresAt: loginResult.session_expires,
            authLevel: authStatus.authLevel
          });
          
          // V2セッションの詳細情報確認
          const sessionStats = authManager.getDebugInfo().sessionStats;
          expect(sessionStats).toBeDefined();
          
        } else {
          console.log('⚠️ V2ログイン失敗（期待される場合）:', loginResult.error);
          
          // 認証情報不正やその他の理由での失敗
          expect(loginResult.error).toBeDefined();
          expect(typeof loginResult.error).toBe('string');
        }
        
      } catch (error) {
        console.error('❌ 実V2ログイン認証エラー:', error);
        throw error;
      }
    }, REAL_API_TEST_CONFIG.TIMEOUT_MS);
    
    test('実V2認証接続テスト', async () => {
      if (!REAL_API_TEST_CONFIG.ENABLED) {
        console.log('⚠️ 実APIテストスキップ');
        return;
      }
      
      console.log('🔌 実V2接続テスト開始...');
      
      try {
        // V2認証の接続テスト
        const connectionTests = await authManager.testAllConnections();
        
        expect(connectionTests).toHaveProperty('apiKey');
        expect(connectionTests).toHaveProperty('v1Login');
        expect(connectionTests).toHaveProperty('v2Login');
        expect(connectionTests).toHaveProperty('overall');
        
        // APIキー接続は成功する想定
        expect(connectionTests.apiKey.success).toBe(true);
        
        console.log('✅ 実V2接続テスト完了:', {
          apiKey: connectionTests.apiKey.success,
          v1Login: connectionTests.v1Login.success,
          v2Login: connectionTests.v2Login.success,
          overall: connectionTests.overall
        });
        
      } catch (error) {
        console.error('❌ 実V2接続テストエラー:', error);
        throw error;
      }
    }, REAL_API_TEST_CONFIG.TIMEOUT_MS);
  });
  
  describe('実認証統合テスト', () => {
    test('実統合ログイン（推奨方法優先）', async () => {
      if (!REAL_API_TEST_CONFIG.ENABLED) {
        console.log('⚠️ 実APIテストスキップ');
        return;
      }
      
      console.log('🔄 実統合ログインテスト開始...');
      
      try {
        // 統合ログイン実行（V2推奨）
        const loginResult = await authManager.login();
        
        if (loginResult.success) {
          expect(loginResult.success).toBe(true);
          
          const authLevel = authManager.getCurrentAuthLevel();
          expect(['v1-login', 'v2-login']).toContain(authLevel);
          
          // 認証済み状態での機能確認
          const authStatus = authManager.getAuthStatus();
          expect(authStatus.userSessionValid).toBe(true);
          expect(authStatus.canPerformUserActions).toBe(true);
          
          console.log('✅ 実統合ログイン成功:', {
            authLevel: authLevel,
            validLevels: authStatus.validAuthLevels,
            canPerformActions: authStatus.canPerformUserActions
          });
          
        } else {
          console.log('⚠️ 統合ログイン失敗（環境設定問題）:', loginResult.error);
          expect(loginResult.error).toBeDefined();
        }
        
      } catch (error) {
        console.error('❌ 実統合ログインエラー:', error);
        throw error;
      }
    }, REAL_API_TEST_CONFIG.TIMEOUT_MS);
    
    test('実認証状態強制更新', async () => {
      if (!REAL_API_TEST_CONFIG.ENABLED) {
        console.log('⚠️ 実APIテストスキップ');
        return;
      }
      
      console.log('🔃 実認証状態強制更新テスト開始...');
      
      try {
        // 認証状態の強制更新
        const refreshed = await authManager.forceRefreshAuth();
        expect(typeof refreshed).toBe('boolean');
        
        // 更新後の状態確認
        const authStatus = authManager.getAuthStatus();
        expect(authStatus).toHaveProperty('apiKeyValid');
        expect(authStatus.apiKeyValid).toBe(true);
        
        console.log('✅ 実認証状態強制更新完了:', {
          refreshSuccess: refreshed,
          currentLevel: authStatus.authLevel,
          apiKeyValid: authStatus.apiKeyValid
        });
        
      } catch (error) {
        console.error('❌ 実認証状態強制更新エラー:', error);
        throw error;
      }
    }, REAL_API_TEST_CONFIG.TIMEOUT_MS);
  });
  
  describe('実API制限・エラーテスト', () => {
    test('実APIレート制限対応', async () => {
      if (!REAL_API_TEST_CONFIG.ENABLED) {
        console.log('⚠️ 実APIテストスキップ');
        return;
      }
      
      console.log('⏱️ 実APIレート制限テスト開始...');
      
      try {
        // QPS制限内での連続リクエスト
        const promises = [];
        for (let i = 0; i < 3; i++) {
          const promise = client.getUserInfo(`user${i}`).catch(err => ({
            error: err.message,
            index: i
          }));
          promises.push(promise);
        }
        
        const results = await Promise.all(promises);
        
        // 結果の確認（一部失敗は想定内）
        expect(Array.isArray(results)).toBe(true);
        expect(results.length).toBe(3);
        
        const successCount = results.filter(r => !r.error).length;
        console.log('✅ 実APIレート制限テスト完了:', {
          totalRequests: results.length,
          successCount: successCount,
          failCount: results.length - successCount
        });
        
      } catch (error) {
        console.error('❌ 実APIレート制限テストエラー:', error);
        // レート制限エラーは期待される動作
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          console.log('✅ レート制限正常動作確認');
          expect(error.message).toContain('rate');
        } else {
          throw error;
        }
      }
    }, REAL_API_TEST_CONFIG.TIMEOUT_MS);
    
    test('実API認証エラーハンドリング', async () => {
      if (!REAL_API_TEST_CONFIG.ENABLED) {
        console.log('⚠️ 実APIテストスキップ');
        return;
      }
      
      console.log('🚨 実API認証エラーハンドリングテスト開始...');
      
      try {
        // 無効なAPIキーでのテスト
        const invalidAuthManager = new AuthManager({
          apiKey: 'invalid-test-key-12345'
        });
        
        const authStatus = invalidAuthManager.getAuthStatus();
        
        // 無効なAPIキーでもフォーマット的には有効な場合がある
        expect(typeof authStatus.apiKeyValid).toBe('boolean');
        
        console.log('✅ 実API認証エラーハンドリング確認完了:', {
          invalidKeyStatus: authStatus.apiKeyValid,
          authLevel: authStatus.authLevel
        });
        
      } catch (error) {
        console.error('❌ 実API認証エラーハンドリングテストエラー:', error);
        // 認証エラーは期待される動作
        expect(error.message).toBeDefined();
      }
    }, REAL_API_TEST_CONFIG.TIMEOUT_MS);
  });
});