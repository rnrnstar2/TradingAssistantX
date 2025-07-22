# TASK-003: X API認証エラー修正

## 🎯 タスク概要
X API投稿時に発生している認証エラー（403/401）を修正し、正常な投稿を可能にする。

## 📋 問題詳細
現在発生しているエラー：
```
X API error: 403 - Authenticating with OAuth 2.0 Application-Only is forbidden for this endpoint. Supported authentication types are [OAuth 1.0a User Context, OAuth 2.0 User Context].

X API error: 401 - Unauthorized
```

### 根本原因
- 投稿エンドポイント用にはOAuth 2.0 User Contextが必要
- 現在はApplication-Only認証を使用している可能性

## ✅ 修正要件

### 調査対象ファイル
- `src/lib/x-client.ts` - X API クライアント実装
- `data/account-config.yaml` - API認証設定
- 環境変数やOAuth設定の確認

### 修正内容
1. **認証方式の確認と修正**：
   - OAuth 2.0 User Contextへの移行
   - 必要に応じてOAuth 1.0a User Contextの検討

2. **API設定の確認**：
   ```typescript
   // x-client.ts で適切なclient初期化
   // User Context認証の実装
   ```

3. **環境変数の確認**：
   - `X_BEARER_TOKEN`, `X_API_KEY`, `X_API_SECRET`等の設定
   - User Context認証に必要な追加設定

## 🔧 実装方針

### Phase 1: 現状分析
1. 現在のx-client.ts実装の詳細確認
2. 使用している認証方式の特定
3. 必要な認証情報の確認

### Phase 2: 認証修正
1. 適切な認証方式への変更
2. 必要に応じてアクセストークン取得フローの実装
3. エラーハンドリングの改善

### Phase 3: 設定更新
1. 環境変数設定の更新指示
2. account-config.yamlの更新（必要に応じて）

## 🧪 テスト確認
修正後、以下を確認：
1. 投稿API (`POST /2/tweets`) が正常に動作すること
2. 引用ツイート、リツイート、リプライが正常に動作すること
3. 認証エラーが解消されること
4. テストモードでのモック動作が正常であること

## 📋 品質基準
- TypeScript strict mode準拠
- ESLint通過必須
- 適切なエラーハンドリング実装
- セキュリティ面での設定確認

## 📂 出力管理
- 報告書: `tasks/20250721_194608/reports/REPORT-003-xapi-auth-fix.md`
- ルートディレクトリへの出力は禁止

## ⚠️ 注意事項
- **セキュリティ最優先**: 認証情報の適切な管理
- **API制限遵守**: レート制限等のAPI制約確認
- **環境設定**: 本番/テスト環境での動作確認
- **既存機能維持**: 情報収集機能に影響を与えない

## 🔐 セキュリティ要件
- 認証情報をコードにハードコード禁止
- 環境変数での安全な設定管理
- 適切な権限スコープの設定

---
**実装完了後、報告書で修正内容と動作確認結果を報告してください。環境設定が必要な場合は具体的な手順も記載してください。**