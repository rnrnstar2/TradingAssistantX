# TASK-001: docs システム大整理

## 🎯 タスク概要

**目的**: 24ファイル構成のdocsディレクトリを、X自動化システムに特化した必要最小限（11ファイル）に整理する

**重要性**: Manager調査で重大な問題を発見 - "必要なドキュメントのみ"が不正確
- 13ファイルが削除・統合対象
- ArbitrageAssistant（旧）からTradingAssistantX（新）への名称不整合
- 取引システム向け内容がX自動化システムに無関係

## 📋 作業内容

### Phase 1: 即座削除（9ファイル）

**削除理由: システム不適合・旧プロジェクト向け**

```bash
# 削除対象ファイル一覧
docs/mvp-constraints/mvp-performance-criteria.md    # EA-Tauri専用
docs/guides/claude-code-github-actions.md          # hedge-system向け  
docs/guides/windows-setup.md                       # ArbitrageAssistant向け
docs/common/command-reference.md                   # ArbitrageAssistant向け
docs/common/configuration-guide.md                 # JSON設定（YAML駆動と不整合）
docs/common/file-paths.md                          # ArbitrageAssistant固有パス
docs/common/performance-standards.md               # 取引システム向け
docs/common/system-constants.md                    # 取引システム向け
```

### Phase 2: 統合作業（2ファイル→1ファイル）

**統合対象**: 90%重複内容の解消

1. **output管理統合**
   - `docs/guides/analysis-output-guidelines.md` → `docs/guides/output-management-rules.md` へ統合
   - 統合後、`analysis-output-guidelines.md` を削除

2. **MVP制約統合**  
   - `docs/mvp-constraints/README.md` → `docs/mvp-constraints/mvp-principles.md` へ統合
   - 統合後、`README.md` を削除

### Phase 3: プロジェクト名修正（2ファイル）

**修正対象**: ArbitrageAssistant → TradingAssistantX

1. **`docs/guides/README.md`**
   - X自動化システム向けガイド一覧に全面改定
   - 存在しないガイドへの参照削除

2. **`docs/common/naming-conventions.md`**
   - X自動化システム向け命名規則に書き換え
   - ArbitrageAssistant固有要素の削除

## 🚫 MVP制約準拠

### 禁止事項
- 新規ドキュメント作成（既存整理のみ）
- 統計・分析機能の追加
- 将来拡張のための準備

### 価値重視原則
- 実際に使用されるドキュメントのみ保持
- X自動化システムに直接関連する内容のみ
- 重複を排除した明確な情報提供

## 📂 出力管理規則（厳守）

### 出力禁止場所
- ❌ プロジェクトルートディレクトリ
- ❌ 一時ファイルの直接配置

### 承認された出力場所
- ✅ `tasks/20250720_194351_{docs_cleanup}/reports/`

### 報告書命名規則
- **ファイル名**: `REPORT-001-docs-system-cleanup.md`
- **形式**: 実行内容・削除ファイル一覧・最終構成を記載

## 🔍 品質チェック項目

### Phase完了後チェック
1. **削除確認**: 9ファイルの完全削除
2. **統合確認**: 重複内容の解消・情報欠損なし
3. **修正確認**: プロジェクト名の統一・パス修正
4. **lint/type-check**: TypeScript適合性（該当する場合）

### 最終確認
- **ファイル数**: 24ファイル → 11ファイル
- **X自動化特化**: 無関係コンテンツの完全除去
- **参照整合性**: CLAUDE.mdからの参照エラーなし

## ⚡ 実行順序

1. **Phase 1（削除）**: 即座実行可能（依存なし）
2. **Phase 2（統合）**: Phase 1完了後
3. **Phase 3（修正）**: Phase 2完了後

## 📋 完了基準

- [ ] 9ファイルの削除完了
- [ ] 2組の統合作業完了  
- [ ] 2ファイルのプロジェクト名修正完了
- [ ] 最終11ファイル構成の確認
- [ ] 報告書作成（削除一覧・最終構成・品質確認結果）

## 💡 実装のコツ

### 統合作業のポイント
- 重複部分の削除優先
- より詳細・実用的な記述を採用
- X自動化システム特有の制約事項を優先

### プロジェクト名修正のポイント  
- パス参照の完全修正
- ArbitrageAssistant → TradingAssistantX
- `/Users/rnrnstar/github/ArbitrageAssistant/` → `/Users/rnrnstar/github/TradingAssistantX/`

---

**価値提供**: X自動化システムに特化した効率的なドキュメント体系により、開発・運用の生産性を最大化します。