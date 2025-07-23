# TASK-002: Claude中心の型定義統一

## 🎯 タスク概要
現在の型定義システムをClaude Code SDK中心に統一し、core-runner.tsの理想実装と整合性を取ります。
特に、claude-types.tsの型定義を改善し、システム全体で使用できるようにします。

## 📋 前提条件
- REQUIREMENTS.mdを必ず読み込むこと
- src/core/execution/core-runner.tsの理想実装を理解していること
- TASK-001（レガシー型定義の削除）が完了していること

## 🔧 実装内容

### 1. src/types/claude-types.tsの改善

1. **enum ClaudeActionをstring literal typeに変更**
   ```typescript
   // 現在のenum定義
   export enum ClaudeAction {
     COLLECT_DATA = 'collect_data',
     CREATE_POST = 'create_post',
     ANALYZE = 'analyze',
     WAIT = 'wait'
   }
   
   // 変更後のstring literal type
   export type ClaudeAction = 'collect_data' | 'create_post' | 'analyze' | 'wait';
   ```

2. **core-runner.tsで使用される型を確認し、不足があれば追加**
   - ClaudeAction (string literal type)
   - SystemContext
   - ClaudeDecision
   - FeedbackData
   - CollectDataParameters
   - CreatePostParameters
   - AnalyzeParameters
   - WaitParameters

### 2. src/types/index.tsの更新

1. **claude-types.tsの型をエクスポート**
   ```typescript
   // Claude関連の型をエクスポート
   export type {
     ClaudeAction,
     SystemContext,
     ClaudeDecision,
     FeedbackData,
     CollectDataParameters,
     CreatePostParameters,
     AnalyzeParameters,
     WaitParameters,
     RecoveryPlan,
     IClaudeAutonomousAgent,
     ClaudeExecutionOptions
   } from './claude-types';
   ```

2. **重複する型定義の統合**
   - 同じような意味の型が複数ファイルに存在する場合は、Claude中心に統一
   - 不要な型定義は削除

### 3. 型定義の整合性確保

1. **PostResult型の定義場所確認**
   - x-poster.tsからエクスポートされているか確認
   - 必要に応じてpost-types.tsに移動

2. **その他の必要な型の確認**
   - ExecutionOptions
   - ExecutionResult
   - その他core-runner.tsで使用される型

## ⚠️ 注意事項

1. **破壊的変更の回避**
   - 既存のコードが依存している型は慎重に変更
   - 型名の変更は最小限に

2. **型の一貫性**
   - 同じ概念は同じ型で表現
   - 命名規則の統一（インターフェースはI接頭辞、型はType接尾辞なし）

3. **Claude中心の設計**
   - Claudeが決定の中心となる設計を型レベルで保証
   - アクションはすべてClaudeDecisionを経由

## 📝 完了条件

1. claude-types.tsのenumがstring literal typeに変更されている
2. claude-types.tsの型がindex.tsからエクスポートされている
3. core-runner.tsがclaude-types.tsの型を正しくインポートできる
4. TypeScriptコンパイルエラーが発生しない

## 🔍 検証方法

```bash
# TypeScriptのコンパイルチェック
pnpm tsc --noEmit

# claude-types.tsの型が正しくエクスポートされているか確認
grep -r "from './claude-types'" src/types/index.ts

# enumが残っていないか確認
grep -r "enum ClaudeAction" src/
```

## 📋 報告書作成時の項目

- 変更した型定義の一覧
- 新規追加した型定義の一覧
- 統合・削除した重複型の一覧
- 今後の改善提案

---

**重要**: この作業はシステムの中核となるClaude関連の型定義を扱うため、特に慎重に進めてください。
core-runner.tsの理想実装と常に整合性を保つことを意識してください。