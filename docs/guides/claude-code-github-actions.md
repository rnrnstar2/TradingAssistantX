# Claude Code GitHub Actions設定ガイド

## 概要
GitHub ActionsでClaude Code Max Planを使用するための設定ガイドです。

## 必要な認証情報
Claude Max サブスクリプションのOAuth認証情報が必要です：
- Access Token
- Refresh Token  
- Expires At (タイムスタンプ)

## GitHub Secretsの設定

1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」にアクセス

2. 以下のシークレットを追加：
   - `CLAUDE_ACCESS_TOKEN`: `sk-ant-oat01-...`形式のアクセストークン
   - `CLAUDE_REFRESH_TOKEN`: `sk-ant-ort01-...`形式のリフレッシュトークン
   - `CLAUDE_EXPIRES_AT`: 有効期限のタイムスタンプ（例：1784351143700）

## ワークフローの使い方

### 1. コメントベースの実行（既存）
`.github/workflows/claude-code.yml`
- イシューやPRで`@claude`とコメントすると自動実行
- コードレビューや修正提案に最適

### 2. 手動実行（Max Plan）
`.github/workflows/claude-code-max.yml`
- GitHub Actionsタブから手動実行
- 複雑なタスクや大規模な変更に対応
- モデル選択可能（Opus/Sonnet/Haiku）

### 3. X投稿分析（Claude Code統合）
`.github/workflows/x-post-claude-code.yml`
- Claude Codeでデータ分析と投稿生成
- スケジュール実行（1日3回）または手動実行
- ファイル操作やbashコマンド実行が可能

## 実行例

### 手動実行の手順
1. Actions タブを開く
2. 「Claude Code Max Plan」を選択
3. 「Run workflow」をクリック
4. タスク内容を入力（例：「hedge-systemのWebSocket実装を最適化」）
5. モデルを選択（デフォルト：Opus）
6. 「Run workflow」で実行

## 参考リンク
- [claude-code-action](https://github.com/Akira-Papa/claude-code-action) - OAuth対応版

## トークンの更新
トークンの有効期限が切れた場合：
1. ローカルで`claude login`を実行
2. `~/.claude/.credentials.json`から新しいトークンを取得
3. GitHub Secretsを更新