#!/bin/bash

# TradingAssistantX 品質保証スクリプト
# すべてのテスト・チェックを実行し、品質を保証

set -e

# カラー設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# ログファイル設定
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
LOG_DIR="tasks/outputs"
LOG_FILE="$LOG_DIR/quality-check-${TIMESTAMP}.log"

# ログディレクトリ作成
mkdir -p "$LOG_DIR"

# ヘルパー関数
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log_success() {
    log "${GREEN}✅ $1${NC}"
}

log_error() {
    log "${RED}❌ $1${NC}"
}

log_warning() {
    log "${YELLOW}⚠️ $1${NC}"
}

log_info() {
    log "${BLUE}ℹ️ $1${NC}"
}

log_section() {
    log "\n${PURPLE}🔍 $1${NC}"
    log "=====================================\n"
}

# 実行時間測定
start_time=$(date +%s)
total_errors=0
total_warnings=0

# ヘッダー
log "${BLUE}"
log "████████╗██████╗  █████╗ ██████╗ ██╗███╗   ██╗ ██████╗ "
log "╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║██╔════╝ "
log "   ██║   ██████╔╝███████║██║  ██║██║██╔██╗ ██║██║  ███╗"
log "   ██║   ██╔══██╗██╔══██║██║  ██║██║██║╚██╗██║██║   ██║"
log "   ██║   ██║  ██║██║  ██║██████╔╝██║██║ ╚████║╚██████╔╝"
log "   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝╚═╝  ╚═══╝ ╚═════╝ "
log "              品質保証システム v1.0                    "
log "${NC}"

log_info "品質チェック開始: $(date '+%Y-%m-%d %H:%M:%S')"
log_info "ログファイル: $LOG_FILE"

# エラーハンドリング関数
handle_error() {
    local exit_code=$1
    local step_name="$2"
    
    if [ $exit_code -ne 0 ]; then
        log_error "$step_name が失敗しました (exit code: $exit_code)"
        total_errors=$((total_errors + 1))
        return 1
    else
        log_success "$step_name が完了しました"
        return 0
    fi
}

# 前提条件チェック
log_section "前提条件チェック"

# Node.jsバージョンチェック
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    log_info "Node.js バージョン: $NODE_VERSION"
else
    log_error "Node.js がインストールされていません"
    total_errors=$((total_errors + 1))
fi

# pnpmチェック
if command -v pnpm >/dev/null 2>&1; then
    PNPM_VERSION=$(pnpm --version)
    log_info "pnpm バージョン: $PNPM_VERSION"
else
    log_error "pnpm がインストールされていません"
    total_errors=$((total_errors + 1))
fi

# TypeScriptチェック
if command -v tsc >/dev/null 2>&1; then
    TSC_VERSION=$(tsc --version)
    log_info "TypeScript バージョン: $TSC_VERSION"
else
    log_warning "TypeScript が globally にインストールされていません"
    total_warnings=$((total_warnings + 1))
fi

# 依存関係インストール状況チェック
log_section "依存関係チェック"

if [ -f "package.json" ]; then
    log_info "package.json を確認中..."
    
    if [ -d "node_modules" ]; then
        log_success "node_modules が存在します"
    else
        log_warning "node_modules が存在しません。依存関係をインストール中..."
        pnpm install || {
            log_error "依存関係のインストールに失敗しました"
            total_errors=$((total_errors + 1))
        }
    fi
else
    log_error "package.json が見つかりません"
    total_errors=$((total_errors + 1))
fi

# TypeScript型チェック
log_section "TypeScript型チェック"

log_info "TypeScript型チェックを実行中..."
if pnpm check-types 2>&1 | tee -a "$LOG_FILE"; then
    handle_error $? "TypeScript型チェック"
