# GitHub Secrets設定ガイド（MAXプラン専用）

## 必要なSecretsの設定

Claude Code SDK（MAXプラン課金内）を使用するために、以下のSecretsをGitHubリポジトリに設定してください。

⚠️ **重要**: MAXプランの課金内で利用するため、別途APIキーは使用しません。

### 設定手順

1. **GitHubリポジトリページに移動**
2. **Settings** タブをクリック
3. 左サイドバーの **Secrets and variables** > **Actions** をクリック
4. **New repository secret** ボタンをクリック

### 設定するSecrets（MAXプランのみ）

#### 1. CLAUDE_ACCESS_TOKEN
- **Name**: `CLAUDE_ACCESS_TOKEN`
- **Value**: `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`

#### 2. CLAUDE_REFRESH_TOKEN
- **Name**: `CLAUDE_REFRESH_TOKEN`  
- **Value**: `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`

### 🚫 使用しないSecrets

- ❌ **ANTHROPIC_API_KEY**: MAXプランとは別課金のため使用禁止

### セキュリティ注意事項

⚠️ **重要**: これらのトークンは機密情報です
- ✅ GitHub Secretsに保存する
- ❌ コードに直接書かない
- ❌ ログに出力しない
- ❌ 公開リポジトリにコミットしない

### 設定確認

Secretsが正しく設定されているかは、ワークフローの実行ログで確認できます：

```
✅ Claude access token is available
✅ Anthropic API key is available
```

### トークンの有効期限

- **アクセストークン**: 有効期限あり（expiresAt: 1753354264290）
- **リフレッシュトークン**: 長期有効

有効期限が切れた場合は、新しいトークンで更新してください。

### ワークフロー実行

Secretsを設定後、以下の方法でワークフローを実行できます：

1. **手動実行**: GitHub ActionsタブでWorkflow Dispatchを使用
2. **自動実行**: mainブランチへのpush時に自動実行

### トラブルシューティング

- トークンが認識されない場合: Secrets名の大文字小文字を確認
- 認証エラーの場合: トークンの有効期限を確認
- 権限エラーの場合: トークンのスコープを確認（user:inference, user:profile）