# 【Worker向け指示書】 TASK-002: quick-start.md作成

## 🎯 タスク概要
docs/quick-start.mdを新規作成し、初回セットアップから実行までの手順を統合的に記述する。

## 📋 実装要件

### 1. 統合対象コンテンツ
以下の内容を適切に統合・整理してください：

1. **既存ドキュメントから**
   - docs/quick-guide.mdのセットアップ部分
   - docs/setup/x-api-authentication.mdの全内容（重要度高）
   - docs/ESSENTIALS.mdの起動時チェックコマンド
   - REQUIREMENTS.mdの実行方法（pnpm dev/start）

### 2. ドキュメント構成
```markdown
# TradingAssistantX クイックスタート

## 1. 環境セットアップ
### 前提条件
- Node.js 18以上
- pnpm
- X（Twitter）アカウント

### インストール手順
（quick-guide.mdのセットアップ部分）

## 2. X API認証設定
### OAuth 1.0a認証の設定
（x-api-authentication.mdの設定手順）

### トラブルシューティング
（x-api-authentication.mdのトラブルシューティング部分）

### セキュリティ対策
（x-api-authentication.mdのセキュリティ部分）

## 3. 初回実行
### 権限確認
（ESSENTIALS.mdの権限チェックコマンド）

### 実行コマンド
- 開発実行: pnpm dev（単一実行）
- 本番実行: pnpm start（ループ実行）

## 4. 必須概念の理解
### Claude Code SDK中心の自律システム
（簡潔な説明）

### YAMLドリブン設定
（data/ディレクトリの役割）

## 5. 動作確認
### 正常動作の確認方法
### よくあるエラーと対処法
```

### 3. 特別な注意事項
- **X API認証は最重要**: x-api-authentication.mdの内容は省略せず全て含める
- 診断ツールやテストスクリプトも含める
- セキュリティに関する注意事項は強調する

### 4. 品質要件
- 初心者でも迷わず実行できる詳細な手順
- コマンド例は全てコピペ可能な形式
- エラー時の対処法を具体的に記述
- 画像は使用せず、テキストとコードブロックで表現

### 5. 制約事項
- 新規ファイル作成は`docs/quick-start.md`のみ
- 統合元ファイルは変更しない
- X API認証部分は完全性を重視（省略禁止）

### 6. 完了条件
- docs/quick-start.mdが作成されている
- セットアップから初回実行まで一連の流れが記述されている
- X API認証設定が詳細に説明されている

## 📂 出力先
- **作成ファイル**: `docs/quick-start.md`

## 🚨 注意事項
- 手順の順序を論理的に配置
- 各ステップで期待される結果を明記
- エラーケースとその対処法を網羅的に記載