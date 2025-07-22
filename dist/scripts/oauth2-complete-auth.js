/**
 * OAuth 2.0 Complete Authentication Flow
 * コールバックサーバー + 認証ヘルパー統合版
 */
import * as http from 'http';
import * as url from 'url';
import { SimpleXClient } from '../lib/x-client.js';
import * as dotenv from 'dotenv';
// 環境変数読み込み
dotenv.config();
const PORT = 3000;
const CALLBACK_PATH = '/callback';
class OAuth2CompleteAuth {
    xClient;
    server = null;
    constructor() {
        this.xClient = new SimpleXClient();
    }
    /**
     * 完全なOAuth 2.0認証フローを実行
     */
    async executeCompleteAuth() {
        console.log('🔑 OAuth 2.0 完全認証フロー開始');
        console.log('=======================================');
        console.log('');
        try {
            // Step 1: 環境変数確認
            await this.validateEnvironment();
            // Step 2: 認証URL生成
            const authData = await this.generateAuthUrl();
            // Step 3: コールバックサーバー起動
            console.log('🚀 コールバックサーバー起動中...');
            const callbackPromise = this.startCallbackServer();
            // Step 4: 認証URL表示
            this.displayAuthUrl(authData);
            // Step 5: コールバック待機
            console.log('⏳ 認証完了まで待機しています...');
            const callbackResult = await callbackPromise;
            // Step 6: State検証
            this.validateState(callbackResult.state, authData.state);
            // Step 7: Token Exchange
            await this.exchangeTokens(callbackResult.code, authData.codeVerifier);
            // Step 8: 成功メッセージ
            this.displaySuccess();
        }
        catch (error) {
            console.error('❌ OAuth 2.0 認証エラー:', error instanceof Error ? error.message : error);
            this.displayErrorHelp();
            throw error;
        }
        finally {
            this.stopServer();
        }
    }
    async validateEnvironment() {
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
            throw new Error('環境変数が不足しています');
        }
        console.log('✅ 環境変数の確認完了');
        console.log(`   Client ID: ${clientId.slice(0, 8)}...`);
        console.log(`   Redirect URI: ${redirectUri}`);
        console.log('');
    }
    async generateAuthUrl() {
        console.log('🔗 認証URL生成中...');
        const authData = this.xClient.generateAuthorizationUrl();
        console.log('✅ 認証URL生成完了');
        console.log('');
        return authData;
    }
    displayAuthUrl(authData) {
        console.log('📋 ステップ1: ブラウザで以下のURLにアクセスしてください:');
        console.log('');
        console.log('🔗 認証URL:');
        console.log(authData.url);
        console.log('');
        console.log('⚠️  セキュリティ情報:');
        console.log(`   State: ${authData.state}`);
        console.log(`   Code Verifier: ${authData.codeVerifier.slice(0, 20)}...`);
        console.log('');
        console.log('📋 ステップ2: Xアカウントでログインし、アプリを承認してください');
        console.log('📋 ステップ3: 認証後、自動的にトークンが取得されます');
        console.log('');
    }
    startCallbackServer() {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                const parsedUrl = url.parse(req.url || '', true);
                if (parsedUrl.pathname === CALLBACK_PATH) {
                    const code = parsedUrl.query.code;
                    const state = parsedUrl.query.state;
                    const error = parsedUrl.query.error;
                    if (error) {
                        this.sendErrorResponse(res, error, parsedUrl.query.error_description);
                        reject(new Error(`OAuth error: ${error} - ${parsedUrl.query.error_description}`));
                        return;
                    }
                    if (code && state) {
                        this.sendSuccessResponse(res, code, state);
                        setTimeout(() => resolve({ code, state }), 1000);
                    }
                    else {
                        this.sendParameterErrorResponse(res);
                        reject(new Error('Authorization CodeまたはState値が受信されませんでした'));
                    }
                }
                else {
                    this.sendWaitingResponse(res);
                }
            });
            this.server.on('error', reject);
            this.server.listen(PORT, () => {
                console.log(`📡 コールバックサーバー起動: http://localhost:${PORT}${CALLBACK_PATH}`);
            });
        });
    }
    sendSuccessResponse(res, code, state) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>✅ OAuth 2.0 認証成功</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; text-align: center; background: #f8f9fa; }
          .success { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
          h1 { color: #28a745; margin-bottom: 20px; }
          code { background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="success">
          <h1>🎉 OAuth 2.0 認証成功！</h1>
          <p>Authorization Codeを正常に受信しました。</p>
          <p><strong>Code:</strong> <code>${code.substring(0, 30)}...</code></p>
          <p><strong>State:</strong> <code>${state}</code></p>
          <hr>
          <p>✅ このウィンドウを閉じてください</p>
          <p>🔄 Access Token取得が自動で開始されます</p>
        </div>
      </body>
      </html>
    `);
    }
    sendErrorResponse(res, error, description) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>❌ OAuth 2.0 エラー</title><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <h1>❌ OAuth 2.0 認証エラー</h1>
        <p><strong>エラー:</strong> ${error}</p>
        <p><strong>説明:</strong> ${description || '不明なエラー'}</p>
        <p>ターミナルを確認して、再度認証を試してください。</p>
      </body>
      </html>
    `);
    }
    sendParameterErrorResponse(res) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>⚠️ パラメータエラー</title><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <h1>⚠️ パラメータ不足</h1>
        <p>Authorization CodeまたはState値が受信されませんでした。</p>
        <p>認証プロセスを再開してください。</p>
      </body>
      </html>
    `);
    }
    sendWaitingResponse(res) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>⏳ OAuth 2.0 認証待機中</title><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
        <h1>⏳ OAuth 2.0 認証待機中...</h1>
        <p>認証プロセスが完了するまでお待ちください。</p>
        <p><strong>コールバックURL:</strong> <code>http://localhost:${PORT}${CALLBACK_PATH}</code></p>
      </body>
      </html>
    `);
    }
    validateState(receivedState, expectedState) {
        if (receivedState !== expectedState) {
            throw new Error('State値が一致しません。セキュリティ上の理由で認証を中止します。');
        }
        console.log('✅ State値検証成功');
    }
    async exchangeTokens(code, codeVerifier) {
        console.log('');
        console.log('🔄 Access Token取得中...');
        console.log(`   Authorization Code: ${code.substring(0, 20)}...`);
        console.log(`   Code Verifier: ${codeVerifier.substring(0, 20)}...`);
        const tokens = await this.xClient.exchangeCodeForTokens(code, codeVerifier);
        console.log('');
        console.log('✅ Access Token取得成功！');
        console.log('📁 取得したトークン情報:');
        console.log(`   Access Token: ${tokens.access_token.substring(0, 30)}...`);
        console.log(`   Refresh Token: ${tokens.refresh_token?.substring(0, 30) || 'なし'}...`);
        console.log(`   有効期限: ${new Date(tokens.expires_at).toLocaleString('ja-JP')}`);
        console.log(`   スコープ: ${tokens.scope}`);
        console.log('');
        console.log('💾 トークンは data/oauth2-tokens.yaml に保存されました');
    }
    displaySuccess() {
        console.log('');
        console.log('🎉 OAuth 2.0認証セットアップ完了！');
        console.log('');
        console.log('🚀 次のステップ:');
        console.log('1. テストモードで動作確認:');
        console.log('   X_TEST_MODE=true pnpm dev');
        console.log('');
        console.log('2. 実際の投稿テスト:');
        console.log('   X_TEST_MODE=false pnpm dev');
        console.log('');
        console.log('3. トークンは自動更新されます（refresh_tokenがある場合）');
        console.log('');
    }
    displayErrorHelp() {
        console.log('');
        console.log('💡 解決方法:');
        console.log('1. X Developer Portalのアプリ設定を確認');
        console.log('2. 環境変数の設定を確認');
        console.log('3. ネットワーク接続を確認');
        console.log('4. docs/setup/x-api-authentication.md を参照');
        console.log('');
    }
    stopServer() {
        if (this.server) {
            this.server.close();
            console.log('🛑 コールバックサーバーを停止しました');
        }
    }
}
// スクリプト実行
if (process.argv[1] === import.meta.url.replace('file://', '')) {
    const auth = new OAuth2CompleteAuth();
    auth.executeCompleteAuth().catch((error) => {
        console.error('予期しないエラー:', error);
        process.exit(1);
    });
}
export { OAuth2CompleteAuth };
