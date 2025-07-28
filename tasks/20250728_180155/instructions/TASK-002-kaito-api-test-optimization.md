# TASK-002: KaitoAPI テスト最適化

## 🎯 目的
tests/kaito-apiのテストファイルを、実際にdev.tsとmain.tsで使用されるAPIメソッドのみに絞り込み、過不足ない完璧な状態にする。

## 📋 実際に使用されているAPIメソッド

main-workflowsの調査結果より、以下のメソッドのみ使用されています：

1. **authenticate()** - 認証
2. **testConnection()** - 接続テスト  
3. **getAccountInfo()** - アカウント情報取得
4. **post()** - 投稿作成
5. **searchTweets()** - ツイート検索
6. **retweet()** - リツイート
7. **getUserLastTweets()** - ユーザーの最新ツイート取得
8. **searchTrends()** - トレンド検索（オプショナル）

## 🔧 実装内容

### 1. 不要なテストファイルの削除

以下のテストファイルは実際に使われていないため削除：
- `endpoints/tweet-validation.test.ts` - バリデーションのみのテスト
- `endpoints/tweet-creation.test.ts` - 重複（tweet-endpoints.test.tsに統合）
- `performance/performance.test.ts` - パフォーマンステストは不要
- `types/*.test.ts` - 型のみのテストは不要

### 2. 必要なテストファイルの整理

#### A. コアテスト（必須）
**`core/client.test.ts`** - 以下のメソッドのテストのみ残す：
- authenticate()
- testConnection()
- getAccountInfo()
- エラーハンドリング

#### B. エンドポイントテスト（必須）
**`endpoints/tweet-endpoints.test.ts`** - 以下のみ：
- post()
- searchTweets()

**`endpoints/action-endpoints.test.ts`** - 以下のみ：
- retweet()

**`endpoints/user-endpoints.test.ts`** - 以下のみ：
- getUserLastTweets()
- searchTrends()（もし実装されていれば）

### 3. 統合テストの最適化

**`integration/workflow-integration.test.ts`** - 実際のワークフローをシミュレート：
```typescript
// 実際の使用パターンに基づくテスト
describe('実際のワークフロー統合テスト', () => {
  it('認証 → アカウント情報取得 → 投稿', async () => {
    await client.authenticate();
    const account = await client.getAccountInfo();
    const result = await client.post('テスト投稿');
  });

  it('検索 → リツイート', async () => {
    const tweets = await client.searchTweets('投資教育');
    if (tweets.data.length > 0) {
      await client.retweet(tweets.data[0].id);
    }
  });
});
```

### 4. テストの品質基準

各テストは以下を満たすこと：
- ✅ 正常系・異常系両方のケース
- ✅ モックを使用（実APIは呼ばない）
- ✅ エラーハンドリングの確認
- ✅ 実際の使用パターンに基づく

### 5. 削除対象ファイル一覧

```bash
# 削除するファイル
tests/kaito-api/config-types.test.ts
tests/kaito-api/core-types.test.ts
tests/kaito-api/tweet-types.test.ts
tests/kaito-api/user-types.test.ts
tests/kaito-api/type-compatibility.test.ts
tests/kaito-api/types.test.ts
tests/kaito-api/types/
tests/kaito-api/performance/
tests/kaito-api/endpoints/tweet-validation.test.ts
tests/kaito-api/endpoints/tweet-creation.test.ts
tests/kaito-api/endpoints/endpoints-integration.test.ts
tests/kaito-api/core/config-manager.test.ts
tests/kaito-api/core/config-validation.test.ts
tests/kaito-api/core/config.test.ts
tests/kaito-api/core/error-handler.test.ts
tests/kaito-api/core/http-client.test.ts
tests/kaito-api/core/qps-controller.test.ts
tests/kaito-api/core/simple.test.ts
```

## 🔧 実装手順

1. **バックアップ作成**（念のため）
   ```bash
   cp -r tests/kaito-api tests/kaito-api.backup
   ```

2. **不要ファイルの削除**
   - 上記リストのファイルを削除

3. **必要ファイルの修正**
   - 使用されるメソッドのテストのみ残す
   - 不要なテストケースを削除

4. **テスト実行確認**
   ```bash
   pnpm test tests/kaito-api
   ```

## ✅ 完了条件

1. 実際に使用される8つのメソッドのテストが存在する
2. 不要なテストファイル・テストケースが削除されている
3. 全てのテストが正常に実行される
4. モックを使用し、実APIは呼ばない

## 📌 注意事項

- 実際のAPIエンドポイント修正（TASK-001）の影響を考慮すること
- テストのモックもエンドポイント修正に合わせて更新すること
- 削除は慎重に行い、必要なテストを誤って削除しないこと