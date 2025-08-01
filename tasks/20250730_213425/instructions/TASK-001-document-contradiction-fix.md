# 深夜分析ドキュメント矛盾修正指示書

## タスク概要
docs/deep-night-analysis.mdと他のドキュメント（workflow.md、directory-structure.md、claude.md、kaito-api.md）間の矛盾を修正し、整合性を確保する。

## 修正対象ファイル
- docs/deep-night-analysis.md（主要修正対象）

## 修正項目

### 1. 実行フローの明確化

#### 現状の問題
- 「通常のワークフローは3ステップ」の記述が不正確
- Step番号の不整合

#### 修正内容
- dev実行とスケジュール実行の違いを明記
- 深夜分析が通常ワークフロー完了後の追加ステップであることを明確化
- Step番号を以下のように整理：
  - 通常ワークフロー: Step 1-3（データ収集→アクション実行→結果保存）
  - 深夜分析: 追加ステップ（23:55のみ実行）

### 2. ディレクトリ構造の整合性

#### 修正内容
- Claude プロンプトログの出力先を明記：
  ```
  data/current/execution-YYYYMMDD-HHMM/claude-outputs/prompts/
  ```
- analysis-endpoint.tsへの言及を削除（ファイルは既に削除済み）

### 3. 実装メソッドの明確化

#### 修正内容
- executeAnalyzeAction()への言及を削除（analyzeアクションは未実装）
- executeDeepNightAnalysis()が追加ステップとして実行されることを明記
- 通常のアクション実行後に深夜分析が追加実行される流れを明確化

### 4. 学習データファイルの整理

#### 修正内容
- MVP版では以下の2ファイルのみであることを強調：
  - engagement-patterns.yaml（時間帯・形式・パターン統合）
  - successful-topics.yaml（投資教育特化トピック）
- time-slot-performance.yamlへの言及を削除

### 5. KaitoAPI連携の明確化

#### 修正内容
- getTweetsByIdsエンドポイントの詳細を追記
- 最大100件のツイートID一括取得可能であることを明記
- tweet.fieldsパラメータの重要性を強調

## 実装要件

### 品質基準
- 他のドキュメントとの完全な整合性
- 実装状況の正確な反映（未実装機能の明記）
- 読者が混乱しない明確な記述

### 制約事項
- docs/deep-night-analysis.mdのみを修正（他のドキュメントは変更禁止）
- MVP版の仕様として現実的な内容にする
- 実装済み/未実装の区別を明確にする

### 確認事項
- 修正後、以下のドキュメントとの整合性を確認：
  - docs/workflow.md
  - docs/directory-structure.md
  - docs/claude.md
  - docs/kaito-api.md