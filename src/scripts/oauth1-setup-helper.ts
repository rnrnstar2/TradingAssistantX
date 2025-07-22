#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createInterface, Interface } from 'readline';

interface OAuth1Config {
  X_CONSUMER_KEY: string;
  X_CONSUMER_SECRET: string;
  X_ACCESS_TOKEN: string;
  X_ACCESS_TOKEN_SECRET: string;
}

class OAuth1SetupHelper {
  private rl: Interface;
  private envFile = resolve(process.cwd(), '.env');
  
  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  private async question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  private printHeader(): void {
    console.log('\n🔧 OAuth 1.0a セットアップヘルパー');
    console.log('=====================================\n');
    console.log('このツールは、X API (Twitter API) v2のOAuth 1.0a認証情報の設定を支援します。');
    console.log('');
  }

  private checkExistingCredentials(): Partial<OAuth1Config> {
    const config: Partial<OAuth1Config> = {};
    
    config.X_CONSUMER_KEY = process.env.X_CONSUMER_KEY;
    config.X_CONSUMER_SECRET = process.env.X_CONSUMER_SECRET;
    config.X_ACCESS_TOKEN = process.env.X_ACCESS_TOKEN;
    config.X_ACCESS_TOKEN_SECRET = process.env.X_ACCESS_TOKEN_SECRET;

    return config;
  }

  private displayCredentialStatus(config: Partial<OAuth1Config>): boolean {
    console.log('📋 現在の認証情報ステータス:');
    console.log('--------------------------------');
    
    let allConfigured = true;

    const requiredKeys: (keyof OAuth1Config)[] = [
      'X_CONSUMER_KEY',
      'X_CONSUMER_SECRET', 
      'X_ACCESS_TOKEN',
      'X_ACCESS_TOKEN_SECRET'
    ];

    requiredKeys.forEach(key => {
      const value = config[key];
      const status = value ? '✅ 設定済み' : '❌ 未設定';
      const display = value ? `${value.substring(0, 10)}...` : '(未設定)';
      
      console.log(`  ${key}: ${status} ${display}`);
      
      if (!value) {
        allConfigured = false;
      }
    });

    console.log('');
    return allConfigured;
  }

  private displaySetupGuide(): void {
    console.log('📚 OAuth 1.0a認証情報の取得方法:');
    console.log('----------------------------------');
    console.log('1. X Developer Portal (https://developer.twitter.com/) にアクセス');
    console.log('2. プロジェクトとアプリを作成');
    console.log('3. アプリの設定で "Consumer Keys" を取得');
    console.log('   - API Key (Consumer Key)');
    console.log('   - API Key Secret (Consumer Secret)');
    console.log('4. "Authentication Tokens" セクションで "Access Token and Secret" を生成');
    console.log('   - Access Token');
    console.log('   - Access Token Secret');
    console.log('5. アプリの権限を "Read and Write" に設定');
    console.log('');
  }

  private async collectCredentials(): Promise<OAuth1Config> {
    console.log('🔐 認証情報を入力してください:');
    console.log('---------------------------');
    
    const config: OAuth1Config = {
      X_CONSUMER_KEY: '',
      X_CONSUMER_SECRET: '',
      X_ACCESS_TOKEN: '',
      X_ACCESS_TOKEN_SECRET: ''
    };

    console.log('(各値を入力してEnterを押してください。空の場合は現在の値が保持されます)');
    console.log('');

    const existingConfig = this.checkExistingCredentials();

    config.X_CONSUMER_KEY = await this.question(
      `Consumer Key (API Key) [現在: ${existingConfig.X_CONSUMER_KEY ? existingConfig.X_CONSUMER_KEY.substring(0, 10) + '...' : '未設定'}]: `
    ) || existingConfig.X_CONSUMER_KEY || '';

    config.X_CONSUMER_SECRET = await this.question(
      `Consumer Secret (API Key Secret) [現在: ${existingConfig.X_CONSUMER_SECRET ? existingConfig.X_CONSUMER_SECRET.substring(0, 10) + '...' : '未設定'}]: `
    ) || existingConfig.X_CONSUMER_SECRET || '';

    config.X_ACCESS_TOKEN = await this.question(
      `Access Token [現在: ${existingConfig.X_ACCESS_TOKEN ? existingConfig.X_ACCESS_TOKEN.substring(0, 10) + '...' : '未設定'}]: `
    ) || existingConfig.X_ACCESS_TOKEN || '';

    config.X_ACCESS_TOKEN_SECRET = await this.question(
      `Access Token Secret [現在: ${existingConfig.X_ACCESS_TOKEN_SECRET ? existingConfig.X_ACCESS_TOKEN_SECRET.substring(0, 10) + '...' : '未設定'}]: `
    ) || existingConfig.X_ACCESS_TOKEN_SECRET || '';

    return config;
  }

