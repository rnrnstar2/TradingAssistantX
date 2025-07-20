---
description: "イシューブランチをdevにマージして自動クリーンアップ"
allowed-tools: ["Bash", "Read"]
assistant-instructions: |
  このコマンドを実行している時は、必ず日本語で応答してください。
  マージプロセスの状況を簡潔に日本語で説明してください。
---

```bash
# Claude Codeへの指示: このコマンド実行中は日本語で応答すること
# worktreeかメインリポジトリかを判定
if [[ "$PWD" == *"/worktrees/"* ]]; then
    echo "📍 現在worktreeにいます"
    echo "メインリポジトリに移動します..."
    cd /Users/rnrnstar/github/ArbitrageAssistant
fi

# devブランチに切り替え
echo "🔀 devブランチに切り替え中..."
git checkout dev
git pull origin dev

# 最新の情報を取得
echo "🔄 リモートブランチ情報を更新中..."
git fetch --all --prune

# マージ対象のブランチを取得
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 マージ可能なイシューブランチ:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
branches=$(git branch -r | grep "origin/issue-" | sed 's/origin\///' | sed 's/^[[:space:]]*//')
if [ -z "$branches" ]; then
    echo "❌ マージ可能なイシューブランチがありません"
    exit 0
fi
echo "$branches" | nl -v 1

# マージするブランチを選択
echo ""
echo -n "マージするブランチ番号を入力 (Enter でキャンセル): "
read selection

if [ -z "$selection" ]; then
    echo "❌ キャンセルしました"
    exit 0
fi

# 選択したブランチを取得
branch_to_merge=$(echo "$branches" | sed -n "${selection}p")
if [ -z "$branch_to_merge" ]; then
    echo "❌ 無効な選択です"
    exit 1
fi

# イシュー番号を取得
issue_num=$(echo $branch_to_merge | grep -oE '[0-9]+')

echo ""
echo "🔀 $branch_to_merge をマージします..."

# マージ実行
if git merge origin/$branch_to_merge; then
    echo "✅ マージ成功！"
    
    # devブランチをpush
    echo ""
    echo "📤 devブランチをpush中..."
    if git push origin dev; then
        echo "✅ push成功！"
        
        # 自動クリーンアップ
        echo ""
        echo "🧹 自動クリーンアップを開始..."
        
        # worktreeの削除
        worktree_path="/Users/rnrnstar/github/ArbitrageAssistant/worktrees/issue-$issue_num"*
        if [ -d $worktree_path ]; then
            echo "📁 Worktreeを削除中..."
            git worktree remove $worktree_path --force
            echo "✅ Worktree削除完了"
        fi
        
        # ローカルブランチの削除
        if git branch | grep -q "$branch_to_merge"; then
            echo "🌿 ローカルブランチを削除中..."
            git branch -D $branch_to_merge
            echo "✅ ローカルブランチ削除完了"
        fi
        
        # リモートブランチの削除
        echo "☁️  リモートブランチを削除中..."
        git push origin --delete $branch_to_merge
        echo "✅ リモートブランチ削除完了"
        
        # メタデータのクリーンアップ
        if [ -f ".issue-metadata/issue-$issue_num.json" ]; then
            rm -f .issue-metadata/issue-$issue_num.json
            echo "✅ メタデータ削除完了"
        fi
        
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✨ マージとクリーンアップ完了！"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "📋 次のステップ:"
        echo "  • GitHubでPRをクローズ"
        echo "  • イシュー #$issue_num は自動的にクローズされます"
    else
        echo "❌ push失敗"
        echo "手動でpushしてからクリーンアップしてください"
    fi
else
    echo "❌ マージ失敗"
    echo "コンフリクトを解決してから再度実行してください"
fi
```