# TradingAssistantX クイックスタート

## 1. 環境セットアップ

### 前提条件
- Node.js 18以上
- pnpm
- X（Twitter）アカウント

### インストール手順

```bash
# リポジトリのクローン
git clone https://github.com/your-username/TradingAssistantX.git
cd TradingAssistantX

# 依存関係のインストール
pnpm install
```

## 2. X API認証設定

### OAuth 1.0a認証の設定

TradingAssistantXはOAuth 1.0aを使用してX APIに接続します。OAuth 1.0aは安定した認証プロトコルで、Xの投稿API（v1.1）に最適な認証方式です。

#### アプリケーション作成

1. [X Developer Portal](https://developer.x.com/en/portal/dashboard) にアクセス
2. 「Create Project」をクリック（プロジェクト > アプリの順で作成）
3. プロジェクト名を設定（例：TradingAssistantX-Project）
4. アプリケーション名を設定（例：TradingAssistantX）
5. アプリケーション用途を選択
6. 利用規約に同意してアプリを作成

#### Consumer Key/Secret取得

1. 作成したアプリの「Keys and Tokens」タブに移動
2. **Consumer Keys**セクションで以下を取得：
   - **API Key (Consumer Key)**: アプリケーションを識別
   - **API Key Secret (Consumer Secret)**: アプリケーション認証用シークレット

#### Access Token/Secret生成

1. 同じ「Keys and Tokens」タブの**Authentication Tokens**セクションで：
2. 「Generate」をクリックしてAccess Token/Secret を生成
3. 以下の情報を記録：
   - **Access Token**: ユーザー認証トークン
   - **Access Token Secret**: ユーザー認証シークレット

#### アプリ権限設定

1. 「Settings」タブに移動
2. 「App permissions」セクションで「Edit」をクリック  
3. **Read and Write**を選択（投稿機能に必要）
4. 必要に応じて**Direct Messages**も選択
5. 変更を保存

### 環境変数の設定

以下の環境変数を設定してください：

```bash
# X (Twitter) OAuth 1.0a Credentials
X_CONSUMER_KEY=your_consumer_key_here
X_CONSUMER_SECRET=your_consumer_secret_here
X_ACCESS_TOKEN=your_access_token_here
X_ACCESS_TOKEN_SECRET=your_access_token_secret_here

# Optional: Test Mode
X_TEST_MODE=false
```

#### 設定方法

**方法1: .envファイル使用**
```bash
# プロジェクトルートに .env ファイルを作成
cp .env.example .env
# エディタで値を設定
nano .env
```

**方法2: 環境変数で直接設定**
```bash
export X_CONSUMER_KEY=your_consumer_key_here
export X_CONSUMER_SECRET=your_consumer_secret_here
export X_ACCESS_TOKEN=your_access_token_here
export X_ACCESS_TOKEN_SECRET=your_access_token_secret_here
```

### 認証設定のテスト

#### セットアップヘルパーの実行
```bash
# OAuth 1.0a設定ヘルパーを実行
npx tsx src/scripts/oauth1-setup-helper.ts
```

このスクリプトは以下を行います：
1. 環境変数の確認と検証
2. OAuth 1.0a署名の生成テスト  
3. X API への接続テスト
4. 認証情報の保存（オプション）

#### セットアップ出力例
```
🔧 OAuth 1.0a Setup Helper
📋 環境変数チェック中...
✅ Consumer Key: 設定済み
✅ Consumer Secret: 設定済み  
✅ Access Token: 設定済み
✅ Access Token Secret: 設定済み

🔐 OAuth 1.0a署名テスト...
✅ 署名生成: 成功

🌐 X API接続テスト...
✅ API接続: 成功
👤 認証ユーザー: @your_username

🎉 OAuth 1.0a設定完了！
```

#### 接続テストの実行
```bash
# OAuth 1.0a接続テスト
npx tsx src/scripts/oauth1-test-connection.ts
```

### トラブルシューティング

#### 401 Unauthorized
**症状**: 
```
Error: 401 Unauthorized - Invalid or expired token
```

**解決策**:
1. **環境変数の確認**:
   ```bash
   echo "Consumer Key: $X_CONSUMER_KEY"
   echo "Consumer Secret: $X_CONSUMER_SECRET"  
   echo "Access Token: $X_ACCESS_TOKEN"
   echo "Access Token Secret: $X_ACCESS_TOKEN_SECRET"
   ```

2. **認証情報の再生成**:
   - X Developer Portalで新しいAccess Token/Secretを生成
   - 古いトークンを無効化
   - 環境変数を更新

3. **アプリ権限の確認**:
   - 「Read and Write」権限が設定されているか確認
   - 権限変更後は新しいAccess Tokenが必要

#### 403 Forbidden
**症状**:
```
Error: 403 Forbidden - Read-only application cannot POST
```

**解決策**:
1. **権限設定の確認**:
   - アプリ設定で「Read and Write」が選択されているか確認
   - 権限変更後は**必ずAccess Token/Secretを再生成**

2. **新しいトークン生成**:
   ```bash
   # 権限変更後は必ずトークンを再生成
   # X Developer Portal > Keys and Tokens > Regenerate
   ```

#### 署名エラー (Invalid signature)
**症状**:
```
Error: Invalid signature - OAuth signature verification failed
```

**解決策**:
1. **システム時刻の確認**:
   ```bash
   # システム時刻が正確か確認
   date
   # 必要に応じて時刻同期
   sudo sntp -sS time.apple.com  # macOS
   ```

2. **認証情報の文字エンコーディング**:
   - 認証情報にスペース・改行が含まれていないか確認
   - 特殊文字が正しくエンコードされているか確認

3. **環境変数の再設定**:
   ```bash
   # 認証情報をクリーンに再設定
   unset X_CONSUMER_KEY X_CONSUMER_SECRET X_ACCESS_TOKEN X_ACCESS_TOKEN_SECRET
   # 再設定
   source .env
   ```

### セキュリティ対策

#### 認証情報の保護
- **絶対にコードに直接書き込まない**
- `.env` ファイルは `.gitignore` に追加済みか確認
- 本番環境では環境変数またはシークレット管理サービスを使用

#### アクセス制限
- 必要最小限の権限のみ設定
- 開発・テスト・本番環境で異なる認証情報を使用
- 定期的な認証情報のローテーション

#### 監視とログ
- API使用量の定期監視
- 異常なアクセスパターンの検知
- エラーログの適切な記録（認証情報は除く）

## 3. 初回実行

### 権限確認

実行前に必ず権限を確認してください：

```bash
echo "ROLE: $ROLE" && git branch --show-current
```

権限に応じて以下のドキュメントを参照：
- Manager権限: `docs/roles/manager-role.md`
- Worker権限: `docs/roles/worker-role.md`

### 実行コマンド

#### 開発実行（単一実行）
```bash
pnpm dev
```
- 1回だけ実行して終了
- 開発・デバッグ用
- すぐに結果を確認したい場合

#### 本番実行（ループ実行）
```bash
pnpm start
```
- 1日15回の定時実行
- 最適投稿時間に自動実行
- 継続的な運用向け

## 4. 必須概念の理解

### Claude Code SDK中心の自律システム

TradingAssistantXは、Claude Code SDKが完全に自律的に意思決定を行うシステムです：

- **自律的テーマ決定**: 市場分析して最適テーマを決定
- **自律的データ収集**: 必要データを自動収集・分析
- **自律的投稿作成**: 最適な投稿内容を生成
- **継続的最適化**: 実行結果から学習し品質向上

### YAMLドリブン設定

`data/`ディレクトリ配下のYAMLファイルでシステムの動作を制御：

```
data/
├── config/         # システム設定
├── current/        # 現在の状態
├── learning/       # 学習データ
└── archives/       # アーカイブ
```

## 5. 動作確認

### 正常動作の確認方法

1. **初回実行の確認**
   ```bash
   # 開発モードで実行
   pnpm dev
   ```

2. **ログ確認**
   ```bash
   # 実行ログを確認
   cat data/current/execution-log.yaml
   ```

3. **投稿結果の確認**
   ```bash
   # 本日の投稿記録を確認
   cat data/current/today-posts.yaml
   ```

4. **アカウント状態の確認**
   ```bash
   # 現在のアカウント状態を確認
   cat data/current/account-status.yaml
   ```

### よくあるエラーと対処法

#### API認証エラー
```
Error: X API authentication failed
```
**対処法**: 環境変数の設定を確認し、接続テストを再実行

#### データ収集エラー
```
Error: Failed to collect RSS data
```
**対処法**: インターネット接続を確認し、RSSソースの設定を確認

#### 投稿制限エラー
```
Error: Rate limit exceeded
```
**対処法**: しばらく待機後、再実行（15分程度）

#### YAMLパースエラー
```
Error: Failed to parse YAML file
```
**対処法**: YAMLファイルの構文を確認（インデント、コロンなど）

### 診断ツールの使用

問題が解決しない場合は、診断ツールを使用：

```bash
# 詳細診断の実行
DEBUG=oauth1a npx tsx src/scripts/oauth1-test-connection.ts

# 認証プロセスの詳細ログ
X_DEBUG=true npx tsx src/scripts/oauth1-setup-helper.ts
```

### サポート

設定に問題がある場合：

1. **診断スクリプトの実行**
2. **X API Status の確認**: [X API Status](https://api.twitterstat.us/)
3. **Developer Portal の確認**: アプリの設定と制限状況
4. **コミュニティサポート**: [X Developer Community](https://twittercommunity.com/)

---

**重要**: OAuth 1.0a認証情報は機密情報です。適切に管理し、第三者と共有しないでください。