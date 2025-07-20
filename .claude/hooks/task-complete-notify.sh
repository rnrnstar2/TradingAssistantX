#!/bin/bash
# タスク完了通知スクリプト

TOOL_NAME="$1"
FILE_PATH="$2"

# ファイル名取得
if [ -n "$FILE_PATH" ]; then
    FILE_NAME=$(basename "$FILE_PATH")
else
    FILE_NAME="タスク"
fi

# 役割別の通知
case "$ROLE" in
    "manager")
        case "$TOOL_NAME" in
            "Bash")
                osascript -e "display notification \"コマンド実行完了\" with title \"🎯 Manager\" sound name \"Glass\""
                afplay "/System/Library/Sounds/Glass.aiff" 2>/dev/null &
                ;;
            "Write"|"Edit"|"MultiEdit")
                # 品質チェックが別途実行されるのでスキップ
                ;;
            *)
                osascript -e "display notification \"$TOOL_NAME 完了\" with title \"🎯 Manager\" sound name \"Glass\""
                afplay "/System/Library/Sounds/Glass.aiff" 2>/dev/null &
                ;;
        esac
        ;;
    "worker")
        case "$TOOL_NAME" in
            "Write"|"Edit"|"MultiEdit")
                # 品質チェックスクリプトで通知するのでスキップ
                ;;
            "Read"|"Grep"|"Glob")
                osascript -e "display notification \"調査完了: $FILE_NAME\" with title \"⚡ Worker\" sound name \"Ping\""
                afplay "/System/Library/Sounds/Ping.aiff" 2>/dev/null &
                ;;
            *)
                osascript -e "display notification \"$TOOL_NAME 完了\" with title \"⚡ Worker\" sound name \"Ping\""
                afplay "/System/Library/Sounds/Ping.aiff" 2>/dev/null &
                ;;
        esac
        ;;
    *)
        # 役割未設定時
        osascript -e "display notification \"作業完了: $FILE_NAME\" with title \"Claude Code\" sound name \"Pop\""
        afplay "/System/Library/Sounds/Pop.aiff" 2>/dev/null &
        ;;
esac