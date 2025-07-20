#!/bin/bash
# Git操作ブロックフック（Worker用）

COMMAND="$1"

# 現在の役割を確認
if [ -f ".claude/.current-role" ]; then
    CURRENT_ROLE=$(cat .claude/.current-role | cut -d: -f1)
else
    CURRENT_ROLE="${ROLE:-unknown}"
fi

# Workerの場合、git操作をブロック
if [ "$CURRENT_ROLE" = "worker" ]; then
    # ブロック対象のgitコマンド
    BLOCKED_COMMANDS="commit|push|pull|merge|rebase|checkout|branch|add|rm|mv|reset|revert|cherry-pick|tag|stash"
    
    if echo "$COMMAND" | grep -E "git\s+($BLOCKED_COMMANDS)" > /dev/null; then
        echo ""
        echo "🚫 Git操作がブロックされました"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "⚡ Workerはgit操作が制限されています"
        echo "🎯 このタスクはManagerに依頼してください"
        echo ""
        echo "💡 許可されている操作:"
        echo "  • git status (現在の状態確認)"
        echo "  • git diff (変更内容の確認)"
        echo "  • git log (履歴の確認)"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # 通知
        osascript -e "display notification \"Git操作がブロックされました\" with title \"⚡ Worker制限\" sound name \"Basso\"" 2>/dev/null || true
        
        # コマンドの実行を阻止
        return 1
    fi
fi

# Managerまたはブロック対象外のコマンドは実行を許可
return 0