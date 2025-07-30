# TASK-004: Claudeテスト実行確認・修正

## 📋 タスク概要
前のタスクで実装された修正を適用後、全てのClaudeテストが正常に実行されることを確認し、必要に応じて追加の修正を行う。

## 🎯 目的
- 全てのClaudeテストが正常に実行されることを確認
- テストカバレッジが90%以上であることを確認
- 実行時間が妥当な範囲内であることを確認

## 📁 対象ファイル
- `tests/claude/endpoints/content-endpoint.test.ts`
- `tests/claude/endpoints/analysis-endpoint.test.ts`
- `tests/claude/endpoints/search-endpoint.test.ts`
- `tests/claude/types.test.ts`
- `tests/claude/index.test.ts`

## 🔧 実装詳細

### 1. テスト実行と問題の特定

各テストファイルを個別に実行し、エラーを特定：

```bash
# 個別テスト実行
pnpm test tests/claude/endpoints/content-endpoint.test.ts
pnpm test tests/claude/endpoints/analysis-endpoint.test.ts
pnpm test tests/claude/endpoints/search-endpoint.test.ts
pnpm test tests/claude/types.test.ts
pnpm test tests/claude/index.test.ts
```

### 2. よくある問題と解決方法

#### タイムアウトエラーの場合
- モック実装が正しく動作していない可能性
- `shouldUseMock()`が`true`を返すことを確認
- テストファイルの先頭で環境変数を設定：

```typescript
// 各テストファイルの先頭に追加
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.USE_CLAUDE_MOCK = 'true';
});
```

#### インポートエラーの場合
- パスが正しいか確認
- 新規作成したファイルが存在するか確認
- TypeScriptの設定が正しいか確認

#### 型エラーの場合
- モックデータの型が実際の型と一致しているか確認
- 型ガード関数が正しく動作しているか確認

### 3. テストの調整

#### スキップされているテストの確認
実際のClaude APIを使用するテストで、モックでは再現が難しいものは`test.skip`のままにする：

```typescript
test.skip('Claude API失敗時のフォールバック処理', async () => {
  // 実際のAPIを使用するためスキップ
});
```

#### タイムアウト値の調整
モックを使用する場合、タイムアウトを短くできる：

```typescript
test('正常系：有効な入力で適切なコンテンツを生成', async () => {
  // テスト実装
}, 10000); // 60000 -> 10000 に短縮
```

### 4. テストカバレッジの確認

```bash
# カバレッジレポートの生成
pnpm test:coverage tests/claude/

# カバレッジの確認
# - statements: 90%以上
# - branches: 85%以上
# - functions: 90%以上
# - lines: 90%以上
```

### 5. 追加の修正が必要な場合

#### モックレスポンスの改善
実際のテストケースに合わせてモックレスポンスを調整：

```typescript
// mock-responses.ts の改善例
export function generateMockContent(topic: string, contentType: string = 'educational'): string {
  // テストケースに応じた適切なレスポンスを返す
  if (topic === '') {
    throw new Error('Topic cannot be empty');
  }
  // ... 既存の実装
}
```

#### エラーケースの追加
エラーハンドリングのテストのために、エラーを発生させるモック：

```typescript
export function generateMockError(errorType: string): never {
  const errors: Record<string, string> = {
    timeout: 'Operation timed out',
    invalid_input: 'Invalid input provided',
    api_error: 'Claude API error'
  };
  
  throw new Error(errors[errorType] || 'Unknown error');
}
```

## ✅ 完了条件
- [ ] 全てのClaudeテストが正常に実行される（スキップされたもの以外）
- [ ] テストカバレッジが90%以上
- [ ] 実行時間が30秒以内（モック使用時）
- [ ] `pnpm typecheck`でエラーが発生しない
- [ ] CI/CDパイプラインでテストが通る

## 📝 注意事項
- モック実装により、実際のClaude APIの動作とは異なる可能性がある
- 本番環境では実際のAPIを使用するため、定期的な統合テストが必要
- テストの実行速度とカバレッジのバランスを考慮

## 🚀 実行コマンド
```bash
# 環境変数の設定
export NODE_ENV=test
export USE_CLAUDE_MOCK=true

# 全テスト実行
pnpm test tests/claude/

# カバレッジ付き実行
pnpm test:coverage tests/claude/

# 型チェック
pnpm typecheck

# lint実行
pnpm lint
```

## 📊 期待される結果
```
Test Suites: 5 passed, 5 total
Tests:       XX passed, YY skipped, XX total
Snapshots:   0 total
Time:        < 30s
Coverage:    > 90%
```