/**
 * ログイン部分のみの単体テスト
 * Authentication failed: login failed エラーのデバッグ用
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { AuthManager } from '../../../src/kaito-api/core/auth-manager';
import { AuthDiagnostics } from '../../../src/kaito-api/utils/auth-diagnostics';

describe('ログイン機能単体テスト', () => {
  let authManager: AuthManager;
  
  beforeEach(() => {
    // AuthManager初期化
    authManager = new AuthManager({
      apiKey: process.env.KAITO_API_TOKEN || 'test-api-key'
    });
  });

  describe('環境変数確認', () => {
    test('必要な環境変数がすべて設定されているか', () => {
      console.log('=== 環境変数確認 ===');
      
      const envCheck = authManager.checkEnvironmentVariables();
      
      console.log('📋 環境変数チェック結果:');
      console.log('  - 有効:', envCheck.valid);
      console.log('  - 存在する変数:', envCheck.present);
      console.log('  - 不足している変数:', envCheck.missing);
      
      // 環境変数の実際の値（マスクして表示）
      const envVars = {
        KAITO_API_TOKEN: process.env.KAITO_API_TOKEN ? `${process.env.KAITO_API_TOKEN.slice(0, 8)}...` : 'なし',
        X_USERNAME: process.env.X_USERNAME || 'なし', 
        X_EMAIL: process.env.X_EMAIL || 'なし',
        X_PASSWORD: process.env.X_PASSWORD ? '設定済み' : 'なし'
      };
      
      console.log('📝 環境変数値:');
      Object.entries(envVars).forEach(([key, value]) => {
        console.log(`  - ${key}: ${value}`);
      });
      
      // テストログを保存
      const testResults = {
        timestamp: new Date().toISOString(),
        envCheck,
        envVars
      };
      
      console.log('✅ 環境変数確認完了');
    });
  });

  describe('APIキー認証テスト', () => {
    test('APIキーの形式確認', () => {
      console.log('=== APIキー認証テスト ===');
      
      const isValid = authManager.isValidFormat();
      const obfuscated = authManager.getObfuscatedApiKey();
      
      console.log('🔑 APIキー状態:');
      console.log('  - 形式有効:', isValid);
      console.log('  - キー（マスク済み）:', obfuscated);
      
      expect(isValid).toBe(true);
      console.log('✅ APIキー形式確認完了');
    });
    
    test('APIキー接続テスト', async () => {
      console.log('=== APIキー接続テスト ===');
      
      const connectionResult = await authManager.testConnection();
      
      console.log('🌐 接続テスト結果:');
      console.log('  - 成功:', connectionResult.success);
      console.log('  - エラー:', connectionResult.error || 'なし');
      
      if (!connectionResult.success) {
        console.log('❌ APIキー接続失敗:', connectionResult.error);
      } else {
        console.log('✅ APIキー接続成功');
      }
    });
  });

  describe('ログイン詳細テスト', () => {
    test('V2ログイン実行とエラー詳細', async () => {
      console.log('=== V2ログイン詳細テスト ===');
      
      // ログイン前の状態確認
      const beforeAuth = authManager.getAuthStatus();
      console.log('🔍 ログイン前の認証状態:');
      console.log('  - APIキー有効:', beforeAuth.apiKeyValid);
      console.log('  - セッション有効:', beforeAuth.userSessionValid);
      console.log('  - 現在の認証レベル:', beforeAuth.authLevel);
      
      // 環境変数確認
      const envCheck = authManager.checkEnvironmentVariables();
      console.log('📋 必要な環境変数:');
      console.log('  - 有効:', envCheck.valid);
      console.log('  - 不足:', envCheck.missing);
      
      if (!envCheck.valid) {
        console.log('⚠️ 環境変数不足のためログインテストをスキップ');
        console.log('不足している変数:', envCheck.missing);
        return;
      }
      
      try {
        console.log('🔐 V2ログイン実行開始...');
        
        // ログイン実行
        const loginResult = await authManager.loginV2();
        
        console.log('📊 ログイン結果:');
        console.log('  - 成功:', loginResult.success);
        console.log('  - エラー:', loginResult.error || 'なし');
        
        if (loginResult.success) {
          console.log('  - login_cookie:', loginResult.login_cookie ? 'あり' : 'なし');
          console.log('  - session_expires:', loginResult.session_expires ? new Date(loginResult.session_expires).toISOString() : 'なし');
          
          // ログイン後の状態確認
          const afterAuth = authManager.getAuthStatus();
          console.log('🔍 ログイン後の認証状態:');
          console.log('  - APIキー有効:', afterAuth.apiKeyValid);
          console.log('  - セッション有効:', afterAuth.userSessionValid);
          console.log('  - V2セッション有効:', afterAuth.v2SessionValid);
          console.log('  - 現在の認証レベル:', afterAuth.authLevel);
          
          console.log('✅ ログイン成功');
        } else {
          console.log('❌ ログイン失敗');
          console.log('エラー詳細:', loginResult.error);
          
          // 失敗時のデバッグ情報を取得
          const debugInfo = authManager.getDebugInfo();
          console.log('🔧 デバッグ情報:');
          console.log('  - 現在の認証レベル:', debugInfo.currentAuthLevel);
          console.log('  - 有効な認証レベル:', debugInfo.validAuthLevels);
          console.log('  - 環境変数状態:', debugInfo.environment);
        }
        
      } catch (error) {
        console.log('💥 ログイン実行中にエラー発生:');
        console.log('エラーメッセージ:', error instanceof Error ? error.message : String(error));
        console.log('エラータイプ:', error instanceof Error ? error.constructor.name : typeof error);
        
        if (error instanceof Error && error.stack) {
          console.log('スタックトレース:', error.stack);
        }
        
        // エラー時のデバッグ情報
        const debugInfo = authManager.getDebugInfo();
        console.log('🔧 エラー時デバッグ情報:');
        console.log(JSON.stringify(debugInfo, null, 2));
        
        throw error;
      }
    });
    
    test('認証エラーパターン詳細分析', async () => {
      console.log('=== 認証エラーパターン分析 ===');
      
      // 全接続テスト実行
      const connectionTests = await authManager.testAllConnections();
      
      console.log('🧪 全接続テスト結果:');
      console.log('  - APIキー:', connectionTests.apiKey.success ? '成功' : `失敗: ${connectionTests.apiKey.error}`);
      console.log('  - V2ログイン:', connectionTests.v2Login.success ? '成功' : `失敗: ${connectionTests.v2Login.error}`);
      console.log('  - 全体評価:', connectionTests.overall ? '成功' : '失敗');
      
      // デバッグ情報の詳細出力
      const debugInfo = authManager.getDebugInfo();
      
      console.log('🔍 詳細デバッグ情報:');
      console.log('APIキー情報:', debugInfo.apiKey);
      console.log('V2ログイン情報:', debugInfo.v2Login);
      console.log('セッション統計:', debugInfo.sessionStats);
      console.log('環境変数:', debugInfo.environment);
      
      console.log('✅ エラーパターン分析完了');
    });
    
    test('ログイン失敗時の詳細ログ出力', async () => {
      console.log('=== ログイン失敗詳細ログ ===');
      
      // 環境変数チェック
      const envVars = {
        hasKaitoToken: !!process.env.KAITO_API_TOKEN,
        hasUsername: !!process.env.X_USERNAME,
        hasEmail: !!process.env.X_EMAIL, 
        hasPassword: !!process.env.X_PASSWORD
      };
      
      console.log('🔍 環境変数存在チェック:', envVars);
      
      // ログイン実行前の準備
      console.log('🚀 ログイン実行準備中...');
      
      try {
        const loginResult = await authManager.login();
        
        if (!loginResult.success) {
          console.log('❌ ログイン失敗 - 詳細分析:');
          console.log('  エラーメッセージ:', loginResult.error);
          
          // エラーの種類を分析
          const errorType = loginResult.error?.toLowerCase() || '';
          
          if (errorType.includes('authentication failed')) {
            console.log('  🔐 認証失敗系エラー');
            console.log('  💡 考えられる原因:');
            console.log('    - ユーザー名またはパスワードが間違っている');
            console.log('    - アカウントがロックされている');
            console.log('    - 2段階認証の設定に問題がある');
          }
          
          if (errorType.includes('login failed')) {
            console.log('  🚫 ログイン失敗系エラー');
            console.log('  💡 考えられる原因:');
            console.log('    - TwitterAPI.ioのサーバー側問題');
            console.log('    - ネットワーク接続問題');
            console.log('    - APIキーの問題');
          }
          
          // 推奨対策を出力
          console.log('  🛠️ 推奨対策:');
          console.log('    1. 環境変数を再確認');
          console.log('    2. Twitterアカウントの状態確認');
          console.log('    3. APIキーの有効性確認');
          console.log('    4. ネットワーク接続確認');
        }
        
      } catch (error) {
        console.log('💥 ログイン実行エラー:', error);
      }
      
      console.log('✅ 詳細ログ出力完了');
    });
    
    test('認証エラー診断ツール実行', async () => {
      console.log('=== 認証エラー診断ツール ===');
      
      // ログイン実行
      const loginResult = await authManager.login();
      
      if (!loginResult.success && loginResult.error) {
        console.log('🔍 エラー診断実行中...');
        
        // 現在の認証状態とデバッグ情報を取得
        const authStatus = authManager.getAuthStatus();
        const debugInfo = authManager.getDebugInfo();
        
        // 診断レポート生成
        const diagnosticReport = AuthDiagnostics.generateDiagnosticReport(
          loginResult.error,
          authStatus,
          debugInfo
        );
        
        console.log(diagnosticReport);
        
        // 環境変数診断
        const envDiagnosis = AuthDiagnostics.diagnoseEnvironmentVariables();
        console.log('🌍 環境変数診断結果:');
        console.log('  - ステータス:', envDiagnosis.status);
        console.log('  - 問題:', envDiagnosis.issues);
        console.log('  - 推奨対策:', envDiagnosis.recommendations);
        
        // エラー分析
        const errorAnalysis = AuthDiagnostics.analyzeAuthError(loginResult.error);
        console.log('📊 エラー詳細分析:');
        console.log('  - エラータイプ:', errorAnalysis.errorType);
        console.log('  - 重要度:', errorAnalysis.severity);
        console.log('  - 考えられる原因:', errorAnalysis.possibleCauses);
        console.log('  - 推奨対策:', errorAnalysis.recommendedActions);
        
      } else if (loginResult.success) {
        console.log('✅ ログイン成功 - 診断ツールはエラー時のみ使用されます');
      }
      
      console.log('✅ 認証エラー診断完了');
    });
  });
});