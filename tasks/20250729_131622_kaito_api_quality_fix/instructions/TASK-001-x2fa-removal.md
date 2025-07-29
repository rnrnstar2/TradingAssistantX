# TASK-001: X_2FA_SECRET廃止対応

## 概要
廃止されたX_2FA_SECRET環境変数をドキュメントとコードから完全に削除する。
V2認証では2段階認証が不要になったため、関連コードも削除する。

## 要件定義書参照
- REQUIREMENTS.md: V2標準化方針
- ユーザー指示: X_2FA_SECRETは廃止されたログインなので不要

## 削除対象

### 1. ドキュメント更新
#### docs/kaito-api.md
以下のセクションから2FA関連記述を削除：
- 環境変数セクション
- 認証方式説明
- 実装教訓セクション
- ベストプラクティスセクション

**削除対象の記述**:
- `X_2FA_SECRET=your_totp_secret_key`
- 2段階認証の説明
- TOTP秘密鍵に関する記述
- 2FA有効時の特別対応説明

**保持する記述**:
- V2ログイン認証の基本説明
- プロキシ設定
- 基本的な環境変数（USERNAME, EMAIL, PASSWORD）

### 2. コード修正
#### 環境変数チェック機能
- `src/kaito-api/core/config.ts`
- `src/kaito-api/core/v2-login-auth.ts`
- X_2FA_SECRETを参照している箇所を削除

#### 認証フロー簡素化
- 2FA処理コードの削除
- TOTP生成ライブラリの削除（使用していれば）
- 2FA関連エラーメッセージの削除

### 3. テストコード修正
- X_2FA_SECRETを使用するテストケースの削除
- 2FA関連のモックデータ削除

## 実装手順

### 1. 影響箇所の特定
```bash
# X_2FA_SECRETを参照している箇所を検索
grep -r "X_2FA_SECRET" docs/ src/
grep -r "2FA" docs/ src/
grep -r "totp" docs/ src/
```

### 2. ドキュメント修正
1. docs/kaito-api.mdから2FA関連記述を削除
2. 環境変数セクションの簡素化
3. 認証フローの説明を単純化

### 3. コード修正
1. 環境変数チェック機能から2FA関連削除
2. V2認証コードの簡素化
3. エラーメッセージの調整

### 4. 動作確認
- V2認証が2FA無しで正常動作すること
- 削除後もTypeScriptコンパイルが通ること
- 既存テストが正常実行されること

## 修正例

### Before（削除対象）
```typescript
// 削除対象の例
const requiredVars = ['X_USERNAME', 'X_EMAIL', 'X_PASSWORD', 'X_2FA_SECRET'];
if (process.env.X_2FA_SECRET) {
  // 2FA処理
}
```

### After（修正後）
```typescript
// 修正後
const requiredVars = ['X_USERNAME', 'X_EMAIL', 'X_PASSWORD'];
// 2FA処理は削除
```

## 品質基準
- X_2FA_SECRET関連コードの完全削除
- TypeScriptコンパイルエラーなし
- 既存V2認証機能の正常動作
- ドキュメントの整合性確保

## 注意事項
- 基本的なV2認証機能は維持
- プロキシ設定は保持
- 他の環境変数（USERNAME, EMAIL, PASSWORD）は維持
- 後方互換性は考慮不要（廃止された機能のため）

## 成果物
- 更新されたdocs/kaito-api.md
- 修正されたソースコード
- 動作確認結果
- 報告書: `tasks/20250729_131622_kaito_api_quality_fix/reports/REPORT-001-x2fa-removal.md`