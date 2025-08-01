# TASK-002: ツイートID一括取得エンドポイントのテスト実装

## 目的
TASK-001で実装する`getTweetsByIds`メソッドの包括的なテストを作成する。

## 実装要件

### 1. テストファイル作成
**新規ファイル**: `/tests/kaito-api/endpoints/tweet-batch-endpoints.test.ts`

### 2. テストケース

#### 基本機能テスト
1. **正常系**
   - 単一IDでの取得成功
   - 複数ID（2-5個）での取得成功
   - 最大数（100個）での取得成功

2. **バリデーションエラー**
   - 空配列の拒否
   - 101個以上のIDの拒否
   - 無効なID形式（非数値）の拒否
   - null/undefinedの拒否

3. **API認証エラー**
   - APIキー未設定時のエラー
   - 無効なAPIキー時のエラー

4. **部分的成功**
   - 一部のIDが見つからない場合の処理
   - 一部のIDでエラーが発生した場合の処理

#### エッジケーステスト
1. **ID重複処理**
   - 同じIDが複数含まれる場合

2. **レスポンス処理**
   - 空のレスポンス処理
   - 異常なレスポンス構造の処理

### 3. モック設定

#### HTTPクライアントモック
```typescript
const mockHttpClient = {
  get: vi.fn()
} as unknown as HttpClient;
```

#### 認証マネージャーモック
```typescript
const mockAuthManager = {
  isAuthenticated: vi.fn().mockReturnValue(true),
  getApiKey: vi.fn().mockReturnValue('test-api-key')
} as unknown as AuthManager;
```

#### レスポンスモック例
```typescript
const mockSuccessResponse = {
  tweets: [
    {
      id: '1234567890',
      text: 'Test tweet',
      created_at: '2025-01-01T00:00:00Z',
      author: { id: '987654321', userName: 'testuser' },
      public_metrics: {
        retweet_count: 10,
        like_count: 20,
        reply_count: 5,
        quote_count: 2
      }
    }
  ]
};
```

### 4. テスト構造

```typescript
describe('TweetSearchEndpoint - getTweetsByIds', () => {
  let endpoint: TweetSearchEndpoint;
  
  beforeEach(() => {
    vi.clearAllMocks();
    endpoint = new TweetSearchEndpoint(mockHttpClient, mockAuthManager);
  });

  describe('正常系', () => {
    // 各正常系テスト
  });

  describe('エラー処理', () => {
    // 各エラーケーステスト
  });

  describe('エッジケース', () => {
    // 各エッジケーステスト
  });
});
```

## 参照ドキュメント
- `docs/kaito-api.md` - KaitoAPI仕様書（エンドポイント仕様）
- `docs/directory-structure.md` - テストディレクトリ構造
- 既存テストファイル - テストパターンの参考

## 品質要件
- Vitestフレームワーク使用
- 既存のテストパターンに従う
- カバレッジ90%以上
- 明確なテスト名とアサーション

## 注意事項
- TASK-001の実装と並列で作業可能
- 既存の`getTweetById`のテストパターンを参考にする
- モックデータは最小限に留める
- 実APIテストは含めない（単体テストのみ）

## 完了条件
- すべてのテストケースが実装されている
- テストが正常に実行される（実装完了後）
- TypeScriptのコンパイルエラーがない
- テストコードが読みやすく保守しやすい