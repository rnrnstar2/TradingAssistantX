# TASK-003 設定ファイル配置自動検証システム実装指示書

## 🎯 **実装目標**

**設定ファイル誤配置を防ぐ自動検証システムを実装し、今後同様の問題を根本的に防止**

## 🚨 **解決すべき問題**

### **1. 設定ファイル誤配置の検出不能**
- config/ディレクトリに設定ファイルが配置されても気づかない
- ルートディレクトリへの設定ファイル配置チェックなし
- 既存の出力管理システムでは設定ファイルをカバーしていない

### **2. 事前防止機能の不足**
- Pre-commit hookでの設定ファイル配置チェックなし
- 開発中のリアルタイム警告システムなし

## ✅ **実装内容**

### **Task A: 設定ファイル配置検証スクリプト実装**

#### **A-1. 設定ファイル配置検証スクリプト作成**
```bash
#!/bin/bash
# scripts/config-management/validate-config-placement.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

# 設定ファイルパターン定義
CONFIG_PATTERNS=(
    "*-config.yaml"
    "*-config.yml"
    "*-strategy.yaml"
    "*-strategy.yml"
    "*-settings.yaml"
    "*-settings.yml"
    "config.yaml"
    "config.yml"
    "settings.yaml"
    "settings.yml"
)

# 禁止ディレクトリ
FORBIDDEN_DIRS=(
    "config"
    "settings"
    "conf"
    "."  # ルートディレクトリ
)

# 許可ディレクトリ
ALLOWED_DIRS=(
    "data"
)

validate_config_placement() {
    log_info "🔍 設定ファイル配置検証を開始..."
    
    local violations=0
    local total_checked=0
    
    # 禁止ディレクトリでの設定ファイル検索
    for forbidden_dir in "${FORBIDDEN_DIRS[@]}"; do
        local search_path="$PROJECT_ROOT"
        if [ "$forbidden_dir" != "." ]; then
            search_path="$PROJECT_ROOT/$forbidden_dir"
        fi
        
        if [ -d "$search_path" ] || [ "$forbidden_dir" = "." ]; then
            for pattern in "${CONFIG_PATTERNS[@]}"; do
                while IFS= read -r -d '' file; do
                    # data/ディレクトリ内のファイルは除外
                    if [[ "$file" == *"/data/"* ]]; then
                        continue
                    fi
                    
                    # node_modules等の除外
                    if [[ "$file" == *"/node_modules/"* ]] || \
                       [[ "$file" == *"/.git/"* ]] || \
                       [[ "$file" == *"/dist/"* ]] || \
                       [[ "$file" == *"/build/"* ]]; then
                        continue
                    fi
                    
                    local rel_path="${file#$PROJECT_ROOT/}"
                    log_error "❌ 設定ファイル誤配置検出: $rel_path"
                    log_error "   → 正しい配置先: data/$(basename "$file")"
                    violations=$((violations + 1))
                    total_checked=$((total_checked + 1))
                done < <(find "$search_path" -maxdepth 1 -name "$pattern" -type f -print0 2>/dev/null || true)
            done
        fi
    done
    
    # data/ディレクトリ内の正しい配置確認
    local data_dir="$PROJECT_ROOT/data"
    if [ -d "$data_dir" ]; then
        local correct_files=0
        for pattern in "${CONFIG_PATTERNS[@]}"; do
            while IFS= read -r -d '' file; do
                local rel_path="${file#$PROJECT_ROOT/}"
                log_success "✅ 正しい配置: $rel_path"
                correct_files=$((correct_files + 1))
                total_checked=$((total_checked + 1))
            done < <(find "$data_dir" -maxdepth 1 -name "$pattern" -type f -print0 2>/dev/null || true)
        done
        
        if [ $correct_files -gt 0 ]; then
            log_info "📊 data/ディレクトリ内で $correct_files 個の設定ファイルを確認"
        fi
    fi
    
    # 結果レポート
    log_info "📊 検証結果サマリー:"
    log_info "   総チェック数: $total_checked"
    if [ $violations -eq 0 ]; then
        log_success "   ✅ 違反: $violations 件"
        log_success "🎉 設定ファイル配置は全て正しく設定されています！"
        return 0
    else
        log_error "   ❌ 違反: $violations 件"
        log_error "🚨 設定ファイル配置に問題があります。修正が必要です。"
        return 1
    fi
}

# 自動修正機能
auto_fix_placement() {
    if [ "$1" != "--fix" ]; then
        return 0
    fi
    
    log_info "🔧 自動修正モードで実行..."
    
    local fixed_count=0
    
    for forbidden_dir in "${FORBIDDEN_DIRS[@]}"; do
        local search_path="$PROJECT_ROOT"
        if [ "$forbidden_dir" != "." ]; then
            search_path="$PROJECT_ROOT/$forbidden_dir"
        fi
        
        if [ -d "$search_path" ] || [ "$forbidden_dir" = "." ]; then
            for pattern in "${CONFIG_PATTERNS[@]}"; do
                while IFS= read -r -d '' file; do
                    # data/ディレクトリ内のファイルは除外
                    if [[ "$file" == *"/data/"* ]]; then
                        continue
                    fi
                    
                    # 除外ディレクトリチェック
                    if [[ "$file" == *"/node_modules/"* ]] || \
                       [[ "$file" == *"/.git/"* ]] || \
                       [[ "$file" == *"/dist/"* ]] || \
                       [[ "$file" == *"/build/"* ]]; then
                        continue
                    fi
                    
                    local filename=$(basename "$file")
                    local target_path="$PROJECT_ROOT/data/$filename"
                    
                    # データディレクトリ作成
                    mkdir -p "$PROJECT_ROOT/data"
                    
                    # ファイル移動
                    if mv "$file" "$target_path"; then
                        log_success "🔧 修正完了: $filename → data/$filename"
                        fixed_count=$((fixed_count + 1))
                        
                        # Git操作
                        if git status &>/dev/null; then
                            git add "$target_path" 2>/dev/null || true
                            git rm --cached "${file#$PROJECT_ROOT/}" 2>/dev/null || true
                        fi
                    else
                        log_error "❌ 修正失敗: $file"
                    fi
                done < <(find "$search_path" -maxdepth 1 -name "$pattern" -type f -print0 2>/dev/null || true)
            done
        fi
    done
    
    if [ $fixed_count -gt 0 ]; then
        log_success "🎉 $fixed_count 個のファイルを自動修正しました"
    else
        log_info "📋 修正対象のファイルは見つかりませんでした"
    fi
}

# 使用方法表示
show_usage() {
    echo "使用方法: $0 [OPTIONS]"
    echo ""
    echo "OPTIONS:"
    echo "  --fix     自動修正モードで実行"
    echo "  --help    このヘルプを表示"
    echo ""
    echo "例:"
    echo "  $0                # 検証のみ実行"
    echo "  $0 --fix         # 検証 + 自動修正"
}

# メイン実行
main() {
    case "${1:-}" in
        --help|-h)
            show_usage
            exit 0
            ;;
        --fix)
            auto_fix_placement "$1"
            validate_config_placement
            ;;
        "")
            validate_config_placement
            ;;
        *)
            log_error "不明なオプション: $1"
            show_usage
            exit 1
            ;;
    esac
}

# 実行権限チェック
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
```

