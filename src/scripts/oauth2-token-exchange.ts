/**
 * OAuth 2.0 Token Exchange Script
 * Authorization CodeからAccess Tokenを取得
 */

import { SimpleXClient } from '../lib/x-client.js';
import * as dotenv from 'dotenv';

// 環境変数読み込み
dotenv.config();

async function exchangeTokens() {
  console.log('🔄 OAuth 2.0 Token Exchange開始...');
  
  // 受信したAuthorization Code（前回のコールバックサーバーで取得）
  const authorizationCode = 'NG5WLWdsSXlyOEpRN2RVSkF0S3laWUxjSDl3ekhUX1REYlBCY3FjaWpVRUZMS0NKUWZOeGNLSTFhaVJGQUk6MTc1MzE1Njk0NDMwNTpyOjE';
  const codeVerifier = 'LYv0lhd2A9Nb36n5-kcepvhD4IM65FQPjqhFVxJGd5JJcFaVhsWJagBVDqfzJJGd'; // 前回生成された値
  
  try {
    // SimpleXClient初期化
    const xClient = new SimpleXClient();
    
    console.log('📋 Token Exchange実行中...');
    console.log(`   Authorization Code: ${authorizationCode.substring(0, 20)}...`);
    console.log(`   Code Verifier: ${codeVerifier.substring(0, 20)}...`);
    
    // Access Token取得
    const tokens = await xClient.exchangeCodeForTokens(authorizationCode, codeVerifier);
    
    console.log('');
    console.log('✅ OAuth 2.0 Token Exchange成功！');
    console.log('📁 取得したトークン情報:');
    console.log(`   Access Token: ${tokens.access_token.substring(0, 30)}...`);
    console.log(`   Refresh Token: ${tokens.refresh_token?.substring(0, 30) || 'なし'}...`);
    console.log(`   有効期限: ${new Date(tokens.expires_at).toLocaleString('ja-JP')}`);
    console.log(`   スコープ: ${tokens.scope}`);
    console.log('');
    console.log('💾 トークンはdata/oauth2-tokens.yamlに保存されました');
    console.log('');
    
    // 環境変数設定の提案
    console.log('🔧 推奨環境変数設定:');
    console.log(`export X_OAUTH2_ACCESS_TOKEN="${tokens.access_token}"`);
    if (tokens.refresh_token) {
      console.log(`export X_OAUTH2_REFRESH_TOKEN="${tokens.refresh_token}"`);
    }
    console.log('');
    
    // 投稿テスト提案
    console.log('🚀 次のステップ:');
    console.log('1. テストモードで動作確認: X_TEST_MODE=true pnpm dev');
    console.log('2. 実際の投稿テスト: X_TEST_MODE=false pnpm dev');
    
    return tokens;
    
  } catch (error) {
    console.error('');
    console.error('❌ Token Exchange失敗:', error instanceof Error ? error.message : error);
    console.error('');
    console.error('💡 解決方法:');
    console.error('1. Authorization Codeが正しいか確認');
    console.error('2. Code Verifierが認証時のものと一致するか確認');
    console.error('3. X Developer Portalのアプリ設定を確認');
    console.error('4. Authorization Codeの有効期限（通常10分）を確認');
    
    throw error;
  }
}

// スクリプト実行
if (process.argv[1] === import.meta.url.replace('file://', '')) {
  exchangeTokens().catch((error) => {
    console.error('予期しないエラー:', error);
    process.exit(1);
  });
}

export { exchangeTokens };