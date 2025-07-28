# TASK-002: core-runner.ts理想実装置換

## 🎯 タスク概要

現在の過剰実装されたcore-runner.ts（909行）を、シンプルで完璧なcore-runner-ideal.ts（439行）で置き換え、Claude中心アーキテクチャを実現する。

## 📋 必須事前確認

### 1. 権限・環境確認
```bash
echo "ROLE: $ROLE" && git branch --show-current
```
**Worker権限での実装作業のみ許可**

### 2. REQUIREMENTS.md確認
```bash
cat REQUIREMENTS.md | head -50
```
**要件定義書の必読確認**

## 🚨 MVP制約・過剰実装防止

### 現状の問題（削除対象）
- ❌ **ActionExecutor抽象化**: 過剰なパターン実装
- ❌ **ExecutionMetrics**: 詳細な統計・監視機能
- ❌ **ActionContext**: 複雑なコンテキスト管理
- ❌ **MetricsCollector**: パフォーマンス監視機能
- ❌ **複雑なインターフェース**: 20個以上の不要なinterface

### 理想実装の特徴（採用対象）
- ✅ **シンプルなswitch文**: 直接的なアクション実行
- ✅ **必要最小限の機能**: Claudeとの対話に集中
- ✅ **明確な責務分離**: 実行制御のみに特化
- ✅ **可読性優先**: 439行の理解しやすいコード

## 📝 実装要件

### 1. ファイル置換作業

**置換対象**:
```
src/core/execution/core-runner.ts (909行, 26KB) → core-runner-ideal.ts (439行, 12KB)
```

**作業手順**:
1. **現在のcore-runner.tsのバックアップ**: `core-runner-legacy-backup.ts`として保存
2. **core-runner-ideal.tsの内容でcore-runner.tsを上書き**
3. **不要なimport文の整理**: 使用されないimportの削除

### 2. 型定義整合性確保

**確認・調整事項**:
- ✅ **claude-types.ts**: ClaudeAction, SystemContext, ClaudeDecision, FeedbackData
- ✅ **core-types.ts**: 基本的な型定義が存在するか
- ✅ **import文**: 全てのimportが正常に解決されるか

**型定義の作成・調整**:
```typescript
// core-runner-ideal.tsで使用される型（確認・作成）
enum ClaudeAction {
  COLLECT_DATA = 'collect_data',
  CREATE_POST = 'create_post',
  ANALYZE = 'analyze',
  WAIT = 'wait'
}

interface SystemContext {
  timestamp: string;
  account: any;
  system: any;
  market: any;
  history: {
    recentPosts: any[];
    lastExecutionTime: string | null;
  };
}

interface ClaudeDecision {
  action: ClaudeAction;
  reasoning: string;
  parameters: any;
  confidence: number;
}

interface FeedbackData {
  decision: ClaudeDecision;
  result: any;
  timestamp: string;
}
```

### 3. 依存関係確認・調整

**必要なサービス・モジュール**:
- ✅ `ClaudeAutonomousAgent`: src/core/claude-autonomous-agent.ts
- ✅ `ExecutionMonitor`: src/core/execution/execution-monitor.ts
- ✅ `ExecutionLock`: src/core/execution/execution-lock.ts
- ✅ `ExecutionRecovery`: src/core/execution/execution-recovery.ts
- ✅ `RecordManager`: src/services/record-manager.ts
- ✅ `DataMaintenance`: src/utils/maintenance/data-maintenance.ts

**削除された依存関係** (core-runner.tsでのみ使用):
- ❌ ActionExecutor関連の全クラス
- ❌ MetricsCollector関連
- ❌ 複雑なActionContext

## 🔧 実装手順

### Phase 1: 安全な置換作業
1. **現在のcore-runner.tsをバックアップ**:
   ```bash
   cp src/core/execution/core-runner.ts src/core/execution/core-runner-legacy-backup.ts
   ```

2. **core-runner-ideal.tsの内容でcore-runner.tsを置換**

3. **不要ファイルの削除**:
   ```bash
   rm src/core/execution/core-runner-ideal.ts
   ```

### Phase 2: 型定義整合性確保
1. **TypeScript型チェック実行**:
   ```bash
   pnpm typecheck
   ```

2. **型エラーの解消**:
   - 未定義型の作成・import
   - 不適切な型定義の修正

3. **必要に応じて型定義ファイル調整**:
   - `src/types/claude-types.ts`
   - `src/types/core-types.ts`

### Phase 3: 動作確認
1. **コンパイル確認**:
   ```bash
   pnpm build
   ```

2. **Lint確認**:
   ```bash
   pnpm lint
   ```

3. **実行テスト**:
   ```bash
   pnpm dev
   ```

## 📤 出力要件

**必須出力先**: `tasks/20250723_185525_core_execution_cleanup/outputs/`

### 出力ファイル
1. **実装レポート**: `core-runner-replacement-report.yaml`
2. **型チェック結果**: `typecheck-results.txt`
3. **テスト実行結果**: `execution-test-results.txt`

### 実装レポート形式
```yaml
replacement_timestamp: "2025-07-23T18:55:25Z"
file_changes:
  core_runner_backup: "src/core/execution/core-runner-legacy-backup.ts"
  core_runner_replaced: "src/core/execution/core-runner.ts"
  ideal_file_removed: "src/core/execution/core-runner-ideal.ts"
type_adjustments:
  claude_types: "created" | "adjusted" | "no_change"
  core_types: "created" | "adjusted" | "no_change"
  import_fixes: []
validation_results:
  typecheck_passed: true | false
  lint_passed: true | false
  execution_test_passed: true | false
metrics:
  lines_reduced: 470  # 909 - 439
  file_size_reduction: "14KB"  # 26KB - 12KB
  complexity_reduction: "significant"
```

## 🚫 絶対禁止事項

### 実装禁止
- ❌ **ActionExecutorパターンの保持**: 複雑な抽象化は削除
- ❌ **ExecutionMetricsの追加**: 統計・監視機能は不要
- ❌ **新しい複雑な機能の追加**: 理想実装の範囲を超えない
- ❌ **過剰な例外処理**: 基本的なエラー処理のみ

### 出力禁止
- ❌ **ルートディレクトリへの出力**: 分析・レポートの直接出力禁止
- ❌ **要件定義外ファイルの作成**: REQUIREMENTS.mdにないファイル禁止

## ✅ 完了確認チェックリスト

- [ ] core-runner.tsのバックアップ作成完了
- [ ] core-runner-ideal.tsの内容でcore-runner.ts置換完了
- [ ] 型定義整合性確保完了
- [ ] TypeScript型チェック通過確認
- [ ] Lint通過確認
- [ ] 実行テスト成功確認
- [ ] 実装レポート作成・出力完了
- [ ] 報告書作成完了

## 🔄 依存関係

**前提条件**: なし（並列実行可能）
**後続タスク**: TASK-003（レガシー削除）はこのタスク完了後に実行

## 📋 報告書作成

**報告書パス**: `tasks/20250723_185525_core_execution_cleanup/reports/REPORT-002-core-runner-replacement.md`

実装完了後、必ず報告書を作成してください。

---

**重要**: この置換により、システムは完全にClaude中心アーキテクチャに移行し、439行のシンプルで理解しやすいコードベースになります。