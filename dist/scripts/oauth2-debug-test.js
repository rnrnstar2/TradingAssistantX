/**
 * OAuth 2.0 Debug Test
 * 実際のトークンと認証ヘッダーをテスト
 */
import { SimpleXClient } from '../lib/x-client.js';
import * as dotenv from 'dotenv';
// 環境変数読み込み
dotenv.config();
async function debugOAuth2() {
    console.log('🔍 OAuth 2.0 Debug Test開始');
    console.log('================================');
    console.log('');
    try {
        // SimpleXClient初期化
        const xClient = new SimpleXClient();
        // 1. トークンファイルの確認
        console.log('📁 Step 1: トークンファイル確認');
        // 2. 有効なアクセストークン取得テスト
        console.log('🔑 Step 2: 有効なアクセストークン取得テスト');
        const accessToken = await xClient.getValidAccessToken();
        console.log(`   Access Token: ${accessToken.substring(0, 30)}...`);
        console.log(`   Token Length: ${accessToken.length}`);
        console.log('');
        // 3. 認証ヘッダー生成テスト
        console.log('📋 Step 3: 認証ヘッダー生成テスト');
        // private methodにアクセスするためにany型にキャスト
        const authHeader = await xClient.generateOAuth2Headers();
        console.log(`   Auth Header: ${authHeader.substring(0, 50)}...`);
        console.log('');
        // 4. 実際のAPIテスト（自分のアカウント情報取得）
        console.log('🧪 Step 4: API接続テスト（自分のアカウント情報取得）');
        const response = await fetch('https://api.twitter.com/2/users/me?user.fields=public_metrics', {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            }
        });
        console.log(`   Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
            const userData = await response.json();
            console.log('✅ API接続成功！');
            console.log(`   User: @${userData.data.username}`);
            console.log(`   Name: ${userData.data.name}`);
            console.log(`   Followers: ${userData.data.public_metrics.followers_count}`);
        }
        else {
            const errorData = await response.json().catch(() => ({}));
            console.log('❌ API接続失敗');
            console.log(`   Error: ${JSON.stringify(errorData, null, 2)}`);
        }
        console.log('');
        // 5. 投稿テスト（テストモード）
        console.log('📝 Step 5: 投稿テスト（テストモード）');
        const originalTestMode = process.env.X_TEST_MODE;
        process.env.X_TEST_MODE = 'true';
        const testResult = await xClient.post('🧪 OAuth 2.0 Debug Test - テストモード投稿');
        console.log(`   Result: ${testResult.success ? '成功' : '失敗'}`);
        if (!testResult.success) {
            console.log(`   Error: ${testResult.error}`);
        }
        // 元の設定に戻す
        process.env.X_TEST_MODE = originalTestMode;
        console.log('');
        console.log('🎉 OAuth 2.0 Debug Test完了');
    }
    catch (error) {
        console.error('❌ Debug Test エラー:', error instanceof Error ? error.message : error);
        console.error('');
        console.error('💡 可能な原因:');
        console.error('1. OAuth 2.0トークンの有効期限切れ');
        console.error('2. X Developer Portalの権限設定');
        console.error('3. アプリのスコープ設定');
        console.error('4. ネットワーク接続の問題');
    }
}
// スクリプト実行
if (process.argv[1] === import.meta.url.replace('file://', '')) {
    debugOAuth2().catch((error) => {
        console.error('予期しないエラー:', error);
        process.exit(1);
    });
}
export { debugOAuth2 };
