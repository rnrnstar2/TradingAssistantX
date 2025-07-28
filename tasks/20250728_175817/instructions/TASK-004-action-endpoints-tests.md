# 指示書: ActionEndpoints テスト整備

## タスク概要
ActionEndpointsクラスのpost()とlike()メソッドに対する完全なテストを実装する。

## 対象メソッド
1. `post(text: string)` - 投稿作成
2. `like(tweetId: string)` - いいね

## 実装要件

### 1. テストファイル確認・作成
`/tests/kaito-api/endpoints/action-endpoints.test.ts`を確認し、必要なテストを実装。

### 2. post()メソッドテスト

#### 正常系テスト
```typescript
describe('ActionEndpoints - post', () => {
  // 基本投稿
  it('should create a post successfully')
  it('should return correct post result structure')
  it('should handle text with various content types')
  
  // 文字処理
  it('should preserve whitespace and formatting')
  it('should handle emojis correctly')
  it('should handle multi-language text')
  
  // レスポンス検証
  it('should include tweet ID in response')
  it('should include creation timestamp')
  it('should include success flag')
});
```

#### 異常系テスト
```typescript
// エラーケース
it('should throw error when text is empty')
it('should throw error when text exceeds limit')
it('should handle network errors')
it('should handle authentication errors')
it('should handle rate limit errors')
it('should retry on temporary failures')
```

#### 境界値テスト
```typescript
// 境界条件
it('should post exactly 1 character')
it('should post exactly 280 characters')
it('should count multi-byte characters correctly')
it('should handle line breaks and special characters')
```

### 3. like()メソッドテスト

#### 正常系テスト
```typescript
describe('ActionEndpoints - like', () => {
  // 基本いいね
  it('should like a tweet successfully')
  it('should return correct like result structure')
  
  // バリデーション
  it('should validate tweet ID format')
  it('should handle numeric tweet IDs')
  it('should handle string tweet IDs')
});
```

#### 異常系テスト
```typescript
// エラーケース
it('should throw error when tweet ID is empty')
it('should throw error for invalid tweet ID format')
it('should handle tweet not found error')
it('should handle already liked error gracefully')
it('should handle permission denied error')
it('should handle rate limit for likes')
```

### 4. 統合シナリオテスト
```typescript
describe('ActionEndpoints - integration scenarios', () => {
  it('should post and then like the same tweet')
  it('should handle multiple posts in sequence')
  it('should respect rate limits across operations')
  it('should maintain authentication state')
});
```

### 5. モック実装仕様

#### 基本モック構造
```typescript
const mockHttpClient = {
  post: vi.fn(),
  delete: vi.fn()
};

const mockAuthManager = {
  isAuthenticated: vi.fn().mockReturnValue(true),
  getAuthHeaders: vi.fn().mockReturnValue({
    'Authorization': 'Bearer test-token'
  })
};
```

#### 成功レスポンスモック
```typescript
// Post success
mockHttpClient.post.mockResolvedValue({
  data: {
    id: '1234567890',
    text: 'Test post',
    created_at: '2024-01-28T10:00:00Z'
  }
});

// Like success
mockHttpClient.post.mockResolvedValue({
  data: {
    liked: true
  }
});
```

#### エラーレスポンスモック
```typescript
// Rate limit
mockHttpClient.post.mockRejectedValue({
  response: { 
    status: 429,
    headers: {
      'x-rate-limit-remaining': '0',
      'x-rate-limit-reset': '1234567890'
    }
  }
});

// Already liked
mockHttpClient.post.mockRejectedValue({
  response: { 
    status: 409,
    data: {
      error: 'You have already liked this Tweet'
    }
  }
});
```

### 6. ヘルパー関数
```typescript
// テストユーティリティ
function createActionEndpoints(overrides?: any): ActionEndpoints {
  const httpClient = overrides?.httpClient || mockHttpClient;
  const authManager = overrides?.authManager || mockAuthManager;
  return new ActionEndpoints(httpClient, authManager);
}

function expectValidPostResult(result: any): void {
  expect(result).toHaveProperty('id');
  expect(result).toHaveProperty('text');
  expect(result).toHaveProperty('timestamp');
  expect(result).toHaveProperty('success', true);
}

function expectValidLikeResult(result: any): void {
  expect(result).toHaveProperty('tweetId');
  expect(result).toHaveProperty('timestamp');
  expect(result).toHaveProperty('success', true);
}
```

## 技術的制約
- 完全モック実装（実API接続禁止）
- vi.fn()使用
- TypeScript型安全性維持
- エラーハンドリングの完全性

## 品質基準
- 該当メソッドのカバレッジ95%以上
- 実使用パターンの反映
- エラーケースの網羅
- レスポンス型の正確性

## 出力要件
- テストファイル: `/tests/kaito-api/endpoints/action-endpoints.test.ts`
- テスト結果レポート: `tasks/outputs/action-endpoints-test-results.md`

## 完了条件
- 全テストケース実装
- テスト実行成功
- 型チェック通過
- コードレビュー基準達成