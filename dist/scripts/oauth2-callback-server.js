/**
 * OAuth 2.0 Callback Server
 * ローカルでコールバックを受け取るための簡単なHTTPサーバー
 */
import * as http from 'http';
import * as url from 'url';
const PORT = 3000;
const CALLBACK_PATH = '/callback';
let receivedCode = null;
let receivedState = null;
let server;
function startCallbackServer() {
    return new Promise((resolve, reject) => {
        server = http.createServer((req, res) => {
            const parsedUrl = url.parse(req.url || '', true);
            if (parsedUrl.pathname === CALLBACK_PATH) {
                const code = parsedUrl.query.code;
                const state = parsedUrl.query.state;
                const error = parsedUrl.query.error;
                if (error) {
                    // エラーレスポンス
                    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>OAuth 2.0 エラー</title>
              <meta charset="utf-8">
            </head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h1>❌ OAuth 2.0 認証エラー</h1>
              <p><strong>エラー:</strong> ${error}</p>
              <p><strong>説明:</strong> ${parsedUrl.query.error_description || '不明なエラー'}</p>
              <p>このウィンドウを閉じて、再度認証を試してください。</p>
            </body>
            </html>
          `);
                    reject(new Error(`OAuth error: ${error} - ${parsedUrl.query.error_description}`));
                    return;
                }
                if (code && state) {
                    receivedCode = code;
                    receivedState = state;
                    // 成功レスポンス
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>OAuth 2.0 認証成功</title>
              <meta charset="utf-8">
            </head>
            <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
              <h1>✅ OAuth 2.0 認証成功！</h1>
              <p>Authorization Codeを正常に受信しました。</p>
              <p><strong>Code:</strong> <code style="background: #f0f0f0; padding: 4px;">${code.substring(0, 20)}...</code></p>
              <p><strong>State:</strong> <code style="background: #f0f0f0; padding: 4px;">${state}</code></p>
              <p>このウィンドウを閉じてください。<br>認証プロセスが自動的に続行されます。</p>
            </body>
            </html>
          `);
                    // サーバーを少し待ってから停止
                    setTimeout(() => {
                        resolve({ code, state });
                    }, 1000);
                }
                else {
                    // パラメータ不足
                    res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>OAuth 2.0 パラメータエラー</title>
              <meta charset="utf-8">
            </head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h1>⚠️ パラメータ不足</h1>
              <p>Authorization CodeまたはState値が受信されませんでした。</p>
              <p>認証プロセスを再開してください。</p>
            </body>
            </html>
          `);
                }
            }
            else {
                // 404
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>OAuth 2.0 Callback Server</title>
            <meta charset="utf-8">
          </head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>🔗 OAuth 2.0 Callback Server</h1>
            <p>このサーバーはOAuth 2.0のコールバックを受け取るために起動しています。</p>
            <p><strong>コールバックURL:</strong> <code>http://localhost:${PORT}${CALLBACK_PATH}</code></p>
            <p>認証プロセスが完了するまでお待ちください...</p>
          </body>
          </html>
        `);
            }
        });
        server.on('error', (err) => {
            reject(err);
        });
        server.listen(PORT, () => {
            console.log(`🚀 [OAuth Callback Server] http://localhost:${PORT} でコールバック待機中...`);
            console.log(`📋 [Callback URL] http://localhost:${PORT}${CALLBACK_PATH}`);
        });
    });
}
function stopCallbackServer() {
    if (server) {
        server.close(() => {
            console.log('🛑 [OAuth Callback Server] サーバーを停止しました');
        });
    }
}
export { startCallbackServer, stopCallbackServer };
// スクリプトとして直接実行された場合
if (process.argv[1] === import.meta.url.replace('file://', '')) {
    console.log('🔗 OAuth 2.0 Callback Server起動中...');
    startCallbackServer()
        .then(({ code, state }) => {
        console.log('✅ Authorization Code受信成功:');
        console.log(`   Code: ${code.substring(0, 20)}...`);
        console.log(`   State: ${state}`);
        stopCallbackServer();
    })
        .catch((error) => {
        console.error('❌ Callback Server エラー:', error);
        stopCallbackServer();
        process.exit(1);
    });
}
