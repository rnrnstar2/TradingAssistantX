# 指示書: Kaito API テストファイル監査

## タスク概要
既存のKaito APIテストファイルを監査し、実際に使用されているAPIメソッドのテストがすべて網羅されているか確認する。

## 背景
- dev.tsとmain.tsで実際に使用されているAPIメソッドのみをテストする必要がある
- 不要なテストは実装しない（YAGNI原則）
- 既存テストファイルの品質と網羅性を評価する

## 実際に使用されているAPIメソッド

### 1. KaitoApiClient (core/client.ts)
- `post(content: string)` - 投稿作成
- `retweet(tweetId: string)` - リツイート  
- `like(tweetId: string)` - いいね

### 2. TweetEndpoints (endpoints/tweet-endpoints.ts)
- `searchTweets(options: TweetSearchOptions)` - ツイート検索

### 3. ActionEndpoints (endpoints/action-endpoints.ts)
- `post(text: string)` - 投稿作成
- `like(tweetId: string)` - いいね

## 実装要件

### 1. 既存テストファイルの確認
以下のテストファイルを確認し、各メソッドのテストカバレッジを評価：

- `/tests/kaito-api/core/client.test.ts`
  - post()メソッドのテスト確認
  - retweet()メソッドのテスト確認
  - like()メソッドのテスト確認
  
- `/tests/kaito-api/endpoints/tweet-endpoints.test.ts`
  - searchTweets()メソッドのテスト確認
  
- `/tests/kaito-api/endpoints/action-endpoints.test.ts`
  - post()メソッドのテスト確認
  - like()メソッドのテスト確認

### 2. テストケース評価基準
各メソッドについて以下を確認：
- 正常系テストケース
- 異常系テストケース（エラーハンドリング）
- 境界値テスト
- モックの適切な使用
- TypeScript型安全性

### 3. 監査レポート作成
以下の形式でレポートを作成：

```markdown
# Kaito API テスト監査レポート

## 監査サマリー
- 総メソッド数: X
- テストカバレッジあり: Y
- テストカバレッジなし: Z

## 詳細レポート

### KaitoApiClient
#### post()メソッド
- ✅/❌ 正常系テスト
- ✅/❌ 異常系テスト
- ✅/❌ 境界値テスト
- 推奨改善点: ...

[以下、各メソッドについて同様に記載]

## 推奨アクション
1. 不足しているテストケース一覧
2. 改善が必要なテストケース一覧
3. 削除可能な不要テスト一覧
```

## 技術的制約
- Jest + TypeScriptを使用
- モックはvi.fn()を使用
- REAL_DATA_MODE=falseでテスト実行
- 実APIへの接続は行わない

## 出力要件
- 監査レポート: `tasks/outputs/test-audit-report.md`
- 実装必要テスト一覧: `tasks/outputs/required-tests.md`

## 品質基準
- すべての使用APIメソッドにテストが存在すること
- テストが実際の使用方法を反映していること
- 不要なテストがないこと（YAGNI原則）

## 完了条件
- 全対象ファイルの監査完了
- 監査レポート作成完了
- 次フェーズへの推奨事項明確化