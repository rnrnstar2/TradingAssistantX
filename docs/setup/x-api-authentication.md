# X (Twitter) API Authentication Setup

## Overview

TradingAssistantXはOAuth 1.0aを使用してX APIに接続します。OAuth 1.0aは安定した認証プロトコルで、Xの投稿API（v1.1）に最適な認証方式です。

## Prerequisites

- X Developer Account
- Approved X App with Read/Write permissions
- Node.js環境（TradingAssistantX実行用）

## OAuth 1.0a について

OAuth 1.0aは署名ベースの認証プロトコルです。主な特徴：

- **署名認証**: リクエストごとに署名を生成して認証
- **トークンベース**: Consumer Key/Secret と Access Token/Secret の組み合わせ
- **安定性**: 長期利用に適した安定したプロトコル
- **X API v1.1対応**: 投稿機能に最適

## Setup Steps

### 1. X Developer Portal Configuration

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

### 2. Environment Variables

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

### 3. Quick Setup

OAuth 1.0a認証設定の簡単セットアップには、以下のヘルパースクリプトを使用できます：

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

### 4. Testing Your Configuration

認証設定をテストするには、接続テストスクリプトを使用します：

```bash
# OAuth 1.0a接続テスト
npx tsx src/scripts/oauth1-test-connection.ts
```

#### テスト内容
1. **環境変数検証**: 必要な認証情報の存在確認
2. **署名生成テスト**: OAuth 1.0a署名の正確性確認
3. **API接続テスト**: 実際のX APIへの接続確認
4. **ユーザー情報取得**: 認証ユーザーの情報取得テスト

#### 成功時の出力
```
🧪 OAuth 1.0a Connection Test
✅ 環境変数: 全て設定済み
✅ OAuth署名: 生成成功
✅ API接続: 成功
👤 ユーザー: @your_username (User ID: 123456789)
🔐 認証スコープ: read, write

✨ OAuth 1.0a認証設定完了！
```

## Troubleshooting

### よくあるエラーと解決策

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

### 診断ツールの使用方法

#### 詳細診断の実行
```bash
# 詳細診断ツールを実行（デバッグ情報付き）
DEBUG=oauth1a npx tsx src/scripts/oauth1-test-connection.ts
```

#### ログ出力での確認
```bash
# 認証プロセスの詳細ログを確認
X_DEBUG=true npx tsx src/scripts/oauth1-setup-helper.ts
```

#### 手動署名検証
```bash
# OAuth 1.0a署名を手動で検証
npx tsx -e "
const crypto = require('crypto');
const params = {
  oauth_consumer_key: process.env.X_CONSUMER_KEY,
  oauth_token: process.env.X_ACCESS_TOKEN,
  oauth_signature_method: 'HMAC-SHA1',
  oauth_timestamp: Math.floor(Date.now() / 1000),
  oauth_nonce: crypto.randomBytes(16).toString('hex'),
  oauth_version: '1.0'
};
console.log('OAuth Parameters:', params);
"
```

## Security Notes

### 認証情報の保護
- **絶対にコードに直接書き込まない**
- `.env` ファイルは `.gitignore` に追加済みか確認
- 本番環境では環境変数またはシークレット管理サービスを使用

### アクセス制限
- 必要最小限の権限のみ設定
- 開発・テスト・本番環境で異なる認証情報を使用
- 定期的な認証情報のローテーション

### 監視とログ
- API使用量の定期監視
- 異常なアクセスパターンの検知
- エラーログの適切な記録（認証情報は除く）

## Support

### 設定に問題がある場合

1. **診断スクリプトの実行**:
   ```bash
   npx tsx src/scripts/oauth1-test-connection.ts
   ```

2. **X API Status の確認**:
   - [X API Status](https://api.twitterstat.us/) でサービス状況を確認

3. **Developer Portal の確認**:
   - アプリの設定と制限状況を確認
   - API使用量の監視

4. **コミュニティサポート**:
   - [X Developer Community](https://twittercommunity.com/) で質問
   - X APIの[公式ドキュメント](https://developer.twitter.com/en/docs/twitter-api/v1) を参照

---

**重要**: OAuth 1.0a認証情報は機密情報です。適切に管理し、第三者と共有しないでください。