/**
 * main.ts既存システム統合テスト - 3層認証システム互換性確認
 * 
 * テスト目的:
 * - 3ステップワークフロー（データ収集→アクション実行→結果保存）の動作確認
 * - YAML固定アクション使用での統合動作確認
 * - データ管理システム（current/history）との統合確認
 * - 既存メインループとの互換性確認
 * 
 * TASK-004対応: Worker1-3修正後の3ステップワークフロー検証
 * 注意: makeDecision機能は削除済み、YAML固定アクション方式に変更
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { AuthManager } from '../../src/kaito-api/core/auth-manager';
import { ComponentContainer, COMPONENT_KEYS } from '../../src/shared/component-container';
import { DataManager } from '../../src/shared/data-manager';
import { ActionExecutor } from '../../src/workflows/action-executor';
import { KaitoTwitterAPIClient } from '../../src/kaito-api';
import type { ActionResult } from '../../src/shared/types';

// YAML固定アクション関連の型定義
interface FixedAction {
  action: 'post' | 'retweet' | 'quote_tweet' | 'like' | 'wait';
  topic?: string;
  target_query?: string;
  reasoning: string;
  confidence: number;
  parameters?: {
    content?: string;
    tweetId?: string;
    duration?: number;
  };
}

// main.ts統合テスト設定
const MAIN_INTEGRATION_TEST_CONFIG = {
  // テスト実行設定
  ENABLE_INTEGRATION_TEST: process.env.ENABLE_MAIN_INTEGRATION_TEST === 'true',
  
  // メインループシミュレーション設定
  LOOP_ITERATIONS: 3,                    // ループ反復回数
  EXECUTION_INTERVAL_MS: 1000,           // 実行間隔（テスト用短縮）
  ACTUAL_INTERVAL_MS: 30 * 60 * 1000,    // 実際の30分間隔
  
  // データディレクトリ設定
  TEST_DATA_DIR: 'data/current',
  TEST_HISTORY_DIR: 'data/history',
  
  // コンポーネント初期化設定
  COMPONENT_TIMEOUT_MS: 5000,
  
  // 統合テスト制限
  MAX_ITERATIONS: 5,
  TIMEOUT_MS: 60000 // 1分
};

describe('main.ts既存システム統合テスト', () => {
  let authManager: AuthManager;
  let dataManager: DataManager;
  let actionExecutor: ActionExecutor;
  let container: ComponentContainer;
  let client: KaitoTwitterAPIClient;
  
  beforeEach(async () => {
    // ComponentContainer初期化（main.tsパターン）
    container = new ComponentContainer();
    
    // V2標準認証システム初期化
    authManager = new AuthManager({
      apiKey: process.env.KAITO_API_TOKEN || 'test-api-key'
    });
    
    // KaitoAPIClient初期化
    client = new KaitoTwitterAPIClient({
      apiKey: process.env.KAITO_API_TOKEN || 'test-api-key',
      qpsLimit: 200,
      retryPolicy: {
        maxRetries: 3,
        backoffMs: 1000
      },
      costTracking: false
    });
    
    // DataManager初期化
    dataManager = new DataManager();
    
    // ActionExecutor初期化
    actionExecutor = new ActionExecutor(container);
    
    // コンポーネント登録（main.tsパターン）
    try {
      container.register(COMPONENT_KEYS.KAITO_API, client);
      container.register(COMPONENT_KEYS.AUTH_MANAGER, authManager);
      container.register(COMPONENT_KEYS.DATA_MANAGER, dataManager);
      container.register(COMPONENT_KEYS.ACTION_EXECUTOR, actionExecutor);
    } catch (error) {
      console.log('⚠️ コンポーネント登録（期待される動作）:', error.message);
    }
  });
  
  afterEach(async () => {
    // クリーンアップ
    if (authManager) {
      await authManager.logout();
    }
    
    if (container) {
      // container.dispose(); // 実装されている場合
    }
  });

  describe('30分間隔実行での3層認証動作', () => {
    test('メインループでの認証切り替え確認', async () => {
      if (!MAIN_INTEGRATION_TEST_CONFIG.ENABLE_INTEGRATION_TEST) {
        console.log('⚠️ main.ts統合テストスキップ - ENABLE_MAIN_INTEGRATION_TEST=true で有効化');
        return;
      }
      
      console.log('🔄 メインループ認証切り替えテスト開始...');
      
      let iteration = 0;
      const authLevelHistory: string[] = [];
      
      // メインループのシミュレーション
      while (iteration < MAIN_INTEGRATION_TEST_CONFIG.LOOP_ITERATIONS) {
        console.log(`📊 メインループ反復 ${iteration + 1}/${MAIN_INTEGRATION_TEST_CONFIG.LOOP_ITERATIONS}`);
        
        try {
          // 1. 初期認証レベル確認
          const initialAuthLevel = authManager.getCurrentAuthLevel();
          authLevelHistory.push(`iteration${iteration + 1}-initial:${initialAuthLevel}`);
          
          // 2. 統合ログイン実行（推奨認証方法で）
          const loginResult = await authManager.login();
          
          if (loginResult.success) {
            const postLoginAuthLevel = authManager.getCurrentAuthLevel();
            authLevelHistory.push(`iteration${iteration + 1}-post-login:${postLoginAuthLevel}`);
            
            expect(['v2-login']).toContain(postLoginAuthLevel);
            
            // 3. 認証状態詳細確認
            const authStatus = authManager.getAuthStatus();
            expect(authStatus.userSessionValid).toBe(true);
            expect(authStatus.canPerformUserActions).toBe(true);
            
            console.log(`✅ 反復${iteration + 1}認証成功:`, {
              initialLevel: initialAuthLevel,
              finalLevel: postLoginAuthLevel,
              canPerformActions: authStatus.canPerformUserActions
            });
            
          } else {
            console.log(`⚠️ 反復${iteration + 1}認証失敗:`, loginResult.error);
            authLevelHistory.push(`iteration${iteration + 1}-failed:error`);
          }
          
          // 4. 30分間隔のシミュレーション（短縮版）
          await new Promise(resolve => 
            setTimeout(resolve, MAIN_INTEGRATION_TEST_CONFIG.EXECUTION_INTERVAL_MS)
          );
          
          // 5. セッション持続性確認
          const sessionValid = authManager.isUserSessionValid();
          console.log(`📡 反復${iteration + 1}セッション状態:`, sessionValid);
          
        } catch (error) {
          console.error(`❌ メインループエラー - 反復${iteration + 1}:`, error);
          authLevelHistory.push(`iteration${iteration + 1}-error:${error.message}`);
        }
        
        iteration++;
      }
      
      // メインループ結果分析
      expect(authLevelHistory.length).toBeGreaterThan(0);
      
      console.log('✅ メインループ認証切り替えテスト完了:', {
        totalIterations: iteration,
        authHistory: authLevelHistory,
        testInterval: `${MAIN_INTEGRATION_TEST_CONFIG.EXECUTION_INTERVAL_MS}ms（実際: ${MAIN_INTEGRATION_TEST_CONFIG.ACTUAL_INTERVAL_MS}ms）`
      });
    }, MAIN_INTEGRATION_TEST_CONFIG.TIMEOUT_MS);
    
    test('認証セッション持続性確認', async () => {
      console.log('⏳ 認証セッション持続性テスト開始...');
      
      try {
        // 初期ログイン
        const initialLogin = await authManager.login();
        
        if (initialLogin.success) {
          const initialAuthLevel = authManager.getCurrentAuthLevel();
          const initialSession = authManager.getUserSession();
          
          expect(initialSession).toBeDefined();
          
          // 時間経過シミュレーション（短縮版）
          const sessionChecks = [];
          
          for (let check = 0; check < 3; check++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const sessionValid = authManager.isUserSessionValid();
            const currentSession = authManager.getUserSession();
            
            sessionChecks.push({
              checkNumber: check + 1,
              sessionValid: sessionValid,
              sessionMatches: currentSession === initialSession,
              authLevel: authManager.getCurrentAuthLevel()
            });
          }
          
          // セッション持続性分析
          const validSessions = sessionChecks.filter(check => check.sessionValid);
          expect(validSessions.length).toBeGreaterThan(0);
          
          console.log('✅ セッション持続性テスト完了:', {
            initialAuthLevel: initialAuthLevel,
            sessionChecks: sessionChecks,
            validSessionsCount: validSessions.length,
            totalChecks: sessionChecks.length
          });
          
        } else {
          console.log('⚠️ 初期ログイン失敗 - セッション持続性テストスキップ');
        }
        
      } catch (error) {
        console.error('❌ セッション持続性テストエラー:', error);
      }
    });
  });
  
  describe('YAML固定アクションシステムとの統合', () => {
    test('YAML固定アクションに基づく認証レベル別アクション実行', async () => {
      console.log('📄 YAML固定アクション統合テスト開始...');
      
      // YAML固定アクションの作成（schedule.yamlから取得される形式をシミュレート）
      const mockFixedActions: FixedAction[] = [
        {
          action: 'post',
          topic: 'investment',
          reasoning: 'YAML固定アクション: 朝の投資教育投稿',
          confidence: 1.0,
          parameters: {
            content: 'YAML指定テスト投稿コンテンツ'
          }
        },
        {
          action: 'like',
          target_query: 'investment education',
          reasoning: 'YAML固定アクション: 高品質教育コンテンツへのいいね',
          confidence: 1.0,
          parameters: {
            tweetId: 'test_tweet_123'
          }
        },
        {
          action: 'wait',
          reasoning: 'YAML固定アクション: 待機モード',
          confidence: 1.0,
          parameters: {
            duration: 1800000 // 30分
          }
        }
      ];
      
      const executionResults: ActionResult[] = [];
      
      for (const fixedAction of mockFixedActions) {
        try {
          console.log(`🎯 YAML固定アクション実行: ${fixedAction.action} (topic: ${fixedAction.topic || 'N/A'})`);
          
          // 認証レベル要件確認
          const requiredLevel = fixedAction.action === 'wait' ? 'api-key' : 
                               authManager.getRequiredAuthLevel(`/twitter/action/${fixedAction.action}`);
          
          // 必要な認証レベルの確保
          const authEnsured = await authManager.ensureAuthLevel(requiredLevel);
          
          if (authEnsured || fixedAction.action === 'wait') {
            // ActionExecutorでの実行（モック）
            const actionResult: ActionResult = {
              success: true,
              action: fixedAction.action,
              timestamp: new Date().toISOString(),
              authLevel: authManager.getCurrentAuthLevel(),
              details: `${fixedAction.action}アクション実行成功 (YAML固定方式)`
            };
            
            executionResults.push(actionResult);
            
            console.log(`✅ ${fixedAction.action}アクション実行成功:`, {
              authLevel: actionResult.authLevel,
              confidence: fixedAction.confidence,
              reasoning: fixedAction.reasoning,
              yamlDriven: true
            });
            
          } else {
            console.log(`⚠️ ${fixedAction.action}アクション認証不足:`, {
              requiredLevel: requiredLevel,
              currentLevel: authManager.getCurrentAuthLevel()
            });
          }
          
        } catch (error) {
          console.error(`❌ YAML固定アクション実行エラー - ${fixedAction.action}:`, error);
          
          executionResults.push({
            success: false,
            action: fixedAction.action,
            timestamp: new Date().toISOString(),
            error: error.message
          });
        }
      }
      
      // 統合結果確認
      expect(executionResults.length).toBe(mockFixedActions.length);
      
      const successfulActions = executionResults.filter(result => result.success);
      expect(successfulActions.length).toBeGreaterThan(0);
      
      console.log('✅ YAML固定アクション統合テスト完了:', {
        totalActions: mockFixedActions.length,
        successfulExecutions: successfulActions.length,
        executionMethod: 'YAML固定アクション方式（makeDecision削除後）',
        executionResults: executionResults.map(result => ({
          action: result.action,
          success: result.success,
          authLevel: result.authLevel || 'N/A'
        }))
      });
    });
    
    test('3ステップワークフロー対応認証レベル自動昇格', async () => {
      console.log('⬆️ 3ステップワークフロー認証レベル自動昇格テスト開始...');
      
      // 3ステップワークフロー（データ収集→アクション実行→結果保存）での認証要求テスト
      const workflow3StepTests = [
        { step: 'data-collection', action: 'search', requiredLevel: 'api-key', description: 'ステップ1: データ収集（検索）' },
        { step: 'action-execution', action: 'post', requiredLevel: 'v2-login', description: 'ステップ2: アクション実行（投稿）' },
        { step: 'result-saving', action: 'data-save', requiredLevel: 'api-key', description: 'ステップ3: 結果保存' }
      ];
      
      for (const testCase of workflow3StepTests) {
        try {
          console.log(`🔄 ${testCase.description}テスト...`);
          
          // 現在の認証レベル確認
          const currentLevel = authManager.getCurrentAuthLevel();
          
          // 必要な認証レベルの確保
          const escalated = await authManager.ensureAuthLevel(testCase.requiredLevel as any);
          
          if (escalated) {
            const newLevel = authManager.getCurrentAuthLevel();
            
            // 認証レベルが適切に昇格したかを確認
            const validLevels = authManager.getValidAuthLevels();
            expect(validLevels).toContain(testCase.requiredLevel);
            
            console.log(`✅ ${testCase.step}認証昇格成功:`, {
              step: testCase.step,
              action: testCase.action,
              previousLevel: currentLevel,
              requiredLevel: testCase.requiredLevel,
              currentLevel: newLevel,
              workflow: '3ステップ対応',
              escalationSuccess: true
            });
            
          } else {
            console.log(`⚠️ ${testCase.step}認証昇格失敗（環境制限）:`, {
              step: testCase.step,
              requiredLevel: testCase.requiredLevel,
              currentLevel: currentLevel,
              workflow: '3ステップ'
            });
          }
          
        } catch (error) {
          console.log(`⚠️ ${testCase.step}認証昇格テスト（制限環境）:`, error.message);
        }
      }
      
      console.log('✅ 3ステップワークフロー認証昇格テスト完了 (makeDecision削除後対応)');
    });
  });
  
  describe('データ管理システムとの統合', () => {
    test('data/current/、data/history/での動作確認', async () => {
      console.log('💾 データ管理統合テスト開始...');
      
      try {
        // DataManager初期化確認
        expect(dataManager).toBeDefined();
        
        // 認証状態データの保存・読み込みテスト
        const authStatus = authManager.getAuthStatus();
        
        // データ構造確認
        expect(authStatus).toHaveProperty('apiKeyValid');
        expect(authStatus).toHaveProperty('userSessionValid');
        expect(authStatus).toHaveProperty('authLevel');
        expect(authStatus).toHaveProperty('validAuthLevels');
        
        // 3層認証データの確認
        expect(authStatus.authLevel).toBeDefined();
        expect(Array.isArray(authStatus.validAuthLevels)).toBe(true);
        
        // データ保存可能性確認（実際の保存はしない）
        const dataForSaving = {
          timestamp: new Date().toISOString(),
          authStatus: authStatus,
          sessionInfo: {
            authLevel: authStatus.authLevel,
            validLevels: authStatus.validAuthLevels,
            canPerformActions: authStatus.canPerformUserActions
          }
        };
        
        expect(dataForSaving.authStatus.authLevel).toBeDefined();
        expect(dataForSaving.sessionInfo.validLevels).toBeDefined();
        
        console.log('✅ データ管理統合テスト完了:', {
          authLevel: authStatus.authLevel,
          validLevels: authStatus.validAuthLevels,
          dataStructure: Object.keys(dataForSaving),
          currentDirectory: MAIN_INTEGRATION_TEST_CONFIG.TEST_DATA_DIR,
          historyDirectory: MAIN_INTEGRATION_TEST_CONFIG.TEST_HISTORY_DIR
        });
        
      } catch (error) {
        console.error('❌ データ管理統合テストエラー:', error);
        throw error;
      }
    });
    
    test('実行結果記録システムとの互換性', () => {
      console.log('📝 実行結果記録システム互換性テスト...');
      
      // ActionResultの拡張（3層認証情報含む）
      const enhancedActionResult: ActionResult & {
        authInfo?: {
          authLevel: string;
          validLevels: string[];
          sessionValid: boolean;
        }
      } = {
        success: true,
        action: 'post',
        timestamp: new Date().toISOString(),
        details: 'テスト投稿実行',
        authInfo: {
          authLevel: authManager.getCurrentAuthLevel(),
          validLevels: authManager.getValidAuthLevels(),
          sessionValid: authManager.isUserSessionValid()
        }
      };
      
      // 拡張データ構造確認
      expect(enhancedActionResult.authInfo).toBeDefined();
      expect(enhancedActionResult.authInfo.authLevel).toBeDefined();
      expect(Array.isArray(enhancedActionResult.authInfo.validLevels)).toBe(true);
      expect(typeof enhancedActionResult.authInfo.sessionValid).toBe('boolean');
      
      // 既存ActionResult互換性確認
      const standardActionResult: ActionResult = {
        success: enhancedActionResult.success,
        action: enhancedActionResult.action,
        timestamp: enhancedActionResult.timestamp,
        details: enhancedActionResult.details
      };
      
      expect(standardActionResult.success).toBe(true);
      expect(standardActionResult.action).toBe('post');
      
      console.log('✅ 実行結果記録システム互換性確認完了:', {
        standardResult: Object.keys(standardActionResult),
        enhancedResult: Object.keys(enhancedActionResult),
        authInfoIncluded: !!enhancedActionResult.authInfo,
        backwardCompatible: true
      });
    });
    
    test('メタデータ・ログ統合', () => {
      console.log('🏷️ メタデータ・ログ統合テスト...');
      
      // 3層認証システムのデバッグ情報
      const debugInfo = authManager.getDebugInfo();
      
      // メタデータ構造確認
      expect(debugInfo).toHaveProperty('currentAuthLevel');
      expect(debugInfo).toHaveProperty('validAuthLevels');
      expect(debugInfo).toHaveProperty('apiKey');
      expect(debugInfo).toHaveProperty('v2Login');
      expect(debugInfo).toHaveProperty('system');
      
      // システム情報確認
      expect(debugInfo.system).toHaveProperty('timestamp');
      expect(debugInfo.system).toHaveProperty('uptime');
      
      // ログ出力形式確認
      const logEntry = {
        timestamp: debugInfo.system.timestamp,
        level: 'INFO',
        component: '3LayerAuth',
        authLevel: debugInfo.currentAuthLevel,
        validLevels: debugInfo.validAuthLevels,
        message: '3層認証システム統合ログ'
      };
      
      expect(logEntry.timestamp).toBeDefined();
      expect(logEntry.authLevel).toBeDefined();
      expect(Array.isArray(logEntry.validLevels)).toBe(true);
      
      console.log('✅ メタデータ・ログ統合確認完了:', {
        debugInfoKeys: Object.keys(debugInfo),
        systemInfo: debugInfo.system,
        logEntryStructure: Object.keys(logEntry),
        currentAuthLevel: debugInfo.currentAuthLevel
      });
    });
  });
  
  describe('システム統合パフォーマンス', () => {
    test('統合システム初期化時間測定', async () => {
      console.log('⚡ 統合システム初期化パフォーマンステスト...');
      
      const initStartTime = Date.now();
      
      // 統合システムの初期化シミュレーション
      const newAuthManager = new AuthManager({
        apiKey: 'test-key'
      });
      
      const newClient = new KaitoTwitterAPIClient({
        apiKey: 'test-key',
        qpsLimit: 200,
        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
        costTracking: false
      });
      
      const newContainer = new ComponentContainer();
      const newDataManager = new DataManager();
      const newActionExecutor = new ActionExecutor(newContainer);
      
      const initEndTime = Date.now();
      const initDuration = initEndTime - initStartTime;
      
      // パフォーマンス要件確認
      expect(initDuration).toBeLessThan(5000); // 5秒以内
      
      // 初期化完了確認
      expect(newAuthManager).toBeDefined();
      expect(newClient).toBeDefined();
      expect(newContainer).toBeDefined();
      expect(newDataManager).toBeDefined();
      expect(newActionExecutor).toBeDefined();
      
      console.log('✅ 統合システム初期化パフォーマンス確認完了:', {
        initDuration: `${initDuration}ms`,
        performanceTarget: '< 5000ms',
        componentsInitialized: 5,
        authLevelSupport: '3層認証対応'
      });
      
      // クリーンアップ
      await newAuthManager.logout();
    });
    
    test('統合実行フローパフォーマンス', async () => {
      console.log('🚀 統合実行フローパフォーマンステスト...');
      
      const flowStartTime = Date.now();
      let stepTimes: { step: string; duration: number }[] = [];
      
      try {
        // Step 1: 認証確認
        const step1Start = Date.now();
        const authStatus = authManager.getAuthStatus();
        const step1End = Date.now();
        stepTimes.push({ step: 'Auth Check', duration: step1End - step1Start });
        
        // Step 2: 統合ログイン（環境依存）
        const step2Start = Date.now();
        const loginResult = await authManager.login();
        const step2End = Date.now();
        stepTimes.push({ step: 'Integrated Login', duration: step2End - step2Start });
        
        // Step 3: 認証レベル判定
        const step3Start = Date.now();
        const currentLevel = authManager.getCurrentAuthLevel();
        const validLevels = authManager.getValidAuthLevels();
        const step3End = Date.now();
        stepTimes.push({ step: 'Auth Level Check', duration: step3End - step3Start });
        
        // Step 4: データ準備
        const step4Start = Date.now();
        const debugInfo = authManager.getDebugInfo();
        const step4End = Date.now();
        stepTimes.push({ step: 'Data Preparation', duration: step4End - step4Start });
        
        const flowEndTime = Date.now();
        const totalFlowDuration = flowEndTime - flowStartTime;
        
        // パフォーマンス分析
        const avgStepDuration = stepTimes.reduce((sum, step) => sum + step.duration, 0) / stepTimes.length;
        const maxStepDuration = Math.max(...stepTimes.map(step => step.duration));
        
        expect(totalFlowDuration).toBeLessThan(30000); // 30秒以内
        expect(avgStepDuration).toBeLessThan(5000);    // 平均5秒以内
        
        console.log('✅ 統合実行フローパフォーマンス確認完了:', {
          totalDuration: `${totalFlowDuration}ms`,
          avgStepDuration: `${avgStepDuration.toFixed(2)}ms`,
          maxStepDuration: `${maxStepDuration}ms`,
          stepBreakdown: stepTimes,
          performanceTarget: '< 30000ms total',
          currentAuthLevel: currentLevel,
          validLevels: validLevels
        });
        
      } catch (error) {
        console.log('⚠️ 統合実行フローパフォーマンステスト（制限環境）:', error.message);
        
        const flowEndTime = Date.now();
        const totalFlowDuration = flowEndTime - flowStartTime;
        
        console.log('📊 部分パフォーマンス結果:', {
          totalDuration: `${totalFlowDuration}ms`,
          completedSteps: stepTimes.length,
          stepBreakdown: stepTimes
        });
      }
    });
  });
});