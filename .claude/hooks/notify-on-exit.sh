#!/bin/bash

# Claude Code 終了時通知スクリプト
# /exitコマンドや対話終了時に実行されます

# 通知音を再生して終了通知
osascript -e 'display notification "Claude Codeの作業が完了しました" with title "Claude Code 終了" sound name "Hero"'

echo "👋 Claude Codeセッション終了通知を送信しました"