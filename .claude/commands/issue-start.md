---
description: "イシューの内容を分析し、実装計画を立てて指示の振り分けを行う（Manager専用）"
allowed-tools: ["Bash", "Read", "TodoWrite", "TodoRead", "Task"]
---

# 🚀 イシュー実装開始 - Manager用タスク分析と計画

**1. 権限確認**
```bash
# Manager権限の確認
if [ "$ROLE" != "manager" ]; then
    echo "❌ このコマンドはManager権限でのみ実行できます"
    echo "現在の権限: $ROLE"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 イシュー実装計画を開始します"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
```

**2. イシュー情報の読み込み**
```bash
# 現在のイシュー情報を取得
if [ -f ".issue-metadata/current.json" ]; then
    issue_number=$(jq -r '.issue_number' .issue-metadata/current.json)
    branch_name=$(jq -r '.branch_name' .issue-metadata/current.json)
    echo "📋 イシュー: #$issue_number"
    echo "🌿 ブランチ: $branch_name"
    echo ""
else
    echo "❌ イシュー情報が見つかりません"
    echo "issue-createコマンドで作成されたWorktreeディレクトリで実行してください"
    exit 1
fi
```

**3. GitHubからイシュー詳細を取得**
```bash
echo "📝 イシュー詳細を取得中..."
gh issue view $issue_number --json title,body,labels > /tmp/issue-details.json

issue_title=$(jq -r '.title' /tmp/issue-details.json)
issue_body=$(jq -r '.body' /tmp/issue-details.json)
issue_labels=$(jq -r '.labels[].name' /tmp/issue-details.json | paste -sd "," -)

echo "✅ イシュー情報を取得しました"
echo ""
echo "タイトル: $issue_title"
echo "ラベル: $issue_labels"
echo ""


# GitHubイシューに作業開始コメントを投稿
echo "💬 GitHubイシューに作業開始を通知中..."
gh issue comment $issue_number -b "🚀 **作業を開始しました**

- 👤 担当: Manager
- 🌿 ブランチ: \`$branch_name\`
- 📅 開始時刻: $(date '+%Y-%m-%d %H:%M:%S')

現在、イシュー内容を分析してタスク計画を作成中です..."

echo "✅ イシューにコメントを投稿しました"
echo ""
```

**4. イシュー内容の分析とタスク生成**

AIを使用してイシュー内容を分析し、具体的なタスクに分解します。

```task
description: イシュー分析とタスク計画
prompt: |
  以下のイシュー内容を分析し、MVP原則に基づいた実装計画を立ててください。
  
  イシュー番号: #$issue_number
  タイトル: $issue_title
  
  本文:
  $issue_body
  
  以下の形式で、具体的なタスクリストを作成してください：
  
  ## 実装計画
  
  ### タスク分割と並列実行可能性の分析
  - どのようにタスクを分割するか
  - 各タスクの独立性（並列実行可能か）
  - 推定作業時間
  
  ### 具体的なタスクリスト
  - [ ] タスク1（具体的な作業内容、推定時間）
  - [ ] タスク2（具体的な作業内容、推定時間）
  - [ ] タスク3（具体的な作業内容、推定時間）
  
  ### 並列実行計画
  - 並列グループ1: [タスク番号]
  - 並列グループ2: [タスク番号]
  - 直列実行: [依存関係があるタスク]
  
  注意事項：
  - MVP制約を厳守（最小限の実装）
  - 複雑な機能は避ける
  - 各タスクは1-2時間で完了できる粒度に
  - ファイル競合を避けるための分割
```

**5. TodoListの作成**

分析結果をもとにTodoListを作成します。

```bash
echo ""
echo "📋 TodoListを作成中..."
# AIタスクの結果を使用してTodoWriteツールでタスクを作成
```

**6. タスク指示書の作成**
```bash
echo ""
echo "📝 タスク指示書を作成中..."

# tasks/currentディレクトリの準備
mkdir -p tasks/current/{instructions,reports}

# AIタスクの結果を使用して指示書を作成
# ここでは並列実行可能なタスクに分割して指示書を作成
```

**7. Worker向けコピペプロンプト生成**
```bash
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 実装開始の準備"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 タスク指示書の作成とWorker向けプロンプトの生成を行います"
echo ""
echo "Managerが以下を実行します："
echo "1. 並列実行可能なタスクの分析"
echo "2. 各タスクの指示書作成"
echo "3. Worker向けコピペプロンプトの生成"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 実装時の注意事項:"
echo "• 各Workerは独立したタスクを実行"
echo "• ファイル競合を避けるための適切な分割"
echo "• MVP制約の厳守"
echo ""
echo "📋 Manager次のアクション:"
echo "1. タスク分析結果に基づいた指示書作成"
echo "2. Worker向けプロンプトの具体的な生成"
echo "3. 各Workerの進捗をTodoListで確認"
echo "4. 報告書のレビューと品質管理"
echo ""

# GitHubイシューにタスク計画完了を通知
echo "💬 GitHubイシューにタスク計画を通知中..."
gh issue comment $issue_number -b "📋 **タスク計画が完了しました**

- ✅ イシュー内容の分析完了
- ✅ TodoListの作成完了
- ✅ タスク指示書の作成完了
- ✅ Worker向けプロンプトの生成完了

🚀 **並列実行を開始します**

Managerがタスク分析に基づいて、適切な数のWorkerに作業を振り分けます。
各Workerが作業を開始次第、進捗をコメントで報告します。"

echo "✅ タスク計画をイシューに投稿しました"
```

$ARGUMENTS