# TASK-001: ドキュメント構造分析・重複矛盾チェック

## 🎯 タスク概要
プロジェクト全体のドキュメント構造を調査し、重複ファイル・矛盾する記述・構造的問題を特定して修正提案を作成する。

## 🔍 調査対象領域

### 1. 重複ファイル調査（最重要）
以下の重複ファイルの内容を詳細比較：

```
❌ 重複ファイル確認済み：
- docs/common/naming-conventions.md ⚡️ docs/guides/naming-conventions.md
- docs/common/output-management-rules.md ⚡️ docs/guides/output-management-rules.md
- CLAUDE.md（ルート） ⚡️ docs/CLAUDE.md
```

**調査内容**：
- 各ペアの内容比較（行レベルでの差分）
- どちらが最新・正確な情報か判定
- 統合すべき内容の特定
- 削除すべきファイルの特定

### 2. ディレクトリ構造整合性調査

**現在の構造**：
```
docs/
├── CLAUDE.md（システム概要）
├── architecture.md
├── operations.md
├── reference.md
├── setup.md
├── common/（共通ルール）
│   ├── naming-conventions.md
│   └── output-management-rules.md
├── guides/（ガイドライン）
│   ├── README.md
│   ├── autonomous-system-workflow.md
│   ├── claude-notification-guide.md
│   ├── deletion-safety-rules.md
│   ├── naming-conventions.md
│   ├── optimized-workflow-operations.md
│   ├── output-management-rules.md
│   └── yaml-driven-development.md
└── roles/（権限別仕様）
    ├── manager-role.md
    └── worker-role.md
```

**調査ポイント**：
- `docs/common/` と `docs/guides/` の役割分担の妥当性
- ファイル配置ルールの一貫性
- 各ディレクトリの目的と実際の使用状況の整合性

### 3. ドキュメント内容整合性調査

**ルート CLAUDE.md vs docs/CLAUDE.md 比較**：
- 内容の相違点詳細分析
- どちらがプロジェクト指示として適切か判定
- 統合・整理方針提案

**設定ファイル配置ルール確認**：
- CLAUDE.mdで指定されている「data/ディレクトリ統一配置」ルール
- 各ドキュメントでの設定ファイル配置指示の一貫性
- 実際のファイル配置との整合性

### 4. ドキュメント品質・レガシー調査

**品質チェックポイント**：
- 古い情報・廃止された機能への言及
- 矛盾する指示・ルールの特定
- 不完全・断片的な文書の特定
- リンク切れ・参照エラーの確認

## 🛠️ 実行手順

### Phase 1: 重複ファイル詳細調査
1. **Readツール**で各重複ファイルペアを読み込み
2. **内容比較分析**：
   - 行レベルでの差分特定
   - 情報の新旧判定
   - 独自情報の有無確認
3. **統合戦略立案**：
   - マスターファイル決定
   - 統合すべき内容整理
   - 削除対象ファイル特定

### Phase 2: ディレクトリ構造評価
1. **各ディレクトリの役割分析**
2. **ファイル配置の論理性評価**
3. **最適化提案作成**

### Phase 3: 内容整合性チェック
1. **CLAUDE.md比較分析**
2. **設定ファイル配置ルール検証**
3. **矛盾する指示の特定**

### Phase 4: レガシー・品質問題特定
1. **廃止機能への言及チェック**
2. **不完全文書の特定**
3. **品質改善提案**

## 📋 成果物要件

### 必須成果物
1. **重複ファイル分析レポート**：
   - 各ペアの詳細比較結果
   - 統合・削除提案
   - 統合後の内容案

2. **ディレクトリ構造最適化提案**：
   - 現状の問題点整理
   - 最適化されたディレクトリ構造案
   - 移動・統合すべきファイルリスト

3. **内容整合性問題リスト**：
   - 矛盾する記述の詳細
   - 修正すべき内容の特定
   - 統一すべきルール・方針

4. **レガシー・品質問題レポート**：
   - 廃止機能への言及リスト
   - 品質改善が必要な文書
   - 削除すべき古い情報

## ⚠️ 重要な制約・注意事項

### 🚫 **実装作業禁止**
- **ファイルの移動・削除・編集は一切禁止**
- **調査・分析・提案作成のみ実行**
- 修正が必要な場合は詳細な提案書を作成

### ✅ **品質重視原則**
- **完全性最優先**：見落としのない徹底的な調査
- **客観性重視**：事実ベースの分析・判定
- **実用性確保**：実際の運用に即した提案

### 📂 **出力管理規則厳格遵守**
- **出力場所**: `tasks/20250721_161105/reports/` のみ
- **ファイル命名**: `REPORT-001-document-structure-analysis.md`
- **一時ファイル**: 作業完了後必ず削除

## 🎯 期待される価値
1. **重複削除**による保守性向上
2. **一貫性確保**による混乱防止
3. **構造最適化**による可読性向上
4. **品質向上**による実用性確保

---

**成功基準**: 全ての重複・矛盾を特定し、明確な統合・最適化提案を作成すること