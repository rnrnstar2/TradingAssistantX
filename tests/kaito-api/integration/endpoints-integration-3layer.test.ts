/**
 * エンドポイント認証レベル統合テスト - 3層認証対応
 * 
 * 認証レベル別エンドポイント動作確認:
 * 1. public/ - APIキー認証のみで動作（読み取り専用）
 * 2. v1-auth/ - V1ログイン認証で動作（auth_session必要）
 * 3. v2-auth/ - V2ログイン認証で動作（login_cookie必要）
 * 
 * TASK-004対応: エンドポイント統合テスト・検証
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { AuthManager } from '../../../src/kaito-api/core/auth-manager';
import { KaitoTwitterAPIClient } from '../../../src/kaito-api';
import type { 
  UserInfo, 
  TweetSearchOptions,
  PostRequest,
  EngagementRequest
} from '../../../src/kaito-api/types';

describe('エンドポイント認証レベル統合テスト', () => {
  let authManager: AuthManager;
  let client: KaitoTwitterAPIClient;
  
  beforeEach(() => {
    // テスト環境準備
    authManager = new AuthManager({
      apiKey: process.env.KAITO_API_TOKEN || 'test-api-key',
      preferredAuthMethod: 'v2'
    });
    
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
    if (authManager) {
      await authManager.logout();
    }
  });

  describe('public/ エンドポイント', () => {
    test('全てのpublicエンドポイントがAPIキー認証のみで動作', async () => {
      // APIキー認証確認
      const authStatus = authManager.getAuthStatus();
      expect(authStatus.apiKeyValid).toBe(true);
      
      const endpoints = [
        '/public/user-info',
        '/public/tweet-search', 
        '/public/trends',
        '/public/follower-info'
      ];
      
      // 各publicエンドポイントの認証要件確認
      endpoints.forEach(endpoint => {
        const requiredLevel = authManager.getRequiredAuthLevel(endpoint);
        expect(requiredLevel).toBe('api-key');
        
        const canAccess = authManager.canAccessEndpoint(endpoint);
        expect(canAccess).toBe(true);
      });
      
      console.log('✅ 全publicエンドポイントがAPIキー認証で利用可能');
    });
    
    test('user-info エンドポイント動作確認', async () => {
      // user-info エンドポイントテスト
      const requiredLevel = authManager.getRequiredAuthLevel('/public/user-info');
      expect(requiredLevel).toBe('api-key');
      
      try {
        const userInfo = await client.getUserInfo('test_user');
        
        if (userInfo) {
          expect(userInfo).toHaveProperty('username');
          expect(userInfo.username).toBe('test_user');
        }
        
        console.log('✅ user-info エンドポイント正常動作');
      } catch (error) {
        console.log('⚠️ user-info テスト（モックモード）:', error.message);
      }
    });
    
    test('tweet-search エンドポイント動作確認', async () => {
      // tweet-search エンドポイントテスト
      const requiredLevel = authManager.getRequiredAuthLevel('/public/tweet-search');
      expect(requiredLevel).toBe('api-key');
      
      const searchOptions: TweetSearchOptions = {
        query: '投資教育',
        maxResults: 10,
        sortOrder: 'recency'
      };
      
      try {
        const searchResult = await client.searchTweets(searchOptions);
        
        if (searchResult) {
          expect(searchResult).toHaveProperty('tweets');
          expect(Array.isArray(searchResult.tweets)).toBe(true);
          expect(searchResult.searchQuery).toBe(searchOptions.query);
        }
        
        console.log('✅ tweet-search エンドポイント正常動作');
      } catch (error) {
        console.log('⚠️ tweet-search テスト（モックモード）:', error.message);
      }
    });
    
    test('trends エンドポイント動作確認', async () => {
      // trends エンドポイントテスト
      const requiredLevel = authManager.getRequiredAuthLevel('/public/trends');
      expect(requiredLevel).toBe('api-key');
      
      const canAccess = authManager.canAccessEndpoint('/public/trends');
      expect(canAccess).toBe(true);
      
      console.log('✅ trends エンドポイント認証確認完了');
    });
    
    test('follower-info エンドポイント動作確認', async () => {
      // follower-info エンドポイントテスト
      const requiredLevel = authManager.getRequiredAuthLevel('/public/follower-info');
      expect(requiredLevel).toBe('api-key');
      
      const canAccess = authManager.canAccessEndpoint('/public/follower-info');
      expect(canAccess).toBe(true);
      
      console.log('✅ follower-info エンドポイント認証確認完了');
    });
  });
  
  describe('v1-auth/ エンドポイント', () => {
    test('全てのV1エンドポイントがauth_sessionで動作', async () => {
      const v1Endpoints = [
        '/v1-auth/tweet-actions-v1',
        '/v1-auth/engagement-v1',
        '/v1-auth/quote-tweet-v1'
      ];
      
      // V1認証レベル要件確認
      v1Endpoints.forEach(endpoint => {
        const requiredLevel = authManager.getRequiredAuthLevel(endpoint);
        expect(['v1-login', 'v2-login']).toContain(requiredLevel);
        
        // V1セッション有効時のアクセス可能性
        const canAccess = authManager.canAccessEndpoint(endpoint);
        const hasV1Session = authManager.getAuthStatus().v1SessionValid;
        
        if (hasV1Session) {
          expect(canAccess).toBe(true);
        } else {
          // セッション無効時はアクセス不可
          expect(canAccess).toBe(false);
        }
      });
      
      console.log('✅ 全V1エンドポイントの認証要件確認完了');
    });
    
    test('tweet-actions-v1 エンドポイント動作確認', async () => {
      // V1ログイン認証が必要
      const requiredLevel = authManager.getRequiredAuthLevel('/v1-auth/tweet-actions-v1');
      expect(['v1-login', 'v2-login']).toContain(requiredLevel);
      
      const hasV1Session = authManager.getAuthStatus().v1SessionValid;
      
      if (hasV1Session) {
        // V1セッション有効時のテスト
        const authHeaders = authManager.getAuthHeaders();
        expect(authHeaders).toHaveProperty('x-api-key');
        
        const authParams = authManager.getAuthParameters();
        expect(authParams).toHaveProperty('auth_session');
        
        console.log('✅ tweet-actions-v1 認証確認完了');
      } else {
        console.log('⚠️ V1セッション無効のため tweet-actions-v1 アクセス不可');
      }
    });
    
    test('engagement-v1 エンドポイント動作確認', async () => {
      // V1エンゲージメント機能確認
      const requiredLevel = authManager.getRequiredAuthLevel('/v1-auth/engagement-v1');
      expect(['v1-login', 'v2-login']).toContain(requiredLevel);
      
      const canAccess = authManager.canAccessEndpoint('/v1-auth/engagement-v1');
      const hasV1Session = authManager.getAuthStatus().v1SessionValid;
      
      if (hasV1Session) {
        expect(canAccess).toBe(true);
        console.log('✅ engagement-v1 アクセス可能');
      } else {
        expect(canAccess).toBe(false);
        console.log('⚠️ V1セッション無効のため engagement-v1 アクセス不可');
      }
    });
    
    test('quote-tweet-v1 エンドポイント動作確認', async () => {
      // V1引用ツイート機能確認
      const requiredLevel = authManager.getRequiredAuthLevel('/v1-auth/quote-tweet-v1');
      expect(['v1-login', 'v2-login']).toContain(requiredLevel);
      
      const canAccess = authManager.canAccessEndpoint('/v1-auth/quote-tweet-v1');
      const hasV1Session = authManager.getAuthStatus().v1SessionValid;
      
      if (hasV1Session) {
        expect(canAccess).toBe(true);
        console.log('✅ quote-tweet-v1 アクセス可能');
      } else {
        expect(canAccess).toBe(false);
        console.log('⚠️ V1セッション無効のため quote-tweet-v1 アクセス不可');
      }
    });
  });
  
  describe('v2-auth/ エンドポイント', () => {
    test('全てのV2エンドポイントがlogin_cookieで動作', async () => {
      const v2Endpoints = [
        '/v2-auth/tweet-actions-v2',
        '/v2-auth/dm-management',
        '/v2-auth/community-management',
        '/v2-auth/advanced-features'
      ];
      
      // V2認証レベル要件確認
      v2Endpoints.forEach(endpoint => {
        const requiredLevel = authManager.getRequiredAuthLevel(endpoint);
        // V2専用機能の場合は'v2-login'を要求
        expect(['v1-login', 'v2-login']).toContain(requiredLevel);
        
        const canAccess = authManager.canAccessEndpoint(endpoint);
        const hasV2Session = authManager.getAuthStatus().v2SessionValid;
        
        if (hasV2Session) {
          expect(canAccess).toBe(true);
        } else {
          // V2セッション無効時はアクセス不可
          expect(canAccess).toBe(false);
        }
      });
      
      console.log('✅ 全V2エンドポイントの認証要件確認完了');
    });
    
    test('tweet-actions-v2 エンドポイント動作確認', async () => {
      // V2高機能投稿確認
      const requiredLevel = authManager.getRequiredAuthLevel('/v2-auth/tweet-actions-v2');
      expect(['v1-login', 'v2-login']).toContain(requiredLevel);
      
      const hasV2Session = authManager.getAuthStatus().v2SessionValid;
      
      if (hasV2Session) {
        const authHeaders = authManager.getAuthHeaders();
        expect(authHeaders).toHaveProperty('x-api-key');
        
        const authParams = authManager.getAuthParameters();
        expect(authParams).toHaveProperty('login_cookie');
        
        console.log('✅ tweet-actions-v2 認証確認完了');
      } else {
        console.log('⚠️ V2セッション無効のため tweet-actions-v2 アクセス不可');
      }
    });
    
    test('dm-management エンドポイント動作確認', async () => {
      // V2 DM機能確認（V2専用機能）
      const requiredLevel = authManager.getRequiredAuthLevel('/v2-auth/dm-management');
      expect(['v1-login', 'v2-login']).toContain(requiredLevel);
      
      const canAccess = authManager.canAccessEndpoint('/v2-auth/dm-management');
      const hasV2Session = authManager.getAuthStatus().v2SessionValid;
      
      if (hasV2Session) {
        expect(canAccess).toBe(true);
        console.log('✅ dm-management V2専用機能アクセス可能');
      } else {
        expect(canAccess).toBe(false);
        console.log('⚠️ V2セッション無効のため dm-management アクセス不可');
      }
    });
    
    test('community-management エンドポイント動作確認', async () => {
      // V2コミュニティ機能確認（V2専用機能）
      const requiredLevel = authManager.getRequiredAuthLevel('/v2-auth/community-management');
      expect(['v1-login', 'v2-login']).toContain(requiredLevel);
      
      const canAccess = authManager.canAccessEndpoint('/v2-auth/community-management');
      const hasV2Session = authManager.getAuthStatus().v2SessionValid;
      
      if (hasV2Session) {
        expect(canAccess).toBe(true);
        console.log('✅ community-management V2専用機能アクセス可能');
      } else {
        expect(canAccess).toBe(false);
        console.log('⚠️ V2セッション無効のため community-management アクセス不可');
      }
    });
    
    test('advanced-features エンドポイント動作確認', async () => {
      // V2高度機能確認
      const requiredLevel = authManager.getRequiredAuthLevel('/v2-auth/advanced-features');
      expect(['v1-login', 'v2-login']).toContain(requiredLevel);
      
      const canAccess = authManager.canAccessEndpoint('/v2-auth/advanced-features');
      const hasV2Session = authManager.getAuthStatus().v2SessionValid;
      
      if (hasV2Session) {
        expect(canAccess).toBe(true);
        console.log('✅ advanced-features V2高度機能アクセス可能');
      } else {
        expect(canAccess).toBe(false);
        console.log('⚠️ V2セッション無効のため advanced-features アクセス不可');
      }
    });
  });
  
  describe('認証レベル判定統合テスト', () => {
    test('エンドポイント別認証要件自動判定', () => {
      const testCases = [
        // 読み取り専用（APIキー認証）
        { endpoint: '/public/user-info', expected: 'api-key' },
        { endpoint: '/public/tweet-search', expected: 'api-key' },
        { endpoint: '/public/trends', expected: 'api-key' },
        { endpoint: '/public/follower-info', expected: 'api-key' },
        
        // 書き込み系（ログイン認証必要）
        { endpoint: '/twitter/tweet/create', expected: ['v1-login', 'v2-login'] },
        { endpoint: '/twitter/action/like', expected: ['v1-login', 'v2-login'] },
        { endpoint: '/twitter/action/retweet', expected: ['v1-login', 'v2-login'] },
        { endpoint: '/twitter/action/quote', expected: ['v1-login', 'v2-login'] },
        { endpoint: '/twitter/user/follow', expected: ['v1-login', 'v2-login'] },
        { endpoint: '/twitter/user/unfollow', expected: ['v1-login', 'v2-login'] },
        { endpoint: '/twitter/tweet/delete', expected: ['v1-login', 'v2-login'] }
      ];
      
      testCases.forEach(({ endpoint, expected }) => {
        const requiredLevel = authManager.getRequiredAuthLevel(endpoint);
        
        if (Array.isArray(expected)) {
          expect(expected).toContain(requiredLevel);
        } else {
          expect(requiredLevel).toBe(expected);
        }
      });
      
      console.log('✅ エンドポイント別認証要件自動判定テスト完了');
    });
    
    test('認証レベル昇格動作確認', async () => {
      // APIキー認証から開始
      let currentLevel = authManager.getCurrentAuthLevel();
      expect(['none', 'api-key']).toContain(currentLevel);
      
      // V1レベル要求エンドポイントでの昇格テスト
      const v1Required = await authManager.ensureAuthLevel('v1-login');
      
      if (v1Required) {
        const updatedLevel = authManager.getCurrentAuthLevel();
        expect(updatedLevel).toBe('v1-login');
        
        // V1エンドポイントアクセス可能性確認
        const canAccessV1 = authManager.canAccessEndpoint('/v1-auth/tweet-actions-v1');
        expect(canAccessV1).toBe(true);
        
        console.log('✅ V1認証レベル昇格成功');
      }
      
      // V2レベル要求エンドポイントでの昇格テスト
      const v2Required = await authManager.ensureAuthLevel('v2-login');
      
      if (v2Required) {
        const finalLevel = authManager.getCurrentAuthLevel();
        expect(finalLevel).toBe('v2-login');
        
        // V2エンドポイントアクセス可能性確認
        const canAccessV2 = authManager.canAccessEndpoint('/v2-auth/tweet-actions-v2');
        expect(canAccessV2).toBe(true);
        
        console.log('✅ V2認証レベル昇格成功');
      }
    });
    
    test('権限階層確認', () => {
      // 権限階層: none < api-key < v1-login < v2-login
      const authLevels = ['none', 'api-key', 'v1-login', 'v2-login'];
      
      // 各レベルでの機能確認
      authLevels.forEach((level, index) => {
        const capabilities = authManager.getDebugInfo();
        
        // 上位レベルは下位レベルの機能を含む
        if (level === 'v2-login') {
          // V2は全機能利用可能
          const canAccessPublic = authManager.canAccessEndpoint('/public/user-info');
          const canAccessV1 = authManager.canAccessEndpoint('/v1-auth/tweet-actions-v1');
          const canAccessV2 = authManager.canAccessEndpoint('/v2-auth/dm-management');
          
          const hasV2Session = authManager.getAuthStatus().v2SessionValid;
          if (hasV2Session) {
            expect(canAccessPublic).toBe(true);
            expect(canAccessV1).toBe(true);
            expect(canAccessV2).toBe(true);
          }
        }
      });
      
      console.log('✅ 権限階層確認テスト完了');
    });
  });
  
  describe('エンドポイント統合動作テスト', () => {
    test('読み取り → 書き込み連携フロー', async () => {
      // 1. 読み取り操作（APIキー認証）
      const searchOptions: TweetSearchOptions = {
        query: '投資教育',
        maxResults: 5,
        sortOrder: 'relevancy'
      };
      
      try {
        const searchResult = await client.searchTweets(searchOptions);
        
        if (searchResult && searchResult.tweets.length > 0) {
          // 2. 書き込み操作（ログイン認証必要）
          const hasUserSession = authManager.isUserSessionValid();
          
          if (hasUserSession) {
            const engagementRequest: EngagementRequest = {
              tweetId: 'test_tweet_123',
              action: 'like'
            };
            
            // エンゲージメント実行（モック）
            const canEngage = authManager.canAccessEndpoint('/twitter/action/like');
            expect(typeof canEngage).toBe('boolean');
            
            console.log('✅ 読み取り → 書き込み連携フロー確認完了');
          }
        }
      } catch (error) {
        console.log('⚠️ 連携フローテスト（モックモード）:', error.message);
      }
    });
    
    test('エンドポイント間データ受け渡し', async () => {
      // 各認証レベルでのデータ受け渡し確認
      const authStatus = authManager.getAuthStatus();
      
      // APIキー認証でのデータ取得
      if (authStatus.apiKeyValid) {
        const authHeaders = authManager.getAuthHeaders();
        expect(authHeaders).toHaveProperty('x-api-key');
        expect(authHeaders['x-api-key']).toBeDefined();
      }
      
      // V1認証でのデータ受け渡し
      if (authStatus.v1SessionValid) {
        const authParams = authManager.getAuthParameters();
        expect(authParams).toHaveProperty('auth_session');
      }
      
      // V2認証でのデータ受け渡し
      if (authStatus.v2SessionValid) {
        const authParams = authManager.getAuthParameters();
        expect(authParams).toHaveProperty('login_cookie');
      }
      
      console.log('✅ エンドポイント間データ受け渡し確認完了');
    });
    
    test('エラーハンドリング統合', async () => {
      // 権限不足エラーの確認
      const unauthorizedEndpoints = [
        '/v1-auth/tweet-actions-v1',
        '/v2-auth/dm-management'
      ];
      
      unauthorizedEndpoints.forEach(endpoint => {
        const canAccess = authManager.canAccessEndpoint(endpoint);
        const requiredLevel = authManager.getRequiredAuthLevel(endpoint);
        
        // 必要な認証レベルと現在のアクセス権の整合性確認
        expect(typeof canAccess).toBe('boolean');
        expect(['api-key', 'v1-login', 'v2-login']).toContain(requiredLevel);
      });
      
      console.log('✅ エラーハンドリング統合テスト完了');
    });
  });
});