# TASK-001: Core ファイル抽出・最適化

## 🎯 タスク概要
**責任範囲**: src/core/ディレクトリの autonomous-executor.ts, decision-engine.ts の抽出と最適化

## 📋 実装要件

### 🔧 対象ファイル
1. **autonomous-executor.ts** - 依存関係の完全解消とリファクタリング
2. **decision-engine.ts** - 独立性確保と機能保持

### 🚫 削除対象の依存関係（autonomous-executor.ts）
以下のインポートを完全に削除し、機能を統合またはリファクタリング：
```typescript
// 🔴 削除必須
import { ParallelManager } from './parallel-manager.js';
import { AutonomousExecutorCacheManager } from './cache-manager.js';
import { AutonomousExecutorContextManager } from './context-manager.js';
import { AutonomousExecutorDecisionProcessor } from './decision-processor.js';
import { AutonomousExecutorActionExecutor } from './action-executor.js';
import { AutonomousExecutorConfigManager } from './app-config-manager.js';
import { TrueAutonomousWorkflow } from './true-autonomous-workflow.js';
```

### ✅ 許可されたインポート
- `../types/` からの型定義
- `../utils/` からのユーティリティ
- `../collectors/` からのコレクター
- `../services/` からのサービス
- 標準ライブラリ

### 🎯 autonomous-executor.ts リファクタリング指針
1. **依存関係の内在化**: 削除対象クラスの機能を直接実装
2. **疎結合設計**: 他のcoreファイルに依存しない独立性確保
3. **機能保持**: 以下の主要機能は必ず保持
   - `ExecutionMode` enum
   - `executeClaudeAutonomous()` メソッド
   - `executeTrueAutonomous()` メソッド
   - Claude Code SDK統合機能

### 🎯 decision-engine.ts 最適化指針
1. **独立性確保**: 不要な依存関係の削除
2. **機能保持**: 以下の主要機能は必ず保持
   - `planActionsWithIntegratedContext()` メソッド
   - `analyzeAndDecide()` メソッド
   - `makeIntegratedDecisions()` メソッド
   - Claude Code SDK統合機能

## 🔒 技術制約

### TypeScript設定
- **strict mode**: 必須遵守
- **型安全性**: any型の使用禁止
- **エラーハンドリング**: try-catch必須

### アーキテクチャ原則
- **疎結合設計**: 他のcoreファイルへの依存禁止
- **単一責任**: 各ファイルの責任範囲明確化
- **DRY原則**: 共通ロジックの適切な抽象化

## 📂 出力管理規則

### ✅ 許可された出力先
- `tasks/20250722_202723_core_scripts_rebuild/reports/REPORT-001-core-optimization.md`

### 🚫 禁止事項
- ルートディレクトリへの一時ファイル出力
- 分析結果の直接出力

## 🧪 検証要件

### 必須チェック項目
1. **TypeScript型チェック**: `pnpm run typecheck` 成功
2. **ESLintチェック**: `pnpm run lint` 成功
3. **ビルド成功**: `pnpm run build` 成功
4. **依存関係確認**: 削除対象への参照が0件

### 動作確認
- リファクタリング後も既存機能が正常動作すること
- Claude Code SDK統合が維持されていること

## ⚠️ 重要な注意事項

### 機能保持の優先順位
1. **最優先**: 既存の実行機能を壊さない
2. **高優先**: TypeScript型安全性の確保
3. **中優先**: パフォーマンスの最適化

### 作業手順
1. **事前調査**: 各ファイルの現在の実装内容詳細確認
2. **依存関係分析**: 削除対象機能の autonomous-executor.ts での使用箇所特定
3. **段階的リファクタリング**: 小さな変更を積み重ねる
4. **継続的検証**: 各変更後にTypeScript/ESLintチェック実行

## 📋 報告書要件

### 必須記載事項
1. **実装完了状況**: 各ファイルの変更内容詳細
2. **削除された依存関係**: 具体的なクラス・メソッド名
3. **保持された機能**: 既存機能の継承状況
4. **検証結果**: TypeScript/ESLint/ビルドの結果
5. **課題・制限事項**: 発見された問題と対応策

### 報告書出力先
- `tasks/20250722_202723_core_scripts_rebuild/reports/REPORT-001-core-optimization.md`

## 🎯 成功基準
- autonomous-executor.ts, decision-engine.ts が不要な依存関係なしで動作
- 全てのTypeScript/ESLintチェックがPass
- 既存機能の完全保持
- REQUIREMENTS.md理想構造への適合

---

**品質最優先**: 妥協なし、完全実装を目指してください