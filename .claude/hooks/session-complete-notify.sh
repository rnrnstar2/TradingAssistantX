#!/bin/bash

# Claude Code セッション完了通知スクリプト
# このスクリプトは、Claude Codeが作業を完全に終了した時にのみ通知を送信します

# 環境変数から情報を取得
ROLE="${ROLE:-}"
OPERATION="${OPERATION:-session_complete}"
MESSAGE="${MESSAGE:-作業が完了しました}"

# ログファイルパス
LOG_FILE="${HOME}/.claude/session-completion.log"

# ログ出力関数
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# セッション完了通知関数
notify_completion() {
    local sound_name="Glass"
    local notification_title="Claude Code"
    local notification_message="$MESSAGE"
    
    # 役割に応じて通知音を変更
    case "$ROLE" in
        manager)
            sound_name="Glass"
            notification_title="Manager - Claude Code"
            ;;
        worker)
            sound_name="Hero"
            notification_title="Worker - Claude Code"
            ;;
        *)
            sound_name="Ping"
            ;;
    esac
    
    # macOSの通知を送信（音付き）
    osascript -e "display notification \"$notification_message\" with title \"$notification_title\" sound name \"$sound_name\""
    
    # 追加で音声ファイルを直接再生（より確実）
    afplay "/System/Library/Sounds/${sound_name}.aiff" 2>/dev/null &
    
    # ログに記録
    log_message "Notification sent: $notification_title - $notification_message (Sound: $sound_name)"
    
    # コンソールにも出力
    echo "🔔 セッション完了通知: $notification_message"
}

# GitHubイシューへの完了報告関数
post_to_github_issue() {
    # 現在のブランチからイシュー番号を取得
    local branch=$(git branch --show-current 2>/dev/null)
    local issue_num=$(echo "$branch" | grep -oE '[0-9]+')
    
    if [ -n "$issue_num" ]; then
        local role_display="${ROLE:-Claude Code}"
        local emoji="🏁"
        
        case "$ROLE" in
            manager)
                role_display="Manager"
                emoji="🎯"
                ;;
            worker)
                role_display="Worker"
                if [ -n "$WORKER_TASK" ]; then
                    role_display="Worker($WORKER_TASK)"
                fi
                emoji="⚡"
                ;;
        esac
        
        # GitHubイシューに投稿
        gh issue comment "$issue_num" -b "$emoji **セッション終了 - $role_display**

📅 $(date '+%Y-%m-%d %H:%M:%S')

Claude Codeセッションが終了しました。

$MESSAGE" 2>/dev/null && {
            log_message "GitHub issue comment posted to #$issue_num"
            echo "💬 GitHubイシュー #$issue_num に完了報告を投稿しました"
        } || {
            log_message "Failed to post GitHub issue comment to #$issue_num"
        }
    fi
}

# メイン処理
main() {
    # Claude CodeのStopイベントから呼ばれた場合は常に通知
    notify_completion
    post_to_github_issue
}

# スクリプト実行
main