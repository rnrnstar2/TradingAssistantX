# TASK-001: OAuth 1.0a コア実装

## 概要
OAuth 1.0a認証のコア機能を実装する新しいライブラリファイルを作成します。これはOAuth 2.0からの移行の基礎となる重要なコンポーネントです。

## 実装対象
新規ファイル: `src/lib/oauth1-client.ts`

## 実装要件

### 1. OAuth 1.0a署名生成機能
- HMAC-SHA1署名メソッドの実装
- 署名ベース文字列の生成
- パラメータの正規化とエンコーディング
- nonce生成（ランダムな一意文字列）
- timestamp生成（Unix時刻）

### 2. OAuth 1.0aヘッダー生成
以下のパラメータを含むAuthorizationヘッダーを生成：
```
OAuth oauth_consumer_key="...",
      oauth_nonce="...",
      oauth_signature="...",
      oauth_signature_method="HMAC-SHA1",
      oauth_timestamp="...",
      oauth_token="...",
      oauth_version="1.0"
```

### 3. 必要な型定義
```typescript
interface OAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

interface OAuth1SignatureParams {
  method: string;
  url: string;
  params?: Record<string, string>;
}
```

### 4. エクスポートする関数
- `generateOAuth1Header(credentials: OAuth1Credentials, params: OAuth1SignatureParams): string`
- `generateOAuth1Signature(credentials: OAuth1Credentials, params: OAuth1SignatureParams): string`
- `generateNonce(): string`
- `generateTimestamp(): number`

### 5. 実装の注意点
- crypto モジュールを使用してHMAC-SHA1署名を生成
- URLエンコーディングはRFC 3986に準拠
- パラメータは辞書順でソート
- テスト可能な設計（署名生成ロジックを分離）

### 6. 参考情報
- X (Twitter) API v1.1のOAuth 1.0a仕様に準拠
- https://developer.twitter.com/en/docs/authentication/oauth-1-0a

## 品質基準
- TypeScript strict modeでエラーなし
- 適切なエラーハンドリング
- 関数はすべてJSDocコメント付き
- 単体テスト可能な設計

## 制約事項
- 外部ライブラリの使用は最小限に（crypto以外は基本的に使用しない）
- セキュリティを最優先（シークレットの露出防止）