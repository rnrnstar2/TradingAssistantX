# TASK-001: ExecutionCallbackエクスポートエラー修正

## 🎯 目的
pnpm devコマンド実行時に発生するExecutionCallbackエクスポートエラーを修正し、開発環境でのワークフロー実行を可能にする。

## 🚨 エラー内容
```
SyntaxError: The requested module './core/scheduler-core' does not provide an export named 'ExecutionCallback'
```

## 📋 修正内容

### 1. ExecutionCallbackの型定義修正
**対象ファイル**: `src/main-workflows/core/scheduler-core.ts`

現在の定義：
```typescript
export interface ExecutionCallback {
  (): Promise<{ success: boolean; duration: number; error?: string }>;
}
```

修正後の定義：
```typescript
export type ExecutionCallback = () => Promise<{ success: boolean; duration: number; error?: string }>;
```

**理由**: インターフェース内での関数型定義がESMモジュールで問題を引き起こしている可能性があるため、type aliasに変更。

### 2. scheduler-manager.tsの修正
**対象ファイル**: `src/main-workflows/scheduler-manager.ts`

#### import文の修正（line 10）
現在：
```typescript
import { SchedulerCore, SchedulerConfig, ScheduleStatus, ExecutionCallback } from './core/scheduler-core';
```

修正後：
```typescript
import { SchedulerCore, SchedulerConfig, ScheduleStatus } from './core/scheduler-core';
import type { ExecutionCallback } from './core/scheduler-core';
```

#### 再エクスポートの修正（line 14）
現在：
```typescript
export { SchedulerConfig, ScheduleStatus, ExecutionCallback } from './core/scheduler-core';
```

修正後：
```typescript
export { SchedulerConfig, ScheduleStatus } from './core/scheduler-core';
export type { ExecutionCallback } from './core/scheduler-core';
```

## 🔧 実装手順

1. **scheduler-core.tsの修正**
   - ExecutionCallbackをinterfaceからtype aliasに変更
   
2. **scheduler-manager.tsの修正**
   - import文でExecutionCallbackを型としてインポート
   - 再エクスポートでExecutionCallbackを型としてエクスポート

## ✅ 完了条件

1. pnpm devコマンドがExecutionCallbackエラーなしで実行される
2. TypeScriptのコンパイルエラーが発生しない
3. 修正後のコードがESMモジュールシステムで正しく動作する

## 📌 注意事項

- 型定義の変更により他のファイルに影響がないか確認すること
- ESMモジュールシステムとの互換性を保つこと
- 既存の機能に影響を与えないよう注意すること

## 🔍 テスト方法

```bash
# 修正後の動作確認
pnpm dev

# TypeScript型チェック（もしスクリプトがあれば）
pnpm typecheck || npx tsc --noEmit
```