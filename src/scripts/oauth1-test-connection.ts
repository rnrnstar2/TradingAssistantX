#!/usr/bin/env node

import { SimpleXClient } from '../lib/x-client';
import { OAuth1Credentials, generateOAuth1Header } from '../lib/oauth1-client';
import fetch from 'node-fetch';

interface TestResult {
  test: string;
  success: boolean;
  error?: string;
  data?: any;
  duration?: number;
}

class OAuth1TestConnection {
  private client: SimpleXClient;
  private oauth1Credentials?: OAuth1Credentials;
  private dryRun: boolean;
  private verbose: boolean;

  constructor() {
    this.client = SimpleXClient.getInstance();
    this.dryRun = process.argv.includes('--dry-run');
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
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
    console.log('\n🧪 OAuth 1.0a 接続テストツール');
    console.log('===============================\n');
    
    if (this.dryRun) {
      console.log('🔥 DRY RUNモード: 実際の投稿は行いません');
    } else {
      console.log('⚡ LIVE モード: 実際にX APIを呼び出します');
    }
    
    if (this.verbose) {
      console.log('📝 VERBOSEモード: 詳細なデバッグ情報を表示します');
    }
    
    console.log('');
  }

  private async runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    const start = Date.now();
    console.log(`🔍 ${testName}を実行中...`);

