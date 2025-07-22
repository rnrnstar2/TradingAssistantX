/**
 * Simple API Connection Test
 * 新しいOAuth 2.0トークンでのAPI接続テスト
 */

import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

// 環境変数読み込み
dotenv.config();

async function simpleApiTest() {
  console.log('🧪 Simple API Connection Test');
  console.log('==============================');
  console.log('');

  try {
    // 環境変数からトークンを取得
    const accessToken = process.env.X_OAUTH2_ACCESS_TOKEN;
    
    if (!accessToken) {
      console.error('❌ X_OAUTH2_ACCESS_TOKEN not found in environment variables');
      return;
    }

    console.log(`🔑 Access Token: ${accessToken.substring(0, 30)}...`);
    console.log(`📏 Token Length: ${accessToken.length}`);
    console.log('');

    // Test 1: ユーザー情報取得（基本的な認証テスト）
    console.log('📋 Test 1: /users/me');
    try {
      const response1 = await fetch('https://api.twitter.com/2/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      console.log(`   Status: ${response1.status} ${response1.statusText}`);
      
      if (response1.ok) {
        const userData = await response1.json();
        console.log('   ✅ 認証成功');
        console.log(`   User: @${(userData as any).data.username}`);
        console.log(`   Name: ${(userData as any).data.name}`);
      } else {
        const errorData = await response1.json().catch(() => ({}));
        console.log('   ❌ 認証失敗');
        console.log(`   Error: ${JSON.stringify(errorData, null, 2)}`);
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error instanceof Error ? error.message : error}`);
    }

    console.log('');

    // Test 2: 投稿権限テスト（実際には投稿しない）
    console.log('📝 Test 2: /tweets (POST) - Permission Check');
    try {
      const response2 = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: '🧪 OAuth 2.0 Permission Test - This is a test message'
        })
      });

      console.log(`   Status: ${response2.status} ${response2.statusText}`);
      
      if (response2.ok) {
        console.log('   ✅ 投稿権限あり（実際のテスト投稿が実行されます）');
        const result = await response2.json();
        console.log(`   Tweet ID: ${(result as any).data?.id}`);
        
        // テスト投稿の削除（もし成功した場合）
        console.log('   🗑️ テスト投稿を削除中...');
        const deleteResponse = await fetch(`https://api.twitter.com/2/tweets/${(result as any).data.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          }
        });
        console.log(`   削除結果: ${deleteResponse.status} ${deleteResponse.statusText}`);
        
      } else {
        const errorData = await response2.json().catch(() => ({}));
        console.log('   ❌ 投稿権限なし');
        console.log(`   Error: ${JSON.stringify(errorData, null, 2)}`);
        
        // 403エラーの詳細分析
        if (response2.status === 403) {
          console.log('');
          console.log('   🔍 403エラー分析:');
          if ((errorData as any).title === 'Forbidden') {
            console.log('   - X Developer Portal設定の問題');
            console.log('   - アプリがRead-onlyモードに設定されている可能性');
            console.log('   - tweet.writeスコープが有効化されていない可能性');
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error instanceof Error ? error.message : error}`);
    }

    console.log('');
    console.log('🔧 トラブルシューティング:');
    console.log('   1. X Developer Portal -> App Settings');
    console.log('   2. User authentication settings');
    console.log('   3. App permissions: "Read and write"');
    console.log('   4. Save changes and regenerate tokens');
    
  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
  }
}

// スクリプト実行
if (process.argv[1] === import.meta.url.replace('file://', '')) {
  simpleApiTest().catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

export { simpleApiTest };