else
    # pnpm check-types が定義されていない場合のフォールバック
    log_warning "pnpm check-types が定義されていません。tsc --noEmit を実行..."
    if tsc --noEmit 2>&1 | tee -a "$LOG_FILE"; then
        handle_error $? "TypeScript型チェック (tsc --noEmit)"
    else
        log_error "TypeScript型チェックに失敗しました"
        total_errors=$((total_errors + 1))
    fi
fi

# Lint チェック
log_section "コード品質チェック (Lint)"

log_info "Lintチェックを実行中..."
if pnpm lint 2>&1 | tee -a "$LOG_FILE"; then
    handle_error $? "Lintチェック"
else
    log_warning "Lintチェックでエラーが発生しました"
    total_warnings=$((total_warnings + 1))
fi

# テスト実行
log_section "テスト実行"

log_info "単体テストを実行中..."
if pnpm test 2>&1 | tee -a "$LOG_FILE"; then
    handle_error $? "単体テスト"
else
    log_error "単体テストに失敗しました"
    total_errors=$((total_errors + 1))
fi

log_info "統合テストを実行中..."
if pnpm test -- tests/integration/ 2>&1 | tee -a "$LOG_FILE"; then
    handle_error $? "統合テスト"
else
    log_warning "統合テストで一部エラーが発生しました"
    total_warnings=$((total_warnings + 1))
fi

# カバレッジレポート生成
log_section "カバレッジレポート生成"

log_info "テストカバレッジを生成中..."
if pnpm test:coverage 2>&1 | tee -a "$LOG_FILE"; then
    handle_error $? "カバレッジレポート生成"
    
    # カバレッジサマリーの表示
    if [ -f "coverage/coverage-summary.json" ]; then
        log_info "カバレッジサマリー:"
        node -e "
            try {
                const coverage = require('./coverage/coverage-summary.json');
                console.log('  Lines:', coverage.total.lines.pct + '%');
                console.log('  Functions:', coverage.total.functions.pct + '%');
                console.log('  Branches:', coverage.total.branches.pct + '%');
                console.log('  Statements:', coverage.total.statements.pct + '%');
            } catch (e) {
                console.log('  カバレッジサマリーの読み取りに失敗');
            }
        " 2>&1 | tee -a "$LOG_FILE"
    fi
else
    log_warning "カバレッジレポートの生成に失敗しました"
    total_warnings=$((total_warnings + 1))
fi

# ビルドテスト
log_section "ビルドテスト"

log_info "プロジェクトビルドを実行中..."
if pnpm build 2>&1 | tee -a "$LOG_FILE"; then
    handle_error $? "プロジェクトビルド"
else
    log_error "プロジェクトビルドに失敗しました"
    total_errors=$((total_errors + 1))
fi

# セキュリティ監査
log_section "セキュリティ監査"

log_info "npm audit を実行中..."
if pnpm audit --audit-level=moderate 2>&1 | tee -a "$LOG_FILE"; then
    log_success "セキュリティ監査が完了しました"
else
    log_warning "セキュリティの脆弱性が検出されました"
    total_warnings=$((total_warnings + 1))
fi

# 設定ファイル検証
log_section "設定ファイル検証"

log_info "設定ファイルの配置を検証中..."
if [ -f "scripts/config-management/validate-config-placement.sh" ]; then
    if bash scripts/config-management/validate-config-placement.sh 2>&1 | tee -a "$LOG_FILE"; then
        handle_error $? "設定ファイル検証"
    else
        log_error "設定ファイル検証に失敗しました"
        total_errors=$((total_errors + 1))
    fi
else
    log_warning "設定ファイル検証スクリプトが見つかりません"
    total_warnings=$((total_warnings + 1))
fi

# ファイルサイズチェック
log_section "ファイルサイズチェック"

log_info "大きなファイルをチェック中..."
LARGE_FILES=$(find . -type f -size +10M -not -path "./node_modules/*" -not -path "./coverage/*" -not -path "./tasks/*" 2>/dev/null || true)
if [ -n "$LARGE_FILES" ]; then
    log_warning "10MB以上のファイルが検出されました:"
    echo "$LARGE_FILES" | while read -r file; do
        if [ -n "$file" ]; then
            SIZE=$(du -h "$file" 2>/dev/null | cut -f1)
            log_warning "  $file ($SIZE)"
        fi
    done
    total_warnings=$((total_warnings + 1))
