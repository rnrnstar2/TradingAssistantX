# KaitoTwitterAPI 仕様書

## 🌐 概要

TwitterAPI.io統合によるFX教育コンテンツ自動投稿システム

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

MVPでは`/twitter/tweet/get_tweet_by_ids`エンドポイントを使用して投稿エンゲージメントの最新メトリクスを一括取得します。

**エンドポイント仕様**:
- **URL**: `GET /twitter/tweets?tweet_ids=id1%0Aid2%0Aid3...`
- **最大取得数**: 100個のTweet IDまで一度に処理可能
- **認証レベル**: APIキーのみ（読み取り専用操作）
- **ヘッダー**: `X-API-Key: {YOUR_API_KEY}`
- **用途**: 最新50件の自分の投稿のエンゲージメント率計算・分析
- **注意**: ツイートIDは改行区切り（URLエンコードで%0A）で送信

**実装例**:
```bash
curl --request GET \
  --url 'https://api.twitterapi.io/twitter/tweets?tweet_ids=1950214974585852117%0A1950403852894658733' \
  --header 'X-API-Key: YOUR_API_KEY'
```

詳細な実装方法は[公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/get_tweet_by_ids)を参照してください。

### アカウント情報設定

**環境変数**: `X_USERNAME` - Twitter認証用環境変数を使用

**動作モード**:
- **設定済み**: `/twitter/user/info`エンドポイントで実際のアカウント情報を取得
- **未設定**: デフォルト値を使用（フォロワー数0等）
- **APIエラー**: 自動的にデフォルト値にフォールバック

