# TASK-001: TypeScript型エラー修正

## 🎯 緊急修正対象
8つのTypeScript型エラーを修正（Critical Fix A完了）

## 📋 エラー詳細
```
src/lib/action-specific-collector.ts(553,44): error TS2339: Property 'includes' does not exist on type 'URL'.
src/lib/action-specific-collector.ts(553,70): error TS2339: Property 'includes' does not exist on type 'URL'.
src/lib/action-specific-collector.ts(727,44): error TS2339: Property 'includes' does not exist on type 'URL'.
src/lib/action-specific-collector.ts(727,70): error TS2339: Property 'includes' does not exist on type 'URL'.
src/lib/action-specific-collector.ts(845,18): error TS18046: 'error' is of type 'unknown'.
src/lib/action-specific-collector.ts(918,44): error TS2339: Property 'includes' does not exist on type 'URL'.
src/lib/action-specific-collector.ts(918,70): error TS2339: Property 'includes' does not exist on type 'URL'.
src/lib/action-specific-collector.ts(1036,18): error TS18046: 'error' is of type 'unknown'.
```

## ⚡ 修正方針
1. **URL型問題**: `URL`オブジェクトに対して`.href`または`.toString()`を使用
2. **Error型問題**: `unknown`型エラーに対してtype guardingを実装

## 🔧 実装手順

### Step 1: URL型エラー修正 (lines 553, 727, 918)
```typescript
// 修正前
if (url.includes('some-pattern')) 

// 修正後  
if (url.href.includes('some-pattern'))
// または
if (url.toString().includes('some-pattern'))
```

### Step 2: Error型エラー修正 (lines 845, 1036)
```typescript
// 修正前
} catch (error) {
  console.error('Error:', error);

// 修正後
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : String(error));
```

## ✅ 検証要件
- `pnpm check-types` → 0エラー必須
- 既存機能への影響なし確認
- コードの可読性維持

## 📝 出力要件
完了後、以下に報告書作成：
`/Users/rnrnstar/github/TradingAssistantX/tasks/20250721_220716/reports/REPORT-001-typescript-error-fix.md`

## ⚠️ 制約事項
- 最小限の修正のみ（機能変更禁止）
- TypeScript strict mode準拠
- 既存テストが引き続き通過すること