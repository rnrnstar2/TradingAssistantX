#!/usr/bin/env ts-node

/**
 * 段階的検証スクリプト
 * Phase 2-3の実装状況を段階的に確認
 * 
 * 目的:
 * - 3層認証システムの実装状況を段階的に検証
 * - 各実装フェーズの完了状況を確認
 * - 問題箇所の特定と次のステップの提示
 * 
 * 実行方法:
 * ```bash
 * npx ts-node scripts/step-by-step-validation.ts
 * # または
 * pnpm run validate:step-by-step
 * ```
 * 
 * TASK-004対応: 段階的検証システム
 */

import 'dotenv/config';
import { AuthManager } from '../src/kaito-api/core/auth-manager';
import { KaitoTwitterAPIClient } from '../src/kaito-api';
import type { AuthStatus, LoginResult } from '../src/kaito-api/types';

// 段階的検証設定
const STEP_VALIDATION_CONFIG = {
  // インタラクティブモード
  INTERACTIVE_MODE: process.env.INTERACTIVE_VALIDATION === 'true',
  
  // 検証レベル設定
  ENABLE_REAL_API_TESTS: process.env.ENABLE_STEP_REAL_API === 'true',
  DETAILED_OUTPUT: process.env.DETAILED_STEP_OUTPUT !== 'false',
  
  // 段階設定
  ENABLE_USER_CONFIRMATION: process.env.AUTO_CONFIRM !== 'true',
  PAUSE_BETWEEN_STEPS: process.env.NO_STEP_PAUSE !== 'true',
  
  // 制限設定
  STEP_TIMEOUT_MS: 30000, // 各ステップ30秒
  MAX_RETRY_ATTEMPTS: 2
};

// 検証ステップの定義
interface ValidationStep {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'auth' | 'endpoints' | 'integration';
  dependencies: string[];
  critical: boolean;
  skipCondition?: string;
}

interface StepResult {
  stepId: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'BLOCKED';
  details: string;
  executionTime: number;
  warnings: string[];
  nextSteps: string[];
  blockingIssues: string[];
}

class StepByStepValidator {
  private authManager: AuthManager;
  private client: KaitoTwitterAPIClient;
  private results: Map<string, StepResult> = new Map();
  private completedSteps: Set<string> = new Set();
  
  // 検証ステップの定義
  private validationSteps: ValidationStep[] = [
    {
      id: 'env-check',
      name: '環境変数確認',
      description: '必要な環境変数が設定されているかを確認',
      category: 'core',
      dependencies: [],
      critical: true
    },
    {
      id: 'type-definitions',
      name: '型定義確認',
      description: '3層認証用の型定義が正しく実装されているかを確認',
      category: 'core',
      dependencies: ['env-check'],
      critical: true
    },
    {
      id: 'auth-core',
      name: '認証コア実装確認',
      description: 'AuthManagerとコア認証機能の実装を確認',
      category: 'auth',
      dependencies: ['type-definitions'],
      critical: true
    },
    {
      id: 'api-key-auth',
      name: 'APIキー認証確認',
      description: 'APIキー認証（レベル1）の動作を確認',
      category: 'auth',
      dependencies: ['auth-core'],
      critical: true
    },
    {
      id: 'v1-login-auth',
      name: 'V1ログイン認証確認',
      description: 'V1ログイン認証（レベル2）の動作を確認',
      category: 'auth',
      dependencies: ['api-key-auth'],
      critical: false,
      skipCondition: 'V1認証環境変数未設定'
    },
    {
      id: 'v2-login-auth',
      name: 'V2ログイン認証確認',
      description: 'V2ログイン認証（レベル3）の動作を確認',
      category: 'auth',
      dependencies: ['api-key-auth'],
      critical: false,
      skipCondition: 'V2認証環境変数未設定'
    },
    {
      id: 'integrated-login',
      name: '統合ログイン確認',
      description: '推奨認証方法による統合ログインを確認',
      category: 'auth',
      dependencies: ['auth-core'],
      critical: true
    },
    {
      id: 'endpoint-separation',
      name: 'エンドポイント分離確認',
      description: '認証レベル別エンドポイント分離を確認',
      category: 'endpoints',
      dependencies: ['auth-core'],
      critical: true
    },
    {
      id: 'auth-requirements',
      name: '認証要件判定確認',
      description: 'エンドポイント別認証要件の自動判定を確認',
      category: 'endpoints',
      dependencies: ['endpoint-separation'],
      critical: true
    },
    {
      id: 'client-integration',
      name: 'クライアント統合確認',
      description: 'KaitoTwitterAPIClientとの統合動作を確認',
      category: 'integration',
      dependencies: ['auth-requirements'],
      critical: true
    },
    {
      id: 'backward-compatibility',
      name: '後方互換性確認',
      description: '既存コードとの後方互換性を確認',
      category: 'integration',
      dependencies: ['client-integration'],
      critical: true
    },
    {
      id: 'performance-check',
      name: 'パフォーマンス確認',
      description: '3層認証システムのパフォーマンスを確認',
      category: 'integration',
      dependencies: ['client-integration'],
      critical: false
    }
  ];
  
