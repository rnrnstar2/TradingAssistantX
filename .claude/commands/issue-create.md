---
description: "概要を説明するだけで自動的にGitHubイシューを作成し、開発環境をセットアップ"
allowed-tools: ["Bash", "Read", "Write", "TodoWrite", "WebFetch", "Task"]
---

# 🎯 イシュー駆動開発 - 対話的イシュー作成

**1. 対話開始メッセージ表示**
```bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 イシュー作成を開始します"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 イシューの内容について教えてください："
echo ""
echo "以下の内容を含めると、より良いイシューが作成できます："
echo "• 実装したい機能の概要"
echo "• 解決したい問題や課題"
echo "• 期待される成果物"
echo "• 関連する既存のイシュー番号（あれば）"
echo ""
echo "準備ができたら、イシューの内容を説明してください。"
```

**2. ユーザーからの情報収集**
ユーザーの説明を基に、以下の情報を整理します：
- **タイトル**: 簡潔で分かりやすい1行の要約
- **本文**: 
  - 概要
  - 詳細説明
  - 期待される成果
  - 技術的な考慮事項
- **ラベル**: 適切なカテゴリを選択（UI/UX, Backend, Integration, Testing等）
- **依存関係**: 親イシューや子イシューがあれば記載

**3. イシュー本文のテンプレート作成**
```bash
# イシューの本文を作成
cat > /tmp/issue-body.md << 'EOF'
## 📋 概要
[ユーザーの説明から概要を抽出]

## 🎯 目的・背景
[なぜこの機能が必要なのか、どんな問題を解決するのか]

## 📝 詳細説明
[実装の詳細、技術的な要件など]

## ✅ 完了条件
- [ ] [具体的な完了条件1]
- [ ] [具体的な完了条件2]
- [ ] [具体的な完了条件3]

## 🔗 関連情報
[親イシュー、子イシュー、参考資料など]

## 💡 技術的考慮事項
[実装上の注意点、制約事項など]
EOF
```

**4. イシュー作成確認**
```bash
echo ""
echo "📋 以下の内容でイシューを作成します："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "タイトル: [作成したタイトル]"
echo "ラベル: [選択したラベル]"
echo ""
echo "本文:"
cat /tmp/issue-body.md
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "この内容でよろしいですか？ (修正が必要な場合はお知らせください)"
```

**5. GitHubイシュー作成**
ユーザーの確認後：
```bash
# イシューを作成
issue_url=$(gh issue create \
    --title "[タイトル]" \
    --body-file /tmp/issue-body.md \
    --label "[ラベル]" \
    --assignee "@me")

# イシュー番号を取得
issue_number=$(echo $issue_url | grep -oE '[0-9]+$')
echo "✅ イシュー #$issue_number を作成しました: $issue_url"
```

**6. ブランチとWorktreeの作成**
```bash
# ブランチ名を生成（タイトルから）
branch_name="issue-${issue_number}-[簡潔な説明をケバブケースで]"

# Worktreeディレクトリパス
worktree_path="/Users/rnrnstar/github/ArbitrageAssistant/worktrees/$branch_name"
mkdir -p "$(dirname "$worktree_path")"

# Worktree作成（devブランチから新しいブランチを作成）
git worktree add "$worktree_path" -b "$branch_name" origin/dev
echo "✅ Worktree を作成しました: $worktree_path"
```

**7. イシュー情報ファイル作成**
```bash
echo ""
echo "📝 イシュー情報ファイルを作成中..."

# .issue-metadataディレクトリ作成
mkdir -p "$worktree_path/.issue-metadata"

# イシュー情報ファイル作成（Worktreeディレクトリに）
cat > "$worktree_path/.issue-metadata/current.json" << EOF
{
  "issue_number": $issue_number,
  "branch_name": "$branch_name",
  "worktree_path": "$worktree_path",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "parent_issues": [],
  "child_issues": [],
  "labels": ["[ラベル]"]
}
EOF

echo "✅ イシュー情報ファイルを作成しました"
```

**8. 依存パッケージのインストール**
```bash
echo ""
echo "📦 Worktreeディレクトリの依存パッケージをインストール中..."
cd "$worktree_path" && npm install && cd -
echo "✅ インストール完了"
```

**9. セットアップ完了の通知**
```bash
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 開発環境の準備が完了しました！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 作成された内容:"
echo "├── イシュー: #$issue_number"
echo "├── ブランチ: $branch_name"
echo "├── Worktree: $worktree_path"
echo "└── 役割: Manager"
echo ""
echo "📝 次のステップ:"
echo "1. 新しいターミナルで 'npm run go' を実行"
echo "2. 作成されたWorktreeを選択"
echo "3. Manager権限でClaude Codeが起動されます"
echo ""
echo "🚀 直接移動する場合:"
echo "cd $worktree_path"
echo "ROLE=manager ISSUE_NUMBER=$issue_number claude"
echo ""
echo "✨ イシュー駆動開発の準備が整いました！"
```
