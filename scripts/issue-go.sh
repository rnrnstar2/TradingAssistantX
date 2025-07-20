#!/bin/bash

# 🎯 Worktree接続スクリプト - 既存のWorktreeに移動してClaude Codeを起動

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Worktree接続システム"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Worktreesディレクトリの確認
WORKTREES_DIR="$(git rev-parse --show-toplevel)/worktrees"

if [ ! -d "$WORKTREES_DIR" ]; then
    echo "❌ Worktreesディレクトリが見つかりません"
    exit 1
fi

# 利用可能なWorktreeの一覧表示
echo "📂 利用可能なWorktree:"
echo ""

# Worktreeディレクトリを配列に格納
worktree_dirs=()
worktree_names=()
index=1

for dir in "$WORKTREES_DIR"/issue-*; do
    if [ -d "$dir" ]; then
        dirname=$(basename "$dir")
        worktree_dirs+=("$dir")
        worktree_names+=("$dirname")
        
        # イシュー番号を抽出
        issue_num=$(echo "$dirname" | grep -o 'issue-[0-9]*' | grep -o '[0-9]*')
        
        # メタデータから情報取得（存在する場合）
        if [ -f "$dir/.issue-metadata/current.json" ]; then
            created_at=$(grep -o '"created_at"[[:space:]]*:[[:space:]]*"[^"]*"' "$dir/.issue-metadata/current.json" | cut -d'"' -f4 | cut -d'T' -f1)
            echo "  $index) #$issue_num - $dirname"
            echo "     作成日: $created_at"
        else
            echo "  $index) #$issue_num - $dirname"
        fi
        echo ""
        ((index++))
    fi
done

if [ ${#worktree_dirs[@]} -eq 0 ]; then
    echo "❌ 利用可能なWorktreeがありません"
    echo ""
    echo "新しいイシューを作成するには:"
    echo "  /project:issue-create"
    exit 1
fi

# Worktree選択
echo -n "接続するWorktreeの番号を選択してください (1-${#worktree_dirs[@]}): "
read -r selected_index

# 入力検証
if ! [[ "$selected_index" =~ ^[0-9]+$ ]] || [ "$selected_index" -lt 1 ] || [ "$selected_index" -gt ${#worktree_dirs[@]} ]; then
    echo "❌ 無効な選択です"
    exit 1
fi

# 選択されたWorktree
selected_worktree="${worktree_dirs[$((selected_index-1))]}"
selected_name="${worktree_names[$((selected_index-1))]}"

echo ""
echo "✅ 選択: $selected_name"
echo ""

# ロール選択
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👤 ロールを選択してください:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1) Manager - Git操作・セッション管理"
echo "  2) Worker  - 実装作業専門"
echo ""
echo -n "ロールを選択 (1-2): "
read -r role_choice

case $role_choice in
    1)
        ROLE="manager"
        role_display="Manager"
        role_desc="Git操作・セッション管理責任者"
        ;;
    2)
        ROLE="worker"
        role_display="Worker"
        role_desc="実装作業専門"
        ;;
    *)
        echo "❌ 無効な選択です"
        exit 1
        ;;
esac

# ロール選択完了

# イシュー番号の抽出
issue_number=$(echo "$selected_name" | grep -o 'issue-[0-9]*' | grep -o '[0-9]*')

# 移動とClaude Code起動
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Claude Code起動準備"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 接続情報:"
echo "├── Worktree: $selected_name"
echo "├── イシュー: #$issue_number"
echo "├── ロール: $role_display ($role_desc)"
echo "└── 場所: $selected_worktree"
echo ""
echo "3秒後に起動します..."
sleep 3

# Worktreeに移動
cd "$selected_worktree"

# Claude Code起動
export ROLE="$ROLE"
export ISSUE_NUMBER="$issue_number"

echo ""
echo "🚀 $role_display として Claude Code を起動中..."
claude --dangerously-skip-permissions