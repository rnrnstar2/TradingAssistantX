# TASK-004: TwitterAPI.io エンドポイント修正指示書

## 🚨 API エラー修正タスク

**エラー原因**: 404 Not Found - `/twitter/user_last_tweets` エンドポイント存在しない  
**権限**: Worker権限必須  
**対象ファイル**: `src/kaito-api/endpoints/read-only/user-last-tweets.ts`

## 📋 エラー詳細

### 現在のエラー
```
🌐 HTTP GET リクエスト: https://api.twitterapi.io/twitter/user_last_tweets?userName=rnrnstar&limit=200&includeReplies=false
📡 レスポンス: 404 Not Found
❌ API エラー詳細: {"detail":"Not Found"}
```

### 問題の根本原因
1. **間違ったエンドポイントURL**: `/twitter/user_last_tweets` → 正しいエンドポイント不明
2. **TwitterAPI.io公式仕様との不一致**: https://docs.twitterapi.io/api-reference/endpoint/get_user_last_tweets

## 🔍 TwitterAPI.io公式仕様の確認

### ユーザーからの指示
- **公式ドキュメント**: https://docs.twitterapi.io/api-reference/endpoint/get_user_last_tweets
- **エンドポイント名**: `get_user_last_tweets`
- **パラメータ**: has_next_page でページネーション対応

### 推定される正しいエンドポイント

**可能性1**: `/twitter/user/{username}/tweets`
**可能性2**: `/twitter/tweets/user/{username}`  
**可能性3**: `/twitter/user/tweets`
**可能性4**: `/api/user/tweets`

## 🔧 修正仕様

### 1. constants.ts でのエンドポイント定義確認

**確認対象**: `src/kaito-api/utils/constants.ts`

```typescript
// 現在の定義を確認し、正しいエンドポイントに修正
export const API_ENDPOINTS = {
  // ... 他のエンドポイント
  userLastTweets: '/twitter/user_last_tweets', // ← これが404の原因
  // ... 他のエンドポイント
}
```

### 2. 段階的修正アプローチ

**Step 1**: TwitterAPI.io公式ドキュメントの確認
- https://docs.twitterapi.io/api-reference/endpoint/get_user_last_tweets にアクセス
- 正式なエンドポイントURLとパラメータ仕様を確認

**Step 2**: エンドポイント修正テスト
以下の候補を順次テスト：

```typescript
// 候補1: RESTful形式
const endpoint1 = `/twitter/user/${params.userName}/tweets`;

// 候補2: クエリパラメータ形式  
const endpoint2 = `/twitter/tweets?userName=${params.userName}`;

// 候補3: 公式ドキュメント準拠
const endpoint3 = `/api/user/tweets`;

// 候補4: 既存の類似エンドポイント参考
const endpoint4 = `/twitter/user/info`; // 動作確認済み
```

### 3. パラメータ形式の確認

**現在のパラメータ**:
```typescript
{
  userName: string,
  limit: number,
  includeReplies: boolean,
  cursor?: string
}
```

**TwitterAPI.io仕様確認項目**:
- パラメータ名が正しいか（userName vs username vs user_name）
- limitの最大値制限
- ページネーション方法（cursor vs page vs next_token）

## 📊 修正手順

### Phase 1: エンドポイント調査

```typescript
// テスト用の簡単な確認コード
async function testEndpoints() {
  const testEndpoints = [
    '/twitter/user/rnrnstar/tweets',
    '/twitter/tweets?userName=rnrnstar',
    '/api/user/tweets?userName=rnrnstar',
    '/twitter/user/timeline?userName=rnrnstar'
  ];
  
  for (const endpoint of testEndpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      const response = await httpClient.get(endpoint);
      console.log(`✅ Success: ${endpoint}`);
      return endpoint; // 成功したエンドポイントを返す
    } catch (error) {
      console.log(`❌ Failed: ${endpoint} - ${error.message}`);
    }
  }
}
```

### Phase 2: 正しいエンドポイント適用

**修正対象**: `src/kaito-api/endpoints/read-only/user-last-tweets.ts`

```typescript
// 正しいエンドポイントが判明後、修正
const response = await this.httpClient.get('/正しいエンドポイント', Object.fromEntries(queryParams));
```

### Phase 3: constants.ts更新

**修正対象**: `src/kaito-api/utils/constants.ts`

```typescript
export const API_ENDPOINTS = {
  // ... 他のエンドポイント
  userLastTweets: '/正しいエンドポイント', // 404エラー修正
  // ... 他のエンドポイント
}
```

## 🧪 テスト確認

### 1. 単一エンドポイントテスト
```bash
# 修正後のテスト
npx tsx scripts/fetch-my-tweets.ts
```

### 2. 期待される出力
```
🌐 HTTP GET リクエスト: https://api.twitterapi.io/正しいエンドポイント?userName=rnrnstar&limit=200
📡 レスポンス: 200 OK
✅ 取得完了: XX件のツイートが見つかりました
取得済み: XX件
```

## 🔍 トラブルシューティング

### よくある原因と対策

**1. エンドポイントURL間違い**
- TwitterAPI.io公式ドキュメント再確認
- 類似する動作するエンドポイント（/twitter/user/info）を参考

**2. パラメータ名間違い**  
- userName vs username の確認
- 大文字小文字の確認

**3. 認証レベル間違い**
- 読み取り専用操作でAPIキーのみで十分か確認
- V2ログインが必要かどうか確認

## ⚠️ 重要な注意事項

### 1. 既存動作するエンドポイントを参考
```
✅ 動作確認済み: /twitter/user/info  
❌ 404エラー: /twitter/user_last_tweets
```

### 2. 破壊的変更の回避
- パラメータ構造は既存のまま維持
- レスポンス処理は既存のまま維持  
- エンドポイントURLのみ修正

### 3. ドキュメント更新
- 正しいエンドポイントが判明後、docs/kaito-api.md も更新

## 📋 修正チェックリスト

### 必須調査項目
- [ ] TwitterAPI.io公式ドキュメント確認
- [ ] 正しいエンドポイントURL特定
- [ ] パラメータ仕様確認

### 必須修正項目  
- [ ] user-last-tweets.ts のエンドポイント修正
- [ ] constants.ts のAPI_ENDPOINTS更新
- [ ] 動作テスト成功確認

### 動作確認項目
- [ ] 200 OKレスポンス確認
- [ ] 実際のツイートデータ取得確認
- [ ] ページネーション動作確認

## 🚀 修正完了後の実行

```bash
# 1. 修正確認
npx tsc --noEmit src/kaito-api/endpoints/read-only/user-last-tweets.ts

# 2. 実行テスト  
npx tsx scripts/fetch-my-tweets.ts

# 3. 成功確認（ツイート件数 > 0）
cat data/current/execution-*/post.yaml | grep "total_posts"
```

---

**実装時間目安**: 30分（調査15分 + 修正15分）  
**重要度**: 🚨 緊急 - API呼び出し不能状態の解消

**🎯 実装者**: Worker権限で実装してください

**追加リソース**: 
- TwitterAPI.io公式: https://docs.twitterapi.io/api-reference/endpoint/get_user_last_tweets
- 類似エンドポイント: `/twitter/user/info` (動作確認済み)