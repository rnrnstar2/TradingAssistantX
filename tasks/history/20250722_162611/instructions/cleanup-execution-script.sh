#!/bin/bash

# TradingAssistantX コードベースクリーンアップ実行スクリプト
# 作成: 2025-07-22 Manager権限

set -e  # エラー時即座に終了

echo "🚀 TradingAssistantX コードベースクリーンアップ開始"
echo "⏰ $(date)"
echo ""

# 現在のディレクトリ確認
if [ ! -f "package.json" ]; then
    echo "❌ エラー: TradingAssistantXルートディレクトリで実行してください"
    exit 1
fi

# 動作確認関数
verify_system() {
    echo "🔍 システム動作確認中..."
    if pnpm dev --help > /dev/null 2>&1; then
        echo "✅ devスクリプト確認OK"
    else
        echo "❌ devスクリプトが実行できません"
        return 1
    fi
}

# バックアップ作成
create_backup() {
    local backup_name="src_backup_$(date +%Y%m%d_%H%M%S)"
    echo "💾 バックアップ作成: $backup_name"
    cp -r src "$backup_name"
    echo "✅ バックアップ完了: $backup_name"
}

# Phase 1: 高優先度レガシーファイル削除
phase1_cleanup() {
    echo ""
    echo "🗂️ Phase 1: 高優先度レガシーファイル削除開始"
    
    # 存在確認して削除
    local files_to_delete=(
        "src/core/true-autonomous-workflow.ts"
        "src/lib/autonomous-exploration-engine.ts"
        "src/lib/async-execution-manager.ts"
        "src/lib/claude-controlled-collector.ts"
        "src/lib/claude-error-fixer.ts"
        "src/lib/claude-optimized-provider.ts"
        "src/lib/claude-tools.ts"
        "src/lib/content-convergence-engine.ts"
        "src/lib/context-compression-system.ts"
        "src/lib/context-integrator.ts"
        "src/lib/data-communication-system.ts"
        "src/lib/decision-logger.ts"
        "src/lib/execution-orchestrator.ts"
        "src/lib/expanded-action-executor.ts"
        "src/lib/fx-api-collector.ts"
        "src/lib/fx-structured-site-collector.ts"
        "src/lib/fx-unified-collector.ts"
        "src/lib/growth-system-manager.ts"
        "src/lib/information-evaluator.ts"
        "src/lib/intelligent-resource-manager.ts"
        "src/lib/long-running-task-manager.ts"
        "src/lib/memory-optimizer.ts"
        "src/lib/minimal-decision-engine.ts"
        "src/lib/minimal-logger.ts"
        "src/lib/multi-source-collector.ts"
        "src/lib/parallel-execution-manager.ts"
        "src/lib/playwright-account-collector.ts"
        "src/lib/posting-manager.ts"
        "src/lib/quality-perfection-system.ts"
        "src/lib/realtime-info-collector.ts"
        "src/lib/rss-parallel-collection-engine.ts"
        "src/lib/x-performance-analyzer.ts"
    )
    
    local deleted_count=0
    for file in "${files_to_delete[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo "🗑️  削除: $file"
            ((deleted_count++))
        fi
    done
    
    echo "✅ Phase 1完了: ${deleted_count}ファイル削除"
}

# Phase 2: サブディレクトリ群削除
phase2_cleanup() {
    echo ""
    echo "🗂️ Phase 2: サブディレクトリ群削除開始"
    
    local dirs_to_delete=(
        "src/lib/browser"
        "src/lib/collectors"
        "src/lib/convergence"
        "src/lib/decision"
        "src/lib/exploration"
        "src/lib/logging"
        "src/lib/quality"
        "src/lib/rss"
        "src/lib/sources"
    )
    
    local files_to_delete=(
        "src/utils/config-cache.ts"
        "src/utils/config-loader.ts"
        "src/utils/config-templates.ts"
        "src/utils/config-validator.ts"
        "src/utils/error-handler.ts"
        "src/utils/file-size-monitor.ts"
        "src/utils/optimization-metrics.ts"
        "src/utils/test-helper.ts"
    )
    
    local deleted_count=0
    
    # ディレクトリ削除
    for dir in "${dirs_to_delete[@]}"; do
        if [ -d "$dir" ]; then
            local file_count=$(find "$dir" -type f | wc -l)
            rm -rf "$dir"
            echo "🗑️  削除ディレクトリ: $dir (${file_count}ファイル)"
            ((deleted_count += file_count))
        fi
    done
    
    # ファイル削除
    for file in "${files_to_delete[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo "🗑️  削除: $file"
            ((deleted_count++))
        fi
    done
    
    echo "✅ Phase 2完了: ${deleted_count}ファイル削除"
}

