# TASK-002: プロジェクト完了ファイル・アーカイブ整理

## 🎯 実装目標

完了済みプロジェクト関連ファイルを適切な場所にアーカイブし、現在の開発ドキュメント構造をクリーン化する

## 📋 実装対象

### アーカイブ対象ファイル群: 多様情報源拡張プロジェクト
- **対象1**: `docs/multi-source-expansion-requirements.md` (318行)
- **対象2**: `docs/multi-source-architecture.md` (684行)
- **対象3**: `docs/multi-source-testing-strategy.md` (662行)
- **対象4**: `docs/worker-task-assignments.md` (435行)

### アーカイブ先ディレクトリ
- **作成先**: `tasks/completed-projects/multi-source-expansion/`
- **アーカイブ形式**: プロジェクト完了として保存、履歴として参照可能

## ✅ アーカイブ戦略

### 1. プロジェクト分析
**完了プロジェクト**: 多様情報源拡張システム
- Manager最終レポートで完了宣言済み
- Worker向けタスク配分も完了
- 現在の開発フェーズには不要

### 2. アーカイブ判定基準
- **完了済み**: プロジェクトの実装フェーズが完全終了
- **参照頻度**: 日常開発では参照されない専門的な内容
- **独立性**: 他のドキュメントからの依存が少ない
- **履歴価値**: 将来の参照・振り返りのために保存価値あり

### 3. 移動vs削除の判断
**移動採用理由**:
- プロジェクト成果物として履歴価値あり
- 将来の類似プロジェクトで参考になる可能性
- 完全削除はナレッジロスのリスク

## 🔧 実装手順

### Phase 1: アーカイブディレクトリ準備
1. **ディレクトリ作成**
   ```bash
   mkdir -p tasks/completed-projects/multi-source-expansion/{requirements,architecture,testing,assignments}
   ```

2. **アーカイブメタデータ作成**
   - プロジェクト概要ファイル作成
   - 完了日・責任者・成果物一覧を記録

### Phase 2: ファイル移動実行
1. **requirements移動**
   ```bash
   mv docs/multi-source-expansion-requirements.md tasks/completed-projects/multi-source-expansion/requirements/
   ```

2. **architecture移動**
   ```bash
   mv docs/multi-source-architecture.md tasks/completed-projects/multi-source-expansion/architecture/
   ```

3. **testing移動**
   ```bash
   mv docs/multi-source-testing-strategy.md tasks/completed-projects/multi-source-expansion/testing/
   ```

4. **assignments移動**
   ```bash
   mv docs/worker-task-assignments.md tasks/completed-projects/multi-source-expansion/assignments/
   ```

### Phase 3: 参照リンク確認・更新
1. **参照検索**
   ```bash
   # 移動したファイルへの参照を検索
   Grep "multi-source-expansion-requirements" --glob "**/*.md"
   Grep "multi-source-architecture" --glob "**/*.md"
   Grep "multi-source-testing-strategy" --glob "**/*.md"
   Grep "worker-task-assignments" --glob "**/*.md"
   ```

2. **参照更新**
   - 発見された参照を新しいアーカイブパスに更新
   - または関連性が低い場合は参照を削除

### Phase 4: アーカイブ完了記録
1. **移動完了確認**
   - 元の場所にファイルが存在しないことを確認
   - 新しい場所でファイルが正常に配置されていることを確認

2. **アーカイブログ作成**
   ```markdown
   # Multi-Source Expansion Project Archive Log
   
   ## プロジェクト概要
   - プロジェクト名: 多様情報源拡張システム
   - 完了日: 2025-07-21
   - 責任者: Manager (Final Report 作成済み)
   
   ## アーカイブファイル
   1. requirements/multi-source-expansion-requirements.md
   2. architecture/multi-source-architecture.md
   3. testing/multi-source-testing-strategy.md
   4. assignments/worker-task-assignments.md
   
   ## アーカイブ理由
   - プロジェクト実装完了済み
   - Worker配分済み・Manager最終レポート完了
   - 現在の開発フェーズには不要
   ```

## 🚨 制約・注意事項

### 出力管理規則
- **承認された出力場所**: `tasks/20250721_192121_doc_optimization/reports/`
- **報告書ファイル名**: `REPORT-002-project-archiving.md`
- **禁止**: ルートディレクトリへの一時ファイル作成

### アーカイブ安全性
- ファイル移動は完全削除ではない（履歴保持）
- 移動前に必ず他のファイルからの参照を確認
- アーカイブ後も将来のアクセスが可能な構造を維持

### ディレクトリクリーン化
- `docs/` ディレクトリから完了プロジェクト関連ファイルを完全除去
- 現在進行中の開発に集中できる環境を構築

## ✅ 完了基準

1. **移動完了**: 4つの対象ファイルが適切にアーカイブディレクトリに移動済み
2. **参照更新**: 全ての参照リンクが適切に更新または除去済み
3. **ディレクトリクリーン**: `docs/` から完了プロジェクトファイルが除去済み
4. **アーカイブ記録**: 移動の詳細とプロジェクト概要が記録済み
5. **報告書作成**: アーカイブ実行内容と効果の詳細報告

## 🎯 実装優先度

**高**: ドキュメント構造のクリーン化
**実用性重視**: 現在進行中の開発に集中できる環境整備