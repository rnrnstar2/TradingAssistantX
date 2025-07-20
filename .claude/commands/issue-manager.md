---
description: "マネージャーモードで起動"
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
export ROLE="manager"
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
echo "🎯 Manager モード起動"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 イシュー: #$ISSUE_NUM"
echo "🌿 ブランチ: $BRANCH"
echo "👤 役割: 全体統括・品質管理"
echo ""
echo "✅ 権限:"
echo "  • Git操作（コミット、プッシュ、PR作成）"
echo "  • 品質チェック（lint、型チェック）"
echo "  • ワーカー作業の統括"
echo ""
echo "📝 推奨ワークフロー:"
echo "  1. ワーカーの作業を監督"
echo "  2. 定期的にgit statusで進捗確認"
echo "  3. npm run lint / check-typesで品質確認"
echo "  4. 完了時に /project:issue-pr でPR準備"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# GitHubイシューに作業開始コメントを投稿
echo ""
echo "💬 GitHubイシューに作業開始を通知中..."
gh issue comment $ISSUE_NUM -b "🎯 **Managerが作業を開始しました**

- 👤 担当: Manager - 全体統括
- 🌿 ブランチ: \`$BRANCH\`
- 📅 開始時刻: $(date '+%Y-%m-%d %H:%M:%S')
- 📋 作業内容: 全体統括・品質管理・Git操作

Workerの作業を監督し、品質チェックを行います。"

echo "✅ イシューにコメントを投稿しました"
echo ""

# フックに役割を通知
echo "$ROLE" > .claude/.current-role
```