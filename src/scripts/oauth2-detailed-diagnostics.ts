/**
 * OAuth 2.0 Detailed Diagnostics
 * X Developer Portal設定とトークンの詳細確認
 */

import { SimpleXClient } from '../lib/x-client.js';
import * as dotenv from 'dotenv';
import * as yaml from 'js-yaml';
import { readFileSync, existsSync } from 'fs';

// 環境変数読み込み
dotenv.config();

async function detailedDiagnostics() {
  console.log('🔍 OAuth 2.0 Detailed Diagnostics開始');
  console.log('=====================================');
  console.log('');

  try {
    // 1. 環境変数の確認
    console.log('📋 Step 1: 環境変数の確認');
    console.log(`   X_USE_OAUTH2: ${process.env.X_USE_OAUTH2}`);
    console.log(`   X_OAUTH2_CLIENT_ID: ${process.env.X_OAUTH2_CLIENT_ID ? '設定済み' : '未設定'}`);
    console.log(`   X_OAUTH2_CLIENT_SECRET: ${process.env.X_OAUTH2_CLIENT_SECRET ? '設定済み' : '未設定'}`);
    console.log(`   X_OAUTH2_REDIRECT_URI: ${process.env.X_OAUTH2_REDIRECT_URI}`);
    console.log(`   X_OAUTH2_SCOPES: ${process.env.X_OAUTH2_SCOPES}`);
    console.log(`   X_TEST_MODE: ${process.env.X_TEST_MODE}`);
    console.log('');

    // 2. トークンファイルの詳細確認
    console.log('📁 Step 2: OAuth 2.0トークンファイルの詳細確認');
    const tokenFile = 'data/oauth2-tokens.yaml';
    
    if (!existsSync(tokenFile)) {
      console.log('   ❌ トークンファイルが存在しません');
      return;
    }

    const tokenContent = readFileSync(tokenFile, 'utf8');
    const tokens = yaml.load(tokenContent) as any;
    
    console.log(`   access_token: ${tokens.access_token ? tokens.access_token.substring(0, 30) + '...' : '未設定'}`);
    console.log(`   refresh_token: ${tokens.refresh_token ? tokens.refresh_token.substring(0, 30) + '...' : '未設定'}`);
    console.log(`   token_type: ${tokens.token_type}`);
    console.log(`   scope: ${tokens.scope}`);
    
    // トークンの有効期限確認
    const expiresAt = new Date(tokens.expires_at);
    const now = new Date();
    const isExpired = expiresAt < now;
    console.log(`   expires_at: ${expiresAt.toISOString()}`);
    console.log(`   有効期限: ${isExpired ? '❌ 期限切れ' : '✅ 有効'} (残り: ${Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))}時間)`);
    console.log('');

    // 3. スコープの詳細確認
    console.log('🔑 Step 3: スコープの詳細確認');
    const scopes = tokens.scope ? tokens.scope.split(' ') : [];
    const requiredScopes = ['tweet.write', 'users.read', 'offline.access'];
    
    console.log('   取得済みスコープ:');
    scopes.forEach(scope => {
      console.log(`     - ${scope}`);
    });
    
    console.log('   必要スコープの確認:');
    requiredScopes.forEach(required => {
      const hasScope = scopes.includes(required);
      console.log(`     ${hasScope ? '✅' : '❌'} ${required}`);
    });
    console.log('');

    // 4. Client情報による権限テスト
    console.log('🧪 Step 4: Client情報による権限テスト');
    
    // Client IDのBase64デコードを試行（情報が埋め込まれている場合）
    try {
      const clientId = process.env.X_OAUTH2_CLIENT_ID;
      if (clientId) {
        console.log(`   Client ID形式: ${clientId.length}文字`);
        console.log(`   Client ID先頭: ${clientId.substring(0, 20)}...`);
      }
    } catch (error) {
      console.log('   Client ID解析不可');
    }
    console.log('');

    // 5. 異なるAPIエンドポイントでのテスト
    console.log('🌐 Step 5: 複数APIエンドポイントでのテスト');
    
    const xClient = new SimpleXClient();
    const accessToken = await xClient.getValidAccessToken();
    const authHeader = `Bearer ${accessToken}`;

    // テスト1: ユーザー情報取得（users/me）
    console.log('   Test 1: /users/me');
    try {
      const response1 = await fetch('https://api.twitter.com/2/users/me', {
        headers: { 'Authorization': authHeader }
      });
      console.log(`     Status: ${response1.status} ${response1.statusText}`);
      if (response1.ok) {
        const data = await response1.json();
        console.log(`     User: @${data.data.username}`);
      } else {
        const error = await response1.json().catch(() => ({}));
        console.log(`     Error: ${JSON.stringify(error)}`);
      }
    } catch (error) {
      console.log(`     Exception: ${error instanceof Error ? error.message : error}`);
    }

    // テスト2: ツイート読み取り（tweets検索）  
    console.log('   Test 2: /tweets/search/recent');
    try {
      const response2 = await fetch('https://api.twitter.com/2/tweets/search/recent?query=hello&max_results=10', {
        headers: { 'Authorization': authHeader }
      });
      console.log(`     Status: ${response2.status} ${response2.statusText}`);
      if (!response2.ok) {
        const error = await response2.json().catch(() => ({}));
        console.log(`     Error: ${JSON.stringify(error)}`);
      } else {
        console.log(`     ✅ 読み取り権限あり`);
      }
    } catch (error) {
      console.log(`     Exception: ${error instanceof Error ? error.message : error}`);
    }

    // テスト3: 投稿エンドポイントへのテスト（DRY RUN）
    console.log('   Test 3: /tweets (POST) - Dry Run');
    try {
      const response3 = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: '🧪 OAuth 2.0 Diagnostics Test - この投稿は実際には送信されません'
        })
      });
      console.log(`     Status: ${response3.status} ${response3.statusText}`);
      
      if (response3.ok) {
        console.log(`     ✅ 投稿権限あり - しかし実際には投稿しません`);
      } else {
        const error = await response3.json().catch(() => ({}));
        console.log(`     Error: ${JSON.stringify(error, null, 2)}`);
        
        // エラーの詳細分析
        if (response3.status === 403) {
          console.log('');
          console.log('   📊 403エラーの詳細分析:');
          console.log('     - App-only認証でUser Context操作を試行している');
          console.log('     - アプリにtweet.writeスコープが設定されていない');
          console.log('     - アプリのType設定が正しくない（Web Appではない）');
          console.log('     - Developer Portal側でRead-onlyに設定されている');
        }
      }
    } catch (error) {
      console.log(`     Exception: ${error instanceof Error ? error.message : error}`);
    }
    
    console.log('');
    
    // 6. 推奨されるトラブルシューティング手順
    console.log('🔧 Step 6: 推奨トラブルシューティング手順');
    console.log('   1. X Developer Portal設定確認:');
    console.log('      - App Type: "Web App" に設定');
    console.log('      - App permissions: "Read and write" に設定');
    console.log('      - User authentication: OAuth 2.0有効');
    console.log('      - Scopes: tweet.write, users.read, offline.access設定');
    console.log('');
    console.log('   2. OAuth 2.0再認証実行:');
    console.log('      npx tsx src/scripts/oauth2-complete-auth.ts');
    console.log('');
    console.log('   3. アプリ設定URL:');
    console.log('      https://developer.x.com/en/portal/projects-and-apps');
    
  } catch (error) {
    console.error('❌ Diagnostics エラー:', error instanceof Error ? error.message : error);
  }

  console.log('');
  console.log('🎉 OAuth 2.0 Detailed Diagnostics完了');
}

// スクリプト実行
if (process.argv[1] === import.meta.url.replace('file://', '')) {
  detailedDiagnostics().catch((error) => {
    console.error('予期しないエラー:', error);
    process.exit(1);
  });
}

export { detailedDiagnostics };