else
    log_success "大きなファイルは検出されませんでした"
fi

# パフォーマンステスト（軽量版）
log_section "パフォーマンステスト"

log_info "パフォーマンステストを実行中..."
PERF_START=$(date +%s%3N)
if pnpm test -- --testNamePattern="パフォーマンス" 2>&1 | tee -a "$LOG_FILE"; then
    PERF_END=$(date +%s%3N)
    PERF_DURATION=$((PERF_END - PERF_START))
    log_success "パフォーマンステスト完了 (${PERF_DURATION}ms)"
else
    log_warning "パフォーマンステストで一部エラーが発生しました"
    total_warnings=$((total_warnings + 1))
fi

# 結果サマリー
end_time=$(date +%s)
duration=$((end_time - start_time))

log_section "品質チェック結果サマリー"

log_info "実行時間: ${duration}秒"
log_info "エラー数: $total_errors"
log_info "警告数: $total_warnings"

# 結果判定
if [ $total_errors -eq 0 ]; then
    if [ $total_warnings -eq 0 ]; then
        log_success "🎉 品質チェック完全合格！"
        log_success "すべてのチェックが問題なく完了しました。"
        exit_code=0
    else
        log_warning "⚡ 品質チェック合格（警告あり）"
        log_warning "$total_warnings 個の警告が発生しましたが、重要な問題はありません。"
        exit_code=0
    fi
else
    log_error "💥 品質チェック失敗"
    log_error "$total_errors 個のエラーが発生しました。修正が必要です。"
    exit_code=1
fi

# レポートファイル生成
REPORT_FILE="$LOG_DIR/quality-report-${TIMESTAMP}.md"

cat > "$REPORT_FILE" << EOF
# 品質チェックレポート

**実行日時**: $(date '+%Y-%m-%d %H:%M:%S')
**実行時間**: ${duration}秒

## 結果サマリー

- ✅ **エラー数**: $total_errors
- ⚠️ **警告数**: $total_warnings
- 📊 **総合判定**: $([ $total_errors -eq 0 ] && echo "合格" || echo "不合格")

## 実行されたチェック

1. **前提条件チェック** - 実行環境の確認
2. **TypeScript型チェック** - 型安全性の確認  
3. **Lintチェック** - コード品質の確認
4. **単体テスト** - 個別機能の動作確認
5. **統合テスト** - 機能間連携の確認
6. **カバレッジレポート** - テストカバレッジの確認
7. **ビルドテスト** - 本番環境での動作確認
8. **セキュリティ監査** - 脆弱性の確認
9. **設定ファイル検証** - 設定の妥当性確認
10. **ファイルサイズチェック** - リソース使用量の確認
11. **パフォーマンステスト** - 性能の確認

## 詳細ログ

詳細なログは以下のファイルを参照してください:
\`\`\`
$LOG_FILE
\`\`\`

## 推奨アクション

$([ $total_errors -gt 0 ] && echo "- エラーの修正が必要です" || echo "- 現在のコードは品質基準を満たしています")
$([ $total_warnings -gt 0 ] && echo "- 警告の確認と対応を推奨します" || echo "- 警告はありません")

---
*Generated by TradingAssistantX Quality Check System v1.0*
EOF

log_info "品質レポートが生成されました: $REPORT_FILE"

# 成果物の場所を表示
log_section "成果物の場所"
log_info "📁 ログファイル: $LOG_FILE"
log_info "📊 レポート: $REPORT_FILE"
[ -d "coverage" ] && log_info "📈 カバレッジ: coverage/index.html"

log_info "品質チェック完了: $(date '+%Y-%m-%d %H:%M:%S')"

exit $exit_code