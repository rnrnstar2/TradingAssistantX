# TASK-005: OAuth 2.0コードのクリーンアップ

## 概要
OAuth 1.0aへの移行完了後、不要になったOAuth 2.0関連のファイルとコードを削除します。これにより、コードベースをクリーンに保ち、混乱を防ぎます。

## 実装対象

### 1. 削除するファイル
以下のOAuth 2.0関連スクリプトを削除：
- `src/scripts/oauth2-complete-auth.ts`
- `src/scripts/oauth2-auth-helper.ts`
- `src/scripts/oauth2-debug-test.ts`
- `src/scripts/oauth2-detailed-diagnostics.ts`
- `src/scripts/oauth2-callback-server.ts`
- `src/scripts/oauth2-token-exchange.ts`
- `src/scripts/advanced-oauth2-test.ts`

### 2. 削除する設定ファイル（存在する場合）
- `data/oauth2-tokens.yaml`
- OAuth 2.0関連の設定ファイル

### 3. 環境変数のクリーンアップ
プロジェクト全体で以下の環境変数への参照を削除：
- `X_OAUTH2_CLIENT_ID`
- `X_OAUTH2_CLIENT_SECRET`
- `X_OAUTH2_REDIRECT_URI`
- `X_OAUTH2_SCOPES`
- `X_OAUTH2_ACCESS_TOKEN`
- `X_OAUTH2_REFRESH_TOKEN`
- `X_OAUTH2_EXPIRES_AT`

### 4. package.jsonのスクリプト更新（必要に応じて）
OAuth 2.0関連のnpmスクリプトがある場合は削除または更新

## 実装手順

### 1. 依存関係の確認
削除前に以下を確認：
- 他のファイルからインポートされていないこと
- package.jsonのスクリプトから参照されていないこと

### 2. gitでの削除
```bash
git rm src/scripts/oauth2-*.ts
```

### 3. 関連するインポートの削除
grep等で残存する参照を検索し、削除

### 4. テストの実行
削除後、既存のテストが通ることを確認

## 品質基準
- 削除後もビルドが成功すること
- テストが通ること
- 未使用のインポートが残っていないこと

## 依存関係
- TASK-001〜004が完了し、OAuth 1.0a実装が動作確認済みであること

## 注意事項
- 削除前に現在のコミットを記録（ロールバック可能にするため）
- 段階的に削除し、各段階でビルドとテストを確認
- チーム内で削除タイミングを共有