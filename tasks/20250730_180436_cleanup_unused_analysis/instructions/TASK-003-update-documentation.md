# TASK-003: ドキュメント更新（analysis-endpoint削除の反映）

## 🎯 タスク概要
Worker1とWorker2によって`analysis-endpoint.ts`とその関連コードが削除されたことをドキュメントに反映する。

## 📋 前提条件
- Worker1により`analysis-endpoint.ts`が削除済み
- Worker2により関連テストが削除済み
- 深夜分析機能は将来実装予定として仕様書は残す

## 🔧 実装内容

### 1. claude.mdの更新
`docs/claude.md`を以下のように更新してください：

#### エンドポイント一覧の修正
```markdown
# 変更前
| `analyzePerformance` | 戦略分析・改善 | 実行結果からの学習と戦略最適化 |

# 変更後
| `analyzePerformance` | 戦略分析・改善 | （深夜分析機能実装時に追加予定） |
```

#### 実装状況の追記
適切な場所に以下の注記を追加：
```markdown
### 📝 実装状況注記
- 深夜分析機能（analyzePerformance, analyzeMarketContext等）は仕様策定済みですが、実装は保留中です
- 詳細仕様は[deep-night-analysis.md](./deep-night-analysis.md)を参照してください
```

### 2. deep-night-analysis.mdの更新
`docs/deep-night-analysis.md`の冒頭に以下の注記を追加してください：

```markdown
> **📝 実装状況**: このドキュメントは深夜分析機能の完全な仕様書です。現在、実装は保留中であり、関連するコード（analysis-endpoint.ts等）は一時的に削除されています。実装時には本仕様書に基づいて開発を行います。
```

### 3. workflow.mdの確認と更新
`docs/workflow.md`を確認し、以下を調整してください：
- analyzeアクション（23:55）の説明に「未実装」の注記を追加
- 実装状況を正確に反映

### 4. メモ・開発ノートの更新
もし`memo.md`やその他の開発ドキュメントにanalysis-endpointへの言及があれば、以下のように更新：
- 「削除済み（深夜分析実装時に再作成予定）」の注記を追加

## ⚠️ 注意事項
- 深夜分析の仕様自体は変更しない（将来の実装用に維持）
- あくまで「実装が保留中」であることを明確にする
- 仕様書の価値を損なわないよう配慮

## ✅ 完了条件
- [ ] `claude.md`に実装状況が正確に反映されている
- [ ] `deep-night-analysis.md`に実装保留の注記が追加されている
- [ ] 他のドキュメントとの整合性が取れている
- [ ] 読者が現在の実装状況を正確に理解できる

## 📝 出力先
- 報告書: `tasks/20250730_180436_cleanup_unused_analysis/reports/REPORT-003-update-documentation.md`
- 更新ドキュメント一覧: `tasks/20250730_180436_cleanup_unused_analysis/outputs/updated-docs-list.txt`