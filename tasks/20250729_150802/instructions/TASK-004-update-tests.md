# TASK-004: テストの修正と動作確認

## 🎯 タスク概要
Worker1-3の修正に伴い、関連するテストを修正し、全体の動作確認を行う。

## 📚 必須読み込み
- `/Users/rnrnstar/github/TradingAssistantX/REQUIREMENTS.md` - MVP要件定義書を必ず読み込むこと
- `/Users/rnrnstar/github/TradingAssistantX/docs/workflow.md` - ワークフロー仕様書を確認
- Worker1-3の報告書を確認して修正内容を把握

## 🎯 実装詳細

### 1. 修正対象ファイル
- `tests/integration/main-system-integration.test.ts`
- `tests/claude/endpoints/decision-endpoint.test.ts`（存在する場合）
- その他影響を受けるテストファイル

### 2. 主要な修正内容

#### 2.1 統合テストの修正
`main-system-integration.test.ts`の修正:
- makeDecision関連のモックを削除
- YAML固定アクション使用のテストケースに変更
- 3ステップフローのテストに修正

#### 2.2 decision-endpointテストの処理
存在する場合:
- describe.skipを使用してテストをスキップ
- 非推奨コメントを追加
- テスト自体は削除しない（将来の参照用）

#### 2.3 新しいテストケースの追加
以下のシナリオをカバー:
- dev実行時のYAML固定アクション使用
- schedule.yamlが存在しない場合のエラーハンドリング
- 固定アクションの正常実行

### 3. 動作確認タスク

#### 3.1 型チェック
```bash
pnpm type-check
```
- TypeScriptエラーがないことを確認
- 特にmakeDecision削除による型エラーに注意

#### 3.2 テスト実行
```bash
pnpm test
```
- 全テストが通過することを確認
- スキップされたテストの適切な処理

#### 3.3 dev実行確認
```bash
pnpm dev
```
- 実際にdev実行が正常に動作することを確認
- YAML固定アクションが使用されることを確認
- ログ出力の確認

### 4. 品質基準
- 全テストが通過（スキップを除く）
- TypeScriptエラーなし
- dev実行の正常動作確認
- ドキュメントとの整合性

### 5. 検証項目
- [ ] makeDecision削除によるエラーがないか
- [ ] YAML固定アクション使用が正しく動作するか
- [ ] エラーハンドリングが適切か
- [ ] ログ出力が期待通りか

## 📋 完了条件
- [ ] 統合テストの修正完了
- [ ] decision-endpointテストの適切な処理
- [ ] 型チェック通過
- [ ] 全テスト通過（スキップ除く）
- [ ] dev実行の動作確認完了

## 🚫 制約事項
- MVP要件を超える機能追加は禁止
- 既存の正常動作しているテストは削除しない
- テストカバレッジの低下を避ける

## 📁 出力管理
- 修正ファイルは既存の場所にそのまま保存
- 報告書: `tasks/20250729_150802/reports/REPORT-004-update-tests.md`
- 動作確認結果を報告書に詳細に記載

## 🔄 実行順序
このタスクはWorker1-3の完了後に実行すること。
前提条件:
- TASK-001: MainWorkflowの修正完了
- TASK-002: dev.tsの修正完了
- TASK-003: decision-endpointの非推奨化完了