# scriptsディレクトリ構造整合性修正指示書

**タスクID**: SCRIPTS-CLEANUP-001  
**作成者**: Manager権限  
**対象**: Worker権限  
**緊急度**: 中  
**実行時間予想**: 15分

## 🎯 目的

scriptsディレクトリがdocs/directory-structure.mdに定義されていない構造逸脱を修正し、プロジェクト構造の整合性を回復する。

## 📊 現状分析

### 問題点
- ❌ scriptsディレクトリがdocs/directory-structure.mdに未記載
- ❌ CLAUDE.mdの構造逸脱防止機構に抵触
- ⚠️ 6ファイル中5ファイルが現在未使用
- ⚠️ テストファイルが散在

### 使用状況
- **使用中**: `scripts/test-login-only.js` (package.json:26で参照)
- **未使用**: その他5ファイル（過去の開発・検証用）

## 🛠️ 実行手順

### Step 1: 事前確認
```bash
# 現在の参照状況を確認
grep -r "scripts/" package.json
ls -la scripts/
```

### Step 2: 必要ファイルの移動
```bash
# tests/auth/ディレクトリ作成
mkdir -p tests/auth

# 使用中ファイルの移動
mv scripts/test-login-only.js tests/auth/login-test.js
```

### Step 3: package.json更新
```bash
# package.jsonの参照を修正
# 変更前: "test:login": "node scripts/test-login-only.js"
# 変更後: "test:login": "node tests/auth/login-test.js"
```

**具体的な変更**:
```json
{
  "scripts": {
    "test:login": "node tests/auth/login-test.js"
  }
}
```

### Step 4: 不要ファイル削除
```bash
# 未使用ファイルの削除
rm scripts/generate-validation-report.ts
rm scripts/step-by-step-validation.ts
rm scripts/test-claude-sdk.ts
rm scripts/test-login-only.ts
rm scripts/validate-3layer-auth.ts
```

### Step 5: scriptsディレクトリ削除
```bash
# ディレクトリが空になったことを確認
ls -la scripts/
# 空の場合、ディレクトリを削除
rmdir scripts/
```

### Step 6: 動作確認
```bash
# 移動したテストスクリプトが正常動作するか確認
pnpm run test:login
```

### Step 7: 最終確認
```bash
# scriptsディレクトリが削除されたことを確認
ls -la | grep scripts
# package.jsonの参照が正しく更新されたことを確認
grep "test:login" package.json
```

## ⚠️ 注意事項

### 必須確認
- [ ] package.jsonの変更前にバックアップを取る
- [ ] `pnpm run test:login`が正常動作することを確認
- [ ] scriptsディレクトリが完全に削除されることを確認

### エラー対応
- **移動失敗**: ファイルの権限・存在確認
- **テスト失敗**: パス参照の確認、依存関係の確認
- **削除失敗**: ディレクトリが空かどうか確認

## 📋 完了基準

### 成功条件
- ✅ scriptsディレクトリが存在しない
- ✅ package.jsonの参照が`tests/auth/login-test.js`に更新
- ✅ `pnpm run test:login`が正常動作
- ✅ 構造逸脱が解消されている

### 検証方法
```bash
# 構造確認
ls -la | grep scripts  # 何も出力されないこと
grep "scripts/" package.json  # 何も出力されないこと
grep "tests/auth/login-test.js" package.json  # 正しく参照されていること

# 動作確認
pnpm run test:login  # 正常実行されること
```

## 🔄 元に戻す方法（緊急時）

```bash
# scriptsディレクトリ再作成
mkdir scripts
# ファイルを戻す
mv tests/auth/login-test.js scripts/test-login-only.js
# package.json修正
# 変更: "test:login": "node scripts/test-login-only.js"
```

## 📝 実行報告

実行完了後、以下の項目を報告してください：

- [ ] Step 1-7の全ステップが完了
- [ ] `pnpm run test:login`の実行結果
- [ ] 最終的なディレクトリ構造確認結果
- [ ] 発生した問題・エラーの詳細（あれば）

---

**Manager権限確認**: ✅ 権限内での指示書作成完了  
**Worker権限必須**: ファイル移動・削除・package.json変更  
**実行推奨時期**: 即座実行可能