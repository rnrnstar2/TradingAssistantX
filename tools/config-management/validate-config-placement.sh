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