# TASK-002: Phase 2 - ファイル分割とリファクタリング

## 🎯 実装目標

**src/main-workflows/の大規模ファイル（1000行超）を機能別に分割し、保守性と可読性を向上させる**

## 📋 前提条件

### 必須読み込み
1. **REQUIREMENTS.md** - システム要件定義の理解
2. **TASK-001完了確認** - Phase 1の型安全性修正が完了していること
3. **src/main-workflows/scheduler-manager.ts** (1044行) - 分割対象ファイル
4. **src/main-workflows/execution-flow.ts** (1136行) - 分割対象ファイル

### MVP制約確認
- **機能分離重視**: 単一責任原則に基づく適切な分割
- **シンプル構造**: 過度な抽象化を避けた分かりやすいファイル構成
- **既存機能保持**: 分割後も元の機能が完全に動作すること

## 🔧 実装詳細

### A. scheduler-manager.ts の分割 (1044行 → 3ファイル)

**分割設計:**

1. **src/main-workflows/core/scheduler-core.ts** (約350行)
   ```typescript
   // CoreScheduler統合機能のみ
   export class SchedulerCore {
     // 内蔵スケジューラー機能 (Line 555-810)
     private start(): void
     private stop(): void
     private setExecutionCallback(): void
     private getStatus(): ScheduleStatus
     private updateConfig(): void
     private scheduleNextExecution(): void
     private calculateNextExecutionTime(): Date
     private executeScheduledTask(): Promise<void>
     // その他プライベートメソッド
   }
   ```

2. **src/main-workflows/core/scheduler-maintenance.ts** (約350行)
   ```typescript
   // DataManager統合機能・メンテナンス機能
   export class SchedulerMaintenance {
     // メンテナンス機能 (Line 404-553)
     private performPreExecutionChecks(): Promise<void>
     async performPeriodicMaintenance(): Promise<void>
     private checkDiskSpace(): Promise<void>
     setupMaintenanceSchedule(): void
     // ヘルスチェック・クリーンアップ関連
   }
   ```

3. **src/main-workflows/scheduler-manager.ts** (約350行)
   ```typescript
   // 統合クラス - 公開APIのみ
   export class SchedulerManager {
     private schedulerCore: SchedulerCore;
     private schedulerMaintenance: SchedulerMaintenance;
     
     // 公開API (Line 126-313)
     startScheduler(): void
     stopScheduler(): void
     getSchedulerStatus(): object
     async reloadSchedulerConfig(): Promise<void>
     
     // MainLoop統合機能 (Line 815-1044)
     async runOnce(): Promise<ExecutionResult>
     getLoopMetrics(): LoopMetrics
     // その他公開メソッド
   }
   ```

### B. execution-flow.ts の分割 (1136行 → 4ファイル)

**分割設計:**

1. **src/main-workflows/core/context-loader.ts** (約250行)
   ```typescript
   // システムコンテキスト読み込み機能
   export class ContextLoader {
     // Context関連 (Line 181-229)
     async loadSystemContext(): Promise<SystemContext>
     private extractAccountInfo(): SystemContext['account']
     private extractLearningData(): object
     private extractTrendData(): SystemContext['market']
   }
   ```

2. **src/main-workflows/core/action-executor.ts** (約400行)
   ```typescript
   // アクション実行機能
   export class ActionExecutor {
     // アクション実行 (Line 264-472)
     private executeAction(): Promise<ActionResult>
     private executePostAction(): Promise<ActionResult>
     private executeRetweetAction(): Promise<ActionResult>
     private executeQuoteTweetAction(): Promise<ActionResult>
     private executeLikeAction(): Promise<ActionResult>
     private normalizeActionResult(): ActionResult
   }
   ```

3. **src/main-workflows/core/execution-utils.ts** (約300行)
   ```typescript
   // エラーハンドリング・リトライ・最適化機能
   export class ExecutionUtils {
     // エラーハンドリング (Line 647-889)
     executeWithRetry<T>(): Promise<OperationResult<T>>
     executeTransaction<T>(): Promise<OperationResult<T[]>>
     private rollbackTransaction(): Promise<void>
     
     // KaitoAPI最適化 (Line 890-1136)
     private fetchRecentTweets(): Promise<any[]>
     private getCachedData<T>(): Promise<T>
     async optimizedKaitoSearch(): Promise<any[]>
   }
   ```

