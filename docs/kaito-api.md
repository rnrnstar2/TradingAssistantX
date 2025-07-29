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
X_PROXY=http://username:password@ip:port
X_USERNAME=your_twitter_username
X_EMAIL=your_twitter_email  
X_PASSWORD=your_twitter_password
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

```
src/kaito-api/
├── core/                    # コア機能
│   ├── client.ts           # メインクライアント
│   ├── auth-manager.ts     # 認証管理（V2ログイン）
│   ├── session-manager.ts  # セッション管理
│   └── config.ts           # 設定管理
├── endpoints/              
│   ├── read-only/          # APIキー認証のみ
│   │   ├── user-info.ts    # ユーザー情報取得
│   │   ├── tweet-search.ts # ツイート検索
│   │   ├── trends.ts       # トレンド取得
│   │   └── follower-info.ts# フォロワー情報
│   └── authenticated/      # V2ログイン必須
│       ├── tweet.ts        # 投稿作成・削除
│       ├── engagement.ts   # いいね・RT
│       ├── follow.ts       # フォロー管理
│       └── dm.ts          # DM送信
└── utils/                  # ユーティリティ
    ├── types.ts           # 型定義
    ├── validator.ts       # バリデーション
    ├── errors.ts          # エラー処理
    └── constants.ts       # 定数定義
```

## 📚 実装時参照

各APIエンドポイントの詳細は以下の公式ドキュメントを参照してください：

### 🔐 認証関連
- **V2ログイン**: `/twitter/user_login_v2` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/user_login_v2)
- **ユーザー情報取得**: `/twitter/user/info` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/get_user_by_username)
- **マイアカウント情報**: `/twitter/my/account_info` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/get_my_info)

### 📝 投稿・アクション系（V2ログイン必須）
- **ツイート作成**: `/twitter/create_tweet_v2` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/create_tweet_v2)
- **ツイート削除**: `/twitter/delete_tweet` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/delete_tweet_v2)
- **いいね**: `/twitter/like_tweet` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/like_tweet_v2)
- **いいね取消**: `/twitter/unlike_tweet` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/unlike_tweet_v2)
- **リツイート**: `/twitter/retweet_tweet` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/retweet_tweet_v2)

### 👥 ユーザー管理
- **フォロー**: `/twitter/follow_user` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/follow_user_v2)
- **フォロー解除**: `/twitter/unfollow_user` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/unfollow_user_v2)
- **フォロワー取得**: `/twitter/user/followers` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/get_user_followers)
- **フォロー中取得**: `/twitter/user/followings` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/get_user_followings)

### 🔍 検索・データ取得
- **高度検索**: `/twitter/tweet/advanced_search` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/tweet_advanced_search)
- **トレンド**: `/twitter/trends` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/get_trends)
- **ユーザー検索**: `/twitter/user/search` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/search_user)

### 💬 その他
- **DM送信**: `/twitter/send_dm_v2` → [📖 Docs](https://docs.twitterapi.io/api-reference/endpoint/send_dm_v2)

## ⚠️ 実装時の注意

1. **パラメータ名の確認**: 公式ドキュメントと完全一致必須（例: `userName` ≠ `username`）
2. **認証レベル確認**: 
   - 読み取り操作 → APIキーのみ
   - 投稿・アクション → V2ログイン必須
3. **プロキシ設定**: V2ログインにはプロキシが必須
4. **レート制限**: 200 QPS、各エンドポイント別制限あり

## 🧪 テスト

```bash
# 単体・統合テスト
npm test kaito-api

# 実API動作確認（APIトークン必須）
KAITO_API_TOKEN=your_token npm run test:real-api
```