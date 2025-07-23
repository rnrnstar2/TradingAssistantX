# TASK-004: execution-recovery.tsの作成

## 🎯 目的
src/scripts/core-runner.tsからエラーリカバリー・リトライ機能を抽出し、新規ファイルとして実装する

## 📋 作業内容

### 1. 必須: 関連ファイルの読み込み
```bash
# REQUIREMENTS.md確認
cat REQUIREMENTS.md | head -300

# 現在のcore-runner.ts確認（リトライ関連部分）
grep -n "executeWithRetry\|attemptSystemRecovery" src/scripts/core-runner.ts -A 20
```

### 2. src/core/execution/execution-recovery.ts の作成

以下の機能を含む新規ファイルを作成：

```typescript
// src/core/execution/execution-recovery.ts

import { logger } from '../../utils/logger.js';

export interface RetryOptions {
  maxRetries: number;
  retryDelay?: number;
  exponentialBackoff?: boolean;
}

export interface RecoveryResult {
  success: boolean;
  attemptsMade: number;
  finalError?: Error;
}

export class ExecutionRecovery {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    operationName: string
  ): Promise<T | null> {
    // core-runner.tsから executeWithRetry の実装を移植
    // 以下を含む：
    // - リトライロジック
    // - エクスポネンシャルバックオフ
    // - エラーログ記録
    // - 最終的な失敗処理
  }

  async attemptSystemRecovery(error: Error): Promise<RecoveryResult> {
    // システムリカバリーロジック
    // 以下を含む：
    // - エラータイプの判定
    // - 適切なリカバリー手法の選択
    // - リカバリー実行
    // - 結果の記録
  }

  private calculateRetryDelay(attempt: number, baseDelay: number = 1000): number {
    // リトライ遅延計算ロジック
    // エクスポネンシャルバックオフ対応
  }

  private isRecoverableError(error: Error): boolean {
    // リカバリー可能なエラーかどうかの判定
  }

  private async performRecoveryAction(errorType: string): Promise<boolean> {
    // エラータイプに応じたリカバリーアクション
  }
}
```

### 3. 実装詳細
- src/scripts/core-runner.tsから以下のメソッドの実装を抽出：
  - executeWithRetry()
  - 関連するリトライロジック
- エラーハンドリングパターンを維持
- ログ出力を適切に実装
- 汎用的に使えるようにジェネリック型を活用

### 4. コード品質確認
```bash
# TypeScript型チェック
npx tsc --noEmit src/core/execution/execution-recovery.ts

# ファイルサイズ確認
wc -l src/core/execution/execution-recovery.ts
```

## ⚠️ 制約事項
- REQUIREMENTS.mdに記載された責務のみ実装
- 汎用的で再利用可能な設計
- 既存のエラーハンドリングパターンを維持
- MVP原則に従い、過剰な機能追加は避ける

## ✅ 完了条件
- src/core/execution/execution-recovery.tsが作成されている
- ExecutionRecoveryクラスが実装されている
- リトライ機能が実装されている
- TypeScriptの型チェックが通る
- 200-250行程度のファイルサイズ

## 📝 報告書作成
完了後、以下の内容で報告書を作成してください：
- ファイルパス: `tasks/20250723_165000_core_refactoring/reports/REPORT-004-execution-recovery.md`
- 作成したファイルのパス
- 実装したメソッドのリスト
- core-runner.tsから移植した部分の説明
- 問題があった場合はその内容