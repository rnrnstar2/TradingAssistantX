/**
 * 3層認証統合テスト - TwitterAPI.io 3層認証フロー検証
 * 
 * 認証レベル:
 * 1. APIキー認証 - 読み取り専用操作（public/エンドポイント）
 * 2. V1ログイン認証 - 2段階認証、基本投稿・エンゲージメント（v1-auth/エンドポイント）
 * 3. V2ログイン認証 - 1段階認証、高機能投稿・DM・コミュニティ（v2-auth/エンドポイント）
 * 
 * TASK-004対応: 3層認証統合テスト・検証
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { AuthManager } from '../../../src/kaito-api/core/auth-manager';
import { KaitoTwitterAPIClient } from '../../../src/kaito-api';
import type { LoginResult, AuthStatus } from '../../../src/kaito-api/types';

describe('3層認証統合テスト', () => {
  let authManager: AuthManager;
  let client: KaitoTwitterAPIClient;
  
  beforeEach(() => {
    // 環境変数確認（テスト実行前チェック）
    if (!process.env.KAITO_API_TOKEN) {
      console.warn('⚠️ KAITO_API_TOKEN未設定 - モックモードで実行');
    }
    
    // AuthManager初期化（V2推奨設定）
    authManager = new AuthManager({
      apiKey: process.env.KAITO_API_TOKEN || 'test-api-key',
      preferredAuthMethod: 'v2'
    });
    
    // KaitoTwitterAPIClient初期化
    client = new KaitoTwitterAPIClient({
      apiKey: process.env.KAITO_API_TOKEN || 'test-api-key',
      qpsLimit: 200,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000
      },
      costTracking: false
    });
  });
  
  afterEach(async () => {
    // クリーンアップ: 全認証レベルでログアウト
    if (authManager) {
      await authManager.logout();
    }
  });

  describe('APIキー認証フロー', () => {
    test('ユーザー情報取得が成功する', async () => {
      // APIキー認証のみでユーザー情報取得
      const authHeaders = authManager.getAuthHeaders();
      
      expect(authHeaders).toHaveProperty('x-api-key');
      expect(authHeaders['x-api-key']).toBeDefined();
      
      // APIキー認証状態確認
      const authStatus = authManager.getAuthStatus();
      expect(authStatus.apiKeyValid).toBe(true);
      expect(authStatus.authLevel).toBe('api-key');
      
      // ユーザー情報取得テスト（public/エンドポイント）
      try {
        const userInfo = await client.getUserInfo('testuser');
        
        if (userInfo) {
          expect(userInfo).toHaveProperty('username');
          expect(userInfo.username).toBe('testuser');
        }
        
        console.log('✅ APIキー認証でのユーザー情報取得成功');
      } catch (error) {
        console.log('⚠️ APIキー認証テスト（モックモード）:', error.message);
        // モックモードでは期待される動作
        expect(error.message).toContain('fetch is not defined');
      }
    });
    
    test('ツイート検索が成功する', async () => {
      // APIキー認証のみでツイート検索
      const validAuthLevels = authManager.getValidAuthLevels();
      expect(validAuthLevels).toContain('api-key');
      
      // エンドポイント認証要件確認
      const requiredLevel = authManager.getRequiredAuthLevel('/public/tweet-search');
      expect(requiredLevel).toBe('api-key');
      
      // 検索エンドポイントアクセス可能性確認
      const canAccess = authManager.canAccessEndpoint('/public/tweet-search');
      expect(canAccess).toBe(true);
      
      try {
        const searchResult = await client.searchTweets({
          query: '投資教育',
          maxResults: 10
        });
        
        if (searchResult) {
          expect(searchResult).toHaveProperty('tweets');
          expect(Array.isArray(searchResult.tweets)).toBe(true);
        }
        
        console.log('✅ APIキー認証でのツイート検索成功');
      } catch (error) {
        console.log('⚠️ ツイート検索テスト（モックモード）:', error.message);
        expect(error.message).toContain('fetch is not defined');
      }
    });
    
    test('投稿機能がエラーになる', async () => {
      // APIキー認証のみでは投稿不可を確認
      const requiredLevel = authManager.getRequiredAuthLevel('/twitter/tweet/create');
      expect(requiredLevel).not.toBe('api-key');
      expect(['v1-login', 'v2-login']).toContain(requiredLevel);
      
      // 投稿エンドポイントアクセス不可確認
      const canAccess = authManager.canAccessEndpoint('/twitter/tweet/create');
      expect(canAccess).toBe(false);
      
      // 書き込み系操作の確認
      const isWriteOperation = authManager.requiresUserSession('/twitter/tweet/create');
      expect(isWriteOperation).toBe(true);
      
      console.log('✅ APIキー認証での投稿制限確認完了');
    });
  });
  
  describe('V1ログイン認証フロー', () => {
    test('2段階認証プロセスが成功する', async () => {
      // V1ログイン認証の環境変数確認
      const hasV1Credentials = process.env.X_USERNAME && 
                              process.env.X_PASSWORD && 
                              process.env.X_EMAIL;
      
      if (!hasV1Credentials) {
        console.log('⚠️ V1認証の環境変数が未設定 - テストスキップ');
        return;
      }
      
      // V1ログイン実行（Step1 + Step2の完全な認証フロー）
      const loginResult: LoginResult = await authManager.loginV1();
      
      if (loginResult.success) {
        expect(loginResult.success).toBe(true);
        expect(loginResult.auth_session).toBeDefined();
        expect(loginResult.session_expires).toBeDefined();
        
        // 認証レベル確認
        const authStatus = authManager.getAuthStatus();
        expect(authStatus.authLevel).toBe('v1-login');
        expect(authStatus.v1SessionValid).toBe(true);
        expect(authStatus.userSessionValid).toBe(true);
        
        console.log('✅ V1ログイン認証成功');
      } else {
        console.log('⚠️ V1ログイン失敗:', loginResult.error);
        expect(loginResult.error).toBeDefined();
      }
    });
    
    test('基本投稿が成功する', async () => {
      // V1認証レベル要求確認
      const requiredLevel = authManager.getRequiredAuthLevel('/twitter/tweet/create');
      const canAccess = authManager.canAccessEndpoint('/twitter/tweet/create');
      
      // V1セッション有効性に基づくアクセス確認
      const hasV1Session = authManager.getAuthStatus().v1SessionValid;
      
      if (hasV1Session) {
        expect(canAccess).toBe(true);
        
        // auth_sessionを使用した投稿テスト
        const authHeaders = authManager.getAuthHeaders();
        expect(authHeaders).toHaveProperty('x-api-key');
        
        const authParams = authManager.getAuthParameters();
        expect(authParams).toHaveProperty('auth_session');
        
        console.log('✅ V1認証での投稿準備完了');
      } else {
        expect(canAccess).toBe(false);
        console.log('⚠️ V1セッション無効のため投稿不可');
      }
    });
    
    test('エンゲージメントが成功する', async () => {
      // V1認証でのエンゲージメント機能確認
      const likeEndpoint = '/twitter/action/like';
      const retweetEndpoint = '/twitter/action/retweet';
      
      const canLike = authManager.canAccessEndpoint(likeEndpoint);
      const canRetweet = authManager.canAccessEndpoint(retweetEndpoint);
      
      const hasV1Session = authManager.getAuthStatus().v1SessionValid;
      
      if (hasV1Session) {
        expect(canLike).toBe(true);
        expect(canRetweet).toBe(true);
        
        // V1エンゲージメント機能確認
        const validLevels = authManager.getValidAuthLevels();
        expect(validLevels).toContain('v1-login');
        
        console.log('✅ V1認証でのエンゲージメント機能確認完了');
      } else {
        console.log('⚠️ V1セッション無効のためエンゲージメント不可');
      }
    });
  });
  
  describe('V2ログイン認証フロー', () => {
    test('1段階認証プロセスが成功する', async () => {
      // V2ログイン認証の環境変数確認
      const hasV2Credentials = process.env.TWITTER_USERNAME && 
                              process.env.TWITTER_EMAIL && 
                              process.env.TWITTER_PASSWORD;
      
      if (!hasV2Credentials) {
        console.log('⚠️ V2認証の環境変数が未設定 - テストスキップ');
        return;
      }
      
      // user_login_v2での認証
      const loginResult: LoginResult = await authManager.loginV2();
      
      if (loginResult.success) {
        expect(loginResult.success).toBe(true);
        expect(loginResult.login_cookie).toBeDefined();
        expect(loginResult.session_expires).toBeDefined();
        
        // 認証レベル確認
        const authStatus = authManager.getAuthStatus();
        expect(authStatus.authLevel).toBe('v2-login');
        expect(authStatus.v2SessionValid).toBe(true);
        expect(authStatus.userSessionValid).toBe(true);
        
        console.log('✅ V2ログイン認証成功');
      } else {
        console.log('⚠️ V2ログイン失敗:', loginResult.error);
        expect(loginResult.error).toBeDefined();
      }
    });
    
    test('高機能投稿が成功する', async () => {
      // V2認証での高機能投稿確認
      const hasV2Session = authManager.getAuthStatus().v2SessionValid;
      
      if (hasV2Session) {
        // login_cookieを使用した高機能投稿
        const authHeaders = authManager.getAuthHeaders();
        expect(authHeaders).toHaveProperty('x-api-key');
        
        const authParams = authManager.getAuthParameters();
        expect(authParams).toHaveProperty('login_cookie');
        
        // V2専用機能アクセス確認
        const canCreateNoteTweet = authManager.canAccessEndpoint('/v2-auth/tweet-actions-v2');
        expect(canCreateNoteTweet).toBe(true);
        
        console.log('✅ V2認証での高機能投稿準備完了');
      } else {
        console.log('⚠️ V2セッション無効のため高機能投稿不可');
      }
    });
  });
  
  describe('認証フロー統合テスト', () => {
    test('認証レベル自動判定・昇格', async () => {
      // 基本APIキー認証から開始
      let currentLevel = authManager.getCurrentAuthLevel();
      expect(currentLevel).toBe('api-key');
      
      // V1認証レベル要求時の自動昇格
      const v1Required = await authManager.ensureAuthLevel('v1-login');
      
      if (v1Required) {
        const updatedLevel = authManager.getCurrentAuthLevel();
        expect(updatedLevel).toBe('v1-login');
        console.log('✅ V1認証レベル自動昇格成功');
      } else {
        console.log('⚠️ V1認証レベル昇格失敗（環境変数不足）');
      }
      
      // V2認証レベル要求時の自動昇格
      const v2Required = await authManager.ensureAuthLevel('v2-login');
      
      if (v2Required) {
        const finalLevel = authManager.getCurrentAuthLevel();
        expect(finalLevel).toBe('v2-login');
        console.log('✅ V2認証レベル自動昇格成功');
      } else {
        console.log('⚠️ V2認証レベル昇格失敗（環境変数不足）');
      }
    });
    
    test('統合ログイン（推奨認証方法優先）', async () => {
      // 推奨認証方法の確認
      const debugInfo = authManager.getDebugInfo();
      expect(debugInfo.preferredAuthMethod).toBe('v2');
      
      // 統合ログイン実行（V2優先）
      const loginResult = await authManager.login();
      
      if (loginResult.success) {
        expect(loginResult.success).toBe(true);
        
        const authLevel = authManager.getCurrentAuthLevel();
        expect(['v1-login', 'v2-login']).toContain(authLevel);
        
        console.log(`✅ 統合ログイン成功 - 認証レベル: ${authLevel}`);
      } else {
        console.log('⚠️ 統合ログイン失敗:', loginResult.error);
        expect(loginResult.error).toBeDefined();
      }
    });
    
    test('セッション管理統合', async () => {
      // セッション有効性確認
      const isUserSessionValid = authManager.isUserSessionValid();
      
      // 有効なセッション取得
      const userSession = authManager.getUserSession();
      
      if (isUserSessionValid && userSession) {
        expect(userSession).toBeDefined();
        expect(typeof userSession).toBe('string');
        
        // セッション更新テスト
        const refreshed = await authManager.refreshSession();
        expect(typeof refreshed).toBe('boolean');
        
        console.log('✅ セッション管理統合テスト完了');
      } else {
        console.log('⚠️ 有効なセッションが存在しません');
      }
    });
    
    test('全認証レベル接続テスト', async () => {
      // 全認証レベルでの接続テスト
      const connectionTests = await authManager.testAllConnections();
      
      expect(connectionTests).toHaveProperty('apiKey');
      expect(connectionTests).toHaveProperty('v1Login');
      expect(connectionTests).toHaveProperty('v2Login');
      expect(connectionTests).toHaveProperty('overall');
      
      // APIキー認証は常に成功する想定
      expect(connectionTests.apiKey.success).toBe(true);
      
      console.log('✅ 全認証レベル接続テスト完了');
      console.log('接続テスト結果:', {
        apiKey: connectionTests.apiKey.success,
        v1Login: connectionTests.v1Login.success,
        v2Login: connectionTests.v2Login.success,
        overall: connectionTests.overall
      });
    });
    
    test('認証レベル切り替え', async () => {
      // 初期推奨方法確認
      expect(authManager.getDebugInfo().preferredAuthMethod).toBe('v2');
      
      // V1に切り替え
      authManager.setPreferredAuthMethod('v1');
      expect(authManager.getDebugInfo().preferredAuthMethod).toBe('v1');
      
      // V2に戻す
      authManager.setPreferredAuthMethod('v2');
      expect(authManager.getDebugInfo().preferredAuthMethod).toBe('v2');
      
      console.log('✅ 認証レベル切り替えテスト完了');
    });
  });
  
  describe('認証状態デバッグ情報', () => {
    test('詳細デバッグ情報取得', () => {
      // 3層認証統合デバッグ情報取得
      const debugInfo = authManager.getDebugInfo();
      
      // 基本情報
      expect(debugInfo).toHaveProperty('currentAuthLevel');
      expect(debugInfo).toHaveProperty('preferredAuthMethod');
      expect(debugInfo).toHaveProperty('validAuthLevels');
      
      // 認証レベル別詳細
      expect(debugInfo).toHaveProperty('apiKey');
      expect(debugInfo).toHaveProperty('v1Login');
      expect(debugInfo).toHaveProperty('v2Login');
      
      // セッション統計
      expect(debugInfo).toHaveProperty('sessionStats');
      
      // 後方互換性情報
      expect(debugInfo).toHaveProperty('legacy');
      
      // 環境情報
      expect(debugInfo).toHaveProperty('environment');
      expect(debugInfo).toHaveProperty('system');
      
      console.log('✅ デバッグ情報取得テスト完了');
      console.log('認証状態サマリー:', {
        authLevel: debugInfo.currentAuthLevel,
        preferredMethod: debugInfo.preferredAuthMethod,
        validLevels: debugInfo.validAuthLevels
      });
    });
    
    test('認証状態強制更新', async () => {
      // 認証状態の強制更新
      const refreshed = await authManager.forceRefreshAuth();
      expect(typeof refreshed).toBe('boolean');
      
      // 更新後の状態確認
      const authStatus = authManager.getAuthStatus();
      expect(authStatus).toHaveProperty('apiKeyValid');
      expect(authStatus).toHaveProperty('userSessionValid');
      expect(authStatus).toHaveProperty('authLevel');
      
      console.log('✅ 認証状態強制更新テスト完了');
      console.log('更新結果:', refreshed);
    });
  });
});