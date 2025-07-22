# DOM型定義とブラウザ環境設定修正

## 🎯 **重要度**: **HIGH - ブラウザ関連機能不全**

**タスクID**: TASK-002  
**優先度**: 高  
**実行順序**: **並列実行可能**  
**推定時間**: 20-25分

## 📋 **問題概要**

TypeScript型エラーの主要原因：ブラウザ環境型定義不足

**エラー例**:
```
Cannot find name 'window'
Cannot find name 'document'  
Cannot find name 'NodeFilter'
```

**影響範囲**: 15件のDOM関連型エラー

## 🎯 **修正対象ファイル**

### 主要修正対象
- `tsconfig.json` - lib設定更新
- `src/lib/browser/memory-leak-prevention.ts`
- `src/lib/browser/pool-manager.ts`

### 関連確認対象
- `tests/real-execution/*.ts` - DOM使用箇所全般

## 🔍 **具体的修正内容**

### 1. tsconfig.json lib設定更新

**修正対象**: `tsconfig.json`

**修正前**:
```json
{
  "compilerOptions": {
    "lib": ["es2020"]
  }
}
```

**修正後**:
```json
{
  "compilerOptions": {
    "lib": ["es2020", "dom", "dom.iterable"]
  }
}
```

### 2. memory-leak-prevention.ts型修正

**修正対象**: `src/lib/browser/memory-leak-prevention.ts`

**主要修正箇所**:
```typescript
// Line 448: window型追加
declare const window: Window & typeof globalThis;

// Line 476: document型安全性
const elements = document?.querySelectorAll('*') || [];

// Line 574: NodeFilter型定義
const filter = {
  acceptNode: (node: Node): number => {
    // 実装
    return NodeFilter.FILTER_ACCEPT;
  }
};
```

### 3. Node.js内部API型修正

**修正対象**: `src/lib/browser/memory-leak-prevention.ts:349-351`

**修正前（エラー）**:
```typescript
const activeHandles = process._getActiveHandles();
const activeRequests = process._getActiveRequests();
```

**修正後（型安全）**:
```typescript
// Node.js内部APIの型定義
interface ProcessInternal {
  _getActiveHandles?: () => any[];
  _getActiveRequests?: () => any[];
}

const processInternal = process as ProcessInternal;
const activeHandles = processInternal._getActiveHandles?.() || [];
const activeRequests = processInternal._getActiveRequests?.() || [];
```

### 4. DOM操作の型安全性確保

各ファイルで以下パターンを適用:

```typescript
// DOM要素存在チェック
const element = document?.getElementById('target');
if (element) {
  // 安全な操作
}

// 型ガードの活用
if (typeof window !== 'undefined') {
  // ブラウザ環境でのみ実行
}
```

## 🔧 **修正手順**

### Step 1: tsconfig.json更新
```bash
# 現在の設定確認
cat tsconfig.json | grep -A 10 '"lib"'

# 修正実行
# lib配列に"dom", "dom.iterable"追加
```

### Step 2: DOM型エラー修正
```bash
# DOM関連型エラー箇所特定
npx tsc --noEmit 2>&1 | grep -E "Cannot find name '(window|document|NodeFilter)'"

# 各ファイル個別修正
```

### Step 3: 修正検証
```bash
# ブラウザ環境型チェック
npx tsc --noEmit src/lib/browser/

# DOM操作テスト
pnpm test -- browser
```

## ✅ **修正完了判定基準**

### 必須チェック項目
- [ ] tsconfig.json に "dom", "dom.iterable" 追加完了
- [ ] window, document, NodeFilter型エラー解消
- [ ] Node.js内部API型安全性確保
- [ ] DOM操作の型ガード実装

### 品質チェック
- [ ] TypeScript strict準拠
- [ ] ブラウザ/Node.js環境判定適切
- [ ] エラーハンドリング強化

## 📊 **出力要求**

### 修正完了報告書
**出力先**: `tasks/20250722_011347_legacy_code_phase1_cleanup/reports/REPORT-002-dom-type-environment-fix.md`

**必須内容**:
1. **tsconfig.json修正前後比較**
2. **DOM型エラー修正箇所一覧**
3. **TypeScript型チェック結果**
4. **ブラウザ機能動作確認結果**

### 修正対象ファイル一覧
**出力先**: `tasks/20250722_011347_legacy_code_phase1_cleanup/outputs/dom-fix-file-list.json`

**フォーマット**:
```json
{
  "修正ファイル": [
    "tsconfig.json",
    "src/lib/browser/memory-leak-prevention.ts"  
  ],
  "DOM型エラー数": {
    "修正前": 15,
    "修正後": 0
  },
  "修正時間": "2025-07-22T01:20:00Z"
}
```

## ⚠️ **制約・注意事項**

### 🚫 **絶対禁止**
- 新機能追加禁止
- パフォーマンス計測機能追加禁止
- 不要なDOM操作の実装禁止

### ✅ **修正方針**
- **最小限修正**: 型定義修正のみ
- **環境判定**: ブラウザ/Node.js適切判定
- **型安全性**: TypeScript strict準拠

### 📋 **品質基準**
- DOM操作は型安全で実行
- エラーハンドリング適切実装
- ブラウザ環境判定必須実装

---

**実行指示**: 他のWorkerと並列実行可能。TASK-001完了待ちは不要です。