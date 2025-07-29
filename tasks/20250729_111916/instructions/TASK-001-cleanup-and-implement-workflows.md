# TASK-001: 未使用ファイル削除とworkflowsディレクトリ実装

## 🎯 タスク概要
過剰実装されたmain-workflows/配下の未使用ファイルを削除し、シンプルなworkflows/ディレクトリ構造を実装

## 📋 実装内容

### 1. 未使用ファイル削除
以下のファイルを削除してください：
- `src/main-workflows/core/scheduler-core.ts`
- `src/main-workflows/core/scheduler-maintenance.ts`
- `src/main-workflows/execution-flow.ts`
- `src/main-workflows/scheduler-manager.ts`
- `src/main-workflows/status-controller.ts`
- `src/main-workflows/system-lifecycle.ts`

### 2. ディレクトリ構造変更
```
src/
├── workflows/               # 新規作成
│   ├── main-workflow.ts     # 新規実装
│   └── constants.ts         # workflow-constants.tsから移動・簡素化
└── main-workflows/          # 削除予定（作業完了後）
```

### 3. main-workflow.ts実装

#### 実装要件
```typescript
// src/workflows/main-workflow.ts
import { kaitoClient } from '../kaito-api';
import { makeDecision, generateContent } from '../claude';
import { dataManager } from '../data';
import { WORKFLOW_CONSTANTS } from './constants';

export class MainWorkflow {
  /**
   * 4ステップのメインワークフロー実行
   * 1. データ収集（Kaito API）
   * 2. アクション決定（Claude）
   * 3. アクション実行（Kaito API）
   * 4. 結果保存（data/）
   */
  static async execute(): Promise<WorkflowResult> {
    // 実装内容
  }
}
```

#### 4ステップの詳細
1. **データ収集**: `kaitoClient.getProfile()`, `dataManager.loadLearningData()`
2. **アクション決定**: `makeDecision()` → action: 'post' | 'retweet' | 'like' | 'wait'
3. **アクション実行**: switch文でaction別処理
4. **結果保存**: `dataManager.saveResult()` → `data/history/YYYY-MM/DD-HHMM/`

### 4. constants.ts作成
`src/main-workflows/core/workflow-constants.ts`から必要な定数のみ抽出：
- API制限（RATE_LIMITS）
- エラーメッセージ（ERROR_MESSAGES）
- タイムアウト設定（TIMEOUTS）

**削除対象**: スケジュール関連、統計関連、過剰な設定値

### 5. action-executor.ts簡素化
現在の`src/main-workflows/core/action-executor.ts`をworkflows/配下での使用に合わせて簡素化：
- 不要なスケジューラー関連の依存削除
- MainWorkflowクラスからの使用に最適化

## ⚠️ 制約事項
- **MVP原則厳守**: 最小限の実装のみ、将来の拡張性は考慮しない
- **統計機能禁止**: 分析・集計機能は一切実装しない
- **スケジューラー禁止**: Phase 1ではスケジュール機能は実装しない
- **エラーハンドリング**: 基本的なtry-catchのみ、過剰な回復処理は不要

## 🔧 技術要件
- TypeScript strict mode
- 既存のimportパスを維持（相対パス使用）
- `pnpm dev`で単一実行が動作すること
- 既存の型定義（ClaudeDecision等）を活用

## 📂 成果物
- 削除ファイル: 6ファイル
- 新規作成: `src/workflows/main-workflow.ts`, `src/workflows/constants.ts`
- 移動・簡素化: workflow-constants.ts → constants.ts
- 更新: action-executor.ts（簡素化）

## ✅ 完了条件
- [ ] 指定ファイルが削除されている
- [ ] workflows/ディレクトリが作成されている
- [ ] MainWorkflowクラスが4ステップを実装している
- [ ] 不要な複雑性が除去されている
- [ ] TypeScriptコンパイルエラーがない