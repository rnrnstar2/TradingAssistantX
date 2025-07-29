# TASK-004: エクスポート問題修正と統合作業

## 🎯 タスク概要
TradingAssistantXクラスのエクスポート問題を修正し、新規実装のworkflows/と既存実装を適切に統合する

## 📋 実装内容

### 1. main.tsのエクスポート修正

#### 問題点
- TradingAssistantXクラスがエクスポートされていない
- dev.tsからインポートできずエラー発生

#### 修正内容
```typescript
// src/main.ts の最後に追加
export { TradingAssistantX };
```

### 2. dev.tsとmain.tsの統合方法再検討

#### 現状の問題
- dev.tsはTradingAssistantXクラスを使用
- 新規実装のMainWorkflowクラスとの整合性が必要

#### 解決策A: TradingAssistantXを使用継続（推奨）
既存のTradingAssistantXクラスが実質的にMainWorkflowの役割を果たしているため：
1. main.tsにexport文を追加
2. dev.tsはそのまま使用
3. workflows/main-workflow.tsはTradingAssistantXのラッパーとして実装

#### 解決策B: MainWorkflowに統一
1. dev.tsをMainWorkflow使用に変更
2. main.tsもMainWorkflow使用に変更
3. TradingAssistantXクラスの機能をMainWorkflowに統合

### 3. workflows/main-workflow.ts調整

#### 現在の実装確認と調整
```typescript
// src/workflows/main-workflow.ts
import { TradingAssistantX } from '../main';

export class MainWorkflow {
  private static assistant = new TradingAssistantX();
  
  static async execute(options?: WorkflowOptions): Promise<WorkflowResult> {
    // TradingAssistantXのexecuteOnce()をラップ
    const result = await this.assistant.executeOnce();
    
    // WorkflowResult形式に変換して返却
    return {
      success: result.success,
      action: result.decision?.action || 'wait',
      timestamp: new Date(),
      duration: result.duration
    };
  }
}
```

### 4. index.tsの調整

#### エクスポート整理
```typescript
// src/index.ts
export { TradingAssistantX } from './main';
export { MainWorkflow } from './workflows/main-workflow';
export { getConfig } from './config';
export { DataManager } from './data';
```

### 5. 循環参照の解決

#### 問題
- main.ts → workflows/main-workflow.ts → main.ts の循環参照

#### 解決策
1. TradingAssistantXクラスを別ファイルに分離
2. または、MainWorkflowを独立実装に変更

## 📝 推奨実装手順

### Step 1: 最小限の修正（即座の動作確認）
1. main.tsに `export { TradingAssistantX };` を追加
2. pnpm dev で動作確認

### Step 2: 統合調整
1. workflows/main-workflow.tsの実装確認
2. 循環参照がある場合は解決
3. 両方のエントリーポイントで動作確認

### Step 3: スケジューラー統合確認
1. scheduler/time-scheduler.tsがMainWorkflowを正しく使用
2. pnpm start でスケジュール実行確認

## ⚠️ 制約事項
- **動作優先**: まず動作する状態を作ることを最優先
- **段階的修正**: 一度に全て修正せず、段階的に進める
- **既存機能維持**: TradingAssistantXの既存機能は維持

## 🔧 技術要件
- TypeScriptのエクスポート/インポート構文
- 循環参照の回避
- 既存の型定義との整合性

## 📂 成果物
- 更新: `src/main.ts`（エクスポート追加）
- 調整: `src/workflows/main-workflow.ts`（必要に応じて）
- 調整: `src/index.ts`（必要に応じて）

## ✅ 完了条件
- [ ] pnpm dev が正常に実行される
- [ ] pnpm start が正常に実行される
- [ ] TypeScriptコンパイルエラーがない（新規実装部分）
- [ ] 循環参照が解決されている