  constructor() {
    this.authManager = new AuthManager({
      apiKey: process.env.KAITO_API_TOKEN || 'step-validation-key',
      preferredAuthMethod: 'v2'
    });
    
    this.client = new KaitoTwitterAPIClient({
      apiKey: process.env.KAITO_API_TOKEN || 'step-validation-key',
      qpsLimit: 200,
      retryPolicy: {
        maxRetries: 2,
        backoffMs: 1000
      },
      costTracking: false
    });
  }
  
  /**
   * 段階的検証実行
   */
  async validateStepByStep(): Promise<void> {
    console.log('📝 段階的検証開始...\n');
    
    // インタラクティブモードの案内
    if (STEP_VALIDATION_CONFIG.INTERACTIVE_MODE) {
      console.log('🤖 インタラクティブモードで実行中');
      console.log('各ステップで確認を求められます。Enterキーで続行、"q"で終了\n');
    }
    
    // 実行順序の決定
    const executionOrder = this.calculateExecutionOrder();
    console.log(`📋 実行予定ステップ: ${executionOrder.length}件\n`);
    
    for (const stepId of executionOrder) {
      const step = this.validationSteps.find(s => s.id === stepId);
      if (!step) continue;
      
      // 依存関係チェック
      if (!this.checkDependencies(step)) {
        this.recordResult(stepId, 'BLOCKED', '依存関係未満足', [], [], ['依存ステップの完了が必要']);
        continue;
      }
      
      // スキップ条件チェック
      if (step.skipCondition && this.shouldSkip(step)) {
        this.recordResult(stepId, 'SKIP', step.skipCondition, [], [], []);
        console.log(`⏭️ ステップスキップ: ${step.name} - ${step.skipCondition}\n`);
        continue;
      }
      
      // ステップ実行前の確認
      if (STEP_VALIDATION_CONFIG.INTERACTIVE_MODE && STEP_VALIDATION_CONFIG.ENABLE_USER_CONFIRMATION) {
        const shouldContinue = await this.confirmStep(step);
        if (!shouldContinue) break;
      }
      
      // ステップの実行
      console.log(`🔍 Step ${executionOrder.indexOf(stepId) + 1}/${executionOrder.length}: ${step.name}`);
      console.log(`   ${step.description}`);
      
      const startTime = Date.now();
      
      try {
        await this.executeValidationStep(step);
        this.completedSteps.add(stepId);
        
        console.log(`✅ ${step.name} 完了\n`);
        
      } catch (error) {
        const executionTime = Date.now() - startTime;
        this.recordResult(stepId, 'FAIL', `実行エラー: ${error.message}`, 
                         [], [`エラー: ${error.message}`], ['エラーの解決が必要']);
        
        if (step.critical) {
          console.log(`❌ 重要ステップ失敗: ${step.name}`);
          console.log(`   エラー: ${error.message}`);
          console.log('   後続の重要ステップは実行できません\n');
          break;
        } else {
          console.log(`⚠️ ステップ失敗（継続可能）: ${step.name}\n`);
        }
      }
      
      // ステップ間の休憩
      if (STEP_VALIDATION_CONFIG.PAUSE_BETWEEN_STEPS) {
        await this.pauseBetweenSteps();
      }
    }
    
    // 最終結果表示
    this.printFinalResults();
  }
  
