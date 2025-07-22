#!/usr/bin/env node

import { SimpleXClient } from '../lib/x-client';
import { OAuth1Credentials, generateOAuth1Header, generateNonce, generateTimestamp } from '../lib/oauth1-client';
import fetch from 'node-fetch';
import * as yaml from 'js-yaml';
import { writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface DiagnosticResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  timestamp: number;
  duration?: number;
}

interface DiagnosticReport {
  summary: {
    timestamp: number;
    total_tests: number;
    passed: number;
    failed: number;
    warnings: number;
    overall_status: 'healthy' | 'issues_detected' | 'critical_failure';
  };
  environment: {
    node_version: string;
    platform: string;
    test_mode: boolean;
  };
  credentials: {
    consumer_key_configured: boolean;
    consumer_secret_configured: boolean;
    access_token_configured: boolean;
    access_token_secret_configured: boolean;
    format_validation: DiagnosticResult[];
  };
  connectivity: {
    internet_connection: DiagnosticResult[];
    api_endpoints: DiagnosticResult[];
  };
  oauth_signature: {
    signature_generation: DiagnosticResult[];
    header_format: DiagnosticResult[];
  };
  api_tests: {
    account_access: DiagnosticResult[];
    rate_limits: DiagnosticResult[];
  };
  troubleshooting: {
    issues_found: string[];
    recommendations: string[];
  };
}

class OAuth1Diagnostics {
  private oauth1Credentials?: OAuth1Credentials;
  private verbose: boolean;
  private client: SimpleXClient;
  private results: DiagnosticResult[] = [];

  constructor() {
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    this.client = SimpleXClient.getInstance();
    this.loadOAuth1Credentials();
  }

  private loadOAuth1Credentials(): void {
    const consumerKey = process.env.X_CONSUMER_KEY;
    const consumerSecret = process.env.X_CONSUMER_SECRET;
    const accessToken = process.env.X_ACCESS_TOKEN;
    const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

    if (consumerKey && consumerSecret && accessToken && accessTokenSecret) {
      this.oauth1Credentials = {
        consumerKey,
        consumerSecret,
        accessToken,
        accessTokenSecret
      };
    }
  }

  private printHeader(): void {
    console.log('\n🔍 OAuth 1.0a 詳細診断ツール');
    console.log('============================\n');
    
    if (this.verbose) {
      console.log('📝 VERBOSEモード: 詳細な診断情報を表示します');
      console.log('');
    }
  }

