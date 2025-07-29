# TASK-002: dev.tsエントリーポイントの修正

## 🎯 タスク概要
`src/dev.ts`を修正して、dev実行時にYAML固定アクションをMainWorkflowに渡すように変更する。

## 📚 必須読み込み
- `/Users/rnrnstar/github/TradingAssistantX/REQUIREMENTS.md` - MVP要件定義書を必ず読み込むこと
- `/Users/rnrnstar/github/TradingAssistantX/docs/workflow.md` - ワークフロー仕様書を確認
- `/Users/rnrnstar/github/TradingAssistantX/data/config/schedule.yaml` - スケジュール設定の構造を確認

## 🎯 実装詳細

### 1. 修正対象ファイル
- `src/dev.ts`

### 2. 主要な修正内容

#### 2.1 固定アクションの選択ロジック追加
dev実行時に使用する固定アクションを決定する処理を追加:
- `schedule.yaml`から1つのアクションを選択
- ランダム選択、または固定インデックス（例：最初のアクション）を使用

#### 2.2 MainWorkflow.execute()への引数追加
現在の実装:
```typescript
const result = await MainWorkflow.execute();
```

修正後:
```typescript
// YAMLから固定アクションを取得
const scheduleData = await loadScheduleData(); // 適切な方法で実装
const fixedAction = scheduleData.daily_schedule[0]; // または適切な選択ロジック

// MainWorkflowに固定アクションを渡す
const result = await MainWorkflow.execute({
  scheduledAction: fixedAction.action,
  scheduledTopic: fixedAction.topic,
  scheduledQuery: fixedAction.target_query
});
```

### 3. 実装要件

#### 3.1 YAMLファイル読み込み
- `data/config/schedule.yaml`を読み込む処理
- yamlパッケージまたは既存のDataManagerを使用
- エラーハンドリングを含める

#### 3.2 アクション選択ロジック
- デフォルト: 最初のアクション（index 0）を使用
- 環境変数やコマンドライン引数での選択も考慮可能（MVP範囲内で）

#### 3.3 ログ出力
- 選択されたアクションをログに出力
- 例: `🎯 開発モード: アクション 'post' (朝の投資教育) を実行`

### 4. 注意事項
- **型安全性**: TypeScript strictモードでエラーが出ないようにする
- **エラーハンドリング**: YAMLファイルが存在しない場合の処理
- **既存の動作維持**: MainWorkflowのインターフェースは変更しない

### 5. 品質基準
- TypeScript型チェック通過
- YAMLファイル読み込みエラーの適切な処理
- 選択されたアクションの明確なログ出力

## 📋 完了条件
- [ ] schedule.yamlからの固定アクション取得実装
- [ ] MainWorkflow.execute()への引数追加
- [ ] エラーハンドリング実装
- [ ] TypeScriptエラーなし
- [ ] ログ出力の実装

## 🚫 制約事項
- MVP要件を超える機能追加は禁止
- 複雑な選択ロジックは不要（シンプルに最初のアクションを使用）
- MainWorkflowのインターフェース変更は最小限に

## 📁 出力管理
- 修正ファイルは既存の場所にそのまま保存
- 報告書: `tasks/20250729_150802/reports/REPORT-002-update-dev-entry-point.md`