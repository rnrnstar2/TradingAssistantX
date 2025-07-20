---
description: "ワーカーモードで起動"
allowed-tools: ["Bash"]
---

```bash

# 現在のブランチからイシュー番号を取得
BRANCH=$(git branch --show-current)
ISSUE_NUM=$(echo $BRANCH | grep -oE '[0-9]+')

if [ -z "$ISSUE_NUM" ]; then
    echo "❌ イシューブランチではありません"
    echo "   先に /project:issue-create を実行してください"
    exit 1
fi

# 環境変数設定
export ROLE="worker"
export ISSUE_NUMBER=$ISSUE_NUM

# worktree情報取得（あれば）
if [ -f ".issue-metadata/current.json" ]; then
    WORKTREE_PATH=$(cat .issue-metadata/current.json | jq -r '.worktree_path' 2>/dev/null)
    if [ -n "$WORKTREE_PATH" ] && [ "$WORKTREE_PATH" != "null" ]; then
        echo "📂 Worktree: $WORKTREE_PATH"
    fi
fi

# 初回起動メッセージ
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚡ Worker モード起動"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 イシュー: #$ISSUE_NUM"
echo "🌿 ブランチ: $BRANCH"
echo "👤 役割: 実装担当"
echo ""
echo "⚠️  制限事項:"
echo "  • Git操作は自動ブロックされます"
echo "  • コミット、プッシュ、PRはManagerが行います"
echo ""
echo "✅ 作業内容:"
echo "  • イシューの実装に専念"
echo "  • ファイルの編集・作成"
echo "  • テストの実行"
echo "  • Managerへの進捗報告"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# GitHubイシューに作業開始コメントを投稿
echo ""
echo "💬 GitHubイシューに作業開始を通知中..."
gh issue comment $ISSUE_NUM -b "⚡ **Workerが作業を開始しました**

- 👤 担当: Worker
- 🌿 ブランチ: \`$BRANCH\`
- 📅 開始時刻: $(date '+%Y-%m-%d %H:%M:%S')
- 📋 タスク: イシューの実装

タスク完了後、報告書を作成してイシューに投稿します。"

echo "✅ イシューにコメントを投稿しました"
echo ""

# フックに役割を通知
echo "$ROLE" > .claude/.current-role

# Git操作ブロックの注意喚起
echo ""
echo "💡 ヒント: git操作が必要な場合はManagerに依頼してください"
```