4. **src/main-workflows/execution-flow.ts** (約200行)
   ```typescript
   // メインワークフロー統合クラス
   export class ExecutionFlow {
     private contextLoader: ContextLoader;
     private actionExecutor: ActionExecutor;
     private executionUtils: ExecutionUtils;
     
     // メインワークフロー (Line 70-180)
     async executeMainLoop(): Promise<ExecutionResult>
     private makeClaudeDecision(): Promise<ClaudeDecision>
     private recordResults(): Promise<void>
     
     // 公開API
     getExecutionStatus(): object
     displayWorkflowOverview(): void
   }
   ```

### C. ディレクトリ構造の整理

**新しいディレクトリ構造:**
```
src/main-workflows/
├── core/                          # 分割された内部機能
│   ├── scheduler-core.ts          # スケジューラー基本機能
│   ├── scheduler-maintenance.ts   # メンテナンス機能
│   ├── context-loader.ts          # コンテキスト読み込み
│   ├── action-executor.ts         # アクション実行
│   └── execution-utils.ts         # ユーティリティ機能
├── scheduler-manager.ts           # 統合スケジューラーマネージャー
├── execution-flow.ts              # 統合実行フロー
├── status-controller.ts           # 状態管理 (Phase 1で修正済み)
└── system-lifecycle.ts            # システムライフサイクル
```

## ⚠️ 重要な制約事項

### MVP制約遵守
- **機能保持**: 分割後も既存の全機能が完全に動作すること
- **シンプル設計**: 複雑な依存関係を作らない単純な分割
- **テスト容易性**: 分割後のクラスが独立してテスト可能なこと

### 分割原則
- **単一責任**: 各ファイルは1つの明確な責任のみ持つ
- **疎結合**: クラス間の依存関係を最小限に抑制
- **高凝集**: 関連する機能は同じファイルにまとめる
- **API安定性**: 公開APIは変更せず、内部実装のみ分割

### 禁止事項
- ❌ 既存のpublic メソッドの削除・変更
- ❌ インポートパスの変更（main.tsからの呼び出し）
- ❌ 新しい依存関係の追加
- ❌ 機能の追加・削除・変更

## 🔍 品質チェック要件

### 分割後の整合性チェック
```bash
# TypeScript エラーチェック
npx tsc --noEmit --strict

# ESLint チェック
npx eslint src/main-workflows/ --fix

# ビルドテスト
npm run build
```

### 機能動作確認
```bash
# 基本動作テスト（分割後）
pnpm dev
```

## 📊 完了基準

1. **ファイルサイズ**: 全ファイルが400行以下になること
2. **TypeScript通過**: エラー・警告ゼロ
3. **既存API保持**: 他ファイルからの呼び出しが変更されていないこと
4. **動作確認**: `pnpm dev` が正常実行されること

## 📝 実装ガイドライン

### 分割実行順序
1. **core/ ディレクトリ作成**
2. **scheduler-manager.ts の分割** (順次実行)
   - scheduler-core.ts 作成
   - scheduler-maintenance.ts 作成
   - 統合クラス調整
3. **execution-flow.ts の分割** (順次実行)
   - context-loader.ts 作成
   - action-executor.ts 作成
   - execution-utils.ts 作成
   - 統合クラス調整
4. **全体整合性チェック・調整**

### インポート管理
```typescript
// 分割前のインポートを保持
// 内部的にのみ新しいクラスを使用
import { SchedulerCore } from './core/scheduler-core';
import { SchedulerMaintenance } from './core/scheduler-maintenance';

// 外部からのインポートは変更なし
export class SchedulerManager {
  // 外部API保持
}
```

### エラーハンドリング
- **分割エラー**: 分割により機能が破損した場合は即座に報告
- **統合テスト**: 各分割ステップ後にビルドテスト実行
- **ロールバック**: 問題がある場合は一つ前の状態に戻る

## 🔄 依存関係管理

### coreディレクトリの依存関係
```typescript
// 許可される依存関係
- shared/logger, shared/types (共通)
- component-container (DI)
- claude/ (エンドポイント)
- kaito-api/ (API)
- data/data-manager (データ)

// 禁止される依存関係
- 他のmain-workflows内クラス間の循環参照
- 外部ライブラリの新規追加
```

## 📁 出力先指定

- **新規ファイル**: `src/main-workflows/core/` 配下
- **修正ファイル**: `src/main-workflows/` 直下の統合クラス
- **一時ファイル**: `tasks/20250727_235926/outputs/` 配下のみ

---

**このタスクはPhase 2のリファクタリングタスクです。Phase 1の型安全性修正完了後に実行し、可読性と保守性を大幅に向上させてください。**