  private validateConfig(config: OAuth1Config): string[] {
    const errors: string[] = [];

    if (!config.X_CONSUMER_KEY || config.X_CONSUMER_KEY.trim() === '') {
      errors.push('Consumer Key (X_CONSUMER_KEY) が設定されていません');
    }

    if (!config.X_CONSUMER_SECRET || config.X_CONSUMER_SECRET.trim() === '') {
      errors.push('Consumer Secret (X_CONSUMER_SECRET) が設定されていません');
    }

    if (!config.X_ACCESS_TOKEN || config.X_ACCESS_TOKEN.trim() === '') {
      errors.push('Access Token (X_ACCESS_TOKEN) が設定されていません');
    }

    if (!config.X_ACCESS_TOKEN_SECRET || config.X_ACCESS_TOKEN_SECRET.trim() === '') {
      errors.push('Access Token Secret (X_ACCESS_TOKEN_SECRET) が設定されていません');
    }

    // 基本的な形式チェック
    if (config.X_CONSUMER_KEY && config.X_CONSUMER_KEY.length < 10) {
      errors.push('Consumer Key が短すぎます (10文字以上である必要があります)');
    }

    if (config.X_CONSUMER_SECRET && config.X_CONSUMER_SECRET.length < 20) {
      errors.push('Consumer Secret が短すぎます (20文字以上である必要があります)');
    }

    if (config.X_ACCESS_TOKEN && !config.X_ACCESS_TOKEN.includes('-')) {
      errors.push('Access Token の形式が正しくありません (通常は "-" が含まれます)');
    }

    if (config.X_ACCESS_TOKEN_SECRET && config.X_ACCESS_TOKEN_SECRET.length < 20) {
      errors.push('Access Token Secret が短すぎます (20文字以上である必要があります)');
    }

    return errors;
  }

  private generateEnvContent(config: OAuth1Config): string {
    const envContent = [
      '# OAuth 1.0a認証情報 (X API v2)',
      '# https://developer.twitter.com/ で取得',
      '',
      `X_CONSUMER_KEY=${config.X_CONSUMER_KEY}`,
      `X_CONSUMER_SECRET=${config.X_CONSUMER_SECRET}`,
      `X_ACCESS_TOKEN=${config.X_ACCESS_TOKEN}`,
      `X_ACCESS_TOKEN_SECRET=${config.X_ACCESS_TOKEN_SECRET}`,
      '',
      '# テストモード (true: テスト投稿のみ, false: 実際に投稿)',
      'X_TEST_MODE=true',
      ''
    ].join('\n');

    return envContent;
  }

  private async saveEnvFile(config: OAuth1Config): Promise<void> {
    let existingContent = '';
    
    if (existsSync(this.envFile)) {
      existingContent = readFileSync(this.envFile, 'utf8');
    }

    // 既存の環境変数を保持しつつ、OAuth関連のみ更新
    const lines = existingContent.split('\n');
    const oauthKeys = ['X_CONSUMER_KEY', 'X_CONSUMER_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'];
    
    // OAuth関連の行を削除
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      return !oauthKeys.some(key => trimmed.startsWith(`${key}=`));
    });

    // 新しいOAuth設定を追加
    const newEnvContent = this.generateEnvContent(config);
    const finalContent = [...filteredLines, '', ...newEnvContent.split('\n')].join('\n');

    writeFileSync(this.envFile, finalContent);
    console.log(`✅ .envファイルに認証情報を保存しました: ${this.envFile}`);
  }

  private displayNextSteps(): void {
    console.log('\n🎉 セットアップが完了しました!');
    console.log('==========================');
    console.log('');
    console.log('次のステップ:');
    console.log('1. 認証をテスト:');
    console.log('   pnpm tsx src/scripts/oauth1-test-connection.ts');
    console.log('');
    console.log('2. 詳細診断:');
    console.log('   pnpm tsx src/scripts/oauth1-diagnostics.ts');
    console.log('');
    console.log('3. 本番モードに切り替え:');
    console.log('   .envファイルで X_TEST_MODE=false に設定');
    console.log('');
  }

  async run(): Promise<void> {
    try {
      this.printHeader();

      const existingConfig = this.checkExistingCredentials();
      const allConfigured = this.displayCredentialStatus(existingConfig);

      if (allConfigured) {
        const continueSetup = await this.question('すべての認証情報が設定済みです。再設定しますか？ (y/N): ');
        if (continueSetup.toLowerCase() !== 'y' && continueSetup.toLowerCase() !== 'yes') {
          console.log('セットアップをキャンセルしました。');
          this.rl.close();
          return;
        }
      }

      this.displaySetupGuide();

      const config = await this.collectCredentials();
      const validationErrors = this.validateConfig(config);

      if (validationErrors.length > 0) {
        console.log('\n❌ 設定にエラーがあります:');
        validationErrors.forEach(error => {
          console.log(`   - ${error}`);
        });
        console.log('\n設定を見直してから再実行してください。');
        this.rl.close();
        return;
      }

      const shouldSave = await this.question('\n設定を.envファイルに保存しますか？ (Y/n): ');
      if (shouldSave.toLowerCase() !== 'n' && shouldSave.toLowerCase() !== 'no') {
        await this.saveEnvFile(config);
        this.displayNextSteps();
      } else {
        console.log('設定は保存されませんでした。手動で.envファイルを作成してください。');
        console.log('\n📄 .envファイルの例:');
        console.log('-------------------');
        console.log(this.generateEnvContent(config));
      }

    } catch (error) {
      console.error('\n❌ セットアップ中にエラーが発生しました:', error);
    } finally {
      this.rl.close();
    }
  }
}

// スクリプト実行時の処理
if (require.main === module) {
  const helper = new OAuth1SetupHelper();
  helper.run().catch(console.error);
}

export { OAuth1SetupHelper };