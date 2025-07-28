# TASK-002: MainLoop スケジュール専用化タスク

## 🎯 タスク概要

**目的**: `src/scheduler/main-loop.ts` をスケジュール機能のみに簡素化し、責任分離を明確化

**優先度**: 高重要 - アーキテクチャの責任分離

**実行順序**: 🔄 **直列実行** - Worker1のTASK-001完了後に開始

## 📋 作業前必須確認

### 権限・環境チェック
```bash
echo "ROLE: $ROLE" && git branch --show-current
```
**⚠️ ROLE=worker 必須、権限確認完了まで作業開始禁止**

### 依存関係確認
```bash
# Worker1の作業完了を確認
ls tasks/20250724_134113/reports/REPORT-001-main-workflow-implementation.md
```
**⚠️ Worker1の報告書確認必須 - 完了していない場合は待機**

### 要件定義書確認  
```bash
cat REQUIREMENTS.md | head -30
```

## 🎯 実装要件

### 現在の問題点
- **MainLoop**: スケジュール機能 + ワークフロー実装が混在
- **責任曖昧**: タイミング制御とビジネスロジックが同一クラス
- **可読性**: MainLoopの役割が不明確

### 理想的な構造
```typescript
// MainLoop = 純粋なスケジュール制御のみ
export class MainLoop {
  // スケジュール関連機能のみ
  async runOnce(): Promise<ExecutionResult> {
    // main.tsのexecuteWorkflow()を呼び出すだけ
    return await executeWorkflow();
  }
  
  // メトリクス、ヘルスチェックなどの管理機能
  getMetrics(): LoopMetrics
  performHealthCheck(): Promise<HealthStatus>
}
```

## 🔧 具体的実装タスク

### Phase 1: ワークフロー実装の削除

#### 削除対象関数（Worker1でmain.tsに移動済み）
```typescript
// 以下をMainLoopから削除
private async analyzeCurrentSituation(): Promise<SystemContext>
private async makeDecision(context: SystemContext): Promise<ClaudeDecision>  
private async executeDecision(decision: ClaudeDecision): Promise<void>
private async recordResults(): Promise<boolean>

// ヘルパー関数も削除
private selectRandomAction()
private generateMockReasoning()
private generateMockParameters()
private delay()
```

#### 削除対象プロパティ
```typescript
// KaitoAPI統合コンポーネント（main.tsに移動）
private claudeEngine?: ClaudeDecisionEngine;
private kaitoClient?: KaitoTwitterAPIClient;
private searchEngine?: SearchEngine;
private actionExecutor?: ActionExecutor;
```

### Phase 2: runOnce()の簡素化

#### 新しいrunOnce実装
```typescript
/**
 * 単一実行サイクル（30分間隔実行の1回分）
 * main.tsのexecuteWorkflow()を呼び出すだけの薄いラッパー
 */
async runOnce(): Promise<ExecutionResult> {
  if (this.isExecuting) {
    console.warn('⚠️ Execution already in progress, skipping');
    return this.createSkippedResult();
  }

  this.isExecuting = true;
  const startTime = Date.now();

  try {
    console.log('🚀 Starting scheduled execution cycle...');

    // ===================================================================
    // メインワークフロー実行 - main.tsに実装済み
    // MainLoopはスケジュール制御のみ担当
    // ===================================================================
    
    const result = await executeWorkflow(); // main.tsのワークフロー呼び出し
    const executionTime = Date.now() - startTime;

    // メトリクス更新
    this.updateMetrics(result, true);

    console.log('✅ Scheduled execution completed:', {
      action: result.action,
      duration: `${executionTime}ms`,
      success: result.success
    });

    return result;

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorResult = this.createErrorResult(error as Error, executionTime);
    
    this.updateMetrics(errorResult, false);
    
    console.error('❌ Scheduled execution failed:', error);
    return errorResult;

  } finally {
    this.isExecuting = false;
  }
}
```

