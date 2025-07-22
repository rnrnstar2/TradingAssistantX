/**
 * OAuth 2.0 Authentication Helper
 * X API用のOAuth 2.0 Authorization Code Flow with PKCEを実行
 */
import * as readline from 'readline';
import { SimpleXClient } from '../lib/x-client';
import * as dotenv from 'dotenv';
// 環境変数読み込み
dotenv.config();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer.trim());
        });
    });
}
async function main() {
    console.log('🔑 X API OAuth 2.0認証ヘルパー');
    console.log('=====================================');
    console.log('');
    // 環境変数の確認
    const clientId = process.env.X_OAUTH2_CLIENT_ID;
    const clientSecret = process.env.X_OAUTH2_CLIENT_SECRET;
    const redirectUri = process.env.X_OAUTH2_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
        console.error('❌ 必要な環境変数が設定されていません:');
        if (!clientId)
            console.error('  - X_OAUTH2_CLIENT_ID');
        if (!clientSecret)
            console.error('  - X_OAUTH2_CLIENT_SECRET');
        if (!redirectUri)
            console.error('  - X_OAUTH2_REDIRECT_URI');
        console.log('');
        console.log('設定方法については docs/setup/x-api-authentication.md を参照してください。');
        process.exit(1);
    }
    console.log('✅ 環境変数の確認完了');
    console.log(`   Client ID: ${clientId.slice(0, 8)}...`);
    console.log(`   Redirect URI: ${redirectUri}`);
    console.log('');
    try {
        // SimpleXClientインスタンス作成
        const xClient = new SimpleXClient();
        // Authorization URL生成
        console.log('🔗 認証URL生成中...');
        const authData = xClient.generateAuthorizationUrl();
        console.log('');
        console.log('📋 ステップ1: ブラウザで以下のURLにアクセスしてください:');
        console.log('');
        console.log(`${authData.url}`);
        console.log('');
        console.log('⚠️  重要: state値とcode_verifierは安全に保管してください:');
        console.log(`   State: ${authData.state}`);
        console.log(`   Code Verifier: ${authData.codeVerifier.slice(0, 20)}...`);
        console.log('');
        // Authorization Code入力待ち
        console.log('📋 ステップ2: 認証後、リダイレクトURLからauthorization codeを取得');
        console.log('リダイレクトURL例: https://your-app.com/callback?code=AUTHORIZATION_CODE&state=STATE');
        console.log('');
        const authCode = await question('Authorization Codeを入力してください: ');
        if (!authCode) {
            console.error('❌ Authorization Codeが入力されていません');
            process.exit(1);
        }
        const inputState = await question('State値を入力してください（セキュリティ確認用）: ');
        if (inputState !== authData.state) {
            console.error('❌ State値が一致しません。セキュリティ上の理由で認証を中止します。');
            process.exit(1);
        }
        // トークン交換
        console.log('');
        console.log('🔄 Access Token取得中...');
        const tokens = await xClient.exchangeCodeForTokens(authCode, authData.codeVerifier);
        console.log('');
        console.log('✅ OAuth 2.0認証完了！');
        console.log('');
        console.log('📁 取得したトークン情報:');
        console.log(`   Access Token: ${tokens.access_token.slice(0, 20)}...`);
        console.log(`   Refresh Token: ${tokens.refresh_token?.slice(0, 20) || 'なし'}...`);
        console.log(`   有効期限: ${new Date(tokens.expires_at).toLocaleString('ja-JP')}`);
        console.log(`   スコープ: ${tokens.scope}`);
        console.log('');
        console.log('💾 トークンは data/oauth2-tokens.yaml に保存されました');
        console.log('');
        // 環境変数設定の提案
        console.log('💡 追加の環境変数設定（オプション）:');
        console.log('');
        console.log('# トークンを環境変数で直接設定する場合（推奨）');
        console.log(`export X_OAUTH2_ACCESS_TOKEN="${tokens.access_token}"`);
        if (tokens.refresh_token) {
            console.log(`export X_OAUTH2_REFRESH_TOKEN="${tokens.refresh_token}"`);
        }
        console.log('');
        // 動作テスト提案
        const testNow = await question('OAuth 2.0認証をテストしますか？ (y/N): ');
        if (testNow.toLowerCase() === 'y' || testNow.toLowerCase() === 'yes') {
            console.log('');
            console.log('🧪 認証テスト実行中...');
            try {
                const validToken = await xClient.getValidAccessToken();
                console.log(`✅ 認証テスト成功: トークン取得完了 (${validToken.slice(0, 20)}...)`);
                console.log('');
                console.log('🚀 投稿テストを実行できます:');
                console.log('   X_TEST_MODE=true pnpm dev');
            }
            catch (error) {
                console.error('❌ 認証テスト失敗:', error instanceof Error ? error.message : error);
            }
        }
        console.log('');
        console.log('🎉 OAuth 2.0認証セットアップ完了！');
        console.log('');
        console.log('次のステップ:');
        console.log('1. X_TEST_MODE=true pnpm dev でテスト投稿を実行');
        console.log('2. 問題がなければ X_TEST_MODE=false で本番投稿');
        console.log('3. トークンは自動更新されます（refresh_tokenがある場合）');
    }
    catch (error) {
        console.error('');
        console.error('❌ OAuth 2.0認証エラー:', error instanceof Error ? error.message : error);
        console.error('');
        console.error('💡 解決方法:');
        console.error('1. 環境変数の設定を確認');
        console.error('2. X Developer Portalのアプリ設定を確認');
        console.error('3. Authorization Codeが正しいか確認');
        console.error('4. docs/setup/x-api-authentication.md を参照');
        process.exit(1);
    }
    finally {
        rl.close();
    }
}
// スクリプト実行
if (process.argv[1] === import.meta.url.replace('file://', '')) {
    main().catch((error) => {
        console.error('予期しないエラー:', error);
        process.exit(1);
    });
}
