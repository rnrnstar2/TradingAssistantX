# GitHub Secrets設定ガイド（Claude MAX Plan専用）

## 🚨 重要事項

### Claude Code GitHub Action の制限事項
現在、Claude Code GitHub Actionは**Claude MAX プランを直接サポートしていません**。

参考: https://github.com/anthropics/claude-code-action/issues/4#issuecomment-3046770474

> "Currently we don't support Claude Max in the GitHub action. You'll need to create an API key via console.anthropic.com in order to use the action."

### MAX プラン用の代替手段

このワークフローファイルは以下の代替手段を想定して作成されています：

1. **セルフホストランナーの使用** (推奨)
2. **MAXプラン認証の環境変数による直接設定**
3. **カスタムアクション実装**

## 📋 必要なSecretsの設定

以下のSecretsをGitHubリポジトリに設定してください。

### 設定手順

1. GitHubリポジトリの **Settings** タブを開く
2. 左サイドバーの **Secrets and variables** > **Actions** をクリック
3. **New repository secret** ボタンをクリック

### 🔑 必須Secrets（MAX プラン）

#### 1. CLAUDE_ACCESS_TOKEN
- **Name**: `CLAUDE_ACCESS_TOKEN`
- **Value**: MAXプランのアクセストークン
- **取得方法**: Claude MAXプランのアカウント設定から取得
- **形式**: `sk-ant-oat01-` で始まるトークン

#### 2. CLAUDE_REFRESH_TOKEN (オプション)
- **Name**: `CLAUDE_REFRESH_TOKEN`
- **Value**: MAXプランのリフレッシュトークン
- **用途**: アクセストークンの自動更新
- **形式**: `sk-ant-ort01-` で始まるトークン

### 🚫 使用しないSecrets

以下のSecretsは設定**しないでください**：
- ❌ **ANTHROPIC_API_KEY**: 別課金のAPIキー（MAXプランと競合）
- ❌ **CLAUDE_API_KEY**: 非推奨

## 🛡️ セキュリティベストプラクティス

### トークン管理
- ✅ GitHub Secretsにのみ保存
- ✅ 定期的な更新（推奨：月1回）
- ✅ 最小権限の原則を適用
- ❌ コードに直接埋め込み禁止
- ❌ ログ出力禁止
- ❌ パブリックリポジトリでの使用禁止

### アクセス制御
```yaml
# 推奨設定例
permissions:
  contents: read
  actions: read
  security-events: write
```

## 🔧 セルフホストランナー設定（推奨）

MAXプランでの最適な運用には、セルフホストランナーの使用を強く推奨します。

### セットアップ手順

1. **ランナーの準備**
   ```bash
   # Claude Code CLIをインストール
   npm install -g @anthropic-ai/claude-code
   
   # ログイン（MAXプランアカウント）
   claude-code auth login
   ```

2. **GitHub Actions Runnerの設定**
   ```bash
   # GitHub Actions Runnerをダウンロード・設定
   # リポジトリ設定 > Actions > Runners から指示に従う
   ```

3. **ワークフロー設定**
   ```yaml
   runs-on: self-hosted # セルフホストランナーを指定
   ```

## 📊 動作確認

### 1. ワークフロー実行テスト
```bash
# 手動実行でテスト
GitHub Actions > Claude Code CI/CD Pipeline > Run workflow
```

### 2. ログ確認項目
```
✅ Claude access token is available
✅ Claude CLI installed successfully  
✅ Environment preparation completed
✅ Claude analysis completed
```

### 3. エラーパターンとその対処

| エラーメッセージ | 原因 | 対処法 |
|-----------------|------|--------|
| `Claude access token not found` | Secret未設定 | CLAUDE_ACCESS_TOKEN を設定 |
| `Authentication failed` | トークン無効 | 新しいトークンで更新 |
| `Max plan not supported` | 公式制限 | セルフホストランナー使用 |

## 🚀 TradingAssistantX 固有の設定

### 環境変数の追加
プロジェクト固有の動作のため、以下の環境変数も設定可能：

```yaml
env:
  TRADING_MODE: "production"  # or "development"
  DATA_RETENTION_DAYS: "30"
  ANALYSIS_DEPTH: "detailed"  # or "basic"
```

### カスタムアクション設定
```yaml
claude_action: "trading-analysis"  # TradingAssistantX専用分析
```

## 🔄 定期メンテナンス

### 月次チェックリスト
- [ ] アクセストークンの有効期限確認
- [ ] ワークフロー実行履歴の確認
- [ ] セキュリティログの監査
- [ ] データ構造の整合性確認

### トークン更新手順
1. 新しいトークンを取得
2. GitHub Secretsを更新
3. テストワークフローを実行
4. 古いトークンを無効化

## 🆘 トラブルシューティング

### よくある問題

**Q: "Currently we don't support Claude Max in the GitHub action" エラー**
A: セルフホストランナーを使用するか、環境変数による直接認証を試してください。

**Q: 認証が通らない**
A: トークンの形式と有効期限を確認してください。MAXプランのトークンは `sk-ant-oat01-` で始まります。

**Q: ワークフローが途中で止まる**
A: GitHub Actions の実行時間制限（デフォルト6時間）を確認してください。

### サポートリソース
- Claude Code 公式ドキュメント: https://docs.anthropic.com/en/docs/claude-code
- GitHub Actions セルフホストランナー: https://docs.github.com/en/actions/hosting-your-own-runners
- TradingAssistantX プロジェクト要件: [REQUIREMENTS.md](../REQUIREMENTS.md)

---

**⚠️ 注意**: このセットアップガイドは、Claude MAXプランの制限に対する回避策を含んでいます。公式サポートが追加され次第、設定を更新してください。