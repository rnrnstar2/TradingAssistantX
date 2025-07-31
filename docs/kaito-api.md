# KaitoTwitterAPI 仕様書

## 🌐 概要

TwitterAPI.io統合による投資教育コンテンツ自動投稿システム

- **Provider**: TwitterAPI.io
- **認証**: x-api-key ヘッダー
- **制限**: 200 QPS
- **ベースURL**: `https://api.twitterapi.io`

## 🚀 クイックスタート

### 環境変数設定

**必須**: `KAITO_API_TOKEN` - TwitterAPI.ioのAPIトークン

**投稿機能用（オプション）**: 
- `X_USERNAME`, `X_EMAIL`, `X_PASSWORD`, `X_TOTP_SECRET` - V2ログイン認証用

**プロキシ設定**: `data/config/proxies.yaml`で管理（V2ログイン時必須）

### MVP重点機能: 投稿エンゲージメント分析

MVPでは`/twitter/tweets`エンドポイントを使用して投稿エンゲージメントの最新メトリクスを一括取得します。

**エンドポイント仕様**:
- **URL**: `GET /twitter/tweets?tweet_ids=id1,id2,id3...`
- **最大取得数**: 100個のTweet IDまで一度に処理可能
- **認証レベル**: APIキーのみ（読み取り専用操作）
- **ヘッダー**: `X-API-Key: {YOUR_API_KEY}`
- **用途**: 最新50件の自分の投稿のエンゲージメント率計算・分析

**実装例**:
```bash
curl --request GET \
  --url 'https://api.twitterapi.io/twitter/tweets?tweet_ids=1950214974585852117,1950403852894658733' \
  --header 'X-API-Key: YOUR_API_KEY'
```

詳細な実装方法は[公式ドキュメント](https://twitterapi.io/api-reference/endpoint/get-tweets-by-ids)を参照してください。

### アカウント情報設定

**環境変数**: `X_USERNAME` - Twitter認証用環境変数を使用

**動作モード**:
- **設定済み**: `/twitter/user/info`エンドポイントで実際のアカウント情報を取得
- **未設定**: デフォルト値を使用（フォロワー数0等）
- **APIエラー**: 自動的にデフォルト値にフォールバック

詳細な実装は[ユーザー情報取得](https://twitterapi.io/api-reference/endpoint/user-info)の公式ドキュメントを参照してください。

### 基本的な使用方法

**初期化**: 環境変数`KAITO_API_TOKEN`にTwitterAPI.ioトークンを設定
**認証レベル**: 
- 読み取り専用操作（検索、情報取得、ツイート詳細取得）→ APIキーのみ
- 投稿・アクション操作（ツイート、いいね、フォロー等）→ V2ログイン必須

**主な操作**:
- ユーザー情報取得、ツイート検索、トレンド取得 → 公式ドキュメント参照
- 投稿エンゲージメント分析用のツイート詳細一括取得 → `/twitter/tweets`エンドポイント使用
- 投稿・エンゲージメント操作 → V2ログイン後に各種アクション実行

具体的な実装方法は各エンドポイントの公式ドキュメントを参照してください。

## 📁 ディレクトリ構造

詳細なディレクトリ構造は [directory-structure.md](./directory-structure.md#-srckato-api-ディレクトリ新ワークフローアーキテクチャ版-phase-2実装完了) を参照してください。

## 📚 実装時参照

各APIエンドポイントの詳細は以下の公式ドキュメントを参照してください：

### 🔐 認証関連
- **V2ログイン**: `/twitter/user_login_v2` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/user_login_v2)
  - 注意: レスポンスは`status`フィールドと`login_cookies`（複数形）を使用
- **ユーザー情報取得**: `/twitter/user/info` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/user-info)
- **マイアカウント情報**: `/twitter/my/account_info` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/my-account-info)

### 📝 投稿・アクション系（V2ログイン必須）
- **ツイート作成**: `/twitter/create_tweet_v2` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/create_tweet_v2)
  - **引用リツイート**: `attachment_url`パラメータに`https://x.com/i/status/{tweet_id}`形式のURLを指定
- **ツイート削除**: `/twitter/delete_tweet_v2` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/delete_tweet_v2)
- **いいね**: `/twitter/like_tweet_v2` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/like_tweet_v2)
- **いいね取消**: `/twitter/unlike_tweet_v2` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/unlike_tweet_v2)
- **リツイート**: `/twitter/retweet_tweet_v2` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/retweet_tweet_v2)

### 👥 ユーザー管理
- **フォロー**: `/twitter/follow_user_v2` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/follow_user_v2)
- **フォロー解除**: `/twitter/unfollow_user_v2` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/unfollow_user_v2)
- **フォロワー取得**: `/twitter/user/followers` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/user-followers)
- **フォロー中取得**: `/twitter/user/followings` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/user-followings)

### 🔍 検索・データ取得
- **高度検索**: `/twitter/tweet/advanced_search` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/tweet-advanced-search)
- **ツイートID一括取得**: `/twitter/tweets` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/get-tweets-by-ids)
- **トレンド**: `/twitter/trends` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/trends)
- **ユーザー検索**: `/twitter/user/search` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/user-search)


## ⚠️ 実装時の注意

1. **パラメータ名の確認**: 公式ドキュメントと完全一致必須（例: `userName` ≠ `username`）
2. **認証レベル確認**: 
   - 読み取り操作 → APIキーのみ（ヘッダー: `x-api-key`）
   - 投稿・アクション → V2ログイン必須
3. **プロキシ設定**: V2ログインにはプロキシが必須
4. **レート制限**: 200 QPS、各エンドポイント別制限あり
5. **レスポンス形式**: V2ログインのレスポンスは`status`と`login_cookies`（複数形）を使用
6. **引用リツイート実装**: `quote_tweet_id`ではなく`attachment_url`パラメータを使用
7. **ツイートID一括取得制限**: 
   - 最大100個のTweet IDを一度に取得可能
   - エンドポイント: `/twitter/tweets?tweet_ids=id1,id2,id3...`
   - APIキーのみで実行可能（認証レベル: 読み取り専用）
   - X-API-Keyヘッダー必須

## 🧪 テスト

**単体テスト**: KaitoAPIクライアントの各エンドポイント動作確認
**統合テスト**: ワークフローとの連携動作確認
**実APIテスト**: APIトークン設定後の実環境テスト

詳細なテストコマンドはpackage.jsonの`scripts`セクションを参照してください。