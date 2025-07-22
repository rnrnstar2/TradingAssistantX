# TASK-001: Vitest設定修正

## 🎯 実装目標

ActionSpecificCollectorシステムの最終調整として、vitestテスト環境の設定を修正し、テストスイートが正常に実行できる状態にする。

## 🔧 実装内容

### 1. Vitest設定ファイル作成・修正
- `vitest.config.ts` または `vitest.config.js` の設定を確認・修正
- ESM/CommonJS互換性の問題を解決
- TypeScript + ESMモジュールの適切な設定

### 2. Package.json調整
- 必要に応じてpackage.jsonの `"type": "module"` 設定を確認
- vitest関連の依存関係を確認

### 3. テスト実行確認
- `pnpm test` コマンドが正常に実行できることを確認
- 既存のテストファイルが正常に動作することを確認

## 📋 実装制約

### 技術制約
- **TypeScript strict mode**: 既存の型安全性を維持
- **ESM互換性**: 既存のESMモジュール構成を維持
- **既存テスト保持**: 既存のテストファイル内容は変更不要

### 品質基準
- `pnpm run build` が成功すること（既に確認済み）
- `pnpm run check-types` が成功すること（既に確認済み）  
- `pnpm test` が正常に実行できること

## 🎯 期待される成果物

1. **設定ファイル**: 修正された vitest.config.ts/js
2. **テスト実行**: `pnpm test` の正常実行確認
3. **報告書**: 修正内容と確認結果の報告

## 📂 出力管理規則

**🚨 CRITICAL**: 出力管理規則の厳格遵守が必要

### 承認された出力場所
- ✅ **設定ファイル**: プロジェクトルート（vitest.config.ts/js）
- ✅ **報告書**: `tasks/20250721_160207_final_adjustments/reports/REPORT-001-vitest-config-fix.md`

### 禁止事項
- 🚫 ルートディレクトリへの一時ファイル作成禁止
- 🚫 `*-analysis.md` 等の不適切な命名ファイル作成禁止

## 💡 実装ガイド

### Step 1: 現在の設定確認
```bash
# 既存のvitest設定確認
ls -la | grep vitest
cat vitest.config.* 2>/dev/null || echo "設定ファイルなし"
```

### Step 2: 設定ファイル作成/修正
一般的なESM対応のvitest設定:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

### Step 3: テスト実行確認
```bash
pnpm test
```

## 🚀 完了条件

- [ ] `pnpm test` が正常に実行される
- [ ] 既存のテストファイルが正常に動作する
- [ ] TypeScript型チェックが継続して成功する
- [ ] 報告書の作成完了

---
**重要**: このタスクはActionSpecificCollectorシステム完成の最後の調整です。設定修正のみに集中し、既存の実装は変更しないでください。