    try {
      const data = await testFn();
      const duration = Date.now() - start;
      
      console.log(`✅ ${testName}: 成功 (${duration}ms)`);
      if (this.verbose && data) {
        console.log('   レスポンス:', JSON.stringify(data, null, 2));
      }
      
      return { 
        test: testName, 
        success: true, 
        data,
        duration 
      };
    } catch (error) {
      const duration = Date.now() - start;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.log(`❌ ${testName}: 失敗 (${duration}ms)`);
      console.log(`   エラー: ${errorMessage}`);
      
      if (this.verbose && error instanceof Error) {
        console.log('   スタックトレース:', error.stack);
      }
      
      return { 
        test: testName, 
        success: false, 
        error: errorMessage,
        duration 
      };
    }
  }

  private async testCredentialsLoad(): Promise<boolean> {
    if (!this.oauth1Credentials) {
      throw new Error('OAuth 1.0a認証情報が設定されていません。以下の環境変数を確認してください:\n' +
        '- X_CONSUMER_KEY\n' +
        '- X_CONSUMER_SECRET\n' +
        '- X_ACCESS_TOKEN\n' +
        '- X_ACCESS_TOKEN_SECRET');
    }

    console.log('   Consumer Key:', this.oauth1Credentials.consumerKey.substring(0, 10) + '...');
    console.log('   Consumer Secret:', this.oauth1Credentials.consumerSecret.substring(0, 10) + '...');
    console.log('   Access Token:', this.oauth1Credentials.accessToken.substring(0, 10) + '...');
    console.log('   Access Token Secret:', this.oauth1Credentials.accessTokenSecret.substring(0, 10) + '...');
    
    return true;
  }

  private async testSignatureGeneration(): Promise<any> {
    if (!this.oauth1Credentials) {
      throw new Error('OAuth 1.0a認証情報が設定されていません');
    }

    const testUrl = 'https://api.twitter.com/2/users/me';
    const authHeader = generateOAuth1Header(this.oauth1Credentials, {
      method: 'GET',
      url: testUrl
    });

    if (!authHeader || !authHeader.startsWith('OAuth ')) {
      throw new Error('OAuth署名の生成に失敗しました');
    }

    console.log('   認証ヘッダー:', authHeader.substring(0, 50) + '...');
    
    return { authHeader };
  }

  private async testAccountInfo(): Promise<any> {
    if (!this.oauth1Credentials) {
      throw new Error('OAuth 1.0a認証情報が設定されていません');
    }

    const accountInfo = await this.client.getMyAccountInfo();
    
    console.log('   ユーザー名:', accountInfo.username);
    console.log('   表示名:', accountInfo.display_name);
    console.log('   フォロワー数:', accountInfo.followers_count?.toLocaleString() || 'N/A');
    console.log('   フォロー数:', accountInfo.following_count?.toLocaleString() || 'N/A');
    console.log('   ツイート数:', accountInfo.tweet_count?.toLocaleString() || 'N/A');
    
    return accountInfo;
  }

  private async testDetailedAccountInfo(): Promise<any> {
    if (!this.oauth1Credentials) {
      throw new Error('OAuth 1.0a認証情報が設定されていません');
    }

    const details = await this.client.getMyAccountDetails();
    
    const userData = details.data as any;
    console.log('   ユーザーID:', userData.id);
    console.log('   アカウント作成日:', userData.created_at || '(不明)');
    console.log('   認証済み:', userData.verified ? '✅' : '❌');
    console.log('   説明:', userData.description || '(なし)');
    console.log('   場所:', userData.location || '(なし)');
    
    return details;
  }

  private async testTweetPost(): Promise<any> {
    const testTweet = `OAuth 1.0a接続テスト - ${new Date().toLocaleString('ja-JP')} 🧪`;
    
    if (this.dryRun) {
      console.log('   [DRY RUN] テスト投稿内容:', testTweet);
      console.log('   [DRY RUN] 実際の投稿は行いません');
      return { text: testTweet, dryRun: true };
    }

    const result = await this.client.post(testTweet);
    
    if (result.success) {
      console.log('   投稿ID:', result.id);
      console.log('   投稿内容:', testTweet);
    }
    
    return result;
  }

  private async testRecentTweets(): Promise<any> {
    if (!this.oauth1Credentials) {
      throw new Error('OAuth 1.0a認証情報が設定されていません');
    }

    const tweets = await this.client.getMyRecentTweets(5);
    
    console.log(`   取得したツイート数: ${tweets.length}`);
    
    if (tweets.length > 0 && this.verbose) {
      tweets.forEach((tweet, index) => {
        console.log(`   [${index + 1}] ${tweet.text.substring(0, 50)}...`);
        console.log(`       いいね: ${tweet.public_metrics?.like_count || 0}, RT: ${tweet.public_metrics?.retweet_count || 0}`);
      });
    }
    
    return { tweetsCount: tweets.length, tweets: this.verbose ? tweets : undefined };
  }

  private async testRateLimit(): Promise<any> {
    if (!this.oauth1Credentials) {
      throw new Error('OAuth 1.0a認証情報が設定されていません');
    }

    const url = 'https://api.twitter.com/2/users/me';
    const authHeader = generateOAuth1Header(this.oauth1Credentials, {
      method: 'GET',
      url: url
    });

    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      }
    });

    const rateLimitRemaining = response.headers.get('x-rate-limit-remaining');
    const rateLimitReset = response.headers.get('x-rate-limit-reset');
    const rateLimitLimit = response.headers.get('x-rate-limit-limit');

    console.log('   レート制限情報:');
    console.log(`     制限値: ${rateLimitLimit || 'N/A'}`);
    console.log(`     残り回数: ${rateLimitRemaining || 'N/A'}`);
    
    if (rateLimitReset) {
      const resetDate = new Date(parseInt(rateLimitReset) * 1000);
      console.log(`     リセット時刻: ${resetDate.toLocaleString('ja-JP')}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      rateLimitLimit,
      rateLimitRemaining,
      rateLimitReset,
      status: response.status
    };
  }

  private displaySummary(results: TestResult[]): void {
    console.log('\n📊 テスト結果サマリー');
    console.log('===================');
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);
    
    console.log(`✅ 成功: ${passed}/${results.length}`);
    console.log(`❌ 失敗: ${failed}/${results.length}`);
    console.log(`⏱️ 総実行時間: ${totalDuration}ms`);
    
    if (failed > 0) {
      console.log('\n失敗したテスト:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`  - ${result.test}: ${result.error}`);
      });
    }

    console.log('\n' + (failed === 0 ? '🎉 すべてのテストが成功しました!' : '⚠️ 一部のテストが失敗しました。'));
    
    if (passed > 0) {
      console.log('\n次のステップ:');
      console.log('- 本番環境では X_TEST_MODE=false に設定してください');
      console.log('- 詳細診断: pnpm tsx src/scripts/oauth1-diagnostics.ts');
    }
  }

  async run(): Promise<void> {
    this.printHeader();

    const tests: Array<{ name: string; fn: () => Promise<any> }> = [
      { name: '認証情報の読み込み確認', fn: () => this.testCredentialsLoad() },
      { name: 'OAuth署名生成テスト', fn: () => this.testSignatureGeneration() },
      { name: 'アカウント基本情報取得', fn: () => this.testAccountInfo() },
      { name: 'アカウント詳細情報取得', fn: () => this.testDetailedAccountInfo() },
      { name: 'レート制限確認', fn: () => this.testRateLimit() },
      { name: '最近のツイート取得', fn: () => this.testRecentTweets() },
      { name: 'テスト投稿', fn: () => this.testTweetPost() }
    ];

    const results: TestResult[] = [];

    for (const test of tests) {
      const result = await this.runTest(test.name, test.fn);
      results.push(result);
      
      // 失敗が続く場合は一旦停止
      if (!result.success && results.filter(r => !r.success).length >= 3) {
        console.log('\n⚠️ 連続してエラーが発生しています。残りのテストをスキップします。');
        break;
      }
      
      // テスト間の待機時間
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.displaySummary(results);
  }

  private displayUsage(): void {
    console.log('\n使用方法:');
    console.log('pnpm tsx src/scripts/oauth1-test-connection.ts [オプション]');
    console.log('');
    console.log('オプション:');
    console.log('  --dry-run    実際の投稿を行わずにテストを実行');
    console.log('  --verbose    詳細なデバッグ情報を表示');
    console.log('  --help       このヘルプを表示');
    console.log('');
  }
}

// スクリプト実行時の処理
if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    const tester = new OAuth1TestConnection();
    (tester as any).displayUsage();
    process.exit(0);
  }

  const tester = new OAuth1TestConnection();
  tester.run().catch(error => {
    console.error('\n💥 テスト実行中に予期しないエラーが発生しました:', error);
    process.exit(1);
  });
}

export { OAuth1TestConnection };