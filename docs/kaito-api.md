# KaitoTwitterAPI 仕様書

## 🌐 概要

TwitterAPI.io統合による投資教育コンテンツ自動投稿システム

### 主要仕様
- **Provider**: TwitterAPI.io
- **認証**: x-api-key ヘッダー
- **制限**: 200 QPS, $0.15/1k tweets
- **応答**: 平均700ms

### 実装機能
✅ 投稿・エンゲージメント（いいね、RT、引用）  
✅ 検索・ユーザー管理  
✅ 認証・QPS制御・エラーハンドリング  
✅ コスト追跡・パフォーマンス監視

## 📊 使用例

```typescript
import { KaitoTwitterAPIClient } from './kaito-api';

// 初期化・認証
const client = new KaitoTwitterAPIClient({
  apiKey: process.env.KAITO_API_TOKEN,
  qpsLimit: 200,
  costTracking: true
});
await client.authenticate();

// 基本操作
const postResult = await client.post('投資教育コンテンツ');
const retweetResult = await client.retweet('tweetId');
const likeResult = await client.like('tweetId');
const accountInfo = await client.getAccountInfo();
```

## 🔧 設定

### 環境変数
```bash
KAITO_API_TOKEN=your_twitterapi_io_token  # 必須
KAITO_QPS_LIMIT=200                       # オプション
KAITO_COST_TRACKING=true                  # オプション
```

### 制限・パフォーマンス
- **QPS**: 200/秒（自動制御）
- **レート制限**: 一般900/時間、投稿300/時間、検索500/時間
- **コスト**: $0.15/1k tweets（8ドル超過時アラート）

## 🚨 エラーハンドリング

```typescript
try {
  await client.post('投稿内容');
} catch (error) {
  if (error.message.includes('Rate limit exceeded')) {
    console.log('レート制限中、待機します');
  } else if (error.message.includes('Authentication failed')) {
    await client.authenticate();
  }
}
```

## 🧪 テスト

```bash
# 単体・統合テスト
npm test kaito-api
npm run test:integration

# 実API動作確認
RUN_REAL_API_TESTS=true npm run test:real-api
```

## 🚨 実装教訓（2025/7/27 実用化達成）

### 主要問題と解決策

#### 1. エンドポイント構造の間違い
```typescript
// ❌ 間違い: 標準REST想定
auth: { verify: '/v1/auth/verify' }

// ✅ 正解: TwitterAPI.io固有構造  
auth: { verify: '/twitter/user/info' }
```

#### 2. 認証方式の間違い
```typescript
// ❌ 間違い
headers: { 'Authorization': `Bearer ${apiKey}` }

// ✅ 正解
headers: { 'x-api-key': apiKey }
```

#### 3. パラメータ名の微細な差異
```bash
# ❌ username → 404エラー
# ✅ userName → 成功
```

### ベストプラクティス

#### API検証手順
```bash
# 1. 接続確認
curl -I https://api.twitterapi.io/

# 2. 認証確認
curl -H "x-api-key: YOUR_KEY" "https://api.twitterapi.io/twitter/user/info?userName=elonmusk"

# 3. 実際のエンドポイント確認
curl -H "x-api-key: YOUR_KEY" "https://api.twitterapi.io/twitter/tweet/advanced_search?query=test&queryType=Latest"
```

### 最重要教訓

> **「技術的完成」≠「実用可能」**

TypeScript型チェック・モックテストが100%成功しても、実際のAPI統合が完全に使用不可能な場合がある。真の完成は**実際のAPI通信成功**でのみ確認できる。

**結果**: 「95%完成」→「100%実用化」達成（2時間で解決）