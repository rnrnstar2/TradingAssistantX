# Claude Code連携ガイド

## 概要
Claude Codeのカスタムスラッシュコマンドと自動化機能を使用して、イシュー駆動型並列開発を効率化します。

## スラッシュコマンド一覧

### 🎯 `/project:issue-create <issue-number>`
GitHubイシューから新しいブランチを作成し、開発環境をセットアップします。

**使用例:**
```bash
/project:issue-create 123
```

**機能:**
- イシュー情報の取得
- ブランチ名の自動生成（`issue-123-feature-name`）
- 依存関係の解析
- 開発環境の初期化
- 初期Todoリストの作成

---

### 📊 `/project:issue-status`
現在のイシューブランチの状態、依存関係、マージ可能性を確認します。

**使用例:**
```bash
/project:issue-status
```

**機能:**
- 現在のブランチ情報表示
- 親/子イシューの状態確認
- 実装進捗の表示
- コンフリクトリスク分析
- マージ可能性の判定

---

### 🔀 `/project:issue-merge`
イシューのマージ準備を行い、PR作成を支援します。

**使用例:**
```bash
/project:issue-merge
```

**機能:**
- 依存関係の最終確認
- コンフリクトチェック
- 品質チェック（テスト、リント、型チェック）
- PR作成コマンドの生成
- マージブロッカーの特定

---

### 🚀 `/project:issue-parallel`
並列実行可能なイシューを分析し、複数Worker用の指示書を生成します。

**使用例:**
```bash
/project:issue-parallel
```

**機能:**
- アクティブイシューの収集
- 依存関係グラフの構築
- ファイル競合の検出
- 並列実行可能グループの特定
- Worker指示書の自動生成

---

### 🔧 `/project:merge-conflict`
マージコンフリクトの解決を支援します。

**使用例:**
```bash
/project:merge-conflict
```

**機能:**
- コンフリクト状況の分析
- 依存関係コンテキストの収集
- ファイルタイプ別の解決提案
- Claude Code用プロンプト生成
- 段階的解決アプローチの提示

## Claude Codeでのマージ処理

### コンフリクト解決時のプロンプト
```
以下のマージコンフリクトを解決してください：
- 現在のブランチ: issue-123-feature
- マージ先: dev
- 依存イシュー: #120, #121
- 影響ファイル: [ファイルリスト]

MVP原則に従い、最小限の変更で解決してください。
```

### マージ実行プロセス
Claude Codeがコンフリクトを解決する際のプロセス：
1. **両方の変更を理解** - 各ブランチの変更内容を分析
2. **依存関係を考慮** - 関連するイシューとの整合性確認
3. **最適な解決策を選択** - MVP原則に基づく最小限の変更

## ワークフロー例

### 1. 新機能開発
```bash
# イシューからブランチ作成
/project:issue-create 123

# 実装...

# 状態確認
/project:issue-status

# マージ準備
/project:issue-merge
```

### 2. 並列開発の管理
```bash
# Manager役として
/project:issue-parallel

# 生成された指示書を各Workerに配布
# 各Workerが独立して作業

# 進捗確認
/project:issue-status
```

### 3. コンフリクト解決
```bash
# リベース時にコンフリクト発生
git rebase origin/dev

# コンフリクト解決支援
/project:merge-conflict

# Claude Codeで解決後
git add .
git rebase --continue
```

## ベストプラクティス

### イシュー作成時
1. テンプレートを使用して依存関係を明記
2. 影響ファイルをリストアップ
3. マージ優先度を設定

### 開発中
1. 定期的に `/project:issue-status` で状態確認
2. 親イシューの完了を待ってからPR作成
3. 早めのリベースでコンフリクトを最小化

### マージ時
1. `/project:issue-merge` で事前チェック
2. 品質テストをパス
3. 依存関係を考慮した順序でマージ

## トラブルシューティング

### コマンドが見つからない
```bash
# コマンド一覧確認
ls .claude/commands/

# 権限確認
chmod +x .claude/commands/*.md
```

### 依存関係が正しく認識されない
- イシューテンプレートの形式を確認
- `.issue-metadata/current.json` を手動編集

### 並列実行で競合が発生
- `/project:issue-parallel` を再実行
- ファイル影響範囲を明確化

## カスタマイズ

### 新しいコマンドの追加
1. `.claude/commands/` に `.md` ファイル作成
2. YAMLフロントマターで設定
3. Bashスクリプトでロジック実装

### 既存コマンドの修正
- 各コマンドファイルを直接編集
- `allowed-tools` で使用可能ツールを調整