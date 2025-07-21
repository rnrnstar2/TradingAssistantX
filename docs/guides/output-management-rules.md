# 出力管理規則 - Root Directory Pollution Prevention

## 📋 統合されたガイドライン

**注**: このドキュメントは、分析出力ガイドラインと出力管理規則を統合したものです。プロジェクトルートディレクトリの汚染防止と、適切な分析・レポート出力を確保します。

## 🎯 概要

本文書は、プロジェクトのルートディレクトリ汚染を防止し、出力ファイルの適切な管理を確保するための**強制的な規則**を定義します。

## 🚨 **ROOT DIRECTORY POLLUTION PREVENTION**

### 基本原則

**⚠️ CRITICAL: 以下の場所への出力は絶対禁止**:
- `/Users/rnrnstar/github/ArbitrageAssistant/` (ルートディレクトリ)
- `/Users/rnrnstar/github/ArbitrageAssistant/packages/` (パッケージディレクトリ)
- `/Users/rnrnstar/github/ArbitrageAssistant/apps/` (アプリケーションディレクトリ)

### 🚫 **絶対禁止の出力パターン**

以下のファイルをルートディレクトリに作成することは絶対禁止：

```bash
# 分析ファイル
*-analysis.md
*-analysis.json
*-analysis.txt
analysis-*.md
analysis-*.json

# レポートファイル  
*-report.md
*-report.json
*-report.txt
report-*.md
report-*.json

# 出力ファイル
*-output.*
output-*.*
result-*.*

# 一時ファイル
*.tmp
*.temp
temp-*
debug-*
test-output*
*.log
```

## ✅ **承認された出力場所**

### 1. タスク関連出力

```bash
# タスク固有の出力
tasks/{TIMESTAMP}/outputs/          # 専用出力ディレクトリ
tasks/{TIMESTAMP}/analysis/         # 分析結果
tasks/{TIMESTAMP}/reports/          # 報告書
tasks/{TIMESTAMP}/temporary/        # 一時ファイル

# 例
tasks/20250716-160000/outputs/TASK-001-feature-output.json
tasks/20250716-160000/analysis/TASK-001-feature-analysis.md
tasks/20250716-160000/reports/REPORT-001-feature.md
tasks/20250716-160000/temporary/temp-data.tmp
```

### 2. 分析・レポート出力

```bash
# 一般的な分析・レポート
tasks/analysis-results/             # 分析結果集約
tasks/outputs/                      # 一般出力
tasks/temporary/                    # 一時ファイル

# 例
tasks/analysis-results/20250716-dependency-analysis.json
tasks/outputs/20250716-build-output.log
tasks/temporary/temp-processing.tmp
```

### 3. アプリケーション固有出力

```bash
# アプリケーション固有の出力（承認された場合のみ）
apps/{app-name}/tasks/              # アプリ固有タスク
apps/{app-name}/analysis/           # アプリ固有分析
apps/{app-name}/reports/            # アプリ固有レポート

# 例
apps/hedge-system/tasks/20250716-tauri-build.log
apps/admin/analysis/performance-analysis.json
apps/quick-trade/reports/feature-report.md
```

## 📋 **ファイル命名規則**

### タスク関連ファイル

```bash
# 基本パターン
TASK-XXX-{name}-{type}.{ext}

# 具体例
TASK-001-user-auth-output.json
TASK-002-ui-component-analysis.md
TASK-003-api-integration-report.md
```

### 一般ファイル

```bash
# 基本パターン
{YYYYMMDD}-{name}-{type}.{ext}

# 具体例
20250716-dependency-analysis.json
20250716-build-output.log
20250716-performance-report.md
```

### 一時ファイル

```bash
# 基本パターン
{name}-{YYYYMMDD}-{HHMMSS}.tmp

# 具体例
processing-20250716-160000.tmp
debug-output-20250716-160000.temp
test-data-20250716-160000.tmp
```

## 🔧 **出力作成時の必須手順**

### 1. 出力前チェック

```bash
# 出力先確認
echo "出力先: $OUTPUT_PATH"
# 承認された場所かどうか確認

# ディレクトリ作成（必要に応じて）
mkdir -p "$(dirname "$OUTPUT_PATH")"
```

### 2. ファイル作成

```bash
# 適切な命名規則に従ってファイル作成
OUTPUT_FILE="tasks/outputs/TASK-001-feature-output.json"
echo '{"result": "success"}' > "$OUTPUT_FILE"
```

### 3. クリーンアップ

```bash
# 作業完了後、不要な一時ファイルを削除
rm -f tasks/temporary/*.tmp
rm -f tasks/*/temporary/*.tmp
```

