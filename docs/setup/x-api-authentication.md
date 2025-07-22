# X API認証設定ガイド

このガイドでは、TradingAssistantXでX（Twitter）APIを使用するための認証設定方法を説明します。

## 🚨 重要な更新情報 (2025年)

**2025年3月31日**: X API v1.1メディアエンドポイント廃止予定  
**現在推奨**: OAuth 2.0 Authorization Code Flow with PKCE  
**投稿機能**: User Context認証が必須

## 🔑 認証方法の選択

X APIには以下の認証方法があります：

### OAuth 2.0 with PKCE
- **利点**: 最新のセキュリティ標準、投稿機能フル対応
- **用途**: ツイート投稿、リード、User Context操作
- **必要スコープ**: `tweet.write`, `users.read`, `offline.access`
- **必要な情報**: Client ID, Client Secret, Access Token, Refresh Token


## 📋 設定手順

### Step 1: X Developer Portalでのアプリ作成

1. [X Developer Portal](https://developer.x.com/en/portal/dashboard) にアクセス
2. 「Create Project」をクリック（プロジェクト > アプリの順で作成）
3. プロジェクト名を設定（例：TradingAssistantX-Project）
4. アプリケーション名を設定（例：TradingAssistantX）
5. アプリケーション用途を選択
6. 利用規約に同意してアプリを作成

### Step 2: OAuth 2.0 with PKCE設定

#### OAuth 2.0アプリタイプの設定
1. 作成したアプリの「Settings」タブに移動
2. 「App info」セクションで「Edit」をクリック
3. **App type**: 「Web App」を選択
4. **Callback URI**: `https://your-app.com/callback` を設定
5. **Website URL**: アプリのWebサイトURLを設定

#### OAuth 2.0認証情報の取得
1. 「Keys and Tokens」タブに移動
2. **OAuth 2.0 Client ID and Client Secret**セクションで：
   - **Client ID**を記録
   - **Client Secret**を生成・記録

#### 必要スコープの設定
アプリに以下のスコープを設定：
- `tweet.write` - ツイート投稿
- `users.read` - ユーザー情報読み取り  
- `offline.access` - リフレッシュトークン取得

#### User Context認証フローの実装
投稿機能には**User Context**でのアクセストークンが必要：
1. Authorization Code Flow with PKCEを実装
2. ユーザー承認後にアクセストークン・リフレッシュトークンを取得
3. リフレッシュトークンでアクセストークンを定期更新


### Step 3: OAuth 2.0認証フローの実行

#### 🚀 認証ヘルパーでの自動セットアップ（推奨）

1. **基本環境変数の設定**
```bash
# X Developer Portalから取得した情報を設定
export X_OAUTH2_CLIENT_ID=your_client_id_here
export X_OAUTH2_CLIENT_SECRET=your_client_secret_here
export X_OAUTH2_REDIRECT_URI=https://your-app.com/callback
export X_OAUTH2_SCOPES="tweet.write users.read offline.access"
```

2. **認証ヘルパーの実行**
```bash
# OAuth 2.0認証フローを自動実行
npx tsx src/scripts/oauth2-auth-helper.ts
```

3. **ブラウザでの認証**
   - 表示されたURLをブラウザで開く
   - Xアカウントでログイン・認証
   - リダイレクトURLからauthorization codeを取得
   - ヘルパーにcodeを入力

4. **自動トークン保存**
   - Access Token・Refresh Tokenが `data/oauth2-tokens.yaml` に保存
   - 以降は自動でトークン管理される

#### 📋 手動設定（上級者向け）

以下の環境変数を設定してください：

#### OAuth 2.0認証設定
```bash
# X API OAuth 2.0認証設定（2025年推奨方式）
X_OAUTH2_CLIENT_ID=your_client_id_here
X_OAUTH2_CLIENT_SECRET=your_client_secret_here

# OAuth 2.0フロー設定
X_OAUTH2_REDIRECT_URI=https://your-app.com/callback
X_OAUTH2_SCOPES="tweet.write users.read offline.access"

# トークン（認証ヘルパーで自動取得 または 手動設定）
X_OAUTH2_ACCESS_TOKEN=your_user_access_token_here
X_OAUTH2_REFRESH_TOKEN=your_refresh_token_here

```


#### テストモード設定
```bash
# テストモード（true: 実際の投稿なし、false: 実際に投稿）
X_TEST_MODE=true
```

## 🔧 権限設定の確認

### OAuth 2.0必要スコープ
アプリに以下のスコープが設定されていることを確認してください：

1. **tweet.write**: ツイートの投稿
2. **users.read**: ユーザー情報の読み取り
3. **offline.access**: リフレッシュトークンの取得
4. **tweet.read** (オプション): ツイートの読み取り

### OAuth 2.0スコープの設定方法
1. アプリの「Settings」タブに移動
2. 「User authentication settings」で「Set up」をクリック
3. **App permissions**で必要なスコープを選択
4. **Type of App**: 「Web App」を選択
5. **Callback URI**を設定
6. 変更を保存


## 🚨 認証エラーのトラブルシューティング

### 403エラー：OAuth 2.0認証失敗

#### 症状
```
Error: Request failed with status code 403
Forbidden
```

#### OAuth 2.0での解決方法
1. **User Context認証の確認**
   - 投稿機能にはUser Contextでの認証が必須
   - App-only認証では投稿不可

2. **スコープの再確認**
   - `tweet.write`スコープが設定されているか確認
   - `users.read`と`offline.access`も必要

3. **アクセストークンの確認**
   - User認証フローで取得したアクセストークンを使用
   - App-onlyのBearer Tokenは投稿に使用不可

4. **環境変数の確認**
```bash
# OAuth 2.0環境変数の確認
echo $X_OAUTH2_CLIENT_ID
echo $X_OAUTH2_CLIENT_SECRET
echo $X_OAUTH2_ACCESS_TOKEN
echo $X_OAUTH2_REFRESH_TOKEN
```


### 共通の確認事項
1. **テストモードでの確認**
   - まず `X_TEST_MODE=true` で動作確認
   - 問題がなければ `false` に変更

2. **API使用量の確認**
   - レート制限に達していないか確認
   - Developer Portalで使用量を監視

## 🧪 動作確認

### OAuth 2.0認証テスト

#### ステップ1: 認証設定の確認
```bash
# 認証ヘルパーで認証テストを実行
npx tsx src/scripts/oauth2-auth-helper.ts
```

#### ステップ2: テスト投稿の実行
```bash
# テストモードで実行（実際の投稿なし）
X_TEST_MODE=true pnpm dev

# 実際の投稿テスト（注意：実際に投稿されます）
X_TEST_MODE=false pnpm dev
```


### 正常な出力例
```
✅ [投稿完了] 投稿が成功しました
🔗 [投稿結果]: { success: true, ... }
```

### OAuth 2.0特有の出力例
```
🔄 Access token expired, refreshing...
✅ OAuth 2.0認証完了！
📁 トークンが data/oauth2-tokens.yaml に保存されました
```

### エラー時の出力例
```
❌ [投稿失敗] 投稿に失敗しました  
🔗 [投稿結果]: { success: false, error: "..." }
```

## 🔐 セキュリティのベストプラクティス

### 環境変数の管理
- **絶対にコードに直接書き込まない**
- `.env` ファイルを使用し、`.gitignore` に追加
- 本番環境では環境変数またはシークレット管理サービスを使用

### トークンの保護
- Access Tokenは定期的に再生成
- 不要な権限は設定しない
- テスト環境と本番環境でトークンを分ける

## 📞 サポート

### 問題が解決しない場合
1. Developer Portal のアプリ設定を再確認
2. API使用量の制限に達していないか確認
3. X APIの[公式ドキュメント](https://developer.twitter.com/en/docs)を参照
4. システム管理者またはチームメンバーに相談

---

**重要**: API認証情報は機密情報です。適切に管理し、第三者と共有しないでください。