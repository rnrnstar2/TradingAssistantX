# TASK-003: ESLint重要エラー修正

## 🚨 **緊急タスク概要**
システム運用承認阻害要因である972個のESLint問題から、重要エラーを優先修正し、コード品質を確保する。

## 🎯 **修正目標**
- **重要エラー完全解決**: セキュリティ・安定性関連
- **品質基準達成**: ESLint基準準拠
- **段階的改善**: エラー→警告の順次解決

## 📋 **検出済み重要問題（優先修正）**

### **Priority 1: Security & Safety Issues**
```javascript
// no-floating-promises: 非同期処理不適切（セキュリティリスク）
async function riskyOperation() {
  someAsyncFunction(); // ❌ await不使用
}

// ✅ 修正例
async function safeOperation() {
  await someAsyncFunction();
}
```

### **Priority 2: Type Safety Issues**
```javascript
// no-explicit-any: any型使用（型安全性違反）
function processData(data: any): any { // ❌
  return data.someProperty;
}

// ✅ 修正例
interface DataType {
  someProperty: string;
}
function processData(data: DataType): string {
  return data.someProperty;
}
```

### **Priority 3: Code Quality Issues**
```javascript
// no-unused-vars: 未使用変数
import { unusedFunction, usedFunction } from './utils'; // ❌

// ✅ 修正例
import { usedFunction } from './utils';

// no-require-imports: require文使用
const config = require('./config'); // ❌

// ✅ 修正例
import config from './config';
```

## 🔧 **段階的修正戦略**

### **Phase 1: セキュリティ重要エラー（優先）**
1. **非同期処理修正**
   ```bash
   # 対象ルール修正
   no-floating-promises
   no-misused-promises
   ```

2. **型安全性修正**
   ```bash
   # any型使用撲滅
   no-explicit-any
   no-unsafe-assignment
   no-unsafe-return
   ```

### **Phase 2: コード品質改善**
3. **未使用コード除去**
   ```bash
   no-unused-vars
   no-unused-imports
   ```

4. **モジュールシステム統一**
   ```bash
   no-require-imports
   import/no-commonjs
   ```

## 📊 **実行手順**

### **Step 1: 現状確認**
```bash
pnpm run lint:check
# 972個問題を再確認
```

### **Step 2: 自動修正適用**
```bash
# 自動修正可能なものを適用
pnpm run lint:fix
```

### **Step 3: 手動修正実行**
```bash
# 重要エラーから順次修正
# 各修正後に部分確認
pnpm run lint:check -- --quiet
```

## 📝 **修正パターン例**

### **非同期処理修正**
```typescript
// ❌ Before
someAsyncFunction().catch(console.error);

// ✅ After  
await someAsyncFunction().catch((error) => {
  console.error('Error in someAsyncFunction:', error);
});
```

### **any型撲滅**
```typescript
// ❌ Before
function processResponse(response: any): any {
  return response.data;
}

// ✅ After
interface ApiResponse {
  data: unknown;
}
function processResponse(response: ApiResponse): unknown {
  return response.data;
}
```

## 📊 **品質基準**

### **必須達成条件**
- [ ] セキュリティエラー: 0個
- [ ] 型安全性エラー: 0個  
- [ ] 重要品質エラー: 0個
- [ ] 自動修正適用: 100%

### **段階目標**
- **Phase 1完了**: 重要エラー0個
- **Phase 2完了**: 警告50%以下
- **最終目標**: 全問題解決

## 🚫 **禁止事項**
- **eslint-disable使用**: エラー隠蔽禁止
- **品質基準低下**: 妥協的修正禁止
- **一時的修正**: 根本解決必須
- **any型逃避**: 適切な型定義必須

## 📈 **進捗確認**
各Phase完了時に実行：
```bash
# エラー数確認
pnpm run lint:check | grep "problems"
# Before: 972 problems
# Target: 段階的減少
```

## 🎯 **完了条件**

### **Phase 1完了条件**
```bash
# 重要エラーチェック
pnpm run lint:check --quiet
# Result: 重要エラー0個
```

### **最終完了条件**
```bash
# 全問題解決確認
pnpm run lint:check
# Result: 0 problems
```

## ⚡ **緊急性**
**高優先タスク**: TypeScript修正と並行実行
**完了期限**: 段階的完了・即座対応  
**品質基準**: ESLint基準完全準拠

---

**出力管理**: 既存ファイル直接更新  
**品質基準**: ESLint基準準拠必須
**並行作業**: TypeScript修正と同時実行可能