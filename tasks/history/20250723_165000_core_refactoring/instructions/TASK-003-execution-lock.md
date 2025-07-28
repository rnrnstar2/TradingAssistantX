# TASK-003: execution-lock.tsの作成

## 🎯 目的
src/scripts/core-runner.tsからロック管理・重複実行防止機能を抽出し、新規ファイルとして実装する

## 📋 作業内容

### 1. 必須: 関連ファイルの読み込み
```bash
# REQUIREMENTS.md確認
cat REQUIREMENTS.md | head -300

# 現在のcore-runner.ts確認（ロック関連部分）
grep -n "createExecutionLock\|removeExecutionLock\|lockFilePath" src/scripts/core-runner.ts
```

### 2. src/core/execution/execution-lock.ts の作成

以下の機能を含む新規ファイルを作成：

```typescript
// src/core/execution/execution-lock.ts

import * as path from 'path';
import * as fs from 'fs/promises';
import { logger } from '../../utils/logger.js';

export interface LockInfo {
  pid: number;
  startTime: string;
  hostname: string;
}

export class ExecutionLock {
  private lockFilePath: string;

  constructor(private outputDir: string) {
    this.lockFilePath = path.join(outputDir, 'execution.lock');
  }

  async createLock(): Promise<void> {
    // core-runner.tsから createExecutionLock の実装を移植
    // 以下を含む：
    // - 既存ロックファイルの確認
    // - プロセス存在確認
    // - 新規ロックファイル作成
    // - エラーハンドリング
  }

  async removeLock(): Promise<void> {
    // core-runner.tsから removeExecutionLock の実装を移植
    // - ロックファイルの削除
    // - エラーハンドリング
  }

  async isLocked(): Promise<boolean> {
    // ロックファイルの存在確認
  }

  async getLockInfo(): Promise<LockInfo | null> {
    // ロックファイル情報の取得
  }

  private async isProcessRunning(pid: number): Promise<boolean> {
    // プロセスの存在確認ロジック
  }
}
```

### 3. 実装詳細
- src/scripts/core-runner.tsから以下のメソッドの実装を抽出：
  - createExecutionLock() → createLock()
  - removeExecutionLock() → removeLock()
- メソッド名は新しいクラスに合わせて適切に変更
- ロックファイルのパス管理をコンストラクタで初期化
- エラーハンドリングを維持

### 4. コード品質確認
```bash
# TypeScript型チェック
npx tsc --noEmit src/core/execution/execution-lock.ts

# ファイルサイズ確認
wc -l src/core/execution/execution-lock.ts
```

## ⚠️ 制約事項
- REQUIREMENTS.mdに記載された責務のみ実装
- シンプルで明確なインターフェース設計
- 既存のエラーハンドリングパターンを維持
- MVP原則に従い、過剰な機能追加は避ける

## ✅ 完了条件
- src/core/execution/execution-lock.tsが作成されている
- ExecutionLockクラスが実装されている
- ロック作成・削除機能が実装されている
- TypeScriptの型チェックが通る
- 100-150行程度のファイルサイズ

## 📝 報告書作成
完了後、以下の内容で報告書を作成してください：
- ファイルパス: `tasks/20250723_165000_core_refactoring/reports/REPORT-003-execution-lock.md`
- 作成したファイルのパス
- 実装したメソッドのリスト
- core-runner.tsから移植した部分の説明
- 問題があった場合はその内容