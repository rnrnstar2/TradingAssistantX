# TASK-001: ES Module対応修正

## 🎯 タスク概要
`pnpm dev`実行時の「ReferenceError: require is not defined in ES module scope」エラーを修正する

## 📋 問題詳細
- **エラーファイル**: `src/utils/monitoring/health-check.ts`
- **エラー箇所**: 230行目 `if (require.main === module) {`
- **原因**: ES module環境で`require`構文を使用
- **影響**: 開発サーバー起動不能

## 🔧 修正内容

### 対象ファイル
`/Users/rnrnstar/github/TradingAssistantX/src/utils/monitoring/health-check.ts`

### 修正箇所
**修正前（230-232行目）**:
```typescript
// Run if called directly
if (require.main === module) {
  main();
}
```

**修正後**:
```typescript
// Run if called directly
if (import.meta.main) {
  main();
}
```

## 🚀 実装手順
1. **ファイル読み込み**: 対象ファイルの現在の内容確認
2. **ES module修正**: `require.main === module` を `import.meta.main` に置換
3. **動作確認**: `pnpm dev` コマンド実行でエラー解消確認
4. **品質チェック**: TypeScript型チェック・lint通過確認

## ✅ 完了基準
- [ ] ES module構文に正しく修正完了
- [ ] `pnpm dev` コマンドがエラーなく起動
- [ ] TypeScript型チェック通過
- [ ] ESLintチェック通過

## 📋 注意事項
- **最小限修正**: 該当行のみの修正に留める
- **import.meta対応**: Node.js ES module標準の`import.meta.main`を使用
- **実用性重視**: 開発環境の迅速な復旧を優先

## 🎯 品質基準
- TypeScript strict modeでエラーなし
- 元の機能性を完全維持
- ES module仕様への完全準拠

---
**実装完了後、報告書を以下に作成**:
📋 `tasks/20250721_155746_es_module_fix/reports/REPORT-001-es-module-fix.md`