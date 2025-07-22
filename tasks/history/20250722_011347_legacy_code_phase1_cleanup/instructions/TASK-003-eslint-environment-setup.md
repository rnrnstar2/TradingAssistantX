# ESLint実設定と実行環境整備

## 🎯 **重要度**: **MEDIUM - コード品質改善**

**タスクID**: TASK-003  
**優先度**: 中  
**実行順序**: **並列実行可能**  
**推定時間**: 15-20分

## 📋 **問題概要**

現在のESLint設定はプレースホルダーで実際の品質チェック不実行：

```bash
pnpm run lint
> echo 'Lint check passed'
```

**問題**: 実際のコード品質チェックが機能していない

## 🎯 **修正対象ファイル**

### 主要作業対象
- `package.json` - scripts設定修正
- `.eslintrc.js` または `.eslintrc.json` - ESLint設定
- `.eslintignore` - 除外設定

### 確認対象
- 既存ESLint設定ファイルの確認
- TypeScript対応ESLint設定

## 🔍 **具体的修正内容**

### 1. package.json scripts修正

**修正対象**: `package.json`

**修正前（プレースホルダー）**:
```json
{
  "scripts": {
    "lint": "echo 'Lint check passed'"
  }
}
```

**修正後（実際のESLint）**:
```json
{
  "scripts": {
    "lint": "eslint src/ --ext .ts,.tsx",
    "lint:fix": "eslint src/ --ext .ts,.tsx --fix",
    "lint:check": "eslint src/ --ext .ts,.tsx --max-warnings 0"
  }
}
```

### 2. ESLint設定ファイル作成・更新

**ファイル**: `.eslintrc.js`

**推奨設定**:
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    '@typescript-eslint/recommended-requiring-type-checking'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-floating-promises': 'error'
  },
  env: {
    node: true,
    browser: true,
    es2020: true
  }
};
```

### 3. .eslintignore設定

**ファイル**: `.eslintignore`

**推奨内容**:
```
dist/
node_modules/
*.config.js
*.config.ts
tests/real-execution/
tasks/
docs/
```

### 4. 必要パッケージ確認・追加

**確認対象**:
```bash
# 既存パッケージ確認
npm list | grep eslint

# 不足パッケージ特定
# @typescript-eslint/parser
# @typescript-eslint/eslint-plugin
# eslint
```

## 🔧 **修正手順**

### Step 1: 既存ESLint設定確認
```bash
# ESLint関連ファイル確認
find . -name ".eslint*" -type f
cat package.json | grep -A 3 -B 3 "lint"

# ESLintパッケージ確認
npm list | grep -i eslint
```

### Step 2: 設定ファイル作成・修正
1. `.eslintrc.js` 作成・更新
2. `.eslintignore` 作成・更新  
3. `package.json` scripts修正

### Step 3: ESLint実行テスト
```bash
# 基本実行テスト
pnpm run lint

# 自動修正テスト
pnpm run lint:fix

# 警告0チェック
pnpm run lint:check
```

### Step 4: 主要エラー修正
```bash
# 重大なESLintエラーのみ修正
# any型使用箇所の特定・修正
# 未使用変数の削除
```

## ✅ **修正完了判定基準**

### 必須チェック項目
- [ ] `pnpm run lint`でESLintが実際に実行される
- [ ] TypeScript対応ESLint設定完了
- [ ] 致命的なlintエラーなし（警告は許容）
- [ ] `.eslintignore`で適切な除外設定

### 品質チェック
- [ ] any型の検出・制限設定
- [ ] 未使用変数の検出設定
- [ ] TypeScript型チェック連携

## 📊 **出力要求**

### 修正完了報告書
**出力先**: `tasks/20250722_011347_legacy_code_phase1_cleanup/reports/REPORT-003-eslint-environment-setup.md`

**必須内容**:
1. **ESLint設定前後比較**
2. **実行結果（エラー・警告数）**
3. **修正した主要lint問題**
4. **今後の品質改善提案**

### ESLint実行結果ログ
**出力先**: `tasks/20250722_011347_legacy_code_phase1_cleanup/outputs/eslint-results.json`

**フォーマット**:
```json
{
  "実行日時": "2025-07-22T01:25:00Z",
  "対象ファイル数": 45,
  "エラー数": 2,
  "警告数": 8,
  "修正可能": 5,
  "主要エラー分類": ["any型使用", "未使用変数"]
}
```

## ⚠️ **制約・注意事項**

### 🚫 **絶対禁止**
- 過度に厳格なESLint設定の適用禁止
- 既存動作に影響する大幅な修正禁止
- パフォーマンス計測用コードの追加禁止

### ✅ **修正方針**
- **段階的改善**: 致命的エラーのみ修正
- **警告許容**: 警告は次フェーズで対応
- **最小限介入**: 動作に影響しない範囲で修正

### 📋 **品質基準**
- ESLintが実際に実行される
- TypeScript連携が正常動作
- 致命的コード品質問題がない

---

**実行指示**: 他のWorkerと並列実行可能。品質向上が目的であり、システム動作に直接影響しません。