#### **A-2. Pre-commit Hook統合**
```bash
#!/bin/bash
# .claude/hooks/validate-config-placement

# 設定ファイル配置検証をPre-commit Hookに統合
SCRIPT_PATH="scripts/config-management/validate-config-placement.sh"

if [ -f "$SCRIPT_PATH" ]; then
    echo "🔍 設定ファイル配置検証を実行中..."
    
    if bash "$SCRIPT_PATH"; then
        echo "✅ 設定ファイル配置検証: 合格"
    else
        echo "❌ 設定ファイル配置検証: 失敗"
        echo ""
        echo "🔧 自動修正を実行するには:"
        echo "   bash $SCRIPT_PATH --fix"
        echo "   git add -A"
        echo "   git commit --amend"
        exit 1
    fi
else
    echo "⚠️  設定ファイル配置検証スクリプトが見つかりません: $SCRIPT_PATH"
fi
```

### **Task B: package.json スクリプト統合**

#### **B-1. npm/pnpm スクリプト追加**
```json
{
  "scripts": {
    "validate:config-placement": "bash scripts/config-management/validate-config-placement.sh",
    "fix:config-placement": "bash scripts/config-management/validate-config-placement.sh --fix",
    "validate:all": "pnpm validate:config-placement && pnpm run validate:output-compliance"
  }
}
```

### **Task C: CI/CD統合準備**

#### **C-1. GitHub Actions Workflow追加準備**
```yaml
# .github/workflows/config-validation.yml
name: Configuration Validation

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  validate-config:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Validate Config File Placement
      run: |
        chmod +x scripts/config-management/validate-config-placement.sh
        bash scripts/config-management/validate-config-placement.sh
```

## 🔧 **技術制約**

### **スクリプト要件**
- Bash互換性（macOS/Linux対応）
- 実行権限の適切な設定
- エラーハンドリングの完全実装

### **Git統合要件**
- Git操作の安全性確保
- コミット前の自動検証
- 履歴の適切な管理

## 📋 **テスト要件**

### **検証テストケース**
1. **正常ケース**: data/内の設定ファイルが正しく認識される
2. **異常ケース**: config/内の設定ファイルが検出される
3. **自動修正**: --fixオプションで適切に修正される
4. **Git統合**: Pre-commit hookが正しく動作する

### **テスト実行方法**
```bash
# 1. 基本検証テスト
pnpm validate:config-placement

# 2. 修正機能テスト
# テスト用設定ファイル作成
mkdir -p config
echo "test: value" > config/test-config.yaml

# 自動修正実行
pnpm fix:config-placement

# 結果確認
ls data/test-config.yaml

# 3. Pre-commit hook テスト
git add .
git commit -m "Test commit"
```

## 📁 **作成対象ファイル**

### **新規作成**
```
scripts/config-management/validate-config-placement.sh
.claude/hooks/validate-config-placement
```

### **既存ファイル更新**
```
package.json                    # scripts セクション追加
.github/workflows/config-validation.yml  # 将来のCI/CD統合用
```

## ✅ **完了基準**

1. **検証スクリプト作成**: validate-config-placement.shが正しく動作
2. **自動修正機能**: --fixオプションで設定ファイルが適切に移動
3. **Pre-commit Hook統合**: コミット前の自動検証が動作
4. **package.json統合**: npm/pnpmコマンドで実行可能
5. **テスト成功**: 全てのテストケースが正常に動作

## 🚫 **実装禁止事項**

- 過度に複雑な検証ロジック
- パフォーマンスを大幅に低下させる処理
- 既存ワークフローを阻害する機能

## 📋 **報告書作成要件**

完了後、以下を含む報告書を作成：

1. **スクリプト動作確認**: 検証・修正機能のテスト結果
2. **Pre-commit Hook確認**: コミット時の自動検証動作確認
3. **パフォーマンス評価**: 検証処理の実行時間測定
4. **使用方法説明**: 開発者向けの使用手順まとめ

---

**重要**: このシステムにより、設定ファイル誤配置は事前に検出・修正され、開発効率と品質の両方が向上します。