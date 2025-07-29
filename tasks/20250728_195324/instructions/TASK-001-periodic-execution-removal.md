# TASK-001: 30分間隔定期実行システム削除

## 🎯 タスク概要

**目標**: 現在の30分間隔定期実行スケジュールシステムを完全に削除し、1回限り実行（`pnpm dev`）に集中したシンプルなシステムに変更する。

**重要制約**: 
- 今回は定期実行機能の削除のみ実行する
- 次フェーズでのyamlファイル基準の時刻実行機能は今回実装しない
- `pnpm dev`での1回限り実行は既に動作しているため保持する

## 📋 REQUIREMENTS.md 準拠要件

**現在のREQUIREMENTS.md記載内容（削除対象）**:
- "30分間隔自動実行": KaitoAPIを使った定期投稿システム
- "30分毎の自動実行": 定期的な自動実行システム
- SchedulerManager統合アーキテクチャ: 30分間隔の自動実行制御
- CoreScheduler機能: 30分間隔の自動実行制御、実行時間窓管理

**保持要件**:
- Claude判断機能、KaitoAPI連携、学習データ保存機能は保持
- 1回限りの実行機能（`pnpm dev`）は保持
- エンドポイント別Claude SDK設計は保持

## 🗂️ 削除対象ファイル・コンポーネント

### 完全削除対象ファイル

1. **`src/main-workflows/scheduler-manager.ts`**
   - 30分間隔の定期実行制御システム
   - intervalMinutes: 30, maxDailyExecutions: 48の設定
   - スケジューラー起動・停止・設定管理機能

2. **`src/main-workflows/core/scheduler-core.ts`**
   - 内蔵スケジューラーの基本機能
   - setTimeout/setInterval による30分間隔制御
   - scheduleNextExecution(), calculateNextExecutionTime()

3. **`src/main-workflows/core/scheduler-maintenance.ts`**
   - スケジューラーメンテナンス機能
   - 定期メンテナンススケジュール設定

4. **`src/main-workflows/system-lifecycle.ts`**
   - システムライフサイクル管理
   - スケジューラー起動・停止制御

5. **`src/main-workflows/execution-flow.ts`**
   - メインループ実行フロー制御
   - 30分間隔でのワークフロー管理

6. **`src/main-workflows/status-controller.ts`**
   - システム状態監視・制御
   - スケジューラー状態管理

### 部分削除・修正対象ファイル

7. **`src/main.ts`**
   - **削除**: 30分間隔自動実行システム関連のコード
   - **削除**: 4つのワークフロークラス連携（SystemLifecycle, SchedulerManager, ExecutionFlow, StatusController）
   - **保持**: `pnpm dev`での1回限り実行機能に必要な基本構造

8. **`src/main-workflows/core/workflow-constants.ts`**
   - **削除**: SCHEDULER関連定数（DEFAULT_INTERVAL_MINUTES: 30, MAX_DAILY_EXECUTIONS: 48など）
   - **削除**: スケジューラー関連ログメッセージ・エラーメッセージ
   - **保持**: Claude SDK、KaitoAPI、データ管理に必要な定数

## 🔧 修正・保持対象

### 保持するファイル・機能

1. **`src/dev.ts`**: 1回限り実行用スクリプト（既存・完全保持）
2. **`src/claude/`**: エンドポイント別Claude SDK（完全保持）
3. **`src/kaito-api/`**: Twitter API操作機能（完全保持）
4. **`src/data/`**: データ管理機能（完全保持）
5. **`src/shared/`**: 共通機能（完全保持）

### main.ts の修正方針

**削除するimport文**:
```typescript
// 削除対象import
import { SystemLifecycle } from './main-workflows/system-lifecycle';
import { SchedulerManager } from './main-workflows/scheduler-manager';
import { ExecutionFlow } from './main-workflows/execution-flow';
import { StatusController } from './main-workflows/status-controller';
```

**削除するクラス・機能**:
- TradingAssistantXメインアプリケーションクラスの30分間隔制御機能
- 4つのワークフロークラスとの協調制御
- スケジューラー管理・状態監視機能

**保持する機能**:
- エンドポイント別Claude SDK統合
- ComponentContainer, DataManager
- 基本的なシステム初期化

## 📄 実装手順

### ステップ1: 完全削除ファイルの削除

1. 各削除対象ファイルを完全削除
2. 削除時にimport先で参照エラーが起きないか確認

### ステップ2: main.ts の大幅簡素化

1. 30分間隔自動実行システム関連コードを削除
2. 4つのワークフロークラス連携を削除
3. シンプルな1回限り実行対応のみ残す

### ステップ3: workflow-constants.ts の清掃

1. SCHEDULER関連定数を削除
2. スケジューラー関連ログ・エラーメッセージを削除
3. Claude SDK、API、データ管理に必要な定数のみ保持

### ステップ4: 動作確認

1. `pnpm dev`での1回限り実行が動作することを確認
2. TypeScriptコンパイルエラーがないことを確認
3. 不要なimport文・参照がないことを確認

## ⚠️ 重要な実装制約

### MVP制約遵守
- 最小限の削除作業のみ実行
- 過剰な改修・リファクタリングは禁止
- 既に動作している`pnpm dev`機能を破損しない

### TypeScript strict対応
- 削除後もTypeScriptエラーが発生しないよう注意
- 型定義の依存関係を慎重に確認

### エラーハンドリング
- 削除対象ファイルが他から参照されていないか事前確認
- 段階的削除でビルドエラーを最小化

## 🔍 品質チェック要件

### 完了確認項目

1. **ファイル削除確認**: 指定された6つのファイルが完全削除されている
2. **main.ts简素化確認**: 30分間隔関連コードが削除されている
3. **workflow-constants.ts清掃確認**: SCHEDULER関連定数が削除されている
4. **TypeScript確認**: `npm run typecheck`または`tsc --noEmit`が成功
5. **動作確認**: `pnpm dev`が正常に1回限り実行される

### 報告書記載要件

- 削除したファイル一覧
- 修正したファイルと変更内容
- TypeScriptコンパイル結果
- `pnpm dev`動作確認結果
- 残存する機能の確認結果

## 📋 出力管理規則

**報告書出力先**: `tasks/20250728_195324/reports/REPORT-001-periodic-execution-removal.md`

**実装完了の判定基準**:
- 全削除対象ファイルが削除済み
- main.ts、workflow-constants.tsの修正完了
- TypeScriptエラーなし
- `pnpm dev`正常動作確認

---

**重要**: この作業により30分間隔の定期実行システムは完全に削除され、シンプルな1回限り実行システムのみが残ります。次のフェーズで時刻ベースの実行システムを別途実装します。