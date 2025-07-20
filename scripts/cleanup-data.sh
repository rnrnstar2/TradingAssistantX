#!/bin/bash

# Auto Data Cleanup Script
# 24時間以上前の一時データを自動削除するスクリプト
# Worker 2: 自動削除システム構築者 - TASK-URGENT-data-lifecycle-optimization

# プロジェクトのルートディレクトリを設定
PROJECT_ROOT="/Users/rnrnstar/github/ArbitrageAssistant"
DATA_DIR="$PROJECT_ROOT/x/data"
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/cleanup.log"

# ログディレクトリが存在しない場合は作成
mkdir -p "$LOG_DIR"

# 開始ログ
echo "$(date): Auto cleanup started" >> "$LOG_FILE"

# 削除対象ディレクトリの一覧
TARGET_DIRS=(
    "$DATA_DIR/contexts"
    "$DATA_DIR/status"
    "$DATA_DIR/intermediate"
    "$DATA_DIR/communication"
)

# 削除カウンター
total_deleted=0

# 各ディレクトリの24時間以上前のJSONファイルを削除
for dir in "${TARGET_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "$(date): Checking directory: $dir" >> "$LOG_FILE"
        
        # 24時間以上前のJSONファイルを検索・削除
        deleted_files=$(find "$dir" -name "*.json" -mtime +0 -type f)
        
        if [ -n "$deleted_files" ]; then
            # ファイルリストをログに記録
            echo "$(date): Deleting files in $dir:" >> "$LOG_FILE"
            echo "$deleted_files" >> "$LOG_FILE"
            
            # 削除実行
            count=$(find "$dir" -name "*.json" -mtime +0 -type f -delete -print | wc -l)
            total_deleted=$((total_deleted + count))
            
            echo "$(date): Deleted $count files from $dir" >> "$LOG_FILE"
        else
            echo "$(date): No files to delete in $dir" >> "$LOG_FILE"
        fi
    else
        echo "$(date): Directory not found: $dir" >> "$LOG_FILE"
    fi
done

# 完了ログ
echo "$(date): Auto cleanup completed - Total deleted: $total_deleted files" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"

# 標準出力にも結果を表示（cron実行時のメール通知用）
echo "Data cleanup completed: $total_deleted files deleted"