詳細な実装は[ユーザー情報取得](https://docs.twitterapi.io/api-reference/endpoint/get_user_by_username)の公式ドキュメントを参照してください。

### 基本的な使用方法

**初期化**: 環境変数`KAITO_API_TOKEN`にTwitterAPI.ioトークンを設定
**認証レベル**: 
- 読み取り専用操作（検索、情報取得、ツイート詳細取得）→ APIキーのみ
- 投稿・アクション操作（ツイート、いいね、フォロー等）→ V2ログイン必須

**主な操作**:
- ユーザー情報取得、ツイート検索、トレンド取得 → 公式ドキュメント参照
- 投稿エンゲージメント分析用のツイート詳細一括取得 → `/twitter/tweet/get_tweet_by_ids`エンドポイント使用
- 投稿・エンゲージメント操作 → V2ログイン後に各種アクション実行

具体的な実装方法は各エンドポイントの公式ドキュメントを参照してください。

## 📁 ディレクトリ構造

詳細なディレクトリ構造は [directory-structure.md](./directory-structure.md#-srckato-api-ディレクトリ新ワークフローアーキテクチャ版-phase-2実装完了) を参照してください。

## 📚 エンドポイント詳細仕様

### 🔐 認証関連

#### **V2ログイン** `/twitter/user_login_v2`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/user_login_v2)

| 項目 | 詳細 |
|---|---|
| **メソッド** | POST |
| **必須Body** | `user_name`, `email`, `password`, `totp_secret`, `proxy` |
| **レスポンス** | `{ login_cookie, status, msg }` |
| **注意** | プロキシ必須、Cookie返却は単数形の`login_cookie` |

#### **ユーザー情報取得** `/twitter/user/info`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/get_user_by_username)

| 項目 | 詳細 |
|---|---|
| **メソッド** | GET |
| **必須パラメータ** | `userName` (クエリパラメータ) |
| **レスポンス** | ユーザープロフィール情報（followers, following等） |
| **認証** | X-API-Key ヘッダーのみ |

#### **マイアカウント情報** `/oapi/my/info`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/get_my_info)

| 項目 | 詳細 |
|---|---|
| **メソッド** | GET |
| **パラメータ** | なし |
| **レスポンス** | `{ recharge_credits }` - 残りクレジット数 |
| **用途** | アカウントのAPIクレジット確認 |

### 📝 投稿・アクション系（V2ログイン必須）

#### **ツイート作成** `/twitter/create_tweet_v2`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/create_tweet_v2)

| 項目 | 詳細 |
|---|---|
| **メソッド** | POST |
| **必須Body** | `login_cookies`, `tweet_text`, `proxy` |
| **オプション** | `reply_to_tweet_id`, `attachment_url`（引用RT用）, `community_id`, `is_note_tweet`, `media_ids` |
| **レスポンス** | `{ tweet_id, status, msg }` |
| **引用RT** | `attachment_url`を使用（例: `https://x.com/i/status/{tweet_id}`） |

#### **ツイート削除** `/twitter/delete_tweet_v2`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/delete_tweet_v2)

| 項目 | 詳細 |
|---|---|
| **メソッド** | POST |
| **必須Body** | `login_cookies`, `tweet_id`, `proxy` |
| **レスポンス** | `{ status, msg }` |

#### **いいね** `/twitter/like_tweet_v2`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/like_tweet_v2)

| 項目 | 詳細 |
|---|---|
| **メソッド** | POST |
| **必須Body** | `login_cookies`, `tweet_id`, `proxy` |
| **レスポンス** | `{ status, msg }` |

#### **いいね取消** `/twitter/unlike_tweet_v2`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/unlike_tweet_v2)

| 項目 | 詳細 |
|---|---|
| **メソッド** | POST |
| **必須Body** | `login_cookies`, `tweet_id`, `proxy` |
| **レスポンス** | `{ status, msg }` |

#### **リツイート** `/twitter/retweet_tweet_v2`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/retweet_tweet_v2)

| 項目 | 詳細 |
|---|---|
| **メソッド** | POST |
| **必須Body** | `login_cookies`, `tweet_id`, `proxy` |
| **レスポンス** | `{ status, msg }` |

### 👥 ユーザー管理

#### **フォロー** `/twitter/follow_user_v2`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/follow_user_v2)

| 項目 | 詳細 |
|---|---|
| **メソッド** | POST |
| **必須Body** | `login_cookies`, `user_id`, `proxy` |
| **レスポンス** | `{ status, msg }` |

#### **フォロー解除** `/twitter/unfollow_user_v2`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/unfollow_user_v2)

| 項目 | 詳細 |
|---|---|
| **メソッド** | POST |
| **必須Body** | `login_cookies`, `user_id`, `proxy` |
| **レスポンス** | `{ status, msg }` |

#### **フォロワー取得** `/twitter/user/followers`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/get_user_followers)

| 項目 | 詳細 |
|---|---|
| **メソッド** | GET |
| **必須パラメータ** | `userName` |
| **オプション** | `cursor` (ページネーション), `pageSize` (デフォルト200、最大200) |
| **レスポンス** | フォロワーリスト、`has_next_page`, `next_cursor` |
| **認証** | X-API-Key ヘッダーのみ |

#### **フォロー中取得** `/twitter/user/followings`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/get_user_followings)

| 項目 | 詳細 |
|---|---|
| **メソッド** | GET |
| **必須パラメータ** | `userName` |
| **オプション** | `cursor` (ページネーション), `pageSize` (デフォルト200、最大200) |
| **レスポンス** | フォロー中リスト、`has_next_page`, `next_cursor` |
| **認証** | X-API-Key ヘッダーのみ |

### 🔍 検索・データ取得

#### **高度検索** `/twitter/tweet/advanced_search`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/tweet_advanced_search)

| 項目 | 詳細 |
|---|---|
| **メソッド** | GET |
| **必須パラメータ** | `query`, `queryType` (Latest/Top) |
| **オプション** | `cursor` (ページネーション) |
| **クエリ例** | `"AI" OR "Twitter" from:elonmusk since:2021-12-31_23:59:59_UTC` |
| **レスポンス** | 最大20件/ページ、`has_next_page`, `next_cursor` |
| **認証** | X-API-Key ヘッダーのみ |

#### **ツイートID一括取得** `/twitter/tweets`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/get_tweet_by_ids)

| 項目 | 詳細 |
|---|---|
| **メソッド** | GET |
| **URLパス** | `/twitter/tweets` |
| **必須パラメータ** | `tweet_ids` (カンマ区切り) |
| **最大数** | 100個のTweet ID |
| **レスポンス** | ツイート詳細情報の配列 |
| **認証** | X-API-Key ヘッダーのみ |
| **注意** | MVPでの最重要エンドポイント - 投稿エンゲージメント分析用 |

#### **トレンド** `/twitter/trends`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/get_trends)

| 項目 | 詳細 |
|---|---|
| **メソッド** | GET |
| **必須パラメータ** | `woeid` (地域ID) |
| **オプション** | `count` (デフォルト30、最小30) |
| **レスポンス** | トレンドリスト |
| **認証** | X-API-Key ヘッダーのみ |

#### **ユーザー検索** `/twitter/user/search`
[📖 公式ドキュメント](https://docs.twitterapi.io/api-reference/endpoint/search_user)

| 項目 | 詳細 |
|---|---|
| **メソッド** | GET |
| **必須パラメータ** | `query` (検索キーワード) |
| **レスポンス** | ユーザーリスト、`has_next_page`, `next_cursor` |
| **認証** | X-API-Key ヘッダーのみ |


## 💡 実装のベストプラクティス

### 共通ヘッダー
```
X-API-Key: YOUR_API_KEY
Content-Type: application/json
```

### プロキシ形式
```
http://username:password@ip:port
```

### エラーハンドリング
- 全APIで`status`フィールドを確認（"success"/"error"）
- `msg`フィールドにエラー詳細が含まれる
- レート制限: 200 QPS（全体）

### ページネーション
- 初回: `cursor`パラメータなし、または空文字列
- 次ページ: レスポンスの`next_cursor`を使用
- 終了判定: `has_next_page`がfalse

## ⚠️ 実装時の注意事項

1. **パラメータ名の確認**: 公式ドキュメントと完全一致必須（例: `userName` ≠ `username`）
2. **認証レベル確認**: 
   - 読み取り操作 → APIキーのみ（ヘッダー: `X-API-Key`）
   - 投稿・アクション → V2ログイン必須
3. **プロキシ設定**: V2ログインにはプロキシが必須
4. **レート制限**: 200 QPS、各エンドポイント別制限あり
5. **レスポンス形式**: V2ログインのレスポンスは`status`と`login_cookie`（単数形）を使用
6. **引用リツイート実装**: `quote_tweet_id`ではなく`attachment_url`パラメータを使用
7. **ツイートID一括取得**: 
   - 最大100個のTweet IDを一度に取得可能
   - カンマ区切りで送信（例: `1234567890,0987654321`）
   - APIキーのみで実行可能（認証レベル: 読み取り専用）

## 🧪 テスト

**単体テスト**: KaitoAPIクライアントの各エンドポイント動作確認
**統合テスト**: ワークフローとの連携動作確認
**実APIテスト**: APIトークン設定後の実環境テスト

詳細なテストコマンドはpackage.jsonの`scripts`セクションを参照してください。