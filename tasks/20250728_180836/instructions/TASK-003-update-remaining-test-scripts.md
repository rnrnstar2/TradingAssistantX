# TASK-003: その他のテストスクリプトとClaudeテストの更新

## 概要
RUN_REAL_API_TESTS環境変数を参照している残りのファイルを特定し、すべて更新します。

## 背景
- TASK-001, TASK-002で主要なファイルを更新
- 残存するRUN_REAL_API_TESTSの参照を完全に削除
- 見落としがないように全ファイルを確認

## タスク詳細

### 1. 全ファイル検索とクリーンアップ
```bash
# まず全ファイル検索を実行
grep -r "RUN_REAL_API_TESTS" . --exclude-dir=node_modules --exclude-dir=.git
```

検索で見つかったすべてのファイルを以下の方針で更新：

### 2. tests/kaito-api/run-integration-tests.ts（存在する場合）
```typescript
// 変更前
const apiKey = process.env.KAITO_API_TOKEN;
if (!process.env.RUN_REAL_API_TESTS) {
  throw new Error('RUN_REAL_API_TESTS環境変数が設定されていません');
}

// 変更後
const apiKey = process.env.KAITO_API_TOKEN;
if (!apiKey) {
  throw new Error('KAITO_API_TOKEN環境変数が設定されていません');
}
```

### 3. Claudeテストファイルの確認
以下のファイルでRUN_REAL_API_TESTSの使用があれば同様に削除：
- tests/claude/index.test.ts
- tests/claude/endpoints/*.test.ts
- tests/claude/types.test.ts

### 4. タスクディレクトリ内のドキュメント
tasks/配下のドキュメントでRUN_REAL_API_TESTSに言及があれば更新

### 5. スクリプトファイルの確認
scripts/配下のファイルがあれば確認・更新

## 実装要件

### 必須手順
1. **全ファイル検索実行**
   ```bash
   grep -r "RUN_REAL_API_TESTS" . --exclude-dir=node_modules --exclude-dir=.git
   ```

2. **検索結果の各ファイル更新**
   - RUN_REAL_API_TESTS=trueのチェックをKAITO_API_TOKENの存在チェックに変更
   - コメントや文字列からRUN_REAL_API_TESTSを削除
   - エラーメッセージを適切に更新

3. **更新後の確認**
   - 再度全ファイル検索を実行し、残存がないことを確認

### 品質基準
- すべてのRUN_REAL_API_TESTSの参照が削除されている
- 代替ロジックが適切に機能する
- エラーメッセージが分かりやすい

## 制約事項
- git管理外のファイル（node_modules等）は対象外
- バックアップファイル（*.backup.*）は除外
- 歴史的なタスクディレクトリ内のファイルは参考情報として残す

## 特別な注意事項
### Claudeテストについて
Claudeテストは主にモック使用のため、RUN_REAL_API_TESTSの使用は少ないと予想。ただし：
- 実際にClaude APIを呼び出すテストがあれば、CLAUDE_API_KEYでの制御に変更
- モックテストはそのまま維持

## 完了条件
1. `grep -r "RUN_REAL_API_TESTS" . --exclude-dir=node_modules --exclude-dir=.git` の結果が空になる
2. 各ファイルで適切な代替ロジックが実装されている
3. テスト実行時のエラーメッセージが適切