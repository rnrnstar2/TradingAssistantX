#!/bin/bash
# 初回起動時チェックスクリプト

# 初回実行フラグファイル
FLAG_FILE="$HOME/.claude/.init-done-$(date +%Y%m%d)"

if [ ! -f "$FLAG_FILE" ]; then
    echo "🚀 ParalleDev5 MVP開発環境"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 役割: ${ROLE:-未設定}"
    echo "🌿 ブランチ: $(git branch --show-current)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ "$ROLE" = "worker" ]; then
        echo "⚡ Worker: 実装に専念 (git操作は自動ブロック)"
    elif [ "$ROLE" = "manager" ]; then
        echo "🎯 Manager: Worktree統括・git操作責任者"
    fi
    
    # フラグファイル作成
    mkdir -p "$HOME/.claude"
    touch "$FLAG_FILE"
fi