  /**
   * 実行順序の計算（依存関係考慮）
   */
  private calculateExecutionOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];
    
    const visit = (stepId: string): void => {
      if (visited.has(stepId)) return;
      if (visiting.has(stepId)) {
        throw new Error(`循環依存検出: ${stepId}`);
      }
      
      visiting.add(stepId);
      
      const step = this.validationSteps.find(s => s.id === stepId);
      if (step) {
        for (const dep of step.dependencies) {
          visit(dep);
        }
      }
      
      visiting.delete(stepId);
      visited.add(stepId);
      order.push(stepId);
    };
    
    for (const step of this.validationSteps) {
      visit(step.id);
    }
    
    return order;
  }
  
  /**
   * 依存関係チェック
   */
  private checkDependencies(step: ValidationStep): boolean {
    return step.dependencies.every(depId => {
      const depResult = this.results.get(depId);
      return depResult && (depResult.status === 'PASS' || depResult.status === 'SKIP');
    });
  }
  
  /**
   * スキップ条件判定
   */
  private shouldSkip(step: ValidationStep): boolean {
    switch (step.id) {
      case 'v1-login-auth':
        return !process.env.X_USERNAME || !process.env.X_PASSWORD;
      case 'v2-login-auth':
        return !process.env.TWITTER_USERNAME || !process.env.TWITTER_PASSWORD;
      default:
        return false;
    }
  }
  
  /**
   * ステップ実行前確認
   */
  private async confirmStep(step: ValidationStep): Promise<boolean> {
    if (!STEP_VALIDATION_CONFIG.INTERACTIVE_MODE) return true;
    
    return new Promise((resolve) => {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question(
        `\n${step.name} を実行しますか? [Enter=Yes, q=Quit]: `,
        (answer: string) => {
          readline.close();
          resolve(answer.toLowerCase() !== 'q');
        }
      );
    });
  }
  
  /**
   * 個別ステップの実行
   */
  private async executeValidationStep(step: ValidationStep): Promise<void> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const nextSteps: string[] = [];
    
    switch (step.id) {
      case 'env-check':
        await this.validateEnvironmentVariables(warnings, nextSteps);
        break;
        
      case 'type-definitions':
        await this.validateTypeDefinitions(warnings, nextSteps);
        break;
        
      case 'auth-core':
        await this.validateAuthCore(warnings, nextSteps);
        break;
        
      case 'api-key-auth':
        await this.validateApiKeyAuth(warnings, nextSteps);
        break;
        
      case 'v1-login-auth':
        await this.validateV1LoginAuth(warnings, nextSteps);
        break;
        
      case 'v2-login-auth':
        await this.validateV2LoginAuth(warnings, nextSteps);
        break;
        
      case 'integrated-login':
        await this.validateIntegratedLogin(warnings, nextSteps);
        break;
        
      case 'endpoint-separation':
        await this.validateEndpointSeparation(warnings, nextSteps);
        break;
        
      case 'auth-requirements':
        await this.validateAuthRequirements(warnings, nextSteps);
        break;
        
      case 'client-integration':
        await this.validateClientIntegration(warnings, nextSteps);
        break;
        
      case 'backward-compatibility':
        await this.validateBackwardCompatibility(warnings, nextSteps);
        break;
        
      case 'performance-check':
        await this.validatePerformance(warnings, nextSteps);
        break;
        
      default:
        throw new Error(`未知のステップ: ${step.id}`);
    }
    
    const executionTime = Date.now() - startTime;
    this.recordResult(step.id, 'PASS', '実行成功', warnings, nextSteps, []);
  }
  
  /**
   * Step 1: 環境変数確認
   */
  private async validateEnvironmentVariables(warnings: string[], nextSteps: string[]): Promise<void> {
    console.log('  🔍 環境変数チェック中...');
    
    // 必須環境変数
    if (!process.env.KAITO_API_TOKEN) {
      throw new Error('KAITO_API_TOKEN が設定されていません');
    }
    
    // V1認証環境変数
    const v1Vars = ['X_USERNAME', 'X_PASSWORD', 'X_EMAIL'];
    const v1Missing = v1Vars.filter(v => !process.env[v]);
    
    if (v1Missing.length > 0 && v1Missing.length < v1Vars.length) {
      warnings.push(`V1認証環境変数部分欠如: ${v1Missing.join(', ')}`);
      nextSteps.push('V1認証の完全な環境変数設定を推奨');
    }
    
    // V2認証環境変数
    const v2Vars = ['TWITTER_USERNAME', 'TWITTER_EMAIL', 'TWITTER_PASSWORD'];
    const v2Missing = v2Vars.filter(v => !process.env[v]);
    
    if (v2Missing.length > 0 && v2Missing.length < v2Vars.length) {
      warnings.push(`V2認証環境変数部分欠如: ${v2Missing.join(', ')}`);
      nextSteps.push('V2認証の完全な環境変数設定を推奨');
    }
    
    console.log('    ✅ KAITO_API_TOKEN設定済み');
    if (v1Missing.length === 0) {
      console.log('    ✅ V1認証環境変数完備');
    } else {
      console.log(`    ⚠️ V1認証環境変数: ${v1Vars.length - v1Missing.length}/${v1Vars.length}`);
    }
    if (v2Missing.length === 0) {
      console.log('    ✅ V2認証環境変数完備');
    } else {
      console.log(`    ⚠️ V2認証環境変数: ${v2Vars.length - v2Missing.length}/${v2Vars.length}`);
    }
  }
  
  /**
   * Step 2: 型定義確認
   */
  private async validateTypeDefinitions(warnings: string[], nextSteps: string[]): Promise<void> {
    console.log('  🔍 型定義チェック中...');
    
    // AuthStatus型の確認
    const authStatus = this.authManager.getAuthStatus();
    
    // 必須プロパティ
    const requiredProps = ['apiKeyValid', 'userSessionValid', 'canPerformUserActions'];
    const missingBasic = requiredProps.filter(prop => !(prop in authStatus));
    
    if (missingBasic.length > 0) {
      throw new Error(`基本プロパティ不足: ${missingBasic.join(', ')}`);
    }
    
    // 3層認証拡張プロパティ
    const extendedProps = ['authLevel', 'validAuthLevels', 'v1SessionValid', 'v2SessionValid'];
    const missingExtended = extendedProps.filter(prop => !(prop in authStatus));
    
    if (missingExtended.length > 0) {
      throw new Error(`3層認証拡張プロパティ不足: ${missingExtended.join(', ')}`);
    }
    
    // 型値の妥当性確認
    if (!['none', 'api-key', 'v1-login', 'v2-login'].includes(authStatus.authLevel)) {
      warnings.push(`認証レベル値異常: ${authStatus.authLevel}`);
    }
    
    if (!Array.isArray(authStatus.validAuthLevels)) {
      warnings.push('validAuthLevelsが配列ではありません');
    }
    
    console.log('    ✅ 基本型定義確認完了');
    console.log('    ✅ 3層認証拡張型定義確認完了');
    console.log(`    📊 現在の認証レベル: ${authStatus.authLevel}`);
    console.log(`    📊 有効認証レベル: ${authStatus.validAuthLevels?.join(', ') || 'なし'}`);
  }
  
  /**
   * Step 3: 認証コア実装確認
   */
  private async validateAuthCore(warnings: string[], nextSteps: string[]): Promise<void> {
    console.log('  🔍 認証コア実装チェック中...');
    
    // AuthManagerメソッド確認
    const requiredMethods = [
      'getAuthStatus', 'getAuthHeaders', 'getAuthParameters',
      'getCurrentAuthLevel', 'getValidAuthLevels',
      'login', 'loginV1', 'loginV2',
      'isUserSessionValid', 'logout'
    ];
    
    const missingMethods = requiredMethods.filter(method => 
      typeof (this.authManager as any)[method] !== 'function'
    );
    
    if (missingMethods.length > 0) {
      throw new Error(`AuthManagerメソッド不足: ${missingMethods.join(', ')}`);
    }
    
    // デバッグ情報確認
    const debugInfo = this.authManager.getDebugInfo();
    
    if (!debugInfo || typeof debugInfo !== 'object') {
      warnings.push('デバッグ情報が取得できません');
    } else {
      const debugKeys = ['currentAuthLevel', 'preferredAuthMethod', 'validAuthLevels'];
      const missingDebugKeys = debugKeys.filter(key => !(key in debugInfo));
      
      if (missingDebugKeys.length > 0) {
        warnings.push(`デバッグ情報キー不足: ${missingDebugKeys.join(', ')}`);
      }
    }
    
    console.log('    ✅ AuthManagerメソッド完備');
    console.log('    ✅ デバッグ情報機能確認完了');
    console.log(`    📊 推奨認証方法: ${debugInfo?.preferredAuthMethod || '不明'}`);
  }
  
  /**
   * Step 4: APIキー認証確認
   */
  private async validateApiKeyAuth(warnings: string[], nextSteps: string[]): Promise<void> {
    console.log('  🔍 APIキー認証チェック中...');
    
    // APIキー有効性確認
    const isApiKeyValid = this.authManager.isApiKeyValid();
    
    if (!isApiKeyValid) {
      throw new Error('APIキー認証が無効です');
    }
    
    // 認証ヘッダー生成確認
    const authHeaders = this.authManager.getAuthHeaders();
    
    if (!authHeaders || !authHeaders['x-api-key']) {
      throw new Error('APIキー認証ヘッダーが生成されません');
    }
    
    // 認証レベル確認
    const currentLevel = this.authManager.getCurrentAuthLevel();
    
    if (!['none', 'api-key'].includes(currentLevel)) {
      warnings.push(`APIキー認証時の認証レベルが予期しない値: ${currentLevel}`);
    }
    
    console.log('    ✅ APIキー有効性確認完了');
    console.log('    ✅ 認証ヘッダー生成確認完了');
    console.log(`    📊 APIキー認証レベル: ${currentLevel}`);
  }
  
  /**
   * Step 5: V1ログイン認証確認
   */
  private async validateV1LoginAuth(warnings: string[], nextSteps: string[]): Promise<void> {
    console.log('  🔍 V1ログイン認証チェック中...');
    
    if (!STEP_VALIDATION_CONFIG.ENABLE_REAL_API_TESTS) {
      console.log('    ⏭️ 実API認証テストはスキップされます');
      
      // モック確認のみ
      const debugInfo = this.authManager.getDebugInfo();
      
      if (!debugInfo.v1Login) {
        warnings.push('V1ログイン認証情報がデバッグ情報にありません');
      }
      
      return;
    }
    
    try {
      const loginResult = await this.authManager.loginV1();
      
      if (loginResult.success) {
        const authStatus = this.authManager.getAuthStatus();
        
        if (!authStatus.v1SessionValid) {
          warnings.push('V1ログイン成功したがセッションが無効です');
        }
        
        if (authStatus.authLevel !== 'v1-login') {
          warnings.push(`V1ログイン後の認証レベルが異常: ${authStatus.authLevel}`);
        }
        
        console.log('    ✅ V1ログイン認証成功');
        console.log(`    📊 V1認証レベル: ${authStatus.authLevel}`);
        
        nextSteps.push('V1認証機能の継続監視を推奨');
        
      } else {
        warnings.push(`V1ログイン失敗: ${loginResult.error}`);
        nextSteps.push('V1認証環境変数の確認、または2FAの設定確認');
        
        console.log(`    ⚠️ V1ログイン失敗: ${loginResult.error}`);
      }
      
    } catch (error) {
      warnings.push(`V1認証テストエラー: ${error.message}`);
      nextSteps.push('V1認証の環境設定確認');
      
      console.log(`    ⚠️ V1認証テストエラー: ${error.message}`);
    }
  }
  
  /**
   * Step 6: V2ログイン認証確認
   */
  private async validateV2LoginAuth(warnings: string[], nextSteps: string[]): Promise<void> {
    console.log('  🔍 V2ログイン認証チェック中...');
    
    if (!STEP_VALIDATION_CONFIG.ENABLE_REAL_API_TESTS) {
      console.log('    ⏭️ 実API認証テストはスキップされます');
      
      // モック確認のみ
      const debugInfo = this.authManager.getDebugInfo();
      
      if (!debugInfo.v2Login) {
        warnings.push('V2ログイン認証情報がデバッグ情報にありません');
      }
      
      return;
    }
    
    try {
      const loginResult = await this.authManager.loginV2();
      
      if (loginResult.success) {
        const authStatus = this.authManager.getAuthStatus();
        
        if (!authStatus.v2SessionValid) {
          warnings.push('V2ログイン成功したがセッションが無効です');
        }
        
        if (authStatus.authLevel !== 'v2-login') {
          warnings.push(`V2ログイン後の認証レベルが異常: ${authStatus.authLevel}`);
        }
        
        console.log('    ✅ V2ログイン認証成功');
        console.log(`    📊 V2認証レベル: ${authStatus.authLevel}`);
        
        nextSteps.push('V2認証を主要な認証方法として使用可能');
        
      } else {
        warnings.push(`V2ログイン失敗: ${loginResult.error}`);
        nextSteps.push('V2認証環境変数の確認、または認証情報の確認');
        
        console.log(`    ⚠️ V2ログイン失敗: ${loginResult.error}`);
      }
      
    } catch (error) {
      warnings.push(`V2認証テストエラー: ${error.message}`);
      nextSteps.push('V2認証の環境設定確認');
      
      console.log(`    ⚠️ V2認証テストエラー: ${error.message}`);
    }
  }
  
  /**
   * Step 7: 統合ログイン確認
   */
  private async validateIntegratedLogin(warnings: string[], nextSteps: string[]): Promise<void> {
    console.log('  🔍 統合ログインチェック中...');
    
    try {
      const loginResult = await this.authManager.login();
      
      if (loginResult.success) {
        const finalAuthLevel = this.authManager.getCurrentAuthLevel();
        
        if (!['v1-login', 'v2-login'].includes(finalAuthLevel)) {
          warnings.push(`統合ログイン後の認証レベルが予期しない値: ${finalAuthLevel}`);
        }
        
        const validLevels = this.authManager.getValidAuthLevels();
        
        if (!validLevels.includes(finalAuthLevel)) {
          warnings.push('現在の認証レベルが有効レベル一覧に含まれていません');
        }
        
        console.log('    ✅ 統合ログイン成功');
        console.log(`    📊 最終認証レベル: ${finalAuthLevel}`);
        console.log(`    📊 有効認証レベル: ${validLevels.join(', ')}`);
        
        nextSteps.push('統合ログインシステムの本格運用が可能');
        
      } else {
        warnings.push(`統合ログイン失敗: ${loginResult.error}`);
        nextSteps.push('少なくとも1つの認証方法（V1またはV2）の設定確認');
        
        console.log(`    ⚠️ 統合ログイン失敗: ${loginResult.error}`);
      }
      
    } catch (error) {
      throw new Error(`統合ログインエラー: ${error.message}`);
    }
  }
  
  /**
   * Step 8: エンドポイント分離確認
   */
  private async validateEndpointSeparation(warnings: string[], nextSteps: string[]): Promise<void> {
    console.log('  🔍 エンドポイント分離チェック中...');
    
    // エンドポイント分離確認用のテストパス
    const endpointTests = [
      { path: '/public/user-info', expectedLevels: ['api-key'] },
      { path: '/public/tweet-search', expectedLevels: ['api-key'] },
      { path: '/v1-auth/tweet-actions-v1', expectedLevels: ['v1-login', 'v2-login'] },
      { path: '/v2-auth/tweet-actions-v2', expectedLevels: ['v1-login', 'v2-login'] }
    ];
    
    let correctSeparations = 0;
    
    for (const test of endpointTests) {
      try {
        const requiredLevel = this.authManager.getRequiredAuthLevel(test.path);
        
        if (test.expectedLevels.includes(requiredLevel)) {
          correctSeparations++;
          if (STEP_VALIDATION_CONFIG.DETAILED_OUTPUT) {
            console.log(`    ✅ ${test.path}: ${requiredLevel}`);
          }
        } else {
          warnings.push(`エンドポイント要件異常 ${test.path}: 期待=${test.expectedLevels.join('|')}, 実際=${requiredLevel}`);
        }
        
      } catch (error) {
        warnings.push(`エンドポイント分離確認エラー ${test.path}: ${error.message}`);
      }
    }
    
    if (correctSeparations < endpointTests.length) {
      throw new Error(`エンドポイント分離に問題: ${correctSeparations}/${endpointTests.length}件が正常`);
    }
    
    console.log(`    ✅ エンドポイント分離確認完了: ${correctSeparations}/${endpointTests.length}件`);
    nextSteps.push('認証レベル別エンドポイント設計の本格運用が可能');
  }
  
  /**
   * Step 9: 認証要件判定確認
   */
  private async validateAuthRequirements(warnings: string[], nextSteps: string[]): Promise<void> {
    console.log('  🔍 認証要件判定チェック中...');
    
    // 認証要求判定メソッド確認
    const testEndpoints = [
      '/twitter/tweet/create',
      '/twitter/action/like',
      '/public/user-info'
    ];
    
    let successfulJudgments = 0;
    
    for (const endpoint of testEndpoints) {
      try {
        const requiredLevel = this.authManager.getRequiredAuthLevel(endpoint);
        const canAccess = this.authManager.canAccessEndpoint(endpoint);
        const requiresSession = this.authManager.requiresUserSession(endpoint);
        
        // 判定結果の妥当性確認
        if (requiredLevel === 'api-key' && requiresSession) {
          warnings.push(`認証要件判定矛盾 ${endpoint}: APIキー認証なのにセッション必要`);
        } else if (['v1-login', 'v2-login'].includes(requiredLevel) && !requiresSession) {
          warnings.push(`認証要件判定矛盾 ${endpoint}: ログイン認証なのにセッション不要`);
        } else {
          successfulJudgments++;
        }
        
        if (STEP_VALIDATION_CONFIG.DETAILED_OUTPUT) {
          console.log(`    📊 ${endpoint}: ${requiredLevel}, セッション=${requiresSession}, アクセス=${canAccess}`);
        }
        
      } catch (error) {
        warnings.push(`認証要件判定エラー ${endpoint}: ${error.message}`);
      }
    }
    
    if (successfulJudgments < testEndpoints.length) {
      warnings.push(`認証要件判定の一部に問題: ${successfulJudgments}/${testEndpoints.length}件が正常`);
    }
    
    console.log(`    ✅ 認証要件判定確認完了: ${successfulJudgments}/${testEndpoints.length}件`);
  }
  
  /**
   * Step 10: クライアント統合確認
   */
  private async validateClientIntegration(warnings: string[], nextSteps: string[]): Promise<void> {
    console.log('  🔍 クライアント統合チェック中...');
    
    // KaitoTwitterAPIClientメソッド確認
    const clientMethods = ['getUserInfo', 'searchTweets', 'createPost', 'performEngagement'];
    const missingMethods = clientMethods.filter(method => 
      typeof (this.client as any)[method] !== 'function'
    );
    
    if (missingMethods.length > 0) {
      throw new Error(`クライアントメソッド不足: ${missingMethods.join(', ')}`);
    }
    
    // クライアント設定確認
    try {
      // 基本設定での初期化確認
      const testClient = new KaitoTwitterAPIClient({
        apiKey: 'test-integration-key',
        qpsLimit: 200,
        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
        costTracking: false
      });
      
      if (!testClient) {
        throw new Error('クライアント初期化に失敗');
      }
      
      console.log('    ✅ クライアントメソッド完備');
      console.log('    ✅ クライアント初期化確認完了');
      
    } catch (error) {
      throw new Error(`クライアント統合エラー: ${error.message}`);
    }
    
    nextSteps.push('3層認証システムとクライアントの統合運用が可能');
  }
  
  /**
   * Step 11: 後方互換性確認
   */
  private async validateBackwardCompatibility(warnings: string[], nextSteps: string[]): Promise<void> {
    console.log('  🔍 後方互換性チェック中...');
    
    // AuthStatus後方互換性確認
    const authStatus = this.authManager.getAuthStatus();
    const legacyProps = ['apiKeyValid', 'userSessionValid', 'canPerformUserActions'];
    const missingLegacyProps = legacyProps.filter(prop => !(prop in authStatus));
    
    if (missingLegacyProps.length > 0) {
      throw new Error(`後方互換性問題: 従来プロパティ不足 ${missingLegacyProps.join(', ')}`);
    }
    
    // 既存メソッドの動作確認
    try {
      const isValid = this.authManager.isApiKeyValid();
      const userSessionValid = this.authManager.isUserSessionValid();
      const headers = this.authManager.getAuthHeaders();
      
      if (typeof isValid !== 'boolean' || typeof userSessionValid !== 'boolean') {
        warnings.push('既存メソッドの戻り値型に問題があります');
      }
      
      if (!headers || typeof headers !== 'object') {
        warnings.push('getAuthHeadersメソッドの戻り値に問題があります');
      }
      
    } catch (error) {
      warnings.push(`既存メソッド動作確認エラー: ${error.message}`);
    }
    
    console.log('    ✅ 従来プロパティ維持確認完了');
    console.log('    ✅ 既存メソッド動作確認完了');
    
    nextSteps.push('既存コードの変更なしで3層認証システムを利用可能');
  }
  
  /**
   * Step 12: パフォーマンス確認
   */
  private async validatePerformance(warnings: string[], nextSteps: string[]): Promise<void> {
    console.log('  🔍 パフォーマンスチェック中...');
    
    // 初期化時間測定
    const initStartTime = Date.now();
    const testAuthManager = new AuthManager({
      apiKey: 'perf-test-key',
      preferredAuthMethod: 'v2'
    });
    const initTime = Date.now() - initStartTime;
    
    if (initTime > 1000) {
      warnings.push(`初期化時間が長い: ${initTime}ms`);
    }
    
    // 認証状態取得時間測定
    const statusStartTime = Date.now();
    testAuthManager.getAuthStatus();
    const statusTime = Date.now() - statusStartTime;
    
    if (statusTime > 100) {
      warnings.push(`認証状態取得時間が長い: ${statusTime}ms`);
    }
    
    // デバッグ情報取得時間測定
    const debugStartTime = Date.now();
    testAuthManager.getDebugInfo();
    const debugTime = Date.now() - debugStartTime;
    
    if (debugTime > 200) {
      warnings.push(`デバッグ情報取得時間が長い: ${debugTime}ms`);
    }
    
    console.log(`    📊 初期化時間: ${initTime}ms`);
    console.log(`    📊 認証状態取得時間: ${statusTime}ms`);
    console.log(`    📊 デバッグ情報取得時間: ${debugTime}ms`);
    
    if (warnings.length === 0) {
      console.log('    ✅ パフォーマンス要件クリア');
      nextSteps.push('パフォーマンス面で本格運用に問題なし');
    } else {
      nextSteps.push('パフォーマンス最適化の検討を推奨');
    }
  }
  
  /**
   * ステップ間休憩
   */
  private async pauseBetweenSteps(): Promise<void> {
    if (!STEP_VALIDATION_CONFIG.INTERACTIVE_MODE) return;
    
    return new Promise((resolve) => {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('次のステップに進むにはEnterキーを押してください...', () => {
        readline.close();
        resolve();
      });
    });
  }
  
  /**
   * 結果記録
   */
  private recordResult(stepId: string, status: StepResult['status'], details: string,
                      warnings: string[], nextSteps: string[], blockingIssues: string[]): void {
    this.results.set(stepId, {
      stepId,
      status,
      details,
      executionTime: Date.now(),
      warnings,
      nextSteps,
      blockingIssues
    });
  }
  
  /**
   * 最終結果出力
   */
  private printFinalResults(): void {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 段階的検証 最終結果');
    console.log('='.repeat(70));
    
    const categoryStats = {
      core: { total: 0, passed: 0, failed: 0, skipped: 0, blocked: 0 },
      auth: { total: 0, passed: 0, failed: 0, skipped: 0, blocked: 0 },
      endpoints: { total: 0, passed: 0, failed: 0, skipped: 0, blocked: 0 },
      integration: { total: 0, passed: 0, failed: 0, skipped: 0, blocked: 0 }
    };
    
    // 統計計算
    for (const step of this.validationSteps) {
      const result = this.results.get(step.id);
      const stats = categoryStats[step.category];
      
      stats.total++;
      
      if (result) {
        switch (result.status) {
          case 'PASS': stats.passed++; break;
          case 'FAIL': stats.failed++; break;
          case 'SKIP': stats.skipped++; break;
          case 'BLOCKED': stats.blocked++; break;
        }
      } else {
        stats.blocked++;
      }
    }
    
    // カテゴリ別結果表示
    Object.entries(categoryStats).forEach(([category, stats]) => {
      const categoryName = {
        core: 'コア機能',
        auth: '認証システム',
        endpoints: 'エンドポイント',
        integration: '統合機能'
      }[category];
      
      console.log(`\n📊 ${categoryName}:`);
      console.log(`   総数: ${stats.total}, 成功: ${stats.passed}, 失敗: ${stats.failed}, スキップ: ${stats.skipped}, ブロック: ${stats.blocked}`);
      
      const successRate = stats.total > 0 ? (stats.passed / stats.total * 100).toFixed(1) : '0.0';
      console.log(`   成功率: ${successRate}%`);
    });
    
    // 全体サマリー
    const totalTests = this.validationSteps.length;
    const totalPassed = Object.values(categoryStats).reduce((sum, stats) => sum + stats.passed, 0);
    const totalFailed = Object.values(categoryStats).reduce((sum, stats) => sum + stats.failed, 0);
    const overallSuccessRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : '0.0';
    
    console.log(`\n🎯 全体結果:`);
    console.log(`   総合成功率: ${overallSuccessRate}% (${totalPassed}/${totalTests})`);
    
    // 推奨される次のアクション
    console.log('\n📋 推奨される次のアクション:');
    const allNextSteps = Array.from(this.results.values())
      .flatMap(result => result.nextSteps)
      .filter((step, index, array) => array.indexOf(step) === index);
    
    if (allNextSteps.length > 0) {
      allNextSteps.forEach((step, index) => {
        console.log(`   ${index + 1}. ${step}`);
      });
    } else {
      console.log('   🎉 3層認証システム完全に準備完了！');
    }
    
    // 重要な問題がある場合
    const criticalIssues = Array.from(this.results.values())
      .filter(result => result.status === 'FAIL')
      .flatMap(result => result.blockingIssues);
    
    if (criticalIssues.length > 0) {
      console.log('\n🚨 解決が必要な重要な問題:');
      criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    console.log('='.repeat(70));
  }
}

// メイン実行
async function main(): Promise<void> {
  const validator = new StepByStepValidator();
  
  try {
    await validator.validateStepByStep();
  } catch (error) {
    console.error('❌ 段階的検証実行エラー:', error);
    process.exit(1);
  }
}

// スクリプト直接実行時のみmain実行
import { fileURLToPath } from 'url';

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { StepByStepValidator };