---
description: "PR作成とClaude Code用情報"
allowed-tools: ["Bash", "Write"]
---

```bash
branch=$(git branch --show-current)
issue_num=$(echo $branch | grep -oE '[0-9]+')

# worktree情報取得
worktree_info=""
if [ -f ".issue-metadata/current.json" ]; then
    worktree_path=$(cat .issue-metadata/current.json | jq -r '.worktree_path' 2>/dev/null)
    if [ -n "$worktree_path" ] && [ "$worktree_path" != "null" ]; then
        worktree_info="Worktree: $worktree_path"
    fi
fi

# Claude Code用マージ情報
cat > merge-info-$issue_num.md << EOF
# マージ情報

イシュー: #$issue_num
ブランチ: $branch
$worktree_info

## 変更内容
$(git diff --name-only origin/dev)

## コミット
$(git log --oneline origin/dev..HEAD)

## マージ時の注意
- 設計書に従ってマージしてください
- コンフリクトは適宜解決してください
EOF

echo "📋 merge-info-$issue_num.md を作成しました"
echo ""

# PR作成の準備
echo "🚀 PR作成を準備中..."

# ブランチをpush
echo "📤 ブランチをpush中..."
git push -u origin HEAD

# イシュー情報を取得
if [ -n "$issue_num" ]; then
    issue_title=$(gh issue view $issue_num --json title -q .title 2>/dev/null || echo "Issue #$issue_num")
    
    # PR本文の作成
    pr_body="Closes #$issue_num

## 概要
$issue_title の実装

## 変更内容
$(git diff --name-only origin/dev | head -10)

## テスト
- [ ] ローカルでの動作確認
- [ ] Lintチェック通過
- [ ] 型チェック通過

## その他
merge-info-$issue_num.md に詳細情報があります"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 PR作成コマンド（コピペ用）:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "gh pr create --base dev --title \"$issue_title\" --body \"$pr_body\""
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "💡 PRを作成すると:"
    echo "  • 自動的にイシュー #$issue_num にリンクされます"
    echo "  • PRマージ時にイシューが自動クローズされます"
    echo ""
    echo "📋 次のステップ:"
    echo "  1. 上記コマンドをコピーして実行"
    echo "  2. ブラウザでPRを確認"
    echo "  3. レビュー依頼を送信"
    echo ""
    echo "🔀 マージする場合:"
    echo "  /project:issue-merge"
    echo "  → インタラクティブにマージ＆自動クリーンアップ"
else
    echo "⚠️  イシュー番号が取得できませんでした"
    echo "通常のPR作成コマンドを使用してください: gh pr create"
fi
```