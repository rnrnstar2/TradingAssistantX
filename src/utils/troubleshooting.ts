/**
 * トラブルシューティング・問題診断システム
 */

import { AuthManager } from '../kaito-api/core/auth-manager';

interface DiagnosticResult {
  category: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export class TroubleshootingManager {
  
  /**
   * 環境変数診断
   */
  async diagnoseEnvironmentVariables(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    const requiredVars = [
      { name: 'KAITO_API_TOKEN', description: 'TwitterAPI.io API Key' },
      { name: 'X_USERNAME', description: 'Twitter Username' },
      { name: 'X_PASSWORD', description: 'Twitter Password' },
      { name: 'X_EMAIL', description: 'Twitter Email' },
      { name: 'X_PROXY', description: 'Proxy Configuration' }
    ];
    
    for (const envVar of requiredVars) {
      const value = process.env[envVar.name];
      
      if (!value) {
        results.push({
          category: 'Environment',
          status: 'error',
          message: `❌ ${envVar.name} is not set`,
          details: { description: envVar.description }
        });
      } else if (value.length < 5) {
        results.push({
          category: 'Environment',
          status: 'warning',
          message: `⚠️  ${envVar.name} seems too short`,
          details: { length: value.length }
        });
      } else {
        results.push({
          category: 'Environment',
          status: 'success',
          message: `✅ ${envVar.name} is set correctly`,
          details: { description: envVar.description }
        });
      }
    }
    
    return results;
  }
  
  /**
   * API接続診断
   */
  async diagnoseAPIConnection(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    try {
      // API基本接続テスト
      const response = await fetch('https://api.twitterapi.io/health', {
        method: 'GET',
        headers: {
          'x-api-key': process.env.KAITO_API_TOKEN || ''
        }
      });
      
      if (response.ok) {
        results.push({
          category: 'API Connection',
          status: 'success',
          message: '✅ TwitterAPI.io connection successful',
          details: { status: response.status }
        });
      } else {
        results.push({
          category: 'API Connection',
          status: 'error',
          message: `❌ TwitterAPI.io connection failed: ${response.status}`,
          details: { status: response.status, statusText: response.statusText }
        });
      }
    } catch (error) {
      results.push({
        category: 'API Connection',
        status: 'error',
        message: `❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      });
    }
    
    return results;
  }
  
  /**
   * ログイン診断
   */
  async diagnoseLogin(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    try {
      const authManager = new AuthManager();
      const loginResult = await authManager.login();
      
      if (loginResult.success) {
        results.push({
          category: 'Login',
          status: 'success',
          message: '✅ Login successful',
          details: { 
            hasLoginCookie: !!loginResult.login_cookie,
            sessionExpires: loginResult.session_expires
          }
        });
      } else {
        results.push({
          category: 'Login',
          status: 'error',
          message: `❌ Login failed: ${loginResult.error}`,
          details: { error: loginResult.error }
        });
      }
    } catch (error) {
      results.push({
        category: 'Login',
        status: 'error',
        message: `❌ Login error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      });
    }
    
    return results;
  }
  
  /**
   * 投稿機能診断
   */
  async diagnosePosting(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    try {
      console.log('🔍 投稿機能診断開始...');
      
      // AuthManagerの初期化と認証確認
      const authManager = new AuthManager();
      const loginResult = await authManager.login();
      
      if (!loginResult.success) {
        results.push({
          category: 'Posting',
          status: 'error',
          message: '❌ Login required for posting test',
          details: { error: loginResult.error }
        });
        return results;
      }
      
      // セッション有効性確認
      if (!authManager.isUserSessionValid()) {
        results.push({
          category: 'Posting',
          status: 'error',
          message: '❌ Invalid session for posting',
          details: { sessionValid: false }
        });
        return results;
      }
      
      results.push({
        category: 'Posting',
        status: 'success',
        message: '✅ Posting prerequisites satisfied',
        details: { 
          loginCookie: !!authManager.getUserSession(),
          sessionValid: authManager.isUserSessionValid()
        }
      });
      
    } catch (error) {
      results.push({
        category: 'Posting',
        status: 'error',
        message: `❌ Posting diagnostic error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      });
    }
    
    return results;
  }
  
  /**
   * プロキシ接続診断
   */
  async diagnoseProxyConnection(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    try {
      const proxyUrl = process.env.X_PROXY;
      
      if (!proxyUrl) {
        results.push({
          category: 'Proxy',
          status: 'warning',
          message: '⚠️ No proxy configuration found',
          details: { proxyConfigured: false }
        });
        return results;
      }
      
      // プロキシURL形式の基本検証
      const proxyRegex = /^https?:\/\/[\w\-\.]+:\w+@[\d\.]+:\d+$/;
      if (!proxyRegex.test(proxyUrl)) {
        results.push({
          category: 'Proxy',
          status: 'warning',
          message: '⚠️ Proxy URL format may be invalid',
          details: { proxyUrl: proxyUrl.substring(0, 20) + '...' }
        });
      } else {
        results.push({
          category: 'Proxy',
          status: 'success',
          message: '✅ Proxy configuration format valid',
          details: { proxyConfigured: true }
        });
      }
      
    } catch (error) {
      results.push({
        category: 'Proxy',
        status: 'error',
        message: `❌ Proxy diagnostic error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      });
    }
    
    return results;
  }
  
  /**
   * システム全体診断
   */
  async diagnoseSystemHealth(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    try {
      // メモリ使用量チェック
      const memoryUsage = process.memoryUsage();
      const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      
      if (memoryUsedMB > 500) {
        results.push({
          category: 'System Health',
          status: 'warning',
          message: `⚠️ High memory usage: ${memoryUsedMB}MB`,
          details: { memoryUsage: memoryUsedMB }
        });
      } else {
        results.push({
          category: 'System Health',
          status: 'success',
          message: `✅ Memory usage normal: ${memoryUsedMB}MB`,
          details: { memoryUsage: memoryUsedMB }
        });
      }
      
      // システム稼働時間チェック
      const uptimeHours = Math.round(process.uptime() / 3600 * 100) / 100;
      results.push({
        category: 'System Health',
        status: 'success',
        message: `✅ System uptime: ${uptimeHours} hours`,
        details: { uptime: uptimeHours }
      });
      
    } catch (error) {
      results.push({
        category: 'System Health',
        status: 'error',
        message: `❌ System health check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      });
    }
    
    return results;
  }
  
  /**
   * 総合診断実行
   */
  async runFullDiagnostic(): Promise<DiagnosticResult[]> {
    console.log('🔍 Running full system diagnostic...');
    
    const allResults: DiagnosticResult[] = [];
    
    try {
      // 環境変数診断
      console.log('📋 Checking environment variables...');
      const envResults = await this.diagnoseEnvironmentVariables();
      allResults.push(...envResults);
      
      // API接続診断
      console.log('🌐 Checking API connection...');
      const apiResults = await this.diagnoseAPIConnection();
      allResults.push(...apiResults);
      
      // プロキシ診断
      console.log('🔗 Checking proxy connection...');
      const proxyResults = await this.diagnoseProxyConnection();
      allResults.push(...proxyResults);
      
      // ログイン診断
      console.log('🔐 Checking login functionality...');
      const loginResults = await this.diagnoseLogin();
      allResults.push(...loginResults);
      
      // 投稿機能診断
      console.log('📝 Checking posting functionality...');
      const postingResults = await this.diagnosePosting();
      allResults.push(...postingResults);
      
      // システム健康度診断
      console.log('💊 Checking system health...');
      const systemResults = await this.diagnoseSystemHealth();
      allResults.push(...systemResults);
      
    } catch (error) {
      allResults.push({
        category: 'Diagnostic System',
        status: 'error',
        message: `❌ Diagnostic system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error }
      });
    }
    
    // 結果サマリー
    const successCount = allResults.filter(r => r.status === 'success').length;
    const warningCount = allResults.filter(r => r.status === 'warning').length;
    const errorCount = allResults.filter(r => r.status === 'error').length;
    
    console.log(`📊 Diagnostic Summary: ${successCount} success, ${warningCount} warnings, ${errorCount} errors`);
    
    // サマリーを結果に追加
    allResults.push({
      category: 'Summary',
      status: errorCount === 0 ? (warningCount === 0 ? 'success' : 'warning') : 'error',
      message: `📊 Diagnostic completed: ${successCount} success, ${warningCount} warnings, ${errorCount} errors`,
      details: { successCount, warningCount, errorCount, totalChecks: allResults.length }
    });
    
    return allResults;
  }
  
