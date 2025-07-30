# TASK-004: TwitterAPI.io TOTP認証設定追加

## 📋 タスク概要

### 🎯 目標
TwitterAPI.io V2ログインで`totp_secret is required`エラーを解決し、完全な投稿実行を実現する。

### 🚨 特定された問題
- **エラー内容**: `{"detail":"totp_secret is required"}`
- **原因**: TOTP（2要素認証）秘密鍵が未設定
- **必要な環境変数**: `X_TOTP_SECRET`

### ✅ 確認済み正常要素
- user_nameパラメータ: 正常（TASK-003修正効果）
- 基本認証情報: 正常（username, password, email, proxy）
- Claude SDK: 正常（117文字コンテンツ生成確認）

## 🔧 修正要件

### Phase 1: コード修正

#### 対象ファイル
```
src/kaito-api/core/client.ts
```

#### 修正箇所
**行番号**: 約1327行目の`performLogin()`メソッド

**修正前**:
```typescript
const loginPayload = {
  user_name: process.env.X_USERNAME,
  password: process.env.X_PASSWORD,
  email: process.env.X_EMAIL,
  proxy: process.env.X_PROXY,
  totp_code: "000000" // Placeholder - needs proper TOTP implementation
};
```

**修正後**:
```typescript
const loginPayload = {
  user_name: process.env.X_USERNAME,
  password: process.env.X_PASSWORD,
  email: process.env.X_EMAIL,
  proxy: process.env.X_PROXY,
  totp_secret: process.env.X_TOTP_SECRET || "" // TOTP secret key
};
```

#### エラーチェック修正
**修正前**:
```typescript
if (!loginPayload.user_name || !loginPayload.password || !loginPayload.email || !loginPayload.proxy) {
  throw new Error("Missing required environment variables: X_USERNAME, X_PASSWORD, X_EMAIL, X_PROXY");
}
```

**修正後**:
```typescript
if (!loginPayload.user_name || !loginPayload.password || !loginPayload.email || !loginPayload.proxy || !loginPayload.totp_secret) {
  throw new Error("Missing required environment variables: X_USERNAME, X_PASSWORD, X_EMAIL, X_PROXY, X_TOTP_SECRET");
}
```

### Phase 2: 環境変数設定

#### .envファイル更新
`.env`ファイルに以下を追加：
```
# Twitter 2FA TOTP Secret (from Twitter account settings)
X_TOTP_SECRET=your_totp_secret_key_here
```

### Phase 3: 設定検証関数更新

#### 対象ファイル
```
src/kaito-api/core/config.ts
```

#### 修正箇所
`validateEnvironmentVariables()`関数で`X_TOTP_SECRET`も検証対象に追加：

**修正前**:
```typescript
const requiredVariables = ["X_USERNAME", "X_PASSWORD", "X_EMAIL", "X_PROXY"];
```

**修正後**:
```typescript
const requiredVariables = ["X_USERNAME", "X_PASSWORD", "X_EMAIL", "X_PROXY", "X_TOTP_SECRET"];
```

## 📝 技術仕様

### TwitterAPI.io V2 Login完全仕様
- **エンドポイント**: `/twitter/user_login_v2`
- **必須パラメータ**:
  - `user_name` ✅ (TASK-003完了)
  - `password` ✅
  - `email` ✅
  - `proxy` ✅
  - `totp_secret` ← **新規追加**

### TOTP Secret取得方法
1. Twitterアカウント → Settings → Security → Two-factor authentication
2. Authenticator appの設定でQRコードまたは秘密鍵を取得
3. 取得した秘密鍵を`X_TOTP_SECRET`に設定

## 🚫 制約事項

### MVP制約遵守
- **最小限修正**: パラメータ追加と検証機能のみ変更
- **既存ロジック維持**: 認証フロー・エラーハンドリングは維持
- **セキュリティ**: TOTP秘密鍵の適切な管理

## 📊 品質基準

### 必須要件
- [ ] TwitterAPI.io V2認証が`totp_secret is required`エラーなしで成功する
- [ ] 投稿が実際にTwitterに作成される
- [ ] 環境変数検証が正しく動作する

### セキュリティ要件
- [ ] TOTP秘密鍵が適切に環境変数で管理される
- [ ] 秘密鍵がログ出力されない

## ⚠️ 重要注意事項

### ユーザー作業が必要
この修正を完了するには、**ユーザー側でTwitterアカウントの2FA設定からTOTP秘密鍵を取得**する必要があります。

### 設定手順（ユーザー向け）
1. Twitterにログイン
2. Settings → Security → Two-factor authentication
3. Authenticator appを有効化
4. 表示される秘密鍵をコピー
5. `.env`ファイルに`X_TOTP_SECRET=コピーした秘密鍵`を追加

## 🔄 完了報告

### 報告書作成先
```
tasks/20250729_175000_pnpm_dev_workflow_improvement/reports/REPORT-004-add-totp-secret-support.md
```

### 報告内容
1. **コード修正の詳細**
2. **環境変数設定の完了確認**
3. **ユーザー向けTOTP設定手順の説明**
4. **pnpm dev実行結果（TOTP設定後）**

---

**🎯 最終目標達成への最後の修正**: この修正により、Twitter 2FA認証が完全に対応され、REQUIREMENTS.mdの「1つ投稿を作成して実際に投稿する」が完全達成される予定です。