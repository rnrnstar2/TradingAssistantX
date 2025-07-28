# 実装必要テスト一覧

## 概要
Kaito APIテスト監査の結果、既存のテストカバレッジは非常に高く、指示書で要求されているすべてのメソッドに対してテストが実装されています。以下は追加実装を推奨するテストケースです。

## 優先度: 高

### 1. ActionEndpoints.uploadMedia()メソッドのテスト
**ファイル**: `/tests/kaito-api/endpoints/action-endpoints.test.ts`に追加

```typescript
describe('uploadMedia - メディアアップロード機能', () => {
  it('should upload image successfully', async () => {
    // 画像アップロードの正常系テスト
  });

  it('should reject oversized media', async () => {
    // 5MB超過ファイルの拒否テスト
  });

  it('should reject unsupported media types', async () => {
    // サポート外メディアタイプの拒否テスト
  });
});
```

**理由**: メディアアップロード機能は実装されているが、テストが存在しない

## 優先度: 中

### 2. 互換メソッドの直接テスト
**ファイル**: `/tests/kaito-api/endpoints/action-endpoints.test.ts`に追加

```typescript
describe('Execution-flow compatibility methods', () => {
  describe('post() - 互換メソッド', () => {
    it('should delegate to createPost correctly', async () => {
      // post()がcreatePost()を正しく呼び出すことを確認
    });
  });

  describe('like() - 互換メソッド', () => {
    it('should delegate to performEngagement correctly', async () => {
      // like()がperformEngagement()を正しく呼び出すことを確認
    });
  });

  describe('retweet() - 互換メソッド', () => {
    it('should delegate to performEngagement correctly', async () => {
      // retweet()がperformEngagement()を正しく呼び出すことを確認
    });
  });
});
```

**理由**: 互換メソッドは実装されているが、直接のテストがない。実際の使用パスを確認するために追加を推奨

## 優先度: 低

### 3. エッジケースの追加テスト
**ファイル**: 各テストファイルに追加

```typescript
// 極端に長いツイートIDのテスト
it('should handle 19-digit tweet IDs correctly', async () => {
  const longTweetId = '9'.repeat(19);
  // テスト実装
});

// 空白のみのコンテンツテスト
it('should reject whitespace-only content', async () => {
  const whitespaceContent = '   \t\n   ';
  // テスト実装
});
```

**理由**: 既存テストは十分だが、さらなる堅牢性のために追加可能

## 実装不要なテスト

以下のメソッドは指示書に含まれていないため、YAGNI原則に従いテストの追加は不要：
- getUserLastTweets() - モック実装のみ
- getExecutionMetrics() - 内部メトリクス用
- その他の内部ユーティリティメソッド

## 実装ガイドライン

### テスト実装時の注意点
1. **モックの使用**: `vi.fn()`を使用して外部依存を適切にモック化
2. **非同期処理**: `async/await`を使用して非同期テストを記述
3. **エラーケース**: 必ず正常系と異常系の両方をテスト
4. **型安全性**: TypeScriptの型を活用してテストの信頼性を向上

### テストの実行方法
```bash
# 単体テストの実行
npm test

# カバレッジレポート付きテスト
npm run test:coverage

# 特定のファイルのみテスト
npm test action-endpoints.test.ts
```

## まとめ
現在のテストカバレッジは既に優秀であり、追加が必要なテストは最小限です。主にuploadMedia()メソッドのテストが不足しているため、これを優先的に実装することを推奨します。互換メソッドのテストは、実装の正確性を確認するために追加することで、さらなる信頼性向上が期待できます。