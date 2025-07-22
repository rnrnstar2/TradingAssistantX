# Worker 5: ルートファイル整理・統合タスク

## 🎯 担当領域
`data/` ルートレベルの散在ファイルを適切なディレクトリに整理統合

## 📋 整理対象ファイル（現在のルートレベル）
```
data/
├── account-analysis-data.yaml
├── account-config.yaml
├── account-strategy.yaml
├── action-collection-strategies.yaml
├── autonomous-config.yaml (重複チェック)
├── claude-summary.yaml
├── content-strategy.yaml
├── current-situation.yaml
├── daily-action-data.yaml
├── decision-logs.yaml
├── growth-targets.yaml
├── metrics-history.yaml
├── mvp-config.yaml
├── multi-source-config.yaml
├── posting-data.yaml
├── posting-history.yaml
├── scraped.yaml
└── source-credentials.yaml.template
```

## 🚀 実行タスク

### Phase 1: ファイル分類・分析
各ファイルの内容と役割を分析し、適切な移動先を決定：

#### config/ 移動候補:
- `autonomous-config.yaml` (重複チェック)
- `mvp-config.yaml`
- `multi-source-config.yaml`
- `source-credentials.yaml.template`

#### current/ 移動候補:
- `current-situation.yaml`
- `account-strategy.yaml`
- `daily-action-data.yaml`
- `posting-data.yaml`

#### learning/ 移動候補:
- `metrics-history.yaml`
- `posting-history.yaml`
- `growth-targets.yaml`
- `content-strategy.yaml`

#### archives/ 移動候補:
- `account-analysis-data.yaml`
- `decision-logs.yaml`
- `claude-summary.yaml`
- `action-collection-strategies.yaml`

### Phase 2: 不要ディレクトリの整理
以下の不要ディレクトリを確認・整理：
- `autonomous-sessions/` → archives/適切な月に移動
- `context/` → archives/適切な月に移動
- `core/` → current/または削除判断
- `metrics/` → 空なら削除、データあればlearning/に統合

### Phase 3: 特殊ファイルの処理
- `scraped.yaml` → 内容確認後、適切な分類または削除
- 重複ファイルの統合処理
- テンプレートファイルの適切な配置

### Phase 4: 最終検証・クリーンアップ
1. ルートレベルがREQUIREMENTS.md構造のみになることを確認
2. 移動したファイルの整合性確認
3. 不要な空ディレクトリの削除

## ✅ 完了条件
- [ ] data/ ルートレベルが目標の4ディレクトリのみ
- [ ] すべてのファイルが適切なディレクトリに分類
- [ ] 重複ファイルの統合完了
- [ ] 不要ディレクトリ・ファイルの削除完了
- [ ] データ損失ゼロでの整理完了

## ⚠️ 注意事項
- **他Workers協調**: config/, current/, learning/, archives/の担当Workerと重複回避
- **データ保全**: 移動前にファイル内容の重要度確認
- **統合判断**: 同様の役割ファイルは統合検討
- **REQUIREMENTS.md準拠**: 最終構造が完全に要件に合致することを確認