# TASK-002: Claude専用テストヘルパー作成

## 📋 タスク概要
現在の`test-helpers.ts`はKaitoAPI用になっているため、Claude専用のテストヘルパーファイル`claude-test-helpers.ts`を新規作成し、Claude関連テストで必要なヘルパー関数を提供する。

## 🎯 目的
- Claude専用のテストヘルパー関数を作成
- 既存のClaudeテストで使用されているヘルパー関数を適切に実装
- Vitest環境に適したヘルパー関数の実装

## 📁 対象ファイル
- 新規作成: `tests/test-utils/claude-test-helpers.ts`
- 修正: 各Claudeテストファイルのインポート文

## 🔧 実装詳細

### 1. 新規ファイル作成: claude-test-helpers.ts

```typescript
/**
 * Claude テスト用ヘルパー関数
 * REQUIREMENTS.md準拠 - Claude専用テストユーティリティ
 */

/**
 * オブジェクトの構造検証ヘルパー
 * 期待されるキーが全て存在するかチェック
 */
export const validateResponseStructure = (obj: any, expectedKeys: string[]): boolean => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  return expectedKeys.every(key => obj.hasOwnProperty(key));
};

/**
 * 範囲チェックヘルパー
 * 数値が指定された範囲内にあるかチェック
 */
export const validateRange = (value: number, min: number, max: number): boolean => {
  return typeof value === 'number' && value >= min && value <= max;
};

/**
 * 文字列長検証ヘルパー
 * 文字列が指定された長さ制限内にあるかチェック
 */
export const validateStringLength = (str: string, maxLength: number, minLength: number = 0): boolean => {
  return typeof str === 'string' && str.length >= minLength && str.length <= maxLength;
};

/**
 * 日付文字列検証ヘルパー
 * ISO形式の日付文字列が有効かチェック
 */
export const validateISODateString = (dateStr: string): boolean => {
  if (typeof dateStr !== 'string') {
    return false;
  }
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr === date.toISOString();
};

/**
 * 配列内容検証ヘルパー
 * 配列の全要素が条件を満たすかチェック
 */
export const validateArrayContents = <T>(
  array: T[], 
  validator: (item: T) => boolean
): boolean => {
  return Array.isArray(array) && array.every(validator);
};

/**
 * 型チェックヘルパー
 * 値の型が期待される型と一致するかチェック
 */
export const validateTypes = (obj: any, typeMap: { [key: string]: string }): boolean => {
  for (const key in typeMap) {
    if (!obj.hasOwnProperty(key)) {
      return false;
    }

    const expectedType = typeMap[key];
    const actualType = typeof obj[key];

    if (expectedType === 'array') {
      if (!Array.isArray(obj[key])) {
        return false;
      }
    } else if (actualType !== expectedType) {
      return false;
    }
  }
  return true;
};

/**
 * 深い構造検証ヘルパー
 * ネストしたオブジェクトの構造チェック
 */
export const validateNestedStructure = (obj: any, structure: any): boolean => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  for (const key in structure) {
    if (!obj.hasOwnProperty(key)) {
      return false;
    }

    if (typeof structure[key] === 'object' && structure[key] !== null) {
      if (!validateNestedStructure(obj[key], structure[key])) {
        return false;
      }
    }
  }
  return true;
};

/**
 * 部分マッチング検証ヘルパー
 * オブジェクトが部分的に一致するかチェック
 */
export const partialMatch = (actual: any, expected: any): boolean => {
  if (expected == null) {
    return true;
  }

  if (actual == null) {
    return false;
  }

  if (typeof expected !== 'object') {
    return actual === expected;
  }

  return Object.keys(expected).every(key => {
    if (!actual.hasOwnProperty(key)) {
      return false;
    }

    if (typeof expected[key] === 'object' && expected[key] !== null) {
      return partialMatch(actual[key], expected[key]);
    }

    return actual[key] === expected[key];
  });
};

/**
 * テストタイムアウト作成ヘルパー
 * 指定時間後にresolveするPromise
 */
export const createTestTimeout = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * パフォーマンステストヘルパー
 * 関数の実行時間を測定
 */
export const measureExecutionTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; executionTime: number }> => {
  const startTime = Date.now();
  const result = await fn();
  const executionTime = Date.now() - startTime;
  
  return { result, executionTime };
};

/**
 * エラーテストヘルパー
 * 非同期関数がエラーを投げることを検証
 */
export const expectAsyncError = async (
  asyncFn: () => Promise<any>, 
  expectedErrorMessage?: string
): Promise<Error> => {
  try {
    await asyncFn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (expectedErrorMessage && (error as Error).message !== expectedErrorMessage) {
      throw new Error(`Expected error message "${expectedErrorMessage}", got "${(error as Error).message}"`);
    }
    return error as Error;
  }
};

/**
 * 配列順序検証ヘルパー
 * 配列が期待される順序でソートされているかチェック
 */
export const validateArrayOrder = <T>(
  array: T[], 
  compareFn: (a: T, b: T) => number
): boolean => {
  if (!Array.isArray(array) || array.length <= 1) {
    return true;
  }

  for (let i = 1; i < array.length; i++) {
    if (compareFn(array[i - 1], array[i]) > 0) {
      return false;
    }
  }
  return true;
};
```

### 2. 各テストファイルのインポート修正

各Claudeテストファイルで以下の修正を行う：

```typescript
// 修正前
import { validateResponseStructure, validateRange, validateISODateString } from '../../test-utils/test-helpers';

// 修正後
import { validateResponseStructure, validateRange, validateISODateString } from '../../test-utils/claude-test-helpers';
```

### 3. 影響を受けるファイル一覧

- `tests/claude/endpoints/content-endpoint.test.ts`
- `tests/claude/endpoints/analysis-endpoint.test.ts`
- `tests/claude/endpoints/search-endpoint.test.ts`
- `tests/claude/types.test.ts`

## ✅ 完了条件
- [ ] `claude-test-helpers.ts`が作成されている
- [ ] 全てのClaudeテストファイルのインポートが修正されている
- [ ] `pnpm typecheck`でエラーが発生しない
- [ ] 各テストファイルで使用されているヘルパー関数が正しく動作する

## 📝 注意事項
- Vitest環境に適したヘルパー関数として実装
- jest関連の機能は使用しない
- 既存のtest-helpers.tsは変更せず、KaitoAPI用として残す

## 🚀 実行コマンド
```bash
# 型チェック
pnpm typecheck

# テスト実行
pnpm test tests/claude/
```