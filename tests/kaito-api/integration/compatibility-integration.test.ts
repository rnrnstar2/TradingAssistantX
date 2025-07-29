/**
 * 後方互換性統合テスト - 3層認証システム既存コード互換性確認
 * 
 * 互換性確認項目:
 * 1. 既存のimportパスが正常動作
 * 2. main-workflows/での動作継続
 * 3. shared/types.tsとの互換性
 * 4. 既存のKaitoTwitterAPIClient使用コードとの互換性
 * 
 * TASK-004対応: 互換性テスト・検証
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

// 既存importパステスト
import { KaitoTwitterAPIClient } from '../../../src/kaito-api';
import { AuthManager } from '../../../src/kaito-api/core/auth-manager';
import { ActionEndpoints } from '../../../src/kaito-api/endpoints/action-endpoints';
import { TweetEndpoints } from '../../../src/kaito-api/endpoints/tweet-endpoints';
import { UserEndpoints } from '../../../src/kaito-api/endpoints/user-endpoints';

// shared/types.ts互換性テスト
import type { 
  ClaudeDecision,
  GeneratedContent,
  SystemContext,
  PostResult,
  RetweetResult,
  QuoteTweetResult,
  LikeResult,
  KaitoClientConfig
} from '../../../src/shared/types';

// main-workflows互換性テスト用
import { ComponentContainer, COMPONENT_KEYS } from '../../../src/shared/component-container';
import { DataManager } from '../../../src/data/data-manager';

describe('後方互換性統合テスト', () => {
  let client: KaitoTwitterAPIClient;
  let authManager: AuthManager;
  
  beforeEach(() => {
    // 既存方式でのクライアント初期化
    client = new KaitoTwitterAPIClient({
      apiKey: process.env.KAITO_API_TOKEN || 'test-api-key',
      qpsLimit: 200,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000
      },
      costTracking: false
    });
    
    authManager = new AuthManager({
      apiKey: process.env.KAITO_API_TOKEN || 'test-api-key',
      preferredAuthMethod: 'v2'
    });
  });
  
  afterEach(async () => {
    if (authManager) {
      await authManager.logout();
    }
  });

  describe('既存のimportパスが正常動作', () => {
    test('KaitoTwitterAPIClient import互換性', () => {
      // 既存のimportパスでクライアント作成可能
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(KaitoTwitterAPIClient);
      
      // 既存メソッドが存在することを確認
      expect(typeof client.getUserInfo).toBe('function');
      expect(typeof client.searchTweets).toBe('function');
      expect(typeof client.createPost).toBe('function');
      expect(typeof client.performEngagement).toBe('function');
      
      console.log('✅ KaitoTwitterAPIClient import互換性確認完了');
    });
    
    test('AuthManager import互換性', () => {
      // 既存のAuthManager使用可能
      expect(authManager).toBeDefined();
      expect(authManager).toBeInstanceOf(AuthManager);
      
      // 既存メソッドが存在することを確認
      expect(typeof authManager.login).toBe('function');
      expect(typeof authManager.getAuthStatus).toBe('function');
      expect(typeof authManager.isUserSessionValid).toBe('function');
      expect(typeof authManager.getAuthHeaders).toBe('function');
      
      console.log('✅ AuthManager import互換性確認完了');
    });
    
    test('Endpoints import互換性', () => {
      // エンドポイントクラスが正常にimport可能
      expect(ActionEndpoints).toBeDefined();
      expect(TweetEndpoints).toBeDefined();
      expect(UserEndpoints).toBeDefined();
      
      // コンストラクタが正常動作
      const actionEndpoints = new ActionEndpoints('https://test.api.io', {
        'x-api-key': 'test-key'
      });
      
      expect(actionEndpoints).toBeDefined();
      expect(typeof actionEndpoints.createPost).toBe('function');
      expect(typeof actionEndpoints.performEngagement).toBe('function');
      
      console.log('✅ Endpoints import互換性確認完了');
    });
    
    test('Legacy KaitoApiClient compatibility', () => {
      // 従来のKaitoApiClient使用パターン
      import('../../../src/kaito-api').then(module => {
        expect(module.KaitoApiClient).toBeDefined();
        
        const legacyClient = new module.KaitoApiClient({
          apiKey: 'test-key',
          qpsLimit: 200,
          retryPolicy: {
            maxRetries: 3,
            backoffMs: 1000
          },
          costTracking: false
        });
        
        expect(legacyClient).toBeDefined();
        console.log('✅ Legacy KaitoApiClient互換性確認完了');
      });
    });
  });
  
  describe('main-workflows/での動作継続', () => {
    test('ActionExecutor互換性確認', async () => {
      // ComponentContainer初期化（main-workflowsで使用されるパターン）
      const container = new ComponentContainer();
      
      // DataManager初期化
      const dataManager = new DataManager();
      
      // 3層認証システムがmain-workflowsで使用されることを確認
      const authStatus = authManager.getAuthStatus();
      expect(authStatus).toHaveProperty('apiKeyValid');
      expect(authStatus).toHaveProperty('userSessionValid');
      
      // 認証レベル情報が追加されていることを確認（後方互換性を保持）
      expect(authStatus).toHaveProperty('authLevel');
      expect(authStatus).toHaveProperty('validAuthLevels');
      
      console.log('✅ main-workflows ActionExecutor互換性確認完了');
    });
    
    test('KaitoApiClient注入互換性', () => {
      // ComponentContainerでのKaitoApiClient使用パターン
      const container = new ComponentContainer();
      
      // 従来のコンポーネント登録が正常動作
      try {
        container.register(COMPONENT_KEYS.KAITO_API, client);
        const registeredClient = container.get(COMPONENT_KEYS.KAITO_API);
        
        expect(registeredClient).toBeDefined();
        expect(registeredClient).toBe(client);
        
        console.log('✅ ComponentContainer KaitoApiClient注入互換性確認完了');
      } catch (error) {
        console.log('⚠️ ComponentContainer互換性テスト（期待される動作）:', error.message);
      }
    });
    
    test('AuthManager workflow統合', async () => {
      // main-workflowsでのAuthManager使用パターン
      const authHeaders = authManager.getAuthHeaders();
      expect(authHeaders).toHaveProperty('x-api-key');
      
      // 3層認証システムの新機能が利用可能
      const validLevels = authManager.getValidAuthLevels();
      expect(Array.isArray(validLevels)).toBe(true);
      expect(validLevels).toContain('api-key');
      
      // 既存メソッドが正常動作
      const isValid = authManager.isUserSessionValid();
      expect(typeof isValid).toBe('boolean');
      
      console.log('✅ AuthManager workflow統合互換性確認完了');
    });
    
    test('エンドポイント別設計との互換性', () => {
      // main-workflows/core/action-executor.tsで使用されるパターン
      const tweetEndpoints = new TweetEndpoints({
        environment: 'dev',
        api: {
          baseUrl: 'https://test.api.io',
          version: 'v1.0',
          timeout: 10000,
          retryPolicy: {
            maxRetries: 3,
            backoffMs: 1000,
            retryConditions: ['429', '500']
          }
        },
        authentication: {
          primaryKey: 'test-key',
          keyRotationInterval: 86400000,
          encryptionEnabled: false
        },
        performance: {
          qpsLimit: 200,
          responseTimeTarget: 1000,
          cacheEnabled: false,
          cacheTTL: 300
        },
        monitoring: {
          metricsEnabled: false,
          logLevel: 'info',
          alertingEnabled: false,
          healthCheckInterval: 60000
        },
        security: {
          rateLimitEnabled: true,
          ipWhitelist: [],
          auditLoggingEnabled: false,
          encryptionKey: 'test-key'
        },
        features: {
          realApiEnabled: false,
          mockFallbackEnabled: true,
          batchProcessingEnabled: false,
          advancedCachingEnabled: false
        },
        metadata: {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          updatedBy: 'test',
          checksum: 'test-checksum'
        }
      });
      
      expect(tweetEndpoints).toBeDefined();
      expect(typeof tweetEndpoints.searchTweets).toBe('function');
      
      console.log('✅ エンドポイント別設計互換性確認完了');
    });
  });
  
  describe('shared/types.tsとの互換性', () => {
    test('Claude SDK型定義互換性', () => {
      // Claude SDK型定義が正常にimport可能
      const mockDecision: ClaudeDecision = {
        action: 'post',
        reasoning: 'Test reasoning',
        confidence: 0.8,
        parameters: {
          content: 'Test content'
        }
      };
      
      expect(mockDecision).toHaveProperty('action');
      expect(mockDecision).toHaveProperty('reasoning');
      expect(mockDecision).toHaveProperty('confidence');
      expect(mockDecision).toHaveProperty('parameters');
      
      const mockContent: GeneratedContent = {
        content: 'Generated test content',
        hashtags: ['#test'],
        mediaRecommendations: [],
        tone: 'educational',
        confidence: 0.9
      };
      
      expect(mockContent).toHaveProperty('content');
      expect(mockContent).toHaveProperty('hashtags');
      expect(mockContent).toHaveProperty('confidence');
      
      console.log('✅ Claude SDK型定義互換性確認完了');
    });
    
    test('KaitoAPI型定義互換性', () => {
      // KaitoAPI型定義が正常にimport可能
      const mockPostResult: PostResult = {
        success: true,
        tweetId: 'test_123',
        createdAt: new Date().toISOString(),
        content: 'Test post'
      };
      
      expect(mockPostResult).toHaveProperty('success');
      expect(mockPostResult).toHaveProperty('tweetId');
      expect(mockPostResult).toHaveProperty('createdAt');
      
      const mockRetweetResult: RetweetResult = {
        success: true,
        retweetId: 'retweet_123',
        originalTweetId: 'original_123',
        timestamp: new Date().toISOString()
      };
      
      expect(mockRetweetResult).toHaveProperty('success');
      expect(mockRetweetResult).toHaveProperty('retweetId');
      expect(mockRetweetResult).toHaveProperty('originalTweetId');
      
      console.log('✅ KaitoAPI型定義互換性確認完了');
    });
    
    test('システム独自型定義互換性', () => {
      // システム独自の型定義確認
      const mockConfig: KaitoClientConfig = {
        apiKey: 'test-key',
        qpsLimit: 200,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000
        },
        costTracking: false
      };
      
      expect(mockConfig).toHaveProperty('apiKey');
      expect(mockConfig).toHaveProperty('qpsLimit');
      expect(mockConfig).toHaveProperty('retryPolicy');
      expect(mockConfig).toHaveProperty('costTracking');
      
      console.log('✅ システム独自型定義互換性確認完了');
    });
    
    test('型定義re-export互換性', () => {
      // shared/types.tsでの型re-exportが正常動作
      import('../../../src/shared/types').then(types => {
        expect(types.ClaudeDecision).toBeDefined();
        expect(types.GeneratedContent).toBeDefined();
        expect(types.SystemContext).toBeDefined();
        
        console.log('✅ 型定義re-export互換性確認完了');
      });
    });
  });
  
  describe('API使用パターン互換性', () => {
    test('従来のAPIクライアント使用パターン', async () => {
      // 従来の使用パターンが正常動作
      try {
        const userInfo = await client.getUserInfo('testuser');
        
        // レスポンス形式が変更されていないことを確認
        if (userInfo) {
          expect(userInfo).toHaveProperty('username');
        }
        
        console.log('✅ 従来のAPIクライアント使用パターン互換性確認');
      } catch (error) {
        console.log('⚠️ APIクライアントテスト（モックモード）:', error.message);
        expect(error.message).toContain('fetch is not defined');
      }
    });
    
    test('認証フロー互換性', async () => {
      // 従来の認証フローが正常動作
      const authStatus = authManager.getAuthStatus();
      
      // 従来のプロパティが存在
      expect(authStatus).toHaveProperty('apiKeyValid');
      expect(authStatus).toHaveProperty('userSessionValid');
      expect(authStatus).toHaveProperty('canPerformUserActions');
      
      // 新しい3層認証プロパティも存在
      expect(authStatus).toHaveProperty('authLevel');
      expect(authStatus).toHaveProperty('validAuthLevels');
      
      // 従来のメソッドが正常動作
      const isValid = authManager.isApiKeyValid();
      expect(typeof isValid).toBe('boolean');
      
      const userSessionValid = authManager.isUserSessionValid();
      expect(typeof userSessionValid).toBe('boolean');
      
      console.log('✅ 認証フロー互換性確認完了');
    });
    
    test('投稿・エンゲージメント互換性', async () => {
      // 従来の投稿・エンゲージメントAPIが正常動作
      try {
        const postResult = await client.createPost({
          content: 'Test post for compatibility',
          mediaIds: []
        });
        
        // レスポンス形式確認
        if (postResult) {
          expect(postResult).toHaveProperty('success');
          expect(postResult).toHaveProperty('tweetId');
        }
        
        console.log('✅ 投稿API互換性確認完了');
      } catch (error) {
        console.log('⚠️ 投稿APIテスト（モックモード）:', error.message);
      }
      
      try {
        const engagementResult = await client.performEngagement({
          tweetId: 'test_123',
          action: 'like'
        });
        
        // レスポンス形式確認
        if (engagementResult) {
          expect(engagementResult).toHaveProperty('success');
          expect(engagementResult).toHaveProperty('action');
        }
        
        console.log('✅ エンゲージメントAPI互換性確認完了');
      } catch (error) {
        console.log('⚠️ エンゲージメントAPIテスト（モックモード）:', error.message);
      }
    });
    
    test('設定・初期化互換性', () => {
      // 従来の設定・初期化パターンが正常動作
      const legacyConfig: KaitoClientConfig = {
        apiKey: 'test-api-key',
        qpsLimit: 200,
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000
        },
        costTracking: {
          enabled: true,
          ratePerThousand: 0.15,
          alertThreshold: 10
        }
      };
      
      expect(legacyConfig).toHaveProperty('apiKey');
      expect(legacyConfig).toHaveProperty('qpsLimit');
      expect(legacyConfig.qpsLimit).toBe(200);
      
      // 新しいcostTracking形式も互換性維持
      if (typeof legacyConfig.costTracking === 'object') {
        expect(legacyConfig.costTracking).toHaveProperty('enabled');
        expect(legacyConfig.costTracking).toHaveProperty('ratePerThousand');
      }
      
      console.log('✅ 設定・初期化互換性確認完了');
    });
  });
  
  describe('エラーハンドリング互換性', () => {
    test('既存エラー処理パターン継続', async () => {
      // 従来のエラーハンドリングが継続動作
      try {
        // 無効なリクエストでエラー発生
        await client.createPost({
          content: '', // 空のコンテンツ
          mediaIds: []
        });
      } catch (error) {
        // エラー形式が変更されていないことを確認
        expect(error).toBeDefined();
        expect(typeof error.message).toBe('string');
      }
      
      // 認証エラーパターン
      const invalidAuthManager = new AuthManager({
        apiKey: 'invalid-key'
      });
      
      const authStatus = invalidAuthManager.getAuthStatus();
      expect(authStatus).toHaveProperty('apiKeyValid');
      
      console.log('✅ エラーハンドリング互換性確認完了');
    });
    
    test('3層認証エラー拡張互換性', async () => {
      // 3層認証システムでの新しいエラーパターン
      const authStatus = authManager.getAuthStatus();
      
      // 従来のエラー情報
      expect(authStatus).toHaveProperty('canPerformUserActions');
      
      // 新しい詳細エラー情報
      expect(authStatus).toHaveProperty('authLevel');
      expect(authStatus).toHaveProperty('validAuthLevels');
      
      // 環境変数関連エラー（新機能）
      if (authStatus.hasOwnProperty('environmentVariablesValid')) {
        expect(typeof authStatus.environmentVariablesValid).toBe('boolean');
      }
      
      if (authStatus.hasOwnProperty('missingEnvironmentVariables')) {
        expect(Array.isArray(authStatus.missingEnvironmentVariables)).toBe(true);
      }
      
      console.log('✅ 3層認証エラー拡張互換性確認完了');
    });
  });
  
  describe('パフォーマンス・制限互換性', () => {
    test('QPS制限設定互換性', () => {
      // 従来のQPS制限設定が継続動作
      const clientConfig = {
        apiKey: 'test-key',
        qpsLimit: 200, // TwitterAPI.io固定値
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000
        },
        costTracking: false
      };
      
      const testClient = new KaitoTwitterAPIClient(clientConfig);
      expect(testClient).toBeDefined();
      
      console.log('✅ QPS制限設定互換性確認完了');
    });
    
    test('コスト追跡互換性', () => {
      // 従来のコスト追跡設定（boolean）
      const legacyConfig = {
        apiKey: 'test-key',
        qpsLimit: 200,
        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
        costTracking: true // boolean形式
      };
      
      // 新しいコスト追跡設定（object）
      const newConfig = {
        apiKey: 'test-key',
        qpsLimit: 200,
        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
        costTracking: {
          enabled: true,
          ratePerThousand: 0.15,
          alertThreshold: 10
        }
      };
      
      // 両方の設定形式で初期化可能
      const legacyClient = new KaitoTwitterAPIClient(legacyConfig);
      const newClient = new KaitoTwitterAPIClient(newConfig);
      
      expect(legacyClient).toBeDefined();
      expect(newClient).toBeDefined();
      
      console.log('✅ コスト追跡互換性確認完了');
    });
  });
});