  /**
   * 問題解決提案取得
   */
  getTroubleshootingSuggestions(results: DiagnosticResult[]): string[] {
    const suggestions: string[] = [];
    
    const errorsByCategory = results
      .filter(r => r.status === 'error')
      .reduce((acc, result) => {
        if (!acc[result.category]) {
          acc[result.category] = [];
        }
        acc[result.category].push(result);
        return acc;
      }, {} as Record<string, DiagnosticResult[]>);
    
    // 環境変数関連の提案
    if (errorsByCategory['Environment']) {
      suggestions.push(
        '🔧 Environment Variable Issues:',
        '   1. Create or update .env file in project root',
        '   2. Set the following required variables:',
        '      X_USERNAME=rnrnstar',
        '      X_PASSWORD=Rinstar_520',
        '      X_EMAIL=suzumura@rnrnstar.com',
        '      X_PROXY=http://etilmzge:ina8vl2juf1w@23.95.150.145:6114',
        '      KAITO_API_TOKEN=your_api_key',
        '   3. Restart the application',
        ''
      );
    }
    
    // API接続関連の提案
    if (errorsByCategory['API Connection']) {
      suggestions.push(
        '🌐 API Connection Issues:',
        '   1. Verify KAITO_API_TOKEN is valid and active',
        '   2. Check network connectivity',
        '   3. Verify proxy settings (X_PROXY)',
        '   4. Check TwitterAPI.io service status',
        '   5. Try running: curl -H "x-api-key: $KAITO_API_TOKEN" https://api.twitterapi.io/health',
        ''
      );
    }
    
    // ログイン関連の提案
    if (errorsByCategory['Login']) {
      suggestions.push(
        '🔐 Login Issues:',
        '   1. Verify X_USERNAME, X_PASSWORD, X_EMAIL are correct',
        '   2. Check account is not locked or suspended',
        '   3. Verify proxy configuration (X_PROXY)',
        '   4. Try manual login to verify credentials',
        '   5. Check for 2FA or security restrictions',
        ''
      );
    }
    
    // 投稿関連の提案
    if (errorsByCategory['Posting']) {
      suggestions.push(
        '📝 Posting Issues:',
        '   1. Ensure login is successful first',
        '   2. Check login_cookie validity',
        '   3. Verify account permissions for posting',
        '   4. Check for API rate limits',
        '   5. Verify content meets Twitter guidelines',
        ''
      );
    }
    
    // プロキシ関連の提案
    if (errorsByCategory['Proxy']) {
      suggestions.push(
        '🔗 Proxy Issues:',
        '   1. Verify proxy URL format: http://user:pass@ip:port',
        '   2. Test proxy connectivity separately',
        '   3. Check proxy authentication credentials',
        '   4. Try different proxy if available',
        ''
      );
    }
    
    // システム健康度関連の提案
    if (errorsByCategory['System Health']) {
      suggestions.push(
        '💊 System Health Issues:',
        '   1. Restart the application if memory usage is high',
        '   2. Check for memory leaks in long-running processes',
        '   3. Monitor system resources',
        '   4. Consider increasing system limits if needed',
        ''
      );
    }
    
    // 一般的な提案
    if (suggestions.length === 0) {
      suggestions.push(
        '✅ System appears healthy!',
        '💡 General maintenance suggestions:',
        '   1. Regularly monitor logs for any warnings',
        '   2. Keep environment variables up to date',
        '   3. Test posting functionality periodically',
        '   4. Monitor API usage and costs',
        ''
      );
    }
    
    return suggestions;
  }
  