  private async runDiagnostic(
    category: string,
    test: string,
    diagFn: () => Promise<{ status: 'pass' | 'fail' | 'warning'; message: string; details?: any }>
  ): Promise<DiagnosticResult> {
    const start = Date.now();
    console.log(`🔍 [${category}] ${test}...`);

    try {
      const { status, message, details } = await diagFn();
      const duration = Date.now() - start;
      
      const icon = status === 'pass' ? '✅' : status === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} [${category}] ${test}: ${message} (${duration}ms)`);
      
      if (this.verbose && details) {
        console.log('   詳細:', JSON.stringify(details, null, 2));
      }

      const result: DiagnosticResult = {
        category,
        test,
        status,
        message,
        details,
        timestamp: Date.now(),
        duration
      };
      
      this.results.push(result);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.log(`❌ [${category}] ${test}: ${errorMessage} (${duration}ms)`);
      
      if (this.verbose && error instanceof Error) {
        console.log('   スタックトレース:', error.stack);
      }

      const result: DiagnosticResult = {
        category,
        test,
        status: 'fail',
        message: errorMessage,
        timestamp: Date.now(),
        duration
      };
      
      this.results.push(result);
      return result;
    }
  }

  private async checkCredentialConfiguration(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    // 各認証情報の存在確認
    const credentials = [
      { key: 'X_CONSUMER_KEY', value: process.env.X_CONSUMER_KEY },
      { key: 'X_CONSUMER_SECRET', value: process.env.X_CONSUMER_SECRET },
      { key: 'X_ACCESS_TOKEN', value: process.env.X_ACCESS_TOKEN },
      { key: 'X_ACCESS_TOKEN_SECRET', value: process.env.X_ACCESS_TOKEN_SECRET }
    ];

    for (const cred of credentials) {
      results.push(await this.runDiagnostic(
        'Credentials',
        `${cred.key} 設定確認`,
        async () => {
          if (!cred.value) {
            return { status: 'fail', message: '環境変数が設定されていません' };
          }
          if (cred.value.trim() === '') {
            return { status: 'fail', message: '環境変数が空です' };
          }
          return { 
            status: 'pass', 
            message: '設定済み', 
            details: { length: cred.value.length, preview: cred.value.substring(0, 10) + '...' }
          };
        }
      ));
    }

    // 認証情報の形式確認
    if (this.oauth1Credentials) {
      results.push(await this.runDiagnostic(
        'Credentials',
        'Consumer Key 形式確認',
        async () => {
          const key = this.oauth1Credentials!.consumerKey;
          if (key.length < 10) {
            return { status: 'warning', message: 'Consumer Keyが短すぎます' };
          }
          if (!/^[a-zA-Z0-9]+$/.test(key)) {
            return { status: 'warning', message: 'Consumer Keyに無効な文字が含まれている可能性があります' };
          }
          return { status: 'pass', message: '形式が正常です' };
        }
      ));

      results.push(await this.runDiagnostic(
        'Credentials',
        'Access Token 形式確認',
        async () => {
          const token = this.oauth1Credentials!.accessToken;
          if (!token.includes('-')) {
            return { status: 'warning', message: 'Access Tokenの形式が正しくない可能性があります（通常は"-"が含まれます）' };
          }
          return { status: 'pass', message: '形式が正常です' };
        }
      ));
    }

    return results;
  }

  private async checkConnectivity(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    // インターネット接続確認
    results.push(await this.runDiagnostic(
      'Connectivity',
      'インターネット接続確認',
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
          const response = await fetch('https://www.google.com', { 
            method: 'HEAD',
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            return { status: 'pass', message: '接続正常' };
          }
          return { status: 'fail', message: `HTTP ${response.status}` };
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }
    ));

    // X API エンドポイント接続確認
    const endpoints = [
      'https://api.twitter.com/2/users/me',
      'https://api.twitter.com/2/tweets'
    ];

    for (const endpoint of endpoints) {
      results.push(await this.runDiagnostic(
        'Connectivity',
        `${endpoint} 到達性確認`,
        async () => {
          if (!this.oauth1Credentials) {
            return { status: 'fail', message: '認証情報が設定されていません' };
          }

          const authHeader = generateOAuth1Header(this.oauth1Credentials, {
            method: 'GET',
            url: endpoint
          });

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          try {
            const response = await fetch(endpoint, {
              method: 'HEAD',
              headers: { 'Authorization': authHeader },
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            return { 
              status: response.ok ? 'pass' : 'warning', 
              message: `HTTP ${response.status}`,
              details: {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
              }
            };
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        }
      ));
    }

    return results;
  }

  private async checkOAuthSignature(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    results.push(await this.runDiagnostic(
      'OAuth',
      'Nonce生成テスト',
      async () => {
        const nonce1 = generateNonce();
        const nonce2 = generateNonce();
        
        if (nonce1 === nonce2) {
          return { status: 'warning', message: '同じnonceが生成されました' };
        }
        if (nonce1.length !== 32) {
          return { status: 'fail', message: `nonceの長さが不正です (expected: 32, actual: ${nonce1.length})` };
        }
        
        return { 
          status: 'pass', 
          message: '正常に生成されています',
          details: { nonce1, nonce2 }
        };
      }
    ));

    results.push(await this.runDiagnostic(
      'OAuth',
      'Timestamp生成テスト',
      async () => {
        const timestamp1 = generateTimestamp();
        await new Promise(resolve => setTimeout(resolve, 100));
        const timestamp2 = generateTimestamp();
        
        if (timestamp1 >= timestamp2) {
          return { status: 'warning', message: 'タイムスタンプが単調増加していません' };
        }
        
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(timestamp2 - now) > 10) {
          return { status: 'warning', message: 'システム時刻との差が大きすぎます' };
        }
        
        return { 
          status: 'pass', 
          message: '正常に生成されています',
          details: { timestamp1, timestamp2, systemTime: now }
        };
      }
    ));

    if (this.oauth1Credentials) {
      results.push(await this.runDiagnostic(
        'OAuth',
        'OAuth署名生成テスト',
        async () => {
          const testUrl = 'https://api.twitter.com/2/users/me';
          const authHeader = generateOAuth1Header(this.oauth1Credentials!, {
            method: 'GET',
            url: testUrl
          });

          if (!authHeader || !authHeader.startsWith('OAuth ')) {
            return { status: 'fail', message: '署名の生成に失敗しました' };
          }

          const requiredFields = [
            'oauth_consumer_key',
            'oauth_token', 
            'oauth_signature_method',
            'oauth_timestamp',
            'oauth_nonce',
            'oauth_version',
            'oauth_signature'
          ];

          const missingFields = requiredFields.filter(field => !authHeader.includes(field));
          
          if (missingFields.length > 0) {
            return { 
              status: 'fail', 
              message: `必要なOAuthパラメータが不足しています: ${missingFields.join(', ')}` 
            };
          }

          return { 
            status: 'pass', 
            message: '署名の生成が正常です',
            details: { authHeader: authHeader.substring(0, 100) + '...' }
          };
        }
      ));
    }

    return results;
  }

  private async checkAPIAccess(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    if (!this.oauth1Credentials) {
      results.push(await this.runDiagnostic(
        'API',
        'アカウント情報取得テスト',
        async () => {
          return { status: 'fail', message: '認証情報が設定されていません' };
        }
      ));
      return results;
    }

    results.push(await this.runDiagnostic(
      'API',
      'アカウント情報取得テスト',
      async () => {
        const accountInfo = await this.client.getMyAccountInfo();
        
        return { 
          status: 'pass', 
          message: `アカウント情報の取得に成功しました (@${accountInfo.username})`,
          details: {
            username: accountInfo.username,
            followers_count: accountInfo.followers_count,
            following_count: accountInfo.following_count
          }
        };
      }
    ));

    results.push(await this.runDiagnostic(
      'API',
      'レート制限情報確認',
      async () => {
        const url = 'https://api.twitter.com/2/users/me';
        const authHeader = generateOAuth1Header(this.oauth1Credentials!, {
          method: 'GET',
          url: url
        });

        const response = await fetch(url, {
          headers: { 'Authorization': authHeader }
        });

        const rateLimitRemaining = response.headers.get('x-rate-limit-remaining');
        const rateLimitReset = response.headers.get('x-rate-limit-reset');
        const rateLimitLimit = response.headers.get('x-rate-limit-limit');

        if (!rateLimitRemaining) {
          return { status: 'warning', message: 'レート制限情報が取得できませんでした' };
        }

        const remaining = parseInt(rateLimitRemaining);
        if (remaining < 10) {
          return { 
            status: 'warning', 
            message: `レート制限の残り回数が少なくなっています (${remaining}/${rateLimitLimit})` 
          };
        }

        return { 
          status: 'pass', 
          message: `レート制限は正常です (${remaining}/${rateLimitLimit})`,
          details: {
            limit: rateLimitLimit,
            remaining: rateLimitRemaining,
            reset: rateLimitReset
          }
        };
      }
    ));

    return results;
  }

  private generateTroubleshooting(): { issues_found: string[]; recommendations: string[] } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const failedResults = this.results.filter(r => r.status === 'fail');
    const warningResults = this.results.filter(r => r.status === 'warning');

    // 認証情報に関する問題
    if (failedResults.some(r => r.category === 'Credentials')) {
      issues.push('OAuth 1.0a認証情報に問題があります');
      recommendations.push('oauth1-setup-helper.tsを使用して認証情報を再設定してください');
      recommendations.push('X Developer Portal で認証情報が正しく生成されているか確認してください');
    }

    // 接続に関する問題
    if (failedResults.some(r => r.category === 'Connectivity')) {
      issues.push('ネットワーク接続に問題があります');
      recommendations.push('インターネット接続を確認してください');
      recommendations.push('ファイアウォールやプロキシの設定を確認してください');
    }

    // OAuth署名に関する問題
    if (failedResults.some(r => r.category === 'OAuth')) {
      issues.push('OAuth署名の生成に問題があります');
      recommendations.push('システム時刻が正確に設定されているか確認してください');
      recommendations.push('認証情報に不正な文字が含まれていないか確認してください');
    }

    // API アクセスに関する問題
    if (failedResults.some(r => r.category === 'API')) {
      issues.push('X API へのアクセスに問題があります');
      recommendations.push('アプリの権限設定を確認してください (Read and Write が必要)');
      recommendations.push('アプリが有効化されているか確認してください');
    }

    // 警告に関する推奨事項
    if (warningResults.length > 0) {
      recommendations.push('警告項目を確認し、可能であれば修正してください');
    }

    // レート制限警告
    if (warningResults.some(r => r.message.includes('レート制限'))) {
      recommendations.push('レート制限に近づいています。リクエスト頻度を調整してください');
    }

    return { issues_found: issues, recommendations };
  }

  private generateReport(): DiagnosticReport {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    let overall_status: 'healthy' | 'issues_detected' | 'critical_failure';
    if (failed === 0 && warnings === 0) {
      overall_status = 'healthy';
    } else if (failed === 0) {
      overall_status = 'issues_detected';
    } else {
      overall_status = 'critical_failure';
    }

    const troubleshooting = this.generateTroubleshooting();

    return {
      summary: {
        timestamp: Date.now(),
        total_tests: this.results.length,
        passed,
        failed,
        warnings,
        overall_status
      },
      environment: {
        node_version: process.version,
        platform: process.platform,
        test_mode: process.env.X_TEST_MODE === 'true'
      },
      credentials: {
        consumer_key_configured: !!process.env.X_CONSUMER_KEY,
        consumer_secret_configured: !!process.env.X_CONSUMER_SECRET,
        access_token_configured: !!process.env.X_ACCESS_TOKEN,
        access_token_secret_configured: !!process.env.X_ACCESS_TOKEN_SECRET,
        format_validation: this.results.filter(r => r.category === 'Credentials')
      },
      connectivity: {
        internet_connection: this.results.filter(r => r.category === 'Connectivity' && r.test.includes('インターネット')),
        api_endpoints: this.results.filter(r => r.category === 'Connectivity' && !r.test.includes('インターネット'))
      },
      oauth_signature: {
        signature_generation: this.results.filter(r => r.category === 'OAuth' && r.test.includes('署名')),
        header_format: this.results.filter(r => r.category === 'OAuth' && !r.test.includes('署名'))
      },
      api_tests: {
        account_access: this.results.filter(r => r.category === 'API' && r.test.includes('アカウント')),
        rate_limits: this.results.filter(r => r.category === 'API' && r.test.includes('レート'))
      },
      troubleshooting
    };
  }

  private displaySummary(): void {
    console.log('\n📊 診断結果サマリー');
    console.log('==================');
    
    const report = this.generateReport();
    const { summary } = report;
    
    console.log(`✅ 成功: ${summary.passed}/${summary.total_tests}`);
    console.log(`❌ 失敗: ${summary.failed}/${summary.total_tests}`);
    console.log(`⚠️ 警告: ${summary.warnings}/${summary.total_tests}`);
    console.log(`📊 総合ステータス: ${this.getStatusIcon(summary.overall_status)} ${this.getStatusLabel(summary.overall_status)}`);

    if (report.troubleshooting.issues_found.length > 0) {
      console.log('\n🔴 発見された問題:');
      report.troubleshooting.issues_found.forEach(issue => {
        console.log(`  - ${issue}`);
      });
    }

    if (report.troubleshooting.recommendations.length > 0) {
      console.log('\n💡 推奨事項:');
      report.troubleshooting.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'healthy': return '🟢';
      case 'issues_detected': return '🟡';
      case 'critical_failure': return '🔴';
      default: return '⚪';
    }
  }

  private getStatusLabel(status: string): string {
    switch (status) {
      case 'healthy': return '正常';
      case 'issues_detected': return '軽微な問題あり';
      case 'critical_failure': return '重要な問題あり';
      default: return '不明';
    }
  }

  private async saveReport(): Promise<void> {
    const report = this.generateReport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `oauth1-diagnostics-${timestamp}.yaml`;
    const filepath = resolve(process.cwd(), 'tasks/outputs', filename);

    try {
      // tasks/outputsディレクトリが存在するか確認
      const outputDir = resolve(process.cwd(), 'tasks/outputs');
      if (!existsSync(outputDir)) {
        console.log('⚠️ tasks/outputs ディレクトリが存在しません。カレントディレクトリに保存します。');
        writeFileSync(filename, yaml.dump(report, { indent: 2 }));
        console.log(`📄 診断レポートを保存しました: ${filename}`);
      } else {
        writeFileSync(filepath, yaml.dump(report, { indent: 2 }));
        console.log(`📄 診断レポートを保存しました: ${filepath}`);
      }
    } catch (error) {
      console.error('診断レポートの保存に失敗しました:', error);
      // フォールバック: カレントディレクトリに保存
      writeFileSync(filename, yaml.dump(report, { indent: 2 }));
      console.log(`📄 診断レポートを保存しました: ${filename}`);
    }
  }

  async run(): Promise<void> {
    this.printHeader();

    console.log('🔍 診断を開始します...\n');

    // 各種診断の実行
    await this.checkCredentialConfiguration();
    await this.checkConnectivity();
    await this.checkOAuthSignature();
    await this.checkAPIAccess();

    this.displaySummary();
    await this.saveReport();

    console.log('\n診断が完了しました！');
  }

  private displayUsage(): void {
    console.log('\n使用方法:');
    console.log('pnpm tsx src/scripts/oauth1-diagnostics.ts [オプション]');
    console.log('');
    console.log('オプション:');
    console.log('  --verbose    詳細なデバッグ情報を表示');
    console.log('  --help       このヘルプを表示');
    console.log('');
    console.log('出力:');
    console.log('  診断結果はYAML形式でtasks/outputs/ディレクトリに保存されます');
    console.log('');
  }
}

// スクリプト実行時の処理
if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    const diagnostics = new OAuth1Diagnostics();
    (diagnostics as any).displayUsage();
    process.exit(0);
  }

  const diagnostics = new OAuth1Diagnostics();
  diagnostics.run().catch(error => {
    console.error('\n💥 診断実行中に予期しないエラーが発生しました:', error);
    process.exit(1);
  });
}

export { OAuth1Diagnostics };