# TASK-003: TwitterAPI.io V2ログインパラメータ修正

## 📋 タスク概要

### 🎯 目標
TwitterAPI.io V2ログインで`user_name is required`エラーを修正し、正常な投稿実行を実現する。

### 🚨 特定された問題
- **エラー内容**: `{"detail":"user_name is required"}`
- **原因**: APIパラメータ名の不一致
  - **API期待値**: `user_name`
  - **現在送信値**: `username`

### ✅ 確認済み正常要素
- アプリケーション起動: 正常（TASK-002修正効果）
- Claude SDK: 正常（163文字コンテンツ生成確認）
- 基本認証: 正常（APIキー有効性確認済み）

## 🔧 修正要件

### 対象ファイル
```
src/kaito-api/core/client.ts
```

### 修正箇所
**行番号**: 約1327行目の`performLogin()`メソッド

**修正前**:
```typescript
const loginPayload = {
  username: process.env.X_USERNAME,  // ← user_nameに修正
  password: process.env.X_PASSWORD,
  email: process.env.X_EMAIL,
  proxy: process.env.X_PROXY,
  totp_code: "000000"
};
```

**修正後**:
```typescript
const loginPayload = {
  user_name: process.env.X_USERNAME,  // ← 修正: username → user_name
  password: process.env.X_PASSWORD,
  email: process.env.X_EMAIL,
  proxy: process.env.X_PROXY,
  totp_code: "000000"
};
```

## ✅ 修正手順

### Step 1: パラメータ名修正
1. `src/kaito-api/core/client.ts`を開く
2. `performLogin()`メソッド内の`loginPayload`オブジェクトを確認
3. `username: process.env.X_USERNAME,`を`user_name: process.env.X_USERNAME,`に変更
4. ファイル保存

### Step 2: 動作確認
```bash
pnpm dev
```
**期待される結果**: TwitterAPI.io V2認証成功、投稿実行完了

## 📝 技術仕様

### TwitterAPI.io V2 Login仕様
- **エンドポイント**: `/twitter/user_login_v2`
- **期待パラメータ**:
  - `user_name` (必須) ← **修正対象**
  - `password` (必須)
  - `email` (必須)
  - `proxy` (必須)
  - `totp_code` (必須)

### 環境変数マッピング
```
user_name ← X_USERNAME
password  ← X_PASSWORD  
email     ← X_EMAIL
proxy     ← X_PROXY
```

## 🚫 制約事項

### MVP制約遵守
- **1行修正のみ**: パラメータ名のみ変更、他は変更しない
- **既存ロジック維持**: 認証フロー・エラーハンドリングは維持
- **環境変数名維持**: `X_*`環境変数名は変更しない

## 📊 品質基準

### 必須要件
- [ ] TwitterAPI.io V2認証が`user_name is required`エラーなしで成功する
- [ ] 投稿が実際にTwitterに作成される
- [ ] セッション管理が正常に動作する

### 推奨要件
- [ ] リトライ機能が正常動作する
- [ ] 適切なログ出力がされる

## 🔄 完了報告

### 報告書作成先
```
tasks/20250729_175000_pnpm_dev_workflow_improvement/reports/REPORT-003-fix-v2-login-parameter.md
```

### 報告内容
1. **修正内容の詳細**
2. **pnpm dev実行結果と投稿成功確認**
3. **REQUIREMENTS.md最終目標達成の確認**

---

**🎉 最終目標まであと1ステップ**: この修正により、REQUIREMENTS.mdで定義された「1つ投稿を作成して実際に投稿する」が完全達成される予定です。