  /**
   * 診断結果の整形出力
   */
  formatDiagnosticResults(results: DiagnosticResult[]): string {
    let output = '\n🔍 System Diagnostic Report\n';
    output += '=' .repeat(50) + '\n\n';
    
    const categories = [...new Set(results.map(r => r.category))];
    
    for (const category of categories) {
      output += `📋 ${category}\n`;
      output += '-'.repeat(30) + '\n';
      
      const categoryResults = results.filter(r => r.category === category);
      for (const result of categoryResults) {
        output += `${result.message}\n`;
        if (result.details && Object.keys(result.details).length > 0) {
          output += `   Details: ${JSON.stringify(result.details, null, 2).replace(/\n/g, '\n   ')}\n`;
        }
      }
      output += '\n';
    }
    
    // 問題解決提案を追加
    const suggestions = this.getTroubleshootingSuggestions(results);
    if (suggestions.length > 0) {
      output += '💡 Troubleshooting Suggestions\n';
      output += '=' .repeat(50) + '\n';
      output += suggestions.join('\n') + '\n';
    }
    
    return output;
  }
}

/**
 * 問題解決ガイド・トラブルシューティング手順
 */
export const TROUBLESHOOTING_GUIDE = {
  
  // 環境変数関連
  'MISSING_ENV_VARS': {
    problem: '必須環境変数が未設定',
    solution: [
      '1. .env ファイルを作成',
      '2. 以下の環境変数を設定:',
      '   X_USERNAME=rnrnstar',
      '   X_PASSWORD=Rinstar_520',
      '   X_EMAIL=suzumura@rnrnstar.com',
      '   X_PROXY=http://etilmzge:ina8vl2juf1w@23.95.150.145:6114',
      '   KAITO_API_TOKEN=your_api_key',
      '3. システム再起動'
    ]
  },
  
  // API接続関連
  'API_CONNECTION_FAILED': {
    problem: 'TwitterAPI.io への接続が失敗',
    solution: [
      '1. KAITO_API_TOKEN の有効性確認',
      '2. プロキシ設定の確認 (X_PROXY)',
      '3. ネットワーク接続の確認',
      '4. TwitterAPI.io サービス状況確認'
    ]
  },
  
  // ログイン関連
  'LOGIN_FAILED': {
    problem: 'user_login_v2 でのログインが失敗',
    solution: [
      '1. X_USERNAME, X_PASSWORD, X_EMAIL の正確性確認',
      '2. プロキシ設定の確認',
      '3. アカウントロック状況の確認',
      '4. API使用制限の確認'
    ]
  },
  
  // 投稿関連
  'POSTING_FAILED': {
    problem: 'create_tweet_v2 での投稿が失敗',
    solution: [
      '1. login_cookie の有効性確認',
      '2. 投稿内容の確認（文字数制限等）',
      '3. セッション期限切れの確認',
      '4. アカウント凍結状況の確認'
    ]
  }
};

// デフォルトエクスポート
export default TroubleshootingManager;