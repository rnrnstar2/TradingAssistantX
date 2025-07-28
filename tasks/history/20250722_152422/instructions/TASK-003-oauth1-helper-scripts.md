# TASK-003: OAuth 1.0aヘルパースクリプト作成

## 概要
OAuth 1.0a認証のセットアップとデバッグを支援するヘルパースクリプトを作成します。これらのスクリプトは、OAuth 2.0用の既存スクリプトを参考に、OAuth 1.0a向けに新規作成します。

## 実装対象
新規作成する3つのスクリプト：
1. `src/scripts/oauth1-setup-helper.ts` - 初期セットアップ支援
2. `src/scripts/oauth1-test-connection.ts` - 接続テスト
3. `src/scripts/oauth1-diagnostics.ts` - 詳細診断

## 実装要件

### 1. oauth1-setup-helper.ts
初期セットアップを支援するインタラクティブツール：
- 環境変数の存在確認
- OAuth 1.0a認証情報の設定ガイド
- .envファイルのサンプル生成機能
- 必要な環境変数：
  ```
  X_CONSUMER_KEY=
  X_CONSUMER_SECRET=
  X_ACCESS_TOKEN=
  X_ACCESS_TOKEN_SECRET=
  ```
- 設定値の検証（空文字チェックなど）

### 2. oauth1-test-connection.ts
OAuth 1.0a認証のテストツール：
- 認証情報の読み込み確認
- テストツイートの投稿（--dry-runオプション対応）
- アカウント情報の取得テスト
- エラー時の詳細なデバッグ情報表示
- 成功時のレスポンス表示

### 3. oauth1-diagnostics.ts
詳細な診断ツール：
- 環境変数の完全性チェック
- OAuth 1.0a署名生成のテスト
- API呼び出しのシミュレーション
- ネットワーク接続確認
- 診断レポートの生成（YAML形式）
- トラブルシューティング提案

### 4. 共通要件
すべてのスクリプトで：
- コマンドライン引数のサポート（必要に応じて）
- 分かりやすいコンソール出力（色付き）
- エラーハンドリングと有用なエラーメッセージ
- 非同期処理の適切な実装

### 5. 実装の参考
既存のOAuth 2.0スクリプトの構造を参考にしつつ、OAuth 1.0a向けに調整：
- `src/scripts/oauth2-complete-auth.ts`
- `src/scripts/oauth2-debug-test.ts`
- `src/scripts/oauth2-detailed-diagnostics.ts`

## 品質基準
- TypeScript strict modeでエラーなし
- ユーザーフレンドリーなインターフェース
- 明確で有用なエラーメッセージ
- 適切なログ出力

## 依存関係
- TASK-001で作成されるoauth1-client.ts
- TASK-002で更新されるx-client.ts

## 実行例
```bash
# セットアップヘルパー
pnpm tsx src/scripts/oauth1-setup-helper.ts

# 接続テスト
pnpm tsx src/scripts/oauth1-test-connection.ts
pnpm tsx src/scripts/oauth1-test-connection.ts --dry-run

# 診断
pnpm tsx src/scripts/oauth1-diagnostics.ts
pnpm tsx src/scripts/oauth1-diagnostics.ts --verbose
```