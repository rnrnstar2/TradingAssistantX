# TASK-001: Claude index.test.ts コンパイルエラー修正

## 📋 タスク概要
`tests/claude/index.test.ts`にある、DEPRECATEDなmakeDecision関連のテストを削除・修正し、コンパイルエラーを解決する。

## 🎯 目的
- index.test.tsのコンパイルエラーを修正
- DEPRECATEDとなったmakeDecision関連のテストをスキップまたは削除
- 型安全性を保ちながらテストを機能させる

## 📁 対象ファイル
- `tests/claude/index.test.ts`

## 🔧 実装詳細

### 1. 削除が必要な箇所

#### 問題のある行とその修正方法：

1. **95行目のエラー修正**
   ```typescript
   // 削除またはコメントアウト
   // const decisionInput: DecisionInput = createMockDecisionInput();
   ```

2. **DEPRECATEDなテストの削除**
   - `test.skip('エンドポイント間の基本的な連携動作確認 (DEPRECATED - uses makeDecision)'` (154-174行)
   - `test.skip('異なるエンドポイント間でのデータフロー確認 (DEPRECATED - uses makeDecision)'` (201-231行)
   - `test.skip('エラー時の統合動作確認 (DEPRECATED - uses makeDecision)'` (247-263行)

### 2. 実装手順

1. **インポートセクションの確認**
   - DEPRECATEDな型（DecisionInput, ClaudeDecision）への参照を削除
   - isClaudeDecisionへの参照を削除

2. **テストケースの修正**
   - makeDecisionを使用している3つのテストは既にskipされているが、完全に削除するか、新しいアプローチで書き直す
   - 95行目周辺のdecisionInputへの参照を削除

3. **型チェックの確認**
   - 修正後、`pnpm typecheck`でエラーがないことを確認

### 3. 修正例

```typescript
// 89-99行目の修正例
test('全型定義の正常エクスポート確認', () => {
  // Return types should be constructible (tested via type guards)
  expect(typeof isGeneratedContent).toBe('function');
  expect(typeof isAnalysisResult).toBe('function');
  expect(typeof isSearchQuery).toBe('function');

  // Input types are checked via TypeScript compilation
  // Here we verify they're accessible
  const contentInput: ContentInput = createMockContentInput();
  const analysisInput: AnalysisInput = createMockAnalysisInput();
  const searchInput: SearchInput = createMockSearchInput();
  // decisionInput関連の行を削除

  expect(contentInput).toBeDefined();
  expect(analysisInput).toBeDefined();
  expect(searchInput).toBeDefined();
});
```

## ✅ 完了条件
- [ ] `pnpm typecheck`でエラーが発生しない
- [ ] `pnpm test tests/claude/index.test.ts`でテストが実行できる（スキップされたテスト以外）
- [ ] DEPRECATEDなコードへの参照が完全に削除されている

## 📝 注意事項
- makeDecision関連の機能は完全に廃止されているため、これらのテストは削除が推奨される
- 他のテストの動作に影響を与えないよう慎重に削除する
- 必要に応じて、新しいワークフローに基づいたテストを後で追加することを検討

## 🚀 実行コマンド
```bash
# 型チェック
pnpm typecheck

# テスト実行
pnpm test tests/claude/index.test.ts
```