# KaitoTwitterAPI 仕様書

## 🌐 概要

TwitterAPI.io統合による投資教育コンテンツ自動投稿システム

- **Provider**: TwitterAPI.io
- **認証**: x-api-key ヘッダー
- **制限**: 200 QPS
- **ベースURL**: `https://api.twitterapi.io`

## 🚀 クイックスタート

### 環境変数設定

```bash
# 必須: APIキー認証
KAITO_API_TOKEN=your_twitterapi_io_token

# オプション: 投稿機能用（V2ログイン認証）
X_USERNAME=your_twitter_username
X_EMAIL=your_twitter_email  
X_PASSWORD=your_twitter_password
X_TOTP_SECRET=your_twitter_totp_secret

# プロキシ設定は data/config/proxies.yaml で管理
```

### 実装例

```typescript
import { KaitoTwitterAPIClient } from './kaito-api';

// クライアント初期化
const client = new KaitoTwitterAPIClient({
  apiKey: process.env.KAITO_API_TOKEN,
  qpsLimit: 200,
  costTracking: true
});

// 認証
await client.authenticate();

// === 読み取り専用操作（APIキーのみ） ===
const userInfo = await client.getUserInfo('elonmusk');
const searchResults = await client.searchTweets('投資教育', { max_results: 10 });
const trends = await client.getTrends();

// === 投稿・アクション操作（V2ログイン必須） ===
// 環境変数設定済みの場合、投稿時に自動でV2ログイン実行
const postResult = await client.post('投資教育コンテンツ');
const retweetResult = await client.retweet('tweetId');
const likeResult = await client.like('tweetId');
const quoteTweet = await client.quoteTweet('tweetId', 'コメント');

// エラーハンドリング
try {
  await client.post('投稿内容');
} catch (error) {
  if (error.message.includes('Rate limit exceeded')) {
    // レート制限対応
  } else if (error.message.includes('Authentication failed')) {
    // 再認証
    await client.authenticate();
  }
}
```

## 📁 ディレクトリ構造

詳細なディレクトリ構造は [directory-structure.md](./directory-structure.md#-srckato-api-ディレクトリ新ワークフローアーキテクチャ版-phase-2実装完了) を参照してください。

## 📚 実装時参照

各APIエンドポイントの詳細は以下の公式ドキュメントを参照してください：

### 🔐 認証関連
- **V2ログイン**: `/twitter/user_login_v2` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/user_login_v2)
  - レスポンス形式: `{ "status": "success", "message": "login success.", "login_cookies": "..." }`
  - 注意: `status`フィールドと`login_cookies`（複数形）を使用
- **ユーザー情報取得**: `/twitter/user/info` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/user-info)
- **マイアカウント情報**: `/twitter/my/account_info` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/my-account-info)

### 📝 投稿・アクション系（V2ログイン必須）
- **ツイート作成**: `/twitter/create_tweet_v2` → [📖 Docs](https://twitterapi.io/api-reference/endpoint/create_tweet_v2)
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

## 🧪 テスト

```bash
# 単体・統合テスト
npm test kaito-api

# 実API動作確認（APIトークン必須）
KAITO_API_TOKEN=your_token npm run test:real-api
```