# 指示書: TweetEndpoints searchTweets テスト整備

## タスク概要
TweetEndpointsクラスのsearchTweetsメソッドに対する完全なテストを実装する。

## 対象メソッド
`searchTweets(options: TweetSearchOptions)` - ツイート検索機能

## 実装要件

### 1. テストファイル確認・作成
`/tests/kaito-api/endpoints/tweet-endpoints.test.ts`を確認し、searchTweetsメソッドのテストを実装。

### 2. 必須テストケース

#### 正常系テスト
```typescript
describe('searchTweets', () => {
  // 基本検索
  it('should search tweets with basic query')
  it('should return correct search result structure')
  it('should handle empty results gracefully')
  
  // 検索オプション
  it('should apply max_results parameter correctly')
  it('should handle sort_order parameter')
  it('should apply date range filters')
  it('should handle language filters')
  
  // 複雑なクエリ
  it('should handle complex query with operators')
  it('should handle hashtag searches')
  it('should handle mention searches')
  it('should exclude retweets when specified')
});
```

#### 異常系テスト
```typescript
// エラーハンドリング
it('should throw error when query is empty')
it('should throw error when query is too long')
it('should handle invalid query syntax')
it('should handle API rate limit errors')
it('should handle network timeouts')
it('should handle unauthorized access')
```

#### 境界値テスト
```typescript
// 境界条件
it('should handle minimum query length (1 char)')
it('should handle maximum query length')
it('should handle special characters in query')
it('should handle Unicode characters')
it('should handle max_results boundary (1-100)')
```

### 3. モック実装詳細

#### HTTPクライアントモック
```typescript
const mockHttpClient = {
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn()
};

// 成功レスポンスモック
mockHttpClient.get.mockResolvedValue({
  data: [
    {
      id: '123456789',
      text: 'Test tweet',
      author_id: 'user123',
      created_at: '2024-01-28T10:00:00Z',
      metrics: {
        like_count: 10,
        retweet_count: 5,
        reply_count: 2
      }
    }
  ],
  meta: {
    result_count: 1,
    next_token: null
  }
});
```

#### エラーレスポンスモック
```typescript
// Rate limit error
mockHttpClient.get.mockRejectedValue({
  response: { status: 429 },
  message: 'Rate limit exceeded'
});

// Invalid query error
mockHttpClient.get.mockRejectedValue({
  response: { status: 400 },
  message: 'Invalid query syntax'
});
```

### 4. 検索クエリバリデーション
以下の検索クエリパターンをテスト：
- 基本キーワード: "trading"
- 除外: "crypto -scam"
- ハッシュタグ: "#投資"
- メンション: "@user"
- 言語指定: "lang:ja"
- リツイート除外: "-is:retweet"
- 複合クエリ: "投資 OR トレード -is:retweet lang:ja"

### 5. レスポンス型検証
```typescript
interface ExpectedSearchResult {
  tweets: Array<{
    id: string;
    text: string;
    author: {
      id: string;
      username: string;
      displayName: string;
    };
    metrics: {
      likes: number;
      retweets: number;
      replies: number;
    };
    createdAt: string;
  }>;
  metadata: {
    count: number;
    nextToken?: string;
  };
}
```

## 技術的制約
- HTTPクライアントは完全モック化
- 実APIへの接続禁止
- vi.fn()によるモック実装
- async/awaitパターン使用

## 品質基準
- searchTweetsメソッドのカバレッジ95%以上
- すべての検索パターンをカバー
- エラーケースを網羅
- 型安全性の確保

## 出力要件
- テストファイル: `/tests/kaito-api/endpoints/tweet-endpoints.test.ts`
- テスト結果レポート: `tasks/outputs/tweet-endpoints-test-results.md`

## 完了条件
- 全テストケース実装完了
- テスト実行成功
- 型チェック通過
- 実使用パターンの網羅