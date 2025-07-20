---
description: "現在のイシューブランチの状態、依存関係、マージ可能性を確認"
allowed-tools: ["Bash", "Read", "LS", "Grep"]
---

# 📊 イシュー駆動開発 - ステータス確認

**1. 現在のブランチ情報**
```bash
echo "🔍 現在のブランチ状態確認中..."
current_branch=$(git branch --show-current)

if [[ ! "$current_branch" =~ ^issue-[0-9]+ ]]; then
    echo "⚠️ 現在のブランチはイシューブランチではありません: $current_branch"
    echo "💡 ヒント: /project:issue-create でイシューブランチを作成"
    exit 1
fi

# イシュー番号抽出
issue_number=$(echo "$current_branch" | grep -oE '[0-9]+' | head -1)
echo "📋 Issue #$issue_number の状態確認"
```

**2. イシューメタデータ読み込み**
```bash
if [ -f ".issue-metadata/current.json" ]; then
    echo "📁 メタデータ読み込み中..."
    parent_issues=$(cat .issue-metadata/current.json | jq -r '.parent_issues[]' 2>/dev/null | tr '\n' ' ')
    child_issues=$(cat .issue-metadata/current.json | jq -r '.child_issues[]' 2>/dev/null | tr '\n' ' ')
else
    echo "⚠️ メタデータなし - GitHub から取得中..."
    gh issue view $issue_number --json body > /tmp/issue-temp.json
    body=$(cat /tmp/issue-temp.json | jq -r '.body')
    parent_issues=$(echo "$body" | grep -oE '親イシュー:.*#[0-9]+' | grep -oE '#[0-9]+' | tr -d '#' | tr '\n' ' ')
    child_issues=$(echo "$body" | grep -oE '子イシュー:.*#[0-9]+' | grep -oE '#[0-9]+' | tr -d '#' | tr '\n' ' ')
fi
```

**3. 依存関係の状態確認**
```bash
echo ""
echo "🔗 依存関係チェック:"

# 親イシューの状態確認
if [ -n "$parent_issues" ]; then
    echo "⬆️ 親イシュー:"
    for parent in $parent_issues; do
        state=$(gh issue view $parent --json state -q '.state' 2>/dev/null || echo "不明")
        echo "  - #$parent: $state"
        if [ "$state" = "OPEN" ]; then
            echo "    ⚠️ 未完了 - マージ前に完了が必要"
        fi
    done
else
    echo "⬆️ 親イシュー: なし"
fi

# 子イシューの状態確認
if [ -n "$child_issues" ]; then
    echo "⬇️ 子イシュー:"
    for child in $child_issues; do
        state=$(gh issue view $child --json state -q '.state' 2>/dev/null || echo "不明")
        echo "  - #$child: $state"
    done
else
    echo "⬇️ 子イシュー: なし"
fi
```

**4. 実装状況確認**
```bash
echo ""
echo "📈 実装状況:"

# worktree情報（あれば）
if [ -f ".issue-metadata/current.json" ]; then
    worktree_path=$(cat .issue-metadata/current.json | jq -r '.worktree_path' 2>/dev/null)
    if [ -n "$worktree_path" ] && [ "$worktree_path" != "null" ]; then
        echo "├── Worktree: $worktree_path"
    fi
fi

# 変更ファイル数
changed_files=$(git diff --name-only dev | wc -l | tr -d ' ')
echo "├── 変更ファイル数: $changed_files"

# コミット数
commits=$(git rev-list --count dev..HEAD)
echo "├── コミット数: $commits"

# 最新コミット
last_commit=$(git log -1 --oneline)
echo "└── 最新: $last_commit"
```

**5. コンフリクトリスク分析**
```bash
echo ""
echo "⚠️ コンフリクトリスク分析:"

# devブランチとの差分確認
echo "🔄 devブランチとの同期状態:"
git fetch origin dev >/dev/null 2>&1
behind=$(git rev-list --count HEAD..origin/dev)
ahead=$(git rev-list --count origin/dev..HEAD)

echo "├── Behind: $behind コミット"
echo "└── Ahead: $ahead コミット"

if [ $behind -gt 10 ]; then
    echo "   ⚠️ 大幅に遅れています - リベース推奨"
fi

# 影響ファイルの重複チェック
echo ""
echo "📁 他のイシューとの競合可能性:"
my_files=$(git diff --name-only dev | sort)

# 他のイシューブランチとの重複確認（サンプル）
echo "（他のアクティブイシューとの重複をチェック）"
```

**6. マージ可能性判定**
```bash
echo ""
echo "🎯 マージ可能性判定:"

can_merge=true
reasons=()

# 親イシューチェック
if [ -n "$parent_issues" ]; then
    for parent in $parent_issues; do
        state=$(gh issue view $parent --json state -q '.state' 2>/dev/null)
        if [ "$state" = "OPEN" ]; then
            can_merge=false
            reasons+=("親イシュー #$parent が未完了")
        fi
    done
fi

# 同期状態チェック
if [ $behind -gt 20 ]; then
    can_merge=false
    reasons+=("devブランチから大幅に遅れている")
fi

# 判定結果
if $can_merge; then
    echo "✅ マージ可能"
else
    echo "❌ マージ不可"
    echo "理由:"
    for reason in "${reasons[@]}"; do
        echo "  - $reason"
    done
fi
```

**7. 推奨アクション**
```bash
echo ""
echo "💡 推奨アクション:"

if [ $behind -gt 0 ]; then
    echo "1. リベース実行: git rebase origin/dev"
fi

if [ "$can_merge" = true ] && [ $commits -gt 0 ]; then
    echo "2. PR作成準備: /project:issue-merge"
fi

echo "3. 進捗報告: gh issue comment $issue_number -b \"進捗内容\""
```

$ARGUMENTS