### Phase 3: executeIntegratedCycle()の削除

#### 統合サイクル関連の完全削除
```typescript
// 以下を削除
async executeIntegratedCycle(): Promise<ExecutionResult>
private async collectIntegratedContext(): Promise<IntegratedContext>
private async processExecutionResult(): Promise<void>
private handleIntegratedError(): ExecutionResult
```

### Phase 4: コンストラクタの簡素化

#### 新しいコンストラクタ
```typescript
constructor() {
  // KaitoAPI統合コンポーネントは削除（main.tsで管理）
  this.initializeMetrics();
  console.log('✅ MainLoop initialized - Schedule control only');
}
```

### Phase 5: import文の整理

#### 削除対象import
```typescript
// main.tsに移動済みのため削除
import { ClaudeDecision, ClaudeDecisionEngine } from '../claude/decision-engine';
import { KaitoTwitterAPIClient } from '../kaito-api/client';
import { SearchEngine } from '../kaito-api/search-engine';
import { ActionExecutor } from '../kaito-api/action-executor';
```

#### 追加必要import
```typescript
// main.tsのワークフロー関数をimport
import { executeWorkflow } from '../main';
```

## 🚫 実装制約・禁止事項

### 責任範囲の厳守
- **スケジュール機能のみ**: タイミング制御、メトリクス、ヘルスチェックのみ
- **ワークフロー禁止**: ビジネスロジック実装は一切禁止
- **薄いラッパー**: main.tsのexecuteWorkflow()を呼び出すだけ

### ファイル構造制約
- **編集対象**: `src/scheduler/main-loop.ts` のみ
- **新規作成禁止**: 新しいファイルは作成しない
- **他ファイル修正**: 必要に応じてimport文のみ修正可能

### 削除時の注意
- **段階的削除**: 関数間依存を確認しながら慎重に削除
- **型整合性**: 削除後も型エラーが発生しないよう注意
- **import整理**: 不要なimportは必ず削除

## 🧪 動作確認要件

### 必須確認項目
1. **責任明確化**: MainLoopがスケジュール機能のみに専念
2. **ワークフロー呼び出し**: main.tsのexecuteWorkflow()が正常に呼び出される
3. **型安全性**: TypeScript strict mode通過
4. **メトリクス継続**: 既存のメトリクス機能が正常動作

### テストコマンド
```bash
# TypeScript型チェック
pnpm run typecheck

# Lint実行
pnpm run lint

# 動作確認（手動）
pnpm run dev
```

### 統合確認
```bash
# システム全体の動作確認
pnpm start
```

## 📝 成果物・出力先

### 必須出力
- **簡素化完了コード**: `src/scheduler/main-loop.ts` 更新
- **import修正**: 関連ファイルの必要なimport修正

### 報告書作成
作業完了後、以下の報告書を作成:
```
tasks/20250724_134113/reports/REPORT-002-mainloop-simplification.md
```

**報告書内容**:
- 削除・簡素化した内容の詳細
- main.tsとの連携確認結果
- 動作確認結果
- Worker3への引き継ぎ事項（統合テスト観点）

## ⚠️ 重要注意事項

### 依存関係管理
- **Worker1依存**: TASK-001完了を必ず確認してから開始
- **Worker3準備**: 統合テスト用の情報を報告書に明記

### 段階的作業
- **機能削除**: 一度に大量削除せず、段階的に実行
- **動作確認**: 各段階で型チェック・コンパイル確認を実行
- **整合性維持**: main.tsとの連携が常に正常であることを確認

### 品質最優先
- **責任純化**: スケジュール機能の責任を明確化
- **シンプル設計**: 複雑さを排除し、純粋なタイミング制御に専念
- **保守性向上**: 将来的な修正・拡張が容易な構造

---

**🎯 成功基準**: MainLoopが純粋なスケジュール制御のみを担当し、main.tsのexecuteWorkflow()を30分毎に呼び出すシンプルな構造になること