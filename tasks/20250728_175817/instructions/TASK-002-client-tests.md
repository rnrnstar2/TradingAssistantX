# 指示書: KaitoApiClient テスト整備

## タスク概要
KaitoApiClient（KaitoTwitterAPIClient）クラスの使用メソッドに対するテストを整備・改善する。

## 対象メソッド
以下の3つのメソッドのテストを完璧にする：
1. `post(content: string)` - 投稿作成
2. `retweet(tweetId: string)` - リツイート
3. `like(tweetId: string)` - いいね

## 実装要件

### 1. 既存テストの改善
`/tests/kaito-api/core/client.test.ts`を確認し、以下を実装：

#### post()メソッドテスト
```typescript
describe('post', () => {
  // 正常系
  it('should post successfully with valid content')
  it('should handle post with emoji and special characters')
  it('should trim whitespace from content')
  
  // 異常系
  it('should throw error when content is empty')
  it('should throw error when content exceeds 280 characters')
  it('should handle network errors gracefully')
  it('should retry on temporary failures')
  it('should handle rate limit errors')
  
  // 境界値
  it('should post exactly 280 characters')
  it('should post single character')
  it('should handle multi-byte characters (日本語、絵文字)')
});
```

#### retweet()メソッドテスト
```typescript
describe('retweet', () => {
  // 正常系
  it('should retweet successfully with valid tweet ID')
  it('should return correct retweet result structure')
  
  // 異常系
  it('should throw error when tweet ID is empty')
  it('should throw error when tweet ID is invalid format')
  it('should handle already retweeted error')
  it('should handle tweet not found error')
  it('should handle network errors')
  
  // 境界値
  it('should handle tweet ID edge cases')
});
```

#### like()メソッドテスト
```typescript
describe('like', () => {
  // 正常系
  it('should like tweet successfully')
  it('should return correct like result structure')
  
  // 異常系
  it('should throw error when tweet ID is empty')
  it('should throw error when tweet ID is invalid')
  it('should handle already liked error')
  it('should handle tweet not found error')
  it('should handle permission errors')
  
  // QPS制御
  it('should respect QPS limits')
});
```

### 2. モック実装要件
- fetch APIのモック化
- QPS制御のモック化（タイマー使用）
- 認証状態のモック化
- エラーレスポンスの適切なモック

### 3. テストユーティリティ作成
必要に応じて以下のヘルパー関数を作成：
```typescript
// テストヘルパー
function createMockClient(overrides?: Partial<KaitoClientConfig>): KaitoTwitterAPIClient
function mockSuccessResponse(data: any): void
function mockErrorResponse(status: number, error: string): void
function waitForQPS(): Promise<void>
```

### 4. 統合テストの考慮
- 認証→投稿の一連のフロー
- レート制限到達→待機→リトライのフロー
- エラー→リトライ→成功のフロー

## 技術的制約
- vi.useFakeTimers()でタイマー制御
- vi.fn()でモック作成
- async/awaitの適切な使用
- TypeScript strictモード準拠

## 品質基準
- カバレッジ90%以上（該当メソッドのみ）
- すべてのエラーケースをカバー
- 実際の使用パターンを反映
- テスト実行時間3秒以内

## 出力要件
- 改善されたテストファイル: `/tests/kaito-api/core/client.test.ts`
- テスト実行結果レポート: `tasks/outputs/client-test-results.md`

## 完了条件
- すべての必須テストケース実装
- テストが全て成功
- カバレッジ基準達成
- TypeScript型チェック通過