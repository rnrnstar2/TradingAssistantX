# TASK-004: ドキュメントとテストの更新

## 概要
OAuth 2.0からOAuth 1.0aへの移行に伴い、ドキュメントとテストコードを更新します。ユーザーが新しい認証方式をスムーズに使用できるよう、包括的なドキュメントを提供します。

## 実装対象

### 1. ドキュメント更新
- `docs/setup/x-api-authentication.md` - 完全書き換え
- `README.md` - OAuth関連セクションの更新（必要に応じて）
- `.env.example` - 新規作成または更新

### 2. テスト更新
- `tests/unit/x-client.test.ts` - OAuth 1.0a対応
- 関連する統合テストの更新

## 実装要件

### 1. x-api-authentication.md の更新
#### 削除するセクション
- OAuth 2.0 PKCEフローの説明
- OAuth 2.0トークン管理
- リフレッシュトークンの説明
- Authorization URLの生成手順

#### 追加するセクション
- OAuth 1.0a概要と仕組み
- X Developer Portalでの設定手順
  - アプリケーション作成
  - Consumer Key/Secret取得
  - Access Token/Secret生成
- 環境変数設定ガイド
- セットアップ手順（oauth1-setup-helper.tsの使用）
- トラブルシューティング
  - よくあるエラーと解決策
  - 診断ツールの使用方法

#### 構成案
```markdown
# X (Twitter) API Authentication Setup

## Overview
TradingAssistantXはOAuth 1.0aを使用してX APIに接続します。

## Prerequisites
- X Developer Account
- Approved X App with Read/Write permissions

## Setup Steps

### 1. X Developer Portal Configuration
[詳細な手順...]

### 2. Environment Variables
[必要な環境変数の説明...]

### 3. Quick Setup
[oauth1-setup-helper.tsの使用方法...]

### 4. Testing Your Configuration
[oauth1-test-connection.tsの使用方法...]

## Troubleshooting
[一般的な問題と解決策...]
```

### 2. .env.example の作成/更新
```env
# X (Twitter) OAuth 1.0a Credentials
X_CONSUMER_KEY=your_consumer_key_here
X_CONSUMER_SECRET=your_consumer_secret_here
X_ACCESS_TOKEN=your_access_token_here
X_ACCESS_TOKEN_SECRET=your_access_token_secret_here

# Optional: Test Mode
X_TEST_MODE=false
```

### 3. テストコードの更新
- OAuth 2.0モックを削除
- OAuth 1.0a用のモックを作成
- 署名生成のテストケース追加
- 環境変数読み込みのテスト更新

### 4. 削除対象
以下のOAuth 2.0関連スクリプトのドキュメント参照を削除：
- oauth2-complete-auth.ts
- oauth2-auth-helper.ts
- oauth2-debug-test.ts
- oauth2-detailed-diagnostics.ts
- oauth2-callback-server.ts
- oauth2-token-exchange.ts
- advanced-oauth2-test.ts

## 品質基準
- 明確で分かりやすい日本語/英語併記
- 実際の画面キャプチャは不要（テキストベースで説明）
- コピー&ペースト可能なコマンド例
- 初心者にも分かりやすい説明

## 依存関係
- TASK-001〜003の実装完了後に作業可能

## 注意事項
- セキュリティに関する警告を適切に記載
- 認証情報を公開しないよう注意喚起
- .gitignoreに.envが含まれていることの確認