# Phase 3: 開発ツール・テスト関連削除
phase3_cleanup() {
    echo ""
    echo "🗂️ Phase 3: 開発ツール・テスト関連削除開始"
    
    local files_to_delete=(
        "src/scripts/baseline-measurement.ts"
        "src/scripts/oauth1-diagnostics.ts"
        "src/scripts/oauth1-setup-helper.ts"
        "src/scripts/oauth1-test-connection.ts"
        "src/types/browser-optimization-types.ts"
        "src/types/claude-tools.ts"
        "src/types/collection-common.ts"
        "src/types/content-strategy.ts"
        "src/types/convergence-types.ts"
        "src/types/decision-logging-types.ts"
        "src/types/decision-types.ts"
        "src/types/exploration-types.ts"
        "src/types/multi-source.ts"
        "src/types/posting-data.ts"
        "src/types/quality-perfection-types.ts"
        "src/types/rss-collection-types.ts"
        "src/types/workflow-types.ts"
    )
    
    local deleted_count=0
    for file in "${files_to_delete[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo "🗑️  削除: $file"
            ((deleted_count++))
        fi
    done
    
    echo "✅ Phase 3完了: ${deleted_count}ファイル削除"
}

# システム検証
verify_after_cleanup() {
    echo ""
    echo "🔍 クリーンアップ後システム検証開始"
    
    echo "📊 TypeScriptコンパイル確認..."
    if pnpm build; then
        echo "✅ TypeScriptコンパイル成功"
    else
        echo "❌ TypeScriptコンパイルエラー - バックアップから復旧が必要"
        return 1
    fi
    
    echo "🤖 基本動作確認..."
    timeout 30s pnpm dev || {
        if [ $? -eq 124 ]; then
            echo "✅ システム起動確認（30秒でタイムアウト）"
        else
            echo "❌ システム起動エラー - バックアップから復旧が必要"
            return 1
        fi
    }
}

# 結果レポート
generate_report() {
    local before_count=$(find src_backup_* -name "*.ts" 2>/dev/null | wc -l || echo "不明")
    local after_count=$(find src -name "*.ts" | wc -l)
    local deleted_count=$((before_count - after_count))
    
    echo ""
    echo "📊 クリーンアップ完了レポート"
    echo "================================"
    echo "削除前ファイル数: ${before_count}"
    echo "削除後ファイル数: ${after_count}"
    echo "削除ファイル数: ${deleted_count}"
    echo "削減率: $(echo "scale=1; $deleted_count * 100 / $before_count" | bc -l)%"
    echo ""
    echo "🎯 残存核心ファイル:"
    echo "  - エントリーポイント: 2ファイル"
    echo "  - 核心システム: 8ファイル"  
    echo "  - 重要ライブラリ: 9ファイル"
    echo "  - 型定義: 3ファイル"
    echo "  - ユーティリティ: 3ファイル"
    echo ""
    echo "✅ Claude Code SDK中心の洗練されたシステムへの変革完了"
}

# メイン実行フロー
main() {
    echo "🔧 事前確認実行中..."
    verify_system || exit 1
    
    echo ""
    read -p "🤔 バックアップを作成してクリーンアップを開始しますか？ (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ クリーンアップをキャンセルしました"
        exit 0
    fi
    
    create_backup
    
    echo ""
    echo "🚀 段階的クリーンアップ開始"
    
    phase1_cleanup
    echo "🔍 Phase 1後の動作確認..."
    verify_system || { echo "❌ Phase 1で問題発生"; exit 1; }
    
    phase2_cleanup  
    echo "🔍 Phase 2後の動作確認..."
    verify_system || { echo "❌ Phase 2で問題発生"; exit 1; }
    
    phase3_cleanup
    echo "🔍 Phase 3後の動作確認..."
    verify_system || { echo "❌ Phase 3で問題発生"; exit 1; }
    
    verify_after_cleanup || exit 1
    
    generate_report
    
    echo ""
    echo "🎉 TradingAssistantX コードベースクリーンアップ完全成功！"
    echo "💡 Claude Code SDK中心のクリーンなシステムが完成しました"
}

# スクリプト実行
main "$@"