## 🛡️ **自動検証システム**

### Pre-commit Hook

Git commit時に自動的に出力管理規則をチェック：

```bash
# .git/hooks/pre-commit で自動実行
scripts/output-management/pre-commit-output-validation.sh
```

### 手動検証

```bash
# 現在の状態をチェック
scripts/output-management/validate-output-compliance.sh

# 違反を自動修正
scripts/output-management/validate-output-compliance.sh --cleanup
```

### 初期設定

```bash
# 検証システムのセットアップ
scripts/output-management/setup-output-validation.sh
```

## ⚠️ **違反発生時の対応**

### 1. 違反発見時

```bash
# 作業を即座に停止
# 違反ファイルを特定
find . -maxdepth 1 -name "*-analysis.*" -o -name "*-report.*" -o -name "*.tmp"

# 適切な場所に移動
mv analysis-result.md tasks/outputs/
mv report.json tasks/analysis-results/
mv temp-file.tmp tasks/temporary/
```

### 2. 自動修正

```bash
# 自動修正スクリプトの実行
scripts/output-management/validate-output-compliance.sh --cleanup
```

### 3. 報告書での記録

違反が発生した場合、報告書に以下を記録：

```markdown
### ⚠️ 違反発生時の対応記録
- [x] **違反発見**: analysis-result.md をルートディレクトリに作成
- [x] **即座停止**: 作業を停止し、違反ファイルを特定
- [x] **適切移動**: tasks/outputs/20250716-analysis-result.md に移動
- [x] **作業再開**: 正しい出力場所での作業を再開
```

## 🔍 **検証コマンド**

### 基本検証

```bash
# 現在の状態をチェック
scripts/output-management/validate-output-compliance.sh

# 詳細レポート生成
scripts/output-management/validate-output-compliance.sh --report
```

### 自動修正

```bash
# 違反を自動修正
scripts/output-management/validate-output-compliance.sh --cleanup
```

### 継続的監視

```bash
# 定期的な検証（推奨）
watch -n 60 scripts/output-management/validate-output-compliance.sh
```

## 📊 **レポート生成**

### 違反検出レポート

```bash
# コンプライアンスレポート生成
scripts/output-management/validate-output-compliance.sh
# → tasks/outputs/output-compliance-report-{TIMESTAMP}.md
```

### 出力ファイル統計

```bash
# 出力ファイル統計
find tasks/ -name "*-output.*" | wc -l
find tasks/ -name "*-analysis.*" | wc -l
find tasks/ -name "*-report.*" | wc -l
```

## 🎯 **MVP原則との整合性**

### シンプルさ

- 複雑な設定は不要
- 基本的なディレクトリ構造のみ使用
- 明確な禁止・許可ルール

### 効果性

- Root directory pollution を完全に防止
- 自動検証による確実な品質保証
- 違反時の迅速な対応

### 保守性

- 簡潔なスクリプトで実装
- 理解しやすいルール
- 必要に応じて拡張可能

## 🚀 **統合された開発フロー**

### Manager (指示書作成時)

```bash
# 1. 出力管理規則を指示書に含める
# 2. 承認された出力場所を指定
# 3. 命名規則を明記
```

### Worker (実装時)

```bash
# 1. 出力前チェック実行
# 2. 承認された場所にファイル作成
# 3. 作業完了後クリーンアップ
# 4. 報告書で遵守確認
```

### Git 統合

```bash
# 1. Pre-commit hook で自動検証
# 2. 違反があれば commit をブロック
# 3. 修正後に再度 commit
```

## 📚 **関連資料**

### システムファイル

- `scripts/output-management/validate-output-compliance.sh` - 検証スクリプト
- `scripts/output-management/pre-commit-output-validation.sh` - Pre-commit hook
- `scripts/output-management/setup-output-validation.sh` - セットアップスクリプト

### テンプレート

- `tasks/templates/instruction-template.md` - 更新済み指示書テンプレート
- `tasks/templates/report-template.md` - 更新済み報告書テンプレート

### 設定ファイル

- `.git/hooks/pre-commit` - 自動インストールされる pre-commit hook
- `.gitignore` - 一時ファイル用エントリ

---

## 🎯 **結論**

この出力管理規則システムは：

1. **強制的**: 違反を確実に防止
2. **自動化**: 手動チェックの負担を軽減
3. **統合的**: 既存のワークフローに自然に組み込み
4. **MVP準拠**: シンプルで効果的な実装

**すべての開発作業において、この規則の遵守は必須です。**

---

**重要**: この規則は、プロジェクトの品質と保守性を確保するための基盤です。違反は即座に修正し、システムの整合性を維持してください。