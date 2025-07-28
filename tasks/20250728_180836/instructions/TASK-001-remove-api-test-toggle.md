# TASK-001: RUN_REAL_API_TESTS環境変数削除と実APIテスト統一

## 概要
テストを実APIテストのみに統一し、RUN_REAL_API_TESTS環境変数による分岐を完全に削除します。

## 背景
- 現在、テストの実行にRUN_REAL_API_TESTS環境変数による分岐が存在
- ユーザーの方針：テストは常に実APIを使用し、実行タイミングのみを制御
- 不要な分岐ロジックを削除してコードをシンプル化

## タスク詳細

### 1. kaito-api/real-api/real-integration.test.tsの更新
```typescript
// 削除すべき行
const REAL_API_ENABLED = process.env.KAITO_API_TOKEN && process.env.RUN_REAL_API_TESTS === 'true';

// 変更後
const REAL_API_ENABLED = !!process.env.KAITO_API_TOKEN;

// また、すべての条件分岐でRUN_REAL_API_TESTSのチェックを削除
if (!REAL_API_ENABLED) {
  console.log('⚠️ Real API tests skipped - set KAITO_API_TOKEN');
  return;
}
```

### 2. kaito-api/integration/real-api-integration.test.tsの更新
同様に、REAL_API_ENABLEDの条件からRUN_REAL_API_TESTSを削除

### 3. その他のテストファイル確認
tests/kaito-api配下で、RUN_REAL_API_TESTSを使用しているファイルがあれば同様に更新

## 実装要件

### 必須要件
1. **環境変数チェックの簡略化**
   - RUN_REAL_API_TESTS のチェックを完全に削除
   - KAITO_API_TOKEN の存在のみでテスト実行を判断

2. **エラーメッセージの更新**
   - "set RUN_REAL_API_TESTS=true and KAITO_API_TOKEN" → "set KAITO_API_TOKEN"

3. **コメントの更新**
   - 環境変数に関するコメントからRUN_REAL_API_TESTSの記述を削除

### 品質基準
- TypeScript型チェック通過
- 既存のテストロジックに影響なし
- 実APIテストがKAITO_API_TOKENのみで実行可能

## 制約事項
- テストロジック自体は変更しない（環境変数チェックのみ）
- モック実装は残す（通常のunit testで使用）
- 実APIへの接続はKAITO_API_TOKENの有無で制御

## ファイル一覧
- tests/kaito-api/real-api/real-integration.test.ts
- tests/kaito-api/integration/real-api-integration.test.ts
- tests/kaito-api/run-integration-tests.ts（存在する場合）
- その他RUN_REAL_API_TESTSを使用しているテストファイル

## 完了条件
1. すべてのテストファイルからRUN_REAL_API_TESTSの参照が削除されている
2. KAITO_API_TOKENのみでテスト実行制御が可能
3. テストが正常に動作することを確認（ただし実行は不要）