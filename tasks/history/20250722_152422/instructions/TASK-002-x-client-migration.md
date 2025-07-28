# TASK-002: x-client.ts OAuth 1.0a移行

## 概要
既存のx-client.tsをOAuth 2.0からOAuth 1.0aに移行します。TASK-001で作成されたOAuth 1.0aコア実装を使用して、すべてのAPI呼び出しをOAuth 1.0a認証に対応させます。

## 実装対象
既存ファイル: `src/lib/x-client.ts`

## 実装要件

### 1. OAuth 2.0関連コードの削除
以下の機能を削除：
- PKCETokens インターフェース
- OAuth2Tokens インターフェース  
- oauth2TokensFile プロパティ
- oauth2Tokens プロパティ
- loadOAuth2Tokens() メソッド
- saveOAuth2Tokens() メソッド
- generateOAuth2Headers() メソッド
- getValidAccessToken() メソッド
- refreshAccessToken() メソッド
- generateAuthorizationUrl() メソッド
- exchangeCodeForTokens() メソッド
- generateCodeVerifier() メソッド
- generateCodeChallenge() メソッド

### 2. OAuth 1.0a実装の追加
- TASK-001で作成されたoauth1-client.tsをインポート
- OAuth1Credentials型の定義または参照
- 環境変数からOAuth 1.0a認証情報を読み込む処理を追加

### 3. 認証ヘッダー生成の更新
すべてのAPI呼び出しメソッドで：
- `generateOAuth2Headers()` の呼び出しを削除
- 新しいOAuth 1.0aヘッダー生成に置き換え
  ```typescript
  const authHeader = generateOAuth1Header(this.oauth1Credentials, {
    method: 'POST', // または 'GET'
    url: fullUrl,
    params: bodyParams // POSTの場合はボディパラメータ
  });
  ```

### 4. 環境変数の更新
以下の環境変数を読み込むように変更：
- `X_CONSUMER_KEY` （旧: X_OAUTH2_CLIENT_ID）
- `X_CONSUMER_SECRET` （旧: X_OAUTH2_CLIENT_SECRET）
- `X_ACCESS_TOKEN` （旧: X_OAUTH2_ACCESS_TOKEN）
- `X_ACCESS_TOKEN_SECRET` （新規）

### 5. 影響を受けるメソッドの一覧
以下のメソッドすべてでOAuth 1.0a認証に更新：
- `post()`
- `getUserByUsername()`
- `getMyAccountInfo()`
- `getAccountMetrics()`
- `getMyAccountDetails()`
- `getMyRecentTweets()`
- `getTweetEngagement()`
- `quotePost()`
- `retweet()`
- `reply()`

### 6. エラーハンドリングの更新
- OAuth 2.0のトークン期限切れエラーハンドリングを削除
- OAuth 1.0a用のエラーハンドリングを追加（401エラーなど）

### 7. テストモードの維持
- 既存のテストモード機能は維持
- OAuth 1.0a認証情報が設定されていない場合の適切なエラーメッセージ

## 品質基準
- TypeScript strict modeでエラーなし
- 既存の公開APIインターフェースは変更しない（後方互換性）
- すべてのAPI呼び出しがOAuth 1.0aで正常に動作すること

## 依存関係
- TASK-001で作成されるoauth1-client.tsが必要

## 注意事項
- セキュリティを最優先（認証情報の露出防止）
- 既存の機能（投稿履歴管理、重複チェックなど）は維持